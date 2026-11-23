/**
 * Content an open source gives (`Engine.open`), and its items
 * (`World.add`) (CS-847). A source is content; an item is content placed in
 * a world. The content holds what its source wrote: draws, rows in the row
 * sinks (`ContentRows`), and the edit layer over both (`EditLayer`), so
 * every read through it sees the edits.
 *
 * Content belongs to one world, the first it is added to, and may have
 * several items there. Each item places every draw its source writes: the
 * source writes a draw once, and its content keeps one draw in the world
 * per item. Items have no placement of their own yet, so they draw in the
 * same place (CS-554 makes items general, with placement).
 *
 * Two IDs (CS-957 A):
 * - **Feature IDs** (`FeatureId`) are the projection of the source's own
 *   key for the feature (a row's name, a draw's `DrawOptions.id`) in the
 *   content's namespace, its name (`SourceContent.source`, CS-1087 A)
 *   hashed once at open, and nothing else: never from an item, the
 *   content's ID or its URL, so one content opened twice, placed in two
 *   worlds or opened in another run under one name gives the same ones. Their key kind is `feature`, which has no item. Rows, the
 *   edit layer, change sets and labels set on them name them; every item
 *   shows the same edits and labels.
 * - **Instance IDs** (`InstanceId`) add the item: each item's draws carry its
 *   identity, keyed by `ContentItem.key`, so one content placed twice, or
 *   one source opened twice, gives two, and neither is ever its feature ID. A pick reports the instance ID;
 *   `World.identity.identify` gives its feature ID (`Identified.feature`),
 *   and the edit layer takes either.
 *
 * IDs don't change when an item is removed and the content placed again.
 * Two open contents of one name share feature IDs, and each keeps its own
 * edits; their content IDs differ (`Engine.open` refuses or numbers a
 * second of one ID), and so do their items' keys and instance IDs.
 *
 * Once destroyed, its sinks refuse writes (they throw), its source's jobs
 * are canceled and its pushes dropped; a draw sink's releases still pass,
 * so a source's own `destroy` can free what it made.
 */
import {
  FeatureNamespace,
  type ItemIdentity,
  type StableKey,
} from "../scene/identity.ts";
import type { DrawHandle, DrawOptions } from "../scene/world/types.ts";
import type { DrawSink } from "../streaming/DrawSink.ts";
import {
  isReadOnly,
  type ChangeOp,
  type ChangeSet,
  type FeatureData,
  type FeatureRef,
  type GeometryData,
} from "./editing.ts";
import {
  EditLayer,
  type EditAddressing,
  type FeatureAddress,
} from "./editLayer.ts";
import { ContentRows, type HeldRows } from "./sinks.ts";
import type {
  ContentSource,
  CreditList,
  CustomRows,
  FeatureBatch,
  FeatureId,
  InvalidateChange,
  PlainValue,
  PointBatch,
  ResolvedAsset,
} from "./types.ts";

/**
 * What a world gives content: a draw sink, and what the item and the edit
 * layer set on draws. `World` is one.
 * @experimental
 */
export interface ContentWorld extends DrawSink {
  setVisible(handle: DrawHandle, visible: boolean): void;
  setViewMask(handle: DrawHandle, mask: number): void;
  /** Its identity table (`World.identity`): what maps a pick's instance ID to its feature ID, and holds labels. */
  readonly identity?: {
    identify(
      id: FeatureId,
    ): { readonly key: StableKey; readonly feature?: FeatureId } | undefined;
    setLabels?(
      id: FeatureId,
      taxonomy: string,
      labels: readonly string[] | undefined,
    ): void;
  };
}

/**
 * What `World.add` takes for content; each but `id` can change later on the item.
 * @experimental
 */
export interface ContentItemOptions {
  /**
   * The item's key (`ContentItem.key`), for its draws' instance IDs, unique
   * among the world's items. Default: the content's ID while no item holds
   * it, else the content's ID with an ordinal (`#2`), reported, as a second
   * item of a tileset takes. Feature IDs never depend on it.
   */
  readonly id?: string;
  /** Labels by taxonomy for everything it draws (as `SceneItemOptions.labels`). */
  readonly labels?: Readonly<Record<string, readonly string[]>>;
  /** Default true. */
  readonly show?: boolean;
  /** Views that draw it, one bit per view (`Engine.viewBit`); default all. */
  readonly viewMask?: number;
}

