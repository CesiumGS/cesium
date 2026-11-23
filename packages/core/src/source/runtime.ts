/**
 * The engine's side of the content-source seam (CS-847): kinds and
 * resolvers, `open`, one `SourceHost` per source, the tick that updates
 * every placed source and then arbitrates the budget, and pushes applied in
 * the apply phase.
 *
 * - **Open:** a reference goes through the resolvers (the host's, then
 *   plain URLs), the registry picks the kind, its decoders load into every
 *   worker, and the kind opens the source over its host.
 * - **Tick:** each source whose content an item shows gets `update` with
 *   its views, its clock (its world's scene time, and wall time apart:
 *   CS-960 A), its grant and the invalidations since; then the arbiter
 *   grants this tick's wants (`BudgetArbiter`).
 * - **Push:** `host.changed` queues the change and wakes the engine; it
 *   applies in the apply phase (`Jobs.slice`), under the phase's budget: what
 *   doesn't fit waits for the next tick's phase. Samples carry their times:
 *   in real time they apply as they arrive; on a stepped clock (CS-816) they
 *   wait until their world's scene time reaches them, so a replayed feed
 *   gives the same rows.
 *   The engine never polls a source (CS-863: a source may poll its own server).
 * - **Bounds:** between ticks a source may queue at most `MAX_QUEUED_CHANGES`
 *   changes; past that its queued invalidations collapse into one
 *   invalidation of everything (it reloads, reported). Its queued change sets
 *   (`features`) stay, since a reload doesn't replay others' edits; once its
 *   queue holds nothing else, a further change set is dropped, and that is
 *   reported plainly. At most `MAX_BUFFERED_SAMPLES` samples wait for their
 *   times; a push past that is dropped, reported once per run of drops.
 * - **Close:** destroying content cancels its source's jobs, and its sinks
 *   and `jobs.submit` throw from then on; its pushes are dropped.
 */
import type { FetchProvider } from "../io/fetchProvider.ts";
import type { Job, Jobs, JobSpec } from "../io/Jobs.ts";
import { BudgetArbiter, type BudgetOptions } from "./budget.ts";
import { MAX_PENDING_OVERRIDES, SourceContent } from "./content.ts";
import {
  checkChangeSet,
  type ChangeSet,
  type FeatureData,
  type FeaturePatch,
} from "./editing.ts";
import {
  SourceKinds,
  UrlResolver,
  moduleHref,
  type KindRef,
  type ModuleLoader,
} from "./registry.ts";
import { assetSource } from "./sinks.ts";
import type {
  AssetRef,
  AssetResolver,
  BudgetClient,
  ContentSinks,
  ContentSource,
  FeatureId,
  PlainValue,
  SampleBatch,
  SourceChange,
  SourceClock,
  SourceHost,
  SourceJobs,
  SourceJobSpec,
  SourceView,
} from "./types.ts";

/** Most changes one source may queue between apply phases. */
export const MAX_QUEUED_CHANGES = 10_000;

/** Most samples that may wait for their times, every source together. */
export const MAX_BUFFERED_SAMPLES = 100_000;

/** The worker pool, as the runtime uses it (`WorkerPool`). */
export interface DecoderPool {
  readonly jobs: Pick<Jobs, "slice">;
  submit<R, A = R>(spec: JobSpec<R, A>): Job<A>;
  loadDecoder(jobType: string, url: string | URL): void;
}

/**
 * What the runtime needs of its engine.
 * @internal
 */
export interface SourceRuntimeOptions {
  readonly pool: DecoderPool;
  /** Wakes the engine's loop. */
  readonly wake?: () => void;
  /** The provider every request goes through (default: `FetchProvider.default`, read when asked). */
  readonly fetch: () => FetchProvider;
  /**
   * The clock `content`'s source sees: its world's scene time, and the
   * engine's wall time apart; or a test's fake (until CS-816's stepped clock).
   */
  readonly clock: (content: SourceContent) => SourceClock;
  /** The views that show `content`. */
  readonly views?: (content: SourceContent) => readonly SourceView[];
  readonly budget?: BudgetOptions;
  /** How a kind's module is imported (default: `import()`). */
  readonly load?: ModuleLoader;
  /** Where a source's failure or a dropped change is reported. */
  readonly report?: (message: string) => void;
  /**
   * Whether a world's item holds `key`: a content ID derived from its
   * source skips it, as a second item of a tileset takes an ordinal.
   */
  readonly itemKeyTaken?: (key: string) => boolean;
}

