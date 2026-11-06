// The frames data store (time and ephemerides): downloads the NAIF kernels,
// the IERS leap-second table and the Earth-orientation table into a store
// outside the repo (~/.cesium-bench/frames, or FRAMES_DATA_DIR), excerpts the
// kernels to the span as packs (src/ephemeris/pack.ts) and writes
// `manifest.json`, the contract with the dev server (`/frames-data/`) and
// `loadFrameData`. `npm run setup` calls it (`--frames-span y0-y1`, default
// 2000-2050); `node scripts/frameData.mjs [y0-y1]` does it alone.
//
// Nothing here is committed. Licenses: the NAIF kernels are checked against
// the SHA-256 pinned below; each pack's manifest names its source file, that
// hash and the span, and says the pack is derived from it (packs are never
// distributed). The EOP data is IERS's, via CelesTrak.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { readDaf } from "../src/ephemeris/spk.ts";
import { writePack } from "../src/ephemeris/pack.ts";
import { EarthOrientationParameters } from "../src/time/eop.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";

const NAIF = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels";
const ARTEMIS = "https://naif.jpl.nasa.gov/pub/naif/ARTEMIS/kernels/spk";
const DAY_MS = 86_400_000;
const REFRESH_MS = 7 * DAY_MS;

/** The SHA-256 of each NAIF kernel, recorded on first download, 2026-11-05. */
export const NAIF_SHA256 = {
  "de440s.bsp":
    "c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2",
  "moon_pa_de440_200625.bpc":
    "60cd55aa401ea2ea97360636f567554bfe4e37bb829f901b4460a455dfaf783f",
  "EM2_FODNAVBET_revF_PUBLIC.oem":
    "d8ed8a5a16d40d69da32a54d83a19970e47f4e8bd6e547210b01b1c78e002ff3",
  "art002_rec_260402_260410_jsc_bet_revf.bsp":
    "b8b3ebc4d703c3a73c9651b9da36114c3ef0b2c75f92873dd4970f32367aa7be",
  "art002_rec_260402_260410_jsc_bet_revf_gapfill.bsp":
    "ac9e3f21302a6a510757fff41a9f8a55df907b75fb2142b8fdfc44a599ddc9b9",
  "earthstns_itrf93_260814.bsp":
    "007eb0aad5dd022c6d61bdbfb2395680bd1eb31c49a8637d0b0a1cfbea737c6b",
};

const SOURCES = {
  planets: {
    file: "de440s.bsp",
    url: `${NAIF}/spk/planets/de440s.bsp`,
  },
  moon: {
    file: "moon_pa_de440_200625.bpc",
    url: `${NAIF}/pck/moon_pa_de440_200625.bpc`,
  },
  artemisOem: {
    file: "EM2_FODNAVBET_revF_PUBLIC.oem",
    url: `${ARTEMIS}/EM2_FODNAVBET_revF_PUBLIC.oem`,
    credit: "NASA JSC FOD Navigation, via NAIF",
  },
  artemisSpk: {
    file: "art002_rec_260402_260410_jsc_bet_revf.bsp",
    url: `${ARTEMIS}/art002_rec_260402_260410_jsc_bet_revf.bsp`,
    credit: "NASA JSC FOD Navigation, via NAIF",
  },
  artemisGapfill: {
    file: "art002_rec_260402_260410_jsc_bet_revf_gapfill.bsp",
    url: `${ARTEMIS}/art002_rec_260402_260410_jsc_bet_revf_gapfill.bsp`,
    credit: "NASA JSC FOD Navigation, via NAIF",
  },
  stations: {
    file: "earthstns_itrf93_260814.bsp",
    url: `${NAIF}/spk/stations/earthstns_itrf93_260814.bsp`,
    credit: "NAIF/JPL",
  },
  leapSeconds: {
    file: "Leap_Second.dat",
    url: "https://hpiers.obspm.fr/iers/bul/bulc/Leap_Second.dat",
  },
  eop: {
    file: "EOP-All.csv",
    url: "https://celestrak.org/SpaceData/EOP-All.csv",
  },
};

