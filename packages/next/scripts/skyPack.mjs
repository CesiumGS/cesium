// Builds a sky data pack on this machine (§13.29): fetches a recipe's
// sources into the sky store, then writes manifest.json, points.bin and
// background.bin. Nothing here is committed, and a pack is never marked
// distributable: a person edits the manifest after review.
//
//   npm run sky -- fetch [--recipe id]
//   npm run sky -- build [--recipe id] [--background 1024|2048] [--name pack]
//                        [--catalog file --allow-unsettled-terms]
//   npm run sky -- info
//
// The store is SKY_DATA_DIR, else ~/.cesium-bench/sky. A pack goes to
// <store>/packs/<name> (default "default"), where the dev server finds it.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseManifest } from "../src/atmosphere/skyPack.ts";
import { STAR_FLOATS } from "../src/atmosphere/stars.ts";
import {
  buildBackground,
  backgroundScale,
  floatToHalf,
  meanLuminance,
} from "./skyPack/background.mjs";
import {
  DirectionIndex,
  direction,
  fitFluxCurve,
  illuminanceOf,
  luminanceOf,
  mergeHybrid,
  starColor,
} from "./skyPack/calibrate.mjs";
import { readExr } from "./skyPack/exr.mjs";
import { PEAK_THRESHOLD, findPeaks } from "./skyPack/peaks.mjs";
import { DEFAULT_RECIPE, RECIPES } from "./skyPack/recipes.mjs";
import { skyStoreDirectory } from "./skyStore.mjs";
import { verifiedDownload } from "./verifiedDownload.mjs";

const SPLIT = 7;

/** Whether `path` lies inside a git worktree (a `.git` above it). */
export function insideWorktree(path) {
  let dir = resolve(path);
  for (;;) {
    if (existsSync(join(dir, ".git"))) {
      return true;
    }
    const up = dirname(dir);
    if (up === dir) {
      return false;
    }
    dir = up;
  }
}

/** One line of CSV, with quoted fields. */
function csvFields(line) {
  const out = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field);
  return out;
}

/** HYG's columns (ra in hours, dec in degrees, mag, ci), without the Sun. */
export function readCatalog(text) {
  const lines = text.split(/\r?\n/);
  const head = csvFields(lines[0]);
  const col = Object.fromEntries(head.map((h, i) => [h, i]));
  for (const need of ["ra", "dec", "mag", "ci"]) {
    if (!(need in col)) {
      throw new Error(`the catalog has no "${need}" column`);
    }
  }
  const stars = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) {
      continue;
    }
    const f = csvFields(lines[i]);
    const ra = Number(f[col.ra]) * 15;
    const dec = Number(f[col.dec]);
    const mag = Number(f[col.mag]);
    if (
      ![ra, dec, mag].every(Number.isFinite) ||
      f[col.proper] === "Sol" ||
      mag < -20
    ) {
      continue;
    }
    const ci = f[col.ci] === "" ? 0.6 : Number(f[col.ci]);
    stars.push({ ra, dec, mag, bv: Number.isFinite(ci) ? ci : 0.6 });
  }
  return stars;
}

/**
 * Builds a pack into `outDir` from local source files.
 *
 * @param {object} options
 * @param {string} options.outDir
 * @param {Record<string, string>} options.files  source id to a local path.
 * @param {string} [options.recipe]
 * @param {number} [options.backgroundSize]
 * @param {string} [options.catalog]  a local catalog file, in HYG's columns.
 * @param {boolean} [options.allowUnsettledTerms]
 * @param {(line: string) => void} [options.log]
 */