/**
 * What `Engine.open` takes besides the reference.
 * @experimental
 */
export interface OpenOptions {
  /** The content's ID, for its rows' stable IDs and change sets' `source`. Default: its canonical source. */
  readonly id?: string;
  readonly signal?: AbortSignal;
}

interface Opened {
  readonly content: SourceContent;
  readonly client: BudgetClient;
  /** Its source's jobs not yet settled: canceled when it closes. */
  readonly jobs: Set<Job<unknown>>;
  /** Its changes in the queue now (`MAX_QUEUED_CHANGES`). */
  queued: number;
  /** Of those, change sets (`features`), which a collapse keeps. */
  queuedSets: number;
  /** Of those, invalidations of everything. */
  queuedAll: number;
  /** What its queue's overflow reported (once each until its queue drains). */
  readonly overflowReported: Set<"collapsed" | "dropped">;
}

interface BufferedSample {
  readonly opened: Opened;
  readonly samples: SampleBatch;
  readonly index: number;
  readonly time: number;
  readonly seq: number;
}

/**
 * Kinds, resolvers and every open source of one engine (`Engine.sources`).
 * @experimental
 */
export class SourceRuntime {
  readonly kinds: SourceKinds;
  readonly budget: BudgetArbiter;
  private readonly resolvers: AssetResolver[] = [];
  private readonly url = new UrlResolver();
  private readonly opened: Opened[] = [];
  /**
   * Changes waiting for the apply phase, in arrival order (samples aside),
   * from `queueHead` on: applied ones are skipped, not shifted out.
   */
  private queue: { opened: Opened; change: SourceChange }[] = [];
  private queueHead = 0;
  /**
   * Samples waiting for their times, from `samplesHead` on, in time order
   * (then arrival) once `samplesSorted`: the due ones are a prefix, so a
   * tick reads one sample to know whether any is due.
   */
  private samples: BufferedSample[] = [];
  private samplesHead = 0;
  private samplesSorted = true;
  /** A push of samples was dropped at the bound; cleared by one that fits. */
  private samplesDropping = false;
  private seq = 0;
  private applyScheduled = false;
  private destroyed = false;

  /** @internal Use `Engine.sources`. */
  constructor(private readonly options: SourceRuntimeOptions) {
    this.kinds = new SourceKinds(options.load);
    this.budget = new BudgetArbiter(options.budget, (message) =>
      this.reportMessage(message),
    );
  }

  /**
   * Registers a kind by module reference (`{ id, module: new URL(…, import.meta.url) }`).
   * @experimental
   */
  registerKind(ref: KindRef): void {
    this.kinds.register(ref);
  }

  /**
   * Adds a resolver, asked before those added earlier and before plain URLs.
   * @experimental
   */
  addResolver(resolver: AssetResolver): void {
    if (this.resolvers.some((r) => r.id === resolver.id)) {
      throw new Error(
        `addResolver: a resolver "${resolver.id}" is added already.`,
      );
    }
    this.resolvers.unshift(resolver);
  }

  /**
   * @internal Whether an open content's item key is `key` in `world`: its
   * content ID, while it is open and in that world or in none yet. A tileset
   * item's derived key there skips it.
   */
  reservesItemKey(key: string, world: unknown): boolean {
    return this.opened.some(
      ({ content }) =>
        content.id === key &&
        (content.world === undefined || content.world === world),
    );
  }

  /** Every open content, in the order opened. */
  get contents(): readonly SourceContent[] {
    return this.opened.map((o) => o.content);
  }

