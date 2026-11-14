import "./work.css";
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  ListSubheader,
  MenuItem,
  Select,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { svgCopy } from "@stratakit/icons/copy";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgFolderOpen } from "@stratakit/icons/folder-open";
import { svgGitBranch } from "@stratakit/icons/git-branch";
import { svgSearch } from "@stratakit/icons/search";
import { Icon } from "@stratakit/mui";
import {
  getRouteApi,
  Link as RouterLink,
  useNavigate,
} from "@tanstack/react-router";
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WorkSearch } from "../routes.tsx";
import { useWork } from "../useWork.ts";
import {
  type Actor,
  ageText,
  byProject,
  type Flow,
  filterItems,
  flowOf,
  idNumber,
  type InFlight,
  inFlightOf,
  isOpen,
  isOwnerDecision,
  type ItemKind,
  KIND_NAMES,
  loadItemText,
  median,
  nextActor,
  ownerQueue,
  type Stage,
  STAGE_NAMES,
  STAGES,
  stageOf,
  stateOf,
  unblocksOf,
  type WorkContainer,
  type WorkItem,
  type WorkItemText,
  type WorkSnapshot,
} from "../work.ts";
import { Empty, Page, Section, toast } from "./common.tsx";
import { InlineText, ItemText } from "./ItemText.tsx";
import { Status as StatusBadge } from "./runParts.tsx";
import { WorkGraph } from "./WorkGraph.tsx";

/**
 * The Work board (DESIGN.md; CS-170): the tracker's items on the branch
 * Dyno is served from, with work claimed on other branches and worktrees,
 * read through the tracker's read API (work.ts), never edited here. Tabs
 * ask one question each (what waits on the owner, what is ready, what is
 * moving, what is blocked, everything by lifecycle, how it connects),
 * one row of filters narrows them, and an item opens beside them.
 */

const route = getRouteApi("/work");

export function Work() {
  const search = route.useSearch();
  const navigate = useNavigate({ from: "/work" });
  const { snapshot, error } = useWork();
  const set = (patch: Partial<WorkSearch>, replace = false) =>
    void navigate({
      search: (prev) =>
        Object.fromEntries(
          Object.entries({ ...prev, ...patch }).filter(
            ([, v]) => v !== undefined && v !== "",
          ),
        ),
      replace,
    });

  if (!snapshot) {
    return (
      <Page title="Work" description={DESCRIPTION} help={<WorkHelp />}>
        {error ? (
          <Empty title="The board can't read the tracker">
            {error.message}. The same lists are in a terminal:{" "}
            <code>node scripts/work/views.mjs ready</code>.
          </Empty>
        ) : (
          <div className="work-loading" role="status">
            <CircularProgress size={20} />
            <Typography variant="body-md">Reading the tracker…</Typography>
          </div>
        )}
      </Page>
    );
  }
  return <Board s={snapshot} search={search} set={set} />;
}

const DESCRIPTION =
  "The tracker as a running system: what waits on you, how work flows, and what moves next.";

function WorkHelp() {
  return (
    <>
      <p>
        The board reads the work items in <code>packages/next/work</code> on the
        branch Dyno is served from, through the tracker's read API. It never
        changes a file: edit the item, or make one with{" "}
        <code>node scripts/work/new.mjs</code>.
      </p>
      <p>
        Claims made in other worktrees and on other local branches show as in
        progress until they merge. Claims on other machines arrive with a bundle
        or a push. The board reads again when an item file changes, when the
        window comes to the front, and every minute.
      </p>
    </>
  );
}

