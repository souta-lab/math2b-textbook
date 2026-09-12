import { describe, expect, it } from 'vitest';
import { trigGraphFrame, unitCircleFrame } from '../src/components/viz/viz-math';

describe('trigGraphFrame x-axis ticks', () => {
  it('labels 2π even when the domain is passed as a truncated decimal', () => {
    const frame = trigGraphFrame('sin', 0, 6.283185, 0);
    const labels = frame.xTicks.map((tick) => tick.label);
    expect(labels).toEqual(['0', 'π/2', 'π', '3π/2', '2π']);
  });

  it('places tan asymptotes at π/2 and 3π/2 on [0, 2π)', () => {
    const frame = trigGraphFrame('tan', 0, 6.283185, 0);
    expect(frame.asymptotes).toHaveLength(2);
  });
});

describe('unitCircleFrame', () => {
  it('maps the unit-circle point and projections for 120°', () => {
    const frame = unitCircleFrame(120);
    expect(frame.values.sin).toBe('0.866');
    expect(frame.values.cos).toBe('-0.5');
    expect(frame.values.tan).toBe('-1.732');
    expect(frame.sinSeg).not.toBeNull();
    expect(frame.cosSeg).not.toBeNull();
  });

  it('reports tan as undefined at 90° and 270°', () => {
    expect(unitCircleFrame(90).values.tan).toBe('未定義');
    expect(unitCircleFrame(270).values.tan).toBe('未定義');
  });

  it('does not draw a sin/cos projection at axis angles', () => {
    expect(unitCircleFrame(0).sinSeg).toBeNull();
    expect(unitCircleFrame(0).cosSeg).not.toBeNull();
  });
});