const ALL_VIEWS = 0xffffffff;

/**
 * @internal The most overrides a content's feed holds for features no row
 * or draw has (an update or a delete of a key not loaded, or never to be):
 * past it, the oldest go, reported (`SourceContent.holdPending`).
 */
export const MAX_PENDING_OVERRIDES = 1024;

/** The shortest interval a source may declare for checking its server (CS-863). */
const MIN_POLL_SECONDS = 1;

/** What a draw sink still does once its content is destroyed: free what was made. */
const RELEASES: ReadonlySet<PropertyKey> = new Set([
  "removeMesh",
  "removeTransform",
  "removeDraw",
  "freeClip",
]);

/**
 * `DrawSink`'s calls on one draw that set its state: each item's draw takes
 * them, and an item placed later takes the last of each.
 */
const DRAW_SETTERS: ReadonlySet<PropertyKey> = new Set([
  "setDrawGeometricError",
  "setDrawHeightNormal",
  "setCurvilinearAt",
  "setDrawMaterial",
  "setColor",
  "setDrawDebug",
  "setDrawMorph",
  "setCollision",
  "setGround",
  "setTerrainClip",
]);

/** `DrawSink`'s reads of one draw: answered by its first item's draw. */
const DRAW_READS: ReadonlySet<PropertyKey> = new Set([
  "drawMatrix",
  "drawMaterial",
]);

/** One draw its source wrote, and the draw each item has of it. */
interface SourceDraw {
  /** The handle its source holds. */
  readonly handle: DrawHandle;
  readonly options: DrawOptions;
  /** Its feature ID when it has no features (one ID for the whole draw, from `options.id`). */
  readonly id: FeatureId | undefined;
  /** The last arguments of each of `DRAW_SETTERS` called on it, after the handle. */
  readonly calls: Map<PropertyKey, unknown[]>;
  /** Each item's draw of it, in the world. */
  readonly placed: Map<ContentItem, DrawHandle>;
}

/**
 * Content an open source gives: what `World.add` places.
 * @experimental
 */
export class SourceContent {
  /** The rows its source wrote to the row sinks. @internal */
  readonly rows: ContentRows;
  /** How its edit layers name features: the projection, and what is loaded. */
  private readonly addressing: EditAddressing = {
    idOf: (address) => this.namespace.featureId(address.key, address.row),
    loaded: (id) => this.loadedAddress(id),
  };
  /**
   * The edit layer: hide, replace and insert by the source's key (CS-865,
   * CS-952 A), over everything this content shows, in every item. It takes
   * a loaded feature's ID too, and an instance ID of an item's draw (a
   * pick's), as its feature's.
   * @experimental
   */
  readonly edits = new EditLayer(this.addressing);
  /** @internal Others' changes from the source's feed (`features` pushes), under `edits`. */
  readonly feed = new EditLayer(this.addressing);
  /**
   * Its name (CS-1087 A): `OpenOptions.name`, else its resolver's
   * (`ResolvedAsset.name`), else its URL's digest (`urlName`). Its feature
   * IDs are its source's keys projected in this name's namespace, and its
   * change sets name it (`ChangeSet.source`). Never URL text.
   */
  readonly source: string;
  /** Its name, hashed once: what its feature IDs are projected in. */
  private readonly namespace: FeatureNamespace;
  private source_: ContentSource | undefined;
  private world_: ContentWorld | undefined;
  private readonly items_: ContentItem[] = [];
  /** By the source's handle (`index`, which only this content gives out). */
  private readonly draws = new Map<number, SourceDraw>();
  private readonly drawsById = new Map<FeatureId, Set<number>>();
  private nextDraw = 1;
  private invalidated: InvalidateChange[] = [];
  private destroyed_ = false;
  /** The draw sink its source writes: the world's, once placed. @internal */
  readonly drawSink: DrawSink;
  /** Called when it's destroyed. @internal */
  onDestroy: (() => void) | undefined;