export function buildPack(options) {
  const {
    outDir,
    files,
    recipe: id = DEFAULT_RECIPE,
    backgroundSize = 1024,
    catalog,
    allowUnsettledTerms = false,
    log = () => {},
  } = options;
  const recipe = RECIPES[id];
  if (!recipe) {
    throw new Error(
      `no recipe "${id}" (have ${Object.keys(RECIPES).join(", ")})`,
    );
  }
  if (catalog && !allowUnsettledTerms) {
    throw new Error(
      "--catalog needs --allow-unsettled-terms: a catalog supplied here has terms this script has not checked",
    );
  }
  if (insideWorktree(outDir)) {
    throw new Error(
      `${outDir} is inside a git worktree: sky data stays outside the repository`,
    );
  }
  if (
    ![1024, 2048].includes(backgroundSize) &&
    !(backgroundSize >= 1 && (backgroundSize & (backgroundSize - 1)) === 0)
  ) {
    throw new Error("the background size must be a power of two");
  }
  const sources = recipe.sources.map((s) => ({ ...s }));
  const catalogText = readFileSync(catalog ?? files.catalog, "utf8");
  const catalogSource = sources.find((s) => s.id === "catalog");
  if (catalog) {
    Object.assign(catalogSource, {
      name: `supplied locally: ${basename(catalog)}`,
      url: "",
      credit: "As the person who built this pack states",
      terms: "Supplied locally. This script did not check its terms.",
    });
  }
  log("reading the bright-star layer");
  const points = readExr(readFileSync(files.points));
  const { width: W, height: H, channels: p } = points;
  const lum = new Float32Array(W * H);
  for (let i = 0; i < lum.length; i++) {
    lum[i] = 0.2126 * p.R[i] + 0.7152 * p.G[i] + 0.0722 * p.B[i];
  }
  log("finding peaks");
  const peaks = findPeaks(lum, W, H, [p.R, p.G, p.B]);
  log(`${peaks.length} peaks`);
  const rows = readCatalog(catalogText);
  const catalogStars = rows.map((r) => ({
    dir: direction(r.ra, r.dec),
    mag: r.mag,
    color: starColor(r.bv),
  }));
  const peakDirs = peaks.map((q) => direction(q.ra, q.dec));
  const index = new DirectionIndex(peakDirs, (1.8 * 2 * Math.PI) / W);
  const pairs = [];
  for (const star of catalogStars) {
    const n = index.nearest(star.dir);
    if (n >= 0) {
      pairs.push({ flux: peaks[n].flux, magnitude: star.mag });
    }
  }
  log(`${pairs.length} peaks matched to the catalog`);
  const curve = fitFluxCurve(pairs);
  const mapStars = peaks.map((q, i) => {
    const y = luminanceOf(q.color);
    return {
      dir: peakDirs[i],
      mag: curve(q.flux),
      color: y > 0 ? q.color.map((c) => c / y) : [1, 1, 1],
    };
  });
  const stars = mergeHybrid(catalogStars, mapStars, SPLIT);
  log(`${stars.length} stars`);
  log("reading the Milky Way layer");
  const layer = readExr(readFileSync(files.background));
  const scale = backgroundScale(curve.faintConstant, layer.width);
  const levels = Math.log2(backgroundSize) + 1;
  const mean = meanLuminance(layer, scale);
  log("building the background");
  const faces = buildBackground(layer, backgroundSize, levels, scale);

  // Files.
  const pointBytes = Buffer.alloc(32 + stars.length * STAR_FLOATS * 4);
  pointBytes.write("CSKYPTS1");
  pointBytes.writeUInt32LE(stars.length, 8);
  pointBytes.writeUInt32LE(STAR_FLOATS, 12);
  const pf = new Float32Array(stars.length * STAR_FLOATS);
  stars.forEach((s, i) => {
    pf.set([...s.dir, illuminanceOf(s.mag), ...s.color, 0], i * STAR_FLOATS);
  });
  Buffer.from(pf.buffer).copy(pointBytes, 32);
  let texels = 0;
  for (let l = 0; l < levels; l++) {
    texels += Math.max(1, backgroundSize >> l) ** 2;
  }
  const bgBytes = Buffer.alloc(32 + 6 * texels * 8);
  bgBytes.write("CSKYBG01");
  bgBytes.writeUInt32LE(backgroundSize, 8);
  bgBytes.writeUInt32LE(6, 12);
  bgBytes.writeUInt32LE(levels, 16);
  let at = 32;
  for (const face of faces) {
    for (const level of face) {
      for (const v of level) {
        bgBytes.writeUInt16LE(floatToHalf(v), at);
        at += 2;
      }
    }
  }
  const manifest = {
    format: 1,
    name: recipe.name,
    distributable: false,
    sources: sources.map(({ name, url, credit, terms }) => ({
      name,
      url,
      credit,
      terms,
    })),
    credits: catalog
      ? [
          ...recipe.credits.slice(0, 2),
          `Catalog supplied locally: ${basename(catalog)}`,
        ]
      : recipe.credits,
    modelled: recipe.modelled,
    points: {
      file: "points.bin",
      count: stars.length,
      floatsPerStar: STAR_FLOATS,
    },
    background: {
      file: "background.bin",
      size: backgroundSize,
      levels,
      meanLuminance: mean,
      holdsFaintStars: true,
    },
    calibration: {
      faintConstant: curve.faintConstant,
      catalogSplitMagnitude: SPLIT,
      peakThreshold: PEAK_THRESHOLD,
      matchedStars: pairs.length,
      peaks: peaks.length,
    },
  };
  parseManifest(manifest); // our own output must pass the reader's checks
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "points.bin"), pointBytes);
  writeFileSync(join(outDir, "background.bin"), bgBytes);
  writeFileSync(
    join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}

