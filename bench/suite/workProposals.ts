/**
 * The Proposals view's model (CS-750; DESIGN.md, "The Proposals view"):
 * each proposal grouped by why it is proposed, with its header, its age
 * and its call in words: commit it, hold it or drop it, with the rule
 * that recommends one. Pure, for tests (test/dynoWorkProposals.test.ts).
 *
 * It builds on `proposalsOf` (CS-688, `work.ts`), which reads each
 * proposal's header (CS-686) and what a commit needs from the board's
 * snapshot. Nothing here reads hitld's store, and nothing is applied:
 * hitld 0.1.0-rc.1 has no command to commit or drop a proposal, so each
 * call is a question for the chief of staff, copied from the page.
 */

import {
  DEFAULT_DECIDER,
  idNumber,
  type Proposal,
  type ProposalHeader,
  proposalsOf,
  saysDoneWhen,
  type State,
  type WorkItem,
  type WorkMilestone,
  type WorkSnapshot,
} from "./work.ts";

const DAY = 86_400_000;

/**
 * Why a proposal is proposed, in the order the view shows the groups:
 * the exception that holds committed work up first.
 *
 * - **needed**: committed work (a planned or in-progress item, or a
 *   committed milestone's constraints) needs it, so it holds that work up.
 * - **waiting**: an open decision or study (a learning milestone) comes
 *   before the commit.
 * - **new**: its header makes the case for now.
 * - **deferred**: its header says it was deferred, or is for later.
 * - **unheaded**: it has no header and nothing in the graph says why: its
 *   case isn't written down. An exception of its own, never a guess.
 *
 * The first two come from the graph and hold with or without a header;
 * the last three from the header alone.
 */
export type ProposalGroup =
  "needed" | "waiting" | "new" | "deferred" | "unheaded";
export const PROPOSAL_GROUPS: readonly ProposalGroup[] = [
  "needed",
  "waiting",
  "new",
  "deferred",
  "unheaded",
];

/** Each group's name, and the rule that puts a proposal in it, in words. */
export const GROUP_NAMES: Record<ProposalGroup, string> = {
  needed: "Needed by committed work",
  waiting: "Waiting on a decision or study",
  new: "New",
  deferred: "Deferred",
  unheaded: "No header yet",
};
export const GROUP_RULES: Record<ProposalGroup, string> = {
  needed:
    "Planned or in-progress work needs it, or a committed milestone names it: it holds that work up until it is committed or the need is taken away.",
  waiting:
    "An open decision or study comes before the commit. Hold it until that is answered.",
  new: "Its header makes the case for now. The oldest filed come first, as the chief of staff brings them about five at a time.",
  deferred:
    "Its header says it was deferred or is for later. Kept for your review; never dropped by this page's suggestion.",
  unheaded:
    "It has no header, so its source and why now aren't written down, and nothing in the graph says why it's proposed. The chief of staff writes the header (CS-680); until then the page doesn't guess.",
};

/** The three calls on a proposal. */
export type ProposalCallKind = "commit" | "hold" | "drop";
export const CALL_NAMES: Record<ProposalCallKind, string> = {
  commit: "Commit",
  hold: "Hold",
  drop: "Drop",
};

/** Something about a proposal that needs attention, beside its group. */
export type ProposalFlag =
  /** No `**Proposal**` header in its text. */
  | "no-header"
  /** A proposed milestone with planned or in-progress constraints. */
  | "committed-inside"
  /** A need of it was dropped, so its premise may be gone. */
  | "need-dropped"
  /** Filed with a header two weeks ago or more, and not committed. */
  | "stale"
  /** Not shaped yet: no "Done when", or a milestone with shaping owed. */
  | "unshaped";

export const FLAG_NAMES: Record<ProposalFlag, string> = {
  "no-header": "No header",
  "committed-inside": "Committed work inside",
  "need-dropped": "A need was dropped",
  stale: "Two weeks old",
  unshaped: "Not shaped",
};

/**
 * A header filed this long ago or more comes back once (CS-686's answer:
 * "one untouched for about two weeks comes back once").
 */
export const STALE_DAYS = 14;

/** A header says it was deferred: its source or why now says so. */
const DEFERRED = /\b(defer(red|s)?|later)\b/i;

