import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Download,
  Mic,
  MicOff,
  RotateCcw,
  ShieldAlert,
  Square,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { TranslationStrings } from '../../i18n/translations';
import { campusApi } from '../../services/api';
import type {
  ApiMode,
  ChatMessage,
  ChatSource,
  ChatStatus,
  FeedbackRating,
  PiiType,
  SupportedLanguage,
} from '../../types/api';
import { redactSensitivePii } from '../../utils/piiRedactor';
import {
  formatAbsoluteTimestamp,
  formatRelativeTimestamp,
} from '../../utils/relativeTime';
import { SourcesPanel } from '../Sources/SourcesPanel';
import { ChatMessageItem } from './ChatMessageItem';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TypingIndicator } from './TypingIndicator';

interface ChatInterfaceProps {
  language: SupportedLanguage;
  apiMode: ApiMode;
  isDevMode: boolean;
  announceResponses?: boolean;
  focusInputTrigger?: number;
  messages: ChatMessage[];
  conversationId: string | null;
  onMessagesChange: (messages: ChatMessage[]) => void;
  onConversationIdChange: (id: string | null) => void;
  pendingPrompt?: string | null;
  onConsumePendingPrompt?: () => void;
  t: TranslationStrings;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface WindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const win = window as WindowWithSpeech;
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

function getSpeechLocale(language: SupportedLanguage): string {
  if (language === 'ar') return 'ar-DZ';
  if (language === 'fr') return 'fr-FR';
  return 'en-US';
}

function stripMarkdownForSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$([^$\n]+)\$/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createMessageId(prefix: 'user' | 'assistant'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    const ok =
      typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function ChatInterface({
  language,
  apiMode,
  isDevMode,
  announceResponses = true,
  focusInputTrigger = 0,
  messages,
  conversationId,
  onMessagesChange,
  onConversationIdChange,
  pendingPrompt,
  onConsumePendingPrompt,
  t,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [previewPiiTypes, setPreviewPiiTypes] = useState<PiiType[]>([]);
  const [isEditingLastPrompt, setIsEditingLastPrompt] = useState(false);
  const [editPromptDraft, setEditPromptDraft] = useState('');
  const [printingMessageId, setPrintingMessageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copyFailedMessageId, setCopyFailedMessageId] = useState<string | null>(null);
  const [announcedMessageId, setAnnouncedMessageId] = useState<string | null>(null);
  const [copyStatusAnnouncement, setCopyStatusAnnouncement] = useState<string>('');
  const [responseAnnouncement, setResponseAnnouncement] = useState<string>('');
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [isMobileSourcesOpen, setIsMobileSourcesOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Voice dictation & TTS state
  const [speechSupported] = useState<boolean>(() => Boolean(getSpeechRecognitionCtor()));
  const [ttsSupported] = useState<boolean>(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window
  );
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Streaming state (typewriter fallback for JSON/mock + live SSE buffer)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamedContent, setStreamedContent] = useState<string>('');
  const [liveStreamingContent, setLiveStreamingContent] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileSourcesDialogRef = useRef<HTMLDivElement | null>(null);
  const mobileSourcesCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const announceBadgeTimerRef = useRef<number | null>(null);
  const announceReemitTimerRef = useRef<number | null>(null);
  const streamTimerRef = useRef<number | null>(null);
  const liveStreamingContentRef = useRef<string | null>(null);
  const latestMessagesRef = useRef<ChatMessage[]>(messages);
  const responseAnnouncementRef = useRef<string>('');
  const sessionEpochRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const scrollRafRef = useRef<number | null>(null);
  const programmaticScrollUntilRef = useRef(0);
  const lastScrollTopRef = useRef(0);
  const prevMessageCountRef = useRef(messages.length);

  latestMessagesRef.current = messages;
  liveStreamingContentRef.current = liveStreamingContent;
  responseAnnouncementRef.current = responseAnnouncement;

  // Trap focus inside Mobile/Tablet Slide-Over Sources Drawer & restore focus to opener on close
  useFocusTrap({
    isActive: isMobileSourcesOpen,
    containerRef: mobileSourcesDialogRef,
    initialFocusRef: mobileSourcesCloseBtnRef,
    onClose: () => setIsMobileSourcesOpen(false),
  });

  // Focus composer textarea when global `/` or `Ctrl/Cmd+Shift+O` triggers
  useEffect(() => {
    if (focusInputTrigger <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusInputTrigger]);

  // Refresh relative timestamps smoothly every 30s while messages are present
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [messages.length]);

  // Lightweight debounced pre-send PII detection while student types
  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setPreviewPiiTypes([]);
      return;
    }
    const timer = window.setTimeout(() => {
      const { redactedTypes } = redactSensitivePii(trimmed);
      setPreviewPiiTypes(redactedTypes);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [input]);

  // Trigger native browser print after isolating target assistant message if chosen
  useEffect(() => {
    if (!printingMessageId) {
      return;
    }
    const clearPrintTarget = () => {
      setPrintingMessageId(null);
    };
    window.addEventListener('afterprint', clearPrintTarget);
    const rafId = window.requestAnimationFrame(() => {
      try {
        window.print();
      } catch {
        clearPrintTarget();
      }
    });
    const fallbackTimer = window.setTimeout(clearPrintTarget, 1500);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('afterprint', clearPrintTarget);
    };
  }, [printingMessageId]);

  const stopSpeechOutput = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  }, []);

