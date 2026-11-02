// Scorecards and comparison tables (plan §16.9, Decide), borrowed from
// canary analysis (Kayenta) and Go's benchstat.
//
// A comparison declares, before results exist, its primary metric (the
// one it is meant to move) and guardrails (metrics that must not get
// worse by more than a tolerance). The plan comes from the run
// (`--primary`, `--guardrails`, `--hypothesis`), else the defaults here.
// Each metric is tested per scene with the bootstrap ratio of medians
// (§16.3); the scorecard is pass, marginal or fail:
//
// - fail: the primary metric got worse (more scenes clearly worse than
//   better, geometric mean above 1), or a guardrail broke in 2+ scenes;
// - marginal: the primary metric did not clearly move, or a guardrail
//   broke in one scene;
// - pass: otherwise.
//
// The image guardrail: where a run captured 2.0's settled end view under
// both its own selection and Stepwise (same renderer), their FLIP must
// stay under SELECTION_LIMIT, so a policy can't pass by drawing less. It
// counts with the guardrails.
//
// No scene measured by both engines (all errored, say) has no scorecard.
import { ratio, summarize } from "./stats.mjs";
import { escape } from "./charts.mjs";
import { engineLabel, setupOf } from "./engines.mjs";

export const DEFAULT_PLAN = {
  primary: "cpuP50",
  guardrails: ["settleMs", "frameP95", "over100", "bytes", "heapBytes"],
  tolerance: 0.1,
};

const LABELS = {
  firstContentMs: ["first content", "s", 1000],
  settleMs: ["time to settle", "s", 1000],
  resettleMs: ["re-settle after motion", "s", 1000],
  frameP50: ["frame p50", "ms", 1],
  frameP95: ["frame p95", "ms", 1],
  frameP99: ["frame p99", "ms", 1],
  frameP999: ["frame p99.9", "ms", 1],
  frameStdDev: ["frame time std. dev.", "ms", 1],
  over33: ["frames > 2 vsyncs", "", 1],
  over100: ["hitches > 100 ms", "", 1],
  cpuP50: ["CPU per frame", "ms", 1],
  cpuP95: ["CPU per frame p95", "ms", 1],
  gpuP50: ["GPU per frame", "ms", 1],
  longFrames: ["long frames", "", 1],
  requests: ["requests", "", 1],
  bytes: ["bytes", "MB", 1e6],
  heapBytes: ["JS heap", "MB", 1e6],
};

export const metricLabel = (key) => LABELS[key]?.[0] ?? key;

/** Values per scene for one configuration and metric (ok runs only). */
function valuesBy(runs, config, key) {
  const out = new Map();
  for (const r of runs) {
    if (r.config !== config || r.metrics.status !== "ok") {
      continue;
    }
    const v = r.metrics[key];
    if (Number.isFinite(v)) {
      const id = `${r.scene}|${r.scenario}`;
      out.set(id, [...(out.get(id) ?? []), v]);
    }
  }
  return out;
}

/**
 * The comparison of one metric in one scene: the ratio with its interval,
 * or for counts that start at zero, a clear increase when every candidate
 * repetition exceeds every baseline repetition.
 */
export function compareValues(a, b) {
  const r = ratio(a, b);
  if (r?.value !== undefined) {
    return r;
  }
  const ma = summarize(a)?.median;
  const mb = summarize(b)?.median;
  if (ma === undefined || mb === undefined) {
    return undefined;
  }
  const worse = Math.min(...b) > Math.max(...a);
  const better = Math.max(...b) < Math.min(...a);
  return {
    value: mb === ma ? 1 : undefined,
    low: undefined,
    high: undefined,
    separated: worse || better,
    direction: worse ? 1 : better ? -1 : 0,
    from: ma,
    to: mb,
  };
}

const direction = (c) =>
  c.direction ?? (c.separated ? (c.value < 1 ? -1 : 1) : 0);

const geomean = (values) =>
  values.length
    ? Math.exp(values.reduce((s, v) => s + Math.log(v), 0) / values.length)
    : undefined;

/**
 * Mean FLIP between the candidate's settled end view and the same view
 * under Stepwise selection above which its selection draws visibly
 * differently.
 */
export const SELECTION_LIMIT = 0.1;