  /**
   * Resolves `ref`, picks its kind, opens the source and returns its
   * content, for `World.add` to place.
   * @experimental
   */
  async open(ref: AssetRef, options: OpenOptions = {}): Promise<SourceContent> {
    const init = options.signal ? { signal: options.signal } : {};
    const resolver =
      this.resolvers.find((r) => r.accepts(ref)) ??
      (this.url.accepts(ref) ? this.url : undefined);
    if (!resolver) {
      throw new Error("open: no resolver accepts the reference.");
    }
    const asset = await resolver.resolve(ref, init);
    options.signal?.throwIfAborted();
    const kind = await this.kinds.pick(asset);
    options.signal?.throwIfAborted();
    if (this.destroyed) {
      throw new Error("open: the engine is destroyed.");
    }
    const types = new Set<string>();
    for (const decoder of kind.decoders ?? []) {
      this.options.pool.loadDecoder(decoder.type, moduleHref(decoder.module));
      types.add(decoder.type);
    }
    const content = new SourceContent(
      this.contentId(options.id, assetSource(asset, kind.identity)),
      asset,
      kind.id,
      kind.identity,
    );
    const client = this.budget.client();
    const opened: Opened = {
      content,
      client,
      jobs: new Set(),
      queued: 0,
      queuedSets: 0,
      queuedAll: 0,
      overflowReported: new Set(),
    };
    content.onDestroy = () => this.close(opened);
    let source: ContentSource | undefined;
    try {
      source = kind.open(asset, this.host(opened, types));
      content.attach(source);
    } catch (error) {
      // Closed as any content is: jobs it submitted are canceled, its sinks
      // close and its budget client goes.
      try {
        content.destroy();
      } catch (destroyError) {
        this.report(`the "${kind.id}" content's destroy`, destroyError);
      }
      try {
        source?.destroy(); // opened, then refused (`attach`): the content never held it
      } catch (destroyError) {
        this.report(`the "${kind.id}" source's destroy`, destroyError);
      }
      throw error;
    }
    this.opened.push(opened);
    this.options.wake?.();
    return content;
  }

  /**
   * One tick: updates every placed source, then grants this tick's wants.
   * Returns true while grants were made (their sources act next tick).
   * @internal The engine's loop calls it.
   */
  tick(): boolean {
    if (this.destroyed) {
      return false;
    }
    for (const opened of this.opened) {
      const { content } = opened;
      const strays = content.takeStrayEdits();
      if (strays > 0) {
        this.reportMessage(
          `the "${content.kind}" content's edits: ${strays} ${strays === 1 ? "edit names an ID" : "edits name IDs"} no row, draw or feature of it has now; held as ${strays === 1 ? "an override" : "overrides"} until a feature with ${strays === 1 ? "that ID" : "those IDs"} loads, which an instance ID of a removed item, or another content's ID, never does.`,
        );
      }
      if (!content.shown) {
        continue;
      }
      const grant = this.budget.takeGrant(opened.client);
      const invalidated = content.takeInvalidated();
      try {
        content.contentSource.update({
          views: this.options.views?.(content) ?? [],
          clock: this.options.clock(content),
          grant,
          invalidated,
        });
      } catch (error) {
        // What it was granted and didn't settle goes back: in flight, its
        // wants would be ignored and its origin's slots held for good. So do
        // its invalidations: its next update sees them again.
        this.budget.returnGrant(opened.client, grant.keys);
        content.restoreInvalidated(invalidated);
        this.report(`the "${content.kind}" source's update`, error);
      }
    }
    const granted = this.budget.arbitrate();
    if (this.hasDueSample()) {
      this.scheduleApply();
    }
    return granted > 0;
  }

  /** How many samples wait for their times. */
  get bufferedSamples(): number {
    return this.samples.length - this.samplesHead;
  }

  /**
   * Closes every source. One whose `destroy` throws is reported, and the
   * others close all the same.
   */
  destroy(): void {
    this.destroyed = true;
    for (const opened of [...this.opened]) {
      try {
        opened.content.destroy();
      } catch (error) {
        this.report(`the "${opened.content.kind}" source's destroy`, error);
      }
    }
    this.queue = [];
    this.queueHead = 0;
    this.samples = [];
    this.samplesHead = 0;
  }

