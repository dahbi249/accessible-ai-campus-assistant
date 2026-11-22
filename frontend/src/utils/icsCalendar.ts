import type { AnnouncementItem, SupportedLanguage } from '../types/api';

const EN_MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const FR_MONTHS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  février: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  août: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
  décembre: 12,
};

const AR_MONTHS: Record<string, number> = {
  جانفي: 1,
  يناير: 1,
  فيفري: 2,
  فبراير: 2,
  مارس: 3,
  أفريل: 4,
  ابريل: 4,
  أبريل: 4,
  ماي: 5,
  مايو: 5,
  جوان: 6,
  يونيو: 6,
  جويلية: 7,
  يوليو: 7,
  أوت: 8,
  أغسطس: 8,
  سبتمبر: 9,
  أكتوبر: 10,
  نوفمبر: 11,
  ديسمبر: 12,
};

function isValidYmd(year: number, month: number, day: number): boolean {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function toYmd(year: number, month: number, day: number): string | null {
  if (!isValidYmd(year, month, day)) {
    return null;
  }
  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Extracts a YYYY-MM-DD deadline or event date from an announcement item.
 * Checks explicit `event_date` first, then scans localized/default titles & content.
 */
export function extractAnnouncementEventDate(item: AnnouncementItem): string | null {
  if (item.event_date) {
    const trimmed = item.event_date.trim();
    const isoDirect = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDirect) {
      return toYmd(Number(isoDirect[1]), Number(isoDirect[2]), Number(isoDirect[3]));
    }
  }

  const candidateTexts = [
    item.localizedTitles?.en,
    item.localizedContents?.en,
    item.localizedTitles?.fr,
    item.localizedContents?.fr,
    item.localizedTitles?.ar,
    item.localizedContents?.ar,
    item.title,
    item.content,
  ].filter((t): t is string => Boolean(t && t.trim()));

  for (const text of candidateTexts) {
    // 1. ISO YYYY-MM-DD
    const isoMatch = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
    if (isoMatch) {
      const ymd = toYmd(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
      if (ymd) return ymd;
    }

    // 2. English "November 28, 2026"
    const enMatch = text.match(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})\b/i
    );
    if (enMatch) {
      const month = EN_MONTHS[enMatch[1].toLowerCase()];
      const ymd = month ? toYmd(Number(enMatch[3]), month, Number(enMatch[2])) : null;
      if (ymd) return ymd;
    }

    // 3. French "28 novembre 2026" / "7 décembre 2026"
    const frMatch = text.match(
      /\b(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(20\d{2})\b/i
    );
    if (frMatch) {
      const month = FR_MONTHS[frMatch[2].toLowerCase()];
      const ymd = month ? toYmd(Number(frMatch[3]), month, Number(frMatch[1])) : null;
      if (ymd) return ymd;
    }

    // 4. Arabic "28 نوفمبر 2026"
    const arMatch = text.match(/(\d{1,2})\s+([\u0600-\u06FF]+)\s+(20\d{2})/);
    if (arMatch) {
      const month = AR_MONTHS[arMatch[2]];
      const ymd = month ? toYmd(Number(arMatch[3]), month, Number(arMatch[1])) : null;
      if (ymd) return ymd;
    }
  }

  return null;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatUtcTimestamp(date: Date): string {
  const yyyy = String(date.getUTCFullYear()).padStart(4, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}

function nextYmdCompact(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  const yyyy = String(dt.getUTCFullYear()).padStart(4, '0');
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export function buildAnnouncementIcsContent(
  item: AnnouncementItem,
  eventDateYmd: string,
  language: SupportedLanguage,
  now = new Date()
): string {
  const title = item.localizedTitles?.[language] ?? item.title;
  const content = item.localizedContents?.[language] ?? item.content;
  const startCompact = eventDateYmd.replace(/-/g, '');
  const endCompact = nextYmdCompact(eventDateYmd);
  const dtStamp = formatUtcTimestamp(now);
  const safeId = String(item.id).replace(/[^a-zA-Z0-9._-]/g, '-');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//University of Tamanrasset//Campus Assistant//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:campus-notice-${safeId}@univ-tamanrasset.local`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${startCompact}`,
    `DTEND;VALUE=DATE:${endCompact}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(content)}`,
    `LOCATION:${escapeIcsText('University of Tamanrasset, Route de l’Aéroport, Tamanrasset, Algeria')}`,
  ];

  if (item.source_url) {
    lines.push(`URL:${item.source_url}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function downloadAnnouncementIcs(
  item: AnnouncementItem,
  eventDateYmd: string,
  language: SupportedLanguage
): void {
  const icsContent = buildAnnouncementIcsContent(item, eventDateYmd, language);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeSlug = String(item.id).replace(/[^a-zA-Z0-9_-]/g, '-');
  link.href = url;
  link.download = `tamanrasset-${safeSlug}-${eventDateYmd}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
