// The job system behind the content workers (docs/design/job-system.md): jobs with a
// priority, dependencies and cancellation run on the workers, and their
// main-thread steps run in one apply phase of the engine's loop, within a
// time budget.
import { jobMemory, type JobMemory } from "./sharedMemory.ts";

/** Where a job is. */
export type JobState =
  /** Waiting for the jobs it runs after (`JobSpec.after`). */
  | "waiting"
  /** Ready, waiting for a worker. */
  | "queued"
  /** Posted to a worker. */
  | "running"
  /** Its result arrived and waits for the apply phase. */
  | "done"
  /** Applied (or, without an apply step, arrived): its promise resolved. */
  | "applied"
  | "cancelled"
  | "failed";

/**
 * One job: a request type the content worker knows (`worker.ts`), a pure
 * function of its payload whose large arrays are transferred, and what the
 * main thread does with its result.
 */
export interface JobSpec<R = unknown, A = R> {
  /** The worker's request type. */
  type: string;
  /**
   * The request's fields, or a function of what the jobs it runs after
   * applied (in `after`'s order), called when it is posted.
   */
  payload?:
    | Record<string, unknown>
    | ((after: readonly unknown[]) => Record<string, unknown>);
  /** Buffers the payload hands over rather than copies. */
  transfer?: (payload: Record<string, unknown>) => Transferable[];
  /**
   * Lower runs sooner: the tileset's request priority (band plus distance,
   * `Budgeted`). A function is read each time the queue or the apply phase
   * orders its jobs, so a job follows its tile's priority. Default 0.
   */
  priority?: number | (() => number);
  /** Aborting it cancels the job wherever it is (see `Job.cancel`). */
  signal?: AbortSignal;
  /**
   * Jobs this one runs after: it is posted once they all applied, and is
   * cancelled (or fails) when one of them is.
   */
  after?: readonly Job[];
  /**
   * The main-thread step, run in the apply phase (`Jobs.apply`) in priority
   * order within its budget; the job's promise resolves with what it
   * returns. Without one, the promise resolves as the result arrives.
   */
  apply?: (result: R) => A;
  /** Releases a result that won't be applied (an image to close). */
  discard?: (result: R) => void;
  /**
   * The job mostly waits on the network (a fetch then a decode): it is not
   * held to `cpuPerWorker`. The requests' own scheduler bounds how many
   * are in flight (`RequestScheduler`).
   */
  io?: boolean;
}

/** A submitted job. */
export interface Job<A = unknown> {
  readonly id: number;
  readonly type: string;
  readonly state: JobState;
  /** Resolves with the apply step's value; rejects with an AbortError when cancelled. */
  readonly promise: Promise<A>;
  /**
   * Cancels it: a queued job never runs, a running one is told to stop
   * (its fetches abort), an arrived result is discarded, and the jobs that
   * run after it are cancelled too. Nothing once applied.
   */
  cancel(): void;
}

/**
 * A progressive job on this thread: a resumable walk that hands back a
 * usable partial result as it goes (each a sound bound that only tightens,
 * say), run in slices of the apply phase's budget. The body occluder's
 * walk (`BoundJob`) has this shape; so would imagery compositing or a
 * progressive renderer's accumulation.
 */
export interface SliceSpec<P> {
  /** For the inspector and the costs it learns. */
  type: string;
  /**
   * Runs for at most about `budgetMs`: the partial result, when a new one
   * is ready, and whether the walk is done.
   */
  step(budgetMs: number): { partial?: P; done: boolean };
  /** Each new partial result, as soon as its slice ends (`done` on the last). */
  onPartial?: (partial: P, done: boolean) => void;
  /** Lower runs sooner (as `JobSpec.priority`). */
  priority?: number | (() => number);
  /** Aborting it cancels the walk (its inputs changed: start a new one). */
  signal?: AbortSignal;
  /** Called once when it is cancelled: release the walk (a generator's `return`). */
  cancel?: () => void;
}

/** A message to a worker. */
export type JobMessage = { id: number; type: string } & Record<string, unknown>;

