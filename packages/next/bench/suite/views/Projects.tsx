import "./projects.css";
import {
  Button,
  IconButton,
  Link,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { Icon } from "@stratakit/mui";
import {
  Fragment,
  type ReactNode,
  type RefObject,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type CellBlocker,
  type ProjectCell,
  type ProjectMatrix,
  projectMatrixOf,
  projectReadinessOf,
  type ProjectRow,
  type ProjectSort,
  type ReleaseColumn,
  sortProjectRows,
} from "../projects.ts";
import type { WorkSearch } from "../routes.tsx";
import {
  clampSlots,
  committedOnly,
  type InFlight,
  NO_RELEASE,
  type Stage,
  STAGE_NAMES,
  stageOf,
  type WorkItem,
  type WorkSnapshot,
} from "../work.ts";
import { StageBar, WorkHoverCard } from "./HoverCard.tsx";
import { KindId, KindMark } from "./Work.tsx";

/**
 * The roadmap's Projects view (CS-693; DESIGN.md, "The roadmap's
 * Projects view"): how ready each project's work is for each release.
 * Projects are rows and releases columns, in ladder order; each cell
 * counts the project's items that release needs by stage and names what
 * holds up the blocked ones. A column says how much of other projects'
 * work waits on each project, so the bottlenecks rise to the top, and a
 * project's open decisions sit under its row. Behind a toggle, the
 * projects' waits on each other as a matrix. Nothing animates, so there
 * is no motion to reduce.
 */

const slug = (st: Stage) => st.toLowerCase().replace(/\s+/g, "-");
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** The stages a cell counts, in the order they are read: furthest along first. */
const CELL_STAGES: Array<{ st: Stage; word: string }> = [
  { st: "Done", word: "done" },
  { st: "In flight", word: "in progress" },
  { st: "Ready", word: "ready" },
  { st: "Waiting", word: "blocked" },
  { st: "Proposed", word: "proposed" },
];

/** A version without its "2.0.0-" lead, for a narrow column's head. */
const shortName = (name: string) => name.replace(/^\d+\.\d+\.\d+-/, "");

/** What sets a release's finish, for its tips (CS-692's wording). */
const FINISH_TIP =
  "What sets the release's finish: the chain of needs that ends at the last item it needs, as the Plan view sequences the work. Choose a release's marker in Plan to see it.";

/** The cell open under its row, or a project's Holds up. */
type Chosen = { row: string; col: number | "holds" };

export function ProjectsView({
  s,
  flight,
  items,
  scoped,
  proposals,
  search,
  set,
  onItem,
}: {
  s: WorkSnapshot;
  flight: InFlight;
  /** The scope's items: when scoped, their projects are the rows. */
  items: readonly WorkItem[];
  /** A scope is chosen: only its projects are rows. */
  scoped: boolean;
  /** Proposed releases and milestones count too (CS-563). */
  proposals: boolean;
  search: WorkSearch;
  set: (patch: Partial<WorkSearch>, replace?: boolean) => void;
  /** Opens an item, a release or a project in the pane. */
  onItem: (id: string) => void;
}) {
  return (
    <div className="projects">
      <div className="projects-bar">
        <ReleaseKey />
        <Link
          component="button"
          type="button"
          className="projects-matrix-link"
          onClick={() => {
            set({ roadmap: "deps", deps: "all" });
            scrollToMatrix();
          }}
        >
          Projects' waits on each other
        </Link>
      </div>
      <ByRelease
        s={s}
        flight={flight}
        items={items}
        scoped={scoped}
        proposals={proposals}
        slots={clampSlots(search.slots ?? 1)}
        sort={search.psort === "project" ? "project" : "holds"}
        onSort={(v) => set({ psort: v === "holds" ? undefined : v }, true)}
        onItem={onItem}
      />
    </div>
  );
}

/**
 * Brings the project matrix into view once the Dependencies view's
 * whole structure has drawn it (it sits under the waves).
 */
function scrollToMatrix(tries = 30) {
  requestAnimationFrame(() => {
    const head = document.getElementById("deps-matrix-h");
    if (head) {
      head.scrollIntoView({ block: "start" });
    } else if (tries > 0) {
      scrollToMatrix(tries - 1);
    }
  });
}

// ------------------------------------------------------------ the key

/** The one key line for By release: the stage fills, then the marks. */
function ReleaseKey() {
  return (
    <ul className="projects-key" aria-label="Key">
      {CELL_STAGES.map(({ st }) => (
        <li key={st}>
          <span className={`work-swatch stage-${slug(st)}`} aria-hidden />
          {STAGE_NAMES[st]}
        </li>
      ))}
      <li className="projects-key-gap k-decision">
        <KindMark kind="decision" named={false} />
        Your decision
      </li>
      <li className="k-external">
        <KindMark kind="external" named={false} />
        Outside wait
      </li>
      <li title={FINISH_TIP}>
        <span className="projects-finish-swatch" aria-hidden />
        Sets a release's finish
      </li>
    </ul>
  );
}

// ------------------------------------------------------------ by release

/** Below this width the table becomes a card per project. */
const CARDS_BELOW = 560;

/** Whether an element is narrower than `px`, kept current. */
function useNarrow(ref: RefObject<HTMLElement | null>, px: number) {
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    setNarrow(el.getBoundingClientRect().width < px);
    const ro = new ResizeObserver(([e]) =>
      setNarrow(e!.contentRect.width < px),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, px]);
  return narrow;
}

