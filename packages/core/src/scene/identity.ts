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

declare const stableIdBrand: unique symbol;

/**
 * A thing's identity: a 64-bit hash of its `StableKey`. It is a `bigint` at
 * run time, branded so that a plain `bigint` (a 64-bit property value, say)
 * is a type error where an ID is wanted. Only `stableIdOf` and
 * `parseStableId` make one for a caller; inside the engine, `brandId` (not
 * exported) brands the places that turn a slot's two words back into an ID.
 *
 * Zero is a `StableId` too: it is the "none" value of the slot table
 * (`idOfSlot`, `resolveSlots`), never the ID of a real thing.
 * `stableIdOf` never returns it; `parseStableId("0000000000000000")` does.
 */
export type StableId = bigint & { readonly [stableIdBrand]: true };

/** @internal Brands a bigint as a `StableId`; the one place the engine does. */
function brandId(value: bigint): StableId {
  return value as StableId;
}

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
 * - `feature`: a content source's feature (`FeatureId`, CS-957 A): its
 *   source's canonical reference and the source's own key for it (a row's
 *   name, a draw's `DrawOptions.id`), and nothing else (CS-1031 A). It has
 *   no item and no content ID, so every placement and every open of the
 *   content shares it, in every run, and it is never an instance ID. With
 *   `row`, it is row `row` of the batch keyed `key`, a row its source didn't
 *   name.
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
  | { readonly kind: "host"; readonly item: string; readonly key: string }
  | {
      readonly kind: "feature";
      readonly source: string;
      readonly key: string;
      readonly row?: number;
    };

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
  /**
   * The feature ID of what it names, for a content source's feature
   * (CS-957 A): what that content's rows, edits and change sets name. For an
   * instance ID, its feature's; for a feature ID, the ID itself. Absent for
   * what no content source drew, and for a feature CS-961 gives an ID later.
   */
  readonly feature?: StableId;
}

/**
 * One lookup for every contract: picks, ray hits and ID images all give
 * `StableId`s, and this resolves them (`World.identity`).
 *
 * Labels' precedence, per taxonomy (the nearest level that sets it wins;
 * sets are never merged across levels): labels the host set on the ID
 * (`setLabels`), then those it set on its feature ID (`Identified.feature`,
 * which every placement of a content source's feature shares), then the
 * feature's own (`TaxonomyDeclaration`), then its content's, then its scene
 * item's (`SceneItemOptions.labels`).
 *
 * `identify` takes a feature ID too: it answers as the first placement that
 * draws the feature shows it, without that placement's own host labels.
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
   * Sets the host's labels on one ID in one taxonomy. They win over every
   * other level, and are kept by ID: they come back when content that
   * unloaded loads again.
   *
   * An empty array is a label set of its own, "none": it hides the lower
   * levels' labels in that taxonomy (`labels[taxonomy]` is `[]`, and the
   * semantic image's index is 0). `undefined` removes the host's set, so the
   * lower levels show again.
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

const C1 = 0x239b961b;
const C2 = 0xab0e9789;
const C3 = 0x38b34ae5;
const C4 = 0xa1e38b93;

/** The little-endian 32-bit word at `i`. */
function word(bytes: Uint8Array, i: number): number {
  return (
    bytes[i]! |
    (bytes[i + 1]! << 8) |
    (bytes[i + 2]! << 16) |
    (bytes[i + 3]! << 24)
  );
}

/**
 * MurmurHash3_x86_128's running state (SMHasher's reference, public
 * domain). Bytes go in one at a time or as an array, so a long input is
 * hashed in one pass without a copy of it.
 */
class Murmur3x86x128 {
  private h1: number;
  private h2: number;
  private h3: number;
  private h4: number;
  private length = 0;
  private readonly pending = new Uint8Array(16);
  private filled = 0;

  constructor(seed = 0) {
    this.h1 = seed | 0;
    this.h2 = seed | 0;
    this.h3 = seed | 0;
    this.h4 = seed | 0;
  }