/** A worker's reply. */
export interface JobReply {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

/** The workers the jobs run on (`WorkerPool`; a fake in tests). */
export interface JobPort {
  /** Most workers; worker `i` starts on its first message. */
  readonly size: number;
  post(worker: number, message: JobMessage, transfer: Transferable[]): void;
}

/** The job system's counts, for the inspector (`FrameStats.jobs`). */
export interface JobStats {
  /**
   * How kept data reaches the workers (`sharedMemory`): "shared" with
   * cross-origin isolation, else "transfer" (transferred or copied). The
   * jobs' API is the same either way.
   */
  memory: JobMemory;
  /** Waiting for other jobs, or for a worker. */
  queued: number;
  /** On a worker. */
  running: number;
  /** Arrived, waiting for the apply phase. */
  waiting: number;
  /** Progressive jobs taking slices of the apply phase (`Jobs.slice`). */
  slicing: number;
  /** Applied by the latest apply phase. */
  applied: number;
  /** The latest apply phase's time, ms. */
  applyMs: number;
  /** Applied since start. */
  appliedTotal: number;
  /** Cancelled since start. */
  cancelledTotal: number;
}

/** CPU jobs one worker holds at once: one runs, the next waits in its queue. */
export const CPU_PER_WORKER = 2;

interface Entry {
  readonly id: number;
  readonly spec: JobSpec<unknown, unknown>;
  state: JobState;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  worker: number;
  result: unknown;
  value: unknown;
  error: Error | undefined;
  /** Of `after`, how many haven't applied. */
  blockers: number;
  readonly dependents: Entry[];
  readonly job: Job;
  unlisten: () => void;
}

const abortError = () => new DOMException("Aborted", "AbortError");

/**
 * Runs jobs on a port's workers. Ready jobs wait in one queue, ordered by
 * priority each time it is read; an idle worker takes the most urgent one,
 * so there is no per-worker queue for another to steal from (docs/design/job-system.md). Each
 * job's main-thread step runs in `apply`, the engine's apply phase, or at
 * once while no loop has taken the phase (`phased`).
 */
export class Jobs {
  /**
   * The engine's loop runs the apply phase (`apply`). While false, a
   * result is applied as it arrives, as before the job system.
   */
  get phased(): boolean {
    return this.phased_;
  }
  set phased(on: boolean) {
    this.phased_ = on;
    if (!on) {
      this.apply(Infinity);
    }
  }
  private phased_ = false;
  /** Called when results wait for the apply phase (the engine wakes). */
  onReady: (() => void) | undefined;

  /** Live jobs by id (what a reply names). */
  private readonly entries = new Map<number, Entry>();
  /** Every job by its handle: a later job's `after` reads values here. */
  private readonly byJob = new WeakMap<Job, Entry>();
  private readonly ready: Entry[] = [];
  private readonly done: Entry[] = [];
  /** Progressive jobs on this thread (`slice`), in submission order. */
  private readonly slices: SliceEntry[] = [];
  /** Cancelled while running: kept until the worker replies (its load holds). */
  private readonly orphans = new Map<number, Entry>();
  private readonly cpuLoad: number[] = [];
  private readonly ioLoad: number[] = [];
  private started = 0;
  private nextId = 1;
  /** The apply step's cost per job type, ms (smoothed): what the budget expects. */
  private readonly costs = new Map<string, number>();
  /** How kept data reaches the workers, fixed for the page (`JobStats.memory`). */
  readonly memory: JobMemory = jobMemory();
  private readonly counts: JobStats = {
    memory: this.memory,
    slicing: 0,
    queued: 0,
    running: 0,
    waiting: 0,
    applied: 0,
    applyMs: 0,
    appliedTotal: 0,
    cancelledTotal: 0,
  };

  constructor(
    private readonly port: JobPort,
    private readonly cpuPerWorker = CPU_PER_WORKER,
    private readonly now: () => number = () => performance.now(),
  ) {}

