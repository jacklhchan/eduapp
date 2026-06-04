import type { CourseTopic } from '../data/courseContent';
import type { CurriculumSubject } from '../data/curriculum';
import type { LearningProgress, LearningTopicSummary, SubjectProgressSummary } from '../types';

export const activeCoachSubjectId = 'mathematics';
export const activeCoachSubjectName = 'Mathematics';
const mvpLearningSubjectIds = new Set([activeCoachSubjectId, 'kg-early-childhood-mathematics']);
const mvpLearningSubjectLabels = new Set(['mathematics', 'early childhood mathematics', '數學', '幼兒數學']);
const subjectDisplayNames: Record<string, string> = {
  Addition: '加法',
  'Addition and Subtraction': '加減',
  'Addition and Subtraction within 100': '100 以內加減',
  'Addition within 100': '100 以內加法',
  'Chinese Language': '中國語文',
  Decimals: '小數',
  Division: '除法',
  'Early Childhood Mathematics': '幼兒數學',
  'English Language': '英國語文',
  'Expressing feelings': '情緒表達',
  Fractions: '分數',
  'Fractions word problems': '分數應用題',
  'General Studies': '常識',
  Inference: '閱讀推論',
  Language: '語文',
  Mathematics: '數學',
  Multiplication: '乘法',
  'Number sense': '數感',
  'Numbers within 100': '100 以內數字',
  Patterns: '規律',
  'Reading comprehension': '閱讀理解',
  'Self and Society': '個人與群體',
  'Sentence grammar': '句子文法',
  'Story retelling': '故事重述',
  Subtraction: '減法',
  'Subtraction within 100': '100 以內減法',
  'Community facilities': '社區設施',
  'Self-care routines': '自理常規',
  'Taking turns': '輪候與分享',
  'Two-step word problems': '兩步應用題',
  'Vocabulary in context': '語境詞彙',
  'Word problems': '應用題',
};

function normalizeDisplayKey(value: string) {
  return value.trim().toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
}

const normalizedSubjectDisplayNames = new Map(
  Object.entries(subjectDisplayNames).map(([key, label]) => [normalizeDisplayKey(key), label]),
);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const learningTextTranslations = Object.entries(subjectDisplayNames)
  .filter(([source]) => /[A-Za-z]/.test(source))
  .sort(([left], [right]) => right.length - left.length);

export function displayLearningText(value?: string | null) {
  if (!value) return '';
  return learningTextTranslations.reduce((text, [source, label]) => {
    return text.replace(new RegExp(escapeRegExp(source), 'gi'), label);
  }, value);
}

export function displaySubjectName(value?: string | null) {
  if (!value) return '未分類';
  const normalized = value.trim();
  return subjectDisplayNames[normalized] || normalizedSubjectDisplayNames.get(normalizeDisplayKey(normalized)) || normalized;
}

export function displayTopicName(value?: string | null) {
  if (!value) return '未分類主題';
  const normalized = value.trim();
  const uploadTitle = normalized.match(/^(\d+)\s+pages?\s*-\s*(.+)$/i);
  if (uploadTitle) return uploadTitle[1] + ' 頁 - ' + uploadTitle[2];
  return subjectDisplayNames[normalized] || normalizedSubjectDisplayNames.get(normalizeDisplayKey(normalized)) || normalized;
}

