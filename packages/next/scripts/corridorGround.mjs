// The design globe's corridor against real ground: a one-off design step, not
// part of setup. It samples USGS 3DEP ground heights (NAVD88 metres, from the
// public 3DEP elevation service, no token) along the corridor's
// horizontal alignment, then fits a vertical alignment to them as a highway
// designer would (grades from 0.3% to 6%, PVIs with parabolic vertical
// curves of AASHTO's least K, the ends tied in, Huber's loss against the
// ground) and
// prints it, with its PVIs, K values, largest cut and fill, and the
// viaducts and tunnels where the ground is too far from it, for
// examples/design-globe/corridor.ts.
//
//   node scripts/corridorGround.mjs [--every 500] [--samples <file>]
//     [--profile <file>] (the profile against the ground, as JSON)
//
// The fit's own controls (--spacing, --share, --huber, --tunnel, --viaduct,
// --join) default to what made corridor.ts's profile.
//
// The samples are cached in <file> (default: samples/corridor-ground.json
// in the frames data directory, ~/.cesium-bench/frames, private to the
// user; one at the old default in the OS temporary directory is moved
// there), never in the repo: they are USGS's data, and only the fitted
// profile, which is design data, is committed. The cache is checked as it
// is read back (designTiles/sampleCache.mjs).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { framesDataDirectory } from "./frameData.mjs";
import { moduleRunner } from "./designTiles/moduleRunner.mjs";
import {
  checkedCorridorGround,
  legacySampleCacheFile,
  readSampleCache,
  sampleCacheFile,
  writeSampleCache,
} from "./designTiles/sampleCache.mjs";
import { SERVICE, groundHeights } from "./threeDep.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/** Points per request. */
const BATCH = 40;
/** Metres per US survey foot. */
const FT_US = 1200 / 3937;

