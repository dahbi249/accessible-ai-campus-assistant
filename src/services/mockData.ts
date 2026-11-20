import type {
  AnnouncementItem,
  CampusLocation,
  ChatRequest,
  ChatResponse,
  SupportedLanguage,
} from '../types/api';

/**
 * LOCAL DEVELOPMENT FIXTURES ONLY.
 * Never treat these fixtures as verified official university records in production.
 * Replace with live FastAPI responses via /api/v1/* endpoints.
 */

export const MOCK_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-dev-001',
    title: 'Fall Semester Administrative Registration & Tuition Exemption Window',
    content:
      'Undergraduate and Master students must submit certified transcripts, national ID copies, and scholarship exemption attestations at the Registrar Annex before November 28, 2026.',
    published_at: '2026-11-10T09:00:00Z',
    event_date: '2026-11-28',
    source_url: 'https://university.example.edu/notices/fall-registration-2026',
    category: 'administrative',
    localizedTitles: {
      en: 'Fall Semester Administrative Registration & Tuition Exemption Window',
      fr: 'Inscription administrative d’automne et exonération des frais',
      ar: 'فترة التسجيل الإداري للسداسي الخريفي والإعفاء من الرسوم',
    },
    localizedContents: {
      en: 'Undergraduate and Master students must submit certified transcripts, national ID copies, and scholarship exemption attestations at the Registrar Annex before November 28, 2026.',
      fr: 'Les étudiants de Licence et Master doivent déposer leurs relevés certifiés, pièces d’identité et attestations d’exonération à la Scolarité Centrale avant le 28 novembre 2026.',
      ar: 'يجب على طلبة الليسانس والماستر إيداع كشوف النقاط المصادق عليها ونسخ بطاقة التعريف وشهادات الإعفاء بمصلحة التعليمية قبل 28 نوفمبر 2026.',
    },
  },
  {
    id: 'ann-dev-002',
    title: 'Central Library Extended Study Hours During Midterm Week',
    content:
      'Reading Rooms A and B as well as the Assistive Technology Lab will remain open until 22:00 from Monday to Saturday throughout the midterm examination period.',
    published_at: '2026-11-08T14:30:00Z',
    source_url: 'https://university.example.edu/notices/library-extended-hours',
    category: 'campus_life',
    localizedTitles: {
      en: 'Central Library Extended Study Hours During Midterm Week',
      fr: 'Horaires étendus de la Bibliothèque Centrale pendant les examens',
      ar: 'تمديد ساعات عمل المكتبة المركزية خلال أسبوع الامتحانات',
    },
    localizedContents: {
      en: 'Reading Rooms A and B as well as the Assistive Technology Lab will remain open until 22:00 from Monday to Saturday throughout the midterm examination period.',
      fr: 'Les salles de lecture A et B ainsi que l’espace d’technologies adaptées restent ouverts jusqu’à 22h00 durant toute la période des examens.',
      ar: 'تبقى قاعتا المطالعة أ وب ومخبر التقنيات المساعدة مفتوحة إلى غاية الساعة 22:00 طيلة فترة الامتحانات الفصلية.',
    },
  },
  {
    id: 'ann-dev-003',
    title: 'Provisional Midterm Examination Schedule — Faculty of Sciences',
    content:
      'Written exams for Bachelor and Master programs begin on December 7, 2026. Students requiring accessibility accommodations must confirm their file with the Exams Office.',
    published_at: '2026-11-06T11:15:00Z',
    event_date: '2026-12-07',
    source_url: 'https://university.example.edu/notices/calendrier-examens-sciences',
    category: 'exams',
    localizedTitles: {
      en: 'Provisional Midterm Examination Schedule — Faculty of Sciences',
      fr: 'Calendrier provisoire des examens de mi-semestre — Faculté des Sciences',
      ar: 'الجدول المؤقت لامتحانات منتصف السداسي — كلية العلوم والتكنولوجيا',
    },
    localizedContents: {
      en: 'Written exams for Bachelor and Master programs begin on December 7, 2026. Students requiring accessibility accommodations must confirm their file with the Exams Office.',
      fr: 'Les épreuves écrites des licences et masters débuteront le 7 décembre 2026. Les étudiants nécessitant des aménagements doivent confirmer leur dossier auprès du bureau des examens.',
      ar: 'تنطلق الامتحانات الكتابية لأطوار الليسانس والماستر يوم 7 ديسمبر 2026. يرجى من الطلبة المحتاجين لتسهيلات الولوج تأكيد ملفاتهم لدى مكتب الامتحانات.',
    },
  },
  {
    id: 'ann-dev-004',
    title: 'Call for Applications: Academic Excellence & Mobility Scholarships',
    content:
      'The University Rectorate announces the opening of applications for merit scholarships via the student portal and Student Affairs Office until November 24, 2026.',
    published_at: '2026-11-04T08:45:00Z',
    event_date: '2026-11-24',
    source_url: 'https://university.example.edu/notices/bourses-excellence-ar',
    category: 'academic',
    localizedTitles: {
      en: 'Call for Applications: Academic Excellence & Mobility Scholarships',
      fr: 'Appel à candidatures : Bourses d’excellence et de mobilité étudiante',
      ar: 'بلاغ حول فتح باب الترشيح لمنح التميز الأكاديمي والتنقل الطلابي',
    },
    localizedContents: {
      en: 'The University Rectorate announces the opening of applications for merit scholarships via the student portal and Student Affairs Office until November 24, 2026.',
      fr: 'Le Rectorat annonce l’ouverture des dépôts de dossiers pour les bourses d’excellence via le portail numérique et le service des affaires étudiantes jusqu’au 24 novembre 2026.',
      ar: 'تعلن رئاسة الجامعة عن فتح باب إيداع ملفات الترشح لمنح التميز برسم الموسم الجامعي الجاري عبر البوابة الرقمية ومصلحة الشؤون الطلابية إلى غاية 24 نوفمبر 2026.',
    },
  },
  {
    id: 'ann-dev-005',
    title: 'Campus Accessibility Shuttle Route Update & Ramp Maintenance',
    content:
      'The step-free accessible shuttle between the North Residence Gate and Science Block A now operates every 15 minutes from 07:45 to 19:30.',
    published_at: null,
    source_url: null,
    category: 'campus_life',
    localizedTitles: {
      en: 'Campus Accessibility Shuttle Route Update & Ramp Maintenance',
      fr: 'Mise à jour de la navette accessible et maintenance des rampes',
      ar: 'تحديث مسار حافلة الولوجيات وصيانة المنحدرات بالحرم الجامعي',
    },
    localizedContents: {
      en: 'The step-free accessible shuttle between the North Residence Gate and Science Block A now operates every 15 minutes from 07:45 to 19:30.',
      fr: 'La navette accessible de plain-pied entre la résidence nord et le Pôle Sciences fonctionne toutes les 15 minutes de 07h45 à 19h30.',
      ar: 'تشتغل الحافلة المجهزة بولوج مستوٍ بين بوابة الإقامة الشمالية والجناح العلمي كل 15 دقيقة من 07:45 إلى 19:30.',
    },
  },
];

