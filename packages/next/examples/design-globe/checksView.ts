// The check panel's view (plan 4b Task 20; DESIGN.md "Layout" 5): checks.ts's
// rows, compared once in `checkRows`, grouped by what the page shows and
// worded once. A value the page doesn't show is "Not shown", never a pass;
// the viewer's own measurement is checked only where its ends are answer
// points (exact snaps land on the design, not on the generator's points),
// and otherwise says so. Pure: test/designGlobeChecksView.test.ts.
import type { Answers } from "./answers.ts";
import { checkRows, type CheckRow, type ShownValues } from "./checks.ts";
import { fixed, stationText } from "./measureModel.ts";

export interface CheckRowView {
  readonly id: string;
  readonly kind: "exact" | "published";
  /** "Exact answer" or "NGS datasheet". */
  readonly kindText: string;
  readonly label: string;
  readonly status: CheckRow["status"];
  /** "Checked", "Failed" or "Not shown". */
  readonly statusText: string;
  /** "6,146,924.898 shown; NGS publishes 6,146,924.900 ftUS". */
  readonly values: string;
  /** "0.0020 ftUS apart, within 0.0066 ftUS (the datasheet's precision)"; absent when not shown. */
  readonly difference?: string;
}

export interface CheckGroupView {
  readonly id: string;
  readonly title: string;
  readonly rows: readonly CheckRowView[];
  readonly checked: number;
  readonly failed: number;
  readonly notShown: number;
  /** An answer pair the page doesn't show: the viewer can measure it (its id). */
  readonly measurable?: string;
}

export interface ChecksView {
  readonly state: "waiting" | "ready";
  readonly tone: "pass" | "fail" | "waiting";
  /** One line: the counts, a failure first. */
  readonly summary: string;
  readonly counts: {
    readonly checked: number;
    readonly failed: number;
    readonly notShown: number;
  };
  readonly groups: readonly CheckGroupView[];
  /** The viewer's own measurement: what is checked of it, if anything. */
  readonly user?: string;
}

/** A status in a word: Checked, Failed or Not shown. */
function statusText(status: CheckRow["status"]): string {
  switch (status) {
    case "fail":
      return "Failed";
    case "not-shown":
      return "Not shown";
    default:
      return "Checked";
  }
}

const BASIS_TEXT: Record<CheckRow["basis"], string> = {
  exact: "exact",
  vertex: "a mesh vertex",
  pick: "the pick's footprint",
  published: "the datasheet's precision",
};

/** A small quantity once: "0", "1e-6", "2.3e-10", "0.0066", "1.250". */
function amount(x: number): string {
  const a = Math.abs(x);
  if (a === 0) {
    return "0";
  }
  if (a < 1e-3) {
    return a.toExponential(1).replace(".0e", "e");
  }
  return a < 1 ? a.toPrecision(2) : fixed(a, 3);
}

