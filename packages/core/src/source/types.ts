/**
 * The content-source seam's types (CS-847, from docs/design/content-source-seam.md):
 * the one interface every content source implements, what the engine gives
 * it, and the data it writes. Working names: the public API review (CS-102)
 * names them, so every public one is `@experimental`.
 *
 * Everything here is data or an interface over data. Nothing names `World`,
 * `Engine`, the renderer or a GPU type, so a source runs the same on the
 * main thread, in worker mode and over an in-memory host in Node
 * (test/importBoundary.test.ts and test/seams.test.ts hold this).
 */
import type { CameraRecord } from "../scene/Camera.ts";
import type { StableId } from "../scene/identity.ts";
import type { Credential, FetchProvider } from "../io/fetchProvider.ts";
import type { Job } from "../io/Jobs.ts";
import type { DrawSink } from "../streaming/DrawSink.ts";
import type {
  ChangeSet,
  FeatureData,
  SourceWriter,
  WriteCapabilities,
} from "./editing.ts";

// ---------------------------------------------------------------------------
// Plain data

/**
 * A value plain data holds: structured-clonable and JSON-shaped.
 * @experimental
 */
export type PlainValue =
  | string
  | number
  | boolean
  | null
  | readonly PlainValue[]
  | { readonly [key: string]: PlainValue };

/**
 * Options and other data that cross threads in worker mode.
 * @experimental
 */
export type PlainData = { readonly [key: string]: PlainValue };

/**
 * A module named by URL: the engine imports it on its own thread, so a
 * kind or a decoder is never a live object passed in.
 * @experimental
 */
export interface ModuleRef {
  /** `new URL("./csvSource.js", import.meta.url)`, or its `href`. */
  readonly module: string | URL;
}

/**
 * What a source names one piece of its content by: a tile's content URI, a
 * feature page, an image's tile address. Unique within the source.
 * @experimental
 */
export type ContentKey = string;

/**
 * A feature's ID (CS-957 A, CS-1031 A): made from its content's canonical
 * source (`SourceContent.source`) and the source's own key for the feature
 * (a row's `RowIdentity.names` entry, a draw's `DrawOptions.id`), and
 * nothing else: never from the scene item that places it or the content's
 * ID, so it is the same across opens, worlds and runs. Rows, the edit layer,
 * change sets, metadata and labels name it.
 *
 * Its key kind is `feature` (`StableKey`), which has no item, so it is never
 * an instance ID.
 * @experimental
 */
export type FeatureId = StableId;

/**
 * A placed feature's ID (CS-957 A): its feature with the placement, the
 * scene item, that draws it. Each item's draws carry their own, so one
 * content placed twice gives two, and neither is its feature ID. Picks and
 * ray hits report it; `Identity.identify` gives its feature ID
 * (`Identified.feature`), and CS-961 puts the feature ID beside it in picks
 * and the ID image.
 *
 * It is the ID CS-815 makes with the item's key (`ContentItem.key`).
 * @experimental
 */
export type InstanceId = StableId;

/**
 * One credit a piece of content needs shown (ion's `Attribution` has this shape).
 * @experimental
 */
export interface Credit {
  readonly html: string;
  /** False or absent: shown on screen; true: may be listed behind a toggle. */
  readonly collapsible?: boolean;
}

/** @experimental */
export type CreditList = readonly Credit[];

/**
 * Where and when a source has content. Each part is optional; a source
 * gives what it knows.
 * @experimental
 */
export interface SourceExtent {
  /** Radians and meters on EPSG:4979 (WGS 84 geographic, ellipsoidal heights). */
  readonly region?: {
    readonly west: number;
    readonly south: number;
    readonly east: number;
    readonly north: number;
    readonly minimumHeight?: number;
    readonly maximumHeight?: number;
  };
  /** An axis-aligned box in a named CRS, in its units. */
  readonly box?: {
    readonly crs: string;
    readonly min: readonly [number, number, number];
    readonly max: readonly [number, number, number];
  };
  /** Scene time (`SourceClock.seconds`): UTC seconds since 1970. */
  readonly time?: { readonly start: number; readonly stop: number };
  /** The reference frame its coordinates are in, when not the body's fixed frame. */
  readonly frame?: string;
}

/**
 * The feature properties a style can bind to.
 * @experimental
 */
