import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  authService,
  buildGoogleMapsUrl,
  campusApi,
  chatService,
  dataService,
  getApiMode,
  isAuthTokenExpired,
  onUnauthorized,
  setApiMode,
  setAuthToken,
} from '../services/api';
import { buildUrl } from '../services/httpClient';
import { calculateDistanceMeters, estimateWalking } from '../utils/geoDistance';
import {
  buildAnnouncementIcsContent,
  extractAnnouncementEventDate,
} from '../utils/icsCalendar';
import { normalizeSearchText } from '../utils/arabicSearch';
import { redactSensitivePii } from '../utils/piiRedactor';
import { formatRelativeTimestamp } from '../utils/relativeTime';
import { loadChatSessions } from '../utils/sessionStorage';

describe('redactSensitivePii', () => {
  it('redacts emails, Algerian phones, matricules, and inline secrets', () => {
    const raw =
      'Email student@univ-tam.dz tel +213 555 12 34 56 id UN20241234 password: mySecretValue';
    const result = redactSensitivePii(raw);

    expect(result.sanitizedText).not.toContain('student@univ-tam.dz');
    expect(result.sanitizedText).not.toContain('555 12 34 56');
    expect(result.sanitizedText).not.toContain('UN20241234');
    expect(result.sanitizedText).not.toContain('mySecretValue');
    expect(result.redactedTypes).toEqual(
      expect.arrayContaining(['email', 'phone', 'student_id', 'secret'])
    );
  });

  it('preserves YYYYMMDD calendar dates and concatenated academic year spans', () => {
    const raw = 'Exam scheduled 20261114 for academic session 20262027 in Hall B.';
    const result = redactSensitivePii(raw);

    expect(result.sanitizedText).toContain('20261114');
    expect(result.sanitizedText).toContain('20262027');
    expect(result.redactedTypes).toHaveLength(0);
  });
});

describe('normalizeSearchText', () => {
  it('normalizes Arabic Alif variants, diacritics, and Ta Marbuta', () => {
    expect(normalizeSearchText('الإدارة المركزية')).toBe('الاداره المركزيه');
    expect(normalizeSearchText('الاداره')).toBe('الاداره');
    expect(normalizeSearchText('المَكتَبَةُ')).toBe('المكتبه');
  });

  it('normalizes French Latin accents', () => {
    expect(normalizeSearchText('Scolarité Étudiante')).toBe('scolarite etudiante');
  });
});

describe('buildGoogleMapsUrl', () => {
  it('generates clean University of Tamanrasset search URLs', () => {
    const url = buildGoogleMapsUrl({
      latitude: 22.788,
      longitude: 5.525,
      name: 'Central Library',
    });

    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=University+of+Tamanrasset+Central+Library'
    );
  });

  it('avoids duplicating Tamanrasset when already in the facility name', () => {
    const url = buildGoogleMapsUrl({
      latitude: 22.788,
      longitude: 5.525,
      name: 'University of Tamanrasset',
    });

    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=University+of+Tamanrasset'
    );
  });
});

describe('geoDistance helpers', () => {
  it('computes realistic on-campus walking distances and minutes between Tamanrasset facilities', () => {
    const rectorat = { latitude: 22.7882, longitude: 5.5248 };
    const scienceBlockA = { latitude: 22.7873, longitude: 5.5245 };
    const rawMeters = calculateDistanceMeters(rectorat, scienceBlockA);
    const estimate = estimateWalking(rectorat, scienceBlockA);

    expect(rawMeters).toBeGreaterThan(80);
    expect(rawMeters).toBeLessThan(150);
    expect(estimate.meters % 10).toBe(0);
    expect(estimate.minutes).toBeGreaterThanOrEqual(1);
  });
});

describe('icsCalendar helpers', () => {
  it('extracts ISO, English, French, and Arabic deadline dates and builds RFC 5545 .ics output', () => {
    const enNotice = {
      id: 'ann-1',
      title: 'Scholarship Deadline',
      content: 'Apply before November 24, 2026.',
      published_at: '2026-11-04T08:45:00Z',
      source_url: 'https://university.example.edu/scholarship',
      category: 'academic',
    };
    const frNotice = {
      id: 'ann-2',
      title: 'Examens',
      content: 'Les épreuves débuteront le 7 décembre 2026.',
      published_at: null,
      source_url: null,
      category: 'exams',
    };

    expect(extractAnnouncementEventDate(enNotice)).toBe('2026-11-24');
    expect(extractAnnouncementEventDate(frNotice)).toBe('2026-12-07');

    const ics = buildAnnouncementIcsContent(enNotice, '2026-11-24', 'en');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261124');
    expect(ics).toContain('DTEND;VALUE=DATE:20261125');
    expect(ics).toContain('SUMMARY:Scholarship Deadline');
    expect(ics).toContain('URL:https://university.example.edu/scholarship');
    expect(ics).toContain('END:VCALENDAR');
  });
});