  /** Mixes one 16-byte block, given as its four words. */
  private block(k1: number, k2: number, k3: number, k4: number): void {
    let { h1, h2, h3, h4 } = this;
    k1 = Math.imul(k1, C1);
    k1 = rotl(k1, 15);
    k1 = Math.imul(k1, C2);
    h1 ^= k1;
    h1 = rotl(h1, 19);
    h1 = (h1 + h2) | 0;
    h1 = (Math.imul(h1, 5) + 0x561ccd1b) | 0;
    k2 = Math.imul(k2, C2);
    k2 = rotl(k2, 16);
    k2 = Math.imul(k2, C3);
    h2 ^= k2;
    h2 = rotl(h2, 17);
    h2 = (h2 + h3) | 0;
    h2 = (Math.imul(h2, 5) + 0x0bcaa747) | 0;
    k3 = Math.imul(k3, C3);
    k3 = rotl(k3, 17);
    k3 = Math.imul(k3, C4);
    h3 ^= k3;
    h3 = rotl(h3, 15);
    h3 = (h3 + h4) | 0;
    h3 = (Math.imul(h3, 5) + 0x96cd1c35) | 0;
    k4 = Math.imul(k4, C4);
    k4 = rotl(k4, 18);
    k4 = Math.imul(k4, C1);
    h4 ^= k4;
    h4 = rotl(h4, 13);
    h4 = (h4 + h1) | 0;
    h4 = (Math.imul(h4, 5) + 0x32ac3b17) | 0;
    this.h1 = h1;
    this.h2 = h2;
    this.h3 = h3;
    this.h4 = h4;
  }

  /** Adds one byte. */
  push(byte: number): void {
    const pending = this.pending;
    pending[this.filled++] = byte;
    this.length++;
    if (this.filled === 16) {
      this.block(
        word(pending, 0),
        word(pending, 4),
        word(pending, 8),
        word(pending, 12),
      );
      this.filled = 0;
    }
  }

  /** Adds bytes: whole blocks straight from the array when none are pending. */
  update(bytes: Uint8Array): this {
    let i = 0;
    if (this.filled === 0) {
      const end = bytes.length - (bytes.length & 15);
      for (; i < end; i += 16) {
        this.block(
          word(bytes, i),
          word(bytes, i + 4),
          word(bytes, i + 8),
          word(bytes, i + 12),
        );
      }
      this.length += end;
    }
    for (; i < bytes.length; i++) {
      this.push(bytes[i]!);
    }
    return this;
  }

  /** The hash of the bytes so far: its four 32-bit words, unsigned. */
  digest(): [number, number, number, number] {
    let { h1, h2, h3, h4 } = this;
    const tail = this.pending;
    const rest = this.filled;
    let k1 = 0;
    let k2 = 0;
    let k3 = 0;
    let k4 = 0;
    // The reference's switch falls through from the longest tail down.
    if (rest >= 13) {
      for (let j = rest - 1; j >= 12; j--) {
        k4 ^= tail[j]! << ((j - 12) * 8);
      }
      k4 = Math.imul(k4, C4);
      k4 = rotl(k4, 18);
      k4 = Math.imul(k4, C1);
      h4 ^= k4;
    }
    if (rest >= 9) {
      for (let j = Math.min(rest, 12) - 1; j >= 8; j--) {
        k3 ^= tail[j]! << ((j - 8) * 8);
      }
      k3 = Math.imul(k3, C3);
      k3 = rotl(k3, 17);
      k3 = Math.imul(k3, C4);
      h3 ^= k3;
    }
    if (rest >= 5) {
      for (let j = Math.min(rest, 8) - 1; j >= 4; j--) {
        k2 ^= tail[j]! << ((j - 4) * 8);
      }
      k2 = Math.imul(k2, C2);
      k2 = rotl(k2, 16);
      k2 = Math.imul(k2, C3);
      h2 ^= k2;
    }
    if (rest >= 1) {
      for (let j = Math.min(rest, 4) - 1; j >= 0; j--) {
        k1 ^= tail[j]! << (j * 8);
      }
      k1 = Math.imul(k1, C1);
      k1 = rotl(k1, 15);
      k1 = Math.imul(k1, C2);
      h1 ^= k1;
    }
    const len = this.length;
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
}

/**
 * @internal MurmurHash3_x86_128 (SMHasher's reference, public domain) of
 * `bytes` with `seed`: its four 32-bit words, unsigned.
 */
export function murmur3x86x128(
  bytes: Uint8Array,
  seed = 0,
): [number, number, number, number] {
  return new Murmur3x86x128(seed).update(bytes).digest();
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
    case "feature":
      return JSON.stringify(
        key.row === undefined
          ? ["feature", key.source, key.key]
          : ["feature", key.source, key.key, key.row],
      );
  }
}