  /** @internal Use `Engine.open`. */
  constructor(
    /** The content's ID, its first item's key: `OpenOptions.id`, else its name. */
    readonly id: string,
    readonly asset: ResolvedAsset,
    readonly kind: string,
    /** Its name (`source`). */
    name: string,
  ) {
    this.source = name;
    this.namespace = FeatureNamespace.of(name);
    this.rows = new ContentRows(this.namespace);
    this.drawSink = this.makeDrawSink();
    const reapply = (ids: readonly FeatureId[]) => this.refreshDraws(ids);
    this.edits.onChange(reapply);
    this.feed.onChange(reapply);
  }

  /**
   * Where feature `id` is, as its source keys it, while a row or a draw of
   * its source holds it: read from the row or the draw. An instance ID of
   * one of its items' draws gives its feature's, through the world's
   * identity table (a draw too). Nothing else maps an ID back to a key.
   */
  private loadedAddress(id: FeatureId): FeatureAddress | undefined {
    const own = (feature: FeatureId): FeatureAddress | undefined => {
      const row = this.rows.addressOf(feature);
      if (row) {
        return row;
      }
      const draw = this.drawsById.get(feature)?.values().next().value;
      const key =
        draw === undefined ? undefined : this.draws.get(draw)?.options.id;
      return key === undefined ? undefined : { key };
    };
    const found = own(id);
    if (found) {
      return found;
    }
    const feature = this.world_?.identity?.identify(id)?.feature;
    return feature !== undefined && feature !== id ? own(feature) : undefined;
  }

  /** The open source. @internal */
  get contentSource(): ContentSource {
    if (!this.source_) {
      throw new Error("SourceContent: its source isn't open yet.");
    }
    return this.source_;
  }

  /** @internal Its kind opened it. */
  attach(source: ContentSource): void {
    const writable = !isReadOnly(source.capabilities.write);
    if (writable && !source.writer) {
      throw new Error(
        `open: the "${this.kind}" source declares write capabilities but has no writer.`,
      );
    }
    const polls = source.capabilities.polls;
    if (
      polls !== undefined &&
      !(
        polls.intervalSeconds >= MIN_POLL_SECONDS &&
        Number.isFinite(polls.intervalSeconds)
      )
    ) {
      throw new RangeError(
        `open: the "${this.kind}" source polls every ${polls.intervalSeconds} s; a declared interval is at least ${MIN_POLL_SECONDS} s (CS-863).`,
      );
    }
    if (polls !== undefined && !source.capabilities.pushes) {
      throw new Error(
        `open: the "${this.kind}" source polls but doesn't push: what it learns reaches the engine only as pushes (CS-863).`,
      );
    }
    this.source_ = source;
    // A writable source names every row (CS-831's S7).
    this.rows.writable = writable;
  }

  /** Resolves once its source is ready. */
  get ready(): Promise<void> {
    return this.contentSource.ready;
  }

  /** What its source declares. */
  get capabilities(): ContentSource["capabilities"] {
    return this.contentSource.capabilities;
  }

  /** The world it draws in, once added. */
  get world(): ContentWorld | undefined {
    return this.world_;
  }

  /** The items that place it now, in the order added. */
  get items(): readonly ContentItem[] {
    return this.items_;
  }

  get destroyed(): boolean {
    return this.destroyed_;
  }

  /**
   * The feature ID of the feature its source keys `key`: a row it names
   * `key` (`RowIdentity.names`), or a draw without features whose
   * `DrawOptions.id` is `key`. The same in every item, every open of this
   * name and every run (CS-1087 A).
   * @experimental
   */
  featureId(key: string): FeatureId {
    if (typeof key !== "string" || key.length === 0) {
      throw new TypeError(
        "SourceContent.featureId: a key is the source's own, a non-empty string.",
      );
    }
    return this.namespace.featureId(key);
  }

  /**
   * The source's own key for feature `id`, from what holds it: an edit
   * record (which holds its key, loaded or not), a row the source names so,
   * or a draw. No other table maps an ID back to a key, so for an ID none
   * of those hold it is undefined.
   * @experimental
   */
  keyOf(id: FeatureId): string | undefined {
    if (typeof id !== "bigint") {
      return undefined;
    }
    const draw = this.drawsById.get(id)?.values().next().value;
    return (
      this.edits.keyOf(id) ??
      this.feed.keyOf(id) ??
      this.rows.nameOf(id) ??
      (draw === undefined ? undefined : this.draws.get(draw)?.options.id)
    );
  }