export interface FeatureSchema {
  readonly properties: Readonly<
    Record<
      string,
      {
        readonly type: "string" | "number" | "boolean" | "enum";
        /** An enum's names, in index order. */
        readonly enum?: readonly string[];
      }
    >
  >;
}

// ---------------------------------------------------------------------------
// Where an asset lives (CS-846: ion is an `AssetResolver`)

/**
 * A reference a host names content by: a URL, an ion asset, or an ID in a
 * resolver of the host's own.
 * @experimental
 */
export type AssetRef =
  | {
      readonly url: string | URL;
      /** A `SourceKind`'s ID; absent, each registered kind is asked (`SourceKind.accepts`). */
      readonly kind?: string;
      readonly options?: PlainData;
    }
  | { readonly ion: number; readonly server?: string }
  | {
      readonly resolver: string;
      readonly id: string;
      readonly options?: PlainData;
    };

/**
 * Turns an asset reference into where the asset lives, how to authenticate,
 * what it credits and what kind it is: "url" (the engine's), "ion", "itwin",
 * or a host's own.
 * @experimental
 */
export interface AssetResolver {
  readonly id: string;
  accepts(ref: AssetRef): boolean;
  resolve(
    ref: AssetRef,
    init: { readonly signal?: AbortSignal },
  ): Promise<ResolvedAsset>;
}

/**
 * A resolved asset.
 * @experimental
 */
export interface ResolvedAsset {
  /**
   * A `SourceKind`'s ID. Absent when the resolver can't tell (a plain URL
   * with no kind): the registry then asks each kind (`SourceKind.accepts`).
   */
  readonly kind?: string;
  readonly url: URL;
  /** Renewable, refreshed on a 401 (CS-809's `Credential`). */
  readonly credentials?: Credential;
  readonly credits: CreditList;
  /** For invalidation, and for edits' optimistic concurrency. */
  readonly version?: string;
  /** Kind-specific, such as Bing's imagery style. */
  readonly options?: PlainData;
  /** What the response said it is, when the resolver read one. */
  readonly mediaType?: string;
}

// ---------------------------------------------------------------------------
// What the content is

/**
 * One kind of source, registered by a module: "3d-tiles", "quantized-mesh",
 * "gltf", "mvt", or an application's own. A kind module's default export is
 * one of these (`registerKind`).
 * @experimental
 */
export interface SourceKind {
  readonly id: string;
  /** Claims a resolved asset by its declared kind, media type or URL. */
  accepts(asset: ResolvedAsset): boolean;
  open(asset: ResolvedAsset, host: SourceHost): ContentSource;
  /**
   * Worker job types its decode needs, each a module loaded by URL into
   * every worker of the pool (`DecoderRef`).
   */
  readonly decoders?: readonly DecoderRef[];
  /** The renderer half, when it draws something the renderer doesn't know (CS-841). */
  readonly renderFeatures?: readonly ModuleRef[];
}

/**
 * A decoder: a job type and the module that runs it on a worker. The
 * module's default export is a `Decoder`.
 * @experimental
 */
export interface DecoderRef extends ModuleRef {
  /** The job type (`SourceJobSpec.type`): unique in the engine. */
  readonly type: string;
}

/**
 * A decoder's function, run on a worker: a pure function of its payload
 * whose large arrays are transferred back.
 * @experimental
 */
export type Decoder = (
  payload: Readonly<Record<string, unknown>>,
  context: DecoderContext,
) => DecoderResult | Promise<DecoderResult>;

/** @experimental */
export interface DecoderResult {
  readonly result: unknown;
  /** Buffers handed over rather than copied. */
  readonly transfer?: readonly Transferable[];
}

/**
 * What a decoder gets besides its payload.
 * @experimental
 */
export interface DecoderContext {
  /** Aborted when its job is canceled. */
  readonly signal: AbortSignal;
  /**
   * Makes a request through the page's provider, with the job's headers
   * there: the worker never holds a credential. Absent where the pool has
   * no page (a Node test's).
   */
  readonly fetch?: (
    url: string,
    init?: { readonly accept?: string },
  ) => Promise<Response>;
}

/**
 * One open source: content that scene items place.
 * @experimental
 */
