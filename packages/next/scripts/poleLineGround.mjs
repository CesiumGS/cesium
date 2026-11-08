// The design globe's London pole line on the ground: a one-off design step,
// not part of setup (UX review M1). It samples the Environment Agency's
// lidar composite terrain model (1 m DTM, heights above Ordnance Datum
// Newlyn, the design's own height system; public, no token) at each pole of
// the line, and writes each pole's ground height to
// examples/design-globe/poleLineGround.ts, which sites.ts gives the model.
//
//   node scripts/poleLineGround.mjs [--samples <file>]
//
// A pole's ground is the median of the lidar's cells within 2 m of it (a
// 4 m square), so a fence post or a ditch under one cell doesn't stand in
// for the field; a pole with no lidar cells there takes the heights of its
// neighbours, linear between them. The samples are cached in <file>
// (default: samples/pole-line-ground.json in the frames data directory,
// ~/.cesium-bench/frames, private to the user), never in the repo: only the
// poles' heights, which are design data, are committed. The cache is
// checked as it is read back (a date, and numbers only), since what it
// holds goes into a generated source file.
//
// Contains Environment Agency information © Environment Agency and/or
// database right 2022, under the Open Government Licence v3.0.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { moduleRunner } from "./designTiles/moduleRunner.mjs";
import { framesDataDirectory } from "./frameData.mjs";
import {
  SAMPLED_DATE,
  checkedCache,
  lidarHeight,
} from "./designTiles/poleLineCache.mjs";
import { poleLinePoles } from "./designTiles/poleLineMesh.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/** The Environment Agency's lidar composite DTM (1 m), as a WCS 2.0.1 coverage. */
const DATASET = "13787b9a-26a4-4775-8523-806d13af58fc";
export const SERVICE = `https://environment.data.gov.uk/geoservices/datasets/${DATASET}/wcs`;
const COVERAGE = `${DATASET}__Lidar_Composite_Elevation_DTM_1m`;
/** Half the square sampled around a pole, metres. */
const HALF = 2;
/** Per request. */
const TIMEOUT_MS = 60_000;
/** A 4 m square's reply is about 2 KB; anything past this is refused. */
const MAX_BYTES = 64 * 1024;
/** Requests in flight at once. */
const PARALLEL = 3;

function argument(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
const file = argument(
  "--samples",
  join(framesDataDirectory(), "samples", "pole-line-ground.json"),
);

/** Writes the cache where only the user can read or change it. */
function writeCache(cache) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, JSON.stringify(cache), { mode: 0o600 });
}