/** The SHA-256 of a file, hex. */
function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** Downloads a recipe's sources into `<store>/downloads/<recipe>/`, verified. */
export async function fetchSources(recipeId, store, log = console.log) {
  const recipe = RECIPES[recipeId];
  const dir = join(store, "downloads", recipeId);
  mkdirSync(dir, { recursive: true });
  const files = {};
  for (const s of recipe.sources) {
    const path = join(dir, s.file);
    files[s.id] = path;
    if (
      existsSync(path) &&
      statSync(path).size === s.bytes &&
      sha256(path) === s.sha256
    ) {
      log(`${s.file}: already here, verified`);
      continue;
    }
    log(
      `${s.file}: ${(s.bytes / 1e6).toFixed(0)} MB from ${new URL(s.url).host}`,
    );
    await verifiedDownload(s.url, path, { sha256: s.sha256, bytes: s.bytes });
  }
  return files;
}

function option(args, name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main(args) {
  const [command] = args;
  const store = skyStoreDirectory();
  const recipe = option(args, "recipe") ?? DEFAULT_RECIPE;
  if (command === "fetch") {
    await fetchSources(recipe, store);
  } else if (command === "build") {
    const files = await fetchSources(recipe, store);
    const outDir = join(store, "packs", option(args, "name") ?? "default");
    const manifest = buildPack({
      outDir,
      files,
      recipe,
      backgroundSize: Number(option(args, "background") ?? 1024),
      catalog: option(args, "catalog"),
      allowUnsettledTerms: args.includes("--allow-unsettled-terms"),
      log: console.log,
    });
    console.log(
      `${manifest.points.count} stars, background ${manifest.background.size}, mean ${manifest.background.meanLuminance.toExponential(2)} cd/m2 -> ${outDir}`,
    );
  } else if (command === "info") {
    console.log(`store: ${store}`);
    const packs = join(store, "packs");
    for (const name of existsSync(packs) ? readdirSync(packs) : []) {
      const m = JSON.parse(
        readFileSync(join(packs, name, "manifest.json"), "utf8"),
      );
      console.log(
        `  ${name}: ${m.name}, ${m.points.count} stars, distributable ${m.distributable}`,
      );
    }
  } else {
    console.error("usage: npm run sky -- fetch | build | info");
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
