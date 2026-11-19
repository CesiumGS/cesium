import "./work.css";
import {
  Alert,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Tab,
  Tabs,
  InputAdornment,
  Link,
  Popover,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgCheckmark } from "@stratakit/icons/checkmark";
import { svgChevronRight } from "@stratakit/icons/chevron-right";
import { svgCopy } from "@stratakit/icons/copy";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgFilter } from "@stratakit/icons/filter";
import { svgFitToView } from "@stratakit/icons/fit-to-view";
import { svgFolderOpen } from "@stratakit/icons/folder-open";
import { svgGitBranch } from "@stratakit/icons/git-branch";
import { svgInfo } from "@stratakit/icons/info";
import { svgSearch } from "@stratakit/icons/search";
import { svgZoomInMagnifier } from "@stratakit/icons/zoom-in-magnifier";
import { svgZoomOutMagnifier } from "@stratakit/icons/zoom-out-magnifier";
import { Icon } from "@stratakit/mui";
import {
  getRouteApi,
  Link as RouterLink,
  useNavigate,
} from "@tanstack/react-router";
import {
  createContext,
  type CSSProperties,
  Fragment,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useContext,
  useRef,
  useState,
} from "react";
import type { WorkSearch } from "../routes.tsx";
import { useWork } from "../useWork.ts";
import {
  type Actor,
  ageText,
  byProject,
  cardDetail,
  clampZoom,
  dependencyMatrix,
  fitZoom,
  ENTITY_KIND_NAMES,
  ENTITY_KIND_TIPS,
  ENTITY_KINDS,
  type EntityKind,
  type Flow,
  findWork,
  flowOf,
  idNumber,
  type InFlight,
  inFlightOf,
  isOpen,
  isOwnerDecision,
  kindsOf,
  LOOSE_KINDS,
  type LooseKind,
  filterLoose,
  looseCounts,
  loadItemText,
  criticalPathOf,
  loopTies,
  longestChains,
  type MeasurePoint,
  type Measures,
  measuresOf,
  median,
  percentile,
  type MapEdge,
  type MapFlag,
  type MapNode,
  type MilestoneMap as MilestoneMapData,
  mapEntityItems,
  mapEntityTitle,
  milestoneMapOf,
  milestoneRoadmapOf,
  barCounts,
  nextActor,
  noMilestoneOf,
  OPEN_STATES,
  type OpenState,
  openStateOf,
  PROPOSAL_GATES,
  type ProposalGate,
  type ProposalGroup,
  proposalGate,
  proposalsOf,
  type ReleaseFlag,
  releaseFlagsOf,
  releasesGatedBy,
  isReleaseItem,
  itemKindOf,
  type RoadmapRow,
  ownerQueue,
  type Stage,
  STAGE_NAMES,
  STATE_NAMES,
  UNSHAPED,
  STAGES,
  stageOf,
  stateOf,
  unblocksOf,
  workInProgress,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomAbout,
  zoomStep,
  type WorkContainer,
  type WorkFound,
  type WorkItem,
  type WorkItemText,
  type WorkMilestone,
  type WorkSnapshot,
} from "../work.ts";
import { Empty, Page, toast, useChartTokens } from "./common.tsx";
import {
  coordSimplex,
  decrossTwoLayer,
  graph as dagGraph,
  layeringSimplex,
  type MutGraphNode,
  sugiyama,
} from "d3-dag";
import { InlineText, ItemText } from "./ItemText.tsx";
import { Status as StatusBadge } from "./runParts.tsx";

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
  const kinds = useMemo(
    () => (snapshot ? kindsOf(snapshot) : new Map<string, EntityKind>()),
    [snapshot],
  );
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
            <code>npx hitld work query --ready</code>.
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
  return (
    <KindsContext.Provider value={kinds}>
      <SnapshotContext.Provider value={snapshot}>
        <Board s={snapshot} search={search} set={set} />
      </SnapshotContext.Provider>
    </KindsContext.Provider>
  );
}

const DESCRIPTION =
  "The agent system's work on 2.0, from the tracker: what waits on you, what comes next, and how it flows. Choose anything to see its items.";

function WorkHelp() {
  return (
    <>
      <p>
        The board reads the work items in <code>packages/next/work</code> on the
        branch Dyno is served from, through human-in-the-lead's read API (
        <code>hitld work query</code>). It never changes a file: edit the item,
        or have the main session make one with <code>npx hitld work new</code>.
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

const DAY_MS = 86_400_000;

/** What each stage's color means, for the tooltip on anything colored by stage. */
const STAGE_MEANING: Record<Stage, string> = {
  Proposed: "gray: proposed, not committed to yet",
  Waiting: "red: blocked until the items it needs are done",
  Ready: "blue: ready, nothing it needs is open",
  "In flight": "violet: in progress, someone has it",
  Done: "green: done",
};
const stageTip = (st: Stage, lead?: string) =>
  `${lead ? `${lead} · ` : ""}${STAGE_NAMES[st]} (${STAGE_MEANING[st]})`;

type View = "move" | "roadmap" | "proposals" | "no-milestone" | "flow";
const VIEWS: Array<{ id: View; label: string }> = [
  { id: "move", label: "Your move" },
  { id: "roadmap", label: "Roadmap" },
  { id: "proposals", label: "Proposals" },
  { id: "no-milestone", label: "No milestone" },
  { id: "flow", label: "Flow" },
];
/** The layout's width at which the pane sits beside the view, not over it. */
const PANE_MIN = 1000;

/** An element's laid-out width, kept current. */
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 0 : window.innerWidth - 300,
  );
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setWidth(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

type ScopeKind = "project" | "milestone";
/** The scope: any mix of projects and milestones; none is all work. */
type ScopeSet = Record<ScopeKind, string[]>;
const SCOPE_KINDS: ScopeKind[] = ["project", "milestone"];
const listOf = (v?: string) => (v ? v.split(",").filter(Boolean) : []);
const scopeSetOf = (search: WorkSearch): ScopeSet => ({
  project: listOf(search.project),
  milestone: listOf(search.milestone),
});
/** The scope as search fields, each a comma-separated list. */
const scopeSearch = (set: ScopeSet): Partial<WorkSearch> =>
  Object.fromEntries(
    SCOPE_KINDS.map((k) => [k, set[k].join(",") || undefined]),
  );
const scopeSize = (set: ScopeSet) => set.project.length + set.milestone.length;

function Board({
  s,
  search,
  set,
}: {
  s: WorkSnapshot;
  search: WorkSearch;
  set: (patch: Partial<WorkSearch>, replace?: boolean) => void;
}) {
  const layout = useRef<HTMLDivElement>(null);
  const width = useWidth(layout);
  const inline = width >= PANE_MIN;
  const view: View =
    search.view === "roadmap" ||
    search.view === "proposals" ||
    search.view === "no-milestone" ||
    search.view === "flow"
      ? search.view
      : "move";
  const flight = useMemo(() => inFlightOf(s), [s]);
  const projectOf = useMemo(
    () => new Map(s.projects.map((p) => [p.id, p])),
    [s],
  );
  const chosen = useMemo(
    () => scopeSetOf(search),
    [search.project, search.milestone],
  );
  const size = scopeSize(chosen);
  // One line chosen, of one kind: the views that read one scope's shape.
  const oneOf = (k: ScopeKind) =>
    size === 1 && chosen[k].length === 1 ? chosen[k][0] : undefined;
  const oneProject = oneOf("project");
  const milestoneId = oneOf("milestone");
  // Everything the scope's lines hold, together.
  const items = useMemo(() => {
    if (!size) {
      return s.items;
    }
    const constraints = new Set(
      s.milestones
        .filter((m) => chosen.milestone.includes(m.id))
        .flatMap((m) => m.constraints.map((c) => c.id)),
    );
    return s.items.filter(
      (it) =>
        chosen.project.includes(it.project ?? "") || constraints.has(it.id),
    );
  }, [s, chosen, size]);
  const msInScope = (m: WorkMilestone) =>
    !size ||
    chosen.milestone.includes(m.id) ||
    chosen.project.includes(m.project ?? "");
  const itemOf = useMemo(() => new Map(s.items.map((i) => [i.id, i])), [s]);
  const msOf = useMemo(() => new Map(s.milestones.map((m) => [m.id, m])), [s]);
  const unblocks = useMemo(() => unblocksOf(s), [s]);
  const chains = useMemo(() => longestChains(items), [items]);
  const flow = useMemo(() => flowOf(s, items, { flight }), [s, items, flight]);
  const byActor = useMemo(() => {
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
  const mostWaitedOn = (list: WorkItem[]) =>
    [...list].sort(
      (a, b) => (unblocks.get(b.id) ?? 0) - (unblocks.get(a.id) ?? 0),
    );
  const decisions = byActor.owner.filter(isOwnerDecision);
  const proposals = useMemo(
    () => proposalsOf(s, items, s.milestones.filter(msInScope), unblocks),
    // msInScope reads only the scope, which `items` follows.
    [s, items, unblocks],
  );
  const readyToStart = byActor.agents.filter(
    (it) => stageOf(it, flight) === "Ready",
  );
  const inFlight = workInProgress(items, flight);
  const now = Date.now();
  const ageOf = (it: WorkItem) => now - (flow.since.get(it.id) ?? now);
  const doneDaily = useMemo(
    () => doneByDay(s, items, flow.days),
    [s, items, flow.days],
  );
  const open = (list: string) => set({ list, item: undefined });
  /** Scopes to one line (or all work), replacing the scope. */
  const scopeTo = (patch: Partial<WorkSearch>) =>
    set({
      project: undefined,
      milestone: undefined,
      ...patch,
    });
  /** Adds a line to the scope, or takes it out. */
  const toggleScope = (kind: ScopeKind, id: string) => {
    const next: ScopeSet = { ...chosen, [kind]: [...chosen[kind]] };
    const at = next[kind].indexOf(id);
    if (at >= 0) {
      next[kind].splice(at, 1);
    } else {
      next[kind].push(id);
    }
    set(scopeSearch(next));
  };
  const scopeTitle = (kind: ScopeKind, id: string) =>
    (kind === "milestone"
      ? s.milestones.find((m) => m.id === id)?.title
      : projectOf.get(id)?.title) ?? id;
  const scopeNames = SCOPE_KINDS.flatMap((k) =>
    chosen[k].map((id) => scopeTitle(k, id)),
  );
  const scope =
    scopeNames.length > 2
      ? `${scopeNames[0]} and ${scopeNames.length - 1} more`
      : scopeNames.join(" and ") || undefined;
  const roadmapBy = search.roadmap === "matrix" ? "matrix" : "milestones";
  // Proposed milestones join the roadmap only when asked for (CS-563).
  const withProposed = search.proposed === "show";
  const proposedCount = s.milestones.filter(
    (m) => m.state === "proposed",
  ).length;
  const projectScope = !!oneProject;
  // The view's own width: the pane, when inline, takes 400 px of the layout.
  const mainWidth =
    inline && (search.list || search.item) ? width - 424 : width;
  const hasTokens =
    s.items.some(
      (it) => it.estimate_tokens !== undefined || it.tokens_spent !== undefined,
    ) || s.milestones.some((m) => m.appetite_tokens !== undefined);
  // The map by default; a phone-width view starts on the list.
  const narrow = mainWidth < 480;
  const asMap =
    search.layout === "map" || (search.layout !== "list" && !narrow);
  const across: "steps" | "tokens" =
    search.across === "tokens" && hasTokens ? "tokens" : "steps";

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
          . Run <code>npx hitld work check</code>.
        </Alert>
      )}

      <div
        ref={layout}
        className={`work-layout${inline && (search.list || search.item) ? " has-pane" : ""}`}
      >
        <div className="work-main">
          <div className="work-main-bar">
            <ScopeTrail
              s={s}
              search={search}
              flight={flight}
              chosen={chosen}
              names={scopeNames}
              onToggle={toggleScope}
              onScope={(go) =>
                go.milestone
                  ? set({
                      project: undefined,
                      milestone: go.milestone,
                      list: `ms:${go.milestone}`,
                      item: undefined,
                    })
                  : scopeTo(go)
              }
            />
            <FindField q={search.q} set={set} />
          </div>
          <div className="work-tabs-row">
            <Tabs
              value={view}
              onChange={(_, v: View) =>
                set({ view: v === "move" ? undefined : v })
              }
              aria-label="Views"
              className="work-tabs"
            >
              {VIEWS.map((v) => (
                <Tab
                  key={v.id}
                  value={v.id}
                  label={v.label}
                  id={`work-tab-${v.id}`}
                  aria-controls="work-view"
                />
              ))}
            </Tabs>
            <KindLegend />
          </div>
          <div
            id="work-view"
            role="tabpanel"
            aria-labelledby={`work-tab-${view}`}
            className="work-view"
          >
            {view === "move" && (
              <div className="work-dash">
                <Card
                  id="work-needs-h"
                  title="Your decisions"
                  className="span-7"
                  stat={{
                    value: decisions.length,
                    detail: decisions.length
                      ? `Oldest waiting ${ageText(Math.max(...decisions.map(ageOf)))}`
                      : "Nothing waits on you",
                    tone: decisions.length ? "attention" : undefined,
                    onOpen: () => open("owner"),
                  }}
                  foot={
                    decisions.length > 8 && (
                      <Link
                        component="button"
                        type="button"
                        onClick={() => open("owner")}
                      >
                        All {decisions.length} decisions
                      </Link>
                    )
                  }
                >
                  <LeverageBars
                    items={mostWaitedOn(decisions)}
                    unblocks={unblocks}
                    limit={8}
                    selected={search.item}
                    empty="Nothing waits on you."
                  />
                </Card>

                <Card
                  id="work-ready-h"
                  title="Ready to start"
                  className="span-5"
                  stat={{
                    value: readyToStart.length,
                    onOpen: () => open("ready"),
                  }}
                  foot={
                    readyToStart.length > 8 && (
                      <Link
                        component="button"
                        type="button"
                        onClick={() => open("ready")}
                      >
                        All {readyToStart.length} ready
                      </Link>
                    )
                  }
                >
                  <LeverageBars
                    items={mostWaitedOn(readyToStart)}
                    unblocks={unblocks}
                    limit={8}
                    selected={search.item}
                    empty="Nothing is ready to start."
                  />
                </Card>

                <Card
                  id="work-flight-h"
                  title="In progress"
                  className="span-7"
                  stat={{
                    value: inFlight.length,
                    detail: "Who holds each, and for how long",
                    onOpen: () => open("working"),
                  }}
                >
                  <InFlightRows
                    items={inFlight}
                    flight={flight}
                    branch={s.branch}
                    since={flow.since}
                    selected={search.item}
                  />
                </Card>

                <Card
                  id="work-outside-h"
                  title="Waiting outside"
                  className="span-5"
                  stat={{
                    value: byActor.outside.length,
                    detail: byActor.outside.length
                      ? `On ${new Set(byActor.outside.map((it) => it.waiting_on ?? "")).size} other parties`
                      : "Nothing waits outside",
                    onOpen: () => open("outside"),
                  }}
                  foot={
                    byActor.outside.length > 5 && (
                      <Link
                        component="button"
                        type="button"
                        onClick={() => open("outside")}
                      >
                        All {byActor.outside.length}
                      </Link>
                    )
                  }
                >
                  <LeverageBars
                    items={mostWaitedOn(byActor.outside)}
                    unblocks={unblocks}
                    limit={5}
                    selected={search.item}
                    empty="Nothing waits on other parties."
                    party
                  />
                </Card>
              </div>
            )}

            {view === "roadmap" && (
              <div className="work-dash">
                <Card
                  id="work-roadmap-h"
                  title={projectScope ? "Linked projects" : "Roadmap"}
                  caption={
                    projectScope
                      ? "What it waits on, and what waits on it"
                      : roadmapBy === "matrix"
                        ? "Each row's open items that wait on each column's"
                        : "In the order their work can happen, from the needs between their items"
                  }
                  className="span-12"
                  tools={
                    !projectScope && (
                      <span className="work-card-tools">
                        {roadmapBy === "milestones" && (
                          <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={asMap ? "map" : "list"}
                            onChange={(_, v: string | null) =>
                              v &&
                              set(
                                {
                                  layout:
                                    v === (narrow ? "list" : "map")
                                      ? undefined
                                      : v,
                                },
                                true,
                              )
                            }
                            aria-label="Show milestones as"
                          >
                            <ToggleButton
                              value="map"
                              render={
                                <Button variant="outlined" size="small" />
                              }
                            >
                              Map
                            </ToggleButton>
                            <ToggleButton
                              value="list"
                              render={
                                <Button variant="outlined" size="small" />
                              }
                            >
                              List
                            </ToggleButton>
                          </ToggleButtonGroup>
                        )}
                        {roadmapBy === "milestones" && asMap && (
                          <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={across}
                            onChange={(_, v: string | null) =>
                              v &&
                              set(
                                { across: v === "steps" ? undefined : v },
                                true,
                              )
                            }
                            aria-label="Across"
                          >
                            <ToggleButton
                              value="steps"
                              render={
                                <Button variant="outlined" size="small" />
                              }
                            >
                              Steps
                            </ToggleButton>
                            <ToggleButton
                              value="tokens"
                              disabled={!hasTokens}
                              render={
                                <Button
                                  variant="outlined"
                                  size="small"
                                  title={
                                    hasTokens
                                      ? "Across by the tokens left on the way"
                                      : "No token estimates yet: give items estimate_tokens, or milestones appetite_tokens"
                                  }
                                />
                              }
                            >
                              Tokens
                            </ToggleButton>
                          </ToggleButtonGroup>
                        )}
                        <ToggleButton
                          value="proposed"
                          size="small"
                          selected={withProposed}
                          onChange={() =>
                            set(
                              { proposed: withProposed ? undefined : "show" },
                              true,
                            )
                          }
                          disabled={!proposedCount && !withProposed}
                          render={
                            <Button
                              variant="outlined"
                              size="small"
                              className="work-proposed-toggle"
                              title={
                                withProposed
                                  ? "Hide the proposed milestones: committed work only"
                                  : proposedCount
                                    ? `Show the ${proposedCount} proposed ${proposedCount === 1 ? "milestone" : "milestones"} too, outlined dashed`
                                    : "No proposed milestones"
                              }
                            />
                          }
                        >
                          <span
                            className="work-proposed-mark"
                            aria-hidden="true"
                          />
                          Proposed
                          <span className="work-toggle-count">
                            {proposedCount}
                          </span>
                        </ToggleButton>
                        <ToggleButtonGroup
                          size="small"
                          exclusive
                          value={roadmapBy}
                          onChange={(_, v: string | null) =>
                            v &&
                            set(
                              {
                                roadmap: v === "milestones" ? undefined : v,
                              },
                              true,
                            )
                          }
                          aria-label="Roadmap by"
                        >
                          <ToggleButton
                            value="milestones"
                            render={<Button variant="outlined" size="small" />}
                          >
                            Milestones
                          </ToggleButton>
                          <ToggleButton
                            value="matrix"
                            render={<Button variant="outlined" size="small" />}
                          >
                            Project waits
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </span>
                    )
                  }
                >
                  {projectScope ? (
                    <ProjectLinks
                      s={s}
                      project={oneProject!}
                      onCell={(from, to) => open(`dep:${from}:${to}`)}
                    />
                  ) : roadmapBy === "matrix" ? (
                    <MatrixView
                      s={s}
                      items={items}
                      flight={flight}
                      proposals={withProposed}
                      release={search.release}
                      onRelease={(id) => set({ release: id }, true)}
                      onCell={(from, to) => open(`dep:${from}:${to}`)}
                      onProject={(id) => scopeTo({ project: id })}
                    />
                  ) : roadmapBy === "milestones" && asMap ? (
                    <MilestoneMap
                      s={s}
                      flight={flight}
                      unit={across}
                      proposals={withProposed}
                      inScope={size ? msInScope : undefined}
                      selected={
                        search.list?.startsWith("ms:")
                          ? search.list.slice(3)
                          : milestoneId
                      }
                      onOpen={(id) => open(`ms:${id}`)}
                      onItem={(id) => set({ item: id, list: undefined })}
                      onWait={(from, to) => open(`mdep:${to}:${from}`)}
                      release={search.release}
                      onRelease={(id) => set({ release: id }, true)}
                      shape={search.shape === "graph" ? "graph" : "lanes"}
                      onShape={(v) =>
                        set({ shape: v === "graph" ? v : undefined }, true)
                      }
                    />
                  ) : (
                    <Roadmap
                      s={s}
                      flight={flight}
                      proposals={withProposed}
                      inScope={size ? msInScope : undefined}
                      selected={
                        search.list?.startsWith("ms:")
                          ? search.list.slice(3)
                          : milestoneId
                      }
                      onOpen={(id) => open(`ms:${id}`)}
                      onWait={(from, to) => open(`mdep:${from}:${to}`)}
                      release={search.release}
                      onRelease={(id) => set({ release: id }, true)}
                    />
                  )}
                </Card>

                <Card
                  id="work-chain-h"
                  title="Longest chains"
                  caption="Items that must happen in order, by where they start"
                  className="span-12"
                >
                  <ChainBars
                    chains={chains}
                    flight={flight}
                    projectOf={projectOf}
                    limit={6}
                    onChain={(head) => open(`chain:${head}`)}
                  />
                </Card>
              </div>
            )}

            {view === "proposals" && (
              <div className="work-dash">
                <ProposalsCard
                  groups={proposals}
                  itemOf={itemOf}
                  unblocks={unblocks}
                  selected={search.item}
                  gate={
                    search.gate === "free" ||
                    search.gate === "decision" ||
                    search.gate === "items"
                      ? search.gate
                      : undefined
                  }
                  onGate={(gate) => set({ gate }, true)}
                  onMilestone={(id) => open(`ms:${id}`)}
                  msOf={msOf}
                />
              </div>
            )}

            {view === "no-milestone" && (
              <div className="work-dash">
                <NoMilestoneCard
                  s={s}
                  items={items}
                  flight={flight}
                  scope={scope}
                  selected={search.item}
                  kinds={listOf(search.kind) as LooseKind[]}
                  states={listOf(search.state) as OpenState[]}
                  onFilter={(patch) => set(patch, true)}
                />
              </div>
            )}

            {view === "flow" && (
              <div className="work-dash">
                <Card
                  id="work-flow-h"
                  title="Items in each stage, day by day"
                  caption={`A band that widens is a queue growing; choose one to list it. ${flow.created} ${flow.created === 1 ? "item" : "items"} new in the last ${flow.window} days.`}
                  className="span-12"
                >
                  <FlowChart
                    flow={flow}
                    onStage={(st) => open(`stage:${st}`)}
                  />
                </Card>
                <MeasuresCard
                  s={s}
                  items={items}
                  flow={flow}
                  doneDaily={doneDaily}
                  itemOf={itemOf}
                  onOpen={open}
                />
                <Typography
                  variant="caption-md"
                  color="textTertiary"
                  render={<p />}
                  className="work-later"
                >
                  The merge queue, quotas and the controllers' steps join this
                  view when HITLd records them.
                </Typography>
              </div>
            )}
          </div>
        </div>

        <ListPanel
          s={s}
          list={search.list}
          open={!!search.list && !(inline && search.item)}
          inline={inline}
          items={items}
          flight={flight}
          flow={flow}
          unblocks={unblocks}
          projectOf={projectOf}
          itemOf={itemOf}
          selected={search.item}
          search={search}
          scope={scope}
          onClose={() =>
            set({ list: undefined, item: undefined, q: undefined })
          }
          onProject={(id) =>
            set({
              project: id,
              milestone: undefined,
              item: undefined,
              list: undefined,
            })
          }
          onList={(l) => set({ list: l, item: undefined })}
          onQuery={(q: string) =>
            set({ q: q || undefined, list: q ? "find" : undefined }, true)
          }
        />
        <ItemPanel
          s={s}
          id={search.item}
          inline={inline}
          projectOf={projectOf}
          itemOf={itemOf}
          flight={flight}
          back={search.list ? listTitle(search.list, scope, s) : undefined}
          onClose={() => set({ item: undefined })}
          onProject={(id) =>
            set({
              project: id,
              milestone: undefined,
              item: undefined,
              list: undefined,
            })
          }
        />
      </div>
    </Page>
  );
}

/** Below this many samples, a measure shows its points but no typical value. */
const MIN_SAMPLES = 10;

/**
 * The measures that replace velocity (human-in-the-lead's design, part
 * 11): flow from the tracker's history now, tokens and quality once its
 * ledger records them. Each row has its value, a chart over time, how it
 * is read (the info tip) and its pair, the measure that must not get
 * worse if this one is pushed (part 11.3).
 */
