// What each check row says (the owner, 2026-11-06: check rows expand in
// place, and each states its status in words as well as colour; Task 6c:
// and names its kind, apart from its status). Pure, so the words are
// unit-tested (test/framesExplorerCheckText.test.ts): nothing reads as
// verified that isn't (Review Focus 1).
import type { CheckKind, CheckRow } from "../scenarios/checks.ts";
import type { StressResult } from "../tests.ts";
import { formatAnswer, formatDelta } from "./answerText.ts";
import { length, quantity } from "./format.ts";
import type { ResultExtras } from "./model.ts";

/** A row's name: its short label, else its title (QuestionCard's `rowName`). */
const rowName = (r: StressResult, extras?: ResultExtras) =>
  extras?.label ?? r.title;

export type CheckTone =
  | "pass"
  | "fail"
  | "reference"
  | "loading"
  | "stale"
  /** Can't tell (the mask's comparison inside our terrain's error): never the pass tone. */
  | "unsure";

/** Each kind's tag (short, on a row) and its name (the legend's). */
export const KIND_TEXT: Readonly<
  Record<CheckKind, { tag: string; name: string; meaning: string }>
> = {
  published: {
    tag: "Published",
    name: "Published reference",
    meaning: "compared with a cited independent computation",
  },
  measured: {
    tag: "Measured",
    name: "Measured data",
    meaning: "compared with measurements: validated",
  },
  hand: {
    tag: "Hand",
    name: "Hand formula",
    meaning: "an independent closed-form check",
  },
  roundTrip: {
    tag: "Round trip",
    name: "Round trip",
    meaning: "two routes, or a there-and-back, that agree",
  },
  live: {
    tag: "Live",
    name: "Live re-run",
    meaning: "re-run at your setting, off the checked setup",
  },
};

export interface CheckRowText {
  key: string;
  /** What it compares with (its tag); never its status. */
  kind: CheckKind;
  title: string;
  /**
   * The status in a word or two, beside its icon: never colour alone, and
   * never the kind (the tag says what it compares with). "Checked" and
   * "Failed" only for a judged row whose setup is the current one.
   */
  status:
    | "Checked"
    | "Failed"
    | "Not judged here"
    | "Loading"
    | "Updating"
    | "Following"
    // A check against measured data, judged on the page (the dish's mask).
    | "Consistent"
    | "Rises above the mask"
    | "Can't tell";
  tone: CheckTone;
  /** One short line under the title: the value against its tolerance, or the delta. */
  summary: string;
  /** The judged result, for the inline details. */
  result?: StressResult;
}

/** Off the checked setup, a reference-backed row's line starts with this. */
export const REFERENCE_APPLIES = "Reference applies at the checked setup";

/** "3.2 nm, within 1 mm", or the case's own words. */
export function valueLine(r: StressResult): string {
  if (r.value !== undefined && r.tolerance !== undefined) {
    const within = Math.abs(r.value) <= r.tolerance;
    return `${quantity(r.value, r.unit)}, ${within ? "within" : "beyond"} ${quantity(r.tolerance, r.unit)}`;
  }
  if (r.effect) {
    return `${quantity(r.effect.value, r.effect.unit)}`;
  }
  return r.pass ? "judged by the case" : (r.error ?? "failed");
}

/**
 * A row's words. `freshness` is the shown evaluation's against the current
 * setup (model.ts): while it is the last setup's, no row carries a verdict,
 * a verdict's colour or a delta (Review Focus 1, R9). While the clock plays
 * the rows follow it in one steady state, their values updated in place.
 */
export function checkRowText(
  row: CheckRow,
  extras: Readonly<Record<string, ResultExtras>>,
  freshness: "current" | "updating" | "following" = "current",
  published?: { checkId: string; printed: string; unit: string },
): CheckRowText {
  const own = rowText(row, extras, published);
  if (
    freshness === "current" ||
    row.status === "pending" ||
    // The mask is the station's: the clock moving doesn't touch it.
    (row.status === "page" && freshness === "following")
  ) {
    return own;
  }
  const following = freshness === "following";
  const result = own.result;
  return {
    key: own.key,
    kind: own.kind,
    title: own.title,
    status: following ? "Following" : "Updating",
    tone: "stale",
    summary:
      following && result
        ? // The value only: "within" would read as a verdict for an
          // earlier time (fix 2).
          result.effect
          ? quantity(result.effect.value, result.effect.unit)
          : result.value !== undefined
            ? quantity(result.value, result.unit)
            : "following the clock"
        : row.status === "reference-only"
          ? REFERENCE_APPLIES
          : "re-running at your setting",
    ...(following && result && { result }),
  };
}

/** What a check without a published reference compares, in a few words. */
const AGREES: Readonly<Record<string, string>> = {
  roundTrip: "a round trip comes back",
  independent: "two routes agree",
  formula: "a hand formula agrees",
};

/**
 * A row's one line, collapsed (the owner, fix 1): ours against the
 * published value where the headline has one, else what it is compared
 * against.
 */
function summaryOf(
  r: StressResult,
  extras: ResultExtras | undefined,
  published: { checkId: string; printed: string; unit: string } | undefined,
): string {
  if (published && r.id === published.checkId && r.effect) {
    return `${formatAnswer(r.effect.value, published.unit)} vs ${published.printed} (published) · ${valueLine(r)}`;
  }
  const agrees =
    r.source === undefined ? AGREES[extras?.compared?.kind ?? ""] : undefined;
  return agrees ? `${valueLine(r)}: ${agrees}` : valueLine(r);
}

