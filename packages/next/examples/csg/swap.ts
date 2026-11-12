/**
 * Changing the solid without a bad frame (plan §13.33, editing). A new
 * solid's draws aren't right the moment `addBrep` returns: their custom
 * shader's pipelines compile and their textures load in the frames that
 * follow, and until then a draw uses a stand-in (the colour palette, read
 * before its texture exists, gave black). So the new solid is added hidden,
 * drawn for a few frames where nobody sees it, until `Engine.whenReady` says
 * its draws use no stand-in, and only then shown, in the same step that
 * removes the old one: there is always one solid on screen, and it is always
 * a finished one.
 */

/**
 * Shows one thing at a time and changes it in two steps: `stage` adds the
 * next while the current stays, and once `ready` says it is right, `reveal`
 * swaps them. A newer stage replaces one still waiting (`discard` frees it,
 * and the waiting one's signal aborts, so its wait ends instead of running
 * on), so a slow wait skips states, never queues them. A wait that fails
 * swaps anyway: better a late stand-in than a solid that never changes.
 */
export class DoubleBuffer<T> {
  /** What is shown. */
  current: T | undefined;
  /** What is added and waiting. */
  pending: T | undefined;
  private token = 0;
  private waiting: AbortController | undefined;

  constructor(
    private readonly hooks: {
      /** Makes `next` the thing shown, hiding or freeing `previous`. */
      reveal(next: T, previous: T | undefined): void;
      /** Frees a thing that never got shown. */
      discard(thing: T): void;
    },
  ) {}

  /**
   * Starts `next` waiting; resolves once it is shown, or at once if a newer
   * stage or `clear` took its place. `ready` gets a signal that aborts then.
   */
  async stage(
    next: T,
    ready: (superseded: AbortSignal) => Promise<void>,
  ): Promise<void> {
    const mine = ++this.token;
    this.waiting?.abort();
    if (this.pending !== undefined) {
      this.hooks.discard(this.pending);
    }
    const waiting = new AbortController();
    this.waiting = waiting;
    this.pending = next;
    try {
      await ready(waiting.signal);
    } catch {
      // Shown as it is.
    }
    if (mine !== this.token) {
      return;
    }
    this.waiting = undefined;
    const previous = this.current;
    this.current = next;
    this.pending = undefined;
    this.hooks.reveal(next, previous);
  }

  /** Drops what is waiting and what is shown, through `discard`. */
  clear(): void {
    this.token++;
    this.waiting?.abort();
    this.waiting = undefined;
    for (const thing of [this.pending, this.current]) {
      if (thing !== undefined) {
        this.hooks.discard(thing);
      }
    }
    this.pending = undefined;
    this.current = undefined;
  }
}
