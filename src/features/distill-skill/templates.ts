/**
 * 访谈问题模板
 * 5 大主题 x 4 个问题 = 20 个默认问题
 * 问题设计以深度、真实、打动人为原则
 */

export interface InterviewQuestion {
  index: number;
  theme: 'childhood' | 'love' | 'family' | 'regret' | 'legacy';
  themeLabel: string;
  text: string;
}

export const INTERVIEW_THEMES = [
  { key: 'childhood' as const, label: '童年往事', icon: '💃' },
  { key: 'love' as const, label: '爱情与婚姻', icon: '💕' },
  { key: 'family' as const, label: '子女与家庭', icon: '👨‍👩‍👧' },
  { key: 'regret' as const, label: '人生感悟', icon: '🌅' },
  { key: 'legacy' as const, label: '给后人的话', icon: '✉️' },
];

/** 全部 20 道访谈问题 */
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  // ─── 童年往事 ─────────────────────────────────────
  {
    index: 0,
    theme: 'childhood',
    themeLabel: '童年往事',
    text: '您最早的一个童年记忆是什么？那时候大概几岁？',
  },
  {
    index: 1,
    theme: 'childhood',
    themeLabel: '童年往事',
    text: '小时候住的那个家是什么样的？周围的邻居、街道还记得吗？',
  },
  {
    index: 2,
    theme: 'childhood',
    themeLabel: '童年往事',
    text: '小时候家里最困难的时期是什么时候？是怎么熬过来的？',
  },
  {
    index: 3,
    theme: 'childhood',
    themeLabel: '童年往事',
    text: '小时候有过什么梦想？后来实现了吗？',
  },

  // ─── 爱情与婚姻 ───────────────────────────────────
  {
    index: 4,
    theme: 'love',
    themeLabel: '爱情与婚姻',
    text: '您和老伴是怎么认识的？第一次见面是什么情形？',
  },
  {
    index: 5,
    theme: 'love',
    themeLabel: '爱情与婚姻',
    text: '结婚那天是什么样的？还记得当时的心情吗？',
  },
  {
    index: 6,
    theme: 'love',
    themeLabel: '爱情与婚姻',
    text: '在一起这么多年，吵得最厉害的一次是因为什么？后来怎么和好的？',
  },
  {
    index: 7,
    theme: 'love',
    themeLabel: '爱情与婚姻',
    text: '你们之间最浪漫的一件事是什么？哪怕只是一个很小的瞬间。',
  },

  // ─── 子女与家庭 ───────────────────────────────────
  {
    index: 8,
    theme: 'family',
    themeLabel: '子女与家庭',
    text: '第一个孩子出生的时候，您是什么心情？那天的情景还记得吗？',
  },
  {
    index: 9,
    theme: 'family',
    themeLabel: '子女与家庭',
    text: '孩子们做过的哪件事让您最骄傲？',
  },
  {
    index: 10,
    theme: 'family',
    themeLabel: '子女与家庭',
    text: '养儿育女这些年，最让您操心的一件事是什么？',
  },
  {
    index: 11,
    theme: 'family',
    themeLabel: '子女与家庭',
    text: '有没有对孩子说过什么话，事后觉得后悔的？',
  },

  // ─── 人生感悟 ─────────────────────────────────────
  {
    index: 12,
    theme: 'regret',
    themeLabel: '人生感悟',
    text: '回顾这一辈子，您觉得最大的遗憾是什么？',
  },
  {
    index: 13,
    theme: 'regret',
    themeLabel: '人生感悟',
    text: '如果能重新来过，您会改变什么？',
  },
  {
    index: 14,
    theme: 'regret',
    themeLabel: '人生感悟',
    text: '这辈子什么时候觉得最快乐、最满足？',
  },
  {
    index: 15,
    theme: 'regret',
    themeLabel: '人生感悟',
    text: '活了这么多年，您觉得人这辈子什么最重要？',
  },

  // ─── 给后人的话 ───────────────────────────────────
  {
    index: 16,
    theme: 'legacy',
    themeLabel: '给后人的话',
    text: '如果只能对后人说一句话，您最想说什么？',
  },
  {
    index: 17,
    theme: 'legacy',
    themeLabel: '给后人的话',
    text: '您希望后人记住您什么样子？用什么样的词来形容您？',
  },
  {
    index: 18,
    theme: 'legacy',
    themeLabel: '给后人的话',
    text: '有没有什么心里话，一直没机会说出来，想借这个机会讲一讲？',
  },
  {
    index: 19,
    theme: 'legacy',
    themeLabel: '给后人的话',
    text: '给年轻一辈的人生建议，您会说什么？',
  },
];

/** 按主题分组获取问题 */
export function getQuestionsByTheme(theme: InterviewQuestion['theme']): InterviewQuestion[] {
  return INTERVIEW_QUESTIONS.filter((q) => q.theme === theme);
}

/** 根据选中的主题获取问题子集 */
export function getSelectedQuestions(
  selectedThemes: InterviewQuestion['theme'][]
): InterviewQuestion[] {
  return INTERVIEW_QUESTIONS.filter((q) => selectedThemes.includes(q.theme));
}
