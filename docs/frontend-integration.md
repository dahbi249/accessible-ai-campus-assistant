# Frontend Integration & Huawei Cloud ECS Deployment Guide

## 1. Frontend Architecture Overview
The React + TypeScript + Vite frontend lives under `src/` and follows a strict separation from backend AI and database logic:

- `src/types/api.ts`: Shared REST contract types (`POST /api/v1/chat`, `GET /api/v1/announcements`, `GET /api/v1/locations`).
- `src/services/api.ts`: Single HTTP client with configurable `VITE_API_BASE_URL`, timeout handling, strict response schema validation, and a toggleable local development mock mode (`VITE_USE_MOCK_API`).
- `src/services/mockData.ts`: Clearly labeled local development fixtures for UI testing prior to backend connection.
- `src/i18n/translations.ts`: Multilingual UI strings and automatic RTL (`dir="rtl"`) / LTR (`dir="ltr"`) direction switching for Arabic, French, and English.
- `src/components/Chat/`: Multilingual chat thread, starter prompts, `not_found` unavailable-information handling, and error retry flow.
- `src/components/Sources/`: Verified source reference inspector displaying `title`, `source_type`, `page` (when present), and official `url`.
- `src/components/Announcements/`: Searchable announcement directory with category filters.
- `src/components/CampusMap/`: Leaflet + OpenStreetMap interactive campus map.

## 2. Backend API Dependencies
Ensure the FastAPI service implements and enables CORS (if served on a separate origin) for:
- `POST /api/v1/chat`
- `GET /api/v1/announcements?q=&category=&limit=`
- `GET /api/v1/locations`

## 3. Environment Variables
Set public frontend configuration at build/dev time (never place secrets in `VITE_*` variables):
- `VITE_API_BASE_URL=""` (empty when using Nginx `/api/` reverse proxy on the same host, or e.g. `http://localhost:8000` during local Vite dev)
- `VITE_USE_MOCK_API="false"` for production builds

## 4. Deploying on Huawei Cloud ECS
1. Provision an Ubuntu/EulerOS **Huawei Cloud ECS** instance and open inbound Security Group ports **80** (HTTP) and **443** (HTTPS via reverse proxy/TLS). Do **not** expose PostgreSQL port `5432` publicly.
2. Install Docker Engine and Docker Compose plugin on the ECS instance.
3. Clone the integrated repository containing `frontend/`, `backend/`, and `ai/`, and configure `.env` with database credentials and backend secrets.
4. Build and start the stack:
   ```bash
   docker compose up -d --build
   ```
5. Verify the deployment:
   - Open `http://<ECS_PUBLIC_IP>/` to confirm the React SPA loads.
   - Switch the UI to **Live FastAPI** (or set `VITE_USE_MOCK_API=false` at build time).
   - Test a chat query in English, French, and Arabic, verify source links, search `/api/v1/announcements`, and confirm `/api/v1/locations` markers render on Leaflet.
