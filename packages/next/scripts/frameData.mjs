// The frames data store (time and ephemerides): downloads the NAIF kernels,
// the IERS leap-second table and the Earth-orientation table into a store
// outside the repo (~/.cesium-bench/frames, or FRAMES_DATA_DIR), excerpts the
// kernels to the span as packs (src/ephemeris/pack.ts) and writes
// `manifest.json`, the contract with the dev server (`/frames-data/`) and
// `loadFrameData`. `npm run setup` calls it (`--frames-span y0-y1`, default
// 2000-2050); `node scripts/frameData.mjs [y0-y1]` does it alone.
//
// It also stores PROJ (proj.js v0.9.2's release builds, PROJ 9.7.1) under
// `proj/`: the WebAssembly glue and module, the host's native binding,
// `proj.db` and the GEOID18 grid, each tarball and the grid checked against a
// pinned SHA-256 (manifest role `proj`), and PROJ-data's grids under `grids/`
// (`ensureGrids`: the pinned 1.25.0 catalog, then each grid checked against it;
// roles `gridCatalog` and `grid`).
//
// Nothing here is committed. Licenses: the NAIF kernels are checked against
// the SHA-256 pinned below; each pack's manifest names its source file, that
// hash and the span, and says the pack is derived from it (packs are never
// distributed). The EOP data is IERS's, via CelesTrak.
import { createHash } from "node:crypto";
import {
  copyFileSync,
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
import { gunzipSync } from "node:zlib";
import { GridCatalog } from "../src/engineering/gridCatalog.ts";
import {
  PROJ_DATA_CATALOG,
  PROJ_FILE_SHA256,
} from "../src/engineering/projPins.ts";
import { readDaf } from "../src/ephemeris/spk.ts";
import { writePack } from "../src/ephemeris/pack.ts";
import { EarthOrientationParameters } from "../src/time/eop.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import { GRID_SETS } from "./gridSets.mjs";
import { verifiedDownload } from "./verifiedDownload.mjs";

const NAIF = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels";
const ARTEMIS = "https://naif.jpl.nasa.gov/pub/naif/ARTEMIS/kernels/spk";
const DAY_MS = 86_400_000;
const DEFAULT_GRIDS = ["portfolio", "tests"];
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

const PROJ_RELEASE =
  "https://github.com/mmomtchev/proj.js/releases/download/v0.9.2";
const PROJ_CDN = "https://cdn.proj.org";

/**
 * The SHA-256 of each PROJ download, recorded 2026-11-05: proj.js v0.9.2's
 * release tarballs (PROJ 9.7.1 built to WebAssembly and native), keyed by
 * tarball name, and the GEOID18 grid (NOAA/NGS, 16,742,155 bytes). Setup
 * downloads the WebAssembly tarball and the host's native one only; the other
 * native hashes are pinned so any machine verifies what it fetches.
 */
export const PROJ_SHA256 = {
  "emscripten-wasm32.tar.gz":
    "ccd990a625607dc24225170632bd96dc67977ba48b14180435b69bf9d173ac88",
  "darwin-arm64.tar.gz":
    "0352f888a1923bbd2c3b616a7a7d0c07ab49552fe166a8b60b189173c791c9cb",
  "darwin-x64.tar.gz":
    "53edb3458b955ddea531dc9fb5fdf3f37d6dc9dae1800f1fd75145ebafd95145",
  "linux-x64.tar.gz":
    "6585d6909b248b0036a582a0ed715e8fc88b864398d7e742dcc1c85d14f3a373",
  "win32-x64.tar.gz":
    "90f6e199aa306bfb7f4e6960efd886e340b343c3199ec348c053e93c3b17b90b",
  "us_noaa_g2018u0.tif": PROJ_FILE_SHA256["us_noaa_g2018u0.tif"],
};

const PROJ_CREDIT =
  "PROJ (MIT) via proj.js (MIT, mmomtchev); proj.db carries the EPSG Dataset, IOGP, https://epsg.org/terms-of-use.html";

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
 * The wanted files of a gzipped ustar archive, by entry path → bytes. A minimal
 * reader (512-byte headers, the ustar "prefix" field, pax/GNU extension
 * entries skipped): regular files only, and an entry whose name is absolute or
 * has a ".." segment is refused. Throws if a wanted path is missing.
 */
export function extractTar(gz, wanted) {
  const tar = gunzipSync(gz);
  const found = new Map();
  const text = (at, length) => {
    const field = tar.subarray(at, at + length);
    const end = field.indexOf(0);
    return Buffer.from(end < 0 ? field : field.subarray(0, end)).toString(
      "utf8",
    );
  };
  for (let at = 0; at + 512 <= tar.length;) {
    if (tar.subarray(at, at + 512).every((b) => b === 0)) {
      break;
    }
    const prefix = text(at + 345, 155);
    const name = (prefix ? `${prefix}/` : "") + text(at, 100);
    const sizeField = text(at + 124, 12).trim() || "0";
    const size = /^[0-7]+$/.test(sizeField) ? parseInt(sizeField, 8) : NaN;
    const type = String.fromCharCode(tar[at + 156] || 0x30);
    if (!Number.isFinite(size)) {
      throw new Error(`tar: bad size in the header of ${name}`);
    }
    if (
      name.startsWith("/") ||
      /^[A-Za-z]:/.test(name) ||
      name.split(/[\\/]/).includes("..")
    ) {
      throw new Error(`tar: refusing entry "${name}"`);
    }
    const start = at + 512;
    if (start + size > tar.length) {
      throw new Error(`tar: ${name} runs past the end of the archive`);
    }
    if ((type === "0" || type === "\0") && wanted.includes(name)) {
      found.set(name, Uint8Array.from(tar.subarray(start, start + size)));
    }
    at = start + Math.ceil(size / 512) * 512;
  }
  for (const name of wanted) {
    if (!found.has(name)) {
      throw new Error(`tar: no ${name} in the archive`);
    }
  }
  return found;
}

/** A PROJ file with a pinned hash (PROJ_FILE_SHA256) must match it. */
function checkProjFile(name, bytes) {
  const pinned = PROJ_FILE_SHA256[name];
  if (pinned !== undefined && sha256(bytes) !== pinned) {
    throw new Error(
      `proj/${name}: SHA-256 mismatch with the pin (expected ${pinned}, got ${sha256(bytes)}); delete it and re-run setup`,
    );
  }
}

/** A pinned download of the PROJ set, checked against PROJ_SHA256. */
async function downloadPinned(url, name, log) {
  log(`  ${name}: downloading ${url}`);
  const bytes = await download(url);
  const actual = sha256(bytes);
  if (actual !== PROJ_SHA256[name]) {
    throw new Error(
      `${name}: SHA-256 mismatch (expected ${PROJ_SHA256[name]}, got ${actual})`,
    );
  }
  return bytes;
}

/**
 * PROJ into `<store>/proj/`: from the WebAssembly tarball, `proj_capi.mjs` and
 * `proj_capi.wasm` (the browser) and `proj.db`; from the host's native tarball,
 * `proj_capi.node` (Node); and the GEOID18 grid. A tarball is downloaded only
 * when a file it provides is missing or doesn't match the manifest's hash.
 * Returns the manifest entries (role `proj`). An unsupported host gets no
 * native build (a warning; the browser build still works).
 */
async function ensureProj(dir, previous, log) {
  const proj = join(dir, "proj");
  mkdirSync(proj, { recursive: true });
  const known = new Map(
    previous.filter((e) => e.role === "proj").map((e) => [e.file, e.sha256]),
  );
  const intact = (names) =>
    names.every((name) => {
      const path = join(proj, name);
      return (
        existsSync(path) &&
        known.get(`proj/${name}`) === sha256(readFileSync(path))
      );
    });
  const entries = [];
  const record = (name, bytes, tarball, sourceSha256) => {
    checkProjFile(name, bytes);
    entries.push({
      file: `proj/${name}`,
      role: "proj",
      sha256: sha256(bytes),
      sourceUrl: tarball,
      sourceSha256,
      credit: PROJ_CREDIT,
    });
  };

  const archives = [
    {
      tarball: "emscripten-wasm32.tar.gz",
      files: {
        "lib/binding/emscripten-wasm32/proj_capi.mjs": "proj_capi.mjs",
        "lib/binding/emscripten-wasm32/proj_capi.wasm": "proj_capi.wasm",
        "lib/binding/proj/proj.db": "proj.db",
      },
    },
  ];
  const platform = `${process.platform}-${process.arch}`;
  const native = `${platform}.tar.gz`;
  if (native in PROJ_SHA256) {
    archives.push({
      tarball: native,
      files: {
        [`lib/binding/${platform}/proj_capi.node`]: "proj_capi.node",
      },
    });
  } else {
    console.warn(
      `  proj: no native proj.js build for ${platform}; Node cannot load PROJ here (the browser build is fine)`,
    );
  }
  for (const { tarball, files } of archives) {
    const url = `${PROJ_RELEASE}/${tarball}`;
    const names = Object.values(files);
    if (intact(names)) {
      log(`  proj/${names.join(", ")}: present, verified`);
      for (const name of names) {
        record(name, readFileSync(join(proj, name)), url, PROJ_SHA256[tarball]);
      }
      continue;
    }
    const extracted = extractTar(
      await downloadPinned(url, tarball, log),
      Object.keys(files),
    );
    for (const [entry, name] of Object.entries(files)) {
      const bytes = extracted.get(entry);
      record(name, bytes, url, PROJ_SHA256[tarball]);
      store(join(proj, name), bytes);
    }
  }

  const grid = "us_noaa_g2018u0.tif";
  const gridPath = join(proj, grid);
  const gridUrl = `${PROJ_CDN}/${grid}`;
  let gridBytes;
  if (existsSync(gridPath)) {
    gridBytes = readFileSync(gridPath);
    if (sha256(gridBytes) !== PROJ_SHA256[grid]) {
      throw new Error(
        `${grid}: SHA-256 mismatch with the pin (delete ${gridPath} and re-run setup)`,
      );
    }
    log(`  proj/${grid}: present, verified`);
  } else {
    gridBytes = await downloadPinned(gridUrl, grid, log);
    store(gridPath, gridBytes);
  }
  entries.push({
    file: `proj/${grid}`,
    role: "proj",
    sha256: sha256(gridBytes),
    sourceUrl: gridUrl,
    credit: "NOAA/NGS GEOID18 (public domain), via cdn.proj.org",
  });
  return entries;
}

/** The members of a named grid set (`"*"`: all); an unknown name throws. */
function gridSet(set) {
  if (!Object.hasOwn(GRID_SETS, set)) {
    throw new Error(
      `--grids: unknown set "${set}" (known: ${Object.keys(GRID_SETS).join(", ")})`,
    );
  }
  return GRID_SETS[set];
}

/** Every set name, or a grid name, resolved to the catalog's non-removed names. */
function gridNames(catalog, sets) {
  const names = new Set();
  for (const set of sets) {
    const members = gridSet(set);
    const list =
      members === "*"
        ? [...catalog.entries.values()]
            .filter((e) => !e.removed)
            .map((e) => e.name)
        : members;
    for (const name of list) {
      const entry = catalog.get(name);
      if (!entry || entry.removed) {
        throw new Error(
          `--grids ${set}: ${name} is ${entry ? "removed from" : "not in"} the PROJ-data ${PROJ_DATA_CATALOG.version} catalog; fix scripts/gridSets.mjs`,
        );
      }
      names.add(name);
    }
  }
  return [...names];
}

const hasHash = (path, hash) =>
  existsSync(path) && sha256(readFileSync(path)) === hash;

/**
 * PROJ-data's catalog and the named grid sets into `<store>/grids/`.
 *
 * The catalog (`files.geojson`) and the license table
 * (`copyright_and_licenses.csv`) are fetched from the pinned 1.25.0 tag and
 * checked against PROJ_DATA_CATALOG; each grid comes from cdn.proj.org and is
 * checked against the catalog's size and hash (`verifiedDownload`). A stored
 * file is kept if it still matches; GEOID18 is copied from `proj/`. The two
 * catalog files are also copied into `proj/`, so a PROJ base holds a catalog.
 * Grids stored earlier but not in `sets` stay in the manifest while they still
 * match the catalog. Returns the manifest entries (roles `gridCatalog`,
 * `grid`).
 */
export async function ensureGrids(dir, sets, log = console.log) {
  const grids = join(dir, "grids");
  mkdirSync(grids, { recursive: true });
  const entries = [];

  const catalogFiles = [
    {
      file: "files.geojson",
      url: PROJ_DATA_CATALOG.catalogUrl,
      sha256: PROJ_DATA_CATALOG.catalogSha256,
      bytes: PROJ_DATA_CATALOG.catalogBytes,
    },
    {
      file: "copyright_and_licenses.csv",
      url: PROJ_DATA_CATALOG.licensesUrl,
      sha256: PROJ_DATA_CATALOG.licensesSha256,
      bytes: PROJ_DATA_CATALOG.licensesBytes,
    },
  ];
  for (const { file, url, sha256: hash, bytes } of catalogFiles) {
    const path = join(grids, file);
    if (hasHash(path, hash)) {
      log(`  grids/${file}: present, verified`);
    } else {
      log(`  grids/${file}: downloading ${url}`);
      await verifiedDownload(url, path, { sha256: hash, bytes });
    }
    // A PROJ base (proj/) holds the catalog too.
    const copy = join(dir, "proj", file);
    if (!hasHash(copy, hash)) {
      mkdirSync(join(dir, "proj"), { recursive: true });
      copyFileSync(path, copy);
    }
    entries.push({
      file: `grids/${file}`,
      role: "gridCatalog",
      sha256: hash,
      sourceUrl: url,
      credit: `OSGeo PROJ-data ${PROJ_DATA_CATALOG.version}`,
    });
  }

  const catalog = GridCatalog.parse(
    readFileSync(join(grids, "files.geojson"), "utf8"),
    readFileSync(join(grids, "copyright_and_licenses.csv"), "utf8"),
  );
  const names = gridNames(catalog, sets);
  if (sets.includes("all")) {
    const total = names.reduce((sum, name) => sum + catalog.get(name).bytes, 0);
    log(
      `  grids: all ${names.length} grids, ${(total / 1e6).toFixed(0)} MB in total`,
    );
  }
  const wanted = new Set(names);
  for (const name of names) {
    const grid = catalog.get(name);
    const path = join(grids, name);
    const url = `${PROJ_CDN}/${name}`;
    const proj = join(dir, "proj", name);
    if (hasHash(path, grid.sha256)) {
      log(`  grids/${name}: present, verified`);
    } else if (hasHash(proj, grid.sha256)) {
      copyFileSync(proj, path);
      log(`  grids/${name}: copied from proj/`);
    } else {
      log(`  grids/${name}: downloading ${url}`);
      await verifiedDownload(url, path, {
        sha256: grid.sha256,
        bytes: grid.bytes,
      });
    }
    entries.push({
      file: `grids/${name}`,
      role: "grid",
      sha256: grid.sha256,
      sourceUrl: url,
      credit: catalog.credit(name),
    });
  }
  // Grids stored by an earlier run with other sets stay listed while intact.
  for (const old of readPreviousFiles(dir)) {
    const name = old.file?.startsWith("grids/") ? old.file.slice(6) : "";
    const grid = old.role === "grid" ? catalog.get(name) : undefined;
    if (grid && !wanted.has(name) && hasHash(join(grids, name), grid.sha256)) {
      entries.push({
        file: old.file,
        role: "grid",
        sha256: grid.sha256,
        sourceUrl: `${PROJ_CDN}/${name}`,
        credit: catalog.credit(name),
      });
    }
  }
  return entries;
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
 * The previous manifest's `files` entries, or `[]` when there is no manifest,
 * it is unreadable, or it has no `files` array: everything is fetched again.
 */
export function readPreviousFiles(dir) {
  try {
    const { files } = JSON.parse(
      readFileSync(join(dir, "manifest.json"), "utf8"),
    );
    return Array.isArray(files) ? files : [];
  } catch {
    return [];
  }
}

/**
 * Download, verify and excerpt everything into the store, and write
 * `manifest.json`. `span` is `[y0, y1]`, both years included; `grids` names
 * the PROJ-data grid sets to store (`ensureGrids`, default `portfolio,tests`).
 */
export async function ensureFrameData(
  { span, grids = DEFAULT_GRIDS },
  log = console.log,
) {
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
  const previousFiles = readPreviousFiles(dir);
  const projEntries = await ensureProj(dir, previousFiles, log);
  const gridEntries = await ensureGrids(dir, grids, log);
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
    ...projEntries,
    ...gridEntries,
  ];
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({ span: [y0, y1], files }, null, 2),
  );
  log(`  manifest.json: ${files.length} files`);
  return { directory: dir, files };
}

/** "portfolio,tests" → ["portfolio", "tests"]; an unknown set is refused. */
export function parseGrids(text) {
  const sets = text.split(",").map((s) => s.trim());
  sets.forEach(gridSet);
  return sets;
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