function MeasuresCard({
  s,
  items,
  flow,
  doneDaily,
  itemOf,
  onOpen,
}: {
  s: WorkSnapshot;
  items: WorkItem[];
  flow: Flow;
  doneDaily: number[];
  itemOf: Map<string, WorkItem>;
  onOpen: (list: string) => void;
}) {
  const m: Measures = useMemo(
    () => measuresOf(s, items, flow),
    [s, items, flow],
  );
  const end = Date.now();
  const began = flow.days[0] ?? end;
  // At least two weeks across, so a short history reads as short.
  const start = Math.min(began, end - 14 * DAY_MS);
  const typical = (xs: number[], what: string) =>
    xs.length >= MIN_SAMPLES
      ? {
          value: ageText(median(xs)!),
          sub: `Median of ${xs.length}; 90th percentile ${ageText(percentile(xs, 90)!)}`,
        }
      : {
          value: `${xs.length} ${what}`,
          sub: `Too few for a typical time (it needs ${MIN_SAMPLES}); each dot is one`,
        };
  const lead = typical(m.lead, m.lead.length === 1 ? "finished" : "finished");
  const answered = typical(m.decisionLatency, "answered");
  const titleOf = (id: string) => itemOf.get(id)?.title ?? id;
  // As Your decisions counts them: open, with nothing they need still open.
  const answerable = items.filter(
    (it) => isOwnerDecision(it) && !it.open_needs.length,
  ).length;
  return (
    <Card
      id="work-measures-h"
      title="Measures"
      caption="Each is paired with the measure that must not get worse when it is pushed"
      className="span-12"
    >
      <ul className="work-mrows">
        <MeasureRow
          name="Throughput"
          info={`Items moved to Done, by day; the headline counts the last ${flow.window} days. The tracker's import, which arrived with items already Done, isn't counted.`}
          value={`${flow.arrived.Done} done`}
          sub={`In the last ${flow.window} days`}
          pair="Change failure rate, escaped defects"
          onOpen={() => onOpen("done")}
          chart={
            <MiniChart
              kind="bars"
              start={start}
              began={began}
              end={end}
              days={flow.days}
              series={doneDaily}
              tone="done"
              format={(v) => `${v} done`}
              label="Items done per day"
            />
          }
        />
        <MeasureRow
          name="Lead time"
          info="From an item's Planned to its Done, for items finished since the history began. Each dot is one item, at the day it finished; higher took longer. Work that lands as one merge shows the merge's timing, so the numbers firm up once HITLd records claims."
          value={lead.value}
          sub={lead.sub}
          chart={
            <MiniChart
              kind="dots"
              start={start}
              began={began}
              end={end}
              points={m.leadPoints}
              tone="done"
              median={m.lead.length >= MIN_SAMPLES ? median(m.lead) : undefined}
              format={(v) => ageText(v)}
              pointLabel={(p) => `${p.id} ${titleOf(p.id)}: ${ageText(p.v)}`}
              label="Lead time of each finished item"
              empty="No item has finished since the history began"
            />
          }
        />
        <MeasureRow
          name="Decision latency"
          info="From a decision being asked (its creation) to its answer (Done). Filled dots are answered decisions, at the day they were answered; the open column at the right is every decision still waiting, by how long it has waited."
          value={answered.value}
          sub={
            m.decisionsOpen.length
              ? `${m.decisionsOpen.length} open, ${answerable} you can answer now; oldest asked ${ageText(Math.max(...m.decisionsOpen))} ago`
              : "None open"
          }
          pair="How often answered decisions are overruled or reversed"
          onOpen={() => onOpen("owner")}
          chart={
            <MiniChart
              kind="dots"
              start={start}
              began={began}
              end={end}
              points={m.decisionPoints}
              tone="attention"
              median={
                m.decisionLatency.length >= MIN_SAMPLES
                  ? median(m.decisionLatency)
                  : undefined
              }
              format={(v) => ageText(v)}
              pointLabel={(p) =>
                `${p.id} ${titleOf(p.id)}: ${p.open ? `waiting ${ageText(p.v)}` : `answered after ${ageText(p.v)}`}`
              }
              label="How long each decision waited"
            />
          }
        />
        <MeasureRow
          name="Blocked on your decisions"
          info="Open items that need an open decision of yours, at the end of each day. The item-days are how long those waiting now have waited so far, together."
          value={`${m.blocked.items} ${m.blocked.items === 1 ? "item" : "items"}`}
          sub={
            m.blocked.items
              ? `Behind ${m.blocked.decisions} ${m.blocked.decisions === 1 ? "decision" : "decisions"}; ${Math.round(m.blocked.itemDays)} item-days so far`
              : "No open item waits on you"
          }
          onOpen={() => onOpen("owner")}
          chart={
            <MiniChart
              kind="line"
              start={start}
              began={began}
              end={end}
              days={flow.days}
              series={m.blockedDaily}
              tone="attention"
              format={(v) => `${v} blocked`}
              label="Items blocked on your decisions, by day"
            />
          }
        />
        <MeasureRow
          name="Token estimate error"
          info={`How far each item type's token estimates are from the tokens spent: accuracy is the bias (the mean of log actual over estimate), precision the spread. It needs estimates on items (estimate_tokens; ${m.estimated} have one) and actual tokens from HITLd's ledger.`}
          pair="Appetite use: estimates mustn't be padded"
        />
        <MeasureRow
          name="Tokens per accepted item"
          info="All tokens spent on an item (the work, retries, checks and reviews) for items merged and not reverted, by tier and item type. It needs HITLd's ledger."
          pair="First-pass yield, escaped defects"
        />
        <MeasureRow
          name="First-pass yield"
          info="The share of items whose first report passed verification and merged without a second round. It needs HITLd's ledger."
        />
      </ul>
    </Card>
  );
}

/** An info mark that shows how something is read, on hover or focus. */
function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip title={text} placement="top" arrow>
      <button type="button" className="work-info" aria-label={text}>
        <Icon href={svgInfo} />
      </button>
    </Tooltip>
  );
}

/**
 * One measure: its name and how it is read (the info tip), its value now,
 * a chart over time, and its pair. With no value it isn't measured yet,
 * and the chart's place says what it waits for.
 */
function MeasureRow({
  name,
  info,
  value,
  sub,
  chart,
  pair,
  onOpen,
}: {
  name: string;
  info: string;
  value?: string;
  sub?: string;
  chart?: ReactNode;
  pair?: string;
  onOpen?: () => void;
}) {
  const later = value === undefined;
  return (
    <li className={`work-mrow${later ? " later" : ""}`}>
      <span className="work-mrow-name">
        <Typography variant="body-sm" render={<h3 />}>
          {name}
        </Typography>
        <InfoTip text={info} />
      </span>
      <span className="work-mrow-value">
        {later ? (
          <span className="work-mrow-big muted">Not measured yet</span>
        ) : onOpen ? (
          <button type="button" className="work-mrow-big" onClick={onOpen}>
            {value}
          </button>
        ) : (
          <span className="work-mrow-big">{value}</span>
        )}
        {sub && (
          <Typography variant="caption-md" color="textSecondary">
            {sub}
          </Typography>
        )}
      </span>
      <span className="work-mrow-chart">
        {chart ?? (
          <Typography variant="caption-md" color="textSecondary">
            Arrives with HITLd's ledger
          </Typography>
        )}
      </span>
      <Typography
        variant="caption-md"
        color="textSecondary"
        className="work-mrow-pair"
      >
        {pair ? (
          <>Paired with {pair.charAt(0).toLowerCase() + pair.slice(1)}</>
        ) : (
          "No pair"
        )}
      </Typography>
    </li>
  );
}

/**
 * A small chart over the history's days: bars or a line for a count per
 * day, or dots for things that finished (how long each took, at the day
 * it finished; open ones stand at the right edge, hollow). Hovering
 * follows the pointer with a crosshair and reads the nearest day or dot.
 */
function MiniChart({
  kind,
  start,
  began,
  end,
  days = [],
  series = [],
  points = [],
  tone,
  median: mid,
  format,
  pointLabel,
  label,
  empty = "Nothing yet",
}: {
  kind: "bars" | "line" | "dots";
  start: number;
  /** When the history began: before it, the chart is shaded. */
  began: number;
  end: number;
  days?: number[];
  series?: number[];
  points?: MeasurePoint[];
  tone: "done" | "attention";
  median?: number;
  format: (v: number) => string;
  pointLabel?: (p: MeasurePoint) => string;
  label: string;
  empty?: string;
}) {
  const [at, setAt] = useState<number>();
  const ref = useRef<SVGSVGElement>(null);
  const hatch = useId();
  const w = 240;
  const h = 44;
  const pad = 5;
  const span = Math.max(1, end - start);
  const xt = (t: number) => pad + ((t - start) / span) * (w - 2 * pad);
  const values = kind === "dots" ? points.map((p) => p.v) : series;
  const max = Math.max(1, ...values, mid ?? 0);
  const y = (v: number) => h - pad - ((h - 2 * pad) * v) / max;
  // Day bars and line points sit at each day's middle, the last at now.
  const dayX = (i: number) =>
    i === days.length - 1
      ? xt(end) - (kind === "bars" ? 4 : 0)
      : xt(days[i]! + DAY_MS / 2);
  // Open ones all stand at now: spread them leftwards in a narrow band,
  // longest-waiting nearest the edge, so each one shows.
  const openOrder = new Map(
    points
      .filter((p) => p.open)
      .sort((a, b) => b.v - a.v)
      .map((p, i) => [p.id, i]),
  );
  const px = (p: MeasurePoint) =>
    p.open ? xt(p.t) - ((openOrder.get(p.id) ?? 0) % 6) * 4 : xt(p.t);
  const xs = kind === "dots" ? points.map(px) : days.map((_, i) => dayX(i));
  const day = (t: number) =>
    new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
  if (!values.length) {
    return <span className="work-mini-empty">{empty}</span>;
  }
  const follow = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r?.width) {
      return;
    }
    const px = ((clientX - r.left) / r.width) * w;
    let best = 0;
    for (let i = 1; i < xs.length; i++) {
      if (Math.abs(xs[i]! - px) < Math.abs(xs[best]! - px)) {
        best = i;
      }
    }
    setAt(best);
  };
  const read =
    at === undefined
      ? undefined
      : kind === "dots"
        ? (pointLabel?.(points[at]!) ?? format(points[at]!.v))
        : `${day(days[at]!)}: ${format(series[at]!)}`;
  const barW = Math.max(
    3,
    Math.min(14, ((w - 2 * pad) / Math.max(1, (end - start) / DAY_MS)) * 0.6),
  );
  return (
    <span
      className={`work-spark-wrap work-mini ${tone}`}
      onPointerMove={(e) => follow(e.clientX)}
      onPointerLeave={() => setAt(undefined)}
    >
      <svg
        ref={ref}
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${label}, ${day(start)} to ${day(end)}${kind === "dots" ? `: ${points.length} shown` : `: ${series.map((v, i) => `${day(days[i]!)} ${format(v)}`).join(", ")}`}`}
        className="work-mini-svg"
      >
        <defs>
          <pattern
            id={hatch}
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="4" className="work-mini-hatch" />
          </pattern>
        </defs>
        {began > start && (
          <rect
            x={pad}
            y={0}
            width={Math.max(0, xt(began) - pad)}
            height={h - pad}
            fill={`url(#${hatch})`}
          >
            <title>Before the history began</title>
          </rect>
        )}
        <line
          x1={pad}
          x2={w - pad}
          y1={h - pad}
          y2={h - pad}
          className="work-mini-base"
        />
        {mid !== undefined && (
          <line
            x1={pad}
            x2={w - pad}
            y1={y(mid)}
            y2={y(mid)}
            className="work-mini-median"
          />
        )}
        {at !== undefined && (
          <line
            x1={xs[at]}
            x2={xs[at]}
            y1={0}
            y2={h}
            className="work-spark-cross"
          />
        )}
        {kind === "bars" &&
          series.map((v, i) =>
            v > 0 ? (
              <rect
                key={i}
                x={dayX(i) - barW / 2}
                y={y(v)}
                width={barW}
                height={h - pad - y(v)}
                rx={2}
                className={`work-mini-mark${at === i ? " on" : ""}`}
              />
            ) : null,
          )}
        {kind === "line" && (
          <>
            <path
              d={series
                .map((v, i) => `${i ? "L" : "M"}${dayX(i)},${y(v)}`)
                .join(" ")}
              className="work-mini-line"
            />
            {series.map((v, i) => (
              <circle
                key={i}
                cx={dayX(i)}
                cy={y(v)}
                r={at === i ? 3.5 : 2.5}
                className="work-mini-mark"
              />
            ))}
          </>
        )}
        {kind === "dots" &&
          points.map((p, i) => (
            <circle
              key={p.id}
              cx={px(p)}
              cy={y(p.v)}
              r={at === i ? 4 : 3}
              className={`work-mini-mark${p.open ? " open" : ""}${at === i ? " on" : ""}`}
            />
          ))}
        <rect x={0} y={0} width={w} height={h} className="work-spark-hit" />
      </svg>
      {read && (
        <span
          className="work-spark-read"
          aria-hidden="true"
          style={{
            left: `${(xs[at!]! / w) * 100}%`,
            transform: `translateX(-${(xs[at!]! / w) * 100}%)`,
          }}
        >
          {read}
        </span>
      )}
    </span>
  );
}

type Level = "project" | "milestone" | "item";
const LEVEL_KINDS: Record<Level, EntityKind> = {
  project: "project",
  milestone: "milestone",
  item: "work",
};

/** What a line is: a scope's level drawn as its kind (a line of items as a work item). */
function LevelMark({ level }: { level: Level }) {
  return <KindMark kind={LEVEL_KINDS[level]} />;
}

/**
 * The kind of every ID on the board, so any ID drawn anywhere carries its
 * kind's mark (`KindId`). Board provides it from the snapshot.
 */
const KindsContext = createContext<ReadonlyMap<string, EntityKind>>(new Map());
/** The snapshot, for what a deep part needs to name (a milestone in a tree). */
const SnapshotContext = createContext<WorkSnapshot | undefined>(undefined);

/**
 * Each kind's glyph, on a 16-unit grid, stroked in its color: a clipboard
 * for a project (its plan), a diamond for a milestone (the roadmap's
 * mark), a ring for a work item, a fork for a decision, an arrow leaving a
 * box for an external wait, a flag for a release. Shapes that stay apart
 * at 12 px, so the glyph carries the kind alone (DESIGN.md, "Kinds").
 */
const KIND_GLYPHS: Record<EntityKind, ReactNode> = {
  project: (
    <>
      <rect x="3" y="3.25" width="10" height="11" rx="1.5" />
      <path d="M6 3.25V1.75h4v1.5M5.75 7.5h4.5M5.75 10.5h3" />
    </>
  ),
  milestone: <path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" />,
  work: <circle cx="8" cy="8" r="5.25" />,
  decision: (
    <>
      <path d="M8 14.5V8.75M8 8.75 3.25 2.75M8 8.75l4.75-6" />
      <circle cx="8" cy="8.75" r="1.6" className="dot" />
    </>
  ),
  external: (
    <path d="M9.25 1.75h5v5M14.25 1.75 7.5 8.5M12.25 9.5v4.75h-10.5V3.75H6.5" />
  ),
  release: <path d="M3.5 15V1.5M3.5 2.25h9.75l-2.5 3.5 2.5 3.5H3.5" />,
};

/**
 * A kind's mark: its glyph in its color, the same everywhere on the page.
 * Named for assistive technology and on hover, unless the words beside it
 * already name the kind.
 */
function KindMark({
  kind,
  named = true,
}: {
  kind: EntityKind;
  /** False when the kind's name is written beside it. */
  named?: boolean;
}) {
  return (
    <svg
      className={`work-kind-mark k-${kind}`}
      viewBox="0 0 16 16"
      focusable="false"
      role={named ? "img" : undefined}
      aria-label={named ? ENTITY_KIND_NAMES[kind] : undefined}
      aria-hidden={named ? undefined : true}
    >
      {named && <title>{ENTITY_KIND_NAMES[kind]}</title>}
      {KIND_GLYPHS[kind]}
    </svg>
  );
}

/** A kind in words with its mark, outlined in its color (the pane's head). */
function KindTag({ kind }: { kind: EntityKind }) {
  return (
    <span className={`work-kind-tag k-${kind}`}>
      <KindMark kind={kind} named={false} />
      {ENTITY_KIND_NAMES[kind]}
    </span>
  );
}

/** An ID with its kind's mark before it: how every ID on the page is drawn. */
function KindId({ id, kind }: { id: string; kind?: EntityKind }) {
  const kinds = useContext(KindsContext);
  const k = kind ?? kinds.get(id) ?? "work";
  return (
    <span className={`work-id k-${k}`}>
      <KindMark kind={k} />
      {id}
    </span>
  );
}

/** The kinds' legend, beside the views' tabs: every mark and its name. */
function KindLegend() {
  return (
    <ul className="work-kind-legend" aria-label="Kinds of entity">
      {ENTITY_KINDS.map((k) => (
        <li key={k} className={`k-${k}`} title={ENTITY_KIND_TIPS[k]}>
          <KindMark kind={k} named={false} />
          {ENTITY_KIND_NAMES[k]}
        </li>
      ))}
    </ul>
  );
}

/** A dashboard card: a titled section, optional tools at its head, links at its foot. */
function Card({
  id,
  title,
  caption,
  stat,
  className,
  tools,
  foot,
  children,
}: {
  id: string;
  title: string;
  caption?: string;
  /** A section led by its number: the count and a line on it; choosing it lists the items. */
  stat?: {
    value: number;
    detail?: string;
    tone?: "attention";
    onOpen?: () => void;
  };
  className?: string;
  tools?: ReactNode;
  foot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`work-card ${className ?? ""}`} aria-labelledby={id}>
      <header className={`work-card-head${stat ? " has-stat" : ""}`}>
        {stat ? (
          <span className="work-card-titles">
            <h2 id={id} className="work-stat-title">
              <button
                type="button"
                className={`work-stat ${stat.tone ?? ""}`}
                onClick={stat.onOpen}
                title={`List all ${stat.value}`}
              >
                <span className="work-stat-value">{stat.value}</span>
                <span className="work-stat-label">{title}</span>
              </button>
            </h2>
            {stat.detail && (
              <Typography variant="caption-md" color="textSecondary">
                {stat.detail}
              </Typography>
            )}
          </span>
        ) : (
          <span className="work-card-titles">
            <Typography variant="subtitle-md" render={<h2 />} id={id}>
              {title}
            </Typography>
            {caption && (
              <Typography variant="caption-md" color="textSecondary">
                {caption}
              </Typography>
            )}
          </span>
        )}
        {tools}
      </header>
      {children}
      {foot && <div className="work-card-foot">{foot}</div>}
    </section>
  );
}

/** Items in flight: who holds each, where, and since when. */
function InFlightRows({
  items,
  flight,
  branch,
  since,
  selected,
}: {
  items: WorkItem[];
  flight: InFlight;
  branch?: string;
  since: Map<string, number>;
  selected?: string;
}) {
  if (!items.length) {
    return (
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-empty"
      >
        Nothing is in progress.
      </Typography>
    );
  }
  const now = Date.now();
  return (
    <ul className="work-rows">
      {items.map((it) => (
        <li
          key={it.id}
          className={`work-row${it.id === selected ? " selected" : ""}`}
        >
          <ItemLink id={it.id} className="work-row-main">
            <KindId id={it.id} />
            <span className="work-row-title">
              <InlineText text={it.title} />
            </span>
            <Typography
              variant="caption-md"
              color="textSecondary"
              className="work-row-extra"
            >
              {[
                whereOf(it, flight, branch),
                since.has(it.id) ? ageText(now - since.get(it.id)!) : undefined,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          </ItemLink>
        </li>
      ))}
    </ul>
  );
}

/** Items finished on each day of the flow's days (the throughput run). */
function doneByDay(
  s: WorkSnapshot,
  items: readonly WorkItem[],
  days: number[],
): number[] {
  const ids = new Set(items.map((i) => i.id));
  const out = days.map(() => 0);
  // Moves into Done only: an item whose first record is Done arrived
  // finished (the tracker's import), and finished no work that day.
  const last = new Map<string, string>();
  const ordered = [...(s.history ?? [])].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at),
  );
  for (const e of ordered) {
    const before = last.get(e.id);
    last.set(e.id, e.state);
    if (e.state !== "done" || !ids.has(e.id) || !before || before === "done") {
      continue;
    }
    const t = Date.parse(e.at);
    const i = days.findLastIndex((d) => d <= t);
    if (i >= 0) {
      out[i]!++;
    }
  }
  return out;
}

