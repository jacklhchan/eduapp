export type CurriculumStageId = 'kg' | 'p1-p6' | 's1-s3' | 's4-s6';

export type KlaId =
  | 'kindergarten'
  | 'chinese-language'
  | 'english-language'
  | 'mathematics'
  | 'science'
  | 'technology'
  | 'pshe'
  | 'arts'
  | 'physical-education'
  | 'cross-curricular';

export type CurriculumSource = {
  id: string;
  title: string;
  url: string;
  note: string;
};

export type CurriculumStage = {
  id: CurriculumStageId;
  label: string;
  caption: string;
  learningGoal: string;
};

export type CurriculumSubject = {
  id: string;
  name: string;
  displayNameZh: string;
  klaId: KlaId;
  klaName: string;
  stageIds: CurriculumStageId[];
  grades: string[];
  strands: string[];
  appUse: string;
  sourceIds: string[];
  status?: string;
};

export const curriculumSources: CurriculumSource[] = [
  {
    id: 'edb-kla-overview-2526',
    title: 'EDB Subjects under the Eight Key Learning Areas (2025/26)',
    url: 'https://www.edb.gov.hk/en/curriculum-development/kla/overview.html',
    note: 'P1-S6 official subject list and implementation notes.',
  },
  {
    id: 'edb-kindergarten-overview',
    title: 'EDB Overview of Kindergarten Education in Hong Kong',
    url: 'https://www.edb.gov.hk/en/edu-system/preprimary-kindergarten/overview/',
    note: 'K1-K3 developmental objectives and six learning areas.',
  },
  {
    id: 'edb-primary-guide-2024',
    title: 'EDB Primary Education Curriculum Guide (2024)',
    url: 'https://www.edb.gov.hk/en/curriculum-development/major-level-of-edu/primary/curriculum-documents/Primary_Education_Curriculum_Guide.html',
    note: 'Primary curriculum renewal, seven learning goals, and school-based planning.',
  },
  {
    id: 'edb-secondary-guide-2017',
    title: 'EDB Secondary Education Curriculum Guide (2017)',
    url: 'https://www.edb.gov.hk/en/curriculum-development/major-level-of-edu/secondary/CG_documents.html',
    note: 'Junior secondary KLAs and senior secondary curriculum framework.',
  },
  {
    id: 'edb-csd-docs',
    title: 'EDB Citizenship and Social Development Curriculum and Assessment Guide',
    url: 'https://www.edb.gov.hk/attachment/en/curriculum-development/renewal/CS/CS_CAG_S4-6_Eng_2021.pdf',
    note: 'Senior secondary CSD themes, learning aims, assessment, and Mainland study tour connection.',
  },
  {
    id: 'edb-chinese-docs',
    title: 'EDB Chinese Language Education Curriculum Documents',
    url: 'https://www.edb.gov.hk/en/curriculum-development/kla/chi-edu/curriculum-documents.html',
    note: 'Chinese Language, Putonghua, and Chinese Literature curriculum documents.',
  },
  {
    id: 'edb-english-docs',
    title: 'EDB English Language Education Curriculum Documents',
    url: 'https://www.edb.gov.hk/elecg',
    note: 'English Language and Literature in English curriculum documents.',
  },
  {
    id: 'edb-mathematics-docs',
    title: 'EDB Mathematics Education',
    url: 'https://www.edb.gov.hk/en/curriculum-development/kla/ma/index.html',
    note: 'Mathematics Education KLA direction and curriculum documents.',
  },
  {
    id: 'edb-science-docs',
    title: 'EDB Science Education Curriculum Documents',
    url: 'https://www.edb.gov.hk/en/curriculum-development/kla/science-edu/curriculum-documents.html',
    note: 'Primary Science, S1-S3 Science, and S4-S6 science subjects.',
  },
  {
    id: 'edb-technology-docs',
    title: 'EDB Technology Education Curriculum Documents',
    url: 'https://www.edb.gov.hk/en/curriculum-development/kla/technology-edu/curriculum-doc/index.html',
    note: 'Technology Education KLA, coding education, AI module, and S4-S6 technology subjects.',
  },
  {
    id: 'edb-pshe-docs',
    title: 'EDB Personal, Social and Humanities Education Curriculum Documents',
    url: 'https://www.edb.gov.hk/en/curriculum-development/kla/pshe/curriculum-documents.html',
    note: 'PSHE KLA, Chinese History, CES, Geography, History, Economics, and related subjects.',
  },
  {
    id: 'edb-arts-docs',
    title: 'EDB Arts Education Curriculum Documents',
    url: 'https://www.edb.gov.hk/en/curriculum-development/kla/arts-edu/curriculum-docs/index.html',
    note: 'Music and Visual Arts curriculum documents.',
  },
  {
    id: 'edb-pe-docs',
    title: 'EDB Physical Education Curriculum Documents',
    url: 'https://www.edb.gov.hk/en/curriculum-development/kla/pe/curriculum-doc/index.html',
    note: 'P1-S6 PE KLA guide and senior secondary PE guide.',
  },
];

