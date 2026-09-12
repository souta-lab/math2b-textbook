/**
 * Client painter for the learning-progress widgets.
 *
 * Every component that renders progress UI imports and calls `initProgress()`.
 * The window-level flag keeps listeners single even when several components
 * (ChapterNav, ProgressToggle, ProgressBar) load the module on the same page.
 *
 * Painting is derived entirely from the `data-progress-*` attributes rendered
 * by SSR — there is no JSON payload and no fetch:
 *   - `[data-progress-item][data-lesson-id]` rows get `.is-done` (checkmark)
 *     plus a visually-hidden 「学習済み」 status;
 *   - `[data-progress-toggle][data-lesson-id]` buttons get `aria-pressed`;
 *   - `[data-progress-lessons]` widgets get count, percent and bar width.
 *
 * Sync paths:
 *   - `math2b:progress-changed` — same-page widgets (toggle → bars/checks);
 *   - `storage` — the key changed in another tab of the same origin.
 */
import {
  PROGRESS_EVENT,
  PROGRESS_KEY,
  getCompleted,
  parseLessonIds,
  summarize,
  toggle,
} from './progress';

declare global {
  interface Window {
    /** Set once so several components can safely call initProgress(). */
    __math2bProgressReady?: boolean;
  }
}

const DONE_STATUS = '学習済み';

function paint(): void {
  const completed = getCompleted();
  const completedSet = new Set(completed);

  document.querySelectorAll<HTMLElement>('[data-progress-item]').forEach((item) => {
    const done = completedSet.has(item.dataset.lessonId ?? '');
    item.classList.toggle('is-done', done);
    const status = item.querySelector<HTMLElement>('[data-progress-status]');
    if (status) status.textContent = done ? DONE_STATUS : '';
  });

  document.querySelectorAll<HTMLElement>('[data-progress-toggle]').forEach((button) => {
    const done = completedSet.has(button.dataset.lessonId ?? '');
    button.setAttribute('aria-pressed', String(done));
    button.classList.toggle('is-done', done);
  });

  document.querySelectorAll<HTMLElement>('[data-progress-lessons]').forEach((widget) => {
    const ids = parseLessonIds(widget.dataset.progressLessons);
    const { done, total, percent } = summarize(ids, completed);

    const count = widget.querySelector<HTMLElement>('[data-progress-count]');
    if (count) count.textContent = `${done} / ${total}`;

    const percentLabel = widget.querySelector<HTMLElement>('[data-progress-percent]');
    if (percentLabel) percentLabel.textContent = `${percent}%`;

    const bar = widget.querySelector<HTMLElement>('[data-progress-bar]');
    if (bar) {
      bar.setAttribute('aria-valuenow', String(percent));
      bar.style.setProperty('--progress', `${percent}%`);
    }
  });
}

/** Idempotent init: safe to call from every component that needs the painter. */
export function initProgress(): void {
  if (typeof window === 'undefined' || window.__math2bProgressReady) return;
  window.__math2bProgressReady = true;

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLElement>('[data-progress-toggle]');
    const id = button?.dataset.lessonId;
    if (!id) return;
    toggle(id); // emits PROGRESS_EVENT, which repaints every widget
  });

  window.addEventListener(PROGRESS_EVENT, paint);
  window.addEventListener('storage', (event) => {
    // key === null means another tab called storage.clear().
    if (event.key === null || event.key === PROGRESS_KEY) paint();
  });

  paint();
}
