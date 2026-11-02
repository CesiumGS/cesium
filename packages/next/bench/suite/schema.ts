/**
 * Benchmark suite schema (plan §16): datasets, scenes and scenarios, as
 * the catalogs (`catalog/public.json`, private manifests outside the repo)
 * write them, and the results a run produces. Engine-neutral: the same
 * scene and scenario run on every engine adapter.
 */

/** Where a dataset comes from. */
export type DatasetSource =
  /**
   * Cesium ion; `token`: 1.x's public default token (Sandcastle assets) or
   * the environment's. `google`: Google's tiles, which ion serves with a
   * key every account shares; with VITE_GOOGLE_MAPS_KEY set, the run uses
   * that key instead (its own quota).
   */
  | {
      kind: "ion";
      asset: number;
      token?: "default" | "env";
      google?: boolean;
    }
  /** Served from this repository's Specs data (`/specs-data/...`). */
  | { kind: "specs"; path: string }
  /** A URL (public data, or a private share). */
  | { kind: "url"; url: string }
  /** Produced in the page by a deterministic generator. */
  | { kind: "generator"; generator: string; params: Record<string, number> };

/**
 * License review of a dataset (plan §16.2). The public catalog may hold
 * only "redistributable" (compatible with CesiumJS's Apache-2.0 license:
 * public domain, CC0, CC BY, Apache, MIT...) and "stream-only" (referenced,
 * never copied, under the provider's terms). A private manifest may hold
 * only data cleared for commercial use at Bentley: "commercial-ok", or
 * "redistributable", or "stream-only" through Bentley's own account
 * (token "env"). Anything else, including non-commercial licenses, is
 * refused by the loader.
 */
export interface DatasetLicense {
  /** License name as published (e.g. "CC BY 4.0"), or the terms used. */
  name: string;
  status: "redistributable" | "stream-only" | "commercial-ok";
  /** Where the license was checked (URL or document), and notes. */
  source?: string;
  notes?: string;
}

export interface Dataset {
  id: string;
  /** Shown in reports instead of `id` (private datasets: an alias only). */
  title: string;
  kind: "3dtiles" | "terrain" | "imagery" | "gltf";
  source: DatasetSource;
  /** Content formats, for engine support checks ("b3dm", "pnts", ...). */
  formats?: string[];
  /** Required: reviewed before a dataset enters a catalog. */
  license: DatasetLicense;
  /** Approximate size, bytes (informational). */
  bytes?: number;
  /** Checksum of the files (store.mjs), for local and mirrored datasets. */
  sha256?: string;
  /** Mirroring allowed by the license and terms (else streamed live). */
  mirror?: boolean;
  /** Private manifest only: never printed by name in shared reports. */
  private?: boolean;
}

/** A camera pose: Earth-fixed position (float64), look direction and up. */
export interface Pose {
  position: [number, number, number];
  direction: [number, number, number];
  up: [number, number, number];
}

/** How the camera moves during a scenario's motion phase. */
export type CameraScript =
  /**
   * Orbit a target (degrees, meters) at a range and pitch, heading swept
   * through `sweep` degrees; `target: "frame"` uses the first tileset's
   * root bounding sphere, with `range` in sphere radii.
   */
  | {
      kind: "orbit";
      target: [number, number, number] | "frame";
      range: number;
      pitch: number;
      heading?: number;
      sweep?: number;
    }
  /** Recorded poses, interpolated over the motion phase. */
  | { kind: "path"; poses: Pose[] }
  /**
   * 1.x `camera.flyTo` (CameraFlightPath in 3D) from one view to another,
   * as the Viewer's geocoder does: up to a fifth of the distance and down
   * again. Lasts what 1.x's flight would (at most 3 s) unless `seconds`,
   * whatever the scenario's motion time; the sun follows the camera.
   */
  | {
      kind: "flight";
      from: FlightView;
      to: FlightView;
      seconds?: number;
    };