function Board({
  s,
  search,
  set,
}: {
  s: WorkSnapshot;
  search: WorkSearch;
  set: (patch: Partial<WorkSearch>, replace?: boolean) => void;
}) {
  const flight = useMemo(() => inFlightOf(s), [s]);
  // Where and words narrow every section and count.
  const items = useMemo(
    () =>
      filterItems(s, {
        initiative: search.initiative,
        project: search.project,
        q: search.q,
      }),
    [s, search.initiative, search.project, search.q],
  );
  const projectOf = useMemo(
    () => new Map(s.projects.map((p) => [p.id, p])),
    [s],
  );
  const itemOf = useMemo(() => new Map(s.items.map((i) => [i.id, i])), [s]);
  const unblocks = useMemo(() => unblocksOf(s), [s]);
  const flow = useMemo(() => flowOf(s, items, { flight }), [s, items, flight]);
  const moves = useMemo(() => {
    const by: Record<Actor, WorkItem[]> = {
      owner: [],
      agents: [],
      outside: [],
      items: [],
    };
    for (const it of items) {
      const a = nextActor(it, flight);
      if (a) {
        by[a].push(it);
      }
    }
    return by;
  }, [items, flight]);
  const filtered = !!search.initiative || !!search.project || !!search.q;
  const decisions = moves.owner.filter(isOwnerDecision);
  const toCommit = moves.owner.filter((it) => !isOwnerDecision(it));
  const ready = moves.agents.filter((it) => stageOf(it, flight) === "Ready");
  const moving = items.filter((it) => stageOf(it, flight) === "In flight");
  const now = Date.now();
  const ageOf = (it: WorkItem) => now - (flow.since.get(it.id) ?? now);
  const oldestDecision = Math.max(0, ...decisions.map(ageOf));
  const window = flow.window;
  const decided = (s.history ?? []).filter(
    (e) =>
      e.status === "Done" &&
      itemOf.get(e.id)?.kind === "decision" &&
      Date.parse(e.at) > now - window * 86_400_000,
  ).length;
  const asked = decisions.filter(
    (it) => ageOf(it) < window * 86_400_000,
  ).length;
  const to = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  const historySince = new Date(flow.days[0] ?? now).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <Page
      title="Work"
      description={DESCRIPTION}
      help={<WorkHelp />}
      className="work-page"
      actions={
        <span
          className="work-branch"
          title={`Read ${new Date(s.generated).toLocaleString()} from ${s.source}`}
        >
          <Icon href={svgGitBranch} />
          <Typography variant="body-sm">
            {s.branch ?? "this checkout"}
          </Typography>
          {s.commit && (
            <Typography
              variant="caption-md"
              color="textSecondary"
              className="work-mono"
            >
              {s.commit}
            </Typography>
          )}
        </span>
      }
    >
      {s.problems.length > 0 && (
        <Alert severity="warning" className="work-gap">
          The tracker's check reports{" "}
          {s.problems.length === 1
            ? "a problem"
            : `${s.problems.length} problems`}
          , so some items may sit in the wrong place. Run{" "}
          <code>node scripts/work/views.mjs check</code> to see{" "}
          {s.problems.length === 1 ? "it" : "them"}.
        </Alert>
      )}

      <Filters
        s={s}
        search={search}
        set={set}
        filtered={filtered}
        count={items.length}
      />

      <ul className="work-moves" aria-label="Whose move">
        <Move
          who="You"
          value={decisions.length + toCommit.length}
          lines={[
            `${decisions.length} ${decisions.length === 1 ? "decision" : "decisions"}, ${toCommit.length} to commit or drop`,
            decisions.length
              ? `Oldest waiting ${ageText(oldestDecision)}`
              : "Nothing waiting",
          ]}
          tone={decisions.length ? "attention" : undefined}
          onClick={() => to("work-owner")}
        />
        <Move
          who="Agents"
          value={ready.length + moving.length}
          lines={[
            `${ready.length} ready to start`,
            `${moving.length} in flight`,
          ]}
          onClick={() => to("work-next")}
        />
        <Move
          who="Outside"
          value={moves.outside.length}
          lines={["Waits on other parties"]}
          onClick={() => to("work-outside")}
        />
        <Move
          who="Nobody yet"
          value={moves.items.length}
          lines={["Waiting on other items to finish"]}
          onClick={() => {
            set({ stage: "Waiting" });
            to("work-flow");
          }}
        />
      </ul>

      <Section
        id="work-owner"
        title="Waiting on you"
        description={`Your attention is the system's constraint, so it comes first: decisions you can answer now, the most waited-on first. ${asked} arrived and ${decided} answered in the last ${window} days.`}
      >
        <OwnerQueue
          s={s}
          items={decisions}
          selected={search.item}
          projectOf={projectOf}
          unblocks={unblocks}
        />
        {toCommit.length > 0 && (
          <details className="work-commit">
            <summary>
              <Typography variant="body-md" render={<span />}>
                {toCommit.length} proposed{" "}
                {toCommit.length === 1 ? "item waits" : "items wait"} for you to
                commit or drop
              </Typography>
            </summary>
            <Grouped
              s={s}
              items={toCommit}
              empty=""
              selected={search.item}
              projectOf={projectOf}
              line={(it) =>
                unblocks.get(it.id)
                  ? `Unblocks ${unblocks.get(it.id)}`
                  : undefined
              }
            />
          </details>
        )}
      </Section>

      <Section
        id="work-flow"
        title="Flow"
        description={`Items in each stage at the end of each day since ${historySince}, and what moved between stages in the last ${window} days. Choose a stage to list its items.`}
      >
        <FlowStages
          flow={flow}
          stage={search.stage}
          onStage={(st) => set({ stage: st === search.stage ? undefined : st })}
        />
        <LittlesLaw flow={flow} inFlight={moving.length} />
        {search.stage && (
          <div className="work-stage-list">
            <Typography variant="subtitle-md" render={<h3 />}>
              {STAGE_NAMES[search.stage as Stage]}
            </Typography>
            <Grouped
              s={s}
              items={items.filter((it) => stageOf(it, flight) === search.stage)}
              empty="Nothing in this stage."
              selected={search.item}
              projectOf={projectOf}
              line={(it) =>
                search.stage === "In flight"
                  ? whereOf(it, flight, s.branch)
                  : flow.since.has(it.id)
                    ? `Here ${ageText(now - flow.since.get(it.id)!)}`
                    : undefined
              }
              needs={
                search.stage === "Waiting"
                  ? (it) => it.open_needs.map((n) => itemOf.get(n) ?? n)
                  : undefined
              }
            />
          </div>
        )}
      </Section>

      <Section
        id="work-in-flight"
        title="In flight"
        description="Claimed on this branch, or on another branch or worktree of this machine whose claim hasn't merged."
      >
        <Grouped
          s={s}
          items={moving}
          empty="Nothing is in flight."
          selected={search.item}
          projectOf={projectOf}
          line={(it) => {
            const at = flow.since.get(it.id);
            return [
              whereOf(it, flight, s.branch),
              at ? `for ${ageText(now - at)}` : "",
            ]
              .filter(Boolean)
              .join(", ");
          }}
        />
      </Section>

      <Section
        id="work-next"
        title="Next up"
        description="Ready items, the ones the most work waits on first (directly or through other items)."
      >
        <Ranked
          items={ready}
          unblocks={unblocks}
          projectOf={projectOf}
          selected={search.item}
        />
      </Section>

      <Section
        id="work-outside"
        title="Waiting outside"
        description="Waits on other parties: what each one holds up."
      >
        <Ranked
          items={moves.outside}
          unblocks={unblocks}
          projectOf={projectOf}
          selected={search.item}
          party
        />
      </Section>

      <Section
        id="work-structure"
        title="Structure"
        description="How projects wait on each other; choose one for its items and their needs."
      >
        <WorkGraph
          s={s}
          items={items}
          project={search.project}
          initiative={search.initiative}
          selected={search.item}
          onProject={(id) => set({ project: id })}
        />
      </Section>

      <Typography
        variant="caption-md"
        color="textTertiary"
        render={<p />}
        className="work-later"
      >
        Tokens per item, verification, the merge queue, quotas and the
        controllers' steps join this page when HITLd records them.
      </Typography>

      <ItemPanel
        s={s}
        id={search.item}
        projectOf={projectOf}
        itemOf={itemOf}
        flight={flight}
        onClose={() => set({ item: undefined })}
        onProject={(id) => set({ project: id, initiative: undefined })}
      />
    </Page>
  );
}

