/**
 * Benchmark suite schema (plan §16): datasets, scenes and scenarios, as
 * the catalogs (`catalog/public.json`, private manifests outside the repo)
 * write them, and the results a run produces. Engine-neutral: the same
 * scene and scenario run on every engine adapter.
 */

/** Where a dataset comes from. */
export type DatasetSource =
  /** Cesium ion; `token`: 1.x's public default token (Sandcastle assets) or the environment's. */
  | { kind: "ion"; asset: number; token?: "default" | "env" }
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
  | { kind: "path"; poses: Pose[] };

export interface SceneLayer {
  dataset: string;
  /** 1.x `enableCollision`; 2.0 `enableCollision`. */
  collision?: boolean;
  /** Generator datasets: placement (degrees, meters). */
  at?: [number, number, number];
}

export interface Scene {
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
}

/** An engine and its settings. */
export interface EngineConfig {
  id: string;
  engine: "1.x" | "2.0";
  /** 2.0 selection policy. */
  policy?: "budgeted" | "legacy1x";
  maximumScreenSpaceError?: number;
}

/** What one run of a scene × scenario × config measured. */
export interface RunMetrics {
  status: "ok" | "unsupported" | "timeout" | "error";
  message?: string;
  /** Load start to the first frame with content drawn, ms. */
  firstContentMs?: number;
  /** Load start until the initial view settled (nothing loading), ms. */
  settleMs?: number;
  /** During motion: frame intervals (requestAnimationFrame), ms. */
  frameP50?: number;
  frameP95?: number;
  frameP99?: number;
  /** Frames over 2 and 3 vsyncs at 60 Hz. */
  over33?: number;
  over50?: number;
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
  /** Requests and bytes received during the whole run. */
  requests?: number;
  bytes?: number;
  /** Time to settle again after motion stops, ms. */
  resettleMs?: number;
}
