/**
 * The engine's side of the row sinks (CS-847): what a source writes to
 * `RasterSink`, `FeatureSink`, `PointSink` and custom rows, held per
 * content by content key, each row with its feature ID (CS-815, CS-957 A) and each
 * batch with its credits. The edit layer and queries read them; the
 * renderer halves that draw them come with their sources (imagery with
 * CS-555, features with CS-557, render features with CS-841's item).
 *
 * The override contract: a source keys everything by its own keys and never
 * sees overrides. A row's feature ID is made from its content (its content
 * ID and canonical source) and its batch's `names` entry (the source's own
 * key, the same at every level), or else from the batch's key and its index:
 * never from a scene item, so every item of the content shares it. A
 * writable source must name every row (CS-831's S7).
 */
import { stableIdOf, type StableId } from "../scene/identity.ts";
import type {
  ContentKey,
  CreditList,
  CustomRows,
  FeatureBatch,
  PointBatch,
  RasterImage,
  RowSink,
  SampleBatch,
} from "./types.ts";

/** Which sink a row is in. */
export type RowSinkName = "features" | "points" | `custom:${string}`;

/**
 * A batch as the engine holds it: the source's, with each row's ID.
 * @experimental
 */
export interface HeldRows<B> {
  readonly batch: B;
  /** One stable ID per row. */
  readonly ids: BigUint64Array;
}

/** Where one row is. */
export interface RowAt {
  readonly sink: RowSinkName;
  readonly key: ContentKey;
  readonly index: number;
}

/** What makes the rows' feature IDs: the content's ID and canonical source. */
export interface RowIdentityContext {
  /** The content's ID (`SourceContent.id`). */
  readonly content: string;
  readonly source: string;
}

/**
 * The feature ID of the row its source names `name` in content
 * `identity` (`FeatureId`): CS-815's `named` key, with the content's ID
 * where the key has its item, until CS-961 gives feature IDs a key kind of
 * their own.
 */
export function featureIdOf(
  identity: RowIdentityContext,
  name: string,
): StableId {
  return stableIdOf({
    kind: "named",
    item: identity.content,
    source: identity.source,
    name,
  });
}

/**
 * Every row sink of one content, with the index from stable ID to rows.
 * @experimental
 */
export class ContentRows {
  readonly images = new Map<ContentKey, RasterImage>();
  readonly features = new Map<ContentKey, HeldRows<FeatureBatch>>();
  readonly points = new Map<ContentKey, HeldRows<PointBatch>>();
  /** By render feature, then by content key. */
  readonly custom = new Map<string, Map<ContentKey, HeldRows<CustomRows>>>();
  /** Every row of every batch, by its ID (a named feature may be in several tiles). */
  private readonly byId = new Map<StableId, RowAt[]>();
  /** Bumped by every change: what reads rows checks it. */
  revision = 0;
  /** Called after each change, with the IDs it touched. */
  onChange: ((ids: readonly StableId[]) => void) | undefined;
  /** Its source can write: every row must then be named (CS-831's S7). */
  writable = false;
  private closed = false;

  constructor(private readonly identity: RowIdentityContext) {}

  /** The sinks a source writes, over these rows. */
  sinks(): {
    images: RowSink<RasterImage>;
    features: RowSink<FeatureBatch>;
    points: RowSink<PointBatch>;
    custom(feature: string): RowSink<CustomRows>;
  } {
    return {
      images: {
        put: (image) => {
          this.checkOpen("RasterSink.put");
          checkRaster(image);
          this.images.set(image.key, image);
          this.changed([]);
        },
        remove: (key) => {
          if (!this.closed && this.images.delete(key)) {
            this.changed([]);
          }
        },
      },
      features: this.rowSink("features", this.features, checkFeatures),
      points: this.rowSink("points", this.points, checkPoints),
      custom: (feature) => {
        if (typeof feature !== "string" || feature.length === 0) {
          throw new TypeError(
            "ContentSinks.custom: a render feature's ID is a non-empty string.",
          );
        }
        let map = this.custom.get(feature);
        if (!map) {
          map = new Map();
          this.custom.set(feature, map);
        }
        return this.rowSink(`custom:${feature}`, map, checkCustom);
      },
    };
  }