  submit<R, A = R>(spec: JobSpec<R, A>): Job<A> {
    const id = this.nextId++;
    let resolve!: (value: unknown) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<A>((res, rej) => {
      resolve = res as (value: unknown) => void;
      reject = rej;
    });
    const entry: Entry = {
      id,
      spec: spec as JobSpec<unknown, unknown>,
      state: "waiting",
      resolve,
      reject,
      worker: -1,
      result: undefined,
      value: undefined,
      error: undefined,
      blockers: 0,
      dependents: [],
      job: {
        id,
        type: spec.type,
        get state() {
          return entry.state;
        },
        promise,
        cancel: () => this.cancel(entry),
      },
      unlisten: () => {},
    };
    this.entries.set(id, entry);
    this.byJob.set(entry.job, entry);
    if (spec.signal?.aborted) {
      this.cancel(entry);
      return entry.job as Job<A>;
    }
    if (spec.signal) {
      const signal = spec.signal;
      const onAbort = () => this.cancel(entry);
      signal.addEventListener("abort", onAbort, { once: true });
      entry.unlisten = () => signal.removeEventListener("abort", onAbort);
    }
    for (const job of spec.after ?? []) {
      const before = this.byJob.get(job);
      if (job.state === "applied") {
        continue;
      }
      if (job.state === "cancelled" || !before) {
        this.cancel(entry);
        return entry.job as Job<A>;
      }
      if (job.state === "failed") {
        this.fail(entry, dependencyError(before.error));
        return entry.job as Job<A>;
      }
      entry.blockers++;
      before.dependents.push(entry);
    }
    if (entry.blockers === 0) {
      entry.state = "queued";
      this.ready.push(entry);
      this.pump();
    }
    return entry.job as Job<A>;
  }

  /**
   * Submits a progressive job on this thread (`SliceSpec`). It takes slices
   * of the apply phase's budget after the arrived results, most urgent
   * first, and its promise resolves with its last partial result when it is
   * done. While no loop runs the phase (`phased`), it runs to the end now.
   */
  slice<P>(spec: SliceSpec<P>): Job<P | undefined> {
    const id = this.nextId++;
    let resolve!: (value: P | undefined) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<P | undefined>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const slice: SliceEntry = {
      id,
      spec: spec as SliceSpec<unknown>,
      state: "queued",
      last: undefined,
      resolve: resolve as (value: unknown) => void,
      reject,
      unlisten: () => {},
      job: {
        id,
        type: spec.type,
        get state() {
          return slice.state;
        },
        promise,
        cancel: () => this.cancelSlice(slice),
      },
    };
    if (spec.signal?.aborted) {
      this.cancelSlice(slice);
      return slice.job as Job<P | undefined>;
    }
    if (spec.signal) {
      const signal = spec.signal;
      const onAbort = () => this.cancelSlice(slice);
      signal.addEventListener("abort", onAbort, { once: true });
      slice.unlisten = () => signal.removeEventListener("abort", onAbort);
    }
    this.slices.push(slice);
    if (this.phased_) {
      this.onReady?.();
    } else {
      this.stepSlice(slice, Infinity);
    }
    return slice.job as Job<P | undefined>;
  }

  /** A worker's reply to job `reply.id`. */
  reply(reply: JobReply): void {
    const orphan = this.orphans.get(reply.id);
    if (orphan) {
      // Cancelled while it ran: its worker is free now.
      this.orphans.delete(reply.id);
      this.release(orphan);
      if (reply.ok) {
        orphan.spec.discard?.(reply.result);
      }
      this.pump();
      return;
    }
    const entry = this.entries.get(reply.id);
    if (!entry || entry.state !== "running") {
      return;
    }
    this.release(entry);
    if (!reply.ok) {
      this.fail(entry, new Error(reply.error));
    } else if (entry.spec.apply && this.phased_) {
      entry.state = "done";
      entry.result = reply.result;
      this.done.push(entry);
      this.onReady?.();
    } else {
      entry.result = reply.result;
      this.applyOne(entry);
    }
    this.pump();
  }

  /**
   * The apply phase: arrived results' main-thread steps, most urgent first,
   * until `budgetMs` is spent. At least one runs, so a step longer than the
   * budget still makes progress; after the first, a step expected (from its
   * type's recent cost) to overrun waits for the next phase. Returns how
   * many applied.
   */
  apply(budgetMs: number): number {
    const start = this.now();
    let applied = 0;
    if (this.done.length > 1) {
      sortByPriority(this.done);
    }
    while (this.done.length > 0) {
      const elapsed = this.now() - start;
      const next = this.done[0]!;
      if (
        applied > 0 &&
        elapsed + (this.costs.get(next.spec.type) ?? 0) > budgetMs
      ) {
        break;
      }
      this.done.shift();
      const t0 = this.now();
      this.applyOne(next);
      const cost = this.now() - t0;
      const previous = this.costs.get(next.spec.type);
      this.costs.set(
        next.spec.type,
        previous === undefined ? cost : previous * 0.8 + cost * 0.2,
      );
      applied++;
    }
    // Progressive jobs share what is left, most urgent first; the first
    // gets a slice even when the results spent it all.
    if (this.slices.length > 0) {
      const order = sortSlices(this.slices);
      for (let i = 0; i < order.length; i++) {
        const left = budgetMs - (this.now() - start);
        if (left <= 0 && (i > 0 || applied > 0)) {
          break;
        }
        this.stepSlice(order[i]!, Math.max(left, 0));
      }
    }
    this.counts.applied = applied;
    this.counts.applyMs = this.now() - start;
    this.pump();
    return applied;
  }

