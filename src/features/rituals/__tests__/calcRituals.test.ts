/**
 * 习俗日历计算引擎 — 单元测试
 */
import { calculateRituals } from '../calcRituals';

describe('calculateRituals', () => {
  it('应该为去世日期生成头七事件', () => {
    // 固定 now 以便结果稳定
    const events = calculateRituals('2024-09-15', null, new Date('2024-09-16'));
    const firstSeven = events.find(e => e.name === '头七');
    expect(firstSeven).toBeDefined();
    expect(firstSeven!.dateSolar).toBe('2024-09-22');
  });

  it('应该生成清明节事件', () => {
    // 去世日期在 2024 年初，清明在 2024-04-04
    const events = calculateRituals('2024-01-01', null, new Date('2024-02-01'));
    const qingming = events.find(e => e.name === '清明节');
    expect(qingming).toBeDefined();
  });

  it('应该标记已过去的事件', () => {
    // 去世日期很早，now 设为 2026 年，很多事件已过去
    const events = calculateRituals('2020-01-01', null, new Date('2026-01-01'));
    const pastEvents = events.filter(e => e.isPast);
    expect(pastEvents.length).toBeGreaterThan(0);
  });

  it('应该按日期排序', () => {
    const events = calculateRituals('2024-06-01', null, new Date('2024-07-01'));
    for (let i = 1; i < events.length; i++) {
      expect(events[i].dateSolar >= events[i - 1].dateSolar).toBe(true);
    }
  });

  it('去世日期无效时应该返回空数组或不崩溃', () => {
    // 空字符串和无效字符串不应该抛异常
    expect(() => calculateRituals('')).not.toThrow();
    expect(() => calculateRituals('invalid')).not.toThrow();
  });
});