export const curriculumStages: CurriculumStage[] = [
  {
    id: 'kg',
    label: 'K1-K3',
    caption: 'Kindergarten',
    learningGoal: '五大發展目標，透過遊戲、生活主題及綜合學習建立學習興趣。',
  },
  {
    id: 'p1-p6',
    label: 'P1-P6',
    caption: 'Primary',
    learningGoal: '八個學習領域打底，並逐步以小學科學及小學人文取代常識科。',
  },
  {
    id: 's1-s3',
    label: 'S1-S3',
    caption: 'Junior Secondary',
    learningGoal: '八個學習領域連接高中選科，中史為初中獨立必修科。',
  },
  {
    id: 's4-s6',
    label: 'S4-S6',
    caption: 'Senior Secondary',
    learningGoal: '核心、選修、應用學習、其他語言及其他學習經歷並行。',
  },
];

export const curriculumSubjects: CurriculumSubject[] = [
  {
    id: 'kg-physical-fitness-health',
    name: 'Physical Fitness and Health',
    displayNameZh: '體能與健康',
    klaId: 'kindergarten',
    klaName: 'Kindergarten Learning Areas',
    stageIds: ['kg'],
    grades: ['K1', 'K2', 'K3'],
    strands: ['gross motor', 'health habits', 'safety awareness'],
    appUse: 'portfolio evidence and whole-child growth tags',
    sourceIds: ['edb-kindergarten-overview'],
  },
  {
    id: 'kg-language',
    name: 'Language',
    displayNameZh: '語文',
    klaId: 'kindergarten',
    klaName: 'Kindergarten Learning Areas',
    stageIds: ['kg'],
    grades: ['K1', 'K2', 'K3'],
    strands: ['listening', 'speaking', 'early literacy'],
    appUse: 'portfolio language evidence and parent observation prompts',
    sourceIds: ['edb-kindergarten-overview'],
  },
  {
    id: 'kg-early-childhood-mathematics',
    name: 'Early Childhood Mathematics',
    displayNameZh: '幼兒數學',
    klaId: 'kindergarten',
    klaName: 'Kindergarten Learning Areas',
    stageIds: ['kg'],
    grades: ['K1', 'K2', 'K3'],
    strands: ['number sense', 'shape and space', 'patterns'],
    appUse: 'bridge tags from play evidence to primary maths readiness',
    sourceIds: ['edb-kindergarten-overview'],
  },
  {
    id: 'kg-nature-living',
    name: 'Nature and Living',
    displayNameZh: '大自然與生活',
    klaId: 'kindergarten',
    klaName: 'Kindergarten Learning Areas',
    stageIds: ['kg'],
    grades: ['K1', 'K2', 'K3'],
    strands: ['observation', 'everyday inquiry', 'living environment'],
    appUse: 'portfolio inquiry evidence and activity tagging',
    sourceIds: ['edb-kindergarten-overview'],
  },
  {
    id: 'kg-self-society',
    name: 'Self and Society',
    displayNameZh: '個人與群體',
    klaId: 'kindergarten',
    klaName: 'Kindergarten Learning Areas',
    stageIds: ['kg'],
    grades: ['K1', 'K2', 'K3'],
    strands: ['self-care', 'social skills', 'values and attitudes'],
    appUse: 'self-care and social development portfolio sections',
    sourceIds: ['edb-kindergarten-overview'],
  },
  {
    id: 'kg-arts-creativity',
    name: 'Arts and Creativity',
    displayNameZh: '藝術與創意',
    klaId: 'kindergarten',
    klaName: 'Kindergarten Learning Areas',
    stageIds: ['kg'],
    grades: ['K1', 'K2', 'K3'],
    strands: ['visual expression', 'music', 'creative play'],
    appUse: 'artwork uploads, creativity tags, and interview portfolio evidence',
    sourceIds: ['edb-kindergarten-overview'],
  },
  {
    id: 'chinese-language',
    name: 'Chinese Language',
    displayNameZh: '中國語文',
    klaId: 'chinese-language',
    klaName: 'Chinese Language Education',
    stageIds: ['p1-p6', 's1-s3', 's4-s6'],
    grades: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    strands: ['reading', 'writing', 'listening', 'speaking', 'literature and culture'],
    appUse: 'future OCR review for reading comprehension, composition, dictation, and writing evidence',
    sourceIds: ['edb-kla-overview-2526', 'edb-chinese-docs'],
  },
  {
    id: 'putonghua',
    name: 'Putonghua',
    displayNameZh: '普通話',
    klaId: 'chinese-language',
    klaName: 'Chinese Language Education',
    stageIds: ['p1-p6', 's1-s3'],
    grades: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3'],
    strands: ['listening', 'speaking', 'phonetics', 'communication'],
    appUse: 'oral practice records and language profile tags',
    sourceIds: ['edb-kla-overview-2526', 'edb-chinese-docs'],
  },
  {
    id: 'chinese-literature',
    name: 'Chinese Literature',
    displayNameZh: '中國文學',
    klaId: 'chinese-language',
    klaName: 'Chinese Language Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['literary appreciation', 'critical response', 'culture'],
    appUse: 'senior secondary reading log and analysis evidence',
    sourceIds: ['edb-kla-overview-2526', 'edb-chinese-docs'],
  },
  {
    id: 'english-language',
    name: 'English Language',
    displayNameZh: '英國語文',
    klaId: 'english-language',
    klaName: 'English Language Education',
    stageIds: ['p1-p6', 's1-s3', 's4-s6'],
    grades: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    strands: ['interpersonal', 'knowledge', 'experience', 'reading', 'writing', 'speaking'],
    appUse: 'future English homework review, writing feedback, vocabulary and reading plans',
    sourceIds: ['edb-kla-overview-2526', 'edb-english-docs'],
  },
  {
    id: 'literature-in-english',
    name: 'Literature in English',
    displayNameZh: '英語文學',
    klaId: 'english-language',
    klaName: 'English Language Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['poetry', 'prose', 'drama', 'critical appreciation'],
    appUse: 'senior secondary literary response evidence and practice prompts',
    sourceIds: ['edb-kla-overview-2526', 'edb-english-docs'],
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    displayNameZh: '數學',
    klaId: 'mathematics',
    klaName: 'Mathematics Education',
    stageIds: ['p1-p6', 's1-s3', 's4-s6'],
    grades: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    strands: ['number', 'measure', 'shape and space', 'data handling', 'algebra'],
    appUse: 'current OCR review, weakness tracking, and personalised practice generation',
    sourceIds: ['edb-kla-overview-2526', 'edb-mathematics-docs'],
  },
  {
    id: 'primary-science',
    name: 'Primary Science',
    displayNameZh: '小學科學',
    klaId: 'science',
    klaName: 'Science Education',
    stageIds: ['p1-p6'],
    grades: ['P1', 'P4'],
    strands: ['scientific inquiry', 'life and environment', 'energy and change', 'STEAM'],
    appUse: 'science observation uploads and inquiry portfolio evidence',
    sourceIds: ['edb-kla-overview-2526', 'edb-science-docs'],
    status: '2025/26 starts at P1 and P4; extends to all primary levels by 2027/28.',
  },
  {
    id: 'science',
    name: 'Science',
    displayNameZh: '科學',
    klaId: 'science',
    klaName: 'Science Education',
    stageIds: ['s1-s3'],
    grades: ['S1', 'S2', 'S3'],
    strands: ['scientific investigation', 'STSE', 'life and living', 'matter', 'energy'],
    appUse: 'junior secondary science mapping and concept diagnosis',
    sourceIds: ['edb-kla-overview-2526', 'edb-science-docs'],
  },
  {
    id: 'biology',
    name: 'Biology',
    displayNameZh: '生物',
    klaId: 'science',
    klaName: 'Science Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['cells and molecules', 'organisms', 'genetics', 'ecology'],
    appUse: 'senior secondary concept map and lab evidence tags',
    sourceIds: ['edb-kla-overview-2526', 'edb-science-docs'],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    displayNameZh: '化學',
    klaId: 'science',
    klaName: 'Science Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['atomic world', 'materials', 'reactions', 'quantitative chemistry'],
    appUse: 'senior secondary problem tagging and lab-skill evidence',
    sourceIds: ['edb-kla-overview-2526', 'edb-science-docs'],
  },
  {
    id: 'physics',
    name: 'Physics',
    displayNameZh: '物理',
    klaId: 'science',
    klaName: 'Science Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['mechanics', 'electricity', 'waves', 'energy'],
    appUse: 'senior secondary quantitative practice and misconception tags',
    sourceIds: ['edb-kla-overview-2526', 'edb-science-docs'],
  },
  {
    id: 'general-studies',
    name: 'General Studies',
    displayNameZh: '常識',
    klaId: 'cross-curricular',
    klaName: 'Cross-KLA / Transition',
    stageIds: ['p1-p6'],
    grades: ['P2', 'P3', 'P5', 'P6'],
    strands: ['personal and social', 'science and technology', 'community', 'health'],
    appUse: 'legacy primary uploads during transition to Primary Science and Humanities',
    sourceIds: ['edb-kla-overview-2526', 'edb-primary-guide-2024'],
    status: 'Progressively replaced by Primary Science and Primary Humanities from 2025/26.',
  },
  {
    id: 'primary-humanities',
    name: 'Primary Humanities',
    displayNameZh: '小學人文',
    klaId: 'pshe',
    klaName: 'Personal, Social and Humanities Education',
    stageIds: ['p1-p6'],
    grades: ['P1', 'P4'],
    strands: ['self and society', 'country and culture', 'community', 'global awareness'],
    appUse: 'values, culture, and humanities evidence in learning passport',
    sourceIds: ['edb-kla-overview-2526', 'edb-pshe-docs'],
    status: '2025/26 starts at P1 and P4; extends to all primary levels by 2027/28.',
  },
  {
    id: 'technology-education',
    name: 'Technology Education',
    displayNameZh: '科技教育',
    klaId: 'technology',
    klaName: 'Technology Education',
    stageIds: ['p1-p6', 's1-s3'],
    grades: ['P1', 'P4', 'S1', 'S2', 'S3'],
    strands: ['ICT', 'materials and structures', 'systems and control', 'technology and living'],
    appUse: 'coding, AI literacy, and STEAM activity tags',
    sourceIds: ['edb-kla-overview-2526', 'edb-technology-docs'],
    status: 'Primary is modular; junior secondary includes AI learning module from 2023/24.',
  },
  {
    id: 'business-accounting-financial-studies',
    name: 'Business, Accounting and Financial Studies',
    displayNameZh: '企業、會計與財務概論',
    klaId: 'technology',
    klaName: 'Technology Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['business environment', 'accounting', 'financial management'],
    appUse: 'senior secondary business concept and case-study tracking',
    sourceIds: ['edb-kla-overview-2526', 'edb-technology-docs'],
  },
  {
    id: 'design-and-applied-technology',
    name: 'Design and Applied Technology',
    displayNameZh: '設計與應用科技',
    klaId: 'technology',
    klaName: 'Technology Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['design process', 'materials', 'systems', 'technology application'],
    appUse: 'project portfolio evidence and design process reflections',
    sourceIds: ['edb-kla-overview-2526', 'edb-technology-docs'],
  },
  {
    id: 'health-management-social-care',
    name: 'Health Management and Social Care',
    displayNameZh: '健康管理與社會關懷',
    klaId: 'technology',
    klaName: 'Technology Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['health', 'social care', 'community services'],
    appUse: 'senior secondary case-study and reflection evidence',
    sourceIds: ['edb-kla-overview-2526', 'edb-technology-docs'],
  },
  {
    id: 'information-communication-technology',
    name: 'Information and Communication Technology',
    displayNameZh: '資訊及通訊科技',
    klaId: 'technology',
    klaName: 'Technology Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['data', 'programming', 'networks', 'systems', 'social implications'],
    appUse: 'programming practice, project evidence, and digital literacy tracking',
    sourceIds: ['edb-kla-overview-2526', 'edb-technology-docs'],
  },
  {
    id: 'technology-and-living',
    name: 'Technology and Living',
    displayNameZh: '科技與生活',
    klaId: 'technology',
    klaName: 'Technology Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['food science', 'fashion and textiles', 'family living', 'resource management'],
    appUse: 'practical project evidence and applied knowledge tags',
    sourceIds: ['edb-kla-overview-2526', 'edb-technology-docs'],
  },
  {
    id: 'chinese-history',
    name: 'Chinese History',
    displayNameZh: '中國歷史',
    klaId: 'pshe',
    klaName: 'Personal, Social and Humanities Education',
    stageIds: ['s1-s3', 's4-s6'],
    grades: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    strands: ['chronology', 'historical sources', 'culture', 'national development'],
    appUse: 'history source analysis and timeline revision evidence',
    sourceIds: ['edb-kla-overview-2526', 'edb-pshe-docs'],
    status: 'Independent compulsory subject at junior secondary level.',
  },
  {
    id: 'citizenship-economics-society',
    name: 'Citizenship, Economics and Society',
    displayNameZh: '公民、經濟與社會',
    klaId: 'pshe',
    klaName: 'Personal, Social and Humanities Education',
    stageIds: ['s1-s3'],
    grades: ['S1', 'S2', 'S3'],
    strands: ['citizenship', 'economics', 'society', 'personal finance'],
    appUse: 'junior secondary issue analysis and concept mapping',
    sourceIds: ['edb-kla-overview-2526', 'edb-pshe-docs'],
    status: 'Implemented at S1 in 2024/25 and extends to all junior secondary levels by 2026/27.',
  },
  {
    id: 'geography',
    name: 'Geography',
    displayNameZh: '地理',
    klaId: 'pshe',
    klaName: 'Personal, Social and Humanities Education',
    stageIds: ['s1-s3', 's4-s6'],
    grades: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    strands: ['place and space', 'human-environment interaction', 'data skills', 'sustainability'],
    appUse: 'map skills, data interpretation, and issue inquiry tags',
    sourceIds: ['edb-kla-overview-2526', 'edb-pshe-docs'],
  },
  {
    id: 'history',
    name: 'History',
    displayNameZh: '歷史',
    klaId: 'pshe',
    klaName: 'Personal, Social and Humanities Education',
    stageIds: ['s1-s3', 's4-s6'],
    grades: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    strands: ['historical enquiry', 'sources', 'change and continuity', 'perspectives'],
    appUse: 'source-based question review and revision planning',
    sourceIds: ['edb-kla-overview-2526', 'edb-pshe-docs'],
  },
  {
    id: 'religious-education',
    name: 'Religious Education',
    displayNameZh: '宗教教育',
    klaId: 'pshe',
    klaName: 'Personal, Social and Humanities Education',
    stageIds: ['s1-s3'],
    grades: ['S1', 'S2', 'S3'],
    strands: ['beliefs', 'values', 'ethics', 'reflection'],
    appUse: 'values reflection and school-based subject tags',
    sourceIds: ['edb-kla-overview-2526', 'edb-pshe-docs'],
  },
  {
    id: 'economics',
    name: 'Economics',
    displayNameZh: '經濟',
    klaId: 'pshe',
    klaName: 'Personal, Social and Humanities Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['scarcity', 'markets', 'macroeconomy', 'policy'],
    appUse: 'concept questions, graph interpretation, and case evidence',
    sourceIds: ['edb-kla-overview-2526', 'edb-pshe-docs'],
  },
  {
    id: 'ethics-and-religious-studies',
    name: 'Ethics and Religious Studies',
    displayNameZh: '倫理與宗教',
    klaId: 'pshe',
    klaName: 'Personal, Social and Humanities Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['ethics', 'religion', 'values', 'argumentation'],
    appUse: 'essay planning and reflective portfolio evidence',
    sourceIds: ['edb-kla-overview-2526', 'edb-pshe-docs'],
  },
  {
    id: 'tourism-and-hospitality-studies',
    name: 'Tourism and Hospitality Studies',
    displayNameZh: '旅遊與款待',
    klaId: 'pshe',
    klaName: 'Personal, Social and Humanities Education',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['tourism industry', 'hospitality', 'destination management', 'customer service'],
    appUse: 'case-study practice and vocational interest profile',
    sourceIds: ['edb-kla-overview-2526', 'edb-pshe-docs'],
  },
  {
    id: 'citizenship-social-development',
    name: 'Citizenship and Social Development',
    displayNameZh: '公民與社會發展',
    klaId: 'cross-curricular',
    klaName: 'Senior Secondary Core',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['Hong Kong under One Country Two Systems', 'country and world', 'contemporary issues'],
    appUse: 'senior secondary issue inquiry and source evidence tracking',
    sourceIds: ['edb-kla-overview-2526', 'edb-csd-docs'],
  },
  {
    id: 'music',
    name: 'Music',
    displayNameZh: '音樂',
    klaId: 'arts',
    klaName: 'Arts Education',
    stageIds: ['p1-p6', 's1-s3', 's4-s6'],
    grades: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    strands: ['performing', 'creating', 'listening', 'music in context'],
    appUse: 'portfolio performance evidence and arts participation tags',
    sourceIds: ['edb-kla-overview-2526', 'edb-arts-docs'],
  },
  {
    id: 'visual-arts',
    name: 'Visual Arts',
    displayNameZh: '視覺藝術',
    klaId: 'arts',
    klaName: 'Arts Education',
    stageIds: ['p1-p6', 's1-s3', 's4-s6'],
    grades: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    strands: ['creating', 'appreciating', 'visual culture', 'arts in context'],
    appUse: 'artwork upload, portfolio curation, and visual response tags',
    sourceIds: ['edb-kla-overview-2526', 'edb-arts-docs'],
  },
  {
    id: 'physical-education',
    name: 'Physical Education',
    displayNameZh: '體育',
    klaId: 'physical-education',
    klaName: 'Physical Education',
    stageIds: ['p1-p6', 's1-s3', 's4-s6'],
    grades: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    strands: ['motor skills', 'health and fitness', 'sports knowledge', 'values and attitudes'],
    appUse: 'whole-person dashboard, activity records, and health habit evidence',
    sourceIds: ['edb-kla-overview-2526', 'edb-pe-docs'],
  },
  {
    id: 'applied-learning',
    name: 'Applied Learning',
    displayNameZh: '應用學習',
    klaId: 'cross-curricular',
    klaName: 'Senior Secondary Elective Pathways',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: [
      'creative studies',
      'media and communication',
      'business management and law',
      'services',
      'applied science',
      'engineering and production',
    ],
    appUse: 'senior secondary pathway planning and portfolio evidence',
    sourceIds: ['edb-kla-overview-2526'],
  },
  {
    id: 'other-languages',
    name: 'Other Languages',
    displayNameZh: '其他語言',
    klaId: 'cross-curricular',
    klaName: 'Senior Secondary Elective Pathways',
    stageIds: ['s4-s6'],
    grades: ['S4', 'S5', 'S6'],
    strands: ['French', 'German', 'Hindi', 'Japanese', 'Korean', 'Spanish', 'Urdu'],
    appUse: 'language profile and elective pathway planning',
    sourceIds: ['edb-kla-overview-2526'],
    status: 'Hindi is listed for S4 in the 2025/26 subject overview; S5-S6 list six other languages.',
  },
];