function argument(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

/** The stations every `every` design units, and the end. */
function stations(alignment, every) {
  const out = [];
  for (let s = alignment.startStation; s < alignment.endStation; s += every) {
    out.push(s);
  }
  out.push(alignment.endStation);
  return out;
}

async function sample(file, every) {
  const runner = await moduleRunner(root);
  try {
    const { CORRIDOR_ALIGNMENT, corridorFrame } = await runner.import(
      join(root, "examples/design-globe/corridor.ts"),
    );
    const { Alignment } = await runner.import(
      join(root, "src/engineering/alignment.ts"),
    );
    const { EngineeringFrame } = await runner.import(
      join(root, "src/engineering/EngineeringFrame.ts"),
    );
    const { designTilesInputs } = await runner.import(
      join(root, "scripts/designTiles.mjs"),
    );
    const { proj, grids } = await designTilesInputs(framesDataDirectory());
    const frame = await EngineeringFrame.load(corridorFrame(), { proj, grids });
    // The horizontal alignment alone: the ground doesn't depend on the profile.
    const alignment = new Alignment({
      ...CORRIDOR_ALIGNMENT,
      vertical: undefined,
    });
    const points = stations(alignment, every).map((station) => {
      const [e, n] = alignment.pointAt(station);
      const g = frame.toGeodetic([e, n, 0]);
      return {
        station,
        longitude: (g.longitude * 180) / Math.PI,
        latitude: (g.latitude * 180) / Math.PI,
      };
    });
    for (let i = 0; i < points.length; i += BATCH) {
      const batch = points.slice(i, i + BATCH);
      const heights = await groundHeights(batch);
      batch.forEach((p, k) => {
        p.groundMeters = heights[k];
      });
      console.log(
        `  ${Math.min(i + BATCH, points.length)} of ${points.length}`,
      );
    }
    const out = {
      source: `USGS 3DEP (${SERVICE}), NAVD88 metres`,
      // The local date, as the corridor's other records are.
      sampled: new Date().toLocaleDateString("en-CA"),
      every,
      points,
    };
    writeSampleCache(file, out);
    // Read back as a later run would, so this run fits what it keeps.
    return checkedCorridorGround(out, file);
  } finally {
    await runner.close();
  }
}

const every = Number(argument("--every", "500"));
if (!(every > 0)) {
  throw new RangeError("corridorGround: --every must be a positive length");
}
const CACHE = "corridor-ground.json";
const file = argument("--samples", sampleCacheFile(CACHE));
/** The old default, moved on first use; not for a file given with --samples. */
const legacy =
  file === sampleCacheFile(CACHE) ? legacySampleCacheFile(CACHE) : undefined;
const samples =
  readSampleCache(file, checkedCorridorGround, legacy) ??
  (await sample(file, every));
console.log(
  `${samples.points.length} ground samples, ${samples.sampled}, every ${samples.every} ftUS (${file})`,
);
const stationsOf = samples.points.map((p) => p.station);
const ground = samples.points.map((p) => p.groundMeters / FT_US);

// ---- The fit ----

/**
 * The design controls: a 65 mph freeway. Grades within 6%, and at least
 * 0.3% so the road drains (a level tangent ponds in its gutters); each vertical
 * curve at least AASHTO's least K for stopping sight distance at 65 mph
 * (A Policy on Geometric Design of Highways and Streets, 2018, tables 3-35
 * and 3-37: crest 193, sag 157, feet per percent of grade change) and at
 * least 3V = 195 ft long; PVIs on whole 100 ft stations; curves in whole
 * 100 ft; grades to 0.01%.
 */
const MAX_GRADE = 0.06;
const MIN_GRADE = 0.003;
const CREST_K = 193;
const SAG_K = 157;
const MIN_CURVE = 200;
/** The first PVIs' spacing, before the ones that do least are taken out. */
const FIRST_SPACING = Number(argument("--spacing", "3000"));
/**
 * A PVI is taken out while the fit's loss against the ground stays within
 * this share of the first fit's (every 3,000 ft).
 */
const COST_SHARE = Number(argument("--share", "1.05"));
/** The weight of the ends' samples: the profile ties in to the ground there. */
const TIE_IN = 1_000;
/** Huber's threshold, ftUS. */
const HUBER = Number(argument("--huber", "40"));

/** Solves A x = b (A symmetric positive definite, dense), by Cholesky. */
function solve(A, b) {
  const n = b.length;
  const L = A.map((row) => row.slice());
  for (let j = 0; j < n; j++) {
    let d = L[j][j];
    for (let k = 0; k < j; k++) {
      d -= L[j][k] * L[j][k];
    }
    if (!(d > 0)) {
      throw new Error("corridorGround: the fit is singular");
    }
    L[j][j] = Math.sqrt(d);
    for (let i = j + 1; i < n; i++) {
      let v = L[i][j];
      for (let k = 0; k < j; k++) {
        v -= L[i][k] * L[j][k];
      }
      L[i][j] = v / L[j][j];
    }
  }
  const y = new Array(n);
  for (let i = 0; i < n; i++) {
    let v = b[i];
    for (let k = 0; k < i; k++) {
      v -= L[i][k] * y[k];
    }
    y[i] = v / L[i][i];
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let v = y[i];
    for (let k = i + 1; k < n; k++) {
      v -= L[k][i] * x[k];
    }
    x[i] = v / L[i][i];
  }
  return x;
}

/**
 * The profile's elevation at `s`: PVIs at `at` with elevations `z`, a
 * symmetric parabola of length `curves[j]` at each interior PVI.
 */
function profileAt(at, z, curves, s) {
  let j = 0;
  while (j < at.length - 2 && s > at[j + 1]) {
    j++;
  }
  // s is in [at[j], at[j + 1]]; the curve at either end may reach it.
  const grade = (k) => (z[k + 1] - z[k]) / (at[k + 1] - at[k]);
  for (const k of [j, j + 1]) {
    if (k > 0 && k < at.length - 1 && Math.abs(s - at[k]) < curves[k] / 2) {
      const [g0, g1, L] = [grade(k - 1), grade(k), curves[k]];
      const x = s - (at[k] - L / 2);
      return z[k] - (g0 * L) / 2 + g0 * x + ((g1 - g0) * x * x) / (2 * L);
    }
  }
  return z[j] + grade(j) * (s - at[j]);
}

/** Each interior PVI's curve: the least K's length, in whole 100 ft, room allowing. */
function curvesFor(at, z) {
  const curves = at.map(() => 0);
  for (let k = 1; k < at.length - 1; k++) {
    const a =
      ((z[k + 1] - z[k]) / (at[k + 1] - at[k]) -
        (z[k] - z[k - 1]) / (at[k] - at[k - 1])) *
      100;
    const K = a < 0 ? CREST_K : SAG_K;
    curves[k] = Math.max(MIN_CURVE, Math.ceil((K * Math.abs(a)) / 100) * 100);
  }
  return curves;
}

/** Whether every curve fits between its neighbours' and every grade is from 0.3% to 6%. */
function feasible(at, z, curves) {
  for (let k = 0; k < at.length - 1; k++) {
    const gap = at[k + 1] - at[k];
    if (curves[k] / 2 + curves[k + 1] / 2 > gap) {
      return false;
    }
    const g = Math.abs((z[k + 1] - z[k]) / gap);
    if (g > MAX_GRADE + 1e-9 || g < MIN_GRADE - 1e-9) {
      return false;
    }
  }
  return true;
}

/**
 * The PVI elevations nearest the ground in least squares, for these PVIs
 * and curves (the profile is linear in them), with any grade over 6% pulled
 * back to it, and any under 0.3% pushed out to it on its own side of level,
 * by a penalty that grows until none is out of range.
 */
function fitElevations(at, curves, weights) {
  const n = at.length;
  // Each sample's row: the profile's coefficients on the PVIs near it.
  const rows = stationsOf.map((s) => {
    const row = at.map(() => 0);
    let j = 0;
    while (j < at.length - 2 && s > at[j + 1]) {
      j++;
    }
    const near = [j - 1, j, j + 1, j + 2].filter((k) => k >= 0 && k < n);
    for (const k of near) {
      const e = new Array(n).fill(0);
      e[k] = 1;
      row[k] = profileAt(at, e, curves, s);
    }
    row.nonzero = near.filter((k) => row[k] !== 0);
    return row;
  });
  const penalties = [];
  for (let round = 0; round < 60; round++) {
    const A = at.map(() => new Array(n).fill(0));
    const b = new Array(n).fill(0);
    rows.forEach((row, i) => {
      const w = weights[i];
      for (const p of row.nonzero) {
        b[p] += w * row[p] * ground[i];
        for (const q of row.nonzero) {
          A[p][q] += w * row[p] * row[q];
        }
      }
    });
    // A tiny ridge keeps a PVI with no samples near it determined.
    for (let p = 0; p < n; p++) {
      A[p][p] += 1e-9;
    }
    for (const { k, target, weight } of penalties) {
      // weight (z[k+1] − z[k] − target)²
      A[k][k] += weight;
      A[k + 1][k + 1] += weight;
      A[k][k + 1] -= weight;
      A[k + 1][k] -= weight;
      b[k] -= weight * target;
      b[k + 1] += weight * target;
    }
    const z = solve(A, b);
    let over = false;
    for (let k = 0; k < n - 1; k++) {
      const gap = at[k + 1] - at[k];
      const g = (z[k + 1] - z[k]) / gap;
      const existing = penalties.find((p) => p.k === k);
      const steep = Math.abs(g) > MAX_GRADE * 0.999;
      // A grade held off level keeps its side of it.
      const side = existing?.flat
        ? Math.sign(existing.target)
        : Math.sign(g) || 1;
      const flat = !steep && side * g < MIN_GRADE * 1.001;
      if (steep || flat) {
        if (existing) {
          existing.weight *= 4;
        } else {
          const target = steep
            ? Math.sign(g) * MAX_GRADE * 0.995 * gap
            : side * MIN_GRADE * 1.005 * gap;
          penalties.push({ k, target, weight: 10, flat });
        }
        over = over || Math.abs(g) > MAX_GRADE || side * g < MIN_GRADE;
      }
    }
    if (!over) {
      return z;
    }
  }
  throw new Error("corridorGround: the grades won't come within 0.3% to 6%");
}

/** The fit for these PVI stations: elevations, curves, and its cut and fill. */
/** Huber's loss at r: squared within HUBER ftUS, linear past it. */
const huber = (r) =>
  Math.abs(r) <= HUBER ? r * r : 2 * HUBER * Math.abs(r) - HUBER * HUBER;

/**
 * The fit for these PVI stations: elevations, curves, and its cut and fill.
 * Huber's loss (iteratively reweighted), so the profile follows the ground
 * where a road can and leaves a ridge or a valley it can't follow to a
 * tunnel or a viaduct, rather than splitting the difference.
 */
/** The profile less the ground at each sample: fill positive, cut negative. */
const residuals = (at, z, curves) =>
  stationsOf.map((s, i) => profileAt(at, z, curves, s) - ground[i]);

function fit(at) {
  let curves = at.map(() => 0);
  let weights = ground.map(() => 1);
  weights[0] = TIE_IN;
  weights[weights.length - 1] = TIE_IN;
  let z;
  for (let i = 0; i < 12; i++) {
    z = fitElevations(at, curves, weights);
    curves = curvesFor(at, z);
    weights = residuals(at, z, curves).map((r) =>
      Math.abs(r) <= HUBER ? 1 : HUBER / Math.abs(r),
    );
    // The project's ends tie in to the existing ground.
    weights[0] = TIE_IN;
    weights[weights.length - 1] = TIE_IN;
  }
  z = fitElevations(at, curves, weights);
  const d = residuals(at, z, curves);
  return {
    at,
    z,
    curves,
    worst: Math.max(...d.map(Math.abs)),
    rms: Math.sqrt(d.reduce((sum, v) => sum + v * v, 0) / d.length),
    cost: d.reduce((sum, v) => sum + huber(v), 0),
  };
}

const first = stationsOf[0];
const last = stationsOf[stationsOf.length - 1];
const pvis = [first];
for (
  let s = first + FIRST_SPACING;
  s < last - FIRST_SPACING / 2;
  s += FIRST_SPACING
) {
  pvis.push(s);
}
pvis.push(last);
let best = fit(pvis);
const dense = best;
console.log(
  `first fit: ${pvis.length} PVIs, RMS ${dense.rms.toFixed(1)} ftUS, largest ${dense.worst.toFixed(1)} ftUS`,
);
// Take out the PVI whose grade change is least while the fit stays within
// the limit and its curves fit; a PVI that can't go is kept.
const kept = new Set([first, last]);
/** The interior PVIs not yet kept, least grade change first. */
function removable({ at, z }) {
  const grade = (k) => (z[k + 1] - z[k]) / (at[k + 1] - at[k]);
  return at
    .map((s, k) => ({ s, k }))
    .filter(({ s, k }) => k > 0 && k < at.length - 1 && !kept.has(s))
    .map(({ s, k }) => ({ s, a: Math.abs(grade(k) - grade(k - 1)) }))
    .sort((x, y) => x.a - y.a);
}
for (let removed = true; removed;) {
  removed = false;
  const from = best.at;
  for (const { s } of removable(best)) {
    const trial = fit(from.filter((t) => t !== s));
    if (
      trial.cost <= dense.cost * COST_SHARE &&
      feasible(trial.at, trial.z, trial.curves)
    ) {
      best = trial;
      removed = true;
      break;
    }
    kept.add(s);
  }
}
if (!feasible(best.at, best.z, best.curves)) {
  throw new Error(
    "corridorGround: the curves overlap or a grade is outside 0.3% to 6%",
  );
}

// Rounded as a designer writes it: the start elevation to 0.01 ft and each
// grade to 0.01%, carried from the rounded elevation so far (no drift), and
// kept from 0.3% to 6% (both on the 0.01% grid).
const at = best.at;
const startElevation = Math.round(best.z[0] * 100) / 100;
const grades = [];
const z = [startElevation];
for (let k = 0; k < at.length - 1; k++) {
  const raw = (best.z[k + 1] - z[k]) / (at[k + 1] - at[k]);
  const magnitude = Math.round(Math.abs(raw) * 10_000) / 10_000;
  const g =
    (Math.sign(raw) || 1) * Math.min(MAX_GRADE, Math.max(MIN_GRADE, magnitude));
  grades.push(g);
  z.push(z[k] + g * (at[k + 1] - at[k]));
}
const curves = curvesFor(at, z);
if (!feasible(at, z, curves)) {
  throw new Error("corridorGround: rounding broke a curve or a grade");
}

const segments = [];
for (let k = 0; k < at.length - 1; k++) {
  const tangent = at[k + 1] - at[k] - curves[k] / 2 - curves[k + 1] / 2;
  if (tangent > 0) {
    segments.push({ kind: "grade", length: tangent, grade: grades[k] });
  }
  if (k + 1 < at.length - 1) {
    segments.push({
      kind: "parabola",
      length: curves[k + 1],
      startGrade: grades[k],
      endGrade: grades[k + 1],
    });
  }
}
const d = stationsOf.map((s, i) => profileAt(at, z, curves, s) - ground[i]);
const worstAt = (sign) => {
  let i = 0;
  d.forEach((v, j) => {
    if (sign * v > sign * d[i]) {
      i = j;
    }
  });
  return { station: stationsOf[i], by: sign * d[i] };
};
const fill = worstAt(1);
const cut = worstAt(-1);

// Structures: a viaduct where the fill passes VIADUCT_FILL, a tunnel where the
// cut passes TUNNEL_CUT; each sample stands for half the way to its
// neighbours, and a structure's ends are rounded out to whole 100 ft.
const TUNNEL_CUT = Number(argument("--tunnel", "80"));
const VIADUCT_FILL = Number(argument("--viaduct", "50"));
/** Structures of a kind this close are one, over ground on their side. */
const JOIN = Number(argument("--join", "1500"));
const kindAt = (v) =>
  v > VIADUCT_FILL ? "viaduct" : v < -TUNNEL_CUT ? "tunnel" : undefined;
const structures = [];
d.forEach((v, i) => {
  const kind = kindAt(v);
  if (kind === undefined) {
    return;
  }
  // Half the way to a neighbour; a viaduct reaches on to where the ground
  // meets the road, if that is further (never ground through its deck).
  const toward = (j) => {
    const half = (stationsOf[i] + stationsOf[j]) / 2;
    if (kind !== "viaduct" || d[j] >= 0) {
      return half;
    }
    const meets =
      stationsOf[j] + ((stationsOf[i] - stationsOf[j]) * d[j]) / (d[j] - d[i]);
    return Math.abs(meets - stationsOf[i]) > Math.abs(half - stationsOf[i])
      ? meets
      : half;
  };
  const from = i === 0 ? first : toward(i - 1);
  const to = i === stationsOf.length - 1 ? last : toward(i + 1);
  const previous = structures[structures.length - 1];
  // Joined only over ground on its own side of the road (fill under a
  // viaduct, cut over a tunnel): never ground through a deck.
  const sameSide = (j) => (kind === "viaduct" ? d[j] > 0 : d[j] < 0);
  let between = true;
  for (
    let j = i - 1;
    j >= 0 && stationsOf[j] > (previous?.toStation ?? 0);
    j--
  ) {
    between &&= sameSide(j);
  }
  if (previous?.kind === kind && from - previous.toStation <= JOIN && between) {
    previous.toStation = to;
  } else {
    structures.push({ kind, fromStation: from, toStation: to });
  }
});
structures.forEach((st, i) => {
  st.fromStation = Math.max(first, Math.floor(st.fromStation / 100) * 100);
  st.toStation = Math.min(last, Math.ceil(st.toStation / 100) * 100);
  // A tunnel's portal can open onto a viaduct: they meet, never overlap.
  const before = structures[i - 1];
  if (before !== undefined && st.fromStation < before.toStation) {
    const meet = Math.round((st.fromStation + before.toStation) / 200) * 100;
    before.toStation = meet;
    st.fromStation = meet;
  }
});
for (const st of structures) {
  const inside = stationsOf.flatMap((s, i) =>
    s >= st.fromStation && s <= st.toStation ? [d[i]] : [],
  );
  st.deepest =
    st.kind === "viaduct" ? Math.max(...inside) : -Math.min(...inside);
}
const within = (s) =>
  structures.some((st) => s >= st.fromStation && s <= st.toStation);
const earth = stationsOf.flatMap((s, i) => (within(s) ? [] : [d[i]]));
console.log(`\n${structures.length} structures:`);
for (const st of structures) {
  console.log(
    `  ${st.kind} ${st.fromStation}–${st.toStation} (${st.toStation - st.fromStation} ft), ${st.kind === "viaduct" ? "fill" : "cut"} to ${st.deepest.toFixed(0)} ftUS`,
  );
}
// A viaduct's piers reach its deepest fill and 15 ftUS more, in whole 5 ftUS:
// below the ground, the terrain hides the rest.
const structureData = structures.map((st) =>
  st.kind === "viaduct"
    ? [
        st.kind,
        st.fromStation,
        st.toStation,
        Math.ceil((st.deepest + 15) / 5) * 5,
      ]
    : [st.kind, st.fromStation, st.toStation],
);
console.log(`\nStructures (corridor.ts):\n${JSON.stringify(structureData)}`);
const lengthOf = (kind) =>
  structures
    .filter((st) => st.kind === kind)
    .reduce((sum, st) => sum + st.toStation - st.fromStation, 0);
console.log(
  `viaducts ${lengthOf("viaduct")} ft, tunnels ${lengthOf("tunnel")} ft of ${last - first}; outside them fill to ${Math.max(...earth).toFixed(1)} ftUS, cut to ${(-Math.min(...earth)).toFixed(1)} ftUS`,
);

const pct = (g) => `${(g * 100).toFixed(2)}%`;
console.log(`\n${at.length} PVIs (the start and end included):`);
for (let k = 0; k < at.length; k++) {
  if (k === 0 || k === at.length - 1) {
    console.log(`  PVI ${at[k]}: ${z[k].toFixed(2)} ftUS`);
    continue;
  }
  const a = (grades[k] - grades[k - 1]) * 100;
  console.log(
    `  PVI ${at[k]}: ${z[k].toFixed(2)} ftUS, ${pct(grades[k - 1])} to ${pct(grades[k])}, ${a < 0 ? "crest" : "sag"} L ${curves[k]} ft, K ${(curves[k] / Math.abs(a)).toFixed(0)}`,
  );
}
console.log(
  `\nRMS ${best.rms.toFixed(1)} ftUS; largest fill ${fill.by.toFixed(1)} ftUS (${(fill.by * FT_US).toFixed(1)} m) at ${fill.station}; largest cut ${cut.by.toFixed(1)} ftUS (${(cut.by * FT_US).toFixed(1)} m) at ${cut.station}`,
);
console.log(
  `\nSegments (corridor.ts):\n${JSON.stringify({ startElevation, segments })}`,
);
if (argument("--profile", undefined) !== undefined) {
  writeFileSync(
    argument("--profile", ""),
    JSON.stringify({
      at,
      z,
      curves,
      stations: stationsOf,
      ground,
      profile: stationsOf.map((s) => profileAt(at, z, curves, s)),
    }),
  );
}