/** Items as rows with a bar for how much waits behind each. */
function LeverageBars({
  items,
  unblocks,
  limit,
  party,
  selected,
  empty = "Nothing here.",
}: {
  items: WorkItem[];
  unblocks: Map<string, number>;
  limit: number;
  party?: boolean;
  selected?: string;
  empty?: string;
}) {
  const shown = items.slice(0, limit);
  const max = Math.max(1, ...shown.map((it) => unblocks.get(it.id) ?? 0));
  if (!shown.length) {
    return (
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-empty"
      >
        {empty}
      </Typography>
    );
  }
  return (
    <ol className="work-bars">
      <li className="work-bars-head" aria-hidden="true">
        <span />
        <span>Items waiting behind each</span>
      </li>
      {shown.map((it) => {
        const n = unblocks.get(it.id) ?? 0;
        return (
          <li
            key={it.id}
            className={it.id === selected ? "selected" : undefined}
          >
            <ItemLink
              id={it.id}
              className="work-bar"
              label={`${it.id} ${it.title}: ${n} items wait behind it`}
            >
              <span className="work-bar-label">
                <KindId id={it.id} />{" "}
                <InlineText
                  text={
                    party && it.waiting_on
                      ? `${it.waiting_on}: ${it.title}`
                      : it.title
                  }
                />
              </span>
              <span className="work-bar-track" aria-hidden="true">
                <span
                  className="work-bar-fill"
                  style={{ width: `${(100 * n) / max}%` }}
                />
              </span>
              <span className="work-bar-value">{n}</span>
            </ItemLink>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The cumulative flow diagram: each stage's count stacked, day by day, so
 * a band that widens is a queue growing. Hover reads a day's counts;
 * choosing a band lists its items.
 */
function FlowChart({
  flow,
  onStage,
}: {
  flow: Flow;
  onStage: (st: Stage) => void;
}) {
  const [hover, setHover] = useState<number>();
  const w = 560;
  const h = 180;
  const order = [...STAGES].reverse(); // Done at the bottom
  const n = flow.days.length;
  const totals = flow.days.map((_, i) =>
    order.reduce((sum, st) => sum + flow.stocks[st][i]!, 0),
  );
  const max = Math.max(1, ...totals);
  const x = (i: number) => (n < 2 ? (i ? w : 0) : (i * w) / (n - 1));
  const y = (v: number) => h - (h * v) / max;
  // With one day of history, draw it as a band across.
  const xs = n < 2 ? [0, 1] : flow.days.map((_, i) => i);
  const at = (st: Stage, i: number) => flow.stocks[st][n < 2 ? 0 : i]!;
  const bands = order.map((st, k) => {
    const lower = xs.map((i) =>
      order.slice(0, k).reduce((sum, o) => sum + at(o, i), 0),
    );
    const upper = lower.map((v, j) => v + at(st, xs[j]!));
    const d = `${xs
      .map((i, j) => `${j ? "L" : "M"}${x(i)},${y(upper[j]!)}`)
      .join(" ")} ${[...xs]
      .reverse()
      .map((i, j) => `L${x(i)},${y(lower[xs.length - 1 - j]!)}`)
      .join(" ")} Z`;
    const mid = (upper.at(-1)! + lower.at(-1)!) / 2;
    return { st, d, mid, thick: upper.at(-1)! - lower.at(-1)! };
  });
  const day = (t: number) =>
    new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
  const hi = hover ?? n - 1;
  return (
    <div className="work-cfd">
      <ul className="work-legend" aria-label="Stages">
        {STAGES.map((st) => (
          <li key={st}>
            <button
              type="button"
              className="work-legend-item"
              onClick={() => onStage(st)}
              data-tip={`${STAGE_MEANING[st]}; choose to list them`}
            >
              <span
                className={`work-swatch stage-${slug(st)}`}
                aria-hidden="true"
              />
              {STAGE_NAMES[st]} <b>{flow.stocks[st].at(-1)}</b>
            </button>
          </li>
        ))}
      </ul>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="work-cfd-svg"
        role="img"
        aria-label={`Items by stage since ${day(flow.days[0] ?? Date.now())}: ${STAGES.map((st) => `${STAGE_NAMES[st]} ${flow.stocks[st].at(-1)}`).join(", ")}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(undefined)}
      >
        {bands.map((b) => (
          <path
            key={b.st}
            d={b.d}
            className={`work-band stage-${slug(b.st)}`}
            onClick={() => onStage(b.st)}
          >
            <title>{`${stageTip(b.st)}; choose to list its items`}</title>
          </path>
        ))}
        {n > 1 &&
          flow.days.map((_, i) => (
            <rect
              key={i}
              x={x(i) - w / (n - 1) / 2}
              y={0}
              width={w / (n - 1)}
              height={h}
              className="work-cfd-hit"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        {hover !== undefined && n > 1 && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={0}
            y2={h}
            className="work-cfd-cross"
          />
        )}
      </svg>
      <div className="work-cfd-axis" aria-hidden="true">
        <span>{day(flow.days[0] ?? Date.now())}</span>
        <span>{n > 1 ? "Today" : ""}</span>
      </div>
      <Typography
        variant="caption-md"
        color="textSecondary"
        render={<p />}
        className="work-cfd-read"
      >
        {hover !== undefined
          ? `${day(flow.days[hi]!)}: ${STAGES.map((st) => `${STAGE_NAMES[st]} ${flow.stocks[st][hi]}`).join(", ")}`
          : n < 3
            ? `The history began ${day(flow.days[0] ?? Date.now())}; the bands fill in as work moves`
            : " "}
      </Typography>
    </div>
  );
}

const slug = (st: Stage) => st.toLowerCase().replace(/\s+/g, "-");

/** A list's name, for the panel's title and the item's way back. */
function listTitle(
  list: string,
  scope: string | undefined,
  s: WorkSnapshot,
): string {
  const titleOf = (id: string) =>
    s.projects.find((p) => p.id === id)?.title ?? id;
  if (list.startsWith("chain:")) {
    return `The chain from ${list.slice(6)}`;
  }
  if (list.startsWith("ms:")) {
    return mapEntityTitle(s, list.slice(3));
  }
  if (list.startsWith("mdep:")) {
    const [, from, to] = list.split(":") as [string, string, string];
    return `${mapEntityTitle(s, from)} waits on ${mapEntityTitle(s, to)}`;
  }
  if (list.startsWith("dep:")) {
    const [, from, to] = list.split(":") as [string, string, string];
    return `${titleOf(from)} waits on ${titleOf(to)}`;
  }
  const base =
    list === "owner"
      ? "Your decisions"
      : list === "find"
        ? "Found"
        : list === "ready"
          ? "Ready to start"
          : list === "working"
            ? "In progress"
            : list === "outside"
              ? "Waiting outside"
              : list === "done"
                ? "Done"
                : list === "matrix"
                  ? "Dependency matrix"
                  : list.startsWith("stage:")
                    ? (STAGE_NAMES[list.slice(6) as Stage] ?? list)
                    : list;
  return scope ? `${base} · ${scope}` : base;
}

/**
 * The pane beside the views: inline when the page is wide enough, so the
 * view stays in sight with what was chosen highlighted; a drawer over it
 * when not. Escape closes it either way.
 */
function Pane({
  inline,
  open,
  onClose,
  labelledBy,
  className,
  children,
}: {
  inline: boolean;
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  // A drawer renders outside the page: it takes the page's color tokens.
  const tokens = useChartTokens();
  if (inline) {
    return open ? (
      <aside
        className={`work-panel work-pane ${tokens} ${className ?? ""}`}
        aria-labelledby={labelledBy}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onClose();
          }
        }}
      >
        {children}
      </aside>
    ) : null;
  }
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      transitionDuration={reduced ? 0 : undefined}
      slotProps={{
        paper: {
          className: `work-panel ${tokens} ${className ?? ""}`,
          "aria-labelledby": labelledBy,
          role: "dialog",
        } as object,
      }}
    >
      {children}
    </Drawer>
  );
}

/** The pane's lists: the items behind whatever was chosen in a view. */
function ListPanel({
  s,
  list,
  open,
  inline,
  items,
  flight,
  flow,
  unblocks,
  projectOf,
  itemOf,
  selected,
  search,
  scope,
  onClose,
  onProject,
  onList,
  onQuery,
}: {
  s: WorkSnapshot;
  list?: string;
  open: boolean;
  inline: boolean;
  items: WorkItem[];
  flight: InFlight;
  flow: Flow;
  unblocks: Map<string, number>;
  projectOf: Map<string, WorkContainer>;
  itemOf: Map<string, WorkItem>;
  selected?: string;
  search: WorkSearch;
  /** The scope's name, for the lists it narrows. */
  scope?: string;
  onClose: () => void;
  /** Scopes the board to a project. */
  onProject: (id: string) => void;
  /** Opens another list (a milestone's waits). */
  onList: (list: string) => void;
  /** Changes Find's words. */
  onQuery: (q: string) => void;
}) {
  const titleId = useId();
  const now = Date.now();
  let body: ReactNode = null;
  if (list === "owner") {
    body = (
      <OwnerQueue
        s={s}
        items={items.filter(
          (it) => isOwnerDecision(it) && !it.open_needs.length,
        )}
        selected={selected}
        projectOf={projectOf}
        unblocks={unblocks}
      />
    );
  } else if (list === "working") {
    body = (
      <Grouped
        s={s}
        items={workInProgress(items, flight)}
        empty="Nothing is in progress."
        selected={selected}
        projectOf={projectOf}
        line={(it) => whereOf(it, flight, s.branch)}
      />
    );
  } else if (list === "ready") {
    body = (
      <Ranked
        items={items.filter(
          (it) =>
            nextActor(it, flight) === "agents" &&
            stageOf(it, flight) === "Ready",
        )}
        unblocks={unblocks}
        projectOf={projectOf}
        selected={selected}
      />
    );
  } else if (list === "outside") {
    body = (
      <Ranked
        items={items.filter((it) => nextActor(it, flight) === "outside")}
        unblocks={unblocks}
        projectOf={projectOf}
        selected={selected}
        party
      />
    );
  } else if (list === "done") {
    body = (
      <Grouped
        s={s}
        items={items.filter((it) => stageOf(it, flight) === "Done")}
        empty="Nothing is done yet."
        selected={selected}
        projectOf={projectOf}
      />
    );
  } else if (list?.startsWith("chain:")) {
    const head = list.slice(6);
    const chain = longestChains(items).find((c) => c[0]!.id === head) ?? [];
    body = (
      <ol className="work-steps">
        {chain.map((it, i) => [
          // A label where the chain enters a project.
          i === 0 || chain[i - 1]!.project !== it.project ? (
            <li key={`p${i}`} className="work-steps-project">
              {projectOf.get(it.project ?? "")?.title ?? it.project}
            </li>
          ) : null,
          <li
            key={it.id}
            className={it.id === selected ? "selected" : undefined}
          >
            <span className="work-step-n">{i + 1}</span>
            <ItemLink id={it.id} className="work-step">
              <span
                className={`work-swatch stage-${slug(stageOf(it, flight) ?? "Waiting")}`}
                aria-hidden="true"
                data-tip={stageTip(stageOf(it, flight) ?? "Waiting")}
              />
              <KindId id={it.id} />
              <span className="work-tree-title">
                <InlineText text={it.title} />
              </span>
              <span className="work-tree-state">
                {nextActor(it, flight) === "owner"
                  ? "Your decision"
                  : it.kind === "external"
                    ? "Outside"
                    : STAGE_NAMES[stageOf(it, flight) ?? "Waiting"]}
              </span>
            </ItemLink>
          </li>,
        ])}
      </ol>
    );
  } else if (list === "find") {
    body = (
      <>
        <TextField
          size="small"
          type="search"
          fullWidth
          autoFocus
          value={search.q ?? ""}
          onChange={(e) => onQuery(e.target.value)}
          className="work-find-field"
          slotProps={{
            htmlInput: { "aria-label": "Find an item" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon href={svgSearch} />
                </InputAdornment>
              ),
            },
          }}
        />
        <FindResults
          q={search.q ?? ""}
          itemOf={itemOf}
          projectOf={projectOf}
          selected={selected}
        />
      </>
    );
  } else if (list?.startsWith(`ms:${UNSHAPED}`)) {
    body = (
      <>
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          This project's open items that no milestone holds yet. Shaping puts
          them into milestones: each milestone names its outcome and the items
          without which it can't be true.
        </Typography>
        <Grouped
          s={s}
          items={mapEntityItems(s, list.slice(3))
            .map((id) => itemOf.get(id))
            .filter((x): x is WorkItem => !!x)}
          empty="Every open item is in a milestone."
          selected={selected}
          projectOf={projectOf}
        />
      </>
    );
  } else if (list?.startsWith("mdep:")) {
    const [, from, to] = list.split(":") as [string, string, string];
    const b = new Set(mapEntityItems(s, to));
    body = (
      <Grouped
        s={s}
        items={mapEntityItems(s, from)
          .map((id) => itemOf.get(id))
          .filter(
            (it): it is WorkItem =>
              !!it && isOpen(it) && it.open_needs.some((n) => b.has(n)),
          )}
        empty={`It needs ${to} itself, not through its items.`}
        selected={selected}
        projectOf={projectOf}
        needs={(it) =>
          it.open_needs.filter((n) => b.has(n)).map((n) => itemOf.get(n) ?? n)
        }
      />
    );
  } else if (list?.startsWith("dep:")) {
    const [, from, to] = list.split(":") as [string, string, string];
    const inTo = (n: string) => itemOf.get(n)?.project === to;
    body = (
      <Grouped
        s={s}
        items={s.items.filter(
          (it) => it.project === from && isOpen(it) && it.open_needs.some(inTo),
        )}
        empty="Nothing waits there now."
        selected={selected}
        projectOf={projectOf}
        needs={(it) =>
          it.open_needs.filter(inTo).map((n) => itemOf.get(n) ?? n)
        }
      />
    );
  } else if (list?.startsWith("stage:")) {
    const st = list.slice(6) as Stage;
    const these = items.filter((it) => stageOf(it, flight) === st);
    body =
      st === "Ready" ? (
        <Ranked
          items={these}
          unblocks={unblocks}
          projectOf={projectOf}
          selected={selected}
        />
      ) : (
        <Grouped
          s={s}
          items={these}
          empty="Nothing in this stage."
          selected={selected}
          projectOf={projectOf}
          line={(it) =>
            st === "In flight"
              ? whereOf(it, flight, s.branch)
              : flow.since.has(it.id)
                ? `Here ${ageText(now - flow.since.get(it.id)!)}`
                : undefined
          }
          needs={
            st === "Waiting"
              ? (it) => it.open_needs.map((n) => itemOf.get(n) ?? n)
              : undefined
          }
        />
      );
  }
  // A milestone opens as itself, the same pane as any entity.
  if (list?.startsWith("ms:") && !list.startsWith(`ms:${UNSHAPED}`)) {
    return (
      <Pane
        inline={inline}
        open={open}
        onClose={onClose}
        labelledBy={titleId}
        className="work-list-panel"
      >
        <EntityPane
          s={s}
          id={list.slice(3)}
          titleId={titleId}
          projectOf={projectOf}
          itemOf={itemOf}
          flight={flight}
          selected={selected}
          onClose={onClose}
          onProject={onProject}
          onList={onList}
        />
      </Pane>
    );
  }
  // A wait between milestones goes back to the milestone it came from.
  const from = list?.startsWith("mdep:") ? list.split(":")[1] : undefined;
  return (
    <Pane
      inline={inline}
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="work-list-panel"
    >
      {from && (
        <Link
          component="button"
          type="button"
          className="work-panel-back"
          onClick={() => onList(`ms:${from}`)}
        >
          ← {listTitle(`ms:${from}`, undefined, s)}
        </Link>
      )}
      <div className="work-panel-head">
        <Typography
          variant="subtitle-md"
          render={<h2 />}
          id={titleId}
          className="work-marked"
        >
          {list?.startsWith("ms:") && <KindMark kind="milestone" />}
          {list ? listTitle(list, scope, s) : ""}
        </Typography>
        <IconButton label="Close" onClick={onClose}>
          <Icon href={svgDismiss} />
        </IconButton>
      </div>
      <div className="work-panel-body">{body}</div>
    </Pane>
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
                <KindId id={it.id} />
                <span className="work-row-title">
                  <span>
                    <InlineText text={it.title} />
                  </span>
                  <Typography
                    variant="caption-md"
                    color="textSecondary"
                    render={<span />}
                    className="work-row-sub"
                  >
                    {party && it.waiting_on ? `${it.waiting_on} · ` : ""}
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
  if (it.state === "in-progress") {
    parts.push(on(it.claimed_by, branch ?? "this branch"));
  }
  for (const c of flight.get(it.id) ?? []) {
    parts.push(on(c.claimed_by, c.where));
  }
  return parts.join("; ") || undefined;
}

/** The scope's chain: a project, a milestone, as far as chosen. */
function scopeChain(s: WorkSnapshot, search: WorkSearch) {
  const milestone = search.milestone
    ? s.milestones.find((m) => m.id === search.milestone)
    : undefined;
  const projectId = search.project ?? milestone?.project;
  const project = projectId
    ? s.projects.find((p) => p.id === projectId)
    : undefined;
  return { project, milestone };
}

/** One line of the scope's tree: All work, a project, a milestone. */
interface ScopeEntry {
  key: string;
  /** What adding it to the scope adds; All work adds nothing. */
  kind?: ScopeKind;
  title: string;
  level: number;
  /** Its parents' titles, for a match found by typing. */
  path: string[];
  /** Owner decisions there, open items there. */
  decisions: number;
  open: number;
  go: Partial<WorkSearch>;
}

/**
 * The scope's tree in reading order, with each line's counts: what the
 * outline shows and the picker lists.
 */
function scopeEntries(s: WorkSnapshot, flight: InFlight): ScopeEntry[] {
  const decisions = new Map<string, number>();
  const open = new Map<string, number>();
  const add = (m: Map<string, number>, k: string) =>
    m.set(k, (m.get(k) ?? 0) + 1);
  for (const it of s.items) {
    if (!isOpen(it)) {
      continue;
    }
    const p = it.project;
    const owner = nextActor(it, flight) === "owner" && isOwnerDecision(it);
    for (const k of p ? [p, "*"] : ["*"]) {
      add(open, k);
      if (owner) {
        add(decisions, k);
      }
    }
  }
  const out: ScopeEntry[] = [
    {
      key: "*",
      title: "All work",
      level: 0,
      path: [],
      decisions: decisions.get("*") ?? 0,
      open: open.get("*") ?? 0,
      go: {},
    },
  ];
  const milestone = (m: WorkMilestone, level: number, path: string[]) => ({
    key: m.id,
    title: m.title,
    level,
    path,
    kind: "milestone" as const,
    decisions: 0,
    open: m.progress.total - m.progress.done,
    go: { milestone: m.id },
  });
  for (const p of s.projects) {
    out.push({
      key: p.id,
      kind: "project",
      title: p.title,
      level: 1,
      path: [],
      decisions: decisions.get(p.id) ?? 0,
      open: open.get(p.id) ?? 0,
      go: { project: p.id },
    });
    for (const m of s.milestones.filter((x) => x.project === p.id)) {
      out.push(milestone(m, 2, [p.title]));
    }
  }
  return out;
}

/**
 * Where the page looks, as a trail: All work › a project › a milestone. Each step above goes back up; the last is the scope picker,
 * which lists the whole tree and finds a line by typing, so any scope is
 * one choice away.
 */
function ScopeTrail({
  s,
  search,
  flight,
  chosen,
  names,
  onScope,
  onToggle,
}: {
  s: WorkSnapshot;
  search: WorkSearch;
  flight: InFlight;
  chosen: ScopeSet;
  /** The chosen lines' names. */
  names: string[];
  onScope: (go: Partial<WorkSearch>) => void;
  onToggle: (kind: ScopeKind, id: string) => void;
}) {
  const several = scopeSize(chosen) > 1;
  const { project, milestone } = several ? {} : scopeChain(s, search);
  const steps: Array<{
    label: string;
    go: Partial<WorkSearch>;
    mark?: Level;
  }> = [
    { label: "All work", go: {} },
    ...(several ? [{ label: `${names.length} chosen`, go: {} }] : []),
    ...(project
      ? [
          {
            label: project.title,
            go: { project: project.id },
            mark: "project" as const,
          },
        ]
      : []),
    ...(milestone
      ? [
          {
            label: milestone.title,
            go: { milestone: milestone.id },
            mark: "milestone" as const,
          },
        ]
      : []),
  ];
  const here = steps[steps.length - 1]!;
  // The lines above the scope, for going back up: not "All work", which
  // the clear button is.
  const above = steps.slice(1, -1);
  return (
    <nav className="work-trail" aria-label="Scope">
      <ScopePicker
        s={s}
        flight={flight}
        chosen={chosen}
        label={here.label}
        mark={here.mark}
        title={several ? names.join(", ") : undefined}
        onScope={onScope}
        onToggle={onToggle}
      />
      {above.length > 0 && (
        <span className="work-trail-path">
          in
          <ol>
            {above.map((st) => (
              <li key={st.label}>
                {st.mark && <LevelMark level={st.mark} />}
                <Link
                  component="button"
                  type="button"
                  onClick={() => onScope(st.go)}
                >
                  {st.label}
                </Link>
              </li>
            ))}
          </ol>
        </span>
      )}
      {steps.length > 1 && (
        <IconButton
          size="small"
          label="Show all work"
          onClick={() => onScope({})}
          className="work-trail-clear"
        >
          <Icon href={svgDismiss} />
        </IconButton>
      )}
    </nav>
  );
}

/**
 * The scope picker: a button naming the scope, opening the tree with a
 * field that narrows it as you type. Choosing a line scopes to it alone;
 * its box (or Ctrl- or ⌘-Enter) adds it to the scope or takes it out, so
 * the views add up several. Arrow keys move, Escape closes.
 */
function ScopePicker({
  s,
  flight,
  chosen,
  label,
  mark,
  title,
  onScope,
  onToggle,
}: {
  s: WorkSnapshot;
  flight: InFlight;
  chosen: ScopeSet;
  label: string;
  /** What the scope is: a project or a milestone. */
  mark?: Level;
  /** The chosen lines, when there are several. */
  title?: string;
  onScope: (go: Partial<WorkSearch>) => void;
  onToggle: (kind: ScopeKind, id: string) => void;
}) {
  const inScope = (e: ScopeEntry) =>
    e.kind
      ? chosen[e.kind].includes(e.key)
      : e.key === "*" && !scopeSize(chosen);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const tokens = useChartTokens();
  const entries = useMemo(() => scopeEntries(s, flight), [s, flight]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = words.length
    ? entries.filter((e) => {
        const text = `${e.title} ${e.path.join(" ")} ${e.key}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
    : entries;
  const close = () => {
    setAnchor(null);
    setQ("");
  };
  const choose = (e: ScopeEntry) => {
    close();
    onScope(e.go);
  };
  const at = Math.min(active, shown.length - 1);
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-at="${at}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [at]);
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        className="work-picker-button"
        aria-haspopup="dialog"
        aria-expanded={!!anchor}
        title={title ? `${title}: change the scope` : "Change the scope"}
        onClick={(e) => {
          setAnchor(e.currentTarget);
          setActive(Math.max(0, entries.findIndex(inScope)));
        }}
      >
        <Icon href={svgFilter} />
        <span className="work-picker-name">Scope</span>
        {mark && <LevelMark level={mark} />}
        <span className="work-trail-here">{label}</span>
        <Icon href={svgChevronDown} />
      </Button>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={close}
        // The find field takes focus, not the dialog.
        disableAutoFocus
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            className: `work-picker ${tokens}`,
            role: "dialog",
            "aria-label": "Choose the scope",
          } as object,
        }}
      >
        <TextField
          size="small"
          fullWidth
          autoFocus
          placeholder="Find a project or milestone"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive(Math.min(at + 1, shown.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive(Math.max(at - 1, 0));
            } else if (e.key === "Enter" && shown[at]) {
              e.preventDefault();
              const pick = shown[at];
              if ((e.metaKey || e.ctrlKey) && pick.kind) {
                onToggle(pick.kind, pick.key);
              } else {
                choose(pick);
              }
            }
          }}
          className="work-picker-find"
          slotProps={{
            htmlInput: {
              role: "combobox",
              "aria-label": "Find a scope",
              "aria-expanded": true,
              "aria-controls": listId,
              "aria-activedescendant": shown[at]
                ? `${listId}-${at}`
                : undefined,
            },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon href={svgSearch} />
                </InputAdornment>
              ),
            },
          }}
        />
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label="Scopes"
          aria-multiselectable="true"
          className="work-picker-list"
        >
          {shown.map((e, i) => (
            <li
              key={e.key}
              id={`${listId}-${i}`}
              data-at={i}
              role="option"
              aria-selected={inScope(e)}
              className={`work-picker-option level-${words.length ? 0 : e.level}${i === at ? " active" : ""}${inScope(e) ? " here" : ""}`}
              onMouseMove={() => i !== at && setActive(i)}
              onClick={() => choose(e)}
            >
              {e.kind ? (
                <span
                  className={`work-picker-box${inScope(e) ? " on" : ""}`}
                  aria-hidden="true"
                  title={
                    inScope(e)
                      ? "Take it out of the scope"
                      : "Add it to the scope"
                  }
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onToggle(e.kind!, e.key);
                  }}
                >
                  {inScope(e) && <Icon href={svgCheckmark} />}
                </span>
              ) : (
                <span className="work-picker-box none" aria-hidden="true" />
              )}
              {e.kind && <LevelMark level={e.kind} />}
              <span className="work-picker-text">
                <span className="work-outline-label">{e.title}</span>
                {words.length > 0 && e.path.length > 0 && (
                  <Typography
                    variant="caption-md"
                    color="textSecondary"
                    className="work-outline-label"
                  >
                    {e.path.join(" › ")}
                  </Typography>
                )}
              </span>
              {e.decisions > 0 && (
                <span
                  className="work-count-badge"
                  aria-label={`${e.decisions} of your decisions`}
                  data-tip="Amber: your decisions waiting here"
                >
                  {e.decisions}
                </span>
              )}
              <Typography
                variant="caption-md"
                color="textSecondary"
                className="work-picker-open"
              >
                {e.open} open
              </Typography>
            </li>
          ))}
          {!shown.length && (
            <li className="work-picker-none">Nothing matches “{q}”.</li>
          )}
        </ul>
        <Typography
          variant="caption-md"
          color="textSecondary"
          render={<p />}
          className="work-picker-hint"
        >
          Enter scopes to one line. Its box, or Ctrl- or ⌘-Enter, adds it, and
          the views add up everything chosen.
        </Typography>
      </Popover>
    </>
  );
}