  /** Its content was destroyed: every put throws from now on, and removes do nothing. */
  close(): void {
    this.closed = true;
  }

  private checkOpen(where: string): void {
    if (this.closed) {
      throw new Error(`${where}: the content is destroyed.`);
    }
  }

  /** Where the rows with `id` are (empty: none loaded). */
  rowsOf(id: StableId): readonly RowAt[] {
    return this.byId.get(id) ?? [];
  }

  /** The batch a row is in. */
  batchAt(
    at: RowAt,
  ): HeldRows<FeatureBatch | PointBatch | CustomRows> | undefined {
    if (at.sink === "features") {
      return this.features.get(at.key);
    }
    if (at.sink === "points") {
      return this.points.get(at.key);
    }
    return this.custom.get(at.sink.slice("custom:".length))?.get(at.key);
  }

  /** Every ID held, in no particular order. */
  ids(): IterableIterator<StableId> {
    return this.byId.keys();
  }

  /** Each batch's credits, then the images', without repeats (by html). */
  credits(): CreditList {
    const seen = new Map<string, CreditList[number]>();
    const add = (credits: CreditList | undefined) => {
      for (const credit of credits ?? []) {
        if (!seen.has(credit.html)) {
          seen.set(credit.html, credit);
        }
      }
    };
    for (const held of this.features.values()) {
      add(held.batch.credits);
    }
    for (const held of this.points.values()) {
      add(held.batch.credits);
    }
    for (const map of this.custom.values()) {
      for (const held of map.values()) {
        add(held.batch.credits);
      }
    }
    for (const image of this.images.values()) {
      add(image.credits);
    }
    return [...seen.values()];
  }

  /**
   * Drops what `keys` hold in every sink (an invalidation). Returns the
   * IDs that left.
   */
  drop(keys: readonly ContentKey[]): StableId[] {
    const gone: StableId[] = [];
    let any = false;
    for (const key of keys) {
      any = this.images.delete(key) || any;
      for (const [name, map] of this.rowMaps()) {
        const held = map.get(key);
        if (held) {
          map.delete(key);
          this.unindex(name, key, held.ids, gone);
          any = true;
        }
      }
    }
    if (any) {
      this.changed(gone);
    }
    return gone;
  }

  /** Every content key held, in any sink. */
  keys(): Set<ContentKey> {
    const out = new Set<ContentKey>(this.images.keys());
    for (const [, map] of this.rowMaps()) {
      for (const key of map.keys()) {
        out.add(key);
      }
    }
    return out;
  }

  /**
   * Applies samples that are due: each moves every row named by its
   * `names` entry, in time order (ties in the batch's order), so a
   * replayed feed gives the same rows. Returns how many applied.
   */
  applySamples(samples: SampleBatch, from: number, to: number): number {
    let applied = 0;
    const touched: StableId[] = [];
    for (let s = from; s < to; s++) {
      const name = samples.names[s]!;
      const id = this.nameIds.get(name);
      for (const at of id === undefined ? [] : this.rowsOf(id)) {
        const held = this.batchAt(at) as HeldRows<PointBatch | FeatureBatch>;
        if (samples.positions && "positions" in held.batch) {
          const vertex =
            "offsets" in held.batch && held.batch.offsets
              ? held.batch.offsets[at.index]!
              : at.index;
          held.batch.positions.set(
            samples.positions.subarray(s * 3, s * 3 + 3),
            vertex * 3,
          );
        }
        for (const [property, values] of Object.entries(samples.values ?? {})) {
          const column = held.batch.properties?.[property];
          if (column && !Array.isArray(column)) {
            (column as Float64Array)[at.index] = values[s]!;
          }
        }
        touched.push(id!);
      }
      applied++;
    }
    if (applied > 0) {
      this.changed(touched);
    }
    return applied;
  }

