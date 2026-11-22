import type { PiiType, SupportedLanguage } from '../types/api';

export function getDirection(language: SupportedLanguage): 'rtl' | 'ltr' {
  return language === 'ar' ? 'rtl' : 'ltr';
}

export interface TranslationStrings {
  appName: string;
  skipToContent: string;
  nav: {
    assistant: string;
    announcements: string;
    campusMap: string;
    viewSwitchedAnnouncement: (viewLabel: string) => string;
  };
  a11y: {
    menuButton: string;
    menuTitle: string;
    fontSizeLabel: string;
    highContrastLabel: string;
    highContrastOn: string;
    highContrastOff: string;
    announceResponsesLabel: string;
    shortcutsHeading: string;
    shortcutAssistant: string;
    shortcutAnnouncements: string;
    shortcutMap: string;
    shortcutFocusChat: string;
    shortcutNewChat: string;
  };
  pwa: {
    installApp: string;
    installIos: string;
    iosTitle: string;
    iosSteps: string[];
    iosClose: string;
    offlineNotice: string;
  };
  sidebar: {
    openDrawer: string;
    closeDrawer: string;
    newChat: string;
    historyHeading: string;
    emptyHistory: string;
    deleteSession: string;
    workspaceHeading: string;
    clearLabSession: string;
    sessionClearedNotice: string;
    securityLabel: string;
    jwtConnect: string;
    jwtConnected: string;
    jwtModalTitle: string;
    jwtModalDescription: string;
    studentLoginTab: string;
    devTokenTab: string;
    studentIdLabel: string;
    studentIdPlaceholder: string;
    passwordLabel: string;
    signInSubmit: string;
    signingIn: string;
    jwtPlaceholder: string;
    jwtSave: string;
    jwtClear: string;
    jwtCancel: string;
    sessionExpiredNotice: string;
    idleLockWarning: (seconds: number) => string;
    idleStaySignedIn: string;
    idleAutoClearedNotice: string;
  };
  workspace: {
    subtitle: string;
    newChat: string;
    dataSourceLabel: string;
    modeMock: string;
    modeLive: string;
    mockNoticeTitle: string;
    mockNoticeBody: string;
    liveEndpointLabel: string;
  };
  chat: {
    title: string;
    description: string;
    emptyTitle: string;
    emptySubtitle: string;
    starterHeading: string;
    starters: string[];
    quickActions: { label: string; prompt: string }[];
    inputLabel: string;
    inputPlaceholder: string;
    submit: string;
    sending: string;
    stopGenerating: string;
    voiceInputStart: string;
    voiceInputStop: string;
    voiceListening: string;
    listenAnswer: string;
    stopListening: string;
    announceAnswer: string;
    announcedStatus: string;
    responseCompleteAnnouncement: (
      status: 'answered' | 'not_found' | 'error',
      sourcesCount: number,
      preview: string
    ) => string;
    loadingStatus: string;
    streamingStatus: string;
    typingLabel: string;
    youLabel: string;
    assistantLabel: string;
    notFoundTitle: string;
    notFoundGuidance: string;
    errorTitle: string;
    retry: string;
    sourcesCount: (count: number) => string;
    viewSources: string;
    closeSources: string;
    keyboardHint: string;
    copyAnswer: string;
    copiedAnswer: string;
    copyFailed: string;
    copyCode: string;
    copiedCode: string;
    downloadTranscript: string;
    feedbackHelpful: string;
    feedbackReport: string;
    feedbackRecorded: string;
    jumpToLatest: string;
    printAnswer: string;
    printHeading: string;
    editPrompt: string;
    saveAndSend: string;
    cancelEdit: string;
    regenerateResponse: string;
    piiPreSendWarning: (types: string[]) => string;
    piiNotice: (types: string[]) => string;
    piiLabels: Record<PiiType, string>;
  };
  sources: {
    panelTitle: string;
    panelSubtitle: string;
    emptyTitle: string;
    emptyBody: string;
    noSourcesForNotFound: string;
    typeLabel: string;
    pageLabel: (page: number) => string;
    openOfficialUrl: string;
    noExternalUrl: string;
    sourceIdLabel: string;
  };
  announcements: {
    title: string;
    description: string;
    searchLabel: string;
    searchPlaceholder: string;
    categoryAll: string;
    categories: Record<string, string>;
    loading: string;
    emptyTitle: string;
    emptyBody: string;
    resetFilters: string;
    errorTitle: string;
    retry: string;
    publishedLabel: string;
    dateUnavailable: string;
    officialLink: string;
    addToCalendar: string;
    askAssistantAction: string;
    askAboutNoticePrompt: (title: string) => string;
    mockBanner: string;
    resultCount: (count: number) => string;
  };
  map: {
    title: string;
    description: string;
    campusAddress: string;
    filterAll: string;
    accessibleOnlyFilter: string;
    accessibleBadge: string;
    openingHoursLabel: string;
    askAssistantAction: string;
    askAboutBuildingPrompt: (name: string) => string;
    categories: Record<string, string>;
    directoryHeading: string;
    loading: string;
    emptyTitle: string;
    emptyBody: string;
    errorTitle: string;
    retry: string;
    coordinatesLabel: string;
    openInGoogleMaps: string;
    recenterCampus: string;
    locationsCount: (count: number) => string;
    selectPrompt: string;
    searchLabel: string;
    searchPlaceholder: string;
    clearSearch: string;
    locateMe: string;
    locating: string;
    clearMyLocation: string;
    youAreHere: string;
    locationPrivacyNote: string;
    locationUnsupportedError: string;
    locationPermissionDenied: string;
    locationUnavailableError: string;
    walkingDistanceLabel: (meters: number, minutes: number) => string;
  };
  footer: {
    attribution: string;
    groundingPolicy: string;
  };
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationStrings> = {
  en: {
    appName: 'Campus Assistant',
    skipToContent: 'Skip to main content',
    nav: {
      assistant: 'Assistant',
      announcements: 'Announcements',
      campusMap: 'Campus Map',
      viewSwitchedAnnouncement: (viewLabel) => `Switched to ${viewLabel} view.`,
    },
    a11y: {
      menuButton: 'Accessibility display settings',
      menuTitle: 'Display & Accessibility',
      fontSizeLabel: 'Text size',
      highContrastLabel: 'High-contrast borders',
      highContrastOn: 'Enabled',
      highContrastOff: 'Off',
      announceResponsesLabel: 'Screen-reader response announce',
      shortcutsHeading: 'Keyboard shortcuts',
      shortcutAssistant: 'Assistant view',
      shortcutAnnouncements: 'Announcements view',
      shortcutMap: 'Campus Map view',
      shortcutFocusChat: 'Focus chat input',
      shortcutNewChat: 'New chat session',
    },
    pwa: {
      installApp: 'Install App',
      installIos: 'Install on iOS',
      iosTitle: 'Install on iPhone or iPad',
      iosSteps: [
        'Tap the Share icon in the Safari toolbar.',
        'Scroll down and choose "Add to Home Screen".',
        'Tap "Add" to use Campus Assistant offline.',
      ],
      iosClose: 'Close',
      offlineNotice: 'Offline mode active — cached campus map and interface remain available.',
    },
    sidebar: {
      openDrawer: 'Open navigation sidebar',
      closeDrawer: 'Collapse navigation sidebar',
      newChat: 'New Chat',
      historyHeading: 'Session History',
      emptyHistory: 'No conversations in this session yet.',
      deleteSession: 'Delete conversation',
      workspaceHeading: 'Campus Modules',
      clearLabSession: 'Clear Lab Session',
      sessionClearedNotice: 'Local session history and auth token cleared.',
      securityLabel: 'Session-isolated · PII redaction active',
      jwtConnect: 'Student Sign In',
      jwtConnected: 'Student Session Active',
      jwtModalTitle: 'Student Portal Authentication',
      jwtModalDescription: 'Sign in with your university credentials or attach a session token. Stored strictly in tab-isolated sessionStorage.',
      studentLoginTab: 'University Account',
      devTokenTab: 'Bearer JWT (Dev)',
      studentIdLabel: 'Student ID or University Email',
      studentIdPlaceholder: 'e.g. student@univ-tam.dz',
      passwordLabel: 'Password',
      signInSubmit: 'Sign In',
      signingIn: 'Signing in...',
      jwtPlaceholder: 'Paste Bearer JWT token...',
      jwtSave: 'Save Session Token',
      jwtClear: 'Sign Out',
      jwtCancel: 'Cancel',
      sessionExpiredNotice: 'Your student session expired. Please sign in again.',
      idleLockWarning: (seconds: number) =>
        `Shared lab privacy lock: session clears automatically in ${seconds}s.`,
      idleStaySignedIn: 'Stay active',
      idleAutoClearedNotice: 'Session automatically cleared after inactivity.',
    },
    workspace: {
      subtitle: 'Academic, administrative, and campus guidance grounded in official university records.',
      newChat: 'New Chat',
      dataSourceLabel: 'API Source:',
      modeMock: 'Local Dev Mock',
      modeLive: 'Live FastAPI',
      mockNoticeTitle: 'Local development mock mode active',
      mockNoticeBody: 'Sample development fixtures shown—not verified university records.',
      liveEndpointLabel: 'Backend:',
    },
    chat: {
      title: 'Ask the University Assistant',
      description: 'Ask by typing or voice in English, French, or Arabic. Answers cite official university documents and scrub PII locally.',
      emptyTitle: 'Start a grounded inquiry',
      emptySubtitle: 'Ask about registration procedures, scholarship deadlines, exam regulations, or campus facilities.',
      starterHeading: 'Example student questions',
      starters: [
        'What documents are required for university registration?',
        'When is the deadline to apply for merit scholarships?',
        'Where is the Central Library and what are its study hours?',
        'What is the price of Tuesday lunch in the cafeteria?',
      ],
      quickActions: [
        { label: 'Registration docs', prompt: 'What documents are required for university registration?' },
        { label: 'Library opening hours', prompt: 'Where is the Central Library and what are its study hours?' },
        { label: 'Scholarship deadline', prompt: 'When is the deadline to apply for merit scholarships?' },
        { label: 'Cafeteria menu (unavailable)', prompt: 'What is the price of Tuesday lunch in the cafeteria?' },
      ],
      inputLabel: 'Your question',
      inputPlaceholder: 'Ask about registration, exams, administrative forms, or campus offices...',
      submit: 'Send',
      sending: 'Sending...',
      stopGenerating: 'Stop',
      voiceInputStart: 'Dictate question by voice',
      voiceInputStop: 'Stop voice dictation',
      voiceListening: 'Listening...',
      listenAnswer: 'Listen',
      stopListening: 'Stop audio',
      announceAnswer: 'Announce',
      announcedStatus: 'Announced',
      responseCompleteAnnouncement: (status, sourcesCount, preview) =>
        status === 'not_found'
          ? `Assistant response complete. Information unavailable in official records. ${preview}`
          : `Assistant response complete with ${sourcesCount} ${
              sourcesCount === 1 ? 'verified source' : 'verified sources'
            }. ${preview}`,
      loadingStatus: 'Retrieving official university sources...',
      streamingStatus: 'Streaming grounded response...',
      typingLabel: 'Assistant is typing',
      youLabel: 'Student',
      assistantLabel: 'Campus Assistant',
      notFoundTitle: 'Information unavailable in official records',
      notFoundGuidance: 'No verified university document covers this request. Contact the Registrar or Student Affairs Office for confirmation.',
      errorTitle: 'Unable to reach the assistant service',
      retry: 'Retry',
      sourcesCount: (count: number) => `${count} ${count === 1 ? 'source' : 'sources'}`,
      viewSources: 'Inspect sources',
      closeSources: 'Close sources',
      keyboardHint: 'Press Enter to send, Shift+Enter for a new line',
      copyAnswer: 'Copy answer',
      copiedAnswer: 'Copied',
      copyFailed: 'Unable to copy',
      copyCode: 'Copy code',
      copiedCode: 'Copied',
      downloadTranscript: 'Save transcript',
      feedbackHelpful: 'Helpful',
      feedbackReport: 'Report gap',
      feedbackRecorded: 'Feedback saved',
      jumpToLatest: 'Jump to latest',
      printAnswer: 'Print',
      printHeading: 'University of Tamanrasset · Verified Student Record',
      editPrompt: 'Edit',
      saveAndSend: 'Save & send',
      cancelEdit: 'Cancel',
      regenerateResponse: 'Regenerate',
      piiPreSendWarning: (types) =>
        `Privacy shield will mask ${types.join(', ')} locally before sending.`,
      piiNotice: (types) =>
        `Privacy shield scrubbed ${types.join(', ')} locally before sending.`,
      piiLabels: {
        email: 'email',
        phone: 'phone number',
        student_id: 'student/national ID',
        secret: 'credential/token',
      },
    },
    sources: {
      panelTitle: 'Verified Sources',
      panelSubtitle: 'Official references retrieved for the selected answer.',
      emptyTitle: 'No source selected',
      emptyBody: 'Ask a question or select an assistant response to inspect the underlying university documents and links.',
      noSourcesForNotFound: 'No verified source matched this query. Unverified references are never shown.',
      typeLabel: 'Type',
      pageLabel: (page: number) => `Page ${page}`,
      openOfficialUrl: 'Open official document',
      noExternalUrl: 'Internal university archive',
      sourceIdLabel: 'Ref',
    },
    announcements: {
      title: 'University Announcements',
      description: 'Search official academic calendars, administrative notices, and examination schedules.',
      searchLabel: 'Search announcements',
      searchPlaceholder: 'Search by keyword, faculty, or notice title...',
      categoryAll: 'All',
      categories: {
        administrative: 'Administrative',
        academic: 'Academic',
        exams: 'Examinations',
        campus_life: 'Campus Services',
      },
      loading: 'Loading university announcements...',
      emptyTitle: 'No matching announcements',
      emptyBody: 'Try another keyword or clear the selected category filter.',
      resetFilters: 'Clear filters',
      errorTitle: 'Could not load announcements',
      retry: 'Try again',
      publishedLabel: 'Published',
      dateUnavailable: 'Date not specified',
      officialLink: 'Official notice',
      addToCalendar: 'Add to Calendar (.ics)',
      askAssistantAction: 'Ask Assistant',
      askAboutNoticePrompt: (title: string) =>
        `Explain the key deadlines, eligibility, and required steps for the announcement: "${title}"`,
      mockBanner: 'Development mode: displaying sample announcement fixtures. Connect the FastAPI backend for authorized notices.',
      resultCount: (count: number) => `${count} ${count === 1 ? 'announcement' : 'announcements'}`,
    },
    map: {
      title: 'University of Tamanrasset — Campus Map',
      description: 'Locate the Rectorate, Central Library, faculties, departments, and student services along Route de l’Aéroport.',
      campusAddress: 'University of Tamanrasset · Route de l’Aéroport, 11000 Tamanrasset',
      filterAll: 'All facilities',
      accessibleOnlyFilter: 'Step-free only',
      accessibleBadge: 'Step-free access',
      openingHoursLabel: 'Hours',
      askAssistantAction: 'Ask Assistant',
      askAboutBuildingPrompt: (name: string) =>
        `What services, procedures, and office hours apply at ${name} at the University of Tamanrasset?`,
      categories: {
        faculty: 'Faculty',
        library: 'Library',
        administration: 'Administration',
        accessibility: 'Accessibility',
        student_services: 'Student Services',
      },
      directoryHeading: 'Campus Directory',
      loading: 'Loading University of Tamanrasset locations...',
      emptyTitle: 'No facilities found',
      emptyBody: 'No campus locations match the active category filter or search query.',
      errorTitle: 'Could not load campus locations',
      retry: 'Retry',
      coordinatesLabel: 'Coordinates',
      openInGoogleMaps: 'Open in Google Maps',
      recenterCampus: 'Center on Campus',
      locationsCount: (count: number) => `${count} ${count === 1 ? 'location' : 'locations'}`,
      selectPrompt: 'Select a facility to focus the map or navigate via Google Maps',
      searchLabel: 'Search campus facilities',
      searchPlaceholder: 'Search Rectorate, Library, Math & CS, Faculties...',
      clearSearch: 'Clear search',
      locateMe: 'My Location',
      locating: 'Locating...',
      clearMyLocation: 'Clear location pin',
      youAreHere: 'You are here (on-device only)',
      locationPrivacyNote: 'Coordinates stay strictly in your browser and are never sent to any server.',
      locationUnsupportedError: 'Geolocation is not supported by this browser.',
      locationPermissionDenied: 'Location permission was denied. Enable browser location access to estimate walking distances.',
      locationUnavailableError: 'Unable to determine your current coordinates right now.',
      walkingDistanceLabel: (meters: number, minutes: number) =>
        meters >= 1000
          ? `~${(meters / 1000).toFixed(1)} km · ~${minutes} min walk`
          : `~${meters} m · ~${minutes} min walk`,
    },
    footer: {
      attribution: 'Accessible AI Campus Assistant · Zero-Trust Campus Session',
      groundingPolicy: 'Strict grounding policy: unavailable answers are explicitly disclosed.',
    },
  },
  fr: {
    appName: 'Assistant Campus',
    skipToContent: 'Aller au contenu principal',
    nav: {
      assistant: 'Assistant',
      announcements: 'Annonces',
      campusMap: 'Plan du campus',
      viewSwitchedAnnouncement: (viewLabel) => `Affichage basculé sur ${viewLabel}.`,
    },
    a11y: {
      menuButton: 'Options d’accessibilité et d’affichage',
      menuTitle: 'Affichage & Accessibilité',
      fontSizeLabel: 'Taille du texte',
      highContrastLabel: 'Bordures haut contraste',
      highContrastOn: 'Activé',
      highContrastOff: 'Désactivé',
      announceResponsesLabel: 'Annonce vocale ARIA des réponses',
      shortcutsHeading: 'Raccourcis clavier',
      shortcutAssistant: 'Vue Assistant',
      shortcutAnnouncements: 'Vue Annonces',
      shortcutMap: 'Vue Plan du campus',
      shortcutFocusChat: 'Activer la saisie',
      shortcutNewChat: 'Nouvelle discussion',
    },
    pwa: {
      installApp: 'Installer',
      installIos: 'Installer (iOS)',
      iosTitle: 'Installer sur iPhone ou iPad',
      iosSteps: [
        'Appuyez sur le bouton Partager dans la barre Safari.',
        'Faites défiler et sélectionnez « Sur l’écran d’accueil ».',
        'Appuyez sur « Ajouter » pour consulter le plan hors ligne.',
      ],
      iosClose: 'Fermer',
      offlineNotice: 'Mode hors ligne — la carte du campus et l’interface restent disponibles.',
    },
    sidebar: {
      openDrawer: 'Ouvrir la barre latérale',
      closeDrawer: 'Réduire la barre latérale',
      newChat: 'Nouvelle discussion',
      historyHeading: 'Historique de session',
      emptyHistory: 'Aucune conversation dans cette session.',
      deleteSession: 'Supprimer la conversation',
      workspaceHeading: 'Modules du campus',
      clearLabSession: 'Effacer la session',
      sessionClearedNotice: 'Historique local et jeton de session effacés.',
      securityLabel: 'Session isolée · Masquage PII actif',
      jwtConnect: 'Connexion étudiant',
      jwtConnected: 'Session active',
      jwtModalTitle: 'Authentification Portail Étudiant',
      jwtModalDescription: 'Connectez-vous avec vos identifiants universitaires ou un jeton de session (stocké uniquement dans sessionStorage).',
      studentLoginTab: 'Compte universitaire',
      devTokenTab: 'Jeton JWT (Dev)',
      studentIdLabel: 'Matricule ou e-mail universitaire',
      studentIdPlaceholder: 'ex. etudiant@univ-tam.dz',
      passwordLabel: 'Mot de passe',
      signInSubmit: 'Se connecter',
      signingIn: 'Connexion...',
      jwtPlaceholder: 'Coller le jeton JWT Bearer...',
      jwtSave: 'Enregistrer le jeton',
      jwtClear: 'Déconnexion',
      jwtCancel: 'Annuler',
      sessionExpiredNotice: 'Votre session étudiante a expiré. Veuillez vous reconnecter.',
      idleLockWarning: (seconds: number) =>
        `Sécurité poste partagé : effacement automatique dans ${seconds}s.`,
      idleStaySignedIn: 'Rester actif',
      idleAutoClearedNotice: 'Session effacée automatiquement après inactivité.',
    },
    workspace: {
      subtitle: 'Orientation académique, administrative et logistique fondée sur les documents officiels.',
      newChat: 'Nouvelle discussion',
      dataSourceLabel: 'Source API :',
      modeMock: 'Données locales',
      modeLive: 'API FastAPI',
      mockNoticeTitle: 'Mode maquette actif',
      mockNoticeBody: 'Exemples de test affichés — non des archives universitaires vérifiées.',
      liveEndpointLabel: 'Serveur :',
    },
    chat: {
      title: 'Interroger l’assistant universitaire',
      description: 'Écrivez ou dictez en français, arabe ou anglais. Les données personnelles sont masquées localement.',
      emptyTitle: 'Démarrer une recherche vérifiée',
      emptySubtitle: 'Renseignez-vous sur les inscriptions, bourses, règlements d’examens ou services du campus.',
      starterHeading: 'Exemples de questions fréquentes',
      starters: [
        'Quels documents sont exigés pour l’inscription universitaire ?',
        'Quelle est la date limite pour demander une bourse d’excellence ?',
        'Où se trouve la Bibliothèque centrale et quels sont ses horaires ?',
        'Quel est le menu du restaurant universitaire mardi prochain ?',
      ],
      quickActions: [
        { label: 'Pièces d’inscription', prompt: 'Quels documents sont exigés pour l’inscription universitaire ?' },
        { label: 'Horaires bibliothèque', prompt: 'Où se trouve la Bibliothèque centrale et quels sont ses horaires ?' },
        { label: 'Date limite bourse', prompt: 'Quelle est la date limite pour demander une bourse d’excellence ?' },
        { label: 'Menu restaurant (test)', prompt: 'Quel est le menu du restaurant universitaire mardi prochain ?' },
      ],
      inputLabel: 'Votre question',
      inputPlaceholder: 'Posez une question sur les inscriptions, examens, démarches ou bâtiments...',
      submit: 'Envoyer',
      sending: 'Envoi...',
      stopGenerating: 'Arrêter',
      voiceInputStart: 'Dicter la question par la voix',
      voiceInputStop: 'Arrêter la dictée vocale',
      voiceListening: 'Écoute...',
      listenAnswer: 'Écouter',
      stopListening: 'Arrêter l’audio',
      announceAnswer: 'Annoncer',
      announcedStatus: 'Annoncé',
      responseCompleteAnnouncement: (status, sourcesCount, preview) =>
        status === 'not_found'
          ? `Réponse de l’assistant terminée. Information indisponible dans les documents officiels. ${preview}`
          : `Réponse de l’assistant terminée avec ${sourcesCount} ${
              sourcesCount <= 1 ? 'source vérifiée' : 'sources vérifiées'
            }. ${preview}`,
      loadingStatus: 'Recherche dans les documents officiels...',
      streamingStatus: 'Rédaction de la réponse vérifiée...',
      typingLabel: 'L’assistant est en train d’écrire',
      youLabel: 'Étudiant',
      assistantLabel: 'Assistant Campus',
      notFoundTitle: 'Information indisponible dans les documents officiels',
      notFoundGuidance: 'Aucun document universitaire vérifié ne couvre cette demande. Veuillez contacter le service de scolarité.',
      errorTitle: 'Impossible de joindre le service d’assistance',
      retry: 'Réessayer',
      sourcesCount: (count: number) => `${count} ${count <= 1 ? 'source' : 'sources'}`,
      viewSources: 'Voir les sources',
      closeSources: 'Fermer les sources',
      keyboardHint: 'Entrée pour envoyer, Maj+Entrée pour un retour à la ligne',
      copyAnswer: 'Copier la réponse',
      copiedAnswer: 'Copié',
      copyFailed: 'Échec de la copie',
      copyCode: 'Copier le code',
      copiedCode: 'Copié',
      downloadTranscript: 'Exporter',
      feedbackHelpful: 'Utile',
      feedbackReport: 'Signaler',
      feedbackRecorded: 'Merci pour votre avis',
      jumpToLatest: 'Aller au dernier message',
      printAnswer: 'Imprimer',
      printHeading: 'Université de Tamanrasset · Fiche étudiante vérifiée',
      editPrompt: 'Modifier',
      saveAndSend: 'Enregistrer et envoyer',
      cancelEdit: 'Annuler',
      regenerateResponse: 'Régénérer',
      piiPreSendWarning: (types) =>
        `Bouclier confidentialité : ${types.join(', ')} sera masqué localement avant l’envoi.`,
      piiNotice: (types) =>
        `Protection des données : ${types.join(', ')} masqué(s) localement avant l’envoi.`,
      piiLabels: {
        email: 'e-mail',
        phone: 'téléphone',
        student_id: 'identifiant étudiant',
        secret: 'mot de passe/jeton',
      },
    },
    sources: {
      panelTitle: 'Sources vérifiées',
      panelSubtitle: 'Références officielles utilisées pour la réponse sélectionnée.',
      emptyTitle: 'Aucune source sélectionnée',
      emptyBody: 'Posez une question ou sélectionnez une réponse pour consulter les documents officiels associés.',
      noSourcesForNotFound: 'Aucune source officielle ne correspond à cette requête. Aucune référence non vérifiée n’est affichée.',
      typeLabel: 'Type',
      pageLabel: (page: number) => `Page ${page}`,
      openOfficialUrl: 'Ouvrir le document officiel',
      noExternalUrl: 'Archive interne de l’université',
      sourceIdLabel: 'Réf',
    },
    announcements: {
      title: 'Annonces universitaires',
      description: 'Consultez et recherchez les calendriers académiques, avis administratifs et plannings d’examens.',
      searchLabel: 'Rechercher une annonce',
      searchPlaceholder: 'Rechercher par mot-clé, faculté ou titre...',
      categoryAll: 'Toutes',
      categories: {
        administrative: 'Administration',
        academic: 'Académique',
        exams: 'Examens',
        campus_life: 'Vie étudiante',
      },
      loading: 'Chargement des annonces universitaires...',
      emptyTitle: 'Aucune annonce correspondante',
      emptyBody: 'Essayez un autre mot-clé ou réinitialisez le filtre de catégorie.',
      resetFilters: 'Réinitialiser',
      errorTitle: 'Impossible de charger les annonces',
      retry: 'Réessayer',
      publishedLabel: 'Publiée le',
      dateUnavailable: 'Date non précisée',
      officialLink: 'Avis officiel',
      addToCalendar: 'Ajouter au calendrier (.ics)',
      askAssistantAction: 'Demander à l’assistant',
      askAboutNoticePrompt: (title: string) =>
        `Quelles sont les dates limites, conditions et démarches pour l’annonce : « ${title} » ?`,
      mockBanner: 'Mode développement : affichage d’annonces de test. Connectez le backend FastAPI pour les avis autorisés.',
      resultCount: (count: number) => `${count} ${count <= 1 ? 'annonce' : 'annonces'}`,
    },
    map: {
      title: 'Plan du Campus — Université de Tamanrasset',
      description: 'Localisez le Rectorat, la Bibliothèque centrale, les facultés, départements et services étudiants (Route de l’Aéroport).',
      campusAddress: 'Université de Tamanrasset · Route de l’Aéroport, 11000 Tamanrasset',
      filterAll: 'Tous les lieux',
      accessibleOnlyFilter: 'Accès PMR uniquement',
      accessibleBadge: 'Accès plain-pied',
      openingHoursLabel: 'Horaires',
      askAssistantAction: 'Demander à l’assistant',
      askAboutBuildingPrompt: (name: string) =>
        `Quels sont les services, démarches et horaires d’ouverture pour : ${name} à l’Université de Tamanrasset ?`,
      categories: {
        faculty: 'Faculté',
        library: 'Bibliothèque',
        administration: 'Administration',
        accessibility: 'Accessibilité',
        student_services: 'Services étudiants',
      },
      directoryHeading: 'Répertoire du campus',
      loading: 'Chargement des emplacements du campus...',
      emptyTitle: 'Aucun lieu trouvé',
      emptyBody: 'Aucun bâtiment ne correspond au filtre ou à la recherche.',
      errorTitle: 'Impossible de charger la carte du campus',
      retry: 'Réessayer',
      coordinatesLabel: 'Coordonnées',
      openInGoogleMaps: 'Ouvrir dans Google Maps',
      recenterCampus: 'Centrer sur le campus',
      locationsCount: (count: number) => `${count} ${count <= 1 ? 'lieu' : 'lieux'}`,
      selectPrompt: 'Sélectionnez un bâtiment ou lancez la navigation Google Maps',
      searchLabel: 'Rechercher un lieu du campus',
      searchPlaceholder: 'Rechercher Rectorat, Bibliothèque, Maths-Info, Facultés...',
      clearSearch: 'Effacer la recherche',
      locateMe: 'Ma position',
      locating: 'Localisation...',
      clearMyLocation: 'Effacer ma position',
      youAreHere: 'Vous êtes ici (local uniquement)',
      locationPrivacyNote: 'Vos coordonnées restent strictement dans le navigateur et ne sont jamais envoyées.',
      locationUnsupportedError: 'La géolocalisation n’est pas prise en charge par ce navigateur.',
      locationPermissionDenied: 'Autorisation de localisation refusée. Activez la géolocalisation pour estimer la distance à pied.',
      locationUnavailableError: 'Impossible de déterminer votre position actuelle pour le moment.',
      walkingDistanceLabel: (meters: number, minutes: number) =>
        meters >= 1000
          ? `~${(meters / 1000).toFixed(1)} km · ~${minutes} min à pied`
          : `~${meters} m · ~${minutes} min à pied`,
    },
    footer: {
      attribution: 'Assistant Campus Accessible · Session sécurisée',
      groundingPolicy: 'Politique stricte de fiabilité : toute information absente est signalée explicitement.',
    },
  },
  ar: {
    appName: 'المساعد الجامعي',
    skipToContent: 'الانتقال إلى المحتوى الرئيسي',
    nav: {
      assistant: 'المساعد الذكي',
      announcements: 'الإعلانات',
      campusMap: 'خريطة الحرم الجامعي',
      viewSwitchedAnnouncement: (viewLabel) => `تم الانتقال إلى تبويب ${viewLabel}.`,
    },
    a11y: {
      menuButton: 'إعدادات العرض وإمكانية الوصول',
      menuTitle: 'العرض وإمكانية الوصول',
      fontSizeLabel: 'حجم الخط',
      highContrastLabel: 'حدود عالية التباين',
      highContrastOn: 'مفعّل',
      highContrastOff: 'متوقف',
      announceResponsesLabel: 'تنبيه قارئ الشاشة عند اكتمال الرد',
      shortcutsHeading: 'اختصارات لوحة المفاتيح',
      shortcutAssistant: 'المساعد الذكي',
      shortcutAnnouncements: 'الإعلانات',
      shortcutMap: 'خريطة الحرم',
      shortcutFocusChat: 'التركيز على حقل السؤال',
      shortcutNewChat: 'محادثة جديدة',
    },
    pwa: {
      installApp: 'تثبيت التطبيق',
      installIos: 'تثبيت (iOS)',
      iosTitle: 'التثبيت على iPhone أو iPad',
      iosSteps: [
        'اضغط على زر المشاركة في شريط Safari.',
        'مرّر للأسفل واختر "إضافة إلى الشاشة الرئيسية".',
        'اضغط "إضافة" لتصفح الخريطة والواجهة دون إنترنت.',
      ],
      iosClose: 'إغلاق',
      offlineNotice: 'الوضع دون اتصال — خريطة الجامعة والدليل المخزن متاحان.',
    },
    sidebar: {
      openDrawer: 'فتح القائمة الجانبية',
      closeDrawer: 'إخفاء القائمة الجانبية',
      newChat: 'محادثة جديدة',
      historyHeading: 'سجل الجلسة الحالية',
      emptyHistory: 'لا توجد محادثات محفوظة في هذه الجلسة.',
      deleteSession: 'حذف المحادثة',
      workspaceHeading: 'أقسام البوابة',
      clearLabSession: 'مسح بيانات الجلسة',
      sessionClearedNotice: 'تم مسح سجل المحادثات ورمز المصادقة المحلي.',
      securityLabel: 'جلسة معزولة · تنقية البيانات الشخصية مفعّلة',
      jwtConnect: 'تسجيل دخول الطالب',
      jwtConnected: 'جلسة الطالب مفعّلة',
      jwtModalTitle: 'مصادقة بوابة الطالب',
      jwtModalDescription: 'سجّل الدخول ببياناتك الجامعية أو أدخل رمز الجلسة. يُحفظ في sessionStorage المعزول لهذه النافذة فقط.',
      studentLoginTab: 'الحساب الجامعي',
      devTokenTab: 'رمز JWT (للمطورين)',
      studentIdLabel: 'رقم التسجيل أو البريد الجامعي',
      studentIdPlaceholder: 'مثال: student@univ-tam.dz',
      passwordLabel: 'كلمة المرور',
      signInSubmit: 'تسجيل الدخول',
      signingIn: 'جارٍ التحقق...',
      jwtPlaceholder: 'ألصق رمز JWT هنا...',
      jwtSave: 'حفظ رمز الجلسة',
      jwtClear: 'تسجيل الخروج',
      jwtCancel: 'إلغاء',
      sessionExpiredNotice: 'انتهت صلاحية جلسة الطالب. يرجى تسجيل الدخول مجدداً.',
      idleLockWarning: (seconds: number) =>
        `قفل حماية الأجهزة المشتركة: سيتم مسح الجلسة تلقائياً خلال ${seconds} ثانية.`,
      idleStaySignedIn: 'البقاء متصلاً',
      idleAutoClearedNotice: 'تم مسح الجلسة تلقائياً بعد فترة عدم النشاط.',
    },
    workspace: {
      subtitle: 'إرشاد أكاديمي وإداري وميداني مستند حصرياً إلى الوثائق الجامعية الرسمية.',
      newChat: 'محادثة جديدة',
      dataSourceLabel: 'مصدر البيانات:',
      modeMock: 'بيانات تجريبية',
      modeLive: 'خادم FastAPI',
      mockNoticeTitle: 'وضع البيانات التجريبية مفعّل',
      mockNoticeBody: 'المعطيات المعروضة نماذج اختبار محلية وليست سجلات رسمية.',
      liveEndpointLabel: 'الخادم:',
    },
    chat: {
      title: 'اسأل المساعد الجامعي',
      description: 'اكتب أو تحدّث بالعربية أو الفرنسية أو الإنجليزية. يتم إخفاء البيانات الشخصية محلياً قبل الإرسال.',
      emptyTitle: 'ابدأ استفساراً موثقاً',
      emptySubtitle: 'استعلم عن وثائق التسجيل، مواعيد المنح، أنظمة الامتحانات، أو مرافق الحرم الجامعي.',
      starterHeading: 'أمثلة لأسئلة الطلبة',
      starters: [
        'ما هي الوثائق المطلوبة للتسجيل الجامعي؟',
        'متى ينتهي أجل التقديم لمنح التفوق الأكاديمي؟',
        'أين تقع المكتبة المركزية وما هي ساعات العمل؟',
        'ما هي قائمة وجبة الغداء في المطعم الجامعي يوم الثلاثاء؟',
      ],
      quickActions: [
        { label: 'وثائق التسجيل', prompt: 'ما هي الوثائق المطلوبة للتسجيل الجامعي؟' },
        { label: 'ساعات المكتبة', prompt: 'أين تقع المكتبة المركزية وما هي ساعات العمل؟' },
        { label: 'آجال المنح', prompt: 'متى ينتهي أجل التقديم لمنح التفوق الأكاديمي؟' },
        { label: 'قائمة المطعم (اختبار)', prompt: 'ما هي قائمة وجبة الغداء في المطعم الجامعي يوم الثلاثاء؟' },
      ],
      inputLabel: 'سؤالك',
      inputPlaceholder: 'اكتب سؤالك حول التسجيل، الامتحانات، الشؤون الإدارية، أو المرافق...',
      submit: 'إرسال',
      sending: 'جارٍ الإرسال...',
      stopGenerating: 'إيقاف',
      voiceInputStart: 'إملاء السؤال صوتياً',
      voiceInputStop: 'إيقاف الإملاء الصوتي',
      voiceListening: 'جارٍ الاستماع...',
      listenAnswer: 'استماع',
      stopListening: 'إيقاف الصوت',
      announceAnswer: 'إعلان للقارئ',
      announcedStatus: 'تم الإعلان',
      responseCompleteAnnouncement: (status, sourcesCount, preview) =>
        status === 'not_found'
          ? `اكتملت إجابة المساعد. المعلومة غير متوفرة في السجلات الرسمية. ${preview}`
          : `اكتملت إجابة المساعد مع ${
              sourcesCount === 1 ? 'مصدر واحد موثق' : `${sourcesCount} مصادر موثقة`
            }. ${preview}`,
      loadingStatus: 'جارٍ البحث في الوثائق الجامعية الرسمية...',
      streamingStatus: 'جارٍ عرض الإجابة الموثقة...',
      typingLabel: 'المساعد يكتب الآن',
      youLabel: 'الطالب',
      assistantLabel: 'المساعد الجامعي',
      notFoundTitle: 'المعلومة غير متوفرة في السجلات الرسمية',
      notFoundGuidance: 'لا توجد وثيقة جامعية معتمدة تغطي هذا الاستفسار. يرجى مراجعة مصلحة شؤون الطلبة للتأكد.',
      errorTitle: 'تعذر الاتصال بخدمة المساعد',
      retry: 'إعادة المحاولة',
      sourcesCount: (count: number) => (count === 1 ? 'مصدر واحد' : `${count} مصادر`),
      viewSources: 'عرض المصادر',
      closeSources: 'إغلاق المصادر',
      keyboardHint: 'اضغط Enter للإرسال، و Shift+Enter لسطر جديد',
      copyAnswer: 'نسخ الإجابة',
      copiedAnswer: 'تم النسخ',
      copyFailed: 'تعذر النسخ',
      copyCode: 'نسخ الكود',
      copiedCode: 'تم النسخ',
      downloadTranscript: 'حفظ المحادثة',
      feedbackHelpful: 'مفيد',
      feedbackReport: 'إبلاغ عن نقص',
      feedbackRecorded: 'تم تسجيل التقييم',
      jumpToLatest: 'الانتقال إلى آخر رسالة',
      printAnswer: 'طباعة',
      printHeading: 'جامعة تمنغست · وثيقة إرشاد طلابية موثقة',
      editPrompt: 'تعديل',
      saveAndSend: 'حفظ وإرسال',
      cancelEdit: 'إلغاء',
      regenerateResponse: 'إعادة التوليد',
      piiPreSendWarning: (types) =>
        `تنبيه الخصوصية: سيتم إخفاء ${types.join('، ')} محلياً قبل الإرسال.`,
      piiNotice: (types) =>
        `حماية الخصوصية: تم إخفاء ${types.join('، ')} محلياً قبل الإرسال.`,
      piiLabels: {
        email: 'البريد الإلكتروني',
        phone: 'رقم الهاتف',
        student_id: 'رقم الطالب/البطاقة',
        secret: 'بيانات سرية',
      },
    },
    sources: {
      panelTitle: 'المصادر المعتمدة',
      panelSubtitle: 'المراجع الرسمية المسترجعة للإجابة المحددة.',
      emptyTitle: 'لم يتم تحديد مصدر',
      emptyBody: 'اطرح سؤالاً أو اختر إجابة لعرض الوثائق والروابط الرسمية المستند إليها.',
      noSourcesForNotFound: 'لم يتم العثور على مصدر رسمي مطابق لهذا السؤال. لا يتم عرض مراجع غير موثقة.',
      typeLabel: 'النوع',
      pageLabel: (page: number) => `صفحة ${page}`,
      openOfficialUrl: 'فتح الوثيقة الرسمية',
      noExternalUrl: 'أرشيف داخلي للجامعة',
      sourceIdLabel: 'المرجع',
    },
    announcements: {
      title: 'إعلانات الجامعة',
      description: 'تصفح وابحث في البلاغات الإدارية، التواريخ الأكاديمية، وجداول الامتحانات الرسمية.',
      searchLabel: 'البحث في الإعلانات',
      searchPlaceholder: 'ابحث بكلمة مفتاحية أو كلية أو عنوان الإعلان...',
      categoryAll: 'الكل',
      categories: {
        administrative: 'إداري',
        academic: 'أكاديمي',
        exams: 'الامتحانات',
        campus_life: 'الخدمات الطلابية',
      },
      loading: 'جارٍ تحميل الإعلانات الجامعية...',
      emptyTitle: 'لا توجد إعلانات مطابقة',
      emptyBody: 'جرّب كلمة بحث أخرى أو قم بإلغاء تصفية الفئة.',
      resetFilters: 'إعادة تعيين',
      errorTitle: 'تعذر تحميل الإعلانات',
      retry: 'إعادة المحاولة',
      publishedLabel: 'تاريخ النشر',
      dateUnavailable: 'التاريخ غير محدد',
      officialLink: 'البلاغ الرسمي',
      addToCalendar: 'إضافة إلى التقويم (.ics)',
      askAssistantAction: 'اسأل المساعد',
      askAboutNoticePrompt: (title: string) =>
        `ما هي الآجال والشروط والوثائق المطلوبة بخصوص الإعلان: "${title}"؟`,
      mockBanner: 'وضع التطوير: عرض إعلانات تجريبية. اربط واجهة FastAPI للحصول على البلاغات الرسمية المعتمدة.',
      resultCount: (count: number) => (count === 1 ? 'إعلان واحد' : `${count} إعلانات`),
    },
    map: {
      title: 'خريطة جامعة تمنغست',
      description: 'تحديد مواقع رئاسة الجامعة والمكتبة المركزية والكليات والأقسام ومصالح الطلبة بطريق المطار.',
      campusAddress: 'جامعة تمنغست · طريق المطار، 11000 تمنغست، الجزائر',
      filterAll: 'جميع المرافق',
      accessibleOnlyFilter: 'مرافق مهيأة فقط',
      accessibleBadge: 'ولـوج مهيأ',
      openingHoursLabel: 'التوقيت',
      askAssistantAction: 'اسأل المساعد',
      askAboutBuildingPrompt: (name: string) =>
        `ما هي الخدمات والإجراءات وساعات العمل المتوفرة في ${name} بجامعة تمنغست؟`,
      categories: {
        faculty: 'كلية / قسم',
        library: 'مكتبة',
        administration: 'إدارة',
        accessibility: 'الولوجيات',
        student_services: 'خدمات الطلبة',
      },
      directoryHeading: 'دليل مرافق الحرم',
      loading: 'جارٍ تحميل مواقع جامعة تمنغست...',
      emptyTitle: 'لم يتم العثور على مرافق',
      emptyBody: 'لا توجد مواقع مطابقة للتصنيف أو كلمة البحث.',
      errorTitle: 'تعذر تحميل مواقع الحرم الجامعي',
      retry: 'إعادة المحاولة',
      coordinatesLabel: 'الإحداثيات',
      openInGoogleMaps: 'فتح في خرائط Google',
      recenterCampus: 'توسيط على الحرم',
      locationsCount: (count: number) => (count === 1 ? 'موقع واحد' : `${count} مواقع`),
      selectPrompt: 'اختر مرفقاً لتحديد موقعه أو الانتقال عبر خرائط Google',
      searchLabel: 'البحث في مرافق الحرم',
      searchPlaceholder: 'ابحث عن رئاسة الجامعة، المكتبة، الرياضيات، الكليات...',
      clearSearch: 'مسح البحث',
      locateMe: 'موقعي الحالي',
      locating: 'جارٍ التحديد...',
      clearMyLocation: 'إزالة علامة موقعي',
      youAreHere: 'موقعك الحالي (على جهازك فقط)',
      locationPrivacyNote: 'تبقى إحداثياتك محلياً في المتصفح ولا تُرسل أبداً إلى أي خادم.',
      locationUnsupportedError: 'المتصفح لا يدعم خدمة تحديد الموقع الجغرافي.',
      locationPermissionDenied: 'تم رفض إذن الموقع. فعّل إذن الموقع في المتصفح لحساب مسافة المشي.',
      locationUnavailableError: 'تعذر تحديد إحداثياتك الحالية في الوقت الراهن.',
      walkingDistanceLabel: (meters: number, minutes: number) =>
        meters >= 1000
          ? `~${(meters / 1000).toFixed(1)} كم · ~${minutes} د مشياً`
          : `~${meters} م · ~${minutes} د مشياً`,
    },
    footer: {
      attribution: 'المساعد الجامعي الميسّر · جلسة محمية للطلبة',
      groundingPolicy: 'سياسة الدقة الصارمة: يتم التصريح بوضوح عند عدم توفر المعلومة.',
    },
  },
};