/** @internal The 64-bit hash of a canonical key's text (never 0). */
export function hashKey(text: string): StableId {
  const [h1, h2] = murmur3x86x128(ENCODER.encode(text));
  const id = (BigInt(h2) << 32n) | BigInt(h1);
  return brandId(id === 0n ? 1n : id);
}

/** A key's `StableId`: the first 64 bits of MurmurHash3_x86_128 of its canonical text. */
export function stableIdOf(key: StableKey): StableId {
  return hashKey(canonicalKey(key));
}

const HEX16 = /^[0-9a-fA-F]{16}$/;
const U64_MAX = (1n << 64n) - 1n;

/**
 * A `StableId` as exactly 16 lowercase hex digits, zero-padded. Use it to
 * put an ID in JSON, a URL or a log: `JSON.stringify` throws a `TypeError` on
 * a bigint, so a replacer does the conversion and `parseStableId` undoes it:
 *
 * ```ts
 * const text = JSON.stringify(data, (_k, v) =>
 *   typeof v === "bigint" ? stableIdToHex(v) : v);
 * const back = JSON.parse(text, (k, v) =>
 *   k === "id" ? parseStableId(v) : v);
 * ```
 *
 * Refuses a value that isn't a bigint (`TypeError`) or is outside 0 to
 * 2^64 - 1 (`RangeError`). It accepts 0, the "none" StableId of `idOfSlot`.
 */
export function stableIdToHex(id: StableId): string {
  if (typeof id !== "bigint") {
    throw new TypeError(
      `stableIdToHex: a StableId is a bigint, got ${typeof id}`,
    );
  }
  if (id < 0n || id > U64_MAX) {
    throw new RangeError("stableIdToHex: a StableId is outside 0 to 2^64 - 1");
  }
  return id.toString(16).padStart(16, "0");
}

/**
 * Reads the text `stableIdToHex` writes: exactly 16 hex digits (uppercase is
 * accepted; no sign, `0x` prefix, whitespace or separators). Anything else
 * throws a `SyntaxError` that names the problem and the input's length, not
 * the input.
 *
 * `"0000000000000000"` reads as 0n, not as an error. `hashKey` never makes 0,
 * but 0 is the "none" value (`idOfSlot`), and a list of IDs that holds a "none"
 * has to round-trip. It is a `StableId` (the "none" one, see the type), so check for 0n if you need a real one.
 *
 * See `stableIdToHex` for the `JSON.parse` reviver.
 */
export function parseStableId(text: string): StableId {
  if (typeof text !== "string") {
    throw new TypeError(`parseStableId: expected a string, got ${typeof text}`);
  }
  if (!HEX16.test(text)) {
    throw new SyntaxError(
      `parseStableId: expected exactly 16 hex digits, got ${text.length} characters or a non-hex one`,
    );
  }
  return brandId(BigInt(`0x${text}`));
}

/** Hosts whose `v` query parameter is the asset's version, not a token. */
const VERSIONED_HOSTS = /(^|\.)ion\.cesium\.com$|^assets\.cesium\.com$/i;