  private host(opened: Opened, types: ReadonlySet<string>): SourceHost {
    const { pool, fetch, clock } = this.options;
    const jobs: SourceJobs = {
      submit<R, A = R>(spec: SourceJobSpec<R, A>): Job<A> {
        if (opened.content.destroyed) {
          throw new Error("SourceJobs.submit: the content is destroyed.");
        }
        if (!types.has(spec.type)) {
          throw new Error(
            `SourceJobs.submit: "${spec.type}" isn't one of the "${opened.content.kind}" kind's decoders.`,
          );
        }
        const job = pool.submit<R, A>(spec as JobSpec<R, A>);
        opened.jobs.add(job);
        job.promise.finally(() => opened.jobs.delete(job)).catch(() => {}); // the source's own promise reports its failure
        return job;
      },
    };
    const client = opened.client;
    const budget: BudgetClient = {
      want: (want) => client.want(want),
      settle: (key, bytes) => {
        client.settle(key, bytes);
        this.options.wake?.(); // a slot freed: waiting wants may go
      },
      release: (key) => client.release(key),
      get resident() {
        return client.resident;
      },
    };
    const rowSinks = opened.content.rows.sinks();
    const sinks: ContentSinks = {
      draws: opened.content.drawSink,
      images: rowSinks.images,
      features: rowSinks.features,
      points: rowSinks.points,
      custom: (feature) => rowSinks.custom(feature),
    };
    return {
      get fetch() {
        return fetch();
      },
      jobs,
      budget,
      sinks,
      get clock() {
        return clock(opened.content);
      },
      changed: (change) => this.push(opened, change),
    };
  }

  /** A source's push: queued for the apply phase, and the engine wakes. */
  private push(opened: Opened, change: SourceChange): void {
    if (this.destroyed || opened.content.destroyed) {
      return;
    }
    if (!opened.content.capabilities.pushes) {
      this.report(
        `the "${opened.content.kind}" source's push`,
        new Error("it declares pushes: false; dropped."),
      );
      return;
    }
    if (typeof change !== "object" || change === null) {
      return;
    }
    if (change.kind === "samples") {
      if (!this.bufferSamples(opened, change.samples)) {
        return;
      }
    } else if (opened.queued >= MAX_QUEUED_CHANGES) {
      if (!this.overflow(opened, change)) {
        return;
      }
    } else {
      this.enqueue(opened, change);
    }
    this.scheduleApply();
    this.options.wake?.();
  }

  private enqueue(opened: Opened, change: SourceChange): void {
    this.queue.push({ opened, change });
    opened.queued++;
    if (change.kind === "features") {
      opened.queuedSets++;
    } else if (invalidatesAll(change)) {
      opened.queuedAll++;
    }
  }

  /**
   * A push past `MAX_QUEUED_CHANGES`. Its queued invalidations (and any
   * other kind but change sets) collapse into one invalidation of
   * everything, which reloads all; its change sets stay, since a reload
   * doesn't replay others' edits. A further change set that doesn't fit is
   * dropped. Each is reported once until its queue drains. Returns whether
   * the push queued (or is covered by what did).
   */
  private overflow(opened: Opened, change: SourceChange): boolean {
    const where = `the "${opened.content.kind}" source's push`;
    // Collapse when it frees something, or when an invalidation arrives
    // at a queue of change sets only (then its queue passes the bound by one).
    const others = opened.queued - opened.queuedSets;
    const collapse =
      others > 1 ||
      (others === 1 && opened.queuedAll === 0) ||
      (others === 0 && change.kind !== "features");
    if (collapse) {
      const kept: { opened: Opened; change: SourceChange }[] = [];
      for (let i = this.queueHead; i < this.queue.length; i++) {
        const q = this.queue[i]!;
        if (q.opened !== opened || q.change.kind === "features") {
          kept.push(q);
        }
      }
      this.queue = kept;
      this.queueHead = 0;
      opened.queued = opened.queuedSets;
      opened.queuedAll = 0;
      this.enqueue(opened, { kind: "invalidate" });
      this.reportOverflow(
        opened,
        "collapsed",
        where,
        `more than ${MAX_QUEUED_CHANGES} changes queued between ticks; its invalidations collapse into one invalidation of everything, and its change sets stay.`,
      );
    }
    if (change.kind !== "features") {
      return true; // the invalidation of everything covers it
    }
    if (opened.queued < MAX_QUEUED_CHANGES) {
      this.enqueue(opened, change);
      return true;
    }
    this.reportOverflow(
      opened,
      "dropped",
      where,
      `more than ${MAX_QUEUED_CHANGES} change sets queued between ticks; others' edits are dropped until its queue drains, and a reload doesn't bring them back.`,
    );
    return false;
  }