  /**
   * Sets the host's labels in one taxonomy on the feature its source keys
   * `target` (CS-815's `Identity.setLabels`, on its feature ID): every
   * placement of it shows them, and they come back when it loads again.
   * The content must be in a world (`World.add`).
   * @experimental
   */
  setLabels(
    target: string | FeatureRef,
    taxonomy: string,
    labels: readonly string[] | undefined,
  ): void {
    const key = typeof target === "string" ? target : target?.key;
    const id = this.featureId(key);
    if (
      typeof target === "object" &&
      target.id !== undefined &&
      target.id !== id
    ) {
      throw new TypeError(
        "SourceContent.setLabels: the FeatureRef's id isn't its key's feature ID in this content.",
      );
    }
    const identity = this.world_?.identity;
    if (!identity?.setLabels) {
      throw new Error(
        "SourceContent.setLabels: the content isn't in a world yet (World.add).",
      );
    }
    identity.setLabels(id, taxonomy, labels);
  }

  /**
   * `changes` with each op's feature ID filled from its key (CS-952 A): how
   * a change set from a server or a peer that knows only its own keys is
   * applied. It changes nothing. Throws a `TypeError`, naming the op and
   * never a value, for a change set made for other content: its `source`
   * isn't this content's name (`source`), or an op's `id` isn't its key's.
   * @experimental
   */
  resolve(changes: ChangeSet): ChangeSet {
    if (changes.source !== this.source) {
      throw new TypeError(
        "change set: its source isn't this content's name: it was made for other content.",
      );
    }
    return { ...changes, ops: this.resolveOps(changes.ops) };
  }

  /**
   * @internal `ops` with each feature ID filled from its key: a change set
   * from its own source's feed needs no `source` check, since it can only
   * be this content's. Throws as `resolve` does for an `id` not its key's.
   */
  resolveOps(ops: readonly ChangeOp[]): ChangeOp[] {
    return ops.map((op, index): ChangeOp => {
      const id = this.featureId(op.key);
      if (op.id !== undefined && op.id !== id) {
        throw new TypeError(
          `change set: op ${index}: its id isn't its key's feature ID in this content.`,
        );
      }
      return { ...op, id };
    });
  }

  /**
   * @internal Whether a row or a draw its source wrote, or an override,
   * has feature `id` now: an op naming one it hasn't is reported.
   */
  holds(id: FeatureId): boolean {
    return (
      this.rows.rowsOf(id).length > 0 ||
      this.drawsById.has(id) ||
      this.edits.get(id) !== undefined ||
      this.feed.get(id) !== undefined
    );
  }

  /**
   * The feed's hides and replacements of features no row or draw had when
   * set, oldest first: what `holdPending` bounds.
   */
  private readonly pending = new Map<FeatureId, true>();

  /**
   * @internal The feed applied `ops` (resolved): its hides and
   * replacements of features no row or draw has are held as pending, at
   * most `MAX_PENDING_OVERRIDES`. Past that, those whose feature has
   * loaded since stop being pending, then the oldest go (`feed.clear`).
   * Returns how many went.
   */
  holdPending(ops: readonly ChangeOp[]): number {
    for (const op of ops) {
      const id = op.id!;
      const o = this.feed.get(id);
      if (op.op !== "insert" && o && o.kind !== "insert" && !this.hasBase(id)) {
        this.pending.delete(id); // the newest again
        this.pending.set(id, true);
      }
    }
    if (this.pending.size <= MAX_PENDING_OVERRIDES) {
      return 0;
    }
    for (const id of this.pending.keys()) {
      if (this.hasBase(id)) {
        this.pending.delete(id);
      }
    }
    let dropped = 0;
    for (const id of [...this.pending.keys()]) {
      if (this.pending.size <= MAX_PENDING_OVERRIDES) {
        break;
      }
      this.pending.delete(id);
      this.feed.clear(id);
      dropped++;
    }
    return dropped;
  }

