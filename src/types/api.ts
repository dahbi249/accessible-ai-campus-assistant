export type SupportedLanguage = 'en' | 'fr' | 'ar';

export type ChatStatus = 'answered' | 'not_found' | 'error';

export type ApiMode = 'mock' | 'live';

export type FeedbackRating = 'helpful' | 'inaccurate';

export interface ChatSource {
  source_id: string;
  document_id?: string | number;
  title: string;
  source_type: string;
  page: number | null;
  url: string | null;
}

export interface ChatRequest {
  message: string;
  language: SupportedLanguage;
  conversation_id: string | null;
}

export interface ChatResponse {
  conversation_id: string;
  answer: string;
  language: SupportedLanguage;
  sources: ChatSource[];
  status: ChatStatus;
}

export interface ChatStreamCallbacks {
  onToken: (delta: string) => void;
}

export interface FeedbackRequest {
  message_id: string;
  rating: FeedbackRating;
  language: SupportedLanguage;
}

export interface FeedbackResponse {
  ok: boolean;
}

export interface StudentLoginRequest {
  identifier: string;
  password: string;
}

export interface StudentLoginResponse {
  access_token: string;
  token_type?: string;
}

export interface AnnouncementItem {
  id: string | number;
  title: string;
  content: string;
  published_at: string | null;
  event_date?: string | null;
  source_url: string | null;
  category: string;
  localizedTitles?: Partial<Record<SupportedLanguage, string>>;
  localizedContents?: Partial<Record<SupportedLanguage, string>>;
}

export interface AnnouncementsResponse {
  items: AnnouncementItem[];
  total?: number;
}

export interface AnnouncementsQuery {
  q?: string;
  category?: string;
  limit?: number;
  lang?: SupportedLanguage;
}

export interface CampusLocation {
  id: string | number;
  name: string;
  description: string;
  building?: string | null;
  latitude: number;
  longitude: number;
  category: string;
  opening_hours?: string | null;
  wheelchair_accessible?: boolean;
  accessibility_notes?: string | null;
  localizedNames?: Partial<Record<SupportedLanguage, string>>;
  localizedDescriptions?: Partial<Record<SupportedLanguage, string>>;
  localizedBuildings?: Partial<Record<SupportedLanguage, string>>;
  localizedAccessibilityNotes?: Partial<Record<SupportedLanguage, string>>;
}

export interface LocationsQuery {
  q?: string;
}

export interface LocationsResponse {
  items: CampusLocation[];
  total?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language: SupportedLanguage;
  timestamp: string;
  sources?: ChatSource[];
  status?: ChatStatus;
  isMock?: boolean;
  piiRedactedTypes?: PiiType[];
  feedback?: FeedbackRating;
}

export interface ChatSession {
  id: string;
  title: string;
  language: SupportedLanguage;
  conversationId: string | null;
  messages: ChatMessage[];
  updatedAt: string;
}

export type PiiType = 'email' | 'phone' | 'student_id' | 'secret';

export interface PiiRedactionResult {
  sanitizedText: string;
  redactedTypes: PiiType[];
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface ApiErrorDetail {
  code?: string;
  message: string;
}

export interface ApiErrorPayload {
  detail?: string | ApiErrorDetail | Array<{ msg: string; loc?: Array<string | number>; type?: string }>;
  message?: string;
}

