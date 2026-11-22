/**
 * Content an open source gives (`Engine.open`), and its items
 * (`World.add`) (CS-847). A source is content; an item is content placed in
 * a world. The content holds what its source wrote: draws in its world,
 * rows in the row sinks (`ContentRows`), and the edit layer over both
 * (`EditLayer`), so every read through it sees the edits.
 *
 * In this version content belongs to one world, the first it is added to,
 * and has one item there, as a tileset's first item; several items of one
 * content come with CS-554, which makes items general.
 *
 * One ID scheme: every stable ID a content gives, its rows' and its draws',
 * is made with its content ID (`SourceContent.id`) as the item, and its
 * item's key is that ID (`World.add`). So IDs don't change when an item is
 * removed and the content placed again, and two open contents never share
 * them (`Engine.open` refuses or numbers a second of one ID).
 *
 * Once destroyed, its sinks refuse writes (they throw), its source's jobs
 * are canceled and its pushes dropped; a draw sink's releases still pass,
 * so a source's own `destroy` can free what it made.
 */
import {
  canonicalSource,
  stableIdOf,
  type ItemIdentity,
  type StableId,
} from "../scene/identity.ts";
import type { DrawHandle, DrawOptions } from "../scene/world/types.ts";
import type { DrawSink } from "../streaming/DrawSink.ts";
import { isReadOnly, type FeatureData, type GeometryData } from "./editing.ts";
import { EditLayer } from "./editLayer.ts";
import { ContentRows, type HeldRows } from "./sinks.ts";
import type {
  ContentSource,
  CreditList,
  CustomRows,
  FeatureBatch,
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
}

/**
 * What `World.add` takes for content; each but `id` can change later on the item.
 * @experimental
 */
export interface ContentItemOptions {
  /**
   * The item's key, for its stable IDs: always its content's ID
   * (`Engine.open`'s `id`), so another value is refused. Its rows and draws
   * share one ID scheme.
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

/** The shortest interval a source may declare for checking its server (CS-863). */
const MIN_POLL_SECONDS = 1;

/** What a draw sink still does once its content is destroyed: free what was made. */
const RELEASES: ReadonlySet<PropertyKey> = new Set([
  "removeMesh",
  "removeTransform",
  "removeDraw",
  "freeClip",
]);

interface TrackedDraw {
  readonly handle: DrawHandle;
  /** Its ID when it has no features (one ID for the whole draw). */
  readonly id: StableId | undefined;
}

/**
 * Content an open source gives: what `World.add` places.
 * @experimental
 */
export class SourceContent {
  /** The rows its source wrote to the row sinks. @internal */
  readonly rows: ContentRows;
  /**
   * The edit layer: hide, replace and insert by stable ID (CS-865), over
   * everything this content shows.
   * @experimental
   */
  readonly edits = new EditLayer();
  /** @internal Others' changes from the source's feed (`features` pushes), under `edits`. */
  readonly feed = new EditLayer();
  /** The canonical reference its IDs are made from, without credentials or query tokens. */
  readonly source: string;
  private source_: ContentSource | undefined;
  private world_: ContentWorld | undefined;
  private item_: ContentItem | undefined;
  /**
   * Its item's identity, kept once its item is removed: a draw its source
   * adds then (a job finishing late) has the same IDs it would have placed.
   */
  private identity_: ItemIdentity | undefined;
  private readonly draws = new Map<string, TrackedDraw>();
  private readonly drawsById = new Map<StableId, Set<string>>();
  private invalidated: InvalidateChange[] = [];
  private destroyed_ = false;
  /** The draw sink its source writes: the world's, once placed. @internal */
  readonly drawSink: DrawSink;
  /** Called when it's destroyed. @internal */
  onDestroy: (() => void) | undefined;