export const curriculumStageGrades: Record<CurriculumStageId, string[]> = {
  kg: ['K1', 'K2', 'K3'],
  'p1-p6': ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  's1-s3': ['S1', 'S2', 'S3'],
  's4-s6': ['S4', 'S5', 'S6'],
};

export function normalizeGrade(grade?: string | null) {
  const value = (grade || '').trim().toUpperCase().replace(/\s+/g, '');
  const compactMatch = value.match(/^(K|P|S)([1-6])$/);
  if (compactMatch) return `${compactMatch[1]}${compactMatch[2]}`;

  const primaryMatch = value.match(/^(PRIMARY|PRI)([1-6])$/);
  if (primaryMatch) return `P${primaryMatch[2]}`;

  const secondaryMatch = value.match(/^(SECONDARY|SEC|FORM|F)([1-6])$/);
  if (secondaryMatch) return `S${secondaryMatch[2]}`;

  const kindergartenMatch = value.match(/^(KINDERGARTEN|KG)([1-3])$/);
  if (kindergartenMatch) return `K${kindergartenMatch[2]}`;

  return 'P3';
}

export function getStageForGrade(grade?: string | null): CurriculumStageId {
  const normalizedGrade = normalizeGrade(grade);
  const match = (Object.entries(curriculumStageGrades) as Array<[CurriculumStageId, string[]]>).find(([, grades]) =>
    grades.includes(normalizedGrade),
  );
  return match?.[0] || 'p1-p6';
}