  /** Reports an overflow of `opened`'s queue once until its queue drains. */
  private reportOverflow(
    opened: Opened,
    what: "collapsed" | "dropped",
    where: string,
    message: string,
  ): void {
    if (!opened.overflowReported.has(what)) {
      opened.overflowReported.add(what);
      this.report(where, new Error(message));
    }
  }

  /**
   * Buffers a push's samples for the apply phase. Drops the push when its
   * arrays don't agree in length or it would pass `MAX_BUFFERED_SAMPLES`,
   * and each sample whose time isn't finite; reports each (a run of pushes
   * dropped at the bound, once). Returns whether any sample was buffered.
   */
  private bufferSamples(opened: Opened, samples: SampleBatch): boolean {
    const where = `the "${opened.content.kind}" source's samples`;
    const count = samples?.times?.length;
    const lengthsAgree =
      typeof count === "number" &&
      samples.names?.length === count &&
      (!samples.positions || samples.positions.length === count * 3) &&
      Object.values(samples.values ?? {}).every(
        (values) => values?.length === count,
      );
    if (!lengthsAgree) {
      this.report(
        where,
        new Error(
          "times, names, positions and values don't agree in length; dropped.",
        ),
      );
      return false;
    }
    if (this.bufferedSamples + count > MAX_BUFFERED_SAMPLES) {
      if (!this.samplesDropping) {
        this.samplesDropping = true;
        this.report(
          where,
          new Error(
            `more than ${MAX_BUFFERED_SAMPLES} samples would wait for their times; dropped, and so is each push after it until one fits.`,
          ),
        );
      }
      return false;
    }
    this.samplesDropping = false;
    let dropped = 0;
    for (let i = 0; i < count; i++) {
      const time = samples.times[i]!;
      if (!Number.isFinite(time)) {
        dropped++;
        continue;
      }
      const last = this.samples[this.samples.length - 1];
      if (last && this.samples.length > this.samplesHead && time < last.time) {
        this.samplesSorted = false; // sorted when next read
      }
      this.samples.push({ opened, samples, index: i, time, seq: this.seq++ });
    }
    if (dropped > 0) {
      this.report(
        where,
        new Error(`${dropped} of ${count} have no finite time; those dropped.`),
      );
    }
    return dropped < count;
  }

  private scheduleApply(): void {
    if (this.applyScheduled) {
      return;
    }
    this.applyScheduled = true;
    this.options.pool.jobs.slice({
      type: "source-changes",
      step: (budgetMs) => {
        const done = this.applyDue(budgetMs);
        if (done) {
          this.applyScheduled = false;
        } else {
          this.options.wake?.(); // the rest goes in the next tick's phase
        }
        return { done };
      },
    });
  }

  /**
   * The apply phase's step: queued changes in order, then due samples by
   * time, until about `budgetMs` is spent (at least one goes). Returns
   * whether everything due applied.
   */
  private applyDue(budgetMs: number): boolean {
    const start = performance.now();
    const spent = () =>
      budgetMs !== Infinity && performance.now() - start >= budgetMs;
    if (this.queueHead < this.queue.length) {
      // Its source selects again in the next tick (`SourceTick.invalidated`).
      this.options.wake?.();
    }
    let applied = 0;
    while (this.queueHead < this.queue.length) {
      if (applied > 0 && spent()) {
        this.compactQueue();
        return false;
      }
      const { opened, change } = this.queue[this.queueHead]!;
      this.queue[this.queueHead++] = undefined!; // let it go
      this.dequeued(opened, change);
      applied++;
      if (opened.content.destroyed) {
        continue;
      }
      try {
        if (change.kind === "invalidate") {
          this.invalidate(opened, change);
        } else if (change.kind === "features") {
          this.applyFeatures(opened, change.changes);
        }
        // Other kinds are ignored: the union is open (CS-831's S5).
      } catch (error) {
        this.report(
          `the "${opened.content.kind}" source's ${change.kind} change`,
          error,
        );
      }
    }
    this.queue = [];
    this.queueHead = 0;
    let finished = true;
    // Due samples are a prefix once sorted: applied by time, then arrival.
    while (this.hasDueSample()) {
      if (applied > 0 && spent()) {
        finished = false;
        break;
      }
      const s = this.samples[this.samplesHead]!;
      this.samples[this.samplesHead++] = undefined!; // let it go
      applied++;
      if (s.opened.content.destroyed) {
        continue;
      }
      try {
        s.opened.content.rows.applySamples(s.samples, s.index, s.index + 1);
      } catch (error) {
        // One sample's failure doesn't lose the others.
        this.report(`the "${s.opened.content.kind}" source's sample`, error);
      }
    }
    this.compactSamples();
    return finished;
  }