/** A reference's scheme (RFC 3986's `scheme ":"`). */
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
/**
 * The URL standard's special schemes: for these, any run of slashes or
 * backslashes after the scheme, or none, starts the authority.
 */
const SPECIAL_SCHEME = /^(?:https?|wss?|ftp|file):$/i;
/**
 * An opaque reference's user information (`scheme:user:password@rest`, no
 * `//`): up to its last `@` before any slash, so a password with `?` or `#`
 * goes whole.
 */
const OPAQUE_USER_INFO = /^([a-z][a-z0-9+.-]*:)[^/\\]*@/i;
/** A reference's query and fragment. */
const QUERY_AND_FRAGMENT = /[?#].*$/s;
/** A data URI's media type, kept only when it is a plain `type/subtype`. */
const MEDIA_TYPE = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;
/** The longest media type kept: RFC 6838 allows 127 characters each side. */
const MEDIA_TYPE_LENGTH = 255;

/**
 * A reference as the URL standard's parser reads it, before any test on
 * it: no leading or trailing C0 control or space, and no tab, line feed or
 * carriage return anywhere (WHATWG URL, "basic URL parser", steps 1 and 2).
 */
function normalizeReference(reference: string): string {
  let start = 0;
  let end = reference.length;
  while (start < end && reference.charCodeAt(start) <= 0x20) {
    start++;
  }
  while (end > start && reference.charCodeAt(end - 1) <= 0x20) {
    end--;
  }
  return reference.slice(start, end).replace(/[\t\n\r]/g, "");
}

/** A hexadecimal digit's value, or -1 (`NaN` past the text's end too). */
function hexDigit(code: number): number {
  if (code >= 0x30 && code <= 0x39) {
    return code - 0x30;
  }
  const lower = code | 0x20;
  return lower >= 0x61 && lower <= 0x66 ? lower - 0x57 : -1;
}

/**
 * Percent-encoded text's bytes from `from`, in order, to `emit`: each `%XX`
 * its byte, the rest as UTF-8, as `TextEncoder` gives it (a lone surrogate
 * is U+FFFD). One pass, nothing allocated.
 */
function percentDecode(
  text: string,
  from: number,
  emit: (byte: number) => void,
): void {
  for (let i = from; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c === 0x25) {
      const high = hexDigit(text.charCodeAt(i + 1));
      const low = hexDigit(text.charCodeAt(i + 2));
      if (high >= 0 && low >= 0) {
        emit(high * 16 + low);
        i += 2;
      } else {
        emit(c);
      }
    } else if (c < 0x80) {
      emit(c);
    } else if (c < 0x800) {
      emit(0xc0 | (c >> 6));
      emit(0x80 | (c & 0x3f));
    } else {
      if (c >= 0xd800 && c <= 0xdbff) {
        const next = text.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          const point = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
          emit(0xf0 | (point >> 18));
          emit(0x80 | ((point >> 12) & 0x3f));
          emit(0x80 | ((point >> 6) & 0x3f));
          emit(0x80 | (point & 0x3f));
          i++;
          continue;
        }
        c = 0xfffd;
      } else if (c >= 0xdc00 && c <= 0xdfff) {
        c = 0xfffd;
      }
      emit(0xe0 | (c >> 12));
      emit(0x80 | ((c >> 6) & 0x3f));
      emit(0x80 | (c & 0x3f));
    }
  }
}

/** A base64 digit's value, or -1. */
function base64Digit(code: number): number {
  if (code >= 0x41 && code <= 0x5a) {
    return code - 0x41;
  }
  if (code >= 0x61 && code <= 0x7a) {
    return code - 0x47;
  }
  if (code >= 0x30 && code <= 0x39) {
    return code + 4;
  }
  return code === 0x2b ? 62 : code === 0x2f ? 63 : -1;
}