/** The image guardrail: selection parity per scene, if the run has it. */
function selectionCheck(results, candidate) {
  const scenes = (results.filmstrips ?? [])
    .filter((f) => f.moment === "end" && f.selection?.[candidate])
    .map((f) => ({
      scene: `${f.scene} · ${f.scenario}`,
      flip: f.selection[candidate].mean,
    }));
  return scenes.length
    ? {
        key: "selection",
        label: "selection parity (FLIP vs Stepwise)",
        limit: SELECTION_LIMIT,
        scenes,
        broken: scenes
          .filter((s) => s.flip > SELECTION_LIMIT)
          .map((s) => s.scene),
      }
    : undefined;
}

/** The scorecard for baseline vs candidate under a declared plan. */
export function scorecard(results, options = {}) {
  const configs = [...new Set(results.runs.map((r) => r.config))];
  const baseline = options.baseline ?? results.baseline ?? configs[0];
  const candidate =
    options.candidate ??
    results.candidate ??
    configs.find((c) => c !== baseline) ??
    baseline;
  if (baseline === candidate || !configs.includes(candidate)) {
    return undefined;
  }
  const plan = {
    ...DEFAULT_PLAN,
    ...(results.plan ?? {}),
    ...(options.plan ?? {}),
  };
  const test = (key, tolerance) => {
    const a = valuesBy(results.runs, baseline, key);
    const b = valuesBy(results.runs, candidate, key);
    const scenes = [];
    for (const [id, va] of a) {
      const vb = b.get(id);
      if (!vb) {
        continue;
      }
      const c = compareValues(va, vb);
      if (!c) {
        continue;
      }
      const d = direction(c);
      // A guardrail breaks only past its tolerance (and clearly).
      const broken = d > 0 && (c.value === undefined || c.low > 1 + tolerance);
      scenes.push({
        scene: id.replace("|", " · "),
        ...c,
        direction: d,
        broken,
      });
    }
    const ratios = scenes.map((s) => s.value).filter((v) => v > 0);
    return {
      key,
      label: metricLabel(key),
      geomean: geomean(ratios),
      better: scenes.filter((s) => s.direction < 0).length,
      worse: scenes.filter((s) => s.direction > 0).length,
      broken: scenes.filter((s) => s.broken).map((s) => s.scene),
      scenes,
    };
  };
  const primary = test(plan.primary, 0);
  // No scene measured by both: nothing to judge.
  if (!primary.scenes.length) {
    return undefined;
  }
  const guardrails = plan.guardrails.map((k) => test(k, plan.tolerance));
  const primaryMoved =
    primary.better > primary.worse && primary.geomean < 1
      ? "improved"
      : primary.worse > primary.better && primary.geomean > 1
        ? "regressed"
        : "no clear change";
  const image = selectionCheck(results, candidate);
  const brokenScenes =
    guardrails.reduce((n, g) => n + g.broken.length, 0) +
    (image?.broken.length ?? 0);
  const verdict =
    primaryMoved === "regressed" || brokenScenes >= 2
      ? "fail"
      : primaryMoved === "no clear change" || brokenScenes === 1
        ? "marginal"
        : "pass";
  return {
    baseline,
    candidate,
    plan,
    verdict,
    primary: { ...primary, moved: primaryMoved },
    guardrails,
    ...(image ? { image } : {}),
  };
}

const VERDICTS = {
  pass: ["✓", "Pass", "good-text"],
  marginal: ["!", "Marginal", "ink-2"],
  fail: ["✕", "Fail", "critical"],
};