  /** A queued change left the queue: its source's counts follow. */
  private dequeued(opened: Opened, change: SourceChange): void {
    opened.queued--;
    if (change.kind === "features") {
      opened.queuedSets--;
    } else if (invalidatesAll(change)) {
      opened.queuedAll--;
    }
    if (opened.queued === 0) {
      opened.overflowReported.clear(); // a later overflow is news again
    }
  }

  /**
   * Whether a buffered sample is due: in real time any; on a stepped clock,
   * one its content's scene time reached. Samples wait in one time order,
   * so on stepped clocks of different worlds the earliest waits for its own
   * world's (CS-816 steps them).
   */
  private hasDueSample(): boolean {
    if (this.samplesHead >= this.samples.length) {
      return false;
    }
    if (!this.samplesSorted) {
      this.samples = this.samples
        .slice(this.samplesHead)
        .sort((a, b) => a.time - b.time || a.seq - b.seq);
      this.samplesHead = 0;
      this.samplesSorted = true;
    }
    const head = this.samples[this.samplesHead]!;
    const clock = this.options.clock(head.opened.content);
    return !clock.stepped || head.time <= clock.seconds;
  }

  /** Drops the applied part of the queue once it is most of it. */
  private compactQueue(): void {
    if (this.queueHead > 1024 && this.queueHead * 2 > this.queue.length) {
      this.queue = this.queue.slice(this.queueHead);
      this.queueHead = 0;
    }
  }

  /** Drops the applied samples once they are most of the buffer. */
  private compactSamples(): void {
    if (this.samplesHead === this.samples.length) {
      this.samples = [];
      this.samplesHead = 0;
    } else if (
      this.samplesHead > 1024 &&
      this.samplesHead * 2 > this.samples.length
    ) {
      this.samples = this.samples.slice(this.samplesHead);
      this.samplesHead = 0;
    }
  }

  private invalidate(
    opened: Opened,
    change: SourceChange & { kind: "invalidate" },
  ): void {
    const rows = opened.content.rows;
    // Keys named go; with neither keys nor a region, everything does. A
    // region alone is the source's to map to keys (`SourceTick.invalidated`).
    const keys =
      change.keys ?? (change.region === undefined ? [...rows.keys()] : []);
    rows.drop(keys);
    for (const key of keys) {
      opened.client.release(key);
    }
    opened.content.noteInvalidated(change);
  }

  /**
   * Others' change set from the source's feed: checked and resolved by its
   * keys (a malformed one, one for other content, or one whose IDs aren't
   * its keys', is dropped whole and reported), then applied under this
   * client's edits. An update or a delete naming a key no row, draw or
   * override of the content has is applied, as an override that holds until
   * one loads, and reported, never dropped silently; past
   * `MAX_PENDING_OVERRIDES` of those, the oldest go, reported with their
   * count. A delete of the feed's own insert clears it.
   */
  private applyFeatures(opened: Opened, changes: ChangeSet): void {
    checkChangeSet(changes);
    const { content } = opened;
    const resolved = content.resolve(changes).ops;
    const unknown = resolved.flatMap((op, index) =>
      op.op !== "insert" && !content.holds(op.id!) ? [index] : [],
    );
    for (const op of resolved) {
      const id = op.id!;
      // The feed's own insert, with no row or draw of the source under it:
      // an update keeps it an insert, and a delete clears it, so a feed
      // that inserts and deletes holds nothing for what it deleted.
      const inserted =
        content.feed.get(id)?.kind === "insert" && !content.hasBase(id);
      if (op.op === "insert") {
        content.feed.insert(id, op.feature);
      } else if (op.op === "delete") {
        if (inserted) {
          content.feed.clear(id);
        } else {
          content.feed.hide(id);
        }
      } else {
        const feature = patched(feedBase(content, id), op.patch);
        if (inserted) {
          content.feed.insert(id, feature);
        } else {
          content.feed.replace(id, feature);
        }
      }
    }
    content.noteKeys(resolved);
    const dropped = content.holdPending(resolved);
    if (unknown.length > 0) {
      this.reportMessage(
        `the "${content.kind}" source's features change: ${unknown.length === 1 ? "op" : "ops"} ${unknown.join(", ")} ${unknown.length === 1 ? "names a key" : "name keys"} no row, draw or edit of its content has; applied as overrides that hold until the features load.`,
      );
    }
    if (dropped > 0) {
      this.reportMessage(
        `the "${content.kind}" source's features change: ${dropped} ${dropped === 1 ? "override" : "overrides"} of features no row or draw has went, the oldest first: a content's feed holds at most ${MAX_PENDING_OVERRIDES} (MAX_PENDING_OVERRIDES).`,
      );
    }
  }