/** The reply's body as text, refusing more than MAX_BYTES. */
async function cappedText(response) {
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    bytes += value.byteLength;
    if (bytes > MAX_BYTES) {
      await reader.cancel();
      throw new Error(`lidar: a reply over ${MAX_BYTES} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * The lidar's cells in the square within `HALF` of [e, n] (British
 * National Grid metres), ODN metres; the coverage's no-data cells left out.
 */
async function cells(e, n) {
  const url = new URL(SERVICE);
  url.search = new URLSearchParams({
    service: "WCS",
    version: "2.0.1",
    request: "GetCoverage",
    CoverageId: COVERAGE,
    format: "text/plain",
  }).toString();
  // Repeated keys, which URLSearchParams' record form can't hold.
  url.search += `&subset=E(${(e - HALF).toFixed(2)},${(e + HALF).toFixed(2)})&subset=N(${(n - HALF).toFixed(2)},${(n + HALF).toFixed(2)})`;
  for (let attempt = 1; ; attempt++) {
    if (attempt > 1) {
      await new Promise((resolve) => setTimeout(resolve, 3_000 * attempt));
    }
    try {
      const response = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`lidar: HTTP ${response.status}`);
      }
      const text = await cappedText(response);
      const band = text.indexOf("Band 0:");
      if (band < 0) {
        throw new Error("lidar: a reply without a band");
      }
      return text
        .slice(band + "Band 0:".length)
        .split(/\s+/)
        .filter((t) => t !== "")
        .map(Number)
        .filter(lidarHeight);
    } catch (error) {
      if (attempt >= 5) {
        throw error;
      }
      console.warn(`  retrying a pole: ${error.message}`);
    }
  }
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

const runner = await moduleRunner(root);
try {
  const { PORTFOLIO } = await runner.import(
    join(root, "examples/design-globe/sites.ts"),
  );
  const site = PORTFOLIO.find((s) => s.id === "london");
  const { poles } = poleLinePoles(site);
  const key = ([e, n]) => `${e.toFixed(2)},${n.toFixed(2)}`;
  const cache = existsSync(file)
    ? {
        source: `Environment Agency lidar composite DTM 1 m (${SERVICE}), ODN metres`,
        ...checkedCache(JSON.parse(readFileSync(file, "utf8")), file),
      }
    : {
        source: `Environment Agency lidar composite DTM 1 m (${SERVICE}), ODN metres`,
        sampled: new Date().toLocaleDateString("en-CA"),
        cells: {},
      };
  const missing = poles.filter((p) => !(key(p) in cache.cells));
  let done = 0;
  const queue = [...missing];
  const work = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      cache.cells[key(p)] = await cells(p[0], p[1]);
      if (++done % 25 === 0 || done === missing.length) {
        console.log(`  ${done} of ${missing.length} poles`);
        writeCache(cache);
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, work));
  writeCache(cache);
  if (!SAMPLED_DATE.test(cache.sampled)) {
    throw new Error(`poleLineGround: a sampled date that isn't YYYY-MM-DD`);
  }

  // Each pole's ground; a pole without cells, linear between its neighbours.
  const ground = poles.map((p) => {
    const c = cache.cells[key(p)];
    return c.length > 0 ? median(c) : undefined;
  });
  const filled = ground.map((g, i) => {
    if (g !== undefined) {
      return g;
    }
    let a = i - 1;
    while (a >= 0 && ground[a] === undefined) {
      a--;
    }
    let b = i + 1;
    while (b < ground.length && ground[b] === undefined) {
      b++;
    }
    if (a < 0 && b >= ground.length) {
      throw new Error("poleLineGround: no lidar cells at any pole");
    }
    if (a < 0) {
      return ground[b];
    }
    if (b >= ground.length) {
      return ground[a];
    }
    return ground[a] + ((ground[b] - ground[a]) * (i - a)) / (b - a);
  });
  const gaps = ground.filter((g) => g === undefined).length;
  const low = Math.min(...filled);
  const high = Math.max(...filled);
  const rows = [];
  for (let i = 0; i < filled.length; i += 10) {
    rows.push(
      `  ${filled
        .slice(i, i + 10)
        .map((g) => g.toFixed(2))
        .join(", ")},`,
    );
  }
  const out = join(root, "examples/design-globe/poleLineGround.ts");
  writeFileSync(
    out,
    `// London's pole line on the ground (UX review M1): each pole's ground
// height, ODN metres, in the order poleLineMesh.mjs \`poleLinePoles\` gives
// them (${filled.length} poles, ${low.toFixed(1)} to ${high.toFixed(1)} m${gaps > 0 ? `; ${gaps} without lidar there, linear between their neighbours` : ""}).
// Written by scripts/poleLineGround.mjs from the Environment Agency's
// lidar composite DTM (1 m), the median of its cells within 2 m of each
// pole, sampled ${cache.sampled}. Do not edit by hand.
//
// Contains Environment Agency information © Environment Agency and/or
// database right 2022, under the Open Government Licence v3.0.

export const POLE_LINE_GROUND: readonly number[] = [
${rows.join("\n")}
];
`,
  );
  console.log(
    `${filled.length} poles, ${low.toFixed(2)} to ${high.toFixed(2)} m ODN${gaps > 0 ? `, ${gaps} filled` : ""}: ${out}`,
  );
} finally {
  await runner.close();
}
