/**
 * Dev only: records an engine's tick-by-tick numbers as CSV rows
 * (`recorderRows.ts`) and posts them in batches to the dev server's
 * `/__record` (`scripts/vitePluginRecord.ts`), which appends them to a file
 * a coding agent can `tail`. Optionally saves the view's final image as a
 * PNG beside it (`frames`). Off, none of this runs: `startRecording` is
 * only imported when a page asks (`record` in the URL, or the inspector's
 * toggle), and only in development (`import.meta.env.DEV`).
 */
import { TICK_REASONS, type Engine } from "@cesium/next";
import type { EngineSnapshotOptions } from "./engine.ts";
import {
  RECORD_HEADER_NAME,
  RowBuffer,
  gpuRow,
  parseFrames,
  tickRow,
  type TickSample,
} from "./recorderRows.ts";

/** How often rows are posted, ms. */
const FLUSH_MS = 500;

export interface RecorderStatus {
  active: boolean;
  /** Rows written so far. */
  rows: number;
  /** Images saved so far. */
  frames: number;
  /** The CSV's name, once the server has made it. */
  file?: string;
  /** The server refused or couldn't be reached. */
  error?: string;
}

export interface Recording {
  start(): void;
  stop(): void;
  /** Saves the image of the next tick that renders. */
  captureNext(): void;
  status(): RecorderStatus;
}

export interface RecorderOptions {
  /** Which ticks save an image (`every:10`, `at:120,240`); see `parseFrames`. */
  frames?: string | undefined;
}