/** The scorecard as HTML: the verdict, the primary metric, guardrails. */
export function scorecardHtml(card) {
  if (!card) {
    return "";
  }
  const [icon, word, tone] = VERDICTS[card.verdict];
  const g = (x) => (x === undefined ? "–" : `×${x.toFixed(2)}`);
  const rows = card.guardrails
    .map((r) => {
      const ok = !r.broken.length;
      return `<tr><th>${escape(r.label)}</th><td>${g(r.geomean)}</td><td>${r.better} better · ${r.worse} worse</td><td class="${ok ? "ok" : "broken"}">${ok ? "✓ held" : `✕ broken in ${r.broken.map(escape).join(", ")}`}</td></tr>`;
    })
    .join("");
  const image = card.image
    ? (() => {
        const ok = !card.image.broken.length;
        const worst = Math.max(...card.image.scenes.map((s) => s.flip));
        return `<tr><th>${escape(card.image.label)} at most ${card.image.limit}</th><td>max ${worst.toFixed(3)}</td><td>${card.image.scenes.length} scenes</td><td class="${ok ? "ok" : "broken"}">${ok ? "✓ held" : `✕ broken in ${card.image.broken.map(escape).join(", ")}`}</td></tr>`;
      })()
    : "";
  return `<div class="scorecard"><div class="sc-head"><span class="sc-verdict" style="color:var(--${tone})">${icon} ${word}</span>
<span>${escape(engineLabel(card.candidate))} vs ${escape(engineLabel(card.baseline))} · primary metric <b>${escape(card.primary.label)}</b>: ${escape(card.primary.moved)} (${g(card.primary.geomean)}, ${card.primary.better} scenes better, ${card.primary.worse} worse)</span></div>
${card.plan.hypothesis ? `<div class="sub">Hypothesis: ${escape(card.plan.hypothesis)}</div>` : ""}
<table class="sc"><tr><th>Guardrail (must not get more than ${Math.round(card.plan.tolerance * 100)}% worse)</th><th>geo. mean</th><th>scenes</th><th></th></tr>${rows}${image}</table></div>`;
}

/**
 * Budgets checked against a run: per budget, each engine running its
 * setup (any build: "2.0" covers 2.0@main and the working tree), and per
 * scene, the median (or its ratio to the baseline's) against the limit.
 */
export function checkBudgets(results, budgets = results.budgets ?? []) {
  const configs = [...new Set(results.runs.map((r) => r.config))];
  const baseline = results.baseline ?? configs[0];
  return budgets
    .flatMap((b) =>
      configs
        .filter((c) => c !== baseline && setupOf(c) === (b.setup ?? b.config))
        .map((config) => ({ ...b, config })),
    )
    .map((b) => {
      const a = valuesBy(results.runs, baseline, b.metric);
      const c = valuesBy(results.runs, b.config, b.metric);
      const scenes = [];
      for (const [id, values] of c) {
        const [scene, scenario] = id.split("|");
        if (
          (b.scenes && !b.scenes.includes(scene)) ||
          (b.scenario && b.scenario !== scenario)
        ) {
          continue;
        }
        const median = summarize(values)?.median;
        const base = summarize(a.get(id) ?? [])?.median;
        const value =
          b.maxRatio !== undefined
            ? base > 0
              ? median / base
              : undefined
            : median;
        if (value === undefined) {
          continue;
        }
        const limit = b.maxRatio ?? b.max;
        scenes.push({
          scene: id.replace("|", " · "),
          value,
          limit,
          ok: value <= limit + 1e-9,
        });
      }
      return {
        ...b,
        baseline,
        scenes,
        broken: scenes.filter((s) => !s.ok).length,
      };
    });
}

/** Budgets as HTML: one row per budget, the broken scenes listed. */
export function budgetsHtml(checked) {
  if (!checked.length) {
    return "";
  }
  const fmt = (b, v) =>
    b.maxRatio !== undefined
      ? `×${v.toFixed(2)}`
      : LABELS[b.metric]?.[2]
        ? `${(v / LABELS[b.metric][2]).toFixed(2)} ${LABELS[b.metric][1]}`
        : v.toFixed(2);
  const rows = checked
    .map((b) => {
      const ok = b.broken === 0;
      const worst = b.scenes
        .filter((s) => !s.ok)
        .sort((x, y) => y.value - x.value);
      return `<tr><th>${escape(b.label)}<div class="muted">${escape(engineLabel(b.config))}${b.maxRatio !== undefined ? ` vs ${escape(engineLabel(b.baseline))}` : ""}</div></th><td class="${ok ? "ok" : "broken"}">${ok ? `✓ within in all ${b.scenes.length} scenes` : `✕ over in ${b.broken} of ${b.scenes.length}`}</td><td class="muted">${worst
        .slice(0, 6)
        .map((s) => `${escape(s.scene)} ${fmt(b, s.value)}`)
        .join(" · ")}${worst.length > 6 ? " …" : ""}</td></tr>`;
    })
    .join("");
  return `<div class="scorecard budgets"><div class="sc-head"><span class="sc-title">Budgets</span><span>limits from the catalog (plan §5 targets); a budget is broken in a scene when its median is over the limit</span></div><table class="sc"><tr><th>Budget</th><th>Status</th><th>Over the limit</th></tr>${rows}</table></div>`;
}

