/**
 * The Since-you-last-looked view's model (CS-747; DESIGN.md, "The Since
 * you last looked view"): what changed in the tracker between a point and
 * HEAD, each change with the decision or reason behind it when the record
 * has one. Pure: it reads the board's `/work-api/changes.json` answer
 * (scripts/workBoard.mjs, `readChanges`), which carries the fields of
 * every file that differs on both sides and the mainline commits between,
 * and diffs them here. Tested in test/dynoWorkChanges.test.ts.
 */
import type {
  ChangeCommit,
  ChangeCommitRef,
  ChangeFields,
  ChangesAnswer,
} from "../../scripts/workBoard.mjs";
import { type EntityKind, shortVersion } from "./work.ts";
import type { Words } from "./workHealth.ts";

/** The view's sections, in the order they show: what changes scope leads. */
export const CHANGE_SECTIONS = [
  "releases",
  "answered",
  "added",
  "dropped",
  "moved",
  "done",
  "filed",
] as const;
export type ChangeSection = (typeof CHANGE_SECTIONS)[number];

export const SECTION_DEFS: Record<
  ChangeSection,
  { name: string; one: string; rule: string }
> = {
  releases: {
    name: "Release scope",
    one: "release change",
    rule: "What joined, left or moved between releases (a release's needs), and releases added or made",
  },
  answered: {
    name: "Decisions answered",
    one: "decision answered",
    rule: "Each decision answered since the point, with its answer",
  },
  added: {
    name: "Added to the plan",
    one: "added",
    rule: "Committed work and milestones new since the point, proposals committed, and anything reopened",
  },
  dropped: {
    name: "Dropped",
    one: "dropped",
    rule: "Work, milestones and proposals dropped since the point",
  },
  moved: {
    name: "Moved between milestones",
    one: "moved",
    rule: "Items that left a milestone, joined one or moved from one to another (a milestone's constraints)",
  },
  done: {
    name: "Merged and done",
    one: "done",
    rule: "Work merged (done on this branch), milestones reached and outside waits ended",
  },
  filed: {
    name: "Proposals filed",
    one: "proposal filed",
    rule: "New proposals, not committed to yet: they change nothing until the owner commits them",
  },
};

/** Where a change's reason was found. */
export type WhySource = "record" | "decision" | "commit" | "text";

export const WHY_SOURCE_NAMES: Record<WhySource, string> = {
  record: "Its record",
  decision: "The decision",
  commit: "The commit",
  text: "Its text",
};

export interface ChangeWhy {
  from: WhySource;
  text: string;
  /** The decision the change follows. */
  decision?: string;
}

export interface Change {
  /** Unique within the view. */
  key: string;
  section: ChangeSection;
  id: string;
  entity: EntityKind;
  title: string;
  /** What happened, in a sentence with IDs. */
  what: Words;
  /** The reason behind it, when the record has one. */
  why?: ChangeWhy;
  /** A decision's answer. */
  answer?: string;
  /** The commit that made it, newest of those that did. */
  commit?: ChangeCommitRef & { merge: boolean };
  /** Work merged: the commits that carry its Work-Item trailer. */
  commits?: number;
  /** Still a proposal at HEAD. */
  proposed: boolean;
  /** Every ID the change involves: the scope narrows on these. */
  ids: string[];
}

export interface ChangesView {
  base: ChangeCommitRef;
  head: ChangeCommitRef;
  /** Mainline commits that changed the tracker. */
  commits: number;
  truncated: boolean;
  /** The tracker didn't exist at the point: everything in it is new. */
  began: boolean;
  /** Every section, in order, empty ones included. */
  sections: Array<{ section: ChangeSection; changes: Change[] }>;
  /** Changes in every section but Proposals filed. */
  total: number;
}

/** Titles and kinds of what the snapshot has now, for IDs the answer doesn't carry. */
export interface ChangeNames {
  title(id: string): string | undefined;
  kind(id: string): EntityKind | undefined;
  /** The milestones whose constraints name it now. */
  milestones?(id: string): readonly string[] | undefined;
}

