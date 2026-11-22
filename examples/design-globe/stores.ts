// Small helpers main.ts uses (plan 4b Tasks 18 and 20), kept out of it.

/**
 * When a store's listeners are told: once, after the engine's next render
 * (frameDriver.ts `queue`), so what they show matches the frame drawn.
 */
export interface StoreFrame {
  queue(work: () => void): void;
  cancel(work: () => void): void;
}

/**
 * A small store: `get` the current value; listeners told once per frame,
 * after the render (`frame`). `always`: told on every `set`, even of the
 * same value.
 */
export function createStore<T>(
  initial: T,
  frame: StoreFrame,
  options: { always?: boolean } = {},
) {
  let value = initial;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const l of [...listeners]) {
      l();
    }
  };
  return {
    get: () => value,
    set(next: T) {
      if (next === value && options.always !== true) {
        return;
      }
      value = next;
      frame.queue(notify);
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    dispose: () => frame.cancel(notify),
  };
}

/** Text that goes into an HTML credit: escaped (catalog fields are data). */
export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

/**
 * Keeps `--dg-time-clear` on `hud` (CSS pixels from the view's bottom to
 * above the time controls' top, as they wrap), so the HUD's cards stand
 * clear of them (Task 20 fix 1, page I5). Returns what stops it.
 */
export function clearTimeControls(
  container: HTMLElement,
  hud: HTMLElement,
  canvas: HTMLElement,
): () => void {
  const time = container.querySelector(".cesium-time");
  const update = () => {
    if (time === null) {
      return;
    }
    const box = container.getBoundingClientRect();
    const top = time.getBoundingClientRect().top;
    hud.style.setProperty(
      "--dg-time-clear",
      `${Math.max(0, Math.round(box.bottom - top)) + 16}px`,
    );
  };
  const observer = new ResizeObserver(update);
  observer.observe(canvas);
  if (time !== null) {
    observer.observe(time);
  }
  update();
  return () => observer.disconnect();
}