export interface ContentSource {
  readonly kind: string;
  readonly capabilities: SourceCapabilities;
  readonly ready: Promise<void>;
  /** Where and when it has content. */
  readonly extent?: SourceExtent;
  /** The feature properties a style can bind to. */
  readonly schema?: FeatureSchema;
  /** Credits for the whole source; content's own ride with it into the sinks. */
  readonly credits: CreditList;
  /** One tick: the views that show it, the time, and what the budget granted. */
  update(tick: SourceTick): void;
  /** Answers beyond what its output answers (terrain's heights where nothing is loaded). */
  readonly queries?: SourceQueries;
  /** Edits back (CS-831). Absent on a read-only source. */
  readonly writer?: SourceWriter;
  destroy(): void;
}

/**
 * What a source declares about itself.
 * @experimental
 */
export interface SourceCapabilities {
  /** How it decides what to load: a tree by view, the whole asset, by its receivers, or by push. */
  readonly selection: "tree" | "whole" | "derived" | "push";
  /** What it writes: "meshes", "raster", "features", "points", or a render feature's ID. */
  readonly outputs: readonly string[];
  /** False for a live feed: "settled" (CS-816) never waits for it. */
  readonly settles: boolean;
  /** It pushes changes (`SourceHost.changed`). */
  readonly pushes: boolean;
  /**
   * When it checks its own server's version and turns what it learns into
   * pushes (CS-863): the interval it declares, in seconds. The engine never
   * polls; the source does, under the shared budget.
   */
  readonly polls?: { readonly intervalSeconds: number };
  /** CS-831's write capabilities: `READ_ONLY` unless the source can write. */
  readonly write: WriteCapabilities;
}

/**
 * Answers a source gives beyond its output. Each is optional.
 * @experimental
 */
export interface SourceQueries {
  /** Height (m) above the ellipsoid at a point (radians), where it knows one. */
  height?(longitude: number, latitude: number): number | undefined;
  /**
   * A feature by the source's own key for it (`RowIdentity.names`), where
   * the service can look one up. The engine maps a feature ID to its key.
   */
  feature?(
    key: string,
    init: { readonly signal?: AbortSignal },
  ): Promise<FeatureData | undefined>;
}

// ---------------------------------------------------------------------------
// What the engine gives a source

/**
 * What the engine gives a source. A source holds nothing else of the engine's.
 * @experimental
 */
export interface SourceHost {
  /** CS-809: every request, credentials, proxies. */
  readonly fetch: FetchProvider;
  /** Decode on the worker pool, by priority, cancelable. */
  readonly jobs: SourceJobs;
  /** Wants in, grants out, shared by every source. */
  readonly budget: BudgetClient;
  /** Where its output goes. */
  readonly sinks: ContentSinks;
  /** The scene time of its content's world, and wall time apart (CS-960 A). */
  readonly clock: SourceClock;
  /** A push: content changed. Wakes the engine; it applies in the apply phase. */
  changed(change: SourceChange): void;
}

/**
 * The time a source sees (CS-960 A): the scene time of its content's world,
 * the clock picks and camera records read, with its epoch and time scale
 * named, and wall time as a separate field. Every other time in the seam
 * (`SourceExtent.time`, `RasterImage.time`, `SampleBatch.times`) is scene time.
 * @experimental
 */
export interface SourceClock {
  /**
   * Scene time: seconds since `epoch` on `timeScale`, from its content's
   * world's scene clock (`SceneClock.seconds`). 0 while the world has no
   * scene clock, as picks read it; it pauses, jumps and runs backward with
   * the scene clock.
   */
  readonly seconds: number;
  /** The scene time's epoch: 1970-01-01T00:00:00 UTC. */
  readonly epoch: "1970-01-01T00:00:00Z";
  /**
   * The scene time's time scale: UTC, as the scene clock counts it
   * (`SceneClock`). How it counts leap seconds is the time package's to say.
   */
  readonly timeScale: "UTC";
  /**
   * Wall time: real seconds since the engine started (`Engine.time`), apart
   * from the scene time. For what runs while the scene's time stands still:
   * an animation, a server's polling interval (CS-863).
   */
  readonly wallSeconds: number;
  /** True when a host steps it (CS-816): samples then wait for their scene times. */
  readonly stepped: boolean;
}

/**
 * Decode on the worker pool.
 * @experimental
 */
export interface SourceJobs {
  /**
   * Submits a job of one of its kind's decoder types. Its priority is read
   * each time the queue sorts, so a job follows its want.
   */
  submit<R, A = R>(spec: SourceJobSpec<R, A>): Job<A>;
}

