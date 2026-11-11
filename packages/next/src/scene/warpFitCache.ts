// Fits kept per (item, variant): the variant is what the fit's displacement
// depends on besides the item (the world names it by the route's shape, not
// the render root, so a re-root that leaves it alone reuses the fit). Made lazily within a frame's budget (plan
// §13.26, the second review, flaw 8): a route whose revision moved is
// refitted on a budget, and until its new fit lands the stale one is drawn.
//
// Main thread for now. Warps are JS closures, which a worker can't be sent,
// so fitting off-thread needs serialisable warps (later).
import type { CubicLattice } from "./warpTerms.ts";

/** A fit made for a key, as `WarpFitCache.take` hands it back. */
export interface WarpFit {
  readonly variant: string;
  readonly lattice: CubicLattice;
  /** The revision it was fitted at. */
  readonly fitted: number;
}

interface Entry {
  readonly id: string;
  readonly key: string;
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
  /** The ids of each key's entries, one for each variant it was requested under. */
  readonly #byKey = new Map<string, Set<string>>();
  readonly #maxEntries: number;
  readonly #maxVariants: number;
  #clock = 0;

  /**
   * `maxEntries` bounds the cache; `maxVariants` bounds the variants (what a
   * fit was made for besides its key: a root, a route's shape) kept for one
   * key, dropping the least recently requested.
   */
  constructor(maxEntries = 512, maxVariants = Infinity) {
    if (!(maxEntries >= 1)) {
      throw new RangeError(`WarpFitCache: maxEntries is ${maxEntries}`);
    }
    if (!(maxVariants >= 1)) {
      throw new RangeError(`WarpFitCache: maxVariants is ${maxVariants}`);
    }
    this.#maxEntries = Math.floor(maxEntries);
    this.#maxVariants = maxVariants;
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
   * The fit for `key` under `variant` at route `revision`: the current one,
   * or (queueing `job`) the previous one, stale but drawable, or `undefined`
   * when there never was one. A request is the newest, to run first. A fit
   * under another variant is never taken: it is of another displacement.
   */
  request(
    key: string,
    variant: string,
    revision: number,
    job: () => CubicLattice,
  ): CubicLattice | undefined {
    const id = `${variant}\u0000${key}`;
    let e = this.#entries.get(id);
    if (!e) {
      e = {
        id,
        key,
        lattice: undefined,
        fitted: NaN,
        job: undefined,
        revision,
        touched: 0,
      };
      this.#entries.set(id, e);
      let ids = this.#byKey.get(key);
      if (!ids) {
        ids = new Set();
        this.#byKey.set(key, ids);
      }
      ids.add(id);
    }
    e.touched = ++this.#clock;
    if (e.lattice && e.fitted === revision) {
      e.job = undefined;
    } else {
      e.job = job;
      e.revision = revision;
    }
    const lattice = e.lattice;
    this.#trimVariants(e);
    this.#evict(e);
    return lattice;
  }

  /**
   * The fit for `key` under `variant` if it is current at `revision` (no
   * queueing, no touching): a pending fit's result, once `run` has made it.
   */
  current(
    key: string,
    variant: string,
    revision: number,
  ): CubicLattice | undefined {
    const e = this.#entries.get(`${variant}\u0000${key}`);
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

  /** Drops every fit and queued job for `key`, under any variant. */
  forget(key: string): void {
    for (const id of this.#byKey.get(key) ?? []) {
      this.#entries.delete(id);
    }
    this.#byKey.delete(key);
  }

  /** Removes `key`'s fits (not its queued jobs) and returns them, to `restore` later. */
  take(key: string): WarpFit[] {
    const fits: WarpFit[] = [];
    for (const id of this.#byKey.get(key) ?? []) {
      const e = this.#entries.get(id);
      if (e?.lattice) {
        fits.push({
          variant: id.slice(0, id.indexOf("\u0000")),
          lattice: e.lattice,
          fitted: e.fitted,
        });
      }
    }
    this.forget(key);
    return fits;
  }

  /** Puts back a fit `take` returned, with no job queued. */
  restore(key: string, fit: WarpFit): void {
    this.request(key, fit.variant, fit.fitted, () => fit.lattice);
    const e = this.#entries.get(`${fit.variant}\u0000${key}`)!;
    e.lattice = fit.lattice;
    e.fitted = fit.fitted;
    e.job = undefined;
  }

  clear(): void {
    this.#entries.clear();
    this.#byKey.clear();
  }

  #drop(e: Entry): void {
    this.#entries.delete(e.id);
    const ids = this.#byKey.get(e.key);
    ids?.delete(e.id);
    if (ids?.size === 0) {
      this.#byKey.delete(e.key);
    }
  }

  /** Over the variants one key keeps, drops its least recently requested, never `keep`. */
  #trimVariants(keep: Entry): void {
    const ids = this.#byKey.get(keep.key)!;
    while (ids.size > this.#maxVariants) {
      let oldest: Entry | undefined;
      for (const id of ids) {
        const e = this.#entries.get(id)!;
        if (e !== keep && (!oldest || e.touched < oldest.touched)) {
          oldest = e;
        }
      }
      if (!oldest) {
        return;
      }
      this.#drop(oldest);
    }
  }

  /** Over the cap, drops the least recently requested, never `keep`. */
  #evict(keep: Entry): void {
    while (this.#entries.size > this.#maxEntries) {
      let oldest: Entry | undefined;
      for (const e of this.#entries.values()) {
        if (e !== keep && (!oldest || e.touched < oldest.touched)) {
          oldest = e;
        }
      }
      if (!oldest) {
        return;
      }
      this.#drop(oldest);
    }
  }
}
