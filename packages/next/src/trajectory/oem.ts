import { Instant } from "../time/Instant.ts";
import type { LeapSeconds } from "../time/leapSeconds.ts";

/** One OEM ephemeris segment (a META block and its states). */
export interface OemSegment {
  objectName: string;
  objectId: string;
  centerName: string;
  refFrame: string;
  timeSystem: string;
  start: Instant;
  stop: Instant;
  useableStart?: Instant;
  useableStop?: Instant;
  interpolation?: "LAGRANGE" | "HERMITE" | string;
  interpolationDegree?: number;
  /** Epochs, TDB seconds past J2000. */
  epochs: Float64Array;
  /** Position (m) and velocity (m/s), 6 per epoch. */
  states: Float64Array;
  /**
   * Covariances from COVARIANCE_START..STOP, if the segment has any.
   * `epochs` are TDB seconds; `values` holds 21 numbers per epoch, the lower
   * triangle of the 6x6 matrix row by row as written, in the file's units
   * (CCSDS: km and km/s, so km² for position variances, but see
   * `covarianceUnits` on `Trajectory.fromOem`). The reference frame is the
   * segment's `refFrame`.
   */
  covariances?: { epochs: Float64Array; values: Float64Array };
}

type Scale = "UTC" | "TAI" | "TT" | "TDB";
const SCALES: ReadonlySet<string> = new Set(["UTC", "TAI", "TT", "TDB"]);
const REQUIRED = [
  "OBJECT_NAME",
  "OBJECT_ID",
  "CENTER_NAME",
  "REF_FRAME",
  "TIME_SYSTEM",
  "START_TIME",
  "STOP_TIME",
] as const;

/** A segment being read: its metadata and the states so far. */
interface Pending {
  meta: Map<string, string>;
  scale: Scale;
  start: Instant;
  stop: Instant;
  epochs: number[];
  states: number[];
  lastTt: number;
}

/**
 * Parse a CCSDS Orbit Ephemeris Message in the KVN form (CCSDS 502.0-B-3,
 * versions 1.0 to 3.0). Positions and velocities are scaled from km and km/s
 * to m and m/s, and epochs are converted from the segment's time system to
 * TDB seconds. Comments, blank lines and accelerations are skipped. Covariance blocks are kept, as written, on the segment they follow.
 * Errors name the 1-based line.
 *
 * The reader never guesses an interpolation: `interpolation` and
 * `interpolationDegree` are set only when the metadata gives them.
 */
