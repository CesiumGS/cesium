// One queue for every run the page starts (final review, Important 1): the
// catalog's runs ("Run all", "Run this group", a deep link's group) and "Try
// your own" go through it, so two never overlap. Overlapping runs duplicated
// result ids, doubled the report's counts, showed "done" while another run
// streamed, and mixed citations in the worker (references.ts collects them
// for one run at a time).

export class RunQueue {
  /** Settles when the last run asked for has ended. */
  private tail: Promise<void> = Promise.resolve();
  private readonly keyed = new Map<string, Promise<unknown>>();
  private pending = 0;

  /** Whether a run is going on or waiting. */
  get busy(): boolean {
    return this.pending > 0;
  }

  /**
   * Runs `task` once every run asked for before it has ended. A call with
   * the `key` of a run still waiting or going on gets that run's promise
   * instead of a second run (a double-click on "Run this group").
   */
  run<T>(task: () => Promise<T>, key?: string): Promise<T> {
    if (key !== undefined) {
      const same = this.keyed.get(key);
      if (same !== undefined) {
        return same as Promise<T>;
      }
    }
    this.pending++;
    const result = this.tail.then(task).finally(() => {
      this.pending--;
    });
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    if (key !== undefined) {
      this.keyed.set(key, result);
      const clear = () => {
        if (this.keyed.get(key) === result) {
          this.keyed.delete(key);
        }
      };
      result.then(clear, clear);
    }
    return result;
  }
}
