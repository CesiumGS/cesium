/**
 * The inspector's numbers as CSV rows, one per engine tick (the recorder,
 * `recorder.ts`). Pure: no engine, no DOM, so a test and the dev server's
 * endpoint (`scripts/vitePluginRecord.ts`) share it.
 *
 * Two row kinds share one header, so the file stays one table a script can
 * read. A `tick` row is a tick of the loop: why it ran and what the engine
 * held after it. A `gpu` row is a measured render's GPU time, which arrives
 * a few ticks late through a readback: it carries the number of the tick it
 * belongs to, not the tick it arrived in. Cells that don't apply stay empty.
 */

import { untimedMs } from "./gpuGroups.ts";

/** The columns, in order. */
export const RECORD_COLUMNS = [
  "kind", // "tick" or "gpu"
  "t_ms", // ms since recording began
  "tick", // the engine's tick index (the loop's, from 1)
  "state", // tick: "rendering" or "idle"
  "why", // tick: the reasons it ran, joined by "+" (TICK_REASONS)
  "cpu_ms", // tick: main-thread time of its render, unsmoothed
  "gpu_ms", // gpu: the render's GPU time, passes overlapping counted once
  "gpu_span_ms", // gpu: first timed pass's start to last one's end
  "gpu_wall_ms", // gpu: latency, submit to done on the CPU clock (waits behind earlier frames included)
  "gpu_interval_ms", // gpu: since the previous frame finished, only when the GPU was busy back to back
  "gpu_untimed_ms", // gpu: gpu_interval_ms less gpu_ms: work no timestamp covers
  "gpu_in_frame_untimed_ms", // gpu: inside the frame's markers, not covered by a timed pass (copies, clears, work between passes)
  "gpu_marker_span_ms", // gpu: first marker to last, the frame encoder as the GPU ran it
  "gpu_between_frames_ms", // gpu: previous frame's last marker to this one's first, GPU busy back to back only
  "upload_bytes", // tick: queue.writeBuffer bytes since the render before
  "upload_calls", // tick: queue.writeBuffer calls
  "texture_bytes", // tick: queue.writeTexture bytes
  "submits", // tick: queue.submit calls
  "copy_bytes", // tick: bytes copied by encoder copies (textures estimated)
  "copy_calls", // tick: encoder copy calls
  "created_bytes", // tick: bytes of buffers and textures created (textures estimated)
  "created_count", // tick: buffers and textures created
  "map_calls", // tick: mapAsync calls
  "upload_by", // tick: largest writeBuffer targets, as "label=bytes"
  "created_by", // tick: largest resources created, as "label=bytes"
  "views", // views drawn
  "drawn", // tiles drawn
  "known", // tiles the engine knows of
  "in_flight", // content requests in flight
  "upload_queue", // decoded content waiting for an upload slot
  "requests", // content requests started, cumulative
  "bytes_received", // content bytes received, cumulative
  "canceled", // requests canceled, cumulative
  "evicted", // loads evicted undrawn, cumulative
  "cache_mb", // tile content held, MB
  "max_sse", // the coarsest screen-space error threshold, px
  "occ_queries", // occlusion boxes answered since the last row
  "occ_hidden", // boxes the latest occlusion result found hidden
  "occ_flips", // occlusion verdicts changed since the last row
  "passes", // gpu: each pass's ms, as "name=ms name=ms"
  "triangles", // tick: whole triangles submitted by the render, before GPU culling
  "draws", // tick: draw items submitted (instances counted each)
  "points", // tick: points submitted (point sets: their capacity)
  "occ_culled_draws", // tick: draw items occlusion culling left undrawn (the latest readout, a tick or two late)
  "occ_culled_triangles", // tick: their whole triangles
  "frame", // tick: 1 when the view's image was saved as frame-<tick>.png
  "jobs_apply_ms", // tick: the jobs' apply phase's time (Engine.jobBudgetMs)
  "jobs_applied", // tick: jobs the apply phase applied
  "jobs_waiting", // tick: finished jobs waiting for the apply phase after it
  "jobs_queued", // tick: jobs waiting for other jobs or for a worker
  "jobs_running", // tick: jobs on a worker
] as const;

