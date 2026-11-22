// Which of the stores outside the repo are out of date, for the code that
// tells a person: the data tests (`npm run test:data`), the dev server's
// banner and its `/data-status.json`, which Dyno lists under its problems.
// The formats and the rule are in scripts/dataFormats.mjs.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { chosenPackDirectory } from "./skyStore.mjs";
import { framesDataDirectory } from "./frameData.mjs";
import { DESIGN_TILES_DIRECTORY, datasetStatus } from "./dataFormats.mjs";
import { occtStatus } from "./occtTools.mjs";
import { slangcStatus, slangWasmStatus } from "./slangTools.mjs";
import { smlibStatus } from "./smlibTools.mjs";
import { stepSamplesStatus } from "./stepSamples.mjs";

/** The status of every dataset, as this machine's stores hold them now. */
export function datasetStatuses() {
  const frames = framesDataDirectory();
  const pack = chosenPackDirectory();
  return [
    datasetStatus("sky", existsSync(pack) ? pack : undefined),
    datasetStatus("frames", existsSync(frames) ? frames : undefined),
    datasetStatus(
      "designTiles",
      existsSync(join(frames, DESIGN_TILES_DIRECTORY))
        ? join(frames, DESIGN_TILES_DIRECTORY)
        : undefined,
    ),
    smlibStatus(),
    occtStatus(),
    slangcStatus(),
    slangWasmStatus(),
    stepSamplesStatus(),
  ];
}

/** The datasets whose store was built in another format than this code reads. */
export function outOfDateDatasets() {
  return datasetStatuses().filter((status) => status.state === "outOfDate");
}

/**
 * The datasets a data test reads, found from its source: the accessors it
 * calls and the store paths it names. A test file that reads none of them
 * reads no dataset. test/dataFormats.test.ts checks every file under
 * test/data names at least one.
 */
const READS = {
  sky: /skyStore|chosenPackDirectory|SKY_PACK|SKY_DATA/,
  frames:
    /framesDataDirectory|FRAMES_DATA_DIR|frames-data|frameStore|explorerPages/,
  designTiles: /design-globe|designTiles|DESIGN_TILES/,
  smlib: /smlibDirectory/,
  occt: /occtDirectory/,
  slangc: /slangcPath|SLANGC/,
  slangWasm: /slangWasmDirectory|SLANG_WASM_DIR/,
  step: /stepSamples/,
};

/** The datasets the data test with this source reads. */
export function datasetsReadBy(source) {
  return Object.entries(READS)
    .filter(([, pattern]) => pattern.test(source))
    .map(([name]) => name);
}

/**
 * Why a data test with this source can't run, as one line, or undefined if
 * every dataset it reads is current (or missing, which fails as it always has).
 */
export function outOfDateReason(source, statuses = outOfDateDatasets()) {
  const read = new Set(datasetsReadBy(source));
  const hits = statuses.filter(
    (status) => status.state === "outOfDate" && read.has(status.name),
  );
  return hits.length === 0
    ? undefined
    : hits.map((status) => status.message).join("; ");
}
