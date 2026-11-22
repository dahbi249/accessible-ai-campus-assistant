import type {
  ChatRequest,
  ChatResponse,
  ChatSource,
  ChatStreamCallbacks,
  FeedbackRequest,
  FeedbackResponse,
  RequestOptions,
} from '../types/api';
import {
  ApiError,
  buildUrl,
  extractBackendError,
  fetchJsonWithTimeout,
  getApiMode,
  getAuthToken,
  isObject,
  isSafeHttpUrl,
  notifyUnauthorized,
  simulateDelay,
} from './httpClient';
import { generateMockChatResponse } from './mockData';

function validateChatSource(raw: unknown, index: number): ChatSource {
  if (!isObject(raw)) {
    throw new ApiError('Invalid source item in chat response.');
  }
  if (typeof raw.title !== 'string' || raw.title.trim().length === 0) {
    throw new ApiError('Chat source missing required field "title".');
  }

  const rawId = raw.source_id ?? raw.document_id;
  const sourceId =
    rawId !== undefined && rawId !== null ? String(rawId) : `source-${index + 1}`;

  const sourceType =
    typeof raw.source_type === 'string' && raw.source_type.trim().length > 0
      ? raw.source_type
      : 'document';

  const page = raw.page === null || raw.page === undefined ? null : Number(raw.page);
  if (page !== null && !Number.isFinite(page)) {
    throw new ApiError('Chat source field "page" must be a finite number or null.');
  }
  const url =
    typeof raw.url === 'string' && isSafeHttpUrl(raw.url.trim())
      ? raw.url.trim()
      : null;

  return {
    source_id: sourceId,
    document_id:
      typeof raw.document_id === 'string' || typeof raw.document_id === 'number'
        ? raw.document_id
        : undefined,
    title: raw.title,
    source_type: sourceType,
    page,
    url,
  };
}

function validateChatResponse(raw: unknown): ChatResponse {
  if (!isObject(raw)) {
    throw new ApiError('Malformed JSON object returned by /api/v1/chat.');
  }
  if (
    typeof raw.conversation_id !== 'string' ||
    typeof raw.answer !== 'string' ||
    (raw.language !== 'en' && raw.language !== 'fr' && raw.language !== 'ar') ||
    (raw.status !== 'answered' && raw.status !== 'not_found' && raw.status !== 'error') ||
    !Array.isArray(raw.sources)
  ) {
    throw new ApiError('Response from /api/v1/chat does not match the expected schema.');
  }
  return {
    conversation_id: raw.conversation_id,
    answer: raw.answer,
    language: raw.language,
    status: raw.status,
    sources: raw.sources.map((item, idx) => validateChatSource(item, idx)),
  };
}

export const chatService = {
  async sendChatMessage(
    request: ChatRequest,
    options?: RequestOptions
  ): Promise<ChatResponse> {
    if (getApiMode() === 'mock') {
      await simulateDelay(340, options?.signal);
      return generateMockChatResponse(request);
    }

    const endpoint = buildUrl('/api/v1/chat');
    const payload = await fetchJsonWithTimeout(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      options?.signal
    );
    return validateChatResponse(payload);
  },

  async sendChatMessageStream(
    request: ChatRequest,
    callbacks: ChatStreamCallbacks,
    options?: RequestOptions
  ): Promise<{ response: ChatResponse; streamedViaSse: boolean }> {
    if (getApiMode() === 'mock') {
      const response = await chatService.sendChatMessage(request, options);
      return { response, streamedViaSse: false };
    }

    const endpoint = buildUrl('/api/v1/chat/stream');
    const authHeaders: Record<string, string> = {};
    const token = getAuthToken();
    if (token) {
      authHeaders.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...authHeaders,
        },
        body: JSON.stringify(request),
        signal: options?.signal,
      });

      if (response.status === 404 || response.status === 405 || response.status === 501) {
        const fallback = await chatService.sendChatMessage(request, options);
        return { response: fallback, streamedViaSse: false };
      }

      if (!response.ok) {
        let parsedMessage = `HTTP ${response.status}`;
        let parsedCode: string | undefined;
        try {
          const body = (await response.json()) as unknown;
          const extracted = extractBackendError(body, response.status);
          parsedMessage = extracted.message;
          parsedCode = extracted.code;
        } catch {
          // Ignore non-JSON error body
        }
        if (response.status === 401) {
          parsedCode = parsedCode ?? 'UNAUTHORIZED';
          notifyUnauthorized();
        }
        throw new ApiError(
          `Backend request failed: ${parsedMessage}`,
          response.status,
          parsedCode
        );
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/event-stream') || !response.body) {
        const jsonPayload = (await response.json()) as unknown;
        return { response: validateChatResponse(jsonPayload), streamedViaSse: false };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let finalMetadata: Partial<ChatResponse> | null = null;

      const processSseLine = (rawLine: string) => {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) return;
        const dataStr = line.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') return;
        try {
          const parsed = JSON.parse(dataStr) as Record<string, unknown>;
          if (typeof parsed.delta === 'string') {
            accumulated += parsed.delta;
            callbacks.onToken(accumulated);
          } else if (typeof parsed.token === 'string') {
            accumulated += parsed.token;
            callbacks.onToken(accumulated);
          }
          if (
            typeof parsed.conversation_id === 'string' &&
            Array.isArray(parsed.sources) &&
            typeof parsed.status === 'string'
          ) {
            finalMetadata = {
              conversation_id: parsed.conversation_id,
              answer: typeof parsed.answer === 'string' ? parsed.answer : accumulated,
              language:
                parsed.language === 'en' || parsed.language === 'fr' || parsed.language === 'ar'
                  ? parsed.language
                  : request.language,
              sources: parsed.sources.map((s, idx) => validateChatSource(s, idx)),
              status:
                parsed.status === 'answered' ||
                parsed.status === 'not_found' ||
                parsed.status === 'error'
                  ? parsed.status
                  : 'answered',
            };
          }
        } catch {
          // Ignore malformed SSE frame fragments
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          processSseLine(rawLine);
        }
      }

      if (buffer.trim().length > 0) {
        for (const trailingLine of buffer.split('\n')) {
          processSseLine(trailingLine);
        }
      }

      if (finalMetadata) {
        return {
          response: validateChatResponse(finalMetadata),
          streamedViaSse: true,
        };
      }

      return {
        response: {
          conversation_id: request.conversation_id ?? `live-${Date.now()}`,
          answer: accumulated,
          language: request.language,
          sources: [],
          status: accumulated.trim() ? 'answered' : 'not_found',
        },
        streamedViaSse: true,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      if (error instanceof ApiError) {
        throw error;
      }
      const fallback = await chatService.sendChatMessage(request, options);
      return { response: fallback, streamedViaSse: false };
    }
  },

  async submitMessageFeedback(
    feedback: FeedbackRequest,
    options?: RequestOptions
  ): Promise<FeedbackResponse> {
    if (getApiMode() === 'mock') {
      await simulateDelay(120, options?.signal);
      return { ok: true };
    }

    const endpoint = buildUrl('/api/v1/feedback');
    try {
      await fetchJsonWithTimeout(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify(feedback),
        },
        options?.signal
      );
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 501)) {
        return { ok: true };
      }
      throw error;
    }
  },
};
