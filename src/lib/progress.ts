/**
 * Learning progress — the set of lessons the learner marked 「学んだ」.
 *
 * Persisted in `localStorage` under a versioned key and shared between every
 * widget on the page. SSR-safe: all storage access is guarded, so Astro
 * components can import the helpers while rendering on the server. The counting
 * helpers (`countCompleted` / `percentCompleted` / `summarize`) are pure and
 * take the completed list as an argument, so they are testable without a DOM.
 */

/** Versioned localStorage key. Bump the version to invalidate an old format. */
export const PROGRESS_KEY = 'math2b:progress:v1';

/**
 * Window event dispatched after every change. `detail` is
 * `{ completed: string[] }`. Widgets listen for it to repaint without a
 * full reload.
 */
export const PROGRESS_EVENT = 'math2b:progress-changed';

/** localStorage, or null when unavailable (SSR, sandboxed, quota errors). */
function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Raw ids from storage; tolerates missing/corrupt/legacy payloads. */
function read(store: Storage): string[] {
  try {
    const raw = store.getItem(PROGRESS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string' && value !== '');
  } catch {
    return [];
  }
}

function write(store: Storage, ids: string[]): void {
  try {
    store.setItem(PROGRESS_KEY, JSON.stringify(ids));
  } catch {
    // Quota or privacy-mode failure: progress is best-effort, never throws.
  }
}

function emit(completed: string[]): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: { completed } }));
}

/** Completed lesson ids, de-duplicated, in insertion order. */
export function getCompleted(): string[] {
  const store = storage();
  if (!store) return [];
  return [...new Set(read(store))];
}

/** True when the lesson id is marked 「学んだ」. */
export function isDone(id: string): boolean {
  if (!id) return false;
  const store = storage();
  if (!store) return false;
  return read(store).includes(id);
}

/**
 * Mark a lesson done/undone. Returns the resulting state (true = done).
 * No-op (and no event) when storage is unavailable or nothing changes.
 */
export function setDone(id: string, done: boolean): boolean {
  if (!id) return false;
  const store = storage();
  if (!store) return false;
  const current = new Set(read(store));
  if (current.has(id) === done) return done;
  if (done) current.add(id);
  else current.delete(id);
  const next = [...current];
  write(store, next);
  emit(next);
  return done;
}

/** Flip a lesson's state; returns the new state (true = done). */
export function toggle(id: string): boolean {
  if (!id) return false;
  const store = storage();
  if (!store) return false;
  const current = new Set(read(store));
  const done = !current.has(id);
  if (done) current.add(id);
  else current.delete(id);
  const next = [...current];
  write(store, next);
  emit(next);
  return done;
}

/** How many of `ids` are present in `completed`. Pure. */
export function countCompleted(ids: readonly string[], completed: readonly string[]): number {
  const done = new Set(completed);
  let count = 0;
  for (const id of ids) {
    if (done.has(id)) count += 1;
  }
  return count;
}

/** Rounded 0–100 share of `ids` that are done. Pure; empty list → 0. */
export function percentCompleted(ids: readonly string[], completed: readonly string[]): number {
  if (ids.length === 0) return 0;
  return Math.round((countCompleted(ids, completed) / ids.length) * 100);
}

export interface ProgressSummary {
  done: number;
  total: number;
  percent: number;
}

/** Counts + percent for one progress widget. Pure. */
export function summarize(ids: readonly string[], completed: readonly string[]): ProgressSummary {
  return {
    done: countCompleted(ids, completed),
    total: ids.length,
    percent: percentCompleted(ids, completed),
  };
}

/**
 * Parse the comma-separated lesson id list rendered into
 * `data-progress-lessons`. Pure.
 */
export function parseLessonIds(value: string | null | undefined): string[] {
  if (!value) return [];
  const ids: string[] = [];
  for (const part of value.split(',')) {
    const id = part.trim();
    if (id) ids.push(id);
  }
  return ids;
}
