import "./work.css";
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Link,
  Switch,
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
import { Icon } from "@stratakit/mui";
import {
  getRouteApi,
  Link as RouterLink,
  useNavigate,
} from "@tanstack/react-router";
import { type ReactNode, useEffect, useId, useMemo, useState } from "react";
import type { WorkSearch } from "../routes.tsx";
import { useWork } from "../useWork.ts";
import {
  byProject,
  columnsOf,
  countsOf,
  filterItems,
  idNumber,
  isOpen,
  isOwnerDecision,
  type ItemKind,
  KIND_NAMES,
  KINDS,
  loadItemText,
  stateOf,
  type Status,
  waitingOnOwner,
  type WorkContainer,
  type WorkItem,
  type WorkItemText,
  type WorkSnapshot,
} from "../work.ts";
import { Chips, Choice, Empty, Page, toast } from "./common.tsx";
import { InlineText, ItemText } from "./ItemText.tsx";
import { Status as StatusBadge } from "./runParts.tsx";
import { WorkGraph } from "./WorkGraph.tsx";

/**
 * The Work board (DESIGN.md; CS-170): the tracker's items on the branch
 * Dyno is served from, read through the tracker's read API (work.ts),
 * never edited here. Counts of what waits, then one of four views (the
 * board by lifecycle, ready, blocked, the dependency graphs) under
 * filters kept in the URL, and an item's text beside them.
 */

const route = getRouteApi("/work");

/** Cards a column shows before "Show more". */
const COLUMN_PAGE = 40;

const STATUS_HINTS: Record<Status, string> = {
  Proposed: "Not committed: waits on a decision or the owner's go",
  Planned: "Committed; ready once everything it needs is done",
  "In progress": "Claimed on a branch",
  Done: "Finished and merged",
  Dropped: "Not worth doing, with the reason",
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
            ([, v]) => v !== undefined && v !== "" && v !== false,
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
  "The tracker's items on this branch: what is ready, what is moving, and what waits on the owner.";

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
        <b>Ready</b> means Planned with everything it needs done. Claims on
        other branches and worktrees show in a terminal:{" "}
        <code>node scripts/work/views.mjs claims</code>.
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
  const view = search.view ?? "board";
  const kinds = useMemo(
    () =>
      (search.kind?.split(",") ?? []).filter((k): k is ItemKind =>
        (KINDS as readonly string[]).includes(k),
      ),
    [search.kind],
  );
  // The tiles count the chosen initiative or project, whatever else is set.
  const scope = useMemo(
    () =>
      filterItems(s, {
        initiative: search.initiative,
        project: search.project,
      }),
    [s, search.initiative, search.project],
  );
  const counts = useMemo(() => countsOf(scope), [scope]);
  const owner = useMemo(() => waitingOnOwner(s), [s]);
  const items = useMemo(
    () =>
      filterItems(s, {
        initiative: search.initiative,
        project: search.project,
        kinds,
        owner: search.owner,
        q: search.q,
      }),
    [s, search, kinds],
  );
  const projectOf = useMemo(
    () => new Map(s.projects.map((p) => [p.id, p])),
    [s],
  );
  const itemOf = useMemo(() => new Map(s.items.map((i) => [i.id, i])), [s]);
  const filtered =
    !!search.initiative ||
    !!search.project ||
    kinds.length > 0 ||
    !!search.owner ||
    !!search.q;
  const ownerItems = scope.filter((it) => owner.has(it.id)).length;
  const tabsId = useId();

  const projects = s.projects.filter(
    (p) => !search.initiative || p.initiative === search.initiative,
  );

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

      <ul className="work-tiles" aria-label="What waits">
        <Tile
          label="Waiting on the owner"
          value={counts.owner}
          unit={counts.owner === 1 ? "decision" : "decisions"}
          detail={
            ownerItems > counts.owner
              ? `${ownerItems - counts.owner} more items wait on them`
              : "Nothing else waits on them"
          }
          tone={counts.owner ? "warning" : undefined}
          pressed={!!search.owner}
          onClick={() => set({ owner: !search.owner || undefined })}
        />
        <Tile
          label="Ready"
          value={counts.ready}
          detail="Planned, with every need done"
          pressed={view === "ready"}
          onClick={() => set({ view: view === "ready" ? undefined : "ready" })}
        />
        <Tile
          label="In progress"
          value={counts.inProgress}
          detail="Claimed on a branch"
          pressed={false}
          onClick={() => set({ view: undefined })}
        />
        <Tile
          label="Blocked"
          value={counts.blocked}
          detail="Waiting on other items"
          pressed={view === "blocked"}
          onClick={() =>
            set({ view: view === "blocked" ? undefined : "blocked" })
          }
        />
        <Tile
          label="Done"
          value={counts.done}
          unit={`of ${counts.live}`}
          detail={
            <LinearProgress
              variant="determinate"
              value={counts.live ? (100 * counts.done) / counts.live : 0}
              aria-label={`${counts.done} of ${counts.live} done`}
              className="work-tile-bar"
            />
          }
          pressed={false}
          onClick={() => set({ view: undefined })}
        />
      </ul>

      <Tabs
        value={view}
        size="small"
        className="work-tabs"
        aria-label="Views"
        onChange={(_, next: string) =>
          set({
            view: next === "board" ? undefined : (next as WorkSearch["view"]),
          })
        }
      >
        {(
          [
            ["board", "Board"],
            ["ready", "Ready"],
            ["blocked", "Blocked"],
            ["graph", "Graph"],
          ] as const
        ).map(([v, label]) => (
          <Tab
            key={v}
            value={v}
            label={label}
            id={`${tabsId}-${v}`}
            aria-controls={`${tabsId}-panel`}
          />
        ))}
      </Tabs>

      <div className="work-filters" role="group" aria-label="Filters">
        <Choice
          label="Initiative"
          value={search.initiative ?? ""}
          options={[
            ["", "All initiatives"],
            ...s.initiatives.map((i) => [i.id, `${i.id} ${i.title}`] as const),
          ]}
          onChange={(v) =>
            set({ initiative: v || undefined, project: undefined })
          }
          minWidth={200}
        />
        <Choice
          label="Project"
          value={search.project ?? ""}
          options={[
            ["", "All projects"],
            ...projects.map((p) => [p.id, `${p.id} ${p.title}`] as const),
          ]}
          onChange={(v) => set({ project: v || undefined })}
          minWidth={200}
        />
        <Chips
          label="Kinds"
          options={[
            ["work", "Work"],
            ["decision", "Decisions"],
            ["external", "External"],
          ]}
          value={kinds}
          onChange={(v) => set({ kind: v.length ? v.join(",") : undefined })}
        />
        <FormControlLabel
          control={
            <Switch
              checked={!!search.owner}
              onChange={(e) => set({ owner: e.target.checked || undefined })}
            />
          }
          label="Waiting on the owner"
        />
        <TextField
          size="small"
          type="search"
          placeholder="Search items"
          value={search.q ?? ""}
          onChange={(e) => set({ q: e.target.value || undefined }, true)}
          slotProps={{ htmlInput: { "aria-label": "Search items (/)" } }}
          className="work-search"
        />
      </div>
      <div className="work-shown" aria-live="polite">
        <Typography variant="body-sm" color="textSecondary">
          {filtered
            ? `${items.length} of ${s.items.length} items`
            : `${s.items.length} items in ${s.projects.length} projects`}
        </Typography>
        {filtered && (
          <Button
            variant="text"
            size="small"
            onClick={() =>
              set({
                initiative: undefined,
                project: undefined,
                kind: undefined,
                owner: undefined,
                q: undefined,
              })
            }
          >
            Clear filters
          </Button>
        )}
      </div>

      <div
        role="tabpanel"
        id={`${tabsId}-panel`}
        aria-labelledby={`${tabsId}-${view}`}
      >
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
                    kind: undefined,
                    owner: undefined,
                    q: undefined,
                  })
                }
              >
                Clear filters
              </Button>
            }
          >
            Try fewer filters, or another project.
          </Empty>
        ) : view === "ready" ? (
          <Grouped
            s={s}
            items={items.filter((it) => it.ready)}
            empty="Nothing here is ready: everything open waits on something."
            selected={search.item}
            projectOf={projectOf}
            line={(it) =>
              it.needed_by.length
                ? `Unblocks ${it.needed_by.length}`
                : undefined
            }
          />
        ) : view === "blocked" ? (
          <Grouped
            s={s}
            items={items.filter((it) => it.blocked)}
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
          />
        )}
      </div>

      <Typography
        variant="caption-md"
        color="textTertiary"
        render={<p />}
        className="work-footnote"
      >
        This branch only{s.branch ? ` (${s.branch})` : ""}. Read{" "}
        {new Date(s.generated).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
        , and again whenever this window comes to the front.
      </Typography>

      <ItemPanel
        s={s}
        id={search.item}
        projectOf={projectOf}
        itemOf={itemOf}
        onClose={() => set({ item: undefined })}
        onProject={(id) => set({ project: id, initiative: undefined })}
      />
    </Page>
  );
}

