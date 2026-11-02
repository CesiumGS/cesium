// The L1′ exit check (plan M3): `Budgeted` against `Stepwise` over the
// L1′ camera moves, across photogrammetry, OSM and design models, on a
// fast and a throttled link (20 Mbit/s, 80 ms). Passes where Budgeted's
// FLIP average is lower at equal or fewer bytes.
//
//   node packages/next/bench/lod-matrix.mjs [--content a,b] [--links fast,slow]
//        [--policies stepwise,adaptive] [--note "what changed"]
//
// Each cell runs `run.mjs lod` (its own server and browser; BENCH_COMMIT
// serves a commit, so development can continue). Results go outside the
// repo: ~/.cesium-bench/lod/<stamp>.json (or BENCH_LOD_RESULTS).
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Content for the exit check: ion assets and where to look. */
export const CONTENT = [
  {
    id: "google-midtown",
    kind: "photogrammetry",
    asset: 2275207,
    at: "-73.9857,40.7484",
  },
  {
    id: "aerometrex-sf",
    kind: "photogrammetry",
    asset: 1415196,
    at: "-122.3933,37.7955",
    token: "default",
  },
  {
    id: "osm-philadelphia",
    kind: "osm",
    asset: 96188,
    at: "-75.165,39.9526",
  },
  {
    id: "bim-design-model",
    kind: "design",
    asset: 2464651,
    token: "default",
  },
  { id: "aec-design", kind: "design", asset: 2887123, token: "default" },
];

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const contentIds = opt("content", CONTENT.map((c) => c.id).join(",")).split(
  ",",
);
const links = opt("links", "fast,slow").split(",");
const policies = opt("policies", "stepwise,adaptive");

const cells = [];
for (const content of CONTENT.filter((c) => contentIds.includes(c.id))) {
  for (const link of links) {
    process.stdout.write(`${content.id} · ${link}… `);
    const started = Date.now();
    const env = {
      ...process.env,
      ION_ASSET: String(content.asset),
      POLICIES: policies,
      ...(content.at ? { AT: content.at } : {}),
      ...(content.token ? { ION_TOKEN: content.token } : {}),
      ...(link === "slow" ? { THROTTLE: "1" } : {}),
    };
    const run = spawnSync(process.execPath, [join(here, "run.mjs"), "lod"], {
      env,
      encoding: "utf8",
      maxBuffer: 1 << 26,
    });
    const file = /wrote (.+\.json)/.exec(run.stdout)?.[1];
    if (run.status !== 0 || !file) {
      console.log(`failed: ${(run.stderr || run.stdout).slice(-300)}`);
      cells.push({ content: content.id, kind: content.kind, link, error: true });
      continue;
    }
    const result = JSON.parse(readFileSync(file.trim(), "utf8"));
    const rows = result.results.lod ?? [];
    cells.push({
      content: content.id,
      kind: content.kind,
      link,
      seconds: (Date.now() - started) / 1000,
      errors: result.errors?.length ?? 0,
      rows,
    });
    console.log(`${((Date.now() - started) / 1000).toFixed(0)} s`);
  }
}

// Per cell: each policy's FLIP average and bytes summed over the moves.
const totals = (rows, label) => {
  const own = rows.filter((r) => r.policy.startsWith(label) && r.status === "ok");
  return own.length
    ? {
        flipAverage:
          own.reduce((s, r) => s + (r.flipAverage ?? 0), 0) / own.length,
        megabytes: own.reduce((s, r) => s + r.megabytes, 0),
        settleMs: own.reduce((s, r) => s + r.settleMs, 0),
        moves: own.length,
      }
    : undefined;
};
const summary = cells.map((c) => {
  if (c.error) {
    return { ...c, verdict: "error" };
  }
  const stepwise = totals(c.rows, "Stepwise");
  const budgeted = totals(c.rows, "Budgeted, adaptive");
  const pass =
    stepwise &&
    budgeted &&
    budgeted.flipAverage < stepwise.flipAverage &&
    budgeted.megabytes <= stepwise.megabytes * 1.02;
  return { ...c, stepwise, budgeted, verdict: pass ? "pass" : "fail" };
});

const f = (v, d = 3) => (v === undefined ? "–" : v.toFixed(d));
console.log(
  "\ncontent            link  FLIP avg (Stepwise → Budgeted)   MB (Stepwise → Budgeted)   settle s (S → B)   verdict",
);
for (const s of summary) {
  console.log(
    `${s.content.padEnd(18)} ${s.link.padEnd(5)} ${`${f(s.stepwise?.flipAverage)} → ${f(s.budgeted?.flipAverage)}`.padEnd(32)} ${`${f(s.stepwise?.megabytes, 1)} → ${f(s.budgeted?.megabytes, 1)}`.padEnd(26)} ${`${f(s.stepwise && s.stepwise.settleMs / 1000, 1)} → ${f(s.budgeted && s.budgeted.settleMs / 1000, 1)}`.padEnd(18)} ${s.verdict}`,
  );
}
const passed = summary.filter((s) => s.verdict === "pass").length;
console.log(`\n${passed} of ${summary.length} cells pass`);

const directory =
  process.env.BENCH_LOD_RESULTS ?? join(homedir(), ".cesium-bench", "lod");
mkdirSync(directory, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = join(directory, `${stamp}.json`);
writeFileSync(
  out,
  JSON.stringify(
    {
      date: new Date().toISOString(),
      note: opt("note", ""),
      commit: process.env.BENCH_COMMIT ?? "working tree",
      policies,
      cells: summary,
    },
    null,
    1,
  ),
);
console.log(`results: ${out}`);