describe('campusApi', () => {
  const initialMode = getApiMode();

  beforeEach(() => {
    setApiMode('mock');
    setAuthToken(null);
  });

  afterEach(() => {
    setApiMode(initialMode);
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  it('supports Arabic-normalized campus location and announcement search in mock mode', async () => {
    const arabicLocSearch = await campusApi.getCampusLocations({ q: 'الاداره' });
    expect(arabicLocSearch.items.length).toBeGreaterThan(0);
    expect(arabicLocSearch.items[0].opening_hours).toBeTruthy();

    const arabicAnnSearch = await campusApi.getAnnouncements({ q: 'المكتبه', lang: 'ar' });
    expect(arabicAnnSearch.items.length).toBeGreaterThan(0);
    expect(arabicAnnSearch.items[0].localizedTitles?.ar).toBeTruthy();
  });

  it('parses FastAPI { detail: { code, message } } error payloads in live mode', async () => {
    setApiMode('live');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          detail: {
            code: 'INVALID_LANGUAGE',
            message: 'Unsupported language code requested.',
          },
        }),
      })
    );

    await expect(
      campusApi.sendChatMessage({
        message: 'Where is the library?',
        language: 'en',
        conversation_id: null,
      })
    ).rejects.toMatchObject({
      name: 'ApiError',
      statusCode: 422,
      errorCode: 'INVALID_LANGUAGE',
      message: expect.stringContaining('Unsupported language code requested.'),
    } satisfies Partial<ApiError>);
  });

  it('clears token and triggers unauthorized listener on 401 responses', async () => {
    setApiMode('live');
    setAuthToken('stale-token-123');
    const listener = vi.fn();
    const unsub = onUnauthorized(listener);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Token expired' }),
      })
    );

    await expect(campusApi.getAnnouncements()).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('detects expired JWT exp timestamps safely', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const encodePayload = (obj: object) =>
      btoa(JSON.stringify(obj)).replace(/=/g, '');

    expect(isAuthTokenExpired(`hdr.${encodePayload({ exp: pastExp })}.sig`)).toBe(true);
    expect(isAuthTokenExpired(`hdr.${encodePayload({ exp: futureExp })}.sig`)).toBe(false);
    expect(isAuthTokenExpired('opaque-dev-token')).toBe(false);
  });

  it('normalizes VITE_API_BASE_URL without duplicating /api and exposes modular services', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/api');
    expect(buildUrl('/api/v1/chat')).toBe('http://localhost:8000/api/v1/chat');
    expect(buildUrl('/api/v1/announcements', { category: 'exams', limit: 10 })).toBe(
      'http://localhost:8000/api/v1/announcements?category=exams&limit=10'
    );

    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');
    expect(buildUrl('/api/v1/locations')).toBe('http://localhost:8000/api/v1/locations');

    vi.unstubAllEnvs();

    expect(campusApi.loginStudent).toBe(authService.loginStudent);
    expect(campusApi.sendChatMessage).toBe(chatService.sendChatMessage);
    expect(campusApi.getAnnouncements).toBe(dataService.getAnnouncements);
  });

  it('flushes final SSE frame even when stream omits trailing newline', async () => {
    setApiMode('live');
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode('data: {"delta":"Hello "}\n'),
      encoder.encode(
        'data: {"conversation_id":"conv-sse","answer":"Hello world","language":"en","status":"answered","sources":[]}'
      ),
    ];
    let index = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => ({
            read: async () => {
              if (index < chunks.length) {
                const value = chunks[index];
                index += 1;
                return { done: false, value };
              }
              return { done: true, value: undefined };
            },
          }),
        },
      })
    );

    const streamedTokens: string[] = [];
    const result = await campusApi.sendChatMessageStream(
      { message: 'Hi', language: 'en', conversation_id: null },
      { onToken: (acc) => streamedTokens.push(acc) }
    );

    expect(result.streamedViaSse).toBe(true);
    expect(streamedTokens).toEqual(['Hello ']);
    expect(result.response.conversation_id).toBe('conv-sse');
    expect(result.response.answer).toBe('Hello world');
  });
});

describe('formatRelativeTimestamp', () => {
  it('formats seconds, minutes, hours, and days across EN, FR, and AR', () => {
    const base = new Date('2026-11-20T12:00:00Z').getTime();

    expect(formatRelativeTimestamp('2026-11-20T11:59:45Z', 'en', base)).toBe('just now');
    expect(formatRelativeTimestamp('2026-11-20T11:58:00Z', 'en', base)).toBe('2m ago');
    expect(formatRelativeTimestamp('2026-11-20T09:00:00Z', 'en', base)).toBe('3h ago');
    expect(formatRelativeTimestamp('2026-11-18T12:00:00Z', 'en', base)).toBe('2d ago');

    expect(formatRelativeTimestamp('2026-11-20T11:58:00Z', 'fr', base)).toBe('il y a 2 min');
    expect(formatRelativeTimestamp('2026-11-20T11:58:00Z', 'ar', base)).toBe('منذ 2 د');
    expect(formatRelativeTimestamp('invalid-date', 'en', base)).toBe('');
  });
});

describe('loadChatSessions', () => {
  it('filters out corrupted message entries from sessionStorage', () => {
    window.sessionStorage.setItem(
      'campus_assistant_sessions_v1',
      JSON.stringify([
        {
          id: 's1',
          title: 'Test',
          language: 'en',
          conversationId: null,
          updatedAt: '2026-11-20T12:00:00Z',
          messages: [
            null,
            { id: 'bad' },
            { id: 'm1', role: 'user', content: 'Valid question', language: 'en', timestamp: '2026-11-20T12:00:00Z' },
          ],
        },
      ])
    );

    const loaded = loadChatSessions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].messages).toHaveLength(1);
    expect(loaded[0].messages[0].id).toBe('m1');
  });
});