/** One proposal, as the Proposals view shows it. */
export interface ProposalRow {
  id: string;
  title: string;
  /** A proposed milestone, or else a proposed item. */
  milestone: boolean;
  project?: string;
  group: ProposalGroup;
  header?: ProposalHeader;
  /** Who says yes: the header's decider, else the owner. */
  decider: string;
  /**
   * When it was filed: the header's date, else when it became proposed
   * (the board's state history), else its creation. With where it came
   * from, for the label ("filed", "proposed").
   */
  since?: { at: string; from: "header" | "history" | "created" };
  /** Its age in whole days at `now`, when `since` is known. */
  days?: number;
  /** Committed work that needs it, by ID. */
  neededBy: string[];
  /** The open decisions and studies a commit waits for, by ID. */
  waitsOn: string[];
  /** What starting it waits for, not committing it. */
  startsAfter: string[];
  /** A proposed milestone's constraints, with their states. */
  constraints: Array<{ id: string; state?: State }>;
  /** A proposed milestone's planned or in-progress constraints. */
  committedInside: string[];
  /** Needs that were dropped. */
  droppedNeeds: string[];
  /** Its text says what done is (an item) or shaping owes nothing (a milestone). */
  shaped: boolean;
  /** The milestone a commit would put it in, when the graph names one. */
  target?: string;
  flags: ProposalFlag[];
  /** The call recommended, and the rule that recommends it, in words. */
  recommend: ProposalCallKind;
  reason: string;
  /** How many open items wait on it, directly or through others. */
  weight: number;
}

/** The view: every proposal in its group, with the counts. */
export interface ProposalsModel {
  rows: ProposalRow[];
  groups: Array<{ group: ProposalGroup; rows: ProposalRow[] }>;
  /** Rows with no header, in any group. */
  unheaded: number;
}

const isCommitted = (st: State | undefined) =>
  st === "planned" || st === "in-progress";

/**
 * When a proposal was filed: the header's date when it has one, else
 * when it entered `proposed` (the state history), else its creation.
 */
export function filedOf(
  s: WorkSnapshot,
  id: string,
  header: ProposalHeader | undefined,
  created: string | undefined,
): ProposalRow["since"] {
  if (header?.date && !Number.isNaN(Date.parse(header.date))) {
    return { at: header.date, from: "header" };
  }
  for (let i = s.history.length - 1; i >= 0; i--) {
    const e = s.history[i]!;
    if (e.id === id) {
      return e.state === "proposed"
        ? { at: e.at, from: "history" }
        : created
          ? { at: created, from: "created" }
          : undefined;
    }
  }
  return created ? { at: created, from: "created" } : undefined;
}

/** The group a proposal is in, by the rules of `ProposalGroup`. */
export function groupOf(p: Proposal): ProposalGroup {
  if (p.neededBy.length) {
    return "needed";
  }
  if (p.first.length) {
    return "waiting";
  }
  if (!p.header) {
    return "unheaded";
  }
  return DEFERRED.test(`${p.header.source ?? ""} ${p.header.why ?? ""}`)
    ? "deferred"
    : "new";
}

/**
 * The milestone a commit would put an item in: one that already names it
 * (a committed one first), else the committed milestone of the work that
 * needs it, else the committed milestone that names it as a constraint.
 */
function targetOf(
  p: Proposal,
  itemOf: ReadonlyMap<string, WorkItem>,
  msOf: ReadonlyMap<string, WorkMilestone>,
): string | undefined {
  if (p.milestone) {
    return undefined;
  }
  const own = p.item?.milestones ?? [];
  const committedOwn = own.find((m) => isCommitted(msOf.get(m)?.state));
  if (committedOwn ?? own[0]) {
    return committedOwn ?? own[0];
  }
  for (const by of p.neededBy) {
    if (msOf.has(by)) {
      return by;
    }
    const m = itemOf
      .get(by)
      ?.milestones.find((x) => isCommitted(msOf.get(x)?.state));
    if (m) {
      return m;
    }
  }
  return undefined;
}

/**
 * The call recommended, by these rules, first match wins (DESIGN.md, "The
 * Proposals view"). "Drop" is never recommended for a proposal with no
 * header: the "later" copies are kept for review (CS-686's answer).
 *
 * 1. Needed by committed work: commit it, after any decision before it.
 * 2. A proposed milestone with committed work inside: commit it.
 * 3. Waiting on a decision or study: hold it until that is answered.
 * 4. No header: hold it, and have its header written (CS-680).
 * 5. A need was dropped: drop it, its premise is gone.
 * 6. Deferred: hold it for review.
 * 7. New and shaped: commit it.
 * 8. New, not shaped, two weeks old or more: drop it, nobody shaped it.
 * 9. New, not shaped: hold it, and send it to shaping.
 */