  /** Every name's ID, for samples. */
  private readonly nameIds = new Map<string, StableId>();
  /** Every named row's name, by its ID: the source's key for a feature ID. */
  private readonly idNames = new Map<StableId, string>();

  /** The source's key for feature `id`, when a row it wrote named it. */
  nameOf(id: StableId): string | undefined {
    return this.idNames.get(id);
  }

  private *rowMaps(): Generator<
    [
      RowSinkName,
      Map<ContentKey, HeldRows<FeatureBatch | PointBatch | CustomRows>>,
    ]
  > {
    yield ["features", this.features];
    yield ["points", this.points];
    for (const [feature, map] of this.custom) {
      yield [`custom:${feature}`, map];
    }
  }

  private rowSink<B extends FeatureBatch | PointBatch | CustomRows>(
    name: RowSinkName,
    map: Map<ContentKey, HeldRows<B>>,
    check: (batch: B) => void,
  ): RowSink<B> {
    return {
      put: (batch) => {
        this.checkOpen(`the ${name} sink's put`);
        check(batch);
        checkNames(batch, this.writable);
        const gone: StableId[] = [];
        const was = map.get(batch.key);
        if (was) {
          this.unindex(name, batch.key, was.ids, gone);
        }
        const ids = this.idsOf(batch);
        map.set(batch.key, { batch, ids });
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          let rows = this.byId.get(id);
          if (!rows) {
            rows = [];
            this.byId.set(id, rows);
          }
          rows.push({ sink: name, key: batch.key, index: i });
        }
        this.changed([...gone, ...ids]);
      },
      remove: (key) => {
        const held = this.closed ? undefined : map.get(key);
        if (held) {
          const gone: StableId[] = [];
          map.delete(key);
          this.unindex(name, key, held.ids, gone);
          this.changed(gone);
        }
      },
    };
  }

  private idsOf(batch: FeatureBatch | PointBatch | CustomRows): BigUint64Array {
    const ids = new BigUint64Array(batch.count);
    const { content, source } = this.identity;
    for (let i = 0; i < batch.count; i++) {
      const name = batch.names?.[i];
      if (name !== undefined) {
        const id = featureIdOf(this.identity, name);
        this.nameIds.set(name, id);
        this.idNames.set(id, name);
        ids[i] = id;
      } else {
        ids[i] = stableIdOf({
          kind: "content",
          item: content,
          source,
          content: batch.key,
          set: 0,
          feature: i,
        });
      }
    }
    return ids;
  }

  private unindex(
    name: RowSinkName,
    key: ContentKey,
    ids: BigUint64Array,
    gone: StableId[],
  ): void {
    for (const id of ids) {
      const rows = this.byId.get(id);
      if (!rows) {
        continue;
      }
      const left = rows.filter((r) => !(r.sink === name && r.key === key));
      if (left.length === 0) {
        this.byId.delete(id);
        gone.push(id);
      } else {
        this.byId.set(id, left);
      }
    }
  }

  private changed(ids: readonly StableId[]): void {
    this.revision++;
    this.onChange?.(ids);
  }
}

// ---------------------------------------------------------------------------
// What a sink refuses, naming the field and never a value

function checkCount(count: number, where: string): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(
      `${where}: count is ${count}; it takes a whole number from 0.`,
    );
  }
}

function checkKey(key: unknown, where: string): void {
  if (typeof key !== "string" || key.length === 0) {
    throw new TypeError(`${where}: a batch's key is a non-empty string.`);
  }
}

function checkColumns(
  columns: Readonly<Record<string, ArrayLike<unknown>>> | undefined,
  count: number,
  where: string,
): void {
  for (const [name, column] of Object.entries(columns ?? {})) {
    if (column.length !== count) {
      throw new RangeError(
        `${where}: column "${name}" has ${column.length} rows, not ${count}.`,
      );
    }
  }
}

