import { ChatInterface } from '../components/Chat/ChatInterface';
import type { TranslationStrings } from '../i18n/translations';
import type { ApiMode, ChatMessage, SupportedLanguage } from '../types/api';

interface AssistantPageProps {
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

export function AssistantPage(props: AssistantPageProps) {
  return <ChatInterface {...props} />;
}
