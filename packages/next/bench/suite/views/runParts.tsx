import { Badge } from "@mui/material";
import { svgStatusError } from "@stratakit/icons/status-error";
import { svgStatusSuccess } from "@stratakit/icons/status-success";
import { svgStatusWarning } from "@stratakit/icons/status-warning";
import { svgInfo } from "@stratakit/icons/info";
import { Icon } from "@stratakit/mui";
import type { ReactNode } from "react";
import { ratio as bootstrapRatio } from "../stats.mjs";
import { cellKey, cellTitle, geomean, short, type Summary } from "../data.ts";
import { formatChange } from "./common.tsx";

/**
 * What the Results views (Overview, Runs, Compare, a run's report) share
 * about runs: each run's baseline and candidate, headline changes
 * (candidate over baseline, geometric mean across scenes), the
 * scorecard's verdict and the run's validity, and how they read: change
 * in words, status as a word with a color.
 */

/** The headline metrics, in the order Dyno shows them. */
export const HEADLINES: ReadonlyArray<{
  key: string;
  label: string;
  /** What the metric measures when "faster" doesn't fit. */
  noun?: string;
}> = [
  { key: "cpuP50", label: "CPU per frame" },
  { key: "settleMs", label: "Time to settle" },
  { key: "frameP95", label: "Frame p95" },
  { key: "bytes", label: "Data downloaded", noun: "data" },
  { key: "heapBytes", label: "JS heap", noun: "memory" },
];

/** A run's baseline and candidate configurations (as its report picks them). */
export function pairOf(s: Summary): { base: string; cand?: string } {
  const base =
    s.baseline && s.configs.includes(s.baseline)
      ? s.baseline
      : s.configs.includes("1.x")
        ? "1.x"
        : (s.configs[0] ?? "1.x");
  const cand =
    s.candidate && s.configs.includes(s.candidate) && s.candidate !== base
      ? s.candidate
      : s.configs.find((c) => c !== base);
  return { base, cand };
}

export interface SceneChange {
  key: string;
  title: string;
  value: number;
  /** With intervals only: whether the 95% interval excludes no change. */
  separated?: boolean;
}

/**
 * Candidate over baseline per scene for one metric. With `intervals`,
 * each ratio is bootstrapped (slower) so better and worse can be counted.
 */
export function sceneChanges(
  s: Summary,
  key: string,
  { intervals = false }: { intervals?: boolean } = {},
): SceneChange[] {
  const { base, cand } = pairOf(s);
  if (!cand) {
    return [];
  }
  const out: SceneChange[] = [];
  for (const cell of s.scenes) {
    if (cell.config !== cand) {
      continue;
    }
    const b = s.scenes.find(
      (c) => c.config === base && cellKey(c) === cellKey(cell),
    )?.metrics[key];
    const c = cell.metrics[key];
    if (!b || !c) {
      continue;
    }
    if (intervals) {
      const r = bootstrapRatio(b.values, c.values);
      if (r?.value !== undefined && r.value > 0) {
        out.push({
          key: cellKey(cell),
          title: cellTitle(cell),
          value: r.value,
          separated: r.separated,
        });
      }
    } else if (b.median > 0 && c.median > 0) {
      out.push({
        key: cellKey(cell),
        title: cellTitle(cell),
        value: c.median / b.median,
      });
    }
  }
  return out;
}

/** A run's headline change for one metric: the geometric mean across scenes. */
export function headline(s: Summary, key: string) {
  const changes = sceneChanges(s, key);
  return {
    ratio: geomean(changes.map((c) => c.value)),
    scenes: changes.length,
  };
}

// ------------------------------------------------------------ verdicts

export type Verdict = "pass" | "marginal" | "fail";
export type Validity = "valid" | "warning" | "invalid";

/** The scorecard's verdict (scorecard.mjs), when the run has one. */
export function verdictOf(s: Summary): Verdict | undefined {
  const v = (s as Summary & { scorecard?: { verdict?: string } }).scorecard
    ?.verdict;
  return v === "pass" || v === "marginal" || v === "fail" ? v : undefined;
}

