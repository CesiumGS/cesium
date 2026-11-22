/**
 * Stable identity and semantic labels (CS-815, built from
 * docs/design/semantic-metadata-and-picking.md, CS-832).
 *
 * Every pickable thing has a `StableId`: a 64-bit hash of a canonical key
 * (`StableKey`) made from what the content is (its item, its source, its
 * content and feature), never from the order it loaded in. Picks, ray hits
 * and ID images (CS-813) all return it. Labels are short strings grouped by
 * taxonomy (`{ class: ["car"] }`), as USD's `SemanticsLabelsAPI` groups them
 * by instance name, kept apart from properties, and resolved by precedence.
 *
 * The encoding (the executor's call, CS-815):
 * - The canonical key is `JSON.stringify` of an array: the kind, then the
 *   key's fields in the order `StableKey` lists them. JSON's escaping makes
 *   it unambiguous for any strings.
 * - The `StableId` is the first 64 bits of MurmurHash3_x86_128 (seed 0) of
 *   the key's UTF-8 bytes: the hash's first two 32-bit words `h1` and `h2`,
 *   as `h2 << 32 | h1`, the little-endian `uint64` its first 8 output bytes
 *   hold. Any language's MurmurHash3 gives the same IDs from the same keys.
 * - 0 is never an ID ("nothing here" in an ID image): a key that hashes to 0
 *   takes 1.
 *
 * Outside specifications this follows, each read on 2026-11-22, as data:
 * - glTF `EXT_mesh_features`
 *   (https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_mesh_features):
 *   "A mesh primitive may specify multiple sets of feature IDs"; a set's
 *   `label` identifies it "across different glTF primitives"; the spec says
 *   nothing of which set identifies, so the first set read is the identity
 *   set (the design's rule).
 * - glTF `EXT_structural_metadata`
 *   (https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata,
 *   and its `schema/class.property.schema.json`): a class property's
 *   `semantic` is "An identifier that describes how this property should be
 *   interpreted".
 * - The 3D Metadata Semantic Reference
 *   (https://github.com/CesiumGS/3d-tiles/blob/main/specification/Metadata/Semantics/README.adoc):
 *   `ID`, of type `STRING`, is "The unique identifier for the entity". No
 *   semantic there names a class label: a taxonomy comes from a property the
 *   host names (`TaxonomyDeclaration`).
 * - OpenUSD `UsdSemanticsLabelsAPI`
 *   (https://openusd.org/dev/api/class_usd_semantics_labels_a_p_i.html):
 *   a multiple-apply schema whose instance name is the taxonomy, with a
 *   `token[]` attribute `semantics:labels:<taxonomy>`. Its query
 *   (`UsdSemanticsLabelsQuery::ComputeUniqueInheritedLabels`) takes the
 *   union of a prim's labels and its ancestors'. The design keeps the
 *   nearest level per taxonomy instead (`resolveLabels`); a USD source
 *   (CS-559) resolves its own labels before they reach the engine.
 */
import type { FeatureTable, FeatureValue } from "../io/gltfTypes.ts";

/** A thing's identity: a 64-bit hash of its `StableKey` (never 0). */
export type StableId = bigint;

/**
 * Taxonomy name to labels: `{ class: ["car"] }`. Labels in a taxonomy are a
 * set: sorted and without repeats wherever the engine hands them out.
 */
export type Labels = Readonly<Record<string, readonly string[]>>;

/**
 * What an ID is a hash of, and so how far it holds.
 * - `content`: feature `feature` of feature-ID set `set` in one content of a
 *   source (a tile's glTF primitive, a model's).
 * - `named`: a feature its content names (an `ID`-semantic property, or the
 *   property `IdentityDeclaration.property` names): the same at every level
 *   of detail.
 * - `draw`: content with no features.
 * - `host`: a host's own key (`DrawOptions.id`).
 *
 * `item` is the scene item's key (`SceneItemOptions.id`, else the content's
 * source); `source` is the asset's canonical reference (`canonicalSource`),
 * without credentials or query tokens; `content` is the tile's content URI
 * relative to its tileset, or the glTF node and primitive (`n3/p0`).
 */
export type StableKey =
  | {
      readonly kind: "content";
      readonly item: string;
      readonly source: string;
      readonly content: string;
      readonly set: number;
      readonly feature: number;
    }
  | {
      readonly kind: "named";
      readonly item: string;
      readonly source: string;
      readonly name: string;
    }
  | {
      readonly kind: "draw";
      readonly item: string;
      readonly source: string;
      readonly content: string;
    }
  | { readonly kind: "host"; readonly item: string; readonly key: string };

/** How a pick's answer was made: from a surface, a point, a splat or a field. */
export type PickBasis = "surface" | "point" | "splat" | "field";

/**
 * How a source's IDs are made, and how far they hold.
 * - `"global"`: one feature has one ID at every level and in every tile.
 * - `"tile"`: an ID holds across reloads and runs, but a coarser tile's copy
 *   of the same feature has another.
 */
export interface IdentityDeclaration {
  readonly scope?: "global" | "tile";
  /** The property whose value names a feature (an element ID from a BIM export): it makes IDs global. */
  readonly property?: string;
}

/**
 * A taxonomy a source provides labels in, and where they come from:
 * `"labels"` read directly (USD), `"property"` from a property's values (an
 * enum's names, a string, or an array of either), `"host"` set by the host.
 */
