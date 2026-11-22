import "./projects.css";
import { Button, Typography } from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgChevronRight } from "@stratakit/icons/chevron-right";
import { Icon } from "@stratakit/mui";
import { type CSSProperties, Fragment, useMemo, useState } from "react";
import {
  type BetColumn,
  type BetDecision,
  type BetMilestone,
  type BetSpend,
  hasTokens,
  type ProjectBet,
  projectBetsOf,
  spendWords,
} from "../projectBets.ts";
import { NO_RELEASE, planOf, type Stage, STAGE_NAMES } from "../work.ts";
import { InlineText } from "./ItemText.tsx";
import { ItemRef, ReservedText, type WorkViewProps } from "./Work.tsx";

const slug = (st: Stage) => st.toLowerCase().replace(/\s+/g, "-");

// ------------------------------------------------------------ projects as bets

/**
 * The roadmap's Projects view (CS-748; DESIGN.md, "The Projects view"):
 * each project as a bet, a row each on one grid, sorted by its next
 * release. A row gives the project's name and its next milestone's
 * outcome, the releases its open milestones land in (a slot per release,
 * in ladder order), its progress by milestones' clauses, its spend
 * against appetite once estimates exist, and its own open decisions as
 * badges under its name. A row opens to its milestones on the same grid;
 * a milestone opens to its items. Nothing animates and nothing changes
 * width on hover, selection or opening: the columns are fixed by the
 * grid, not by what a row holds. It replaces CS-693's view of the same
 * ID, which CS-775 retired (`workProjects.tsx` mounts it).
 */