  /**
   * The credits of what it holds now: its source's own, then each piece
   * of content's that came with it, without repeats.
   */
  credits(): CreditList {
    const seen = new Map<string, CreditList[number]>();
    for (const credit of [
      ...(this.source_?.credits ?? []),
      ...this.asset.credits,
      ...this.rows.credits(),
    ]) {
      if (!seen.has(credit.html)) {
        seen.set(credit.html, credit);
      }
    }
    return [...seen.values()];
  }

  /**
   * Feature `id` as it shows now, edits applied: an inserted or replaced
   * feature's data, the source's row (its properties and geometry), `{}`
   * for a draw with no row data, or undefined when hidden or not loaded.
   * @experimental
   */
  feature(id: FeatureId): FeatureData | undefined {
    for (const layer of [this.edits, this.feed]) {
      const o = layer.get(id);
      if (o) {
        // A replacement shows where its feature does: none while no row or
        // draw has it, as `features` lists it.
        return o.kind === "hide" || (o.kind === "replace" && !this.hasBase(id))
          ? undefined
          : o.feature;
      }
    }
    return this.baseFeature(id);
  }

  /** @internal Whether a row or a draw its source wrote has feature `id` now. */
  hasBase(id: FeatureId): boolean {
    return this.rows.rowsOf(id).length > 0 || this.drawsById.has(id);
  }

  /**
   * Every feature it shows now, edits applied: rows, then draws, then
   * inserts, each once.
   * @experimental
   */
  *features(): IterableIterator<{ id: FeatureId; feature: FeatureData }> {
    const seen = new Set<FeatureId>();
    const visit = function* (
      this: SourceContent,
      id: FeatureId,
    ): Generator<{ id: FeatureId; feature: FeatureData }> {
      if (seen.has(id)) {
        return;
      }
      seen.add(id);
      const feature = this.feature(id);
      if (feature) {
        yield { id, feature };
      }
    };
    for (const id of this.rows.ids()) {
      yield* visit.call(this, id);
    }
    for (const id of this.drawsById.keys()) {
      yield* visit.call(this, id);
    }
    for (const layer of [this.feed, this.edits]) {
      for (const [id, o] of layer.entries()) {
        if (o.kind === "insert") {
          yield* visit.call(this, id);
        }
      }
    }
  }

  /** @internal Whether an item shows it now: what its source's update waits for. */
  get shown(): boolean {
    return this.items_.some((item) => item.show);
  }

  /** @internal The views of its shown items, one bit per view. */
  get viewMask(): number {
    let mask = 0;
    for (const item of this.items_) {
      if (item.show) {
        mask |= item.viewMask;
      }
    }
    return mask >>> 0;
  }

  /** @internal Its source's draw `id` shows: not hidden by an edit. */
  showsBase(id: FeatureId): boolean {
    return this.edits.showsBase(id) && this.feed.showsBase(id);
  }

  /** @internal Places it in `world` (`World.add`). */
  addItem(
    world: ContentWorld,
    identity: ItemIdentity,
    options: ContentItemOptions,
    release: () => void,
  ): ContentItem {
    if (this.destroyed_) {
      release();
      throw new Error("World.add: the content is destroyed.");
    }
    if (this.world_ !== undefined && this.world_ !== world) {
      release();
      throw new Error("World.add: the content draws in another world.");
    }
    this.world_ = world;
    const item: ContentItem = new ContentItem(
      this,
      world,
      identity,
      options,
      () => {
        this.unplace(item);
        this.items_.splice(this.items_.indexOf(item), 1);
        release();
      },
    );
    this.items_.push(item);
    try {
      for (const draw of this.draws.values()) {
        this.place(draw, item);
      }
    } catch (error) {
      item.remove(); // what it placed goes, and so does its key
      throw error;
    }
    return item;
  }

  /** @internal Invalidations applied since its source's last update. */
  takeInvalidated(): InvalidateChange[] {
    const out = this.invalidated;
    this.invalidated = [];
    return out;
  }

  /** @internal Its source's update threw: what it took goes back, ahead of any since. */
  restoreInvalidated(changes: readonly InvalidateChange[]): void {
    if (changes.length > 0) {
      this.invalidated = [...changes, ...this.invalidated];
    }
  }

