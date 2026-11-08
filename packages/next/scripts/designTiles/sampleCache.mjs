// The design globe's ground-sample caches (scripts/poleLineGround.mjs,
// corridorGround.mjs, corridorDaylight.mjs): the public ground data each
// one-off design step samples, kept between runs so a re-run needn't fetch
// it again. They live in the user's own frames data directory
// (samples/, 0700, each file 0600), never in the repo or the shared
// temporary directory; a cache given with --samples must be in a folder
// only its owner can write. They are checked as they are read back: what they
// hold goes into generated source (a sampling date, in a comment and a
// string) and into the design's heights, so only a strict date and finite
// numbers are taken. Anything else is refused, not repaired.
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { framesDataDirectory } from "../frameData.mjs";

/** A sampling date, as generated files state it. */
export const SAMPLED_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A sample cache's default file: samples/<name> in the frames data directory. */
export function sampleCacheFile(name) {
  return join(framesDataDirectory(), "samples", name);
}

/**
 * A cache's folder, checked: it must be the user's own and writable by no
 * one else, or a file planted there could become design data. Throws.
 */
function privateFolder(dir, file) {
  const st = statSync(dir);
  const own = process.getuid === undefined || st.uid === process.getuid();
  if (!st.isDirectory() || !own || (st.mode & 0o022) !== 0) {
    throw new Error(
      `sample cache: ${file}: its folder ${dir} isn't private (yours, written by no one else); give --samples a private folder`,
    );
  }
}

/**
 * Writes a cache only the user can read or change: 0600 in a 0700 folder.
 * Folders it makes are 0700, and the default samples folder is kept so;
 * another folder that exists (a --samples path's) isn't changed, but must
 * already be private.
 */
export function writeSampleCache(file, data) {
  const dir = dirname(file);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (resolve(dir) === resolve(dirname(sampleCacheFile("-")))) {
    chmodSync(dir, 0o700);
  }
  privateFolder(dir, file);
  writeFileSync(file, JSON.stringify(data), { mode: 0o600 });
  chmodSync(file, 0o600);
}

/**
 * A cache read back through `check` (which throws for anything it doesn't
 * take), or undefined when there is none. Only from a private folder: a
 * cache anywhere else (the shared temporary directory the scripts once
 * used) is never read.
 */
export function readSampleCache(file, check) {
  if (!existsSync(file)) {
    return undefined;
  }
  privateFolder(dirname(file), file);
  return check(JSON.parse(readFileSync(file, "utf8")), file);
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
