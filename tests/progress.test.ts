import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PROGRESS_EVENT,
  PROGRESS_KEY,
  countCompleted,
  getCompleted,
  isDone,
  parseLessonIds,
  percentCompleted,
  setDone,
  summarize,
  toggle,
} from '../src/lib/progress';

/** Minimal in-memory Storage stand-in (no jsdom dependency). */
function createStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => (data.has(key) ? (data.get(key) ?? null) : null),
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  } as Storage;
}

type FakeWindow = EventTarget & { localStorage: Storage };

let fakeWindow: FakeWindow;

beforeEach(() => {
  fakeWindow = Object.assign(new EventTarget(), { localStorage: createStorage() });
  vi.stubGlobal('window', fakeWindow);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('progress storage', () => {
  it('uses a versioned key', () => {
    expect(PROGRESS_KEY).toBe('math2b:progress:v1');
  });

  it('is neutral without a window (SSR)', () => {
    vi.unstubAllGlobals();
    expect(getCompleted()).toEqual([]);
    expect(isDone('a')).toBe(false);
    expect(setDone('a', true)).toBe(false);
    expect(toggle('a')).toBe(false);
  });

  it('marks, reports and unmarks a lesson', () => {
    expect(isDone('a')).toBe(false);
    expect(setDone('a', true)).toBe(true);
    expect(isDone('a')).toBe(true);
    expect(getCompleted()).toEqual(['a']);
    expect(JSON.parse(fakeWindow.localStorage.getItem(PROGRESS_KEY) ?? '[]')).toEqual(['a']);

    expect(setDone('a', false)).toBe(false);
    expect(isDone('a')).toBe(false);
    expect(getCompleted()).toEqual([]);
  });

  it('toggles and returns the new state', () => {
    expect(toggle('a')).toBe(true);
    expect(toggle('a')).toBe(false);
    expect(getCompleted()).toEqual([]);
  });

  it('ignores empty ids', () => {
    expect(setDone('', true)).toBe(false);
    expect(toggle('')).toBe(false);
    expect(isDone('')).toBe(false);
  });

  it('tolerates corrupt, non-array and non-string payloads', () => {
    fakeWindow.localStorage.setItem(PROGRESS_KEY, '{not json');
    expect(getCompleted()).toEqual([]);

    fakeWindow.localStorage.setItem(PROGRESS_KEY, JSON.stringify({ a: 1 }));
    expect(getCompleted()).toEqual([]);

    fakeWindow.localStorage.setItem(PROGRESS_KEY, JSON.stringify(['a', 2, null, '', 'b']));
    expect(getCompleted()).toEqual(['a', 'b']);
  });

  it('dispatches PROGRESS_EVENT with the next completed list', () => {
    const details: unknown[] = [];
    fakeWindow.addEventListener(PROGRESS_EVENT, (event) => {
      details.push((event as CustomEvent<{ completed: string[] }>).detail);
    });

    setDone('a', true);
    setDone('b', true);
    expect(details).toEqual([{ completed: ['a'] }, { completed: ['a', 'b'] }]);
  });

  it('does not emit when the state would not change', () => {
    const spy = vi.fn();
    fakeWindow.addEventListener(PROGRESS_EVENT, spy);
    setDone('a', false);
    fakeWindow.localStorage.setItem(PROGRESS_KEY, JSON.stringify(['a']));
    setDone('a', true);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('pure progress math', () => {
  const ids = ['a', 'b', 'c', 'd'];

  it('counts only ids present in the completed list', () => {
    expect(countCompleted(ids, ['a', 'c'])).toBe(2);
    expect(countCompleted(ids, ['z'])).toBe(0);
    expect(countCompleted([], ['a'])).toBe(0);
  });

  it('rounds percent and treats an empty list as 0%', () => {
    expect(percentCompleted(ids, [])).toBe(0);
    expect(percentCompleted(ids, ['a'])).toBe(25);
    expect(percentCompleted(ids, ['a', 'b', 'c'])).toBe(75);
    expect(percentCompleted(ids, ['a', 'b', 'c', 'd'])).toBe(100);
    expect(percentCompleted(['a', 'b', 'c'], ['a'])).toBe(33);
    expect(percentCompleted([], ['a'])).toBe(0);
  });

  it('summarizes done/total/percent', () => {
    expect(summarize(ids, ['a', 'b'])).toEqual({ done: 2, total: 4, percent: 50 });
    expect(summarize([], [])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe('parseLessonIds', () => {
  it('splits, trims and drops empty entries', () => {
    expect(parseLessonIds('a, b ,,c')).toEqual(['a', 'b', 'c']);
    expect(parseLessonIds('')).toEqual([]);
    expect(parseLessonIds(null)).toEqual([]);
    expect(parseLessonIds(undefined)).toEqual([]);
  });
});
