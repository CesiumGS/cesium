/**
 * The engine's side of the row sinks (CS-847): what a source writes to
 * `RasterSink`, `FeatureSink`, `PointSink` and custom rows, held per
 * content by content key, each row with its feature ID (CS-815, CS-957 A) and each
 * batch with its credits. The edit layer and queries read them; the
 * renderer halves that draw them come with their sources (imagery with
 * CS-555, features with CS-557, render features with CS-841's item).
 *
 * The override contract: a source keys everything by its own keys and never
 * sees overrides. A row's feature ID is the projection of its batch's
 * `names` entry (the source's own key, the same at every level), or else of
 * the batch's key and its index, in its content's namespace (its name,
 * CS-1087 A), and nothing else: never from a scene item, the content's ID or
 * its URL, so every item and every open of the content shares it, in every
 * run. A writable source must name every row (CS-831's S7). A source's keys
 * are one space: a row named `k` and a draw whose `DrawOptions.id` is `k`
 * are one feature.
 */
import {
  type FeatureNamespace,
  type StableId,
  storedId,
} from "../scene/identity.ts";
import type { ChangeOp, FeaturePatch, GeometryData } from "./editing.ts";
import type {
  ContentKey,
  CreditList,
  CustomRows,
  FeatureBatch,
  PointBatch,
  RasterImage,
  PropertyColumn,
  RowIdentity,
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
  /** Its content's namespace, what its rows' feature IDs are projected in: never handed out. */
  readonly #namespace: FeatureNamespace;

  /** `namespace`: its content's. */
  constructor(namespace: FeatureNamespace) {
    this.#namespace = namespace;
  }

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

  /**
   * Applies others' committed changes from its source's feed (`ops`,
   * resolved) to what is resident (CS-1085 A, CS-1102 A). A pushed change
   * has two outcomes only: applied to a resident row, or turned into an
   * invalidation. An update, or an insert of a key a resident row holds,
   * patches its rows in place, as samples do; a delete removes them. An op
   * for a key nothing resident holds, an insert included, is not held: the
   * source's next load brings the committed state, since a source serves
   * content at or past what it pushed, and a source invalidates the content
   * that holds a peer's insert (`SourceChange`). Returns the content keys of
   * batches a patch doesn't fit (a new property, another type, another
   * shape of geometry): the engine invalidates them, and the source loads
   * them again.
   */
  applyFeed(ops: readonly ChangeOp[]): ContentKey[] {
    const stale = new Set<ContentKey>();
    const touched: StableId[] = [];
    for (const op of ops) {
      const id = op.id!;
      const rows = this.rowsOf(id);
      if (rows.length === 0) {
        continue; // not resident: nothing is held
      }
      if (op.op === "delete") {
        this.removeRows(rows);
      } else {
        const patch: FeaturePatch = op.op === "insert" ? op.feature : op.patch;
        for (const at of rows) {
          if (!writeRow(this.batchAt(at)!.batch, at.index, patch)) {
            stale.add(at.key);
          }
        }
      }
      touched.push(id);
    }
    if (touched.length > 0) {
      this.changed(touched);
    }
    return [...stale];
  }

  /** Removes rows `at` from their batches, each batch put again without them. */
  private removeRows(rows: readonly RowAt[]): void {
    const byBatch = new Map<string, { at: RowAt; drop: Set<number> }>();
    for (const at of rows) {
      const batchKey = `${at.sink}\u0000${at.key}`;
      const entry = byBatch.get(batchKey) ?? { at, drop: new Set() };
      entry.drop.add(at.index);
      byBatch.set(batchKey, entry);
    }
    for (const { at, drop } of byBatch.values()) {
      const map = this.mapOf(at.sink);
      const held = map.get(at.key)!;
      this.store(at.sink, map, withoutRows(held.batch, drop));
    }
  }

  private mapOf(
    sink: RowSinkName,
  ): Map<ContentKey, HeldRows<FeatureBatch | PointBatch | CustomRows>> {
    for (const [name, map] of this.rowMaps()) {
      if (name === sink) {
        return map;
      }
    }
    throw new Error(`no ${sink} sink`);
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

  /** Every ID a resident row holds, in no particular order. */
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
      const id = this.#namespace.featureId(samples.names[s]!);
      for (const at of this.rowsOf(id)) {
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
        touched.push(id);
      }
      applied++;
    }
    if (applied > 0) {
      this.changed(touched);
    }
    return applied;
  }

  /**
   * Where feature `id` is, as its source keys it, while a row of it is held:
   * the row's name, or its batch's key and its index for a row it didn't
   * name. Read from the row itself: no other table maps an ID to a key.
   */
  addressOf(id: StableId): { key: string; row?: number } | undefined {
    const at = this.byId.get(id)?.[0];
    if (!at) {
      return undefined;
    }
    const name = (this.batchAt(at)!.batch as RowIdentity).names?.[at.index];
    return name !== undefined ? { key: name } : { key: at.key, row: at.index };
  }

  /** The source's key for feature `id`, while a row it wrote and names so is held. */
  nameOf(id: StableId): string | undefined {
    const address = this.addressOf(id);
    return address?.row === undefined ? address?.key : undefined;
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
        this.store(name, map, batch);
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

  /** Holds `batch` in `map`, in place of what its key held, and indexes its rows. */
  private store<B extends FeatureBatch | PointBatch | CustomRows>(
    name: RowSinkName,
    map: Map<ContentKey, HeldRows<B>>,
    batch: B,
  ): BigUint64Array {
    const gone: StableId[] = [];
    const was = map.get(batch.key);
    if (was) {
      this.unindex(name, batch.key, was.ids, gone);
    }
    const ids = this.idsOf(batch);
    map.set(batch.key, { batch, ids });
    for (let i = 0; i < ids.length; i++) {
      const id = storedId(ids[i]!);
      let rows = this.byId.get(id);
      if (!rows) {
        rows = [];
        this.byId.set(id, rows);
      }
      rows.push({ sink: name, key: batch.key, index: i });
    }
    this.changed([...gone, ...Array.from(ids, storedId)]);
    return ids;
  }

  private idsOf(batch: FeatureBatch | PointBatch | CustomRows): BigUint64Array {
    const ids = new BigUint64Array(batch.count);
    const namespace = this.#namespace;
    for (let i = 0; i < batch.count; i++) {
      const name = batch.names?.[i];
      if (name !== undefined) {
        ids[i] = namespace.featureId(name);
      } else {
        ids[i] = namespace.featureId(batch.key, i);
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
    for (const word of ids) {
      const id = storedId(word);
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
// The feed's changes, in place

/**
 * Writes `patch` into row `index` of `batch` in place, when every part of it
 * fits what the batch holds: a property into its column of a type that
 * holds the value as given (a number a typed column stores exactly; a string
 * or null into a string column, null being absent there), a label's text,
 * and a geometry of the row's type, CRS and vertex and ring counts. Writes
 * nothing and returns false otherwise.
 */
function writeRow(
  batch: FeatureBatch | PointBatch | CustomRows,
  index: number,
  patch: FeaturePatch,
): boolean {
  const columns: Readonly<Record<string, PropertyColumn>> =
    ("columns" in batch ? batch.columns : batch.properties) ?? {};
  const text = "text" in batch ? batch.text : undefined;
  const writes: (() => void)[] = [];
  for (const [name, value] of Object.entries(patch.properties ?? {})) {
    // An own column only: a name like `__proto__` reaches nothing.
    const column = Object.hasOwn(columns, name) ? columns[name] : undefined;
    if (name === "text" && text && !column) {
      if (typeof value !== "string") {
        return false;
      }
      writes.push(() => ((text as string[])[index] = value));
    } else if (Array.isArray(column)) {
      if (value !== null && typeof value !== "string") {
        return false;
      }
      writes.push(() => ((column as (string | null)[])[index] = value));
    } else if (column && ArrayBuffer.isView(column)) {
      const typed = column as Exclude<PropertyColumn, readonly unknown[]>;
      const Same = typed.constructor as new (values: number[]) => typeof typed;
      if (typeof value !== "number" || new Same([value])[0] !== value) {
        return false;
      }
      writes.push(() => (typed[index] = value));
    } else {
      return false;
    }
  }
  if (patch.geometry) {
    const at = vertexRange(batch, index, patch.geometry);
    if (!at) {
      return false;
    }
    writes.push(() =>
      (batch as FeatureBatch | PointBatch).positions.set(
        at.values,
        at.first * 3,
      ),
    );
  }
  for (const write of writes) {
    write();
  }
  return true;
}

/** Where `geometry`'s vertices go in row `index`, when it has the row's type, CRS and shape. */
function vertexRange(
  batch: FeatureBatch | PointBatch | CustomRows,
  index: number,
  geometry: GeometryData,
): { first: number; values: Float64Array } | undefined {
  if (!("positions" in batch) || geometry.crs !== batch.crs) {
    return undefined;
  }
  const kind = "geometry" in batch ? batch.geometry : "point";
  const offsets = "offsets" in batch ? batch.offsets : undefined;
  const type = {
    point: "Point",
    label: "Point",
    line: "LineString",
    polygon: "Polygon",
  }[kind];
  if (geometry.type !== type) {
    return undefined;
  }
  const rings = (
    kind === "polygon"
      ? geometry.coordinates
      : kind === "line"
        ? [geometry.coordinates]
        : [[geometry.coordinates]]
  ) as number[][][];
  const first = offsets ? offsets[index]! : index;
  const end = offsets ? offsets[index + 1]! : index + 1;
  const holes = (batch as FeatureBatch).holes?.[index] ?? [];
  const starts = kind === "polygon" ? [first, ...holes, end] : [first, end];
  if (rings.length !== starts.length - 1) {
    return undefined;
  }
  const values: number[] = [];
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r]!;
    if (ring.length !== starts[r + 1]! - starts[r]!) {
      return undefined;
    }
    for (const vertex of ring) {
      if (vertex.length !== 3) {
        return undefined;
      }
      values.push(...vertex);
    }
  }
  return { first, values: Float64Array.from(values) };
}

/** `batch` without the rows in `drop`: its columns, names, text, vertices, offsets and holes. */
function withoutRows<B extends FeatureBatch | PointBatch | CustomRows>(
  batch: B,
  drop: ReadonlySet<number>,
): B {
  const keep: number[] = [];
  for (let i = 0; i < batch.count; i++) {
    if (!drop.has(i)) {
      keep.push(i);
    }
  }
  const pick = (
    columns: Readonly<Record<string, PropertyColumn>> | undefined,
  ): Record<string, PropertyColumn> | undefined => {
    if (!columns) {
      return undefined;
    }
    const out: Record<string, PropertyColumn> = {};
    for (const [name, column] of Object.entries(columns)) {
      out[name] = Array.isArray(column)
        ? keep.map((i) => (column as readonly (string | null)[])[i]!)
        : new (column.constructor as new (values: number[]) => PropertyColumn)(
            keep.map((i) => (column as ArrayLike<number>)[i]!),
          );
    }
    return out;
  };
  const out: Record<string, unknown> = { ...batch, count: keep.length };
  if (batch.names) {
    out.names = keep.map((i) => batch.names![i]);
  }
  if ("columns" in batch) {
    out.columns = pick(batch.columns);
    return out as unknown as B;
  }
  if (batch.properties) {
    out.properties = pick(batch.properties);
  }
  if ("text" in batch && batch.text) {
    out.text = keep.map((i) => batch.text![i]!);
  }
  const p = batch.positions;
  const offsets = "offsets" in batch ? batch.offsets : undefined;
  const positions: number[] = [];
  const newOffsets = [0];
  const holes: Uint32Array[] = [];
  for (const i of keep) {
    const first = offsets ? offsets[i]! : i;
    const end = offsets ? offsets[i + 1]! : i + 1;
    const shift = newOffsets.at(-1)! - first;
    positions.push(...p.subarray(first * 3, end * 3));
    newOffsets.push(newOffsets.at(-1)! + end - first);
    const ownHoles = (batch as FeatureBatch).holes?.[i];
    holes.push(Uint32Array.from(ownHoles ?? [], (h) => h + shift));
  }
  out.positions = Float64Array.from(positions);
  if (offsets) {
    out.offsets = Uint32Array.from(newOffsets);
  }
  if ((batch as FeatureBatch).holes) {
    out.holes = holes;
  }
  return out as unknown as B;
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