/**
 * Base64 decoded as it arrives, one byte (one Latin-1 character) at a time,
 * into a hash of the decoded bytes. It accepts what `atob` accepts after
 * every JavaScript white space character goes (HTML's forgiving-base64
 * decode): at most two `=` at the end, and only when they make the length a
 * multiple of 4.
 */
class Base64Hash {
  private readonly hash = new Murmur3x86x128();
  private bits = 0;
  private count = 0;
  private digits = 0;
  private padding = 0;
  private valid = true;

  push(byte: number): void {
    if (!this.valid) {
      return;
    }
    // JavaScript's white space among Latin-1 characters.
    if ((byte >= 0x09 && byte <= 0x0d) || byte === 0x20 || byte === 0xa0) {
      return;
    }
    if (byte === 0x3d) {
      this.padding++;
      return;
    }
    const digit = base64Digit(byte);
    if (digit < 0 || this.padding > 0) {
      this.valid = false;
      return;
    }
    this.digits++;
    this.bits = ((this.bits << 6) | digit) & 0xffff;
    this.count += 6;
    if (this.count >= 8) {
      this.count -= 8;
      this.hash.push((this.bits >> this.count) & 0xff);
    }
  }

  /** The decoded bytes' hash, or `undefined` when the text isn't base64. */
  digest(): [number, number, number, number] | undefined {
    const padded =
      this.padding === 0 ||
      (this.padding <= 2 && (this.digits + this.padding) % 4 === 0);
    return this.valid && padded && this.digits % 4 !== 1
      ? this.hash.digest()
      : undefined;
  }
}

/**
 * A data URI's canonical form: its media type and the MurmurHash3_x86_128
 * of its payload's bytes (RFC 2397): after the first comma, percent-decoded,
 * then decoded from base64 when its header ends in `;base64`. Base64 that
 * doesn't decode counts as its percent-decoded bytes. One pass over the
 * text, with nothing allocated per byte, whatever its size.
 */
function dataDigest(uri: string): string {
  const comma = uri.indexOf(",");
  const header = comma < 0 ? uri.slice(5) : uri.slice(5, comma);
  const semicolon = header.indexOf(";");
  const candidate = semicolon < 0 ? header : header.slice(0, semicolon);
  const type =
    candidate.length <= MEDIA_TYPE_LENGTH && MEDIA_TYPE.test(candidate)
      ? candidate.toLowerCase()
      : "";
  const last = header.lastIndexOf(";");
  const base64 =
    last >= 0 &&
    header.length - last === 7 &&
    header.slice(last + 1).toLowerCase() === "base64";
  const plain = new Murmur3x86x128();
  const decoded = base64 ? new Base64Hash() : undefined;
  if (comma >= 0) {
    percentDecode(
      uri,
      comma + 1,
      decoded
        ? (byte) => {
            plain.push(byte);
            decoded.push(byte);
          }
        : (byte) => plain.push(byte),
    );
  }
  const digest = (decoded?.digest() ?? plain.digest())
    .map((w) => w.toString(16).padStart(8, "0"))
    .join("");
  return `data:${type};murmur3-128=${digest}`;
}

/**
 * Where a reference's authority (`user:password@host:port`) starts, after
 * its scheme and slashes, or -1 when it has none: a special scheme always
 * has one; any other reference, after `//` (or `\\`, as http reads it).
 */
function authorityStart(text: string, scheme: string): number {
  let end = scheme.length;
  while (text[end] === "/" || text[end] === "\\") {
    end++;
  }
  if (scheme && SPECIAL_SCHEME.test(scheme)) {
    return end;
  }
  return end - scheme.length >= 2 ? scheme.length + 2 : -1;
}