  /** How much main-thread work waits for the apply phase: results and slices. */
  get waiting(): number {
    return this.done.length + this.slices.length;
  }

  get stats(): JobStats {
    let queued = 0;
    let running = 0;
    for (const entry of this.entries.values()) {
      if (entry.state === "waiting" || entry.state === "queued") {
        queued++;
      } else if (entry.state === "running") {
        running++;
      }
    }
    return {
      ...this.counts,
      queued,
      running: running + this.orphans.size,
      waiting: this.done.length,
      slicing: this.slices.length,
    };
  }

  /** Cancels every job (AbortError). */
  destroy(): void {
    for (const entry of [...this.entries.values()]) {
      this.cancel(entry);
    }
    for (const slice of [...this.slices]) {
      this.cancelSlice(slice);
    }
    this.orphans.clear();
  }

  /** Posts ready jobs, most urgent first, while workers have room. */
  private pump(): void {
    if (this.ready.length === 0) {
      return;
    }
    sortByPriority(this.ready);
    let cpuFull = false;
    for (let i = 0; i < this.ready.length;) {
      const entry = this.ready[i]!;
      const io = entry.spec.io === true;
      if (!io && cpuFull) {
        i++;
        continue;
      }
      const worker = this.pickWorker(io);
      if (worker < 0) {
        cpuFull = true;
        i++;
        continue;
      }
      this.ready.splice(i, 1);
      this.post(entry, worker);
    }
  }

  /**
   * The worker for a job: an idle started one, else a new one while there
   * is room, else the least loaded (a CPU job only where it has room under
   * `cpuPerWorker`). -1: none can take a CPU job now.
   */
  private pickWorker(io: boolean): number {
    let best = -1;
    let bestLoad = Infinity;
    for (let w = 0; w < this.started; w++) {
      const load = this.cpuLoad[w]! + this.ioLoad[w]!;
      if (!io && this.cpuLoad[w]! >= this.cpuPerWorker) {
        continue;
      }
      if (load < bestLoad) {
        best = w;
        bestLoad = load;
      }
    }
    if ((best < 0 || bestLoad > 0) && this.started < this.port.size) {
      const w = this.started++;
      this.cpuLoad[w] = 0;
      this.ioLoad[w] = 0;
      return w;
    }
    return best;
  }

  private post(entry: Entry, worker: number): void {
    const spec = entry.spec;
    let payload: Record<string, unknown>;
    try {
      payload =
        typeof spec.payload === "function"
          ? spec.payload(spec.after?.map((job) => this.valueOf(job)) ?? [])
          : (spec.payload ?? {});
    } catch (error) {
      this.fail(entry, asError(error));
      return;
    }
    entry.state = "running";
    entry.worker = worker;
    (spec.io ? this.ioLoad : this.cpuLoad)[worker]!++;
    this.port.post(
      worker,
      { ...payload, id: entry.id, type: spec.type },
      spec.transfer?.(payload) ?? [],
    );
  }

  private valueOf(job: Job): unknown {
    return this.byJob.get(job)?.value;
  }

  private release(entry: Entry): void {
    if (entry.worker >= 0) {
      (entry.spec.io ? this.ioLoad : this.cpuLoad)[entry.worker]!--;
      entry.worker = -1;
    }
  }

  private applyOne(entry: Entry): void {
    let value: unknown;
    try {
      value = entry.spec.apply ? entry.spec.apply(entry.result) : entry.result;
    } catch (error) {
      this.fail(entry, asError(error));
      return;
    }
    entry.result = undefined;
    entry.value = value;
    entry.state = "applied";
    entry.unlisten();
    this.counts.appliedTotal++;
    this.entries.delete(entry.id);
    entry.resolve(value);
    for (const dependent of entry.dependents) {
      if (dependent.state === "waiting" && --dependent.blockers === 0) {
        dependent.state = "queued";
        this.ready.push(dependent);
      }
    }
    entry.dependents.length = 0;
  }

