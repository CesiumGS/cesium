/**
 * The engine's side of the content-source seam (CS-847): kinds and
 * resolvers, `open`, one `SourceHost` per source, the tick that updates
 * every placed source and then arbitrates the budget, and pushes applied in
 * the apply phase.
 *
 * - **Open:** a reference goes through the resolvers (the host's, then
 *   plain URLs), the registry picks the kind, its decoders load into every
 *   worker, and the kind opens the source over its host.
 * - **Tick:** each source whose content an item places gets `update` with
 *   its views, the clock, its grant and the invalidations since; then the
 *   arbiter grants this tick's wants (`BudgetArbiter`).
 * - **Push:** `host.changed` queues the change and wakes the engine; it
 *   applies in the apply phase (`Jobs.slice`), under the phase's budget: what
 *   doesn't fit waits for the next tick's phase. Samples carry their times:
 *   in real time they apply as they arrive; on a stepped clock (CS-816) they
 *   wait until the clock reaches them, so a replayed feed gives the same rows.
 *   The engine never polls a source (CS-863: a source may poll its own server).
 * - **Bounds:** between ticks a source may queue at most `MAX_QUEUED_CHANGES`
 *   changes; past that its queue collapses into one invalidation of
 *   everything (it reloads, reported). At most `MAX_BUFFERED_SAMPLES` samples
 *   wait for their times; a push past that is dropped and reported.
 * - **Close:** destroying content cancels its source's jobs, and its sinks
 *   and `jobs.submit` throw from then on; its pushes are dropped.
 */
