/**
 * 归处 · 字体与文案系统
 *
 * 字体：使用系统内置的楷体/宋体，不需要额外安装字体包
 * 文案：古朴典雅的命名风格
 */

import { Platform } from 'react-native';

/**
 * 古朴字体 — 用于标题、灵牌等需要书法感的地方
 * iOS: 楷体 STKaiti / 宋体 STSong
 * Android: serif（系统衬线体，接近宋体）
 * Web: 'STKaiti', 'KaiTi', 'SimSun', serif
 */
export const Fonts = {
  /** 书法感标题字体（楷体） */
  classical: Platform.select({
    ios: 'STKaiti',
    android: 'serif',
    web: "'STKaiti', 'KaiTi', '楷体', 'SimSun', serif",
    default: 'serif',
  }) as string,

  /** 正文衬线字体（宋体） */
  serif: Platform.select({
    ios: 'STSongti-SC-Regular',
    android: 'serif',
    web: "'STSong', 'SimSun', 'Songti SC', serif",
    default: 'serif',
  }) as string,

  /** 正文无衬线（默认系统字体） */
  body: Platform.select({
    ios: 'PingFang SC',
    android: undefined, // 系统默认
    web: "'PingFang SC', 'Microsoft YaHei', sans-serif",
    default: undefined,
  }) as string | undefined,
} as const;

/**
 * 古朴命名体系
 * 基调：温暖传承、家族荣耀，不提死亡忌讳
 * 像"汗出"之于健身房，每个功能用两字古风名
 */
export const Labels = {
  // ─── 底部 Tab ───
  tabHome: '归处',
  tabAncestors: '家承',        // 家族传承
  tabTree: '根脉',             // 根脉相连
  tabSettings: '典设',

  // ─── 首页快捷功能 ───
  actionPin: '记处',           // 记住这个地方
  actionDistill: '传神',       // 传其神韵
  actionChat: '念白',          // 思念的对白
  actionRoute: '寻迹',         // 寻找足迹

  // ─── 首页区域 ───
  sectionAncestors: '家人',    // 我的家人
  sectionRituals: '节令',      // 节气时令

  // ─── 按钮 ───
  btnRecord: '记住此地',
  btnAddAncestor: '续谱',     // 续写族谱
  btnStartDistill: '开始传神',
  btnStartChat: '开始念白',
  btnNavigate: '寻迹',

  // ─── 页面标题 ───
  pageDetail: '家风',
  pageDistill: '传神',
  pageChat: '念白',
  pageRoute: '寻迹',
  pageRituals: '节令',
  pageSettings: '典设',
  pageScan: '识谱',

  // ─── 功能卡片 ───
  cardGrave: '故地',           // 故乡故地
  cardRoute: '寻迹',           // 寻找足迹
  cardDistill: '传神',         // 传其神韵
  cardChat: '念白',            // 念想对白
  cardVoice: '留声',           // 留住声音
  cardRituals: '节令',         // 节气时令

  // ─── 诗句 ───
  welcomeTitle: '归  处',
  welcomeSubtitle: '血脉所系，根脉所归\n家的记忆，代代相传',
} as const;

/**
 * 功能描述文案
 * 温暖正向，强调"记忆、传承、连接"，回避忌讳
 */
export const Descriptions = {
  actionPin: '记住这片熟悉的土地',
  actionDistill: '让记忆永远鲜活',
  actionChat: '再听一次熟悉的声音',
  actionRoute: '记录回家的路',

  cardGrave: '记住那片熟悉的土地',
  cardRoute: '回家的路，一步一步记下来',
  cardDistill: '把记忆里的音容笑貌留下来',
  cardChat: '再听一次那些熟悉的话',
  cardVoice: '留住那个温暖的声音',
  cardRituals: '重要的日子，不要忘记',

  emptyAncestors: '添加你的第一位家人\n让家的记忆延续下去',
  emptyRituals: '添加家人后\n重要日子会自动提醒你',
} as const;
