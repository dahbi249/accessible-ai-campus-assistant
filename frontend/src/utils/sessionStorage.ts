import type { ChatSession } from '../types/api';

const SESSIONS_STORAGE_KEY = 'campus_assistant_sessions_v1';
const JWT_STORAGE_KEY = 'campus_assistant_jwt_v1';

/**
 * Uses sessionStorage so chat histories and JWT tokens remain isolated
 * to the current browser tab/session on shared campus lab computers.
 */
export function loadChatSessions(): ChatSession[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.sessionStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        (item): item is ChatSession =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          Array.isArray(item.messages)
      )
      .map((item) => ({
        ...item,
        messages: item.messages.filter(
          (msg) =>
            typeof msg === 'object' &&
            msg !== null &&
            typeof msg.id === 'string' &&
            (msg.role === 'user' || msg.role === 'assistant') &&
            typeof msg.content === 'string'
        ),
      }));
  } catch {
    return [];
  }
}

export function saveChatSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore quota errors in restricted sandboxes
  }
}

export function loadAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const token = window.sessionStorage.getItem(JWT_STORAGE_KEY);
    return token && token.trim().length > 0 ? token.trim() : null;
  } catch {
    return null;
  }
}

export function saveAuthToken(token: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (token && token.trim().length > 0) {
      window.sessionStorage.setItem(JWT_STORAGE_KEY, token.trim());
    } else {
      window.sessionStorage.removeItem(JWT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function clearAllCampusSessionData(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.removeItem(SESSIONS_STORAGE_KEY);
    window.sessionStorage.removeItem(JWT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
