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
/** Repetitions per cell (single runs vary by up to 0.03 in FLIP avg). */
const reps = Number(opt("reps", "1"));

// --summarize <results.json>: re-score a saved run (no measuring).
const saved = opt("summarize");
const cells = saved ? JSON.parse(readFileSync(saved, "utf8")).cells : [];
for (const content of saved
  ? []
  : CONTENT.filter((c) => contentIds.includes(c.id))) {
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
    const rows = [];
    let errors = 0;
    let failure;
    for (let rep = 0; rep < reps; rep++) {
      const run = spawnSync(process.execPath, [join(here, "run.mjs"), "lod"], {
        env,
        encoding: "utf8",
        maxBuffer: 1 << 26,
      });
      const file = /wrote (.+\.json)/.exec(run.stdout)?.[1];
      if (run.status !== 0 || !file) {
        failure = (run.stderr || run.stdout).slice(-300);
        break;
      }
      const result = JSON.parse(readFileSync(file.trim(), "utf8"));
      rows.push(...(result.results.lod ?? []).map((r) => ({ ...r, rep })));
      errors += result.errors?.length ?? 0;
    }
    if (failure) {
      console.log(`failed: ${failure}`);
      cells.push({
        content: content.id,
        kind: content.kind,
        link,
        error: true,
      });
      continue;
    }
    cells.push({
      content: content.id,
      kind: content.kind,
      link,
      reps,
      seconds: (Date.now() - started) / 1000,
      errors,
      rows,
    });
    console.log(`${((Date.now() - started) / 1000).toFixed(0)} s`);
  }
}

// Per cell: each policy's FLIP averages (over moves and repetitions) and
// bytes summed over the moves (mean over repetitions).
const totals = (rows, label) => {
  const own = rows.filter(
    (r) => r.policy.startsWith(label) && r.status === "ok",
  );
  const n = new Set(own.map((r) => r.rep ?? 0)).size || 1;
  const mean = (key) =>
    own.some((r) => r[key] !== undefined)
      ? own.reduce((s, r) => s + (r[key] ?? 0), 0) / own.length
      : undefined;
  return own.length
    ? {
        flipAverage: mean("flipAverage"),
        flipAverageTarget: mean("flipAverageTarget"),
        // Downloaded (the purposes' bytes); `megabytes` is GPU upload.
        megabytes:
          own.reduce(
            (s, r) =>
              s +
              Object.values(r.purposes ?? {}).reduce(
                (t, p) => t + p.megabytes,
                0,
              ),
            0,
          ) / n,
        uploadMegabytes: own.reduce((s, r) => s + r.megabytes, 0) / n,
        settleMs: own.reduce((s, r) => s + r.settleMs, 0) / n,
        moves: own.length / n,
      }
    : undefined;
};
const summary = cells.map((c) => {
  if (c.error) {
    return { ...c, verdict: "error" };
  }
  const stepwise = totals(c.rows, "Stepwise");
  const budgeted = totals(c.rows, "Budgeted, adaptive");
  // No worse (FLIP within 0.002) at no more bytes (within 2%); better
  // where FLIP is lower by more than that. FLIP against the target where
  // measured (parity/lod.ts: the fully refined reference rewards lingering
  // on content unlike the target); the other is shown too.
  const key = (t) => t.flipAverageTarget ?? t.flipAverage;
  const pass =
    stepwise &&
    budgeted &&
    key(budgeted) <= key(stepwise) + 0.002 &&
    budgeted.megabytes <= stepwise.megabytes * 1.02;
  const better = pass && key(budgeted) < key(stepwise) - 0.002;
  return {
    ...c,
    stepwise,
    budgeted,
    verdict: better ? "better" : pass ? "pass" : "fail",
  };
});

const f = (v, d = 3) => (v === undefined ? "–" : v.toFixed(d));
const scaled = (t, k) =>
  t?.[k] === undefined ? undefined : t[k] / (k === "settleMs" ? 1000 : 1);
const pair = (s, k, d, w) =>
  `${f(scaled(s.stepwise, k), d)} → ${f(scaled(s.budgeted, k), d)}`.padEnd(w);
console.log(
  "\ncontent            link  vs target (S → B)  vs refined (S → B)  MB down (S → B)  settle s (S → B)  verdict",
);
for (const s of summary) {
  console.log(
    `${s.content.padEnd(18)} ${s.link.padEnd(5)} ${pair(s, "flipAverageTarget", 3, 18)} ${pair(s, "flipAverage", 3, 19)} ${pair(s, "megabytes", 1, 16)} ${pair(s, "settleMs", 1, 17)} ${s.verdict}`,
  );
}
const passed = summary.filter(
  (s) => s.verdict === "pass" || s.verdict === "better",
).length;
console.log(`\n${passed} of ${summary.length} cells pass`);
if (saved) {
  process.exit(0);
}

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
