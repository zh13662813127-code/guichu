/**
 * 农历日期表 — 单元测试
 */
import { LUNAR_DATES } from '../lunarDates';

describe('农历日期表', () => {
  it('应该覆盖 2024-2030 年', () => {
    for (let y = 2024; y <= 2030; y++) {
      expect(LUNAR_DATES[y]).toBeDefined();
      expect(LUNAR_DATES[y].zhongyuan).toBeTruthy();
      expect(LUNAR_DATES[y].hanyi).toBeTruthy();
      expect(LUNAR_DATES[y].chuxi).toBeTruthy();
    }
  });

  it('日期格式应该是 yyyy-MM-dd', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const year of Object.values(LUNAR_DATES)) {
      expect(year.zhongyuan).toMatch(dateRegex);
      expect(year.hanyi).toMatch(dateRegex);
      expect(year.chuxi).toMatch(dateRegex);
    }
  });
});
