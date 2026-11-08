// The design globe's corridor's daylight lines: a one-off design step, not
// part of setup. It samples USGS 3DEP ground heights (NAVD88 metres, from
// the public 3DEP elevation service, no token) in cross-sections along the
// corridor's earthwork, then finds where each side slope
// (examples/design-globe/sideSlopes.ts) meets the ground, and writes each
// section's rises to examples/design-globe/corridorDaylight.ts.
//
//   node scripts/corridorDaylight.mjs [--along 50] [--across 10]
//     [--reach 150] [--samples <file>]
//
// A section every `--along` ftUS of station on each earthwork stretch (and
// at its ends), ground every `--across` ftUS from each hinge out to
// `--reach` (further where a slope hasn't met the ground by then), linear
// between samples. The samples are cached in <file> (default:
// samples/corridor-sections.json in the frames data directory,
// ~/.cesium-bench/frames, private to the user; a <file> of your own must be
// in a folder only you can write), never in the repo: they are
// USGS's data, and only the daylight rises, which are design data, are
// committed. The cache is checked as it is read back
// (designTiles/sampleCache.mjs), since its date goes into the generated
// corridorDaylight.ts.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { framesDataDirectory } from "./frameData.mjs";
import { moduleRunner } from "./designTiles/moduleRunner.mjs";
import {
  SAMPLED_DATE,
  checkedCorridorSections,
  readSampleCache,
  sampleCacheFile,
  writeSampleCache,
} from "./designTiles/sampleCache.mjs";
import { MAX_BATCH, SERVICE, groundHeights } from "./threeDep.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
/** Metres per US survey foot. */
const FT_US = 1200 / 3937;
/** Requests in flight at once. */
const PARALLEL = 3;
/** Where a slope hasn't met the ground: searched this many times the reach, in turn. */
const EXTENSIONS = [2, 4, 8];

