/**
 * The Health view's model (CS-745; DESIGN.md, "The Health view"): the
 * work graph's exceptions, each with what is wrong, a proposed fix in
 * words and, where one exists, the command that does it or checks it.
 * Pure functions over the board's snapshot, for tests.
 *
 * Two sorts of rule. Graph rules make the graph wrong (a loop, an item in
 * two milestones, a release crossing): they belong in `hitld work check`,
 * and this view shows them until hitld enforces them. Judgment signals
 * (work in no milestone, a proposal left waiting, a claim nobody seems to
 * hold) stay here for good. Nothing is applied from the page.
 */

import {
  ageText,
  ID_IN_TEXT,
  idNumber,
  isOpen,
  isReleaseItem,
  loopTies,
  milestoneRoadmapOf,
  proposalHeaderOf,
  releaseBandsOf,
  releaseClosuresOf,
  shortVersion,
  type ClosureViolation,
  type WorkItem,
  type WorkMilestone,
  type WorkSnapshot,
} from "./work.ts";

// ------------------------------------------------------------ words

/**
 * A sentence with the tracker's IDs in it: the view draws each ID with its
 * kind's mark and short title (every ID shown carries its title).
 */
export type Words = ReadonlyArray<string | { id: string }>;

const ID = /^CS-[1-9]\d*$/;

/** "A, B and C". */
function listOf(ids: readonly string[]): Words {
  const out: Array<string | { id: string }> = [];
  ids.forEach((id, i) => {
    if (i > 0) {
      out.push(i === ids.length - 1 ? " and " : ", ");
    }
    out.push(ID.test(id) ? { id } : id);
  });
  return out;
}

/**
 * Words from a template: an interpolated ID becomes a reference, a list
 * of IDs becomes "A, B and C", anything else stays text.
 */
function w(
  strings: TemplateStringsArray,
  ...parts: Array<string | number | readonly string[]>
): Words {
  const out: Array<string | { id: string }> = [];
  strings.forEach((s, i) => {
    if (s) {
      out.push(s);
    }
    if (i < parts.length) {
      const p = parts[i]!;
      if (Array.isArray(p)) {
        out.push(...listOf(p));
      } else if (typeof p === "string" && ID.test(p)) {
        out.push({ id: p });
      } else {
        out.push(String(p));
      }
    }
  });
  return out;
}

/** The words as plain text: IDs with their titles when `titleOf` is given. */
export function wordsText(
  words: Words,
  titleOf?: (id: string) => string | undefined,
): string {
  return words
    .map((x) =>
      typeof x === "string"
        ? x
        : titleOf?.(x.id)
          ? `${x.id} ${titleOf(x.id)}`
          : x.id,
    )
    .join("");
}

// ------------------------------------------------------------ kinds

export const HEALTH_KINDS = [
  "check",
  "loop",
  "crossing",
  "two-milestones",
  "no-milestone",
  "decision-due",
  "old-proposal",
  "appetite",
  "no-dispatch",
  "merged-open",
] as const;
export type HealthKind = (typeof HEALTH_KINDS)[number];

/** A proposal older than this many days is an exception: commit it or drop it. */
export const PROPOSAL_AGE_DAYS = 14;
/** A decision whose default is due within this many days is an exception. */
export const DECISION_DUE_DAYS = 2;

export interface HealthKindDef {
  /** The section's heading, plural. */
  name: string;
  /** One sentence: what the rule finds. */
  rule: string;
  /**
   * "graph": it makes the graph wrong, and belongs in `hitld work check`
   * (this view shows it until hitld enforces it). "signal": a judgment
   * signal, which stays here. "hitld": hitld's own check found it.
   */
  sort: "graph" | "signal" | "hitld";
  /** Its fix changes scope or a release: it needs the owner, and counts in Your move. */
  owner: boolean;
}

