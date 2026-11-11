/**
 * Changing the solid without a bad frame (plan §13.33, editing). A new
 * solid's draws aren't right the moment `addBrep` returns: their custom
 * shader's pipelines compile and their textures load in the frames that
 * follow, and until then a draw uses a stand-in (the colour palette, read
 * before its texture exists, gave black). So the new solid is added hidden,
 * drawn for a few frames where nobody sees it, and only then shown, in the
 * same step that removes the old one: there is always one solid on screen,
 * and it is always a finished one.
 */

/** What waiting for frames needs of the engine. */
export interface FrameSource {
  readonly stats: { readonly framesRendered: number };
  onAfterTick(listener: () => void): () => void;
  requestRender(): void;
}

/**
 * Resolves after `frames` more frames have rendered (the loop is kept
 * running meanwhile, on demand too), or after `timeoutMs`, whichever comes
 * first; rejects with the signal's reason if it aborts.
 *
 * TODO: `Engine.whenReady(view, { draws, signal, timeoutMs })` says it
 * directly (no stand-in used, patch draws diced); use it here when it lands.
 */
export function afterFrames(
  engine: FrameSource,
  frames: number,
  options: {
    timeoutMs?: number;
    signal?: AbortSignal;
    setTimer?: (callback: () => void, ms: number) => unknown;
    clearTimer?: (timer: unknown) => void;
  } = {},
): Promise<void> {
  const { signal, timeoutMs = 2000 } = options;
  const setTimer = options.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
  const clearTimer =
    options.clearTimer ??
    ((timer) => clearTimeout(timer as ReturnType<typeof setTimeout>));
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const first = engine.stats.framesRendered;
    let remove = () => {};
    const timer = setTimer(() => finish(), timeoutMs);
    const onAbort = () => finish(signal!.reason ?? new Error("aborted"));
    const finish = (error?: unknown) => {
      remove();
      clearTimer(timer);
      signal?.removeEventListener("abort", onAbort);
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    };
    remove = engine.onAfterTick(() => {
      if (engine.stats.framesRendered - first >= frames) {
        finish();
      } else {
        engine.requestRender();
      }
    });
    signal?.addEventListener("abort", onAbort, { once: true });
    engine.requestRender();
  });
}

/**
 * Shows one thing at a time and changes it in two steps: `stage` adds the
 * next while the current stays, and once `ready` says it is right, `reveal`
 * swaps them. A newer stage replaces one still waiting (`discard` frees it),
 * so a slow wait skips states, never queues them. A wait that fails swaps
 * anyway: better a late stand-in than a solid that never changes.
 */
export class DoubleBuffer<T> {
  /** What is shown. */
  current: T | undefined;
  /** What is added and waiting. */
  pending: T | undefined;
  private token = 0;

  constructor(
    private readonly hooks: {
      /** Makes `next` the thing shown, hiding or freeing `previous`. */
      reveal(next: T, previous: T | undefined): void;
      /** Frees a thing that never got shown. */
      discard(thing: T): void;
    },
  ) {}

  /** Starts `next` waiting; resolves once it is shown, or at once if a newer stage or `clear` took its place. */
  async stage(next: T, ready: () => Promise<void>): Promise<void> {
    const mine = ++this.token;
    if (this.pending !== undefined) {
      this.hooks.discard(this.pending);
    }
    this.pending = next;
    try {
      await ready();
    } catch {
      // Shown as it is.
    }
    if (mine !== this.token) {
      return;
    }
    const previous = this.current;
    this.current = next;
    this.pending = undefined;
    this.hooks.reveal(next, previous);
  }

  /** Drops what is waiting and what is shown, through `discard`. */
  clear(): void {
    this.token++;
    for (const thing of [this.pending, this.current]) {
      if (thing !== undefined) {
        this.hooks.discard(thing);
      }
    }
    this.pending = undefined;
    this.current = undefined;
  }
}
