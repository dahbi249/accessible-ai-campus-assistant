import {
  Accessibility,
  Info,
  KeyRound,
  PanelLeftOpen,
  ShieldCheck,
  WifiOff,
  X,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { AssistantPage } from './pages/AssistantPage';
import { PWAInstallButton } from './components/PWA/PWAInstallButton';
import {
  type ActiveView,
  NavigationDrawer,
} from './components/Sidebar/NavigationDrawer';
import {
  type FontScaleOption,
  useAccessibilityPrefs,
} from './hooks/useAccessibilityPrefs';
import { useFocusTrap } from './hooks/useFocusTrap';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { getDirection, TRANSLATIONS } from './i18n/translations';
import {
  campusApi,
  getApiMode,
  getAuthToken,
  getBackendBaseUrlDisplay,
  isAuthTokenExpired,
  onUnauthorized,
  setApiMode as updateServiceApiMode,
  setAuthToken as updateServiceAuthToken,
} from './services/api';
import type {
  ApiMode,
  ChatMessage,
  ChatSession,
  SupportedLanguage,
} from './types/api';
import {
  clearAllCampusSessionData,
  loadChatSessions,
  saveChatSessions,
} from './utils/sessionStorage';

const CampusMapPage = lazy(() =>
  import('./pages/CampusMapPage').then((mod) => ({
    default: mod.CampusMapPage,
  }))
);

const LANGUAGES: { code: SupportedLanguage; label: string; nativeName: string }[] = [
  { code: 'en', label: 'EN', nativeName: 'English' },
  { code: 'fr', label: 'FR', nativeName: 'Français' },
  { code: 'ar', label: 'AR', nativeName: 'العربية' },
];

const FONT_SCALE_OPTIONS: FontScaleOption[] = [100, 115, 130];
const LANGUAGE_STORAGE_KEY = 'campus_language_v1';
const IDLE_WARN_AFTER_SECONDS = 14 * 60;
const IDLE_CLEAR_AFTER_SECONDS = 15 * 60;

function loadInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return 'en';
  }
  try {
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang === 'en' || urlLang === 'fr' || urlLang === 'ar') {
      return urlLang;
    }
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'fr' || stored === 'ar') {
      return stored;
    }
  } catch {
    // Ignore URL/storage errors
  }
  return 'en';
}

function loadInitialView(): ActiveView {
  if (typeof window === 'undefined') {
    return 'assistant';
  }
  try {
    const viewParam = new URLSearchParams(window.location.search).get('view');
    if (viewParam === 'assistant' || viewParam === 'announcements' || viewParam === 'map') {
      return viewParam;
    }
  } catch {
    // Ignore URL errors
  }
  return 'assistant';
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `session-${crypto.randomUUID()}`;
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveSessionTitle(messages: ChatMessage[], fallback: string): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) {
    return fallback;
  }
  const normalized = firstUserMessage.content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 44) {
    return normalized || fallback;
  }
  return `${normalized.slice(0, 41).trimEnd()}...`;
}