  private close(opened: Opened): void {
    const at = this.opened.indexOf(opened);
    if (at >= 0) {
      this.opened.splice(at, 1);
    }
    // Its jobs stop: none applies into a destroyed content.
    for (const job of [...opened.jobs]) {
      job.cancel();
    }
    opened.jobs.clear();
    this.budget.remove(opened.client);
    this.queue = this.queue
      .slice(this.queueHead)
      .filter((q) => q.opened !== opened);
    this.queueHead = 0;
    this.samples = this.samples
      .slice(this.samplesHead)
      .filter((s) => s.opened !== opened);
    this.samplesHead = 0;
  }

  /**
   * Content `explicit`'s ID, or `derived` (its canonical source) when none
   * is given. Two open contents never share one, since it is their first
   * items' key, and so in their instance IDs (feature IDs never depend on
   * it, CS-1031 A): a second `explicit` is refused, and a second `derived`
   * takes an ordinal (`#2`), reported, as a second item of a tileset does.
   * A `derived` one also skips the keys worlds' items hold: content and
   * tileset items take one ordinal rule.
   */
  private contentId(explicit: string | undefined, derived: string): string {
    const taken = new Set(this.opened.map((o) => o.content.id));
    if (explicit !== undefined) {
      if (typeof explicit !== "string" || explicit.length === 0) {
        throw new TypeError("open: an id is a non-empty string.");
      }
      if (taken.has(explicit)) {
        throw new Error(
          `open: content with the id "${explicit}" is open already: each content's id is its own.`,
        );
      }
      return explicit;
    }
    let ordinal = 1;
    const idOf = (n: number) => (n === 1 ? derived : `${derived}#${n}`);
    const held = (id: string) =>
      taken.has(id) || (this.options.itemKeyTaken?.(id) ?? false);
    while (held(idOf(ordinal))) {
      ordinal++;
    }
    if (ordinal > 1) {
      this.reportMessage(
        `open: ${derived} is open or drawn already; without an id this content's ID, and its items' instance IDs, take the ordinal #${ordinal}, which depends on the order it was opened (its feature IDs don't). Give each content an id (OpenOptions.id).`,
      );
    }
    return idOf(ordinal);
  }

  private report(where: string, error: unknown): void {
    this.reportMessage(
      `${where} threw: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  private reportMessage(message: string): void {
    if (this.options.report) {
      this.options.report(message);
    } else {
      console.error(message);
    }
  }
}

/** An invalidation of everything: neither keys nor a region. */
function invalidatesAll(change: SourceChange): boolean {
  return (
    change.kind === "invalidate" &&
    change.keys === undefined &&
    change.region === undefined
  );
}

/** What a feed's update patches: the feature as the feed has it, else as the source does. */
function feedBase(content: SourceContent, id: FeatureId): FeatureData {
  const o = content.feed.get(id);
  return (o && o.kind !== "hide" ? o.feature : content.baseFeature(id)) ?? {};
}

/** `base` with `patch`'s properties set or removed (null) and its geometry, if any. */
function patched(base: FeatureData, patch: FeaturePatch): FeatureData {
  const properties: Record<string, PlainValue> = { ...base.properties };
  for (const [name, value] of Object.entries(patch.properties ?? {})) {
    if (value === null) {
      delete properties[name];
    } else {
      properties[name] = value;
    }
  }
  const geometry = patch.geometry ?? base.geometry;
  return {
    ...(Object.keys(properties).length > 0 ? { properties } : {}),
    ...(geometry ? { geometry } : {}),
  };
}