export interface TaxonomyDeclaration {
  readonly taxonomy: string;
  readonly from: "labels" | "property" | "host";
  readonly property?: string;
}

/** A named space of vectors (CS-817): reserved, refused until built. */
export interface EmbeddingSpace {
  /** The host's own name, for example "clip-vit-b32". */
  readonly name: string;
  readonly dimension: number;
  readonly metric: "cosine" | "dot" | "l2";
}

/** Vectors keyed by `StableId` (CS-817): reserved, refused until built. */
export interface Embeddings {
  space(space: EmbeddingSpace): EmbeddingTable;
}

/** One space's vectors (CS-817): reserved, refused until built. */
export interface EmbeddingTable {
  set(id: StableId, vector: Float32Array): void;
  get(id: StableId): Float32Array | undefined;
  search(
    query: Float32Array,
    options: { k: number; labels?: Labels },
  ): Promise<readonly { id: StableId; score: number }[]>;
}

/** What one ID resolves to (`Identity.identify`). */
export interface Identified {
  readonly id: StableId;
  /** How the ID was made: its key says how far it is stable. */
  readonly key: StableKey;
  /** How far the ID holds (`IdentityDeclaration.scope`). */
  readonly scope: "global" | "tile";
  /** Every taxonomy, each resolved by precedence (`Identity`). */
  readonly labels: Labels;
  readonly name?: string;
  readonly properties?: Readonly<Record<string, FeatureValue>>;
  /** The draw that drew it, while it is loaded (a named ID's first, when several do). */
  readonly draw?: { readonly index: number; readonly generation: number };
}

/**
 * One lookup for every contract: picks, ray hits and ID images all give
 * `StableId`s, and this resolves them (`World.identity`).
 *
 * Labels' precedence, per taxonomy (the nearest level that sets it wins;
 * sets are never merged across levels): labels the host set on the feature
 * (`setLabels`), then the feature's own (`TaxonomyDeclaration`), then its
 * content's, then its scene item's (`SceneItemOptions.labels`).
 */
export interface Identity {
  /**
   * What `id` names now: undefined for an ID that no loaded content has, and
   * for one two different keys hash to (a collision, reported once to
   * `Engine.errors`, never merged).
   */
  identify(
    id: StableId,
    options?: { readonly taxonomies?: readonly string[] },
  ): Identified | undefined;
  /**
   * Sets the host's labels on one ID in one taxonomy (undefined removes
   * them). They win over every other level, and are kept by ID: they come
   * back when content that unloaded loads again.
   */
  setLabels(
    id: StableId,
    taxonomy: string,
    labels: readonly string[] | undefined,
  ): void;
  /**
   * Fixes the indexes of a taxonomy's labels in semantic images before any
   * are given out (`{ car: 1, truck: 2 }`), so they match across runs and
   * machines. Positive integers, each once. Label sets the palette doesn't
   * name take the next indexes, in the order they are first seen.
   */
  pinPalette(taxonomy: string, palette: Readonly<Record<string, number>>): void;
  /** A taxonomy's label sets by index, as semantic images give them out (0: no label). */
  labelSets(taxonomy: string): ReadonlyMap<number, readonly string[]>;
  /**
   * Reserved for CS-817: per-feature vectors by ID. Refused by name until
   * it is built: throws.
   */
  readonly embeddings: Embeddings;
}

/** The taxonomy semantic images use when none is named (Omniverse Replicator's default). */
export const DEFAULT_TAXONOMY = "class";

/** The render product name prefix CS-817 reserves for per-pixel embeddings. */
export const EMBEDDING_PRODUCT = "embedding:";

/**
 * @internal Throws for what alpha.1 reserves by name and doesn't build:
 * embeddings and learned fields (the owner, 2026-11-21, CS-832's question 4).
 */
export function refuseReserved(what: string): never {
  throw new Error(
    `${what} is reserved for embeddings and learned fields (CS-817) and isn't built in this version.`,
  );
}

/** @internal A taxonomy name the engine takes: a non-empty string, not a reserved one. */
export function checkTaxonomy(taxonomy: string, where: string): void {
  if (typeof taxonomy !== "string" || taxonomy.length === 0) {
    throw new Error(`${where}: a taxonomy is a non-empty string.`);
  }
  if (taxonomy.startsWith(EMBEDDING_PRODUCT)) {
    refuseReserved(`${where}: the taxonomy "${taxonomy}"`);
  }
}

/**
 * @internal What a content source declares of its features (the design's
 * `FeatureSchema`, its identity part): refuses embedding spaces by name
 * until CS-817 builds them.
 */
export interface FeatureSchemaIdentity {
  readonly identity?: IdentityDeclaration;
  readonly taxonomies?: readonly TaxonomyDeclaration[];
  readonly embeddings?: readonly EmbeddingSpace[];
}

