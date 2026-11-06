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
 * TDB seconds. Comments, blank lines, accelerations and covariance blocks are
 * skipped. Errors name the 1-based line.
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
    seg = undefined;
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
      if (line === "COVARIANCE_STOP") {
        state = "between";
      }
      continue;
    }
    if (line === "COVARIANCE_START") {
      finish(n);
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
