// The worker's engineering frames, kept for reuse (R13): resolving a PROJ
// operation costs milliseconds, and an overlay or a scenario asks for the
// same frame again and again. Bounded (Task 6a follow-up, the owner): a
// dragged knob (the BIM site's rotation or scale) asks for a new frame at
// every value, so the cache keeps the most recently used `limit`, and when
// the worker turns to another scenario the previous one's frames go at once.
//
// Nothing needs freeing by hand: proj.js (v0.9.2) exposes no proj_destroy;
// its PROJ objects are wrapped with finalizers (napi_wrap natively, a
// FinalizationRegistry in the WebAssembly glue), which free them once
// nothing references them. A frame holds its operation only through its
// own closures, so dropping the entry is its release. (Checked under node:
// 100,000 proj_create calls with nothing kept, then GC, leave the process's
// memory flat after the first 20,000.)

/**
 * The frames a bounded cache keeps: the current scenario's tree and
 * overlays (a CRS and a site grid each: four with the evaluator's own) and
 * a few recent knob states besides, so a knob moved back and forth reuses
 * them.
 */
export const FRAME_CACHE_LIMIT = 16;

export class FrameCache<T> {
  /** In use order, oldest first; each with the scenario current when it was made. */
  private readonly entries = new Map<
    string,
    { value: T; scenario: string | undefined }
  >();
  private scenario: string | undefined;

  constructor(readonly limit = FRAME_CACHE_LIMIT) {
    if (!(Number.isInteger(limit) && limit >= 1)) {
      throw new RangeError(
        `FrameCache: the limit must be a whole number, 1 or more, got ${limit}`,
      );
    }
  }

  /** The value under `key`, made by `make` if it isn't kept; the least recently used goes past the limit. */
  get(key: string, make: () => T): T {
    const hit = this.entries.get(key);
    if (hit !== undefined) {
      // Most recently used: to the end.
      this.entries.delete(key);
      this.entries.set(key, hit);
      return hit.value;
    }
    const value = make();
    this.entries.set(key, { value, scenario: this.scenario });
    while (this.entries.size > this.limit) {
      this.entries.delete(this.entries.keys().next().value!);
    }
    return value;
  }

  /**
   * The worker now evaluates `scenario`: what was made while another one
   * was current goes. Frames made before any scenario (the catalog's
   * overlays) stay until they are the least recently used.
   */
  scenarioChanged(scenario: string): void {
    if (scenario === this.scenario) {
      return;
    }
    const old = this.scenario;
    this.scenario = scenario;
    if (old === undefined) {
      return;
    }
    for (const [key, entry] of this.entries) {
      if (entry.scenario === old) {
        this.entries.delete(key);
      }
    }
  }

  get size(): number {
    return this.entries.size;
  }

  /** How many entries were made while `scenario` was current. */
  madeIn(scenario: string | undefined): number {
    let n = 0;
    for (const e of this.entries.values()) {
      if (e.scenario === scenario) {
        n++;
      }
    }
    return n;
  }

  clear(): void {
    this.entries.clear();
    this.scenario = undefined;
  }
}
