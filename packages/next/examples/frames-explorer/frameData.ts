// The frame data on the main thread (R13: the triads follow the clock every
// frame): the `Frames` of the Viewer's catalog (`viewer.frames.tree()`, plan
// 5a's call 45), so the sky, the rig and the triads share one tree, with the
// frames store's manifest for the report. Its progress is the catalog's
// `progress` events, shown as the loading model's "frame data" (the worker's
// own fetch shows only when it fails).
import type { Frames } from "../../src/frames/frames.ts";
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
  viewer: Pick<Viewer, "frames" | "setFrameData">;
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
  /**
   * A catalog's failed load stays failed: a reload asks a new one
   * (`setFrameData(undefined)`; it reads the same store, and `tree()` brings
   * its reference frames, the sky's among them, to "precise").
   */
  let failedBefore = false;

  async function load(): Promise<void> {
    loading.apply("frames", { type: "fetching" });
    const start = performance.now();
    const bytes = new Map<
      string,
      { received: number; total: number | undefined }
    >();
    if (failedBefore) {
      viewer.setFrameData(undefined);
      failedBefore = false;
    }
    const off = viewer.frames.events.on("progress", (p) => {
      bytes.set(p.item, { received: p.received, total: p.total });
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
    try {
      const manifestResponse = fetch(`${DATA}manifest.json`, { signal })
        .then((r) => (r.ok ? r.json() : undefined))
        .catch(() => undefined);
      const tree = await viewer.frames.tree();
      manifest = (await manifestResponse) as Manifest | undefined;
      if (signal.aborted) {
        return;
      }
      frames = tree;
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
      failedBefore = true;
      deps.failed(message);
      return;
    } finally {
      off();
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