/** FRAMES_DATA_DIR, else ~/.cesium-bench/frames. */
export function framesDataDirectory() {
  return (
    process.env.FRAMES_DATA_DIR ?? join(homedir(), ".cesium-bench", "frames")
  );
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function store(path, bytes) {
  const partial = `${path}.partial`;
  writeFileSync(partial, bytes);
  renameSync(partial, path);
}

function checkPinned(file, bytes) {
  const actual = sha256(bytes);
  if (actual !== NAIF_SHA256[file]) {
    throw new Error(
      `${file}: SHA-256 mismatch (expected ${NAIF_SHA256[file]}, got ${actual})`,
    );
  }
}

/** A NAIF kernel: kept once stored and verified, else downloaded and verified. */
async function ensureNaif(dir, { file, url }, log) {
  const path = join(dir, file);
  if (existsSync(path)) {
    const bytes = readFileSync(path);
    checkPinned(file, bytes);
    log(`  ${file}: present, verified`);
    return bytes;
  }
  log(`  ${file}: downloading ${url}`);
  const bytes = await download(url);
  checkPinned(file, bytes);
  store(path, bytes);
  return bytes;
}

/**
 * A table refreshed when older than 7 days. `validate(text)` throws on a bad
 * file; a download that fails or doesn't validate is a failed refresh, which
 * keeps a valid stored copy (and never overwrites it), else throws naming the
 * URL. A stored copy that doesn't validate is not kept.
 */
export async function ensureFresh(dir, { file, url }, log, validate) {
  const path = join(dir, file);
  let kept;
  if (existsSync(path)) {
    const bytes = readFileSync(path);
    try {
      validate(bytes.toString("utf8"));
      kept = bytes;
    } catch (error) {
      log(`  ${file}: stored copy is invalid (${error.message})`);
    }
  }
  if (kept && Date.now() - statSync(path).mtimeMs < REFRESH_MS) {
    log(`  ${file}: fresh`);
    return kept;
  }
  try {
    log(`  ${file}: downloading ${url}`);
    const bytes = await download(url);
    validate(Buffer.from(bytes).toString("utf8"));
    store(path, bytes);
    return Buffer.from(bytes);
  } catch (error) {
    if (!kept) {
      throw new Error(
        `${file}: cannot download a valid copy from ${url} and no stored copy: ${error.message}`,
        { cause: error },
      );
    }
    console.warn(
      `  ${file}: refresh from ${url} failed (${error.message}); keeping the stored copy`,
    );
    return kept;
  }
}

const toArrayBuffer = (b) =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);

/** TDB seconds past J2000 of January 1st, 00:00 UTC of `year`. */
const tdbSeconds = (year, leap) =>
  Instant.fromUtc(Date.UTC(year, 0, 1), leap).tdb();

/** The pack of `wanted` segments of one kernel, every split piece overlapping the span. */
function buildPack(source, bytes, wanted, frame, kind, span, leap) {
  const [y0, y1] = span;
  const start = tdbSeconds(y0, leap);
  const end = tdbSeconds(y1 + 1, leap);
  const { segments } = readDaf(toArrayBuffer(bytes));
  const inputs = [];
  const found = [];
  for (const { name, target, center } of wanted) {
    const matches = segments.filter(
      (s) =>
        s.target === target &&
        s.center === center &&
        s.end >= start &&
        s.start <= end,
    );
    if (matches.length === 0) {
      throw new Error(
        `${source.file}: no segment ${target}/${center} overlapping ${y0}-${y1}`,
      );
    }
    matches.forEach((segment, i) => {
      const label = i === 0 ? name : `${name}#${i + 1}`;
      inputs.push({ segment, name: label, frame, kind, start, end });
      found.push(label);
    });
  }
  const pack = writePack(
    {
      format: "cesium-chebyshev-pack/1",
      source: source.file,
      sourceSha256: NAIF_SHA256[source.file],
      span: [`${y0}-01-01T00:00:00Z`, `${y1 + 1}-01-01T00:00:00Z`],
      derivedFrom: `derived from ${source.file}, NAIF (NASA/JPL); not for redistribution`,
    },
    inputs,
  );
  return { pack, found };
}

/**
 * Download, verify and excerpt everything into the store, and write
 * `manifest.json`. `span` is `[y0, y1]`, both years included.
 */
