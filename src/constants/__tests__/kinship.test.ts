/**
 * 辈分体系 — 单元测试
 */
import { KINSHIP_GROUPS, findKinshipTerm, ALL_KINSHIP_TITLES } from '../kinship';

describe('辈分体系', () => {
  it('应该包含九代辈分', () => {
    const groupLabels = KINSHIP_GROUPS.map(g => g.label);
    expect(groupLabels).toContain('父母辈');
    expect(groupLabels).toContain('祖辈');
    expect(groupLabels).toContain('曾祖辈');
    expect(groupLabels).toContain('鼻祖辈');
  });

  it('findKinshipTerm 应该找到爷爷', () => {
    const term = findKinshipTerm('爷爷');
    expect(term).toBeDefined();
    // description 中包含"父亲的父亲"
    expect(term!.description).toContain('父亲的父亲');
    expect(term!.gender).toBe('male');
  });

  it('所有称谓应该有 title 和 description', () => {
    for (const group of KINSHIP_GROUPS) {
      for (const term of group.terms) {
        expect(term.title).toBeTruthy();
        expect(term.description).toBeTruthy();
      }
    }
  });

  it('ALL_KINSHIP_TITLES 应该包含所有称谓', () => {
    expect(ALL_KINSHIP_TITLES.length).toBeGreaterThan(20);
    expect(ALL_KINSHIP_TITLES).toContain('爷爷');
    expect(ALL_KINSHIP_TITLES).toContain('鼻祖');
  });
});
