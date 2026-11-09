import { runBulk, type BulkOptions } from "../core/bulk.ts";
import { Instant } from "../time/Instant.ts";
import { frameTransform, type Frame } from "./Frame.ts";
import type { FramePoint } from "./local.ts";
import { PiecewiseFrame } from "./piecewise.ts";
import {
  pointAccuracy,
  type PointAccuracy,
  type PointAccuracyOptions,
} from "./pointAccuracy.ts";

const MAX_SAMPLES = 1_000_000;

/** A frame's origin along a span (`samplePath`). TDB seconds; metres in `inFrame`. */
export interface PathSamples {
  readonly tdb: Float64Array;
  /** x, y, z of each sample in `tdb`, metres in `inFrame`. */
  readonly positions: Float64Array;
  /** Runs of time, marking where a simulated piece of a piecewise reference frame is in use. */
  readonly spans: readonly {
    readonly start: number;
    readonly end: number;
    readonly simulated: boolean;
  }[];
  /** Runs of samples that could not be taken, and the first one's message. */
  readonly gaps: readonly {
    readonly start: number;
    readonly end: number;
    readonly reason: string;
  }[];
}

function instants(
  caller: string,
  start: Instant,
  stop: Instant,
  step: number,
  extra: readonly number[] = [],
): Instant[] {
  const from = start.tdb();
  const length = stop.tdb() - from;
  if (!(Number.isFinite(from) && Number.isFinite(length))) {
    throw new Error(`${caller}: start and stop must be finite instants`);
  }
  if (!(Number.isFinite(step) && step > 0)) {
    throw new Error(
      `${caller}: step must be a finite positive number of seconds, got ${step}`,
    );
  }
  if (length < 0) {
    throw new Error(`${caller}: stop is before start`);
  }
  const count = Math.floor(length / step + 1e-9) + 1;
  if (count > MAX_SAMPLES) {
    throw new Error(
      `${caller}: ${count} samples exceeds the limit of ${MAX_SAMPLES}; use a longer step`,
    );
  }
  const times = new Set<number>();
  for (let i = 0; i < count; i++) {
    times.add(i === 0 ? from : from + i * step);
  }
  for (const t of extra) {
    if (t >= from && t <= from + length) {
      times.add(t);
    }
  }
  return [...times]
    .sort((a, b) => a - b)
    .map((t) => (t === from ? start : Instant.fromTdb(t)));
}

/** The piecewise reference frames on `frame`'s way up. */
function piecewiseAbove(frame: Frame): PiecewiseFrame[] {
  const out: PiecewiseFrame[] = [];
  for (let f: Frame | undefined = frame; f; f = f.parent) {
    if (f instanceof PiecewiseFrame) {
      out.push(f);
    }
  }
  return out;
}

/**
 * `frame`'s origin in `inFrame` every `step` TDB seconds from `start` to
 * `stop`, plus each piecewise change inside the span (so a change shows as
 * an instant). A sample that throws becomes a gap with its message (a
 * `TypeError` or `ReferenceError` propagates); spans mark where a simulated
 * piece is in use. At most 1,000,000 samples. Runs in slices, with the
 * `signal` and `onProgress` of `BulkOptions`.
 */
export async function samplePath(
  frame: Frame,
  inFrame: Frame,
  start: Instant,
  stop: Instant,
  step: number,
  options: BulkOptions = {},
): Promise<PathSamples> {
  const pieces = piecewiseAbove(frame);
  const times = instants(
    "samplePath",
    start,
    stop,
    step,
    pieces.flatMap((p) => p.changes.map((c) => c.tdb())),
  );
  const m = new Float64Array(16);
  const rows = await runBulk(
    times.length,
    (i) => {
      const instant = times[i]!;
      const simulated = pieces.some(
        (p) => p.pieceAt(instant)?.simulated === true,
      );
      try {
        frameTransform(frame, inFrame, instant, m);
        return {
          tdb: instant.tdb(),
          x: m[12]!,
          y: m[13]!,
          z: m[14]!,
          simulated,
        };
      } catch (error) {
        if (error instanceof TypeError || error instanceof ReferenceError) {
          throw error;
        }
        return {
          tdb: instant.tdb(),
          simulated,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    options,
  );
  const good = rows.filter((r) => r.error === undefined);
  const tdb = new Float64Array(good.length);
  const positions = new Float64Array(good.length * 3);
  good.forEach((r, i) => {
    tdb[i] = r.tdb;
    positions[i * 3] = r.x!;
    positions[i * 3 + 1] = r.y!;
    positions[i * 3 + 2] = r.z!;
  });
  const spans: { start: number; end: number; simulated: boolean }[] = [];
  const gaps: { start: number; end: number; reason: string }[] = [];
  let previousFailed = false;
  for (const r of rows) {
    const last = spans.at(-1);
    if (last && last.simulated === r.simulated) {
      last.end = r.tdb;
    } else {
      spans.push({ start: r.tdb, end: r.tdb, simulated: r.simulated });
    }
    if (r.error !== undefined) {
      const gap = gaps.at(-1);
      if (previousFailed && gap) {
        gap.end = r.tdb;
      } else {
        gaps.push({ start: r.tdb, end: r.tdb, reason: r.error });
      }
    }
    previousFailed = r.error !== undefined;
  }
  return { tdb, positions, spans, gaps };
}

/**
 * `pointAccuracy` of `point` into `to` every `step` TDB seconds from `start`
 * to `stop`: a sample that throws records its message. Runs in slices, with
 * the `signal` and `onProgress` of `BulkOptions`; `confidence` and
 * `routeTerms` are `pointAccuracy`'s. At most 1,000,000 samples.
 */
export function accuracySpan(
  point: FramePoint,
  to: Frame,
  start: Instant,
  stop: Instant,
  step: number,
  options: BulkOptions & PointAccuracyOptions = {},
): Promise<{ instant: Instant; accuracy?: PointAccuracy; error?: string }[]> {
  let times: Instant[];
  try {
    times = instants("accuracySpan", start, stop, step);
  } catch (error) {
    return Promise.reject(error);
  }
  const { signal, onProgress, scheduler, ...accuracy } = options;
  return runBulk(
    times.length,
    (i) => {
      const instant = times[i]!;
      try {
        return {
          instant,
          accuracy: pointAccuracy(point, to, instant, accuracy),
        };
      } catch (error) {
        if (error instanceof TypeError || error instanceof ReferenceError) {
          throw error;
        }
        return {
          instant,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      ...(signal && { signal }),
      ...(onProgress && { onProgress }),
      ...(scheduler && { scheduler }),
    },
  );
}