export const HEALTH_KIND_DEFS: Record<HealthKind, HealthKindDef> = {
  check: {
    name: "Tracker check problems",
    rule: "What hitld work check reports: the tracker's own rules, broken.",
    sort: "hitld",
    owner: false,
  },
  loop: {
    name: "Milestone loops",
    rule: "Milestones that wait on each other, so none can finish first.",
    sort: "graph",
    owner: true,
  },
  crossing: {
    name: "Release crossings",
    rule: "Open work a release pulls in from a milestone it doesn't need, or needs directly.",
    sort: "graph",
    owner: true,
  },
  "two-milestones": {
    name: "Items in two milestones",
    rule: "An open item that two or more milestones name: it belongs to one.",
    sort: "graph",
    owner: true,
  },
  "no-milestone": {
    name: "Planned work in no milestone",
    rule: "Committed work items no milestone holds. Decisions and outside waits gate items and need none; proposals are the Proposals view's.",
    sort: "signal",
    owner: true,
  },
  "decision-due": {
    name: "Decisions due",
    rule: `Open decisions whose default is taken within ${DECISION_DUE_DAYS} days unless answered.`,
    sort: "signal",
    owner: true,
  },
  "old-proposal": {
    name: "Proposals left waiting",
    rule: `Proposals filed more than ${PROPOSAL_AGE_DAYS} days ago and neither committed nor dropped.`,
    sort: "signal",
    owner: true,
  },
  appetite: {
    name: "Spend past appetite",
    rule: "Milestones whose tokens spent, or spent and still estimated, pass the appetite set at shaping.",
    sort: "signal",
    owner: true,
  },
  "no-dispatch": {
    name: "Claims with no live dispatch",
    rule: "Open items claimed on a branch with no dispatch in flight in hitld's ledger.",
    sort: "signal",
    owner: false,
  },
  "merged-open": {
    name: "Merged but still open",
    rule: "Open items whose claiming branch the main branch has moved past, or that show in progress with no branch claiming them.",
    sort: "signal",
    owner: false,
  },
};

/** The rule the Release view's Exceptions count follows once the Health view is mounted. */
export const HEALTH_RULE =
  "The Health view's exceptions that touch this release: its crossings, and every other exception on its milestones or their items.";

// ------------------------------------------------------------ exceptions

export interface HealthException {
  /** Unique on the page: its kind and its entity. */
  key: string;
  kind: HealthKind;
  /** The entity at fault, shown first with its title. */
  id: string;
  /** What is wrong. */
  what: Words;
  /** The proposed fix. */
  fix: Words;
  /** The entity whose file the fix changes, opened in the pane. */
  edit?: string;
  /** A command that does the fix or shows it; every one exists in hitld 0.1.0-rc.1, or is git's. */
  command?: string;
  /** The fix changes scope or a release: it needs the owner. */
  owner: boolean;
  /** Every tracker ID involved, the entity first: the scope keeps an exception that touches it. */
  involves: string[];
  /** The releases it touches, by release item ID. */
  releases: string[];
}

/** A kind the board can't read right now, and why. */
export interface HealthUnread {
  kind: HealthKind;
  why: string;
}

export interface Health {
  exceptions: HealthException[];
  /** Kinds with nothing found because their source can't be read, or doesn't exist yet. */
  unread: HealthUnread[];
  /** Exceptions per kind, in `HEALTH_KINDS`' order. */
  counts: Record<HealthKind, number>;
  /** The open releases in ladder order, for the filter. */
  releases: Array<{ id: string; short: string; proposed: boolean }>;
}

const DAY = 86_400_000;
const dayOf = (d?: string) => {
  const t = d ? Date.parse(d.length === 10 ? `${d}T00:00:00Z` : d) : NaN;
  return Number.isFinite(t) ? t : undefined;
};
const sentence = (s: string) => s.replace(/\.$/, "");

/**
 * A value as one shell word: as it is when only safe characters make it
 * up, else in single quotes. Git allows `;`, `$` and backticks in a
 * branch's name, and a copied command is pasted into a shell.
 */
