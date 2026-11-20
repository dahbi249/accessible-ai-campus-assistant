import { ExternalLink, FileText, Info } from 'lucide-react';
import type { TranslationStrings } from '../../i18n/translations';
import { isSafeHttpUrl } from '../../services/api';
import type { ChatSource, ChatStatus } from '../../types/api';

interface SourcesPanelProps {
  sources: ChatSource[];
  activeStatus?: ChatStatus;
  highlightedSourceId?: string | null;
  onSelectSource?: (sourceId: string) => void;
  t: TranslationStrings;
}

export function SourcesPanel({
  sources,
  activeStatus,
  highlightedSourceId,
  onSelectSource,
  t,
}: SourcesPanelProps) {
  const validSources = sources.filter(
    (source) => source.title.trim().length > 0 && source.source_id.trim().length > 0
  );

  return (
    <aside
      aria-label={t.sources.panelTitle}
      className="flex flex-col bg-[#121212] border border-neutral-800 rounded-xl p-5 h-full"
    >
      <div className="pb-4 border-b border-neutral-800">
        <h2 className="text-base font-semibold text-neutral-100">{t.sources.panelTitle}</h2>
        <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{t.sources.panelSubtitle}</p>
      </div>

      <div className="flex-1 pt-4 overflow-y-auto">
        {validSources.length === 0 ? (
          <div className="py-8 px-2 text-start">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#1a1a1a] border border-neutral-800 text-neutral-400 mb-3">
              {activeStatus === 'not_found' ? (
                <Info className="w-4 h-4" aria-hidden="true" />
              ) : (
                <FileText className="w-4 h-4" aria-hidden="true" />
              )}
            </div>
            <h3 className="text-sm font-medium text-neutral-200">
              {activeStatus === 'not_found'
                ? t.chat.notFoundTitle
                : t.sources.emptyTitle}
            </h3>
            <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed">
              {activeStatus === 'not_found'
                ? t.sources.noSourcesForNotFound
                : t.sources.emptyBody}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800" aria-label={t.sources.panelTitle}>
            {validSources.map((source) => {
              const isHighlighted = highlightedSourceId === source.source_id;
              const safeUrl = isSafeHttpUrl(source.url) ? source.url : null;

              return (
                <li
                  key={source.source_id}
                  className={`py-3.5 first:pt-1 last:pb-1 transition-all duration-200 ease-out ${
                    isHighlighted ? 'bg-neutral-900/90 -mx-2.5 px-2.5 rounded-lg' : ''
                  }`}
                >
                  {onSelectSource ? (
                    <button
                      type="button"
                      onClick={() => onSelectSource(source.source_id)}
                      className="w-full text-start text-sm font-medium text-neutral-100 leading-snug hover:text-emerald-400 transition-colors rounded"
                    >
                      {source.title}
                    </button>
                  ) : (
                    <h3 className="text-sm font-medium text-neutral-100 leading-snug">
                      {source.title}
                    </h3>
                  )}

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400 tabular-nums">
                    <span>
                      {t.sources.typeLabel}: {source.source_type}
                    </span>
                    {source.page !== null && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{t.sources.pageLabel(source.page)}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span dir="ltr" className="font-mono text-[11px] text-neutral-500">
                      {t.sources.sourceIdLabel}: {source.source_id}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    {safeUrl ? (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline focus-visible:rounded"
                      >
                        <span>{t.sources.openOfficialUrl}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-xs text-neutral-500">{t.sources.noExternalUrl}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