/** A flight's end: the view of a target (degrees, meters) as an orbit's start. */
export interface FlightView {
  target: [number, number, number];
  range: number;
  pitch: number;
  heading?: number;
}

export interface SceneLayer {
  dataset: string;
  /** 1.x `enableCollision`; 2.0 `enableCollision`. */
  collision?: boolean;
  /** Generator datasets: placement (degrees, meters). */
  at?: [number, number, number];
}

export interface Scene {
  /** Image checks: points of the camera path (0..1) to capture; default [0]. */
  checks?: number[];
  /** Render settings over the catalog's (e.g. 1.x HDR off for unlit content). */
  render?: Partial<RenderSettings>;
  id: string;
  title: string;
  /** Catalog group (plan §16.4): A classic Cesium, B large public, C 2.0's architecture. */
  group: "A" | "B" | "C";
  description?: string;
  /** The globe: none, the ellipsoid, or terrain from a dataset. */
  globe: "none" | "ellipsoid" | { terrain: string };
  /** Imagery on the globe (a dataset id), if any. */
  imagery?: string;
  layers: SceneLayer[];
  camera: CameraScript;
  /** Canvas size in CSS pixels (pixel ratio 1). */
  width?: number;
  height?: number;
}

export interface Scenario {
  id: string;
  title: string;
  /** Seconds of camera motion after the initial load settles. */
  motionSeconds: number;
  /** Seconds to wait for the initial view to settle before giving up. */
  settleTimeoutSeconds: number;
  /** "cold": fresh browser context; "warm": the same scene loaded again in the same page. */
  cache: "cold" | "warm";
  /**
   * false: no vsync or frame-rate limit (Chromium flags), so frame time
   * measures the frame's cost instead of the display's refresh.
   */
  vsync?: boolean;
}

/**
 * An engine with its settings. In the catalog, a setup ("1.x", "2.0",
 * "2.0+stepwise"); in a run, resolved from an engine spec (engines.mjs)
 * with its build: `id` names both ("1.146.0", "2.0@main+stepwise").
 */
export interface EngineConfig {
  id: string;
  engine: "1.x" | "2.0";
  /** The catalog setup it runs (runs only). */
  setup?: string;
  /** Where the build came from (runs only). */
  source?:
    | { kind: "release"; version: string; integrity?: string }
    | { kind: "tree"; ref: string }
    | { kind: "ref"; ref: string; sha: string };
  /**
   * How the suite page loads it (runs only): the 1.x build ("1.146.0",
   * "ref:<sha>"; none: the working tree's) and the dev server of a 2.0
   * built at another ref.
   */
  page?: { cesium?: string; server?: string };
  /** 2.0 selection policy. */
  policy?: "budgeted" | "stepwise";
  maximumScreenSpaceError?: number;
  /** Render settings over the catalog's (e.g. 1.x out of the box). */
  render?: Partial<RenderSettings>;
}

/**
 * How a frame is rendered, the same for every engine in a comparison
 * (apples to apples): the catalog declares them, configurations may
 * override them, and each run records what the engine actually used.
 */
export interface RenderSettings {
  /**
   * Drawing-buffer pixels per CSS pixel: a number (1: CSS resolution,
   * 1.x's default on high-DPI displays) or "device" (devicePixelRatio).
   */
  pixelRatio: number | "device";
  msaaSamples: number;
  /** HDR rendering with tone mapping (2.0 always; 1.x `highDynamicRange`). */
  hdr: boolean;
  fxaa: boolean;
  /** 1.x fog (also lowers distant detail); 2.0 has none yet. */
  fog: boolean;
  /**
   * `CESIUM_primitive_outline` edges (e.g. OSM Buildings; 1.x
   * `showOutline`); 2.0 doesn't draw them yet.
   */
  outlines: boolean;
  /**
   * The sun, fixed (1.x otherwise follows the wall clock): elevation and
   * azimuth in degrees over the point below the camera at the start of
   * the camera path, a directional light in both engines (the parity
   * harness's convention).
   */
  sun: { elevation: number; azimuth: number };
}

