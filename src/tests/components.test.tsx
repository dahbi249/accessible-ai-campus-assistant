import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { AnnouncementsView } from '../components/Announcements/AnnouncementsView';
import { ChatInterface } from '../components/Chat/ChatInterface';
import { MarkdownRenderer } from '../components/Chat/MarkdownRenderer';
import { NavigationDrawer } from '../components/Sidebar/NavigationDrawer';
import { TRANSLATIONS } from '../i18n/translations';
import { campusApi, setApiMode } from '../services/api';
import type { ChatMessage } from '../types/api';

vi.mock('../components/CampusMap/CampusMapView', () => ({
  CampusMapView: () => <div data-testid="mock-campus-map-view">Campus Map View</div>,
}));

function mockMatchMedia(reducedMotion = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  setApiMode('mock');
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('NavigationDrawer stealth developer controls & Escape close', () => {
  it('hides API mode switchers when isDevMode is false and shows them when true', () => {
    const baseProps = {
      isOpen: true,
      onClose: vi.fn(),
      activeView: 'assistant' as const,
      onSelectView: vi.fn(),
      sessions: [],
      activeSessionId: null,
      onSelectSession: vi.fn(),
      onDeleteSession: vi.fn(),
      onNewChat: vi.fn(),
      onClearLabSession: vi.fn(),
      apiMode: 'mock' as const,
      onApiModeChange: vi.fn(),
      onToggleDevMode: vi.fn(),
      hasJwtToken: false,
      onOpenJwtModal: vi.fn(),
      t: TRANSLATIONS.en,
    };

    const { rerender } = render(<NavigationDrawer {...baseProps} isDevMode={false} />);
    expect(screen.queryByText(TRANSLATIONS.en.workspace.modeMock)).not.toBeInTheDocument();
    expect(screen.queryByText(TRANSLATIONS.en.workspace.modeLive)).not.toBeInTheDocument();

    rerender(<NavigationDrawer {...baseProps} isDevMode={true} />);
    expect(screen.getByText(TRANSLATIONS.en.workspace.modeMock)).toBeInTheDocument();
    expect(screen.getByText(TRANSLATIONS.en.workspace.modeLive)).toBeInTheDocument();
  });

  it('closes on Escape key when viewed on mobile width (< 1024px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 390 });
    const onClose = vi.fn();

    render(
      <NavigationDrawer
        isOpen={true}
        onClose={onClose}
        activeView="assistant"
        onSelectView={vi.fn()}
        sessions={[]}
        activeSessionId={null}
        onSelectSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onNewChat={vi.fn()}
        onClearLabSession={vi.fn()}
        apiMode="mock"
        onApiModeChange={vi.fn()}
        isDevMode={false}
        onToggleDevMode={vi.fn()}
        hasJwtToken={false}
        onOpenJwtModal={vi.fn()}
        t={TRANSLATIONS.en}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('AnnouncementsView localization and chat bridge', () => {
  it('renders localized Arabic titles and triggers Ask Assistant callback', async () => {
    const onAskAboutNotice = vi.fn();
    render(
      <AnnouncementsView
        language="ar"
        apiMode="mock"
        isDevMode={false}
        onAskAboutNotice={onAskAboutNotice}
        t={TRANSLATIONS.ar}
      />
    );

    const askButtons = await waitFor(() =>
      screen.getAllByRole('button', { name: TRANSLATIONS.ar.announcements.askAssistantAction })
    );
    expect(askButtons.length).toBeGreaterThan(0);

    fireEvent.click(askButtons[0]);
    expect(onAskAboutNotice).toHaveBeenCalledTimes(1);
    expect(onAskAboutNotice.mock.calls[0]?.[0]).toContain('فترة التسجيل الإداري');
  });
});

describe('ChatInterface feedback, citations, PII scrubbing, and ARIA Announce', () => {
  it('renders inline citation anchors and records helpful feedback on assistant responses', () => {
    const onMessagesChange = vi.fn();
    const initialMessages: ChatMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        content: 'Where is the Central Library?',
        language: 'en',
        timestamp: '2026-11-14T10:00:00Z',
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Central Library is open 08:00 to 18:00.',
        language: 'en',
        timestamp: '2026-11-14T10:00:02Z',
        status: 'answered',
        sources: [
          {
            source_id: 'src-lib-1',
            title: 'Library Handbook',
            source_type: 'document',
            page: 2,
            url: null,
          },
        ],
      },
    ];

    render(
      <ChatInterface
        language="en"
        apiMode="mock"
        isDevMode={false}
        messages={initialMessages}
        conversationId="conv-1"
        onMessagesChange={onMessagesChange}
        onConversationIdChange={vi.fn()}
        t={TRANSLATIONS.en}
      />
    );

    expect(screen.getByRole('button', { name: '[1]' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: TRANSLATIONS.en.chat.downloadTranscript })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.en.chat.feedbackHelpful }));
    expect(onMessagesChange).toHaveBeenCalledTimes(1);
    const updatedMessages = onMessagesChange.mock.calls[0]?.[0] as ChatMessage[];
    expect(updatedMessages[1]?.feedback).toBe('helpful');
  });

  it('automatically announces completed assistant responses via ARIA live region when enabled', async () => {
    mockMatchMedia(true);
    let currentMessages: ChatMessage[] = [];
    const handleMessagesChange = vi.fn((next: ChatMessage[]) => {
      currentMessages = next;
    });

    const { rerender } = render(
      <ChatInterface
        language="en"
        apiMode="mock"
        isDevMode={false}
        announceResponses={true}
        messages={currentMessages}
        conversationId={null}
        onMessagesChange={(next) => {
          handleMessagesChange(next);
          rerender(
            <ChatInterface
              language="en"
              apiMode="mock"
              isDevMode={false}
              announceResponses={true}
              messages={next}
              conversationId="mock-conv"
              onMessagesChange={handleMessagesChange}
              onConversationIdChange={vi.fn()}
              t={TRANSLATIONS.en}
            />
          );
        }}
        onConversationIdChange={vi.fn()}
        t={TRANSLATIONS.en}
      />
    );

    const announcer = screen.getByTestId('ai-response-announcer');
    expect(announcer).toHaveAttribute('aria-live', 'polite');
    expect(announcer).toHaveAttribute('aria-atomic', 'true');
    expect(announcer).toHaveTextContent('');

    const textbox = screen.getByPlaceholderText(TRANSLATIONS.en.chat.inputPlaceholder);
    fireEvent.change(textbox, { target: { value: 'Library opening hours?' } });
    fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.en.chat.submit }));

    await waitFor(
      () => {
        expect(screen.getByTestId('ai-response-announcer').textContent?.trim().length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );

    expect(screen.getByTestId('ai-response-announcer')).toHaveTextContent(/Assistant response complete/i);
  });

  it('respects announceResponses=false for auto-announce but supports manual Announce button', () => {
    const initialMessages: ChatMessage[] = [
      {
        id: 'assistant-manual-1',
        role: 'assistant',
        content: '**Central Library** is open Sunday to Thursday, 08:00 to 18:00.',
        language: 'en',
        timestamp: '2026-11-14T10:00:02Z',
        status: 'answered',
        sources: [
          {
            source_id: 'src-1',
            title: 'Library Guide',
            source_type: 'document',
            page: 1,
            url: null,
          },
        ],
      },
    ];

    render(
      <ChatInterface
        language="en"
        apiMode="mock"
        isDevMode={false}
        announceResponses={false}
        messages={initialMessages}
        conversationId="conv-manual"
        onMessagesChange={vi.fn()}
        onConversationIdChange={vi.fn()}
        t={TRANSLATIONS.en}
      />
    );

    const announcer = screen.getByTestId('ai-response-announcer');
    expect(announcer).toHaveTextContent('');

    const announceBtn = screen.getByRole('button', {
      name: new RegExp(`^${TRANSLATIONS.en.chat.announceAnswer}:`, 'i'),
    });
    fireEvent.click(announceBtn);

    expect(announcer).toHaveTextContent(
      TRANSLATIONS.en.chat.responseCompleteAnnouncement(
        'answered',
        1,
        'Central Library is open Sunday to Thursday, 08:00 to 18:00.'
      )
    );
    expect(screen.getByText(TRANSLATIONS.en.chat.announcedStatus)).toBeInTheDocument();
  });
});