/**
 * An asset's canonical reference, for its IDs and every message that names
 * a key: no credentials, query or fragment (session tokens never enter an
 * ID). It reads the reference as the URL parser does: leading and trailing
 * spaces and controls, and every tab and newline, go first.
 *
 * - A reference with an authority (`scheme://`, `//`, or a special scheme
 *   such as `https:` with any slashes) keeps its scheme, if any, and the
 *   host, port and path the URL parser finds. Cesium ion's
 *   assets keep their `v` (the asset's version), so a new version of the
 *   data gets new IDs.
 * - When the parser can't read it, or finds no host, nothing before the
 *   reference's last `@` survives: a password with a raw `?`, `#` or `/`
 *   goes whole, with its user name. Then the query and fragment go.
 * - A blob URL keeps `blob:` and its origin's URL, canonical as above.
 * - A relative or opaque reference loses its query and fragment, and an
 *   opaque one's user information (`scheme:user:password@`).
 * - A data URI becomes `data:<type>;murmur3-128=<32 hex digits>`: the
 *   MurmurHash3_x86_128 of its decoded bytes, so the same bytes give the same
 *   IDs and no payload is kept. Its media type stays only when it is a plain
 *   `type/subtype`; its parameters go.
 */
export function canonicalSource(reference: string): string {
  const text = normalizeReference(reference);
  if (/^data:/i.test(text)) {
    return dataDigest(text);
  }
  if (/^blob:/i.test(text)) {
    // blob:<origin>/<uuid>: the origin's own URL, canonical.
    return `blob:${canonicalSource(text.slice(5))}`;
  }
  const scheme = SCHEME.exec(text)?.[0] ?? "";
  const start = authorityStart(text, scheme);
  if (start < 0) {
    // Relative or opaque: no query or fragment, no user information.
    return text.replace(OPAQUE_USER_INFO, "$1").replace(QUERY_AND_FRAGMENT, "");
  }
  let url: URL | undefined;
  try {
    // A base only for a protocol-relative reference, read as http: with a
    // scheme, "https:u:p@h" would resolve against it as a path.
    url = scheme ? new URL(text) : new URL(text, "https://base.invalid/");
  } catch {
    url = undefined;
  }
  if (!url || url.host === "") {
    const at = text.lastIndexOf("@");
    const rest = text.slice(Math.max(at + 1, start));
    return `${text.slice(0, start)}${rest}`.replace(QUERY_AND_FRAGMENT, "");
  }
  const version = VERSIONED_HOSTS.test(url.hostname)
    ? url.searchParams.get("v")
    : null;
  const base = `${scheme ? url.protocol : ""}//${url.host}${url.pathname}`;
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
  /**
   * A content source's draw (CS-957 A): the source's key for the draw, for
   * its features' feature IDs (with `source`), kept beside their instance
   * IDs. A draw without features has one feature ID, from `key`; a named
   * feature's is from its name. CS-961 gives the others theirs.
   */
  readonly feature?: { readonly key: string };
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
  /** Per local feature, its feature ID (0: none), for a content source's draw. */
  features?: BigUint64Array;
}

