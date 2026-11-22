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
import {
  HEALTH_KIND_DEFS,
  type HealthException,
  healthForOwner,
  healthInScope,
  healthOf,
  type Words,
} from "../workHealth.ts";
import {
  GROUP_NAMES,
  GROUP_RULES,
  type ProposalGroup,
  type ProposalsModel,
  proposalsViewOf,
} from "../workProposals.ts";
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
    <WorkSnapshotProvider s={snapshot} kinds={kinds}>
      <Board s={snapshot} search={search} set={set} />
    </WorkSnapshotProvider>
  );
}

/**
 * The snapshot and its kinds, for every ID drawn under it: `ItemRef` reads
 * its title and `KindId` its kind from here.
 */
export function WorkSnapshotProvider({
  s,
  kinds = kindsOf(s),
  children,
}: {
  s: WorkSnapshot;
  kinds?: ReadonlyMap<string, EntityKind>;
  children: ReactNode;
}) {
  return (
    <KindsContext.Provider value={kinds}>
      <SnapshotContext.Provider value={s}>{children}</SnapshotContext.Provider>
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
  const live = useMemo(
    () => liveBoxOf(s, size ? new Set(items.map((i) => i.id)) : undefined),
    [s, items, size],
  );
  // Your move (CS-753): built only while it is the view shown.
  const onMove = view === "move" && !pageView.Component;
  const health = useMemo(() => (onMove ? healthOf(s) : undefined), [onMove, s]);
  const proposalGroups = useMemo(
    () =>
      onMove
        ? proposalsViewOf(s, items, s.milestones.filter(msInScope), {
            weight: unblocks,
          })
        : undefined,
    // msInScope reads only the scope, which `items` follows.
    [onMove, s, items, unblocks],
  );
  const move = useMemo(() => {
    if (!health || !proposalGroups) {
      return undefined;
    }
    const ids = new Set(items.map((i) => i.id));
    const own = healthForOwner(health).exceptions;
    return yourMoveOf({
      s,
      decisions: byActor.owner.filter(isOwnerDecision),
      unmerged: live.unmerged,
      exceptions: size
        ? healthInScope({ ...health, exceptions: own }, (id) => {
            const m = msOf.get(id);
            return ids.has(id) || (!!m && msInScope(m));
          })
        : own,
      outside: byActor.outside,
      ready: byActor.agents.filter((it) => stageOf(it, flight) === "Ready"),
      proposals: proposalGroups,
      unblocks,
      since: flow.since,
      now: Date.now(),
    });
    // msInScope reads only the scope, which `items` and `size` follow.
  }, [
    health,
    proposalGroups,
    s,
    items,
    size,
    byActor,
    live,
    msOf,
    flight,
    unblocks,
    flow,
  ]);
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
              {move && (
                <YourMoveView
                  move={move}
                  live={live}
                  branch={s.branch}
                  selected={viewProps.selected}
                  openItem={viewProps.openItem}
                  goView={goView}
                />
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

// ------------------------------------------------------------ Your move (CS-753)

/**
 * Your move's ranked sections, in the order the page shows them: what
 * waits on the owner (decisions, merges, the Health view's exceptions
 * whose fix needs the owner), then what waits on another party.
 */
export const MOVE_SECTIONS = [
  "decisions",
  "merges",
  "health",
  "outside",
] as const;
export type MoveSectionKind = (typeof MOVE_SECTIONS)[number];

/** How many entries a section shows before "and N more". */
export const MOVE_TOP = 5;

/** The Proposals view's groups (CS-750) that the "Proposals for you" card counts. */
export const MOVE_PROPOSAL_GROUPS = [
  "needed",
  "waiting",
  "new",
  "deferred",
] as const satisfies readonly ProposalGroup[];

/** One entry in a section: what it is, what it holds up, how long it has waited. */
export interface MoveEntry {
  /** Unique in its section. */
  key: string;
  /** The entity shown, by ID, with its title. */
  id: string;
  /**
   * Open items it holds up, directly or through others. An exception
   * holds up the open items it involves (a milestone's through its
   * constraints) and everything that waits on them.
   */
  holds: number;
  /** How long it has waited (ms); absent when the tracker can't tell. */
  age?: number;
  /** A merge that waits for the owner's yes (hitld's merge-held ref). */
  held?: boolean;
  /** A decision or an outside wait. */
  item?: WorkItem;
  unmerged?: LiveUnmerged;
  exception?: HealthException;
}

export interface MoveSection {
  kind: MoveSectionKind | "ready";
  /** Every entry, shown or folded. */
  count: number;
  /** The first `MOVE_TOP`, ranked. */
  top: MoveEntry[];
  /** The rest, ranked, under "and N more". */
  more: MoveEntry[];
}

export interface YourMove {
  sections: Record<MoveSectionKind, MoveSection>;
  /** The "Proposals for you" card: CS-750's groups and their counts. */
  proposals: {
    count: number;
    groups: Array<{ group: ProposalGroup; count: number }>;
    /** Proposals with no header, the chief of staff's to write (not counted). */
    unheaded: number;
  };
  /** Ready to start, the second level: work that moves without the owner. */
  ready: MoveSection;
  /** Nothing waits on the owner or on another party, and no proposal either. */
  clear: boolean;
}

/**
 * The ranking every section uses: a merge waiting for the owner's yes
 * first, then what holds up the most, then the oldest, then by ID.
 */
export function byWhatItHolds(a: MoveEntry, b: MoveEntry): number {
  return (
    Number(!!b.held) - Number(!!a.held) ||
    b.holds - a.holds ||
    (b.age ?? -1) - (a.age ?? -1) ||
    idNumber(a.id) - idNumber(b.id)
  );
}

/**
 * The open items these hold up: the open items among them (a milestone
 * stands for its open constraints) and every open item that waits on
 * them, directly or through others, each counted once.
 */
export function holdsUpOf(s: WorkSnapshot, ids: readonly string[]): number {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const msOf = new Map(s.milestones.map((m) => [m.id, m]));
  const held = new Set<string>();
  const walk = (id: string) => {
    const it = itemOf.get(id);
    if (!it || !isOpen(it) || held.has(id)) {
      return;
    }
    held.add(id);
    for (const d of it.needed_by) {
      walk(d);
    }
  };
  for (const id of ids) {
    const m = msOf.get(id);
    for (const x of m ? m.constraints.map((c) => c.id) : [id]) {
      walk(x);
    }
  }
  return held.size;
}

/**
 * Your move (CS-753): each section's entries ranked by what they hold up,
 * with their ages, the first `top` shown and the rest folded; and the
 * proposals counted in CS-750's groups. Pure, for tests: the board passes
 * what it has already read, in the scope.
 *
 * Ages: a decision or an outside wait from when it entered its stage (the
 * board's state history, `since`); a merge from its close; an exception
 * from when the item at fault entered its stage, or else the most recent
 * such change among the items it involves; none when no item is involved.
 */
export function yourMoveOf({
  s,
  decisions,
  unmerged,
  exceptions,
  outside,
  ready = [],
  proposals,
  unblocks,
  since,
  now,
  top = MOVE_TOP,
}: {
  s: WorkSnapshot;
  /** Open decisions the owner answers, nothing open before them. */
  decisions: readonly WorkItem[];
  /** Items done on a branch and not merged (the live read). */
  unmerged: readonly LiveUnmerged[];
  /** The Health view's exceptions that need the owner, in the scope. */
  exceptions: readonly HealthException[];
  /** Open waits on another party. */
  outside: readonly WorkItem[];
  /** Work ready to start. */
  ready?: readonly WorkItem[];
  proposals: ProposalsModel;
  /** Open items behind each item, directly or through others. */
  unblocks: ReadonlyMap<string, number>;
  /** When each open item entered its stage (ms). */
  since: ReadonlyMap<string, number>;
  now: number;
  top?: number;
}): YourMove {
  const ageOf = (id: string) => {
    const t = since.get(id);
    return t === undefined ? undefined : Math.max(0, now - t);
  };
  const itemEntry = (it: WorkItem): MoveEntry => ({
    key: it.id,
    id: it.id,
    holds: unblocks.get(it.id) ?? 0,
    age: ageOf(it.id),
    item: it,
  });
  const exceptionAge = (e: HealthException) => {
    const own = ageOf(e.id);
    if (own !== undefined) {
      return own;
    }
    const ages = e.involves
      .map(ageOf)
      .filter((a): a is number => a !== undefined);
    return ages.length ? Math.min(...ages) : undefined;
  };
  const entries: Record<MoveSectionKind, MoveEntry[]> = {
    decisions: decisions.map(itemEntry),
    merges: unmerged.map((u) => ({
      key: u.id,
      id: u.id,
      holds: unblocks.get(u.id) ?? 0,
      age: Math.max(0, now - u.closed),
      held: u.queue === "held",
      unmerged: u,
    })),
    health: exceptions.map((e) => ({
      key: e.key,
      id: e.id,
      holds: holdsUpOf(s, e.involves),
      age: exceptionAge(e),
      exception: e,
    })),
    outside: outside.map(itemEntry),
  };
  const sectionOf = <K extends MoveSectionKind | "ready">(
    kind: K,
    list: MoveEntry[],
  ) => {
    const ranked = [...list].sort(byWhatItHolds);
    return {
      kind,
      count: ranked.length,
      top: ranked.slice(0, top),
      more: ranked.slice(top),
    };
  };
  const sections = Object.fromEntries(
    MOVE_SECTIONS.map((kind) => [kind, sectionOf(kind, entries[kind])]),
  ) as Record<MoveSectionKind, MoveSection>;
  const groups = MOVE_PROPOSAL_GROUPS.map((group) => ({
    group,
    count: proposals.groups.find((g) => g.group === group)?.rows.length ?? 0,
  }));
  const proposalCount = groups.reduce((n, g) => n + g.count, 0);
  return {
    sections,
    proposals: {
      count: proposalCount,
      groups,
      unheaded:
        proposals.groups.find((g) => g.group === "unheaded")?.rows.length ?? 0,
    },
    ready: sectionOf("ready", ready.map(itemEntry)),
    clear:
      proposalCount === 0 && MOVE_SECTIONS.every((k) => !sections[k].count),
  };
}

type MoveKind = MoveSectionKind | "ready";

const MOVE_NAMES: Record<MoveKind, string> = {
  decisions: "Decisions",
  merges: "Merges",
  health: "Health exceptions",
  outside: "Outside waits",
  ready: "Ready to start",
};
/** Each section's one action: what the owner does with an entry. */
const MOVE_VERBS: Record<MoveSectionKind, string> = {
  decisions: "Decide",
  merges: "Review",
  health: "Fix",
  outside: "Follow up",
};
const MOVE_EMPTY: Record<MoveKind, string> = {
  decisions: "Nothing waits on you to decide.",
  merges: "No finished work waits to merge.",
  health: "Nothing in the work graph needs you.",
  outside: "Nothing waits on another party.",
  ready: "Nothing is ready to start.",
};
/** What a section's ages count from. */
const MOVE_AGE_FROM: Record<MoveKind, string> = {
  decisions: "since it became ready to decide",
  merges: "since it was closed on its branch",
  health: "since the item at fault last changed stage",
  outside: "since it started waiting",
  ready: "since it became ready",
};

/**
 * Your move (CS-753; DESIGN.md, "Your move"): what waits on the owner, in
 * sections led by their number, each entry ranked by what it holds up,
 * with its age, its title and its one action, the rest folded; then, a
 * level down, what moves without the owner. Nothing is applied from the
 * page: an action opens the entry in the pane or in the view that fixes it.
 */
export function YourMoveView({
  move,
  live,
  branch,
  selected,
  openItem,
  goView,
  now = Date.now(),
}: {
  move: YourMove;
  live: LiveBox;
  branch?: string;
  selected?: string;
  openItem: (id: string) => void;
  goView: (id: string, patch?: Partial<WorkSearch>) => void;
  now?: number;
}) {
  const { sections: sec } = move;
  const act = (kind: MoveSectionKind, e: MoveEntry) => {
    if (kind !== "health") {
      openItem(e.id);
      return;
    }
    // The Health view, with the entity the row names chosen (its row is
    // tinted there), from the top: the view leads with what needs you.
    goView("health", { item: e.id, list: undefined });
    window.scrollTo({ top: 0 });
  };
  // readLive's order: the run, the ledger, the claims, the branches.
  const mergeSources = live.sources.slice(3);
  const known = live.sources.length > 0;
  const held = sec.merges.top
    .concat(sec.merges.more)
    .filter((e) => e.held).length;
  const parties = new Set(
    [...sec.outside.top, ...sec.outside.more].map(
      (e) => e.item?.waiting_on ?? "",
    ),
  ).size;
  const oldest = Math.max(
    0,
    ...[...sec.decisions.top, ...sec.decisions.more].map((e) => e.age ?? 0),
  );
  const details: Record<MoveSectionKind, string | undefined> = {
    decisions: sec.decisions.count
      ? `The oldest has waited ${ageText(oldest)}`
      : undefined,
    merges: !sec.merges.count
      ? known && mergeSources.every((x) => x.ok)
        ? undefined
        : "None seen, but the branches couldn’t be compared."
      : held
        ? `${held} ${held === 1 ? "waits" : "wait"} for your yes`
        : "Finished on a branch, not merged yet",
    health: sec.health.count
      ? "Their fixes change scope or a release"
      : undefined,
    outside: sec.outside.count
      ? `On ${parties} other ${parties === 1 ? "party" : "parties"}`
      : undefined,
  };
  const working = [...live.working].sort(
    (a, b) => (a.since ?? now) - (b.since ?? now),
  );
  return (
    <div className="work-move">
      <div className="work-move-grid">
        <div className="work-move-level work-move-first">
          <h2 className="work-move-level-h" id="work-move-you-h">
            Waiting on you
          </h2>
          {move.clear ? (
            <p className="work-move-clear" role="status">
              <Icon href={svgCheckmark} className="work-move-clear-icon" />
              Nothing waits on you: no decision, merge, health exception,
              outside wait or proposal.
            </p>
          ) : (
            <>
              {MOVE_SECTIONS.map((kind) => (
                <Fragment key={kind}>
                  {kind === "outside" && (
                    <MoveProposals proposals={move.proposals} />
                  )}
                  <MoveSectionView
                    kind={kind}
                    section={sec[kind]}
                    detail={details[kind]}
                    attention={kind !== "outside"}
                    selected={selected}
                    verb={MOVE_VERBS[kind]}
                    onAct={(e) => act(kind, e)}
                    drawer={(e) => <MoveDrawer kind={kind} e={e} now={now} />}
                    foot={
                      kind === "merges" && sec.merges.count > 0 ? (
                        <SourceNote sources={mergeSources} />
                      ) : undefined
                    }
                  />
                </Fragment>
              ))}
            </>
          )}
        </div>

        <div className="work-move-level work-move-second">
          <h2 className="work-move-level-h" id="work-move-moving-h">
            Moving without you
          </h2>
          <LiveSection
            live={live}
            working={working}
            branch={branch}
            now={now}
          />
          <MoveSectionView
            kind="ready"
            section={move.ready}
            detail={move.ready.count ? "The most waited-on first" : undefined}
            selected={selected}
            quiet
          />
        </div>
      </div>
    </div>
  );
}

/** A section's head: its number, its name and one line on it. */
function MoveHead({
  id,
  count,
  name,
  detail,
  attention,
  quiet,
}: {
  id: string;
  count: number;
  name: string;
  detail?: string;
  attention?: boolean;
  quiet?: boolean;
}) {
  return (
    <header className="work-move-head">
      <h3 id={id} className="work-move-h">
        <span
          className={`work-move-n${attention && count ? " attention" : ""}${quiet ? " quiet" : ""}`}
        >
          {count}
        </span>{" "}
        <span className="work-move-name">{name}</span>
      </h3>
      {detail && <p className="work-move-detail">{detail}</p>}
    </header>
  );
}

/**
 * One section: led by its number, its top entries ranked, the rest under
 * "and N more"; empty, it collapses to one line.
 */
function MoveSectionView({
  kind,
  section,
  detail,
  attention,
  quiet,
  selected,
  verb,
  onAct,
  drawer,
  foot,
}: {
  kind: MoveKind;
  section: MoveSection;
  detail?: string;
  attention?: boolean;
  quiet?: boolean;
  selected?: string;
  verb?: string;
  onAct?: (e: MoveEntry) => void;
  drawer?: (e: MoveEntry) => ReactNode;
  foot?: ReactNode;
}) {
  const [all, setAll] = useState(false);
  const id = `work-move-${kind}`;
  if (!section.count) {
    return (
      <section className="work-move-section empty" aria-labelledby={`${id}-h`}>
        <MoveHead
          id={`${id}-h`}
          count={0}
          name={MOVE_NAMES[kind]}
          detail={detail ?? MOVE_EMPTY[kind]}
          quiet={quiet}
        />
      </section>
    );
  }
  const shown = all ? [...section.top, ...section.more] : section.top;
  return (
    <section
      className={`work-move-section${quiet ? " quiet" : ""}`}
      aria-labelledby={`${id}-h`}
    >
      <MoveHead
        id={`${id}-h`}
        count={section.count}
        name={MOVE_NAMES[kind]}
        detail={detail}
        attention={attention}
        quiet={quiet}
      />
      <ol className="work-move-rows" id={`${id}-list`}>
        {shown.map((e) => (
          <MoveRow
            key={e.key}
            e={e}
            ageFrom={MOVE_AGE_FROM[kind]}
            selected={e.id === selected}
            verb={verb}
            onAct={onAct && (() => onAct(e))}
            drawer={drawer?.(e)}
          />
        ))}
      </ol>
      {(section.more.length > 0 || foot) && (
        <div className="work-move-foot">
          {section.more.length > 0 && (
            <Button
              variant="text"
              size="small"
              className="work-move-more"
              aria-expanded={all}
              aria-controls={`${id}-list`}
              onClick={() => setAll(!all)}
            >
              <ReservedText
                value={all ? "Show fewer" : `and ${section.more.length} more`}
                options={["Show fewer", `and ${section.more.length} more`]}
              />
            </Button>
          )}
          {foot}
        </div>
      )}
    </section>
  );
}

/**
 * An entry: its details' toggle, its ID and title, what it holds up, its
 * age and its one action, in columns that keep their widths; its details
 * open under it.
 */
function MoveRow({
  e,
  ageFrom,
  selected,
  verb,
  onAct,
  drawer,
  holds = true,
}: {
  e: MoveEntry;
  /** Has a "holds up" column (In progress has none). */
  holds?: boolean;
  ageFrom: string;
  selected: boolean;
  verb?: string;
  onAct?: () => void;
  drawer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const age = e.age === undefined ? undefined : moveAgeText(e.age);
  return (
    <li
      className={`work-move-row${selected ? " selected" : ""}${verb ? " has-act" : ""}${holds ? "" : " no-holds"}`}
    >
      <div className="work-move-line">
        {drawer ? (
          <button
            type="button"
            className={`work-move-toggle${open ? " open" : ""}`}
            aria-expanded={open}
            aria-controls={drawerId}
            aria-label={`Details for ${e.id}`}
            onClick={() => setOpen(!open)}
          >
            <Icon href={svgChevronRight} />
          </button>
        ) : (
          <span className="work-move-toggle" aria-hidden="true" />
        )}
        <ItemRef id={e.id} className="work-move-ref" />
        {holds && (
          <span className="work-move-holds">
            {e.holds > 0 ? (
              <>
                holds up <span className="work-move-num">{e.holds}</span>
              </>
            ) : (
              <span className="visually-hidden">holds up nothing</span>
            )}
          </span>
        )}
        <span
          className="work-move-age"
          title={age ? `${age} ${ageFrom}` : `The tracker can’t tell how long`}
        >
          {age ?? "–"}
        </span>
        {verb && onAct && (
          <Button
            variant="outlined"
            size="small"
            className="work-move-act"
            onClick={onAct}
            aria-label={`${verb}: ${e.id}`}
          >
            {verb}
          </Button>
        )}
      </div>
      {drawer && (
        <div className="work-move-drawer" id={drawerId} hidden={!open}>
          {drawer}
        </div>
      )}
    </li>
  );
}

/**
 * An entry's age in its column's width: "just now", "40 minutes",
 * "5 hours", "7 days".
 */
export function moveAgeText(ms: number): string {
  const m = Math.floor(Math.max(0, ms) / 60_000);
  return m < 1
    ? "just now"
    : m < 60
      ? `${m} ${m === 1 ? "minute" : "minutes"}`
      : ageText(ms);
}

/** Up to five items by ID and title, and how many more. */
function MoveRefs({ ids }: { ids: readonly string[] }) {
  const named = ids.slice(0, 5);
  return (
    <ul className="work-move-refs">
      {named.map((id) => (
        <li key={id}>
          <ItemRef id={id} />
        </li>
      ))}
      {ids.length > named.length && (
        <li className="work-move-quiet">
          and {ids.length - named.length} more
        </li>
      )}
    </ul>
  );
}

/** A sentence with IDs in it, each with its kind's mark and short title. */
function MoveWords({ words }: { words: Words }) {
  return (
    <>
      {words.map((x, i) =>
        typeof x === "string" ? (
          <span key={i}>{x}</span>
        ) : (
          <ItemRef key={i} id={x.id} className="work-move-inline" />
        ),
      )}
    </>
  );
}

/** An entry's secondary detail, by section. */
function MoveDrawer({
  kind,
  e,
  now,
}: {
  kind: MoveSectionKind;
  e: MoveEntry;
  now: number;
}) {
  if (kind === "health" && e.exception) {
    const x = e.exception;
    return (
      <dl className="work-move-facts">
        <div>
          <dt>Kind</dt>
          <dd>{HEALTH_KIND_DEFS[x.kind].name}</dd>
        </div>
        <div>
          <dt>What</dt>
          <dd>
            <MoveWords words={x.what} />
          </dd>
        </div>
        <div>
          <dt>Fix</dt>
          <dd>
            <MoveWords words={x.fix} />
          </dd>
        </div>
        {x.command && (
          <div>
            <dt>Command</dt>
            <dd>
              <code className="work-move-code">{x.command}</code>
            </dd>
          </div>
        )}
      </dl>
    );
  }
  if (kind === "merges" && e.unmerged) {
    const u = e.unmerged;
    return (
      <dl className="work-move-facts">
        {u.branches.length > 0 && (
          <div>
            <dt>{u.branches.length === 1 ? "Branch" : "Branches"}</dt>
            <dd className="work-mono">{u.branches.join(", ")}</dd>
          </div>
        )}
        <div>
          <dt>Closed</dt>
          <dd>{agoText(now - u.closed)}</dd>
        </div>
        <div>
          <dt>Merge</dt>
          <dd>
            It {queueText(u).text}. The orchestrator merges through its gates,
            on your yes.
          </dd>
        </div>
      </dl>
    );
  }
  const it = e.item;
  if (!it) {
    return null;
  }
  const direct = it.needed_by;
  return (
    <dl className="work-move-facts">
      {kind === "outside" && it.waiting_on && (
        <div>
          <dt>Waiting on</dt>
          <dd>
            <InlineText text={it.waiting_on} />
          </dd>
        </div>
      )}
      <div>
        <dt>Holds up</dt>
        <dd>
          {e.holds
            ? `${e.holds} open ${e.holds === 1 ? "item" : "items"}${e.holds > direct.length ? `, ${direct.length} directly` : ""}`
            : "Nothing waits on it yet"}
          {direct.length > 0 && <MoveRefs ids={direct} />}
        </dd>
      </div>
      {it.project && (
        <div>
          <dt>Project</dt>
          <dd>
            <ItemRef id={it.project} />
          </dd>
        </div>
      )}
      {kind === "decisions" && (
        <div>
          <dt>To answer</dt>
          <dd>
            Decide opens its question and options. Give your answer to the chief
            of staff, who records it.
          </dd>
        </div>
      )}
    </dl>
  );
}

/** The "Proposals for you" card: CS-750's groups, counted, and a link to the view. */
function MoveProposals({ proposals: p }: { proposals: YourMove["proposals"] }) {
  const needed = p.groups.find((g) => g.group === "needed")?.count ?? 0;
  const link = (
    <RouterLink
      to="/work"
      search={(prev: WorkSearch) => ({
        ...prev,
        view: "proposals",
        item: undefined,
        list: undefined,
        stage: undefined,
      })}
      className="work-move-link"
    >
      Open the Proposals view
    </RouterLink>
  );
  if (!p.count) {
    return (
      <section
        className="work-move-section empty"
        aria-labelledby="work-move-props-h"
      >
        <MoveHead
          id="work-move-props-h"
          count={0}
          name="Proposals for you"
          detail="No proposal waits on you."
        />
      </section>
    );
  }
  return (
    <section className="work-move-section" aria-labelledby="work-move-props-h">
      <MoveHead
        id="work-move-props-h"
        count={p.count}
        name="Proposals for you"
        detail="Each one’s call, in words, is in the Proposals view"
        attention={needed > 0}
      />
      <ul className="work-move-groups">
        {p.groups.map((g) => (
          <li
            key={g.group}
            className={g.group === "needed" && g.count ? "attention" : ""}
            title={GROUP_RULES[g.group]}
          >
            <span className="work-move-group-name">{GROUP_NAMES[g.group]}</span>
            <span className="work-move-num">{g.count}</span>
          </li>
        ))}
      </ul>
      <div className="work-move-foot">
        {link}
        {p.unheaded > 0 && (
          <span className="work-move-quiet">
            {p.unheaded} more {p.unheaded === 1 ? "has" : "have"} no header yet:
            the chief of staff writes those
          </span>
        )}
      </div>
    </section>
  );
}

/**
 * In progress (CS-547), a level down: the work being done now and since
 * when, from the live run, with the run and its orchestrator in a line.
 * When a source can't be read, it says so instead of "nothing".
 */
function LiveSection({
  live,
  working,
  branch,
  now,
}: {
  live: LiveBox;
  working: LiveWork[];
  branch?: string;
  now: number;
}) {
  const known = live.sources.length > 0;
  const workSources = live.sources.slice(1, 3);
  const unread = live.sources.filter((x) => !x.ok);
  const r = live.run;
  const runLine =
    r.state === "active"
      ? `Run ${r.id}${r.started !== undefined ? `, started ${agoText(now - r.started)}` : ""}; ${r.session} holds its lease${r.renewed !== undefined ? `, renewed ${agoText(now - r.renewed)}` : ""}.`
      : r.state === "free"
        ? `Run ${r.id} has no orchestrator: its lease ${r.released !== undefined ? `was released ${agoText(now - r.released)}` : "expired"}${r.session ? `; ${r.session} held it last` : ""}.`
        : r.state === "none"
          ? "No run is active: hitld has no run state."
          : r.state === "unknown"
            ? "Whether a run is active can’t be told: hitld has no run state, and its ledger couldn’t be read."
            : undefined;
  const entries: MoveEntry[] = working.map((w) => ({
    key: `${w.id} ${w.who ?? ""} ${w.where ?? ""}`,
    id: w.id,
    holds: 0,
    age: w.since === undefined ? undefined : Math.max(0, now - w.since),
  }));
  const whoOf = new Map(working.map((w) => [w.id, w]));
  return (
    <section
      className="work-move-section quiet"
      aria-labelledby="work-move-working-h"
    >
      <MoveHead
        id="work-move-working-h"
        count={live.working.length}
        name="In progress"
        detail={runLine}
        quiet
      />
      {!known && (
        <p className="work-move-alert" role="note">
          <Icon href={svgStatusWarning} className="work-move-alert-icon" />
          <span>{live.notes[0]}</span>
        </p>
      )}
      {unread.length > 0 && (
        <div className="work-move-alert" role="note">
          <Icon href={svgStatusWarning} className="work-move-alert-icon" />
          <div>
            <p>
              Some of what this reads couldn’t be read, so it may miss work in
              progress:
            </p>
            <ul>
              {unread.map((x) => (
                <li key={x.source}>
                  {x.why}{" "}
                  <span className="work-move-quiet">
                    ({x.source}, tried {clock(x.at)})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {entries.length ? (
        <ol className="work-move-rows">
          {entries.map((e) => {
            const w = whoOf.get(e.id)!;
            return (
              <MoveRow
                key={e.key}
                e={e}
                ageFrom={
                  w.from === "dispatch"
                    ? "since its dispatch started"
                    : "since its claim commit"
                }
                selected={false}
                holds={false}
                drawer={
                  <dl className="work-move-facts">
                    <div>
                      <dt>Who and where</dt>
                      <dd>{liveLine(w, branch, now)}</dd>
                    </div>
                    {w.from === "claim" && (
                      <div>
                        <dt>Record</dt>
                        <dd>
                          A claim with no dispatch in hitld’s ledger: its age
                          runs from the claim commit.
                        </dd>
                      </div>
                    )}
                  </dl>
                }
              />
            );
          })}
        </ol>
      ) : (
        <p className="work-move-detail">
          {known && workSources.every((x) => x.ok)
            ? "No dispatch in flight and no open claim."
            : "None seen, but not everything could be read."}
        </p>
      )}
      <div className="work-move-foot">
        <SourceNote sources={workSources} />
      </div>
      {known && live.notes.length > 0 && <LiveNotes notes={live.notes} />}
    </section>
  );
}

/** What the live figures leave out, folded under one line. */
function LiveNotes({ notes }: { notes: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="work-move-notes">
      <Button
        variant="text"
        size="small"
        className="work-move-more"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        startIcon={
          <Icon
            href={svgChevronRight}
            className={`work-move-chev${open ? " open" : ""}`}
          />
        }
      >
        What these figures leave out ({notes.length})
      </Button>
      <ul id={id} hidden={!open}>
        {notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
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
  className,
  tools,
  foot,
  children,
}: {
  id: string;
  title: string;
  caption?: string;
  className?: string;
  tools?: ReactNode;
  foot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`work-card ${className ?? ""}`} aria-labelledby={id}>
      <header className="work-card-head">
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
        {tools}
      </header>
      {children}
      {foot && <div className="work-card-foot">{foot}</div>}
    </section>
  );
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