export const MOCK_LOCATIONS: CampusLocation[] = [
  {
    id: 'tam-rectorat',
    name: 'Rectorate & Central Administration',
    description:
      'Main university governance headquarters housing the Rector’s Office, General Secretariat, Postgraduate Studies, and External Relations on Route de l’Aéroport.',
    building: 'Rectorate Pavilion · Route de l’Aéroport',
    latitude: 22.7882,
    longitude: 5.5248,
    category: 'administration',
    opening_hours: 'Sun – Thu · 08:00 – 16:00',
    wheelchair_accessible: true,
    accessibility_notes: 'Ground-floor ramp and elevator access at main entrance',
    localizedNames: {
      en: 'Rectorate & Central Administration',
      fr: 'Rectorat et Administration Centrale',
      ar: 'رئاسة الجامعة والإدارة المركزية',
    },
    localizedBuildings: {
      en: 'Rectorate Pavilion · Route de l’Aéroport',
      fr: 'Pavillon du Rectorat · Route de l’Aéroport',
      ar: 'مبنى رئاسة الجامعة · طريق المطار',
    },
    localizedDescriptions: {
      en: 'Main university governance headquarters housing the Rector’s Office, General Secretariat, Postgraduate Studies, and External Relations.',
      fr: 'Siège central de l’Université Amine Elok El Hadj Moussa Egakhamouk abritant le Rectorat, le Secrétariat Général et les vice-rectorats.',
      ar: 'المقر الرئيسي لإدارة جامعة تمنغست (أمين العقال الحاج موسى آق أخاموك)، يضم مكتب مدير الجامعة والأمانة العامة ونيابات الرئاسة.',
    },
    localizedAccessibilityNotes: {
      en: 'Step-free ramp and elevator access at the main plaza entrance.',
      fr: 'Rampe d’accès et ascenseur au hall d’entrée principal.',
      ar: 'منحدر مهيأ ومصعد عند المدخل الرئيسي.',
    },
  },
  {
    id: 'tam-central-library',
    name: 'Central University Library',
    description:
      'Central academic library offering reading halls, digital catalog terminals, thesis archives, and quiet accessible study spaces.',
    building: 'Central Library Wing',
    latitude: 22.7886,
    longitude: 5.5256,
    category: 'library',
    opening_hours: 'Sun – Thu · 08:00 – 18:00',
    wheelchair_accessible: true,
    accessibility_notes: 'Step-free ground floor reading hall and assistive workstations',
    localizedNames: {
      en: 'Central University Library',
      fr: 'Bibliothèque Centrale Universitaire',
      ar: 'المكتبة المركزية الجامعية',
    },
    localizedBuildings: {
      en: 'Central Library Wing',
      fr: 'Bloc Bibliothèque Centrale',
      ar: 'جناح المكتبة المركزية',
    },
    localizedDescriptions: {
      en: 'Central academic library offering reading halls, digital catalog terminals, thesis archives, and quiet accessible study spaces.',
      fr: 'Bibliothèque centrale disposant de salles de lecture, postes de recherche numérique, archives de mémoires et accès de plain-pied.',
      ar: 'المكتبة المركزية للجامعة وتوفر قاعات مطالعة مجهزة، فهرساً رقمياً، أرشيف المذكرات، ومساحات دراسة مهيأة للجميع.',
    },
    localizedAccessibilityNotes: {
      en: 'Step-free ground-floor reading hall with screen-reader terminals.',
      fr: 'Salle de lecture au rez-de-chaussée de plain-pied avec postes adaptés.',
      ar: 'قاعة مطالعة بالطابق الأرضي مهيأة مع محطات قراءة مساعدة.',
    },
  },
  {
    id: 'tam-math-cs',
    name: 'Department of Mathematics & Computer Science',
    description:
      'Undergraduate and Master teaching rooms, computer science programming labs, and academic advising offices.',
    building: 'Science Pole · Block B',
    latitude: 22.7876,
    longitude: 5.5259,
    category: 'faculty',
    opening_hours: 'Sun – Thu · 08:00 – 16:30',
    wheelchair_accessible: true,
    accessibility_notes: 'Ground-floor computer labs accessible via west ramp',
    localizedNames: {
      en: 'Department of Mathematics & Computer Science',
      fr: 'Département de Mathématiques et Informatique',
      ar: 'قسم الرياضيات والإعلام الآلي',
    },
    localizedBuildings: {
      en: 'Science Pole · Block B',
      fr: 'Pôle Sciences · Bloc B',
      ar: 'القطب العلمي · الجناح ب',
    },
    localizedDescriptions: {
      en: 'Undergraduate and Master teaching rooms, computer science programming labs, and academic advising offices.',
      fr: 'Salles de cours Licence/Master, laboratoires de programmation informatique et bureaux d’encadrement pédagogique.',
      ar: 'قاعات تدريس الليسانس والماستر، مخابر الإعلام الآلي والبرمجة، ومكاتب التوجيه البيداغوجي للطلبة.',
    },
    localizedAccessibilityNotes: {
      en: 'Ground-floor computer labs accessible via the west courtyard ramp.',
      fr: 'Salles informatiques au rez-de-chaussée accessibles par rampe ouest.',
      ar: 'مخابر الإعلام الآلي بالطابق الأرضي متاحة عبر المنحدر الغربي.',
    },
  },
  {
    id: 'tam-science-tech',
    name: 'Faculty of Sciences & Technology',
    description:
      'Engineering amphitheaters, physics and chemistry laboratories, and faculty deanery offices.',
    building: 'Science & Technology Pole · Block A',
    latitude: 22.7873,
    longitude: 5.5245,
    category: 'faculty',
    opening_hours: 'Sun – Thu · 08:00 – 16:30',
    wheelchair_accessible: true,
    accessibility_notes: 'Accessible ground-level amphitheater rows and wide doorways',
    localizedNames: {
      en: 'Faculty of Sciences & Technology',
      fr: 'Faculté des Sciences et de la Technologie',
      ar: 'كلية العلوم والتكنولوجيا',
    },
    localizedBuildings: {
      en: 'Science & Technology Pole · Block A',
      fr: 'Pôle Sciences et Technologie · Bloc A',
      ar: 'قطب العلوم والتكنولوجيا · الجناح أ',
    },
    localizedDescriptions: {
      en: 'Engineering amphitheaters, physics and chemistry laboratories, and faculty deanery offices.',
      fr: 'Amphithéâtres d’enseignement, laboratoires de physique, chimie et génie des procédés, et décanat de la faculté.',
      ar: 'مدرجات المحاضرات، مخابر الفيزياء والكيمياء والهندسة، ومقر عمادة كلية العلوم والتكنولوجيا.',
    },
    localizedAccessibilityNotes: {
      en: 'Step-free entrance to main amphitheaters and deanery ground reception.',
      fr: 'Entrée de plain-pied vers les amphithéâtres et l’accueil du décanat.',
      ar: 'مدخل مستوٍ نحو المدرجات الرئيسية واستقبال العمادة.',
    },
  },
  {
    id: 'tam-letters-languages',
    name: 'Faculty of Letters & Languages',
    description:
      'Departments of Arabic, French, and English languages, translation classrooms, and seminar halls.',
    building: 'Letters & Humanities Pavilion · Block C',
    latitude: 22.7891,
    longitude: 5.5243,
    category: 'faculty',
    opening_hours: 'Sun – Thu · 08:00 – 16:30',
    wheelchair_accessible: false,
    accessibility_notes: 'Upper seminar rooms reached by stairs; ground inquiry desk available',
    localizedNames: {
      en: 'Faculty of Letters & Languages',
      fr: 'Faculté des Lettres et des Langues',
      ar: 'كلية الآداب واللغات',
    },
    localizedBuildings: {
      en: 'Letters & Humanities Pavilion · Block C',
      fr: 'Pavillon des Lettres · Bloc C',
      ar: 'جناح الآداب واللغات · الجناح ج',
    },
    localizedDescriptions: {
      en: 'Departments of Arabic, French, and English languages, translation classrooms, and seminar halls.',
      fr: 'Départements de langue arabe, française et anglaise, salles de traduction et amphithéâtres de séminaires.',
      ar: 'أقسام اللغة العربية والفرنسية والإنجليزية، قاعات الترجمة، وقاعات الندوات والمحاضرات.',
    },
    localizedAccessibilityNotes: {
      en: 'Ground-floor reception available; upper seminar halls use stairs.',
      fr: 'Accueil disponible au rez-de-chaussée ; étages accessibles par escalier.',
      ar: 'الاستقبال متاح بالطابق الأرضي؛ القاعات العلوية عبر الدرج.',
    },
  },
  {
    id: 'tam-economics-law',
    name: 'Faculty of Economic, Commercial & Management Sciences',
    description:
      'Economics, finance, management, and law lecture halls alongside postgraduate research offices.',
    building: 'Economics & Law Wing · Block D',
    latitude: 22.7893,
    longitude: 5.5261,
    category: 'faculty',
    opening_hours: 'Sun – Thu · 08:00 – 16:30',
    wheelchair_accessible: true,
    accessibility_notes: 'Ramped south entrance to lecture halls',
    localizedNames: {
      en: 'Faculty of Economic, Commercial & Management Sciences',
      fr: 'Faculté des Sciences Économiques et de Gestion',
      ar: 'كلية العلوم الاقتصادية والتجارية وعلوم التسيير',
    },
    localizedBuildings: {
      en: 'Economics & Law Wing · Block D',
      fr: 'Pôle Économie & Gestion · Bloc D',
      ar: 'قطب العلوم الاقتصادية · الجناح د',
    },
    localizedDescriptions: {
      en: 'Economics, finance, management, and law lecture halls alongside postgraduate research offices.',
      fr: 'Salles d’économie, gestion, commerce et sciences juridiques ainsi que les bureaux de recherche doctorale.',
      ar: 'مدرجات وقاعات العلوم الاقتصادية والتسيير والعلوم التجارية ومكاتب البحث العلمي.',
    },
    localizedAccessibilityNotes: {
      en: 'South entrance ramp connects directly to main lecture rooms.',
      fr: 'Rampe sud reliant directement les salles de cours principales.',
      ar: 'منحدر المدخل الجنوبي يربط مباشرة بقاعات المحاضرات الرئيسية.',
    },
  },
  {
    id: 'tam-student-services',
    name: 'Student Services & Central Scolarité',
    description:
      'Student enrollment certificates, academic transcripts, transfer requests, and student card issuance counter.',
    building: 'Student Commons · Ground Floor',
    latitude: 22.7879,
    longitude: 5.5252,
    category: 'student_services',
    opening_hours: 'Sun – Thu · 08:30 – 15:30',
    wheelchair_accessible: true,
    accessibility_notes: 'Low-height service counters on the ground floor',
    localizedNames: {
      en: 'Student Services & Central Scolarité',
      fr: 'Services aux Étudiants et Scolarité Centrale',
      ar: 'مصالح الطلبة والمديرية الفرعية للتعليمية',
    },
    localizedBuildings: {
      en: 'Student Commons · Ground Floor',
      fr: 'Guichet Étudiant · Rez-de-chaussée',
      ar: 'مجمع الخدمات الطلابية · الطابق الأرضي',
    },
    localizedDescriptions: {
      en: 'Student enrollment certificates, academic transcripts, transfer requests, and student card issuance counter.',
      fr: 'Délivrance des attestations de scolarité, relevés de notes, cartes d’étudiant et suivi des dossiers administratifs.',
      ar: 'استخراج شهادات التسجيل، كشوف النقاط، بطاقة الطالب، ومعالجة ملفات التحويلات والمنح.',
    },
    localizedAccessibilityNotes: {
      en: 'Priority accessible desk and step-free ground entrance.',
      fr: 'Guichet prioritaire adapté au rez-de-chaussée sans marche.',
      ar: 'شباك أولوية مهيأ للطلبة بالطابق الأرضي بدون عوائق.',
    },
  },
  {
    id: 'tam-accessibility-health',
    name: 'Accessibility Support & University Medical Unit',
    description:
      'Step-free student support desk, exam accommodation coordination, and primary campus medical care.',
    building: 'East Support Wing · Step-Free Access',
    latitude: 22.7884,
    longitude: 5.5238,
    category: 'accessibility',
    opening_hours: 'Sun – Thu · 08:00 – 16:30',
    wheelchair_accessible: true,
    accessibility_notes: 'Dedicated step-free entrance, tactile signage, and medical room',
    localizedNames: {
      en: 'Accessibility Support & University Medical Unit',
      fr: 'Cellule d’Accessibilité et Unité Médicale',
      ar: 'خلية المرافقة والولوجيات والوحدة الطبية الجامعية',
    },
    localizedBuildings: {
      en: 'East Support Wing · Step-Free Access',
      fr: 'Aile Est · Accès Plain-Pied',
      ar: 'الجناح الشرقي · مدخل مهيأ',
    },
    localizedDescriptions: {
      en: 'Step-free student support desk, exam accommodation coordination, and primary campus medical care.',
      fr: 'Bureau d’accueil pour les étudiants à besoins spécifiques, aménagement des examens et soins médicaux universitaires.',
      ar: 'مكتب مرافقة الطلبة ذوي الاحتياجات الخاصة، تنسيق التسهيلات الامتحانية، والعيادة الطبية الجامعية.',
    },
    localizedAccessibilityNotes: {
      en: 'Dedicated step-free entry, tactile guide path, and emergency medical access.',
      fr: 'Entrée plain-pied dédiée, guidage podotactile et soins d’urgence.',
      ar: 'مدخل مستوٍ مخصص ومسار إرشادي لمرافقة الطلبة.',
    },
  },
];