import type { FetchProvider } from "../io/fetchProvider.ts";
import type { Job, Jobs, JobSpec } from "../io/Jobs.ts";
import { canonicalSource, type StableId } from "../scene/identity.ts";
import { BudgetArbiter, type BudgetOptions } from "./budget.ts";
import { SourceContent } from "./content.ts";
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
import type {
  AssetRef,
  AssetResolver,
  BudgetClient,
  ContentSinks,
  ContentSource,
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
  /** The views' time: the engine's, or a test's fake (until CS-816's stepped clock). */
  readonly clock: () => SourceClock;
  /** The views that show `content`. */
  readonly views?: (content: SourceContent) => readonly SourceView[];
  readonly budget?: BudgetOptions;
  /** How a kind's module is imported (default: `import()`). */
  readonly load?: ModuleLoader;
  /** Where a source's failure or a dropped change is reported. */
  readonly report?: (message: string) => void;
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
  /** Changes waiting for the apply phase, in arrival order (samples aside). */
  private queue: { opened: Opened; change: SourceChange }[] = [];
  /** Samples waiting for their times. */
  private samples: BufferedSample[] = [];
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
      this.contentId(options.id, canonicalSource(asset.url.href)),
      asset,
      kind.id,
    );
    const client = this.budget.client();
    const opened: Opened = { content, client, jobs: new Set(), queued: 0 };
    let source: ContentSource | undefined;
    try {
      source = kind.open(asset, this.host(opened, types));
      content.attach(source);
    } catch (error) {
      this.budget.remove(client);
      try {
        source?.destroy(); // opened, then refused (`attach`)
      } catch (destroyError) {
        this.report(`the "${kind.id}" source's destroy`, destroyError);
      }
      throw error;
    }
    content.onDestroy = () => this.close(opened);
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
    const clock = this.options.clock();
    for (const opened of this.opened) {
      const { content } = opened;
      const item = content.item;
      if (!item || !item.show) {
        continue;
      }
      const grant = this.budget.takeGrant(opened.client);
      try {
        content.contentSource.update({
          views: this.options.views?.(content) ?? [],
          seconds: clock.seconds,
          grant,
          invalidated: content.takeInvalidated(),
        });
      } catch (error) {
        // What it was granted and didn't settle goes back: in flight, its
        // wants would be ignored and its origin's slots held for good.
        this.budget.returnGrant(opened.client, grant.keys);
        this.report(`the "${content.kind}" source's update`, error);
      }
    }
    const granted = this.budget.arbitrate();
    if (this.dueSamples(clock).length > 0) {
      this.scheduleApply();
    }
    return granted > 0;
  }

  /** How many samples wait for their times. */
  get bufferedSamples(): number {
    return this.samples.length;
  }

  /** Closes every source. */
  destroy(): void {
    this.destroyed = true;
    for (const opened of [...this.opened]) {
      opened.content.destroy();
    }
    this.queue = [];
    this.samples = [];
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
        return clock();
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
      // Coalesced: everything it queued becomes one reload of everything.
      this.queue = this.queue.filter((q) => q.opened !== opened);
      this.queue.push({ opened, change: { kind: "invalidate" } });
      opened.queued = 1;
      this.report(
        `the "${opened.content.kind}" source's push`,
        new Error(
          `more than ${MAX_QUEUED_CHANGES} changes queued between ticks; they collapse into one invalidation of everything.`,
        ),
      );
    } else {
      this.queue.push({ opened, change });
      opened.queued++;
    }
    this.scheduleApply();
    this.options.wake?.();
  }

  /**
   * Buffers a push's samples for the apply phase. Drops the push when its
   * arrays don't agree in length or it would pass `MAX_BUFFERED_SAMPLES`,
   * and each sample whose time isn't finite; reports each. Returns whether
   * any sample was buffered.
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
    if (this.samples.length + count > MAX_BUFFERED_SAMPLES) {
      this.report(
        where,
        new Error(
          `more than ${MAX_BUFFERED_SAMPLES} samples would wait for their times; dropped.`,
        ),
      );
      return false;
    }
    let dropped = 0;
    for (let i = 0; i < count; i++) {
      const time = samples.times[i]!;
      if (!Number.isFinite(time)) {
        dropped++;
        continue;
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
    if (this.queue.length > 0) {
      // Its source selects again in the next tick (`SourceTick.invalidated`).
      this.options.wake?.();
    }
    let applied = 0;
    while (this.queue.length > 0) {
      if (applied > 0 && spent()) {
        return false;
      }
      const { opened, change } = this.queue.shift()!;
      opened.queued--;
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
    const clock = this.options.clock();
    const due = this.dueSamples(clock);
    if (due.length === 0) {
      return true;
    }
    due.sort((a, b) => a.time - b.time || a.seq - b.seq);
    const done = new Set<BufferedSample>();
    let finished = true;
    for (const s of due) {
      if (applied > 0 && spent()) {
        finished = false;
        break;
      }
      done.add(s);
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
    this.samples = this.samples.filter((s) => !done.has(s));
    return finished;
  }

  private dueSamples(clock: SourceClock): BufferedSample[] {
    return clock.stepped
      ? this.samples.filter((s) => s.time <= clock.seconds)
      : [...this.samples];
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
   * Others' change set from the source's feed: checked (a malformed one is
   * dropped and reported), then applied under this client's edits.
   */
  private applyFeatures(opened: Opened, changes: ChangeSet): void {
    checkChangeSet(changes);
    const { content } = opened;
    for (const op of changes.ops) {
      if (op.op === "insert") {
        content.feed.insert(op.id, op.feature);
      } else if (op.op === "delete") {
        content.feed.hide(op.id);
      } else {
        content.feed.replace(
          op.id,
          patched(feedBase(content, op.id), op.patch),
        );
      }
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
    this.queue = this.queue.filter((q) => q.opened !== opened);
    this.samples = this.samples.filter((s) => s.opened !== opened);
  }

  /**
   * Content `explicit`'s ID, or `derived` (its canonical source) when none
   * is given. Two open contents never share one, since their rows' IDs are
   * made from it: a second `explicit` is refused, and a second `derived`
   * takes an ordinal (`#2`), reported, as a second item of a tileset does.
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
    while (taken.has(idOf(ordinal))) {
      ordinal++;
    }
    if (ordinal > 1) {
      this.reportMessage(
        `open: ${derived} is open already; without an id this content's IDs take the ordinal #${ordinal}, which depends on the order it was opened. Give each content an id (OpenOptions.id).`,
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

/** What a feed's update patches: the feature as the feed has it, else as the source does. */
function feedBase(content: SourceContent, id: StableId): FeatureData {
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