const ID = /\bCS-[1-9]\d*\b/g;
const isId = (x: string) => /^CS-[1-9]\d*$/.test(x);
const idNumber = (id: string) => Number(id.replace(/^\D+-/, "")) || 0;

function entityKindOf(f: ChangeFields | undefined): EntityKind {
  if (!f) {
    return "work";
  }
  if (f.release) {
    return "release";
  }
  if (f.kind === "milestone" || f.kind === "project") {
    return f.kind;
  }
  if (f.kind === "decision" || f.kind === "external") {
    return f.kind;
  }
  return "work";
}

/** The IDs a milestone's constraints name ("CS-744 c?" → CS-744). */
const constraintIds = (f: ChangeFields | undefined) =>
  (f?.constraints ?? [])
    .map((c) => String(c).trim().split(/\s+/)[0] ?? "")
    .filter(isId);

/** "A", "A and B", "A, B and C", with each ID as a reference. */
function listWords(ids: readonly string[]): Words {
  const out: Array<string | { id: string }> = [];
  ids.forEach((id, k) => {
    if (k > 0) {
      out.push(k === ids.length - 1 ? " and " : ", ");
    }
    out.push({ id });
  });
  return out;
}

/** A sentence or paragraph cut at a word, at most `n` characters. */
export function cut(text: string, n: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= n) {
    return flat;
  }
  const at = flat.lastIndexOf(" ", n - 1);
  return `${flat.slice(0, at > n / 2 ? at : n - 1)}…`;
}

/** Commit bodies that say nothing of why: the merge queue's and tools' own. */
const BOILERPLATE = /^(Co-Authored-By|Signed-off-by):/im;

/**
 * The sentences of a commit's body that name `ids`, else its first
 * paragraph when the commit changed little else: the part of the
 * message that speaks of this change.
 */
function bodyReason(
  c: ChangeCommit,
  ids: readonly string[],
): string | undefined {
  const body = c.body
    .split("\n")
    .filter((l) => !BOILERPLATE.test(l))
    .join("\n")
    .trim();
  if (!body) {
    return undefined;
  }
  const sentences = body
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z(])/)
    .filter((s) => ids.some((id) => new RegExp(`\\b${id}\\b`).test(s)));
  if (sentences.length) {
    const said = sentences.slice(0, 2).join(" ");
    // A sentence of many changes: only its clauses that name this one.
    const clauses = said.split(/;\s+/);
    const mine = clauses.filter((s) =>
      ids.some((id) => new RegExp(`\\b${id}\\b`).test(s)),
    );
    return cut(
      mine.length && mine.length < clauses.length ? mine.join("; ") : said,
      320,
    );
  }
  // A message that names none of them speaks for this change only when
  // the commit made little else: one or two tracker files.
  if (c.files.length > 2) {
    return undefined;
  }
  const first = body.split(/\n\s*\n/)[0] ?? body;
  return cut(first, 320);
}

/** The mainline commits, newest first, with lookups by file and key. */
function commitIndex(
  commits: readonly ChangeCommit[],
  workItems: Readonly<Record<string, number>> = {},
) {
  /** The newest commit that set any of `keys` on `id`'s file. */
  const lastSetting = (id: string, keys: readonly string[]) =>
    commits.find((c) =>
      c.files.some((f) => f.id === id && f.keys.some((k) => keys.includes(k))),
    );
  /** The oldest commit that wrote `id`'s file whole (its `id:` line). */
  const adding = (id: string) =>
    [...commits]
      .reverse()
      .find((c) => c.files.some((f) => f.id === id && f.keys.includes("id")));
  /** The newest commit that touched `id`'s file at all. */
  const touching = (id: string) =>
    commits.find((c) => c.files.some((f) => f.id === id));
  const trailered = (id: string) => workItems[id] ?? 0;
  return { lastSetting, adding, touching, trailered };
}