  const stopVoiceDictation = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors if already ended
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const stopStreaming = useCallback(() => {
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setStreamingMessageId(null);
    setStreamedContent('');
  }, []);

  const announceAssistantMessage = useCallback(
    (
      messageId: string,
      rawContent: string,
      status: ChatStatus,
      sourcesCount: number,
      force = false
    ) => {
      if (!force && !announceResponses) {
        return;
      }

      const cleanText = stripMarkdownForSpeech(rawContent);
      const preview =
        force || cleanText.length <= 260
          ? cleanText
          : `${cleanText.slice(0, 257).trimEnd()}...`;
      const summary = t.chat.responseCompleteAnnouncement(status, sourcesCount, preview);

      if (announceReemitTimerRef.current !== null) {
        window.clearTimeout(announceReemitTimerRef.current);
        announceReemitTimerRef.current = null;
      }

      if (responseAnnouncementRef.current === summary) {
        setResponseAnnouncement('');
        announceReemitTimerRef.current = window.setTimeout(() => {
          setResponseAnnouncement(summary);
          announceReemitTimerRef.current = null;
        }, 25);
      } else {
        setResponseAnnouncement(summary);
      }

      if (force) {
        setAnnouncedMessageId(messageId);
        if (announceBadgeTimerRef.current !== null) {
          window.clearTimeout(announceBadgeTimerRef.current);
        }
        announceBadgeTimerRef.current = window.setTimeout(() => {
          setAnnouncedMessageId(null);
          announceBadgeTimerRef.current = null;
        }, 2200);
      }
    },
    [announceResponses, t.chat]
  );