export function parseOem(
  text: string,
  leap: LeapSeconds,
): { version: string; segments: OemSegment[] } {
  const lines = text.split("\n");
  const segments: OemSegment[] = [];
  let version: string | undefined;
  let state: "header" | "meta" | "data" | "between" | "covariance" = "header";
  let seg: Pending | undefined;
  let metaLine = 0;
  // The segment a covariance block belongs to (the one just finished), and
  // the covariance being read.
  let covTarget: { seg: OemSegment; scale: Scale } | undefined;
  let covEpochs: number[] = [];
  let covValues: number[] = [];
  let covPending = 0; // numbers still owed to the epoch being read
  let lastScale: Scale = "UTC";

  const fail = (n: number, message: string): never => {
    throw new Error(`OEM line ${n}: ${message}`);
  };
  const iso = (n: number, value: string, scale: Scale): Instant => {
    try {
      return Instant.fromIso(value, scale, leap);
    } catch (e) {
      return fail(n, (e as Error).message);
    }
  };
  const finish = (n: number): void => {
    if (seg === undefined) {
      return;
    }
    if (seg.epochs.length === 0) {
      fail(n, "segment has no states");
    }
    const meta = seg.meta;
    const useable = (key: string): Instant | undefined => {
      const v = meta.get(key);
      return v === undefined ? undefined : iso(metaLine, v, seg!.scale);
    };
    const degree = meta.get("INTERPOLATION_DEGREE");
    const out: OemSegment = {
      objectName: meta.get("OBJECT_NAME")!,
      objectId: meta.get("OBJECT_ID")!,
      centerName: meta.get("CENTER_NAME")!,
      refFrame: meta.get("REF_FRAME")!,
      timeSystem: meta.get("TIME_SYSTEM")!,
      start: seg.start,
      stop: seg.stop,
      epochs: Float64Array.from(seg.epochs),
      states: Float64Array.from(seg.states),
    };
    const us = useable("USEABLE_START_TIME");
    const ue = useable("USEABLE_STOP_TIME");
    if (us !== undefined) {
      out.useableStart = us;
    }
    if (ue !== undefined) {
      out.useableStop = ue;
    }
    const interpolation = meta.get("INTERPOLATION");
    if (interpolation !== undefined) {
      out.interpolation = interpolation;
    }
    if (degree !== undefined) {
      const d = Number(degree);
      if (!Number.isInteger(d) || d < 0) {
        fail(metaLine, `bad INTERPOLATION_DEGREE "${degree}"`);
      }
      out.interpolationDegree = d;
    }
    segments.push(out);
    lastScale = seg.scale;
    seg = undefined;
  };
  const closeEpoch = (n: number): void => {
    if (covPending !== 0) {
      fail(n, `covariance needs 21 numbers per epoch, ${covPending} missing`);
    }
  };
  const addCovariance = (): void => {
    const target = covTarget!.seg;
    const old = target.covariances;
    const epochs = old ? [...old.epochs, ...covEpochs] : covEpochs;
    const values = old ? [...old.values, ...covValues] : covValues;
    target.covariances = {
      epochs: Float64Array.from(epochs),
      values: Float64Array.from(values),
    };
  };

  for (let i = 0; i < lines.length; i++) {
    const n = i + 1;
    const line = lines[i]!.trim();
    if (line === "" || line.startsWith("COMMENT")) {
      continue;
    }
    if (line.startsWith("<")) {
      fail(n, "the XML form of OEM is not supported");
    }
    if (state === "covariance") {
      const target = covTarget!;
      if (line === "COVARIANCE_STOP") {
        closeEpoch(n);
        addCovariance();
        state = "between";
        continue;
      }
      const eq = line.indexOf("=");
      if (eq > 0) {
        const key = line.slice(0, eq).trim();
        const value = line.slice(eq + 1).trim();
        if (key === "EPOCH") {
          closeEpoch(n);
          const t = iso(n, value, target.scale).tdb();
          // Strictly increasing across the segment's blocks, not only within one.
          const before =
            covEpochs.at(-1) ?? target.seg.covariances?.epochs.at(-1);
          if (before !== undefined && t <= before) {
            fail(n, "covariance epochs must strictly increase");
          }
          covEpochs.push(t);
          covPending = 21;
        } else if (key === "COV_REF_FRAME") {
          if (value.toUpperCase() !== target.seg.refFrame.toUpperCase()) {
            fail(
              n,
              `COV_REF_FRAME ${value} differs from REF_FRAME ${target.seg.refFrame}, which is not supported yet`,
            );
          }
        } else {
          fail(n, `unexpected covariance line "${line}"`);
        }
        continue;
      }
      if (covEpochs.length === 0) {
        fail(n, "covariance numbers before an EPOCH");
      }
      for (const field of line.split(/\s+/)) {
        const v = Number(field);
        if (!Number.isFinite(v)) {
          fail(n, `bad number "${field}"`);
        }
        if (covPending === 0) {
          fail(n, "covariance has more than 21 numbers for an epoch");
        }
        // The lower triangle: the position variances c11, c22, c33 are the
        // 1st, 3rd and 6th of an epoch's 21 numbers.
        const index = 21 - covPending;
        if (v < 0 && (index === 0 || index === 2 || index === 5)) {
          const axis = index === 0 ? "c11" : index === 2 ? "c22" : "c33";
          fail(n, `negative position variance ${axis} (${v})`);
        }
        covValues.push(v);
        covPending--;
      }
      continue;
    }
    if (line === "COVARIANCE_START") {
      finish(n);
      const last = segments[segments.length - 1];
      if (last === undefined) {
        fail(n, "COVARIANCE_START before any segment");
      }
      covTarget = { seg: last!, scale: lastScale };
      covEpochs = [];
      covValues = [];
      covPending = 0;
      state = "covariance";
      continue;
    }
    if (line === "META_START") {
      if (state === "meta") {
        fail(n, "META_START before META_STOP");
      }
      if (version === undefined) {
        fail(n, "missing CCSDS_OEM_VERS before the first META_START");
      }
      finish(n);
      seg = {
        meta: new Map(),
        scale: "UTC",
        start: Instant.fromTt(0),
        stop: Instant.fromTt(0),
        epochs: [],
        states: [],
        lastTt: -Infinity,
      };
      metaLine = n;
      state = "meta";
      continue;
    }

    if (state === "header" || state === "between") {
      const eq = line.indexOf("=");
      if (state === "header" && eq > 0) {
        if (line.slice(0, eq).trim() === "CCSDS_OEM_VERS") {
          version = line.slice(eq + 1).trim();
          if (!/^[123]\.\d+$/.test(version)) {
            fail(n, `unsupported CCSDS_OEM_VERS "${version}"`);
          }
        }
        continue;
      }
      fail(n, "unexpected line outside a segment");
    }

    const cur = seg!;
    if (state === "meta") {
      const eq = line.indexOf("=");
      if (line === "META_STOP") {
        for (const key of REQUIRED) {
          if (!cur.meta.has(key)) {
            fail(n, `META block lacks ${key}`);
          }
        }
        cur.start = iso(metaLine, cur.meta.get("START_TIME")!, cur.scale);
        cur.stop = iso(metaLine, cur.meta.get("STOP_TIME")!, cur.scale);
        state = "data";
        continue;
      }
      if (eq <= 0) {
        fail(n, "missing META_STOP before the data");
      }
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      if (key === "TIME_SYSTEM") {
        if (!SCALES.has(value)) {
          fail(n, `unsupported TIME_SYSTEM ${value}`);
        }
        cur.scale = value as Scale;
      }
      cur.meta.set(key, value);
      continue;
    }

    // A state line: epoch, then x y z vx vy vz [ax ay az] in km, km/s, km/s².
    const f = line.split(/\s+/);
    if (f.length !== 7 && f.length !== 10) {
      fail(n, `expected 7 or 10 fields, found ${f.length}`);
    }
    const instant = iso(n, f[0]!, cur.scale);
    if (instant.tt <= cur.lastTt) {
      fail(n, "epochs must increase");
    }
    if (instant.tt < cur.start.tt || instant.tt > cur.stop.tt) {
      fail(n, "epoch outside START_TIME..STOP_TIME");
    }
    cur.lastTt = instant.tt;
    cur.epochs.push(instant.tdb());
    for (let k = 1; k <= 6; k++) {
      const v = Number(f[k]);
      if (!Number.isFinite(v)) {
        fail(n, `bad number "${f[k]}"`);
      }
      cur.states.push(v * 1000);
    }
  }

  if (state === "meta") {
    fail(lines.length, "missing META_STOP");
  }
  if (state === "covariance") {
    fail(lines.length, "missing COVARIANCE_STOP");
  }
  finish(lines.length);
  if (version === undefined) {
    fail(1, "missing CCSDS_OEM_VERS");
  }
  return { version: version!, segments };
}