const refOf = (c?: ChangeCommit): Change["commit"] =>
  c && {
    sha: c.sha,
    short: c.short,
    at: c.at,
    subject: c.subject,
    merge: c.parents > 1,
  };

/** Each release's ladder at one side: a release another needs comes first. */
function ladderOf(releases: ReadonlyArray<ChangeFields>): ChangeFields[] {
  const live = releases
    .filter((r) => r.state !== "dropped")
    .sort((a, b) => idNumber(a.id) - idNumber(b.id));
  const ids = new Set(live.map((r) => r.id));
  const out: ChangeFields[] = [];
  const placed = new Set<string>();
  while (out.length < live.length) {
    const next =
      live.find(
        (r) =>
          !placed.has(r.id) &&
          (r.needs ?? []).every((n) => !ids.has(n) || placed.has(n)),
      ) ?? live.find((r) => !placed.has(r.id))!;
    placed.add(next.id);
    out.push(next);
  }
  return out;
}

/** The release each ID belongs to at one side: the first in the ladder to need it. */
function releaseOfSide(
  releases: ReadonlyArray<ChangeFields>,
): Map<string, ChangeFields> {
  const out = new Map<string, ChangeFields>();
  const ids = new Set(releases.map((r) => r.id));
  for (const r of ladderOf(releases)) {
    for (const n of r.needs ?? []) {
      if (!ids.has(n) && !out.has(n)) {
        out.set(n, r);
      }
    }
  }
  return out;
}

/**
 * A decision's answer in words: an answer of one letter reads as the
 * text's Answer section, else that option's line.
 */
function answerOf(f: ChangeFields): string {
  const a = f.answer ?? "";
  return /^[A-Z]$/.test(a.trim()) ? (f.answer_note ?? f.answer_option ?? a) : a;
}

const versionOf = (r: ChangeFields) => r.release ?? r.title ?? r.id;
const shortOf = (r: ChangeFields) => shortVersion(versionOf(r));

/**
 * The view from the board's answer. `names` gives titles and kinds for IDs
 * the answer doesn't carry (a milestone that joined a release unchanged);
 * the answer's own fields win, so a dropped or deleted entity keeps the
 * title it had.
 */
