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
  LinearProgress,
  Link,
  ListSubheader,
  MenuItem,
  Select,
  Tab,
  Tabs,
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
import type { WorkSearch, WorkView } from "../routes.tsx";
import { useWork } from "../useWork.ts";
import {
  boardStatus,
  byProject,
  columnsOf,
  countsOf,
  filterItems,
  idNumber,
  type InFlight,
  inFlightOf,
  isOpen,
  isOwnerDecision,
  type ItemKind,
  KIND_NAMES,
  KINDS,
  loadItemText,
  ownerQueue,
  stateOf,
  type Status,
  waitingOnOwner,
  type WorkContainer,
  type WorkItem,
  type WorkItemText,
  type WorkSnapshot,
} from "../work.ts";
import { Empty, Page, toast } from "./common.tsx";
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

/** Cards a column shows before "Show more". */
const COLUMN_PAGE = 40;

const STATUS_HINTS: Record<Status, string> = {
  Proposed: "Not committed: waits on a decision or the owner's go",
  Planned: "Committed; ready once everything it needs is done",
  "In progress": "Claimed here or on another branch",
  Done: "Finished and merged",
  Dropped: "Not worth doing, with the reason",
};

/** What each view answers, under the tabs. */
const VIEW_HINTS: Record<WorkView, string> = {
  owner:
    "Open decisions the owner answers, the most waited-on first, with the items that wait on each.",
  ready: "Planned items whose needs are all done, by project.",
  progress:
    "Items claimed on this branch, and on other branches and worktrees of this machine whose claims haven't merged.",
  blocked: "Items that wait on other items, with what they wait on.",
  board: "Every item by its place in the lifecycle.",
  graph: "How projects wait on each other, and a project's items.",
};

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
  "The tracker's items: what waits on the owner, what is ready, and what is moving.";

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
  const view: WorkView = search.view ?? "owner";
  const narrow = useMediaQuery("(max-width: 900px)");
  const kind = (KINDS as readonly string[]).includes(search.kind ?? "")
    ? (search.kind as ItemKind)
    : undefined;
  const flight = useMemo(() => inFlightOf(s), [s]);
  // The tabs count the chosen scope and kind and words, so each count
  // says what its tab will show.
  const items = useMemo(
    () =>
      filterItems(s, {
        initiative: search.initiative,
        project: search.project,
        kinds: kind ? [kind] : undefined,
        q: search.q,
      }),
    [s, search.initiative, search.project, kind, search.q],
  );
  const counts = useMemo(() => countsOf(items, flight), [items, flight]);
  const all = useMemo(() => countsOf(s.items, flight), [s, flight]);
  const owner = useMemo(() => waitingOnOwner(s), [s]);
  const projectOf = useMemo(
    () => new Map(s.projects.map((p) => [p.id, p])),
    [s],
  );
  const itemOf = useMemo(() => new Map(s.items.map((i) => [i.id, i])), [s]);
  const filtered =
    !!search.initiative || !!search.project || !!kind || !!search.q;
  const tabsId = useId();
  const tabs: Array<[WorkView, string, number | undefined]> = [
    ["owner", "Waiting on the owner", counts.owner],
    ["ready", "Ready", counts.ready],
    ["progress", "In progress", counts.inProgress],
    ["blocked", "Blocked", counts.blocked],
    ["board", "Board", undefined],
    ["graph", "Graph", undefined],
  ];
  const here = (it: WorkItem) => !flight.has(it.id);

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
      <div className="work-progress">
        <LinearProgress
          variant="determinate"
          value={all.live ? (100 * all.done) / all.live : 0}
          aria-hidden="true"
          className="work-progress-bar"
        />
        <Typography variant="body-sm" color="textSecondary">
          {all.done} of {all.live} items done · {all.inProgress} in progress
          {s.elsewhere.length > 0 &&
            ` (${new Set(s.elsewhere.map((c) => c.id)).size} on other branches)`}{" "}
          · {s.items.length} items in {s.projects.length} projects
        </Typography>
      </div>

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

      <Tabs
        value={view}
        size="small"
        // Scrolling tabs fade their edges: only where they don't fit.
        variant={narrow ? "scrollable" : "standard"}
        className="work-tabs"
        aria-label="Views"
        onChange={(_, next: WorkView) =>
          set({ view: next === "owner" ? undefined : next })
        }
      >
        {tabs.map(([v, label, n]) => (
          <Tab
            key={v}
            value={v}
            id={`${tabsId}-${v}`}
            aria-controls={`${tabsId}-panel`}
            label={
              <span className="work-tab">
                {label}
                {n !== undefined && (
                  <span
                    className={`work-tab-count${v === "owner" && n ? " attention" : ""}`}
                  >
                    {n}
                  </span>
                )}
              </span>
            }
          />
        ))}
      </Tabs>

      <Filters
        s={s}
        search={search}
        kind={kind}
        set={set}
        shown={view === "board" || view === "graph" ? items.length : undefined}
        filtered={filtered}
      />

      <div
        role="tabpanel"
        id={`${tabsId}-panel`}
        aria-labelledby={`${tabsId}-${view}`}
      >
        <Typography
          variant="body-sm"
          color="textSecondary"
          render={<p />}
          className="work-view-hint"
        >
          {VIEW_HINTS[view]}
        </Typography>
        {view === "graph" ? (
          <WorkGraph
            s={s}
            items={items}
            project={search.project}
            initiative={search.initiative}
            selected={search.item}
            onProject={(id) => set({ project: id })}
          />
        ) : !items.length ? (
          <Empty
            title="Nothing matches these filters"
            action={
              <Button
                variant="outlined"
                onClick={() =>
                  set({
                    initiative: undefined,
                    project: undefined,
                    kind: undefined,
                    q: undefined,
                  })
                }
              >
                Clear filters
              </Button>
            }
          >
            Try another project or fewer words.
          </Empty>
        ) : view === "owner" ? (
          <OwnerQueue
            s={s}
            items={items}
            selected={search.item}
            projectOf={projectOf}
          />
        ) : view === "ready" ? (
          <Grouped
            s={s}
            items={items.filter((it) => it.ready && here(it))}
            empty="Nothing here is ready: everything open waits on something."
            selected={search.item}
            projectOf={projectOf}
            line={(it) =>
              it.needed_by.length
                ? `Unblocks ${it.needed_by.length}`
                : undefined
            }
          />
        ) : view === "progress" ? (
          <Grouped
            s={s}
            items={items.filter(
              (it) => boardStatus(it, flight) === "In progress",
            )}
            empty="Nothing is in progress."
            selected={search.item}
            projectOf={projectOf}
            line={(it) => whereOf(it, flight, s.branch)}
          />
        ) : view === "blocked" ? (
          <Grouped
            s={s}
            items={items.filter((it) => it.blocked && here(it))}
            empty="Nothing here waits on another item."
            selected={search.item}
            projectOf={projectOf}
            needs={(it) => it.open_needs.map((n) => itemOf.get(n) ?? n)}
          />
        ) : (
          <Columns
            items={items}
            selected={search.item}
            projectOf={projectOf}
            owner={owner}
            flight={flight}
            branch={s.branch}
          />
        )}
      </div>

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

