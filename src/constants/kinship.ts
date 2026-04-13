/**
 * 中华传统辈分称谓体系
 *
 * 九族五服，血脉相承。
 * 从鼻祖到玄孙，每一代都有专属的称谓，
 * 这是中华文化对"我从哪里来"最深沉的回答。
 */

export interface KinshipTerm {
  /** 称谓 */
  title: string;
  /** 解释（鼠标悬停 / 长按显示） */
  description: string;
  /** 默认性别 */
  gender?: 'male' | 'female';
  /** 第几代（1=父母, 2=祖, 3=曾祖...） */
  generation: number;
}

export interface KinshipGroup {
  /** 分组名 */
  label: string;
  /** 分组副标题 */
  subtitle?: string;
  /** 称谓列表 */
  terms: KinshipTerm[];
}

/**
 * 完整的辈分称谓体系
 * 按辈分从近到远排列
 */
export const KINSHIP_GROUPS: KinshipGroup[] = [
  {
    label: '父母辈',
    subtitle: '生我养我',
    terms: [
      { title: '父亲', description: '爸爸，给予生命的人', gender: 'male', generation: 1 },
      { title: '母亲', description: '妈妈，孕育生命的人', gender: 'female', generation: 1 },
      { title: '继父', description: '母亲再婚的丈夫', gender: 'male', generation: 1 },
      { title: '继母', description: '父亲再婚的妻子', gender: 'female', generation: 1 },
    ],
  },
  {
    label: '祖辈',
    subtitle: '父亲的父母 · 母亲的父母',
    terms: [
      { title: '爷爷', description: '父亲的父亲，也叫祖父', gender: 'male', generation: 2 },
      { title: '奶奶', description: '父亲的母亲，也叫祖母', gender: 'female', generation: 2 },
      { title: '外公', description: '母亲的父亲，也叫外祖父', gender: 'male', generation: 2 },
      { title: '外婆', description: '母亲的母亲，也叫外祖母', gender: 'female', generation: 2 },
    ],
  },
  {
    label: '曾祖辈',
    subtitle: '爷爷奶奶的父母',
    terms: [
      { title: '曾祖父', description: '爷爷的父亲，父亲的祖父', gender: 'male', generation: 3 },
      { title: '曾祖母', description: '爷爷的母亲，父亲的祖母', gender: 'female', generation: 3 },
      { title: '外曾祖父', description: '外公的父亲，母亲的祖父', gender: 'male', generation: 3 },
      { title: '外曾祖母', description: '外公的母亲，母亲的祖母', gender: 'female', generation: 3 },
    ],
  },
  {
    label: '高祖辈',
    subtitle: '曾祖父母的父母',
    terms: [
      { title: '高祖父', description: '曾祖父的父亲，往上第四代', gender: 'male', generation: 4 },
      { title: '高祖母', description: '曾祖父的母亲，往上第四代', gender: 'female', generation: 4 },
    ],
  },
  {
    label: '天祖辈',
    subtitle: '高祖父母的父母',
    terms: [
      { title: '天祖父', description: '高祖父的父亲，往上第五代', gender: 'male', generation: 5 },
      { title: '天祖母', description: '高祖父的母亲，往上第五代', gender: 'female', generation: 5 },
    ],
  },
  {
    label: '烈祖辈',
    subtitle: '天祖父母的父母',
    terms: [
      { title: '烈祖父', description: '天祖父的父亲，往上第六代', gender: 'male', generation: 6 },
      { title: '烈祖母', description: '天祖父的母亲，往上第六代', gender: 'female', generation: 6 },
    ],
  },
  {
    label: '太祖辈',
    subtitle: '烈祖父母的父母',
    terms: [
      { title: '太祖父', description: '烈祖父的父亲，往上第七代', gender: 'male', generation: 7 },
      { title: '太祖母', description: '烈祖父的母亲，往上第七代', gender: 'female', generation: 7 },
    ],
  },
  {
    label: '远祖辈',
    subtitle: '太祖父母的父母',
    terms: [
      { title: '远祖父', description: '太祖父的父亲，往上第八代', gender: 'male', generation: 8 },
      { title: '远祖母', description: '太祖父的母亲，往上第八代', gender: 'female', generation: 8 },
    ],
  },
  {
    label: '鼻祖辈',
    subtitle: '家族之始祖，万世之根源',
    terms: [
      { title: '鼻祖', description: '家族最早的祖先，始祖，万脉之源', gender: 'male', generation: 9 },
    ],
  },
  {
    label: '旁系长辈',
    subtitle: '叔伯姑舅姨',
    terms: [
      { title: '伯父', description: '父亲的哥哥', gender: 'male', generation: 2 },
      { title: '伯母', description: '伯父的妻子', gender: 'female', generation: 2 },
      { title: '叔叔', description: '父亲的弟弟', gender: 'male', generation: 2 },
      { title: '婶婶', description: '叔叔的妻子', gender: 'female', generation: 2 },
      { title: '姑姑', description: '父亲的姐妹', gender: 'female', generation: 2 },
      { title: '姑父', description: '姑姑的丈夫', gender: 'male', generation: 2 },
      { title: '舅舅', description: '母亲的兄弟', gender: 'male', generation: 2 },
      { title: '舅妈', description: '舅舅的妻子', gender: 'female', generation: 2 },
      { title: '姨妈', description: '母亲的姐妹', gender: 'female', generation: 2 },
      { title: '姨父', description: '姨妈的丈夫', gender: 'male', generation: 2 },
    ],
  },
  {
    label: '其他',
    subtitle: '师长、恩人、挚友',
    terms: [
      { title: '师父', description: '授业恩师，亦师亦父', gender: undefined, generation: 0 },
      { title: '恩人', description: '对自己有大恩的人', gender: undefined, generation: 0 },
    ],
  },
];

/** 所有预设称谓（平铺） */
export const ALL_KINSHIP_TITLES = KINSHIP_GROUPS.flatMap(g => g.terms.map(t => t.title));

/** 根据称谓找到对应的 KinshipTerm */
export function findKinshipTerm(title: string): KinshipTerm | undefined {
  for (const group of KINSHIP_GROUPS) {
    const found = group.terms.find(t => t.title === title);
    if (found) return found;
  }
  return undefined;
}

/**
 * 诗句 — 用于首页和添加页的情感装饰
 * 每次随机选一句
 */
export const ANCESTOR_QUOTES = [
  '慎终追远，民德归厚矣。',
  '树高千丈，叶落归根。',
  '前人栽树，后人乘凉。',
  '饮水思源，落叶归根。',
  '一世做人，百世为祖。',
  '祖宗虽远，祭祀不可不诚。',
  '家有一老，如有一宝。',
  '血脉相连，薪火相传。',
];
