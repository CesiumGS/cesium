import "./workRelease.css";
import { Button, Link, Typography } from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgChevronRight } from "@stratakit/icons/chevron-right";
import { Icon } from "@stratakit/mui";
import { type ReactNode, useMemo, useState } from "react";
import { ageText, planOf, type WorkSnapshot } from "../work.ts";
import {
  type ClauseRow,
  EXCEPTION_RULE,
  type ReleaseException,
  type ReleaseGate,
  type ReleaseMilestone,
  type ReleaseView as ReleaseModel,
  releaseViewOf,
  sizeText,
  tokensText,
} from "../workModel.ts";
import { HEALTH_RULE, healthOf, releaseExceptionsOf } from "../workHealth.ts";
import { InlineText } from "./ItemText.tsx";
import {
  ItemRef,
  ReleasePicker,
  ReservedText,
  type WorkViewDef,
  type WorkViewProps,
} from "./Work.tsx";

/**
 * The Release view (CS-744; DESIGN.md, "The Release view"): the roadmap's
 * first view, and the one to share. Pick a release, and one screen says
 * what is left in it and what holds it: its milestones with their clauses
 * checked and unmet and the work left on each, the decisions and outside
 * waits holding it (its gates), what can start now, and a count of its
 * exceptions. No dates, no priorities: sizes are items now, and tokens as
 * ranges once estimates exist.
 */
export function ReleaseView(p: WorkViewProps) {
  const { s, flight, proposals, release, releases, onRelease } = p;
  const order = useMemo(() => {
    const plan = planOf(s, { proposals, flight });
    return plan.bands.flatMap((b) => [...b.milestones, ...b.idle]);
  }, [s, proposals, flight]);
  const model = useMemo(
    () =>
      release
        ? releaseViewOf(s, release.id, { proposals, flight, order })
        : undefined,
    [s, release, proposals, flight, order],
  );
  if (!release || !model) {
    return (
      <div className="work-card">
        <Typography variant="body-md" render={<p />} className="work-empty">
          No release is open. A release is a work item with a version, which
          needs the milestones it ships; make one with{" "}
          <code>npx hitld work new</code>.
        </Typography>
      </div>
    );
  }
  return (
    <ReleaseBody
      p={p}
      model={model}
      picker={
        <ReleasePicker
          releases={releases}
          release={release}
          onRelease={onRelease}
        />
      }
    />
  );
}