  /** @internal Use `Engine.open`. */
  constructor(
    /** The content's ID: `Engine.open`'s `id`, else its canonical source. */
    readonly id: string,
    readonly asset: ResolvedAsset,
    readonly kind: string,
  ) {
    this.source = canonicalSource(asset.url.href);
    this.rows = new ContentRows({ item: id, source: this.source });
    this.drawSink = this.makeDrawSink();
    const reapply = (ids: readonly StableId[]) => this.refreshDraws(ids);
    this.edits.onChange(reapply);
    this.feed.onChange(reapply);
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

  /** Its item, while one places it. */
  get item(): ContentItem | undefined {
    return this.item_;
  }

  get destroyed(): boolean {
    return this.destroyed_;
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
  feature(id: StableId): FeatureData | undefined {
    for (const layer of [this.edits, this.feed]) {
      const o = layer.get(id);
      if (o) {
        return o.kind === "hide" ? undefined : o.feature;
      }
    }
    return this.baseFeature(id);
  }

  /**
   * Every feature it shows now, edits applied: rows, then draws, then
   * inserts, each once.
   * @experimental
   */
  *features(): IterableIterator<{ id: StableId; feature: FeatureData }> {
    const seen = new Set<StableId>();
    const visit = function* (
      this: SourceContent,
      id: StableId,
    ): Generator<{ id: StableId; feature: FeatureData }> {
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

  /** @internal Its source's draw `id` shows: not hidden by an edit, and its item shown. */
  shows(id: StableId): boolean {
    return (
      (this.item_?.show ?? false) &&
      this.edits.showsBase(id) &&
      this.feed.showsBase(id)
    );
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
    if (this.item_ !== undefined) {
      release();
      throw new Error(
        "World.add: the content has an item already; one item per content until items are general (CS-554).",
      );
    }
    this.world_ = world;
    this.identity_ = identity;
    const item = new ContentItem(this, world, identity, options, () => {
      this.item_ = undefined;
      this.refreshDraws(undefined);
      release();
    });
    this.item_ = item;
    this.refreshDraws(undefined);
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

  /** @internal The draws its source holds now. */
  get drawCount(): number {
    return this.draws.size;
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
      const world = this.world_;
      for (const tracked of [...this.draws.values()]) {
        world?.removeDraw(tracked.handle);
      }
      this.draws.clear();
      this.drawsById.clear();
      this.item_?.remove();
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
  baseFeature(id: StableId): FeatureData | undefined {
    const at = this.rows.rowsOf(id)[0];
    if (at) {
      const held = this.rows.batchAt(at)!;
      return rowFeature(held, at.index, at.sink);
    }
    return this.drawsById.has(id) ? {} : undefined;
  }

  /** @internal Visibility and view masks on its draws: those with `ids`, or all. */
  refreshDraws(ids: readonly StableId[] | undefined): void {
    const world = this.world_;
    if (!world) {
      return;
    }
    const keys = ids
      ? ids.flatMap((id) => [...(this.drawsById.get(id) ?? [])])
      : [...this.draws.keys()];
    const mask = this.item_?.viewMask ?? ALL_VIEWS;
    const shown = this.item_?.show ?? false;
    for (const key of keys) {
      const tracked = this.draws.get(key);
      if (!tracked) {
        continue;
      }
      world.setVisible(
        tracked.handle,
        tracked.id === undefined ? shown : this.shows(tracked.id),
      );
      if (!ids) {
        world.setViewMask(tracked.handle, mask);
      }
    }
  }

  /**
   * `DrawSink` as it is, over its world: each draw it adds names its
   * content (`DrawOptions.id`), gets its item's identity for its stable
   * IDs, and starts hidden where an edit hides it.
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
      const w = world();
      const item = this.identity_;
      const handle = w.addDraw({
        ...options,
        viewMask: this.item_?.viewMask ?? ALL_VIEWS,
        identity: options.identity ?? {
          source: this.source,
          content: options.id,
          set: options.features ? 0 : -1,
          scope: "tile",
          ...(item ? { item } : {}),
        },
      });
      const id = options.features
        ? undefined
        : stableIdOf({
            kind: "draw",
            item: this.id,
            source: this.source,
            content: options.id,
          });
      const key = `${handle.index}:${handle.generation}`;
      this.draws.set(key, { handle, id });
      if (id !== undefined) {
        let set = this.drawsById.get(id);
        if (!set) {
          set = new Set();
          this.drawsById.set(id, set);
        }
        set.add(key);
      }
      w.setVisible(
        handle,
        id === undefined ? (this.item_?.show ?? false) : this.shows(id),
      );
      return handle;
    };
    const removeDraw = (handle: DrawHandle): void => {
      const key = `${handle.index}:${handle.generation}`;
      const tracked = this.draws.get(key);
      if (tracked) {
        this.draws.delete(key);
        if (tracked.id !== undefined) {
          const set = this.drawsById.get(tracked.id);
          set?.delete(key);
          if (set?.size === 0) {
            this.drawsById.delete(tracked.id);
          }
        }
      } else if (this.destroyed_) {
        return; // removed with its content
      }
      world().removeDraw(handle);
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
        return (value as (...args: unknown[]) => unknown).bind(w);
      },
      has: (_target, property) => property in world(),
    });
  }
}

/**
 * Content placed in a world (`World.add`): whether it shows and in which views.
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
    /** @internal Its key and labels, for the stable IDs of what it draws. */
    readonly identity: ItemIdentity,
    options: ContentItemOptions,
    private readonly onRemove: () => void,
  ) {
    this.show_ = options.show ?? true;
    this.viewMask_ = (options.viewMask ?? ALL_VIEWS) >>> 0;
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
   * Stops drawing the content and stops its updates. The content stays
   * open: `World.add` places it again; `SourceContent.destroy` closes it.
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
    this.content.refreshDraws(undefined);
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