export function recommendOf(
  r: Pick<
    ProposalRow,
    | "group"
    | "header"
    | "neededBy"
    | "waitsOn"
    | "committedInside"
    | "droppedNeeds"
    | "shaped"
    | "target"
    | "flags"
    | "milestone"
  >,
): { recommend: ProposalCallKind; reason: string } {
  const n = (k: number, one: string, many: string) =>
    `${k} ${k === 1 ? one : many}`;
  // The reasons name no IDs: the view shows each with its title beside
  // them (the target, what needs it, what it waits on).
  const first =
    r.waitsOn.length === 1
      ? "the decision or study it waits on is"
      : "the decisions or studies it waits on are";
  if (r.group === "needed") {
    const by = n(
      r.neededBy.length,
      "piece of committed work needs",
      "pieces of committed work need",
    );
    return r.waitsOn.length
      ? {
          recommend: "commit",
          reason: `${by} it. Commit it once ${first} answered, or take the need away.`,
        }
      : {
          recommend: "commit",
          reason: `${by} it, so it holds that work up. Commit it${r.target ? " to that work's milestone" : ""}, or take the need away.`,
        };
  }
  if (r.committedInside.length) {
    return {
      recommend: "commit",
      reason: `${n(r.committedInside.length, "of its items is", "of its items are")} already planned: committed work sits in a milestone nobody has committed.`,
    };
  }
  if (r.group === "waiting") {
    return {
      recommend: "hold",
      reason: `Hold it until ${first} answered: the answer decides whether it's needed.`,
    };
  }
  if (!r.header) {
    return {
      recommend: "hold",
      reason:
        "Hold it: why it's proposed isn't written down. Ask for its header (CS-680) before deciding. A \"later\" copy is kept for review, never dropped by default.",
    };
  }
  if (r.droppedNeeds.length) {
    return {
      recommend: "drop",
      reason: `${r.droppedNeeds.length === 1 ? "Something it needs was" : "Things it needs were"} dropped, so its premise may be gone.`,
    };
  }
  if (r.group === "deferred") {
    return {
      recommend: "hold",
      reason: "Deferred by its header: hold it for review with its batch.",
    };
  }
  if (r.shaped) {
    return {
      recommend: "commit",
      reason: r.milestone
        ? "Its case is made and shaping owes nothing: commit it."
        : `Its case is made and it says what done is: commit it${r.target ? " to the milestone that names it" : " to a milestone"}.`,
    };
  }
  if (r.flags.includes("stale")) {
    return {
      recommend: "drop",
      reason: `Filed ${STALE_DAYS} days ago or more and nobody has shaped it: drop it with that reason, or send it to shaping now.`,
    };
  }
  return {
    recommend: "hold",
    reason: r.milestone
      ? "Its case is made but shaping still owes it: hold it, and send it to shaping."
      : "Its case is made but it doesn't say what done is yet: hold it, and send it to shaping.",
  };
}

/**
 * The Proposals view's model: the proposals among `items` and the
 * proposed milestones in `milestones`, each in its group with its call,
 * the groups in the order of `PROPOSAL_GROUPS`.
 */