const MOCK_ANSWERS: Record<
  SupportedLanguage,
  {
    registration: ChatResponse;
    scholarship: ChatResponse;
    library: ChatResponse;
    notFound: ChatResponse;
    fallback: ChatResponse;
  }
> = {
  en: {
    registration: {
      conversation_id: 'dev-conv-en-01',
      language: 'en',
      status: 'answered',
      answer: `### University Registration Requirements (2026–2027)

To complete administrative enrollment at the Registrar Annex before **November 28, 2026**, prepare the following official documents:

| Document | Copies | Verification |
| --- | --- | --- |
| Secondary diploma or prior degree | 1 | Certified copy |
| National ID or passport | 2 | Standard copy |
| Signed registration form | 1 | Registrar stamp |
| Tuition receipt or exemption | 1 | Finance Office |

#### Weighted GPA Eligibility Check (Honors Track)
$$GPA_{weighted} = \\frac{\\sum (Credit_i \\times Grade_i)}{\\sum Credit_i} \\ge 14.00$$

\`\`\`http
POST /api/v1/chat
Content-Type: application/json
{ "language": "en", "topic": "registration-checklist" }
\`\`\``,
      sources: [
        {
          source_id: 'doc-reg-2026',
          title: 'University Registration & Enrollment Guide 2026–2027',
          source_type: 'document',
          page: 3,
          url: 'https://university.example.edu/docs/registration-guide-2026.pdf',
        },
        {
          source_id: 'ann-dev-001',
          title: 'Fall Semester Administrative Registration & Tuition Exemption Window',
          source_type: 'announcement',
          page: null,
          url: 'https://university.example.edu/notices/fall-registration-2026',
        },
      ],
    },
    scholarship: {
      conversation_id: 'dev-conv-en-01',
      language: 'en',
      status: 'answered',
      answer: `### Merit Scholarship Deadline & Criteria

Applications must be filed through the student portal and the **Student Affairs Office** before **November 24, 2026**.

- Latest official academic transcript
- Faculty recommendation letter
- Validated enrollment attestation for the current semester`,
      sources: [
        {
          source_id: 'doc-fin-014',
          title: 'Academic Scholarship & Financial Aid Regulations',
          source_type: 'document',
          page: 7,
          url: 'https://university.example.edu/docs/scholarship-regulations.pdf',
        },
      ],
    },
    library: {
      conversation_id: 'dev-conv-en-01',
      language: 'en',
      status: 'answered',
      answer: `### Central University Library & Assistive Lab

Located in **Central Library Pavilion** with step-free ramp access on the ground floor:

| Period | Days | Opening Hours |
| --- | --- | --- |
| Regular Semester | Mon – Fri | 08:30 – 19:00 |
| Midterm & Finals | Mon – Sat | 08:30 – 22:00 |`,
      sources: [
        {
          source_id: 'ann-dev-002',
          title: 'Central Library Extended Study Hours During Midterm Week',
          source_type: 'announcement',
          page: null,
          url: 'https://university.example.edu/notices/library-extended-hours',
        },
        {
          source_id: 'doc-lib-002',
          title: 'Campus Library & Assistive Technology Access Charter',
          source_type: 'document',
          page: 2,
          url: null,
        },
      ],
    },
    notFound: {
      conversation_id: 'dev-conv-en-01',
      language: 'en',
      status: 'not_found',
      answer:
        'I could not find any official university document or authorized announcement specifying daily cafeteria menus or meal prices. To avoid providing inaccurate information, please check directly with Campus Student Services.',
      sources: [],
    },
    fallback: {
      conversation_id: 'dev-conv-en-01',
      language: 'en',
      status: 'answered',
      answer:
        'In **Local Dev Mock** mode, sample grounded answers (including tables, math, and code blocks) are available for registration documents, scholarship deadlines, Central Library hours, and unavailable-information testing (cafeteria menus). Connect the FastAPI + LangGraph backend to query the full university document index.',
      sources: [
        {
          source_id: 'doc-sys-001',
          title: 'Academic Handbook & Student Services Directory',
          source_type: 'document',
          page: 1,
          url: null,
        },
      ],
    },
  },
  fr: {
    registration: {
      conversation_id: 'dev-conv-fr-01',
      language: 'fr',
      status: 'answered',
      answer: `### Pièces exigées pour l’inscription (2026–2027)

Le dossier doit être déposé au **Service de Scolarité** avant le **28 novembre 2026** :

| Document | Exemplaires | Validation |
| --- | --- | --- |
| Diplôme antérieur / Baccalauréat | 1 | Copie certifiée |
| Carte nationale ou passeport | 2 | Copie simple |
| Formulaire d’inscription signé | 1 | Visa scolarité |
| Reçu de paiement ou exonération | 1 | Service financier |`,
      sources: [
        {
          source_id: 'doc-reg-2026-fr',
          title: 'Guide d’inscription universitaire 2026–2027',
          source_type: 'document',
          page: 3,
          url: 'https://university.example.edu/docs/guide-inscription-2026.pdf',
        },
      ],
    },
    scholarship: {
      conversation_id: 'dev-conv-fr-01',
      language: 'fr',
      status: 'answered',
      answer:
        'Les dossiers de bourse d’excellence académique doivent être déposés sur le portail étudiant et auprès du **service des affaires étudiantes** avant le **24 novembre 2026**, accompagnés des relevés de notes officiels.',
      sources: [
        {
          source_id: 'doc-fin-014-fr',
          title: 'Règlement des bourses d’excellence et aides sociales',
          source_type: 'document',
          page: 7,
          url: 'https://university.example.edu/docs/reglement-bourses.pdf',
        },
      ],
    },
    library: {
      conversation_id: 'dev-conv-fr-01',
      language: 'fr',
      status: 'answered',
      answer: `### Horaires de la Bibliothèque centrale

Accès de plain-pied et poste d’assistance :

| Période | Jours | Horaires |
| --- | --- | --- |
| Semaine ordinaire | Lun – Ven | 08h30 – 19h00 |
| Semaine d’examens | Lun – Sam | 08h30 – 22h00 |`,
      sources: [
        {
          source_id: 'ann-dev-002',
          title: 'Horaires étendus de la Bibliothèque centrale en période d’examens',
          source_type: 'announcement',
          page: null,
          url: 'https://university.example.edu/notices/library-extended-hours',
        },
      ],
    },
    notFound: {
      conversation_id: 'dev-conv-fr-01',
      language: 'fr',
      status: 'not_found',
      answer:
        'Aucun document officiel ou avis autorisé ne précise le menu quotidien ni les tarifs du restaurant universitaire. Conformément aux règles de fiabilité, aucune information n’est inventée.',
      sources: [],
    },
    fallback: {
      conversation_id: 'dev-conv-fr-01',
      language: 'fr',
      status: 'answered',
      answer:
        'En mode maquette local, des réponses structurées sont disponibles pour les pièces d’inscription, les bourses, les horaires de la bibliothèque et le cas d’information indisponible (menu du restaurant). Connectez le backend FastAPI pour interroger l’index complet.',
      sources: [
        {
          source_id: 'doc-sys-001-fr',
          title: 'Livret d’accueil et guide des services universitaires',
          source_type: 'document',
          page: 1,
          url: null,
        },
      ],
    },
  },
  ar: {
    registration: {
      conversation_id: 'dev-conv-ar-01',
      language: 'ar',
      status: 'answered',
      answer: `### وثائق التسجيل الجامعي الرسمي (2026–2027)

يرجى إيداع ملف التسجيل بمصلحة الشؤون الطلابية قبل **28 نوفمبر 2026** وفق الجدول التالي:

| الوثيقة | العدد | المصادقة |
| --- | --- | --- |
| شهادة البكالوريا أو الدبلوم السابق | 1 | نسخة مصادق عليها |
| بطاقة التعريف الوطنية أو جواز السفر | 2 | نسخة مطابقة |
| استمارة التسجيل الإداري | 1 | توقيع المصلحة |
| وصل الأداء أو شهادة الإعفاء | 1 | المصلحة المالية |`,
      sources: [
        {
          source_id: 'doc-reg-2026-ar',
          title: 'الدليل الرسمي للتسجيل الجامعي 2026–2027',
          source_type: 'document',
          page: 4,
          url: 'https://university.example.edu/docs/registration-guide-ar.pdf',
        },
      ],
    },
    scholarship: {
      conversation_id: 'dev-conv-ar-01',
      language: 'ar',
      status: 'answered',
      answer:
        'يستمر إيداع ملفات الترشح لمنح التميز الأكاديمي عبر البوابة الرقمية ومصلحة الشؤون الطلابية إلى غاية **24 نوفمبر 2026**، مرفقة بكشوف النقاط الرسمية.',
      sources: [
        {
          source_id: 'ann-dev-004',
          title: 'بلاغ حول فتح باب الترشيح لمنح التميز الأكاديمي والتنقل الطلابي',
          source_type: 'announcement',
          page: null,
          url: 'https://university.example.edu/notices/bourses-excellence-ar',
        },
      ],
    },
    library: {
      conversation_id: 'dev-conv-ar-01',
      language: 'ar',
      status: 'answered',
      answer: `### مواعيد عمل المكتبة المركزية

تتوفر المكتبة على ولوجيات أرضية ومختبر للتقنيات المساعدة:

| الفترة | الأيام | التوقيت |
| --- | --- | --- |
| الدراسة الاعتيادية | الإثنين – الجمعة | 08:30 – 19:00 |
| فترة الامتحانات | الإثنين – السبت | 08:30 – 22:00 |`,
      sources: [
        {
          source_id: 'doc-lib-002-ar',
          title: 'نظام المكتبة المركزية ومختبر التقنيات المساعدة',
          source_type: 'document',
          page: 2,
          url: null,
        },
      ],
    },
    notFound: {
      conversation_id: 'dev-conv-ar-01',
      language: 'ar',
      status: 'not_found',
      answer:
        'لا تتوفر في الوثائق الجامعية الرسمية أو البلاغات المعتمدة أي معلومات حول قائمة الوجبات اليومية أو أسعار المطعم الجامعي. حرصاً على الدقة، يرجى الاستفسار لدى مصلحة الخدمات الطلابية.',
      sources: [],
    },
    fallback: {
      conversation_id: 'dev-conv-ar-01',
      language: 'ar',
      status: 'answered',
      answer:
        'في وضع البيانات التجريبية للتطوير المحلي، تتوفر نماذج إجابات موثقة (مع جداول منظمة) حول وثائق التسجيل، مواعيد المنح، ساعات المكتبة، وحالة عدم توفر المعلومة (مثل قائمة المطعم). يرجى ربط خادم FastAPI للاستعلام من قاعدة الوثائق الكاملة.',
      sources: [
        {
          source_id: 'doc-sys-001-ar',
          title: 'دليل الطالب والمساطر الإدارية بالجامعة',
          source_type: 'document',
          page: 1,
          url: null,
        },
      ],
    },
  },
};

