import { normalizeGrade, type CurriculumSubject } from './curriculum';

export type CourseTopic = {
  id: string;
  grade: string;
  subjectId: string;
  subjectName: string;
  subjectNameZh: string;
  title: string;
  titleZh: string;
  strand: string;
  level: 'Foundation' | 'Core' | 'Stretch';
  durationMinutes: number;
  lessonCount: number;
  outcomes: string[];
  lessons: string[];
  practicePrompt: string;
  evidenceTag: string;
  sourceWorkspaceId: string;
};

export const syllabusWorkspaceId = '019e81ae-60ab-7fb1-b131-9f60588a450a';

export const courseTopics: CourseTopic[] = [
  {
    id: 'k2-early-math-number-sense',
    grade: 'K2',
    subjectId: 'kg-early-childhood-mathematics',
    subjectName: 'Early Childhood Mathematics',
    subjectNameZh: '幼兒數學',
    title: 'Counting Stories',
    titleZh: '數數與生活故事',
    strand: 'number sense',
    level: 'Foundation',
    durationMinutes: 35,
    lessonCount: 4,
    outcomes: ['以實物數數至 20', '比較多少與一樣多', '用圖像記錄簡單數量'],
    lessons: ['玩具分類與點算', '零食分享：多少與一樣多', '故事圖卡數數', '親子生活找數字'],
    practicePrompt: '用生活物件做 5 分鐘數數與比較練習。',
    evidenceTag: 'portfolio: numeracy play',
    sourceWorkspaceId: syllabusWorkspaceId,
  },
  {
    id: 'k2-language-show-and-tell',
    grade: 'K2',
    subjectId: 'kg-language',
    subjectName: 'Language',
    subjectNameZh: '語文',
    title: 'Show and Tell',
    titleZh: '看圖說話與表達',
    strand: 'speaking',
    level: 'Foundation',
    durationMinutes: 30,
    lessonCount: 3,
    outcomes: ['說出人物、地點、動作', '用完整短句描述圖片', '聆聽後回應簡單問題'],
    lessons: ['圖片人物與動作', '我的作品三句分享', '聆聽與輪流發言'],
    practicePrompt: '用一張作品相片，引導孩子說出三句完整描述。',
    evidenceTag: 'portfolio: oral language',
    sourceWorkspaceId: syllabusWorkspaceId,
  },
  {
    id: 'p3-math-fractions-core',
    grade: 'P3',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    subjectNameZh: '數學',
    title: 'Fractions Builder',
    titleZh: '分數概念建構',
    strand: 'number',
    level: 'Core',
    durationMinutes: 45,
    lessonCount: 5,
    outcomes: ['理解分母與分子', '比較同分母分數大小', '用圖形表示簡單分數'],
    lessons: ['一個整體與平均分', '分母代表甚麼', '同分母比較', '分數圖像配對', '生活情境小挑戰'],
    practicePrompt: 'Fractions word problems',
    evidenceTag: 'learning: fractions',
    sourceWorkspaceId: syllabusWorkspaceId,
  },
  {
    id: 'p3-math-two-step-word-problems',
    grade: 'P3',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    subjectNameZh: '數學',
    title: 'Two-Step Word Problems',
    titleZh: '兩步應用題審題',
    strand: 'number',
    level: 'Core',
    durationMinutes: 50,
    lessonCount: 5,
    outcomes: ['圈出題目關鍵資料', '判斷先後運算步驟', '寫出完整算式與答句'],
    lessons: ['題目角色與資料', '先做甚麼：流程箭嘴', '加減混合題', '乘除混合題', '檢查答句與單位'],
    practicePrompt: 'Two-step word problems',
    evidenceTag: 'learning: word problem reasoning',
    sourceWorkspaceId: syllabusWorkspaceId,
  },
  {
    id: 'p3-math-time-measure',
    grade: 'P3',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    subjectNameZh: '數學',
    title: 'Time and Duration',
    titleZh: '時間與時距',
    strand: 'measure',
    level: 'Core',
    durationMinutes: 40,
    lessonCount: 4,
    outcomes: ['讀取時鐘時間', '計算簡單時距', '用時間線整理日程問題'],
    lessons: ['鐘面讀法', '時間線跳格', '日程表理解', '時距應用題'],
    practicePrompt: 'Time duration word problems',
    evidenceTag: 'learning: measure time',
    sourceWorkspaceId: syllabusWorkspaceId,
  },
  {
    id: 'p4-primary-science-observe-materials',
    grade: 'P4',
    subjectId: 'primary-science',
    subjectName: 'Primary Science',
    subjectNameZh: '小學科學',
    title: 'Materials Detective',
    titleZh: '材料特性觀察',
    strand: 'scientific inquiry',
    level: 'Foundation',
    durationMinutes: 45,
    lessonCount: 4,
    outcomes: ['描述材料特性', '用表格記錄觀察', '按用途選擇合適材料'],
    lessons: ['硬度與柔軟度', '防水測試', '透明與不透明', '設計一個小物件'],
    practicePrompt: 'Primary science material properties',
    evidenceTag: 'portfolio: science inquiry',
    sourceWorkspaceId: syllabusWorkspaceId,
  },
  {
    id: 's1-science-lab-safety',
    grade: 'S1',
    subjectId: 'science',
    subjectName: 'Science',
    subjectNameZh: '科學',
    title: 'Lab Safety and Variables',
    titleZh: '實驗安全與變因',
    strand: 'scientific investigation',
    level: 'Foundation',
    durationMinutes: 50,
    lessonCount: 4,
    outcomes: ['辨認基本安全規則', '分辨自變量與因變量', '設計公平測試'],
    lessons: ['安全圖示', '實驗步驟排序', '變因辨認', '公平測試檢查表'],
    practicePrompt: 'S1 science fair test variables',
    evidenceTag: 'learning: scientific investigation',
    sourceWorkspaceId: syllabusWorkspaceId,
  },
  {
    id: 's3-math-algebra-functions',
    grade: 'S3',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    subjectNameZh: '數學',
    title: 'Algebra and Function Readiness',
    titleZh: '代數與函數銜接',
    strand: 'algebra',
    level: 'Core',
    durationMinutes: 50,
    lessonCount: 5,
    outcomes: ['整理代數式與方程步驟', '用坐標/圖像連結數量關係', '為高中函數學習建立前備概念'],
    lessons: ['代數式化簡', '一元方程檢查', '坐標與圖像', '數量關係建模', '高中銜接題'],
    practicePrompt: 'S3 algebra and function readiness',
    evidenceTag: 'learning: algebra readiness',
    sourceWorkspaceId: syllabusWorkspaceId,
  },
  {
    id: 's3-science-investigation',
    grade: 'S3',
    subjectId: 'science',
    subjectName: 'Science',
    subjectNameZh: '科學',
    title: 'Investigation and STSE',
    titleZh: '科學探究與 STSE',
    strand: 'scientific investigation',
    level: 'Core',
    durationMinutes: 55,
    lessonCount: 5,
    outcomes: ['設計公平測試', '分析實驗數據與誤差', '把科學概念連結社會與環境議題'],
    lessons: ['研究問題與假設', '控制變項', '數據表與圖表', '結果解釋', 'STSE 議題短評'],
    practicePrompt: 'S3 science investigation and STSE practice',
    evidenceTag: 'learning: scientific investigation',
    sourceWorkspaceId: syllabusWorkspaceId,
  },
  {
    id: 's3-ces-citizenship-economics',
    grade: 'S3',
    subjectId: 'citizenship-economics-society',
    subjectName: 'Citizenship, Economics and Society',
    subjectNameZh: '公民、經濟與社會',
    title: 'Citizenship and Economic Choices',
    titleZh: '公民責任與經濟選擇',
    strand: 'citizenship',
    level: 'Core',
    durationMinutes: 45,
    lessonCount: 4,
    outcomes: ['辨認社會議題中的持份者', '以資源與選擇分析個人/社會決策', '用資料支持觀點並分辨事實與意見'],
    lessons: ['持份者與公民責任', '資源與取捨', '個人理財情境', '資料研習與短答'],
    practicePrompt: 'S3 CES citizenship economics source-based questions',
    evidenceTag: 'learning: CES source inquiry',
    sourceWorkspaceId: syllabusWorkspaceId,
  },
];