  /** @internal The engine applied an invalidation: its source selects again. */
  noteInvalidated(change: InvalidateChange): void {
    this.invalidated.push(change);
  }

  /** @internal The draws its source holds now (each placed once per item). */
  get drawCount(): number {
    return this.draws.size;
  }

  /** @internal Each item's draw in the world of its source's draw `handle`. */
  placedDraws(handle: DrawHandle): ReadonlyMap<ContentItem, DrawHandle> {
    return this.draws.get(handle.index)?.placed ?? new Map();
  }

  /** Closes its source and removes everything it drew. */
  destroy(): void {
    if (this.destroyed_) {
      return;
    }
    this.destroyed_ = true;
    this.rows.close();
    try {
      this.source_?.destroy();
    } finally {
      for (const item of [...this.items_]) {
        item.remove();
      }
      this.draws.clear();
      this.drawsById.clear();
      this.onDestroy?.();
    }
  }

  /** Throws once it's destroyed: what its source writes after that goes nowhere. */
  private checkOpen(where: string): void {
    if (this.destroyed_) {
      throw new Error(`${where}: the content is destroyed.`);
    }
  }

  /** @internal The source's own feature `id`, from its rows or draws, under every edit. */
  baseFeature(id: FeatureId): FeatureData | undefined {
    const at = this.rows.rowsOf(id)[0];
    if (at) {
      const held = this.rows.batchAt(at)!;
      return rowFeature(held, at.index, at.sink);
    }
    return this.drawsById.has(id) ? {} : undefined;
  }

  /**
   * @internal Visibility and view masks on its items' draws: of the draws
   * with feature IDs `ids`, or of all of `item`'s (or every item's).
   */
  refreshDraws(
    ids: readonly FeatureId[] | undefined,
    item?: ContentItem,
  ): void {
    const world = this.world_;
    if (!world) {
      return;
    }
    const draws = ids
      ? ids.flatMap((id) =>
          [...(this.drawsById.get(id) ?? [])].map((i) => this.draws.get(i)!),
        )
      : [...this.draws.values()];
    for (const draw of draws) {
      for (const [placedBy, handle] of draw.placed) {
        if (item !== undefined && placedBy !== item) {
          continue;
        }
        world.setVisible(handle, this.drawShows(draw, placedBy));
        if (!ids) {
          world.setViewMask(handle, placedBy.viewMask);
        }
      }
    }
  }

  private drawShows(draw: SourceDraw, item: ContentItem): boolean {
    return item.show && (draw.id === undefined || this.showsBase(draw.id));
  }

  /**
   * `item`'s draw of `draw` in the world: its item's identity, for its
   * instance IDs, and the last of each state its source set.
   */
  private place(draw: SourceDraw, item: ContentItem): void {
    const world = this.world_!;
    const { options } = draw;
    const handle = world.addDraw({
      ...options,
      viewMask: item.viewMask,
      // Its content's namespace (CS-957 A, CS-1087 A): its features'
      // feature IDs, and its instance IDs, are projected in it, and only
      // the engine makes one, so no host draw can take them.
      identity: {
        source: this.source,
        content: options.id!,
        set: options.features ? 0 : -1,
        scope: "tile",
        item: item.identity,
        namespace: this.namespace,
      },
    });
    draw.placed.set(item, handle);
    const w = world as unknown as Record<
      PropertyKey,
      (...args: unknown[]) => unknown
    >;
    for (const [method, args] of draw.calls) {
      w[method]?.call(world, handle, ...args);
    }
    world.setVisible(handle, this.drawShows(draw, item));
  }

  /** Removes `item`'s draws from the world. */
  private unplace(item: ContentItem): void {
    const world = this.world_;
    for (const draw of this.draws.values()) {
      const handle = draw.placed.get(item);
      if (handle) {
        draw.placed.delete(item);
        world?.removeDraw(handle);
      }
    }
  }