describe('App Alt+1 / Alt+2 / Alt+3 keyboard shortcuts', () => {
  it('switches between Assistant, Announcements, and Campus Map views and announces transitions', async () => {
    render(<App />);

    const viewAnnouncer = screen.getByTestId('view-switch-announcer');
    expect(viewAnnouncer).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByPlaceholderText(TRANSLATIONS.en.chat.inputPlaceholder)).toBeInTheDocument();

    // Ctrl+Alt+2 should NOT trigger view switching
    fireEvent.keyDown(window, { key: '2', code: 'Digit2', altKey: true, ctrlKey: true });
    expect(screen.getByPlaceholderText(TRANSLATIONS.en.chat.inputPlaceholder)).toBeInTheDocument();
    expect(viewAnnouncer).toHaveTextContent('');

    // Alt+2 -> Announcements view
    fireEvent.keyDown(window, { key: '2', code: 'Digit2', altKey: true });
    expect(
      screen.getByRole('heading', { name: TRANSLATIONS.en.announcements.title })
    ).toBeInTheDocument();
    expect(viewAnnouncer).toHaveTextContent(
      TRANSLATIONS.en.nav.viewSwitchedAnnouncement(TRANSLATIONS.en.nav.announcements)
    );

    // Alt+3 (including macOS Option remapped character via event.code) -> Campus Map view
    fireEvent.keyDown(window, { key: '£', code: 'Digit3', altKey: true });
    await waitFor(() => {
      expect(screen.getByTestId('mock-campus-map-view')).toBeInTheDocument();
    });
    expect(viewAnnouncer).toHaveTextContent(
      TRANSLATIONS.en.nav.viewSwitchedAnnouncement(TRANSLATIONS.en.nav.campusMap)
    );

    // Alt+1 -> Back to Assistant view
    fireEvent.keyDown(window, { key: '1', code: 'Digit1', altKey: true });
    expect(screen.getByPlaceholderText(TRANSLATIONS.en.chat.inputPlaceholder)).toBeInTheDocument();
    expect(viewAnnouncer).toHaveTextContent(
      TRANSLATIONS.en.nav.viewSwitchedAnnouncement(TRANSLATIONS.en.nav.assistant)
    );
  });

  it('supports / to focus chat input, Ctrl+Shift+O for New Chat, and focus trapping in Student Sign In modal', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1280 });
    render(<App />);

    // Jump to Announcements view first
    fireEvent.keyDown(window, { key: '2', code: 'Digit2', altKey: true });
    expect(
      screen.getByRole('heading', { name: TRANSLATIONS.en.announcements.title })
    ).toBeInTheDocument();

    // Press `/` outside an editable field -> switches to Assistant and focuses composer
    fireEvent.keyDown(window, { key: '/', code: 'Slash' });
    const composer = await waitFor(() =>
      screen.getByPlaceholderText(TRANSLATIONS.en.chat.inputPlaceholder)
    );
    await waitFor(() => {
      expect(document.activeElement).toBe(composer);
    });

    // Submit a quick message then press Ctrl+Shift+O to start a clean New Chat
    fireEvent.change(composer, { target: { value: 'Registration docs?' } });
    fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.en.chat.submit }));
    await waitFor(() => {
      expect(screen.getAllByText('Registration docs?').length).toBeGreaterThan(0);
    });

    fireEvent.keyDown(window, { key: 'O', code: 'KeyO', ctrlKey: true, shiftKey: true });
    await waitFor(() => {
      expect(screen.getByText(TRANSLATIONS.en.chat.emptyTitle)).toBeInTheDocument();
    });

    // Open Student Sign In modal and verify Tab stays trapped inside dialog & Escape restores opener focus
    const signInOpener = screen.getByRole('button', {
      name: TRANSLATIONS.en.sidebar.jwtConnect,
    });
    signInOpener.focus();
    fireEvent.click(signInOpener);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    // Shift+Tab from first element wraps cleanly to last focusable element inside modal
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Escape closes modal and restores focus to opener
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(signInOpener);
  });
});

