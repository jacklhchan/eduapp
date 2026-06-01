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
];

export function getCourseTopicsForGrade(grade: string) {
  const normalized = grade.trim().toUpperCase();
  const exact = courseTopics.filter((topic) => topic.grade === normalized);
  return exact.length ? exact : courseTopics.filter((topic) => topic.grade === 'P3');
}