function normalizeLearningSubject(value?: string | null) {
  return (value || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

export function isMvpLearningSubject(value?: string | null) {
  return mvpLearningSubjectLabels.has(normalizeLearningSubject(value));
}

export function isMvpCurriculumSubject(subject: CurriculumSubject) {
  return subject.klaId === 'mathematics' || mvpLearningSubjectIds.has(subject.id);
}

export function mvpLearningTopics(topics: LearningTopicSummary[] = []) {
  return topics.filter((topic) => isMvpLearningSubject(topic.subject));
}

function mvpSubjectScores(scores: SubjectProgressSummary[] = []) {
  return scores.filter((score) => isMvpLearningSubject(score.subject));
}

export function filterLearningProgressForMvp(progress: LearningProgress | null) {
  if (!progress) return null;
  const allTopics = mvpLearningTopics(progress.all_topics);
  const subjectScores = mvpSubjectScores(progress.subject_scores || []);
  const scoreSource = allTopics.length
    ? allTopics.map((topic) => topic.mastery)
    : subjectScores.map((score) => score.mastery);
  const overallMastery = scoreSource.length
    ? Math.round(scoreSource.reduce((total, score) => total + score, 0) / scoreSource.length)
    : 0;
  return {
    ...progress,
    all_topics: allTopics,
    improved_topics: mvpLearningTopics(progress.improved_topics).slice(0, 3),
    overall_mastery: overallMastery,
    subject_scores: subjectScores,
    weak_topics: mvpLearningTopics(progress.weak_topics).slice(0, 3),
  };
}

export function displayKlaName(subject: CurriculumSubject) {
  const labels: Record<string, string> = {
    arts: '藝術教育',
    'chinese-language': '中國語文教育',
    'cross-curricular': '跨學科學習',
    'english-language': '英國語文教育',
    kindergarten: '幼稚園學習範疇',
    mathematics: '數學教育',
    'physical-education': '體育',
    pshe: '個人、社會及人文教育',
    science: '科學教育',
    technology: '科技教育',
  };
  return labels[subject.klaId] || subject.klaName;
}

export function displaySubjectUse(subject: CurriculumSubject) {
  if (subject.klaId === 'kindergarten') return '作為成長觀察與作品集證據';
  return '作為成績、OCR 證據與弱項主題追蹤';
}

export function displayStageCaption(value: string) {
  const labels: Record<string, string> = {
    Kindergarten: '幼稚園',
    Primary: '小學',
    'Junior Secondary': '初中',
    'Senior Secondary': '高中',
  };
  return labels[value] || value;
}

export function displaySubjectStatus(value?: string) {
  if (!value) return '';
  if (value === 'Progressively replaced by Primary Science and Primary Humanities from 2025/26.') {
    return '由 2025/26 起逐步由小學科學及小學人文取代。';
  }
  return value;
}

export function displayStrandName(value: string) {
  const labels: Record<string, string> = {
    accounting: '會計',
    algebra: '代數',
    argumentation: '論證',
    'arts in context': '情境中的藝術',
    citizenship: '公民',
    communication: '溝通',
    community: '社群',
    culture: '文化',
    data: '數據',
    'data handling': '數據處理',
    'data skills': '數據技能',
    ecology: '生態',
    economics: '經濟',
    energy: '能量',
    ethics: '倫理',
    'everyday inquiry': '日常探究',
    'gross motor': '大肌肉發展',
    health: '健康',
    'health habits': '健康習慣',
    'historical enquiry': '歷史探究',
    'historical sources': '歷史資料',
    ICT: '資訊科技',
    interpersonal: '人際溝通',
    experience: '經驗',
    knowledge: '知識',
    listening: '聆聽',
    'living environment': '生活環境',
    measure: '量度',
    music: '音樂',
    number: '數',
    'number sense': '數感',
    observation: '觀察',
    patterns: '規律',
    'personal and social': '個人與社會',
    phonetics: '語音',
    programming: '編程',
    reading: '閱讀',
    reflection: '反思',
    'safety awareness': '安全意識',
    'shape and space': '圖形與空間',
    'social skills': '社交技巧',
    speaking: '說話',
    'science and technology': '科學與科技',
    sustainability: '可持續發展',
    values: '價值觀',
    'values and attitudes': '價值觀與態度',
    'visual expression': '視覺表達',
    writing: '寫作',
  };
  return labels[value] || value;
}

export function displayLevelName(value: CourseTopic['level']) {
  const labels: Record<CourseTopic['level'], string> = {
    Core: '核心',
    Foundation: '基礎',
    Stretch: '延伸',
  };
  return labels[value] || value;
}

export function formatActivityDate(value: unknown) {
  const source = String(value || '');
  if (!source) return '剛剛';
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return source.slice(5, 10) || source;
  return date.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' });
}

export function formatBriefDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(5);
  return date.toLocaleDateString('zh-HK', { month: 'numeric', day: 'numeric' });
}

export function mistakeTagLabel(value: string) {
  const labels: Record<string, string> = {
    calculation: '計算錯',
    careless: '粗心',
    concept: '概念',
    reading: '審題',
    unit_conversion: '單位換算',
  };
  return labels[value] || value;
}

export function preferredProgressSubjectId(subjects: CurriculumSubject[]) {
  return subjects.find((subject) => subject.id === activeCoachSubjectId)?.id || subjects[0]?.id || '';
}