/** One cell of the "whose move" strip: who acts, how much, and a link down. */
function Move({
  who,
  value,
  lines,
  tone,
  onClick,
}: {
  who: string;
  value: number;
  lines: string[];
  tone?: "attention";
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={`work-move ${tone ?? ""}`}
        onClick={onClick}
      >
        <Typography variant="caption-lg" color="textSecondary">
          {who}
        </Typography>
        <span className="work-move-value">{value}</span>
        {lines.map((l) => (
          <Typography key={l} variant="caption-md" color="textSecondary">
            {l}
          </Typography>
        ))}
      </button>
    </li>
  );
}

/**
 * The stages as a row of stocks joined by arrows: each stage's count now,
 * a sparkline of its count day by day, what came and went in the window,
 * and the oldest item's time in it. The stage that grew most is marked:
 * a growing queue is where the flow is held up.
 */
function FlowStages({
  flow,
  stage,
  onStage,
}: {
  flow: Flow;
  stage?: string;
  onStage: (stage: Stage) => void;
}) {
  const growth = (st: Stage) => flow.arrived[st] - flow.left[st];
  const growing = STAGES.filter((st) => st !== "Done" && growth(st) > 0).sort(
    (a, b) => growth(b) - growth(a),
  )[0];
  return (
    <ol className="work-flow" aria-label="Stages">
      {STAGES.map((st, i) => {
        const series = flow.stocks[st];
        const value = series.at(-1) ?? 0;
        return (
          <li key={st} className="work-flow-step">
            {i > 0 && (
              <span className="work-flow-arrow" aria-hidden="true">
                →
              </span>
            )}
            <button
              type="button"
              className={`work-stage${stage === st ? " selected" : ""}${growing === st ? " growing" : ""}`}
              aria-pressed={stage === st}
              onClick={() => onStage(st)}
            >
              <span className="work-stage-top">
                <Typography variant="caption-lg" color="textSecondary">
                  {STAGE_NAMES[st]}
                </Typography>
                {growing === st && (
                  <StatusBadge tone="warning">Growing</StatusBadge>
                )}
              </span>
              <span className="work-stage-value">{value}</span>
              <Sparkline
                days={flow.days}
                values={series}
                label={`${STAGE_NAMES[st]}: ${value} now`}
              />
              <Typography variant="caption-md" color="textSecondary">
                {flow.arrived[st]} in, {flow.left[st]} out in {flow.window} days
              </Typography>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** One stage's count over the days, with each day's value on hover. */
function Sparkline({
  days,
  values,
  label,
}: {
  days: number[];
  values: number[];
  label: string;
}) {
  const w = 120;
  const h = 28;
  const max = Math.max(1, ...values);
  const x = (i: number) =>
    values.length < 2 ? w : 4 + (i * (w - 8)) / (values.length - 1);
  const y = (v: number) => h - 4 - ((h - 8) * v) / max;
  const path = values
    .map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`)
    .join(" ");
  const day = (t: number) =>
    new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
  return (
    <svg
      className="work-spark"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`${label}; ${values.map((v, i) => `${day(days[i]!)} ${v}`).join(", ")}`}
    >
      <path d={path} className="work-spark-line" />
      <circle
        cx={x(values.length - 1)}
        cy={y(values.at(-1) ?? 0)}
        r={4}
        className="work-spark-dot"
      />
      {values.map((v, i) => (
        <rect
          key={i}
          x={x(i) - w / values.length / 2}
          y={0}
          width={w / values.length}
          height={h}
          className="work-spark-hit"
        >
          <title>{`${day(days[i]!)}: ${v}`}</title>
        </rect>
      ))}
    </svg>
  );
}

/** Little's law, read off the flow: in flight, throughput and lead time. */
function LittlesLaw({ flow, inFlight }: { flow: Flow; inFlight: number }) {
  const done = flow.arrived.Done;
  const lead = median(flow.leadDays);
  const DAY_MS = 86_400_000;
  return (
    <Typography
      variant="body-sm"
      color="textSecondary"
      render={<p />}
      className="work-little"
    >
      {flow.created} new · {inFlight} in flight · {done} done in the last{" "}
      {flow.window} days
      {" · "}
      {lead === undefined || flow.leadDays.length < 3
        ? "too few finished items for a lead time yet"
        : `lead time, planned to done: median ${ageText(lead * DAY_MS)} (${flow.leadDays.length} items)`}
    </Typography>
  );
}

/** Items ranked by how much waits on them. */
function Ranked({
  items,
  unblocks,
  projectOf,
  selected,
  party,
}: {
  items: WorkItem[];
  unblocks: Map<string, number>;
  projectOf: Map<string, WorkContainer>;
  selected?: string;
  /** Show who is waited on (external items). */
  party?: boolean;
}) {
  const [all, setAll] = useState(false);
  const ranked = [...items].sort(
    (a, b) =>
      (unblocks.get(b.id) ?? 0) - (unblocks.get(a.id) ?? 0) ||
      idNumber(a.id) - idNumber(b.id),
  );
  const shown = all ? ranked : ranked.slice(0, RANKED_PAGE);
  if (!items.length) {
    return (
      <Typography variant="body-md" color="textSecondary" render={<p />}>
        Nothing here.
      </Typography>
    );
  }
  return (
    <>
      <ol className="work-rows work-ranked">
        {shown.map((it) => {
          const n = unblocks.get(it.id) ?? 0;
          return (
            <li
              key={it.id}
              className={`work-row${it.id === selected ? " selected" : ""}`}
            >
              <ItemLink id={it.id} className="work-row-main">
                <span className="work-id">{it.id}</span>
                <span className="work-row-title">
                  <InlineText text={it.title} />
                  <Typography
                    variant="caption-md"
                    color="textSecondary"
                    render={<span />}
                    className="work-row-sub"
                  >
                    {party && it.party ? `${it.party} · ` : ""}
                    {projectOf.get(it.project ?? "")?.title ?? it.project}
                  </Typography>
                </span>
                <span className="work-row-extra">
                  {n ? `${n} wait on it` : "Nothing waits on it"}
                </span>
              </ItemLink>
            </li>
          );
        })}
      </ol>
      {ranked.length > RANKED_PAGE && (
        <Button
          variant="text"
          size="small"
          className="work-more"
          onClick={() => setAll(!all)}
        >
          {all ? "Show fewer" : `Show all ${ranked.length}`}
        </Button>
      )}
    </>
  );
}

const RANKED_PAGE = 12;

/** Who holds an item and where: "s1 on this branch", "s2 on dyno-ui". */
function whereOf(
  it: WorkItem,
  flight: InFlight,
  branch?: string,
): string | undefined {
  // A session named after its branch reads "on dyno-ui", not twice.
  const on = (who: string | undefined, where: string) =>
    who && who !== where ? `${who} on ${where}` : `on ${where}`;
  const parts: string[] = [];
  if (it.status === "In progress") {
    parts.push(on(it.claimed, branch ?? "this branch"));
  }
  for (const c of flight.get(it.id) ?? []) {
    parts.push(on(c.claimed, c.where));
  }
  return parts.join("; ") || undefined;
}

/**
 * One row of filters: where (all, an initiative, or a project, in one
 * list), which kind, and words. A count and "Clear" follow when set.
 */
function Filters({
  s,
  search,
  set,
  count,
  filtered,
}: {
  s: WorkSnapshot;
  search: WorkSearch;
  set: (patch: Partial<WorkSearch>, replace?: boolean) => void;
  /** Items the filters keep. */
  count: number;
  filtered: boolean;
}) {
  const scopeId = useId();
  const input = useRef<HTMLInputElement>(null);
  const scope = search.project
    ? `p:${search.project}`
    : search.initiative
      ? `i:${search.initiative}`
      : "";
  const scopeOptions: ReactNode[] = [
    <MenuItem key="all" value="">
      All work
    </MenuItem>,
  ];
  for (const ini of s.initiatives) {
    const projects = s.projects.filter((p) => p.initiative === ini.id);
    scopeOptions.push(
      <ListSubheader key={`h${ini.id}`}>{ini.title}</ListSubheader>,
      <MenuItem key={`i${ini.id}`} value={`i:${ini.id}`}>
        All of {ini.title}
      </MenuItem>,
      ...projects.map((p) => (
        <MenuItem key={p.id} value={`p:${p.id}`} className="work-scope-project">
          <span className="work-scope-title">{p.title}</span>
          <span className="work-id work-scope-id">{p.id}</span>
        </MenuItem>
      )),
    );
  }
  const scopeLabel = (v: string) =>
    !v
      ? "All work"
      : v.startsWith("i:")
        ? (s.initiatives.find((i) => `i:${i.id}` === v)?.title ?? v)
        : (s.projects.find((p) => `p:${p.id}` === v)?.title ?? v);
  return (
    <div className="work-filters" role="search" aria-label="Filter items">
      <FormControl size="small" className="work-scope">
        <InputLabel id={scopeId}>Where</InputLabel>
        <Select
          labelId={scopeId}
          label="Where"
          value={scope}
          displayEmpty
          renderValue={(v) => scopeLabel(String(v))}
          onChange={(e) => {
            const v = String(e.target.value);
            set({
              initiative: v.startsWith("i:") ? v.slice(2) : undefined,
              project: v.startsWith("p:") ? v.slice(2) : undefined,
            });
          }}
          MenuProps={{ slotProps: { paper: { className: "work-scope-menu" } } }}
        >
          {scopeOptions}
        </Select>
      </FormControl>
      <TextField
        size="small"
        type="search"
        label="Find"
        placeholder="ID, title, or who has it"
        value={search.q ?? ""}
        inputRef={input}
        onChange={(e) => set({ q: e.target.value || undefined }, true)}
        className="work-search"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Icon href={svgSearch} />
              </InputAdornment>
            ),
            endAdornment: search.q ? (
              <InputAdornment position="end">
                <IconButton
                  label="Clear the words"
                  size="small"
                  onClick={() => {
                    set({ q: undefined }, true);
                    input.current?.focus();
                  }}
                >
                  <Icon href={svgDismiss} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />
      <span className="work-shown" aria-live="polite">
        {filtered && (
          <Typography variant="body-sm" color="textSecondary">
            {count} of {s.items.length} items
          </Typography>
        )}
        {filtered && (
          <Button
            variant="text"
            size="small"
            onClick={() =>
              set({
                initiative: undefined,
                project: undefined,
                q: undefined,
              })
            }
          >
            Clear filters
          </Button>
        )}
      </span>
    </div>
  );
}

// ------------------------------------------------------------ the owner's queue

function OwnerQueue({
  s,
  items,
  selected,
  projectOf,
  unblocks,
}: {
  s: WorkSnapshot;
  items: WorkItem[];
  selected?: string;
  projectOf: Map<string, WorkContainer>;
  /** Open items behind each, directly or through others. */
  unblocks: Map<string, number>;
}) {
  // The most waited-on first, counting what waits through other items.
  const queue = useMemo(
    () =>
      ownerQueue(s, items).sort(
        (a, b) =>
          (unblocks.get(b.decision.id) ?? 0) -
          (unblocks.get(a.decision.id) ?? 0),
      ),
    [s, items, unblocks],
  );
  if (!queue.length) {
    return (
      <Typography variant="body-md" color="textSecondary" render={<p />}>
        Nothing here waits on the owner.
      </Typography>
    );
  }
  return (
    <ol className="work-queue">
      {queue.map(({ decision: d, waiting }) => {
        const project = projectOf.get(d.project ?? "");
        return (
          <li
            key={d.id}
            className={`work-queue-item${d.id === selected ? " selected" : ""}`}
          >
            <ItemLink id={d.id} className="work-queue-main">
              <span className="work-card-top">
                <span className="work-id">{d.id}</span>
                {d.ready ? (
                  <StatusBadge tone="warning">Ready to decide</StatusBadge>
                ) : (
                  <StatusBadge tone="secondary">
                    First needs {d.open_needs.join(", ")}
                  </StatusBadge>
                )}
              </span>
              <Typography variant="body-md" className="work-queue-title">
                <InlineText text={d.title} />
              </Typography>
              <Typography variant="caption-md" color="textSecondary">
                {project?.title ?? d.project}
              </Typography>
            </ItemLink>
            <div className="work-queue-waits">
              <Typography variant="caption-lg" color="textSecondary">
                {waiting.length
                  ? `${unblocks.get(d.id) ?? waiting.length} ${(unblocks.get(d.id) ?? 0) === 1 ? "item waits" : "items wait"} on it${(unblocks.get(d.id) ?? 0) > waiting.length ? `, ${waiting.length} directly` : ""}`
                  : "Nothing waits on it yet"}
              </Typography>
              {waiting.map((w) => (
                <ItemLink
                  key={w.id}
                  id={w.id}
                  className="work-need"
                  label={`${w.id} ${w.title}`}
                >
                  <span className="work-id">{w.id}</span>
                  <span className="work-need-title">
                    <InlineText text={w.title} />
                  </span>
                </ItemLink>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** A link that opens an item beside the board, keeping the filters. */
function ItemLink({
  id,
  className,
  children,
  label,
}: {
  id: string;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  return (
    <RouterLink
      to="/work"
      search={(prev: WorkSearch) => ({ ...prev, item: id })}
      className={className}
      aria-label={label}
    >
      {children}
    </RouterLink>
  );
}

function KindBadge({ kind }: { kind: ItemKind }) {
  return <span className={`work-kind ${kind}`}>{KIND_NAMES[kind]}</span>;
}

// ------------------------------------------------------------ ready and blocked

function Grouped({
  s,
  items,
  empty,
  selected,
  projectOf,
  line,
  needs,
}: {
  s: WorkSnapshot;
  items: WorkItem[];
  empty: string;
  selected?: string;
  projectOf: Map<string, WorkContainer>;
  line?: (it: WorkItem) => string | undefined;
  needs?: (it: WorkItem) => Array<WorkItem | string>;
}) {
  if (!items.length) {
    return (
      <Typography variant="body-md" color="textSecondary" render={<p />}>
        {empty}
      </Typography>
    );
  }
  return (
    <div className="work-groups">
      {byProject(s, items).map(({ project, items: group }) => {
        const p = project ?? projectOf.get(group[0]!.project ?? "");
        return (
          <section key={p?.id ?? "none"} className="work-group">
            <header className="work-group-header">
              <Typography variant="subtitle-md" render={<h2 />}>
                {p ? p.title : "No project"}
              </Typography>
              <Typography variant="caption-md" color="textSecondary">
                {p?.id} · {group.length} {group.length === 1 ? "item" : "items"}
              </Typography>
            </header>
            <ul className="work-rows">
              {[...group]
                .sort(
                  (a, b) =>
                    b.needed_by.length - a.needed_by.length ||
                    idNumber(a.id) - idNumber(b.id),
                )
                .map((it) => {
                  const extra = line?.(it);
                  const open = needs?.(it) ?? [];
                  return (
                    <li
                      key={it.id}
                      className={`work-row${it.id === selected ? " selected" : ""}`}
                    >
                      <ItemLink id={it.id} className="work-row-main">
                        <span className="work-id">{it.id}</span>
                        <span className="work-row-title">
                          <InlineText text={it.title} />
                        </span>
                        {it.kind !== "work" && <KindBadge kind={it.kind} />}
                        {extra && (
                          <Typography
                            variant="caption-md"
                            color="textSecondary"
                            className="work-row-extra"
                          >
                            {extra}
                          </Typography>
                        )}
                      </ItemLink>
                      {open.length > 0 && (
                        <div className="work-row-needs">
                          <Typography
                            variant="caption-md"
                            color="textSecondary"
                          >
                            Waits on
                          </Typography>
                          {open.map((n) =>
                            typeof n === "string" ? (
                              <span key={n} className="work-need missing">
                                {n} (not in the tracker)
                              </span>
                            ) : (
                              <ItemLink
                                key={n.id}
                                id={n.id}
                                className="work-need"
                                label={`${n.id} ${n.title}, ${n.status}`}
                              >
                                <span className="work-id">{n.id}</span>
                                <span className="work-need-title">
                                  <InlineText text={n.title} />
                                </span>
                              </ItemLink>
                            ),
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ one item

function ItemPanel({
  s,
  id,
  projectOf,
  itemOf,
  flight,
  onClose,
  onProject,
}: {
  s: WorkSnapshot;
  id?: string;
  projectOf: Map<string, WorkContainer>;
  itemOf: Map<string, WorkItem>;
  flight: InFlight;
  onClose: () => void;
  onProject: (id: string) => void;
}) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const it = id ? itemOf.get(id) : undefined;
  const [text, setText] = useState<{
    id: string;
    text?: WorkItemText;
    error?: string;
  }>();
  useEffect(() => {
    if (!id) {
      return;
    }
    let live = true;
    setText({ id });
    loadItemText(id).then(
      (t) => live && setText({ id, text: t }),
      (e: Error) => live && setText({ id, error: e.message }),
    );
    return () => {
      live = false;
    };
  }, [id, s.generated]);
  const known = useMemo(() => new Set(s.items.map((x) => x.id)), [s]);
  const loaded = text?.id === id ? text : undefined;
  const project = it?.project ? projectOf.get(it.project) : undefined;
  const initiative = project?.initiative
    ? s.initiatives.find((i) => i.id === project.initiative)
    : undefined;
  const titleId = useId();
  const path = it?.path;
  // Vite's dev server opens a file in the editor, relative to its root.
  const editorPath = path?.replace(/^packages\/next\//, "");

  return (
    <Drawer
      anchor="right"
      open={!!id}
      onClose={onClose}
      transitionDuration={reduced ? 0 : undefined}
      slotProps={{
        paper: {
          className: "work-panel",
          "aria-labelledby": titleId,
          role: "dialog",
        } as object,
      }}
    >
      <div className="work-panel-head">
        <span className="work-card-top">
          <span className="work-id">{id}</span>
          {it && it.kind !== "work" && <KindBadge kind={it.kind} />}
        </span>
        <IconButton label="Close" onClick={onClose}>
          <Icon href={svgDismiss} />
        </IconButton>
      </div>
      {!it ? (
        <div className="work-panel-body">
          <Typography variant="headline-sm" render={<h2 />} id={titleId}>
            Not on this branch
          </Typography>
          <Typography variant="body-md" color="textSecondary" render={<p />}>
            {id} isn't among this branch's items. It may be on another branch,
            or not made yet.
          </Typography>
        </div>
      ) : (
        <div className="work-panel-body">
          <Typography variant="headline-sm" render={<h2 />} id={titleId}>
            <InlineText text={it.title} />
          </Typography>
          <div className="work-panel-states">
            <StatusBadge
              tone={
                it.status === "Done"
                  ? "success"
                  : it.status === "In progress"
                    ? "info"
                    : "secondary"
              }
            >
              {it.status}
            </StatusBadge>
            {isOpen(it) && it.status !== "In progress" && (
              <StatusBadge tone={stateOf(it).tone}>
                {stateOf(it).text}
              </StatusBadge>
            )}
            {isOwnerDecision(it) && (
              <StatusBadge tone="warning">Owner decides</StatusBadge>
            )}
          </div>
          <dl className="work-facts">
            {project && (
              <Fact name="Project">
                <Link
                  component="button"
                  type="button"
                  onClick={() => onProject(project.id)}
                  title="Show this project's items"
                >
                  {project.id} {project.title}
                </Link>
              </Fact>
            )}
            {initiative && (
              <Fact name="Initiative">
                {initiative.id} {initiative.title}
              </Fact>
            )}
            {(it.status === "In progress" || flight.has(it.id)) && (
              <Fact name="Claimed">{whereOf(it, flight, s.branch)}</Fact>
            )}
            {it.decided_by && <Fact name="Decided by">{it.decided_by}</Fact>}
            {it.party && <Fact name="Waits on">{it.party}</Fact>}
            {it.priority && <Fact name="Priority">{it.priority}</Fact>}
            {it.milestone && <Fact name="Milestone">{it.milestone}</Fact>}
            {it.created && <Fact name="Created">{it.created}</Fact>}
            {it.reason && <Fact name="Reason">{it.reason}</Fact>}
          </dl>

          <Related
            title="Needs"
            empty="Nothing: it can start once planned."
            ids={it.needs}
            itemOf={itemOf}
          />
          <Related
            title="Needed by"
            empty="No open item needs it."
            ids={it.needed_by}
            itemOf={itemOf}
          />

          <Divider className="work-panel-divider" />
          {!loaded || (!loaded.text && !loaded.error) ? (
            <div className="work-loading" role="status">
              <CircularProgress size={16} />
              <Typography variant="body-sm">Reading the item…</Typography>
            </div>
          ) : loaded.error ? (
            <Alert severity="error">
              The item's text didn't load ({loaded.error}).
            </Alert>
          ) : (
            <ItemText
              text={loaded.text!.body}
              known={known}
              itemLink={(ref, key) => (
                <Link
                  key={key}
                  render={
                    <RouterLink
                      to="/work"
                      search={(prev: WorkSearch) => ({ ...prev, item: ref })}
                    />
                  }
                >
                  {ref}
                </Link>
              )}
            />
          )}
        </div>
      )}
      {path && (
        <div className="work-panel-foot">
          <Typography
            variant="caption-md"
            color="textSecondary"
            className="work-mono work-path"
            title={path}
          >
            {path}
          </Typography>
          <span className="work-panel-actions">
            <Button
              variant="outlined"
              size="small"
              startIcon={<Icon href={svgCopy} />}
              onClick={() =>
                navigator.clipboard.writeText(path).then(
                  () => toast("Copied the item's path"),
                  () => toast("Couldn't copy: the browser refused", "bad"),
                )
              }
            >
              Copy path
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Icon href={svgFolderOpen} />}
              onClick={() =>
                fetch(
                  `/__open-in-editor?file=${encodeURIComponent(editorPath!)}`,
                ).then(
                  (r) =>
                    toast(
                      r.ok
                        ? "Opened in your editor"
                        : "The dev server couldn't open an editor",
                      r.ok ? undefined : "bad",
                    ),
                  () => toast("The dev server didn't answer", "bad"),
                )
              }
            >
              Open in editor
            </Button>
          </span>
        </div>
      )}
    </Drawer>
  );
}

function Fact({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="work-fact">
      <dt>
        <Typography variant="caption-lg" color="textSecondary">
          {name}
        </Typography>
      </dt>
      <dd>
        <Typography variant="body-sm">{children}</Typography>
      </dd>
    </div>
  );
}

function Related({
  title,
  empty,
  ids,
  itemOf,
}: {
  title: string;
  empty: string;
  ids: string[];
  itemOf: Map<string, WorkItem>;
}) {
  return (
    <section className="work-related">
      <Typography variant="subtitle-md" render={<h3 />}>
        {title}
      </Typography>
      {!ids.length ? (
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          {empty}
        </Typography>
      ) : (
        <ul className="work-related-list">
          {ids.map((id) => {
            const x = itemOf.get(id);
            return (
              <li key={id}>
                {x ? (
                  <ItemLink id={id} className="work-related-item">
                    <span className="work-id">{id}</span>
                    <span className="work-related-title">
                      <InlineText text={x.title} />
                    </span>
                    <StatusBadge
                      tone={
                        x.status === "Done"
                          ? "success"
                          : x.status === "In progress"
                            ? "info"
                            : "secondary"
                      }
                    >
                      {x.status}
                    </StatusBadge>
                  </ItemLink>
                ) : (
                  <span className="work-related-item missing">
                    <span className="work-id">{id}</span>
                    <span className="work-related-title">
                      Not in the tracker on this branch
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