export function getCourseTopicsForGrade(grade: string) {
  const normalized = normalizeGrade(grade);
  return courseTopics.filter((topic) => topic.grade === normalized);
}

export function getCourseTopicsForGradeAndSubject(grade: string, subject?: CurriculumSubject | null) {
  const normalized = normalizeGrade(grade);
  if (!subject) return getCourseTopicsForGrade(normalized);

  const exact = courseTopics.filter((topic) => topic.grade === normalized && topic.subjectId === subject.id);
  const generated = deriveTopicsFromSubject(normalized, subject);
  const exactStrands = new Set(exact.map((topic) => topic.strand));
  const generatedForMissingStrands = generated.filter((topic) => !exactStrands.has(topic.strand));

  return sortTopicsBySubjectStrands([...exact, ...generatedForMissingStrands], subject);
}

function deriveTopicsFromSubject(grade: string, subject: CurriculumSubject): CourseTopic[] {
  return subject.strands.map((strand, index) => {
    const topicTitle = titleize(strand);
    return {
      id: `${grade.toLowerCase()}-${subject.id}-${slugify(strand)}`,
      grade,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectNameZh: subject.displayNameZh,
      title: topicTitle,
      titleZh: `${subject.displayNameZh}：${strandLabel(strand)}`,
      strand,
      level: index === 0 ? 'Foundation' : index === 1 ? 'Core' : 'Stretch',
      durationMinutes: 35 + index * 5,
      lessonCount: index === 0 ? 3 : 4,
      outcomes: [
        `理解 ${subject.displayNameZh}「${strandLabel(strand)}」的核心概念`,
        `把功課 / 課堂 evidence 標記到 ${subject.name} · ${strand}`,
        `用原創練習檢查 ${grade} ${subject.displayNameZh} 的學習弱點`,
      ],
      lessons: [
        `${strandLabel(strand)} 概念導入`,
        '課堂例子與資料整理',
        '常見錯因 / misconception 檢查',
        '家長可讀的 evidence summary',
      ].slice(0, index === 0 ? 3 : 4),
      practicePrompt: `${grade} ${subject.name} ${strand} practice`,
      evidenceTag: `learning: ${subject.id} ${strand}`,
      sourceWorkspaceId: syllabusWorkspaceId,
    };
  });
}