/** Who holds an item and where: "s1 on this branch", "s2 on dyno-ui". */
function whereOf(
  it: WorkItem,
  flight: InFlight,
  branch?: string,
): string | undefined {
  const parts: string[] = [];
  if (it.status === "In progress") {
    parts.push(`${it.claimed ?? "Claimed"} on ${branch ?? "this branch"}`);
  }
  for (const c of flight.get(it.id) ?? []) {
    parts.push(`${c.claimed ?? "Claimed"} on ${c.where}`);
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
  kind,
  set,
  shown,
  filtered,
}: {
  s: WorkSnapshot;
  search: WorkSearch;
  kind?: ItemKind;
  set: (patch: Partial<WorkSearch>, replace?: boolean) => void;
  /** Items shown, for views that show them all. */
  shown?: number;
  filtered: boolean;
}) {
  const scopeId = useId();
  const kindId = useId();
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
      <FormControl size="small" className="work-kind-pick">
        <InputLabel id={kindId}>Kind</InputLabel>
        <Select
          labelId={kindId}
          label="Kind"
          value={kind ?? ""}
          displayEmpty
          renderValue={(v) => (v ? KIND_PLURALS[v as ItemKind] : "Every kind")}
          onChange={(e) => set({ kind: String(e.target.value) || undefined })}
        >
          <MenuItem value="">Every kind</MenuItem>
          {KINDS.map((k) => (
            <MenuItem key={k} value={k}>
              {KIND_PLURALS[k]}
            </MenuItem>
          ))}
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
        {shown !== undefined && filtered && (
          <Typography variant="body-sm" color="textSecondary">
            {shown} of {s.items.length} items
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
                kind: undefined,
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

const KIND_PLURALS: Record<ItemKind, string> = {
  work: "Work items",
  decision: "Decisions",
  external: "Outside waits",
};

// ------------------------------------------------------------ the owner's queue

function OwnerQueue({
  s,
  items,
  selected,
  projectOf,
}: {
  s: WorkSnapshot;
  items: WorkItem[];
  selected?: string;
  projectOf: Map<string, WorkContainer>;
}) {
  const queue = useMemo(() => ownerQueue(s, items), [s, items]);
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
                  ? `${waiting.length} ${waiting.length === 1 ? "item waits" : "items wait"} on it`
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

// ------------------------------------------------------------ the board

function Columns({
  items,
  selected,
  projectOf,
  owner,
  flight,
  branch,
}: {
  items: WorkItem[];
  selected?: string;
  projectOf: Map<string, WorkContainer>;
  owner: Set<string>;
  flight: InFlight;
  branch?: string;
}) {
  const columns = useMemo(() => columnsOf(items, flight), [items, flight]);
  return (
    <div className="work-board">
      {columns.map(({ status, items: column }) => (
        <Column
          key={status}
          status={status}
          items={column}
          selected={selected}
          projectOf={projectOf}
          owner={owner}
          flight={flight}
          branch={branch}
        />
      ))}
    </div>
  );
}

function Column({
  status,
  items,
  selected,
  projectOf,
  owner,
  flight,
  branch,
}: {
  status: Status;
  items: WorkItem[];
  selected?: string;
  projectOf: Map<string, WorkContainer>;
  owner: Set<string>;
  flight: InFlight;
  branch?: string;
}) {
  const [shown, setShown] = useState(COLUMN_PAGE);
  const headingId = useId();
  // Planned splits into what can start now and what waits.
  const parts: Array<[string | undefined, WorkItem[]]> =
    status === "Planned"
      ? [
          ["Ready", items.filter((it) => it.ready)],
          ["Waiting on other items", items.filter((it) => !it.ready)],
        ]
      : [[undefined, items]];
  let budget = shown;
  return (
    <section className="work-column" aria-labelledby={headingId}>
      <header className="work-column-header">
        <Typography variant="subtitle-md" render={<h2 />} id={headingId}>
          {status}
        </Typography>
        <span className="work-count" aria-label={`${items.length} items`}>
          {items.length}
        </span>
      </header>
      <Typography
        variant="caption-md"
        color="textSecondary"
        render={<p />}
        className="work-column-hint"
      >
        {STATUS_HINTS[status]}
      </Typography>
      {!items.length && (
        <Typography
          variant="body-sm"
          color="textTertiary"
          render={<p />}
          className="work-column-empty"
        >
          None
        </Typography>
      )}
      {parts.map(([title, part]) => {
        if (!part.length || budget <= 0) {
          return null;
        }
        const visible = part.slice(0, budget);
        budget -= visible.length;
        return (
          <div key={title ?? "all"}>
            {title && (
              <Typography
                variant="caption-lg"
                color="textSecondary"
                render={<h3 />}
                className="work-column-part"
              >
                {title} · {part.length}
              </Typography>
            )}
            <ul className="work-cards">
              {visible.map((it) => (
                <li key={it.id}>
                  <Card
                    it={it}
                    selected={it.id === selected}
                    project={projectOf.get(it.project ?? "")}
                    waitsOnOwner={owner.has(it.id)}
                    holder={whereOf(it, flight, branch)}
                    moving={boardStatus(it, flight) === "In progress"}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {items.length > shown && (
        <Button
          variant="text"
          size="small"
          className="work-more"
          onClick={() => setShown((n) => n + COLUMN_PAGE * 5)}
        >
          Show {Math.min(items.length - shown, COLUMN_PAGE * 5)} more of{" "}
          {items.length - shown}
        </Button>
      )}
    </section>
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

function Card({
  it,
  selected,
  project,
  waitsOnOwner,
  holder,
  moving,
}: {
  it: WorkItem;
  selected: boolean;
  project?: WorkContainer;
  waitsOnOwner: boolean;
  /** Who holds it and where, when it is in progress. */
  holder?: string;
  moving: boolean;
}) {
  const state = stateOf(it);
  const badge =
    !isOpen(it) || moving ? null : isOwnerDecision(it) ? (
      <StatusBadge tone="warning">Owner decides</StatusBadge>
    ) : waitsOnOwner ? (
      <StatusBadge tone="warning">Waits on the owner</StatusBadge>
    ) : it.status !== "Proposed" || it.blocked ? (
      <StatusBadge tone={state.tone}>{state.text}</StatusBadge>
    ) : null;
  return (
    <ItemLink
      id={it.id}
      className={`work-card${selected ? " selected" : ""}${isOpen(it) ? "" : " closed"}`}
    >
      <span className="work-card-top">
        <span className="work-id">{it.id}</span>
        {it.kind !== "work" && <KindBadge kind={it.kind} />}
        {(it.priority === "urgent" || it.priority === "high") && (
          <StatusBadge tone="error">
            {it.priority === "urgent" ? "Urgent" : "High"}
          </StatusBadge>
        )}
      </span>
      <Typography variant="body-md" className="work-card-title">
        <InlineText text={it.title} />
      </Typography>
      {badge && <span className="work-card-state">{badge}</span>}
      <span className="work-card-bottom">
        <Typography
          variant="caption-md"
          color="textSecondary"
          className="work-card-project"
          title={project ? `${project.id} ${project.title}` : undefined}
        >
          {project?.title ?? it.project ?? "No project"}
        </Typography>
      </span>
      {moving && holder && (
        <Typography
          variant="caption-md"
          className="work-claim"
          title={`Claimed: ${holder}`}
        >
          {holder}
        </Typography>
      )}
    </ItemLink>
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
