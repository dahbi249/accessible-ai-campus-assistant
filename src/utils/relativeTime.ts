import type { SupportedLanguage } from '../types/api';

function getLocale(language: SupportedLanguage): string {
  if (language === 'ar') return 'ar-DZ';
  if (language === 'fr') return 'fr-FR';
  return 'en-US';
}

export function formatAbsoluteTimestamp(
  iso: string,
  language: SupportedLanguage
): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat(getLocale(language), {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
}

export function formatRelativeTimestamp(
  iso: string,
  language: SupportedLanguage,
  nowMs: number = Date.now()
): string {
  const targetMs = new Date(iso).getTime();
  if (Number.isNaN(targetMs)) {
    return '';
  }

  const diffSeconds = Math.max(0, Math.floor((nowMs - targetMs) / 1000));

  if (diffSeconds < 45) {
    if (language === 'ar') return 'الآن';
    if (language === 'fr') return 'à l’instant';
    return 'just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    const mins = Math.max(1, diffMinutes);
    if (language === 'ar') return `منذ ${mins} د`;
    if (language === 'fr') return `il y a ${mins} min`;
    return `${mins}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    if (language === 'ar') return `منذ ${diffHours} س`;
    if (language === 'fr') return `il y a ${diffHours} h`;
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    if (language === 'ar') return `منذ ${diffDays} ي`;
    if (language === 'fr') return `il y a ${diffDays} j`;
    return `${diffDays}d ago`;
  }

  try {
    return new Intl.DateTimeFormat(getLocale(language), {
      month: 'short',
      day: 'numeric',
    }).format(new Date(targetMs));
  } catch {
    return '';
  }
}