export const shellWord = (v: string) =>
  /^[A-Za-z0-9._/@:+=-]+$/.test(v) ? v : `'${v.replace(/'/g, `'\\''`)}'`;
const unique = (ids: readonly string[]) =>
  ids.filter((x, i) => ids.indexOf(x) === i);

/**
 * The work graph's exceptions (CS-745), over the whole graph: proposed
 * milestones and items included, since a proposal can make the graph
 * wrong too (CS-341's crossing ran through one). `now` defaults to when
 * the snapshot was made, so the ages don't move between reads.
 */
export function healthOf(
  s: WorkSnapshot,
  { now = Date.parse(s.generated) }: { now?: number } = {},
): Health {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const msOf = new Map(
    s.milestones.filter((m) => m.state !== "dropped").map((m) => [m.id, m]),
  );
  const openMs = (m?: WorkMilestone) =>
    !!m && m.state !== "done" && m.state !== "dropped";
  const closures = releaseClosuresOf(s, true);
  const { bandOf } = releaseBandsOf(s, closures);
  const releaseOfMs = (id: string) => closures[bandOf.get(id) ?? -1]?.id;
  const shortOf = new Map(closures.map((c) => [c.id, shortVersion(c.version)]));
  const releasesOf = (ids: readonly string[], extra: string[] = []) => {
    const out = new Set(extra);
    for (const id of ids) {
      const ms = msOf.has(id) ? [id] : (itemOf.get(id)?.milestones ?? []);
      for (const m of ms) {
        const r = msOf.has(m) ? releaseOfMs(m) : undefined;
        if (r) {
          out.add(r);
        }
      }
    }
    return closures.map((c) => c.id).filter((id) => out.has(id));
  };
  // Which of an item's milestones keeps it: the one in the earliest
  // release, where the work is needed first, when one release comes first.
  const where = (m: string) => {
    const r = releaseOfMs(m);
    return r ? shortOf.get(r)! : "no release";
  };
  const keepOf = (all: readonly string[]) => {
    const rank = (m: string) => bandOf.get(m) ?? Infinity;
    const sorted = [...all].sort(
      (a, b) => rank(a) - rank(b) || idNumber(a) - idNumber(b),
    );
    const first =
      sorted.length > 1 && rank(sorted[0]!) < rank(sorted[1]!)
        ? sorted[0]
        : undefined;
    return {
      all,
      first,
      rest: first ? sorted.filter((m) => m !== first) : sorted.slice(1),
      where,
    };
  };
  const out: HealthException[] = [];
  const unread: HealthUnread[] = [];
  const add = (
    kind: HealthKind,
    e: Omit<HealthException, "key" | "kind" | "owner" | "releases"> & {
      releases?: string[];
    },
  ) =>
    out.push({
      key: `${kind}:${e.id}`,
      kind,
      owner: HEALTH_KIND_DEFS[kind].owner,
      releases: e.releases ?? releasesOf(e.involves),
      ...e,
    });

  // hitld's own check.
  s.problems.forEach((p, i) => {
    const ids = [...new Set(p.match(ID_IN_TEXT) ?? [])];
    add("check", {
      id: ids[0] ?? `check-${i + 1}`,
      what: w`${sentence(p)}.`,
      fix: w`Fix what it names in the file, then run the check again.`,
      command: "npx hitld work check",
      edit: ids[0],
      involves: ids,
    });
  });

  // Milestone loops: groups of milestones that wait on each other.
  const rows = milestoneRoadmapOf(s, s.items, undefined, true);
  const groups = new Map<string, string[]>();
  for (const r of rows) {
    if (r.group.length > 1) {
      groups.set(r.group.join(), r.group);
    }
  }
  for (const group of groups.values()) {
    const ms = group.filter((id) => msOf.has(id));
    const inGroup = new Set(group);
    const ties = loopTies(rows, group);
    const doubled = s.items
      .filter(
        (it) =>
          isOpen(it) &&
          !isReleaseItem(it) &&
          it.milestones.filter((m) => inGroup.has(m)).length > 1,
      )
      .sort((a, b) => idNumber(a.id) - idNumber(b.id));
    const tieWords = ties.flatMap((t, i): Words => [
      i === 0 ? "" : i === ties.length - 1 ? "; and " : "; ",
      ...(t.items.length
        ? w`${t.from} waits on ${t.to} through ${t.items}`
        : w`${t.from} names ${t.to}`),
    ]);
    let fix: Words;
    let edit: string | undefined;
    if (doubled.length === 1) {
      const it = doubled[0]!;
      const k = keepOf(it.milestones.filter((m) => inGroup.has(m)));
      fix = k.first
        ? w`Keep ${it.id} in one milestone: in ${k.first}, whose release (${k.where(k.first)}) needs it first, and out of ${k.rest}. Being in both ties them.`
        : w`Keep ${it.id} in one milestone: take it out of all but one of ${k.all}. Being in each ties them.`;
      edit = k.rest[0];
    } else if (doubled.length > 1) {
      fix = w`Keep each item in one milestone: ${doubled.map((d) => d.id)} are each in two of the loop's milestones, and that ties them.`;
      edit = keepOf(doubled[0]!.milestones.filter((m) => inGroup.has(m)))
        .rest[0];
    } else if (ties.length) {
      const t = ties[0]!;
      fix = t.items.length
        ? w`Break the smallest wait: move ${t.items} out of ${t.from}, into ${t.to} or a milestone after it, or take off the need behind it.`
        : w`Take ${t.to} out of ${t.from}'s constraints, or the waits the other way.`;
      edit = t.from;
    } else {
      fix = w`Take one wait out of the loop.`;
    }
    add("loop", {
      id: ms[0] ?? group[0]!,
      what: [
        ...w`${group} wait on each other, so none can finish first: `,
        ...tieWords,
        ".",
      ],
      fix,
      edit,
      involves: unique([
        ...group,
        ...doubled.map((d) => d.id),
        ...ties.flatMap((t) => t.items),
      ]),
    });
  }

  // Release crossings.
  const seen = new Set<string>();
  for (const c of closures) {
    for (const v of c.violations) {
      const key = `${v.release}:${v.item}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const r = shortOf.get(v.release)!;
      add("crossing", {
        id: v.item,
        ...crossingWords(v, r, c.closure, msOf, itemOf),
        involves: unique([v.item, ...v.milestones, ...v.path.slice(1, -1)]),
        releases: [v.release],
      });
    }
  }

  // Items in two milestones.
  for (const it of s.items) {
    if (!isOpen(it) || isReleaseItem(it)) {
      continue;
    }
    const ms = it.milestones.filter((m) => msOf.has(m));
    if (ms.length < 2) {
      continue;
    }
    const k = keepOf(ms);
    add("two-milestones", {
      id: it.id,
      what: [
        ...w`Named by ${ms.length} milestones: `,
        ...ms.flatMap((m, i): Words => [
          i === 0 ? "" : i === ms.length - 1 ? " and " : ", ",
          ...w`${m} (${k.where(m)})`,
        ]),
        ".",
      ],
      fix: k.first
        ? w`Keep it in ${k.first}, whose release (${k.where(k.first)}) needs it first: take it out of ${k.rest}.`
        : w`Keep it in one milestone: take it out of all but one of ${ms}.`,
      edit: k.rest[0],
      involves: [it.id, ...ms],
    });
  }

  // Planned work in no milestone.
  for (const it of s.items) {
    if (
      it.kind !== "work" ||
      isReleaseItem(it) ||
      (it.state !== "planned" && it.state !== "in-progress") ||
      it.milestones.some((m) => msOf.has(m))
    ) {
      continue;
    }
    // Where it would go: the open milestones that hold what it needs or
    // what needs it, most links first; else its project's.
    const near = new Map<string, string[]>();
    for (const n of [...it.needs, ...it.needed_by]) {
      for (const m of itemOf.get(n)?.milestones ?? []) {
        if (openMs(msOf.get(m))) {
          near.set(m, [...(near.get(m) ?? []), n]);
        }
      }
    }
    const best = [...near].sort(
      (a, b) => b[1].length - a[1].length || idNumber(a[0]) - idNumber(b[0]),
    )[0];
    const projectMs = [...msOf.values()]
      .filter((m) => m.project === it.project && openMs(m))
      .map((m) => m.id);
    const fix = best
      ? it.needed_by.includes(best[1][0]!)
        ? w`Add it to ${best[0]}, which holds ${best[1]} that ${best[1].length === 1 ? "needs" : "need"} it. Or drop it, if no outcome needs it.`
        : w`Add it to ${best[0]}, which holds ${best[1]} that it needs. Or drop it, if no outcome needs it.`
      : projectMs.length
        ? projectMs.length > 1
          ? w`Add it to a milestone of its project, such as ${projectMs[0]!} or ${projectMs[1]!}, or drop it if no outcome needs it.`
          : w`Add it to ${projectMs[0]!}, its project's milestone, or drop it if no outcome needs it.`
        : it.project
          ? w`Give ${it.project} a milestone this item serves, or drop the item if no outcome needs it.`
          : w`Put it in a milestone whose outcome needs it, or drop it.`;
    add("no-milestone", {
      id: it.id,
      what: it.project
        ? w`${it.state === "in-progress" ? "In progress" : "Planned"} in ${it.project}, and no milestone names it: no outcome says why it is done.`
        : w`${it.state === "in-progress" ? "In progress" : "Planned"}, and no milestone names it: no outcome says why it is done.`,
      fix,
      edit: best?.[0] ?? projectMs[0] ?? it.id,
      involves: unique([
        it.id,
        ...(best ? [best[0], ...best[1]] : []),
        ...(it.project ? [it.project] : []),
      ]),
      releases: best ? releasesOf([best[0]]) : [],
    });
  }

  // Decisions whose default is due. The read API carries no default or
  // deadline yet; read them when present, as the Release view does.
  type Timed = { default?: unknown; deadline?: unknown };
  const decisions = s.items.filter(
    (it) => it.kind === "decision" && isOpen(it),
  );
  const timed = decisions.filter((it) => (it as Timed).deadline !== undefined);
  if (decisions.length && !timed.length) {
    unread.push({
      kind: "decision-due",
      why: "hitld's read API gives no decision a default or a deadline yet, so this can't be told.",
    });
  }
  for (const it of timed) {
    const t = dayOf(String((it as Timed).deadline));
    if (t === undefined || t - now > DECISION_DUE_DAYS * DAY) {
      continue;
    }
    const d = (it as Timed).default;
    const left = t - now;
    add("decision-due", {
      id: it.id,
      what:
        left <= 0
          ? w`Its default was due ${ageText(-left)} ago.`
          : w`Its default is taken in ${ageText(left)} unless it is answered.`,
      fix:
        typeof d === "string" && d.trim()
          ? w`Answer it, or let its default stand: ${d.trim()}.`
          : w`Answer it before its default is taken.`,
      edit: it.id,
      involves: [it.id, ...it.needed_by],
      releases: releasesOf(it.needed_by),
    });
  }

  // Proposals left waiting.
  const proposals: Array<WorkItem | WorkMilestone> = [
    ...s.items.filter((it) => it.state === "proposed"),
    ...[...msOf.values()].filter((m) => m.state === "proposed"),
  ];
  for (const p of proposals) {
    const filed = dayOf(proposalHeaderOf(p.text)?.date) ?? dayOf(created(p));
    if (filed === undefined || now - filed <= PROPOSAL_AGE_DAYS * DAY) {
      continue;
    }
    const isMs = p.kind === "milestone";
    add("old-proposal", {
      id: p.id,
      what: w`Filed ${ageText(now - filed)} ago, and still a proposal.`,
      fix: isMs
        ? w`Commit it (state: planned) or drop it with a reason: a milestone left proposed keeps its work out of every release.`
        : w`Commit it (state: planned) or drop it with a reason.`,
      edit: p.id,
      involves: [p.id],
    });
  }

  // Spend past appetite.
  const withAppetite = [...msOf.values()].filter(
    (m) => openMs(m) && (m.appetite_tokens ?? 0) > 0,
  );
  if (!withAppetite.length) {
    unread.push({
      kind: "appetite",
      why: "No open milestone has an appetite yet: it is set at shaping, with estimates.",
    });
  }
  for (const m of withAppetite) {
    const its = m.constraints
      .map((c) => itemOf.get(c.id))
      .filter((x): x is WorkItem => !!x);
    const spent = its.reduce((n, it) => n + (it.tokens_spent ?? 0), 0);
    const ahead = its
      .filter(isOpen)
      .reduce(
        (n, it) =>
          n + Math.max(0, (it.estimate_tokens ?? 0) - (it.tokens_spent ?? 0)),
        0,
      );
    const appetite = m.appetite_tokens!;
    if (spent + ahead <= appetite) {
      continue;
    }
    add("appetite", {
      id: m.id,
      what:
        spent > appetite
          ? w`${tokens(spent)} tokens spent, past its appetite of ${tokens(appetite)}.`
          : w`${tokens(spent)} tokens spent and ${tokens(ahead)} still estimated, past its appetite of ${tokens(appetite)}.`,
      fix: w`Cut its scope to fit, or raise its appetite on purpose: the appetite is the bet.`,
      edit: m.id,
      involves: [m.id],
    });
  }

  // Claims with no live dispatch, and work merged but still open.
  const live = s.live;
  if (!live || !live.claims.ok) {
    const why = live
      ? `hitld work claims couldn't be read (${live.claims.ok ? "" : live.claims.why}).`
      : "The live run wasn't read.";
    unread.push({ kind: "no-dispatch", why }, { kind: "merged-open", why });
  } else {
    if (!live.ledger.ok) {
      unread.push({
        kind: "no-dispatch",
        why: `hitld's ledger couldn't be read (${live.ledger.why}).`,
      });
    } else {
      const dispatched = new Set(live.ledger.dispatches.map((d) => d.item));
      const claims = live.claims.list.filter(
        (c) => !dispatched.has(c.id) && isOpen(itemOf.get(c.id) ?? closed),
      );
      for (const c of claims) {
        const at = dayOf(c.at);
        add("no-dispatch", {
          id: c.id,
          what: [
            ...w`Claimed${c.claimed_by ? ` by ${c.claimed_by}` : ""} on ${c.where}`,
            at !== undefined ? ` ${ageText(Math.max(0, now - at))} ago` : "",
            ", and hitld's ledger has no dispatch in flight for it. A session set up by hand has none either.",
          ],
          fix: w`Check that its session is still working. If it has ended, give the claim up.`,
          command: `npx hitld work unclaim ${shellWord(c.id)} --branch ${shellWord(c.where)} --reason "its session ended"`,
          edit: c.id,
          involves: [c.id],
        });
      }
    }
    const staleBy = new Map<string, string[]>();
    for (const c of live.claims.stale) {
      if (isOpen(itemOf.get(c.id) ?? closed)) {
        staleBy.set(c.id, [...(staleBy.get(c.id) ?? []), c.where]);
      }
    }
    for (const [id, branches] of [...staleBy].sort(
      (a, b) => idNumber(a[0]) - idNumber(b[0]),
    )) {
      add("merged-open", {
        id,
        what: w`Still claimed on ${branches.length === 1 ? "a branch" : `${branches.length} branches`} the main branch has moved past: ${branches}.`,
        fix: w`Delete ${branches.length === 1 ? "that branch" : "those branches"} if ${branches.length === 1 ? "its" : "their"} work merged (git refuses an unmerged one), so the claim stops showing.`,
        command: `git branch -d ${branches.map(shellWord).join(" ")}`,
        edit: id,
        involves: [id],
      });
    }
    const claimed = new Set(live.claims.list.map((c) => c.id));
    for (const it of s.items) {
      if (
        it.state === "in-progress" &&
        !claimed.has(it.id) &&
        !staleBy.has(it.id)
      ) {
        add("merged-open", {
          id: it.id,
          what: w`In progress on this branch, and no branch claims it: its branch merged without closing it, or is gone.`,
          fix: w`If its work landed, close it on a branch; if not, give the claim up.`,
          command: `npx hitld work unclaim ${shellWord(it.id)} --reason "its branch is gone"`,
          edit: it.id,
          involves: [it.id],
        });
      }
    }
  }

  const order = (e: HealthException) => HEALTH_KINDS.indexOf(e.kind);
  const exceptions = out.sort(
    (a, b) => order(a) - order(b) || idNumber(a.id) - idNumber(b.id),
  );
  const counts = Object.fromEntries(HEALTH_KINDS.map((k) => [k, 0])) as Record<
    HealthKind,
    number
  >;
  for (const e of exceptions) {
    counts[e.kind]++;
  }
  return {
    exceptions,
    unread,
    counts,
    releases: closures.map((c) => ({
      id: c.id,
      short: shortVersion(c.version),
      proposed: c.proposed,
    })),
  };
}