export type RecordColumn = (typeof RECORD_COLUMNS)[number];

/** The header line, without its newline. */
export const RECORD_HEADER = RECORD_COLUMNS.join(",");

/**
 * The request header every recorder POST carries. A custom header makes a
 * cross-origin request need a CORS preflight, which the dev server never
 * grants, so other sites can't write recordings.
 */
export const RECORD_HEADER_NAME = "X-Cesium-Record";

/** What one tick leaves in its row. Fields the engine can't give stay out. */
export interface TickSample {
  /** ms since recording began. */
  t: number;
  tick: number;
  rendering: boolean;
  /** Reason names (`TICK_REASONS`). */
  why: readonly string[];
  cpuMs?: number;
  views?: number;
  drawn?: number;
  known?: number;
  inFlight?: number;
  uploadQueue?: number;
  requests?: number;
  bytesReceived?: number;
  canceled?: number;
  evicted?: number;
  cacheBytes?: number;
  maxSse?: number;
  occQueries?: number;
  occHidden?: number;
  occFlips?: number;
  /** The render's GPU work counters (`Engine.trackGpuWork`). */
  work?: {
    uploadBytes: number;
    uploadCalls: number;
    textureBytes: number;
    submits: number;
    copyBytes: number;
    copyCalls: number;
    createdBytes: number;
    createdCount: number;
    mapCalls: number;
    uploadBy: ReadonlyArray<readonly [string, number, number]>;
    createdBy: ReadonlyArray<readonly [string, number, number]>;
  };
  triangles?: number;
  draws?: number;
  points?: number;
  /** Draw items and their triangles occlusion culling left undrawn (`Engine.occlusionCullStats`). */
  occCulledDraws?: number;
  occCulledTriangles?: number;
  /** The tick's image was saved. */
  frame?: boolean;
  /** The job system after the tick's apply phase (`FrameStats.jobs`). */
  jobs?: {
    applyMs: number;
    applied: number;
    waiting: number;
    queued: number;
    running: number;
  };
}

/** A number as plain text: integers as they are, else up to three decimals, never e-notation. */
export function formatNumber(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "";
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  const text = value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return text === "-0" ? "0" : text;
}

/** A name safe in a cell: letters, digits and `_ . + - =` only. */
export function safeText(text: string): string {
  return text.replace(/[^\w.+=-]/g, "_");
}

function line(cells: Partial<Record<RecordColumn, string>>): string {
  return RECORD_COLUMNS.map((c) => cells[c] ?? "").join(",");
}

/** A tick's row. */
export function tickRow(s: TickSample): string {
  return line({
    kind: "tick",
    t_ms: formatNumber(s.t),
    tick: formatNumber(s.tick),
    state: s.rendering ? "rendering" : "idle",
    why: s.why.length > 0 ? s.why.map(safeText).join("+") : "none",
    cpu_ms: formatNumber(s.rendering ? s.cpuMs : undefined),
    views: formatNumber(s.views),
    drawn: formatNumber(s.drawn),
    known: formatNumber(s.known),
    in_flight: formatNumber(s.inFlight),
    upload_queue: formatNumber(s.uploadQueue),
    requests: formatNumber(s.requests),
    bytes_received: formatNumber(s.bytesReceived),
    canceled: formatNumber(s.canceled),
    evicted: formatNumber(s.evicted),
    cache_mb: formatNumber(
      s.cacheBytes === undefined ? undefined : s.cacheBytes / 1048576,
    ),
    max_sse: formatNumber(s.maxSse),
    occ_queries: formatNumber(s.occQueries),
    occ_hidden: formatNumber(s.occHidden),
    occ_flips: formatNumber(s.occFlips),
    upload_bytes: formatNumber(s.rendering ? s.work?.uploadBytes : undefined),
    upload_calls: formatNumber(s.rendering ? s.work?.uploadCalls : undefined),
    texture_bytes: formatNumber(s.rendering ? s.work?.textureBytes : undefined),
    submits: formatNumber(s.rendering ? s.work?.submits : undefined),
    copy_bytes: formatNumber(s.rendering ? s.work?.copyBytes : undefined),
    copy_calls: formatNumber(s.rendering ? s.work?.copyCalls : undefined),
    created_bytes: formatNumber(s.rendering ? s.work?.createdBytes : undefined),
    created_count: formatNumber(s.rendering ? s.work?.createdCount : undefined),
    map_calls: formatNumber(s.rendering ? s.work?.mapCalls : undefined),
    upload_by: s.rendering && s.work ? labeled(s.work.uploadBy) : "",
    created_by: s.rendering && s.work ? labeled(s.work.createdBy) : "",
    triangles: formatNumber(s.rendering ? s.triangles : undefined),
    draws: formatNumber(s.rendering ? s.draws : undefined),
    points: formatNumber(s.rendering ? s.points : undefined),
    occ_culled_draws: formatNumber(s.rendering ? s.occCulledDraws : undefined),
    occ_culled_triangles: formatNumber(
      s.rendering ? s.occCulledTriangles : undefined,
    ),
    frame: s.frame ? "1" : "",
    jobs_apply_ms: formatNumber(s.jobs?.applyMs),
    jobs_applied: formatNumber(s.jobs?.applied),
    jobs_waiting: formatNumber(s.jobs?.waiting),
    jobs_queued: formatNumber(s.jobs?.queued),
    jobs_running: formatNumber(s.jobs?.running),
  });
}