  /**
   * `DrawSink` as it is, over its world: each draw it adds names its
   * content (`DrawOptions.id`), and is placed once per item, each with its
   * item's identity for its instance IDs, starting hidden where an edit
   * hides it. The handle its source holds is the content's own: the calls
   * `DrawSink` names on one draw reach each item's.
   */
  private makeDrawSink(): DrawSink {
    const world = (): ContentWorld => {
      if (!this.world_) {
        throw new Error(
          "DrawSink: the content isn't in a world yet (World.add); a source writes in update().",
        );
      }
      return this.world_;
    };
    const addDraw = (options: DrawOptions): DrawHandle => {
      this.checkOpen("DrawSink.addDraw");
      if (typeof options.id !== "string" || options.id.length === 0) {
        throw new TypeError(
          "DrawSink.addDraw: a source's draw names its content (DrawOptions.id), so its stable IDs hold across reloads (CS-815).",
        );
      }
      if (options.identity !== undefined) {
        throw new TypeError(
          "DrawSink.addDraw: a source's draw takes its identity from its content and item, not DrawOptions.identity, so its feature and instance IDs agree (CS-957 A).",
        );
      }
      world();
      // A draw without features is one feature, keyed by its DrawOptions.id.
      const id = options.features ? undefined : this.featureId(options.id);
      const handle: DrawHandle = {
        index: this.nextDraw++,
        generation: 0,
        name: options.name,
      };
      const draw: SourceDraw = {
        handle,
        options: { ...options },
        id,
        calls: new Map(),
        placed: new Map(),
      };
      this.draws.set(handle.index, draw);
      if (id !== undefined) {
        let set = this.drawsById.get(id);
        if (!set) {
          set = new Set();
          this.drawsById.set(id, set);
        }
        set.add(handle.index);
      }
      try {
        for (const item of this.items_) {
          this.place(draw, item);
        }
      } catch (error) {
        removeDraw(handle);
        throw error;
      }
      return handle;
    };
    const removeDraw = (handle: DrawHandle): void => {
      const draw = this.draws.get(handle?.index);
      if (!draw || draw.handle.generation !== handle.generation) {
        if (this.destroyed_) {
          return; // removed with its content
        }
        throw new Error("DrawSink.removeDraw: not a draw this source holds.");
      }
      this.draws.delete(handle.index);
      if (draw.id !== undefined) {
        const set = this.drawsById.get(draw.id);
        set?.delete(handle.index);
        if (set?.size === 0) {
          this.drawsById.delete(draw.id);
        }
      }
      const w = this.world_;
      for (const placed of draw.placed.values()) {
        w?.removeDraw(placed);
      }
      draw.placed.clear();
    };
    const drawOf = (handle: DrawHandle, where: string): SourceDraw => {
      const draw = this.draws.get(handle?.index);
      if (!draw) {
        throw new Error(`DrawSink.${where}: not a draw this source holds.`);
      }
      return draw;
    };
    return new Proxy({} as DrawSink, {
      get: (_target, property) => {
        if (property === "addDraw") {
          return addDraw;
        }
        if (property === "removeDraw") {
          return removeDraw;
        }
        const w = world() as unknown as Record<PropertyKey, unknown>;
        const value = w[property];
        if (typeof value !== "function") {
          return value;
        }
        if (this.destroyed_ && !RELEASES.has(property)) {
          return () => this.checkOpen(`DrawSink.${String(property)}`);
        }
        const call = value as (...args: unknown[]) => unknown;
        if (DRAW_SETTERS.has(property)) {
          return (handle: DrawHandle, ...args: unknown[]) => {
            const draw = drawOf(handle, String(property));
            draw.calls.delete(property); // the latest goes last when replayed
            draw.calls.set(property, args);
            for (const placed of draw.placed.values()) {
              call.call(w, placed, ...args);
            }
          };
        }
        if (DRAW_READS.has(property)) {
          return (handle: DrawHandle, ...args: unknown[]) => {
            const draw = drawOf(handle, String(property));
            const first = draw.placed.values().next().value;
            if (first !== undefined) {
              return call.call(w, first, ...args);
            }
            if (property === "drawMaterial") {
              return (draw.calls.get("setDrawMaterial")?.[0] ??
                draw.options.material) as number | undefined;
            }
            return undefined; // no item places it: it has no matrix in the world
          };
        }
        return call.bind(w);
      },
      has: (_target, property) => property in world(),
    });
  }
}

/**
 * Content placed in a world (`World.add`): whether it shows and in which
 * views. Each item has its own draws of its content, with its own instance
 * IDs (`ContentItem.key`); the content's edits and feature IDs are shared.
 * @experimental
 */