function ReleaseBody({
  p,
  model,
  picker,
}: {
  p: WorkViewProps;
  model: ReleaseModel;
  picker: ReactNode;
}) {
  const { s, scoped, msInScope, items, selected } = p;
  const [showExceptions, setShowExceptions] = useState(false);
  const inScope = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const rows = scoped
    ? model.milestones.filter((m) => msInScope(m.id))
    : model.milestones;
  const gates = scoped
    ? model.gates.filter((g) => inScope.has(g.id))
    : model.gates;
  const ready = scoped
    ? model.ready.filter((id) => inScope.has(id))
    : model.ready;
  const decisions = gates.filter((g) => g.kind === "decision").length;
  const waits = gates.length - decisions;
  const healthShown = p.hasView("health");
  // Once the Health view is mounted, its exceptions are the count (CS-745).
  const exceptions = useMemo(
    () =>
      healthShown
        ? releaseExceptionsOf(healthOf(s), model.release.id).length
        : model.exceptions.length,
    [healthShown, s, model],
  );
  const short = model.release.short;
  const total = model.milestones.length + model.done.length;

  return (
    <div className="work-release">
      <div className="work-release-head">{picker}</div>

      <dl className="work-release-stats" aria-label={`${short} at a glance`}>
        <Stat
          name="Milestones left"
          value={model.milestones.length}
          detail={
            model.done.length
              ? `${model.done.length} of ${total} done`
              : `none of ${total} done yet`
          }
        />
        <Stat
          name="Work left"
          value={model.left.items}
          detail={
            model.left.tokens
              ? `items · ${tokensText(model.left.tokens.low)}–${tokensText(model.left.tokens.high)} tokens`
              : "items · no token estimates yet"
          }
        />
        <Stat
          name="Gates"
          value={gates.length}
          detail={`${decisions} ${decisions === 1 ? "decision" : "decisions"} · ${waits} outside`}
          tone={gates.length ? "attention" : undefined}
        />
        <Stat
          name="Ready now"
          value={ready.length}
          detail="items can start"
          tone={ready.length ? "ready" : undefined}
        />
        <div className="work-release-stat">
          <dt>Exceptions</dt>
          <dd>
            <button
              type="button"
              className={`work-release-stat-value is-button${exceptions ? " warn" : ""}`}
              aria-expanded={healthShown ? undefined : showExceptions}
              aria-controls={
                healthShown ? undefined : "work-release-exceptions"
              }
              onClick={() =>
                healthShown
                  ? p.goView("health", { release: model.release.id })
                  : setShowExceptions((v) => !v)
              }
              title={healthShown ? HEALTH_RULE : EXCEPTION_RULE}
            >
              {exceptions}
            </button>
            <span className="work-release-stat-detail">
              {healthShown ? (
                "in Health"
              ) : (
                <ReservedText
                  value={showExceptions ? "hide list" : "show list"}
                  options={["hide list", "show list"]}
                />
              )}
            </span>
          </dd>
        </div>
      </dl>

      {!healthShown && showExceptions && <Exceptions list={model.exceptions} />}

      {model.earlier.length > 0 && (
        <Typography
          variant="caption-md"
          color="textSecondary"
          render={<p />}
          className="work-release-earlier"
        >
          Comes after{" "}
          {model.earlier.map((e, i) => (
            <span key={e.id}>
              {i > 0 && (i === model.earlier.length - 1 ? " and " : ", ")}
              <Link
                render={<button type="button" />}
                onClick={() => p.onRelease(e.id)}
              >
                {e.short}
              </Link>{" "}
              ({e.milestones} {e.milestones === 1 ? "milestone" : "milestones"}{" "}
              left)
            </span>
          ))}
          : that work comes first and is counted there.
        </Typography>
      )}

      {scoped && (
        <Typography
          variant="caption-md"
          color="textSecondary"
          render={<p />}
          className="work-release-earlier"
        >
          The scope shows {rows.length} of {model.milestones.length} milestones
          and the gates and ready work among its items.
        </Typography>
      )}

      <div className="work-dash">
        <section
          className="work-card span-12"
          aria-labelledby="work-release-gates-h"
        >
          <header className="work-card-head">
            <span className="work-card-titles">
              <Typography
                variant="subtitle-md"
                render={<h2 />}
                id="work-release-gates-h"
              >
                What holds it
              </Typography>
              <Typography variant="caption-md" color="textSecondary">
                Decisions and outside waits on its work, most work behind first
              </Typography>
            </span>
          </header>
          <Gates gates={gates} selected={selected} />
        </section>

        <section
          className="work-card span-12"
          aria-labelledby="work-release-ms-h"
        >
          <header className="work-card-head">
            <span className="work-card-titles">
              <Typography
                variant="subtitle-md"
                render={<h2 />}
                id="work-release-ms-h"
              >
                Milestones left
              </Typography>
              <Typography variant="caption-md" color="textSecondary">
                In the order the planner reaches them. A clause is checked once
                its items are done and the milestone's check passes.
              </Typography>
            </span>
          </header>
          <Milestones rows={rows} selected={selected} release={short} />
          {model.done.length > 0 && (
            <div className="work-release-done">
              <Typography variant="caption-md" color="textSecondary">
                Done: {model.done.length}{" "}
                {model.done.length === 1 ? "milestone" : "milestones"}
              </Typography>
              <ul>
                {model.done.map((id) => (
                  <li key={id}>
                    <ItemRef id={id} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section
          className="work-card span-12"
          aria-labelledby="work-release-ready-h"
        >
          <header className="work-card-head">
            <span className="work-card-titles">
              <Typography
                variant="subtitle-md"
                render={<h2 />}
                id="work-release-ready-h"
              >
                Ready to start now
              </Typography>
              <Typography variant="caption-md" color="textSecondary">
                Its work with nothing open before it, most work behind first
              </Typography>
            </span>
          </header>
          <Ready
            ids={ready}
            behind={model.readyBehind}
            release={short}
            s={s}
            selected={selected}
          />
        </section>
      </div>
    </div>
  );
}

function Stat({
  name,
  value,
  detail,
  tone,
}: {
  name: string;
  value: number;
  detail: string;
  tone?: "attention" | "ready";
}) {
  return (
    <div className="work-release-stat">
      <dt>{name}</dt>
      <dd>
        <span className={`work-release-stat-value ${tone ?? ""}`}>{value}</span>
        <span className="work-release-stat-detail">{detail}</span>
      </dd>
    </div>
  );
}

/** The gates: one row each, with its age, its default and deadline, and what it holds. */
function Gates({
  gates,
  selected,
}: {
  gates: readonly ReleaseGate[];
  selected?: string;
}) {
  if (!gates.length) {
    return (
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-empty"
      >
        No decision or outside wait is open on this release's work.
      </Typography>
    );
  }
  const now = Date.now();
  const timed = gates.some((g) => g.default || g.deadline);
  return (
    <>
      <table className="work-gates">
        <thead>
          <tr>
            <th scope="col">Gate</th>
            <th scope="col" className="c-num">
              Open for
            </th>
            <th scope="col">Holds</th>
            <th scope="col" className="c-num">
              Work behind
            </th>
          </tr>
        </thead>
        <tbody>
          {gates.map((g) => (
            <tr
              key={g.id}
              className={g.id === selected ? "selected" : undefined}
            >
              <td className="c-gate">
                <ItemRef id={g.id} title={g.title} />
                <span className="work-gates-sub">
                  {g.kind === "decision"
                    ? `${g.who === "owner" || !g.who ? "Your decision" : `Decided by ${g.who}`}`
                    : `Waiting on ${g.who ?? "an outside party"}`}
                  {" · "}
                  {g.answerable ? (
                    <span className="work-gates-now">
                      {g.kind === "decision"
                        ? "can be answered now"
                        : "open now"}
                    </span>
                  ) : (
                    "waits on other items first"
                  )}
                  {(g.default || g.deadline) && (
                    <>
                      {" · "}
                      {g.default && `default: ${g.default}`}
                      {g.default && g.deadline && ", "}
                      {g.deadline && `deadline ${g.deadline}`}
                    </>
                  )}
                </span>
              </td>
              <td className="c-num">
                {g.since ? ageText(now - Date.parse(g.since)) : "–"}
              </td>
              <td className="c-holds">
                {g.milestones.length ? (
                  <ul>
                    {g.milestones.slice(0, 2).map((m) => (
                      <li key={m}>
                        <ItemRef id={m} />
                      </li>
                    ))}
                    {g.milestones.length > 2 && (
                      <li className="work-gates-more">
                        and {g.milestones.length - 2} more
                      </li>
                    )}
                  </ul>
                ) : (
                  <span className="work-gates-sub">The release's own need</span>
                )}
              </td>
              <td className="c-num">{g.behind}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!timed && (
        <Typography
          variant="caption-md"
          color="textTertiary"
          render={<p />}
          className="work-gates-note"
        >
          No gate records a default or a deadline: the tracker has no field for
          them yet. Each shows here once its record has one.
        </Typography>
      )}
    </>
  );
}

const CLAUSE_WORDS: Record<ClauseRow["status"], string> = {
  checked: "Checked",
  check: "Items done, check not passed",
  open: "Open",
  unlinked: "No item linked yet",
};

/** The milestones left, a row each; a row opens to its clauses. */
function Milestones({
  rows,
  selected,
  release,
}: {
  rows: readonly ReleaseMilestone[];
  selected?: string;
  release: string;
}) {
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  if (!rows.length) {
    return (
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-empty"
      >
        No milestone of {release} is open.
      </Typography>
    );
  }
  const toggle = (id: string) =>
    setOpened((was) => {
      const next = new Set(was);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  return (
    <ol className="work-rms">
      <li className="work-rms-head" aria-hidden="true">
        <span />
        <span>Milestone</span>
        <span>Clauses</span>
        <span className="c-num">Items left</span>
        <span className="c-num">Ready</span>
        <span className="c-num">Gates</span>
      </li>
      {rows.map((m) => {
        const open = opened.has(m.id);
        const panel = `work-rms-${m.id}`;
        return (
          <li
            key={m.id}
            className={`work-rms-row${m.proposed ? " proposed" : ""}${m.id === selected ? " selected" : ""}`}
          >
            <div className="work-rms-line">
              <button
                type="button"
                className="work-rms-toggle"
                aria-expanded={open}
                aria-controls={panel}
                aria-label={`${open ? "Hide" : "Show"} the clauses of ${m.id} ${m.title}`}
                onClick={() => toggle(m.id)}
              >
                <Icon href={open ? svgChevronDown : svgChevronRight} />
              </button>
              <span className="work-rms-name">
                <ItemRef id={m.id} title={m.title} />
                {m.proposed && (
                  <span className="work-rms-proposed">Proposed</span>
                )}
              </span>
              <ClausePips m={m} />
              <span
                className="c-num"
                data-label="Items left"
                title={
                  m.left.tokens
                    ? sizeText(m.left)
                    : "Its open work items and the open work they need, in this release"
                }
              >
                {m.left.items}
              </span>
              <span
                className={`c-num${m.ready.length ? " is-ready" : ""}`}
                data-label="Ready"
              >
                {m.ready.length}
              </span>
              <span
                className={`c-num${m.gates.length ? " is-gated" : ""}`}
                data-label="Gates"
              >
                {m.gates.length}
              </span>
            </div>
            {open && <MilestoneDetail m={m} id={panel} />}
          </li>
        );
      })}
    </ol>
  );
}

/** A milestone's clauses as pips, with the count in words. */
function ClausePips({ m }: { m: ReleaseMilestone }) {
  const total = m.clauses.length;
  if (!total) {
    return (
      <span className="work-rms-clauses" data-label="Clauses">
        <span className="work-rms-unshaped">Not shaped: no clauses</span>
      </span>
    );
  }
  return (
    <span
      className="work-rms-clauses"
      data-label="Clauses"
      title={m.clauses
        .map((c) => `${c.clause}: ${CLAUSE_WORDS[c.status]}`)
        .join("\n")}
    >
      <span className="work-pips" aria-hidden="true">
        {m.clauses.map((c) => (
          <span key={c.clause} className={`work-pip ${c.status}`} />
        ))}
      </span>
      <span className="work-rms-count">
        {m.checked} of {total} checked
      </span>
    </span>
  );
}

function MilestoneDetail({ m, id }: { m: ReleaseMilestone; id: string }) {
  return (
    <div className="work-rms-detail" id={id}>
      {m.outcome && (
        <Typography
          variant="body-sm"
          render={<p />}
          className="work-rms-outcome"
        >
          <InlineText text={m.outcome} />
        </Typography>
      )}
      {m.clauses.length > 0 ? (
        <ul className="work-clauses">
          {m.clauses.map((c) => (
            <li key={c.clause} className={c.status}>
              <span className={`work-pip ${c.status}`} aria-hidden="true" />
              <span className="work-clause-body">
                <span className="work-clause-text">
                  <span className="work-mono">{c.clause}</span>{" "}
                  <InlineText text={c.text} />
                </span>
                <span className="work-clause-state">
                  {CLAUSE_WORDS[c.status]}
                  {c.open.length > 0 &&
                    `: ${c.open.length} ${c.open.length === 1 ? "item" : "items"} open`}
                </span>
                {c.open.length > 0 && <RefList ids={c.open} />}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          Its "Done when" clauses aren't written yet.
        </Typography>
      )}
      {m.unlinked.length > 0 && (
        <div className="work-clause-unlinked">
          <Typography variant="caption-md" color="textSecondary">
            Not linked to a clause yet ({m.unlinked.length})
          </Typography>
          <RefList ids={m.unlinked} />
        </div>
      )}
      <Typography variant="caption-md" color="textSecondary" render={<p />}>
        {sizeText(m.left)} left on its way
        {m.ready.length > 0 && `, ${m.ready.length} ready now`}
        {m.toShape.length > 0 &&
          `. Shaping still owes: ${m.toShape.join(", ")}`}
        .
      </Typography>
    </div>
  );
}

const REF_LIST = 6;

function RefList({ ids }: { ids: readonly string[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? ids : ids.slice(0, REF_LIST);
  return (
    <ul className="work-reflist">
      {shown.map((id) => (
        <li key={id}>
          <ItemRef id={id} />
        </li>
      ))}
      {ids.length > REF_LIST && (
        <li>
          <Link render={<button type="button" />} onClick={() => setAll(!all)}>
            {all ? "Fewer" : `All ${ids.length}`}
          </Link>
        </li>
      )}
    </ul>
  );
}

const READY_SHOWN = 10;

function Ready({
  ids,
  behind,
  release,
  s,
  selected,
}: {
  ids: readonly string[];
  behind: Readonly<Record<string, number>>;
  release: string;
  s: WorkSnapshot;
  selected?: string;
}) {
  const [all, setAll] = useState(false);
  if (!ids.length) {
    return (
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-empty"
      >
        Nothing in this release can start now: everything open waits on
        something.
      </Typography>
    );
  }
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const shown = all ? ids : ids.slice(0, READY_SHOWN);
  return (
    <>
      <ul className="work-ready">
        {shown.map((id) => {
          const it = itemOf.get(id);
          return (
            <li key={id} className={id === selected ? "selected" : undefined}>
              <span
                className="work-swatch stage-ready"
                aria-hidden="true"
                title="Ready: nothing it needs is open"
              />
              <ItemRef id={id} title={it?.title} />
              <span className="work-ready-behind">
                {behind[id]
                  ? `${behind[id]} in ${release} behind it`
                  : `nothing in ${release} behind it`}
              </span>
            </li>
          );
        })}
      </ul>
      {ids.length > READY_SHOWN && (
        <div className="work-card-foot">
          <Button variant="text" size="small" onClick={() => setAll(!all)}>
            {all ? "Show fewer" : `All ${ids.length} ready`}
          </Button>
        </div>
      )}
    </>
  );
}

/** The exceptions, listed in place until the Health view lands (CS-745). */
function Exceptions({ list }: { list: readonly ReleaseException[] }) {
  return (
    <section
      className="work-card work-release-exceptions"
      id="work-release-exceptions"
      aria-label="Exceptions"
    >
      <Typography variant="caption-md" color="textSecondary" render={<p />}>
        {EXCEPTION_RULE}
      </Typography>
      {list.length ? (
        <ul>
          {list.map((e) => (
            <li key={`${e.kind}:${e.id}`}>
              <ItemRef id={e.id} />
              <span className="work-gates-sub">
                {e.kind === "two-milestones" ? (
                  <>Named by {e.milestones.length} of its milestones</>
                ) : e.milestones.length ? (
                  <>
                    Pulled in from outside the release; it sits in{" "}
                    {e.milestones.length === 1
                      ? "a milestone"
                      : `${e.milestones.length} milestones`}{" "}
                    the release doesn't name
                  </>
                ) : (
                  <>The release needs it directly, not through a milestone</>
                )}
              </span>
              {e.milestones.length > 0 && <RefList ids={e.milestones} />}
            </li>
          ))}
        </ul>
      ) : (
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          None: its graph is clean by this rule.
        </Typography>
      )}
    </section>
  );
}

/** Mounted by the shell (DESIGN.md, "The view shell"). */
export const workView: WorkViewDef = {
  id: "release",
  label: "Release",
  question: "What is left in a release, and what holds it",
  place: "roadmap",
  order: 10,
  proposals: true,
  Component: ReleaseView,
};
