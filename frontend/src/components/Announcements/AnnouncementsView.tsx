import {
  AlertCircle,
  CalendarPlus,
  ExternalLink,
  Info,
  MessageSquare,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TranslationStrings } from '../../i18n/translations';
import { campusApi, isSafeHttpUrl } from '../../services/api';
import type { AnnouncementItem, ApiMode, SupportedLanguage } from '../../types/api';
import {
  downloadAnnouncementIcs,
  extractAnnouncementEventDate,
} from '../../utils/icsCalendar';

interface AnnouncementsViewProps {
  language: SupportedLanguage;
  apiMode: ApiMode;
  isDevMode: boolean;
  onAskAboutNotice?: (prompt: string) => void;
  t: TranslationStrings;
}

const CATEGORY_KEYS = ['all', 'administrative', 'academic', 'exams', 'campus_life'] as const;

export function AnnouncementsView({
  language,
  apiMode,
  isDevMode,
  onAskAboutNotice,
  t,
}: AnnouncementsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadAnnouncements = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await campusApi.getAnnouncements(
        {
          q: searchQuery.trim() || undefined,
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          limit: 50,
          lang: language,
        },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) {
        return;
      }
      setItems(response.items);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setErrorMessage(
        error instanceof Error ? error.message : t.announcements.errorTitle
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [searchQuery, selectedCategory, language, t.announcements.errorTitle]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAnnouncements();
    }, 180);
    return () => {
      window.clearTimeout(timer);
      abortControllerRef.current?.abort();
    };
  }, [loadAnnouncements, apiMode]);

  function formatDate(iso: string | null): string {
    if (!iso) {
      return t.announcements.dateUnavailable;
    }
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
      return iso;
    }
    try {
      const locale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(parsed);
    } catch {
      return iso;
    }
  }

  function getCategoryLabel(category: string): string {
    return t.announcements.categories[category] ?? category;
  }

  return (
    <section aria-label={t.announcements.title} className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-[#121212] border border-neutral-800 rounded-xl p-6 no-print">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-neutral-100">{t.announcements.title}</h1>
            <p className="mt-1 text-sm text-neutral-400">{t.announcements.description}</p>
          </div>
          {!isLoading && !errorMessage && (
            <p className="text-xs font-medium text-neutral-400 tabular-nums whitespace-nowrap shrink-0">
              {t.announcements.resultCount(items.length)}
            </p>
          )}
        </div>

        {/* Search Input & Category Filter Tabs */}
        <div className="mt-5 flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="relative flex-1">
            <label htmlFor="announcement-search-input" className="sr-only">
              {t.announcements.searchLabel}
            </label>
            <Search
              className="w-4 h-4 text-neutral-500 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="announcement-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.announcements.searchPlaceholder}
              className="w-full rounded-lg border border-neutral-800 bg-[#181818] ps-10 pe-10 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-700 focus:outline-none min-h-[44px] transition-colors"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t.announcements.resetFilters}
                className="absolute top-1/2 -translate-y-1/2 end-2.5 p-1.5 text-neutral-400 hover:text-neutral-100 rounded"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label={t.announcements.title}
            className="flex items-center gap-1 p-1 bg-[#181818] border border-neutral-800 rounded-lg overflow-x-auto"
          >
            {CATEGORY_KEYS.map((cat) => {
              const isActive = selectedCategory === cat;
              const label =
                cat === 'all' ? t.announcements.categoryAll : getCategoryLabel(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  aria-pressed={isActive}
                  className={`px-3.5 py-2 rounded-md text-xs font-medium transition-all duration-200 ease-out whitespace-nowrap shrink-0 min-h-[36px] ${
                    isActive
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {isDevMode && apiMode === 'mock' && (
          <div className="mt-4 flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-amber-950/30 border border-amber-900/60 text-xs text-amber-200">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            <span>{t.announcements.mockBanner}</span>
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="bg-[#121212] border border-neutral-800 rounded-xl overflow-hidden print-container">
        {isLoading ? (
          <div className="divide-y divide-neutral-800" aria-label={t.announcements.loading}>
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="p-6 space-y-3 animate-pulse">
                <div className="h-3 w-40 bg-neutral-800 rounded" />
                <div className="h-5 w-2/3 bg-neutral-800 rounded" />
                <div className="h-4 w-full bg-neutral-900 rounded" />
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <div role="alert" className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-red-100">
                  {t.announcements.errorTitle}
                </h2>
                <p className="mt-1 text-xs text-red-300">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadAnnouncements()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-700 bg-[#1a1a1a] text-xs font-medium text-neutral-100 hover:border-neutral-500 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.announcements.retry}</span>
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-start">
            <h2 className="text-base font-semibold text-neutral-100">
              {t.announcements.emptyTitle}
            </h2>
            <p className="mt-1.5 text-sm text-neutral-400">{t.announcements.emptyBody}</p>
            {(searchQuery.length > 0 || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-4 px-4 py-2 rounded-lg border border-neutral-700 bg-[#1a1a1a] text-xs font-medium text-neutral-100 hover:border-neutral-500 transition-colors min-h-[40px]"
              >
                {t.announcements.resetFilters}
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {items.map((item) => {
              const safeUrl = isSafeHttpUrl(item.source_url) ? item.source_url : null;
              const displayTitle = item.localizedTitles?.[language] ?? item.title;
              const displayContent = item.localizedContents?.[language] ?? item.content;
              const eventDate = extractAnnouncementEventDate(item);

              return (
                <li
                  key={String(item.id)}
                  className="p-6 hover:bg-neutral-900/50 transition-colors duration-200 ease-out print-message-card"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400 tabular-nums">
                    <span className="font-medium text-neutral-200">
                      {getCategoryLabel(item.category)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {t.announcements.publishedLabel}: {formatDate(item.published_at)}
                    </span>
                  </div>

                  <h2 className="mt-2 text-base font-semibold text-neutral-100 leading-snug">
                    {displayTitle}
                  </h2>

                  <p className="mt-2 text-sm text-neutral-300 leading-relaxed max-w-4xl">
                    {displayContent}
                  </p>

                  {(safeUrl || eventDate || onAskAboutNotice) && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 no-print">
                      {safeUrl && (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline min-h-[32px]"
                        >
                          <span>{t.announcements.officialLink}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        </a>
                      )}

                      {eventDate && (
                        <button
                          type="button"
                          onClick={() => downloadAnnouncementIcs(item, eventDate, language)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/50 transition-all duration-200 ease-out min-h-[32px]"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{t.announcements.addToCalendar}</span>
                        </button>
                      )}

                      {onAskAboutNotice && (
                        <button
                          type="button"
                          onClick={() =>
                            onAskAboutNotice(
                              t.announcements.askAboutNoticePrompt(displayTitle)
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-800 bg-[#181818] text-xs font-medium text-neutral-300 hover:border-neutral-600 hover:text-white transition-all duration-200 ease-out min-h-[32px]"
                        >
                          <MessageSquare className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{t.announcements.askAssistantAction}</span>
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