function ByRelease({
  s,
  flight,
  items,
  scoped,
  proposals,
  slots,
  sort,
  onSort,
  onItem,
}: {
  s: WorkSnapshot;
  flight: InFlight;
  items: readonly WorkItem[];
  scoped: boolean;
  proposals: boolean;
  /** The Plan view's executor slots: its chains set the releases' finish. */
  slots: number;
  sort: ProjectSort;
  onSort: (v: ProjectSort) => void;
  onItem: (id: string) => void;
}) {
  const r = useMemo(
    () =>
      projectReadinessOf(
        proposals ? s : committedOnly(s),
        flight,
        proposals,
        slots,
      ),
    [s, flight, proposals, slots],
  );
  const inScope = useMemo(
    () => new Set(items.map((it) => it.project ?? "")),
    [items],
  );
  const rows = useMemo(
    () =>
      sortProjectRows(
        scoped ? r.rows.filter((x) => inScope.has(x.id)) : r.rows,
        sort,
      ),
    [r, sort, scoped, inScope],
  );
  const itemOf = useMemo(() => new Map(s.items.map((i) => [i.id, i])), [s]);
  const titleOf = (id: string) =>
    itemOf.get(id)?.title ?? s.projects.find((p) => p.id === id)?.title ?? id;
  const projectTitle = (id: string) =>
    s.projects.find((p) => p.id === id)?.title ?? "No project";
  const [chosen, setChosen] = useState<Chosen>();
  const detailId = useId();
  const choose = (c: Chosen) =>
    setChosen(
      chosen && chosen.row === c.row && chosen.col === c.col ? undefined : c,
    );
  const released = r.columns.filter((c) => c.id !== NO_RELEASE).length;
  const box = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(box, CARDS_BELOW);

  if (!rows.length) {
    return (
      <Typography variant="body-md" color="textSecondary" render={<p />}>
        {scoped
          ? "No release needs anything from the projects in this scope."
          : "No project has work a release needs."}
      </Typography>
    );
  }
  const sortButton = (by: ProjectSort, label: ReactNode) => (
    <button
      type="button"
      className={`projects-sort${sort === by ? " on" : ""}`}
      onClick={() => onSort(by)}
      title={
        by === "holds"
          ? "Sort by how much of other projects' work waits on each, most first"
          : "Sort by project number"
      }
    >
      {label}
      {sort === by && (
        <span aria-hidden className="projects-sort-arrow">
          {by === "holds" ? "↓" : "↑"}
        </span>
      )}
    </button>
  );
  const detailOf = (row: ProjectRow, col: number | "holds") => (
    <Detail
      row={row}
      col={col}
      columns={r.columns}
      chains={r.chains}
      itemOf={itemOf}
      flight={flight}
      projectTitle={projectTitle}
      onItem={onItem}
      onClose={() => setChosen(undefined)}
    />
  );
  return (
    <div ref={box}>
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="projects-note"
      >
        {released
          ? "Each cell is what a release is the first to need from a project. Choose one for its items and what blocks them; choose a Holds up figure for what waits."
          : "No open release yet: every project's open work is in no release."}
      </Typography>
      {narrow ? (
        <ProjectCards
          rows={rows}
          columns={r.columns}
          sort={sort}
          onSort={onSort}
          chosen={chosen}
          detailId={detailId}
          onChoose={choose}
          detailOf={detailOf}
          titleOf={titleOf}
          onItem={onItem}
        />
      ) : (
        <div className="projects-scroll">
          <table className="projects-table">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="projects-corner"
                  aria-sort={sort === "project" ? "ascending" : undefined}
                >
                  {sortButton("project", "Project")}
                </th>
                <th
                  scope="col"
                  className="projects-holds-col"
                  aria-sort={sort === "holds" ? "descending" : undefined}
                >
                  {sortButton("holds", "Holds up")}
                </th>
                {r.columns.map((c) => (
                  <th
                    key={c.id}
                    scope="col"
                    className={`projects-col${c.id === NO_RELEASE ? " none" : ""}${c.proposed ? " proposed" : ""}`}
                  >
                    {c.id === NO_RELEASE ? (
                      <span className="projects-col-name">No release</span>
                    ) : (
                      <WorkHoverCard id={c.id}>
                        <button
                          type="button"
                          className="projects-col-name k-release"
                          onClick={() => onItem(c.id)}
                          aria-label={`${c.id} ${titleOf(c.id)}${c.proposed ? " (proposed)" : ""}`}
                        >
                          <KindMark kind="release" />
                          <span className="projects-col-full">{c.name}</span>
                          <span className="projects-col-short">
                            {shortName(c.name)}
                          </span>
                        </button>
                      </WorkHoverCard>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row.id || "none"}>
                  <tr className={row.decisions.length ? "has-decisions" : ""}>
                    <th scope="row" className="projects-row">
                      {row.id ? (
                        <WorkHoverCard id={row.id}>
                          <button
                            type="button"
                            className="projects-row-name k-project"
                            onClick={() => onItem(row.id)}
                          >
                            <KindMark kind="project" />
                            <span>{row.title}</span>
                          </button>
                        </WorkHoverCard>
                      ) : (
                        <span className="projects-row-name">{row.title}</span>
                      )}
                    </th>
                    <td className="projects-holds">
                      <HoldsView
                        row={row}
                        columns={r.columns}
                        selected={
                          chosen?.row === row.id && chosen.col === "holds"
                        }
                        controls={detailId}
                        onChoose={() => choose({ row: row.id, col: "holds" })}
                      />
                    </td>
                    {r.columns.map((c, k) => (
                      <td
                        key={c.id}
                        className={`projects-cell${c.id === NO_RELEASE ? " none" : ""}`}
                      >
                        <CellView
                          cell={row.cells[k]}
                          column={c}
                          columns={r.columns}
                          row={row}
                          selected={chosen?.row === row.id && chosen.col === k}
                          controls={detailId}
                          onChoose={() => choose({ row: row.id, col: k })}
                        />
                      </td>
                    ))}
                  </tr>
                  {chosen?.row === row.id && (
                    <tr className="projects-detail-row">
                      <td colSpan={r.columns.length + 2} id={detailId}>
                        {detailOf(row, chosen.col)}
                      </td>
                    </tr>
                  )}
                  {row.decisions.length > 0 && (
                    <tr className="projects-decisions-row">
                      <td colSpan={r.columns.length + 2}>
                        <DecisionCards
                          row={row}
                          columns={r.columns}
                          titleOf={titleOf}
                          onItem={onItem}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** By release at phone width: a card per project, its releases listed in it. */
function ProjectCards({
  rows,
  columns,
  sort,
  onSort,
  chosen,
  detailId,
  onChoose,
  detailOf,
  titleOf,
  onItem,
}: {
  rows: readonly ProjectRow[];
  columns: readonly ReleaseColumn[];
  sort: ProjectSort;
  onSort: (v: ProjectSort) => void;
  chosen?: Chosen;
  detailId: string;
  onChoose: (c: Chosen) => void;
  detailOf: (row: ProjectRow, col: number | "holds") => ReactNode;
  titleOf: (id: string) => string;
  onItem: (id: string) => void;
}) {
  return (
    <>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={sort}
        onChange={(_, v: ProjectSort | null) => v && onSort(v)}
        aria-label="Sort projects by"
        className="projects-cards-sort"
      >
        <ToggleButton
          value="holds"
          render={<Button variant="outlined" size="small" />}
        >
          Holds up most
        </ToggleButton>
        <ToggleButton
          value="project"
          render={<Button variant="outlined" size="small" />}
        >
          Project number
        </ToggleButton>
      </ToggleButtonGroup>
      <ol className="projects-cards">
        {rows.map((row) => {
          const empty = columns.filter(
            (c, k) => c.id !== NO_RELEASE && !row.cells[k],
          );
          return (
            <li key={row.id || "none"} className="projects-card">
              <h3 className="projects-card-head">
                {row.id ? (
                  <button
                    type="button"
                    className="projects-row-name k-project"
                    onClick={() => onItem(row.id)}
                  >
                    <KindMark kind="project" />
                    <span>{row.title}</span>
                  </button>
                ) : (
                  <span className="projects-row-name">{row.title}</span>
                )}
              </h3>
              <HoldsView
                row={row}
                columns={columns}
                selected={chosen?.row === row.id && chosen.col === "holds"}
                controls={detailId}
                onChoose={() => onChoose({ row: row.id, col: "holds" })}
                named
              />
              {chosen?.row === row.id && chosen.col === "holds" && (
                <div id={detailId}>{detailOf(row, "holds")}</div>
              )}
              <ul className="projects-card-releases">
                {columns.map((c, k) =>
                  row.cells[k] ? (
                    <li key={c.id}>
                      <span
                        className={`projects-card-rel${c.id === NO_RELEASE ? "" : " k-release"}`}
                      >
                        {c.id !== NO_RELEASE && <KindMark kind="release" />}
                        {c.name}
                      </span>
                      <CellView
                        cell={row.cells[k]}
                        column={c}
                        columns={columns}
                        row={row}
                        selected={chosen?.row === row.id && chosen.col === k}
                        controls={detailId}
                        onChoose={() => onChoose({ row: row.id, col: k })}
                      />
                      {chosen?.row === row.id && chosen.col === k && (
                        <div id={detailId}>{detailOf(row, k)}</div>
                      )}
                    </li>
                  ) : null,
                )}
              </ul>
              {empty.length > 0 && (
                <p className="projects-empty">
                  Needs nothing for{" "}
                  {versionsOf(
                    empty.map((c) => c.id),
                    columns,
                  ).join(", ")}
                </p>
              )}
              {row.decisions.length > 0 && (
                <DecisionCards
                  row={row}
                  columns={columns}
                  titleOf={titleOf}
                  onItem={onItem}
                />
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** The words for a cell's counts: "2 in progress · 3 blocked" (done is said first). */
const countWords = (counts: Record<Stage, number>) =>
  CELL_STAGES.filter(({ st }) => st !== "Done" && counts[st] > 0).map(
    ({ st, word }) => ({ st, text: `${counts[st]} ${word}` }),
  );

function CellView({
  cell,
  column,
  columns,
  row,
  selected,
  controls,
  onChoose,
}: {
  cell?: ProjectCell;
  column: ReleaseColumn;
  columns: readonly ReleaseColumn[];
  row: ProjectRow;
  selected: boolean;
  controls: string;
  onChoose: () => void;
}) {
  if (!cell) {
    return (
      <span className="projects-empty">
        {column.id === NO_RELEASE ? "Nothing open" : "Needs nothing"}
        <span className="visually-hidden">
          {column.id === NO_RELEASE
            ? ` in ${row.title} outside the releases`
            : ` from ${row.title}`}
        </span>
      </span>
    );
  }
  const total = cell.items.length;
  const words = countWords(cell.counts);
  const shown = cell.blockers.slice(0, 3);
  const more = cell.blockers.length - shown.length;
  const label = [
    `${row.title} in ${column.name}: ${cell.counts.Done} of ${total} done`,
    ...words.map((w) => w.text),
    cell.blockers.length
      ? `blocked by ${cell.blockers.map((b) => b.id).join(", ")}`
      : "",
    cell.finishing.length
      ? `sets the finish of ${versionsOf(cell.finishes, columns).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("; ");
  return (
    <WorkHoverCard
      id={row.id}
      title={row.title}
      items={cell.items}
      release={column.id}
      click="Click for its items"
    >
      <button
        type="button"
        className={`projects-cell-btn${selected ? " selected" : ""}${cell.finishing.length ? " finishing" : ""}${cell.proposed.length === total ? " proposed" : ""}`}
        aria-expanded={selected}
        aria-controls={controls}
        aria-label={label}
        onClick={onChoose}
      >
        <span className="projects-cell-head">
          <b>{cell.counts.Done}</b> of {total} done
        </span>
        <StageBar
          items={cell.items}
          counts={cell.counts}
          className="projects-bar-track"
        />
        {words.length > 0 && (
          <span className="projects-cell-counts">
            {words.map((w) => (
              <span key={w.st}>
                <span className={`work-swatch stage-${slug(w.st)}`} />
                {w.text}
              </span>
            ))}
          </span>
        )}
        {shown.length > 0 && (
          <span className="projects-cell-blockers">
            <span className="projects-by">By</span>
            {shown.map((b) => (
              <KindId key={b.id} id={b.id} />
            ))}
            {more > 0 && <span className="projects-more">+{more}</span>}
          </span>
        )}
        {cell.finishing.length > 0 && (
          <span className="projects-finish-tag">
            Sets the finish of {versionsOf(cell.finishes, columns).join(", ")}
          </span>
        )}
        {cell.proposed.length > 0 && cell.proposed.length < total && (
          <span className="projects-cell-proposed">
            {cell.proposed.length} in proposed milestones
          </span>
        )}
      </button>
    </WorkHoverCard>
  );
}

/** Versions, short: "alpha.1, beta.1". */
const versionsOf = (
  ids: readonly string[],
  columns: readonly ReleaseColumn[],
) => ids.map((id) => shortName(columns.find((c) => c.id === id)?.name ?? id));

function HoldsView({
  row,
  columns,
  selected,
  controls,
  onChoose,
  named = false,
}: {
  /** Says "Holds up" before the count, where no column head does. */
  named?: boolean;
  row: ProjectRow;
  columns: readonly ReleaseColumn[];
  selected: boolean;
  controls: string;
  onChoose: () => void;
}) {
  const n = row.holdsUp.items.length;
  const finishing = versionsOf(row.finishing, columns);
  const body = (
    <>
      <span className="projects-holds-line">
        {named && <span>Holds up</span>}
        <b className="projects-holds-n">{n}</b>
        <span>
          {n
            ? `${n === 1 ? "item" : "items"} in ${plural(row.holdsUp.projects.length, "project", "projects")}`
            : "Nothing in other projects waits on it"}
        </span>
      </span>
      {row.holdsUp.releases.length > 0 && (
        <span className="projects-holds-releases">
          For {versionsOf(row.holdsUp.releases, columns).join(", ")}
        </span>
      )}
      {finishing.length > 0 && (
        <span className="projects-finish-tag" title={FINISH_TIP}>
          Sets the finish of {finishing.join(", ")}
        </span>
      )}
    </>
  );
  return n || finishing.length ? (
    <button
      type="button"
      className={`projects-holds-btn${selected ? " selected" : ""}`}
      aria-expanded={selected}
      aria-controls={controls}
      onClick={onChoose}
    >
      {body}
    </button>
  ) : (
    <span className="projects-holds-btn quiet">{body}</span>
  );
}

/** A project's open decisions, drawn as on the map: the question, and what waits. */
function DecisionCards({
  row,
  columns,
  titleOf,
  onItem,
}: {
  row: ProjectRow;
  columns: readonly ReleaseColumn[];
  titleOf: (id: string) => string;
  onItem: (id: string) => void;
}) {
  return (
    <div className="projects-decisions">
      <Typography
        variant="caption-md"
        color="textSecondary"
        className="projects-decisions-head"
      >
        Your {row.decisions.length === 1 ? "decision" : "decisions"} in{" "}
        {row.title} that hold up release work
      </Typography>
      <ul>
        {row.decisions.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              className="projects-decision"
              onClick={() => onItem(d.id)}
              title={`${d.id}: ${d.title}${
                d.waiting.length
                  ? `\nWaiting on it: ${d.waiting
                      .slice(0, 8)
                      .map((id) => `${id} ${titleOf(id)}`)
                      .join(
                        "; ",
                      )}${d.waiting.length > 8 ? `; and ${d.waiting.length - 8} more` : ""}`
                  : ""
              }`}
            >
              <span className="projects-decision-q">
                <KindMark kind="decision" />
                <span>{d.title}</span>
              </span>
              <span className="projects-decision-meta">
                {plural(d.waiting.length, "item waits", "items wait")} · for{" "}
                {versionsOf(d.releases, columns).join(", ")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The chosen cell's items by stage, or what waits on a project. */
function Detail({
  row,
  col,
  columns,
  chains,
  itemOf,
  flight,
  projectTitle,
  onItem,
  onClose,
}: {
  row: ProjectRow;
  col: number | "holds";
  columns: readonly ReleaseColumn[];
  /** What sets each release's finish (the Plan view's chains). */
  chains: ReadonlyMap<string, readonly string[]>;
  itemOf: ReadonlyMap<string, WorkItem>;
  flight: InFlight;
  projectTitle: (id: string) => string;
  onItem: (id: string) => void;
  onClose: () => void;
}) {
  const headId = useId();
  const line = (id: string, after?: ReactNode) => (
    <li key={id}>
      <button
        type="button"
        className="projects-detail-item"
        onClick={() => onItem(id)}
      >
        <KindId id={id} />
        <span className="projects-detail-title">
          {itemOf.get(id)?.title ?? id}
        </span>
        {after}
      </button>
    </li>
  );
  let head: string;
  let body: ReactNode;
  if (col === "holds") {
    head = `What waits on ${row.title}`;
    const byProject = new Map<string, string[]>();
    for (const id of row.holdsUp.items) {
      const p = itemOf.get(id)?.project ?? "";
      byProject.set(p, [...(byProject.get(p) ?? []), id]);
    }
    body = (
      <>
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          Open items in other projects that need its open work, directly or
          through others.
          {row.finishing.length > 0 &&
            ` Its work is on what sets the finish of ${versionsOf(row.finishing, columns).join(" and ")}.`}
        </Typography>
        {[...byProject].map(([p, ids]) => (
          <section key={p} className="projects-detail-group">
            <Typography variant="caption-lg" render={<h4 />}>
              {projectTitle(p)} · {ids.length}
            </Typography>
            <ul>{ids.map((id) => line(id))}</ul>
          </section>
        ))}
      </>
    );
  } else {
    const c = columns[col]!;
    const cell = row.cells[col]!;
    head = `${row.title} in ${c.name}`;
    const groups = CELL_STAGES.map(({ st }) => ({
      st,
      ids: cell.items.filter((id) => {
        const it = itemOf.get(id);
        return it && stageOf(it, flight) === st;
      }),
    })).filter((g) => g.ids.length);
    const holding = (id: string) =>
      cell.blockers.filter((b) => b.holds.includes(id));
    /** The releases whose finish an item sets, short. */
    const sets = (id: string) =>
      versionsOf(
        cell.finishes.filter((rel) => chains.get(rel)?.includes(id)),
        columns,
      );
    body = (
      <>
        {cell.finishing.length > 0 && (
          <Typography variant="body-sm" render={<p />}>
            <span className="projects-finish-tag">
              Sets the finish of {versionsOf(cell.finishes, columns).join(", ")}
            </span>{" "}
            {plural(
              cell.finishing.length,
              "of its items is",
              "of its items are",
            )}{" "}
            on what sets that release's finish: the chain of needs that ends at
            the last item it needs, as the Plan view sequences the work.
          </Typography>
        )}
        {cell.blockers.length > 0 && (
          <section className="projects-detail-group">
            <Typography variant="caption-lg" render={<h4 />}>
              What blocks them
            </Typography>
            <ul>
              {cell.blockers.map((b) =>
                line(
                  b.id,
                  <span className="projects-detail-meta">
                    {blockerWord(b, projectTitle)} · holds{" "}
                    {plural(b.holds.length, "item", "items")}
                  </span>,
                ),
              )}
            </ul>
          </section>
        )}
        {groups.map((g) => (
          <section key={g.st} className="projects-detail-group">
            <Typography variant="caption-lg" render={<h4 />}>
              <span className={`work-swatch stage-${slug(g.st)}`} />{" "}
              {STAGE_NAMES[g.st]} · {g.ids.length}
            </Typography>
            <ul>
              {g.ids.map((id) =>
                line(
                  id,
                  g.st === "Waiting" && holding(id).length > 0 ? (
                    <span className="projects-detail-meta">
                      by{" "}
                      {holding(id)
                        .map((b) => b.id)
                        .join(", ")}
                    </span>
                  ) : sets(id).length ? (
                    <span className="projects-detail-meta">
                      sets the finish of {sets(id).join(", ")}
                    </span>
                  ) : undefined,
                ),
              )}
            </ul>
          </section>
        ))}
      </>
    );
  }
  return (
    <section className="projects-detail" aria-labelledby={headId}>
      <header>
        <Typography variant="subtitle-md" render={<h3 />} id={headId}>
          {head}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <Icon href={svgDismiss} />
        </IconButton>
      </header>
      {body}
    </section>
  );
}

const blockerWord = (b: CellBlocker, projectTitle: (id: string) => string) =>
  b.kind === "decision"
    ? "your decision"
    : b.kind === "external"
      ? "an outside wait"
      : `${projectTitle(b.project ?? "")}'s work`;

// ------------------------------------------------------------ dependencies

/**
 * Projects against projects (a design structure matrix): row waits on
 * column, each cell the number of the row's open items that need the
 * column's. Ordered upstream first with coupled projects together;
 * projects that wait on each other, a loop, sit together in a box.
 * Choosing a cell lists the items behind it.
 */
export function ProjectMatrixView({
  s,
  items,
  onCell,
}: {
  s: WorkSnapshot;
  items: readonly WorkItem[];
  onCell: (from: string, to: string) => void;
}) {
  const m: ProjectMatrix = useMemo(() => projectMatrixOf(s, items), [s, items]);
  const title = (id: string) =>
    s.projects.find((p) => p.id === id)?.title ?? id;
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
  const loopAt = (id: string) => m.loopOf.get(id);
  const first = (id: string) => {
    const l = loopAt(id);
    return l !== undefined && m.loops[l]![0] === id;
  };
  const last = (id: string) => {
    const l = loopAt(id);
    return l !== undefined && m.loops[l]!.at(-1) === id;
  };
  const read = (r: number, c: number) => {
    const from = m.order[r]!;
    const to = m.order[c]!;
    const n = m.cells.get(`${from}|${to}`)?.length ?? 0;
    if (r === c) {
      return (
        <>
          <b>{title(from)}</b> (the diagonal)
        </>
      );
    }
    const together = loopAt(from) !== undefined && loopAt(from) === loopAt(to);
    return (
      <>
        <b>{title(from)}</b> waits on <b>{title(to)}</b>:{" "}
        {n ? plural(n, "item", "items") : "nothing"}
        {n > 0 && m.cells.has(`${to}|${from}`)
          ? `, and ${title(to)} waits on it too`
          : together
            ? `; both are in loop ${loopAt(from)! + 1}`
            : ""}
      </>
    );
  };
  return (
    <div className="work-matrix projects-matrix">
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="work-matrix-note"
      >
        What's needed comes first, so most marks sit below the diagonal, and
        projects that wait on each other the most sit side by side.{" "}
        {m.loops.length
          ? `${m.loops.length === 1 ? "One loop" : `${m.loops.length} loops`}: projects that wait on each other, through their items. Each is boxed and marked ↻; the marks above the diagonal inside it close the loop.`
          : "No projects wait on each other in a loop."}
      </Typography>
      <Typography
        variant="body-sm"
        render={<p />}
        className="work-matrix-read"
        aria-live="polite"
      >
        {hot
          ? read(hot.r, hot.c)
          : "Point at a cell, or move to one, to name its row and column."}
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
                  className={`work-matrix-col${hot?.c === c ? " hot" : ""}`}
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
                  className={`work-matrix-row${hot?.r === r ? " hot" : ""}${loopAt(from) !== undefined ? " in-loop" : ""}`}
                  title={`${from} ${title(from)}`}
                >
                  <span className="projects-matrix-head">
                    <span className="work-matrix-n">{r + 1}</span>
                    <KindMark kind="project" />
                    <span className="projects-matrix-name">{title(from)}</span>
                    {first(from) && (
                      <span
                        className="projects-loop-tag"
                        title={`Loop ${loopAt(from)! + 1}: these projects wait on each other`}
                      >
                        <span aria-hidden="true">↻</span>
                        <span className="visually-hidden">Loop</span>{" "}
                        {loopAt(from)! + 1}
                      </span>
                    )}
                  </span>
                </th>
                {m.order.map((to, c) => {
                  const list = m.cells.get(`${from}|${to}`);
                  const n = list?.length ?? 0;
                  const lf = loopAt(from);
                  const box = lf !== undefined && lf === loopAt(to);
                  const edges = box
                    ? `${first(from) ? " bt" : ""}${last(from) ? " bb" : ""}${first(to) ? " bl" : ""}${last(to) ? " br" : ""}`
                    : "";
                  return (
                    <td
                      key={to}
                      className={`work-matrix-cell${r === c ? " diag" : ""}${n && c > r ? " above" : ""}${hot && (hot.r === r || hot.c === c) ? " cross" : ""}${hot && hot.r === r && hot.c === c ? " at" : ""}${box ? ` loop${edges}` : ""}`}
                      onMouseEnter={() => setHot({ r, c })}
                    >
                      {n > 0 && (
                        <button
                          type="button"
                          className={`work-matrix-mark l${level(n)}`}
                          onClick={() => onCell(from, to)}
                          onFocus={() => setHot({ r, c })}
                          onBlur={() => setHot(undefined)}
                          aria-label={`${title(from)} waits on ${title(to)}: ${plural(n, "item", "items")}${box ? `, in loop ${lf! + 1}` : ""}`}
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
        <Typography
          variant="caption-md"
          color="textSecondary"
          render={<p />}
          className="projects-alone"
        >
          Not linked to another project: {m.alone.map(title).join(", ")}.
        </Typography>
      )}
    </div>
  );
}