  /** One slice of a progressive job: its partial goes out at once. */
  private stepSlice(slice: SliceEntry, budgetMs: number): void {
    slice.state = "running";
    do {
      let out: { partial?: unknown; done: boolean };
      try {
        out = slice.spec.step(budgetMs);
      } catch (error) {
        this.endSlice(slice, "failed");
        slice.reject(asError(error));
        return;
      }
      if (slice.state !== "running") {
        return; // cancelled from inside its step or a listener
      }
      if ("partial" in out && out.partial !== undefined) {
        slice.last = out.partial;
        slice.spec.onPartial?.(out.partial, out.done);
      }
      if (out.done) {
        this.endSlice(slice, "applied");
        this.counts.appliedTotal++;
        slice.resolve(slice.last);
        return;
      }
    } while (budgetMs === Infinity);
    slice.state = "queued";
  }

  private endSlice(slice: SliceEntry, state: JobState): void {
    slice.state = state;
    slice.unlisten();
    const at = this.slices.indexOf(slice);
    if (at >= 0) {
      this.slices.splice(at, 1);
    }
  }

  private cancelSlice(slice: SliceEntry): void {
    if (
      slice.state === "applied" ||
      slice.state === "cancelled" ||
      slice.state === "failed"
    ) {
      return;
    }
    this.endSlice(slice, "cancelled");
    this.counts.cancelledTotal++;
    slice.spec.cancel?.();
    slice.reject(abortError());
  }

  private cancel(entry: Entry): void {
    const state = entry.state;
    if (state === "applied" || state === "cancelled" || state === "failed") {
      return;
    }
    if (state === "queued") {
      this.ready.splice(this.ready.indexOf(entry), 1);
    } else if (state === "running") {
      this.port.post(entry.worker, { id: entry.id, type: "cancel" }, []);
      this.orphans.set(entry.id, entry);
    } else if (state === "done") {
      this.done.splice(this.done.indexOf(entry), 1);
      entry.spec.discard?.(entry.result);
      entry.result = undefined;
    }
    entry.state = "cancelled";
    this.counts.cancelledTotal++;
    this.settle(entry);
    entry.reject(abortError());
    for (const dependent of entry.dependents.splice(0)) {
      this.cancel(dependent);
    }
  }

  private fail(entry: Entry, error: Error): void {
    if (entry.state === "running") {
      this.release(entry);
    }
    if (entry.state === "queued") {
      this.ready.splice(this.ready.indexOf(entry), 1);
    }
    entry.state = "failed";
    entry.error = error;
    entry.result = undefined;
    this.settle(entry);
    entry.reject(error);
    for (const dependent of entry.dependents.splice(0)) {
      this.fail(dependent, dependencyError(error));
    }
  }

  private settle(entry: Entry): void {
    entry.unlisten();
    this.entries.delete(entry.id);
  }
}

interface SliceEntry {
  readonly id: number;
  readonly spec: SliceSpec<unknown>;
  state: JobState;
  last: unknown;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  unlisten: () => void;
  readonly job: Job;
}

/** A copy, most urgent first; equal priorities keep submission order. */
function sortSlices(slices: readonly SliceEntry[]): SliceEntry[] {
  const keys = new Map<SliceEntry, number>();
  for (const slice of slices) {
    const p = slice.spec.priority;
    keys.set(slice, typeof p === "function" ? p() : (p ?? 0));
  }
  return [...slices].sort((a, b) => keys.get(a)! - keys.get(b)! || a.id - b.id);
}

function priorityOf(entry: Entry): number {
  const p = entry.spec.priority;
  return typeof p === "function" ? p() : (p ?? 0);
}

/** In place, most urgent first; equal priorities keep submission order. */
function sortByPriority(entries: Entry[]): void {
  const keys = new Map<Entry, number>();
  for (const entry of entries) {
    keys.set(entry, priorityOf(entry));
  }
  entries.sort((a, b) => keys.get(a)! - keys.get(b)! || a.id - b.id);
}

function dependencyError(cause: Error | undefined): Error {
  return new Error(`a job it runs after failed: ${cause?.message ?? "?"}`);
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