export function getSubjectsForStage(stageId: CurriculumStageId, klaId: KlaId | 'all' = 'all') {
  return curriculumSubjects.filter((subject) => {
    const stageMatch = subject.stageIds.includes(stageId);
    const klaMatch = klaId === 'all' || subject.klaId === klaId;
    return stageMatch && klaMatch;
  });
}

export function getSubjectsForGrade(grade?: string | null, klaId: KlaId | 'all' = 'all') {
  const normalizedGrade = normalizeGrade(grade);
  return curriculumSubjects.filter((subject) => {
    const gradeMatch = subject.grades.includes(normalizedGrade);
    const klaMatch = klaId === 'all' || subject.klaId === klaId;
    return gradeMatch && klaMatch;
  });
}

export function isAcademicProgressSubject(subject: CurriculumSubject) {
  return ![
    'arts',
    'kg-arts-creativity',
    'kg-physical-fitness-health',
    'music',
    'physical-education',
    'visual-arts',
  ].includes(subject.klaId) && ![
    'kg-arts-creativity',
    'kg-physical-fitness-health',
    'music',
    'physical-education',
    'visual-arts',
  ].includes(subject.id);
}

export function getKlasForStage(stageId: CurriculumStageId) {
  const seen = new Map<KlaId, string>();
  getSubjectsForStage(stageId).forEach((subject) => {
    seen.set(subject.klaId, subject.klaName);
  });
  return Array.from(seen, ([id, name]) => ({ id, name }));
}

export function getKlasForGrade(grade?: string | null) {
  const seen = new Map<KlaId, string>();
  getSubjectsForGrade(grade).forEach((subject) => {
    seen.set(subject.klaId, subject.klaName);
  });
  return Array.from(seen, ([id, name]) => ({ id, name }));
}

export function getSourceById(sourceId: string) {
  return curriculumSources.find((source) => source.id === sourceId);
}
