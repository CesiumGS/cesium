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

/** A fit made a step at a time (a generator yielding after each step, returning the lattice), so a frame's budget can cut it short and a later frame resume it. */
export type FitSteps = Generator<void, CubicLattice, void>;

/** A queued fit: the lattice at once, or the steps that make it. */
export type FitJob = () => CubicLattice | FitSteps;

interface Entry {
  readonly id: string;
  readonly key: string;
  /** The last fit made, for drawing while a newer one is pending. */
  lattice: CubicLattice | undefined;
  /** The route revision `lattice` was fitted at. */
  fitted: number;
  /** The queued fit and the revision it is for. */
  job: FitJob | undefined;
  revision: number;
  /** A fit begun and not finished, with the revision it is for. */
  running: { readonly steps: FitSteps; readonly revision: number } | undefined;
  /** Last `request`, for LRU and for newest-first running. */
  touched: number;
}

function isSteps(made: CubicLattice | FitSteps): made is FitSteps {
  return typeof (made as FitSteps).next === "function";
}

export class WarpFitCache {
  readonly #entries = new Map<string, Entry>();
  /** The ids of each key's entries, one for each variant it was requested under. */
  readonly #byKey = new Map<string, Set<string>>();
  /** The entries with a fit queued or begun. */
  readonly #queued = new Set<Entry>();
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

  /** Fits queued and not yet finished. */
  get pending(): number {
    return this.#queued.size;
  }

  /** Entries held. */
  get size(): number {
    return this.#entries.size;
  }

  /**
   * The fit for `key` under `variant` at route `revision`: the current one,
   * or (queueing `job`) the previous one, stale but drawable, or `undefined`
   * when there never was one. A request is the newest, to run first. A fit
   * under another variant is never taken: it is of another displacement. A
   * fit already begun for this revision goes on where it was.
   */
  request(
    key: string,
    variant: string,
    revision: number,
    job: FitJob,
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
        running: undefined,
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
      e.running = undefined;
    } else if (e.running?.revision !== revision) {
      e.running = undefined;
      e.job = job;
      e.revision = revision;
    }
    this.#track(e);
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
   * Runs queued fits, newest request first, a step at a time, until
   * `budgetMs` is spent: a fit made in steps stops between two and goes on
   * in a later call. At least one step (or one fit made at once) runs per
   * call when any is queued, so a budget below one still makes progress. A
   * job that throws is dropped and its error rethrown; the others stay
   * queued. Returns how many fits finished.
   */
  run(budgetMs: number, now: () => number = () => performance.now()): number {
    const start = now();
    let ran = 0;
    do {
      let e: Entry | undefined;
      for (const queued of this.#queued) {
        if (!e || queued.touched > e.touched) {
          e = queued;
        }
      }
      if (!e) {
        break;
      }
      let lattice: CubicLattice | undefined;
      let revision = e.revision;
      try {
        if (!e.running) {
          const job = e.job!;
          e.job = undefined;
          const made = job();
          if (isSteps(made)) {
            e.running = { steps: made, revision };
          } else {
            lattice = made;
          }
        }
        if (e.running) {
          revision = e.running.revision;
          const step = e.running.steps.next();
          if (step.done) {
            lattice = step.value;
            e.running = undefined;
          }
        }
      } catch (error) {
        e.running = undefined;
        this.#track(e);
        throw error;
      }
      if (lattice) {
        ran++;
        if (this.#entries.get(e.id) === e) {
          e.lattice = lattice;
          e.fitted = revision;
        }
      }
      this.#track(e);
    } while (now() - start < budgetMs);
    return ran;
  }

  /** Drops every fit and queued job for `key`, under any variant. */
  forget(key: string): void {
    for (const id of this.#byKey.get(key) ?? []) {
      const e = this.#entries.get(id);
      if (e) {
        this.#queued.delete(e);
      }
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
    e.running = undefined;
    this.#track(e);
  }

  clear(): void {
    this.#entries.clear();
    this.#byKey.clear();
    this.#queued.clear();
  }

  /** Keeps `#queued` to the entries with a fit to run. */
  #track(e: Entry): void {
    if (e.job || e.running) {
      this.#queued.add(e);
    } else {
      this.#queued.delete(e);
    }
  }

  #drop(e: Entry): void {
    this.#entries.delete(e.id);
    this.#queued.delete(e);
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
