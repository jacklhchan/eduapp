export type View = 'home' | 'portfolio' | 'upload' | 'coach' | 'profile';

export type PortfolioStatus = 'Completed' | 'AI Ready' | 'Drafting';

export type PortfolioIcon = 'cover' | 'sparkles' | 'learning' | 'shield' | 'star';

export type MasteryTone = 'green' | 'amber' | 'red';

export type ChildProfile = {
  name: string;
  avatar: string;
  grade: string;
  passport: string;
  focus: string;
  language: string;
  schoolType: string;
  retention: string;
};

export const seedChildProfile: ChildProfile = {
  name: 'Matthew',
  avatar: '👦🏻',
  grade: 'P3',
  passport: 'Learning Passport',
  focus: '小學數學 + 升小 Portfolio',
  language: '繁中 / English',
  schoolType: '香港主流小學',
  retention: '12 個月',
};

export const masteryRows: Array<{ label: string; score: number; color: MasteryTone }> = [
  { label: '分數', score: 92, color: 'green' },
  { label: '時間', score: 85, color: 'green' },
  { label: '幾何', score: 70, color: 'amber' },
  { label: '應用題', score: 45, color: 'red' },
];

export const portfolioSections: Array<{
  icon: PortfolioIcon;
  title: string;
  subtitle: string;
  status: PortfolioStatus;
}> = [
  { icon: 'cover', title: '封面設計 (Cover Page)', subtitle: '基本資料與精選照片。', status: 'Completed' },
  { icon: 'sparkles', title: '關於我 (About Me)', subtitle: '性格特質、興趣及家庭背景。', status: 'Completed' },
  { icon: 'learning', title: '學習態度 (Learning Attitude)', subtitle: '探索及專注力例子。', status: 'AI Ready' },
  { icon: 'shield', title: '自理能力 (Self-care)', subtitle: '日常生活技能及獨立表現。', status: 'Drafting' },
  { icon: 'star', title: '藝術作品與活動 (Artworks & Activities)', subtitle: '展示多元活動與作品。', status: 'Drafting' },
];

export const uploadChecks = [
  { id: 'q1', label: '見分母就直接選單位', checked: true },
  { id: 'q2', label: '分數部分未完成乘法', checked: true },
  { id: 'q3', label: '審題關鍵字未圈出', checked: false },
];

export const recentDocuments = [
  { id: 'math-practice', title: '數學練習', score: '85' },
  { id: 'quiz', title: '小測', score: '92' },
];

export const practiceChoices = ['2/7', '4/7', '5/7', '7/5'];
