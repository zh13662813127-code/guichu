/**
 * 习俗日历计算引擎
 * 根据去世日期 + 地区覆盖，生成完整的习俗事件时间线
 */

import { addDays, addYears, format, differenceInDays, isBefore } from 'date-fns';
import commonCustoms from './customs/common.json';
import { LUNAR_DATES, QINGMING_DATES, LUNAR_DATE_LABELS } from './lunarDates';

// ─── 类型定义 ───────────────────────────────────────────

/** 单个习俗事件 */
export interface RitualEvent {
  /** 唯一键，如 'first_seven' 或 'qingming_2026' */
  key: string;
  /** 显示名称，如 '头七'、'清明节' */
  name: string;
  /** 公历日期 yyyy-MM-dd */
  dateSolar: string;
  /** 农历日期（如有），如 '七月十五' */
  dateLunar?: string;
  /** 距去世第几年 */
  yearAfterDeath: number;
  /** 事件说明 */
  description: string;
  /** 待办事项列表 */
  todoItems: string[];
  /** 需要携带的物品 */
  bringItems: string[];
  /** 居家注意事项 */
  homeNotes: string | null;
  /** 是否已过去 */
  isPast: boolean;
  /** 距今天数（负数表示已过去） */
  daysFromNow: number;
}

/** 地区覆盖的单项 */
interface RegionOverrideItem {
  bring_extra?: string[];
  notes?: string;
}

/** 地区覆盖数据结构 */
export interface RegionOverrides {
  region: string;
  overrides: Record<string, RegionOverrideItem>;
  spring_festival_couplets?: {
    year_1: { color: string; note: string };
    year_2: { color: string; note: string };
    year_3_plus: { color: string; note: string };
  };
}

/**
 * 计算一位长辈未来 2 年内的所有习俗事件
 * @param params.deathDate 去世日期 yyyy-MM-dd
 * @param params.region 地区标识，如 '山东省/潍坊市'（暂未用于动态加载）
 * @param params.now 当前时间（默认 new Date()，方便测试）
 */
export function calcRitualEvents(params: {
  deathDate: string;
  region?: string;
  now?: Date;
}): RitualEvent[] {
  return calculateRituals(params.deathDate, undefined, params.now);
}

/**
 * 根据去世日期计算所有习俗事件
 * @param deathDate 去世日期 yyyy-MM-dd
 * @param regionOverrides 地区覆盖（可空）
 * @param nowOverride 当前时间覆盖（方便测试）
 * @returns 按日期排序的事件列表
 */