export default function App() {
  const [initialSessions] = useState<ChatSession[]>(() => loadChatSessions());

  const [language, setLanguage] = useState<SupportedLanguage>(loadInitialLanguage);
  const [activeView, setActiveView] = useState<ActiveView>(loadInitialView);
  const [apiMode, setApiMode] = useState<ApiMode>(() => getApiMode());

  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() =>
    initialSessions[0]?.id ?? createSessionId()
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialSessions[0]?.messages ?? []
  );
  const [conversationId, setConversationId] = useState<string | null>(
    () => initialSessions[0]?.conversationId ?? null
  );
  const [pendingMapPrompt, setPendingMapPrompt] = useState<string | null>(null);

  const activeSessionIdRef = useRef(activeSessionId);
  const messagesRef = useRef(messages);
  const conversationIdRef = useRef(conversationId);
  activeSessionIdRef.current = activeSessionId;
  messagesRef.current = messages;
  conversationIdRef.current = conversationId;

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [hasJwtToken, setHasJwtToken] = useState<boolean>(() =>
    Boolean(getAuthToken())
  );
  const [isJwtModalOpen, setIsJwtModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'token'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [jwtDraft, setJwtDraft] = useState('');

  const [sessionClearedBanner, setSessionClearedBanner] = useState(false);
  const [sessionClearedMessage, setSessionClearedMessage] = useState<string | null>(null);
  const [idleCountdownSeconds, setIdleCountdownSeconds] = useState<number | null>(null);
  const [viewSwitchAnnouncement, setViewSwitchAnnouncement] = useState('');
  const [focusInputTrigger, setFocusInputTrigger] = useState(0);
  const [isA11yMenuOpen, setIsA11yMenuOpen] = useState(false);
  const [isDevMode, setIsDevMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      return window.localStorage.getItem('dev_mode') === 'true';
    } catch {
      return false;
    }
  });

  const { prefs, setFontScale, toggleHighContrast, toggleAnnounceResponses } =
    useAccessibilityPrefs();
  const isOnline = useOnlineStatus();

  const noticeTimerRef = useRef<number | null>(null);
  const footerClickCountRef = useRef(0);
  const footerClickTimerRef = useRef<number | null>(null);
  const a11yContainerRef = useRef<HTMLDivElement | null>(null);
  const a11yButtonRef = useRef<HTMLButtonElement | null>(null);
  const jwtDialogRef = useRef<HTMLDivElement | null>(null);
  const mainContentRef = useRef<HTMLElement | null>(null);
  const newChatActionRef = useRef<() => void>(() => {});

  const dir = getDirection(language);
  const t = TRANSLATIONS[language];

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore storage quota errors
    }
  }, [dir, language]);

  // Sync activeView with URL query parameter for shareable deep links & Back/Forward support
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const url = new URL(window.location.href);
      if (activeView === 'assistant') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', activeView);
      }
      window.history.replaceState(null, '', url.toString());
    } catch {
      // Ignore history API errors in sandboxed iframes
    }
  }, [activeView]);

  useEffect(() => {
    const handlePopState = () => {
      setActiveView(loadInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle 401 UNAUTHORIZED events or already-expired JWTs on startup
  useEffect(() => {
    if (isAuthTokenExpired()) {
      updateServiceAuthToken(null);
      setHasJwtToken(false);
    }

    const unsubscribe = onUnauthorized(() => {
      setHasJwtToken(false);
      setJwtDraft('');
      setLoginError(TRANSLATIONS[language].sidebar.sessionExpiredNotice);
      setAuthTab('login');
      setIsJwtModalOpen(true);
    });
    return unsubscribe;
  }, [language]);

  // Global Alt+1/2/3 view shortcuts, `/` to focus chat input, and `Ctrl/Cmd+Shift+O` for New Chat
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      );
    };

    const handleShortcutKeyDown = (event: KeyboardEvent) => {
      if (isJwtModalOpen || event.isComposing) {
        return;
      }

      // Ctrl/Cmd + Shift + O -> New Chat & focus composer
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        !event.altKey &&
        (event.code === 'KeyO' || event.key.toLowerCase() === 'o')
      ) {
        event.preventDefault();
        newChatActionRef.current();
        setViewSwitchAnnouncement(t.nav.viewSwitchedAnnouncement(t.nav.assistant));
        setFocusInputTrigger((n) => n + 1);
        return;
      }

      // Unmodified `/` -> Switch to Assistant (if needed) & focus chat composer
      if (
        event.key === '/' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        setActiveView('assistant');
        setFocusInputTrigger((n) => n + 1);
        return;
      }

      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      let targetView: ActiveView | null = null;
      let targetLabel = '';

      if (event.code === 'Digit1' || event.key === '1') {
        targetView = 'assistant';
        targetLabel = t.nav.assistant;
      } else if (event.code === 'Digit2' || event.key === '2') {
        targetView = 'announcements';
        targetLabel = t.nav.announcements;
      } else if (event.code === 'Digit3' || event.key === '3') {
        targetView = 'map';
        targetLabel = t.nav.campusMap;
      }

      if (!targetView) {
        return;
      }

      event.preventDefault();
      setActiveView(targetView);
      setViewSwitchAnnouncement(t.nav.viewSwitchedAnnouncement(targetLabel));
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsDrawerOpen(false);
      }
      window.requestAnimationFrame(() => {
        mainContentRef.current?.focus({ preventScroll: true });
      });
    };

    window.addEventListener('keydown', handleShortcutKeyDown);
    return () => window.removeEventListener('keydown', handleShortcutKeyDown);
  }, [isJwtModalOpen, t.nav]);

  useFocusTrap({
    isActive: isJwtModalOpen,
    containerRef: jwtDialogRef,
    onClose: () => setIsJwtModalOpen(false),
  });

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
      if (footerClickTimerRef.current !== null) {
        window.clearTimeout(footerClickTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isA11yMenuOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (
        a11yContainerRef.current &&
        !a11yContainerRef.current.contains(event.target as Node)
      ) {
        setIsA11yMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsA11yMenuOpen(false);
        a11yButtonRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isA11yMenuOpen]);

  function toggleDevMode() {
    setIsDevMode((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('dev_mode', String(next));
      } catch {
        // Ignore storage errors
      }
      if (!next) {
        setAuthTab('login');
      }
      return next;
    });
  }

  function handleFooterStealthClick(event: React.MouseEvent<HTMLSpanElement>) {
    if (event.detail >= 3) {
      footerClickCountRef.current = 0;
      if (footerClickTimerRef.current !== null) {
        window.clearTimeout(footerClickTimerRef.current);
        footerClickTimerRef.current = null;
      }
      toggleDevMode();
      return;
    }

    footerClickCountRef.current += 1;
    if (footerClickTimerRef.current !== null) {
      window.clearTimeout(footerClickTimerRef.current);
    }
    if (footerClickCountRef.current >= 3) {
      footerClickCountRef.current = 0;
      footerClickTimerRef.current = null;
      toggleDevMode();
    } else {
      footerClickTimerRef.current = window.setTimeout(() => {
        footerClickCountRef.current = 0;
        footerClickTimerRef.current = null;
      }, 600);
    }
  }

  function closeDrawerOnMobile() {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsDrawerOpen(false);
    }
  }

  function syncActiveSessionMessages(
    sessionId: string,
    nextMessages: ChatMessage[],
    nextConversationId: string | null
  ) {
    setSessions((prev) => {
      let updated: ChatSession[];
      if (nextMessages.length === 0) {
        updated = prev.filter((item) => item.id !== sessionId);
      } else {
        const now = new Date().toISOString();
        const existing = prev.find((item) => item.id === sessionId);
        const sessionRecord: ChatSession = {
          id: sessionId,
          title: deriveSessionTitle(nextMessages, t.sidebar.newChat),
          language,
          conversationId: nextConversationId,
          messages: nextMessages,
          updatedAt: now,
        };
        if (existing) {
          updated = [
            sessionRecord,
            ...prev.filter((item) => item.id !== sessionId),
          ];
        } else {
          updated = [sessionRecord, ...prev];
        }
      }
      saveChatSessions(updated);
      return updated;
    });
  }

  function handleMessagesChange(nextMessages: ChatMessage[]) {
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    syncActiveSessionMessages(
      activeSessionIdRef.current,
      nextMessages,
      conversationIdRef.current
    );
  }

  function handleConversationIdChange(nextConversationId: string | null) {
    conversationIdRef.current = nextConversationId;
    setConversationId(nextConversationId);
    if (messagesRef.current.length > 0) {
      syncActiveSessionMessages(
        activeSessionIdRef.current,
        messagesRef.current,
        nextConversationId
      );
    }
  }

  function handleApiModeChange(nextMode: ApiMode) {
    updateServiceApiMode(nextMode);
    setApiMode(nextMode);
  }

  function handleNewChat() {
    const nextId = createSessionId();
    activeSessionIdRef.current = nextId;
    messagesRef.current = [];
    conversationIdRef.current = null;
    setActiveSessionId(nextId);
    setMessages([]);
    setConversationId(null);
    setActiveView('assistant');
    closeDrawerOnMobile();
  }
  newChatActionRef.current = handleNewChat;

  function handleSelectSession(sessionId: string) {
    const target = sessions.find((s) => s.id === sessionId);
    if (!target) {
      return;
    }
    activeSessionIdRef.current = target.id;
    messagesRef.current = target.messages;
    conversationIdRef.current = target.conversationId;
    setActiveSessionId(target.id);
    setMessages(target.messages);
    setConversationId(target.conversationId);
    setActiveView('assistant');
    closeDrawerOnMobile();
  }

  function handleDeleteSession(sessionId: string) {
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    saveChatSessions(remaining);

    if (sessionId === activeSessionId) {
      if (remaining.length > 0) {
        activeSessionIdRef.current = remaining[0].id;
        messagesRef.current = remaining[0].messages;
        conversationIdRef.current = remaining[0].conversationId;
        setActiveSessionId(remaining[0].id);
        setMessages(remaining[0].messages);
        setConversationId(remaining[0].conversationId);
      } else {
        const nextId = createSessionId();
        activeSessionIdRef.current = nextId;
        messagesRef.current = [];
        conversationIdRef.current = null;
        setActiveSessionId(nextId);
        setMessages([]);
        setConversationId(null);
      }
    }
  }

  function handleClearLabSession(customNotice?: string) {
    clearAllCampusSessionData();
    updateServiceAuthToken(null);
    setHasJwtToken(false);
    setJwtDraft('');
    setIdleCountdownSeconds(null);
    setSessions([]);
    const nextId = createSessionId();
    activeSessionIdRef.current = nextId;
    messagesRef.current = [];
    conversationIdRef.current = null;
    setActiveSessionId(nextId);
    setMessages([]);
    setConversationId(null);
    setSessionClearedMessage(customNotice ?? null);
    setSessionClearedBanner(true);
    closeDrawerOnMobile();

    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setSessionClearedBanner(false);
      setSessionClearedMessage(null);
      noticeTimerRef.current = null;
    }, 4500);
  }

  // Zero-Trust Shared Campus Lab auto-lock after 15 minutes of inactivity
  useEffect(() => {
    const hasSensitiveSession = hasJwtToken || messages.length > 0 || sessions.length > 0;
    if (!hasSensitiveSession) {
      setIdleCountdownSeconds(null);
      return;
    }

    let idleSeconds = 0;

    const resetIdle = () => {
      idleSeconds = 0;
      setIdleCountdownSeconds(null);
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      'pointerdown',
      'keydown',
      'scroll',
    ];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetIdle, { passive: true }));

    const interval = window.setInterval(() => {
      idleSeconds += 1;
      if (idleSeconds >= IDLE_CLEAR_AFTER_SECONDS) {
        clearAllCampusSessionData();
        updateServiceAuthToken(null);
        setHasJwtToken(false);
        setJwtDraft('');
        setIdleCountdownSeconds(null);
        setSessions([]);
        const nextId = createSessionId();
        activeSessionIdRef.current = nextId;
        messagesRef.current = [];
        conversationIdRef.current = null;
        setActiveSessionId(nextId);
        setMessages([]);
        setConversationId(null);
        setSessionClearedMessage(t.sidebar.idleAutoClearedNotice);
        setSessionClearedBanner(true);
      } else if (idleSeconds >= IDLE_WARN_AFTER_SECONDS) {
        setIdleCountdownSeconds(IDLE_CLEAR_AFTER_SECONDS - idleSeconds);
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetIdle));
    };
  }, [hasJwtToken, messages.length, sessions.length, t.sidebar.idleAutoClearedNotice]);

  function handleSelectView(view: ActiveView) {
    setActiveView(view);
    closeDrawerOnMobile();
  }

  function handleAskAboutLocation(prompt: string) {
    setPendingMapPrompt(prompt);
    setActiveView('assistant');
    closeDrawerOnMobile();
  }

  function openJwtModal() {
    setJwtDraft(getAuthToken() ?? '');
    setLoginError(null);
    setAuthTab('login');
    setIsJwtModalOpen(true);
  }

  async function handleStudentLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) {
      return;
    }
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await campusApi.loginStudent({
        identifier: loginIdentifier.trim(),
        password: loginPassword,
      });
      setHasJwtToken(true);
      setLoginPassword('');
      setIsJwtModalOpen(false);
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : t.chat.errorTitle
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleSaveJwt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = jwtDraft.trim().replace(/^Bearer\s+/i, '');
    updateServiceAuthToken(cleaned || null);
    setHasJwtToken(Boolean(cleaned));
    setIsJwtModalOpen(false);
  }

  function handleClearJwt() {
    updateServiceAuthToken(null);
    setHasJwtToken(false);
    setJwtDraft('');
    setLoginPassword('');
    setLoginError(null);
    setIsJwtModalOpen(false);
  }

  return (
    <div
      dir={dir}
      lang={language}
      className="min-h-screen flex bg-[#0e0e0e] text-neutral-100"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-neutral-100 focus:text-neutral-950 focus:text-sm focus:font-medium"
      >
        {t.skipToContent}
      </a>

      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeView={activeView}
        onSelectView={handleSelectView}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
        onClearLabSession={() => handleClearLabSession()}
        apiMode={apiMode}
        onApiModeChange={handleApiModeChange}
        isDevMode={isDevMode}
        onToggleDevMode={toggleDevMode}
        hasJwtToken={hasJwtToken}
        onOpenJwtModal={openJwtModal}
        t={t}
      />

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="bg-[#121212]/95 backdrop-blur-xs border-b border-neutral-800 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            {/* Start Zone: Sidebar Toggle + Brand */}
            <div className="flex items-center gap-2.5 min-w-0 shrink-0">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                aria-label={t.sidebar.openDrawer}
                title={t.sidebar.openDrawer}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-800 bg-[#171717] text-neutral-300 hover:text-white hover:border-neutral-700 transition-all duration-200 ease-out shrink-0 ${
                  isDrawerOpen ? 'lg:hidden' : ''
                }`}
              >
                <PanelLeftOpen className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectView('assistant')}
                className="text-sm sm:text-base font-semibold tracking-tight text-neutral-100 hover:text-white transition-colors whitespace-nowrap"
              >
                {t.appName}
              </button>
            </div>

            {/* Center Zone: Module Navigation */}
            <nav
              aria-label="Primary navigation"
              className="hidden sm:flex items-center gap-5 overflow-x-auto min-w-0"
            >
              {(
                [
                  { id: 'assistant', label: t.nav.assistant, shortcut: 'Alt+1' },
                  { id: 'announcements', label: t.nav.announcements, shortcut: 'Alt+2' },
                  { id: 'map', label: t.nav.campusMap, shortcut: 'Alt+3' },
                ] as const
              ).map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectView(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    aria-keyshortcuts={item.shortcut}
                    title={`${item.label} (${item.shortcut})`}
                    className={`py-3.5 border-b-2 text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-200 ease-out ${
                      isActive
                        ? 'border-neutral-100 text-white'
                        : 'border-transparent text-neutral-400 hover:text-neutral-100'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* End Zone: PWA Install, Accessibility Display & Language Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              <PWAInstallButton t={t} />

              <div ref={a11yContainerRef} className="relative">
                <button
                  ref={a11yButtonRef}
                  type="button"
                  onClick={() => setIsA11yMenuOpen((prev) => !prev)}
                  aria-expanded={isA11yMenuOpen}
                  aria-haspopup="true"
                  aria-label={t.a11y.menuButton}
                  title={t.a11y.menuButton}
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-all duration-200 ease-out ${
                    prefs.fontScale !== 100 || prefs.highContrast
                      ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                      : 'border-neutral-800 bg-[#181818] text-neutral-300 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <Accessibility className="w-4 h-4" aria-hidden="true" />
                </button>

                {isA11yMenuOpen && (
                  <div
                    role="dialog"
                    aria-label={t.a11y.menuTitle}
                    className="absolute end-0 mt-2 w-64 rounded-xl border border-neutral-800 bg-[#141414] p-4 shadow-xl z-30 space-y-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-100">
                        {t.a11y.menuTitle}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsA11yMenuOpen(false)}
                        aria-label={t.pwa.iosClose}
                        className="p-1 rounded text-neutral-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <span className="block text-[11px] font-medium text-neutral-400">
                        {t.a11y.fontSizeLabel}
                      </span>
                      <div
                        role="group"
                        aria-label={t.a11y.fontSizeLabel}
                        className="grid grid-cols-3 gap-1.5"
                      >
                        {FONT_SCALE_OPTIONS.map((scale) => {
                          const active = prefs.fontScale === scale;
                          return (
                            <button
                              key={scale}
                              type="button"
                              onClick={() => setFontScale(scale)}
                              aria-pressed={active}
                              className={`py-1.5 rounded-lg border text-xs font-medium tabular-nums transition-colors ${
                                active
                                  ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                                  : 'border-neutral-800 bg-[#181818] text-neutral-300 hover:border-neutral-700'
                              }`}
                            >
                              {scale}%
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-neutral-300">
                          {t.a11y.highContrastLabel}
                        </span>
                        <button
                          type="button"
                          onClick={toggleHighContrast}
                          aria-pressed={prefs.highContrast}
                          className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors ${
                            prefs.highContrast
                              ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                              : 'border-neutral-800 bg-[#181818] text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {prefs.highContrast ? t.a11y.highContrastOn : t.a11y.highContrastOff}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-neutral-300">
                          {t.a11y.announceResponsesLabel}
                        </span>
                        <button
                          type="button"
                          onClick={toggleAnnounceResponses}
                          aria-pressed={prefs.announceResponses}
                          className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors shrink-0 ${
                            prefs.announceResponses
                              ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                              : 'border-neutral-800 bg-[#181818] text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {prefs.announceResponses ? t.a11y.highContrastOn : t.a11y.highContrastOff}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800 space-y-1.5">
                      <span className="block text-[11px] font-medium text-neutral-400">
                        {t.a11y.shortcutsHeading}
                      </span>
                      <div className="space-y-1 text-[11px] text-neutral-300">
                        <div className="flex items-center justify-between">
                          <span>{t.a11y.shortcutAssistant}</span>
                          <kbd dir="ltr" className="px-1.5 py-0.5 rounded bg-[#181818] border border-neutral-800 font-mono text-[10px] text-neutral-400">Alt+1</kbd>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{t.a11y.shortcutAnnouncements}</span>
                          <kbd dir="ltr" className="px-1.5 py-0.5 rounded bg-[#181818] border border-neutral-800 font-mono text-[10px] text-neutral-400">Alt+2</kbd>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{t.a11y.shortcutMap}</span>
                          <kbd dir="ltr" className="px-1.5 py-0.5 rounded bg-[#181818] border border-neutral-800 font-mono text-[10px] text-neutral-400">Alt+3</kbd>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{t.a11y.shortcutFocusChat}</span>
                          <kbd dir="ltr" className="px-1.5 py-0.5 rounded bg-[#181818] border border-neutral-800 font-mono text-[10px] text-neutral-400">/</kbd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>{t.a11y.shortcutNewChat}</span>
                          <kbd dir="ltr" className="px-1.5 py-0.5 rounded bg-[#181818] border border-neutral-800 font-mono text-[10px] text-neutral-400">Ctrl/Cmd+Shift+O</kbd>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                role="group"
                aria-label="Language"
                className="flex items-center gap-0.5 p-1 bg-[#181818] rounded-lg border border-neutral-800 shrink-0"
              >
                {LANGUAGES.map((lang) => {
                  const isActive = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code)}
                      aria-pressed={isActive}
                      title={lang.nativeName}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 ease-out min-h-[30px] ${
                        isActive
                          ? 'bg-neutral-800 text-white'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {lang.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Sub-Navigation */}
          <nav
            aria-label="Mobile navigation"
            className="sm:hidden flex items-center gap-2 px-4 pb-2.5 overflow-x-auto border-t border-neutral-800/60 pt-2"
          >
            {(
              [
                { id: 'assistant', label: t.nav.assistant },
                { id: 'announcements', label: t.nav.announcements },
                { id: 'map', label: t.nav.campusMap },
              ] as const
            ).map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectView(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </header>

        {/* View Switch Live Announcer */}
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="view-switch-announcer"
        >
          {viewSwitchAnnouncement}
        </div>

        {/* Main Workspace */}
        <main
          ref={mainContentRef}
          id="main-content"
          tabIndex={-1}
          className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 space-y-3.5 focus:outline-none"
        >
          {/* Offline Connectivity Banner */}
          {!isOnline && (
            <div
              role="status"
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[#161616] border border-neutral-700 text-xs text-neutral-200"
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              <span>{t.pwa.offlineNotice}</span>
            </div>
          )}

          {/* Shared Lab Inactivity Auto-Lock Countdown */}
          {idleCountdownSeconds !== null && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200"
            >
              <span>{t.sidebar.idleLockWarning(idleCountdownSeconds)}</span>
              <button
                type="button"
                onClick={() => setIdleCountdownSeconds(null)}
                className="px-2.5 py-1 rounded-md border border-amber-700/80 bg-[#1a1a1a] text-xs font-medium text-amber-100 hover:bg-neutral-800 transition-colors"
              >
                {t.sidebar.idleStaySignedIn}
              </button>
            </div>
          )}

          {/* Developer Environment & Session Privacy Disclosures */}
          {(isDevMode || sessionClearedBanner) && (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              {isDevMode && (
                apiMode === 'mock' ? (
                  <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-amber-950/30 border border-amber-800/60 text-xs text-amber-200 flex-1 min-w-0">
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                    <p className="leading-snug truncate sm:whitespace-normal">
                      <span className="font-semibold">{t.workspace.mockNoticeTitle}: </span>
                      <span className="text-amber-200/90">{t.workspace.mockNoticeBody}</span>
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#121212] border border-neutral-800 text-xs text-neutral-300 flex-1 min-w-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-neutral-200 shrink-0">
                      {t.workspace.liveEndpointLabel}
                    </span>
                    <code dir="ltr" className="font-mono text-neutral-400 truncate">
                      {getBackendBaseUrlDisplay()}
                    </code>
                  </div>
                )
              )}

              {sessionClearedBanner && (
                <div
                  role="status"
                  className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200 shrink-0"
                >
                  <span>{sessionClearedMessage ?? t.sidebar.sessionClearedNotice}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSessionClearedBanner(false);
                      setSessionClearedMessage(null);
                    }}
                    aria-label="Dismiss"
                    className="text-emerald-300 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )}

          {activeView === 'assistant' && (
            <AssistantPage
              key={activeSessionId}
              language={language}
              apiMode={apiMode}
              isDevMode={isDevMode}
              announceResponses={prefs.announceResponses}
              focusInputTrigger={focusInputTrigger}
              messages={messages}
              conversationId={conversationId}
              onMessagesChange={handleMessagesChange}
              onConversationIdChange={handleConversationIdChange}
              pendingPrompt={pendingMapPrompt}
              onConsumePendingPrompt={() => setPendingMapPrompt(null)}
              t={t}
            />
          )}

          {activeView === 'announcements' && (
            <AnnouncementsPage
              language={language}
              apiMode={apiMode}
              isDevMode={isDevMode}
              onAskAboutNotice={handleAskAboutLocation}
              t={t}
            />
          )}

          {activeView === 'map' && (
            <Suspense
              fallback={
                <div className="bg-[#121212] border border-neutral-800 rounded-xl p-8 text-sm text-neutral-400">
                  {t.map.loading}
                </div>
              }
            >
              <CampusMapPage
                language={language}
                apiMode={apiMode}
                onAskAboutLocation={handleAskAboutLocation}
                t={t}
              />
            </Suspense>
          )}
        </main>

        {/* Footer (triple-click brand attribution to toggle Developer Mode) */}
        <footer className="border-t border-neutral-800 bg-[#111111] mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-500">
            <span
              onClick={handleFooterStealthClick}
              className="select-none cursor-default"
            >
              {t.footer.attribution}
            </span>
            <span>{t.footer.groundingPolicy}</span>
          </div>
        </footer>
      </div>

      {/* Student Portal Auth Modal (Credential Sign-In + Dev-Only Bearer JWT Tab) */}
      {isJwtModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs no-print"
          onClick={() => setIsJwtModalOpen(false)}
        >
          <div
            ref={jwtDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="jwt-modal-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-xl border border-neutral-800 bg-[#141414] p-5 space-y-4 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 shrink-0">
                  <KeyRound className="w-4 h-4" aria-hidden="true" />
                </span>
                <h2 id="jwt-modal-title" className="text-sm font-semibold text-white">
                  {t.sidebar.jwtModalTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsJwtModalOpen(false)}
                aria-label={t.sidebar.jwtCancel}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              {t.sidebar.jwtModalDescription}
            </p>

            {isDevMode && (
              <div
                role="tablist"
                className="grid grid-cols-2 gap-1 p-1 rounded-lg border border-neutral-800 bg-[#0e0e0e]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={authTab === 'login'}
                  onClick={() => {
                    setAuthTab('login');
                    setLoginError(null);
                  }}
                  className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                    authTab === 'login'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {t.sidebar.studentLoginTab}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authTab === 'token'}
                  onClick={() => {
                    setAuthTab('token');
                    setLoginError(null);
                  }}
                  className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                    authTab === 'token'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {t.sidebar.devTokenTab}
                </button>
              </div>
            )}

            {authTab === 'login' || !isDevMode ? (
              <form onSubmit={handleStudentLogin} className="space-y-3">
                <div className="space-y-1">
                  <label
                    htmlFor="student-identifier-input"
                    className="block text-xs font-medium text-neutral-300"
                  >
                    {t.sidebar.studentIdLabel}
                  </label>
                  <input
                    id="student-identifier-input"
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={t.sidebar.studentIdPlaceholder}
                    autoComplete="username"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-800 bg-[#0e0e0e] text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="student-password-input"
                    className="block text-xs font-medium text-neutral-300"
                  >
                    {t.sidebar.passwordLabel}
                  </label>
                  <input
                    id="student-password-input"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-800 bg-[#0e0e0e] text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
                  />
                </div>

                {loginError && (
                  <p role="alert" className="text-xs text-red-300 bg-red-950/35 border border-red-900/60 rounded-lg px-3 py-2">
                    {loginError}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  {hasJwtToken ? (
                    <button
                      type="button"
                      onClick={handleClearJwt}
                      className="px-3 py-2 rounded-lg border border-red-900/70 bg-red-950/30 text-xs font-medium text-red-300 hover:bg-red-950/50 transition-colors"
                    >
                      {t.sidebar.jwtClear}
                    </button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsJwtModalOpen(false)}
                      className="px-3 py-2 rounded-lg border border-neutral-800 bg-[#1a1a1a] text-xs font-medium text-neutral-300 hover:text-white transition-colors"
                    >
                      {t.sidebar.jwtCancel}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoggingIn || !loginIdentifier.trim() || !loginPassword}
                      className="px-3.5 py-2 rounded-lg bg-neutral-100 text-neutral-950 text-xs font-semibold hover:bg-white disabled:opacity-50 transition-colors"
                    >
                      {isLoggingIn ? t.sidebar.signingIn : t.sidebar.signInSubmit}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveJwt} className="space-y-3">
                <input
                  type="password"
                  dir="ltr"
                  value={jwtDraft}
                  onChange={(e) => setJwtDraft(e.target.value)}
                  placeholder={t.sidebar.jwtPlaceholder}
                  autoComplete="off"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-800 bg-[#0e0e0e] text-xs font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  {hasJwtToken ? (
                    <button
                      type="button"
                      onClick={handleClearJwt}
                      className="px-3 py-2 rounded-lg border border-red-900/70 bg-red-950/30 text-xs font-medium text-red-300 hover:bg-red-950/50 transition-colors"
                    >
                      {t.sidebar.jwtClear}
                    </button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsJwtModalOpen(false)}
                      className="px-3 py-2 rounded-lg border border-neutral-800 bg-[#1a1a1a] text-xs font-medium text-neutral-300 hover:text-white transition-colors"
                    >
                      {t.sidebar.jwtCancel}
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-lg bg-neutral-100 text-neutral-950 text-xs font-semibold hover:bg-white transition-colors"
                    >
                      {t.sidebar.jwtSave}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