function argument(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

const along = Number(argument("--along", "50"));
const across = Number(argument("--across", "10"));
const reach = Number(argument("--reach", "150"));
if (!(along > 0 && across > 0 && reach > across)) {
  throw new RangeError(
    "corridorDaylight: --along and --across must be positive, --reach more than --across",
  );
}
const CACHE = "corridor-sections.json";
const file = argument("--samples", sampleCacheFile(CACHE));

const runner = await moduleRunner(root);
try {
  const { CORRIDOR_ALIGNMENT, corridorFrame } = await runner.import(
    join(root, "examples/design-globe/corridor.ts"),
  );
  const { EARTHWORK, HINGE_RISE, SIDE_SLOPES, slopeSection } =
    await runner.import(join(root, "examples/design-globe/sideSlopes.ts"));
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
  const alignment = new Alignment(CORRIDOR_ALIGNMENT);

  // The cache: ground heights by "station,offset", NAVD88 metres.
  const cache = {
    source: `USGS 3DEP (${SERVICE}), NAVD88 metres`,
    ...(readSampleCache(file, checkedCorridorSections) ?? {
      sampled: new Date().toLocaleDateString("en-CA"),
      ground: {},
    }),
  };
  const key = (s, o) => `${s},${o}`;

  /** Samples every point of `wanted` ([station, offset]) not in the cache. */
  async function sample(wanted) {
    const missing = wanted.filter(([s, o]) => !(key(s, o) in cache.ground));
    if (missing.length === 0) {
      return;
    }
    const batches = [];
    for (let i = 0; i < missing.length; i += MAX_BATCH) {
      batches.push(missing.slice(i, i + MAX_BATCH));
    }
    let done = 0;
    const work = async () => {
      for (let batch = batches.shift(); batch; batch = batches.shift()) {
        const points = batch.map(([s, o]) => {
          const [e, n] = alignment.pointAt(s, o);
          const g = frame.toGeodetic([e, n, 0]);
          return {
            longitude: (g.longitude * 180) / Math.PI,
            latitude: (g.latitude * 180) / Math.PI,
          };
        });
        const heights = await groundHeights(points);
        batch.forEach(([s, o], k) => {
          cache.ground[key(s, o)] = heights[k];
        });
        done += batch.length;
        console.log(`  ${done} of ${missing.length} points`);
        writeSampleCache(file, cache);
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, work));
  }

  // The sections: every `along` of station on each stretch, and its ends.
  const sections = EARTHWORK.flatMap((range) => {
    const out = [range.fromStation];
    for (
      let s = Math.floor(range.fromStation / along) * along + along;
      s < range.toStation;
      s += along
    ) {
      out.push(s);
    }
    out.push(range.toStation);
    return out;
  });
  const offsetsTo = (side, far) => {
    const out = [];
    for (let o = SIDE_SLOPES.hinge; o <= far + 1e-9; o += across) {
      out.push(side * o);
    }
    return out;
  };

  /**
   * Where a side's slope meets the ground: its rise over the hinge (negative
   * in fill), or undefined if not within the sampled offsets. The ground
   * is linear between the samples.
   */
  function rise(station, side, far) {
    const offsets = offsetsTo(side, far);
    const ground = offsets.map((o) => cache.ground[key(station, o)] / FT_US);
    const at = (run) => {
      const x = run / across;
      const i = Math.min(offsets.length - 2, Math.floor(x));
      const t = x - i;
      return ground[i] + (ground[i + 1] - ground[i]) * t;
    };
    const hinge = alignment.elevationAt(station) + HINGE_RISE;
    const longest = (offsets.length - 1) * across;
    // Ground over the slope that meets it `h` above the hinge, at its daylight.
    const over = (h) => {
      const run = slopeSection(h).daylight[0];
      return run > longest ? undefined : at(run) - (hinge + h);
    };
    const sign = at(0) >= hinge ? 1 : -1;
    const step = 0.05;
    let lo = 0;
    for (let h = step; ; h += step) {
      const v = over(sign * h);
      if (v === undefined) {
        return undefined;
      }
      if (sign * v <= 0) {
        let hi = h;
        for (let k = 0; k < 40; k++) {
          const mid = (lo + hi) / 2;
          if (sign * over(sign * mid) <= 0) {
            hi = mid;
          } else {
            lo = mid;
          }
        }
        return sign * hi;
      }
      lo = h;
    }
  }

  const rows = new Map(sections.map((s) => [s, [undefined, undefined]]));
  const fars = [reach, ...EXTENSIONS.map((k) => reach * k)];
  for (const far of fars) {
    const open = [];
    for (const s of sections) {
      for (const [k, side] of [
        [0, -1],
        [1, 1],
      ]) {
        if (rows.get(s)[k] === undefined) {
          open.push([s, k, side]);
        }
      }
    }
    if (open.length === 0) {
      break;
    }
    console.log(
      `${open.length} slopes to ${far} ftUS from the hinge (${sections.length} sections)`,
    );
    await sample(
      open.flatMap(([s, , side]) => offsetsTo(side, far).map((o) => [s, o])),
    );
    for (const [s, k, side] of open) {
      rows.get(s)[k] = rise(s, side, far);
    }
  }
  const unmet = sections.filter((s) =>
    rows.get(s).some((r) => r === undefined),
  );
  if (unmet.length > 0) {
    throw new Error(
      `corridorDaylight: slopes that don't meet the ground within ${fars[fars.length - 1]} ftUS at ${unmet.join(", ")}`,
    );
  }

  // How the slopes sit on the ground between their hinge and daylight: a
  // cut's face should be under the ground, a fill's over it.
  let buried = 0;
  let widest = 0;
  let rock = 0;
  const round = (v) => Math.round(v * 10) / 10 || 0;
  const table = sections.map((s) => {
    const [l, r] = rows.get(s);
    for (const v of [l, r]) {
      widest = Math.max(widest, slopeSection(v).daylight[0]);
      rock += v > SIDE_SLOPES.soil ? 1 : 0;
    }
    return [s, round(l), round(r)];
  });
  for (const [s, ...rises] of table) {
    const hinge = alignment.elevationAt(s) + HINGE_RISE;
    for (let k = 0; k < rises.length; k++) {
      const h = rises[k];
      const side = k === 0 ? -1 : 1;
      const { rock: r, daylight: d } = slopeSection(h);
      for (const o of offsetsTo(side, reach)) {
        const run = Math.abs(o) - SIDE_SLOPES.hinge;
        if (run >= d[0]) {
          break;
        }
        const face =
          run <= r[0]
            ? r[0] === 0
              ? 0
              : (r[1] * run) / r[0]
            : r[1] + ((d[1] - r[1]) * (run - r[0])) / (d[0] - r[0]);
        const ground = cache.ground[key(s, o)] / FT_US - hinge;
        if (Math.sign(h) * (ground - face) < -1) {
          buried++;
          break;
        }
      }
    }
  }
  const all = table.flatMap(([, l, r]) => [l, r]);
  console.log(
    `${table.length} sections; cut to ${Math.max(...all).toFixed(1)} ftUS, fill to ${(-Math.min(...all)).toFixed(1)} ftUS above and below the hinge; widest slope ${widest.toFixed(1)} ftUS; ${rock} slopes in rock; ${buried} whose face crosses the ground by more than 1 ftUS between hinge and daylight`,
  );

  // Each stretch's ends: the ground across the section between the daylight
  // lines (the centre too, under the road), as its upper and lower convex
  // hulls, for the end's cap: a portal's headwall stands over the upper
  // hull, an abutment's foot under the lower one. Offsets to 0.1 ftUS,
  // heights rounded outward to 0.1 ftUS.
  const CENTRE = [-30, -20, -10, 0, 10, 20, 30];
  const ends = [
    ...new Set(EARTHWORK.flatMap((r) => [r.fromStation, r.toStation])),
  ];
  await sample(ends.flatMap((s) => CENTRE.map((o) => [s, o])));
  /** The hull of points sorted by offset, above (`sign` 1) or below (−1). */
  const hull = (points, sign) => {
    const out = [];
    for (const p of points) {
      while (out.length >= 2) {
        const [a, b] = [out[out.length - 2], out[out.length - 1]];
        const turn =
          (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
        if (sign * turn < 0) {
          break;
        }
        out.pop();
      }
      out.push(p);
    }
    return out.map(([o, h]) => [
      Math.round(o * 10) / 10,
      (sign > 0 ? Math.ceil(h * 10) : Math.floor(h * 10)) / 10,
    ]);
  };
  const caps = ends.map((s) => {
    const [l, r] = rows.get(s);
    const hinge = alignment.elevationAt(s) + HINGE_RISE;
    const far = (h) => SIDE_SLOPES.hinge + slopeSection(h).daylight[0];
    const points = [
      [-far(l), hinge + l],
      [far(r), hinge + r],
    ];
    for (const [side, h] of [
      [-1, l],
      [1, r],
    ]) {
      for (const o of offsetsTo(side, reach * EXTENSIONS.at(-1))) {
        if (Math.abs(o) < far(h) && key(s, o) in cache.ground) {
          points.push([o, cache.ground[key(s, o)] / FT_US]);
        }
      }
    }
    for (const o of CENTRE) {
      points.push([o, cache.ground[key(s, o)] / FT_US]);
    }
    points.sort((p, q) => p[0] - q[0]);
    return [s, hull(points, 1), hull(points, -1)];
  });

  const body = table.map((r) => `  [${r.join(", ")}],`).join("\n");
  const pairs = (line) =>
    `[${line.map((p) => `[${p.join(", ")}]`).join(", ")}]`;
  const capBody = caps
    .map(([s, upper, lower]) => `  [${s}, ${pairs(upper)}, ${pairs(lower)}],`)
    .join("\n");
  // What reaches the generated source: the date (checked again here) and
  // numbers the script computed.
  if (!SAMPLED_DATE.test(cache.sampled)) {
    throw new Error("corridorDaylight: a sampled date that isn't YYYY-MM-DD");
  }
  writeFileSync(
    join(root, "examples/design-globe/corridorDaylight.ts"),
    `// Generated by scripts/corridorDaylight.mjs; don't edit by hand.
//
// The corridor's daylight rises: on each earthwork stretch (sideSlopes.ts
// \`EARTHWORK\`), a cross-section every ${along} ftUS of station and at its
// ends, with where each side slope meets USGS 3DEP's ground, in ftUS above
// its hinge (negative in fill), to 0.1 ftUS. The ground was sampled
// ${cache.sampled}, every ${across} ftUS across from each hinge (linear
// between samples), from 3DEP's elevation service:
// ${SERVICE}
// (the samples are not in the repo).

/** When the ground was sampled. */
export const DAYLIGHT_SAMPLED = "${cache.sampled}";

/** [station, left rise, right rise], ftUS, in order of station. */
export const DAYLIGHT: readonly (readonly [number, number, number])[] = [
${body}
];

/**
 * Each earthwork stretch's ends: [station, upper, lower], the ground across
 * the section between the daylight lines and under the road as its upper
 * and lower convex hulls, each [offset, height] from left to right
 * (offsets in ftUS to 0.1, NAVD88 heights in ftUS rounded outward to 0.1;
 * sampled at ${across} ftUS and at offsets ${CENTRE.join(", ")}): a
 * portal's headwall stands over the upper hull, an abutment's foot under
 * the lower one.
 */
export const END_GROUND: readonly (readonly [
  number,
  readonly (readonly [number, number])[],
  readonly (readonly [number, number])[],
])[] = [
${capBody}
];
`,
  );
  console.log("wrote examples/design-globe/corridorDaylight.ts");
} finally {
  await runner.close();
}
