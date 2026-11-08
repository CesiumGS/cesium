// The design globe's ground-sample caches (scripts/poleLineGround.mjs,
// corridorGround.mjs, corridorDaylight.mjs): the public ground data each
// one-off design step samples, kept between runs so a re-run needn't fetch
// it again. They live in the user's own frames data directory
// (samples/, 0700, each file 0600), never in the repo or the shared
// temporary directory, and are checked as they are read back: what they
// hold goes into generated source (a sampling date, in a comment and a
// string) and into the design's heights, so only a strict date and finite
// numbers are taken. Anything else is refused, not repaired.
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { framesDataDirectory } from "../frameData.mjs";

/** A sampling date, as generated files state it. */
export const SAMPLED_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A sample cache's default file: samples/<name> in the frames data directory. */
export function sampleCacheFile(name) {
  return join(framesDataDirectory(), "samples", name);
}

/** Where the scripts used to cache <name>: the shared temporary directory. */
export function legacySampleCacheFile(name) {
  return join(tmpdir(), name);
}

/** Writes a cache only the user can read or change: 0600 in a 0700 folder. */
export function writeSampleCache(file, data) {
  const dir = dirname(file);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  writeFileSync(file, JSON.stringify(data), { mode: 0o600 });
  chmodSync(file, 0o600);
}

/**
 * A cache read back through `check` (which throws for anything it doesn't
 * take), or undefined when there is none. With `legacy`, a cache still at
 * the old shared-temporary path is checked the same way, written to `file`
 * and removed there, so its samples needn't be fetched again.
 */
export function readSampleCache(file, check, legacy) {
  if (existsSync(file)) {
    return check(JSON.parse(readFileSync(file, "utf8")), file);
  }
  if (legacy !== undefined && existsSync(legacy)) {
    const data = check(JSON.parse(readFileSync(legacy, "utf8")), legacy);
    writeSampleCache(file, data);
    unlinkSync(legacy);
    console.log(`moved the cached samples from ${legacy} to ${file}`);
    return data;
  }
  return undefined;
}

const isRecord = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const refuser = (script, path) => (why) => {
  throw new Error(`${script}: ${path}: ${why}; delete it to sample again`);
};

/** A finite number within [lo, hi]. */
const within = (v, lo, hi) =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/** The date every cache carries, checked. */
function sampledOf(json, refuse) {
  if (!isRecord(json)) {
    refuse("not an object");
  }
  if (typeof json.sampled !== "string" || !SAMPLED_DATE.test(json.sampled)) {
    refuse("its sampled date isn't YYYY-MM-DD");
  }
  return json.sampled;
}

// ---------------------------------------------- London's pole line (EA lidar)

/** A pole's key: its British National Grid easting and northing, metres, to the centimetre. */
const POLE_KEY = /^\d{1,7}\.\d{2},\d{1,7}\.\d{2}$/;

/** A lidar height, ODN metres: finite, within what Great Britain's ground spans. */
export const lidarHeight = (v) =>
  typeof v === "number" && Number.isFinite(v) && v > -100 && v < 1_400;

/**
 * poleLineGround.mjs's cache, checked: its date and, for each pole's key,
 * lidar heights only.
 */
export function checkedCache(json, path) {
  const refuse = refuser("poleLineGround", path);
  const sampled = sampledOf(json, refuse);
  if (!isRecord(json.cells)) {
    refuse("no cells");
  }
  const cells = Object.create(null);
  for (const [key, values] of Object.entries(json.cells)) {
    if (
      !POLE_KEY.test(key) ||
      !Array.isArray(values) ||
      !values.every(lidarHeight)
    ) {
      refuse("a pole's entry isn't a key and its heights");
    }
    cells[key] = values;
  }
  return { sampled, cells };
}

// ------------------------------------------------ the corridor (USGS 3DEP)

/** A 3DEP height, NAVD88 metres, as threeDep.mjs `groundHeights` takes them. */
export const groundHeight = (v) =>
  typeof v === "number" && Number.isFinite(v) && v > -100 && v < 9_000;

/** A number as JavaScript writes it back: the form the scripts' keys take. */
const numberText = (t) => t !== "" && String(Number(t)) === t;

/**
 * corridorGround.mjs's cache, checked: its date, its spacing (ftUS) and
 * each point's station (ftUS), longitude and latitude (degrees) and
 * ground height.
 */
export function checkedCorridorGround(json, path) {
  const refuse = refuser("corridorGround", path);
  const sampled = sampledOf(json, refuse);
  if (!within(json.every, Number.MIN_VALUE, 1e6)) {
    refuse("its spacing isn't a positive length");
  }
  if (!Array.isArray(json.points) || json.points.length === 0) {
    refuse("no points");
  }
  const points = json.points.map((p) => {
    if (
      !isRecord(p) ||
      !within(p.station, 0, 1e8) ||
      !within(p.longitude, -180, 180) ||
      !within(p.latitude, -90, 90) ||
      !groundHeight(p.groundMeters)
    ) {
      refuse("a point isn't a station, a place and a ground height");
    }
    return {
      station: p.station,
      longitude: p.longitude,
      latitude: p.latitude,
      groundMeters: p.groundMeters,
    };
  });
  return { sampled, every: json.every, points };
}

/**
 * corridorDaylight.mjs's cache, checked: its date and, for each
 * "station,offset" key (ftUS, as the script writes them), a ground height.
 */
export function checkedCorridorSections(json, path) {
  const refuse = refuser("corridorDaylight", path);
  const sampled = sampledOf(json, refuse);
  if (!isRecord(json.ground)) {
    refuse("no ground");
  }
  const ground = Object.create(null);
  for (const [key, value] of Object.entries(json.ground)) {
    const parts = key.split(",");
    if (
      parts.length !== 2 ||
      !parts.every(numberText) ||
      !groundHeight(value)
    ) {
      refuse("an entry isn't a station, an offset and a ground height");
    }
    ground[key] = value;
  }
  return { sampled, ground };
}