function Tile({
  label,
  value,
  unit,
  detail,
  tone,
  pressed,
  onClick,
}: {
  label: string;
  value: number;
  unit?: string;
  detail: ReactNode;
  tone?: "warning";
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={`work-tile ${tone ?? ""}`}
        aria-pressed={pressed}
        onClick={onClick}
      >
        <Typography variant="caption-lg" color="textSecondary">
          {label}
        </Typography>
        <span className="work-tile-value">
          {value}
          {unit && (
            <Typography
              variant="body-sm"
              color="textSecondary"
              className="work-tile-unit"
            >
              {unit}
            </Typography>
          )}
        </span>
        {typeof detail === "string" ? (
          <Typography variant="caption-md" color="textSecondary">
            {detail}
          </Typography>
        ) : (
          detail
        )}
      </button>
    </li>
  );
}

// ------------------------------------------------------------ the board

function Columns({
  items,
  selected,
  projectOf,
  owner,
}: {
  items: WorkItem[];
  selected?: string;
  projectOf: Map<string, WorkContainer>;
  owner: Set<string>;
}) {
  const columns = useMemo(() => columnsOf(items), [items]);
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
}: {
  status: Status;
  items: WorkItem[];
  selected?: string;
  projectOf: Map<string, WorkContainer>;
  owner: Set<string>;
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
}: {
  it: WorkItem;
  selected: boolean;
  project?: WorkContainer;
  waitsOnOwner: boolean;
}) {
  const state = stateOf(it);
  const badge = !isOpen(it) ? null : it.status ===
    "In progress" ? null : isOwnerDecision(it) ? (
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
        {it.claimed && it.status === "In progress" && (
          <Typography
            variant="caption-md"
            className="work-claim"
            title={`Claimed by ${it.claimed}`}
          >
            {it.claimed}
          </Typography>
        )}
      </span>
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
  onClose,
  onProject,
}: {
  s: WorkSnapshot;
  id?: string;
  projectOf: Map<string, WorkContainer>;
  itemOf: Map<string, WorkItem>;
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
            {it.claimed && <Fact name="Claimed by">{it.claimed}</Fact>}
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