export class ContentItem {
  private show_: boolean;
  private viewMask_: number;
  private removed_ = false;

  /** @internal Use `World.add`. */
  constructor(
    readonly content: SourceContent,
    readonly world: ContentWorld,
    /** @internal Its key and labels, for the instance IDs of what it draws. */
    readonly identity: ItemIdentity,
    options: ContentItemOptions,
    private readonly onRemove: () => void,
  ) {
    this.show_ = options.show ?? true;
    this.viewMask_ = (options.viewMask ?? ALL_VIEWS) >>> 0;
  }

  /**
   * Its key among the world's items (`ContentItemOptions.id`): what its
   * draws' instance IDs are made with (`InstanceId`).
   */
  get key(): string {
    return this.identity.key;
  }

  /** Whether it draws. Default true. */
  get show(): boolean {
    return this.show_ && !this.removed_;
  }
  set show(show: boolean) {
    if (show === this.show_) {
      return;
    }
    this.show_ = show;
    this.refresh();
  }

  /** Views that draw it and whose cameras its source sees. */
  get viewMask(): number {
    return this.viewMask_;
  }
  set viewMask(mask: number) {
    const m = mask >>> 0;
    if (m === this.viewMask_) {
      return;
    }
    this.viewMask_ = m;
    this.refresh();
  }

  get removed(): boolean {
    return this.removed_;
  }

  /**
   * Stops drawing its content here: its draws leave the world. The content
   * stays open: `World.add` places it again; `SourceContent.destroy` closes it.
   */
  remove(): void {
    if (this.removed_) {
      return;
    }
    this.removed_ = true;
    this.onRemove();
  }

  private refresh(): void {
    if (this.removed_) {
      return;
    }
    this.content.refreshDraws(undefined, this);
  }
}

/** A row as `FeatureData`: its properties, and its geometry in its batch's CRS. */
function rowFeature(
  held: HeldRows<FeatureBatch | PointBatch | CustomRows>,
  index: number,
  sink: string,
): FeatureData {
  const batch = held.batch;
  const columns = "columns" in batch ? batch.columns : batch.properties;
  const properties: Record<string, PlainValue> = {};
  for (const [name, column] of Object.entries(columns ?? {})) {
    const value = (column as ArrayLike<unknown>)[index];
    properties[name] = (value ?? null) as PlainValue;
  }
  if ("text" in batch && batch.text) {
    properties.text = batch.text[index] ?? null;
  }
  const geometry =
    sink === "features" || sink === "points"
      ? rowGeometry(batch as FeatureBatch | PointBatch, index)
      : undefined;
  return {
    ...(Object.keys(properties).length > 0 ? { properties } : {}),
    ...(geometry ? { geometry } : {}),
  };
}

function rowGeometry(
  batch: FeatureBatch | PointBatch,
  index: number,
): GeometryData {
  const p = batch.positions;
  const vertex = (v: number): number[] => [
    p[v * 3]!,
    p[v * 3 + 1]!,
    p[v * 3 + 2]!,
  ];
  const offsets = "offsets" in batch ? batch.offsets : undefined;
  const kind = "geometry" in batch ? batch.geometry : "point";
  if (!offsets || kind === "point" || kind === "label") {
    return {
      crs: batch.crs,
      type: "Point",
      coordinates: vertex(offsets ? offsets[index]! : index),
    };
  }
  const first = offsets[index]!;
  const end = offsets[index + 1]!;
  if (kind === "line") {
    const line: number[][] = [];
    for (let v = first; v < end; v++) {
      line.push(vertex(v));
    }
    return { crs: batch.crs, type: "LineString", coordinates: line };
  }
  const holes = (batch as FeatureBatch).holes?.[index] ?? new Uint32Array();
  const starts = [first, ...holes, end];
  const rings: number[][][] = [];
  for (let r = 0; r + 1 < starts.length; r++) {
    const ring: number[][] = [];
    for (let v = starts[r]!; v < starts[r + 1]!; v++) {
      ring.push(vertex(v));
    }
    rings.push(ring);
  }
  return { crs: batch.crs, type: "Polygon", coordinates: rings };
}
