// The format version of each derived dataset that setup (`npm run setup`) or
// the sky builder (`npm run sky -- build`) writes into a store outside the
// repo, and how the code that reads one finds out the store is out of date.
//
// A store is derived data on one machine, so it can be older than the code:
// the code changes what it expects (a key renamed, a layout moved), and the
// store keeps what an earlier build wrote. Each dataset records the format it
// was built with, beside what it built. A reader knows the format it expects.
// When the two differ, the reader says so in one plain sentence that names the
// dataset and the command to run, instead of failing on whatever it met first.
//
// Bump a dataset's format here (and in its pinned key list,
// test/dataFormats.test.ts) with any change to what it persists: a key's name,
// a key's meaning, a file's place. Renaming a key without bumping is the
// mistake this guards against (2026-11-15: `modelled` became `modeled` in
// format 1 of the sky pack, and every older pack stopped reading).
//
// Where each dataset records its format:
//  - the sky pack and the frames data: `format` in `manifest.json`;
//  - the design globe's tiles: `version` in `manifest.json` (it predates this
//    file; its generator also regenerates when the version moves);
//  - the rest (SMLib's build, Open CASCADE, the Slang toolchain, the STEP
//    samples): `format.json` in the dataset's folder, `{ "format": n }`.
// A folder with no record is read as format 1: what stores held before
// records began. `adoptFormat1` writes that record for a store that is whole,
// so setup leaves every store recording its format.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FRAMES_DATA_FORMAT } from "../packages/next/src/ephemeris/framesDataFormat.ts";
import {
  SKY_PACK_BUILD_COMMAND,
  SKY_PACK_FORMAT,
} from "../packages/core/src/atmosphere/skyPack.ts";

/** The command that sets everything up (the sky pack has its own). */
export const SETUP_COMMAND = "npm run setup";

/** Where in the frames store the design globe's tiles are (scripts/designTiles.mjs). */
export const DESIGN_TILES_DIRECTORY = "design-globe-dual";

/** The file that records a format beside a folder's contents. */
export const FORMAT_FILE = "format.json";

/**
 * The datasets. `format` is the one this checkout reads and writes; `record`
 * says where a store keeps the one it was built with.
 */
export const DATASETS = {
  sky: {
    label: "sky pack",
    format: SKY_PACK_FORMAT,
    command: SKY_PACK_BUILD_COMMAND,
    record: { file: "manifest.json", key: "format" },
  },
  frames: {
    label: "frames data",
    format: FRAMES_DATA_FORMAT,
    command: SETUP_COMMAND,
    record: { file: "manifest.json", key: "format" },
  },
  designTiles: {
    label: "design globe tiles",
    format: 1,
    command: SETUP_COMMAND,
    record: { file: "manifest.json", key: "version" },
  },
  smlib: {
    label: "SMLib build",
    format: 1,
    command: SETUP_COMMAND,
    record: { file: FORMAT_FILE, key: "format" },
  },
  occt: {
    label: "Open CASCADE build",
    format: 1,
    command: SETUP_COMMAND,
    record: { file: FORMAT_FILE, key: "format" },
  },
  slangc: {
    label: "Slang compiler",
    format: 1,
    command: SETUP_COMMAND,
    record: { file: FORMAT_FILE, key: "format" },
  },
  slangWasm: {
    label: "Slang WebAssembly build",
    format: 1,
    command: SETUP_COMMAND,
    record: { file: FORMAT_FILE, key: "format" },
  },
  step: {
    label: "STEP samples",
    format: 1,
    command: SETUP_COMMAND,
    record: { file: FORMAT_FILE, key: "format" },
  },
};

/**
 * The format a store records, with the reason it can't tell when it doesn't:
 * `{ found }` (a number), `{ missing: true }` (no record file),
 * `{ unrecorded: true }` (a record file with no format in it) or
 * `{ problem }` (a record that isn't JSON, or whose format isn't a number).
 */
export function recordedFormat(name, directory) {
  const { file, key } = DATASETS[name].record;
  const path = join(directory, file);
  if (!existsSync(path)) {
    return { missing: true };
  }
  let json;
  try {
    json = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { problem: `${file} is not valid JSON` };
  }
  const found = json?.[key];
  if (found === undefined) {
    return { unrecorded: true };
  }
  return Number.isInteger(found)
    ? { found }
    : { problem: `\`${key}\` in ${file} is not a whole number` };
}

/**
 * Whether the dataset in `directory` is `current`, `missing` (nothing of it
 * there), or `outOfDate`, and one plain sentence for the last two.
 */
export function datasetStatus(name, directory) {
  const { label, format, command } = DATASETS[name];
  if (directory === undefined) {
    return {
      name,
      state: "missing",
      expected: format,
      message: `${label}: not built. Run \`${command}\`.`,
    };
  }
  const recorded = recordedFormat(name, directory);
  if (recorded.missing && DATASETS[name].record.file !== FORMAT_FILE) {
    // A manifest is the dataset itself: no manifest, no dataset.
    return {
      name,
      state: "missing",
      expected: format,
      message: `${label}: not built. Run \`${command}\`.`,
    };
  }
  // A store with no record was built before records began: format 1.
  const legacy = recorded.missing || recorded.unrecorded;
  const found = recorded.found ?? (legacy ? 1 : undefined);
  if (found === format) {
    return { name, state: "current", found: format, expected: format };
  }
  const why =
    recorded.problem ??
    `built as format ${found}${legacy ? " (it records none, from before formats were)" : ""}, this code reads format ${format}`;
  return {
    name,
    state: "outOfDate",
    found: found ?? 1,
    expected: format,
    message: `${label}: out of date, run \`${command}\` (${why}).`,
  };
}

/**
 * The status of a dataset a person pointed an environment variable at (say
 * OCCT_DIR): theirs to keep, so never out of date.
 */
export function overrideStatus(name) {
  const { format } = DATASETS[name];
  return { name, state: "current", found: format, expected: format };
}

/** Whether `directory` holds the dataset in the format this code reads. */
export function isCurrent(name, directory) {
  return datasetStatus(name, directory).state === "current";
}

/** Records the current format in `directory`, for a folder this code just built. */
export function writeFormat(name, directory) {
  const { record, format } = DATASETS[name];
  if (record.file !== FORMAT_FILE) {
    throw new Error(`${name} records its format in ${record.file}`);
  }
  writeFileSync(
    join(directory, FORMAT_FILE),
    `${JSON.stringify({ [record.key]: format })}\n`,
  );
}

/**
 * For a store whose files are all there and verified but has no record (built
 * before records began): records format 1, which is what it is. If the code
 * has moved on, the record then reads out of date, and setup builds again.
 */
export function adoptFormat1(name, directory) {
  const { record } = DATASETS[name];
  if (
    record.file === FORMAT_FILE &&
    !existsSync(join(directory, FORMAT_FILE))
  ) {
    writeFileSync(
      join(directory, FORMAT_FILE),
      `${JSON.stringify({ [record.key]: 1 })}\n`,
    );
  }
}
