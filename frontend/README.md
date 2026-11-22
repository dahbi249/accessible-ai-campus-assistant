# Campus Assistant Frontend

Multilingual (`EN` / `FR` / `AR` with automatic LTR/RTL layout) web client for the **University of Tamanrasset** campus assistant, verified notice board, and interactive campus map.

Built with React 19, TypeScript, Vite, Tailwind CSS, and Leaflet. All backend data fetching and mutations are isolated behind `src/services/` with local mock fixtures enabled by default so frontend development and backend integration remain decoupled.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

`.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCK_API=true
```

- Set `VITE_USE_MOCK_API=false` when connecting to your running backend server.
- Note: `src/services/httpClient.ts` automatically normalizes `VITE_API_BASE_URL` whether it ends with `/api` (`http://localhost:8000/api`) or the host root (`http://localhost:8000`), or is empty (`""`) for same-origin Nginx reverse-proxying.

### 3. Available scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite dev server on `http://localhost:3000` |
| `npm run lint` | Run TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Run Vitest unit & component test suite (`vitest run`) |
| `npm run build` | Build production bundle into `dist/` |
| `npm run preview` | Preview production bundle locally |

---

## Project Structure

```text
src/
├── components/
│   ├── Announcements/   # Official notices search, category filters, .ics calendar export, print cards
│   ├── CampusMap/       # Leaflet campus map, geolocation walking distance, directory split view
│   ├── Chat/            # Chat interface, message cards, typing indicator, markdown/KaTeX renderer
│   ├── PWA/             # Service worker install button & iOS prompt
│   ├── Sidebar/         # Collapsible navigation drawer, session history, auth/dev controls
│   ├── Sources/         # Grounded document source cards
│   └── ErrorBoundary.tsx
├── hooks/               # Accessibility prefs, modal focus trap, online status, PWA install
├── i18n/                # EN / FR / AR translation dictionaries and RTL helpers
├── pages/               # Route/view wrappers (AssistantPage, AnnouncementsPage, CampusMapPage)
├── services/            # Modular API client & mock service layer
│   ├── api.ts           # Unified facade (campusApi) + helper re-exports
│   ├── authService.ts   # Student authentication & JWT helpers
│   ├── chatService.ts   # Chat completion, SSE streaming, and feedback mutations
│   ├── dataService.ts   # Announcements and campus location queries
│   ├── httpClient.ts    # Base URL resolution, timeouts, auth headers, 401 handling
│   └── mockData.ts      # Local mock fixtures & simulated responses
├── tests/               # Vitest + React Testing Library test suites
├── types/               # API request/response TypeScript contracts (api.ts, index.ts)
└── utils/               # PII redactor, Arabic/French search normalization, .ics generator, geo distance
```

---

## Backend API Contract

All endpoints use JSON (`Content-Type: application/json`) unless noted otherwise. When the student is signed in, requests include `Authorization: Bearer <access_token>`.

| Method | Route | Request Body / Query Params | Expected Response JSON |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | **Body (`StudentLoginRequest`):**<br>`{ "identifier": "student@univ-tam.dz", "password": "..." }` | `200 OK` (`StudentLoginResponse`):<br>`{ "access_token": "<jwt>", "token_type": "Bearer" }` |
| `POST` | `/api/v1/chat` | **Body (`ChatRequest`):**<br>`{ "message": "string", "language": "en" \| "fr" \| "ar", "conversation_id": "string" \| null }` | `200 OK` (`ChatResponse`):<br>`{ "conversation_id": "string", "answer": "markdown string", "language": "en" \| "fr" \| "ar", "status": "answered" \| "not_found" \| "error", "sources": [ChatSource] }` |
| `POST` | `/api/v1/chat/stream` | **Body (`ChatRequest`):**<br>Same as `POST /api/v1/chat`<br>**Headers:** `Accept: text/event-stream` | `200 OK` (`text/event-stream` SSE):<br>Incremental frames: `data: {"delta": "chunk"}`<br>Final frame: `data: {"conversation_id": "...", "answer": "...", "language": "en", "status": "answered", "sources": [...]}`<br>Terminator: `data: [DONE]`<br>*(Falls back to `POST /api/v1/chat` on `404`/`405`/`501`)* |
| `POST` | `/api/v1/feedback` | **Body (`FeedbackRequest`):**<br>`{ "message_id": "string", "rating": "helpful" \| "inaccurate", "language": "en" \| "fr" \| "ar" }` | `200 OK` (`FeedbackResponse`):<br>`{ "ok": true }` |
| `GET` | `/api/v1/announcements` | **Query (`AnnouncementsQuery`):**<br>`q?: string`, `category?: string`, `limit?: number`, `lang?: "en" \| "fr" \| "ar"` | `200 OK` (`AnnouncementsResponse`):<br>`{ "items": [AnnouncementItem], "total": number }` |
| `GET` | `/api/v1/locations` | **Query (`LocationsQuery`):**<br>`q?: string` | `200 OK` (`LocationsResponse`):<br>`{ "items": [CampusLocation], "total": number }` |

### Nested Schema Shapes

All definitions live in `src/types/api.ts`:

- **`ChatSource`**:
  ```json
  {
    "source_id": "src-1",
    "document_id": "doc-42",
    "title": "Academic Calendar 2026-2027",
    "source_type": "pdf",
    "page": 3,
    "url": "https://university.example.edu/docs/calendar.pdf"
  }
  ```
- **`AnnouncementItem`**:
  ```json
  {
    "id": "ann-001",
    "title": "Fall Semester Registration",
    "content": "Deadline details...",
    "published_at": "2026-11-10T09:00:00Z",
    "event_date": "2026-11-28",
    "source_url": "https://university.example.edu/notices/1",
    "category": "administrative"
  }
  ```
- **`CampusLocation`**:
  ```json
  {
    "id": "loc-001",
    "name": "Central Library",
    "description": "Main study halls and digital archive.",
    "building": "Library Block",
    "latitude": 22.788,
    "longitude": 5.525,
    "category": "library",
    "opening_hours": "Sun-Thu 08:00-18:00",
    "wheelchair_accessible": true,
    "accessibility_notes": "Ground-floor ramp and elevator access."
  }
  ```

### Standard Error Handling

The frontend parses FastAPI-style and generic JSON error envelopes (`ApiErrorPayload`):

```json
{
  "detail": {
    "code": "INVALID_LANGUAGE",
    "message": "Unsupported language code requested."
  }
}
```

- `401 Unauthorized` responses automatically clear the stored token and trigger the re-authentication modal.
- String details (`{ "detail": "..." }`) and validation arrays (`{ "detail": [{ "msg": "..." }] }`) are also handled cleanly by `extractBackendError` in `src/services/httpClient.ts`.