describe('AnnouncementsView calendar export, PII warning, edit/regenerate, and print', () => {
  it('renders Add to Calendar (.ics) buttons for dated notices', async () => {
    render(
      <AnnouncementsView
        language="en"
        apiMode="mock"
        isDevMode={false}
        t={TRANSLATIONS.en}
      />
    );

    const calButtons = await waitFor(() =>
      screen.getAllByRole('button', { name: TRANSLATIONS.en.announcements.addToCalendar })
    );
    expect(calButtons).toHaveLength(3);
  });

  it('shows debounced pre-send PII warning in composer while typing sensitive patterns', async () => {
    render(
      <ChatInterface
        language="en"
        apiMode="mock"
        isDevMode={false}
        messages={[]}
        conversationId={null}
        onMessagesChange={vi.fn()}
        onConversationIdChange={vi.fn()}
        t={TRANSLATIONS.en}
      />
    );

    expect(screen.queryByTestId('pii-presend-warning')).not.toBeInTheDocument();

    const textbox = screen.getByPlaceholderText(TRANSLATIONS.en.chat.inputPlaceholder);
    fireEvent.change(textbox, {
      target: { value: 'Call me at 0555 12 34 56 about registration' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('pii-presend-warning')).toHaveTextContent(
        TRANSLATIONS.en.chat.piiLabels.phone
      );
    });
  });

  it('supports editing the last user prompt, regenerating the last response, and printing', async () => {
    mockMatchMedia(true);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    const initialMessages: ChatMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        content: 'Where is the Central Library?',
        language: 'en',
        timestamp: '2026-11-14T10:00:00Z',
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Central Library is open 08:00 to 18:00.',
        language: 'en',
        timestamp: '2026-11-14T10:00:02Z',
        status: 'answered',
        sources: [],
      },
    ];

    let latestMessages: ChatMessage[] = initialMessages;

    function StatefulChatHarness() {
      const [msgs, setMsgs] = useState<ChatMessage[]>(initialMessages);
      const [convId, setConvId] = useState<string | null>('conv-edit');

      return (
        <ChatInterface
          language="en"
          apiMode="mock"
          isDevMode={false}
          messages={msgs}
          conversationId={convId}
          onMessagesChange={(next) => {
            latestMessages = next;
            setMsgs(next);
          }}
          onConversationIdChange={setConvId}
          t={TRANSLATIONS.en}
        />
      );
    }

    render(<StatefulChatHarness />);

    // Click Print on assistant card
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`^${TRANSLATIONS.en.chat.printAnswer}:`, 'i'),
      })
    );
    await waitFor(() => {
      expect(printSpy).toHaveBeenCalledTimes(1);
    });

    // Click Regenerate on last assistant message
    fireEvent.click(
      screen.getByRole('button', { name: TRANSLATIONS.en.chat.regenerateResponse })
    );
    await waitFor(() => {
      expect(latestMessages.length).toBe(2);
      expect(latestMessages[1].id).not.toBe('assistant-1');
    });

    // Wait for loading to complete so Edit button is enabled again
    const editBtn = await waitFor(() =>
      screen.getByRole('button', { name: TRANSLATIONS.en.chat.editPrompt })
    );
    fireEvent.click(editBtn);

    const editBox = screen.getByLabelText(TRANSLATIONS.en.chat.editPrompt);
    fireEvent.change(editBox, { target: { value: 'Registration documents required?' } });
    fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.en.chat.saveAndSend }));

    await waitFor(() => {
      expect(screen.getByText('Registration documents required?')).toBeInTheDocument();
      expect(screen.queryByText('Where is the Central Library?')).not.toBeInTheDocument();
    });
  });

  it('applies scroll-smooth class and smoothly scrolls to the bottom on new messages and during streaming', async () => {
    mockMatchMedia(false);

    function StreamingScrollHarness() {
      const [msgs, setMsgs] = useState<ChatMessage[]>([]);
      const [convId, setConvId] = useState<string | null>(null);

      return (
        <ChatInterface
          language="en"
          apiMode="mock"
          isDevMode={false}
          messages={msgs}
          conversationId={convId}
          onMessagesChange={setMsgs}
          onConversationIdChange={setConvId}
          t={TRANSLATIONS.en}
        />
      );
    }

    render(<StreamingScrollHarness />);

    const scrollContainer = screen.getByTestId('chat-message-scroll-container');
    expect(scrollContainer).toHaveClass('scroll-smooth');

    const scrollToSpy = vi.fn();
    Object.defineProperty(scrollContainer, 'scrollHeight', {
      configurable: true,
      value: 1420,
    });
    Object.defineProperty(scrollContainer, 'scrollTo', {
      configurable: true,
      value: scrollToSpy,
    });

    const textbox = screen.getByPlaceholderText(TRANSLATIONS.en.chat.inputPlaceholder);
    fireEvent.change(textbox, { target: { value: 'Library opening hours?' } });
    fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.en.chat.submit }));

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 1420,
        behavior: 'smooth',
      });
    });

    // Wait for streaming answer tokens to complete and verify continued smooth scroll updates
    await waitFor(
      () => {
        expect(screen.getByText(/Central University Library/i)).toBeInTheDocument();
        expect(scrollToSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 3000 }
    );
  });

  it('copies AI message text to clipboard with visual success and error feedback states', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });

    const initialMessages: ChatMessage[] = [
      {
        id: 'user-copy-1',
        role: 'user',
        content: 'Where is the Central Library?',
        language: 'en',
        timestamp: '2026-11-14T10:00:00Z',
      },
      {
        id: 'assistant-copy-1',
        role: 'assistant',
        content: 'Central Library is open Sunday to Thursday, 08:00 to 18:00.',
        language: 'en',
        timestamp: '2026-11-14T10:00:02Z',
        status: 'answered',
        sources: [],
      },
      {
        id: 'assistant-copy-2',
        role: 'assistant',
        content: 'Registration requires your Baccalaureate transcript and ID copy.',
        language: 'en',
        timestamp: '2026-11-14T10:01:02Z',
        status: 'answered',
        sources: [],
      },
    ];

    render(
      <ChatInterface
        language="en"
        apiMode="mock"
        isDevMode={false}
        messages={initialMessages}
        conversationId="conv-copy"
        onMessagesChange={vi.fn()}
        onConversationIdChange={vi.fn()}
        t={TRANSLATIONS.en}
      />
    );

    const copyBtn1 = screen.getByTestId('copy-message-assistant-copy-1');
    const copyBtn2 = screen.getByTestId('copy-message-assistant-copy-2');
    expect(copyBtn1).toHaveAttribute('data-copied', 'false');
    expect(copyBtn2).toHaveAttribute('data-copied', 'false');

    fireEvent.click(copyBtn2);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        'Registration requires your Baccalaureate transcript and ID copy.'
      );
      expect(copyBtn2).toHaveAttribute('data-copied', 'true');
      expect(copyBtn2).toHaveTextContent(TRANSLATIONS.en.chat.copiedAnswer);
      expect(copyBtn2).toHaveClass('border-emerald-500/70');
      expect(copyBtn1).toHaveAttribute('data-copied', 'false');
    });

    // Wait for 2s feedback timeout to clear back to default state
    await waitFor(
      () => {
        expect(copyBtn2).toHaveAttribute('data-copied', 'false');
        expect(copyBtn2).toHaveTextContent(TRANSLATIONS.en.chat.copyAnswer);
      },
      { timeout: 3000 }
    );

    // Verify failure feedback when clipboard rejects and execCommand fallback is unavailable
    writeTextMock.mockRejectedValueOnce(new Error('Clipboard denied'));
    fireEvent.click(copyBtn1);

    await waitFor(() => {
      expect(copyBtn1).toHaveAttribute('data-copied', 'false');
      expect(copyBtn1).toHaveTextContent(TRANSLATIONS.en.chat.copyFailed);
      expect(copyBtn1).toHaveClass('border-red-500/60');
    });
  });

  it('displays a visual typing indicator in the message list during computation and AI response streaming', async () => {
    mockMatchMedia(true);

    let emitToken: ((text: string) => void) | undefined;
    let resolveStream:
      | ((val: {
          response: {
            answer: string;
            conversation_id: string;
            language: 'en';
            sources: [];
            status: 'answered';
          };
          streamedViaSse: boolean;
        }) => void)
      | undefined;

    vi.spyOn(campusApi, 'sendChatMessageStream').mockImplementation(
      (_payload, callbacks) => {
        emitToken = callbacks.onToken;
        return new Promise((resolve) => {
          resolveStream = resolve;
        });
      }
    );

    function TypingIndicatorHarness() {
      const [msgs, setMsgs] = useState<ChatMessage[]>([]);
      const [convId, setConvId] = useState<string | null>(null);

      return (
        <ChatInterface
          language="en"
          apiMode="mock"
          isDevMode={false}
          messages={msgs}
          conversationId={convId}
          onMessagesChange={setMsgs}
          onConversationIdChange={setConvId}
          t={TRANSLATIONS.en}
        />
      );
    }

    render(<TypingIndicatorHarness />);

    expect(screen.queryByTestId('ai-typing-indicator')).not.toBeInTheDocument();

    const textbox = screen.getByPlaceholderText(TRANSLATIONS.en.chat.inputPlaceholder);
    fireEvent.change(textbox, { target: { value: 'Explain scholarship deadline' } });
    fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.en.chat.submit }));

    // Phase 1: Waiting for first token / retrieval computation
    const waitingIndicator = await screen.findByTestId('ai-typing-indicator');
    expect(waitingIndicator).toHaveTextContent(TRANSLATIONS.en.chat.loadingStatus);

    // Phase 2: Partial SSE tokens arriving
    emitToken?.('The merit scholarship application ');
    await waitFor(() => {
      expect(
        screen.getByText(/The merit scholarship application/i)
      ).toBeInTheDocument();
      const streamingIndicator = screen.getByTestId('ai-typing-indicator');
      expect(streamingIndicator).toHaveTextContent(TRANSLATIONS.en.chat.typingLabel);
    });

    // Phase 3: Streaming completes -> indicator disappears
    resolveStream?.({
      response: {
        answer: 'The merit scholarship application closes on November 30.',
        conversation_id: 'conv-typing',
        language: 'en',
        sources: [],
        status: 'answered',
      },
      streamedViaSse: true,
    });

    const scrollContainer = screen.getByTestId('chat-message-scroll-container');
    await waitFor(() => {
      expect(
        within(scrollContainer).getByText(
          /The merit scholarship application closes on November 30\./i
        )
      ).toBeInTheDocument();
      expect(screen.queryByTestId('ai-typing-indicator')).not.toBeInTheDocument();
    });
  });

  it('renders subtle relative timestamps with semantic time elements on each chat message', () => {
    const now = Date.now();
    const twoMinutesAgoIso = new Date(now - 2 * 60_000).toISOString();
    const tenSecondsAgoIso = new Date(now - 10_000).toISOString();

    const messages: ChatMessage[] = [
      {
        id: 'user-rel-1',
        role: 'user',
        content: 'When do semester exams start?',
        language: 'en',
        timestamp: twoMinutesAgoIso,
      },
      {
        id: 'assistant-rel-1',
        role: 'assistant',
        content: 'Semester exams begin on January 18.',
        language: 'en',
        timestamp: tenSecondsAgoIso,
        status: 'answered',
        sources: [],
      },
    ];

    render(
      <ChatInterface
        language="en"
        apiMode="mock"
        isDevMode={false}
        messages={messages}
        conversationId="conv-rel"
        onMessagesChange={vi.fn()}
        onConversationIdChange={vi.fn()}
        t={TRANSLATIONS.en}
      />
    );

    const userTime = screen.getByTestId('message-timestamp-user-rel-1');
    const assistantTime = screen.getByTestId('message-timestamp-assistant-rel-1');

    expect(userTime.tagName).toBe('TIME');
    expect(userTime).toHaveAttribute('datetime', twoMinutesAgoIso);
    expect(userTime).toHaveTextContent('2m ago');
    expect(userTime.getAttribute('title')).toBeTruthy();

    expect(assistantTime.tagName).toBe('TIME');
    expect(assistantTime).toHaveAttribute('datetime', tenSecondsAgoIso);
    expect(assistantTime).toHaveTextContent('just now');
    expect(assistantTime.getAttribute('title')).toBeTruthy();
  });

  it('safely renders #hashtags, level-5 headings, and currency prose without hanging or fake math', () => {
    const { container } = render(
      <MarkdownRenderer
        content={`#Tamanrasset\n##### Sub-section 5\nFee is $10 for residents and $20 for non-residents. Inline math $x + y$ still renders.`}
        copyCodeLabel="Copy"
        copiedCodeLabel="Copied"
      />
    );

    expect(screen.getByText(/#Tamanrasset/)).toBeInTheDocument();
    expect(screen.getByText(/##### Sub-section 5/)).toBeInTheDocument();
    expect(
      screen.getByText(/Fee is \$10 for residents and \$20 for non-residents\./)
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.katex')).toHaveLength(1);
  });

  it('marks collapsed NavigationDrawer aria-hidden and invisible so closed controls are skipped', () => {
    const { container } = render(
      <NavigationDrawer
        isOpen={false}
        onClose={vi.fn()}
        activeView="assistant"
        onSelectView={vi.fn()}
        sessions={[]}
        activeSessionId={null}
        onSelectSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onNewChat={vi.fn()}
        onClearLabSession={vi.fn()}
        apiMode="mock"
        onApiModeChange={vi.fn()}
        isDevMode={false}
        onToggleDevMode={vi.fn()}
        hasJwtToken={false}
        onOpenJwtModal={vi.fn()}
        t={TRANSLATIONS.en}
      />
    );

    const aside = container.querySelector('aside');
    expect(aside).toHaveAttribute('aria-hidden', 'true');
    expect(aside?.className).toContain('invisible');
  });
});