export const SCORECARD_CSS = `
.viz .sc-title { font-size: 15px; font-weight: 700; color: var(--ink); }
.viz .scorecard { background: var(--surface); border: 1px solid var(--grid); border-radius: 8px; padding: 10px 14px; margin: 10px 0; }
.viz .sc-head { display: flex; gap: 14px; align-items: baseline; flex-wrap: wrap; color: var(--ink-2); }
.viz .sc-verdict { font-size: 18px; font-weight: 700; }
.viz table.sc { border-collapse: collapse; margin-top: 8px; font-variant-numeric: tabular-nums; }
.viz table.sc th, .viz table.sc td { padding: 3px 10px 3px 0; border-bottom: 1px solid var(--grid); text-align: left; color: var(--ink-2); font-weight: normal; }
.viz table.sc tr:first-child th { font-size: 12px; color: var(--muted); }
.viz table.sc td.ok { color: var(--good-text); } .viz table.sc td.broken { color: var(--critical); }
`;

/**
 * A benchstat-style text table: per scene and metric, old and new medians
 * with their spread and the change with its interval ("~" when the
 * intervals don't separate). `old` and `new` are [results, config] pairs:
 * two configurations of one run, or one configuration across two runs.
 */
export function compareTable(
  [oldResults, oldConfig],
  [newResults, newConfig],
  metrics,
) {
  const keys = metrics ?? [DEFAULT_PLAN.primary, ...DEFAULT_PLAN.guardrails];
  const lines = [];
  const pad = (s, n) => String(s).padEnd(n);
  const padStart = (s, n) => String(s).padStart(n);
  const fmt = (v, scale) => {
    if (v === undefined) {
      return "–";
    }
    const x = v / scale;
    return x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2);
  };
  for (const key of keys) {
    const [label, unit, scale] = LABELS[key] ?? [key, "", 1];
    const a = valuesBy(oldResults.runs, oldConfig, key);
    const b = valuesBy(newResults.runs, newConfig, key);
    const rows = [];
    const ratios = [];
    for (const [id, va] of a) {
      const vb = b.get(id);
      if (!vb) {
        continue;
      }
      const sa = summarize(va);
      const sb = summarize(vb);
      const spread = (s) =>
        s.median
          ? `±${Math.round((Math.max(s.high - s.median, s.median - s.low) / s.median) * 100)}%`
          : "";
      const c = compareValues(va, vb);
      let change = "~";
      if (c?.value !== undefined && c.separated) {
        change = `${c.value < 1 ? "" : "+"}${((c.value - 1) * 100).toFixed(1)}% (${((c.low - 1) * 100).toFixed(0)}…${((c.high - 1) * 100).toFixed(0)}%)`;
      } else if (c?.separated) {
        change = `${fmt(c.from, scale)} → ${fmt(c.to, scale)}`;
      }
      if (c?.value > 0) {
        ratios.push(c.value);
      }
      rows.push([
        id.replace("|", " · "),
        `${fmt(sa.median, scale)} ${spread(sa)}`,
        `${fmt(sb.median, scale)} ${spread(sb)}`,
        change,
      ]);
    }
    if (!rows.length) {
      continue;
    }
    const g = geomean(ratios);
    rows.push([
      "geomean",
      "",
      "",
      g === undefined
        ? ""
        : `${g < 1 ? "" : "+"}${((g - 1) * 100).toFixed(1)}%`,
    ]);
    const w = Math.max(24, ...rows.map((r) => r[0].length));
    const [ha, hb] = [engineLabel(oldConfig), engineLabel(newConfig)];
    const [wa, wb] = [Math.max(14, ha.length), Math.max(14, hb.length)];
    lines.push(
      `${pad(`${label}${unit ? ` (${unit})` : ""}`, w)}  ${padStart(ha, wa)}  ${padStart(hb, wb)}  change`,
    );
    for (const r of rows) {
      lines.push(
        `${pad(r[0], w)}  ${padStart(r[1], wa)}  ${padStart(r[2], wb)}  ${r[3]}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}
