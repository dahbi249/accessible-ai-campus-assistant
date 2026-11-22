import { AnnouncementsView } from '../components/Announcements/AnnouncementsView';
import type { TranslationStrings } from '../i18n/translations';
import type { ApiMode, SupportedLanguage } from '../types/api';

interface AnnouncementsPageProps {
  language: SupportedLanguage;
  apiMode: ApiMode;
  isDevMode: boolean;
  onAskAboutNotice?: (prompt: string) => void;
  t: TranslationStrings;
}

export function AnnouncementsPage(props: AnnouncementsPageProps) {
  return <AnnouncementsView {...props} />;
}