function checkPositions(
  positions: Float64Array,
  vertices: number,
  crs: string,
  where: string,
): void {
  if (typeof crs !== "string" || crs.length === 0) {
    throw new TypeError(`${where}: a batch names its CRS.`);
  }
  if (
    !(positions instanceof Float64Array) ||
    positions.length !== vertices * 3
  ) {
    throw new RangeError(
      `${where}: positions are ${vertices} float64 x, y, z triples (${vertices * 3} numbers).`,
    );
  }
}

function checkFeatures(batch: FeatureBatch): void {
  const where = "FeatureSink.put";
  checkKey(batch.key, where);
  checkCount(batch.count, where);
  let vertices = batch.count;
  if (batch.offsets) {
    if (batch.offsets.length !== batch.count + 1) {
      throw new RangeError(
        `${where}: offsets has ${batch.offsets.length} entries, not count + 1.`,
      );
    }
    const offsets = batch.offsets;
    if (offsets[0] !== 0) {
      throw new RangeError(`${where}: offsets start at 0.`);
    }
    for (let i = 0; i < batch.count; i++) {
      if (!(offsets[i + 1]! > offsets[i]!)) {
        throw new RangeError(
          `${where}: offsets increase: feature ${i} has no vertices.`,
        );
      }
    }
    vertices = offsets[batch.count]!;
    checkHoles(batch, where);
  } else if (batch.geometry === "line" || batch.geometry === "polygon") {
    throw new TypeError(`${where}: a ${batch.geometry} batch has offsets.`);
  }
  checkPositions(batch.positions, vertices, batch.crs, where);
  if (batch.text && batch.text.length !== batch.count) {
    throw new RangeError(
      `${where}: text has ${batch.text.length} entries, not ${batch.count}.`,
    );
  }
  checkColumns(batch.properties, batch.count, where);
}

/** Each feature's holes start inside it, after its first vertex, in increasing order. */
function checkHoles(batch: FeatureBatch, where: string): void {
  const holes = batch.holes;
  if (holes === undefined) {
    return;
  }
  if (holes.length !== batch.count) {
    throw new RangeError(
      `${where}: holes has ${holes.length} entries, not count (${batch.count}).`,
    );
  }
  const offsets = batch.offsets!;
  for (let i = 0; i < batch.count; i++) {
    const starts = holes[i];
    if (starts === undefined || starts.length === 0) {
      continue;
    }
    let previous = offsets[i]!;
    for (const start of starts) {
      if (!(start > previous) || start >= offsets[i + 1]!) {
        throw new RangeError(
          `${where}: feature ${i}'s holes start inside it, after its outer ring, in increasing order.`,
        );
      }
      previous = start;
    }
  }
}

function checkPoints(batch: PointBatch): void {
  const where = "PointSink.put";
  checkKey(batch.key, where);
  checkCount(batch.count, where);
  checkPositions(batch.positions, batch.count, batch.crs, where);
  checkColumns(batch.properties, batch.count, where);
}

function checkCustom(batch: CustomRows): void {
  const where = "CustomSink.put";
  checkKey(batch.key, where);
  checkCount(batch.count, where);
  checkColumns(batch.columns, batch.count, where);
}

function checkRaster(image: RasterImage): void {
  const where = "RasterSink.put";
  checkKey(image.key, where);
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0
  ) {
    throw new RangeError(
      `${where}: width and height are whole numbers above 0.`,
    );
  }
  if (
    image.pixels.format === "rgba8" &&
    image.pixels.data.length !== image.width * image.height * 4
  ) {
    throw new RangeError(
      `${where}: rgba8 pixels are width × height × 4 bytes.`,
    );
  }
}

function checkNames(
  batch: {
    readonly names?: readonly (string | undefined)[];
    readonly count: number;
  },
  writable: boolean,
): void {
  if (batch.names && batch.names.length !== batch.count) {
    throw new RangeError(
      `a batch's names have ${batch.names.length} entries, not ${batch.count}.`,
    );
  }
  if (writable && (!batch.names || batch.names.some((n) => n === undefined))) {
    throw new TypeError(
      "a writable source names every row (its source key), so an edit maps to its feature at every level (CS-831).",
    );
  }
}