/** A row's label inside its group: the group's own words taken off the front. */
function within(label: string, prefix: string | undefined): string {
  if (prefix === undefined || !label.startsWith(prefix)) {
    return label;
  }
  const rest = label.slice(prefix.length);
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

function rowView(r: CheckRow, prefix?: string): CheckRowView {
  const published = r.kind === "published reference";
  const expected = `${fixed(r.expected, 3)} ${r.unit}`;
  const values =
    r.shown === undefined
      ? `The answer is ${expected}; the page doesn't show it now`
      : `${fixed(r.shown, 3)} shown; ${published ? "NGS publishes" : "the answer is"} ${expected}`;
  return {
    id: r.id,
    kind: published ? "published" : "exact",
    kindText: published ? "NGS datasheet" : "Exact answer",
    label: within(r.label, prefix),
    status: r.status,
    statusText: statusText(r.status),
    values,
    ...(r.shown !== undefined && {
      difference: `${amount(r.shown - r.expected)} ${r.unit} apart, within ${amount(r.tolerance)} ${r.unit} (${BASIS_TEXT[r.basis]})`,
    }),
  };
}

function group(
  id: string,
  title: string,
  rows: readonly CheckRow[],
  options: { readonly prefix?: string; readonly measurable?: string } = {},
): CheckGroupView {
  const { prefix, measurable } = options;
  const count = (s: CheckRow["status"]) =>
    rows.filter((r) => r.status === s).length;
  return {
    id,
    title,
    rows: rows.map((r) => rowView(r, prefix)),
    checked: count("pass"),
    failed: count("fail"),
    notShown: count("not-shown"),
    ...(measurable !== undefined && { measurable }),
  };
}

/** The answer point at a design point (within 1e-6 design units), or -1. */
function answerIndex(answers: Answers, design: ArrayLike<number>): number {
  return answers.points.findIndex((p) =>
    p.design.every((x, k) => Math.abs(x - design[k]!) <= 1e-6),
  );
}

/**
 * The panel's checks: `checkRows(answers, shown)` grouped as the page shows
 * them (the marker, each shown pair with its ends, NGS's mark, then the
 * answer pairs the page doesn't show, each measurable), with the viewer's
 * own measurement (`user`, its ends' design points) said for what it is.
 */
export function checksView(
  answers: Answers | undefined,
  shown: ShownValues | undefined,
  user?: {
    readonly a: ArrayLike<number>;
    readonly b: ArrayLike<number>;
    /** The site it is on; the corridor when absent. */
    readonly site?: string;
  },
): ChecksView {
  if (answers === undefined || shown === undefined) {
    return {
      state: "waiting",
      tone: "waiting",
      summary:
        "Waiting for the generator's answers (answers.json) to check against.",
      counts: { checked: 0, failed: 0, notShown: 0 },
      groups: [],
    };
  }
  const rows = checkRows(answers, shown);
  const taken = new Set<string>();
  const take = (pick: (r: CheckRow) => boolean): CheckRow[] => {
    const out = rows.filter((r) => !taken.has(r.id) && pick(r));
    for (const r of out) {
      taken.add(r.id);
    }
    return out;
  };
  const ofPoint = (i: number) => (r: CheckRow) =>
    r.id.startsWith(`point.${i}.`);
  const ofPair = (id: string) => (r: CheckRow) =>
    r.id.startsWith(`pair.${id}.`);

  // A pair is shown when its distances are: an end it shares with a shown
  // pair doesn't make it so.
  const pairShown = (p: Answers["pairs"][number]) => shown.pairs.has(p.id);
  const groups: CheckGroupView[] = [];
  // The marker's own point goes with it unless a shown pair has it.
  const markerPoint = answers.marker.point;
  const markerInPair = answers.pairs.some(
    (p) => pairShown(p) && (p.from === markerPoint || p.to === markerPoint),
  );
  groups.push(
    group(
      "marker",
      `Sta. ${stationText(answers.marker.station)} marker: the design against itself`,
      [
        ...take((r) => r.id === "marker.separation"),
        ...(markerInPair ? [] : take(ofPoint(markerPoint))),
      ],
      { prefix: `Sta. ${stationText(answers.marker.station)} marker: ` },
    ),
  );
  for (const p of answers.pairs.filter(pairShown)) {
    groups.push(
      group(
        `pair:${p.id}`,
        p.label,
        [
          ...take(ofPair(p.id)),
          ...take(ofPoint(p.from)),
          ...take(ofPoint(p.to)),
        ],
        { prefix: `${p.label}: ` },
      ),
    );
  }
  const mark = answers.mark;
  groups.push(
    group(
      "mark",
      `${mark.pid} ${mark.name} against NGS's datasheet`,
      take((r) => r.id.startsWith("mark.")),
      { prefix: `${mark.pid} ${mark.name}: ` },
    ),
  );
  const loose = take((r) => r.id.startsWith("point."));
  if (loose.length > 0) {
    groups.push(group("points", "Your points", loose));
  }
  for (const p of answers.pairs.filter((q) => !pairShown(q))) {
    groups.push(
      group(`pair:${p.id}`, p.label, take(ofPair(p.id)), {
        prefix: `${p.label}: `,
        measurable: p.id,
      }),
    );
  }

  const checked = rows.filter((r) => r.status === "pass").length;
  const failed = rows.filter((r) => r.status === "fail");
  const notShown = rows.filter((r) => r.status === "not-shown").length;
  const judged = checked + failed.length;
  const unshown = notShown > 0 ? `; ${notShown} not shown` : "";
  const summary =
    failed.length > 0
      ? `${failed.length} of ${judged} failed: ${failed[0]!.label}${unshown}.`
      : `${checked} values checked, all within tolerance${unshown}.`;

  let note: string | undefined;
  if (user !== undefined && (user.site ?? "corridor") !== "corridor") {
    note =
      "Your measurement is on another site, and the generator's per-point answers are the corridor's, so it is not shown here.";
  } else if (user !== undefined) {
    const a = answerIndex(answers, user.a);
    const b = answerIndex(answers, user.b);
    const pair = answers.pairs.find(
      (p) => (p.from === a && p.to === b) || (p.from === b && p.to === a),
    );
    note =
      pair !== undefined
        ? `Your measurement is the answers' “${pair.label}”: its values are checked under it.`
        : a >= 0 || b >= 0
          ? "One end of your measurement is an answer point and is checked; the distance between your ends has no exact answer, so it is not shown."
          : "Your measurement's ends are your own snaps, not answer points, so there is no exact answer to compare it with: not shown.";
  }
  return {
    state: "ready",
    tone: failed.length > 0 ? "fail" : "pass",
    summary,
    counts: { checked, failed: failed.length, notShown },
    groups,
    ...(note !== undefined && { user: note }),
  };
}
