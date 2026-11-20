import "./work.css";
import {
  Alert,
  Button,
  Menu,
  MenuItem,
  Switch,
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
import { svgHierarchyTree } from "@stratakit/icons/hierarchy-tree";
import { svgInfo } from "@stratakit/icons/info";
import { svgSearch } from "@stratakit/icons/search";
import { svgStatusWarning } from "@stratakit/icons/status-warning";
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
  mountViews,
  pickRelease,
  pickView,
  type ReleaseChoice,
  releaseChoicesOf,
  type ViewEntry,
} from "../workModel.ts";
import {
  type Actor,
  ageText,
  agoText,
  type LiveBox,
  type LiveUnmerged,
  type LiveWork,
  liveBoxOf,
  queueText,
  type ClosureViolation,
  committedOnly,
  NO_RELEASE,
  type ReleaseClosure,
  releaseBandsOf,
  releaseClosuresOf,
  byProject,
  clampZoom,
  dependencyMatrix,
  fitZoom,
  ENTITY_KIND_NAMES,
  ENTITY_KIND_TIPS,
  ENTITY_KINDS,
  type EntityKind,
  type Flow,
  type FlowDay,
  changeText,
  dayKey,
  flowDayOf,
  findWork,
  flowOf,
  idNumber,
  type InFlight,
  inFlightOf,
  isOpen,
  isWork,
  isOwnerDecision,
  kindsOf,
  loadItemText,
  criticalPathOf,
  longestChains,
  type MeasurePoint,
  type Measures,
  measuresOf,
  median,
  percentile,
  mapEntityItems,
  mapEntityTitle,
  milestoneRoadmapOf,
  nextActor,
  type Plan,
  type PlanBand,
  type PlanMilestone,
  type PlanRelease,
  planOf,
  clampSlots,
  SLOTS_MAX,
  possessive,
  PROPOSAL_STAGES,
  type Proposal,
  type ProposalStage,
  proposalsForOwner,
  proposalsOf,
  releasesGatedBy,
  type RoadmapRow,
  ownerQueue,
  type Stage,
  STAGE_NAMES,
  STATE_NAMES,
  UNSHAPED,
  STAGES,
  stageOf,
  stageWords,
  stateOf,
  unblocksOf,
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
import { DependenciesLink, DependenciesView } from "./Dependencies.tsx";
import {
  HoverCard,
  SegmentTip,
  StageBar as LabeledStageBar,
  WorkCardProvider,
  WorkHoverCard,
} from "./HoverCard.tsx";
import { InlineText, ItemText } from "./ItemText.tsx";
import { ProjectMatrixView, ProjectsView } from "./Projects.tsx";
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

/**
 * What the shell gives every view it mounts (DESIGN.md, "The view shell";
 * CS-744). A view reads the tracker, the scope and the shell's shared
 * choices from here, and changes the URL only through `set`.
 */
export interface WorkViewProps {
  s: WorkSnapshot;
  flight: InFlight;
  /** The items in the scope (every item when nothing is scoped). */
  items: WorkItem[];
  /** Something is scoped: a view narrows to `items` and `msInScope`. */
  scoped: boolean;
  msInScope: (id: string) => boolean;
  search: WorkSearch;
  /** Changes the URL's search; `replace` keeps the history entry. */
  set: (patch: Partial<WorkSearch>, replace?: boolean) => void;
  /** The shared Proposed switch's state: proposals join the view. */
  proposals: boolean;
  /** The open releases in ladder order, proposed ones only with the switch on. */
  releases: ReleaseChoice[];
  /** The release picked (`release=`), alpha.1 by default. */
  release?: ReleaseChoice;
  onRelease: (id: string) => void;
  /** The item or milestone open in the pane. */
  selected?: string;
  /** Opens an item or a milestone in the pane, beside the view. */
  openItem: (id: string) => void;
  /** Opens a list in the pane (`list=`). */
  openList: (list: string) => void;
  /** Whether a view with this ID is shown (another view may not have landed yet). */
  hasView: (id: string) => boolean;
  /** Goes to another view by its ID, with more search fields if given. */
  goView: (id: string, patch?: Partial<WorkSearch>) => void;
}

/**
 * A view the shell mounts. A file `views/work<Name>.tsx` that exports one
 * as `workView` is mounted: no other file changes (DESIGN.md, "The view
 * shell").
 */
export interface WorkViewDef extends ViewEntry {
  /** Its tab's name: one or two words. */
  label: string;
  /** The question it answers, in a sentence: its tab's tip. */
  question: string;
  /** It can include proposals: the shared Proposed switch applies to it. */
  proposals?: boolean;
  /** The view. Absent only for the built-in views, drawn by the board itself. */
  Component?: (props: WorkViewProps) => ReactNode;
}

/** The views drawn by the board itself; mounted views may replace them. */
const BUILT_IN_VIEWS: WorkViewDef[] = [
  {
    id: "move",
    label: "Your move",
    question: "What waits on you, what is moving and what can start",
    place: "page",
    order: 10,
  },
  {
    id: "roadmap",
    label: "Roadmap",
    question:
      "What is left in each release, what holds it, and how it connects",
    place: "page",
    order: 20,
  },
  {
    id: "proposals",
    label: "Proposals",
    question: "What is proposed, and what each proposal waits on",
    place: "page",
    order: 60,
  },
  {
    id: "flow",
    label: "Flow",
    question: "How the work flows, day by day",
    place: "page",
    order: 70,
  },
  {
    id: "plan",
    label: "Plan",
    question: "What gets built when, grouped by release",
    place: "older",
    order: 10,
    proposals: true,
  },
  {
    id: "deps",
    label: "Dependencies",
    question: "What one milestone or item waits on and unblocks",
    place: "older",
    order: 20,
    proposals: true,
  },
  {
    id: "projects",
    label: "Projects",
    question: "How ready each project's work is for each release",
    place: "older",
    order: 30,
    proposals: true,
  },
];

/** Every `views/work<Name>.tsx` with a `workView`: the mounted views. */
const MOUNTED = Object.entries(
  import.meta.glob<{ workView?: WorkViewDef }>("./work*.tsx", { eager: true }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([, m]) => (m.workView ? [m.workView] : []));
const VIEWS = mountViews(BUILT_IN_VIEWS, MOUNTED);
if (VIEWS.problems.length) {
  console.error(`The Work page's views: ${VIEWS.problems.join("; ")}`);
}
const VIEW_IDS = new Set(
  [...VIEWS.page, ...VIEWS.roadmap, ...VIEWS.older].map((v) => v.id),
);

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
  const pageView = pickView(VIEWS.page, search.view)!;
  const view = pageView.id;
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
  const forOwner = useMemo(() => proposalsForOwner(proposals), [proposals]);
  const forOwnerDiscuss = forOwner.filter((p) => p.stage === "discuss").length;
  const readyToStart = byActor.agents.filter(
    (it) => stageOf(it, flight) === "Ready",
  );
  const live = useMemo(
    () => liveBoxOf(s, size ? new Set(items.map((i) => i.id)) : undefined),
    [s, items, size],
  );
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
  // The roadmap opens on its first view, the Release view (CS-744); the
  // Plan (CS-692), Dependencies (CS-694) and Projects (CS-693) views wait
  // behind the Older views menu until their replacements land.
  const roadmapView = pickView(
    [...VIEWS.roadmap, ...VIEWS.older],
    search.roadmap,
  )!;
  const roadmapBy = roadmapView.id;
  const olderActive = VIEWS.older.includes(roadmapView);
  const slots = clampSlots(search.slots ?? 1);
  // Proposed milestones join the roadmap only when asked for (CS-563).
  const withProposed = search.proposed === "show";
  const proposedCount = s.milestones.filter(
    (m) => m.state === "proposed",
  ).length;
  const projectScope = !!oneProject;
  const releases = useMemo(
    () => releaseChoicesOf(s, withProposed),
    [s, withProposed],
  );
  const release = pickRelease(releases, search.release);
  const goView = (id: string, patch: Partial<WorkSearch> = {}) =>
    VIEWS.page.some((v) => v.id === id)
      ? set({ view: id === VIEWS.page[0]!.id ? undefined : id, ...patch })
      : set({
          view: "roadmap",
          roadmap: id === VIEWS.roadmap[0]?.id ? undefined : id,
          ...patch,
        });
  const viewProps: WorkViewProps = {
    s,
    flight,
    items,
    scoped: size > 0,
    msInScope: (id) => {
      const m = msOf.get(id);
      return !!m && msInScope(m);
    },
    search,
    set,
    proposals: withProposed,
    releases,
    release,
    onRelease: (id) => set({ release: id }, true),
    selected:
      search.item ??
      (search.list?.startsWith("ms:") ? search.list.slice(3) : undefined),
    openItem: (id) =>
      msOf.has(id)
        ? set({ list: `ms:${id}`, item: undefined })
        : set({ item: id, list: undefined }),
    openList: open,
    hasView: (id) => VIEW_IDS.has(id),
    goView,
  };
  // The hover card's scope (CS-696): the Plan view's sequence, with the
  // same slots and proposals, so its slip line matches the Plan view.
  const cardPlan = useMemo(
    () => planOf(s, { slots, proposals: withProposed, flight }),
    [s, slots, withProposed, flight],
  );
  const cardScope = useMemo(
    () => ({
      s,
      flight,
      plan: cardPlan,
      onDeps: (id: string) =>
        set({
          view: "roadmap",
          roadmap: "deps",
          focus: id,
          deps: undefined,
        }),
    }),
    [s, flight, cardPlan, set],
  );

  return (
    <WorkCardProvider value={cardScope}>
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
                onChange={(_, v: string) =>
                  set({ view: v === VIEWS.page[0]!.id ? undefined : v })
                }
                aria-label="Views"
                className="work-tabs"
                variant="scrollable"
              >
                {VIEWS.page.map((v) => (
                  <Tab
                    key={v.id}
                    value={v.id}
                    label={v.label}
                    title={v.question}
                    id={`work-tab-${v.id}`}
                    aria-controls="work-view"
                  />
                ))}
              </Tabs>
              <KindKey />
            </div>
            <div
              id="work-view"
              role="tabpanel"
              aria-labelledby={`work-tab-${view}`}
              className="work-view"
            >
              {pageView.Component && <pageView.Component {...viewProps} />}
              {!pageView.Component && view === "move" && (
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
                    id="work-yourprops-h"
                    title="Proposals for you"
                    className="span-5"
                    stat={{
                      value: forOwner.length,
                      detail: forOwner.length
                        ? `${forOwnerDiscuss} to discuss, ${forOwner.length - forOwnerDiscuss} ready for your yes`
                        : "No proposal waits on you",
                      tone: forOwner.length ? "attention" : undefined,
                      onOpen: () =>
                        set({
                          view: "proposals",
                          list: undefined,
                          stage: undefined,
                        }),
                    }}
                    foot={
                      <Link
                        component="button"
                        type="button"
                        onClick={() =>
                          set({
                            view: "proposals",
                            list: undefined,
                            stage: undefined,
                          })
                        }
                      >
                        All {proposals.length} proposals
                      </Link>
                    }
                  >
                    <OwnerProposals
                      proposals={forOwner}
                      selected={search.item}
                      limit={6}
                    />
                  </Card>

                  <Card
                    id="work-flight-h"
                    title="In progress"
                    className="span-12"
                    stat={{
                      value: live.working.length,
                      detail: liveDetail(live),
                      tone: live.blind ? "attention" : undefined,
                      onOpen: () => open("working"),
                    }}
                  >
                    <LiveRun box={live} branch={s.branch} />
                  </Card>

                  <Card
                    id="work-ready-h"
                    title="Ready to start"
                    className="span-7"
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

              {!pageView.Component && view === "roadmap" && (
                <div className="work-roadmap">
                  <div className="work-subtabs-row">
                    <Tabs
                      value={olderActive ? false : roadmapBy}
                      onChange={(_, v: string) =>
                        set({
                          roadmap: v === VIEWS.roadmap[0]?.id ? undefined : v,
                        })
                      }
                      aria-label="Roadmap views"
                      className="work-subtabs"
                      variant="scrollable"
                    >
                      {VIEWS.roadmap.map((v) => (
                        <Tab
                          key={v.id}
                          value={v.id}
                          label={v.label}
                          title={v.question}
                          id={`work-rtab-${v.id}`}
                          aria-controls="work-roadmap-view"
                        />
                      ))}
                    </Tabs>
                    <OlderViews
                      views={VIEWS.older}
                      active={olderActive ? roadmapBy : undefined}
                      onPick={(id) => set({ roadmap: id })}
                    />
                    <ProposedSwitch
                      on={withProposed}
                      count={proposedCount}
                      applies={!!roadmapView.proposals && !projectScope}
                      onChange={(on) =>
                        set({ proposed: on ? "show" : undefined }, true)
                      }
                    />
                  </div>
                  <div
                    id="work-roadmap-view"
                    role="tabpanel"
                    aria-labelledby={
                      olderActive
                        ? "work-older-views"
                        : `work-rtab-${roadmapBy}`
                    }
                  >
                    {roadmapView.Component ? (
                      <roadmapView.Component {...viewProps} />
                    ) : (
                      <div className="work-dash">
                        <Card
                          id="work-roadmap-h"
                          title={
                            projectScope ? "Linked projects" : roadmapView.label
                          }
                          caption={
                            projectScope
                              ? "What it waits on, and what waits on it"
                              : roadmapBy === "plan"
                                ? "What gets built when, as the run's executors would work through it: no dates, no durations"
                                : roadmapBy === "projects"
                                  ? "How ready each project's work is for each release, and what it holds up"
                                  : "What one milestone or item waits on, and what it unblocks"
                          }
                          className="span-12"
                        >
                          {projectScope ? (
                            <ProjectLinks
                              s={s}
                              project={oneProject!}
                              onCell={(from, to) => open(`dep:${from}:${to}`)}
                            />
                          ) : roadmapBy === "deps" ? (
                            <DependenciesView
                              s={s}
                              flight={flight}
                              search={search}
                              set={set}
                              proposals={withProposed}
                              matrix={
                                <ProjectMatrixView
                                  s={s}
                                  items={items}
                                  onCell={(from, to) =>
                                    open(`dep:${from}:${to}`)
                                  }
                                />
                              }
                            />
                          ) : roadmapBy === "projects" ? (
                            <ProjectsView
                              s={s}
                              flight={flight}
                              items={items}
                              scoped={size > 0}
                              proposals={withProposed}
                              search={search}
                              set={set}
                              onItem={(id) =>
                                set({ item: id, list: undefined })
                              }
                            />
                          ) : (
                            <PlanView
                              s={s}
                              flight={flight}
                              proposals={withProposed}
                              slots={slots}
                              onSlots={(n) =>
                                set(
                                  { slots: n === 1 ? undefined : String(n) },
                                  true,
                                )
                              }
                              release={search.release}
                              onRelease={(id) => set({ release: id }, true)}
                              selected={
                                search.list?.startsWith("ms:")
                                  ? search.list.slice(3)
                                  : milestoneId
                              }
                              onOpen={(id) => open(`ms:${id}`)}
                              onItem={(id) =>
                                set({ item: id, list: undefined })
                              }
                              onDeps={(id) =>
                                set({
                                  roadmap: "deps",
                                  focus: id,
                                  deps: undefined,
                                })
                              }
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
                  </div>
                </div>
              )}

              {!pageView.Component && view === "proposals" && (
                <div className="work-dash">
                  <ProposalsCard
                    s={s}
                    proposals={proposals}
                    itemOf={itemOf}
                    unblocks={unblocks}
                    selected={
                      search.item ??
                      (search.list?.startsWith("ms:")
                        ? search.list.slice(3)
                        : undefined)
                    }
                    stage={
                      PROPOSAL_STAGES.includes(search.stage as ProposalStage)
                        ? (search.stage as ProposalStage)
                        : undefined
                    }
                    onStage={(stage) => set({ stage }, true)}
                    onMilestone={(id) => open(`ms:${id}`)}
                    msOf={msOf}
                  />
                </div>
              )}

              {!pageView.Component && view === "flow" && (
                <div className="work-dash">
                  <Card
                    id="work-flow-h"
                    title="Items in each stage, day by day"
                    caption={`A band that widens is a queue growing; choose a day to list what moved, or a stage to list it. ${flow.created} ${flow.created === 1 ? "item" : "items"} new in the last ${flow.window} days.`}
                    className="span-12"
                  >
                    <FlowChart
                      flow={flow}
                      itemOf={itemOf}
                      onStage={(st) => open(`stage:${st}`)}
                      onDay={(key) => open(`day:${key}`)}
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
                    The merge queue, quotas and what the controllers do join
                    this view when HITLd records them.
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
    </WorkCardProvider>
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
export function KindMark({
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
export function KindId({ id, kind }: { id: string; kind?: EntityKind }) {
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

/**
 * The kinds' legend behind one button at the end of the tab row (CS-744):
 * the row keeps one height at every width, so the tabs never move.
 */
function KindKey() {
  const [at, setAt] = useState<HTMLElement | null>(null);
  const id = useId();
  return (
    <>
      <Button
        variant="text"
        size="small"
        className="work-kind-key"
        aria-haspopup="dialog"
        aria-expanded={!!at}
        aria-controls={at ? id : undefined}
        onClick={(e) => setAt(at ? null : e.currentTarget)}
        title="What each mark means"
      >
        <span className="work-kind-key-marks" aria-hidden="true">
          <KindMark kind="milestone" named={false} />
          <KindMark kind="work" named={false} />
          <KindMark kind="decision" named={false} />
        </span>
        <span className="work-kind-key-word">Key</span>
      </Button>
      <Popover
        id={id}
        open={!!at}
        anchorEl={at}
        onClose={() => setAt(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { className: "work-kind-key-pop" } }}
      >
        <KindLegend />
      </Popover>
    </>
  );
}

/**
 * Words that change in place without moving anything beside them: every
 * option is laid out in one cell and only the current one shows, so the
 * span is as wide as the widest (CS-744: no layout shift).
 */
export function ReservedText({
  value,
  options,
  className,
}: {
  value: string;
  options: readonly string[];
  className?: string;
}) {
  return (
    <span className={`work-reserved ${className ?? ""}`}>
      {[...new Set([value, ...options])].map((o) => (
        <span key={o} aria-hidden={o === value ? undefined : true}>
          {o}
        </span>
      ))}
    </span>
  );
}

/**
 * The shared Proposed switch (CS-744): one per page, in the roadmap's
 * view row, and every view that can include proposals reads it
 * (`proposed=show`). Its state is in words beside it, and a view that
 * shows committed work only turns it off and says so.
 */
export function ProposedSwitch({
  on,
  count,
  applies = true,
  onChange,
}: {
  on: boolean;
  /** Proposed milestones, for the tip. */
  count: number;
  /** The view can include proposals. */
  applies?: boolean;
  onChange: (on: boolean) => void;
}) {
  const shown = on && applies;
  const tip = !applies
    ? "This view shows committed work only"
    : shown
      ? "Proposed work shows, outlined dashed. Turn off for committed work only."
      : `Show proposed work too: ${count} proposed ${count === 1 ? "milestone" : "milestones"} and their items, outlined dashed`;
  return (
    <label
      className={`work-proposed-switch${applies ? "" : " na"}`}
      title={tip}
    >
      <Switch
        size="small"
        checked={shown}
        disabled={!applies}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="work-proposed-mark" aria-hidden="true" />
      <span className="work-proposed-name">Proposed</span>
      <span className="work-proposed-sep" aria-hidden="true">
        ·
      </span>
      <ReservedText
        className="work-proposed-state"
        value={!applies ? "n/a" : shown ? "shown" : "hidden"}
        options={["shown", "hidden", "n/a"]}
      />
    </label>
  );
}

/**
 * The roadmap's older views behind one menu (CS-744), until their
 * replacements land. The button keeps its words whichever is open, and
 * is marked like a chosen tab when one is.
 */
function OlderViews({
  views,
  active,
  onPick,
}: {
  views: readonly WorkViewDef[];
  active?: string;
  onPick: (id: string) => void;
}) {
  const [at, setAt] = useState<HTMLElement | null>(null);
  if (!views.length) {
    return null;
  }
  return (
    <>
      <Button
        id="work-older-views"
        variant="text"
        size="small"
        className={`work-older-views${active ? " active" : ""}`}
        aria-haspopup="menu"
        aria-expanded={!!at}
        aria-controls={at ? "work-older-menu" : undefined}
        onClick={(e) => setAt(e.currentTarget)}
        title={
          active
            ? `Showing the older ${views.find((v) => v.id === active)?.label} view`
            : "The roadmap's earlier views, until their replacements land"
        }
      >
        Older views
        <Icon href={svgChevronDown} />
      </Button>
      <Menu
        id="work-older-menu"
        anchorEl={at}
        open={!!at}
        onClose={() => setAt(null)}
        slotProps={{ list: { "aria-labelledby": "work-older-views" } }}
      >
        {views.map((v) => (
          <MenuItem
            key={v.id}
            selected={v.id === active}
            onClick={() => {
              setAt(null);
              onPick(v.id);
            }}
            className="work-older-item"
          >
            <span className="work-older-check" aria-hidden="true">
              {v.id === active && <Icon href={svgCheckmark} />}
            </span>
            <span>
              <span className="work-older-name">{v.label}</span>
              <span className="work-older-question">{v.question}</span>
            </span>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/**
 * The release picker the views share (CS-744): the open releases in
 * ladder order, a proposed one outlined dashed.
 */
export function ReleasePicker({
  releases,
  release,
  onRelease,
}: {
  releases: readonly ReleaseChoice[];
  release?: ReleaseChoice;
  onRelease: (id: string) => void;
}) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={release?.id ?? null}
      onChange={(_, v: string | null) => v && onRelease(v)}
      aria-label="Release"
      className="work-release-picker"
    >
      {releases.map((r) => (
        <ToggleButton
          key={r.id}
          value={r.id}
          className={r.proposed ? "proposed" : undefined}
          aria-label={`${r.version}${r.proposed ? ", proposed" : ""}`}
          render={
            <Button
              variant="outlined"
              size="small"
              title={`${r.id} ${r.title}${r.proposed ? " (proposed)" : ""}`}
            />
          }
        >
          <KindMark kind="release" named={false} />
          {r.short}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/**
 * An item, milestone or project by ID and short title, as a link that
 * opens it in the pane, with its hover card (CS-744: every ID shown
 * carries its title). The title is one line, cut with an ellipsis; the
 * card and the link's name carry it whole.
 */
export function ItemRef({
  id,
  title,
  className,
  card = true,
}: {
  id: string;
  /** Its title; read from the snapshot when absent. */
  title?: string;
  className?: string;
  card?: boolean;
}) {
  const s = useContext(SnapshotContext);
  const t =
    title ??
    (s &&
      (s.items.find((x) => x.id === id)?.title ??
        s.milestones.find((x) => x.id === id)?.title ??
        s.projects.find((x) => x.id === id)?.title)) ??
    "";
  return (
    <ItemLink
      id={id}
      className={`work-ref ${className ?? ""}`}
      label={t ? `${id} ${t}` : id}
      card={card}
    >
      <KindId id={id} />
      {t && (
        <span className="work-ref-title">
          <InlineText text={t} />
        </span>
      )}
    </ItemLink>
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

/** The In progress card's line under its count. */
function liveDetail(box: LiveBox): string {
  if (box.blind) {
    return "Not everything could be read: see below";
  }
  const n = box.unmerged.length;
  return n
    ? `Who works on each and since when; ${n} done, not merged`
    : "Who works on each, and since when";
}

/** "11:06 PM", the reading's local time. */
const clock = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** Where a live figure was read from, and when. */
function SourceNote({ sources }: { sources: LiveBox["sources"] }) {
  const read = sources.filter((x) => x.ok);
  if (!read.length) {
    return null;
  }
  const latest = Math.max(...read.map((x) => x.at));
  return (
    <span className="work-live-source">
      From {read.map((x) => x.source).join("; ")}, read {clock(latest)}
    </span>
  );
}

/**
 * The live run (CS-547): the run and its orchestrator, the items being
 * worked on now and since when, and the items done on a branch and not
 * merged, each figure with where it was read from and when. When a source
 * can't be read, it says so instead of "nothing".
 */
function LiveRun({ box, branch }: { box: LiveBox; branch?: string }) {
  const now = Date.now();
  // readLive's order: the run, the ledger, the claims, the branches.
  const known = box.sources.length > 0;
  const runSource = box.sources[0];
  const workSources = box.sources.slice(1, 3);
  const mergeSources = box.sources.slice(3);
  const unread = box.sources.filter((x) => !x.ok);
  const r = box.run;
  return (
    <div className="work-live">
      {!known && (
        <div className="work-live-alert" role="note">
          <Icon href={svgStatusWarning} className="work-palert-icon" />
          <Typography variant="body-sm" render={<p />}>
            {box.notes[0]}
          </Typography>
        </div>
      )}
      {unread.length > 0 && (
        <div className="work-live-alert" role="note">
          <Icon href={svgStatusWarning} className="work-palert-icon" />
          <div>
            <Typography variant="body-sm" render={<p />}>
              Some of what this box reads couldn’t be read, so it may miss work
              in progress:
            </Typography>
            <ul>
              {unread.map((x) => (
                <li key={x.source}>
                  <Typography variant="body-sm">{x.why}</Typography>{" "}
                  <Typography variant="caption-md" color="textSecondary">
                    ({x.source}, tried {clock(x.at)})
                  </Typography>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {r.state !== "unread" && (
        <Typography variant="body-sm" render={<p />} className="work-live-run">
          {r.state === "active" ? (
            <>
              <strong>Run {r.id}</strong>
              {r.started !== undefined &&
                `, started ${agoText(now - r.started)}`}
              . <strong>{r.session}</strong> holds its lease
              {r.renewed !== undefined &&
                `, renewed ${agoText(now - r.renewed)}`}
              .
            </>
          ) : r.state === "free" ? (
            <>
              <strong>Run {r.id}</strong> has no orchestrator: its lease{" "}
              {r.released !== undefined
                ? `was released ${agoText(now - r.released)}`
                : "expired"}
              {r.session ? `; ${r.session} held it last` : ""}.
            </>
          ) : r.state === "none" ? (
            <>No run is active: hitld has no run state.</>
          ) : (
            <>
              Whether a run is active can’t be told: hitld has no run state, and
              its ledger couldn’t be read.
            </>
          )}{" "}
          {runSource && <SourceNote sources={[runSource]} />}
        </Typography>
      )}

      <div className="work-live-cols">
        <section aria-labelledby="work-live-working-h">
          <header className="work-live-head">
            <Typography
              variant="body-sm"
              render={<h3 />}
              id="work-live-working-h"
            >
              Working now{" "}
              <span className="work-proposal-count">{box.working.length}</span>
            </Typography>
            <SourceNote sources={workSources} />
          </header>
          {box.working.length ? (
            <ul className="work-rows">
              {box.working.map((w) => (
                <LiveWorkRow
                  key={`${w.id} ${w.who ?? ""} ${w.where ?? ""}`}
                  w={w}
                  branch={branch}
                  now={now}
                />
              ))}
            </ul>
          ) : (
            <Typography
              variant="body-sm"
              color="textSecondary"
              render={<p />}
              className="work-empty"
            >
              {known && workSources.every((x) => x.ok)
                ? "No dispatch in flight and no open claim."
                : "None seen, but not everything could be read."}
            </Typography>
          )}
        </section>

        <section aria-labelledby="work-live-unmerged-h">
          <header className="work-live-head">
            <Typography
              variant="body-sm"
              render={<h3 />}
              id="work-live-unmerged-h"
            >
              Done, not merged{" "}
              <span className="work-proposal-count">{box.unmerged.length}</span>
            </Typography>
            <SourceNote sources={mergeSources} />
          </header>
          {box.unmerged.length ? (
            <ul className="work-rows">
              {box.unmerged.map((u) => (
                <LiveUnmergedRow key={u.id} u={u} now={now} />
              ))}
            </ul>
          ) : (
            <Typography
              variant="body-sm"
              color="textSecondary"
              render={<p />}
              className="work-empty"
            >
              {known && mergeSources.every((x) => x.ok)
                ? "No branch holds finished work that main lacks."
                : "None seen, but the branches couldn’t be compared."}
            </Typography>
          )}
        </section>
      </div>

      {known && box.notes.length > 0 && (
        <ul
          className="work-live-notes"
          aria-label="What these figures leave out"
        >
          {box.notes.map((n) => (
            <li key={n}>
              <Typography variant="caption-md" color="textSecondary">
                {n}
              </Typography>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * "orch-9-CS-547 on hitld/CS-547-… (this branch) · claimed 12 minutes ago":
 * who, where, and since when, by the record the age comes from.
 */
function liveLine(w: LiveWork, branch: string | undefined, now: number) {
  const where = w.where
    ? `${w.who && w.who !== w.where ? `${w.who} on ` : "on "}${w.where}${w.here && w.where === branch ? " (this branch)" : ""}`
    : w.who;
  const when =
    w.since === undefined
      ? w.from === "branch"
        ? "not committed yet"
        : undefined
      : `${w.from === "dispatch" ? "dispatched" : "claimed"} ${agoText(now - w.since)}`;
  return [where, when].filter(Boolean).join(" · ");
}

/** Who works on an item, where, and since when (and by which record). */
function LiveWorkRow({
  w,
  branch,
  now,
}: {
  w: LiveWork;
  branch?: string;
  now: number;
}) {
  return (
    <li className="work-row">
      <ItemLink id={w.id} className="work-row-main" card>
        <KindId id={w.id} />
        <span className="work-row-title">
          {w.item ? <InlineText text={w.item.title} /> : w.id}
        </span>
        <Typography
          variant="caption-md"
          color="textSecondary"
          className="work-live-extra"
        >
          {liveLine(w, branch, now)}
          {w.from === "claim" && (
            <span className="work-live-tag">no dispatch in the ledger</span>
          )}
        </Typography>
      </ItemLink>
    </li>
  );
}

/** A finished item's branch, and where the merge queue has it. */
function LiveUnmergedRow({ u, now }: { u: LiveUnmerged; now: number }) {
  const q = queueText(u);
  return (
    <li className="work-row">
      <ItemLink id={u.id} className="work-row-main" card>
        <KindId id={u.id} />
        <span className="work-row-title">
          {u.item ? <InlineText text={u.item.title} /> : u.id}
        </span>
        <Typography
          variant="caption-md"
          color="textSecondary"
          className="work-live-extra"
        >
          {[
            u.branches.length ? `on ${u.branches.join(", ")}` : undefined,
            u.closed ? `closed ${agoText(now - u.closed)}` : undefined,
          ]
            .filter(Boolean)
            .join(" · ")}
          <span className={`work-live-queue ${q.tone ?? ""}`}>
            {q.tone === "attention" && (
              <Icon href={svgStatusWarning} className="work-live-queue-icon" />
            )}
            {q.text}
          </span>
        </Typography>
      </ItemLink>
    </li>
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
              card
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
 * a band that widens is a queue growing. Hovering or focusing reads a day
 * in the shared hover card (CS-698), beside the crosshair: each stage's
 * count and its change from the day before, and what moved. Arrow keys
 * step through the days; a click or Enter lists what moved in the pane.
 */
function FlowChart({
  flow,
  itemOf,
  onStage,
  onDay,
}: {
  flow: Flow;
  itemOf: Map<string, WorkItem>;
  onStage: (st: Stage) => void;
  /** Lists what moved on a day, by its key ("2026-11-16"). */
  onDay: (key: string) => void;
}) {
  const plot = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number>();
  /** The pointer's place across the plot (0 to 1); none from the keyboard. */
  const [px, setPx] = useState<number>();
  const [hidden, setHidden] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [under, setUnder] = useState<Stage>();
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
    return { st, d };
  });
  const first = dayName(flow.days[0] ?? Date.now());
  const today = n - 1;
  const shown = active ?? today;
  const read = useMemo(
    () => (n ? flowDayOf(flow, shown) : undefined),
    [flow, shown, n],
  );
  const nearest = (clientX: number) => {
    const r = plot.current?.getBoundingClientRect();
    if (!r || !r.width) {
      return undefined;
    }
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return { f, i: n < 2 ? 0 : Math.round(f * (n - 1)) };
  };
  const go = (i: number) => {
    setActive(Math.min(today, Math.max(0, i)));
    setPx(undefined);
    setHidden(false);
    setKeyboard(true);
  };
  // The card sits beside both the crosshair and the pointer, never over
  // either: its anchor spans the gap between them, full height.
  const cross = n < 2 ? (px ?? 0.5) : shown / (n - 1);
  const from = Math.min(cross, px ?? cross);
  const to = Math.max(cross, px ?? cross);
  // Beside the crosshair where the screen has room, on the side with more
  // of it; on a narrow screen, above or below the chart instead.
  const box = plot.current?.getBoundingClientRect();
  const room = box && {
    left: box.left + from * box.width,
    right: window.innerWidth - box.left - to * box.width,
    above: box.top,
    below: window.innerHeight - box.bottom,
  };
  const wide = (r: number) => r >= FLOW_CARD + 16;
  const side: "right-start" | "left-start" | "top-start" | "bottom-start" =
    !room
      ? "right-start"
      : wide(room.right) && (cross <= 0.5 || !wide(room.left))
        ? "right-start"
        : wide(room.left)
          ? "left-start"
          : room.above >= room.below
            ? "top-start"
            : "bottom-start";
  const fallbacks = (
    ["right-start", "left-start", "top-start", "bottom-start"] as const
  ).filter((p) => p !== side);
  const open = active !== undefined && !hidden && !!read;
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
      <div
        ref={plot}
        className="work-cfd-plot"
        role="slider"
        tabIndex={n ? 0 : -1}
        aria-label={`Items by stage, day by day since ${first}`}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, today)}
        aria-valuenow={shown}
        aria-valuetext={read ? flowDayText(read) : undefined}
        onPointerMove={(e) => {
          const p = nearest(e.clientX);
          if (!p) {
            return;
          }
          if (p.i !== active) {
            setHidden(false);
          }
          setActive(p.i);
          setPx(p.f);
          setKeyboard(false);
        }}
        onPointerLeave={() => {
          setPx(undefined);
          setUnder(undefined);
          if (!keyboard) {
            setActive(undefined);
          }
        }}
        onClick={(e) => {
          const p = nearest(e.clientX);
          if (p) {
            onDay(dayKey(flow.days[p.i]!));
          }
        }}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) {
            go(active ?? today);
          }
        }}
        onBlur={() => {
          setKeyboard(false);
          setActive(undefined);
        }}
        onKeyDown={(e) => {
          const step: Record<string, number> = {
            ArrowLeft: shown - 1,
            ArrowRight: shown + 1,
            ArrowDown: shown - 1,
            ArrowUp: shown + 1,
            Home: 0,
            End: today,
          };
          if (e.key in step) {
            e.preventDefault();
            go(step[e.key]!);
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onDay(dayKey(flow.days[shown]!));
          }
        }}
      >
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="work-cfd-svg"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          {bands.map((b) => (
            <path
              key={b.st}
              d={b.d}
              className={`work-band stage-${slug(b.st)}`}
              onPointerEnter={() => setUnder(b.st)}
              onPointerLeave={() => setUnder(undefined)}
            />
          ))}
          {active !== undefined && n > 1 && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={0}
              y2={h}
              className="work-cfd-cross"
            />
          )}
        </svg>
        <HoverCard
          card={
            read && (
              <FlowDayCard
                d={read}
                itemOf={itemOf}
                under={px === undefined ? undefined : under}
              />
            )
          }
          open={open}
          onClose={() => setHidden(true)}
          placement={side}
          fallbacks={fallbacks}
          follow={`${shown}:${from}:${to}`}
        >
          <span
            className="work-cfd-anchor"
            aria-hidden="true"
            style={{
              left: `${from * 100}%`,
              width: `max(1px, ${(to - from) * 100}%)`,
            }}
          />
        </HoverCard>
      </div>
      <div className="work-cfd-axis" aria-hidden="true">
        <span>{first}</span>
        <span>{n > 1 ? "Today" : ""}</span>
      </div>
      {n < 3 && (
        <Typography
          variant="caption-md"
          color="textSecondary"
          render={<p />}
          className="work-cfd-note"
        >
          The history began {first}; the bands fill in as work moves.
        </Typography>
      )}
    </div>
  );
}

/** "Nov 16". */
const dayName = (t: number) =>
  new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });

/** A day of the flow in words, for a screen reader: the card's content. */
function flowDayText(d: FlowDay): string {
  const change = (c?: number) => (c === undefined ? "" : ` (${changeText(c)})`);
  const stages = d.rows
    .map((r) => `${STAGE_NAMES[r.st]} ${r.count}${change(r.change)}`)
    .join(", ");
  const moved = d.first
    ? "the history's first day"
    : `${d.moved} ${d.moved === 1 ? "item" : "items"} moved`;
  return `${d.today ? "Today" : dayName(d.day)}: ${stages}; total ${d.total}${change(d.totalChange)}; ${moved}`;
}

/** The card's width and its gap from the anchor (hoverCard.css, the offset). */
const FLOW_CARD = 320 + 8;
/** Names shown in the card's "What moved", across its groups. */
const FLOW_NAMES = 3;
/** Groups shown by name; the rest are counted. */
const FLOW_GROUPS = 2;

/**
 * The Flow chart's card: the day, each stage in the chart's order with
 * its swatch, count and change (the largest stand out, zeros stay quiet),
 * the total, and what moved, a few by name.
 */
function FlowDayCard({
  d,
  itemOf,
  under,
}: {
  d: FlowDay;
  itemOf: Map<string, WorkItem>;
  /** The band under the pointer: its row is marked. */
  under?: Stage;
}) {
  const groups = d.groups.slice(0, FLOW_GROUPS);
  const rest = d.groups
    .slice(FLOW_GROUPS)
    .reduce((sum, g) => sum + g.ids.length, 0);
  let budget = FLOW_NAMES;
  const named = groups.map((g, k) => {
    // The first group gets two names, the others one, while names last.
    const take = Math.min(g.ids.length, budget, k ? 1 : 2);
    budget -= take;
    return { g, ids: g.ids.slice(0, take) };
  });
  const change = (c: number | undefined, largest = false) =>
    c === undefined ? (
      <span />
    ) : (
      <span
        className={`flow-card-change${c === 0 ? " zero" : ""}${largest ? " largest" : ""}`}
      >
        {changeText(c)}
      </span>
    );
  return (
    <div className="hover-card flow-card">
      <div className="hover-card-head flow-card-head">
        <span className="hover-card-title">
          {d.today ? `Today, ${dayName(d.day)}` : dayName(d.day)}
        </span>
        {!d.first && (
          <span className="flow-card-against">from the day before</span>
        )}
      </div>
      <div className="flow-card-rows">
        {d.rows.map((r) => (
          <div
            key={r.st}
            className={`flow-card-row${r.largest ? " largest" : ""}${r.st === under ? " under" : ""}`}
          >
            <span
              className={`work-swatch stage-${slug(r.st)}`}
              aria-hidden="true"
            />
            <span className="flow-card-name">{STAGE_NAMES[r.st]}</span>
            <span className="flow-card-count">{r.count}</span>
            {change(r.change, r.largest)}
          </div>
        ))}
        <span className="flow-card-rule" aria-hidden="true" />
        <div className="flow-card-row total">
          <span />
          <span className="flow-card-name">Total</span>
          <span className="flow-card-count">{d.total}</span>
          {change(d.totalChange)}
        </div>
      </div>
      {d.first ? (
        <p className="hover-card-note">
          The history's first day: there's no day before it to compare.
        </p>
      ) : named.length ? (
        <section className="hover-card-section">
          <h4>What moved</h4>
          <ul className="flow-card-moves">
            {named.map(({ g, ids }) => (
              <li key={g.label}>
                <span className="flow-card-move">
                  {g.to && (
                    <span
                      className={`work-swatch stage-${slug(g.to)}`}
                      aria-hidden="true"
                    />
                  )}
                  {g.label}
                  <span className="flow-card-n">{g.ids.length}</span>
                </span>
                {ids.map((id, k) => (
                  <span key={id} className="hover-card-blocker">
                    <KindId id={id} />
                    <span className="hover-card-blocker-title">
                      {itemOf.get(id)?.title ?? id}
                    </span>
                    {k === ids.length - 1 && g.ids.length > ids.length && (
                      <span className="flow-card-more">
                        +{g.ids.length - ids.length} more
                      </span>
                    )}
                  </span>
                ))}
              </li>
            ))}
          </ul>
          {rest > 0 && (
            <p className="hover-card-more">
              +{rest} more {rest === 1 ? "item" : "items"} in{" "}
              {d.groups.length - FLOW_GROUPS} other{" "}
              {d.groups.length - FLOW_GROUPS === 1 ? "move" : "moves"}
            </p>
          )}
        </section>
      ) : (
        <p className="hover-card-note">Nothing moved.</p>
      )}
      <p className="hover-card-foot">
        {d.moved ? "Click for what moved · " : ""}← → for other days
      </p>
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
  if (list.startsWith("day:")) {
    const [y, m, d] = list.slice(4).split("-").map(Number) as number[];
    const t = new Date(y!, m! - 1, d).getTime();
    return dayKey(t) === dayKey(Date.now())
      ? "Moved today"
      : `Moved on ${dayName(t)}`;
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
    // The same reading as Your move's In progress (CS-547).
    const box = liveBoxOf(s, new Set(items.map((i) => i.id)));
    const rowOf = new Map(box.working.map((w) => [w.id, w]));
    body = (
      <Grouped
        s={s}
        items={[
          ...new Set(
            box.working.flatMap((w) =>
              w.item && isWork(w.item) ? [w.item] : [],
            ),
          ),
        ]}
        empty={
          box.blind
            ? "None seen, but not everything could be read; Your move’s In progress says what."
            : "Nothing is in progress: no dispatch in flight and no open claim."
        }
        selected={selected}
        projectOf={projectOf}
        line={(it) => {
          const w = rowOf.get(it.id);
          return w ? liveLine(w, s.branch, now) : undefined;
        }}
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
            <ItemLink id={it.id} className="work-step" card>
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
  } else if (list?.startsWith("day:")) {
    const i = flow.days.findIndex((d) => dayKey(d) === list.slice(4));
    body =
      i < 0 ? (
        <Typography variant="body-md" color="textSecondary" render={<p />}>
          That day is outside the history.
        </Typography>
      ) : (
        <DayMoves d={flowDayOf(flow, i)} itemOf={itemOf} selected={selected} />
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
              <ItemLink id={it.id} className="work-row-main" card>
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
              <ItemLink id={m.id} className="work-row-main" card>
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
            <ItemLink id={d.id} className="work-queue-main" card>
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

/** Each stage of the proposal flow (CS-686): its name and what puts a proposal there. */
const PROPOSAL_STAGE_NAMES: Record<ProposalStage, string> = {
  discuss: "To discuss",
  shaping: "Being shaped",
  ready: "Ready for your yes",
  later: "Later, for review",
};
const PROPOSAL_STAGE_RULES: Record<ProposalStage, string> = {
  discuss:
    "New, with a header but no “Done when” yet: commit it, drop it or send it to shaping",
  shaping: "An open decision or study comes before the commit",
  ready:
    "A header and a “Done when”, and nothing open before the commit but the decider’s yes",
  later:
    "No header yet: the “later” copies of design lists and older filings, kept for your review",
};

/** "the owner's yes", capitalized to lead a sentence. */
const yesOf = (p: Proposal) => {
  const yes = `${possessive(p.decider)} yes`;
  return yes.charAt(0).toUpperCase() + yes.slice(1);
};

/**
 * The Proposals view (CS-688): candidate commitments, laid out as the
 * flow CS-686 settled. An alert lane leads with the proposals committed
 * work needs; then a section per stage (to discuss, being shaped, ready
 * for your yes, later), each grouped by project. Every row shows the
 * proposal's header (or says it has none), what a commit needs, and how
 * many open items wait on it. A proposal's text opens beside the view.
 */
function ProposalsCard({
  s,
  proposals,
  itemOf,
  msOf,
  unblocks,
  selected,
  stage,
  onStage,
  onMilestone,
}: {
  s: WorkSnapshot;
  proposals: Proposal[];
  itemOf: Map<string, WorkItem>;
  msOf: Map<string, WorkMilestone>;
  unblocks: Map<string, number>;
  selected?: string;
  /** Only one stage's section; all of them when absent. */
  stage?: ProposalStage;
  onStage: (stage: ProposalStage | undefined) => void;
  /** Opens a milestone in the pane. */
  onMilestone: (id: string) => void;
}) {
  const view = useRef<HTMLDivElement>(null);
  // A proposal chosen elsewhere (Your move) comes into view here.
  useEffect(() => {
    if (!selected) {
      return;
    }
    view.current
      ?.querySelector(`[data-proposal="${CSS.escape(selected)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  const count = (k: ProposalStage) =>
    proposals.filter((p) => p.stage === k).length;
  const alerts = proposals.filter((p) => p.neededBy.length);
  const stages = stage ? [stage] : PROPOSAL_STAGES;
  const table = (list: Proposal[], label: string, alert = false) => (
    <ProposalTable
      s={s}
      proposals={list}
      label={label}
      alert={alert}
      itemOf={itemOf}
      msOf={msOf}
      unblocks={unblocks}
      selected={selected}
      onMilestone={onMilestone}
    />
  );
  return (
    <Card
      id="work-proposals-h"
      title="Proposals"
      caption="Candidate commitments, in the order they come to you: discussed, shaped, then committed or dropped. Choose one to read it."
      className="span-12"
      tools={
        proposals.length > 0 && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={stage ?? "all"}
            onChange={(_, v: string | null) =>
              v && onStage(v === "all" ? undefined : (v as ProposalStage))
            }
            aria-label="Stages shown"
            className="work-proposal-gates"
          >
            <ToggleButton
              value="all"
              render={<Button variant="outlined" size="small" />}
            >
              All <span className="work-toggle-count">{proposals.length}</span>
            </ToggleButton>
            {PROPOSAL_STAGES.map((k) => (
              <ToggleButton
                key={k}
                value={k}
                disabled={!count(k) && stage !== k}
                render={
                  <Button
                    variant="outlined"
                    size="small"
                    title={PROPOSAL_STAGE_RULES[k]}
                  />
                }
              >
                {PROPOSAL_STAGE_NAMES[k]}{" "}
                <span className="work-toggle-count">{count(k)}</span>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )
      }
    >
      <p className="work-pnote">
        <Icon href={svgInfo} className="work-pnote-icon" />
        <span>
          To commit one, ask the main session to commit it, or to drop it or
          send it to shaping. This page only reads the tracker until HITLd’s
          dashboard can change it.
        </span>
      </p>
      {!proposals.length ? (
        <Typography variant="body-md" color="textSecondary" render={<p />}>
          Nothing is proposed here. Proposed items and milestones show here
          until they are committed or dropped.
        </Typography>
      ) : (
        <div className="work-proposal-sections" ref={view}>
          {!stage && alerts.length > 0 && (
            <section aria-labelledby="work-palert-h" className="work-palert">
              <header className="work-proposal-section-head">
                <Typography
                  variant="subtitle-lg"
                  render={<h3 />}
                  id="work-palert-h"
                >
                  <Icon href={svgStatusWarning} className="work-palert-icon" />
                  Committed work needs these{" "}
                  <span className="work-proposal-count">{alerts.length}</span>
                </Typography>
                <Typography variant="caption-md" color="textSecondary">
                  Planned work or a committed milestone needs a proposal that
                  isn’t committed: commit it, or take the need away
                </Typography>
              </header>
              {table(alerts, "Proposals that committed work needs", true)}
            </section>
          )}
          {stages.map((k) => {
            const list = proposals.filter((p) => p.stage === k);
            return (
              <section key={k} aria-labelledby={`work-pstage-${k}`}>
                <header className="work-proposal-section-head">
                  <Typography
                    variant="subtitle-lg"
                    render={<h3 />}
                    id={`work-pstage-${k}`}
                  >
                    {PROPOSAL_STAGE_NAMES[k]}{" "}
                    <span className="work-proposal-count">{list.length}</span>
                  </Typography>
                  <Typography variant="caption-md" color="textSecondary">
                    {PROPOSAL_STAGE_RULES[k]}
                  </Typography>
                </header>
                {list.length ? (
                  table(list, PROPOSAL_STAGE_NAMES[k])
                ) : (
                  <Typography
                    variant="body-sm"
                    color="textSecondary"
                    render={<p />}
                    className="work-pnone"
                  >
                    None now.
                  </Typography>
                )}
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ProposalTable({
  s,
  proposals,
  label,
  alert,
  itemOf,
  msOf,
  unblocks,
  selected,
  onMilestone,
}: {
  s: WorkSnapshot;
  proposals: Proposal[];
  label: string;
  /** The alert lane: what needs each, in place of what a commit needs. */
  alert: boolean;
  itemOf: Map<string, WorkItem>;
  msOf: Map<string, WorkMilestone>;
  unblocks: Map<string, number>;
  selected?: string;
  onMilestone: (id: string) => void;
}) {
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
          <th scope="col">Proposal</th>
          <th scope="col">{alert ? "Needed by" : "What a commit needs"}</th>
          <th
            scope="col"
            className="c-num"
            title="Open items that wait on it, directly or through others"
          >
            Waiting
          </th>
        </tr>
      </thead>
      {byProject(s, proposals).map((g) => (
        <tbody key={g.project?.id ?? "none"}>
          <tr className="work-ptable-group">
            <th colSpan={4} scope="rowgroup">
              <span className="work-ptable-group-name work-marked">
                {g.project && <LevelMark level="project" />}
                {g.project?.title ?? "No project"}
              </span>
              <span className="work-ptable-group-meta">
                {g.project ? `${g.project.id}, ` : ""}
                {g.items.length}{" "}
                {g.items.length === 1 ? "proposal" : "proposals"}
              </span>
            </th>
          </tr>
          {g.items.map((p) => (
            <ProposalRow
              key={p.id}
              p={p}
              alert={alert}
              itemOf={itemOf}
              msOf={msOf}
              waiting={unblocks.get(p.id) ?? 0}
              selected={p.id === selected}
              onMilestone={onMilestone}
            />
          ))}
        </tbody>
      ))}
    </table>
  );
}

function ProposalRow({
  p,
  alert,
  itemOf,
  msOf,
  waiting,
  selected,
  onMilestone,
}: {
  p: Proposal;
  alert: boolean;
  itemOf: Map<string, WorkItem>;
  msOf: Map<string, WorkMilestone>;
  /** Open items that wait on it, directly or through others. */
  waiting: number;
  selected: boolean;
  onMilestone: (id: string) => void;
}) {
  const m = p.milestone;
  const refs = (ids: string[]) =>
    ids.map((id) => itemOf.get(id) ?? msOf.get(id) ?? id);
  return (
    <tr
      className={`work-ptable-row${selected ? " selected" : ""}`}
      data-proposal={alert ? undefined : p.id}
    >
      <td className="c-id">
        <KindId id={p.id} />
      </td>
      <td className="c-title">
        {m ? (
          <button
            type="button"
            className="work-ptable-link work-ptable-btn"
            onClick={() => onMilestone(m.id)}
          >
            <InlineText text={p.title} />
          </button>
        ) : (
          <ItemLink id={p.id} className="work-ptable-link" card>
            <InlineText text={p.title} />
          </ItemLink>
        )}
        {m && (
          <span className="work-ptable-sub">
            Proposed milestone{m.outcome ? `: ${m.outcome}` : ""}
          </span>
        )}
        {alert ? (
          <span className="work-ptable-sub">
            {PROPOSAL_STAGE_NAMES[p.stage]}
          </span>
        ) : (
          <>
            <ProposalHeaderLines p={p} />
            {m && <MilestoneConstraints m={m} itemOf={itemOf} msOf={msOf} />}
            {p.neededBy.length > 0 && (
              <span className="work-ptable-sub work-pneeded">
                Committed work needs it: <GateRefs needs={refs(p.neededBy)} />
              </span>
            )}
          </>
        )}
      </td>
      <td className="c-gate">
        {alert ? (
          <>
            <span className="work-pcell-label" aria-hidden="true">
              Needed by
            </span>
            <ul className="work-pneeds" aria-label={`What needs ${p.id}`}>
              {p.neededBy.map((id) => {
                const e = itemOf.get(id) ?? msOf.get(id);
                const body = (
                  <>
                    <KindId id={id} />
                    <span className="work-pneeds-title">
                      {e ? <InlineText text={e.title} /> : id}
                    </span>
                  </>
                );
                return (
                  <li key={id}>
                    {msOf.has(id) ? (
                      <button
                        type="button"
                        className="work-pneeds-link"
                        onClick={() => onMilestone(id)}
                      >
                        {body}
                      </button>
                    ) : (
                      <ItemLink id={id} className="work-pneeds-link">
                        {body}
                      </ItemLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <CommitGate p={p} refs={refs} />
        )}
      </td>
      <td className="c-num">{waiting > 0 ? waiting : ""}</td>
    </tr>
  );
}

/**
 * A proposal's header, or a line saying it has none: where it came from
 * and why now, then its size, decider and date on one line.
 */
function ProposalHeaderLines({ p }: { p: Proposal }) {
  const h = p.header;
  if (!h) {
    return (
      <span className="work-phead-none">
        No header yet: no source, why now, size, decider or date
      </span>
    );
  }
  const facts: Array<[string, string | undefined]> = [
    ["Size", h.size],
    ["Decider", h.decider],
    ["Filed", h.date],
  ];
  return (
    <dl className="work-phead">
      <div>
        <dt>Source</dt>
        <dd>{h.source ? <InlineText text={h.source} /> : "not given"}</dd>
      </div>
      <div className="work-phead-why">
        <dt>Why now</dt>
        <dd>{h.why ? <InlineText text={h.why} /> : "not given"}</dd>
      </div>
      <div className="work-phead-facts">
        {facts.map(([k, v]) => (
          <span key={k}>
            <dt>{k}</dt>
            <dd>{v ? <InlineText text={v} /> : "not given"}</dd>
          </span>
        ))}
      </div>
    </dl>
  );
}

/**
 * What committing a proposal needs: the decider's yes, after any open
 * decision or study. What starting it waits for comes under it, smaller:
 * it doesn't stand in the commit's way.
 */
function CommitGate({
  p,
  refs,
}: {
  p: Proposal;
  refs: (ids: string[]) => Array<WorkItem | WorkMilestone | string>;
}) {
  const first = refs(p.first);
  const allDecisions = first.every(
    (n) => typeof n !== "string" && n.kind === "decision",
  );
  return (
    <span className="work-commit">
      <span className="work-pcell-label" aria-hidden="true">
        What a commit needs
      </span>
      <span className="work-commit-main">
        {yesOf(p)}
        {first.length > 0 && (
          <>
            , once <GateRefs needs={first} />{" "}
            {first.length === 1 ? "is" : "are"}{" "}
            {allDecisions ? "answered" : "settled"}
          </>
        )}
      </span>
      {p.startsAfter.length > 0 && (
        <span className="work-commit-start">
          Starts after <GateRefs needs={refs(p.startsAfter)} />
        </span>
      )}
    </span>
  );
}

/** A proposed milestone's constraints, every one, each with its state. */
function MilestoneConstraints({
  m,
  itemOf,
  msOf,
}: {
  m: WorkMilestone;
  itemOf: Map<string, WorkItem>;
  msOf: Map<string, WorkMilestone>;
}) {
  if (!m.constraints.length) {
    return <span className="work-ptable-sub">No constraints named yet</span>;
  }
  return (
    <ul className="work-pcons" aria-label={`${m.title}: its constraints`}>
      {m.constraints.map((c) => {
        const it = itemOf.get(c.id);
        const e = it ?? msOf.get(c.id);
        const state = e?.state;
        // Proposed is the dashed outline, as on the roadmap (CS-563); a
        // stage's color is only a fill.
        const swatch =
          state === "proposed"
            ? "proposed"
            : it
              ? `stage-${slug(stageOf(it) ?? "Waiting")}`
              : state === "done"
                ? "stage-done"
                : state === "in-progress"
                  ? "stage-in-flight"
                  : "none";
        return (
          <li key={c.id}>
            <span className={`work-swatch ${swatch}`} aria-hidden="true" />
            {it ? (
              <ItemLink
                id={c.id}
                className="work-pcons-link"
                label={`${c.id} ${e?.title ?? ""}, ${state ? STATE_NAMES[state] : "not in the tracker"}`}
              >
                <KindId id={c.id} />
              </ItemLink>
            ) : (
              <KindId id={c.id} />
            )}
            <span className="work-pcons-title">
              {e ? <InlineText text={e.title} /> : "not in the tracker"}
            </span>
            <span className="work-pcons-state">
              {state ? STATE_NAMES[state] : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Your move's proposals (CS-688): the current "to discuss" batch and every
 * one ready for the owner's yes, each with its header and a link into the
 * Proposals view, where it is chosen and opened.
 */
function OwnerProposals({
  proposals,
  selected,
  limit,
}: {
  proposals: Proposal[];
  selected?: string;
  limit: number;
}) {
  if (!proposals.length) {
    return (
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-empty"
      >
        No proposal waits on you.
      </Typography>
    );
  }
  return (
    <ul className="work-rows work-yourprops">
      {proposals.slice(0, limit).map((p) => (
        <li
          key={p.id}
          className={`work-row${p.id === selected ? " selected" : ""}`}
        >
          <RouterLink
            to="/work"
            search={(prev: WorkSearch) => ({
              ...prev,
              view: "proposals",
              stage: undefined,
              list: undefined,
              item: p.id,
            })}
            className="work-row-main"
            aria-label={`${p.id} ${p.title}, ${PROPOSAL_STAGE_NAMES[p.stage]}: open it in Proposals`}
          >
            <KindId id={p.id} />
            <span className="work-row-title">
              <InlineText text={p.title} />
            </span>
            <span className={`work-pstage-tag ${p.stage}`}>
              {PROPOSAL_STAGE_NAMES[p.stage]}
            </span>
          </RouterLink>
          <div className="work-yourprops-head">
            <ProposalHeaderLines p={p} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** How many IDs a proposal's cell names before "+ N more". */
const GATE_REFS = 2;

function GateRefs({
  needs,
}: {
  needs: Array<WorkItem | WorkMilestone | string>;
}) {
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
  card = false,
}: {
  id: string;
  className?: string;
  children: ReactNode;
  label?: string;
  /** A quick tooltip (what its color means). */
  tip?: string;
  /** A list's row: the hover card describes it (CS-696). */
  card?: boolean;
}) {
  const link = (
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
  return card ? <WorkHoverCard id={id}>{link}</WorkHoverCard> : link;
}

/** What moved on one day of the flow (CS-698), each move a group of rows. */
function DayMoves({
  d,
  itemOf,
  selected,
}: {
  d: FlowDay;
  itemOf: Map<string, WorkItem>;
  selected?: string;
}) {
  if (d.first || !d.groups.length) {
    return (
      <Typography variant="body-md" color="textSecondary" render={<p />}>
        {d.first
          ? "The history's first day: its items were all imported, so nothing moved."
          : "Nothing moved that day."}
      </Typography>
    );
  }
  return (
    <div className="work-groups">
      <Typography variant="caption-md" color="textSecondary" render={<p />}>
        {d.moved} {d.moved === 1 ? "item" : "items"} moved
        {d.today ? " so far today" : ""}; the total changed by{" "}
        {changeText(d.totalChange ?? 0)}.
      </Typography>
      {d.groups.map((g) => (
        <section key={g.label} className="work-group">
          <header className="work-group-header">
            <Typography
              variant="subtitle-md"
              render={<h2 />}
              className="work-marked"
            >
              {g.to && (
                <span
                  className={`work-swatch stage-${slug(g.to)}`}
                  aria-hidden="true"
                />
              )}
              {g.label}
            </Typography>
            <Typography variant="caption-md" color="textSecondary">
              {g.ids.length} {g.ids.length === 1 ? "item" : "items"}
            </Typography>
          </header>
          <ul className="work-rows">
            {g.ids.map((id) => (
              <li
                key={id}
                className={`work-row${id === selected ? " selected" : ""}`}
              >
                <ItemLink id={id} className="work-row-main" card>
                  <KindId id={id} />
                  <span className="work-row-title">
                    <InlineText text={itemOf.get(id)?.title ?? id} />
                  </span>
                </ItemLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
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
                      <ItemLink id={it.id} className="work-row-main" card>
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
            {(it || m) && <DependenciesLink id={id} />}
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
  const snap = useContext(SnapshotContext);
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
      {bar && snap && (
        <LabeledStageBar
          s={snap}
          items={items.map((x) => x.id)}
          flight={flight}
          counts={counts}
          focusable
        />
      )}
      <ul className="work-pane-stages">
        {stageWords(counts).map(({ st, text }) => (
          <li key={st}>
            <span
              className={`work-swatch stage-${slug(st)}`}
              aria-hidden="true"
            />
            {text}
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
              : `Earliest in wave ${row.step}, after wave ${row.step - 1}`}
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
            card
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
            card
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
  across = false,
  children,
}: {
  zoom: number;
  onZoom: (zoom: number) => void;
  /** Zooms across only: the rows keep their height (the Plan view). */
  across?: boolean;
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
      zoomTo(
        fitZoom(
          { w: el.clientWidth, h: el.clientHeight },
          base,
          fixed,
          across ? "across" : "both",
        ),
        {
          px: 0,
          py: 0,
          cx: 0,
          cy: 0,
        },
      );
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

// ------------------------------------------------------------ release bands

/** A milestone or an item named in a problem: its mark, its name, a link to open it. */
function ClosureRef({
  id,
  titleOf,
  onOpen,
  short = false,
}: {
  id: string;
  titleOf: (id: string) => string;
  onOpen: (id: string) => void;
  /** Its ID alone, named on hover: once the problem has named it in full. */
  short?: boolean;
}) {
  // The button holds the ID alone: a button can't break across lines,
  // so the name follows as text and the sentence flows on.
  return (
    <>
      <Link
        component="button"
        type="button"
        className="work-closure-ref"
        onClick={() => onOpen(id)}
        title={`${titleOf(id)}: open it`}
        aria-label={`${id}, ${titleOf(id)}`}
      >
        <KindId id={id} />
      </Link>
      {!short && <> “{titleOf(id)}”</>}
    </>
  );
}

/** The two fixes for a break of the closure rule, in words. */
function closureFixes(
  v: ClosureViolation,
  version: string,
): Array<{ text: string; refs: string[] }> {
  const pulls = v.path.length > 2 ? v.path[1]! : undefined;
  const held = v.milestones[0];
  if (v.kind === "milestone") {
    return [
      {
        text: `Have ${version} need {0} itself, so it joins ${version}'s band.`,
        refs: [v.item],
      },
      {
        text: `Split {0}, so the part that needs {1} becomes a milestone of a later release.`,
        refs: [v.path.at(-2)!, v.item],
      },
    ];
  }
  if (v.kind === "direct") {
    return held
      ? [
          {
            text: `Move {0} into a milestone ${version} needs, instead of naming it on the release.`,
            refs: [v.item],
          },
          {
            text: `Split {0}, so {1} is in a milestone of its own that ${version} needs.`,
            refs: [held, v.item],
          },
        ]
      : [
          {
            text: `Move {0} into a milestone ${version} needs, instead of naming it on the release.`,
            refs: [v.item],
          },
          {
            text: `Give {0} a milestone of its own, and have ${version} need that.`,
            refs: [v.item],
          },
        ];
  }
  return [
    {
      text: pulls
        ? `Move {0} into a milestone ${version} needs, such as {1}, which pulls it in.`
        : `Move {0} into a milestone ${version} needs.`,
      refs: pulls ? [v.item, pulls] : [v.item],
    },
    {
      text: `Split {0}, so {1} is in a milestone of its own that ${version} needs.`,
      refs: [held!, v.item],
    },
  ];
}

/** "{0} and {1}" with refs in place of the numbers. */
function withRefs(
  text: string,
  refs: readonly string[],
  ref: (id: string) => ReactNode,
): ReactNode[] {
  return text
    .split(/(\{\d\})/)
    .map((part, i) =>
      /^\{\d\}$/.test(part) ? (
        <Fragment key={i}>{ref(refs[Number(part.slice(1, -1))]!)}</Fragment>
      ) : (
        part
      ),
    );
}

/** One break of the closure rule: what, from where, the path, and the fixes. */
function ClosureProblem({
  v,
  version,
  band,
  titleOf,
  onOpen,
}: {
  v: ClosureViolation;
  version: string;
  /** Where the milestone that holds it sits: a later release's band, or none. */
  band?: string;
  titleOf: (id: string) => string;
  onOpen: (id: string) => void;
}) {
  const kinds = useContext(KindsContext);
  const ref = (id: string) => (
    <ClosureRef id={id} titleOf={titleOf} onOpen={onOpen} />
  );
  const held = v.milestones[0];
  return (
    <li className="work-problem">
      <p className="work-problem-what">
        {v.kind === "milestone" ? (
          <>
            {ref(v.path.at(-2)!)} names {ref(v.item)}, a milestone {version}{" "}
            doesn't need
          </>
        ) : v.kind === "direct" ? (
          <>
            {version} needs the item {ref(v.item)} itself
            {held ? <>, which is in {ref(held)}</> : ", in no milestone"}: a
            release needs milestones only
          </>
        ) : (
          <>
            {version} pulls in {ref(v.item)}, which is in {ref(held!)}
          </>
        )}
        {band && v.kind !== "direct" && (
          <span className="work-problem-band">
            {" "}
            ({band === "No release" ? "no release needs it" : `${band}'s band`})
          </span>
        )}
        .
      </p>
      {v.path.length > 2 && (
        <div className="work-problem-path">
          <Typography variant="caption-md" color="textSecondary">
            Through
          </Typography>
          <ol aria-label="The needs from the release to it">
            {v.path.map((id) => (
              <li key={id} data-tip={titleOf(id)}>
                <button
                  type="button"
                  className="work-problem-step"
                  aria-label={`${ENTITY_KIND_NAMES[kinds.get(id) ?? "work"]} ${id}, ${titleOf(id)}`}
                  onClick={() => onOpen(id)}
                >
                  <KindId id={id} />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <Typography variant="caption-md" color="textSecondary" render={<p />}>
        Fix it in the tracker, one of two ways:
      </Typography>
      <ul className="work-problem-fixes">
        {closureFixes(v, version).map((f) => (
          <li key={f.text}>
            {withRefs(f.text, f.refs, (id) => (
              <ClosureRef id={id} titleOf={titleOf} onOpen={onOpen} short />
            ))}
          </li>
        ))}
      </ul>
    </li>
  );
}

/**
 * Each release and the milestones it needs, with the closure rule's
 * breaks under it as problems to fix in the tracker (CS-685). The
 * problems always show; a release's milestones fold away behind it.
 * Pointing at a release lights its milestones.
 */
function ReleaseClosures({
  s,
  closures,
  onHover,
  onOpen,
  onItem,
}: {
  s: WorkSnapshot;
  closures: readonly ReleaseClosure[];
  onHover: (id: string | undefined) => void;
  /** Opens a milestone in the pane. */
  onOpen: (id: string) => void;
  /** Opens an item in the pane. */
  onItem: (id: string) => void;
}) {
  const head = useId();
  const msOf = useMemo(() => new Map(s.milestones.map((m) => [m.id, m])), [s]);
  const itemOf = useMemo(() => new Map(s.items.map((i) => [i.id, i])), [s]);
  const titleOf = (id: string) =>
    msOf.get(id)?.title ?? itemOf.get(id)?.title ?? id;
  const open = (id: string) => (msOf.has(id) ? onOpen(id) : onItem(id));
  const { bands, bandOf } = useMemo(
    () => releaseBandsOf(s, closures),
    [s, closures],
  );
  const problems = closures.reduce((n, c) => n + c.violations.length, 0);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  if (!closures.length) {
    return null;
  }
  return (
    <section className="work-closure" aria-labelledby={head}>
      <div className="work-closure-head">
        <Typography variant="body-sm" render={<h3 id={head} />}>
          Releases and the milestones they need
        </Typography>
        <Typography
          variant="caption-md"
          color="textSecondary"
          render={<p />}
          className={problems ? "work-closure-count" : "work-closure-whole"}
        >
          {problems ? (
            <>
              <b>
                {problems} {problems === 1 ? "problem" : "problems"} to fix in
                the tracker:
              </b>{" "}
              a release needs whole milestones, so each item its milestones pull
              in belongs in one of them, or in none.
            </>
          ) : (
            <>
              <Icon href={svgCheckmark} />
              No problems: each item a release's milestones pull in is in one of
              its milestones, or in none.
            </>
          )}
        </Typography>
      </div>
      <ul className="work-closure-list">
        {closures.map((c) => {
          const isOpen = !!shown[c.id];
          const before = c.after
            .map((a) => closures.find((x) => x.id === a)?.version)
            .filter(Boolean);
          return (
            <li
              key={c.id}
              className={`work-closure-release${c.violations.length ? " broken" : ""}`}
            >
              <button
                type="button"
                className="work-closure-toggle"
                aria-expanded={isOpen}
                onClick={() => setShown({ ...shown, [c.id]: !isOpen })}
                onPointerEnter={() => onHover(c.id)}
                onPointerLeave={() => onHover(undefined)}
                onFocus={() => onHover(c.id)}
                onBlur={() => onHover(undefined)}
              >
                <Icon href={isOpen ? svgChevronDown : svgChevronRight} />
                <KindMark kind="release" named={false} />
                <b className={c.proposed ? "work-closure-proposed" : undefined}>
                  {c.version}
                </b>
                <span className="work-closure-meta">
                  {c.milestones.length}{" "}
                  {c.milestones.length === 1 ? "milestone" : "milestones"}
                  {before.length > 0 &&
                    `, after ${andList(before as string[])}`}
                </span>
                {c.violations.length > 0 ? (
                  <StatusBadge tone="warning">
                    {c.violations.length} to fix
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="success">Whole</StatusBadge>
                )}
              </button>
              {(isOpen || c.violations.length > 0) && (
                <div className="work-closure-body">
                  {!isOpen ? null : c.milestones.length > 0 ? (
                    <ul
                      className="work-closure-ms"
                      aria-label={`The milestones ${c.version} needs`}
                    >
                      {c.milestones.map((m) => (
                        <li key={m}>
                          <Link
                            component="button"
                            type="button"
                            onClick={() => onOpen(m)}
                          >
                            <KindMark kind="milestone" named={false} />
                            {titleOf(m)}
                          </Link>
                          {bandOf.get(m) !== closures.indexOf(c) && (
                            <span className="work-closure-earlier">
                              {" "}
                              (in {bands[bandOf.get(m)!]?.name}'s band)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Typography
                      variant="caption-md"
                      color="textSecondary"
                      render={<p />}
                    >
                      It names no milestone of its own yet.
                    </Typography>
                  )}
                  {c.violations.length > 0 && (
                    <ol className="work-problems" aria-label="Problems to fix">
                      {c.violations.map((v) => (
                        <ClosureProblem
                          key={v.item}
                          v={v}
                          version={c.version}
                          band={
                            v.milestones[0] !== undefined
                              ? bands[bandOf.get(v.milestones[0])!]?.name
                              : undefined
                          }
                          titleOf={titleOf}
                          onOpen={open}
                        />
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------ the Plan view

/** The rows' heights: a release, a milestone or a group, an item. */
const PLAN_ROW = { band: 44, ms: 32, item: 28 } as const;
/** Pixels per item's worth of work at 100%, so an item's bar can be seen. */
const PLAN_UNIT_PX = 8;

/** A position across, in the plan's unit, for tips and sentences. */
const planAt = (p: Plan, v: number) =>
  p.unit === "tokens" ? tokenText(v) : String(Math.round(v));

/** An amount of work in the plan's unit. */
const planAmount = (p: Plan, v: number) =>
  p.unit === "tokens"
    ? `${tokenText(v)} tokens`
    : `${Math.round(v)} ${Math.round(v) === 1 ? "item" : "items"}`;

const slotsText = (n: number) => (n === 1 ? "one slot" : `${n} slots`);

/** What across measures, in a few words. */
const planAxisText = (p: Plan) =>
  `${p.unit === "tokens" ? "Tokens of work" : "Items of work"}${p.slots > 1 ? " per slot" : ""}, ${slotsText(p.slots)}`;

/** What the plan says about sizes: how many items it counted at a default. */
function planSizeNote(p: Plan): string | undefined {
  const n = p.items.size;
  if (!n) {
    return undefined;
  }
  if (p.unit === "items") {
    return `No item has a token estimate yet, so across is item count: each of the ${n} ${n === 1 ? "item" : "items"} counts as one.`;
  }
  return p.defaulted
    ? `${p.defaulted} of the ${n} items have no token estimate and count at the median of the rest, ${tokenText(p.defaultSize)} tokens.`
    : undefined;
}

/** How the plan is read: the "?" beside the key line. */
function PlanHelp({ plan }: { plan: Plan }) {
  const tokens = useChartTokens();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const head = useId();
  return (
    <>
      <IconButton
        size="small"
        label="How to read the plan"
        aria-haspopup="dialog"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(e.currentTarget)}
        className="work-plan-help"
      >
        <span aria-hidden="true">?</span>
      </IconButton>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            className: `work-plan-pop ${tokens}`,
            role: "dialog",
            "aria-labelledby": head,
          } as object,
        }}
      >
        <Typography variant="body-md" render={<h3 />} id={head}>
          Reading the plan
        </Typography>
        <Typography variant="body-sm" render={<p />}>
          Across is the work in the order the run would do it, in{" "}
          {plan.unit === "tokens" ? "tokens" : "items"}
          {plan.slots > 1 ? " per executor slot" : ""}. There are no dates and
          no durations: a bar&apos;s place says how much work comes before it,
          never when.
        </Typography>
        <Typography variant="body-sm" render={<p />}>
          Rows are the releases in the order they ship, then the work no release
          needs. Open a release for its milestones, and a milestone for its
          items. A milestone&apos;s bar runs from its first item&apos;s start to
          its last item&apos;s finish, with each item&apos;s stretch filled by
          its stage.
        </Typography>
        <div className="work-key-groups">
          <KeyGroup title="Fill: each item's stage now">
            <StageKeys />
          </KeyGroup>
          <KeyGroup title="Marks">
            <KeyItem mark={<KindMark kind="milestone" named={false} />}>
              A milestone
            </KeyItem>
            <KeyItem mark={<KindMark kind="work" named={false} />}>
              A work item
            </KeyItem>
            <KeyItem mark={<KindMark kind="decision" named={false} />}>
              After a bar: it waits on a decision, assumed answered in time
            </KeyItem>
            <KeyItem mark={<KindMark kind="external" named={false} />}>
              After a bar: it waits on another party, assumed in time
            </KeyItem>
            <KeyItem mark={<span className="work-plan-key-proposed" />}>
              Dashed outline: proposed, not committed yet
            </KeyItem>
            <KeyItem mark={<span className="work-plan-key-pole" />}>
              A release&apos;s marker: where its last needed item finishes
            </KeyItem>
            <KeyItem mark={<span className="work-plan-key-lit" />}>
              Outlined: the chain that sets the chosen release&apos;s finish
            </KeyItem>
          </KeyGroup>
        </div>
        <Typography
          variant="body-sm"
          render={<h4 />}
          className="work-plan-pop-h"
        >
          How it is sequenced
        </Typography>
        <Typography variant="body-sm" render={<p />}>
          Each executor slot (the run&apos;s <code>max_executors</code>) takes
          the next item in the planner&apos;s order whose needs are all
          finished. The order is work already in progress first, then an earlier
          release&apos;s work before a later one&apos;s, then hitld&apos;s queue
          rule: the item that unblocks the most open work, then the smaller
          estimate, then the lower ID. Work that a release&apos;s items need is
          done in that release, wherever its milestone sits. Decisions and
          outside waits take no slot.
        </Typography>
      </Popover>
    </>
  );
}

/** One row of the plan, in the order drawn. */
type PlanRow =
  | { key: string; kind: "band"; band: PlanBand; k: number }
  | { key: string; kind: "ms"; ms: PlanMilestone; band: PlanBand }
  | { key: string; kind: "loose"; band: PlanBand }
  | { key: string; kind: "item"; id: string }
  | { key: string; kind: "idle"; band: PlanBand };

/** The Plan view's bar: a light track over a span, each item's stretch filled by its stage. */
function PlanBar({
  plan,
  ids,
  x,
  span,
  card,
  onOpen,
  proposed,
  stageOf: stageFor,
  segLabel,
  lit,
  needed,
}: {
  plan: Plan;
  ids: readonly string[];
  x: (v: number) => number;
  span: [number, number];
  /** The mark the hover card describes (CS-696); none for a group of loose items. */
  card?: string;
  /** Opens it in the pane. */
  onOpen?: () => void;
  /** Each segment's own label, where the bar holds several items. */
  segLabel: (id: string) => string;
  proposed?: boolean;
  stageOf: (id: string) => Stage | undefined;
  /** The chosen release's finishing chain. */
  lit?: ReadonlySet<string>;
  /** What the chosen release needs: the rest is dimmed. */
  needed?: ReadonlySet<string>;
}) {
  const left = x(span[0]);
  const w = Math.max(3, x(span[1]) - left);
  const track = (
    <span
      className={`work-plan-track${proposed ? " proposed" : ""}${needed && !ids.some((id) => needed.has(id)) ? " dim" : ""}${onOpen ? " opens" : ""}`}
      style={{ left, width: w }}
      onClick={onOpen}
    >
      {ids.map((id) => {
        const p = plan.items.get(id)!;
        const st = stageFor(id);
        const seg = (
          <span
            key={id}
            className={`work-plan-seg${st ? ` stage-${slug(st)}` : ""}${lit?.has(id) ? " lit" : ""}${needed && !needed.has(id) ? " dim" : ""}`}
            style={{
              left: x(p.start) - left,
              width: Math.max(2, x(p.finish) - x(p.start) - 1),
            }}
          />
        );
        return ids.length > 1 ? (
          <SegmentTip key={id} label={segLabel(id)}>
            {seg}
          </SegmentTip>
        ) : (
          seg
        );
      })}
    </span>
  );
  return card ? <WorkHoverCard id={card}>{track}</WorkHoverCard> : track;
}

/**
 * The Plan view (CS-692), the roadmap's default: what gets built when, with
 * no dates. Rows are releases in ladder order, opening to milestones and
 * then items; across is the work in the planner's order as the run's
 * executor slots would do it (`planOf`). Each release is a marker where
 * its last needed item finishes; choosing one lights the chain that sets
 * its finish. Text keeps its size at every zoom; only places and lengths
 * scale, so nothing animates.
 */
function PlanView({
  s,
  flight,
  proposals,
  slots,
  onSlots,
  release,
  onRelease,
  selected,
  onOpen,
  onItem,
  onDeps,
}: {
  s: WorkSnapshot;
  flight: InFlight;
  /** Proposed work too, outlined dashed. */
  proposals: boolean;
  slots: number;
  onSlots: (n: number) => void;
  /** The chosen release: what sets its finish is lit. */
  release?: string;
  onRelease: (id: string | undefined) => void;
  /** The milestone open in the pane. */
  selected?: string;
  onOpen: (milestone: string) => void;
  onItem: (id: string) => void;
  /** Opens the Dependencies view centered on a milestone or item (CS-694). */
  onDeps: (id: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  // A row's way to its Dependencies view: what it waits on and unblocks.
  const depsButton = (id: string, title: string) => (
    <IconButton
      label={`What ${id} waits on and unblocks`}
      size="small"
      className="work-plan-deps"
      onClick={() => onDeps(id)}
      data-tip={`${title}: its dependencies`}
    >
      <Icon href={svgHierarchyTree} />
    </IconButton>
  );
  const plan = useMemo(
    () => planOf(s, { slots, proposals, flight }),
    [s, slots, proposals, flight],
  );
  const closures = useMemo(
    () => releaseClosuresOf(proposals ? s : committedOnly(s), proposals),
    [s, proposals],
  );
  const itemOf = useMemo(() => new Map(s.items.map((i) => [i.id, i])), [s]);
  const msOf = useMemo(() => new Map(s.milestones.map((m) => [m.id, m])), [s]);
  const titleOf = (id: string) =>
    msOf.get(id)?.title ?? itemOf.get(id)?.title ?? id;
  const stageFor = (id: string) => {
    const it = itemOf.get(id);
    return it && stageOf(it, flight);
  };
  // Releases start folded but the first with work, whose milestones show.
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        plan.bands
          .filter((b) => b.items.length)
          .slice(0, 1)
          .map((b) => `band:${b.id}`),
      ),
  );
  const toggle = (key: string) =>
    setOpen((was) => {
      const next = new Set(was);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });
  const everyKey = () =>
    new Set(
      plan.bands.flatMap((b) => [
        `band:${b.id}`,
        `loose:${b.id}`,
        ...b.milestones.map((m) => `ms:${b.id}:${m}`),
      ]),
    );
  // The zoom fits the whole plan until it is changed, and again when the
  // plan's length changes (another slot count, say).
  const [zoomAsked, setZoom] = useState<number>();
  useEffect(() => setZoom(undefined), [plan.total]);
  const laneW = width < 480 ? 116 : width < 820 ? 220 : 300;
  const avail = Math.max(160, width - laneW - 14);
  const perItem = plan.unit === "tokens" ? plan.defaultSize : 1;
  const base = Math.max(
    avail,
    (plan.total / Math.max(1e-9, perItem)) * PLAN_UNIT_PX,
  );
  const zoom =
    zoomAsked ??
    fitZoom(
      { w: laneW + avail, h: 1 },
      { w: laneW + base, h: 1 },
      { x: laneW, y: 0 },
      "across",
    );
  const plotW = base * zoom;
  const total = Math.max(1e-9, plan.total);
  const x = (v: number) => (v / total) * plotW;

  const chosen = plan.releases.find(
    (r) => r.id === release && r.at !== undefined,
  );
  const lit = chosen && new Set(chosen.chain);
  const needed = chosen && new Set(chosen.needed);
  const [hoverMarker, setHoverMarker] = useState<string>();

  // The markers' labels along the top, stacked where they would overlap.
  const placed = plan.releases.filter((r) => r.at !== undefined);
  const LABEL_ROW = 30;
  // On a narrow plot a prerelease is named by its tag alone ("alpha.1").
  const short = plotW < 640;
  const versionOf = (r: PlanRelease) =>
    short ? r.version.replace(/^\d+\.\d+\.\d+-/, "") : r.version;
  const labelW = (r: PlanRelease) => 40 + 7.5 * versionOf(r).length;
  const rowEnds: number[] = [];
  const labelAt = new Map<
    string,
    { row: number; left: number; flip: boolean }
  >();
  for (const r of placed) {
    const at = x(r.at!);
    const w = labelW(r);
    const flip = at + w > plotW + 4 && at - w >= 0;
    const left = flip ? at - w : at;
    let row = rowEnds.findIndex((e) => e + 6 <= left);
    if (row < 0) {
      row = rowEnds.length;
      rowEnds.push(0);
    }
    rowEnds[row] = left + w;
    labelAt.set(r.id, { row, left, flip });
  }
  const MARKERS = Math.max(1, rowEnds.length) * LABEL_ROW + 6;
  const AXIS = 24;
  const HEAD = MARKERS + AXIS;
  const ticks = niceTicks(plan.total);

  const rows: PlanRow[] = [];
  plan.bands.forEach((b, k) => {
    if (!b.items.length && !b.idle.length) {
      return;
    }
    rows.push({ key: `band:${b.id}`, kind: "band", band: b, k });
    if (!open.has(`band:${b.id}`)) {
      return;
    }
    for (const m of b.milestones) {
      const ms = plan.milestones.get(m)!;
      const key = `ms:${b.id}:${m}`;
      rows.push({ key, kind: "ms", ms, band: b });
      if (open.has(key)) {
        rows.push(
          ...ms.items.map((id) => ({
            key: `${key}:${id}`,
            kind: "item" as const,
            id,
          })),
        );
      }
    }
    if (b.loose.length) {
      const key = `loose:${b.id}`;
      rows.push({ key, kind: "loose", band: b });
      if (open.has(key)) {
        rows.push(
          ...b.loose.map((id) => ({
            key: `${key}:${id}`,
            kind: "item" as const,
            id,
          })),
        );
      }
    }
    if (b.idle.length) {
      rows.push({ key: `idle:${b.id}`, kind: "idle", band: b });
    }
  });
  const heightOf = (r: PlanRow) =>
    r.kind === "band"
      ? PLAN_ROW.band
      : r.kind === "item"
        ? PLAN_ROW.item
        : PLAN_ROW.ms;
  const bodyH = rows.reduce((h, r) => h + heightOf(r), 0);
  const fullW = laneW + plotW + 16;

  const sizeNote = planSizeNote(plan);
  const unplaced = plan.releases.filter((r) => r.at === undefined);
  const heldOf = (ids: readonly string[]) => [
    ...new Set(ids.flatMap((id) => plan.items.get(id)!.held)),
  ];

  if (!plan.items.size) {
    return (
      <Typography variant="body-sm" color="textSecondary" render={<p />}>
        No open work to sequence.
      </Typography>
    );
  }

  const segLabel = (id: string) => {
    const it = itemOf.get(id);
    const st = stageFor(id);
    const t = it?.title ?? id;
    const head = `${id} ${t.length > 48 ? `${t.slice(0, 45)}…` : t}`;
    const waits = it?.open_needs ?? [];
    return `${head} · ${st ? STAGE_NAMES[st] : "Dropped"}${
      st === "Waiting" && waits.length
        ? `: waiting on ${andList(waits.slice(0, 2))}${waits.length > 2 ? ` and ${waits.length - 2} more` : ""}`
        : ""
    }`;
  };
  const label = (r: PlanRow) => {
    switch (r.kind) {
      case "band": {
        const key = `band:${r.band.id}`;
        const none = r.band.id === NO_RELEASE;
        const n = r.band.milestones.length + r.band.idle.length;
        const toggleButton = (
          <button
            type="button"
            className="work-plan-toggle band"
            aria-expanded={open.has(key)}
            onClick={() => toggle(key)}
          >
            <Icon href={open.has(key) ? svgChevronDown : svgChevronRight} />
            {!none && <KindMark kind="release" named={false} />}
            <span className="work-plan-name">
              <b>{none ? "No release needs these" : r.band.name}</b>
              <span className="work-plan-sub">
                {n} {n === 1 ? "milestone" : "milestones"} ·{" "}
                {r.band.items.length}{" "}
                {r.band.items.length === 1 ? "item" : "items"}
              </span>
            </span>
          </button>
        );
        return none ? (
          toggleButton
        ) : (
          <WorkHoverCard
            id={r.band.id}
            click={`Click to ${open.has(key) ? "hide" : "show"} its milestones`}
          >
            {toggleButton}
          </WorkHoverCard>
        );
      }
      case "ms": {
        const key = `ms:${r.band.id}:${r.ms.id}`;
        return (
          <span
            className={`work-plan-ms${r.ms.id === selected ? " selected" : ""}`}
          >
            <button
              type="button"
              className="work-plan-chevron"
              aria-expanded={open.has(key)}
              aria-label={`${open.has(key) ? "Hide" : "Show"} the items of ${r.ms.title}`}
              onClick={() => toggle(key)}
            >
              <Icon href={open.has(key) ? svgChevronDown : svgChevronRight} />
            </button>
            <WorkHoverCard id={r.ms.id}>
              <button
                type="button"
                className="work-plan-open k-milestone"
                onClick={() => onOpen(r.ms.id)}
              >
                <KindMark kind="milestone" />
                {r.ms.proposed && <ProposedLabel />}
                <span className="work-plan-title">{r.ms.title}</span>
              </button>
            </WorkHoverCard>
            {depsButton(r.ms.id, r.ms.title)}
          </span>
        );
      }
      case "loose": {
        const key = `loose:${r.band.id}`;
        const none = r.band.id === NO_RELEASE;
        return (
          <button
            type="button"
            className="work-plan-toggle loose"
            aria-expanded={open.has(key)}
            onClick={() => toggle(key)}
            data-tip={
              none
                ? "Open items no milestone holds"
                : `Items no ${r.band.name} milestone holds: in no milestone, or in a later release's milestone that ${r.band.name}'s work needs`
            }
          >
            <Icon href={open.has(key) ? svgChevronDown : svgChevronRight} />
            <span className="work-plan-title">
              {none ? "In no milestone" : `Not in a ${r.band.name} milestone`}{" "}
              <span className="work-plan-sub">({r.band.loose.length})</span>
            </span>
          </button>
        );
      }
      case "item": {
        const it = itemOf.get(r.id)!;
        return (
          <span className="work-plan-ms">
            <WorkHoverCard id={r.id}>
              <button
                type="button"
                className="work-plan-open item"
                onClick={() => onItem(r.id)}
              >
                <KindId id={r.id} kind="work" />
                {it.state === "proposed" && <ProposedLabel />}
                <span className="work-plan-title">{it.title}</span>
              </button>
            </WorkHoverCard>
            {depsButton(r.id, it.title)}
          </span>
        );
      }
      case "idle":
        return (
          <Typography
            variant="caption-md"
            color="textSecondary"
            className="work-plan-idle"
          >
            Also needed, with no work to sequence:{" "}
            {r.band.idle.map((m, i) => (
              <span key={m}>
                {i > 0 && ", "}
                <Link
                  component="button"
                  type="button"
                  onClick={() => onOpen(m)}
                >
                  {titleOf(m)}
                </Link>
              </span>
            ))}
          </Typography>
        );
    }
  };
  const heldMarks = (ids: readonly string[], after: number) => {
    const held = heldOf(ids);
    if (!held.length || after + 24 > plotW + 8) {
      return null;
    }
    const kinds = new Set(held.map((h) => itemOf.get(h)?.kind));
    return (
      <span
        className="work-plan-held"
        style={{ left: after + 6 }}
        data-tip={`Waits on ${andList(held.slice(0, 3).map((h) => `${h} “${titleOf(h)}”`))}${held.length > 3 ? ` and ${held.length - 3} more` : ""}; the plan assumes ${held.length === 1 ? "it is" : "they are"} answered in time`}
      >
        {kinds.has("decision") && <KindMark kind="decision" />}
        {kinds.has("external") && <KindMark kind="external" />}
      </span>
    );
  };
  const bar = (r: PlanRow) => {
    switch (r.kind) {
      case "band":
        return r.band.items.length ? (
          <>
            <PlanBar
              plan={plan}
              ids={r.band.items}
              x={x}
              span={[r.band.start, r.band.finish]}
              card={r.band.id === NO_RELEASE ? undefined : r.band.id}
              onOpen={
                r.band.id === NO_RELEASE ? undefined : () => onItem(r.band.id)
              }
              segLabel={segLabel}
              stageOf={stageFor}
              lit={lit}
              needed={needed}
            />
          </>
        ) : null;
      case "ms":
        return (
          <>
            <PlanBar
              plan={plan}
              ids={r.ms.items}
              x={x}
              span={[r.ms.start, r.ms.finish]}
              card={r.ms.id}
              onOpen={() => onOpen(r.ms.id)}
              segLabel={segLabel}
              proposed={r.ms.proposed}
              stageOf={stageFor}
              lit={lit}
              needed={needed}
            />
            {heldMarks(r.ms.items, x(r.ms.finish))}
          </>
        );
      case "loose":
        return (
          <PlanBar
            plan={plan}
            ids={r.band.loose}
            x={x}
            span={[
              Math.min(...r.band.loose.map((id) => plan.items.get(id)!.start)),
              Math.max(...r.band.loose.map((id) => plan.items.get(id)!.finish)),
            ]}
            segLabel={segLabel}
            stageOf={stageFor}
            lit={lit}
            needed={needed}
          />
        );
      case "item": {
        const p = plan.items.get(r.id)!;
        const it = itemOf.get(r.id)!;
        return (
          <>
            <PlanBar
              plan={plan}
              ids={[r.id]}
              x={x}
              span={[p.start, p.finish]}
              card={r.id}
              onOpen={() => onItem(r.id)}
              segLabel={segLabel}
              proposed={it.state === "proposed"}
              stageOf={stageFor}
              lit={lit}
              needed={needed}
            />
            {heldMarks([r.id], x(p.finish))}
          </>
        );
      }
      case "idle":
        return null;
    }
  };

  // What sets the chosen release's finish, counted for its sentence.
  const chainStart = chosen?.chain.length
    ? plan.items.get(chosen.chain[0]!)!.start
    : 0;
  const before = chosen
    ? plan.order.filter((id) => plan.items.get(id)!.finish <= chainStart)
    : [];
  const neededBefore = before.filter((id) => needed!.has(id)).length;
  // Other work in the slots while the chain runs.
  const between = chosen
    ? plan.order.filter((id) => {
        const p = plan.items.get(id)!;
        return !lit!.has(id) && p.start >= chainStart && p.finish <= chosen.at!;
      }).length
    : 0;
  const heldNeeded = chosen ? heldOf(chosen.needed).length : 0;
  const why = chosen && (
    <div className="work-plan-why" role="status">
      <Typography variant="body-sm" render={<p />}>
        <b>
          {chosen.version} finishes at {planAt(plan, chosen.at!)}
        </b>
        {chosen.last ? (
          <>
            , when the last of the {chosen.needed.length} open items it needs is
            done: <KindId id={chosen.last} kind="work" /> “
            {titleOf(chosen.last)}”.{" "}
            {chosen.chain.length === 1 ? (
              <>
                That item needs no other open item, so no chain of needs leads
                to it
              </>
            ) : (
              <>
                It ends a chain of {chosen.chain.length} items that must go in
                order, {planAmount(plan, chosen.chainSize)} of work:{" "}
                {chosen.chain.map((id, k) => (
                  <span key={id}>
                    {k > 0 && " → "}
                    <Link
                      component="button"
                      type="button"
                      onClick={() => onItem(id)}
                      title={titleOf(id)}
                    >
                      {id}
                    </Link>
                  </span>
                ))}
              </>
            )}
            .{" "}
            {chainStart > 0 ? (
              <>
                Before {chosen.chain.length === 1 ? "it" : "the chain"} starts,
                at {planAt(plan, chainStart)},{" "}
                {plan.slots === 1
                  ? "the slot works"
                  : `the ${plan.slots} slots work`}{" "}
                through {neededBefore} other{" "}
                {neededBefore === 1 ? "item" : "items"} it needs
                {before.length > neededBefore &&
                  ` and ${before.length - neededBefore} it doesn't`}
                {between > 0 &&
                  `; from then to the finish, ${chosen.chain.length === 1 ? "it shares" : `its ${chosen.chain.length} items share`} the ${plan.slots === 1 ? "slot" : "slots"} with ${between} others`}
                , in the planner&apos;s order
                {chosen.chainSize * 2 < chosen.at! &&
                  ". The amount of work sets its finish more than any chain"}
                .
              </>
            ) : (
              <>Nothing comes before it.</>
            )}
          </>
        ) : (
          <>: everything it needs is done, or waits only on decisions.</>
        )}{" "}
        {heldNeeded > 0 && (
          <>
            {heldNeeded} open{" "}
            {heldNeeded === 1
              ? "decision or outside wait holds"
              : "decisions and outside waits hold"}{" "}
            items it needs; the plan assumes{" "}
            {heldNeeded === 1 ? "it is" : "they are"} answered in time.
          </>
        )}
      </Typography>
      <Button size="small" variant="text" onClick={() => onRelease(undefined)}>
        Clear
      </Button>
    </div>
  );

  return (
    <div className="work-plan" ref={box}>
      <div className="work-plan-tools">
        <span
          className="work-plan-slots"
          role="group"
          aria-label="Executor slots"
        >
          <Typography variant="caption-lg" color="textSecondary">
            Executor slots
          </Typography>
          <IconButton
            size="small"
            label="One slot fewer"
            disabled={slots <= 1}
            onClick={() => onSlots(slots - 1)}
          >
            <span aria-hidden="true" className="work-plan-pm">
              −
            </span>
          </IconButton>
          <Tooltip title="The run's max_executors: how many items it works at once. Change it to see the plan with more executors.">
            <span className="work-plan-slot-n" aria-live="polite">
              {slots}
            </span>
          </Tooltip>
          <IconButton
            size="small"
            label="One slot more"
            disabled={slots >= SLOTS_MAX}
            onClick={() => onSlots(slots + 1)}
          >
            <span aria-hidden="true" className="work-plan-pm">
              +
            </span>
          </IconButton>
        </span>
        <span className="work-plan-fold">
          <Button
            size="small"
            variant="text"
            onClick={() => setOpen(everyKey())}
          >
            Expand all
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => setOpen(new Set())}
          >
            Collapse all
          </Button>
        </span>
      </div>
      <div className="work-plan-keyline">
        <Typography variant="caption-md" color="textSecondary" render={<p />}>
          <span className="work-plan-key-swatches" aria-hidden="true">
            {STAGES.map((st) => (
              <span key={st} className={`work-swatch stage-${slug(st)}`} />
            ))}
          </span>
          Fill: stage ·{" "}
          <span className="work-plan-key-glyphs" aria-hidden="true">
            <KindMark kind="milestone" named={false} />
            <KindMark kind="work" named={false} />
          </span>
          Glyph: kind
          {proposals && " · Dashed: proposed"} ·{" "}
          <span className="work-plan-key-pole" aria-hidden="true" /> Line: a
          release is done
        </Typography>
        <PlanHelp plan={plan} />
      </div>
      {sizeNote && (
        <Typography
          variant="caption-md"
          color="textSecondary"
          render={<p />}
          className="work-plan-note"
        >
          {sizeNote}
        </Typography>
      )}
      {why ??
        (placed.length > 0 && (
          <Typography
            variant="caption-md"
            color="textSecondary"
            render={<p />}
            className="work-plan-note"
          >
            Choose a release&apos;s marker to see what sets its finish.
          </Typography>
        ))}
      {unplaced.length > 0 && (
        <Typography
          variant="caption-md"
          color="textSecondary"
          render={<p />}
          className="work-plan-note"
        >
          Not placed yet, since{" "}
          {unplaced.length === 1 ? "it names" : "they name"} no milestone:{" "}
          {andList(unplaced.map((r) => r.version))}.
        </Typography>
      )}
      <ZoomCanvas
        zoom={zoom}
        onZoom={setZoom}
        fixed={{ x: laneW, y: HEAD + bodyH }}
        size={{ w: fullW, h: HEAD + bodyH }}
        label={`Plan: releases, milestones and items across ${planAxisText(plan).toLowerCase()}`}
        across
      >
        <div className="work-plan-grid" style={{ width: fullW }}>
          <div className="work-plan-head" style={{ height: HEAD }}>
            <span
              className="work-plan-corner"
              style={{ width: laneW, height: HEAD }}
            >
              <span>
                {width < 480 ? "Release ›" : "Release › milestone › item"}
              </span>
              <span className="work-plan-axis-name">{planAxisText(plan)}</span>
            </span>
            <span
              className="work-plan-head-plot"
              style={{ left: laneW, width: plotW, height: HEAD }}
            >
              {placed.map((r) => {
                const at = labelAt.get(r.id)!;
                const on = release === r.id;
                return (
                  <WorkHoverCard
                    key={r.id}
                    id={r.id}
                    click={
                      on
                        ? "Click to let go"
                        : "Click to see what sets its finish"
                    }
                  >
                    <button
                      type="button"
                      className={`work-flag work-plan-marker${at.flip ? " flip" : ""}${on ? " selected" : ""}${r.proposed ? " proposed" : ""}${hoverMarker && hoverMarker !== r.id ? " dim" : ""}`}
                      style={{ left: at.left, top: 4 + at.row * LABEL_ROW }}
                      aria-pressed={on}
                      aria-label={`${r.proposed ? "Proposed release" : "Release"} ${r.version}, finishes at ${planAt(plan, r.at!)}`}
                      onPointerEnter={() => setHoverMarker(r.id)}
                      onPointerLeave={() => setHoverMarker(undefined)}
                      onFocus={() => setHoverMarker(r.id)}
                      onBlur={() => setHoverMarker(undefined)}
                      onClick={() => onRelease(on ? undefined : r.id)}
                    >
                      <KindMark kind="release" named={false} />
                      <span className="work-flag-label">{versionOf(r)}</span>
                    </button>
                  </WorkHoverCard>
                );
              })}
              {ticks.map((t) => (
                <span
                  key={t}
                  className={`work-plan-tick-label${t === 0 ? " first" : ""}`}
                  style={{ left: x(t), top: MARKERS + 4 }}
                >
                  {planAt(plan, t)}
                </span>
              ))}
            </span>
          </div>
          <div className="work-plan-body" style={{ height: bodyH }}>
            <span
              className="work-plan-lines"
              style={{ left: laneW, width: plotW }}
              aria-hidden="true"
            >
              {ticks.map((t) => (
                <span
                  key={t}
                  className="work-plan-tick"
                  style={{ left: x(t) }}
                />
              ))}
              {placed.map((r) => (
                <span
                  key={r.id}
                  className={`work-plan-pole${release === r.id || hoverMarker === r.id ? " on" : ""}${r.proposed ? " proposed" : ""}`}
                  style={{ left: x(r.at!) }}
                />
              ))}
            </span>
            {rows.map((r) => (
              <div
                key={r.key}
                className={`work-plan-row ${r.kind}`}
                style={{ height: heightOf(r) }}
              >
                <span className="work-plan-label" style={{ width: laneW }}>
                  {label(r)}
                </span>
                <span className="work-plan-plot" style={{ width: plotW }}>
                  {bar(r)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ZoomCanvas>
      <ReleaseClosures
        s={proposals ? s : committedOnly(s)}
        closures={closures}
        onHover={() => undefined}
        onOpen={onOpen}
        onItem={onItem}
      />
    </div>
  );
}

// ------------------------------------------------------------ the roadmap

const SHAPE_NAMES: Record<string, string> = {
  outcome: "outcome",
  clauses: "done-when clauses",
  check: "check",
  links: "links to clauses",
};

/** A proposed milestone's name, said to screen readers too. */
function ProposedLabel() {
  return <span className="visually-hidden">Proposed: </span>;
}
