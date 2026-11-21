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
  Typography,
  useMediaQuery,
} from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgCheckmark } from "@stratakit/icons/checkmark";
import { svgChevronRight } from "@stratakit/icons/chevron-right";
import { svgCopy } from "@stratakit/icons/copy";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgFilter } from "@stratakit/icons/filter";
import { svgFolderOpen } from "@stratakit/icons/folder-open";
import { svgGitBranch } from "@stratakit/icons/git-branch";
import { svgInfo } from "@stratakit/icons/info";
import { svgSearch } from "@stratakit/icons/search";
import { svgStatusWarning } from "@stratakit/icons/status-warning";
import { Icon } from "@stratakit/mui";
import {
  getRouteApi,
  Link as RouterLink,
  useNavigate,
} from "@tanstack/react-router";
import {
  createContext,
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
  byProject,
  dependencyMatrix,
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
  mapEntityItems,
  mapEntityTitle,
  milestoneRoadmapOf,
  nextActor,
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
  StageBar as LabeledStageBar,
  WorkCardProvider,
  WorkHoverCard,
} from "./HoverCard.tsx";
import { InlineText, ItemText } from "./ItemText.tsx";
import { ProjectMatrixView, ProjectsView } from "./Projects.tsx";
import { Status as StatusBadge } from "./runParts.tsx";
import { concurrencyOf, orderPlanOf } from "./workOrder.tsx";

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
  // Dependencies view (CS-694) waits behind the Older views menu until its
  // replacement lands. The Order view (CS-749) took the Plan view's place.
  const roadmapView = pickView(
    [...VIEWS.roadmap, ...VIEWS.older],
    search.roadmap,
  )!;
  const roadmapBy = roadmapView.id;
  const olderActive = VIEWS.older.includes(roadmapView);
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
  // The hover card's scope (CS-696): the Order view's sequence (CS-749),
  // planned with the same history of how many items ran at once and the
  // same proposals, so its slip line measures on the order the view draws.
  const cardPlan = useMemo(
    () =>
      orderPlanOf(s, {
        proposals: withProposed,
        flight,
        concurrency: concurrencyOf(s, flight, Date.now()),
      }),
    [s, withProposed, flight],
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
export function FlowChart({
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

// ------------------------------------------------------------ the roadmap

const SHAPE_NAMES: Record<string, string> = {
  outcome: "outcome",
  clauses: "done-when clauses",
  check: "check",
  links: "links to clauses",
};