/** What a slot resolves to: its ID, key and how it was drawn. */
export interface SlotIdentity {
  readonly id: StableId;
  readonly key: StableKey;
  readonly scope: "global" | "tile";
  readonly local: number;
  readonly draw: { readonly index: number; readonly generation: number };
  /** Its feature ID, for a content source's feature (`Identified.feature`). */
  readonly feature?: StableId;
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
  /** Slots by their feature ID, for content sources' features (CS-957 A). */
  private readonly featureSlots = new Map<StableId, number[]>();
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
  /** Every item key held now, the host's and the derived alike. */
  private readonly itemKeys = new Set<string>();
  /**
   * @internal Keys an open content holds for its item, placed or not
   * (its content ID, `Engine.open`): a derived key skips them as it skips
   * held ones, so content and tileset items share the ordinal rule.
   */
  reserved: ((key: string) => boolean) | undefined;

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
   * then depends on the order items were added: reported. `own` is a key the
   * new item's own content reserves (its content ID): the ordinal rule takes
   * it while no item holds it.
   */
  claimItemKey(
    explicit: string | undefined,
    derived: string,
    own?: string,
  ): string {
    if (explicit !== undefined) {
      if (typeof explicit !== "string" || explicit.length === 0) {
        throw new Error("an item's id is a non-empty string");
      }
      if (this.itemKeys.has(explicit)) {
        throw new Error(
          `an item with the id "${explicit}" is drawn already: each item's id is its own.`,
        );
      }
      this.itemKeys.add(explicit);
      return explicit;
    }
    // The first ordinal whose key no item holds or content reserves: a
    // host's id that looks like an ordinal ("wall#2") is skipped, never shared.
    const keyOf = (n: number) => (n === 1 ? derived : `${derived}#${n}`);
    let ordinal = 1;
    const held = (key: string) =>
      key === own ? this.itemKeys.has(key) : this.holdsItemKey(key);
    while (held(keyOf(ordinal))) {
      ordinal++;
    }
    const key = keyOf(ordinal);
    this.itemKeys.add(key);
    if (ordinal > 1) {
      this.world.report(
        `a second item of ${derived} without an id: its IDs take the ordinal #${ordinal}, which depends on the order items were added. Give each item an id.`,
      );
    }
    return key;
  }

  /** @internal Whether an item holds `key`, or an open content reserves it. */
  holdsItemKey(key: string): boolean {
    return this.itemKeys.has(key) || (this.reserved?.(key) ?? false);
  }

