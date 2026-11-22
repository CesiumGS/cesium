import "./workProposals.css";
import { Button, Link, Typography } from "@mui/material";
import {
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { STATE_NAMES, unblocksOf, type WorkSnapshot } from "../work.ts";
import {
  CALL_NAMES,
  callQuestionOf,
  FLAG_NAMES,
  GROUP_NAMES,
  GROUP_RULES,
  type ProposalCallKind,
  type ProposalFlag,
  type ProposalGroup,
  type ProposalRow,
  type ProposalsModel,
  proposalsViewOf,
} from "../workProposals.ts";
import { toast } from "./common.tsx";
import { ItemRef, type WorkViewDef, type WorkViewProps } from "./Work.tsx";

/**
 * The Proposals view (CS-750; DESIGN.md, "The Proposals view"): every
 * proposal grouped by why it is proposed, the ones committed work needs
 * first, each with its header (source, why now, rough size, age) and its
 * call in words: commit, hold or drop, with the rule that recommends one.
 * Nothing is applied from the page: each call copies a question for the
 * chief of staff, since hitld 0.1.0-rc.1 has no command to commit or drop.
 */
export function ProposalsView(p: WorkViewProps) {
  const { s, items, msInScope, selected } = p;
  const weight = useMemo(() => unblocksOf(s), [s]);
  const model = useMemo(
    () =>
      proposalsViewOf(
        s,
        items,
        s.milestones.filter((m) => msInScope(m.id)),
        {
          weight,
        },
      ),
    // msInScope reads only the scope, which `items` follows.
    [s, items, weight],
  );
  const titleOf = useMemo(() => titleLookup(s), [s]);
  return (
    <ProposalsBody
      model={model}
      titleOf={titleOf}
      selected={selected}
      scoped={p.scoped}
      Ref={ItemRef}
    />
  );
}

const titleLookup = (s: WorkSnapshot) => {
  const t = new Map<string, string>();
  for (const x of [...s.items, ...s.milestones, ...s.projects]) {
    t.set(x.id, x.title);
  }
  return (id: string) => t.get(id);
};

type RefC = (props: { id: string; title?: string }) => ReactNode;

/** A plain ID and title, for rendering without the page's router (tests). */
const PlainRef: RefC = ({ id, title }) => (
  <span className="work-ref">
    <span className="work-mono">{id}</span>
    {title && <span className="work-ref-title"> {title}</span>}
  </span>
);

/**
 * A line of prose with each item ID drawn as a reference with its title
 * (CS-744: every ID shown carries its title), and `code` as code. The
 * header's fields, the groups' rules and the reasons go through it.
 */
function Prose({
  text,
  Ref,
  titleOf,
}: {
  text: string;
  Ref: RefC;
  titleOf: (id: string) => string | undefined;
}) {
  const out: ReactNode[] = [];
  text.split(/(`[^`]+`)/).forEach((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      out.push(<code key={i}>{part.slice(1, -1)}</code>);
      return;
    }
    let at = 0;
    for (const m of part.matchAll(/\bCS-\d+\b/g)) {
      const title = titleOf(m[0]);
      if (!title) {
        continue;
      }
      out.push(part.slice(at, m.index));
      out.push(
        <span key={`${i}-${m.index}`} className="work-props-inref">
          <Ref id={m[0]} title={title} />
        </span>,
      );
      at = m.index + m[0].length;
    }
    out.push(part.slice(at));
  });
  return <>{out}</>;
}

/** Rows shown per group before "Show all". */
const SHOWN = 8;

/** The view's body, from its model: separate from the shell for tests. */
export function ProposalsBody({
  model,
  titleOf,
  selected,
  scoped = false,
  now = Date.now(),
  Ref = PlainRef,
}: {
  model: ProposalsModel;
  titleOf: (id: string) => string | undefined;
  selected?: string;
  scoped?: boolean;
  now?: number;
  Ref?: RefC;
}) {
  const sectionRefs = useRef(new Map<ProposalGroup, HTMLElement>());
  const jump = (g: ProposalGroup) => {
    const el = sectionRefs.current.get(g);
    if (el) {
      const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "start",
      });
      el.focus({ preventScroll: true });
    }
  };
  const total = model.rows.length;
  return (
    <div className="work-props">
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-props-lede"
      >
        Each proposal is grouped by why it's proposed, with its call and the
        rule that recommends it.{" "}
        <strong>Nothing changes from this page.</strong> HITLd 0.1.0-rc.1 has no
        command to commit or drop a proposal, so each call copies a question for
        the chief of staff to act on.
        {scoped && " The scope narrows them to its items and milestones."}
      </Typography>

      <nav
        className="work-props-tiles"
        aria-label="Proposals by why they're proposed"
      >
        {model.groups.map(({ group, rows }) => (
          <button
            key={group}
            type="button"
            className={`work-props-tile g-${group}${rows.length && (group === "needed" || group === "unheaded") ? " is-exception" : ""}`}
            onClick={() => jump(group)}
            aria-label={`${rows.length} ${GROUP_NAMES[group]}: go to the group`}
          >
            <span className="work-props-tile-value">{rows.length}</span>
            <span className="work-props-tile-name">{GROUP_NAMES[group]}</span>
            <span className="work-props-tile-detail">
              {tileDetail(group, rows)}
            </span>
          </button>
        ))}
      </nav>

      {total === 0 && (
        <div className="work-card">
          <Typography variant="body-md" render={<p />} className="work-empty">
            No proposal{scoped ? " in this scope" : ""}. A proposal is an item
            or milestone in the tracker's <code>proposed</code> state.
          </Typography>
        </div>
      )}

      {total > 0 &&
        model.groups.map(({ group, rows }) => (
          <GroupSection
            key={group}
            group={group}
            rows={rows}
            selected={selected}
            titleOf={titleOf}
            now={now}
            Ref={Ref}
            refSection={(el) => {
              if (el) {
                sectionRefs.current.set(group, el);
              } else {
                sectionRefs.current.delete(group);
              }
            }}
          />
        ))}
    </div>
  );
}

function tileDetail(group: ProposalGroup, rows: readonly ProposalRow[]) {
  if (!rows.length) {
    return "none now";
  }
  switch (group) {
    case "needed": {
      const held = new Set(rows.flatMap((r) => r.neededBy)).size;
      return `holding up ${held} ${held === 1 ? "piece" : "pieces"} of committed work`;
    }
    case "waiting": {
      const on = new Set(rows.flatMap((r) => r.waitsOn)).size;
      return `on ${on} open ${on === 1 ? "answer" : "answers"}`;
    }
    case "new": {
      const commit = rows.filter((r) => r.recommend === "commit").length;
      return `${commit} ready to commit`;
    }
    case "deferred":
      return "kept for review";
    case "unheaded":
      return "why isn't written down";
  }
}

function GroupSection({
  group,
  rows,
  selected,
  titleOf,
  now,
  Ref,
  refSection,
}: {
  group: ProposalGroup;
  rows: readonly ProposalRow[];
  selected?: string;
  titleOf: (id: string) => string | undefined;
  now: number;
  Ref: RefC;
  refSection: (el: HTMLElement | null) => void;
}) {
  const hasSelected = !!selected && rows.some((r) => r.id === selected);
  const [all, setAll] = useState(false);
  const showAll = all || hasSelected;
  const shown = showAll ? rows : rows.slice(0, SHOWN);
  const head = `work-props-h-${group}`;
  return (
    <section
      ref={refSection}
      tabIndex={-1}
      className={`work-card work-props-group g-${group}`}
      aria-labelledby={head}
    >
      <header className="work-card-head work-props-group-head">
        <span className="work-card-titles">
          <Typography variant="subtitle-md" render={<h2 />} id={head}>
            {GROUP_NAMES[group]}{" "}
            <span className="work-props-count">{rows.length}</span>
          </Typography>
          <Typography variant="caption-md" color="textSecondary">
            <Prose text={GROUP_RULES[group]} Ref={Ref} titleOf={titleOf} />
          </Typography>
        </span>
        {group === "unheaded" && rows.length > 1 && (
          <Button
            variant="outlined"
            size="small"
            className="work-props-bulk"
            onClick={() =>
              copy(
                headersQuestion(rows, titleOf),
                `Copied a question asking for ${rows.length} headers`,
              )
            }
          >
            Ask for all {rows.length} headers
          </Button>
        )}
      </header>
      {rows.length === 0 ? (
        <Typography
          variant="body-sm"
          color="textSecondary"
          render={<p />}
          className="work-empty"
        >
          None now.
        </Typography>
      ) : (
        <ol className="work-props-rows">
          {shown.map((r) => (
            <ProposalItem
              key={r.id}
              r={r}
              selected={r.id === selected}
              titleOf={titleOf}
              now={now}
              Ref={Ref}
            />
          ))}
        </ol>
      )}
      {rows.length > SHOWN && !hasSelected && (
        <div className="work-card-foot">
          <Button variant="text" size="small" onClick={() => setAll(!all)}>
            {all ? "Show fewer" : `Show all ${rows.length}`}
          </Button>
        </div>
      )}
    </section>
  );
}

const FLAG_TIPS: Record<ProposalFlag, string> = {
  "no-header":
    "Its text has no **Proposal** header (CS-686): its source, why now, rough size and decider aren't written down",
  "committed-inside":
    "A proposed milestone with planned or in-progress items among its constraints",
  "need-dropped": "Something it needs was dropped, so its premise may be gone",
  stale:
    "Filed two weeks ago or more: CS-686 brings it back once, then commits or drops it",
  unshaped:
    'It doesn\'t say what done is yet (no "Done when"), or its milestone still owes shaping',
};

/** Flags shown on a row: "unshaped" only where it changes the call. */
const shownFlags = (r: ProposalRow) =>
  r.flags.filter(
    (f) => f !== "unshaped" || (r.group === "new" && r.recommend !== "commit"),
  );

function ProposalItem({
  r,
  selected,
  titleOf,
  now,
  Ref,
}: {
  r: ProposalRow;
  selected: boolean;
  titleOf: (id: string) => string | undefined;
  now: number;
  Ref: RefC;
}) {
  const el = useRef<HTMLLIElement>(null);
  // Arriving with one chosen (Your move links here with ?item=): bring it
  // into view once, before paint.
  useLayoutEffect(() => {
    if (selected) {
      el.current?.scrollIntoView?.({ block: "center" });
    }
    // Only on arriving: not when the row is chosen again.
  }, []);
  const flags = shownFlags(r);
  return (
    <li
      ref={el}
      className={`work-props-row${selected ? " selected" : ""}${r.milestone ? " is-milestone" : ""}`}
    >
      <div className="work-props-main">
        <div className="work-props-title">
          <Ref id={r.id} title={r.title} />
        </div>
        {flags.length > 0 && (
          <ul className="work-props-flags" aria-label="Flags">
            {flags.map((f) => (
              <li
                key={f}
                className={`work-props-flag f-${f}`}
                title={FLAG_TIPS[f]}
              >
                {FLAG_NAMES[f]}
              </li>
            ))}
          </ul>
        )}
        <HeaderFields r={r} now={now} Ref={Ref} titleOf={titleOf} />
        <Graph r={r} Ref={Ref} titleOf={titleOf} />
      </div>
      <CallPanel r={r} titleOf={titleOf} Ref={Ref} />
    </li>
  );
}

function ageWords(r: ProposalRow, now: number): string | undefined {
  if (!r.since) {
    return undefined;
  }
  const d = r.days ?? Math.floor((now - Date.parse(r.since.at)) / 86_400_000);
  const ago = d < 1 ? "today" : d === 1 ? "1 day ago" : `${d} days ago`;
  return r.since.from === "header"
    ? `filed ${ago}`
    : r.since.from === "history"
      ? `proposed ${ago}`
      : `created ${ago}`;
}

/** The header's fields, or a plain line saying it has none. */
function HeaderFields({
  r,
  now,
  Ref,
  titleOf,
}: {
  r: ProposalRow;
  now: number;
  Ref: RefC;
  titleOf: (id: string) => string | undefined;
}) {
  const age = ageWords(r, now);
  if (!r.header) {
    return (
      <p className="work-props-noheader">
        Its source, why now and rough size aren't written down.
        {age && <> {age[0]!.toUpperCase() + age.slice(1)}.</>}
      </p>
    );
  }
  const h = r.header;
  return (
    <dl className="work-props-fields">
      <div className="f-source">
        <dt>Source</dt>
        <dd>
          {h.source ? (
            <Prose text={h.source} Ref={Ref} titleOf={titleOf} />
          ) : (
            <Missing />
          )}
        </dd>
      </div>
      <div className="f-why">
        <dt>Why now</dt>
        <dd title={h.why}>
          {h.why ? (
            <Prose text={h.why} Ref={Ref} titleOf={titleOf} />
          ) : (
            <Missing />
          )}
        </dd>
      </div>
      <div className="f-size">
        <dt>Rough size</dt>
        <dd>{h.size ?? <Missing />}</dd>
      </div>
      <div className="f-age">
        <dt>Age</dt>
        <dd>{age ?? <Missing />}</dd>
      </div>
      {r.decider !== "the owner" && (
        <div className="f-decider">
          <dt>Decider</dt>
          <dd>{r.decider}</dd>
        </div>
      )}
    </dl>
  );
}

const Missing = () => <span className="work-props-missing">not given</span>;

/** What the graph says: what needs it, what comes first, what it holds. */
function Graph({
  r,
  Ref,
  titleOf,
}: {
  r: ProposalRow;
  Ref: RefC;
  titleOf: (id: string) => string | undefined;
}) {
  const lines: Array<{
    name: string;
    ids: readonly string[];
    minor?: boolean;
    states?: boolean;
  }> = [];
  if (r.neededBy.length) {
    lines.push({ name: "Needed by", ids: r.neededBy });
  }
  if (r.waitsOn.length) {
    lines.push({ name: "Waits on", ids: r.waitsOn });
  }
  if (r.droppedNeeds.length) {
    lines.push({ name: "Dropped need", ids: r.droppedNeeds });
  }
  if (r.milestone && r.constraints.length) {
    lines.push({
      name: "Holds",
      ids: r.constraints.map((c) => c.id),
      states: true,
    });
  }
  if (r.startsAfter.length) {
    lines.push({ name: "Starts after", ids: r.startsAfter, minor: true });
  }
  if (!lines.length) {
    return null;
  }
  const stateOf = new Map(r.constraints.map((c) => [c.id, c.state]));
  return (
    <dl className="work-props-graph">
      {lines.map((l) => (
        <div key={l.name} className={l.minor ? "is-minor" : undefined}>
          <dt>{l.name}</dt>
          <dd>
            <RefList
              ids={l.ids}
              Ref={Ref}
              titleOf={titleOf}
              note={
                l.states
                  ? (id) => {
                      const st = stateOf.get(id);
                      return st ? (
                        <span className={`work-props-state s-${st}`}>
                          {STATE_NAMES[st]}
                        </span>
                      ) : undefined;
                    }
                  : undefined
              }
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}

const REFS_SHOWN = 4;

function RefList({
  ids,
  Ref,
  titleOf,
  note,
}: {
  ids: readonly string[];
  Ref: RefC;
  titleOf: (id: string) => string | undefined;
  note?: (id: string) => ReactNode;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? ids : ids.slice(0, REFS_SHOWN);
  return (
    <ul className="work-props-refs">
      {shown.map((id) => (
        <li key={id}>
          <Ref id={id} title={titleOf(id)} />
          {note?.(id)}
        </li>
      ))}
      {ids.length > REFS_SHOWN && (
        <li>
          <Link render={<button type="button" />} onClick={() => setAll(!all)}>
            {all ? "Fewer" : `All ${ids.length}`}
          </Link>
        </li>
      )}
    </ul>
  );
}

const CALLS: readonly ProposalCallKind[] = ["commit", "hold", "drop"];

/** The call: the recommendation in words, and the three ways to copy it. */
function CallPanel({
  r,
  titleOf,
  Ref,
}: {
  r: ProposalRow;
  titleOf: (id: string) => string | undefined;
  Ref: RefC;
}) {
  const label = `work-props-call-${r.id}`;
  return (
    <div className="work-props-call" role="group" aria-labelledby={label}>
      <p className="work-props-rec" id={label}>
        <span className="work-props-rec-name">Recommended</span>{" "}
        <span className={`work-props-rec-call c-${r.recommend}`}>
          {CALL_NAMES[r.recommend]}
        </span>
        {r.target && r.recommend === "commit" && (
          <span className="work-props-rec-target">
            {" "}
            to <Ref id={r.target} title={titleOf(r.target)} />
          </span>
        )}
      </p>
      <p className="work-props-reason">
        <Prose text={r.reason} Ref={Ref} titleOf={titleOf} />
      </p>
      <div className="work-props-buttons">
        {CALLS.map((c) => (
          <Button
            key={c}
            size="small"
            variant={c === r.recommend ? "contained" : "outlined"}
            color={c === r.recommend ? "primary" : "secondary"}
            className={`work-props-btn c-${c}${c === r.recommend ? " is-recommended" : ""}`}
            aria-label={`${CALL_NAMES[c]} ${r.id}: copy the question for the chief of staff${c === r.recommend ? " (recommended)" : ""}`}
            title={`Copies a question for the chief of staff: ${CALL_NAMES[c].toLowerCase()} ${r.id}`}
            onClick={() =>
              copy(
                callQuestionOf(r, c, titleOf),
                `Copied: ${CALL_NAMES[c].toLowerCase()} ${r.id}, as a question for the chief of staff`,
              )
            }
          >
            {CALL_NAMES[c]}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** One question for the chief of staff asking for every header at once. */
function headersQuestion(
  rows: readonly ProposalRow[],
  titleOf: (id: string) => string | undefined,
): string {
  return [
    `Chief of staff: write the CS-686 header (source, why now and what it unblocks, rough size, decider, date) for these ${rows.length} proposals, keeping each proposed (CS-680). For a "later" copy, its source is the design section it came from. Don't drop any without the owner's word.`,
    ...rows.map((r) => `- ${r.id} (${titleOf(r.id) ?? r.title})`),
  ].join("\n");
}

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(
    () => toast(done),
    () => toast("Couldn't copy: the browser refused", "bad"),
  );
}

/** Mounted by the shell (DESIGN.md, "The view shell"). */
export const workView: WorkViewDef = {
  id: "proposals",
  label: "Proposals",
  question: "Why each item is proposed, and whether to commit, hold or drop it",
  place: "page",
  order: 60,
  Component: ProposalsView,
};