/** @internal Checks a source's identity declarations: throws for reserved ones. */
export function checkSchemaIdentity(
  schema: FeatureSchemaIdentity,
  where: string,
): void {
  if (schema.embeddings && schema.embeddings.length > 0) {
    refuseReserved(`${where}: an embedding space`);
  }
  for (const t of schema.taxonomies ?? []) {
    checkTaxonomy(t.taxonomy, where);
    const from: string = t.from;
    if (from !== "labels" && from !== "property" && from !== "host") {
      throw new Error(
        `${where}: a taxonomy's labels come from "labels", "property" or "host", not "${from}".`,
      );
    }
    if (from === "property" && !t.property) {
      throw new Error(
        `${where}: the taxonomy "${t.taxonomy}" comes from a property, but names none.`,
      );
    }
  }
  const scope: string | undefined = schema.identity?.scope;
  if (scope !== undefined && scope !== "global" && scope !== "tile") {
    throw new Error(`${where}: an identity's scope is "global" or "tile".`);
  }
}

// ---------------------------------------------------------------------------
// The hash

const ENCODER = new TextEncoder();

function rotl(x: number, r: number): number {
  return (x << r) | (x >>> (32 - r));
}

function fmix(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h;
}

/**
 * @internal MurmurHash3_x86_128 (SMHasher's reference, public domain) of
 * `bytes` with `seed`: its four 32-bit words, unsigned.
 */