function sortTopicsBySubjectStrands(topics: CourseTopic[], subject: CurriculumSubject) {
  const strandOrder = new Map(subject.strands.map((strand, index) => [strand, index]));
  return [...topics].sort((left, right) => {
    const leftOrder = strandOrder.get(left.strand) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = strandOrder.get(right.strand) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.titleZh.localeCompare(right.titleZh, 'zh-Hant');
  });
}

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function titleize(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function strandLabel(strand: string) {
  const labels: Record<string, string> = {
    algebra: '代數',
    citizenship: '公民',
    'critical response': '批判回應',
    'data handling': '數據處理',
    economics: '經濟',
    geography: '地理探究',
    'health and fitness': '健康與體適能',
    listening: '聆聽',
    'literature and culture': '文學與文化',
    measure: '量度',
    'motor skills': '運動技能',
    number: '數',
    'performing': '演奏與表演',
    phonetics: '語音',
    'place and space': '地方與空間',
    reading: '閱讀',
    science: '科學探究',
    'scientific investigation': '科學探究',
    'shape and space': '圖形與空間',
    society: '社會',
    'sports knowledge': '運動知識',
    speaking: '說話',
    'systems and control': '系統與控制',
    'values and attitudes': '價值觀與態度',
    writing: '寫作',
  };
  return labels[strand] || strand;
}