/** Largest writers as "label=bytes label=bytes", safe in a cell. */
function labeled(by: ReadonlyArray<readonly [string, number, number]>): string {
  return by
    .map(([label, bytes]) => `${safeText(label)}=${formatNumber(bytes)}`)
    .join(" ");
}

/**
 * A render's GPU time, when it arrived: filed under `tick`, the tick that
 * rendered it, whatever the tick it arrived in. `passes` are in the order
 * the frame runs them.
 */
export function gpuRow(
  t: number,
  tick: number,
  ms: number,
  passes: Readonly<Record<string, number>>,
  spanMs: number = Number.NaN,
  wallMs: number = Number.NaN,
  intervalMs: number = Number.NaN,
  inFrameMs: number = Number.NaN,
  betweenMs: number = Number.NaN,
  markerSpanMs: number = Number.NaN,
): string {
  return line({
    kind: "gpu",
    t_ms: formatNumber(t),
    tick: formatNumber(tick),
    gpu_ms: formatNumber(ms),
    gpu_span_ms: formatNumber(spanMs),
    gpu_wall_ms: formatNumber(wallMs),
    gpu_interval_ms: formatNumber(intervalMs),
    gpu_untimed_ms: formatNumber(untimedMs(intervalMs, ms)),
    gpu_in_frame_untimed_ms: formatNumber(inFrameMs),
    gpu_marker_span_ms: formatNumber(markerSpanMs),
    gpu_between_frames_ms: formatNumber(betweenMs),
    passes: Object.entries(passes)
      .map(([name, v]) => `${safeText(name)}=${formatNumber(v)}`)
      .join(" "),
  });
}

/** Rows waiting to be sent, flushed on an interval by the recorder. */
export class RowBuffer {
  private rows: string[] = [];

  push(row: string): void {
    this.rows.push(row);
  }

  get length(): number {
    return this.rows.length;
  }

  /** The rows so far as one body (a newline after each), emptying the buffer; "" when none. */
  take(): string {
    if (this.rows.length === 0) {
      return "";
    }
    const body = `${this.rows.join("\n")}\n`;
    this.rows = [];
    return body;
  }
}

/**
 * Which ticks save the view's image: `every:10` (every tenth tick) or
 * `at:120,240` (those ticks). Undefined for anything else.
 */
export function parseFrames(
  text: string | null | undefined,
): ((tick: number) => boolean) | undefined {
  const every = /^every:(\d{1,6})$/.exec(text ?? "");
  if (every && Number(every[1]) > 0) {
    const n = Number(every[1]);
    return (tick) => tick % n === 0;
  }
  const at = /^at:(\d{1,10}(?:,\d{1,10})*)$/.exec(text ?? "");
  if (at) {
    const ticks = new Set(at[1]!.split(",").map(Number));
    return (tick) => ticks.has(tick);
  }
  return undefined;
}
