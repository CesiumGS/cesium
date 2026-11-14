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
  /** More about the row, shown on hover (keeps the row one line). */
  detail?: string;
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
    /** First timed pass's start to the last one's end, ms. */
    gpuSpanMs?: number;
    /** Triangles submitted by the latest frame (before GPU culling). */
    triangles?: number;
    /** `triangles` over the drawn views' pixels. */
    trianglesPerPixel?: number;
    /**
     * What the frame submitted by kind, before GPU culling: draw items,
     * whole triangles, points and line segments. Kinds in a stable order.
     */
    geometry?: Array<{
      kind: string;
      draws: number;
      triangles: number;
      points: number;
      segments: number;
    }>;
    /** Rays cast since the frame before (height queries, clamping, queries). */
    raysCast?: number;
    /**
     * What occlusion culling left undrawn (draw items, whole triangles), a
     * tick or two late; absent when no view culls by occlusion.
     */
    hiddenByOcclusion?: { draws: number; triangles: number };
    /** Inside the frame's markers, not covered by a timed pass, ms. */
    gpuInFrameUntimedMs?: number;
    /** Previous frame's last marker to this one's first, ms; absent when the GPU idled. */
    gpuBetweenFramesMs?: number;
    /** CPU-side GPU work since the frame before (queue writes, copies, submits, resources created). */
    work?: {
      uploadCalls: number;
      uploadBytes: number;
      textureCalls: number;
      textureBytes: number;
      submits: number;
      copyCalls: number;
      copyBytes: number;
      createdCount: number;
      createdBytes: number;
      mapCalls: number;
      /** Largest first: label, bytes, calls. */
      uploadBy: Array<[string, number, number]>;
      createdBy: Array<[string, number, number]>;
    };
    /** Submit to done, ms: latency, including waits behind earlier frames. */
    gpuWallMs?: number;
    /**
     * Time between frames finishing while the GPU was busy back to back,
     * ms; absent when it idled. What a frame costs, untimed work included.
     */
    gpuIntervalMs?: number;
    /** Where `gpuMs` goes: GPU time per pass, ms, in the frame's order. */
    gpuPasses?: Array<[string, number]>;
    /** Time between frames, ms. */
    intervalMs?: number;
    /** "continuous" or "on demand". */
    rendering?: string;
    /**
     * The job system (plan §13.43): the apply phase's time and jobs applied
     * in the latest tick, and the jobs queued, running and waiting to apply.
     */
    jobs?: {
      /** "shared memory" with cross-origin isolation, else "transfer". */
      memory: string;
      /** Progressive jobs taking slices of the apply phase. */
      slicing: number;
      applyMs: number;
      applied: number;
      queued: number;
      running: number;
      waiting: number;
    };
    /** Frames rendered so far (the inspector derives frames per second). */
    framesRendered?: number;
  };
  tiles?: {
    drawn: number;
    /** Drawn per view, when there are several ("main", "inset"...). */
    perView?: Array<[string, number]>;
    /** Tiles the engine knows of (loaded headers). */
    known?: number;
    /** Tiles whose content can't be drawn (the problems say why). */
    undrawn?: number;
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
     * Requests since loading began by what they were for, in a fixed order
     * (base, intermediate, view, prefetch, height samples): started, bytes
     * received, loads a view drew, loads evicted undrawn, cancelled.
     */
    purposes?: Array<{
      label: string;
      requests: number;
      bytes: number;
      drawn: number;
      unused?: number;
      cancelled?: number;
    }>;
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
    /**
     * The device's limits tier ("base", "minimum", "adapter") and the
     * limits it was created with that shape the engine (plan §13.15).
     */
    limits?: {
      tier: string;
      storageBuffersPerStage: number;
      sampledTexturesPerStage: number;
      bindGroups: number;
      storageBindingBytes: number;
      bufferBytes: number;
      textureArrayLayers: number;
    };
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

/** Records an engine's ticks to a file (development only, `recorder.ts`). */
export interface Recordable {
  readonly active: boolean;
  start(): void;
  stop(): void;
  /** Saves the view's image at the next tick that renders. */
  captureNext(): void;
  /** Rows and images written, the file's name, and the server's error if any. */
  status(): { rows: number; frames: number; file?: string; error?: string };
}

/**
 * One event of an engine's per-tick feed (`Inspectable.ticks`): a tick of
 * the loop, or, a few ticks later, the GPU time of the render of an earlier one.
 */
export type TickEvent =
  | {
      kind: "tick";
      /** `FrameStats.tick`. */
      tick: number;
      /** Whether the tick rendered. */
      rendering: boolean;
      /** Why it ran (`TICK_REASONS`). */
      why: readonly string[];
      /** Main-thread time of its render, ms, unsmoothed. */
      cpuMs: number;
    }
  | {
      kind: "gpu";
      /** The tick whose render this measured. */
      tick: number;
      ms: number;
      /** GPU time per pass, ms, in the frame's order. */
      passes: Array<[string, number]>;
      /** NaN when the GPU idled. */
      intervalMs: number;
      inFrameUntimedMs: number;
      betweenFramesMs: number;
    };

/** An engine (or one view of it) the inspector can show. */
export interface Inspectable {
  /** Shown in the header ("2.0 · main", "1.146.0"). */
  readonly name: string;
  /** A swatch color for the header (CSS color), e.g. a pane's. */
  readonly color?: string;
  snapshot(): InspectorSnapshot;
  /**
   * Calls `listener` for each tick of the engine's loop and each GPU result
   * (the inspector reads the last 300 ticks one by one when a chart is
   * frozen or pinned); returns the remover. Absent: the charts read 4 Hz.
   */
  ticks?(listener: (event: TickEvent) => void): () => void;
  /** Present in development builds of 2.0: the inspector's Record toggle. */
  readonly record?: Recordable;
}