export function ProjectBetsView(p: WorkViewProps) {
  const { s, flight, proposals, scoped, items, msInScope, selected } = p;
  const order = useMemo(() => {
    const plan = planOf(s, { proposals, flight });
    return plan.bands.flatMap((b) => [...b.milestones, ...b.idle]);
  }, [s, proposals, flight]);
  const bets = useMemo(
    () => projectBetsOf(s, { proposals, flight, order }),
    [s, proposals, flight, order],
  );
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const inScope = useMemo(
    () => new Set(items.flatMap((it) => (it.project ? [it.project] : []))),
    [items],
  );
  const shown = (r: ProjectBet) =>
    !scoped || inScope.has(r.id) || r.milestones.some((m) => msInScope(m.id));
  const groups = bets.groups
    .map((g) => ({ ...g, projects: g.projects.filter(shown) }))
    .filter((g) => g.projects.length);
  const rows = groups.flatMap((g) => g.projects);
  const toggle = (id: string) =>
    setOpened((was) => {
      const next = new Set(was);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  const allOpen = rows.length > 0 && rows.every((r) => opened.has(r.id));

  const yours = rows.flatMap((r) => r.decisions.filter((d) => d.owner));
  const withYours = rows.filter((r) => r.decisions.some((d) => d.owner));
  const answerable = yours.filter((d) => d.answerable).length;
  const open = rows.flatMap((r) => r.milestones.filter((m) => !m.done));
  const unshaped = open.filter((m) => !m.clauses.length).length;
  const noMilestone = rows.filter((r) => r.next === undefined).length;

  return (
    <section
      className="work-card work-projects"
      aria-labelledby="work-projects-h"
      style={{ "--work-projects-slots": bets.columns.length } as CSSProperties}
    >
      <header className="work-card-head work-projects-head">
        <span className="work-card-titles">
          <Typography
            variant="subtitle-md"
            render={<h2 />}
            id="work-projects-h"
          >
            Projects
          </Typography>
          <Typography variant="caption-md" color="textSecondary">
            Each project as a bet: where its milestones land, how much of what
            it promises is checked, and the decisions it holds. Sorted by its
            next release.
          </Typography>
        </span>
        {rows.length > 0 && (
          <Button
            variant="text"
            size="small"
            className="work-projects-all"
            aria-pressed={allOpen}
            onClick={() =>
              setOpened(allOpen ? new Set() : new Set(rows.map((r) => r.id)))
            }
          >
            <ReservedText
              value={allOpen ? "Close all" : "Open all"}
              options={["Close all", "Open all"]}
            />
          </Button>
        )}
      </header>

      <p className="work-projects-lead">
        <span>
          <b>{rows.length}</b> {rows.length === 1 ? "project" : "projects"}
          {scoped && " in the scope"}
        </span>
        <span className={yours.length ? "is-decision" : undefined}>
          <b>{yours.length}</b> open{" "}
          {yours.length === 1 ? "decision" : "decisions"} of yours
          {yours.length > 0 &&
            `, in ${withYours.length} ${withYours.length === 1 ? "project" : "projects"}; ${answerable} can be answered now`}
        </span>
        <span>
          <b>{unshaped}</b> of {open.length} open milestones have no clauses yet
        </span>
        {noMilestone > 0 && (
          <span>
            <b>{noMilestone}</b>{" "}
            {noMilestone === 1 ? "project has" : "projects have"} no open
            milestone
          </span>
        )}
      </p>
      {!bets.hasSpend && (
        <Typography
          variant="caption-md"
          color="textSecondary"
          render={<p />}
          className="work-projects-note"
        >
          Spend against appetite shows once a milestone has an appetite or an
          item a token estimate. None has yet, so there is no Spend column.
        </Typography>
      )}

      {rows.length > 0 && (
        <ul className="work-projects-key" aria-label="How to read a row">
          <li title="How many of its open milestones each release is the first to need; the ring marks its next release">
            <span className="work-projects-slot has next" aria-hidden="true">
              <span className="work-projects-slot-n">2</span>
            </span>
            Milestones per release, ring on the next
          </li>
          <li title="A segment per milestone, as wide as its clauses, filled as far as they are checked: their items done and the milestone's check passed">
            <span className="work-projects-key-seg" aria-hidden="true">
              <span className="work-projects-seg-fill" />
            </span>
            Clauses checked
          </li>
          <li title="A clause whose items are done, while the milestone's check hasn't passed yet">
            <span className="work-projects-key-seg" aria-hidden="true">
              <span className="work-projects-seg-check" />
            </span>
            Due a check
          </li>
          <li title="A milestone whose Done when clauses aren't written yet">
            <span
              className="work-projects-key-seg unshaped"
              aria-hidden="true"
            />
            Not shaped
          </li>
        </ul>
      )}

      {rows.length === 0 ? (
        <Typography
          variant="body-sm"
          color="textSecondary"
          render={<p />}
          className="work-empty"
        >
          {scoped ? (
            "No project in the scope."
          ) : (
            <>
              No project is open. The main session makes one with{" "}
              <code>npx hitld work new --kind project --title "…"</code>.
            </>
          )}
        </Typography>
      ) : (
        <div
          className={`work-projects-grid${bets.hasSpend ? " has-spend" : ""}`}
          role="list"
          aria-label="Projects, by next release"
        >
          <div className="work-projects-cols" aria-hidden="true">
            <span />
            <span>Project · next outcome · its decisions</span>
            <span className="work-projects-slots">
              {bets.columns.map((c) => (
                <span
                  key={c.id}
                  className={`work-projects-slot-head${c.proposed ? " proposed" : ""}`}
                  title={
                    c.id === NO_RELEASE
                      ? "Open milestones no release needs yet"
                      : `${c.title}: the open milestones it is the first release to need`
                  }
                >
                  {c.short}
                </span>
              ))}
            </span>
            <span title="Its milestones' Done when clauses: checked once their items are done and the milestone's check passes">
              Clauses checked
            </span>
            {bets.hasSpend && <span>Spend · appetite</span>}
          </div>
          {groups.map((g) => (
            <Fragment key={g.column}>
              <div className="work-projects-group" role="presentation">
                <span className="work-projects-group-name">{g.label}</span>
                <span className="work-projects-group-count">
                  {g.projects.length}{" "}
                  {g.projects.length === 1 ? "project" : "projects"}
                </span>
              </div>
              {g.projects.map((r) => (
                <BetRow
                  key={r.id}
                  r={r}
                  columns={bets.columns}
                  hasSpend={bets.hasSpend}
                  open={opened.has(r.id)}
                  onToggle={() => toggle(r.id)}
                  selected={selected}
                  msShown={(id) =>
                    !scoped || msInScope(id) || inScope.has(r.id)
                  }
                />
              ))}
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}

const DECISIONS_SHOWN = 3;

function BetRow({
  r,
  columns,
  hasSpend,
  open,
  onToggle,
  selected,
  msShown,
}: {
  r: ProjectBet;
  columns: readonly BetColumn[];
  hasSpend: boolean;
  open: boolean;
  onToggle: () => void;
  selected?: string;
  msShown: (id: string) => boolean;
}) {
  const panel = `work-projects-${r.id}`;
  const decisions = open ? r.decisions : r.decisions.slice(0, DECISIONS_SHOWN);
  const more = r.decisions.length - decisions.length;
  const milestones = r.milestones.filter((m) => msShown(m.id));
  return (
    <div
      role="listitem"
      className={`work-projects-row${r.proposed ? " proposed" : ""}${r.id === selected ? " selected" : ""}${open ? " open" : ""}`}
    >
      <div className="work-projects-line">
        <button
          type="button"
          className="work-projects-toggle"
          aria-expanded={open}
          aria-controls={open ? panel : undefined}
          aria-label={`${open ? "Hide" : "Show"} the milestones of ${r.id} ${r.title}`}
          onClick={onToggle}
          disabled={!r.milestones.length}
        >
          <Icon href={open ? svgChevronDown : svgChevronRight} />
        </button>
        <span className="work-projects-name">
          <span className="work-projects-title">
            <ItemRef id={r.id} title={r.title} />
            {r.proposed && <span className="work-projects-tag">Proposed</span>}
          </span>
          <span className="work-projects-outcome">
            {r.nextOutcome ? (
              <span title={r.nextOutcome.text}>
                <span className="work-projects-outcome-lead">Next: </span>
                <InlineText text={r.nextOutcome.text} />
              </span>
            ) : r.next !== undefined ? (
              <span className="work-projects-quiet">
                Its next milestone states no outcome yet
              </span>
            ) : (
              <span className="work-projects-quiet">
                No open milestone: nothing it promises is written yet
              </span>
            )}
          </span>
          {r.decisions.length > 0 && (
            <span
              className="work-projects-decisions"
              aria-label={`${r.decisions.length} open ${r.decisions.length === 1 ? "decision" : "decisions"}`}
            >
              {decisions.map((d) => (
                <DecisionBadge key={d.id} d={d} />
              ))}
              {more > 0 && (
                <button
                  type="button"
                  className="work-projects-more"
                  onClick={onToggle}
                  aria-label={`Show all ${r.decisions.length} decisions of ${r.id}`}
                >
                  {more} more
                </button>
              )}
            </span>
          )}
        </span>
        <Lands lands={r.lands} columns={columns} next={r.next} />
        <ClauseBar
          segments={r.clauses.segments}
          words={clauseWords(r)}
          label={`${r.id}'s clauses`}
        />
        {hasSpend && <Spend sp={r.spend} />}
      </div>
      {open && (
        <div className="work-projects-panel" id={panel}>
          {milestones.map((m) => (
            <MilestoneRow
              key={m.id}
              m={m}
              columns={columns}
              hasSpend={hasSpend}
              selected={selected}
            />
          ))}
          {milestones.length < r.milestones.length && (
            <Typography
              variant="caption-md"
              color="textSecondary"
              render={<p />}
              className="work-projects-panel-note"
            >
              {r.milestones.length - milestones.length} more outside the scope.
            </Typography>
          )}
        </div>
      )}
    </div>
  );
}

function DecisionBadge({ d }: { d: BetDecision }) {
  return (
    <span
      className={`work-projects-badge${d.answerable ? " answerable" : ""}${d.proposed ? " proposed" : ""}`}
      title={`${d.owner ? "Your decision" : "Decided by someone else"} · ${d.answerable ? "can be answered now" : "waits on other items first"}${d.proposed ? " · proposed" : ""}`}
    >
      <ItemRef id={d.id} title={d.title} />
    </span>
  );
}

/** A slot per release column: how many open milestones land there. */
function Lands({
  lands,
  columns,
  next,
}: {
  lands: readonly number[];
  columns: readonly BetColumn[];
  next?: number;
}) {
  const where = columns
    .map((c, k) =>
      lands[k]
        ? `${c.short === "None" ? "no release" : c.short}: ${lands[k]}`
        : "",
    )
    .filter(Boolean);
  return (
    <span
      className="work-projects-slots work-projects-lands"
      role="img"
      aria-label={
        where.length
          ? `Open milestones by release, ${where.join(", ")}`
          : "No open milestone"
      }
    >
      {columns.map((c, k) => (
        <span
          key={c.id}
          className={`work-projects-slot${lands[k] ? " has" : ""}${k === next ? " next" : ""}${c.id === NO_RELEASE ? " none" : ""}`}
        >
          <span className="work-projects-slot-name">{c.short}</span>
          <span className="work-projects-slot-n">{lands[k] || "·"}</span>
        </span>
      ))}
    </span>
  );
}

function clauseWords(r: ProjectBet): { main: string; sub?: string } {
  const c = r.clauses;
  const ms = r.milestones.length;
  if (!ms) {
    return { main: "No milestone" };
  }
  const sub = c.unshaped
    ? `${c.unshaped} of ${ms} ${ms === 1 ? "milestone" : "milestones"} not shaped`
    : `in ${ms} ${ms === 1 ? "milestone" : "milestones"}`;
  return {
    main: c.total ? `${c.checked} of ${c.total}` : "No clauses yet",
    sub: c.check ? `${c.check} due a check · ${sub}` : sub,
  };
}

/**
 * Progress by clauses: a segment per milestone, as wide as its clauses
 * (one clause's width when it has none, drawn dashed: not shaped yet),
 * filled as far as they are checked. Its width is fixed, so rows align.
 */
function ClauseBar({
  segments,
  words,
  label,
}: {
  segments: ProjectBet["clauses"]["segments"];
  words: { main: string; sub?: string };
  label: string;
}) {
  return (
    <span className="work-projects-clauses">
      <span
        className="work-projects-bar"
        role="img"
        aria-label={`${label}: ${words.main}${words.sub ? `, ${words.sub}` : ""}`}
      >
        {segments.map((x) => (
          <span
            key={x.id}
            className={`work-projects-seg${x.total ? "" : " unshaped"}`}
            style={{ flexGrow: Math.max(1, x.total) }}
            title={
              x.total
                ? `${x.id}: ${x.checked} of ${x.total} checked${x.check ? `, ${x.check} with items done and the check not passed` : ""}`
                : `${x.id}: not shaped, no clauses yet`
            }
          >
            {x.total > 0 && (
              <>
                <span
                  className="work-projects-seg-fill"
                  style={{ width: `${(100 * x.checked) / x.total}%` }}
                />
                <span
                  className="work-projects-seg-check"
                  style={{
                    left: `${(100 * x.checked) / x.total}%`,
                    width: `${(100 * x.check) / x.total}%`,
                  }}
                />
              </>
            )}
          </span>
        ))}
      </span>
      <span className="work-projects-num">{words.main}</span>
      {words.sub && <span className="work-projects-sub">{words.sub}</span>}
    </span>
  );
}

function Spend({ sp }: { sp: BetSpend }) {
  const w = spendWords(sp);
  const bar =
    sp.appetite !== undefined && (sp.spent !== undefined || sp.estimate);
  return (
    <span className="work-projects-spend">
      {bar && (
        <span
          className="work-projects-spend-bar"
          role="img"
          aria-label={`${w.main}${w.sub ? `, ${w.sub}` : ""}`}
        >
          {sp.estimate && (
            <span
              className="work-projects-spend-est"
              style={{
                width: `${Math.min(100, (100 * sp.estimate.high) / sp.appetite!)}%`,
              }}
            />
          )}
          {sp.spent !== undefined && (
            <span
              className={`work-projects-spend-fill${sp.spent > sp.appetite! ? " over" : ""}`}
              style={{
                width: `${Math.min(100, (100 * sp.spent) / sp.appetite!)}%`,
              }}
            />
          )}
        </span>
      )}
      <span className={`work-projects-num${hasTokens(sp) ? "" : " quiet"}`}>
        {w.main}
      </span>
      {w.sub && <span className="work-projects-sub">{w.sub}</span>}
    </span>
  );
}

function MilestoneRow({
  m,
  columns,
  hasSpend,
  selected,
}: {
  m: BetMilestone;
  columns: readonly BetColumn[];
  hasSpend: boolean;
  selected?: string;
}) {
  const [open, setOpen] = useState(false);
  const panel = `work-projects-ms-${m.id}`;
  const lands = columns.map((_, k) => (!m.done && k === m.column ? 1 : 0));
  return (
    <div
      className={`work-projects-ms${m.proposed ? " proposed" : ""}${m.done ? " done" : ""}${m.id === selected ? " selected" : ""}`}
    >
      <div className="work-projects-line">
        <button
          type="button"
          className="work-projects-toggle"
          aria-expanded={open}
          aria-controls={open ? panel : undefined}
          aria-label={`${open ? "Hide" : "Show"} the items of ${m.id} ${m.title}`}
          onClick={() => setOpen(!open)}
          disabled={!m.items.length}
        >
          <Icon href={open ? svgChevronDown : svgChevronRight} />
        </button>
        <span className="work-projects-name">
          <span className="work-projects-title">
            <ItemRef id={m.id} title={m.title} />
            {m.proposed && <span className="work-projects-tag">Proposed</span>}
            {m.done && <span className="work-projects-tag">Done</span>}
          </span>
          {m.outcome && (
            <span className="work-projects-outcome" title={m.outcome}>
              <InlineText text={m.outcome} />
            </span>
          )}
          {m.decisions.length > 0 && (
            <span className="work-projects-waits">
              Waits on{" "}
              {m.decisions.length === 1
                ? "a decision"
                : `${m.decisions.length} decisions`}
              :{" "}
              {m.decisions.map((id) => (
                <ItemRef key={id} id={id} />
              ))}
            </span>
          )}
        </span>
        {m.done ? (
          <span className="work-projects-slots work-projects-lands">
            <span className="work-projects-done-word">Done</span>
          </span>
        ) : (
          <Lands lands={lands} columns={columns} />
        )}
        <ClauseBar
          segments={
            m.clauses.length
              ? m.clauses.map((c) => ({
                  id: `${m.id} ${c.clause}`,
                  total: 1,
                  checked: c.status === "checked" ? 1 : 0,
                  check: c.status === "check" ? 1 : 0,
                }))
              : [{ id: m.id, total: 0, checked: 0, check: 0 }]
          }
          words={{
            main: m.clauses.length
              ? `${m.checked} of ${m.clauses.length}`
              : "Not shaped",
            sub: `${m.clauses.some((c) => c.status === "check") ? "due a check · " : ""}${m.progress.done} of ${m.progress.total} ${m.progress.total === 1 ? "item" : "items"} done`,
          }}
          label={`${m.id}'s clauses`}
        />
        {hasSpend && <Spend sp={m.spend} />}
      </div>
      {open && (
        <ul className="work-projects-items" id={panel}>
          {m.items.map((it) => (
            <li
              key={it.id}
              className={it.id === selected ? "selected" : undefined}
            >
              <span
                className={`work-swatch stage-${slug(it.stage!)}`}
                aria-hidden="true"
              />
              <ItemRef id={it.id} title={it.title} />
              <span className="work-projects-item-clause">
                {it.clause === "c?" ? "no clause" : it.clause}
              </span>
              <span className="work-projects-item-stage">
                {STAGE_NAMES[it.stage!]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
