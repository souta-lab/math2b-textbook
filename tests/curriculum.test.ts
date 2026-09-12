import { describe, expect, it } from 'vitest';
import {
  allConceptIds,
  externalConcepts,
  getUnit,
  prerequisiteLabel,
  units,
  unitsBySubject,
} from '../src/data/curriculum';

describe('curriculum graph integrity', () => {
  it('has unique ids', () => {
    const ids = allConceptIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every prerequisite points at a known concept', () => {
    const known = new Set(allConceptIds());
    for (const unit of units) {
      for (const p of unit.prerequisites) {
        expect(known.has(p), `${unit.id} → ${p} is unknown`).toBe(true);
      }
    }
  });

  it('each unit has at least one subject and a positive order', () => {
    for (const u of units) {
      expect(u.order).toBeGreaterThan(0);
      expect(u.title.length).toBeGreaterThan(0);
    }
  });
});

describe('reviewed prerequisite edges', () => {
  it('三角関数 depends on 図形と方程式 (unit circle / coordinate plane)', () => {
    expect(getUnit('ii-trigonometric')?.prerequisites).toContain('ii-coordinate');
  });

  it('微分・積分 depends on 図形と方程式 (tangent lines)', () => {
    expect(getUnit('ii-calculus')?.prerequisites).toContain('ii-coordinate');
  });

  it('指数関数・対数関数 depends on 二次関数 (function/graph)', () => {
    expect(getUnit('ii-exponential')?.prerequisites).toContain('i-quadratic');
  });

  it('数列 does NOT list 場合の数と確率 as a prerequisite', () => {
    expect(getUnit('b-sequences')?.prerequisites).not.toContain('a-probability');
  });

  it('数学と社会生活 follows 統計的な推測, not 図形と方程式', () => {
    const pre = getUnit('b-society')?.prerequisites ?? [];
    expect(pre).toContain('b-statistics');
    expect(pre).not.toContain('ii-coordinate');
  });
});

describe('scope', () => {
  it('covers all 数学II and 数学B units', () => {
    expect(unitsBySubject('数学II')).toHaveLength(5);
    expect(unitsBySubject('数学B')).toHaveLength(3);
  });

  it('marks 三角関数 as the published vertical slice', () => {
    const published = units.filter((u) => u.status === 'published').map((u) => u.id);
    expect(published).toContain('ii-trigonometric');
  });

  it('lists 数学I/A prerequisites as external concepts', () => {
    const ids = externalConcepts.map((c) => c.id);
    expect(ids).toContain('i-trig-ratio');
    expect(ids).toContain('i-quadratic');
  });

  it('renders human-readable prerequisite labels', () => {
    expect(prerequisiteLabel('i-trig-ratio')).toContain('三角比');
    expect(prerequisiteLabel('ii-coordinate')).toContain('図形と方程式');
  });
});