function rowText(
  row: CheckRow,
  extras: Readonly<Record<string, ResultExtras>>,
  published?: { checkId: string; printed: string; unit: string },
): CheckRowText {
  switch (row.status) {
    case "checked": {
      const r = row.result;
      return {
        key: `checked:${r.id}`,
        kind: row.kind,
        title: rowName(r, extras[r.id]),
        status: r.pass ? "Checked" : "Failed",
        tone: r.pass ? "pass" : "fail",
        summary: summaryOf(r, extras[r.id], published),
        result: r,
      };
    }
    case "live": {
      const r = row.result;
      return {
        key: `live:${r.id}`,
        kind: row.kind,
        title: rowName(r, extras[r.id]),
        status: r.pass ? "Checked" : "Failed",
        tone: r.pass ? "pass" : "fail",
        summary: summaryOf(r, extras[r.id], undefined),
        result: r,
      };
    }
    case "reference-only":
      return {
        key: `reference:${row.id}`,
        kind: row.kind,
        title: extras[row.id]?.label ?? row.title,
        status: "Not judged here",
        tone: "reference",
        summary: row.delta
          ? `${REFERENCE_APPLIES}; your setting moves the answer by ${formatDelta(row.delta.value, row.delta.unit)}`
          : `${REFERENCE_APPLIES}; not judged at your setting`,
      };
    case "page": {
      const c = row.check;
      const [status, tone]: [CheckRowText["status"], CheckTone] =
        c.outcome === "consistent"
          ? ["Consistent", "pass"]
          : c.outcome === "above"
            ? ["Rises above the mask", "fail"]
            : c.outcome === "unsure"
              ? ["Can't tell", "unsure"]
              : ["Loading", "loading"];
      return {
        key: `page:${c.id}`,
        kind: row.kind,
        title: c.title,
        status,
        tone,
        summary: c.summary,
      };
    }
    case "pending":
      return {
        key: `pending:${row.id}`,
        kind: row.kind,
        title: extras[row.id]?.label ?? row.title,
        status: "Loading",
        tone: "loading",
        summary: "the check is running",
      };
  }
}

/**
 * The fixed words a row's details can show (Checks.tsx renders them from
 * here, so `checkRowStrings` reads them too: fix 2).
 */
export const ROW_COPY = {
  liveReference:
    "None at your setting: a live re-run checks the frames\u2019 own consistency (round trips, routes through the tree).",
  stale:
    "Re-running at your setting: its verdict shows here when it\u2019s in, and nothing is claimed until then.",
  referenceOnly:
    "Its reference applies at the checked setup, not at yours, so it isn\u2019t judged here.",
  back: "Back to the checked setup",
  open: "Open in Verification",
  pendingAtChecked:
    "The catalog's check runs in the worker; its verdict shows here when it's in.",
  pendingOff: "Re-running at your setting; nothing is claimed until it's in.",
  accuracyNotStated: "not stated",
  tolerance: "against a tolerance of",
} as const;

/** The details' labels (Checks.tsx `Detail`). */
export const DETAIL_LABELS = [
  "Difference",
  "Value",
  "Computed",
  "Detail",
  "Compared against",
  "Compared",
  "Reference",
  "Accuracy",
] as const;

/** The reference-only row's sentence on how far the setting moves the answer. */
export const movesText = (delta: { value: number; unit: string }): string =>
  `Your setting moves the answer by ${formatDelta(delta.value, delta.unit)}.`;

/** A page check's accuracy, in its details. */
export const pageAccuracyText = (meters: number | undefined): string =>
  meters !== undefined
    ? `our terrain \u00b1${length(meters)} at the levels crossed; terrain not drawn is never taken as clear`
    : "terrain not drawn is never taken as clear";

/**
 * Every string a check row can render, collapsed or expanded (Checks.tsx
 * `CheckItem` and its details): its head, its note, the page check's
 * comparison and citation, and its result's title, detail, accuracy (note,
 * terms, warnings), effect, error, label, comparison and reference. The
 * guard that only measured data says "validated" reads all of it.
 */
export function checkRowStrings(
  row: CheckRow,
  t: CheckRowText,
  extras: ResultExtras | undefined,
): string[] {
  const out: (string | undefined)[] = [
    t.title,
    t.status,
    t.summary,
    // The fixed words of every branch of its details.
    ...Object.values(ROW_COPY),
    ...DETAIL_LABELS,
  ];
  if (row.status === "reference-only" && row.delta) {
    out.push(movesText(row.delta));
  }
  if (row.status === "checked") {
    out.push(row.note);
  }
  if (row.status === "page") {
    const c = row.check;
    out.push(c.title, c.summary, c.text, pageAccuracyText(c.meters));
    out.push(c.source.document, c.source.publisher, c.source.locator);
  }
  if (row.status === "pending" || row.status === "reference-only") {
    out.push(row.title);
  }
  const r =
    row.status === "checked" || row.status === "live" ? row.result : t.result;
  if (r) {
    out.push(r.title, r.detail, r.accuracyNote, r.error, r.effect?.label);
    for (const term of r.accuracy?.terms ?? []) {
      out.push(term.note);
    }
    out.push(...(r.accuracy?.warnings ?? []));
  }
  if (extras) {
    out.push(extras.label, extras.accuracyNote, extras.relative);
    out.push(extras.compared?.text);
    out.push(
      extras.source?.document,
      extras.source?.publisher,
      extras.source?.locator,
    );
  }
  return out.filter((x): x is string => typeof x === "string" && x !== "");
}