export function proposalsViewOf(
  s: WorkSnapshot,
  items: readonly WorkItem[] = s.items,
  milestones: readonly WorkMilestone[] = s.milestones,
  {
    now = Date.now(),
    weight,
  }: { now?: number; weight?: ReadonlyMap<string, number> } = {},
): ProposalsModel {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const msOf = new Map(s.milestones.map((m) => [m.id, m]));
  const stateOf = (id: string) => itemOf.get(id)?.state ?? msOf.get(id)?.state;
  const rows = proposalsOf(s, items, milestones, weight).map(
    (p): ProposalRow => {
      const group = groupOf(p);
      const since = filedOf(s, p.id, p.header, p.item?.created ?? undefined);
      const days = since
        ? Math.max(0, Math.floor((now - Date.parse(since.at)) / DAY))
        : undefined;
      const constraints = (p.milestone?.constraints ?? []).map((c) => ({
        id: c.id,
        state: stateOf(c.id),
      }));
      const committedInside = constraints
        .filter((c) => isCommitted(c.state))
        .map((c) => c.id);
      const droppedNeeds = (p.item?.needs ?? []).filter(
        (n) => stateOf(n) === "dropped",
      );
      const shaped = p.milestone
        ? p.milestone.to_shape.length === 0
        : saysDoneWhen(p.item?.text);
      const flags: ProposalFlag[] = [];
      if (!p.header) {
        flags.push("no-header");
      }
      if (committedInside.length) {
        flags.push("committed-inside");
      }
      if (droppedNeeds.length) {
        flags.push("need-dropped");
      }
      if (
        p.header &&
        since?.from === "header" &&
        days !== undefined &&
        days >= STALE_DAYS
      ) {
        flags.push("stale");
      }
      if (!shaped) {
        flags.push("unshaped");
      }
      const row = {
        id: p.id,
        title: p.title,
        milestone: !!p.milestone,
        project: p.project,
        group,
        header: p.header,
        decider: p.decider,
        since,
        days,
        neededBy: p.neededBy,
        waitsOn: p.first,
        startsAfter: p.startsAfter,
        constraints,
        committedInside,
        droppedNeeds,
        shaped,
        target: targetOf(p, itemOf, msOf),
        flags,
        weight: weight?.get(p.id) ?? 0,
      };
      return { ...row, ...recommendOf(row) };
    },
  );
  const filed = (r: ProposalRow) => r.since?.at ?? "";
  const order: Record<
    ProposalGroup,
    (a: ProposalRow, b: ProposalRow) => number
  > = {
    // Most committed work held up first.
    needed: (a, b) =>
      b.neededBy.length - a.neededBy.length || b.weight - a.weight,
    waiting: (a, b) => b.weight - a.weight,
    // The oldest filed first: CS-686's batches.
    new: (a, b) => filed(a).localeCompare(filed(b)),
    deferred: (a, b) => filed(a).localeCompare(filed(b)),
    // By project, a proposed milestone first in its project.
    unheaded: (a, b) =>
      idNumber(a.project ?? "") - idNumber(b.project ?? "") ||
      Number(b.milestone) - Number(a.milestone),
  };
  const groups = PROPOSAL_GROUPS.map((group) => ({
    group,
    rows: rows
      .filter((r) => r.group === group)
      .sort((a, b) => order[group](a, b) || idNumber(a.id) - idNumber(b.id)),
  }));
  return {
    rows: groups.flatMap((g) => g.rows),
    groups,
    unheaded: rows.filter((r) => !r.header).length,
  };
}

// ------------------------------------------------------------ the calls

/** A proposal's line in a question: its ID and title. */
const named = (id: string, title?: string) => (title ? `${id} (${title})` : id);

/**
 * The question a call copies for the chief of staff: what to do, why the
 * page recommends what it does, and how to read the proposal. Nothing is
 * applied from the page (hitld 0.1.0-rc.1 has no commit or drop command).
 */
export function callQuestionOf(
  r: ProposalRow,
  call: ProposalCallKind,
  titleOf: (id: string) => string | undefined = () => undefined,
): string {
  const what = r.milestone ? "proposed milestone" : "proposal";
  const subject = named(r.id, r.title);
  const ask =
    call === "commit"
      ? r.milestone
        ? `Commit the ${what} ${subject}: set it to planned.`
        : r.target
          ? `Commit the ${what} ${subject} to ${named(r.target, titleOf(r.target))}: set it to planned there.`
          : `Commit the ${what} ${subject}: set it to planned, in the milestone you propose.`
      : call === "hold"
        ? `Hold the ${what} ${subject}: keep it proposed${r.waitsOn.length ? ` until ${r.waitsOn.join(", ")} ${r.waitsOn.length === 1 ? "is" : "are"} answered` : !r.header ? ", and write its header (CS-686: source, why now, rough size, decider, date)" : !r.shaped ? ", and send it to shaping" : ""}.`
        : `Drop the ${what} ${subject}, with the reason: ${r.recommend === "drop" ? r.reason : "(say why)"}`;
  const list = (ids: readonly string[]) =>
    ids.map((id) => named(id, titleOf(id))).join("; ");
  const whyNow = r.header?.why ? ` Its header's why now: ${r.header.why}.` : "";
  const why = `Why it's proposed: ${
    r.group === "needed"
      ? `committed work needs it: ${list(r.neededBy)}.`
      : r.group === "waiting"
        ? `it waits on ${list(r.waitsOn)} first.`
        : r.group === "new"
          ? "its header makes the case for now."
          : r.group === "deferred"
            ? "its header defers it."
            : "not written down; it has no header."
  }${whyNow}`;
  const page = `The Proposals view recommends: ${CALL_NAMES[r.recommend].toLowerCase()}. ${r.reason}`;
  const decider =
    r.decider === DEFAULT_DECIDER ? "" : ` Its decider is ${r.decider}.`;
  return [
    `Chief of staff: ${ask}`,
    why,
    `${page}${decider}`,
    `Read it with: npx hitld work show ${r.id}`,
  ].join("\n");
}