export function generateMockChatResponse(request: ChatRequest): ChatResponse {
  const query = request.message.toLowerCase();
  const bank = MOCK_ANSWERS[request.language];
  const convId = request.conversation_id || bank.registration.conversation_id;

  let template: ChatResponse;
  if (
    query.includes('cafeteria') ||
    query.includes('lunch') ||
    query.includes('menu') ||
    query.includes('restaurant') ||
    query.includes('المطعم') ||
    query.includes('وجبة')
  ) {
    template = bank.notFound;
  } else if (
    query.includes('registration') ||
    query.includes('register') ||
    query.includes('document') ||
    query.includes('inscription') ||
    query.includes('pièces') ||
    query.includes('التسجيل') ||
    query.includes('الوثائق')
  ) {
    template = bank.registration;
  } else if (
    query.includes('scholarship') ||
    query.includes('grant') ||
    query.includes('bourse') ||
    query.includes('منح') ||
    query.includes('المنح')
  ) {
    template = bank.scholarship;
  } else if (
    query.includes('library') ||
    query.includes('bibliothèque') ||
    query.includes('hours') ||
    query.includes('horaires') ||
    query.includes('المكتبة')
  ) {
    template = bank.library;
  } else {
    template = bank.fallback;
  }

  return {
    ...template,
    conversation_id: convId,
  };
}