/** Find: every item, whatever the scope; the matches open in the pane. */
function FindField({
  q,
  set,
}: {
  q?: string;
  set: (patch: Partial<WorkSearch>, replace?: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <TextField
      size="small"
      type="search"
      placeholder="Search"
      value={q ?? ""}
      inputRef={input}
      onChange={(e) => {
        const v = e.target.value;
        set(
          { q: v || undefined, list: v ? "find" : undefined, item: undefined },
          true,
        );
      }}
      className="work-search"
      slotProps={{
        htmlInput: { "aria-label": "Search every item" },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Icon href={svgSearch} />
            </InputAdornment>
          ),
          endAdornment: q ? (
            <InputAdornment position="end">
              <IconButton
                label="Clear"
                size="small"
                onClick={() => {
                  set({ q: undefined, list: undefined }, true);
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
  );
}

/**
 * What Find found: every item whose file (text and metadata alike) or
 * project mentions all the words, title matches first, each with where
 * the words were found and the words highlighted in a snippet.
 */
function FindResults({
  q,
  itemOf,
  projectOf,
  selected,
}: {
  q: string;
  itemOf: Map<string, WorkItem>;
  projectOf: Map<string, WorkContainer>;
  selected?: string;
}) {
  const [found, setFound] = useState<{
    q: string;
    result?: WorkFound;
    error?: string;
  }>();
  useEffect(() => {
    let live = true;
    // Ask once typing pauses.
    const t = setTimeout(() => {
      findWork(q).then(
        (result) => live && setFound({ q, result }),
        (e: Error) => live && setFound({ q, error: e.message }),
      );
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const mark = (text: string) => {
    const parts: ReactNode[] = [];
    const lower = text.toLowerCase();
    let at = 0;
    while (at < text.length) {
      let next = -1;
      let word = "";
      for (const w of words) {
        const i = lower.indexOf(w, at);
        if (i >= 0 && (next < 0 || i < next)) {
          next = i;
          word = w;
        }
      }
      if (next < 0) {
        parts.push(text.slice(at));
        break;
      }
      parts.push(
        text.slice(at, next),
        <mark key={next}>{text.slice(next, next + word.length)}</mark>,
      );
      at = next + word.length;
    }
    return parts;
  };
  if (!found || found.q !== q) {
    return (
      <div className="work-loading" role="status">
        <CircularProgress size={16} />
        <Typography variant="body-sm">Searching every item…</Typography>
      </div>
    );
  }
  if (found.error) {
    return (
      <Alert severity="error">The search didn't run ({found.error}).</Alert>
    );
  }
  const matches = found.result!.matches;
  const WHERE = {
    title: "In the title",
    metadata: "In its details",
    text: "In its text",
  };
  return (
    <>
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-find-count"
      >
        {matches.length
          ? `${matches.length} ${matches.length === 1 ? "item mentions" : "items mention"} “${q}”, searching every item's text and details.`
          : `No item mentions “${q}”.`}
      </Typography>
      <ol className="work-rows work-found">
        {matches.map((m) => {
          const it = itemOf.get(m.id);
          return (
            <li
              key={m.id}
              className={`work-row${m.id === selected ? " selected" : ""}`}
            >
              <ItemLink id={m.id} className="work-row-main">
                <KindId id={m.id} />
                <span className="work-row-title">
                  <span>{it ? mark(it.title) : m.id}</span>
                  <Typography
                    variant="caption-md"
                    color="textSecondary"
                    render={<span />}
                    className="work-row-sub"
                  >
                    {projectOf.get(it?.project ?? "")?.title ?? it?.project} ·{" "}
                    {WHERE[m.where]}
                  </Typography>
                  {m.snippet && (
                    <span className="work-found-snippet">
                      {mark(m.snippet)}
                    </span>
                  )}
                </span>
              </ItemLink>
            </li>
          );
        })}
      </ol>
    </>
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
                <KindId id={d.id} />
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
                  <KindId id={w.id} />
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

// ------------------------------------------------------------ proposals

/** What stands in a proposal's way: the toggle's words and the cell's. */
const GATE_NAMES: Record<ProposalGate, string> = {
  free: "Ready to commit",
  decision: "Waits on your answer",
  items: "Waits on other items",
};

/** One group of the proposals table: a project, or a decision they wait on. */
interface ProposalTableGroup {
  key: string;
  head: ReactNode;
  meta: string;
  milestones: Array<{ milestone: WorkMilestone; items: WorkItem[] }>;
  items: WorkItem[];
  /** The decision the group is about, which its rows needn't repeat. */
  decision?: string;
}

/**
 * The Proposals view: ideas not committed to yet, as bets to commit or
 * drop, in one table read top to bottom. Every row has the same columns:
 * the idea, what stands between it and committing (nothing, one of the
 * owner's decisions, or other items, marked as the board marks stages),
 * and how much waits on it. Whole projects of proposals come first; a
 * proposed milestone keeps its ideas under it. Narrowed to decisions, the
 * ideas group by the decision they wait on, since answering it is the
 * owner's move. An idea's text, the why, opens beside the view.
 */
function ProposalsCard({
  groups,
  itemOf,
  msOf,
  unblocks,
  selected,
  gate,
  onGate,
  onMilestone,
}: {
  groups: ProposalGroup[];
  itemOf: Map<string, WorkItem>;
  msOf: Map<string, WorkMilestone>;
  unblocks: Map<string, number>;
  selected?: string;
  /** Only what can be committed now, or what waits on a decision or items. */
  gate?: ProposalGate;
  onGate: (gate: ProposalGate | undefined) => void;
  /** Opens a milestone in the pane. */
  onMilestone: (id: string) => void;
}) {
  const all = groups.flatMap((g) => [
    ...g.milestones.flatMap((m) => m.items),
    ...g.items,
  ]);
  const count = (k: ProposalGate) =>
    all.filter((it) => proposalGate(it, itemOf) === k).length;
  const keep = (it: WorkItem) => !gate || proposalGate(it, itemOf) === gate;
  const shown = groups
    .map((g) => ({
      ...g,
      milestones: g.milestones
        .map((m) => ({ ...m, items: m.items.filter(keep) }))
        .filter((m) => !gate || m.items.length),
      items: g.items.filter(keep),
    }))
    .filter((g) => g.items.length || g.milestones.length);
  const byProject = (list: typeof shown): ProposalTableGroup[] =>
    list.map((g) => ({
      key: g.project?.id ?? "none",
      head: (
        <>
          {g.project && <LevelMark level="project" />}
          {g.project?.title ?? "No project"}
        </>
      ),
      meta: `${g.project ? `${g.project.id}, ` : ""}${g.count} proposed`,
      milestones: g.milestones,
      items: g.items,
    }));
  // Narrowed to decisions: a group per decision, the most waited on first.
  const byDecision = (): ProposalTableGroup[] => {
    const under = new Map<string, WorkItem[]>();
    for (const g of shown) {
      for (const it of [...g.milestones.flatMap((m) => m.items), ...g.items]) {
        for (const n of it.open_needs) {
          const need = itemOf.get(n);
          if (need && isOwnerDecision(need)) {
            under.set(n, [...(under.get(n) ?? []), it]);
          }
        }
      }
    }
    return [...under]
      .sort(
        ([a, x], [b, y]) => y.length - x.length || idNumber(a) - idNumber(b),
      )
      .map(([id, its]) => ({
        key: id,
        decision: id,
        head: (
          <ItemLink id={id} className="work-ptable-group-link">
            <KindId id={id} /> <InlineText text={itemOf.get(id)?.title ?? id} />
          </ItemLink>
        ),
        meta: `${its.length} ${its.length === 1 ? "proposal waits" : "proposals wait"} on it`,
        milestones: [],
        items: its,
      }));
  };
  const table = (list: ProposalTableGroup[], label: string) => (
    <ProposalTable
      groups={list}
      label={label}
      itemOf={itemOf}
      msOf={msOf}
      unblocks={unblocks}
      selected={selected}
      onMilestone={onMilestone}
    />
  );
  const bets = shown.filter((g) => g.whole);
  const rest = shown.filter((g) => !g.whole);
  let body: ReactNode;
  if (!all.length) {
    body = (
      <Typography variant="body-md" color="textSecondary" render={<p />}>
        Nothing is proposed here. Proposed items and milestones show here until
        they are committed or dropped.
      </Typography>
    );
  } else if (gate === "decision") {
    body = table(byDecision(), "Proposals by the decision they wait on");
  } else if (bets.length && rest.length) {
    body = (
      <div className="work-proposal-sections">
        <section aria-labelledby="work-bets-h">
          <header className="work-proposal-section-head">
            <Typography variant="subtitle-lg" render={<h3 />} id="work-bets-h">
              Whole projects
            </Typography>
            <Typography variant="caption-md" color="textSecondary">
              Every open item in these is proposed: committing to one is a bet
              on the project
            </Typography>
          </header>
          {table(byProject(bets), "Proposed whole projects")}
        </section>
        <section aria-labelledby="work-ideas-h">
          <header className="work-proposal-section-head">
            <Typography variant="subtitle-lg" render={<h3 />} id="work-ideas-h">
              In projects under way
            </Typography>
            <Typography variant="caption-md" color="textSecondary">
              Ideas beside work that is already committed
            </Typography>
          </header>
          {table(byProject(rest), "Proposals in projects under way")}
        </section>
      </div>
    );
  } else {
    body = table(byProject(shown), "Proposals");
  }
  return (
    <Card
      id="work-proposals-h"
      title="Proposals"
      caption="Ideas not committed to yet: commit one to put it on the roadmap, or drop it. Choose one to read why."
      className="span-12"
      tools={
        all.length > 0 && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={gate ?? "all"}
            onChange={(_, v: string | null) =>
              v && onGate(v === "all" ? undefined : (v as ProposalGate))
            }
            aria-label="Show"
            className="work-proposal-gates"
          >
            <ToggleButton
              value="all"
              render={<Button variant="outlined" size="small" />}
            >
              All <span className="work-toggle-count">{all.length}</span>
            </ToggleButton>
            {PROPOSAL_GATES.map((k) => (
              <ToggleButton
                key={k}
                value={k}
                disabled={!count(k)}
                render={<Button variant="outlined" size="small" />}
              >
                <span className={`work-gate-mark ${k}`} aria-hidden="true" />
                {GATE_NAMES[k]}{" "}
                <span className="work-toggle-count">{count(k)}</span>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )
      }
    >
      {body}
    </Card>
  );
}

function ProposalTable({
  groups,
  label,
  itemOf,
  msOf,
  unblocks,
  selected,
  onMilestone,
}: {
  groups: ProposalTableGroup[];
  label: string;
  itemOf: Map<string, WorkItem>;
  msOf: Map<string, WorkMilestone>;
  unblocks: Map<string, number>;
  selected?: string;
  onMilestone: (id: string) => void;
}) {
  const row = (it: WorkItem, g: ProposalTableGroup, inMs = false) => (
    <ProposalRow
      key={`${g.key}:${it.id}`}
      it={it}
      itemOf={itemOf}
      msOf={msOf}
      waiting={unblocks.get(it.id) ?? 0}
      selected={it.id === selected}
      except={g.decision}
      inMilestone={inMs}
      onMilestone={onMilestone}
    />
  );
  return (
    <table className="work-ptable" aria-label={label}>
      <colgroup>
        <col className="c-id" />
        <col />
        <col className="c-gate" />
        <col className="c-num" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">ID</th>
          <th scope="col">Idea</th>
          <th scope="col">What stands in the way</th>
          <th
            scope="col"
            className="c-num"
            title="Open items that wait on it, directly or through others"
          >
            Waiting
          </th>
        </tr>
      </thead>
      {groups.map((g) => (
        <tbody key={g.key}>
          <tr className="work-ptable-group">
            <th colSpan={4} scope="rowgroup">
              <span className="work-ptable-group-name work-marked">
                {g.head}
              </span>
              <span className="work-ptable-group-meta">{g.meta}</span>
            </th>
          </tr>
          {g.milestones.map(({ milestone: m, items }) => (
            <Fragment key={m.id}>
              <tr className="work-ptable-ms">
                <td colSpan={4}>
                  <button
                    type="button"
                    className="work-ptable-ms-head"
                    onClick={() => onMilestone(m.id)}
                  >
                    <span className="work-marked work-ptable-ms-title">
                      <LevelMark level="milestone" />
                      <InlineText text={m.title} />
                    </span>
                    <span className="work-ptable-ms-meta">
                      Proposed {m.kind} milestone
                      {m.outcome ? `: ${m.outcome}` : ""}
                    </span>
                  </button>
                </td>
              </tr>
              {items.map((it) => row(it, g, true))}
            </Fragment>
          ))}
          {g.items.map((it) => row(it, g))}
        </tbody>
      ))}
    </table>
  );
}

function ProposalRow({
  it,
  itemOf,
  msOf,
  waiting,
  selected,
  except,
  inMilestone,
  onMilestone,
}: {
  it: WorkItem;
  itemOf: Map<string, WorkItem>;
  msOf: Map<string, WorkMilestone>;
  /** Open items that wait on it, directly or through others. */
  waiting: number;
  selected: boolean;
  /** The decision its group is about, left out of its cell. */
  except?: string;
  /** Under a proposed milestone in the table. */
  inMilestone: boolean;
  onMilestone: (id: string) => void;
}) {
  const gate = proposalGate(it, itemOf);
  // A committed milestone can't be done until this is committed.
  const neededFor = it.milestones
    .map((id) => msOf.get(id))
    .filter(
      (m): m is WorkMilestone =>
        !!m &&
        m.state !== "proposed" &&
        m.state !== "done" &&
        m.state !== "dropped",
    );
  return (
    <tr
      className={`work-ptable-row${selected ? " selected" : ""}${inMilestone ? " in-ms" : ""}`}
    >
      <td className="c-id">
        <KindId id={it.id} />
      </td>
      <td className="c-title">
        <ItemLink id={it.id} className="work-ptable-link">
          <InlineText text={it.title} />
        </ItemLink>
        {neededFor.length > 0 && (
          <span className="work-ptable-sub">
            Needed for{" "}
            {neededFor.map((m, i) => (
              <span key={m.id}>
                {i > 0 && ", "}
                <button
                  type="button"
                  className="work-ptable-ms-link"
                  onClick={() => onMilestone(m.id)}
                >
                  {m.title}
                </button>
              </span>
            ))}
          </span>
        )}
      </td>
      <td className="c-gate">
        <GateCell it={it} gate={gate} itemOf={itemOf} except={except} />
      </td>
      <td className="c-num">{waiting > 0 ? waiting : ""}</td>
    </tr>
  );
}

/** The No milestone view's state filter, in words. */
const OPEN_STATE_NAMES: Record<OpenState, string> = {
  proposed: STATE_NAMES.proposed,
  planned: STATE_NAMES.planned,
  "in-progress": STATE_NAMES["in-progress"],
};

/** What the No milestone count says a filter leaves out. */
const LEFT_OUT_NAMES: Record<LooseKind | OpenState, string> = {
  work: "work items",
  release: "releases",
  decision: "decisions",
  external: "external waits",
  proposed: "proposed items",
  planned: "planned items",
  "in-progress": "items in progress",
};

/**
 * The No milestone view (CS-562): the open items that no milestone's
 * constraints name, by project, filtered by kind and state (both kept in
 * the URL). Planned work here is likely a gap in the plan; a release sits
 * above milestones by design, since it needs them, and says so on its
 * row. Choosing an item opens it in the pane.
 */
function NoMilestoneCard({
  s,
  items,
  flight,
  scope,
  selected,
  kinds,
  states,
  onFilter,
}: {
  s: WorkSnapshot;
  /** The scope's items. */
  items: readonly WorkItem[];
  flight: InFlight;
  /** The scope's name, when one is chosen. */
  scope?: string;
  selected?: string;
  /** The kinds shown; empty shows every kind. */
  kinds: readonly LooseKind[];
  /** The states shown; empty shows every open state. */
  states: readonly OpenState[];
  onFilter: (patch: Partial<WorkSearch>) => void;
}) {
  const all = useMemo(
    () => noMilestoneOf(s, items, flight),
    [s, items, flight],
  );
  const f = { kinds, states };
  const shown = filterLoose(all, f, flight);
  const counts = looseCounts(all, f, flight);
  const filtered = shown.length !== all.length;
  // A filter writes the chosen words, or nothing once every one is chosen;
  // the last chosen one can't be taken away (that would show nothing).
  const choose = <K extends string>(
    key: "kind" | "state",
    every: readonly K[],
    next: K[],
  ) =>
    next.length &&
    onFilter({
      [key]:
        next.length === every.length
          ? undefined
          : every.filter((k) => next.includes(k)).join(","),
    });
  const kindsOn = kinds.length ? kinds : LOOSE_KINDS;
  const statesOn = states.length ? states : OPEN_STATES;
  const leftOut = [
    ...LOOSE_KINDS.filter((k) => !kindsOn.includes(k)),
    ...OPEN_STATES.filter((k) => !statesOn.includes(k)),
  ].map((k) => LEFT_OUT_NAMES[k]);
  const releases = all.filter(isReleaseItem).length;
  return (
    <Card
      id="work-loose-h"
      title="Items in no milestone"
      caption={`Open items that no milestone's constraints name${scope ? `, in ${scope}` : ""}. Planned work here is likely a gap in the plan; a release sits above milestones by design. Choose one to read it.`}
      className="span-12"
    >
      <div className="work-loose-bar">
        <p className="work-loose-count" aria-live="polite">
          <span className="work-loose-count-value">{shown.length}</span>
          <span>
            {filtered
              ? `of ${all.length} open ${all.length === 1 ? "item" : "items"} in no milestone, leaving out ${andList(leftOut)}`
              : `open ${all.length === 1 ? "item" : "items"} in no milestone${releases ? `, ${releases} of them ${releases === 1 ? "a release" : "releases"}` : ""}`}
          </span>
        </p>
        {all.length > 0 && (
          <div className="work-loose-filters">
            <ToggleButtonGroup
              size="small"
              value={[...kindsOn]}
              onChange={(_, v: LooseKind[]) => choose("kind", LOOSE_KINDS, v)}
              aria-label="Kinds shown"
              className="work-loose-filter"
            >
              {LOOSE_KINDS.map((k) => (
                <ToggleButton
                  key={k}
                  value={k}
                  title={ENTITY_KIND_TIPS[k]}
                  disabled={!counts.kinds[k] && !kinds.includes(k)}
                  render={<Button variant="outlined" size="small" />}
                >
                  <KindMark kind={k} named={false} />
                  {ENTITY_KIND_NAMES[k]}
                  <span className="work-toggle-count">{counts.kinds[k]}</span>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <ToggleButtonGroup
              size="small"
              value={[...statesOn]}
              onChange={(_, v: OpenState[]) => choose("state", OPEN_STATES, v)}
              aria-label="States shown"
              className="work-loose-filter"
            >
              {OPEN_STATES.map((k) => (
                <ToggleButton
                  key={k}
                  value={k}
                  disabled={!counts.states[k] && !states.includes(k)}
                  render={<Button variant="outlined" size="small" />}
                >
                  {OPEN_STATE_NAMES[k]}
                  <span className="work-toggle-count">{counts.states[k]}</span>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
        )}
      </div>
      {!all.length ? (
        <Typography variant="body-md" color="textSecondary" render={<p />}>
          Every open item{scope ? " here" : ""} is in a milestone.
        </Typography>
      ) : !shown.length ? (
        <Typography variant="body-md" color="textSecondary" render={<p />}>
          No item in no milestone is of the kinds and states chosen.{" "}
          <Link
            component="button"
            type="button"
            onClick={() => onFilter({ kind: undefined, state: undefined })}
          >
            Show them all
          </Link>
        </Typography>
      ) : (
        <table
          className="work-ptable work-loose"
          aria-label="Items in no milestone"
        >
          <colgroup>
            <col className="c-id" />
            <col />
            <col className="c-kind" />
            <col className="c-state" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Item</th>
              <th scope="col">Kind</th>
              <th scope="col">State</th>
            </tr>
          </thead>
          {byProject(s, shown).map((g) => (
            <tbody key={g.project?.id ?? "none"}>
              <tr className="work-ptable-group">
                <th colSpan={4} scope="rowgroup">
                  <span className="work-ptable-group-name work-marked">
                    {g.project && <LevelMark level="project" />}
                    {g.project?.title ?? "No project"}
                  </span>
                  <span className="work-ptable-group-meta">
                    {g.project ? `${g.project.id}, ` : ""}
                    {g.items.length} {g.items.length === 1 ? "item" : "items"}
                  </span>
                </th>
              </tr>
              {g.items.map((it) => (
                <NoMilestoneRow
                  key={it.id}
                  it={it}
                  flight={flight}
                  selected={it.id === selected}
                />
              ))}
            </tbody>
          ))}
        </table>
      )}
    </Card>
  );
}

function NoMilestoneRow({
  it,
  flight,
  selected,
}: {
  it: WorkItem;
  flight: InFlight;
  selected: boolean;
}) {
  const kind = itemKindOf(it);
  const state = openStateOf(it, flight);
  const stage = stageOf(it, flight) ?? "Waiting";
  // Planned: whether it could start, which is what a gap costs.
  const detail =
    state !== "planned"
      ? undefined
      : it.open_needs.length
        ? `waits on ${it.open_needs.length}`
        : "ready";
  return (
    <tr className={`work-ptable-row${selected ? " selected" : ""}`}>
      <td className="c-id">
        <KindId id={it.id} kind={kind} />
      </td>
      <td className="c-title">
        <ItemLink id={it.id} className="work-ptable-link">
          <InlineText text={it.title} />
        </ItemLink>
        {kind === "release" && (
          <span className="work-ptable-sub">
            Above milestones by design: a release needs them
            {it.release && !it.title.includes(it.release)
              ? ` (makes ${it.release})`
              : ""}
          </span>
        )}
      </td>
      <td className={`c-kind k-${kind}`}>{ENTITY_KIND_NAMES[kind]}</td>
      <td className="c-state">
        <span className="work-loose-state">
          <span
            className={`work-swatch stage-${slug(stage)}`}
            aria-hidden="true"
            data-tip={stageTip(stage)}
          />
          {OPEN_STATE_NAMES[state]}
          {detail && <span className="work-loose-state-detail">{detail}</span>}
        </span>
      </td>
    </tr>
  );
}

/** How many of a proposal's open needs a cell names before "+ N more". */
const GATE_REFS = 2;

/**
 * What stands between a proposal and committing: a mark colored as the
 * board colors stages (blue ready, amber your answer, red other items), a
 * word, and the IDs of what it waits on, each with its title on hover.
 */
function GateCell({
  it,
  gate,
  itemOf,
  except,
}: {
  it: WorkItem;
  gate: ProposalGate;
  itemOf: Map<string, WorkItem>;
  except?: string;
}) {
  const needs = it.open_needs
    .filter((n) => n !== except)
    .map((n) => itemOf.get(n) ?? n)
    // The owner's decisions first: they are the owner's to unblock.
    .sort(
      (a, b) =>
        Number(typeof b !== "string" && isOwnerDecision(b)) -
        Number(typeof a !== "string" && isOwnerDecision(a)),
    );
  if (except) {
    // Grouped by a decision: say only what else it waits on.
    return needs.length ? (
      <span className="work-gate">
        <span className="work-gate-word">Also</span>
        <GateRefs needs={needs} />
      </span>
    ) : (
      <span className="work-gate">
        <span className="work-gate-word muted">Nothing else</span>
      </span>
    );
  }
  return (
    <span className="work-gate">
      <span className={`work-gate-mark ${gate}`} aria-hidden="true" />
      <span className="work-gate-word">{GATE_NAMES[gate]}</span>
      {needs.length > 0 && <GateRefs needs={needs} />}
    </span>
  );
}

function GateRefs({ needs }: { needs: Array<WorkItem | string> }) {
  const named = needs.slice(0, GATE_REFS);
  const more = needs.length - named.length;
  return (
    <span className="work-gate-refs">
      {named.map((n, i) => (
        <span key={typeof n === "string" ? n : n.id}>
          {i > 0 && ", "}
          {typeof n === "string" ? (
            <KindId id={n} />
          ) : (
            <ItemLink
              id={n.id}
              className="work-gate-ref"
              tip={n.title.length > 60 ? `${n.title.slice(0, 57)}…` : n.title}
              label={`${n.id} ${n.title}`}
            >
              {n.id}
            </ItemLink>
          )}
        </span>
      ))}
      {more > 0 && (
        <span
          className="work-gate-more"
          title={needs
            .slice(GATE_REFS)
            .map((n) => (typeof n === "string" ? n : `${n.id} ${n.title}`))
            .join("\n")}
        >
          {" "}
          +{more}
        </span>
      )}
    </span>
  );
}

/** A link that opens an item beside the board, keeping the filters. */
function ItemLink({
  id,
  className,
  children,
  label,
  tip,
}: {
  id: string;
  className?: string;
  children: ReactNode;
  label?: string;
  /** A quick tooltip (what its color means). */
  tip?: string;
}) {
  return (
    <RouterLink
      to="/work"
      search={(prev: WorkSearch) => ({ ...prev, item: id })}
      className={className}
      aria-label={label}
      data-tip={tip}
    >
      {children}
    </RouterLink>
  );
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
              <Typography
                variant="subtitle-md"
                render={<h2 />}
                className="work-marked"
              >
                {p && <LevelMark level="project" />}
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
                        <KindId id={it.id} />
                        <span className="work-row-title">
                          <InlineText text={it.title} />
                        </span>
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
                                label={`${n.id} ${n.title}, ${STATE_NAMES[n.state]}`}
                              >
                                <KindId id={n.id} />
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
  inline,
  projectOf,
  itemOf,
  flight,
  back,
  onClose,
  onProject,
}: {
  s: WorkSnapshot;
  id?: string;
  inline: boolean;
  projectOf: Map<string, WorkContainer>;
  itemOf: Map<string, WorkItem>;
  flight: InFlight;
  /** The list under this panel, to go back to. */
  back?: string;
  onClose: () => void;
  onProject: (id: string) => void;
}) {
  const titleId = useId();
  return (
    <Pane inline={inline} open={!!id} onClose={onClose} labelledBy={titleId}>
      {back && (
        <Link
          component="button"
          type="button"
          className="work-panel-back"
          onClick={onClose}
        >
          ← {back}
        </Link>
      )}
      {id && (
        <EntityPane
          s={s}
          id={id}
          titleId={titleId}
          projectOf={projectOf}
          itemOf={itemOf}
          flight={flight}
          onClose={onClose}
          onProject={onProject}
        />
      )}
    </Pane>
  );
}

/**
 * One entity in the pane, whatever its kind (DESIGN.md, "The pane"). It
 * opens with what it is: the kind (marked and named), the ID and title,
 * the state, and where it sits (its project, its milestones, the releases
 * it gates). Then the same sections in the same order for every kind,
 * each under a heading, leaving out what a kind doesn't have: a decision's
 * question, options and answer, or a milestone's outcome; progress;
 * details; what it waits on and unblocks; a milestone's constraints; and
 * the file's full text.
 */
function EntityPane({
  s,
  id,
  titleId,
  projectOf,
  itemOf,
  flight,
  selected,
  onClose,
  onProject,
  onList,
}: {
  s: WorkSnapshot;
  id: string;
  titleId: string;
  projectOf: Map<string, WorkContainer>;
  itemOf: Map<string, WorkItem>;
  flight: InFlight;
  /** The item open beside it, marked in its lists. */
  selected?: string;
  onClose: () => void;
  onProject: (id: string) => void;
  /** Opens a list in the pane (a wait between milestones). */
  onList?: (list: string) => void;
}) {
  const kinds = useContext(KindsContext);
  const kind = kinds.get(id);
  const it = itemOf.get(id);
  const m =
    kind === "milestone" ? s.milestones.find((x) => x.id === id) : undefined;
  const p = kind === "project" ? projectOf.get(id) : undefined;
  const [text, setText] = useState<{
    id: string;
    text?: WorkItemText;
    error?: string;
  }>();
  useEffect(() => {
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
  const known = useMemo(() => new Set(kinds.keys()), [kinds]);
  const loaded = text?.id === id ? text : undefined;
  const path = (it ?? m ?? p)?.path;
  // Vite's dev server opens a file in the editor, relative to its root.
  const editorPath = path?.replace(/^packages\/next\//, "");
  const projectId = it?.project ?? m?.project;
  const project = projectId ? projectOf.get(projectId) : undefined;
  const gates = useMemo(
    () => (it || m ? releasesGatedBy(s, id) : []),
    [s, id, it, m],
  );
  const msRows = useMemo(
    () => (m ? milestoneRoadmapOf(s, s.items, flight, true) : []),
    [s, flight, m],
  );
  const title = it?.title ?? m?.title ?? p?.title;

  const body = (
    <BodyText
      loaded={loaded}
      known={known}
      empty={
        kind === "decision" ? "The decision's file has no text." : undefined
      }
    />
  );
  return (
    <>
      <div className="work-panel-head">
        <span className="work-card-top">
          {kind && <KindTag kind={kind} />}
          <span className="work-id">{id}</span>
        </span>
        <IconButton label="Close" onClick={onClose}>
          <Icon href={svgDismiss} />
        </IconButton>
      </div>
      {!kind || !title ? (
        <div className="work-panel-body">
          <Typography variant="headline-sm" render={<h2 />} id={titleId}>
            Not on this branch
          </Typography>
          <Typography variant="body-md" color="textSecondary" render={<p />}>
            {id} isn't among this branch's items, milestones or projects. It may
            be on another branch, or not made yet.
          </Typography>
        </div>
      ) : (
        <div className="work-panel-body">
          <header className="work-pane-what">
            <Typography variant="headline-sm" render={<h2 />} id={titleId}>
              <InlineText text={title} />
            </Typography>
            <div className="work-panel-states">
              <EntityStates it={it} m={m} p={p} flight={flight} />
            </div>
            {(project ||
              (it && it.milestones.length > 0) ||
              gates.length > 0 ||
              it?.release) && (
              <dl className="work-facts work-where">
                {project && (
                  <Fact name="Project">
                    <EntityLinks ids={[project.id]} s={s} />
                  </Fact>
                )}
                {it && it.milestones.length > 0 && (
                  <Fact
                    name={
                      it.milestones.length === 1 ? "Milestone" : "Milestones"
                    }
                  >
                    <EntityLinks ids={it.milestones} s={s} />
                  </Fact>
                )}
                {it?.release && <Fact name="Makes">Version {it.release}</Fact>}
                {gates.length > 0 && (
                  <Fact name="Gates">
                    <EntityLinks ids={gates.map((r) => r.id)} s={s} />
                  </Fact>
                )}
              </dl>
            )}
            {p && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Icon href={svgFilter} />}
                onClick={() => onProject(p.id)}
              >
                Scope the board to this project
              </Button>
            )}
          </header>

          {kind === "decision" && (
            <PaneSection title="The decision">{body}</PaneSection>
          )}
          {m && (
            <PaneSection title="Outcome">
              <Typography variant="body-md" render={<p />}>
                {m.outcome ?? "Not written yet: shaping owes the outcome."}
              </Typography>
              {m.done_when.length > 0 && (
                <ol className="work-ms-clauses">
                  {m.done_when.map((c) => (
                    <li key={c.clause}>
                      <b>{c.clause}</b> {c.text}
                    </li>
                  ))}
                </ol>
              )}
            </PaneSection>
          )}

          {(m || p || kind === "release") && (
            <PaneSection title="Progress">
              {kind === "release" && it && (
                <Typography variant="body-md" render={<p />}>
                  {(() => {
                    const ms = it.needs.filter(
                      (n) => kinds.get(n) === "milestone",
                    );
                    const done = ms.filter(
                      (n) =>
                        s.milestones.find((x) => x.id === n)?.state === "done",
                    ).length;
                    return ms.length
                      ? `${done} of ${ms.length} ${ms.length === 1 ? "milestone" : "milestones"} it needs done`
                      : "It needs no milestone";
                  })()}
                </Typography>
              )}
              <StageProgress
                items={
                  m
                    ? m.constraints
                        .map((c) => itemOf.get(c.id))
                        .filter((x): x is WorkItem => !!x)
                    : p
                      ? s.items.filter((x) => x.project === p.id)
                      : (it?.needs ?? [])
                          .map((n) => itemOf.get(n))
                          .filter((x): x is WorkItem => !!x)
                }
                flight={flight}
                noun={m ? "constraint" : p ? "item" : "item it needs"}
                nouns={m ? "constraints" : p ? "items" : "items it needs"}
                bar={kind !== "release"}
              />
              {m?.check_due && (
                <Typography variant="body-sm" render={<p />}>
                  Every constraint is done: its check is due.
                </Typography>
              )}
            </PaneSection>
          )}

          <EntityDetails it={it} m={m} p={p} s={s} flight={flight} />

          {it && <FocusTrees it={it} itemOf={itemOf} flight={flight} />}
          {m && (
            <MilestoneOrder
              s={s}
              m={m}
              itemOf={itemOf}
              rows={msRows}
              onList={onList}
            />
          )}

          {m && (
            <PaneSection title="Constraints">
              <Grouped
                s={s}
                items={m.constraints
                  .map((c) => itemOf.get(c.id))
                  .filter((x): x is WorkItem => !!x)}
                empty="No constraints yet."
                selected={selected}
                projectOf={projectOf}
                line={(x) => {
                  const c = m.constraints.find((y) => y.id === x.id)?.clause;
                  return c === "c?"
                    ? "Not linked to a clause yet"
                    : `Clause ${c}`;
                }}
              />
            </PaneSection>
          )}

          {kind !== "decision" && (
            <PaneSection title="Full text">{body}</PaneSection>
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
                  () => toast("Copied the file's path"),
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
    </>
  );
}

/** A section of the pane, under its heading. */
function PaneSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const hid = useId();
  return (
    <section className="work-pane-section" aria-labelledby={hid}>
      <Typography
        variant="caption-lg"
        render={<h3 />}
        id={hid}
        className="work-pane-label"
      >
        {title}
      </Typography>
      {children}
    </section>
  );
}

/** An entity's file text, as it loads. */
function BodyText({
  loaded,
  known,
  empty,
}: {
  loaded?: { text?: WorkItemText; error?: string };
  known: ReadonlySet<string>;
  empty?: string;
}) {
  if (!loaded || (!loaded.text && !loaded.error)) {
    return (
      <div className="work-loading" role="status">
        <CircularProgress size={16} />
        <Typography variant="body-sm">Reading the file…</Typography>
      </div>
    );
  }
  if (loaded.error) {
    return (
      <Alert severity="error">
        The file's text didn't load ({loaded.error}).
      </Alert>
    );
  }
  if (!loaded.text!.body.trim()) {
    return (
      <Typography variant="body-sm" color="textSecondary" render={<p />}>
        {empty ?? "The file has no text beyond its fields."}
      </Typography>
    );
  }
  return (
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
  );
}

/** IDs as links that open each in the pane, each with its kind's mark and title. */
function EntityLinks({ ids, s }: { ids: readonly string[]; s: WorkSnapshot }) {
  return (
    <span className="work-entity-links">
      {ids.map((m) => (
        <ItemLink key={m} id={m} className="work-marked work-entity-link">
          <KindId id={m} />
          <InlineText text={mapEntityTitle(s, m)} />
        </ItemLink>
      ))}
    </span>
  );
}

/** The state, in the tracker's words, and what it means now. */
function EntityStates({
  it,
  m,
  p,
  flight,
}: {
  it?: WorkItem;
  m?: WorkMilestone;
  p?: WorkContainer;
  flight: InFlight;
}) {
  if (it) {
    return (
      <>
        <StatusBadge
          tone={
            it.state === "done"
              ? "success"
              : it.state === "in-progress"
                ? "info"
                : "secondary"
          }
        >
          {STATE_NAMES[it.state]}
        </StatusBadge>
        {isOpen(it) && it.state !== "in-progress" && (
          <StatusBadge tone={stateOf(it, flight).tone}>
            {stateOf(it, flight).text}
          </StatusBadge>
        )}
        {isOwnerDecision(it) && (
          <StatusBadge tone="warning">Owner decides</StatusBadge>
        )}
      </>
    );
  }
  const st = (m ?? p)!.state;
  return (
    <>
      <StatusBadge tone={st === "done" ? "success" : "secondary"}>
        {STATE_NAMES[st]}
      </StatusBadge>
      {m?.learning && <StatusBadge tone="info">Learning milestone</StatusBadge>}
      {m?.check_due && <StatusBadge tone="info">Check due</StatusBadge>}
      {m && m.to_shape.length > 0 && (
        <StatusBadge tone="secondary">To shape</StatusBadge>
      )}
    </>
  );
}

/** How a set of items stands, as one stage bar and in words. */
function StageProgress({
  items,
  flight,
  noun,
  nouns,
  bar = true,
}: {
  items: readonly WorkItem[];
  flight: InFlight;
  noun: string;
  nouns: string;
  /** False where the items are only part of the progress (a release's milestones aren't in it). */
  bar?: boolean;
}) {
  const counts = Object.fromEntries(STAGES.map((st) => [st, 0])) as Record<
    Stage,
    number
  >;
  for (const x of items) {
    const st = stageOf(x, flight);
    if (st) {
      counts[st]++;
    }
  }
  const total = STAGES.reduce((n, st) => n + counts[st], 0);
  if (!total) {
    return (
      <Typography variant="body-sm" color="textSecondary" render={<p />}>
        No {nouns} yet.
      </Typography>
    );
  }
  return (
    <div className="work-pane-progress">
      <Typography variant="body-md" render={<p />}>
        {counts.Done} of {total} {total === 1 ? noun : nouns} done
        {counts["In flight"] ? `, ${counts["In flight"]} in progress` : ""}
      </Typography>
      {bar && (
        <span className="work-pbar-track" aria-hidden="true">
          {STAGES.map((st) =>
            counts[st] ? (
              <span
                key={st}
                className={`work-roadmap-seg stage-${slug(st)}`}
                style={{ flexGrow: counts[st] }}
              />
            ) : null,
          )}
        </span>
      )}
      <ul className="work-pane-stages">
        {STAGES.filter((st) => counts[st]).map((st) => (
          <li key={st}>
            <span
              className={`work-swatch stage-${slug(st)}`}
              aria-hidden="true"
            />
            {counts[st]} {STAGE_NAMES[st].toLowerCase()}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The fields a kind has, in one list; none shown empty. */
function EntityDetails({
  it,
  m,
  p,
  s,
  flight,
}: {
  it?: WorkItem;
  m?: WorkMilestone;
  p?: WorkContainer;
  s: WorkSnapshot;
  flight: InFlight;
}) {
  const facts: ReactNode[] = [];
  if (it) {
    if (it.state === "in-progress" || flight.has(it.id)) {
      facts.push(
        <Fact key="claimed" name="Claimed">
          {whereOf(it, flight, s.branch)}
        </Fact>,
      );
    }
    if (it.decider) {
      facts.push(
        <Fact key="decider" name="Decided by">
          {it.decider}
        </Fact>,
      );
    }
    if (it.waiting_on) {
      facts.push(
        <Fact key="waiting" name="Waits on">
          {it.waiting_on}
        </Fact>,
      );
    }
    if (it.created) {
      facts.push(
        <Fact key="created" name="Created">
          {it.created}
        </Fact>,
      );
    }
    if (it.reason) {
      facts.push(
        <Fact key="reason" name="Reason">
          {it.reason}
        </Fact>,
      );
    }
  }
  if (m) {
    facts.push(
      <Fact key="check" name="Check">
        {m.check ?? "Not written yet"}
      </Fact>,
    );
    if (m.check_results.length) {
      facts.push(
        <Fact key="result" name="Last check">
          {m.check_results.at(-1)}
        </Fact>,
      );
    }
    if (m.to_shape.length) {
      facts.push(
        <Fact key="shape" name="Shaping owes">
          {m.to_shape.map((x) => SHAPE_NAMES[x] ?? x).join(", ")}
        </Fact>,
      );
    }
  }
  if (p) {
    if (p.owner) {
      facts.push(
        <Fact key="owner" name="Owner">
          {p.owner}
        </Fact>,
      );
    }
    if (p.plan) {
      facts.push(
        <Fact key="plan" name="Plan">
          <span className="work-mono">{p.plan}</span>
        </Fact>,
      );
    }
    if (p.reason) {
      facts.push(
        <Fact key="reason" name="Reason">
          {p.reason}
        </Fact>,
      );
    }
  }
  return facts.length ? (
    <PaneSection title="Details">
      <dl className="work-facts">{facts}</dl>
    </PaneSection>
  ) : null;
}

/** A milestone's place in the order: when it can move, what it waits on, its longest chain. */
function MilestoneOrder({
  s,
  m,
  itemOf,
  rows,
  onList,
}: {
  s: WorkSnapshot;
  m: WorkMilestone;
  itemOf: Map<string, WorkItem>;
  rows: readonly RoadmapRow[];
  onList?: (list: string) => void;
}) {
  const row = rows.find((r) => r.id === m.id);
  const { path, done } = criticalPathOf(m, itemOf);
  const next = path.find((x) => x.state !== "done");
  if (!row && path.length <= 1) {
    return null;
  }
  return (
    <PaneSection title="Waits on">
      <dl className="work-facts">
        {row && (
          <Fact name="Order">
            {row.step === 1
              ? "Can move now"
              : `After step ${row.step - 1} of the roadmap`}
          </Fact>
        )}
        {row && row.waitsOn.length > 0 && (
          <Fact name="Milestones">
            {[...row.waitsOn]
              .sort((a, b) => b.items.length - a.items.length)
              .map((w, i) => (
                <span key={w.id} className="work-marked">
                  {i > 0 && ", "}
                  <KindMark kind="milestone" />
                  {onList ? (
                    <Link
                      component="button"
                      type="button"
                      onClick={() => onList(`mdep:${m.id}:${w.id}`)}
                      title="List the items behind this wait"
                    >
                      {mapEntityTitle(s, w.id)}
                    </Link>
                  ) : (
                    mapEntityTitle(s, w.id)
                  )}{" "}
                  ({w.items.length})
                </span>
              ))}
          </Fact>
        )}
        {path.length > 1 && (
          <Fact name="Longest chain">
            {path.length} items in order, {done} done
            {next && (
              <>
                ; next{" "}
                <ItemLink id={next.id}>
                  <KindId id={next.id} />
                </ItemLink>
              </>
            )}
          </Fact>
        )}
      </dl>
    </PaneSection>
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

// ------------------------------------------------------------ dependencies

/**
 * Projects against projects (a design structure matrix): row waits on
 * column, each cell the number of the row's open items that need the
 * column's. Ordered so what's needed comes first, marks sit below the
 * diagonal; one above it is a two-way wait. Choosing a cell lists the
 * items behind it.
 */
function MatrixView({
  s,
  items,
  flight,
  proposals,
  release,
  onRelease,
  onCell,
  onProject,
}: {
  s: WorkSnapshot;
  items: WorkItem[];
  flight: InFlight;
  /** Proposed milestones count among what feeds a release. */
  proposals: boolean;
  /** The release in focus: the projects that feed it stand out. */
  release?: string;
  onRelease: (id: string | undefined) => void;
  onCell: (from: string, to: string) => void;
  /** Zooms the dashboard into a project. */
  onProject: (id: string) => void;
}) {
  const m = useMemo(() => dependencyMatrix(s, items), [s, items]);
  const title = (id: string) =>
    s.projects.find((p) => p.id === id)?.title ?? id;
  // The releases, with no steps to place them by: each names what feeds it.
  const flags = useMemo(
    () =>
      releaseFlagsOf(
        s,
        milestoneRoadmapOf(s, s.items, flight, proposals),
        () => 0,
      ),
    [s, flight, proposals],
  );
  const [hoverFlag, setHoverFlag] = useState<string>();
  const fed = useMemo(() => {
    const f =
      flags.find((x) => x.id === hoverFlag) ??
      flags.find((x) => x.id === release && !x.unplaced);
    return f
      ? new Set(
          f.feeds.map((id) => s.milestones.find((x) => x.id === id)?.project),
        )
      : undefined;
  }, [flags, hoverFlag, release, s.milestones]);
  const flagTitle = (id: string) =>
    s.milestones.find((x) => x.id === id)?.title ??
    s.items.find((x) => x.id === id)?.title ??
    id;
  const max = Math.max(1, ...[...m.cells.values()].map((v) => v.length));
  const level = (n: number) => Math.min(4, Math.ceil((4 * n) / max));
  const [hot, setHot] = useState<{ r: number; c: number }>();
  if (!m.order.length) {
    return (
      <Typography variant="body-md" color="textSecondary" render={<p />}>
        No project here waits on another.
      </Typography>
    );
  }
  return (
    <div className="work-matrix">
      <ReleaseStrip
        flags={flags}
        label="Releases"
        note={
          flags.some((f) => !f.unplaced)
            ? `Point at one to mark the projects whose milestones feed it${proposals ? ", proposed milestones among them" : ""}.`
            : unplacedNote(flags.map((f) => ({ ...f, at: undefined })))
        }
        titleOf={flagTitle}
        steps={false}
        release={release}
        onHover={setHoverFlag}
        onSelect={onRelease}
      />
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-matrix-note"
      >
        Each row waits on the columns marked: the number is how many of the
        row's open items need the column's. What's needed comes first, so marks
        sit below the diagonal; one above it means two projects wait on each
        other.
      </Typography>
      <Typography
        variant="body-sm"
        render={<p />}
        className="work-matrix-read"
        aria-live="polite"
      >
        {hot
          ? (() => {
              const from = m.order[hot.r]!;
              const to = m.order[hot.c]!;
              const n = m.cells.get(`${from}|${to}`)?.length ?? 0;
              return hot.r === hot.c ? (
                <>
                  <b>{title(from)}</b> (the diagonal)
                </>
              ) : (
                <>
                  <b>{title(from)}</b> waits on <b>{title(to)}</b>:{" "}
                  {n ? `${n} ${n === 1 ? "item" : "items"}` : "nothing"}
                  {n > 0 && m.cells.has(`${to}|${from}`)
                    ? `, and ${title(to)} waits on it too`
                    : n > 0 && hot.c > hot.r
                      ? ", part of a loop of waits through other projects"
                      : ""}
                </>
              );
            })()
          : "Point at a cell to name its row and column."}
      </Typography>
      <div className="work-matrix-scroll">
        <table
          className="work-matrix-table"
          onMouseLeave={() => setHot(undefined)}
        >
          <thead>
            <tr>
              <th scope="col" className="work-matrix-corner">
                <span className="visually-hidden">Waiting project</span>
              </th>
              {m.order.map((id, c) => (
                <th
                  key={id}
                  scope="col"
                  className={`work-matrix-col${hot?.c === c ? " hot" : ""}${fed ? (fed.has(id) ? " fed" : " unfed") : ""}`}
                  title={`${id} ${title(id)}`}
                >
                  <span className="work-matrix-col-label">
                    <span className="work-matrix-n">{c + 1}</span> {title(id)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.order.map((from, r) => (
              <tr key={from}>
                <th
                  scope="row"
                  className={`work-matrix-row${hot?.r === r ? " hot" : ""}${fed ? (fed.has(from) ? " fed" : " unfed") : ""}`}
                  title={`${from} ${title(from)}`}
                >
                  <span className="work-matrix-n">{r + 1}</span>{" "}
                  <LevelMark level="project" /> {title(from)}
                </th>
                {m.order.map((to, c) => {
                  const list = m.cells.get(`${from}|${to}`);
                  const n = list?.length ?? 0;
                  return (
                    <td
                      key={to}
                      className={`work-matrix-cell${r === c ? " diag" : ""}${n && c > r ? " above" : ""}${hot && (hot.r === r || hot.c === c) ? " cross" : ""}${hot && hot.r === r && hot.c === c ? " at" : ""}`}
                      onMouseEnter={() => setHot({ r, c })}
                    >
                      {n > 0 && (
                        <button
                          type="button"
                          className={`work-matrix-mark l${level(n)}`}
                          onClick={() => onCell(from, to)}
                          aria-label={`${title(from)} waits on ${title(to)}: ${n} ${n === 1 ? "item" : "items"}`}
                          title={`${title(from)} waits on ${title(to)}: ${n}`}
                        >
                          {n}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {m.alone.length > 0 && (
        <section className="work-alone">
          <Typography variant="subtitle-md" render={<h3 />}>
            Not linked to another project
          </Typography>
          <Typography variant="caption-md" color="textSecondary" render={<p />}>
            Their items wait only on each other. Choose one to zoom in.
          </Typography>
          <ul className="work-alone-list">
            {m.alone.map((id) => {
              const mine = items.filter((it) => it.project === id);
              const open = mine.filter(isOpen).length;
              const ready = mine.filter((it) => it.ready).length;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className="work-alone-item"
                    onClick={() => onProject(id)}
                  >
                    <span className="work-alone-title work-marked">
                      <LevelMark level="project" />
                      {title(id)}
                    </span>
                    <Typography variant="caption-md" color="textSecondary">
                      {open} open · {ready} ready
                    </Typography>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * A project's place among the others: the projects it waits on and the
 * ones that wait on it, each with how many items (its row and column of
 * the matrix, as lists).
 */
function ProjectLinks({
  s,
  project,
  onCell,
}: {
  s: WorkSnapshot;
  project: string;
  onCell: (from: string, to: string) => void;
}) {
  const m = useMemo(() => dependencyMatrix(s, s.items), [s]);
  const title = (id: string) =>
    s.projects.find((p) => p.id === id)?.title ?? id;
  const waitsOn: Array<[string, number]> = [];
  const waitedOnBy: Array<[string, number]> = [];
  for (const [k, list] of m.cells) {
    const [from, to] = k.split("|") as [string, string];
    if (from === project) {
      waitsOn.push([to, list.length]);
    } else if (to === project) {
      waitedOnBy.push([from, list.length]);
    }
  }
  const max = Math.max(
    1,
    ...waitsOn.map((x) => x[1]),
    ...waitedOnBy.map((x) => x[1]),
  );
  const rows = (list: Array<[string, number]>, dir: "on" | "by") =>
    !list.length ? (
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-empty"
      >
        None
      </Typography>
    ) : (
      <ol className="work-bars">
        {list
          .sort((a, b) => b[1] - a[1])
          .map(([id, n]) => (
            <li key={id}>
              <button
                type="button"
                className="work-bar"
                onClick={() =>
                  dir === "on" ? onCell(project, id) : onCell(id, project)
                }
              >
                <span className="work-bar-label work-marked">
                  <LevelMark level="project" />
                  <span className="work-outline-label">{title(id)}</span>
                </span>
                <span className="work-bar-track" aria-hidden="true">
                  <span
                    className="work-bar-fill"
                    style={{ width: `${(100 * n) / max}%` }}
                  />
                </span>
                <span className="work-bar-value">{n}</span>
              </button>
            </li>
          ))}
      </ol>
    );
  return (
    <div className="work-links">
      <div>
        <Typography variant="caption-lg" color="textSecondary" render={<h3 />}>
          Waits on
        </Typography>
        {rows(waitsOn, "on")}
      </div>
      <div>
        <Typography variant="caption-lg" color="textSecondary" render={<h3 />}>
          Waited on by
        </Typography>
        {rows(waitedOnBy, "by")}
      </div>
    </div>
  );
}

/**
 * The longest chains, ranked: each a bar for how many items it runs in
 * order, labeled with where it starts and who moves that first item now.
 * Choosing one lists the chain step by step.
 */
function ChainBars({
  chains,
  flight,
  projectOf,
  limit,
  onChain,
}: {
  chains: WorkItem[][];
  flight: InFlight;
  projectOf: Map<string, WorkContainer>;
  limit: number;
  onChain: (head: string) => void;
}) {
  if (!chains.length) {
    return (
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-empty"
      >
        No open item waits on another here.
      </Typography>
    );
  }
  const shown = chains.slice(0, limit);
  const max = shown[0]!.length;
  return (
    <ol className="work-bars work-chains">
      {shown.map((chain) => {
        const head = chain[0]!;
        const actor = nextActor(head, flight);
        const projects = new Set(chain.map((it) => it.project));
        const where = projectOf.get(head.project ?? "")?.title ?? head.project;
        return (
          <li key={head.id}>
            <button
              type="button"
              className="work-bar"
              onClick={() => onChain(head.id)}
              aria-label={`${chain.length} items from ${head.id} ${head.title}`}
            >
              <span className="work-bar-label">
                <KindId id={head.id} /> <InlineText text={head.title} />
                <span className="work-chain-meta">
                  {where}
                  {projects.size > 1 && ` +${projects.size - 1}`} ·{" "}
                  {actor === "owner"
                    ? "your decision first"
                    : actor === "outside"
                      ? "waits outside first"
                      : stageOf(head, flight) === "In flight"
                        ? "first is in progress"
                        : "first is ready"}
                </span>
              </span>
              <span className="work-bar-track" aria-hidden="true">
                <span
                  className="work-bar-fill"
                  style={{ width: `${(100 * chain.length) / max}%` }}
                />
              </span>
              <span className="work-bar-value">{chain.length}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * An item's dependencies as two trees around it: what it waits on above
 * (each open need expandable into its own needs, down to what someone can
 * act on now) and what waits on it below (expandable the same way). A
 * path is followed by opening a branch, not by tracing lines.
 */
function FocusTrees({
  it,
  itemOf,
  flight,
}: {
  it: WorkItem;
  itemOf: Map<string, WorkItem>;
  flight: InFlight;
}) {
  return (
    <>
      <PaneSection title="Waits on">
        {it.needs.length ? (
          <DepTree
            ids={it.needs}
            dir="up"
            itemOf={itemOf}
            flight={flight}
            depth={0}
            trail={[it.id]}
          />
        ) : (
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            Nothing: it can start once planned.
          </Typography>
        )}
      </PaneSection>
      <PaneSection title="Unblocks">
        {it.needed_by.length ? (
          <DepTree
            ids={it.needed_by}
            dir="down"
            itemOf={itemOf}
            flight={flight}
            depth={0}
            trail={[it.id]}
          />
        ) : (
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            No open item needs it.
          </Typography>
        )}
      </PaneSection>
    </>
  );
}

function DepTree({
  ids,
  dir,
  itemOf,
  flight,
  depth,
  trail,
}: {
  ids: string[];
  dir: "up" | "down";
  itemOf: Map<string, WorkItem>;
  flight: InFlight;
  depth: number;
  /** The items on the way here, so a cycle stops. */
  trail: string[];
}) {
  // Open first, then by number; done needs fold to the end.
  const sorted = [...ids].sort((a, b) => {
    const x = itemOf.get(a);
    const y = itemOf.get(b);
    return (
      Number(!!y && isOpen(y)) - Number(!!x && isOpen(x)) ||
      idNumber(a) - idNumber(b)
    );
  });
  return (
    <ul
      className={`work-tree${depth ? " nested" : ""}`}
      role={depth ? "group" : "tree"}
    >
      {sorted.map((id) => (
        <DepNode
          key={id}
          id={id}
          dir={dir}
          itemOf={itemOf}
          flight={flight}
          depth={depth}
          trail={trail}
        />
      ))}
    </ul>
  );
}

function DepNode({
  id,
  dir,
  itemOf,
  flight,
  depth,
  trail,
}: {
  id: string;
  dir: "up" | "down";
  itemOf: Map<string, WorkItem>;
  flight: InFlight;
  depth: number;
  trail: string[];
}) {
  const x = itemOf.get(id);
  // A release needs milestones as well as items.
  const ms = useContext(SnapshotContext)?.milestones.find((m) => m.id === id);
  const next = x
    ? (dir === "up" ? x.open_needs : x.needed_by).filter(
        (n) => !trail.includes(n),
      )
    : [];
  const [open, setOpen] = useState(false);
  const st = x ? stageOf(x, flight) : undefined;
  const actor = x ? nextActor(x, flight) : undefined;
  return (
    <li
      role="treeitem"
      aria-expanded={next.length ? open : undefined}
      className="work-tree-item"
    >
      <div className="work-tree-row">
        {next.length ? (
          <IconButton
            label={
              open
                ? `Hide what ${id} ${dir === "up" ? "waits on" : "unblocks"}`
                : `Show what ${id} ${dir === "up" ? "waits on" : "unblocks"}`
            }
            size="small"
            className="work-tree-toggle"
            onClick={() => setOpen(!open)}
          >
            <Icon href={open ? svgChevronDown : svgChevronRight} />
          </IconButton>
        ) : (
          <span className="work-tree-spacer" aria-hidden="true" />
        )}
        {x ? (
          <ItemLink
            id={id}
            className={`work-tree-link${isOpen(x) ? "" : " closed"}`}
          >
            <span
              className={`work-swatch stage-${slug(st ?? "Done")}`}
              aria-hidden="true"
              data-tip={stageTip(st ?? "Done")}
            />
            <KindId id={id} />
            <span className="work-tree-title">
              <InlineText text={x.title} />
            </span>
            <span className="work-tree-state">
              {!isOpen(x)
                ? STATE_NAMES[x.state]
                : dir === "up" && actor && actor !== "items"
                  ? actor === "owner"
                    ? "Your move"
                    : actor === "outside"
                      ? "Outside"
                      : STAGE_NAMES[st ?? "Ready"]
                  : next.length
                    ? `${next.length} more`
                    : STAGE_NAMES[st ?? "Waiting"]}
            </span>
          </ItemLink>
        ) : ms ? (
          <ItemLink
            id={id}
            className={`work-tree-link${ms.state === "done" ? " closed" : ""}`}
          >
            <span className="work-swatch none" aria-hidden="true" />
            <KindId id={id} />
            <span className="work-tree-title">
              <InlineText text={ms.title} />
            </span>
            <span className="work-tree-state">
              {ms.state === "done"
                ? STATE_NAMES.done
                : `${ms.progress.done} of ${ms.progress.total} done`}
            </span>
          </ItemLink>
        ) : (
          <span className="work-tree-link missing">
            <KindId id={id} /> not in the tracker on this branch
          </span>
        )}
      </div>
      {open && next.length > 0 && (
        <DepTree
          ids={next}
          dir={dir}
          itemOf={itemOf}
          flight={flight}
          depth={depth + 1}
          trail={[...trail, id]}
        />
      )}
    </li>
  );
}

/** Tokens in short: 950, 12k, 1.4M. */
const tokenText = (n: number) =>
  n >= 1e6
    ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
    : n >= 1e3
      ? `${Math.round(n / 1e3)}k`
      : `${Math.round(n)}`;

/** The canvas's height: most of the window, so the page around it stays in reach. */
const canvasCap = () =>
  typeof window === "undefined"
    ? 640
    : Math.max(320, Math.round(window.innerHeight * 0.72));

/** Ctrl, or ⌘ on a Mac: the key that turns the wheel into zoom. */
const ZOOM_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl";

/**
 * The roadmap's canvas (CS-683), zoomed and panned as in Figma: pinch, or
 * Ctrl or ⌘ with the wheel, zooms about the pointer; the wheel and a drag
 * pan; + and − step the zoom, Shift+1 fits the whole map and Shift+0 goes
 * back to 100%. The content draws itself at the zoom it is given, its
 * text at full size or not at all (semantic zoom), so the canvas only
 * keeps the point under the pointer still. Nothing animates, so there is
 * no motion to reduce.
 */
function ZoomCanvas({
  zoom,
  onZoom,
  fixed,
  size,
  label,
  children,
}: {
  zoom: number;
  onZoom: (zoom: number) => void;
  /** What doesn't scale: the lane names' width, the headers' height. */
  fixed: { x: number; y: number };
  /** The content's size at this zoom. */
  size: { w: number; h: number };
  /** Names the canvas for assistive technology. */
  label: string;
  children: ReactNode;
}) {
  const view = useRef<HTMLDivElement>(null);
  const hint = useId();
  // The zoom last asked for, ahead of the redraw that shows it, so wheel
  // events between two frames add up.
  const target = useRef(zoom);
  // The point to hold still across a zoom: where it was in the content and
  // on screen, and the zoom and the fixed parts it was measured at (the
  // flags over a map can stack anew at another zoom).
  const anchor = useRef<{
    cx: number;
    cy: number;
    px: number;
    py: number;
    from: number;
    fixed: { x: number; y: number };
  }>(undefined);
  const fixedNow = useRef(fixed);
  fixedNow.current = fixed;
  const [cap, setCap] = useState(canvasCap);
  useEffect(() => {
    const onResize = () => setCap(canvasCap());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // The content at 100%: the canvas keeps the height it has there.
  const base = {
    w: fixed.x + (size.w - fixed.x) / zoom,
    h: fixed.y + (size.h - fixed.y) / zoom,
  };
  const height = Math.min(cap, Math.ceil(base.h) + 16);
  const zoomTo = (
    want: number,
    at?: { px: number; py: number; cx?: number; cy?: number },
  ) => {
    const el = view.current;
    if (!el) {
      return;
    }
    const to = clampZoom(want);
    if (!anchor.current) {
      const px = at?.px ?? el.clientWidth / 2;
      const py = at?.py ?? el.clientHeight / 2;
      anchor.current = {
        cx: at?.cx ?? el.scrollLeft + px,
        cy: at?.cy ?? el.scrollTop + py,
        px,
        py,
        from: target.current,
        fixed: fixedNow.current,
      };
    }
    if (to === target.current) {
      // Nothing to redraw: settle the scroll now.
      const a = anchor.current;
      anchor.current = undefined;
      refit.current = 0;
      el.scrollTo({
        left: a.cx - a.px,
        top: a.cy - a.py,
        behavior: "instant",
      });
      return;
    }
    target.current = to;
    onZoom(to);
  };
  // A fit measures again once it is drawn: the flags over a map stack
  // anew at another zoom, and so the headers grow or shrink.
  const refit = useRef(0);
  const fit = (again = 1) => {
    const el = view.current;
    if (el) {
      refit.current = again;
      zoomTo(fitZoom({ w: el.clientWidth, h: el.clientHeight }, base, fixed), {
        px: 0,
        py: 0,
        cx: 0,
        cy: 0,
      });
    }
  };
  const step = (dir: 1 | -1) => zoomTo(zoomStep(target.current, dir));
  // The handlers below are bound once; they reach today's through these.
  const live = useRef({ zoomTo, fit, step });
  live.current = { zoomTo, fit, step };
  useLayoutEffect(() => {
    if (!refit.current) {
      return;
    }
    const el = view.current;
    refit.current--;
    if (
      el &&
      (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
    ) {
      fit(refit.current);
    }
  });
  useLayoutEffect(() => {
    target.current = zoom;
    const a = anchor.current;
    const el = view.current;
    anchor.current = undefined;
    if (a && el) {
      // Past the fixed parts, a point moves as they grew or shrank too.
      const move = (at: number, was: number, now: number) =>
        zoomAbout(at, was, a.from, zoom) + (at > was ? now - was : 0);
      el.scrollTo({
        left: move(a.cx, a.fixed.x, fixed.x) - a.px,
        top: move(a.cy, a.fixed.y, fixed.y) - a.py,
        behavior: "instant",
      });
    }
    // Only a new zoom moves the view; `fixed` is read as it stands.
  }, [zoom]);
  useEffect(() => {
    const el = view.current;
    if (!el) {
      return;
    }
    const onWheel = (e: WheelEvent) => {
      // A plain wheel pans, as the browser scrolls; with Ctrl or ⌘ (and a
      // trackpad's pinch, which arrives so) it zooms about the pointer.
      if (!e.ctrlKey && !e.metaKey) {
        return;
      }
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const d =
        e.deltaMode === 1
          ? e.deltaY * 16
          : e.deltaMode === 2
            ? e.deltaY * 400
            : e.deltaY;
      live.current.zoomTo(
        target.current * Math.exp(-Math.max(-50, Math.min(50, d)) * 0.01),
        { px: e.clientX - r.left, py: e.clientY - r.top },
      );
    };
    // Safari's trackpad pinch comes as gestures, not wheel events.
    type Gesture = Event & { scale: number; clientX: number; clientY: number };
    let from = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      from = target.current;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as Gesture;
      const r = el.getBoundingClientRect();
      live.current.zoomTo(from * g.scale, {
        px: g.clientX - r.left,
        py: g.clientY - r.top,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
    };
  }, []);
  // A drag pans, from anywhere, once it has moved past a click's wobble;
  // two fingers pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
  }>(undefined);
  const pinch = useRef<{ d: number; z: number }>(undefined);
  const swallow = useRef(false);
  const [panning, setPanning] = useState(false);
  const startDrag = (id: number, x: number, y: number, moved: boolean) => {
    const el = view.current!;
    drag.current = {
      id,
      x,
      y,
      left: el.scrollLeft,
      top: el.scrollTop,
      moved,
    };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 1) {
      return;
    }
    if (e.button === 1) {
      e.preventDefault(); // no autoscroll
    }
    swallow.current = false;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      startDrag(e.pointerId, e.clientX, e.clientY, false);
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      pinch.current = {
        d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        z: target.current,
      };
      if (drag.current) {
        drag.current.moved = true;
      }
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) {
      return;
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const el = view.current!;
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      const r = el.getBoundingClientRect();
      zoomTo(
        (pinch.current.z * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.d,
        {
          px: (a.x + b.x) / 2 - r.left,
          py: (a.y + b.y) / 2 - r.top,
        },
      );
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) {
      return;
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) {
      return;
    }
    if (!d.moved) {
      d.moved = true;
      // Keep the drag when the pointer leaves the canvas; a pointer the
      // browser no longer tracks can't be captured, and pans anyway.
      if (el.hasPointerCapture?.(e.pointerId) === false) {
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // Not an active pointer: nothing to capture.
        }
      }
      setPanning(true);
    }
    el.scrollTo({ left: d.left - dx, top: d.top - dy, behavior: "instant" });
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    if (!pointers.current.delete(e.pointerId)) {
      return;
    }
    if (pointers.current.size < 2) {
      pinch.current = undefined;
    }
    if (pointers.current.size === 1) {
      // One finger left after a pinch: it pans on from where it is.
      const [[id, p]] = [...pointers.current.entries()] as [
        [number, { x: number; y: number }],
      ];
      startDrag(id, p.x, p.y, true);
    } else if (!pointers.current.size) {
      // The click that ends a drag opens nothing.
      swallow.current = !!drag.current?.moved;
      drag.current = undefined;
      setPanning(false);
    }
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey || (e.target as HTMLElement).closest("input, textarea")) {
      return;
    }
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === "+" || e.key === "=") {
      step(1);
    } else if (e.key === "-" || e.key === "_") {
      step(-1);
    } else if ((e.shiftKey && e.code === "Digit0") || (mod && e.key === "0")) {
      zoomTo(1);
    } else if (e.shiftKey && e.code === "Digit1") {
      fit();
    } else {
      return;
    }
    e.preventDefault();
  };
  const pct = Math.round(zoom * 100);
  return (
    <div className="work-zoom" onKeyDown={onKeyDown}>
      <div className="work-zoom-bar">
        <Typography variant="caption-md" color="textSecondary" id={hint}>
          Scroll or drag to pan. Pinch, or {ZOOM_KEY} and scroll, to zoom; keys
          + and −, Shift+1 to fit, Shift+0 for 100%.
        </Typography>
        <span className="work-zoom-tools" role="group" aria-label="Zoom">
          <IconButton
            size="small"
            label="Zoom out (−)"
            onClick={() => step(-1)}
            disabled={zoom <= ZOOM_MIN}
          >
            <Icon href={svgZoomOutMagnifier} />
          </IconButton>
          <Tooltip title="Back to 100% (Shift+0)">
            <Button
              size="small"
              variant="text"
              className="work-zoom-level"
              aria-label={`Zoom ${pct}%: back to 100%`}
              onClick={() => zoomTo(1)}
            >
              {pct}%
            </Button>
          </Tooltip>
          <IconButton
            size="small"
            label="Zoom in (+)"
            onClick={() => step(1)}
            disabled={zoom >= ZOOM_MAX}
          >
            <Icon href={svgZoomInMagnifier} />
          </IconButton>
          <Tooltip title="Zoom to fit the whole map (Shift+1)">
            <Button
              size="small"
              variant="outlined"
              startIcon={<Icon href={svgFitToView} />}
              onClick={() => fit()}
            >
              Fit
            </Button>
          </Tooltip>
        </span>
      </div>
      <div
        ref={view}
        className={`work-canvas${panning ? " panning" : ""}`}
        style={{ height }}
        tabIndex={0}
        role="region"
        aria-label={label}
        aria-describedby={hint}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => {
          if (swallow.current) {
            swallow.current = false;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
      <span className="visually-hidden" aria-live="polite">
        Zoom {pct}%
      </span>
    </div>
  );
}

/** A group of the roadmap's key: a short heading, then each mark and its meaning. */
function KeyGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="work-key-group">
      <Typography
        variant="caption-md"
        color="textSecondary"
        render={<h4 />}
        id={id}
        className="work-key-head"
      >
        {title}
      </Typography>
      <ul aria-labelledby={id}>{children}</ul>
    </div>
  );
}

/** One mark in the key, with what it means. */
function KeyItem({
  mark,
  tip,
  children,
}: {
  mark: ReactNode;
  tip?: string;
  children: ReactNode;
}) {
  return (
    <li className="work-legend-key" data-tip={tip}>
      <span className="work-key-mark" aria-hidden="true">
        {mark}
      </span>
      <span>{children}</span>
    </li>
  );
}

/** The stages, as the bars fill with them: the key's group for bars. */
function StageKeys() {
  return (
    <>
      {STAGES.map((st) => (
        <KeyItem
          key={st}
          mark={<span className={`work-swatch stage-${slug(st)}`} />}
          tip={STAGE_MEANING[st]}
        >
          {STAGE_NAMES[st]}
        </KeyItem>
      ))}
    </>
  );
}

/**
 * A card's detail class at its size on screen: text drawn at full size or
 * not at all (`cardDetail`), and the bar dropped when there is no room.
 */
const cardClass = (w: number, h: number) => {
  const d = cardDetail(w, h);
  return `d-${d}${h < 18 ? " d-tiny" : ""}${d === "name" && h < 40 ? " no-bar" : ""}`;
};

/** The name on a project's card of items in no milestone. */
const looseName = (n: MapNode) =>
  `${n.items.length} ${n.items.length === 1 ? "item" : "items"} in no milestone`;

/**
 * The tip on a card of loose work: a decision's question and what waits
 * on it, or the names of a project's items in no milestone.
 */
function LooseTip({
  n,
  project,
  itemTitle,
  titleOf,
}: {
  n: MapNode;
  project?: string;
  itemTitle: (id: string) => string;
  titleOf: (id: string) => string;
}) {
  const shown = n.items.slice(0, 12);
  return (
    <span className="work-map-tip">
      <b>{n.decision ? n.title : looseName(n)}</b>
      <span>
        {n.decision
          ? `Your decision${project ? ` in ${project}` : ""}; no milestone holds it`
          : `${project ?? "A project"}'s open items that no milestone holds yet`}
      </span>
      {n.decision && !n.items.length && <span>Nothing waits on it yet</span>}
      {n.items.length > 0 && (
        <>
          {n.decision && <span>Waiting on it:</span>}
          <span className="work-map-tip-list">
            {shown.map((id) => (
              <span key={id}>
                {id} {itemTitle(id)}
              </span>
            ))}
            {n.items.length > shown.length && (
              <span>and {n.items.length - shown.length} more</span>
            )}
          </span>
        </>
      )}
      {n.unshaped && n.after.length > 0 && (
        <span>After {n.after.map(titleOf).join(" and ")}</span>
      )}
      <span>{n.decision ? "Choose to open it" : "Choose to list them"}</span>
    </span>
  );
}

/**
 * The milestone map: the milestones as a plan without dates. Lanes are
 * projects; across is the order the work can happen, in steps or in the
 * tokens left on the way; each bar starts once everything it waits on is
 * done. Curves are waits between milestones, thicker for more items
 * behind them; the critical path, the chain with no slack, is drawn in
 * the accent. Hovering a milestone lights what feeds it and what it
 * unblocks; choosing one opens it in the pane.
 */
function MilestoneMap({
  s,
  flight,
  unit,
  proposals,
  inScope,
  selected,
  onOpen,
  onItem,
  onWait,
  release,
  onRelease,
  shape,
  onShape,
}: {
  s: WorkSnapshot;
  flight: InFlight;
  unit: "steps" | "tokens";
  /** Proposed milestones too, placed by their waits and outlined dashed. */
  proposals: boolean;
  /** Project lanes, or a layered graph that crosses fewer waits. */
  shape: "lanes" | "graph";
  onShape: (shape: "lanes" | "graph") => void;
  /** Milestones outside the scope stay, dimmed, for context. */
  inScope?: (m: WorkMilestone) => boolean;
  selected?: string;
  onOpen: (milestone: string) => void;
  /** Opens an item in the pane: a decision in no milestone. */
  onItem: (id: string) => void;
  onWait: (from: string, to: string) => void;
  /** The release gate in focus. */
  release?: string;
  onRelease: (id: string | undefined) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  // The canvas's zoom (CS-683): 1 is the map as it was drawn before zoom.
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<string>();
  const [hoverFlag, setHoverFlag] = useState<string>();
  const map = useMemo(
    () => milestoneMapOf(s, flight, unit, release, proposals),
    [s, flight, unit, release, proposals],
  );
  // The graph places by steps whatever the axis: its layers are steps.
  const graphMap = useMemo(
    () =>
      unit === "steps"
        ? map
        : milestoneMapOf(s, flight, "steps", release, proposals),
    [map, s, flight, unit, release, proposals],
  );
  const msOf = useMemo(() => new Map(s.milestones.map((m) => [m.id, m])), [s]);
  const itemOf = useMemo(() => new Map(s.items.map((i) => [i.id, i])), [s]);
  const titleOf = (id: string) => msOf.get(id)?.title ?? mapEntityTitle(s, id);
  const itemTitle = (id: string) => itemOf.get(id)?.title ?? id;
  const over = (n: MapNode) =>
    n.tokens.spent !== undefined &&
    n.tokens.budget !== undefined &&
    n.tokens.spent > n.tokens.budget;
  // Lane names take less of a phone's width, so the cards keep most of it.
  const laneW = width < 480 ? 104 : width < 820 ? 130 : 170;
  const steps = unit === "steps" ? Math.max(1, map.total) : 0;
  // The plot at 100%; the zoom scales it, and the rows, never the text.
  const plotW =
    // (less the canvas's border, so 100% needs no sideways scroll)
    Math.max(width - laneW - 10, unit === "steps" ? steps * 210 : 640) * zoom;
  const span = Math.max(1e-9, map.total);
  const x = (v: number) => laneW + (v / span) * plotW;
  const PAD = 10 * zoom;
  // The flags along the top, each on the line where its release falls;
  // flags too close to share a row stack.
  const FLAG_ROW = 30;
  const placed = map.flags.filter((f) => f.at !== undefined);
  const flagW = (f: MapFlag) => 40 + 7.5 * f.version.length;
  const flagRow = new Map<string, number>();
  const rowEnds: number[] = [];
  for (const f of placed) {
    const at = x(f.at!);
    let r = rowEnds.findIndex((e) => e + 8 <= at);
    if (r < 0) {
      r = rowEnds.length;
      rowEnds.push(0);
    }
    rowEnds[r] = at + flagW(f);
    flagRow.set(f.id, r);
  }
  const FLAGS = placed.length ? rowEnds.length * FLAG_ROW + 6 : 0;
  const AXIS = FLAGS + (unit === "steps" ? 44 : 28);
  // Every card is a full row, so a project's items and decisions can name
  // themselves (CS-683).
  const rowOf = (_lane: string) => 84 * zoom;
  const laneTop = new Map<string, number>();
  const laneH = new Map<string, number>();
  let y0 = AXIS;
  for (const l of map.lanes) {
    laneTop.set(l.id, y0);
    laneH.set(l.id, l.subs * rowOf(l.id) + PAD * 2);
    y0 += laneH.get(l.id)!;
  }
  const height = y0;
  const nodeOf = new Map(map.nodes.map((n) => [n.id, n]));
  const top = (n: MapNode) =>
    laneTop.get(n.lane)! + PAD + n.sub * rowOf(n.lane);
  const nodeH = (_n: MapNode) => 72 * zoom;
  const left = (n: MapNode) => x(n.x0) + 4 * zoom;
  const right = (n: MapNode) =>
    Math.max(left(n) + 60 * zoom, x(n.x1) - (unit === "steps" ? 16 : 4) * zoom);
  // Each wait leaves and enters a bar at its own point down the bar's
  // edge, ordered by where the other end sits, so arrows don't merge.
  const portY = new Map<string, { out: number; in: number }>();
  for (const n of map.nodes) {
    const ins = map.edges
      .filter((e) => e.to === n.id && nodeOf.has(e.from))
      .sort((a, b) => top(nodeOf.get(a.from)!) - top(nodeOf.get(b.from)!));
    const outs = map.edges
      .filter((e) => e.from === n.id && nodeOf.has(e.to))
      .sort((a, b) => top(nodeOf.get(a.to)!) - top(nodeOf.get(b.to)!));
    const at = (k: number, of: number) =>
      top(n) + 4 + ((k + 1) * (nodeH(n) - 8)) / (of + 1);
    ins.forEach((e, k) => {
      const key = `${e.from}>${e.to}`;
      portY.set(key, { out: portY.get(key)?.out ?? 0, in: at(k, ins.length) });
    });
    outs.forEach((e, k) => {
      const key = `${e.from}>${e.to}`;
      portY.set(key, { in: portY.get(key)?.in ?? 0, out: at(k, outs.length) });
    });
  }
  const geom = (e: MapEdge) => {
    const a = nodeOf.get(e.from)!;
    const b = nodeOf.get(e.to)!;
    const p = portY.get(`${e.from}>${e.to}`)!;
    const x1 = right(a);
    const x2 = left(b) - 2;
    return { x1, y1: p.out, x2, y2: p.in };
  };
  // The release pointed at, or else the one in focus, lights what feeds it.
  const flagLit = useMemo(() => {
    const f =
      map.flags.find((x) => x.id === hoverFlag) ??
      (hover ? undefined : map.flags.find((x) => x.id === map.focus));
    return f && !f.unplaced ? new Set(f.feeds) : undefined;
  }, [map, hoverFlag, hover]);
  // What feeds the hovered milestone, and what it unblocks.
  const lit = useMemo(() => {
    if (flagLit) {
      return flagLit;
    }
    if (!hover) {
      return undefined;
    }
    const set = new Set([hover]);
    const walk = (id: string, up: boolean) => {
      for (const e of map.edges) {
        const next = up
          ? e.to === id
            ? e.from
            : ""
          : e.from === id
            ? e.to
            : "";
        if (next && !set.has(next)) {
          set.add(next);
          walk(next, up);
        }
      }
    };
    walk(hover, true);
    walk(hover, false);
    return set;
  }, [hover, map.edges, flagLit]);
  // Steps: a header over each column (what is in it); tokens: round ticks.
  const columns =
    unit === "steps"
      ? Array.from({ length: steps }, (_, i) => {
          const here = map.nodes.filter(
            (n) => !n.unshaped && !n.decision && Math.round(n.x0) === i,
          );
          const done = here.reduce((k, n) => k + n.counts.Done, 0);
          const all = here.reduce(
            (k, n) => k + STAGES.reduce((j, st) => j + n.counts[st], 0),
            0,
          );
          return { i, count: here.length, done, all };
        })
      : [];
  const ticks =
    unit === "steps"
      ? columns.map((c) => ({ v: c.i, label: "" }))
      : niceTicks(map.total).map((v) => ({ v, label: tokenText(v) }));
  if (!map.nodes.length) {
    return (
      <Typography variant="body-sm" color="textSecondary" render={<p />}>
        No open milestones.
      </Typography>
    );
  }
  const focusTitle = map.focus ? titleOf(map.focus) : undefined;
  const focusFlag = map.flags.find((f) => f.id === map.focus);
  const flagProps = {
    titleOf,
    onHover: setHoverFlag,
    onSelect: onRelease,
  };
  return (
    <div>
      <div className="work-map-focus">
        <Typography variant="caption-lg" color="textSecondary">
          Layout
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={shape}
          onChange={(_, v: "lanes" | "graph" | null) => v && onShape(v)}
          aria-label="Layout"
        >
          <ToggleButton
            value="lanes"
            render={<Button variant="outlined" size="small" />}
          >
            Project lanes
          </ToggleButton>
          <ToggleButton
            value="graph"
            render={<Button variant="outlined" size="small" />}
          >
            Fewest crossings
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      {map.gates.length > 0 && (
        <div className="work-map-focus">
          <Typography variant="caption-lg" color="textSecondary">
            Measure to
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={map.focus ?? "all"}
            onChange={(_, v: string | null) =>
              v && onRelease(v === "all" ? undefined : v)
            }
            aria-label="Measure to"
          >
            <ToggleButton
              value="all"
              render={<Button variant="outlined" size="small" />}
            >
              Everything
            </ToggleButton>
            {map.gates.map((g) => (
              <ToggleButton
                key={g.id}
                value={g.id}
                render={<Button variant="outlined" size="small" />}
              >
                <KindMark kind="release" named={false} />
                {g.title}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
      )}
      {map.done.length > 0 && (
        <p className="work-map-done">
          <span className="work-map-done-mark" aria-hidden="true" />
          Done:{" "}
          {map.done.map((d, i) => (
            <span key={d.id}>
              {i > 0 && ", "}
              <Link
                component="button"
                type="button"
                onClick={() => onOpen(d.id)}
              >
                {d.title}
              </Link>
            </span>
          ))}
        </p>
      )}
      <div className="work-key" role="group" aria-label="Key">
        {map.path.length > 0 && (
          <Typography
            variant="body-sm"
            render={<p />}
            className="work-map-path"
          >
            <span className="work-map-path-key" aria-hidden="true" />
            <span>
              <b>
                Critical path{focusTitle ? ` to ${focusTitle}` : ""},{" "}
                {unit === "steps"
                  ? `${map.end} ${map.end === 1 ? "step" : "steps"}`
                  : `${tokenText(map.end)} tokens`}
                :
              </b>{" "}
              {map.path.map(titleOf).join(" → ")}.{" "}
              <span className="work-map-path-note">
                A delay anywhere on it delays{" "}
                {focusTitle ?? "the last milestone"}; hover any milestone for
                its slack.
              </span>
            </span>
          </Typography>
        )}
        <div className="work-key-groups">
          <KeyGroup title="Cards">
            <KeyItem mark={<span className="work-map-key started" />}>
              Milestone under way: an item done or in progress
            </KeyItem>
            <KeyItem mark={<span className="work-map-key idle" />}>
              Milestone not started yet
            </KeyItem>
            {proposals && <ProposedKey as="li" />}
            {map.nodes.some((n) => n.loop) && (
              <KeyItem mark={<span className="work-map-key loop" />}>
                Milestones that wait round a loop
              </KeyItem>
            )}
            {shape === "lanes" && map.nodes.some((n) => n.decision) && (
              <KeyItem
                mark={
                  <span className="work-map-key decision">
                    <KindMark kind="decision" named={false} />
                  </span>
                }
              >
                Your decision in no milestone: its question, and what waits on
                it
              </KeyItem>
            )}
            {shape === "lanes" && map.nodes.some((n) => n.unshaped) && (
              <KeyItem mark={<span className="work-map-key unshaped" />}>
                A project's items in no milestone, by name
              </KeyItem>
            )}
          </KeyGroup>
          <KeyGroup
            title={
              unit === "tokens"
                ? "Bars: stages, or tokens spent"
                : "Bars: each item's stage"
            }
          >
            <StageKeys />
            {unit === "tokens" && (
              <KeyItem
                mark={<BudgetMeter budget={10} spent={6} />}
                tip="The track is the budget; past its mark, the overage runs on in red"
              >
                Tokens spent of the budget
              </KeyItem>
            )}
          </KeyGroup>
          <KeyGroup title="Waits">
            <KeyItem mark={<span className="work-map-key-line" />}>
              One waits on another, thicker for more items
            </KeyItem>
            <KeyItem mark={<span className="work-map-key-line direct" />}>
              Named by the milestone itself
            </KeyItem>
            <KeyItem mark={<span className="work-map-key-line critical" />}>
              On the critical path
            </KeyItem>
          </KeyGroup>
        </div>
      </div>
      <ReleaseStrip
        flags={map.flags.filter((f) => f.at === undefined)}
        label="Releases not placed yet"
        note={unplacedNote(map.flags)}
        release={map.focus}
        {...flagProps}
      />
      {focusFlag?.unplaced && (
        <Typography
          variant="caption-md"
          color="textSecondary"
          render={<p />}
          className="work-flag-focus-note"
        >
          {focusFlag.title} has no place yet, so nothing is set apart: its
          milestones aren't chosen.
        </Typography>
      )}
      {shape === "graph" ? (
        <MilestoneGraph
          s={s}
          map={graphMap}
          selected={selected}
          onOpen={onOpen}
          onWait={onWait}
          onRelease={onRelease}
          zoom={zoom}
          onZoom={setZoom}
        />
      ) : (
        <div ref={box}>
          <ZoomCanvas
            zoom={zoom}
            onZoom={setZoom}
            fixed={{ x: laneW, y: AXIS }}
            size={{ w: laneW + plotW + 8, h: height }}
            label="Milestone map, in project lanes"
          >
            <div
              className="work-map"
              style={{ width: laneW + plotW + 8, height }}
              onPointerLeave={() => setHover(undefined)}
            >
              {map.lanes.map((l, i) => (
                <div
                  key={l.id}
                  className={`work-map-lane${i % 2 ? " odd" : ""}${l.outside ? " outside" : ""}`}
                  style={{ top: laneTop.get(l.id), height: laneH.get(l.id) }}
                >
                  {l.outside && !map.lanes[i - 1]?.outside && (
                    <span className="work-map-band">
                      Not needed for {focusTitle}
                    </span>
                  )}
                  {laneH.get(l.id)! >= 24 ? (
                    <span
                      className="work-map-lane-name"
                      style={{
                        width: laneW - 12,
                        top: Math.min(10, laneH.get(l.id)! / 2 - 9),
                      }}
                    >
                      <LevelMark level="project" />
                      <span
                        className="work-outline-label"
                        style={{
                          WebkitLineClamp: Math.max(
                            1,
                            Math.min(
                              3,
                              Math.floor((laneH.get(l.id)! - 8) / 17),
                            ),
                          ),
                        }}
                      >
                        {l.title}
                      </span>
                    </span>
                  ) : (
                    // Too thin for its name at this zoom: named on hover.
                    <span
                      className="work-map-lane-name thin"
                      style={{ width: laneW - 12 }}
                      data-tip={l.title}
                      aria-label={l.title}
                    />
                  )}
                </div>
              ))}
              {ticks.map((t) => (
                <span
                  key={t.v}
                  className="work-map-tick"
                  style={{ left: x(t.v), top: FLAGS, height: height - FLAGS }}
                >
                  {t.label && (
                    <span className="work-map-tick-label">{t.label}</span>
                  )}
                </span>
              ))}
              {FLAGS > 0 && (
                <span
                  className="work-map-corner work-flag-corner"
                  style={{ width: laneW - 12 }}
                >
                  <KindMark kind="release" named={false} />
                  Releases
                </span>
              )}
              <span
                className="work-map-corner"
                style={{ width: laneW - 12, top: FLAGS + 8 }}
              >
                Project
              </span>
              {columns.map((c) => (
                <span
                  key={`h${c.i}`}
                  className="work-map-col"
                  style={{
                    left: x(c.i),
                    top: FLAGS + 2,
                    width: x(c.i + 1) - x(c.i),
                  }}
                  data-tip={`${
                    c.i === 0
                      ? "Now: these wait on no other milestone; those with an item done or in progress are filled"
                      : `Step ${c.i + 1}: starts once what it waits on in ${c.i === 1 ? "step 1" : `steps 1 to ${c.i}`} is done`
                  }; ${c.done} of ${c.all} items done`}
                >
                  {x(c.i + 1) - x(c.i) >= 26 && (
                    <span className="work-map-col-n">{c.i + 1}</span>
                  )}
                  {x(c.i + 1) - x(c.i) >= 120 && (
                    <span className="work-map-col-text">
                      {c.i === 0 && <b>Now</b>}
                      <span>
                        {`${c.count} ${c.count === 1 ? "milestone" : "milestones"}`}
                      </span>
                    </span>
                  )}
                </span>
              ))}
              <svg
                className="work-map-edges"
                width={laneW + plotW + 8}
                height={height}
                aria-hidden="true"
              >
                <defs>
                  <marker
                    id="work-map-arrow"
                    viewBox="0 0 8 8"
                    refX="7"
                    refY="4"
                    markerUnits="userSpaceOnUse"
                    markerWidth="9"
                    markerHeight="9"
                    orient="auto"
                  >
                    <path d="M0,0 L8,4 L0,8 Z" className="work-map-arrowhead" />
                  </marker>
                </defs>
                {map.edges.map((e) => {
                  const a = nodeOf.get(e.from);
                  const b = nodeOf.get(e.to);
                  if (
                    !a ||
                    !b ||
                    (e.soft && hover !== e.from && hover !== e.to)
                  ) {
                    return null;
                  }
                  const { x1, y1, x2, y2 } = geom(e);
                  const bend = Math.max(24, Math.abs(x2 - x1) / 2);
                  const on = !lit || (lit.has(e.from) && lit.has(e.to));
                  // The hovered milestone's own waits stand out from the chain beyond.
                  const near = !!hover && (e.from === hover || e.to === hover);
                  return (
                    <path
                      key={`${e.from}>${e.to}`}
                      d={`M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`}
                      className={`work-map-edge${e.critical ? " critical" : ""}${on ? "" : " dim"}${near ? " near" : ""}${e.items.length ? "" : " direct"}${e.soft ? " soft" : ""}`}
                      style={{
                        strokeWidth: 1 + Math.min(3, e.items.length / 2),
                      }}
                      markerEnd="url(#work-map-arrow)"
                    />
                  );
                })}
              </svg>
              {placed.map((f) => {
                const at = x(f.at!);
                const row = flagRow.get(f.id)!;
                const on = f.id === hoverFlag || f.id === map.focus;
                // Near the right edge, the flag flies the other way.
                const flip = at + flagW(f) > laneW + plotW + 8;
                return (
                  <Fragment key={f.id}>
                    <span
                      className={`work-flag-pole${on ? " on" : ""}`}
                      style={{
                        left: at,
                        top: row * FLAG_ROW + 4,
                        height: height - row * FLAG_ROW - 4,
                      }}
                      aria-hidden="true"
                    />
                    <ReleaseFlagButton
                      flag={f}
                      where={
                        unit === "steps"
                          ? betweenSteps(f.at!, steps)
                          : `${tokenText(f.at!)} tokens in`
                      }
                      selected={map.focus === f.id}
                      dim={!!hoverFlag && !on}
                      className={`on-grid${flip ? " flip" : ""}`}
                      style={{
                        top: row * FLAG_ROW + 4,
                        ...(flip
                          ? { left: at - flagW(f) + 1 }
                          : { left: at - 1 }),
                      }}
                      {...flagProps}
                    />
                  </Fragment>
                );
              })}
              {map.nodes.map((n) => {
                const m = msOf.get(n.id);
                const total = STAGES.reduce((k, st) => k + n.counts[st], 0);
                const out = inScope && m ? !inScope(m) : false;
                const dim =
                  (lit && !lit.has(n.id)) ||
                  out ||
                  (!!map.focus && n.lane.startsWith("outside-"));
                const waits = map.edges.filter((e) => e.to === n.id);
                return (
                  <Tooltip
                    key={n.id}
                    placement="top"
                    title={
                      n.decision || n.unshaped ? (
                        <LooseTip
                          n={n}
                          project={
                            s.projects.find(
                              (p) =>
                                p.id ===
                                (itemOf.get(n.id)?.project ??
                                  n.lane.replace(/^outside-/, "")),
                            )?.title
                          }
                          itemTitle={itemTitle}
                          titleOf={titleOf}
                        />
                      ) : (
                        <span className="work-map-tip">
                          <b>{n.title}</b>
                          {n.proposed && <span>{PROPOSED_TIP}</span>}
                          <span>
                            {msOf.get(n.id)?.project &&
                              s.projects.find(
                                (p) => p.id === msOf.get(n.id)?.project,
                              )?.title}
                          </span>
                          <span>
                            {n.counts.Done} of {total} done
                            {STAGES.filter(
                              (st) => st !== "Done" && n.counts[st],
                            )
                              .map(
                                (st) =>
                                  `, ${n.counts[st]} ${STAGE_NAMES[st].toLowerCase()}`,
                              )
                              .join("")}
                          </span>
                          <span>
                            {waits.length
                              ? `After ${waits.map((w) => `${titleOf(w.from)} (${w.items.length} ${w.items.length === 1 ? "item" : "items"})`).join(", ")}`
                              : "Waits on no other milestone"}
                          </span>
                          <span>
                            {Number.isNaN(n.slack)
                              ? `Not needed for ${focusTitle}`
                              : n.critical
                                ? `On the critical path: any delay here delays ${focusTitle ?? "the end"}`
                                : `Can slip ${unit === "steps" ? `${n.slack} ${n.slack === 1 ? "step" : "steps"}` : `${tokenText(n.slack)} tokens`} before it delays ${focusTitle ?? "the last milestone"}`}
                          </span>
                          <span>
                            {n.tokens.estimated
                              ? `${tokenText(n.tokens.left)} tokens left, from ${n.tokens.estimated} of ${n.tokens.open} open items' estimates`
                              : n.tokens.appetite
                                ? `Appetite ${tokenText(n.tokens.appetite)} tokens; no item estimates yet`
                                : "No token estimates yet"}
                          </span>
                          {n.tokens.budget !== undefined && (
                            <span>
                              Budget {tokenText(n.tokens.budget)} tokens (
                              {n.tokens.appetite !== undefined
                                ? "its appetite"
                                : "its items' estimates together"}
                              );{" "}
                              {n.tokens.spent === undefined
                                ? "spent: not recorded until HITLd's ledger"
                                : over(n)
                                  ? `spent ${tokenText(n.tokens.spent)}, ${Math.round((100 * (n.tokens.spent - n.tokens.budget)) / n.tokens.budget)}% over`
                                  : `spent ${tokenText(n.tokens.spent)}, ${Math.round((100 * n.tokens.spent) / n.tokens.budget)}% of it`}
                            </span>
                          )}
                          {n.decisions > 0 && (
                            <span>
                              {n.decisions} of your decisions hold it up
                            </span>
                          )}
                          {n.outside > 0 && (
                            <span>
                              {n.outside} {n.outside === 1 ? "wait" : "waits"}{" "}
                              on other parties hold it up
                            </span>
                          )}
                          {n.loop && (
                            <span>
                              Waits round a loop with{" "}
                              {n.loop
                                .filter((id) => id !== n.id)
                                .map(titleOf)
                                .join(", ")}
                            </span>
                          )}
                          {m && m.to_shape.length > 0 && (
                            <span>
                              To shape:{" "}
                              {m.to_shape
                                .map((k) => SHAPE_NAMES[k] ?? k)
                                .join(", ")}
                            </span>
                          )}
                        </span>
                      )
                    }
                  >
                    <button
                      type="button"
                      className={`work-map-node${n.decision ? " decision" : n.unshaped ? " unshaped" : n.proposed ? " proposed" : n.started ? " started" : " idle"}${unit === "tokens" && over(n) ? " over" : ""}${n.critical ? " critical" : ""}${n.id === selected ? " selected" : ""}${dim ? " dim" : ""}${n.loop ? " loop" : ""} ${cardClass(right(n) - left(n), nodeH(n))}`}
                      style={{
                        left: left(n),
                        top: top(n),
                        width: right(n) - left(n),
                        height: nodeH(n),
                      }}
                      aria-label={
                        n.decision
                          ? `Your decision: ${n.title}${n.items.length ? `; ${n.items.length} waiting` : ""}`
                          : n.unshaped
                            ? `${looseName(n)}: ${n.items.map(itemTitle).join(", ")}`
                            : undefined
                      }
                      onPointerEnter={() => setHover(n.id)}
                      onFocus={() => setHover(n.id)}
                      onBlur={() => setHover(undefined)}
                      onClick={() => (n.decision ? onItem(n.id) : onOpen(n.id))}
                    >
                      <span className="work-map-node-title">
                        {n.decision ? (
                          <KindMark kind="decision" />
                        ) : (
                          <LevelMark
                            level={n.unshaped ? "item" : "milestone"}
                          />
                        )}
                        <span className="work-outline-label">
                          {n.proposed && <ProposedLabel />}
                          {n.unshaped ? looseName(n) : n.title}
                        </span>
                        {!n.decision && !n.unshaped && <HoldBadges n={n} />}
                      </span>
                      {n.decision || n.unshaped ? (
                        <span className="work-map-node-names">
                          {n.decision
                            ? n.items.length
                              ? `${n.items.length} waiting: ${n.items.map(itemTitle).join(" · ")}`
                              : "Nothing waits on it yet"
                            : n.items.map(itemTitle).join(" · ")}
                        </span>
                      ) : unit === "tokens" && n.tokens.budget !== undefined ? (
                        <BudgetMeter
                          budget={n.tokens.budget}
                          spent={n.tokens.spent}
                        />
                      ) : (
                        <StageBar
                          counts={barCounts(n.counts, n.proposed)}
                          className="work-map-bar"
                        />
                      )}
                      {!n.decision && !n.unshaped && (
                        <span
                          className={`work-map-node-meta${over(n) ? " over" : ""}`}
                        >
                          {unit === "tokens" &&
                          n.tokens.budget !== undefined ? (
                            n.tokens.spent === undefined ? (
                              `${tokenText(n.tokens.budget)} budget · spent not recorded`
                            ) : (
                              `${tokenText(n.tokens.spent)} of ${tokenText(n.tokens.budget)}${over(n) ? ` · ${Math.round((100 * (n.tokens.spent - n.tokens.budget)) / n.tokens.budget)}% over` : ""}`
                            )
                          ) : (
                            <>
                              {n.counts["In flight"] > 0 &&
                                `${n.counts["In flight"]} in progress · `}
                              {n.counts.Done} of {total} done
                              {unit === "tokens" && n.tokens.left > 0
                                ? ` · ${tokenText(n.tokens.left)} tokens`
                                : ""}
                              {n.after.length > 0 &&
                                ` · after ${n.after.map(titleOf).join(" and ")}`}
                            </>
                          )}
                        </span>
                      )}
                    </button>
                  </Tooltip>
                );
              })}
              {hover &&
                map.edges
                  .filter(
                    (e) =>
                      (e.from === hover || e.to === hover) &&
                      nodeOf.has(e.from) &&
                      nodeOf.has(e.to),
                  )
                  .map((e) => {
                    const { x1, y1, x2, y2 } = geom(e);
                    return (
                      <span
                        key={`c${e.from}>${e.to}`}
                        className="work-map-count"
                        style={{ left: (x1 + x2) / 2, top: (y1 + y2) / 2 }}
                      >
                        {e.items.length
                          ? `${e.items.length} ${e.items.length === 1 ? "item" : "items"}`
                          : "named"}
                      </span>
                    );
                  })}
              {/* The waits, as choosable spots at each arrow's head, while the
                cards are big enough to aim between. */}
              {map.edges.map((e) => {
                const b = nodeOf.get(e.to);
                const a = nodeOf.get(e.from);
                if (
                  !a ||
                  !b ||
                  (e.soft && hover !== e.from && hover !== e.to) ||
                  nodeH(b) < 40
                ) {
                  return null;
                }
                return (
                  <button
                    key={`w${e.from}>${e.to}`}
                    type="button"
                    className="work-map-wait"
                    style={{ left: left(b) - 16, top: geom(e).y2 - 8 }}
                    data-tip={`${titleOf(e.to)} waits on ${titleOf(e.from)}: ${e.items.length} ${e.items.length === 1 ? "item" : "items"}`}
                    aria-label={`${titleOf(e.to)} waits on ${titleOf(e.from)}: list the items`}
                    onClick={() => onWait(e.from, e.to)}
                  />
                );
              })}
            </div>
          </ZoomCanvas>
        </div>
      )}
    </div>
  );
}

/**
 * Tokens spent against a budget (a bullet chart): the track is the
 * budget, the fill what has been spent, and past the budget mark the
 * overage runs on in red. With nothing recorded yet, only the budget.
 */
function BudgetMeter({ budget, spent }: { budget: number; spent?: number }) {
  const top = Math.max(budget, spent ?? 0) || 1;
  const within = Math.min(spent ?? 0, budget);
  const over = (spent ?? 0) - budget;
  return (
    <span
      className={`work-meter${over > 0 ? " over" : ""}`}
      role="img"
      aria-label={
        spent === undefined
          ? `Budget ${tokenText(budget)} tokens; spent not recorded`
          : `${tokenText(spent)} of ${tokenText(budget)} tokens spent${over > 0 ? `, ${tokenText(over)} over` : ""}`
      }
    >
      <span
        className="work-meter-budget"
        style={{ width: `${(100 * budget) / top}%` }}
      />
      {spent !== undefined && (
        <span
          className="work-meter-fill"
          style={{ width: `${(100 * within) / top}%` }}
        />
      )}
      {over > 0 && (
        <span
          className="work-meter-over"
          style={{
            left: `${(100 * budget) / top}%`,
            width: `${(100 * over) / top}%`,
          }}
        />
      )}
      <span
        className="work-meter-mark"
        style={{ left: `${(100 * budget) / top}%` }}
      />
    </span>
  );
}

/**
 * The milestones as a layered graph (d3-dag's Sugiyama layout, MIT): one
 * column per step, the rows ordered to cross as few waits as possible,
 * and each wait routed through the columns between its ends. It trades
 * the project lanes for fewer crossings; each milestone names its
 * project instead. Work no milestone holds is left out.
 */
function MilestoneGraph({
  s,
  map,
  selected,
  onOpen,
  onWait,
  onRelease,
  zoom,
  onZoom,
}: {
  s: WorkSnapshot;
  map: MilestoneMapData;
  selected?: string;
  onOpen: (milestone: string) => void;
  onWait: (from: string, to: string) => void;
  onRelease: (id: string | undefined) => void;
  /** The canvas's zoom, shared with the lanes. */
  zoom: number;
  onZoom: (zoom: number) => void;
}) {
  const [hover, setHover] = useState<string>();
  const [hoverFlag, setHoverFlag] = useState<string>();
  const msOf = useMemo(() => new Map(s.milestones.map((m) => [m.id, m])), [s]);
  const projectTitle = (id: string) => {
    const m = msOf.get(id);
    return s.projects.find((p) => p.id === m?.project)?.title ?? "";
  };
  const NODE_W = 216;
  const NODE_H = 80;
  const box = useRef<HTMLDivElement>(null);
  const avail = useWidth(box);
  const laid = useMemo(() => {
    const real = map.nodes.filter((n) => !n.unshaped && !n.decision);
    const ids = new Set(real.map((n) => n.id));
    const hard = map.edges.filter(
      (e) => !e.soft && ids.has(e.from) && ids.has(e.to),
    );
    // Milestones linked by waits, as groups.
    const root = new Map(real.map((n) => [n.id, n.id]));
    const find = (id: string): string => {
      const r = root.get(id)!;
      return r === id ? id : find(r);
    };
    for (const e of hard) {
      root.set(find(e.from), find(e.to));
    }
    const groups = new Map<string, MapNode[]>();
    for (const n of real) {
      const r = find(n.id);
      groups.set(r, [...(groups.get(r) ?? []), n]);
    }
    const waitsIn = (g: MapNode[]) => {
      const inG = new Set(g.map((n) => n.id));
      return hard.filter((e) => inG.has(e.from)).length;
    };
    // The most entangled first: the critical path's group, then the
    // biggest, then the one with the most waits.
    const linked = [...groups.values()]
      .filter((g) => g.length > 1)
      .sort(
        (a, b) =>
          Number(b.some((n) => n.critical)) -
            Number(a.some((n) => n.critical)) ||
          b.length - a.length ||
          waitsIn(b) - waitsIn(a) ||
          a[0]!.id.localeCompare(b[0]!.id),
      );
    const alone = [...groups.values()]
      .filter((g) => g.length === 1)
      .map((g) => g[0]!)
      .sort(
        (a, b) =>
          projectTitle(a.id).localeCompare(projectTitle(b.id)) ||
          a.title.localeCompare(b.title),
      );
    // A step's column, the same in every group, so steps line up.
    const COL = NODE_W + 48;
    const center = (step: number) => step * COL + NODE_W / 2;
    const GAP = 40;
    const nodes: Array<{ n: MapNode; x: number; y: number }> = [];
    const links: Array<{
      e: MapEdge;
      points: Array<readonly [number, number]>;
    }> = [];
    const dividers: number[] = [];
    let top = 0;
    try {
      for (const group of linked) {
        const g = dagGraph<MapNode, MapEdge>();
        const byId = new Map<string, MutGraphNode<MapNode, MapEdge>>();
        for (const n of group) {
          byId.set(n.id, g.node(n));
        }
        for (const e of hard) {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (a && b) {
            g.link(a, b, e);
          }
        }
        // Layers run down in d3-dag; here they run across, so the axes swap.
        const { width: tall } = sugiyama()
          .layering(
            layeringSimplex().rank(({ data }: { data: MapNode }) =>
              Math.round(data.x0),
            ),
          )
          .decross(decrossTwoLayer())
          .coord(coordSimplex())
          .nodeSize(() => [NODE_H, NODE_W] as const)
          .gap([14, 48])(g);
        // Each of the group's layers holds one step; place it at that
        // step's column, and the routes between layers in proportion.
        const stepOf = new Map<number, number>();
        for (const n of g.nodes()) {
          stepOf.set(n.y, Math.round(n.data.x0));
        }
        const layers = [...stepOf.keys()].sort((a, b) => a - b);
        const across = (ly: number) => {
          const i = layers.findIndex((l) => l >= ly);
          if (i <= 0) {
            return center(stepOf.get(layers[0]!)!) + (ly - layers[0]!);
          }
          const [l0, l1] = [layers[i - 1]!, layers[i]!];
          const [x0, x1] = [center(stepOf.get(l0)!), center(stepOf.get(l1)!)];
          return x0 + ((x1 - x0) * (ly - l0)) / (l1 - l0);
        };
        const at = top;
        if (nodes.length) {
          dividers.push(at - GAP / 2);
        }
        for (const n of g.nodes()) {
          nodes.push({
            n: n.data,
            x: across(n.y) - NODE_W / 2,
            y: at + n.x - NODE_H / 2,
          });
        }
        for (const l of g.links()) {
          links.push({
            e: l.data,
            points: l.points.map(([px, py]) => [across(py), at + px] as const),
          });
        }
        top += tall + GAP;
      }
    } catch (error) {
      return {
        col: COL,
        width: 0,
        height: 0,
        nodes: [],
        links: [],
        dividers: [],
        aloneAt: undefined,
        error: String(error),
      };
    }
    // Milestones that wait on nothing and that nothing waits on: a grid
    // of their own below, by project; across means nothing for them.
    let aloneAt: number | undefined;
    if (alone.length) {
      aloneAt = linked.length ? top : 0;
      // As many to a row as the view shows, so the grid needn't scroll.
      const perRow = Math.max(
        1,
        Math.floor((Math.max(avail, NODE_W) - 16 + 14) / (NODE_W + 14)),
      );
      const y0 = aloneAt + 36;
      alone.forEach((n, i) =>
        nodes.push({
          n,
          x: (i % perRow) * (NODE_W + 14),
          y: y0 + Math.floor(i / perRow) * (NODE_H + 14),
        }),
      );
      top = y0 + Math.ceil(alone.length / perRow) * (NODE_H + 14);
    } else if (linked.length) {
      top -= GAP;
    }
    const width = nodes.reduce((w, p) => Math.max(w, p.x + NODE_W), 0);
    return {
      col: COL,
      width,
      height: top,
      nodes,
      links,
      dividers,
      aloneAt,
      aloneCount: alone.length,
      error: undefined,
    };
    // projectTitle reads the snapshot, which `map` follows.
  }, [map, avail]);
  // The release pointed at, or else the one in focus, lights what feeds it.
  const flagLit = useMemo(() => {
    const f =
      map.flags.find((x) => x.id === hoverFlag) ??
      (hover ? undefined : map.flags.find((x) => x.id === map.focus));
    return f && !f.unplaced ? new Set(f.feeds) : undefined;
  }, [map, hoverFlag, hover]);
  const lit = useMemo(() => {
    if (flagLit) {
      return flagLit;
    }
    if (!hover) {
      return undefined;
    }
    const set = new Set([hover]);
    const walk = (id: string, up: boolean) => {
      for (const { e } of laid.links) {
        const next = up
          ? e.to === id
            ? e.from
            : ""
          : e.from === id
            ? e.to
            : "";
        if (next && !set.has(next)) {
          set.add(next);
          walk(next, up);
        }
      }
    };
    walk(hover, true);
    walk(hover, false);
    return set;
  }, [hover, laid.links, flagLit]);
  if (laid.error) {
    return (
      <Alert severity="warning">
        The layered layout couldn't place these milestones ({laid.error}).
      </Alert>
    );
  }
  // A smooth path through the routed points, flowing left to right.
  const pathOf = (pts: readonly (readonly [number, number])[]) =>
    pts
      .map(([x, y], i) => {
        if (!i) {
          return `M${x},${y}`;
        }
        const [px, py] = pts[i - 1]!;
        const dx = (x - px) / 2;
        return `C${px + dx},${py} ${x - dx},${y} ${x},${y}`;
      })
      .join(" ");
  // Flags along the top, each on the gap after the last step its
  // release needs; the steps' columns are the same in every group.
  const placed = map.flags.filter((f) => f.at !== undefined);
  const flagW = (f: MapFlag) => 40 + 7.5 * f.version.length;
  // Laid out at 100%; the zoom scales where things sit, never the text.
  const z = zoom;
  const gapAt = (step: number) =>
    (step * laid.col - (laid.col - NODE_W) / 2) * z;
  const FLAG_ROW = 30;
  const flagRow = new Map<string, number>();
  const rowEnds: number[] = [];
  for (const f of placed) {
    let r = rowEnds.findIndex((e) => e + 8 <= gapAt(f.at!));
    if (r < 0) {
      r = rowEnds.length;
      rowEnds.push(-Infinity);
    }
    rowEnds[r] = gapAt(f.at!) + flagW(f);
    flagRow.set(f.id, r);
  }
  const FLAGS = placed.length ? rowEnds.length * FLAG_ROW + 10 : 0;
  // The poles stop where the milestones that wait on nothing begin.
  const poleEnd = (laid.aloneAt ?? laid.height) * z;
  const PAD = 8;
  const W = Math.max(laid.width * z, ...rowEnds.map((e) => e + 4)) + PAD * 2;
  const H = laid.height * z + PAD * 2 + FLAGS;
  const nodeW = NODE_W * z;
  const nodeH = NODE_H * z;
  const titleOf = (id: string) => msOf.get(id)?.title ?? mapEntityTitle(s, id);
  const steps = Math.max(1, ...map.nodes.map((n) => Math.round(n.x1)));
  return (
    <div ref={box}>
      <ZoomCanvas
        zoom={zoom}
        onZoom={onZoom}
        fixed={{ x: PAD, y: PAD + FLAGS }}
        size={{ w: W, h: H }}
        label="Milestone map, with the fewest crossings"
      >
        <div
          className="work-map work-graph"
          style={{ width: W, height: H }}
          onPointerLeave={() => setHover(undefined)}
        >
          {placed.map((f) => {
            const at = gapAt(f.at!) + PAD;
            const row = flagRow.get(f.id)!;
            const on = f.id === hoverFlag || f.id === map.focus;
            return (
              <Fragment key={f.id}>
                <span
                  className={`work-flag-pole${on ? " on" : ""}`}
                  style={{
                    left: at,
                    top: row * FLAG_ROW + 4,
                    height: FLAGS + PAD + poleEnd - row * FLAG_ROW - 4,
                  }}
                  aria-hidden="true"
                />
                <ReleaseFlagButton
                  flag={f}
                  titleOf={titleOf}
                  where={betweenSteps(f.at!, steps)}
                  selected={map.focus === f.id}
                  dim={!!hoverFlag && !on}
                  className="on-grid"
                  style={{ top: row * FLAG_ROW + 4, left: at - 1 }}
                  onHover={setHoverFlag}
                  onSelect={onRelease}
                />
              </Fragment>
            );
          })}
          <svg
            className="work-map-edges"
            width={W}
            height={H}
            aria-hidden="true"
          >
            <defs>
              <marker
                id="work-graph-arrow"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerUnits="userSpaceOnUse"
                markerWidth="9"
                markerHeight="9"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" className="work-map-arrowhead" />
              </marker>
            </defs>
            <g transform={`translate(${PAD},${PAD + FLAGS})`}>
              {laid.dividers.map((y) => (
                <line
                  key={y}
                  x1={0}
                  x2={laid.width * z}
                  y1={y * z}
                  y2={y * z}
                  className="work-graph-divider"
                />
              ))}
              {laid.links.map(({ e, points }) => {
                const on = !lit || (lit.has(e.from) && lit.has(e.to));
                const near = !!hover && (e.from === hover || e.to === hover);
                // Ends at the bars' edges, not their centers.
                const pts = points.map(
                  ([x, y]) => [x * z, y * z] as [number, number],
                );
                pts[0]![0] += nodeW / 2;
                pts[pts.length - 1]![0] -= nodeW / 2 + 2;
                return (
                  <path
                    key={`${e.from}>${e.to}`}
                    d={pathOf(pts)}
                    className={`work-map-edge${e.critical ? " critical" : ""}${on ? "" : " dim"}${near ? " near" : ""}${e.items.length ? "" : " direct"}`}
                    style={{ strokeWidth: 1 + Math.min(3, e.items.length / 2) }}
                    markerEnd="url(#work-graph-arrow)"
                    onClick={() => onWait(e.from, e.to)}
                  />
                );
              })}
            </g>
          </svg>
          {laid.aloneAt !== undefined && (
            <Typography
              variant="caption-md"
              color="textSecondary"
              render={<p />}
              className="work-graph-section"
              style={{ top: laid.aloneAt * z + PAD + FLAGS, left: PAD }}
            >
              {laid.aloneCount === 1
                ? "One milestone waits on nothing, and nothing waits on it"
                : `${laid.aloneCount} milestones wait on nothing, and nothing waits on them`}
            </Typography>
          )}
          {laid.nodes.map(({ n, x, y }) => {
            const total = STAGES.reduce((k, st) => k + n.counts[st], 0);
            const dim = lit && !lit.has(n.id);
            return (
              <button
                key={n.id}
                type="button"
                className={`work-map-node${n.proposed ? " proposed" : n.started ? " started" : " idle"}${n.critical ? " critical" : ""}${n.id === selected ? " selected" : ""}${dim ? " dim" : ""}${n.loop ? " loop" : ""} ${cardClass(nodeW, nodeH)}`}
                style={{
                  left: x * z + PAD,
                  top: y * z + PAD + FLAGS,
                  width: nodeW,
                  height: nodeH,
                }}
                title={`${n.proposed ? "Proposed: " : ""}${n.title}${projectTitle(n.id) ? ` (${projectTitle(n.id)})` : ""}`}
                onPointerEnter={() => setHover(n.id)}
                onFocus={() => setHover(n.id)}
                onBlur={() => setHover(undefined)}
                onClick={() => onOpen(n.id)}
              >
                <span className="work-map-node-title">
                  <LevelMark level="milestone" />
                  <span className="work-outline-label">
                    {n.proposed && <ProposedLabel />}
                    {n.title}
                  </span>
                  <HoldBadges n={n} />
                </span>
                <StageBar
                  counts={barCounts(n.counts, n.proposed)}
                  className="work-map-bar"
                />
                <span className="work-map-node-meta">
                  {`${n.counts["In flight"] ? `${n.counts["In flight"]} in progress · ` : ""}${n.counts.Done} of ${total} done · ${projectTitle(n.id)}`}
                </span>
              </button>
            );
          })}
        </div>
      </ZoomCanvas>
    </div>
  );
}

/**
 * What holds a milestone up besides its work, apart from its progress bar:
 * the owner's open decisions, and open waits on other parties.
 */
function HoldBadges({ n }: { n: MapNode }) {
  return (
    <>
      {n.decisions > 0 && (
        <span
          className="work-count-badge work-hold k-decision"
          title={`${n.decisions} of your ${n.decisions === 1 ? "decision holds" : "decisions hold"} it up`}
          aria-label={`${n.decisions} of your decisions`}
        >
          <KindMark kind="decision" named={false} />
          {n.decisions}
        </span>
      )}
      {n.outside > 0 && (
        <span
          className="work-count-badge work-hold outside k-external"
          title={`${n.outside} ${n.outside === 1 ? "wait" : "waits"} on other parties hold it up`}
          aria-label={`${n.outside} outside ${n.outside === 1 ? "wait" : "waits"}`}
        >
          <KindMark kind="external" named={false} />
          {n.outside}
        </span>
      )}
    </>
  );
}

/** About five round values from zero to the top, for a token axis. */
function niceTicks(top: number): number[] {
  if (top <= 0) {
    return [0];
  }
  const raw = top / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((k) => k * mag).find((v) => v >= raw)!;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) {
    out.push(v);
  }
  return out;
}

// ------------------------------------------------------------ release flags

const andList = (xs: readonly string[]) =>
  xs.length < 2
    ? xs.join("")
    : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;

/** Why a release has no place yet, in a sentence. */
function unplacedText(f: ReleaseFlag, titleOf: (id: string) => string): string {
  const u = f.unplaced!;
  const why = [
    ...u.decisions.map((d) => `your decision ${d}, “${titleOf(d)}”`),
    ...u.releases.map((r) => `${titleOf(r)}, which has no place yet either`),
  ];
  if (!why.length) {
    return "Not placed yet: it names no milestone.";
  }
  const text = `Not placed yet: its milestones aren't chosen. It waits on ${andList(why)}`;
  return /[?”]$/.test(text) ? text : `${text}.`;
}

/**
 * A release's flag, labeled with its version. Pointing at it or focusing
 * it lights the milestones that feed it; choosing it measures to it (the
 * release focus), and choosing it again lets go.
 */
function ReleaseFlagButton({
  flag,
  titleOf,
  where,
  steps = true,
  selected,
  dim,
  onHover,
  onSelect,
  style,
  className,
}: {
  flag: ReleaseFlag & { progress?: MapFlag["progress"] };
  titleOf: (id: string) => string;
  /** Where the view places it, in words ("between steps 2 and 3"). */
  where?: string;
  /** False in a view with no steps: it names what feeds it, not where it falls. */
  steps?: boolean;
  selected: boolean;
  dim?: boolean;
  onHover: (id: string | undefined) => void;
  onSelect: (id: string | undefined) => void;
  style?: CSSProperties;
  className?: string;
}) {
  const p = flag.progress;
  const feeds = `${flag.feeds.length} ${flag.feeds.length === 1 ? "milestone feeds" : "milestones feed"} it`;
  return (
    <Tooltip
      placement="top"
      title={
        <span className="work-map-tip">
          <b>{flag.title}</b>
          {flag.proposed && (
            <span>
              Proposed: not committed yet; the owner commits it or not
            </span>
          )}
          {flag.unplaced ? (
            <span>{unplacedText(flag, titleOf)}</span>
          ) : !steps ? (
            <span>
              {feeds}: {andList(flag.feeds.map(titleOf))}
            </span>
          ) : flag.at === undefined ? (
            <span>The milestones that place it are outside this view</span>
          ) : (
            <>
              <span>
                After {andList(flag.last.map(titleOf))}
                {where ? `, ${where}` : ""}
              </span>
              <span>{feeds}</span>
            </>
          )}
          {p && !flag.unplaced && (
            <span>
              {p.milestonesDone} of {p.milestones} milestones and {p.itemsDone}{" "}
              of {p.items} of their items done
              {p.tokensLeft > 0 && `; ${tokenText(p.tokensLeft)} tokens left`}
            </span>
          )}
          {p && p.decisions > 0 && !flag.unplaced && (
            <span>{p.decisions} of your decisions hold it up</span>
          )}
          <span>
            {selected
              ? "Choose it again to measure to everything"
              : "Choose it to measure to it"}
          </span>
        </span>
      }
    >
      <button
        type="button"
        className={`work-flag${flag.unplaced ? " unplaced" : ""}${flag.proposed ? " proposed" : ""}${selected ? " selected" : ""}${dim ? " dim" : ""}${className ? ` ${className}` : ""}`}
        style={style}
        aria-pressed={selected}
        aria-label={`${flag.proposed ? "Proposed release" : "Release"} ${flag.version}${flag.unplaced ? ", not placed yet" : ""}`}
        onPointerEnter={() => onHover(flag.id)}
        onPointerLeave={() => onHover(undefined)}
        onFocus={() => onHover(flag.id)}
        onBlur={() => onHover(undefined)}
        onClick={() => onSelect(selected ? undefined : flag.id)}
      >
        <KindMark kind="release" named={false} />
        <span className="work-flag-label">{flag.version}</span>
      </button>
    </Tooltip>
  );
}

/**
 * A row of flags apart from the grid: the releases with no place yet, or,
 * in a view with no steps, every release.
 */
function ReleaseStrip({
  flags,
  label,
  note,
  ...common
}: {
  flags: readonly (ReleaseFlag & { progress?: MapFlag["progress"] })[];
  label: string;
  note?: string;
  titleOf: (id: string) => string;
  steps?: boolean;
  release?: string;
  onHover: (id: string | undefined) => void;
  onSelect: (id: string | undefined) => void;
}) {
  if (!flags.length) {
    return null;
  }
  return (
    <div className="work-flag-strip" role="group" aria-label={label}>
      <Typography variant="caption-lg" color="textSecondary">
        {label}
      </Typography>
      {flags.map((f) => (
        <ReleaseFlagButton
          key={f.id}
          flag={f}
          titleOf={common.titleOf}
          steps={common.steps}
          selected={common.release === f.id}
          onHover={common.onHover}
          onSelect={common.onSelect}
        />
      ))}
      {note && (
        <Typography
          variant="caption-md"
          color="textSecondary"
          className="work-flag-note"
        >
          {note}
        </Typography>
      )}
    </div>
  );
}

/** What the strip of unplaced flags says under them. */
const unplacedNote = (flags: readonly ReleaseFlag[]) => {
  const off = flags.filter((f) => f.at === undefined);
  const one = off.length === 1;
  return off.every((f) => f.unplaced)
    ? `${one ? "Its" : "Their"} milestones aren't chosen yet: point at ${one ? "it" : "one"} for what ${one ? "it waits" : "each waits"} on.`
    : `Point at ${one ? "it" : "one"} for why.`;
};

/** Where a flag falls, in words, for a view laid out in steps. */
const betweenSteps = (at: number, steps: number) =>
  at >= steps
    ? `after step ${at}, the last`
    : `between steps ${at} and ${at + 1}`;

// ------------------------------------------------------------ the roadmap

/**
 * The roadmap's list: milestones (human-in-the-lead's milestone graph) in
 * the order their work can happen, step by step from the top, a line each. Those that wait on each other are boxed together with the
 * fewest waits that tie them named, so the loop can be read and, if
 * wanted, broken. A milestone's outcome, shaping and waits are in its
 * pane.
 */
function Roadmap({
  s,
  flight,
  proposals,
  inScope,
  selected,
  onOpen,
  onWait,
  release,
  onRelease,
}: {
  s: WorkSnapshot;
  flight: InFlight;
  /** Proposed milestones too, outlined dashed. */
  proposals: boolean;
  /** The release in focus: what feeds it stands out. */
  release?: string;
  onRelease: (id: string | undefined) => void;
  /** Only the milestones in the scope. */
  inScope?: (m: WorkMilestone) => boolean;
  selected?: string;
  /** Opens a milestone in the pane. */
  onOpen: (milestone: string) => void;
  onWait: (from: string, to: string) => void;
}) {
  const all = useMemo(
    () => milestoneRoadmapOf(s, s.items, flight, proposals),
    [s, flight, proposals],
  );
  const msOf = useMemo(() => new Map(s.milestones.map((m) => [m.id, m])), [s]);
  const itemOf = useMemo(() => new Map(s.items.map((i) => [i.id, i])), [s]);
  // Release items are flags between the steps, not lines.
  const rows = all.filter((r) => {
    if (isReleaseItem(itemOf.get(r.id))) {
      return false;
    }
    const m = msOf.get(r.id);
    return !inScope || (!!m && inScope(m));
  });
  const flags = useMemo(() => {
    const stepOf = new Map(rows.map((r) => [r.id, r.step]));
    return releaseFlagsOf(s, all, (id) => stepOf.get(id));
  }, [s, all, rows]);
  const [hoverFlag, setHoverFlag] = useState<string>();
  // What the flag pointed at, or else the release in focus, is fed by.
  const lit = useMemo(() => {
    const f =
      flags.find((x) => x.id === hoverFlag) ??
      flags.find((x) => x.id === release && !x.unplaced);
    return f && new Set(f.feeds);
  }, [flags, hoverFlag, release]);
  const lastStep = Math.max(0, ...rows.map((r) => r.step));
  const flagProps = {
    titleOf: (id: string) => msOf.get(id)?.title ?? itemOf.get(id)?.title ?? id,
    onHover: setHoverFlag,
    onSelect: onRelease,
  };
  const title = (id: string) => msOf.get(id)?.title ?? id;
  const steps = [...new Set(rows.map((r) => r.step))].sort((a, b) => a - b);
  const covered = new Set(
    s.milestones.flatMap((m) => m.constraints.map((c) => c.id)),
  );
  const outside = s.items.filter((it) => isOpen(it) && !covered.has(it.id));
  if (!rows.length) {
    return (
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-empty"
      >
        {inScope ? "No milestones in this scope yet." : "No milestones yet."}{" "}
        Make a milestone with <code>npx hitld work new --kind milestone</code>.
      </Typography>
    );
  }
  return (
    <>
      <div className="work-key" role="group" aria-label="Key">
        <div className="work-key-groups">
          <KeyGroup title="Bars: each item's stage">
            <StageKeys />
            {proposals && <ProposedKey as="li" />}
          </KeyGroup>
        </div>
        {!inScope && (
          <Typography variant="caption-md" color="textSecondary" render={<p />}>
            {s.milestones.length} milestones hold {covered.size} items;{" "}
            {outside.length} open{" "}
            {outside.length === 1 ? "item is" : "items are"} in none yet.
          </Typography>
        )}
      </div>
      <ReleaseStrip
        flags={flags.filter((f) => f.at === undefined)}
        label="Releases not placed yet"
        note={unplacedNote(flags)}
        release={release}
        {...flagProps}
      />
      <div className="work-roadmap">
        {steps.map((step) => {
          const here = rows.filter((r) => r.step === step);
          const groups = [...new Set(here.map((r) => r.group))];
          const after = flags.filter((f) => f.at === step);
          return (
            <Fragment key={step}>
              <section
                className="work-roadmap-step"
                aria-label={
                  step === 1 ? "Can move now" : `After step ${step - 1}`
                }
              >
                <Typography
                  variant="caption-lg"
                  color="textSecondary"
                  render={<h3 />}
                  className="work-roadmap-step-head"
                >
                  <span className="work-roadmap-step-n">{step}</span>
                  {step === 1 ? "Can move now" : `After step ${step - 1}`}
                </Typography>
                {groups.map((group) => {
                  const members = here.filter((r) => r.group === group);
                  const lines = (
                    <ul className="work-rm-lines">
                      {members.map((r) => (
                        <RoadmapLine
                          key={r.id}
                          row={r}
                          milestone={msOf.get(r.id)}
                          proposed={msOf.get(r.id)?.state === "proposed"}
                          selected={r.id === selected}
                          dim={!!lit && !lit.has(r.id)}
                          title={title}
                          onOpen={() => onOpen(r.id)}
                          onWait={onWait}
                        />
                      ))}
                    </ul>
                  );
                  if (group.length < 2) {
                    return <div key={group.join()}>{lines}</div>;
                  }
                  const ties = loopTies(rows, group);
                  return (
                    <div key={group.join()} className="work-roadmap-loop">
                      <Typography
                        variant="caption-md"
                        render={<p />}
                        className="work-roadmap-loop-head"
                      >
                        These {group.length} wait on each other
                        {ties.length > 0 && (
                          <>
                            , tied by{" "}
                            {ties.map((t, i) => (
                              <span key={`${t.from}${t.to}`}>
                                {i > 0 &&
                                  (i === ties.length - 1 ? " and " : ", ")}
                                <Link
                                  component="button"
                                  type="button"
                                  onClick={() => onWait(t.from, t.to)}
                                  title={`Items: ${t.items.join(", ")}`}
                                >
                                  {title(t.from)} on {title(t.to)}
                                </Link>
                              </span>
                            ))}
                          </>
                        )}
                        .
                      </Typography>
                      {lines}
                    </div>
                  );
                })}
              </section>
              {after.length > 0 && (
                <div
                  className="work-roadmap-flags"
                  role="group"
                  aria-label={`Releases after step ${step}`}
                >
                  {after.map((f) => (
                    <div key={f.id} className="work-roadmap-flag">
                      <ReleaseFlagButton
                        flag={f}
                        where={betweenSteps(step, lastStep)}
                        selected={release === f.id}
                        dim={!!hoverFlag && hoverFlag !== f.id}
                        {...flagProps}
                      />
                      <Typography variant="caption-md" color="textSecondary">
                        after {andList(f.last.map(flagProps.titleOf))}
                      </Typography>
                    </div>
                  ))}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </>
  );
}

const SHAPE_NAMES: Record<string, string> = {
  outcome: "outcome",
  clauses: "done-when clauses",
  check: "check",
  links: "links to clauses",
};

/** What a dashed outline means on the roadmap (CS-563). */
const PROPOSED_TIP =
  "Proposed milestone: not committed yet; the owner commits it or not";

/** A proposed milestone's name, said to screen readers too. */
function ProposedLabel() {
  return <span className="visually-hidden">Proposed: </span>;
}

/** A stage bar for the map's bars: each stage's count as a stretch. */
function StageBar({
  counts,
  className,
}: {
  counts: Record<Stage, number>;
  className?: string;
}) {
  return (
    <span
      className={`work-pbar-track${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {STAGES.map((st) =>
        counts[st] ? (
          <span
            key={st}
            className={`work-roadmap-seg stage-${slug(st)}`}
            style={{ flexGrow: counts[st] }}
          />
        ) : null,
      )}
    </span>
  );
}

/**
 * The legend's entry for the dashed outline, shown while proposed
 * milestones are. One piece, so the legend can move it as a whole.
 */
function ProposedKey({ as = "span" }: { as?: "span" | "li" }) {
  const Tag = as;
  return (
    <Tag className="work-legend-key work-proposed-key" data-tip={PROPOSED_TIP}>
      <span className="work-proposed-mark" aria-hidden="true" />
      Proposed, not committed yet
    </Tag>
  );
}

/** One milestone: its name, a stage bar, done of all, what it waits on. */
function RoadmapLine({
  row,
  milestone,
  proposed,
  selected,
  dim,
  title,
  onOpen,
  onWait,
}: {
  row: RoadmapRow;
  milestone?: WorkMilestone;
  /** Not committed yet: outlined dashed, its bar gray. */
  proposed: boolean;
  selected: boolean;
  /** Not what feeds the release pointed at or in focus. */
  dim?: boolean;
  title: (id: string) => string;
  onOpen: () => void;
  onWait: (from: string, to: string) => void;
}) {
  const total = STAGES.reduce((n, st) => n + row.counts[st], 0);
  const bar = barCounts(row.counts, proposed);
  const waits = [...row.waitsOn].sort(
    (a, b) => b.items.length - a.items.length,
  );
  return (
    <li
      className={`work-rm-line${proposed ? " proposed" : ""}${selected ? " selected" : ""}${dim ? " dim" : ""}`}
    >
      <button
        type="button"
        className="work-rm-name"
        onClick={onOpen}
        aria-current={selected ? "true" : undefined}
        title={`${proposed ? `${PROPOSED_TIP}. ` : ""}${row.title}: open it${milestone?.to_shape.length ? ` (to shape: ${milestone.to_shape.map((x) => SHAPE_NAMES[x] ?? x).join(", ")})` : ""}`}
      >
        <LevelMark level="milestone" />
        <span className="work-rm-title">
          {proposed && <ProposedLabel />}
          {row.title}
        </span>
        {milestone?.check_due && (
          <StatusBadge tone="info">Check due</StatusBadge>
        )}
      </button>
      <span
        className="work-pbar-track work-rm-bar"
        role="img"
        aria-label={`${proposed ? "Proposed, not committed yet: " : ""}${STAGES.filter(
          (st) => row.counts[st],
        )
          .map((st) => `${row.counts[st]} ${STAGE_NAMES[st].toLowerCase()}`)
          .join(", ")}`}
      >
        {STAGES.map((st) =>
          bar[st] ? (
            <span
              key={st}
              className={`work-roadmap-seg stage-${slug(st)}`}
              style={{ flexGrow: bar[st] }}
              data-tip={
                proposed
                  ? `${PROPOSED_TIP}: ${STAGES.filter((x) => row.counts[x])
                      .map(
                        (x) =>
                          `${row.counts[x]} ${STAGE_NAMES[x].toLowerCase()}`,
                      )
                      .join(", ")}`
                  : stageTip(st, `${row.counts[st]}`)
              }
            />
          ) : null,
        )}
      </span>
      <span className="work-rm-count">
        {row.counts.Done}/{total}
      </span>
      {waits.length > 0 && (
        <Typography
          variant="caption-md"
          color="textSecondary"
          className="work-rm-waits"
        >
          After{" "}
          {waits.map((w, i) => (
            <span key={w.id}>
              {i > 0 && ", "}
              <Link
                component="button"
                type="button"
                onClick={() => onWait(row.id, w.id)}
                title={
                  w.items.length
                    ? `${w.items.length} of its open items need ${title(w.id)}'s`
                    : `It needs ${title(w.id)} itself`
                }
              >
                {title(w.id)}
              </Link>
            </span>
          ))}
        </Typography>
      )}
    </li>
  );
}