/**
 * The run's validity as its report states it: invalid when nothing
 * measured was valid, warning when anything was flagged; undefined when
 * the run predates validity checks.
 */
export function validityOf(s: Summary): Validity | undefined {
  const v = s.validity;
  if (!v || v.valid + v.warning + v.invalid === 0) {
    return undefined;
  }
  if (v.valid + v.warning === 0) {
    return "invalid";
  }
  return v.warning || v.invalid ? "warning" : "valid";
}

type Tone = "success" | "warning" | "error" | "info" | "secondary";
const ICONS: Partial<Record<Tone, string>> = {
  success: svgStatusSuccess,
  warning: svgStatusWarning,
  error: svgStatusError,
  info: svgInfo,
};

/** A status: an icon and a word, colored (never color alone). */
export function Status({
  tone,
  children,
  title,
}: {
  tone: Tone;
  children: ReactNode;
  title?: string;
}) {
  const icon = ICONS[tone];
  return (
    <Badge
      variant="inline"
      size="small"
      type="muted"
      color={tone}
      title={title}
      badgeContent={
        <>
          {icon && <Icon href={icon} />}
          {children}
        </>
      }
    />
  );
}

const VERDICTS: Record<Verdict, [Tone, string, string]> = {
  pass: ["success", "Pass", "The primary metric improved; no guardrail broke"],
  marginal: [
    "warning",
    "Marginal",
    "The primary metric didn't clearly move, or a guardrail broke in one scene",
  ],
  fail: [
    "error",
    "Fail",
    "The primary metric got worse, or a guardrail broke in two or more scenes",
  ],
};
export function VerdictStatus({ verdict }: { verdict: Verdict | undefined }) {
  if (!verdict) {
    return <span className="none">–</span>;
  }
  const [tone, word, why] = VERDICTS[verdict];
  return (
    <Status tone={tone} title={why}>
      {word}
    </Status>
  );
}

const VALIDITY: Record<Validity, [Tone, string]> = {
  valid: ["success", "Valid"],
  warning: ["warning", "Valid with warnings"],
  invalid: ["error", "Invalid"],
};
export function ValidityStatus({ s }: { s: Summary }) {
  const validity = validityOf(s);
  if (!validity) {
    return <Status tone="secondary">Validity not recorded</Status>;
  }
  const [tone, word] = VALIDITY[validity];
  const v = s.validity!;
  return (
    <Status
      tone={tone}
      title={`${v.valid} valid, ${v.warning} with warnings, ${v.invalid} invalid measurements`}
    >
      {word}
    </Status>
  );
}

// ------------------------------------------------------------ words

/**
 * A change in words ("1.5× faster", "12% less memory"), colored by
 * whether it is better; the raw ratio in the tooltip.
 */
export function Change({
  ratio,
  noun,
  detail,
}: {
  ratio: number | undefined;
  noun?: string;
  detail?: string;
}) {
  const c = formatChange(ratio, { noun });
  const raw =
    ratio !== undefined && Number.isFinite(ratio)
      ? `×${ratio.toPrecision(2)}${detail ? ` (${detail})` : ""}`
      : detail;
  return (
    <span className={`change ${c.tone}`} title={raw}>
      {c.text}
    </span>
  );
}

/** "Oct 31, 18:49": a run's date for lists (ISO in the tooltip). */
export const dateOf = (s: { date: string }) =>
  new Date(s.date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

/** How many scenes (scene and scenario) a run measured. */
export const sceneCount = (s: Summary) =>
  new Set(s.scenes.map((c) => cellKey(c))).size;

/** A run as one line for pickers: "Oct 31, 18:49 · 5d78f04* · note". */
export const runOption = (s: Summary) =>
  [
    s.name,
    `${dateOf(s)} · ${short(s)}${s.note ? ` · ${s.note}` : ""}${s.sweep ? " (sweep)" : ""}`,
  ] as const;