export function createRecorder(
  engine: Engine,
  options: EngineSnapshotOptions,
  recorderOptions: RecorderOptions = {},
): Recording {
  const page = Math.random().toString(36).slice(2, 8);
  const wantFrame = parseFrames(recorderOptions.frames);
  const buffer = new RowBuffer();
  const status: RecorderStatus = { active: false, rows: 0, frames: 0 };
  let t0 = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let remove: (() => void) | undefined;
  let framesRendered = 0;
  let gpuSamples = 0;
  let captureNext = false;
  let scratch: HTMLCanvasElement | undefined;
  /** Cumulative occlusion counts at the last row. */
  let occQueries = 0;
  let occFlips = 0;
  /** Posts are chained so the server sees the first one first (it makes the file). */
  let posting: Promise<unknown> = Promise.resolve();

  const post = (url: string, body: BodyInit, type: string) => {
    posting = posting.then(async () => {
      try {
        const r = await fetch(url, {
          method: "POST",
          body,
          // The custom header makes a cross-origin POST need a preflight,
          // which the dev server never grants (vitePluginRecord.ts).
          headers: { "Content-Type": type, [RECORD_HEADER_NAME]: "1" },
        });
        if (!r.ok) {
          status.error = `${r.status} ${await r.text()}`;
        } else {
          status.file ??= r.headers.get("X-Record-File") ?? undefined;
        }
      } catch (e) {
        status.error = String(e);
      }
    });
  };
  const flush = () => {
    const body = buffer.take();
    if (body) {
      post(`/__record?page=${page}`, body, "text/plain");
    }
  };

  const canvas = (): HTMLCanvasElement | undefined => {
    if (options.canvas) {
      return options.canvas;
    }
    for (const view of engine.views) {
      const c = (view.target as { canvas?: unknown }).canvas;
      if (
        typeof HTMLCanvasElement !== "undefined" &&
        c instanceof HTMLCanvasElement
      ) {
        return c;
      }
    }
    return undefined;
  };

  /**
   * The canvas image is valid until the task ends: copied now, encoded
   * after, and posted under the tick it shows.
   */
  const saveFrame = (tick: number): boolean => {
    const source = canvas();
    if (!source || source.width === 0 || source.height === 0) {
      return false;
    }
    scratch ??= document.createElement("canvas");
    scratch.width = source.width;
    scratch.height = source.height;
    const ctx = scratch.getContext("2d");
    if (!ctx) {
      return false;
    }
    ctx.drawImage(source, 0, 0);
    const copy = scratch;
    scratch = undefined; // the next frame gets its own while this one encodes
    copy.toBlob((blob) => {
      if (blob) {
        flush(); // the file exists before its images
        post(`/__record/frame?page=${page}&tick=${tick}`, blob, "image/png");
        status.frames++;
      }
    }, "image/png");
    return true;
  };

  const onTick = (now: number): void => {
    const s = engine.stats;
    const tilesets = options.tilesets();
    const sum = (f: (t: (typeof tilesets)[number]) => number) =>
      tilesets.reduce((n, t) => n + f(t), 0);
    const rendering = s.framesRendered !== framesRendered;
    framesRendered = s.framesRendered;

    const { queries, flips, hidden } = engine.occlusionStats;
    const frame =
      rendering &&
      (captureNext || (wantFrame?.(s.tick) ?? false)) &&
      saveFrame(s.tick);
    if (frame) {
      captureNext = false;
    }
    const sample: TickSample = {
      t: now - t0,
      tick: s.tick,
      rendering,
      why: TICK_REASONS.filter((_, i) => (s.tickReasons & (1 << i)) !== 0),
      cpuMs: s.lastCpuMs,
      views: s.views,
      triangles: s.triangles,
      ...(s.work ? { work: s.work } : {}),
      draws: totals(s.geometry, "draws"),
      points: totals(s.geometry, "points"),
      occQueries: queries - occQueries,
      occHidden: hidden,
      occFlips: flips - occFlips,
      frame,
      jobs: { ...s.jobs },
    };
    occQueries = queries;
    occFlips = flips;
    if (tilesets.length > 0) {
      sample.drawn = sum((t) =>
        [...t.stats.selected.values()].reduce((a, b) => a + b, 0),
      );
      sample.known = sum((t) => t.stats.tiles);
      sample.inFlight = sum((t) => t.stats.inFlight);
      sample.uploadQueue = sum((t) => t.stats.uploadQueue);
      sample.requests = sum((t) => t.stats.requestsTotal);
      sample.bytesReceived = sum((t) => t.stats.bytesReceived);
      sample.cancelled = sum((t) => t.stats.cancelled);
      sample.evicted = sum((t) =>
        Object.values(t.stats.purposes).reduce((n, p) => n + p.unused, 0),
      );
      sample.cacheBytes = sum((t) => t.stats.bytes);
      sample.maxSse = Math.max(
        ...tilesets.map((t) => t.selection.maximumScreenSpaceError),
      );
    }
    buffer.push(tickRow(sample));
    status.rows++;

    // A measured render's GPU time, filed under the tick that drew it.
    const gpu = engine.gpuSample;
    if (gpu.samples !== gpuSamples) {
      gpuSamples = gpu.samples;
      buffer.push(
        gpuRow(
          now - t0,
          gpu.tick,
          gpu.ms,
          gpu.passes,
          gpu.spanMs,
          gpu.wallMs,
          gpu.intervalMs,
          gpu.inFrameUntimedMs,
          gpu.betweenFramesMs,
          gpu.markerSpanMs,
        ),
      );
      status.rows++;
    }
  };

  return {
    start() {
      if (status.active) {
        return;
      }
      status.active = true;
      delete status.error;
      t0 = performance.now();
      framesRendered = engine.stats.framesRendered;
      gpuSamples = engine.gpuSample.samples;
      engine.trackGpuWork();
      remove = engine.onAfterTick(onTick);
      timer = setInterval(flush, FLUSH_MS);
    },
    stop() {
      if (!status.active) {
        return;
      }
      status.active = false;
      remove?.();
      clearInterval(timer);
      flush();
    },
    captureNext() {
      captureNext = true;
      engine.requestRender();
    },
    status: () => ({ ...status }),
  };
}

/** A field summed over the kinds of `FrameStats.geometry`. */
function totals(
  geometry: Record<string, { draws: number; points: number }>,
  field: "draws" | "points",
): number {
  return Object.values(geometry).reduce((sum, k) => sum + k[field], 0);
}
