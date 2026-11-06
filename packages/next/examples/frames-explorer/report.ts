// The frames explorer's report (R15): the run as QA evidence an engineer
// files, as Markdown (to read and paste) and JSON (to parse). Every result
// with its value, tolerance, accuracy, effect and fingerprint, failures
// first; then the environment the run happened in.
//
// The ion token never enters it (R18): nothing the page passes here holds
// the token, and `secrets` is redacted wherever the user's own input (a
// label or a pasted WKT) might have carried it.
import type { RunSummary } from "./protocol.ts";
import type { StressResult } from "./tests.ts";

/** What the run happened in (R15). */
export interface ReportEnvironment {
  /** The run's start, ISO 8601 UTC. */
  startedAt: string;
  durationMs: number;
  /** The package and its version. */
  packageVersion: string;
  userAgent: string;
  /** PROJ as the frames store holds it; undefined when it didn't load. */
  proj?: string;
  /** Each file the results rest on, with its pinned SHA-256 (undefined: not loaded). */
  files: readonly EnvironmentFile[];
  /** The frame data's span, from the store's manifest. */
  frameDataSpan?: string;
  summary?: RunSummary;
}

/** A file the results rest on (R15). */
export interface EnvironmentFile {
  label: string;
  file: string;
  /** The manifest's pinned SHA-256; undefined when the file didn't load. */
  sha256?: string;
  /**
   * Whether the browser checked the served bytes against `sha256` (the frame
   * data and the OEM are; PROJ's own loader doesn't check proj.db, the wasm
   * or the grids). Unset or false: the value is the manifest's.
   */
  verified?: boolean;
  note?: string;
}

/**
 * A file's SHA-256 as the report states it: "sha256 …" when the browser
 * checked the bytes, else labelled as the manifest's. `digits` shortens it
 * (the panel). Undefined when the file didn't load.
 */
export function fileSha(
  f: EnvironmentFile,
  digits?: number,
): string | undefined {
  if (f.sha256 === undefined) {
    return undefined;
  }
  const value =
    digits !== undefined && f.sha256.length > digits
      ? `${f.sha256.slice(0, digits)}…`
      : f.sha256;
  return f.verified === true
    ? `sha256 ${value}`
    : `manifest SHA-256 ${value} (not verified in the browser)`;
}

export interface Report {
  markdown: string;
  json: unknown;
}

const REDACTED = "[redacted]";

/** A deep copy of `value` with every `secrets` occurrence in its strings redacted. */
function redact<T>(value: T, secrets: readonly string[]): T {
  if (secrets.length === 0) {
    return value;
  }
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      let s = v;
      for (const secret of secrets) {
        s = s.split(secret).join(REDACTED);
      }
      return s;
    }
    if (Array.isArray(v)) {
      return v.map(walk);
    }
    if (v !== null && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v).map(([k, child]) => [k, walk(child)]),
      );
    }
    return v;
  };
  return walk(value) as T;
}

/**
 * The run's counts (R15, R18), as the worker and the page count them: missing
 * data first (skipped), then shown-only, then pass or fail; the user's input
 * counted apart, in none of the others.
 */
export function reportCounts(results: readonly StressResult[]): {
  passed: number;
  failed: number;
  skipped: number;
  shown: number;
  yourInput: number;
} {
  const counts = { passed: 0, failed: 0, skipped: 0, shown: 0, yourInput: 0 };
  for (const r of results) {
    if (r.userInput === true) {
      counts.yourInput++;
    } else if (isSkipped(r)) {
      counts.skipped++;
    } else if (r.displayOnly === true) {
      counts.shown++;
    } else if (r.pass) {
      counts.passed++;
    } else {
      counts.failed++;
    }
  }
  return counts;
}

/** A judged result that failed (not skipped, not shown-only, not the user's). */
export const isFailure = (r: StressResult): boolean =>
  !r.pass &&
  r.displayOnly !== true &&
  r.userInput !== true &&
  (r.missing === undefined || r.missing.length === 0);

const isSkipped = (r: StressResult): boolean =>
  r.missing !== undefined && r.missing.length > 0;

/** Failures first, then everything else in run order. */
export function reportOrder(results: readonly StressResult[]): StressResult[] {
  return [
    ...results.filter(isFailure),
    ...results.filter((r) => !isFailure(r)),
  ];
}

/** A number with its unit; a dimensionless one marked as a ratio. */
const withUnit = (value: number, unit: string | undefined): string =>
  unit === undefined || unit === "" ? `${value} (ratio)` : `${value} ${unit}`;

/** The result's accuracy (R8, F27): the total, "not bounded" naming its term, or the note. */
export function accuracyText(r: StressResult): string {
  if (r.accuracy !== undefined) {
    if (r.accuracy.meters !== undefined) {
      return `±${r.accuracy.meters} m (1σ)`;
    }
    const unknown = r.accuracy.terms.find((t) => t.meters === undefined);
    return `not bounded: ${unknown?.note ?? "a term has no stated size"}`;
  }
  return r.accuracyNote ?? "accuracy not stated";
}

function status(r: StressResult): string {
  if (isSkipped(r)) {
    return `skipped (missing ${r.missing!.join(", ")})`;
  }
  if (r.displayOnly === true) {
    return "shown, not judged";
  }
  const verdict = r.pass ? "pass" : "FAIL";
  return r.userInput === true ? `${verdict} (your input)` : verdict;
}

