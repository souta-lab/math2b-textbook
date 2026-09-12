import { describe, expect, it } from 'vitest';
import {
  allConceptIds,
  externalConcepts,
  getUnit,
  LEGACY_CONCEPT_TO_UNIT,
  prerequisiteLabel,
  SUBJECT_META,
  SUBJECT_ORDER,
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

  it('folds former 数学I/A external concepts into real units', () => {
    expect(externalConcepts).toHaveLength(0);
    for (const id of ['i-expression', 'i-quadratic', 'i-trig-ratio', 'i-data', 'a-probability']) {
      expect(getUnit(id), `${id} should be a unit`).toBeDefined();
    }
  });

  it('keeps legacy concept ids rendering a human-readable label', () => {
    for (const legacyId of Object.keys(LEGACY_CONCEPT_TO_UNIT)) {
      const label = prerequisiteLabel(legacyId);
      expect(label, `${legacyId} lost its label`).not.toBe(legacyId);
      expect(label.length).toBeGreaterThan(0);
    }
    expect(prerequisiteLabel('i-trig-ratio')).toContain('図形と計量');
    expect(prerequisiteLabel('ii-coordinate')).toContain('図形と方程式');
  });
});

describe('multi-subject registry', () => {
  it('SUBJECT_ORDER covers every subject used and every SUBJECT_META key', () => {
    const ordered = new Set(SUBJECT_ORDER);
    expect(ordered.size, 'SUBJECT_ORDER has duplicates').toBe(SUBJECT_ORDER.length);
    expect([...ordered].sort()).toEqual(Object.keys(SUBJECT_META).sort());
    for (const unit of units) {
      expect(ordered.has(unit.subject), `${unit.id} uses unknown subject ${unit.subject}`).toBe(true);
    }
  });

  it('keeps subject order monotonic across every unit-to-unit prerequisite edge', () => {
    const subjectIndex = new Map(SUBJECT_ORDER.map((subject, index) => [subject, index]));
    const rank = new Map<string, number>();
    for (const unit of units) {
      rank.set(unit.id, (subjectIndex.get(unit.subject) ?? 0) * 10_000 + unit.order);
    }
    for (const unit of units) {
      for (const prerequisite of unit.prerequisites) {
        const prerequisiteRank = rank.get(prerequisite);
        if (prerequisiteRank === undefined) continue;
        const unitRank = rank.get(unit.id);
        if (unitRank === undefined) throw new Error(`${unit.id} is missing a rank`);
        expect(
          prerequisiteRank,
          `${unit.id} (${unit.subject}) depends on a later unit: ${prerequisite}`,
        ).toBeLessThan(unitRank);
      }
    }
  });

  it('has an acyclic unit prerequisite graph', () => {
    const byId = new Map(units.map((unit) => [unit.id, unit]));
    const state = new Map<string, 'visiting' | 'done'>();
    const visit = (id: string, path: string[]): void => {
      const current = state.get(id);
      if (current === 'done') return;
      expect(current, `prerequisite cycle: ${[...path, id].join(' → ')}`).not.toBe('visiting');
      state.set(id, 'visiting');
      for (const prerequisite of byId.get(id)?.prerequisites ?? []) {
        if (byId.has(prerequisite)) visit(prerequisite, [...path, id]);
      }
      state.set(id, 'done');
    };
    for (const unit of units) visit(unit.id, []);
  });

  it('registers the expected unit count per subject', () => {
    const counts = Object.fromEntries(
      SUBJECT_ORDER.map((subject) => [subject, unitsBySubject(subject).length]),
    );
    expect(counts).toEqual({
      中学数学: 5,
      数学I: 5,
      数学A: 3,
      数学II: 5,
      数学B: 3,
      数学III: 4,
      数学C: 3,
      大学数学: 7,
    });
  });

  it('gives every planned unit a lessonPlan of unique slugs', () => {
    for (const unit of units) {
      if (!unit.lessonPlan) continue;
      expect(new Set(unit.lessonPlan).size, `${unit.id} lessonPlan duplicates`).toBe(
        unit.lessonPlan.length,
      );
      for (const slug of unit.lessonPlan) {
        expect(slug.length, `${unit.id} has an empty lessonPlan slug`).toBeGreaterThan(0);
      }
    }
  });
});