/**
 * A decode job (as `JobSpec`, for a decoder's type).
 * @experimental
 */
export interface SourceJobSpec<R, A = R> {
  /** One of its kind's `decoders`' types. */
  readonly type: string;
  readonly payload?: Record<string, unknown>;
  readonly transfer?: (payload: Record<string, unknown>) => Transferable[];
  /** Lower runs sooner; a function is read each time the queue sorts. */
  readonly priority?: number | (() => number);
  readonly signal?: AbortSignal;
  /** Its main-thread step, in the apply phase. */
  readonly apply?: (result: R) => A;
  readonly discard?: (result: R) => void;
  /** It mostly waits on the network. */
  readonly io?: boolean;
}

/**
 * One view that shows a source, as the source sees it.
 * @experimental
 */
export interface SourceView {
  /** Stable while the view lives. */
  readonly id: number;
  /** Its camera now: intrinsics and pose in the view's render root (CS-814). */
  camera(): CameraRecord;
}

/**
 * One tick for a source.
 * @experimental
 */
export interface SourceTick {
  /** Its items' views, in the order the engine holds them. */
  readonly views: readonly SourceView[];
  /** The scene time, with its epoch and time scale, and wall time apart (`SourceHost.clock` now). */
  readonly clock: SourceClock;
  /** What the budget granted since its last update. */
  readonly grant: SourceGrant;
  /** Invalidations the engine applied since its last update: select again. */
  readonly invalidated: readonly InvalidateChange[];
}

// ---------------------------------------------------------------------------
// The budget, shared by every source

/**
 * A want's class: holes in a view first, then refinement, then prefetch
 * (served only when nothing else waits).
 * @experimental
 */
export type WantClass = "now" | "refine" | "prefetch";

/**
 * One thing a source wants loaded this tick.
 * @experimental
 */
export interface Want {
  readonly key: ContentKey;
  readonly class: WantClass;
  /** Screen-space error removed × screen coverage × view weight (unitless, ≥ 0). */
  readonly benefit: number;
  readonly cost: {
    /** Bytes it will hold once loaded. */
    readonly bytes: number;
    /** Expected decode time, ms. */
    readonly decodeMs?: number;
  };
  /** The origin its requests go to (`https://assets.example.com`). */
  readonly origin: string;
}

/**
 * Wants in, grants out.
 * @experimental
 */
export interface BudgetClient {
  /** Asks for `want` this tick. Wants are rebuilt every tick. */
  want(want: Want): void;
  /**
   * A granted load ended: its origin's slot frees, and it holds `bytes`
   * (default: its want's) until `release`.
   */
  settle(key: ContentKey, bytes?: number): void;
  /** Content it held is gone: its bytes free. Also cancels a grant not yet settled. */
  release(key: ContentKey): void;
  /** Bytes this source holds. */
  readonly resident: number;
}

/**
 * What a source may load now.
 * @experimental
 */
export interface SourceGrant {
  /** Keys granted since its last update, most urgent first. */
  readonly keys: readonly ContentKey[];
  /** The engine's byte budget and what every source holds now. */
  readonly bytes: { readonly budget: number; readonly resident: number };
}

// ---------------------------------------------------------------------------
// Sinks: where a source's output goes

/**
 * A numeric or string column of rows.
 * @experimental
 */
export type PropertyColumn =
  | Float64Array
  | Float32Array
  | Int32Array
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | readonly (string | null)[];

/**
 * How rows name the features in them, for their feature IDs (`FeatureId`,
 * CS-815). Each row gets one: from its `names` entry (the source's own key:
 * a primary key, a GeoJSON `id`), the same at every level and wherever the
 * content is placed, or else from the batch's key and its index. A writable
 * source names every row (CS-831's S7): change sets name a feature by that
 * key (`ChangeOp.key`).
 * @experimental
 */
export interface RowIdentity {
  readonly names?: readonly (string | undefined)[];
}

/**
 * Columnar vector features: points, lines, polygons or labels.
 * @experimental
 */