export function calculateRituals(
  deathDate: string,
  regionOverrides?: RegionOverrides | null,
  nowOverride?: Date,
): RitualEvent[] {
  const events: RitualEvent[] = [];
  const death = new Date(deathDate);
  const now = nowOverride ?? new Date();
  // 未来 2 年截止日期
  const cutoff = addYears(now, 2);

  // 1. 处理 death_based 事件（头七、百日、周年祭等）
  for (const ritual of commonCustoms.death_based) {
    let eventDate: Date;
    if ('offset_days' in ritual && ritual.offset_days) {
      eventDate = addDays(death, ritual.offset_days);
    } else if ('offset_years' in ritual && ritual.offset_years) {
      eventDate = addYears(death, ritual.offset_years);
    } else {
      continue;
    }

    // 超过未来 2 年的跳过
    if (isBefore(cutoff, eventDate)) continue;

    const yearAfterDeath = eventDate.getFullYear() - death.getFullYear();

    // 合并地区覆盖
    let bringItems = [...ritual.bring];
    let homeNotes: string | null = ritual.home_notes;
    if (regionOverrides?.overrides?.[ritual.key]) {
      const override = regionOverrides.overrides[ritual.key];
      if (override.bring_extra) bringItems.push(...override.bring_extra);
      if (override.notes) homeNotes = (homeNotes ? homeNotes + '。' : '') + override.notes;
    }

    events.push({
      key: ritual.key,
      name: ritual.name,
      dateSolar: format(eventDate, 'yyyy-MM-dd'),
      yearAfterDeath,
      description: ritual.description,
      todoItems: ritual.todo,
      bringItems,
      homeNotes,
      isPast: isBefore(eventDate, now),
      daysFromNow: differenceInDays(eventDate, now),
    });
  }

  // 2. 处理 annual 事件 — 使用查表法获取准确的公历日期
  const startYear = death.getFullYear();
  const endYear = now.getFullYear() + 2;

  for (let year = startYear; year <= endYear; year++) {
    for (const annual of commonCustoms.annual) {
      let eventDate: Date | null = null;
      let dateLunar: string | undefined;

      if (annual.type === 'solar_term' && annual.key === 'qingming') {
        // 清明节：查表获取准确日期，查不到则默认 4月5日
        const qmStr = QINGMING_DATES[year];
        eventDate = qmStr ? new Date(qmStr) : new Date(year, 3, 5);
        dateLunar = LUNAR_DATE_LABELS.qingming;
      } else if (annual.type === 'lunar') {
        // 农历节日：查表获取公历日期
        const lunarYear = LUNAR_DATES[year];
        if (lunarYear) {
          const dateStr = lunarYear[annual.key as keyof typeof lunarYear];
          if (dateStr) {
            eventDate = new Date(dateStr);
            dateLunar = LUNAR_DATE_LABELS[annual.key];
          }
        }

        // 查表失败时使用估算值
        if (!eventDate) {
          if (annual.key === 'zhongyuan') eventDate = new Date(year, 7, 15);
          else if (annual.key === 'hanyi') eventDate = new Date(year, 10, 1);
          else if (annual.key === 'chuxi') eventDate = new Date(year + 1, 0, 28);
          else continue;
        }
      } else {
        continue;
      }

      if (!eventDate) continue;

      // 只包含去世之后的事件
      if (isBefore(eventDate, death)) continue;
      // 超过未来 2 年的跳过
      if (isBefore(cutoff, eventDate)) continue;

      const yearAfterDeath = eventDate.getFullYear() - death.getFullYear();

      // 合并地区覆盖
      let bringItems = [...annual.bring];
      let homeNotes: string | null = annual.home_notes;
      if (regionOverrides?.overrides?.[annual.key]) {
        const override = regionOverrides.overrides[annual.key];
        if (override.bring_extra) bringItems.push(...override.bring_extra);
        if (override.notes) homeNotes = (homeNotes ? homeNotes + '。' : '') + override.notes;
      }

      events.push({
        key: `${annual.key}_${year}`,
        name: annual.name,
        dateSolar: format(eventDate, 'yyyy-MM-dd'),
        dateLunar,
        yearAfterDeath,
        description: annual.description,
        todoItems: annual.todo,
        bringItems,
        homeNotes,
        isPast: isBefore(eventDate, now),
        daysFromNow: differenceInDays(eventDate, now),
      });
    }
  }

  // 3. 按日期排序
  events.sort((a, b) => a.dateSolar.localeCompare(b.dateSolar));

  return events;
}

/** 获取未来 N 天内的事件 */
export function getUpcomingRituals(events: RitualEvent[], withinDays: number = 30): RitualEvent[] {
  return events.filter(e => !e.isPast && e.daysFromNow <= withinDays);
}

/** 获取春联颜色建议 */
export function getCoupletColor(
  deathDate: string,
  regionOverrides?: RegionOverrides | null,
): { color: string; note: string } {
  const death = new Date(deathDate);
  const now = new Date();
  const yearsDiff = now.getFullYear() - death.getFullYear();

  const couplets = regionOverrides?.spring_festival_couplets || commonCustoms.spring_festival_couplets;

  if (yearsDiff <= 1) return couplets.year_1;
  if (yearsDiff === 2) return couplets.year_2;
  return couplets.year_3_plus;
}
