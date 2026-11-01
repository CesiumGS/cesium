/**
 * What the inspector reads (plan §16.9, Inspector): a snapshot an engine
 * fills in as far as it can measure, a few times a second. 2.0 implements
 * it from public APIs (`inspectEngine`); Dyno's 1.x adapter implements it
 * too, so one inspector shows both engines. Fields an engine can't measure
 * are left out, and the inspector leaves their rows out.
 */

/** A pipeline stage's percentiles over recent loads, ms. */
export interface StagePercentiles {
  p50: number;
  p95: number;
}

/** One memory pool, against its capacity when it has one. */
export interface MemoryRow {
  label: string;
  used: number;
  capacity?: number;
  unit: "bytes" | "count";
  /** Replaces "used of capacity" (e.g. "41 MB resident · idle cap 64 MB"). */
  text?: string;
}

/** What resident content holds. */
export interface ContentMix {
  triangles: number;
  lines: number;
  points: number;
  features: number;
  /** Decoded vertex and index bytes, and texture bytes. */
  geometryBytes: number;
  textureBytes: number;
  /** Texture images by source type (image/jpeg, image/ktx2...). */
  images: Record<string, number>;
  /** Content by container format ("glb 120 · b3dm 4"). */
  formats?: string;
}

/** A picked feature. */
export interface PickInfo {
  name?: string;
  featureId?: number;
  properties?: Record<string, unknown>;
}

export interface InspectorSnapshot {
  /** Streaming state: tiles up to date, loading, or paused by the user. */
  state: "settled" | "loading" | "paused";
  /** Errors and warnings from loading content. */
  problems?: { errors: string[]; warnings: string[] };
  frame?: {
    /** Main-thread time per frame, ms. */
    cpuMs?: number;
    /** GPU time per frame, ms; undefined where the engine can't measure it. */
    gpuMs?: number;
    /** Time between frames, ms. */
    intervalMs?: number;
    /** "continuous" or "on demand". */
    rendering?: string;
    /** Frames rendered so far (the inspector derives frames per second). */
    framesRendered?: number;
  };
  tiles?: {
    drawn: number;
    /** Drawn per view, when there are several ("main", "inset"...). */
    perView?: Array<[string, number]>;
    /** Tiles the engine knows of (loaded headers). */
    known?: number;
    /** Content requests in flight. */
    loading: number;
    /** The request window: how many may be in flight. */
    window?: {
      max: number;
      adaptive: boolean;
      protocol?: string;
      cancelled?: number;
      uploadQueue?: number;
    };
    /** Content in memory, against the cache budget and its overflow. */
    cache?: { bytes: number; budget?: number; overflow?: number };
    /** Screen-space error threshold, px, and the memory-adjusted value. */
    sse?: { maximum: number; adjusted?: number; placeholders?: number };
    /** Since loading began. */
    received?: { requests: number; bytes: number };
    /**
     * Loading in phases (resolve, root, to first content, to settled), ms;
     * the last phase still running while `settled` is false.
     */
    load?: { phases: Array<{ label: string; ms: number }>; settled: boolean };
  };
  /** Where recent content loads spent their time, and what they hold. */
  pipeline?: {
    samples: number;
    stages: Record<string, StagePercentiles>;
    /** Shown after the chart title (default "last N loads"). */
    note?: string;
    content?: ContentMix;
  };
  memory?: MemoryRow[];
  gpu?: {
    adapter?: string;
    canvas?: [number, number];
    views?: number;
    batches?: number;
    /** Render-target bytes (for the history). */
    renderTargetBytes?: number;
  };
  /**
   * The camera (any numbers that change when it moves), for the cost of the
   * last move: from when it stopped to settled, in requests and bytes.
   */
  camera?: readonly number[];
}

/** An engine (or one view of it) the inspector can show. */
export interface Inspectable {
  /** Shown in the header ("2.0 · main", "1.146.0"). */
  readonly name: string;
  /** A swatch color for the header (CSS color), e.g. a pane's. */
  readonly color?: string;
  snapshot(): InspectorSnapshot;
}