function fingerprintText(r: StressResult): string {
  if (r.fingerprint === undefined) {
    return "";
  }
  const check = r.fingerprintCheck;
  return check === undefined
    ? "not compared"
    : check.match
      ? "browser = Node"
      : `browser ≠ Node: ${check.difference ?? "they differ"}`;
}

/** Text safe in a Markdown table cell. */
const cell = (s: string): string =>
  s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

/** Why a failure failed, in a line. */
function why(r: StressResult): string {
  if (r.fingerprintCheck && !r.fingerprintCheck.match) {
    return `browser ≠ Node: ${r.fingerprintCheck.difference ?? "the fingerprints differ"}`;
  }
  if (r.expectedError !== undefined) {
    return r.error === undefined
      ? "expected an error, and nothing was thrown"
      : `threw a different error: "${r.error}"`;
  }
  if (r.value !== undefined && r.tolerance !== undefined) {
    return `${withUnit(r.value, r.unit)} against a tolerance of ${withUnit(r.tolerance, r.unit)}`;
  }
  return r.error ?? r.detail ?? "failed";
}

/** The report of `results` (R15). `secrets` (the ion token) are redacted everywhere. */
export function buildReport(
  results: readonly StressResult[],
  environment: ReportEnvironment,
  options: { secrets?: readonly (string | undefined)[] } = {},
): Report {
  // Only secrets long enough to be one: an empty string would redact all.
  const secrets = (options.secrets ?? []).filter(
    (s): s is string => s !== undefined && s.length >= 8,
  );
  const ordered = redact(reportOrder(results), secrets);
  const env = redact(environment, secrets);
  const {
    passed,
    failed,
    skipped,
    shown,
    yourInput: yours,
  } = reportCounts(ordered);
  const fingerprinted = ordered.filter((r) => r.fingerprintCheck !== undefined);
  const matched = fingerprinted.filter((r) => r.fingerprintCheck!.match).length;

  const lines: string[] = [
    "# Frames explorer report",
    "",
    `Run ${env.startedAt}, ${(env.durationMs / 1000).toFixed(2)} s.`,
    "",
  ];
  if (ordered.length === 0) {
    lines.push("No results: run the tests first.", "");
  } else {
    lines.push(
      `${passed} passed, ${failed} failed, ${skipped} skipped (missing data); ${shown} shown, not judged; ${yours} of your input (not counted).`,
      `Fingerprints: ${matched} of ${fingerprinted.length} match Node's.`,
      "",
    );
    if (failed > 0) {
      lines.push("## Failures", "");
      for (const r of ordered.filter(isFailure)) {
        lines.push(`- \`${r.id}\` ${r.title}: ${why(r)}`);
      }
      lines.push("");
    }
    lines.push(
      "## Results",
      "",
      "| Status | Id | Check | Value | Tolerance | Accuracy | Effect | Fingerprint |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
    );
    for (const r of ordered) {
      const value =
        r.value !== undefined
          ? withUnit(r.value, r.unit)
          : r.expectedError !== undefined
            ? `threw: ${r.error ?? "nothing"}`
            : "";
      const tolerance =
        r.tolerance !== undefined
          ? withUnit(r.tolerance, r.unit)
          : r.expectedError !== undefined
            ? `/${r.expectedError}/`
            : "";
      const effect =
        r.effect !== undefined
          ? `${r.effect.value} ${r.effect.unit}: ${r.effect.label}`
          : "";
      lines.push(
        `| ${[
          status(r),
          `\`${r.id}\``,
          r.title,
          value,
          tolerance,
          accuracyText(r),
          effect,
          fingerprintText(r),
        ]
          .map(cell)
          .join(" | ")} |`,
      );
    }
    lines.push("");
    const prints = ordered.filter((r) => r.fingerprint !== undefined);
    if (prints.length > 0) {
      lines.push("## Fingerprints", "");
      for (const r of prints) {
        const f = r.fingerprint!;
        lines.push(
          `- \`${r.id}\` (${fingerprintText(r)}): \`${f.pipeline}\`${f.grids.length > 0 ? `; grids ${f.grids.map((g) => `${g.name} sha256 ${g.sha256}`).join(", ")}` : ""}; ${f.coordinates.length / 3} points`,
        );
      }
      lines.push("");
    }
  }
  lines.push(
    "## Environment",
    "",
    `- Run: ${env.startedAt}, ${(env.durationMs / 1000).toFixed(2)} s`,
    `- Package: ${env.packageVersion}`,
    `- Browser: ${env.userAgent}`,
    `- PROJ: ${env.proj ?? "not loaded"}`,
    ...(env.frameDataSpan !== undefined
      ? [`- Frame data span: ${env.frameDataSpan}`]
      : []),
    ...env.files.map(
      (f) =>
        `- ${f.label}: ${f.file}, ${fileSha(f) ?? "not loaded"}${f.note !== undefined ? ` (${f.note})` : ""}`,
    ),
    "",
    "The ion token is never part of this report.",
    "",
  );
  return {
    markdown: lines.join("\n"),
    json: {
      report: "frames explorer",
      duration: `${(env.durationMs / 1000).toFixed(2)} s`,
      environment: env,
      counts: { passed, failed, skipped, shown, yourInput: yours },
      fingerprints: { matched, compared: fingerprinted.length },
      results: ordered,
    },
  };
}