export function murmur3x86x128(
  bytes: Uint8Array,
  seed = 0,
): [number, number, number, number] {
  const c1 = 0x239b961b;
  const c2 = 0xab0e9789;
  const c3 = 0x38b34ae5;
  const c4 = 0xa1e38b93;
  let h1 = seed | 0;
  let h2 = seed | 0;
  let h3 = seed | 0;
  let h4 = seed | 0;
  const len = bytes.length;
  const blocks = len >>> 4;
  const word = (i: number) =>
    bytes[i]! |
    (bytes[i + 1]! << 8) |
    (bytes[i + 2]! << 16) |
    (bytes[i + 3]! << 24);
  for (let b = 0; b < blocks; b++) {
    const i = b * 16;
    let k1 = word(i);
    let k2 = word(i + 4);
    let k3 = word(i + 8);
    let k4 = word(i + 12);
    k1 = Math.imul(k1, c1);
    k1 = rotl(k1, 15);
    k1 = Math.imul(k1, c2);
    h1 ^= k1;
    h1 = rotl(h1, 19);
    h1 = (h1 + h2) | 0;
    h1 = (Math.imul(h1, 5) + 0x561ccd1b) | 0;
    k2 = Math.imul(k2, c2);
    k2 = rotl(k2, 16);
    k2 = Math.imul(k2, c3);
    h2 ^= k2;
    h2 = rotl(h2, 17);
    h2 = (h2 + h3) | 0;
    h2 = (Math.imul(h2, 5) + 0x0bcaa747) | 0;
    k3 = Math.imul(k3, c3);
    k3 = rotl(k3, 17);
    k3 = Math.imul(k3, c4);
    h3 ^= k3;
    h3 = rotl(h3, 15);
    h3 = (h3 + h4) | 0;
    h3 = (Math.imul(h3, 5) + 0x96cd1c35) | 0;
    k4 = Math.imul(k4, c4);
    k4 = rotl(k4, 18);
    k4 = Math.imul(k4, c1);
    h4 ^= k4;
    h4 = rotl(h4, 13);
    h4 = (h4 + h1) | 0;
    h4 = (Math.imul(h4, 5) + 0x32ac3b17) | 0;
  }
  const tail = blocks * 16;
  const rest = len & 15;
  let k1 = 0;
  let k2 = 0;
  let k3 = 0;
  let k4 = 0;
  // The reference's switch falls through from the longest tail down.
  if (rest >= 13) {
    for (let j = rest - 1; j >= 12; j--) {
      k4 ^= bytes[tail + j]! << ((j - 12) * 8);
    }
    k4 = Math.imul(k4, c4);
    k4 = rotl(k4, 18);
    k4 = Math.imul(k4, c1);
    h4 ^= k4;
  }
  if (rest >= 9) {
    for (let j = Math.min(rest, 12) - 1; j >= 8; j--) {
      k3 ^= bytes[tail + j]! << ((j - 8) * 8);
    }
    k3 = Math.imul(k3, c3);
    k3 = rotl(k3, 17);
    k3 = Math.imul(k3, c4);
    h3 ^= k3;
  }
  if (rest >= 5) {
    for (let j = Math.min(rest, 8) - 1; j >= 4; j--) {
      k2 ^= bytes[tail + j]! << ((j - 4) * 8);
    }
    k2 = Math.imul(k2, c2);
    k2 = rotl(k2, 16);
    k2 = Math.imul(k2, c3);
    h2 ^= k2;
  }
  if (rest >= 1) {
    for (let j = Math.min(rest, 4) - 1; j >= 0; j--) {
      k1 ^= bytes[tail + j]! << (j * 8);
    }
    k1 = Math.imul(k1, c1);
    k1 = rotl(k1, 15);
    k1 = Math.imul(k1, c2);
    h1 ^= k1;
  }
  h1 ^= len;
  h2 ^= len;
  h3 ^= len;
  h4 ^= len;
  h1 = (h1 + h2) | 0;
  h1 = (h1 + h3) | 0;
  h1 = (h1 + h4) | 0;
  h2 = (h2 + h1) | 0;
  h3 = (h3 + h1) | 0;
  h4 = (h4 + h1) | 0;
  h1 = fmix(h1);
  h2 = fmix(h2);
  h3 = fmix(h3);
  h4 = fmix(h4);
  h1 = (h1 + h2) | 0;
  h1 = (h1 + h3) | 0;
  h1 = (h1 + h4) | 0;
  h2 = (h2 + h1) | 0;
  h3 = (h3 + h1) | 0;
  h4 = (h4 + h1) | 0;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** @internal A key's canonical text: what its ID is a hash of. */
export function canonicalKey(key: StableKey): string {
  switch (key.kind) {
    case "content":
      return JSON.stringify([
        "content",
        key.item,
        key.source,
        key.content,
        key.set,
        key.feature,
      ]);
    case "named":
      return JSON.stringify(["named", key.item, key.source, key.name]);
    case "draw":
      return JSON.stringify(["draw", key.item, key.source, key.content]);
    case "host":
      return JSON.stringify(["host", key.item, key.key]);
  }
}

/** @internal The 64-bit hash of a canonical key's text (never 0). */
export function hashKey(text: string): StableId {
  const [h1, h2] = murmur3x86x128(ENCODER.encode(text));
  const id = (BigInt(h2) << 32n) | BigInt(h1);
  return id === 0n ? 1n : id;
}

/** A key's `StableId`: the first 64 bits of MurmurHash3_x86_128 of its canonical text. */
export function stableIdOf(key: StableKey): StableId {
  return hashKey(canonicalKey(key));
}

/** Hosts whose `v` query parameter is the asset's version, not a token. */
const VERSIONED_HOSTS = /(^|\.)ion\.cesium\.com$|^assets\.cesium\.com$/i;

/**
 * An asset's canonical reference, for its IDs: the URL without credentials,
 * query or fragment (session tokens never enter an ID). Cesium ion's assets
 * keep their `v` (the asset's version), so a new version of the data gets
 * new IDs. A reference that isn't an absolute URL loses its query and
 * fragment only.
 */
export function canonicalSource(reference: string): string {
  let url: URL | undefined;
  try {
    url = new URL(reference);
  } catch {
    url = undefined;
  }
  if (!url || url.protocol === "blob:" || url.protocol === "data:") {
    return reference.replace(/[?#].*$/s, "");
  }
  const version = VERSIONED_HOSTS.test(url.hostname)
    ? url.searchParams.get("v")
    : null;
  const base = `${url.protocol}//${url.host}${url.pathname}`;
  return version !== null ? `${base}?v=${version}` : base;
}

// ---------------------------------------------------------------------------
// Labels

/** @internal A label set's canonical form: sorted, without repeats or empty labels. */
export function normalizeLabels(labels: readonly string[]): string[] {
  return [...new Set(labels.filter((l) => typeof l === "string" && l))].sort();
}

/** @internal Checks labels the host gives (`SceneItemOptions.labels`): a copy, each set normalized. */
export function checkLabels(labels: Labels, where: string): Labels {
  const out: Record<string, readonly string[]> = {};
  for (const [taxonomy, set] of Object.entries(labels)) {
    checkTaxonomy(taxonomy, where);
    if (!Array.isArray(set) || set.some((l) => typeof l !== "string")) {
      throw new Error(
        `${where}: the labels of "${taxonomy}" are an array of strings.`,
      );
    }
    const normalized = normalizeLabels(set);
    if (normalized.length > 0) {
      out[taxonomy] = Object.freeze(normalized);
    }
  }
  return Object.freeze(out);
}

/** A feature's labels from a property value: a string or enum name, or an array of them. */
function labelsOfValue(value: FeatureValue | undefined): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const items = Array.isArray(value) ? value : [value];
  const labels = normalizeLabels(items.map((v) => String(v)));
  return labels.length > 0 ? labels : undefined;
}

/**
 * @internal Labels per taxonomy, the nearest level first: each taxonomy
 * takes its labels from the first level that sets it, never merged.
 */
export function resolveLabels(
  levels: ReadonlyArray<Labels | undefined>,
  only?: readonly string[],
): Labels {
  const out: Record<string, readonly string[]> = {};
  for (const level of levels) {
    if (!level) {
      continue;
    }
    for (const [taxonomy, set] of Object.entries(level)) {
      if (out[taxonomy] === undefined && (!only || only.includes(taxonomy))) {
        out[taxonomy] = set;
      }
    }
  }
  return out;
}

/** Interned label sets of one taxonomy. */
interface TaxonomySets {
  readonly byKey: Map<string, number>;
  readonly byIndex: Map<number, readonly string[]>;
  readonly pinned: boolean;
  next: number;
}

/**
 * @internal A world's label sets, interned per taxonomy into dense indexes
 * (0: no label), as semantic images give them out. A pinned palette fixes
 * single labels' indexes before any set of its taxonomy is interned.
 */
export class LabelSets {
  private readonly taxonomies = new Map<string, TaxonomySets>();

  private sets(taxonomy: string): TaxonomySets {
    let sets = this.taxonomies.get(taxonomy);
    if (!sets) {
      sets = { byKey: new Map(), byIndex: new Map(), pinned: false, next: 1 };
      this.taxonomies.set(taxonomy, sets);
    }
    return sets;
  }

  /** The index of a normalized label set (0 for none). */
  index(taxonomy: string, labels: readonly string[] | undefined): number {
    if (!labels || labels.length === 0) {
      return 0;
    }
    const sets = this.sets(taxonomy);
    const key = labels.join("\u0000");
    let index = sets.byKey.get(key);
    if (index === undefined) {
      index = sets.next++;
      sets.byKey.set(key, index);
      sets.byIndex.set(index, labels);
    }
    return index;
  }

  map(taxonomy: string): ReadonlyMap<number, readonly string[]> {
    return this.taxonomies.get(taxonomy)?.byIndex ?? new Map();
  }

  pin(taxonomy: string, palette: Readonly<Record<string, number>>): void {
    checkTaxonomy(taxonomy, "pinPalette");
    const sets = this.taxonomies.get(taxonomy);
    if (sets && (sets.pinned || sets.byIndex.size > 0)) {
      throw new Error(
        `pinPalette: "${taxonomy}" ${sets.pinned ? "has a palette already" : "has given out label indexes already"}; pin it before content loads.`,
      );
    }
    const pinned: TaxonomySets = {
      byKey: new Map(),
      byIndex: new Map(),
      pinned: true,
      next: 1,
    };
    for (const [label, index] of Object.entries(palette)) {
      if (!label) {
        throw new Error(`pinPalette: "${taxonomy}" names an empty label.`);
      }
      if (!Number.isInteger(index) || index < 1 || index > 0xffffffff) {
        throw new Error(
          `pinPalette: "${taxonomy}"'s label "${label}" takes ${index}; an index is an integer from 1 to 4294967295 (0 is no label).`,
        );
      }
      if (pinned.byIndex.has(index)) {
        throw new Error(
          `pinPalette: "${taxonomy}" gives ${index} to "${pinned.byIndex.get(index)![0]}" and "${label}".`,
        );
      }
      pinned.byKey.set(label, index);
      pinned.byIndex.set(index, Object.freeze([label]));
      pinned.next = Math.max(pinned.next, index + 1);
    }
    this.taxonomies.set(taxonomy, pinned);
  }
}

// ---------------------------------------------------------------------------
// A world's identity table

/** @internal What a draw is, for its IDs (`DrawOptions.identity`). */
export interface DrawIdentity {
  /** The asset's canonical reference (`canonicalSource`). */
  readonly source: string;
  /** The tile's content relative to its tileset, and the glTF node and primitive. */
  readonly content: string;
  /** The identity set among `sets` (-1: the draw has no feature-ID set). */
  readonly set: number;
  /** Every feature-ID set its mesh's primitive has (`EXT_mesh_features`), as read. */
  readonly sets?: readonly FeatureIdSetInfo[];
  /** Tile content: IDs hold per tile unless a feature is named. */
  readonly scope: "global" | "tile";
  /** Its item, for a draw that isn't a scene item's (a model placement's). */
  readonly item?: ItemIdentity;
  /** Labels its content sets (3D Tiles content, tile and group metadata: CS-272). */
  readonly contentLabels?: Labels;
}

/** One `EXT_mesh_features` feature-ID set of a primitive, as read (`GltfMesh.featureSets`). */
export interface FeatureIdSetInfo {
  readonly index: number;
  readonly featureCount: number;
  /** "attribute" sets are drawn; "texture" and "implicit" ones are read but not drawn yet (CS-272). */
  readonly kind: "attribute" | "texture" | "implicit" | "batch";
  readonly label?: string;
  readonly propertyTable?: number;
}

/** @internal What a scene item or a placement gives the IDs of what it draws. */
export interface ItemIdentity {
  readonly key: string;
  readonly labels?: Labels;
  readonly taxonomies?: readonly TaxonomyDeclaration[];
  readonly identity?: IdentityDeclaration;
}

/** @internal What the identity table needs of its world. */
export interface IdentityWorld {
  readonly scene: {
    readonly featureTables: ReadonlyArray<FeatureTable | undefined>;
    readonly names: ReadonlyArray<string | undefined>;
  };
  itemIdentity(draw: {
    index: number;
    generation: number;
  }): ItemIdentity | undefined;
  /** The draw's properties for a local feature (`World.feature`'s). */
  featureProperties(
    index: number,
    local: number,
  ): { name?: string; properties?: Record<string, FeatureValue> };
  report(message: string): void;
}

/** A draw's IDs, once computed. */
interface DrawIds {
  readonly index: number;
  readonly generation: number;
  /** Its first slot (the dense per-world feature index the GPU writes). */
  readonly first: number;
  readonly count: number;
  /** Whether its features are features (false: one slot, a `draw` key). */
  readonly featured: boolean;
  readonly identity: DrawIdentity | undefined;
  readonly hostKey: string | undefined;
  /** Filled when flushed. */
  ids?: BigUint64Array;
  item?: ItemIdentity;
  /** Per local feature, the named key's name, when the feature is named. */
  names?: Array<string | undefined>;
}

/** What a slot resolves to: its ID, key and how it was drawn. */
export interface SlotIdentity {
  readonly id: StableId;
  readonly key: StableKey;
  readonly scope: "global" | "tile";
  readonly local: number;
  readonly draw: { readonly index: number; readonly generation: number };
}

/**
 * @internal A world's `Identity`: the IDs of every draw's features, kept
 * beside the dense slots the GPU writes. IDs are computed when first asked
 * for (a pick, a hit, an image, `identify`), for every draw added since, so
 * loading costs nothing until something asks.
 */
export class IdentityTable implements Identity {
  readonly labels = new LabelSets();
  private readonly world: IdentityWorld;
  private readonly hash: (text: string) => StableId;
  /** By draw index. */
  private readonly draws = new Map<number, DrawIds>();
  private readonly pending = new Set<DrawIds>();
  /** Slots by the low 32 bits of their ID; full IDs compared after. */
  private readonly index = new Map<number, number[]>();
  /** Slot to draw, sorted by first slot. */
  private readonly ranges: DrawIds[] = [];
  /** Host labels, by ID and taxonomy: kept across reloads. */
  private readonly hostLabels = new Map<
    StableId,
    Map<string, readonly string[]>
  >();
  /** IDs two keys hash to, with both keys' text: never merged. */
  private readonly collided = new Map<StableId, [string, string]>();
  /** Collisions reported, by both keys' text: each once. */
  private readonly reported = new Set<string>();
  /** Item keys in use, for ordinals of an item without a host key. */
  private readonly itemKeys = new Map<string, Set<number>>();

  constructor(
    world: IdentityWorld,
    hash: (text: string) => StableId = hashKey,
  ) {
    this.world = world;
    this.hash = hash;
  }

  /** IDs two keys hash to (both keys' canonical text), as reported. */
  get collisions(): ReadonlyMap<StableId, readonly [string, string]> {
    return this.collided;
  }

  get embeddings(): Embeddings {
    return refuseReserved("World.identity.embeddings");
  }

  /**
   * An item key for a new item: `explicit` (the host's, which must be unused),
   * else `derived`, with an ordinal from the second item on (`#2`), which
   * then depends on the order items were added: reported.
   */
  claimItemKey(explicit: string | undefined, derived: string): string {
    if (explicit !== undefined) {
      if (typeof explicit !== "string" || explicit.length === 0) {
        throw new Error("an item's id is a non-empty string");
      }
      const used = this.itemKeys.get(explicit);
      if (used?.has(1)) {
        throw new Error(
          `an item with the id "${explicit}" is drawn already: each item's id is its own.`,
        );
      }
      this.itemKeys.set(explicit, new Set([...(used ?? []), 1]));
      return explicit;
    }
    const used = this.itemKeys.get(derived) ?? new Set<number>();
    let ordinal = 1;
    while (used.has(ordinal)) {
      ordinal++;
    }
    used.add(ordinal);
    this.itemKeys.set(derived, used);
    if (ordinal === 1) {
      return derived;
    }
    this.world.report(
      `a second item of ${derived} without an id: its IDs take the ordinal #${ordinal}, which depends on the order items were added. Give each item an id.`,
    );
    return `${derived}#${ordinal}`;
  }

  /** The item key left (its item was removed). */
  releaseItemKey(key: string): void {
    const at = key.lastIndexOf("#");
    const ordinal = at > 0 ? Number(key.slice(at + 1)) : NaN;
    const [base, n] =
      Number.isInteger(ordinal) && ordinal >= 2
        ? [key.slice(0, at), ordinal]
        : [key, 1];
    const used = this.itemKeys.get(base);
    used?.delete(n);
    if (used?.size === 0) {
      this.itemKeys.delete(base);
    }
  }

  /** A draw was added with `count` slots from `first`. */
  register(
    draw: { index: number; generation: number },
    first: number,
    count: number,
    featured: boolean,
    identity: DrawIdentity | undefined,
    hostKey: string | undefined,
  ): void {
    this.unregister(draw.index);
    const entry: DrawIds = {
      index: draw.index,
      generation: draw.generation,
      first,
      count,
      featured,
      identity,
      hostKey,
    };
    this.draws.set(draw.index, entry);
    this.pending.add(entry);
    // Slots only grow, so ranges stay sorted by appending.
    this.ranges.push(entry);
  }

  /** The draw at `index` left. */
  unregister(index: number): void {
    const entry = this.draws.get(index);
    if (!entry) {
      return;
    }
    this.draws.delete(index);
    this.pending.delete(entry);
    const at = this.ranges.indexOf(entry);
    if (at >= 0) {
      this.ranges.splice(at, 1);
    }
    const ids = entry.ids;
    if (!ids) {
      return;
    }
    // A draw without features indexed its first slot only.
    const indexed = entry.featured ? entry.count : 1;
    for (let local = 0; local < indexed; local++) {
      const low = Number(ids[local]! & 0xffffffffn);
      const slots = this.index.get(low);
      if (!slots) {
        continue;
      }
      const k = slots.indexOf(entry.first + local);
      if (k >= 0) {
        slots.splice(k, 1);
      }
      if (slots.length === 0) {
        this.index.delete(low);
      }
    }
  }

  /**
   * Every draw's IDs computed again when next asked for: an item came or
   * went, so a draw's item may have changed (the item drawing a tile's own
   * draws). Host labels stay, by ID.
   */
  recompute(): void {
    this.index.clear();
    this.collided.clear();
    for (const entry of this.draws.values()) {
      entry.ids = undefined;
      entry.item = undefined;
      entry.names = undefined;
      this.pending.add(entry);
    }
  }

  /** Computes the IDs of the draws added since the last call. */
  flush(): void {
    if (this.pending.size === 0) {
      return;
    }
    const entries = [...this.pending];
    this.pending.clear();
    for (const entry of entries) {
      this.compute(entry);
    }
  }

  private compute(entry: DrawIds): void {
    const identity = entry.identity;
    const item =
      identity?.item ??
      this.world.itemIdentity({
        index: entry.index,
        generation: entry.generation,
      });
    entry.item = item;
    const ids = new BigUint64Array(entry.count);
    if (!entry.featured) {
      // One ID for every slot (a point set's points): one key, hashed once.
      const text = canonicalKey(this.keyOf(entry, 0));
      const id = this.hash(text);
      ids.fill(id);
      this.insert(entry, 0, id, text);
      entry.ids = ids;
      return;
    }
    const table = this.world.scene.featureTables[entry.index];
    const nameProperty = namingProperty(item, table);
    if (nameProperty !== undefined && table) {
      entry.names = [];
    }
    for (let local = 0; local < entry.count; local++) {
      if (entry.names && table && nameProperty !== undefined) {
        const value = table.columns[nameProperty]?.[local];
        entry.names[local] =
          value === undefined || value === null || Array.isArray(value)
            ? undefined
            : String(value);
      }
      const text = canonicalKey(this.keyOf(entry, local));
      const id = this.hash(text);
      ids[local] = id;
      this.insert(entry, local, id, text);
    }
    entry.ids = ids;
  }

  private insert(
    entry: DrawIds,
    local: number,
    id: StableId,
    text: string,
  ): void {
    const low = Number(id & 0xffffffffn);
    let slots = this.index.get(low);
    if (!slots) {
      slots = [];
      this.index.set(low, slots);
    }
    for (const slot of slots) {
      const other = this.at(slot);
      if (!other?.ids || other.ids[slot - other.first] !== id) {
        continue;
      }
      const otherText = canonicalKey(this.keyOf(other, slot - other.first));
      if (otherText === text) {
        continue; // one feature drawn twice (a named one in two tiles)
      }
      if (!this.collided.has(id)) {
        this.collided.set(id, [otherText, text]);
      }
      const pair = `${otherText}\u0000${text}`;
      if (!this.reported.has(pair)) {
        this.reported.add(pair);
        this.world.report(
          `two keys hash to the stable ID ${id}: ${otherText} and ${text}. Neither is merged into the other: identify() refuses that ID, and picks name their own keys.`,
        );
      }
    }
    slots.push(entry.first + local);
  }

  private keyOf(entry: DrawIds, local: number): StableKey {
    const identity = entry.identity;
    const item = entry.item?.key ?? "";
    if (!identity) {
      if (entry.hostKey !== undefined) {
        return entry.featured
          ? {
              kind: "content",
              item,
              source: "",
              content: entry.hostKey,
              set: 0,
              feature: local,
            }
          : { kind: "host", item, key: entry.hostKey };
      }
      // A draw nothing named: an ordinal in the order added (its first
      // slot), as stable as that order.
      return entry.featured
        ? {
            kind: "content",
            item,
            source: "",
            content: `unnamed:${entry.first}`,
            set: 0,
            feature: local,
          }
        : { kind: "draw", item, source: "", content: `unnamed:${entry.first}` };
    }
    const name = entry.names?.[local];
    if (name !== undefined) {
      return { kind: "named", item, source: identity.source, name };
    }
    if (!entry.featured) {
      return {
        kind: "draw",
        item,
        source: identity.source,
        content: identity.content,
      };
    }
    return {
      kind: "content",
      item,
      source: identity.source,
      content: identity.content,
      set: Math.max(0, identity.set),
      feature: local,
    };
  }

  /** The draw whose slots hold `slot`. */
  private at(slot: number): DrawIds | undefined {
    const ranges = this.ranges;
    let lo = 0;
    let hi = ranges.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const r = ranges[mid]!;
      if (slot < r.first) {
        hi = mid - 1;
      } else if (slot >= r.first + r.count) {
        lo = mid + 1;
      } else {
        return r;
      }
    }
    return undefined;
  }

  /** What a slot the GPU wrote names, or undefined (0, or a draw since removed). */
  slot(slot: number): SlotIdentity | undefined {
    if (!(slot > 0)) {
      return undefined;
    }
    this.flush();
    const entry = this.at(slot);
    if (!entry?.ids) {
      return undefined;
    }
    const local = slot - entry.first;
    return {
      id: entry.ids[local]!,
      key: this.keyOf(entry, local),
      scope: this.scopeOf(entry, local),
      local,
      draw: { index: entry.index, generation: entry.generation },
    };
  }

  /** A slot's `StableId` (0 for none). */
  idOfSlot(slot: number): StableId {
    return this.slot(slot)?.id ?? 0n;
  }

  private scopeOf(entry: DrawIds, local: number): "global" | "tile" {
    if (entry.names?.[local] !== undefined) {
      return "global";
    }
    return entry.item?.identity?.scope ?? entry.identity?.scope ?? "global";
  }

  /** A slot's labels, every taxonomy (or `only`), by precedence. */
  labelsOfSlot(slot: number, only?: readonly string[]): Labels {
    const s = this.slot(slot);
    if (!s) {
      return {};
    }
    return this.labelsOf(this.at(slot)!, s.local, s.id, only);
  }

  private labelsOf(
    entry: DrawIds,
    local: number,
    id: StableId,
    only?: readonly string[],
  ): Labels {
    const host = this.hostLabels.get(id);
    const own: Record<string, readonly string[]> = {};
    const table = this.world.scene.featureTables[entry.index];
    for (const t of entry.item?.taxonomies ?? []) {
      if (t.from === "property" && t.property && table) {
        const labels = labelsOfValue(table.columns[t.property]?.[local]);
        if (labels && own[t.taxonomy] === undefined) {
          own[t.taxonomy] = labels;
        }
      }
    }
    return resolveLabels(
      [
        host ? Object.fromEntries(host) : undefined,
        own,
        entry.identity?.contentLabels,
        entry.item?.labels,
      ],
      only,
    );
  }

  /** The label-set index of a slot in `taxonomy`, for a semantic image (0: none). */
  semanticOfSlot(slot: number, taxonomy: string = DEFAULT_TAXONOMY): number {
    return this.labels.index(
      taxonomy,
      this.labelsOfSlot(slot, [taxonomy])[taxonomy],
    );
  }

  /**
   * The ID-image path (CS-813): slots per pixel, as the pick pass's ID
   * target holds them, to `instanceId` (each pixel's `StableId` as two
   * 32-bit words, low first) and `semanticId` (its label set's index in
   * `taxonomy`), with the index-to-labels map and the palette used. 0 where
   * a pixel has nothing.
   */
  resolveSlots(
    slots: Uint32Array,
    taxonomy: string = DEFAULT_TAXONOMY,
  ): {
    instanceId: Uint32Array;
    semanticId: Uint32Array;
    taxonomy: string;
    labelSets: ReadonlyMap<number, readonly string[]>;
  } {
    checkTaxonomy(taxonomy, "resolveSlots");
    const instanceId = new Uint32Array(slots.length * 2);
    const semanticId = new Uint32Array(slots.length);
    const cache = new Map<number, [StableId, number]>();
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]!;
      if (slot === 0) {
        continue;
      }
      let resolved = cache.get(slot);
      if (!resolved) {
        resolved = [this.idOfSlot(slot), this.semanticOfSlot(slot, taxonomy)];
        cache.set(slot, resolved);
      }
      instanceId[2 * i] = Number(resolved[0] & 0xffffffffn);
      instanceId[2 * i + 1] = Number(resolved[0] >> 32n);
      semanticId[i] = resolved[1];
    }
    return {
      instanceId,
      semanticId,
      taxonomy,
      labelSets: new Map(this.labels.map(taxonomy)),
    };
  }

  identify(
    id: StableId,
    options: { readonly taxonomies?: readonly string[] } = {},
  ): Identified | undefined {
    if (typeof id !== "bigint") {
      throw new TypeError("identify: a StableId is a bigint");
    }
    this.flush();
    if (this.collided.has(id)) {
      return undefined;
    }
    const slots = this.index.get(Number(id & 0xffffffffn)) ?? [];
    for (const slot of slots) {
      const entry = this.at(slot);
      if (!entry?.ids || entry.ids[slot - entry.first] !== id) {
        continue;
      }
      const local = slot - entry.first;
      const { name, properties } = this.world.featureProperties(
        entry.index,
        local,
      );
      return {
        id,
        key: this.keyOf(entry, local),
        scope: this.scopeOf(entry, local),
        labels: this.labelsOf(entry, local, id, options.taxonomies),
        ...(name !== undefined && { name }),
        ...(properties && { properties }),
        draw: { index: entry.index, generation: entry.generation },
      };
    }
    return undefined;
  }

  setLabels(
    id: StableId,
    taxonomy: string,
    labels: readonly string[] | undefined,
  ): void {
    if (typeof id !== "bigint" || id <= 0n || id > 0xffffffffffffffffn) {
      throw new TypeError("setLabels: a StableId is a positive 64-bit bigint");
    }
    checkTaxonomy(taxonomy, "setLabels");
    let byTaxonomy = this.hostLabels.get(id);
    if (labels === undefined) {
      byTaxonomy?.delete(taxonomy);
      if (byTaxonomy?.size === 0) {
        this.hostLabels.delete(id);
      }
      return;
    }
    if (!Array.isArray(labels) || labels.some((l) => typeof l !== "string")) {
      throw new TypeError("setLabels: labels are an array of strings");
    }
    if (!byTaxonomy) {
      byTaxonomy = new Map();
      this.hostLabels.set(id, byTaxonomy);
    }
    byTaxonomy.set(taxonomy, Object.freeze(normalizeLabels(labels)));
  }

  pinPalette(
    taxonomy: string,
    palette: Readonly<Record<string, number>>,
  ): void {
    this.labels.pin(taxonomy, palette);
  }

  labelSets(taxonomy: string): ReadonlyMap<number, readonly string[]> {
    return this.labels.map(taxonomy);
  }

  /** The identity a draw was added with. */
  identityOfDraw(index: number): DrawIdentity | undefined {
    return this.draws.get(index)?.identity;
  }

  /** The feature-ID sets a draw's primitive has, as read. */
  setsOfDraw(index: number): readonly FeatureIdSetInfo[] | undefined {
    return this.draws.get(index)?.identity?.sets;
  }
}

/** The property that names features: the item's, else the table's `ID`-semantic one. */
function namingProperty(
  item: ItemIdentity | undefined,
  table: FeatureTable | undefined,
): string | undefined {
  if (item?.identity?.property !== undefined) {
    return item.identity.property;
  }
  if (!table?.semantics) {
    return undefined;
  }
  for (const [property, semantic] of Object.entries(table.semantics)) {
    if (semantic === "ID") {
      return property;
    }
  }
  return undefined;
}