  /**
   * The item key left (its item was removed): exactly the key
   * `claimItemKey` gave, whether the host's or derived with an ordinal.
   */
  releaseItemKey(key: string): void {
    this.itemKeys.delete(key);
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
    this.unindexFeatures(entry);
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
      const id = brandId(ids[local]!);
      if (this.collided.has(id)) {
        this.recheckCollision(id);
      }
    }
  }

  /**
   * A collided ID after one of its draws left: still a collision while two
   * different keys hash to it in the draws loaded, else cleared, so
   * `identify` answers for the key that is left.
   */
  private recheckCollision(id: StableId): void {
    const texts = new Set<string>();
    for (const slot of this.index.get(Number(id & 0xffffffffn)) ?? []) {
      const entry = this.at(slot);
      if (entry?.ids && entry.ids[slot - entry.first] === id) {
        texts.add(canonicalKey(this.keyOf(entry, slot - entry.first)));
      }
    }
    const [a, b] = [...texts];
    if (a !== undefined && b !== undefined) {
      this.collided.set(id, [a, b]);
    } else {
      this.collided.delete(id);
    }
  }

  /**
   * Every draw's IDs computed again when next asked for: an item came or
   * went, so a draw's item may have changed (the item drawing a tile's own
   * draws). Host labels stay, by ID.
   */
  recompute(): void {
    this.index.clear();
    this.featureSlots.clear();
    this.collided.clear();
    for (const entry of this.draws.values()) {
      entry.ids = undefined;
      entry.item = undefined;
      entry.names = undefined;
      entry.features = undefined;
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
      this.indexFeatures(entry);
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
    this.indexFeatures(entry);
  }

  /**
   * A content source's draw's feature key of local feature `local`
   * (CS-957 A): none for other draws, and none yet for an unnamed feature
   * of a draw with features (CS-961).
   */
  private featureKeyOf(entry: DrawIds, local: number): StableKey | undefined {
    const identity = entry.identity;
    const feature = identity?.feature;
    if (!feature) {
      return undefined;
    }
    const key = entry.featured ? entry.names?.[local] : feature.key;
    return key === undefined
      ? undefined
      : { kind: "feature", source: identity.source, key };
  }

  /** Indexes a content source's draw's slots by their feature IDs. */
  private indexFeatures(entry: DrawIds): void {
    if (!entry.identity?.feature) {
      return;
    }
    // A draw without features has one feature: its first slot stands for it.
    const indexed = entry.featured ? entry.count : 1;
    const features = new BigUint64Array(entry.count);
    for (let local = 0; local < indexed; local++) {
      const key = this.featureKeyOf(entry, local);
      if (key === undefined) {
        continue;
      }
      const id = this.hash(canonicalKey(key));
      features[local] = id;
      let slots = this.featureSlots.get(id);
      if (!slots) {
        slots = [];
        this.featureSlots.set(id, slots);
      }
      slots.push(entry.first + local);
    }
    if (!entry.featured) {
      features.fill(features[0]!);
    }
    entry.features = features;
  }

  private unindexFeatures(entry: DrawIds): void {
    const features = entry.features;
    if (!features) {
      return;
    }
    const indexed = entry.featured ? entry.count : 1;
    for (let local = 0; local < indexed; local++) {
      const id = features[local]!;
      const slots = id === 0n ? undefined : this.featureSlots.get(id);
      if (!slots) {
        continue;
      }
      const k = slots.indexOf(entry.first + local);
      if (k >= 0) {
        slots.splice(k, 1);
      }
      if (slots.length === 0) {
        this.featureSlots.delete(id);
      }
    }
  }

  /** Local feature `local`'s feature ID, when it has one. */
  private featureOf(entry: DrawIds, local: number): StableId | undefined {
    const id = entry.features?.[local];
    return id === undefined || id === 0n ? undefined : id;
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
      // One collision, whichever key was seen first: reported once.
      const pair = [otherText, text].sort().join("\u0000");
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
    const feature = this.featureOf(entry, local);
    return {
      id: brandId(entry.ids[local]!),
      key: this.keyOf(entry, local),
      scope: this.scopeOf(entry, local),
      local,
      draw: { index: entry.index, generation: entry.generation },
      ...(feature !== undefined && { feature }),
    };
  }

  /** A slot's `StableId` (0 for none). */
  idOfSlot(slot: number): StableId {
    return this.slot(slot)?.id ?? brandId(0n);
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

  /**
   * Local feature `local`'s labels: the host's on `id` (its instance ID;
   * undefined to answer for its feature ID alone), then the host's on its
   * feature ID, then the lower levels.
   */
  private labelsOf(
    entry: DrawIds,
    local: number,
    id: StableId | undefined,
    only?: readonly string[],
  ): Labels {
    const host = id === undefined ? undefined : this.hostLabels.get(id);
    const featureId = this.featureOf(entry, local);
    const featureHost =
      featureId === undefined ? undefined : this.hostLabels.get(featureId);
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
        featureHost ? Object.fromEntries(featureHost) : undefined,
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
      const feature = this.featureOf(entry, local);
      return {
        id,
        key: this.keyOf(entry, local),
        scope: this.scopeOf(entry, local),
        labels: this.labelsOf(entry, local, id, options.taxonomies),
        ...(name !== undefined && { name }),
        ...(properties && { properties }),
        draw: { index: entry.index, generation: entry.generation },
        ...(feature !== undefined && { feature }),
      };
    }
    return this.identifyFeature(id, options.taxonomies);
  }

  /**
   * A content source's feature ID (CS-957 A), as the first placement still
   * drawing it shows it, without that placement's own host labels.
   */
  private identifyFeature(
    id: StableId,
    taxonomies: readonly string[] | undefined,
  ): Identified | undefined {
    for (const slot of this.featureSlots.get(id) ?? []) {
      const entry = this.at(slot);
      const local = slot - (entry?.first ?? 0);
      const key = entry && this.featureKeyOf(entry, local);
      if (!entry || !key || this.featureOf(entry, local) !== id) {
        continue;
      }
      const { name, properties } = this.world.featureProperties(
        entry.index,
        local,
      );
      return {
        id,
        key,
        scope: "global",
        labels: this.labelsOf(entry, local, undefined, taxonomies),
        ...(name !== undefined && { name }),
        ...(properties && { properties }),
        draw: { index: entry.index, generation: entry.generation },
        feature: id,
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
