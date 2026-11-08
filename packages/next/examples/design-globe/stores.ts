// Small helpers main.ts uses (plan 4b Tasks 18 and 20), kept out of it.
/** A small store: `get` the current value; listeners told once per frame. */
export function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  let queued = 0;
  return {
    get: () => value,
    set(next: T) {
      if (next === value) {
        return;
      }
      value = next;
      if (queued === 0) {
        queued = requestAnimationFrame(() => {
          queued = 0;
          for (const l of [...listeners]) {
            l();
          }
        });
      }
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    dispose: () => cancelAnimationFrame(queued),
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
