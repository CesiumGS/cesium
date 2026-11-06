// The frame data on the main thread (R13: the triads follow the clock every
// frame): DE440, the Earth orientation and the leap seconds, with the
// frames store's manifest for the report. Its progress is the loading
// model's "frame data" (the worker's own fetch shows only when it fails).
import { loadFrameData } from "../../src/ephemeris/loadFrameData.ts";
import { createFrames, type Frames } from "../../src/frames/frames.ts";
import type { Viewer } from "../../widgets/index.ts";
import type { LoadingModel } from "./loading.ts";
import { messageOf } from "./page.ts";

const DATA = "/frames-data/";

/** The frames store's manifest: its span and files (the report's environment). */
export interface Manifest {
  span?: readonly number[];
  files: readonly {
    file: string;
    role?: string;
    sha256: string;
    sourceUrl?: string;
  }[];
}

export interface FrameData {
  frames(): Frames | undefined;
  manifest(): Manifest | undefined;
  /** Loads (or, after a failure, reloads) the frame data. */
  load(): Promise<void>;
  dispose(): void;
}

export function createFrameData(deps: {
  viewer: Viewer;
  loading: LoadingModel;
  signal: AbortSignal;
  /** The frame data is in. */
  ready(): void;
  /** It didn't load: why. */
  failed(message: string): void;
}): FrameData {
  const { viewer, loading, signal } = deps;
  let frames: Frames | undefined;
  let manifest: Manifest | undefined;

  async function load(): Promise<void> {
    loading.apply("frames", { type: "fetching" });
    const start = performance.now();
    const bytes = new Map<
      string,
      { received: number; total: number | undefined }
    >();
    try {
      const manifestResponse = fetch(`${DATA}manifest.json`, { signal })
        .then((r) => (r.ok ? r.json() : undefined))
        .catch(() => undefined);
      const data = await loadFrameData(DATA, (file, received, total) => {
        bytes.set(file, { received, total });
        let sum = 0;
        let size = 0;
        let known = true;
        for (const b of bytes.values()) {
          sum += b.received;
          size += b.total ?? 0;
          known &&= b.total !== undefined;
        }
        loading.apply("frames", {
          type: "progress",
          received: sum,
          ...(known && { total: size }),
        });
      });
      manifest = (await manifestResponse) as Manifest | undefined;
      if (signal.aborted) {
        return;
      }
      frames = createFrames(data);
      // The sky's Moon and Sun from the same DE440 the frames use: the
      // analytic Moon is about 400 km off, which put the imagery's pole
      // 400 km from the lunar site's triad (lunar-pole-investigation.md).
      // Not undone on leave: the sky's data is the Viewer's, and the Viewer
      // goes with the example.
      viewer.setFrameData(data);
      const sum = [...bytes.values()].reduce((a, b) => a + b.received, 0);
      loading.apply("frames", {
        type: "ready",
        bytes: sum,
        ms: performance.now() - start,
      });
    } catch (error) {
      if (signal.aborted) {
        return;
      }
      const message = messageOf(error);
      loading.apply("frames", {
        type: /setup|404|not served|manifest/i.test(message)
          ? "missing"
          : "error",
        detail: message,
      });
      deps.failed(message);
      return;
    }
    deps.ready();
  }

  return {
    frames: () => frames,
    manifest: () => manifest,
    load,
    dispose: () => {},
  };
}