/** A stand-in for an ID the snapshot doesn't have: not open. */
const closed = { state: "done" } as WorkItem;

const created = (p: WorkItem | WorkMilestone) =>
  "created" in p ? p.created : undefined;

/** Tokens in short: 12k, 1.2M. */
function tokens(n: number): string {
  return n >= 1e6
    ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`
    : n >= 1e3
      ? `${Math.round(n / 1e3)}k`
      : String(n);
}

/** What a crossing is and the move that ends it. */
function crossingWords(
  v: ClosureViolation,
  release: string,
  closure: ReadonlySet<string>,
  msOf: ReadonlyMap<string, WorkMilestone>,
  itemOf: ReadonlyMap<string, WorkItem>,
): { what: Words; fix: Words; edit?: string } {
  // The milestone inside the release nearest the item, on the path to it:
  // the item's work is needed there, so that is where it moves.
  const inside = [...v.path]
    .reverse()
    .find((id) => msOf.has(id) && closure.has(id));
  const via = v.path.slice(1, -1);
  const needer = v.path.at(-2);
  const placeOf = (m: string) =>
    msOf.get(m)?.state === "proposed" ? " (a proposal in no release)" : "";
  if (v.kind === "milestone") {
    return {
      what: w`${release} needs ${v.path[1] ?? v.item}, which names ${v.item}; ${release} doesn't need ${v.item}.`,
      fix: w`Add ${v.item} to ${release}, or take it out of ${needer ?? v.item}'s constraints.`,
      edit: needer,
    };
  }
  if (v.kind === "direct") {
    return {
      what: v.milestones.length
        ? w`${release} needs it directly, and it sits in ${v.milestones}, which ${release} doesn't need.`
        : w`${release} needs it directly: a release needs milestones only.`,
      fix: v.milestones.length
        ? w`Add ${v.milestones} to ${release} in its place, or move it into one of ${release}'s milestones.`
        : w`Move it into one of ${release}'s milestones, and take it off ${release}'s needs.`,
      edit: v.release,
    };
  }
  const from = v.milestones;
  const item = itemOf.get(v.item);
  return {
    what: [
      ...w`${release} needs it through ${via}, and it sits in ${from}`,
      from.length === 1 ? placeOf(from[0]!) : "",
      ...w`, which ${release} doesn't need.`,
    ],
    fix: inside
      ? w`Move it out of ${from} into ${inside} (${release}), where ${needer && needer !== inside ? needer : inside} ${needer && needer !== inside ? "needs" : "holds what needs"} it. Or add ${from} to ${release}.`
      : w`Move it into a milestone ${release} needs, or add ${from} to ${release}.`,
    edit: from[0] ?? item?.id,
  };
}

// ------------------------------------------------------------ uses

/** The exceptions that touch one release: the Release view's Exceptions count. */
export function releaseExceptionsOf(
  h: Health,
  release: string,
): HealthException[] {
  return h.exceptions.filter((e) => e.releases.includes(release));
}

/**
 * The exceptions that need the owner (a fix that changes scope or a
 * release), for Your move (CS-753 lays it out): the list and its count.
 */
export function healthForOwner(h: Health): {
  count: number;
  exceptions: HealthException[];
} {
  const exceptions = h.exceptions.filter((e) => e.owner);
  return { count: exceptions.length, exceptions };
}

/** The exceptions in a scope: those that involve an item or milestone in it. */
export function healthInScope(
  h: Health,
  inScope: (id: string) => boolean,
): HealthException[] {
  return h.exceptions.filter((e) => e.involves.some(inScope));
}