  const startStreamingReveal = useCallback(
    (messageId: string, fullText: string, status: ChatStatus, sourcesCount: number) => {
      stopStreaming();

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion || fullText.length === 0) {
        announceAssistantMessage(messageId, fullText, status, sourcesCount, false);
        return;
      }

      const tokens = fullText.split(/(\s+)/);
      let cursor = 0;
      const chunkSize = tokens.length > 140 ? 5 : 3;

      setStreamingMessageId(messageId);
      setStreamedContent('');

      streamTimerRef.current = window.setInterval(() => {
        cursor = Math.min(cursor + chunkSize, tokens.length);
        setStreamedContent(tokens.slice(0, cursor).join(''));
        if (cursor >= tokens.length) {
          stopStreaming();
          announceAssistantMessage(messageId, fullText, status, sourcesCount, false);
        }
      }, 24);
    },
    [announceAssistantMessage, stopStreaming]
  );

  const scrollToLatest = useCallback((force = false) => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    if (!force && !isNearBottomRef.current) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

    if (scrollRafRef.current !== null) {
      window.cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (!container.isConnected) {
        return;
      }
      programmaticScrollUntilRef.current = prefersReducedMotion ? 0 : Date.now() + 360;
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      } else if (threadEndRef.current && typeof threadEndRef.current.scrollIntoView === 'function') {
        threadEndRef.current.scrollIntoView({
          behavior,
          block: 'end',
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
      isNearBottomRef.current = true;
      setShowJumpToLatest(false);
    });
  }, []);

  function handleThreadScroll() {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const currentTop = container.scrollTop;
    const scrolledUp = currentTop < lastScrollTopRef.current - 6;
    lastScrollTopRef.current = currentTop;

    const distanceFromBottom =
      container.scrollHeight - currentTop - container.clientHeight;
    const nearBottom = distanceFromBottom <= 96;

    if (scrolledUp && !nearBottom) {
      programmaticScrollUntilRef.current = 0;
      isNearBottomRef.current = false;
      setShowJumpToLatest(messages.length > 0);
      return;
    }

    if (Date.now() < programmaticScrollUntilRef.current && !scrolledUp) {
      return;
    }

    isNearBottomRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom && messages.length > 0);
  }

  // Cancel any in-flight request/streaming/audio when conversation is reset
  useEffect(() => {
    if (messages.length === 0 && conversationId === null) {
      sessionEpochRef.current += 1;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      stopStreaming();
      stopVoiceDictation();
      stopSpeechOutput();
      setLiveStreamingContent(null);
      setIsLoading(false);
      setErrorMessage(null);
      setLastFailedPrompt(null);
      setSelectedMessageId(null);
      setHighlightedSourceId(null);
      setCopiedMessageId(null);
      setCopyFailedMessageId(null);
      setAnnouncedMessageId(null);
      setResponseAnnouncement('');
      setShowJumpToLatest(false);
      setIsMobileSourcesOpen(false);
      isNearBottomRef.current = true;
    }
  }, [
    messages.length,
    conversationId,
    stopStreaming,
    stopVoiceDictation,
    stopSpeechOutput,
  ]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      stopStreaming();
      stopVoiceDictation();
      stopSpeechOutput();
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      if (announceBadgeTimerRef.current !== null) {
        window.clearTimeout(announceBadgeTimerRef.current);
      }
      if (announceReemitTimerRef.current !== null) {
        window.clearTimeout(announceReemitTimerRef.current);
      }
    };
  }, [stopStreaming, stopVoiceDictation, stopSpeechOutput]);

  useEffect(() => {
    const messageAdded = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (
      messageAdded ||
      messages.length > 0 ||
      isLoading ||
      errorMessage ||
      streamingMessageId ||
      liveStreamingContent !== null
    ) {
      scrollToLatest(false);
    }
  }, [
    messages,
    isLoading,
    errorMessage,
    streamingMessageId,
    streamedContent,
    liveStreamingContent,
    scrollToLatest,
  ]);

  const activeAssistantMessage =
    messages.find((m) => m.id === selectedMessageId && m.role === 'assistant') ??
    [...messages].reverse().find((m) => m.role === 'assistant');

  const activeSources: ChatSource[] = activeAssistantMessage?.sources ?? [];

  async function handleCopyAnswer(messageId: string, content: string) {
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }

    const ok = await copyTextToClipboard(content);
    if (ok) {
      setCopiedMessageId(messageId);
      setCopyFailedMessageId(null);
      setCopyStatusAnnouncement(t.chat.copiedAnswer);
    } else {
      setCopiedMessageId(null);
      setCopyFailedMessageId(messageId);
      setCopyStatusAnnouncement(t.chat.copyFailed);
    }

    copyTimerRef.current = window.setTimeout(() => {
      setCopiedMessageId(null);
      setCopyFailedMessageId(null);
      setCopyStatusAnnouncement('');
      copyTimerRef.current = null;
    }, 2000);
  }

  function handleToggleSpeakMessage(messageId: string, rawContent: string) {
    if (!ttsSupported) {
      return;
    }

    if (speakingMessageId === messageId) {
      stopSpeechOutput();
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = stripMarkdownForSpeech(rawContent);
    if (!cleanText) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = getSpeechLocale(language);
    utterance.onend = () => {
      setSpeakingMessageId((current) => (current === messageId ? null : current));
    };
    utterance.onerror = () => {
      setSpeakingMessageId((current) => (current === messageId ? null : current));
    };

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  }

  function handleToggleVoiceDictation() {
    if (isListening) {
      stopVoiceDictation();
      return;
    }

    const RecognitionCtor = getSpeechRecognitionCtor();
    if (!RecognitionCtor) {
      return;
    }

    try {
      const recognition = new RecognitionCtor();
      recognition.lang = getSpeechLocale(language);
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const chunks: string[] = [];
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result && result.length > 0 && result[0]) {
            chunks.push(result[0].transcript);
          }
        }
        const spoken = chunks.join(' ').trim();
        if (spoken) {
          setInput((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
    }
  }

  function handleStopGeneration() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    stopStreaming();

    const partial = liveStreamingContentRef.current;
    if (partial && partial.trim().length > 0) {
      const partialMsg: ChatMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: partial,
        language,
        timestamp: new Date().toISOString(),
        sources: [],
        status: 'answered',
        isMock: apiMode === 'mock',
      };
      onMessagesChange([...latestMessagesRef.current, partialMsg]);
      setSelectedMessageId(partialMsg.id);
    }

    setLiveStreamingContent(null);
    setIsLoading(false);
  }

  const submitPrompt = useCallback(
    async (
      promptText: string,
      appendUserTurn = true,
      baseMessagesOverride?: ChatMessage[]
    ) => {
      const trimmed = promptText.trim();
      if (!trimmed || isLoading) {
        return;
      }

      stopVoiceDictation();
      stopSpeechOutput();
      stopStreaming();
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestEpoch = sessionEpochRef.current;

      setIsEditingLastPrompt(false);
      setErrorMessage(null);
      setLastFailedPrompt(null);
      setLiveStreamingContent(null);
      setResponseAnnouncement('');
      isNearBottomRef.current = true;

      const { sanitizedText, redactedTypes } = redactSensitivePii(trimmed);

      let nextMessages = baseMessagesOverride ?? latestMessagesRef.current;
      if (appendUserTurn) {
        const userMsg: ChatMessage = {
          id: createMessageId('user'),
          role: 'user',
          content: sanitizedText,
          language,
          timestamp: new Date().toISOString(),
          piiRedactedTypes: redactedTypes.length > 0 ? redactedTypes : undefined,
        };
        nextMessages = [...nextMessages, userMsg];
        onMessagesChange(nextMessages);
        setInput('');
        setPreviewPiiTypes([]);
      } else if (baseMessagesOverride) {
        onMessagesChange(nextMessages);
      }

      setIsLoading(true);
      scrollToLatest(true);

      try {
        const { response, streamedViaSse } = await campusApi.sendChatMessageStream(
          {
            message: sanitizedText,
            language,
            conversation_id: conversationId,
          },
          {
            onToken: (accumulatedText) => {
              if (!controller.signal.aborted && requestEpoch === sessionEpochRef.current) {
                setLiveStreamingContent(accumulatedText);
              }
            },
          },
          { signal: controller.signal }
        );

        if (controller.signal.aborted || requestEpoch !== sessionEpochRef.current) {
          return;
        }

        setLiveStreamingContent(null);
        onConversationIdChange(response.conversation_id);

        if (response.status === 'error') {
          setErrorMessage(response.answer || t.chat.errorTitle);
          setLastFailedPrompt(sanitizedText);
          return;
        }

        const assistantMsg: ChatMessage = {
          id: createMessageId('assistant'),
          role: 'assistant',
          content: response.answer,
          language: response.language,
          timestamp: new Date().toISOString(),
          sources: response.sources,
          status: response.status,
          isMock: apiMode === 'mock',
        };

        onMessagesChange([...nextMessages, assistantMsg]);
        setSelectedMessageId(assistantMsg.id);
        setHighlightedSourceId(response.sources[0]?.source_id ?? null);
        if (streamedViaSse) {
          announceAssistantMessage(
            assistantMsg.id,
            assistantMsg.content,
            response.status,
            response.sources.length,
            false
          );
        } else {
          startStreamingReveal(
            assistantMsg.id,
            assistantMsg.content,
            response.status,
            response.sources.length
          );
        }
        scrollToLatest(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        if (requestEpoch !== sessionEpochRef.current) {
          return;
        }
        setLiveStreamingContent(null);
        setErrorMessage(
          error instanceof Error ? error.message : t.chat.errorTitle
        );
        setLastFailedPrompt(sanitizedText);
      } finally {
        if (requestEpoch === sessionEpochRef.current) {
          setIsLoading(false);
        }
      }
    },
    [
      announceAssistantMessage,
      apiMode,
      conversationId,
      isLoading,
      language,
      onConversationIdChange,
      onMessagesChange,
      scrollToLatest,
      startStreamingReveal,
      stopSpeechOutput,
      stopStreaming,
      stopVoiceDictation,
      t.chat.errorTitle,
    ]
  );

  // Automatically execute prompt triggered from the Campus Map bridge
  useEffect(() => {
    if (!pendingPrompt || isLoading) {
      return;
    }
    const promptToSend = pendingPrompt;
    onConsumePendingPrompt?.();
    void submitPrompt(promptToSend, true);
  }, [pendingPrompt, isLoading, onConsumePendingPrompt, submitPrompt]);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitPrompt(input, true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!isGenerating) {
        void submitPrompt(input, true);
      }
    }
  }

  function handleStarterClick(question: string) {
    setInput(question);
    inputRef.current?.focus();
    void submitPrompt(question, true);
  }

  function handleInspectSources(msg: ChatMessage, specificSourceId?: string) {
    setSelectedMessageId(msg.id);
    setHighlightedSourceId(specificSourceId ?? msg.sources?.[0]?.source_id ?? null);
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setIsMobileSourcesOpen(true);
    }
  }

  async function handleMessageFeedback(messageId: string, rating: FeedbackRating) {
    const updated = latestMessagesRef.current.map((item) =>
      item.id === messageId ? { ...item, feedback: rating } : item
    );
    onMessagesChange(updated);
    setCopyStatusAnnouncement(t.chat.feedbackRecorded);

    try {
      await campusApi.submitMessageFeedback({
        message_id: messageId,
        rating,
        language,
      });
    } catch {
      // Non-blocking feedback logging
    }
  }

  function handleDownloadTranscript() {
    if (messages.length === 0) {
      return;
    }
    const header = `# ${t.appName} — Transcript\n\n`;
    const body = messages
      .map((msg) => {
        const speaker = msg.role === 'user' ? t.chat.youLabel : t.chat.assistantLabel;
        const citations =
          msg.sources && msg.sources.length > 0
            ? `\n\nSources:\n${msg.sources
                .map((s) => `- ${s.title}${s.url ? ` (${s.url})` : ''}`)
                .join('\n')}`
            : '';
        return `## ${speaker} (${formatTimestamp(msg.timestamp)})\n\n${msg.content}${citations}`;
      })
      .join('\n\n---\n\n');

    const blob = new Blob([`${header}${body}\n`], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `campus-assistant-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function formatTimestamp(iso: string): string {
    return formatAbsoluteTimestamp(iso, language);
  }

  const isGenerating = isLoading || streamingMessageId !== null;

  let lastUserMessageIndex = -1;
  let lastAssistantMessageIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (lastUserMessageIndex === -1 && messages[i].role === 'user') {
      lastUserMessageIndex = i;
    }
    if (lastAssistantMessageIndex === -1 && messages[i].role === 'assistant') {
      lastAssistantMessageIndex = i;
    }
    if (lastUserMessageIndex !== -1 && lastAssistantMessageIndex !== -1) {
      break;
    }
  }

  function handleStartEditLastPrompt(msg: ChatMessage) {
    setEditPromptDraft(msg.content);
    setIsEditingLastPrompt(true);
    window.setTimeout(() => {
      editTextareaRef.current?.focus();
    }, 0);
  }

  function handleSaveEditedPrompt() {
    if (lastUserMessageIndex < 0) {
      return;
    }
    const trimmed = editPromptDraft.trim();
    if (!trimmed) {
      return;
    }
    const historyBeforeEdit = messages.slice(0, lastUserMessageIndex);
    setIsEditingLastPrompt(false);
    void submitPrompt(trimmed, true, historyBeforeEdit);
  }

  function handleRegenerateLastResponse() {
    if (lastAssistantMessageIndex < 0 || isGenerating) {
      return;
    }
    let precedingUserIndex = -1;
    for (let i = lastAssistantMessageIndex - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'user') {
        precedingUserIndex = i;
        break;
      }
    }
    if (precedingUserIndex < 0) {
      return;
    }
    const promptToRegenerate = messages[precedingUserIndex].content;
    const truncatedHistory = messages.slice(0, precedingUserIndex + 1);
    void submitPrompt(promptToRegenerate, false, truncatedHistory);
  }

  function handlePrintMessage(messageId: string) {
    setPrintingMessageId(messageId);
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {copyStatusAnnouncement}
      </div>
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="ai-response-announcer"
      >
        {responseAnnouncement}
      </div>

      {/* Main Chat Column */}
      <section
        aria-label={t.chat.title}
        className="xl:col-span-8 flex flex-col bg-[#121212] border border-neutral-800 rounded-xl overflow-hidden min-h-[540px] lg:h-[calc(100vh-148px)] relative"
      >
        {/* Chat Thread Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800 bg-[#141414] flex items-center justify-between gap-4 no-print">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-neutral-100 truncate">
              {t.chat.title}
            </h1>
            <p className="mt-0.5 text-xs text-neutral-400 truncate">
              {t.chat.description}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {(streamingMessageId || liveStreamingContent !== null) && (
              <span className="text-xs font-medium text-emerald-400 whitespace-nowrap">
                {t.chat.streamingStatus}
              </span>
            )}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadTranscript}
                title={t.chat.downloadTranscript}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-[#181818] text-xs font-medium text-neutral-300 hover:border-neutral-600 hover:text-white transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{t.chat.downloadTranscript}</span>
              </button>
            )}
          </div>
        </div>

        {/* Conversation Display */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={scrollContainerRef}
            onScroll={handleThreadScroll}
            data-testid="chat-message-scroll-container"
            className="flex-1 overflow-y-auto scroll-smooth px-4 sm:px-6 py-5 space-y-6 bg-[#0e0e0e]"
            aria-busy={isGenerating}
          >
          {messages.length === 0 && liveStreamingContent === null ? (
            <div className="py-6 max-w-2xl">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-900/70 text-emerald-400 mb-4">
                <BookOpen className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-100">{t.chat.emptyTitle}</h2>
              <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">
                {t.chat.emptySubtitle}
              </p>

              <div className="mt-6">
                <p className="text-xs font-medium text-neutral-500 mb-3">
                  {t.chat.starterHeading}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {t.chat.starters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => handleStarterClick(starter)}
                      className="text-start px-4 py-3 rounded-xl bg-[#161616] border border-neutral-800 text-sm text-neutral-200 hover:border-neutral-600 hover:bg-[#1c1c1c] transition-all duration-200 ease-out min-h-[44px]"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, msgIndex) => {
                const isUser = msg.role === 'user';
                const isLastUser = isUser && msgIndex === lastUserMessageIndex;
                const isLastAssistant = !isUser && msgIndex === lastAssistantMessageIndex;
                const isSelected = activeAssistantMessage?.id === msg.id;
                const isStreamingThis = streamingMessageId === msg.id;
                const canRegenerate =
                  isLastAssistant &&
                  !isGenerating &&
                  messages.slice(0, msgIndex).some((m) => m.role === 'user');
                const hiddenDuringFocusedPrint =
                  printingMessageId !== null && printingMessageId !== msg.id;

                return (
                  <ChatMessageItem
                    key={msg.id}
                    msg={msg}
                    isLastUser={isLastUser}
                    isGenerating={isGenerating}
                    isSelected={isSelected}
                    highlightedSourceId={highlightedSourceId}
                    isCopied={copiedMessageId === msg.id}
                    isCopyFailed={copyFailedMessageId === msg.id}
                    isAnnounced={announcedMessageId === msg.id}
                    isSpeaking={speakingMessageId === msg.id}
                    ttsSupported={ttsSupported}
                    isStreamingThis={isStreamingThis}
                    streamedContent={streamedContent}
                    isDevMode={isDevMode}
                    canRegenerate={canRegenerate}
                    hiddenDuringFocusedPrint={hiddenDuringFocusedPrint}
                    isEditingLastPrompt={isEditingLastPrompt}
                    editPromptDraft={editPromptDraft}
                    editTextareaRef={editTextareaRef}
                    onEditPromptDraftChange={setEditPromptDraft}
                    onStartEditLastPrompt={handleStartEditLastPrompt}
                    onCancelEditPrompt={() => setIsEditingLastPrompt(false)}
                    onSaveEditedPrompt={handleSaveEditedPrompt}
                    onInspectSources={handleInspectSources}
                    onMessageFeedback={(id, rating) => void handleMessageFeedback(id, rating)}
                    onAnnounceMessage={(id, content, status, validSourcesCount) =>
                      announceAssistantMessage(id, content, status, validSourcesCount, true)
                    }
                    onToggleSpeakMessage={handleToggleSpeakMessage}
                    onRegenerateLastResponse={handleRegenerateLastResponse}
                    onPrintMessage={handlePrintMessage}
                    onCopyAnswer={(id, content) => void handleCopyAnswer(id, content)}
                    relativeTimestamp={formatRelativeTimestamp(msg.timestamp, language, nowMs)}
                    exactTimestamp={formatAbsoluteTimestamp(msg.timestamp, language)}
                    t={t}
                  />
                );
              })}

              {isLoading && liveStreamingContent !== null && (
                <article className="flex flex-col items-start">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1.5">
                    <span className="font-medium text-neutral-300">
                      {t.chat.assistantLabel}
                    </span>
                  </div>
                  <div className="max-w-[94%] sm:max-w-[85%] rounded-xl px-5 py-4 text-[15px] leading-relaxed bg-[#151515] border border-emerald-700/60 text-neutral-100">
                    {liveStreamingContent.length > 0 && (
                      <MarkdownRenderer
                        content={liveStreamingContent}
                        isStreaming={true}
                        copyCodeLabel={t.chat.copyCode}
                        copiedCodeLabel={t.chat.copiedCode}
                      />
                    )}
                    <TypingIndicator
                      label={t.chat.typingLabel}
                      compact={liveStreamingContent.length > 0}
                      announceRole={liveStreamingContent.length === 0}
                    />
                  </div>
                </article>
              )}

              {isLoading && liveStreamingContent === null && (
                <article className="flex flex-col items-start">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1.5">
                    <span className="font-medium text-neutral-300">
                      {t.chat.assistantLabel}
                    </span>
                  </div>
                  <div className="max-w-[94%] sm:max-w-[85%] rounded-xl px-5 py-3.5 text-sm leading-relaxed bg-[#151515] border border-neutral-800 text-neutral-300">
                    <TypingIndicator label={t.chat.loadingStatus} announceRole />
                  </div>
                </article>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-red-950/40 border border-red-900/70 text-sm text-red-200"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-red-100">{t.chat.errorTitle}</p>
                      <p className="text-xs text-red-300 mt-0.5">{errorMessage}</p>
                    </div>
                  </div>
                  {lastFailedPrompt && (
                    <button
                      type="button"
                      onClick={() => void submitPrompt(lastFailedPrompt, false)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-red-800/80 text-xs font-medium text-red-100 hover:border-red-600 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.chat.retry}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
            <div ref={threadEndRef} className="h-1" />
          </div>

          {showJumpToLatest && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4 no-print">
              <button
                type="button"
                onClick={() => scrollToLatest(true)}
                className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1a1a1a] border border-neutral-700 text-xs font-medium text-neutral-100 hover:border-neutral-500 transition-all duration-200 ease-out whitespace-nowrap min-h-[36px] shadow-lg"
              >
                <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.chat.jumpToLatest}</span>
              </button>
            </div>
          )}
        </div>

        {/* Composer & Quick Actions Bar */}
        <div className="p-4 bg-[#121212] border-t border-neutral-800 space-y-2.5 no-print">
          {previewPiiTypes.length > 0 && (
            <div
              role="status"
              data-testid="pii-presend-warning"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-800/60 bg-amber-950/30 text-xs text-amber-200"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              <span>
                {t.chat.piiPreSendWarning(
                  previewPiiTypes.map((type) => t.chat.piiLabels[type])
                )}
              </span>
            </div>
          )}

          <form onSubmit={handleFormSubmit}>
            <label htmlFor="chat-message-input" className="sr-only">
              {t.chat.inputLabel}
            </label>
            <div className="flex items-end gap-2 rounded-xl border border-neutral-800 bg-[#181818] p-2 focus-within:border-emerald-700 transition-all duration-200 ease-out">
              <textarea
                ref={inputRef}
                id="chat-message-input"
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? t.chat.voiceListening : t.chat.inputPlaceholder}
                disabled={isLoading}
                className="flex-1 resize-none border-0 bg-transparent px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none disabled:text-neutral-500 min-h-[44px]"
              />

              {speechSupported && (
                <button
                  type="button"
                  onClick={handleToggleVoiceDictation}
                  disabled={isLoading}
                  aria-pressed={isListening}
                  aria-label={isListening ? t.chat.voiceInputStop : t.chat.voiceInputStart}
                  title={isListening ? t.chat.voiceInputStop : t.chat.voiceInputStart}
                  className={`inline-flex items-center justify-center w-10 h-[42px] rounded-lg border transition-all duration-200 ease-out shrink-0 ${
                    isListening
                      ? 'border-red-500/70 bg-red-950/50 text-red-300'
                      : 'border-neutral-800 bg-[#141414] text-neutral-300 hover:border-neutral-600 hover:text-white'
                  } disabled:opacity-40`}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Mic className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              )}

              {isGenerating ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-neutral-700 bg-neutral-800 text-white text-sm font-medium hover:bg-neutral-700 transition-all duration-200 ease-out whitespace-nowrap shrink-0 min-h-[42px]"
                >
                  <Square className="w-3.5 h-3.5 fill-current shrink-0" aria-hidden="true" />
                  <span>{t.chat.stopGenerating}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={input.trim().length === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 transition-all duration-200 ease-out whitespace-nowrap shrink-0 min-h-[42px]"
                >
                  <span>{t.chat.submit}</span>
                  <ArrowUp className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>
              )}
            </div>
          </form>

          {/* Dynamic Quick-Action Controls */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {t.chat.quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={isLoading}
                onClick={() => void submitPrompt(action.prompt, true)}
                className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-[#171717] text-xs text-neutral-300 hover:border-neutral-600 hover:text-white disabled:opacity-50 transition-all duration-200 ease-out whitespace-nowrap shrink-0 min-h-[32px]"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Desktop Sources Side Panel (>= xl) */}
      <div className="hidden xl:block xl:col-span-4 min-h-[320px] lg:h-[calc(100vh-148px)] no-print">
        <SourcesPanel
          sources={activeSources}
          activeStatus={activeAssistantMessage?.status}
          highlightedSourceId={highlightedSourceId}
          onSelectSource={setHighlightedSourceId}
          t={t}
        />
      </div>

      {/* Mobile / Tablet Slide-Over Sources Drawer (< xl) */}
      {isMobileSourcesOpen && (
        <div
          className="xl:hidden fixed inset-0 z-40 flex justify-end bg-black/70 backdrop-blur-xs no-print"
          onClick={() => setIsMobileSourcesOpen(false)}
        >
          <div
            ref={mobileSourcesDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.sources.panelTitle}
            tabIndex={-1}
            className="w-full max-w-md h-full bg-[#121212] border-s border-neutral-800 p-4 flex flex-col gap-3 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-neutral-400">
                {t.sources.panelTitle}
              </span>
              <button
                ref={mobileSourcesCloseBtnRef}
                type="button"
                onClick={() => setIsMobileSourcesOpen(false)}
                aria-label={t.chat.closeSources}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-[#181818] text-xs font-medium text-neutral-200 hover:border-neutral-600"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.chat.closeSources}</span>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <SourcesPanel
                sources={activeSources}
                activeStatus={activeAssistantMessage?.status}
                highlightedSourceId={highlightedSourceId}
                onSelectSource={setHighlightedSourceId}
                t={t}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