export interface FeatureBatch extends RowIdentity {
  readonly key: ContentKey;
  readonly geometry: "point" | "line" | "polygon" | "label";
  /** The CRS `positions` are in: "EPSG:4979" (degrees, degrees, meters) or "EPSG:4978". */
  readonly crs: string;
  readonly count: number;
  /** x, y, z per vertex, float64. */
  readonly positions: Float64Array;
  /** Per feature, its first vertex; `count + 1` entries. Absent: one vertex each. */
  readonly offsets?: Uint32Array;
  /** Per polygon feature, the first vertex of each ring after the first. */
  readonly holes?: readonly Uint32Array[];
  /** A label's text, per feature. */
  readonly text?: readonly string[];
  readonly properties?: Readonly<Record<string, PropertyColumn>>;
  /** How it meets the ground: as given, or clamped to terrain or to everything drawn. */
  readonly clamp?: "none" | "terrain" | "all";
  readonly credits?: CreditList;
}

/**
 * Columnar points: point clouds, tracks, sensor readings.
 * @experimental
 */
export interface PointBatch extends RowIdentity {
  readonly key: ContentKey;
  readonly crs: string;
  readonly count: number;
  readonly positions: Float64Array;
  readonly properties?: Readonly<Record<string, PropertyColumn>>;
  readonly credits?: CreditList;
}

/**
 * An image and where it lies: a tile in a tiling scheme, or a box in a CRS.
 * @experimental
 */
export interface RasterImage {
  readonly key: ContentKey;
  readonly footprint:
    | {
        readonly scheme: string;
        readonly level: number;
        readonly x: number;
        readonly y: number;
      }
    | {
        readonly crs: string;
        readonly box: readonly [number, number, number, number];
      };
  readonly width: number;
  readonly height: number;
  /** RGBA, 8 bits a channel, rows top to bottom; or encoded bytes with their media type. */
  readonly pixels:
    | { readonly format: "rgba8"; readonly data: Uint8Array }
    | {
        readonly format: "encoded";
        readonly mediaType: string;
        readonly data: Uint8Array;
      };
  /** The scene time it shows (`SourceClock.seconds`), for a time-dynamic layer. */
  readonly time?: number;
  readonly credits?: CreditList;
}

/**
 * Rows for a registered render feature (Gaussian splats): plain data its
 * renderer half reads.
 * @experimental
 */
export interface CustomRows extends RowIdentity {
  readonly key: ContentKey;
  readonly count: number;
  readonly columns: Readonly<Record<string, PropertyColumn>>;
  readonly credits?: CreditList;
}

/**
 * A sink of rows by content key: `put` replaces what the key held.
 * @experimental
 */
export interface RowSink<B> {
  put(batch: B): void;
  remove(key: ContentKey): void;
}

/** @experimental */
export type RasterSink = RowSink<RasterImage>;
/** @experimental */
export type FeatureSink = RowSink<FeatureBatch>;
/** @experimental */
export type PointSink = RowSink<PointBatch>;
/** @experimental */
export type CustomSink = RowSink<CustomRows>;

/**
 * Where a source's output goes.
 * @experimental
 */
export interface ContentSinks {
  /** Meshes, transforms, draws, materials and clips: `DrawSink` as it is. */
  readonly draws: DrawSink;
  /** Images with their footprints (`RasterImage`). */
  readonly images: RasterSink;
  readonly features: FeatureSink;
  readonly points: PointSink;
  /** Rows for the render feature `feature`. */
  custom(feature: string): CustomSink;
}

// ---------------------------------------------------------------------------
// Push

/**
 * Tiled content changed upstream: drop these keys or this region, and select again.
 * @experimental
 */
export interface InvalidateChange {
  readonly kind: "invalidate";
  readonly keys?: readonly ContentKey[];
  readonly region?: SourceExtent;
  readonly version?: string;
}

/**
 * Time-stamped samples: positions or readings for rows already known, by name.
 * @experimental
 */
export interface SampleBatch {
  /** Scene time (`SourceClock.seconds`), one per sample. */
  readonly times: Float64Array;
  /** The row each sample moves (`RowIdentity.names`). */
  readonly names: readonly string[];
  /** x, y, z per sample, in the row's batch's CRS. */
  readonly positions?: Float64Array;
  /** A reading per sample, by property name. */
  readonly values?: Readonly<Record<string, Float64Array>>;
}

/**
 * A push. The union is open: the engine ignores a kind it doesn't know
 * (CS-831's S5), so later kinds don't break sources.
 * @experimental
 */
export type SourceChange =
  | InvalidateChange
  /** Features others changed: CS-831's change feed in. */
  | { readonly kind: "features"; readonly changes: ChangeSet }
  | { readonly kind: "samples"; readonly samples: SampleBatch };
