// Fits kept per (item, root) and made lazily within a frame's budget (plan
// §13.26, the second review, flaw 8): a route whose revision moved is
// refitted on a budget, and until its new fit lands the stale one is drawn.
//
// Main thread for now. Warps are JS closures, which a worker can't be sent,
// so fitting off-thread needs serialisable warps (later).
import type { CubicLattice } from "./warpTerms.ts";

interface Entry {
  /** The last fit made, for drawing while a newer one is pending. */
  lattice: CubicLattice | undefined;
  /** The route revision `lattice` was fitted at. */
  fitted: number;
  /** The queued fit and the revision it is for. */
  job: (() => CubicLattice) | undefined;
  revision: number;
  /** Last `request`, for LRU and for newest-first running. */
  touched: number;
}

export class WarpFitCache {
  readonly #entries = new Map<string, Entry>();
  readonly #maxEntries: number;
  #clock = 0;

  constructor(maxEntries = 512) {
    if (!(maxEntries >= 1)) {
      throw new RangeError(`WarpFitCache: maxEntries is ${maxEntries}`);
    }
    this.#maxEntries = Math.floor(maxEntries);
  }

  /** Queued fits not yet run. */
  get pending(): number {
    let n = 0;
    for (const e of this.#entries.values()) {
      if (e.job) {
        n++;
      }
    }
    return n;
  }

  /** Entries held. */
  get size(): number {
    return this.#entries.size;
  }

  /**
   * The fit for `key` on `root` at route `revision`: the current one, or
   * (queueing `job`) the previous one, stale but drawable, or `undefined`
   * when there never was one. A request is the newest, to run first.
   */
  request(
    key: string,
    root: string,
    revision: number,
    job: () => CubicLattice,
  ): CubicLattice | undefined {
    const id = `${root}\u0000${key}`;
    let e = this.#entries.get(id);
    if (!e) {
      e = {
        lattice: undefined,
        fitted: NaN,
        job: undefined,
        revision,
        touched: 0,
      };
      this.#entries.set(id, e);
    }
    e.touched = ++this.#clock;
    if (e.lattice && e.fitted === revision) {
      e.job = undefined;
    } else {
      e.job = job;
      e.revision = revision;
    }
    const lattice = e.lattice;
    this.#evict(e);
    return lattice;
  }

  /**
   * The fit for `key` on `root` if it is current at `revision` (no queueing,
   * no touching): a pending fit's result, once `run` has made it.
   */
  current(
    key: string,
    root: string,
    revision: number,
  ): CubicLattice | undefined {
    const e = this.#entries.get(`${root}\u0000${key}`);
    return e && e.fitted === revision ? e.lattice : undefined;
  }

  /**
   * Runs queued fits, newest request first, until `budgetMs` is spent. At
   * least one runs per call when any is queued, so a budget below one fit
   * still makes progress. A job that throws is dropped and its error
   * rethrown; the others stay queued. Returns how many ran.
   */
  run(budgetMs: number, now: () => number = () => performance.now()): number {
    const start = now();
    let ran = 0;
    do {
      let next: [string, Entry] | undefined;
      for (const pair of this.#entries) {
        if (pair[1].job && (!next || pair[1].touched > next[1].touched)) {
          next = pair;
        }
      }
      if (!next) {
        break;
      }
      const [id, e] = next;
      const job = e.job!;
      const revision = e.revision;
      e.job = undefined;
      ran++;
      const lattice = job();
      if (this.#entries.get(id) === e) {
        e.lattice = lattice;
        e.fitted = revision;
      }
    } while (now() - start < budgetMs);
    return ran;
  }

  /** Drops every fit and queued job for `key`, on any root. */
  forget(key: string): void {
    const suffix = `\u0000${key}`;
    for (const id of [...this.#entries.keys()]) {
      if (id.endsWith(suffix)) {
        this.#entries.delete(id);
      }
    }
  }

  clear(): void {
    this.#entries.clear();
  }

  /** Over the cap, drops the least recently requested, never `keep`. */
  #evict(keep: Entry): void {
    while (this.#entries.size > this.#maxEntries) {
      let oldest: [string, Entry] | undefined;
      for (const pair of this.#entries) {
        if (
          pair[1] !== keep &&
          (!oldest || pair[1].touched < oldest[1].touched)
        ) {
          oldest = pair;
        }
      }
      if (!oldest) {
        return;
      }
      this.#entries.delete(oldest[0]);
    }
  }
}