export function changesOf(
  a: ChangesAnswer,
  names: ChangeNames = { title: () => undefined, kind: () => undefined },
): ChangesView {
  const byId = new Map(a.entities.map((e) => [e.id, e]));
  const idx = commitIndex(a.commits, a.work_items);
  const fieldsOf = (id: string) => byId.get(id)?.after ?? byId.get(id)?.before;
  const titleOf = (id: string) => fieldsOf(id)?.title ?? names.title(id) ?? id;
  const kindOf = (id: string): EntityKind =>
    byId.has(id) ? entityKindOf(fieldsOf(id)) : (names.kind(id) ?? "work");
  const began = a.base_files === 0 && a.entities.length > 0;

  // Decisions answered in the window, for reasons that follow one.
  const answeredNow = new Map<string, string>();
  for (const e of a.entities) {
    const af = e.after;
    if (
      af?.kind === "decision" &&
      af.answer &&
      af.answer !== e.before?.answer
    ) {
      answeredNow.set(e.id, answerOf(af));
    }
  }
  /** The first decision answered in the window that `texts` name, but not `self`. */
  const decisionIn = (self: string, ...texts: Array<string | undefined>) => {
    for (const t of texts) {
      for (const m of (t ?? "").matchAll(ID)) {
        if (m[0] !== self && answeredNow.has(m[0])) {
          return m[0];
        }
      }
    }
    return undefined;
  };

  /** The decision that asked to merge an item ("Merge CS-33, …"), answered. */
  const mergeAsked = new Map<string, { id: string; answer: string }>();
  for (const e of a.entities) {
    const m = /^Merge (CS-[1-9]\d*)\b/.exec(e.after?.title ?? "");
    if (m && e.after?.kind === "decision" && e.after.answer) {
      mergeAsked.set(m[1]!, {
        id: e.id,
        answer: answerOf(e.after),
      });
    }
  }
  const mergeWhy = (id: string): ChangeWhy | undefined => {
    const d = mergeAsked.get(id);
    return d && { from: "decision", decision: d.id, text: cut(d.answer, 240) };
  };

  /**
   * The decision a commit made a change on: one its message names in the
   * same sentence as the change, else the only one the commit answered.
   */
  const decisionOfCommit = (id: string, c?: ChangeCommit) => {
    if (!c) {
      return undefined;
    }
    const text = `${c.subject}. ${c.body}`.replace(/\s+/g, " ");
    for (const sentence of text.split(/(?<=[.!?;])\s+/)) {
      if (new RegExp(`\\b${id}\\b`).test(sentence)) {
        const d = decisionIn(id, sentence);
        if (d) {
          return d;
        }
      }
    }
    const answeredHere = c.files
      .filter((f) => f.keys.includes("answer") && answeredNow.has(f.id))
      .map((f) => f.id);
    return answeredHere.length === 1 && answeredHere[0] !== id
      ? answeredHere[0]
      : undefined;
  };

  /**
   * The reason behind a change: a field of its record, the decision it
   * follows, the part of its commit's message that speaks of it, or (for
   * something new) its own text's lead. Absent when none has one.
   */
  const whyOf = (
    id: string,
    opts: {
      field?: string;
      commit?: ChangeCommit;
      also?: readonly string[];
      lead?: string;
      needs?: readonly string[];
      /** It is itself a decision's answer: no other decision is its reason. */
      noDecision?: boolean;
    },
  ): ChangeWhy | undefined => {
    if (opts.field?.trim()) {
      const d = decisionIn(id, opts.field);
      return { from: "record", text: cut(opts.field, 320), decision: d };
    }
    const c = opts.commit;
    const d = opts.noDecision
      ? undefined
      : (decisionIn(id, ...(opts.needs ?? [])) ?? decisionOfCommit(id, c));
    if (d) {
      return {
        from: "decision",
        decision: d,
        text: cut(answeredNow.get(d)!, 240),
      };
    }
    const body = c && bodyReason(c, [id, ...(opts.also ?? [])]);
    if (body) {
      return { from: "commit", text: body };
    }
    if (opts.lead?.trim()) {
      return { from: "text", text: cut(opts.lead, 320) };
    }
    // A subject that credits the owner's word: "… (owner, 2026-11-19)".
    const owner = /\(owner(?:'s [a-z]+)?, (\d{4}-\d{2}-\d{2})\)/.exec(
      c?.subject ?? "",
    );
    if (owner) {
      return { from: "commit", text: `On the owner's word, ${owner[1]}.` };
    }
    return undefined;
  };

  const out: Record<ChangeSection, Change[]> = {
    releases: [],
    answered: [],
    added: [],
    dropped: [],
    moved: [],
    done: [],
    filed: [],
  };
  const push = (c: Omit<Change, "key">) =>
    out[c.section].push({
      ...c,
      key: `${c.section}:${c.id}:${out[c.section].length}`,
    });

  // Milestones' members at each side (dropped milestones name nothing).
  const milestones = a.entities.filter(
    (e) => e.before?.kind === "milestone" || e.after?.kind === "milestone",
  );
  const membersAt = (side: "before" | "after") => {
    const m = new Map<string, string[]>();
    for (const e of milestones) {
      const f = e[side];
      if (!f || f.state === "dropped") {
        continue;
      }
      for (const id of constraintIds(f)) {
        m.set(id, [...(m.get(id) ?? []), e.id]);
      }
    }
    return m;
  };
  const memBefore = membersAt("before");
  const memAfter = membersAt("after");

  // Releases at each side.
  const releasesAt = (side: "before" | "after") =>
    a.entities
      .map((e) => e[side])
      .filter((f): f is ChangeFields => !!f?.release);
  const relBefore = releaseOfSide(releasesAt("before"));
  const relAfter = releaseOfSide(releasesAt("after"));

  // ------------------------------------------------------ entity changes
  const addedIds = new Set<string>();
  for (const e of a.entities) {
    const b = e.before;
    const f = e.after;
    const id = e.id;
    const entity = entityKindOf(f ?? b);
    const title = titleOf(id);
    const proposed = f?.state === "proposed";
    const base = { id, entity, title, proposed };
    if (began) {
      break;
    }
    if (!b && f) {
      addedIds.add(id);
      const c = idx.adding(id) ?? idx.touching(id);
      if (f.state === "dropped") {
        continue; // added and dropped in the window: nothing changed
      }
      if (entity === "release") {
        push({
          ...base,
          section: "releases",
          what: [`Release ${versionOf(f)} added`],
          why: whyOf(id, { commit: c, lead: f.lead }),
          commit: refOf(c),
          ids: [id],
        });
        continue;
      }
      const into = memAfter.get(id) ?? [];
      const where: Words = into.length
        ? ["to ", ...listWords(into)]
        : f.project && entity !== "project"
          ? ["under ", { id: f.project }]
          : [];
      if (f.state === "proposed") {
        push({
          ...base,
          section: "filed",
          what: ["Proposed", ...(where.length ? [" ", ...where] : [])],
          why: whyOf(id, { commit: c, lead: f.lead, needs: f.needs }),
          commit: refOf(c),
          ids: [id, ...into, ...(f.project ? [f.project] : [])],
        });
      } else if (f.state === "done" && entity === "work") {
        const close = idx.lastSetting(id, ["state"]);
        push({
          ...base,
          section: "done",
          what: ["Added and merged", ...(where.length ? [" ", ...where] : [])],
          why: mergeWhy(id) ?? whyOf(id, { commit: close, lead: f.lead }),
          commit: refOf(close ?? c),
          commits: idx.trailered(id),
          ids: [id, ...into],
        });
      } else {
        push({
          ...base,
          section: "added",
          what: [
            entity === "milestone"
              ? "Milestone added"
              : entity === "decision"
                ? `Asked${f.decider ? ` of the ${f.decider}` : ""}`
                : entity === "external"
                  ? `Outside wait added${f.waiting_on ? ` (${f.waiting_on})` : ""}`
                  : "Added",
            ...(where.length ? [" ", ...where] : []),
          ],
          why: whyOf(id, {
            commit: c,
            lead: f.lead,
            needs: f.needs,
            also: into,
          }),
          commit: refOf(c),
          ids: [id, ...into, ...(f.project ? [f.project] : [])],
        });
      }
      continue;
    }
    if (b && !f) {
      const c = idx.touching(id);
      push({
        ...base,
        section: entity === "release" ? "releases" : "dropped",
        what: ["Removed from the tracker: its file is gone"],
        why: whyOf(id, { commit: c }),
        commit: refOf(c),
        ids: [id],
      });
      continue;
    }
    if (!b || !f) {
      continue;
    }
    const from = b.state;
    const to = f.state;
    const answered =
      entity === "decision" && !!f.answer && f.answer !== b.answer;
    if (answered) {
      const c = idx.lastSetting(id, ["answer"]);
      push({
        ...base,
        section: "answered",
        what: [
          f.answered_by === "owner"
            ? "The owner answered"
            : f.answered_by
              ? `Answered by ${f.answered_by}`
              : "Answered",
          ...(to === "done" ? [] : [`; it is still ${to}`]),
        ],
        answer: answerOf(f),
        // Its record's own words only: the answer is the change, and a
        // commit that records several answers says nothing of this one alone.
        why: whyOf(id, {
          field:
            f.rationale ??
            (answerOf(f) === f.answer_note ? undefined : f.answer_note),
          noDecision: true,
        }),
        commit: refOf(c),
        ids: [id, ...(f.project ? [f.project] : [])],
      });
      continue;
    }
    if (from === to) {
      continue;
    }
    const c = idx.lastSetting(id, ["state"]) ?? idx.touching(id);
    if (to === "dropped") {
      push({
        ...base,
        section: entity === "release" ? "releases" : "dropped",
        what: [
          from === "proposed" ? "Proposal dropped" : `Dropped, was ${from}`,
        ],
        why: whyOf(id, { field: f.reason, commit: c }),
        commit: refOf(c),
        ids: [id],
      });
    } else if (from === "dropped" || (from === "done" && to !== "done")) {
      push({
        ...base,
        section: "added",
        what: [`Reopened: it was ${from}, now ${to}`],
        why: whyOf(id, { field: f.reason, commit: c }),
        commit: refOf(c),
        ids: [id],
      });
    } else if (to === "done") {
      const what: Words =
        entity === "release"
          ? [`Released: ${versionOf(f)} made`]
          : entity === "milestone"
            ? ["Milestone reached"]
            : entity === "external"
              ? [
                  `Outside wait ended${f.waiting_on ? ` (${f.waiting_on})` : ""}`,
                ]
              : entity === "project"
                ? ["Project done"]
                : entity === "decision"
                  ? ["Closed without an answer recorded"]
                  : [from === "proposed" ? "Committed and merged" : "Merged"];
      push({
        ...base,
        section: entity === "release" ? "releases" : "done",
        what,
        why:
          entity === "work"
            ? mergeWhy(id)
            : whyOf(id, { field: f.reason, commit: c }),
        commit: refOf(c),
        commits: entity === "work" ? idx.trailered(id) : undefined,
        ids: [id, ...(memAfter.get(id) ?? [])],
      });
    } else if (from === "proposed") {
      const into = memAfter.get(id) ?? [];
      push({
        ...base,
        section: "added",
        what: [
          "Committed from a proposal",
          ...(into.length ? [", in ", ...listWords(into)] : []),
        ],
        why: whyOf(id, { field: f.reason, commit: c, needs: f.needs }),
        commit: refOf(c),
        ids: [id, ...into],
      });
      addedIds.add(id);
    } else if (to === "proposed") {
      push({
        ...base,
        section: "dropped",
        what: [`Back to a proposal, was ${from}`],
        why: whyOf(id, { field: f.reason, commit: c }),
        commit: refOf(c),
        ids: [id],
      });
    }
    // planned ↔ in-progress is a claim, not a change of scope.
  }

  // --------------------------------------------- moved between milestones
  if (!began) {
    const touched = new Set([...memBefore.keys(), ...memAfter.keys()]);
    const changedMs = new Set(milestones.map((e) => e.id));
    for (const id of [...touched].sort((x, y) => idNumber(x) - idNumber(y))) {
      if (addedIds.has(id)) {
        continue; // its Added row says where it went
      }
      const was = (memBefore.get(id) ?? []).filter((m) => changedMs.has(m));
      const now = (memAfter.get(id) ?? []).filter((m) => changedMs.has(m));
      const left = was.filter((m) => !now.includes(m));
      const joined = now.filter((m) => !was.includes(m));
      if (!left.length && !joined.length) {
        continue;
      }
      // Leaving a milestone that was itself dropped: its Dropped row says so.
      const droppedMs = (m: string) => byId.get(m)?.after?.state === "dropped";
      if (!joined.length && left.every(droppedMs)) {
        continue;
      }
      const rel = (side: Map<string, ChangeFields>, ms: readonly string[]) =>
        [...new Set(ms.map((m) => side.get(m)).filter(Boolean))].map((r) => r!);
      const rFrom = rel(relBefore, left);
      const rTo = rel(relAfter, joined);
      const crossRelease =
        rFrom.length > 0 &&
        rTo.length > 0 &&
        rFrom.map((r) => r.id).join() !== rTo.map((r) => r.id).join();
      const what: Words =
        left.length && joined.length
          ? [
              "Moved from ",
              ...listWords(left),
              " to ",
              ...listWords(joined),
              ...(crossRelease
                ? [
                    `, from ${rFrom.map(shortOf).join(", ")} to ${rTo.map(shortOf).join(", ")}`,
                  ]
                : []),
            ]
          : joined.length
            ? ["Joined ", ...listWords(joined)]
            : [
                "Left ",
                ...listWords(left),
                ...(() => {
                  const still = (
                    names.milestones?.(id) ??
                    memAfter.get(id) ??
                    []
                  ).filter((m) => !left.includes(m));
                  return still.length
                    ? ["; still in ", ...listWords(still)]
                    : names.milestones
                      ? ["; now in no milestone"]
                      : [];
                })(),
              ];
      const via = joined[0] ?? left[0]!;
      const c = idx.lastSetting(via, ["constraints"]) ?? idx.touching(via);
      const f = fieldsOf(id);
      push({
        id,
        entity: kindOf(id),
        title: titleOf(id),
        proposed: f?.state === "proposed",
        section: "moved",
        what,
        why: whyOf(id, { commit: c, also: [...left, ...joined] }),
        commit: refOf(c),
        ids: [id, ...left, ...joined],
      });
    }
  }

  // -------------------------------------------- release membership changes
  if (!began) {
    const ids = new Set([...relBefore.keys(), ...relAfter.keys()]);
    for (const id of [...ids].sort((x, y) => idNumber(x) - idNumber(y))) {
      const rb = relBefore.get(id);
      const ra = relAfter.get(id);
      if (rb?.id === ra?.id) {
        continue;
      }
      const what: Words =
        rb && ra
          ? [`Moved from ${shortOf(rb)} to ${shortOf(ra)}`]
          : ra
            ? [`Joined ${versionOf(ra)}`]
            : [`Left ${versionOf(rb!)}`];
      const via = (ra ?? rb)!.id;
      const c = idx.lastSetting(via, ["needs"]) ?? idx.touching(via);
      push({
        id,
        entity: kindOf(id),
        title: titleOf(id),
        proposed: fieldsOf(id)?.state === "proposed",
        section: "releases",
        what,
        why: whyOf(id, { commit: c, also: [via] }),
        commit: refOf(c),
        ids: [id, ...(rb ? [rb.id] : []), ...(ra ? [ra.id] : [])],
      });
    }
  }

  const sections = CHANGE_SECTIONS.map((section) => ({
    section,
    changes: out[section].sort(
      (x, y) =>
        (y.commit?.at ?? "").localeCompare(x.commit?.at ?? "") ||
        idNumber(x.id) - idNumber(y.id),
    ),
  }));
  return {
    base: a.base,
    head: a.head,
    commits: a.commits.length,
    truncated: a.truncated,
    began,
    sections,
    total: sections
      .filter((x) => x.section !== "filed")
      .reduce((n, x) => n + x.changes.length, 0),
  };
}

/** The view narrowed to changes that involve something in the scope. */
export function changesInScope(
  v: ChangesView,
  inScope: (id: string) => boolean,
): ChangesView {
  const sections = v.sections.map((x) => ({
    section: x.section,
    changes: x.changes.filter((c) => c.ids.some(inScope)),
  }));
  return {
    ...v,
    sections,
    total: sections
      .filter((x) => x.section !== "filed")
      .reduce((n, x) => n + x.changes.length, 0),
  };
}

// ---------------------------------------------------------------- text

/** Words as plain text, each ID by its title in quotes (no bare IDs). */
export function wordsText(words: Words, title: (id: string) => string): string {
  return words
    .map((x) => (typeof x === "string" ? x : `“${title(x.id)}”`))
    .join("");
}

/**
 * A short summary for a status update (the Copy as text button): a line
 * for the point, then each section with a line per change, titles in
 * place of IDs, at most `perSection` lines each. Proposals filed are
 * counted, not listed.
 */
export function changesText(
  v: ChangesView,
  since: string,
  title: (id: string) => string,
  perSection = 8,
): string {
  const lines: string[] = [];
  const n = v.total;
  lines.push(
    `What changed in the plan since ${since}: ${n === 0 ? "nothing" : `${n} ${n === 1 ? "change" : "changes"}`}.`,
  );
  if (v.began) {
    lines.push("The tracker began after that point: everything in it is new.");
    return lines.join("\n");
  }
  for (const { section, changes } of v.sections) {
    if (!changes.length) {
      continue;
    }
    if (section === "filed") {
      lines.push(
        "",
        `${changes.length} ${changes.length === 1 ? "proposal" : "proposals"} filed, not committed to yet.`,
      );
      continue;
    }
    lines.push("", SECTION_DEFS[section].name);
    for (const c of changes.slice(0, perSection)) {
      const what = wordsText(c.what, title);
      const tail =
        section === "answered" && c.answer
          ? `: ${cut(c.answer, 140)}`
          : section === "done" || section === "added"
            ? what === "Merged" || what === "Added"
              ? ""
              : ` (${what.charAt(0).toLowerCase()}${what.slice(1)})`
            : `: ${what.charAt(0).toLowerCase()}${what.slice(1)}`;
      lines.push(`- ${c.title}${tail}${c.proposed ? " [proposed]" : ""}`);
    }
    if (changes.length > perSection) {
      lines.push(`- and ${changes.length - perSection} more`);
    }
  }
  return lines.join("\n");
}

// --------------------------------------------------------------- visits

/** A visit to the view: the commit it showed, and when. */
export interface Visit {
  commit: string;
  at: string;
}

export const VISITS_KEY = "dyno.work.changes.visits";
/** Visits kept, newest first. */
export const VISITS_KEPT = 8;

/** The visits kept in this browser, newest first; none when storage refuses. */
export function readVisits(storage?: Pick<Storage, "getItem">): Visit[] {
  try {
    const raw = storage?.getItem(VISITS_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) {
      return [];
    }
    return list
      .filter(
        (v): v is Visit =>
          !!v &&
          typeof v === "object" &&
          typeof (v as Visit).commit === "string" &&
          /^[0-9a-f]{7,64}$/.test((v as Visit).commit) &&
          typeof (v as Visit).at === "string" &&
          !Number.isNaN(Date.parse((v as Visit).at)),
      )
      .slice(0, VISITS_KEPT);
  } catch {
    return [];
  }
}

/** The visits with `v` first: a visit at the same commit is moved up, not doubled. */
export function withVisit(visits: readonly Visit[], v: Visit): Visit[] {
  return [v, ...visits.filter((x) => x.commit !== v.commit)].slice(
    0,
    VISITS_KEPT,
  );
}

/** Keep the visits; false when the browser refuses (private mode, blocked storage). */
export function writeVisits(
  storage: Pick<Storage, "setItem"> | undefined,
  visits: readonly Visit[],
): boolean {
  try {
    if (!storage) {
      return false;
    }
    storage.setItem(VISITS_KEY, JSON.stringify(visits.slice(0, VISITS_KEPT)));
    return true;
  } catch {
    return false;
  }
}

/** The URL's query for a point: `commit=` or `date=`. */
export function pointQuery(p: { commit: string } | { date: string }): string {
  return "commit" in p
    ? `commit=${encodeURIComponent(p.commit)}`
    : `date=${encodeURIComponent(p.date)}`;
}

/** Local midnight of a `YYYY-MM-DD` day, as ISO 8601 with its zone offset. */
export function dayStart(day: string, offsetMinutes?: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const local = new Date(y!, m! - 1, d!);
  const off = offsetMinutes ?? -local.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${day}T00:00:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