export async function ensureFrameData({ span }, log = console.log) {
  const [y0, y1] = span;
  const dir = framesDataDirectory();
  mkdirSync(dir, { recursive: true });
  log(`frames data: ${dir}`);

  const planetsBytes = await ensureNaif(dir, SOURCES.planets, log);
  const moonBytes = await ensureNaif(dir, SOURCES.moon, log);
  // Trajectories are optional to loadFrameData, but setup always stores them (R8).
  const trajectories = [];
  for (const source of [
    SOURCES.artemisOem,
    SOURCES.artemisSpk,
    SOURCES.artemisGapfill,
    SOURCES.stations,
  ]) {
    const bytes = await ensureNaif(dir, source, log);
    trajectories.push({
      file: source.file,
      role: "trajectory",
      sha256: sha256(bytes),
      sourceUrl: source.url,
      credit: source.credit,
    });
  }
  const leapBytes = await ensureFresh(dir, SOURCES.leapSeconds, log, (text) =>
    LeapSeconds.fromIers(text),
  );
  const eopBytes = await ensureFresh(dir, SOURCES.eop, log, (text) =>
    EarthOrientationParameters.fromCelestrakCsv(text),
  );

  // Parse what was downloaded, so a bad file fails here, not in the browser.
  const leap = LeapSeconds.fromIers(leapBytes.toString("utf8"));
  const eop = EarthOrientationParameters.fromCelestrakCsv(
    eopBytes.toString("utf8"),
  );
  if (leap.isExpired(Date.now())) {
    console.warn(
      "  Leap_Second.dat: expired; a newer one is not published yet",
    );
  }
  log(
    `  EOP covers ${new Date(eop.first).toISOString().slice(0, 10)} to ${new Date(eop.last).toISOString().slice(0, 10)}`,
  );

  const planets = buildPack(
    SOURCES.planets,
    planetsBytes,
    [
      { name: "sun", target: 10, center: 0 },
      { name: "emb", target: 3, center: 0 },
      { name: "moon", target: 301, center: 3 },
    ],
    "ICRF",
    "position",
    span,
    leap,
  );
  const moon = buildPack(
    SOURCES.moon,
    moonBytes,
    // MOON_PA is NAIF body-frame class 31008 (the brief said 31006; the file has 31008).
    [{ name: "moonPa", target: 31008, center: 0 }],
    "MOON_PA",
    "euler",
    span,
    leap,
  );
  log(`  planets segments: ${planets.found.join(", ")}`);
  log(`  moon segments: ${moon.found.join(", ")}`);

  const planetsFile = `planets-de440-${y0}-${y1}.pack`;
  const moonFile = `moon-pa-de440-${y0}-${y1}.pack`;
  store(join(dir, planetsFile), planets.pack);
  store(join(dir, moonFile), moon.pack);

  const files = [
    {
      file: planetsFile,
      role: "planets",
      sha256: sha256(planets.pack),
      sourceUrl: SOURCES.planets.url,
      sourceSha256: NAIF_SHA256[SOURCES.planets.file],
    },
    {
      file: moonFile,
      role: "moon",
      sha256: sha256(moon.pack),
      sourceUrl: SOURCES.moon.url,
      sourceSha256: NAIF_SHA256[SOURCES.moon.file],
    },
    {
      file: SOURCES.leapSeconds.file,
      role: "leapSeconds",
      sha256: sha256(leapBytes),
      sourceUrl: SOURCES.leapSeconds.url,
      credit: "IERS",
    },
    {
      file: SOURCES.eop.file,
      role: "eop",
      sha256: sha256(eopBytes),
      sourceUrl: SOURCES.eop.url,
      credit: "IERS, via CelesTrak",
    },
    ...trajectories,
  ];
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({ span: [y0, y1], files }, null, 2),
  );
  log(`  manifest.json: ${files.length} files`);
  return { directory: dir, files };
}

/** "2000-2050" → [2000, 2050]. */
export function parseSpan(text) {
  const m = /^(\d{4})-(\d{4})$/.exec(text);
  if (!m || Number(m[1]) > Number(m[2])) {
    throw new Error(
      `--frames-span: expected y0-y1 (e.g. 2000-2050), got "${text}"`,
    );
  }
  return [Number(m[1]), Number(m[2])];
}

// Run directly (`node scripts/frameData.mjs [y0-y1]`).
if (import.meta.url === `file://${process.argv[1]}`) {
  await ensureFrameData({ span: parseSpan(process.argv[2] ?? "2000-2050") });
}
