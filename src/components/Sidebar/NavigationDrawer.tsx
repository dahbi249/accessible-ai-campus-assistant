import {
  KeyRound,
  Map as MapIcon,
  Megaphone,
  MessageSquare,
  PanelLeftClose,
  Plus,
  ShieldCheck,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { TranslationStrings } from '../../i18n/translations';
import type { ApiMode, ChatSession } from '../../types/api';

export type ActiveView = 'assistant' | 'announcements' | 'map';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
  onClearLabSession: () => void;
  apiMode: ApiMode;
  onApiModeChange: (mode: ApiMode) => void;
  isDevMode: boolean;
  onToggleDevMode: () => void;
  hasJwtToken: boolean;
  onOpenJwtModal: () => void;
  t: TranslationStrings;
}

export function NavigationDrawer({
  isOpen,
  onClose,
  activeView,
  onSelectView,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onClearLabSession,
  apiMode,
  onApiModeChange,
  isDevMode,
  onToggleDevMode,
  hasJwtToken,
  onOpenJwtModal,
  t,
}: NavigationDrawerProps) {
  const asideRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 1024);
    };
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useFocusTrap({
    isActive: isOpen && isMobileViewport,
    containerRef: asideRef,
    initialFocusRef: closeButtonRef,
    onClose,
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[1px] lg:hidden no-print"
        />
      )}

      <aside
        ref={asideRef}
        aria-label={t.sidebar.workspaceHeading}
        aria-hidden={!isOpen || undefined}
        aria-modal={isOpen && isMobileViewport ? true : undefined}
        role={isOpen && isMobileViewport ? 'dialog' : undefined}
        tabIndex={-1}
        className={`fixed lg:static inset-y-0 start-0 z-40 flex flex-col bg-[#121212] border-e border-neutral-800 transition-all duration-200 ease-out overflow-hidden shrink-0 no-print focus:outline-none ${
          isOpen
            ? 'w-[272px] translate-x-0 visible'
            : 'w-0 -translate-x-full rtl:translate-x-full lg:translate-x-0 border-e-0 invisible pointer-events-none'
        }`}
      >
        <div className="w-[272px] flex flex-col h-full">
          {/* Drawer Top Action Row */}
          <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onNewChat}
              aria-keyshortcuts="Control+Shift+O Meta+Shift+O"
              className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-neutral-100 text-neutral-950 text-xs font-semibold hover:bg-white transition-all duration-200 ease-out min-h-[40px]"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t.sidebar.newChat}</span>
            </button>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label={t.sidebar.closeDrawer}
              title={t.sidebar.closeDrawer}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-neutral-800 bg-[#171717] text-neutral-400 hover:text-neutral-100 hover:border-neutral-700 transition-all duration-200 ease-out shrink-0"
            >
              <PanelLeftClose className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>

          {/* Quick Module Links */}
          <div className="px-3 pt-4 pb-3 border-b border-neutral-800/80 space-y-1">
            <p className="px-2.5 pb-1.5 text-[11px] font-medium text-neutral-500">
              {t.sidebar.workspaceHeading}
            </p>
            {(
              [
                { id: 'assistant', label: t.nav.assistant, Icon: MessageSquare, shortcut: 'Alt+1' },
                { id: 'announcements', label: t.nav.announcements, Icon: Megaphone, shortcut: 'Alt+2' },
                { id: 'map', label: t.nav.campusMap, Icon: MapIcon, shortcut: 'Alt+3' },
              ] as const
            ).map(({ id, label, Icon, shortcut }) => {
              const isActive = activeView === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectView(id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-keyshortcuts={shortcut}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ease-out min-h-[38px] ${
                    isActive
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </span>
                  <kbd
                    dir="ltr"
                    className="text-[10px] font-mono text-neutral-500 px-1.5 py-0.5 rounded bg-[#181818] border border-neutral-800 shrink-0"
                  >
                    {shortcut}
                  </kbd>
                </button>
              );
            })}
          </div>

          {/* Session History */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <p className="px-2.5 pb-2 text-[11px] font-medium text-neutral-500">
              {t.sidebar.historyHeading}
            </p>
            {sessions.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-neutral-500 leading-relaxed">
                {t.sidebar.emptyHistory}
              </p>
            ) : (
              <ul className="space-y-1">
                {sessions.map((session) => {
                  const isActive = session.id === activeSessionId && activeView === 'assistant';
                  return (
                    <li key={session.id} className="group flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectSession(session.id)}
                        className={`flex-1 min-w-0 text-start px-2.5 py-2 rounded-lg text-xs transition-all duration-200 ease-out truncate min-h-[36px] ${
                          isActive
                            ? 'bg-neutral-800/90 text-white font-medium'
                            : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'
                        }`}
                        title={session.title}
                      >
                        {session.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSession(session.id)}
                        aria-label={`${t.sidebar.deleteSession}: ${session.title}`}
                        className="opacity-70 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-md text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Privacy, JWT Auth & Developer Mode Controls */}
          <div className="p-3 border-t border-neutral-800 bg-[#0f0f0f] space-y-2.5">
            <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-neutral-400">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="truncate">{t.sidebar.securityLabel}</span>
              </div>
              <button
                type="button"
                onClick={onToggleDevMode}
                aria-label="Developer mode"
                aria-pressed={isDevMode}
                className={`p-1 rounded transition-colors shrink-0 ${
                  isDevMode
                    ? 'text-amber-400 bg-amber-950/40'
                    : 'text-neutral-700 hover:text-neutral-400'
                }`}
              >
                <Terminal className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>

            {isDevMode && (
              <div
                role="group"
                aria-label={t.workspace.dataSourceLabel}
                className="grid grid-cols-2 gap-1 p-1 bg-[#181818] border border-neutral-800 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => onApiModeChange('mock')}
                  aria-pressed={apiMode === 'mock'}
                  className={`px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors truncate ${
                    apiMode === 'mock'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {t.workspace.modeMock}
                </button>
                <button
                  type="button"
                  onClick={() => onApiModeChange('live')}
                  aria-pressed={apiMode === 'live'}
                  className={`px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors truncate ${
                    apiMode === 'live'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/70'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {t.workspace.modeLive}
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenJwtModal}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-[11px] font-medium transition-all duration-200 ease-out min-h-[36px] ${
                  hasJwtToken
                    ? 'border-emerald-800/70 bg-emerald-950/40 text-emerald-300 hover:border-emerald-700'
                    : 'border-neutral-800 bg-[#161616] text-neutral-300 hover:border-neutral-600'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {hasJwtToken ? t.sidebar.jwtConnected : t.sidebar.jwtConnect}
                </span>
              </button>

              <button
                type="button"
                onClick={onClearLabSession}
                title={t.sidebar.clearLabSession}
                aria-label={t.sidebar.clearLabSession}
                className="inline-flex items-center justify-center px-2.5 py-2 rounded-lg border border-neutral-800 bg-[#161616] text-neutral-400 hover:text-red-300 hover:border-red-900/70 transition-all duration-200 ease-out min-h-[36px] shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
