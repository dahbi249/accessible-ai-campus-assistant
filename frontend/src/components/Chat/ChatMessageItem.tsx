import {
  Check,
  Copy,
  Flag,
  Info,
  Pencil,
  Printer,
  Radio,
  RefreshCw,
  ShieldCheck,
  ThumbsUp,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { RefObject } from 'react';
import type { TranslationStrings } from '../../i18n/translations';
import type { ChatMessage, ChatStatus, FeedbackRating } from '../../types/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TypingIndicator } from './TypingIndicator';

interface ChatMessageItemProps {
  msg: ChatMessage;
  isLastUser: boolean;
  isGenerating: boolean;
  isSelected: boolean;
  highlightedSourceId: string | null;
  isCopied: boolean;
  isCopyFailed: boolean;
  isAnnounced: boolean;
  isSpeaking: boolean;
  ttsSupported: boolean;
  isStreamingThis: boolean;
  streamedContent: string;
  isDevMode: boolean;
  canRegenerate: boolean;
  hiddenDuringFocusedPrint: boolean;
  isEditingLastPrompt: boolean;
  editPromptDraft: string;
  editTextareaRef: RefObject<HTMLTextAreaElement | null>;
  onEditPromptDraftChange: (value: string) => void;
  onStartEditLastPrompt: (msg: ChatMessage) => void;
  onCancelEditPrompt: () => void;
  onSaveEditedPrompt: () => void;
  onInspectSources: (msg: ChatMessage, sourceId?: string) => void;
  onMessageFeedback: (messageId: string, rating: FeedbackRating) => void;
  onAnnounceMessage: (
    messageId: string,
    content: string,
    status: ChatStatus,
    validSourcesCount: number
  ) => void;
  onToggleSpeakMessage: (messageId: string, content: string) => void;
  onRegenerateLastResponse: () => void;
  onPrintMessage: (messageId: string) => void;
  onCopyAnswer: (messageId: string, content: string) => void;
  relativeTimestamp: string;
  exactTimestamp: string;
  t: TranslationStrings;
}

export function ChatMessageItem({
  msg,
  isLastUser,
  isGenerating,
  isSelected,
  highlightedSourceId,
  isCopied,
  isCopyFailed,
  isAnnounced,
  isSpeaking,
  ttsSupported,
  isStreamingThis,
  streamedContent,
  isDevMode,
  canRegenerate,
  hiddenDuringFocusedPrint,
  isEditingLastPrompt,
  editPromptDraft,
  editTextareaRef,
  onEditPromptDraftChange,
  onStartEditLastPrompt,
  onCancelEditPrompt,
  onSaveEditedPrompt,
  onInspectSources,
  onMessageFeedback,
  onAnnounceMessage,
  onToggleSpeakMessage,
  onRegenerateLastResponse,
  onPrintMessage,
  onCopyAnswer,
  relativeTimestamp,
  exactTimestamp,
  t,
}: ChatMessageItemProps) {
  const isUser = msg.role === 'user';
  const isNotFound = msg.status === 'not_found';
  const displayedContent = isStreamingThis ? streamedContent : msg.content;
  const validSources = (msg.sources ?? []).filter((s) => s.title.trim().length > 0);
  const validSourcesCount = validSources.length;

  return (
    <article
      data-testid={`chat-message-${msg.id}`}
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${
        hiddenDuringFocusedPrint ? 'print:hidden' : ''
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1.5 tabular-nums">
        <span className="font-medium text-neutral-300">
          {isUser ? t.chat.youLabel : t.chat.assistantLabel}
        </span>
        {relativeTimestamp && (
          <>
            <span aria-hidden="true">·</span>
            <time
              dateTime={msg.timestamp}
              title={exactTimestamp || undefined}
              data-testid={`message-timestamp-${msg.id}`}
              className="text-neutral-500"
            >
              <span className="print:hidden">{relativeTimestamp}</span>
              {exactTimestamp && (
                <span className="hidden print:inline">{exactTimestamp}</span>
              )}
            </time>
          </>
        )}
        {isDevMode && msg.isMock && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400/90 no-print">{t.workspace.modeMock}</span>
          </>
        )}
        {isLastUser && !isGenerating && !isEditingLastPrompt && (
          <button
            type="button"
            onClick={() => onStartEditLastPrompt(msg)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-neutral-800 bg-[#161616] text-[11px] font-medium text-neutral-300 hover:border-neutral-600 hover:text-white transition-colors no-print"
          >
            <Pencil className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>{t.chat.editPrompt}</span>
          </button>
        )}
      </div>

      <div
        className={`max-w-[94%] sm:max-w-[85%] rounded-xl px-5 py-4 text-[15px] leading-relaxed transition-all duration-200 ease-out print-message-card ${
          isUser
            ? 'bg-[#1b2b27] border border-emerald-900/60 text-neutral-100'
            : isNotFound
            ? 'bg-amber-950/25 border border-amber-900/60 text-neutral-100'
            : `bg-[#151515] border text-neutral-100 ${
                isSelected ? 'border-emerald-700/80' : 'border-neutral-800'
              }`
        }`}
      >
        {!isUser && (
          <div className="hidden print:block pb-2 mb-3 border-b border-neutral-300 text-xs font-semibold">
            {t.chat.printHeading}
          </div>
        )}

        {isNotFound && (
          <div className="flex items-center gap-2 text-amber-300 font-medium text-xs mb-2.5">
            <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.chat.notFoundTitle}</span>
          </div>
        )}

        {isUser ? (
          isLastUser && isEditingLastPrompt ? (
            <div className="space-y-2.5 min-w-[240px] sm:min-w-[340px]">
              <textarea
                ref={editTextareaRef}
                rows={3}
                value={editPromptDraft}
                onChange={(e) => onEditPromptDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancelEditPrompt();
                  } else if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSaveEditedPrompt();
                  }
                }}
                aria-label={t.chat.editPrompt}
                className="w-full rounded-lg border border-emerald-700/70 bg-[#101917] px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 resize-y"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancelEditPrompt}
                  className="px-2.5 py-1 rounded-md border border-neutral-700 bg-[#171717] text-xs font-medium text-neutral-300 hover:text-white transition-colors"
                >
                  {t.chat.cancelEdit}
                </button>
                <button
                  type="button"
                  onClick={onSaveEditedPrompt}
                  disabled={editPromptDraft.trim().length === 0}
                  className="px-3 py-1 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {t.chat.saveAndSend}
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-neutral-100">{msg.content}</p>
          )
        ) : (
          <MarkdownRenderer
            content={displayedContent}
            isStreaming={isStreamingThis}
            copyCodeLabel={t.chat.copyCode}
            copiedCodeLabel={t.chat.copiedCode}
          />
        )}

        {isUser && msg.piiRedactedTypes && msg.piiRedactedTypes.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-emerald-900/50 flex items-center gap-1.5 text-[11px] text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              {t.chat.piiNotice(
                msg.piiRedactedTypes.map((type) => t.chat.piiLabels[type])
              )}
            </span>
          </div>
        )}

        {isNotFound && (
          <p className="mt-3 pt-2.5 border-t border-amber-900/50 text-xs text-amber-200/90">
            {t.chat.notFoundGuidance}
          </p>
        )}

        {!isUser && validSourcesCount > 0 && (
          <div className="hidden print:block mt-4 pt-2 border-t border-neutral-300 text-xs space-y-1">
            <p className="font-semibold">{t.sources.panelTitle}:</p>
            <ul className="list-disc ps-5 space-y-0.5">
              {validSources.map((src) => (
                <li key={src.source_id}>
                  {src.title}
                  {src.page ? ` (${t.sources.pageLabel(src.page)})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isUser && isStreamingThis && (
          <TypingIndicator label={t.chat.typingLabel} compact />
        )}

        {!isUser && !isStreamingThis && (
          <div
            className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2.5 no-print ${
              isNotFound ? 'border-amber-900/50' : 'border-neutral-800'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {validSourcesCount > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => onInspectSources(msg)}
                    aria-pressed={isSelected}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline whitespace-nowrap shrink-0 min-h-[32px] inline-flex items-center"
                  >
                    {t.chat.viewSources} ({validSourcesCount})
                  </button>
                  <div className="flex items-center gap-1">
                    {validSources.map((src, idx) => {
                      const activePin =
                        isSelected && highlightedSourceId === src.source_id;
                      return (
                        <button
                          key={src.source_id}
                          type="button"
                          onClick={() => onInspectSources(msg, src.source_id)}
                          title={src.title}
                          className={`px-1.5 py-0.5 rounded border text-[11px] font-mono tabular-nums transition-colors ${
                            activePin
                              ? 'border-emerald-500/70 bg-emerald-950/60 text-emerald-300'
                              : 'border-neutral-800 bg-[#1a1a1a] text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
                          }`}
                        >
                          [{idx + 1}]
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onMessageFeedback(msg.id, 'helpful')}
                aria-pressed={msg.feedback === 'helpful'}
                title={t.chat.feedbackHelpful}
                aria-label={t.chat.feedbackHelpful}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-all duration-200 ease-out min-h-[32px] ${
                  msg.feedback === 'helpful'
                    ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                    : 'border-neutral-800 bg-[#1a1a1a] text-neutral-400 hover:border-neutral-600 hover:text-white'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onMessageFeedback(msg.id, 'inaccurate')}
                aria-pressed={msg.feedback === 'inaccurate'}
                title={t.chat.feedbackReport}
                aria-label={t.chat.feedbackReport}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-all duration-200 ease-out min-h-[32px] ${
                  msg.feedback === 'inaccurate'
                    ? 'border-amber-500/60 bg-amber-950/40 text-amber-300'
                    : 'border-neutral-800 bg-[#1a1a1a] text-neutral-400 hover:border-neutral-600 hover:text-white'
                }`}
              >
                <Flag className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() =>
                  onAnnounceMessage(
                    msg.id,
                    msg.content,
                    msg.status ?? 'answered',
                    validSourcesCount
                  )
                }
                aria-label={`${t.chat.announceAnswer}: ${msg.content.slice(0, 48)}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all duration-200 ease-out whitespace-nowrap shrink-0 min-h-[32px] ${
                  isAnnounced
                    ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                    : 'border-neutral-800 bg-[#1a1a1a] text-neutral-300 hover:border-neutral-600 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {isAnnounced ? t.chat.announcedStatus : t.chat.announceAnswer}
                </span>
              </button>

              {ttsSupported && (
                <button
                  type="button"
                  onClick={() => onToggleSpeakMessage(msg.id, msg.content)}
                  aria-pressed={isSpeaking}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all duration-200 ease-out whitespace-nowrap shrink-0 min-h-[32px] ${
                    isSpeaking
                      ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                      : 'border-neutral-800 bg-[#1a1a1a] text-neutral-300 hover:border-neutral-600 hover:text-white'
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{t.chat.stopListening}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{t.chat.listenAnswer}</span>
                    </>
                  )}
                </button>
              )}

              {canRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerateLastResponse}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-800 bg-[#1a1a1a] text-xs font-medium text-neutral-300 hover:border-neutral-600 hover:text-white transition-all duration-200 ease-out whitespace-nowrap shrink-0 min-h-[32px]"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{t.chat.regenerateResponse}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onPrintMessage(msg.id)}
                aria-label={`${t.chat.printAnswer}: ${msg.content.slice(0, 48)}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-800 bg-[#1a1a1a] text-xs font-medium text-neutral-300 hover:border-neutral-600 hover:text-white transition-all duration-200 ease-out whitespace-nowrap shrink-0 min-h-[32px]"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{t.chat.printAnswer}</span>
              </button>

              <button
                type="button"
                onClick={() => onCopyAnswer(msg.id, msg.content)}
                aria-label={`${t.chat.copyAnswer}: ${msg.content.slice(0, 48)}`}
                title={isCopied ? t.chat.copiedAnswer : t.chat.copyAnswer}
                data-copied={isCopied ? 'true' : 'false'}
                data-testid={`copy-message-${msg.id}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all duration-200 ease-out whitespace-nowrap shrink-0 min-h-[32px] ${
                  isCopied
                    ? 'border-emerald-500/70 bg-emerald-950/60 text-emerald-300'
                    : isCopyFailed
                    ? 'border-red-500/60 bg-red-950/40 text-red-300'
                    : 'border-neutral-800 bg-[#1a1a1a] text-neutral-300 hover:border-neutral-600 hover:text-white'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>{t.chat.copiedAnswer}</span>
                  </>
                ) : isCopyFailed ? (
                  <>
                    <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t.chat.copyFailed}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t.chat.copyAnswer}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