/** The render settings an engine actually used, read back after a run. */
export interface EffectiveRender {
  width: number;
  height: number;
  pixelRatio: number;
  msaaSamples: number;
  hdr: boolean;
  fxaa: boolean;
  fog: boolean;
  outlines: boolean;
}

/**
 * A budget (plan §16.9, Communicate; Lighthouse budgets): a limit on a
 * metric for a configuration, absolute (`max`, in the metric's raw unit)
 * or relative to the run's baseline (`maxRatio`), for every scene or the
 * listed ones, optionally one scenario.
 */
export interface Budget {
  id: string;
  metric: string;
  /** The setup it applies to ("2.0": every build of 2.0's setup). */
  setup: string;
  max?: number;
  maxRatio?: number;
  scenes?: string[];
  scenario?: string;
  label: string;
}

/** What one run of a scene × scenario × config measured. */
export interface RunMetrics {
  status: "ok" | "unsupported" | "timeout" | "error";
  /** The engine build that ran (1.x: Cesium.VERSION). */
  engineVersion?: string;
  message?: string;
  /** The motion's length when the camera script sets it (flights), s. */
  motionSeconds?: number;
  /** When the motion started and ended, ms from load start (waterfall phases). */
  motionMs?: [number, number];
  /** Load start to the first frame with content drawn, ms. */
  firstContentMs?: number;
  /** Load start until the initial view settled (nothing loading), ms. */
  settleMs?: number;
  /** During motion: frame intervals (requestAnimationFrame), ms. */
  frameP50?: number;
  frameP95?: number;
  frameP99?: number;
  /** Frames over 2 and 3 vsyncs at 60 Hz, and over 100 ms (hitches). */
  over33?: number;
  over50?: number;
  over100?: number;
  /** 99.9th percentile frame interval and the intervals' spread, ms. */
  frameP999?: number;
  frameStdDev?: number;
  /** What the engine rendered with (drawing buffer, MSAA, HDR...). */
  render?: EffectiveRender;
  /** Every motion frame interval, ms (percentile curves). */
  intervals?: number[];
  /**
   * The camera path during motion: [progress 0..1, longitude°, latitude°,
   * height m] at 50 points (track maps).
   */
  path?: Array<[number, number, number, number]>;
  frames?: number;
  /** Main-thread time inside the engine's frame call, ms (median, p95). */
  cpuP50?: number;
  cpuP95?: number;
  /** GPU time per frame, ms (median), where the engine exposes it. */
  gpuP50?: number;
  /** Long animation frames (over 50 ms) and the worst blocking time, ms. */
  longFrames?: number;
  worstBlockingMs?: number;
  /** After the run: JS heap in use, bytes (Chromium). */
  heapBytes?: number;
  /**
   * Each content request's URL and purpose (2.0: base, intermediate, view,
   * prefetch, sample). The CLI tags the waterfall with them and drops
   * these.
   */
  purposes?: Array<[string, string]>;
  /**
   * After the run (2.0): requests by purpose with their bytes, loads drawn,
   * loads evicted undrawn and cancellations (the inspector's numbers).
   */
  purposeStats?: Array<{
    label: string;
    requests: number;
    bytes: number;
    drawn: number;
    unused?: number;
    cancelled?: number;
  }>;
  /** Requests and bytes received during the whole run. */
  requests?: number;
  bytes?: number;
  /** Time to settle again after motion stops, ms. */
  resettleMs?: number;
  /**
   * Per-frame series for charts (downsampled to at most 1,000 points,
   * keeping each bucket's worst frame): seconds since the phase began,
   * frame interval ms, CPU ms in the engine, GPU ms (2.0).
   */
  series?: {
    load: Array<[number, number, number]>;
    motion: Array<[number, number, number, number | null]>;
  };
}
