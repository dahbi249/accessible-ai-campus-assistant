import { CampusMapView } from '../components/CampusMap/CampusMapView';
import type { TranslationStrings } from '../i18n/translations';
import type { ApiMode, SupportedLanguage } from '../types/api';

interface CampusMapPageProps {
  language: SupportedLanguage;
  apiMode: ApiMode;
  onAskAboutLocation?: (prompt: string) => void;
  t: TranslationStrings;
}

export function CampusMapPage(props: CampusMapPageProps) {
  return <CampusMapView {...props} />;
}
