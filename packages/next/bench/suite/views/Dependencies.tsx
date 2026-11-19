import "./dependencies.css";
import {
  Button,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgChevronRight } from "@stratakit/icons/chevron-right";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgHierarchyTree } from "@stratakit/icons/hierarchy-tree";
import { svgReCenter } from "@stratakit/icons/re-center";
import { svgSearch } from "@stratakit/icons/search";
import { Icon } from "@stratakit/mui";
import { Link as RouterLink } from "@tanstack/react-router";
import { type ReactNode, useId, useMemo, useRef, useState } from "react";
import {
  type DepDir,
  type DepEdge,
  type DepGraph,
  dependencyGraphOf,
  depthOf,
  depTreeOf,
  DEPTH_MAX,
  DEPTH_MIN,
  type DepTreeNode,
  matchFocus,
  milestoneStage,
  milestoneStages,
  mostWaitedOn,
  type NodeRelease,
  nodeReleasesOf,
  type Reach,
  reachOf,
  wavesOf,
} from "../dependencies.ts";
import type { WorkSearch } from "../routes.tsx";
import {
  type InFlight,
  isOpen,
  isOwnerDecision,
  type Stage,
  STAGE_NAMES,
  stageOf,
  type WorkItem,
  type WorkMilestone,
  type WorkSnapshot,
} from "../work.ts";
import { InlineText } from "./ItemText.tsx";
import { KindId, KindMark } from "./Work.tsx";

/**
 * The Work page's Dependencies view (CS-694; DESIGN.md, "The roadmap's
 * Dependencies view"): one milestone or item at a time, what it waits on
 * to its left and what it unblocks to its right, as two small trees a
 * few levels deep, each cut short with how far its chain goes. Behind a
 * toggle, the whole structure for reshaping work: every milestone's
 * earliest possible start, in waves, and the project matrix. Nothing
 * animates, so there is no motion to reduce.
 */

const slug = (st: Stage) => st.toLowerCase().replace(/\s+/g, "-");

/** What each stage's fill means, for its tooltip. */
const STAGE_TIPS: Record<Stage, string> = {
  Proposed: "Proposed: not committed to yet",
  Waiting: "Blocked: something it needs is open",
  Ready: "Ready: nothing it needs is open",
  "In flight": "In progress: someone has it",
  Done: "Done",
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** A link that opens the Dependencies view centered on a milestone or item (the pane's). */
export function DependenciesLink({ id }: { id: string }) {
  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<Icon href={svgHierarchyTree} />}
      render={
        <RouterLink
          to="/work"
          search={(prev: WorkSearch) => ({
            ...prev,
            view: "roadmap",
            roadmap: "deps",
            focus: id,
            deps: undefined,
          })}
        />
      }
      nativeButton={false}
    >
      Its dependencies
    </Button>
  );
}

export function DependenciesView({
  s,
  flight,
  search,
  set,
  proposals,
  matrix,
}: {
  s: WorkSnapshot;
  flight: InFlight;
  search: WorkSearch;
  set: (patch: Partial<WorkSearch>, replace?: boolean) => void;
  /** Proposed milestones too (the roadmap's toggle). */
  proposals: boolean;
  /** The project matrix, drawn by the board, for the whole structure. */
  matrix: ReactNode;
}) {
  const g = useMemo(() => dependencyGraphOf(s, proposals), [s, proposals]);
  const up = useMemo(() => reachOf(g, "up"), [g]);
  const down = useMemo(() => reachOf(g, "down"), [g]);
  const releases = useMemo(() => nodeReleasesOf(s, proposals), [s, proposals]);
  const whole = search.deps === "all";
  const depth = depthOf(search.depth);
  const focus = search.focus;
  // What the pane shows, offered as a center when nothing is chosen.
  const inPane =
    search.item ??
    (search.list?.startsWith("ms:") ? search.list.slice(3) : undefined);
  const center = (id: string) => set({ focus: id, deps: undefined }, false);
  const openPane = (id: string) =>
    g.milestones.has(id) || s.milestones.some((m) => m.id === id)
      ? set({ list: `ms:${id}`, item: undefined })
      : set({ item: id, list: undefined });
  const ctx: NodeContext = {
    s,
    g,
    flight,
    up,
    down,
    releases,
    selected: inPane,
    onOpen: openPane,
    onCenter: center,
  };
  return (
    <div className="deps">
      <div className="deps-bar">
        <ToggleButtonGroup
          size="small"
          exclusive
          value={whole ? "all" : "one"}
          onChange={(_, v: string | null) =>
            v && set({ deps: v === "all" ? "all" : undefined }, true)
          }
          aria-label="Dependencies of"
        >
          <ToggleButton
            value="one"
            render={<Button variant="outlined" size="small" />}
          >
            One at a time
          </ToggleButton>
          <ToggleButton
            value="all"
            render={
              <Button
                variant="outlined"
                size="small"
                data-tip="Every milestone's earliest possible start, and the project matrix: for reshaping work"
              />
            }
          >
            Whole structure
          </ToggleButton>
        </ToggleButtonGroup>
        {!whole && (
          <>
            <FocusChooser s={s} onChoose={center} />
            <span className="deps-depth" role="group" aria-label="Levels shown">
              <IconButton
                label="Show one level fewer"
                size="small"
                disabled={depth <= DEPTH_MIN}
                onClick={() => set({ depth: String(depth - 1) }, true)}
              >
                <span aria-hidden="true">−</span>
              </IconButton>
              <Typography variant="body-sm" className="deps-depth-n">
                {plural(depth, "level", "levels")}
              </Typography>
              <IconButton
                label="Show one level more"
                size="small"
                disabled={depth >= DEPTH_MAX}
                onClick={() => set({ depth: String(depth + 1) }, true)}
              >
                <span aria-hidden="true">+</span>
              </IconButton>
            </span>
          </>
        )}
      </div>
      {whole ? (
        <WholeStructure
          s={s}
          flight={flight}
          proposals={proposals}
          onCenter={center}
          matrix={matrix}
        />
      ) : focus ? (
        <Focused id={focus} depth={depth} ctx={ctx} />
      ) : (
        <Start ctx={ctx} inPane={inPane} />
      )}
    </div>
  );
}

/** What a node needs from the view around it. */
interface NodeContext {
  s: WorkSnapshot;
  g: DepGraph;
  flight: InFlight;
  up: Map<string, Reach>;
  down: Map<string, Reach>;
  releases: Map<string, NodeRelease>;
  /** What the pane shows, marked where it appears. */
  selected?: string;
  onOpen: (id: string) => void;
  onCenter: (id: string) => void;
}

/** The view's own chooser: any milestone or item, by ID or words in its title. */
function FocusChooser({
  s,
  onChoose,
}: {
  s: WorkSnapshot;
  onChoose: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const found = useMemo(() => matchFocus(s, q, 8), [s, q]);
  const choose = (id: string) => {
    setQ("");
    onChoose(id);
    // The matches go; keyboard focus stays in the field.
    input.current?.focus();
  };
  return (
    <div className="deps-chooser">
      <TextField
        size="small"
        type="search"
        placeholder="Center on a milestone or item"
        value={q}
        inputRef={input}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && found[0]) {
            e.preventDefault();
            choose(found[0].id);
          } else if (e.key === "Escape" && q) {
            setQ("");
          } else if (e.key === "ArrowDown" && found.length) {
            e.preventDefault();
            document
              .getElementById(listId)
              ?.querySelector<HTMLButtonElement>("button")
              ?.focus();
          }
        }}
        className="deps-chooser-field"
        slotProps={{
          htmlInput: {
            "aria-label": "Center on a milestone or item, by ID or title",
            "aria-controls": found.length ? listId : undefined,
          },
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
                    setQ("");
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
      {q.trim() && (
        <ul
          id={listId}
          className="deps-chooser-list"
          aria-label="Matches"
          onKeyDown={(e) => {
            const items = [
              ...e.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
            ];
            const at = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            if (e.key === "ArrowDown" && at < items.length - 1) {
              e.preventDefault();
              items[at + 1]!.focus();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              (at > 0 ? items[at - 1]! : input.current)?.focus();
            } else if (e.key === "Escape") {
              setQ("");
              input.current?.focus();
            }
          }}
        >
          {found.length ? (
            found.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => choose(f.id)}>
                  <KindId id={f.id} />
                  <span className="deps-chooser-title">
                    <InlineText text={f.title} />
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="deps-chooser-none">
              <Typography variant="body-sm" color="textSecondary">
                No milestone or item matches.
              </Typography>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Nothing chosen yet: a few good places to start. */
function Start({ ctx, inPane }: { ctx: NodeContext; inPane?: string }) {
  const top = mostWaitedOn(ctx.g, ctx.down, 8);
  const title = (id: string) =>
    ctx.g.milestones.get(id)?.title ??
    ctx.s.items.find((it) => it.id === id)?.title ??
    id;
  return (
    <div className="deps-start">
      <Typography variant="body-md" render={<p />}>
        Choose a milestone or an item to see what it waits on and what it
        unblocks. Search above, choose <b>Its dependencies</b> in the pane, or
        start from what most work waits on:
      </Typography>
      {inPane && (
        <p className="deps-start-pane">
          <Button
            variant="outlined"
            size="small"
            startIcon={<Icon href={svgReCenter} />}
            onClick={() => ctx.onCenter(inPane)}
          >
            Center on {inPane}, open in the pane
          </Button>
        </p>
      )}
      <ol className="deps-start-list" aria-label="Most waited on">
        {top.map((id) => (
          <li key={id}>
            <button
              type="button"
              className="deps-start-pick"
              onClick={() => ctx.onCenter(id)}
            >
              <KindId id={id} />
              <span className="deps-start-title">
                <InlineText text={title(id)} />
              </span>
              <span className="deps-start-n">
                unblocks {ctx.down.get(id)?.nodes ?? 0}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The chosen node, with its two trees beside it. */
function Focused({
  id,
  depth,
  ctx,
}: {
  id: string;
  depth: number;
  ctx: NodeContext;
}) {
  const { s, g } = ctx;
  const it = s.items.find((x) => x.id === id);
  const m = s.milestones.find((x) => x.id === id);
  const upTree = useMemo(() => depTreeOf(g, id, "up", depth), [g, id, depth]);
  const downTree = useMemo(
    () => depTreeOf(g, id, "down", depth),
    [g, id, depth],
  );
  if (!it && !m) {
    return (
      <Typography variant="body-md" color="textSecondary" render={<p />}>
        {id} isn't among this branch's milestones or items. Choose another.
      </Typography>
    );
  }
  const closed = it
    ? !isOpen(it)
    : m!.state === "done" || m!.state === "dropped";
  return (
    <>
      <Typography
        variant="caption-md"
        color="textSecondary"
        render={<p />}
        className="deps-key"
      >
        <span className="deps-key-wide">
          Left, what it waits on; right, what it unblocks.
        </span>
        <span className="deps-key-narrow">
          Under it, what it waits on, then what it unblocks.
        </span>{" "}
        A fill is a stage, a mark's ink its kind, a dashed outline proposed;
        hover for more.
      </Typography>
      <div className="deps-focus">
        <TreeSide
          dir="up"
          root={id}
          nodes={upTree}
          reach={ctx.up.get(id)}
          depth={depth}
          ctx={ctx}
        />
        <FocusCard it={it} m={m} closed={closed} ctx={ctx} />
        <TreeSide
          dir="down"
          root={id}
          nodes={downTree}
          reach={ctx.down.get(id)}
          depth={depth}
          ctx={ctx}
        />
      </div>
    </>
  );
}

function FocusCard({
  it,
  m,
  closed,
  ctx,
}: {
  it?: WorkItem;
  m?: WorkMilestone;
  closed: boolean;
  ctx: NodeContext;
}) {
  const id = (it ?? m)!.id;
  const title = (it ?? m)!.title;
  const st = nodeStage(id, ctx);
  const rel = ctx.releases.get(id);
  const counts = m
    ? milestoneStages(m, ctx.g.items, ctx.s.items, ctx.flight)
    : undefined;
  const hold =
    it && isOwnerDecision(it)
      ? "decision"
      : it?.kind === "external" && isOpen(it)
        ? "external"
        : undefined;
  return (
    <section
      className={`deps-center${st === "Proposed" ? " proposed" : ""}`}
      aria-label={`${id}, the center`}
    >
      <div className="deps-center-top">
        {st && (
          <span
            className={`deps-fill stage-${slug(st)}`}
            aria-hidden="true"
            data-tip={STAGE_TIPS[st]}
          />
        )}
        <KindId id={id} />
      </div>
      <Typography
        variant="body-md"
        render={<h3 />}
        className="deps-center-title"
      >
        <InlineText text={title} />
      </Typography>
      <dl className="deps-center-facts">
        <div>
          <dt>State</dt>
          <dd>
            {m ? (
              `${st ? STAGE_NAMES[st] : m.state}${(ctx.up.get(id)?.nodes ?? 0) === 0 && !closed ? ", can move now" : ""}`
            ) : (
              <span className={`deps-state${hold ? ` k-${hold}` : ""}`}>
                {hold && <KindMark kind={hold} named={false} />}
                {stateText(id, ctx, "up")}
              </span>
            )}
          </dd>
        </div>
        {m && counts && (
          <div>
            <dt>Its items</dt>
            <dd>
              {m.progress.done} of {m.progress.total} done
              {counts.Ready > 0 && `, ${counts.Ready} ready`}
              {counts["In flight"] > 0 &&
                `, ${counts["In flight"]} in progress`}
              {counts.Waiting > 0 && `, ${counts.Waiting} blocked`}
            </dd>
          </div>
        )}
        {it && it.milestones.length > 0 && (
          <div>
            <dt>{it.milestones.length === 1 ? "Milestone" : "Milestones"}</dt>
            <dd>
              {it.milestones.map((x, i) => (
                <span key={x}>
                  {i > 0 && ", "}
                  <Link
                    component="button"
                    type="button"
                    onClick={() => ctx.onCenter(x)}
                    title={`Center on ${x}`}
                  >
                    {x}
                  </Link>
                </span>
              ))}
            </dd>
          </div>
        )}
        {!closed && (
          <div>
            <dt>Release</dt>
            <dd>
              <ReleaseChip rel={rel} />
            </dd>
          </div>
        )}
      </dl>
      {closed && (
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          It's {it ? it.state : m!.state}: nothing waits on it any more, and its
          trees show open work only.
        </Typography>
      )}
      <Button
        variant="outlined"
        size="small"
        onClick={() => ctx.onOpen(id)}
        className="deps-center-open"
      >
        Open in the pane
      </Button>
    </section>
  );
}

/** One side: what the center waits on, or what it unblocks. */
function TreeSide({
  dir,
  root,
  nodes,
  reach,
  depth,
  ctx,
}: {
  dir: DepDir;
  root: string;
  nodes: DepTreeNode[];
  reach?: Reach;
  depth: number;
  ctx: NodeContext;
}) {
  const head = dir === "up" ? "Waits on" : "Unblocks";
  const headId = useId();
  const r = reach ?? { nodes: 0, levels: 0, decisions: 0, outside: 0 };
  return (
    <section className={`deps-side ${dir}`} aria-labelledby={headId}>
      <Typography
        variant="body-sm"
        render={<h3 />}
        className="deps-side-head"
        id={headId}
      >
        {head}
        <span className="deps-side-n">{r.nodes}</span>
      </Typography>
      <Typography
        variant="caption-md"
        color="textSecondary"
        render={<p />}
        className="deps-side-sum"
      >
        {r.nodes === 0 ? (
          dir === "up" ? (
            "Nothing open: it can move once it's planned."
          ) : (
            "No open work waits on it."
          )
        ) : (
          <>
            {plural(
              r.nodes,
              "open milestone or item",
              "open milestones and items",
            )}
            , {r.levels === 1 ? "one level" : `up to ${r.levels} levels`} deep
            {r.levels > depth &&
              `; showing ${plural(depth, "level", "levels")}`}
            {(r.decisions > 0 || r.outside > 0) && (
              <>
                {". Among them "}
                {r.decisions > 0 && (
                  <span className="deps-hold k-decision">
                    <KindMark kind="decision" named={false} />
                    {plural(
                      r.decisions,
                      "decision of yours",
                      "decisions of yours",
                    )}
                  </span>
                )}
                {r.decisions > 0 && r.outside > 0 && " and "}
                {r.outside > 0 && (
                  <span className="deps-hold k-external">
                    <KindMark kind="external" named={false} />
                    {plural(r.outside, "outside wait", "outside waits")}
                  </span>
                )}
              </>
            )}
            .
          </>
        )}
      </Typography>
      {nodes.length > 0 && (
        <ul className="deps-tree" role="tree" aria-labelledby={headId}>
          {nodes.map((n) => (
            <TreeNode key={n.id} n={n} dir={dir} trail={[root]} ctx={ctx} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TreeNode({
  n,
  dir,
  trail,
  ctx,
}: {
  n: DepTreeNode;
  dir: DepDir;
  /** The nodes on the way here, from the center. */
  trail: string[];
  ctx: NodeContext;
}) {
  const [open, setOpen] = useState(!!n.children);
  const toggle = useRef<HTMLButtonElement>(null);
  const path = [...trail, n.id];
  // Below the cut, its children come when it opens.
  const kids = useMemo(
    () =>
      n.children ?? (open ? depTreeOf(ctx.g, n.id, dir, 1, trail) : undefined),
    [n, open, ctx.g, dir, trail],
  );
  const expandable = n.more && !n.loop && !n.repeat;
  const reach = (dir === "up" ? ctx.up : ctx.down).get(n.id);
  const st = nodeStage(n.id, ctx);
  const title = titleOf(n.id, ctx);
  const rel = ctx.releases.get(n.id);
  const it = ctx.g.items.get(n.id);
  const hold =
    it && isOwnerDecision(it)
      ? "decision"
      : it?.kind === "external"
        ? "external"
        : undefined;
  return (
    <li
      role="treeitem"
      aria-expanded={expandable ? open : undefined}
      aria-selected={ctx.selected === n.id ? true : undefined}
      className={`deps-node${n.repeat ? " repeat" : ""}${hold ? ` hold-${hold}` : ""}${st === "Proposed" ? " proposed" : ""}${ctx.selected === n.id ? " selected" : ""}`}
    >
      <div className="deps-row">
        {expandable ? (
          <IconButton
            label={`${open ? "Hide" : "Show"} what ${n.id} ${dir === "up" ? "waits on" : "unblocks"}`}
            size="small"
            className="deps-toggle"
            ref={toggle}
            onClick={() => setOpen(!open)}
          >
            <Icon href={open ? svgChevronDown : svgChevronRight} />
          </IconButton>
        ) : (
          <span className="deps-toggle-spacer" aria-hidden="true" />
        )}
        <button
          type="button"
          className="deps-node-link"
          onClick={() => ctx.onOpen(n.id)}
          aria-label={`${n.id} ${title}: ${stateText(n.id, ctx, dir)}${rel ? `, ${rel.name}` : ""}. Opens in the pane.`}
        >
          {st && (
            <span
              className={`deps-fill stage-${slug(st)}`}
              aria-hidden="true"
              data-tip={STAGE_TIPS[st]}
            />
          )}
          <KindId id={n.id} />
          <span className="deps-node-title">
            <InlineText text={title} />
          </span>
        </button>
        <IconButton
          label={`Center on ${n.id}`}
          size="small"
          className="deps-recenter"
          onClick={() => ctx.onCenter(n.id)}
        >
          <Icon href={svgReCenter} />
        </IconButton>
      </div>
      <div className="deps-meta">
        {(!n.repeat || hold) && (
          <span className={`deps-state${hold ? ` k-${hold}` : ""}`}>
            {hold && <KindMark kind={hold} named={false} />}
            {stateText(n.id, ctx, dir)}
          </span>
        )}
        {rel && !n.repeat && <ReleaseChip rel={rel} />}
        <EdgeNote edge={n.edge} dir={dir} />
        {n.loop && (
          <span
            className="deps-mark"
            data-tip="It leads back to one on the way here: these wait on each other"
          >
            ↻ loops back
          </span>
        )}
        {n.repeat && (
          <span
            className="deps-mark"
            data-tip="Shown elsewhere in this tree, nearer the center, with what lies beyond it"
          >
            also elsewhere
          </span>
        )}
        {expandable && !open && reach && reach.nodes > 0 && (
          <Link
            component="button"
            type="button"
            className="deps-cut"
            onClick={() => {
              setOpen(true);
              // The link goes once open; focus moves to the node's toggle.
              requestAnimationFrame(() => toggle.current?.focus());
            }}
          >
            {reach.nodes} more,{" "}
            {reach.levels === 1 ? "one level" : `${reach.levels} levels`}
            {reach.decisions > 0 &&
              `, ${plural(reach.decisions, "decision", "decisions")}`}
          </Link>
        )}
      </div>
      {open && kids && kids.length > 0 && (
        <ul className="deps-tree nested" role="group">
          {kids.map((k) => (
            <TreeNode key={k.id} n={k} dir={dir} trail={path} ctx={ctx} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Why a node is in the tree, in small: the items behind the wait. */
function EdgeNote({ edge, dir }: { edge: DepEdge; dir: DepDir }) {
  if (edge.rel === "part-of") {
    return <span className="deps-why">holds it</span>;
  }
  if (edge.rel === "holds") {
    return (
      <span className="deps-why">
        {dir === "up" ? "held in it" : "holds it"}
      </span>
    );
  }
  if (!edge.via.length) {
    return null;
  }
  const [first, ...rest] = edge.via;
  const all = edge.via.map((v) => `${v.from} needs ${v.to}`).join("; ");
  return (
    <span className="deps-why" data-tip={rest.length ? all : undefined}>
      {first!.from} needs {first!.to}
      {rest.length > 0 && `, +${rest.length}`}
    </span>
  );
}

function ReleaseChip({ rel }: { rel?: NodeRelease }) {
  if (!rel) {
    return null;
  }
  return (
    <span
      className={`deps-release${rel.id ? "" : " none"}`}
      data-tip={
        rel.id
          ? `In ${rel.name}: the earliest release that needs it`
          : "No release needs it yet"
      }
    >
      {rel.id && <KindMark kind="release" named={false} />}
      {rel.name}
    </span>
  );
}

const titleOf = (id: string, ctx: NodeContext) =>
  ctx.g.items.get(id)?.title ??
  ctx.g.milestones.get(id)?.title ??
  ctx.s.items.find((it) => it.id === id)?.title ??
  ctx.s.milestones.find((m) => m.id === id)?.title ??
  id;

/** A node's stage, for its fill. */
function nodeStage(id: string, ctx: NodeContext): Stage | undefined {
  const it = ctx.s.items.find((x) => x.id === id);
  if (it) {
    return stageOf(it, ctx.flight);
  }
  const m = ctx.s.milestones.find((x) => x.id === id);
  return m
    ? milestoneStage(
        m,
        milestoneStages(m, ctx.g.items, ctx.s.items, ctx.flight),
      )
    : undefined;
}

/** A node's state in words, and whether it is ready. */
function stateText(id: string, ctx: NodeContext, dir: DepDir): string {
  const it = ctx.s.items.find((x) => x.id === id);
  if (it) {
    if (!isOpen(it)) {
      return it.state === "done" ? "Done" : "Dropped";
    }
    if (isOwnerDecision(it)) {
      return it.open_needs.length
        ? "Your decision, once its needs are done"
        : "Your decision";
    }
    if (it.kind === "external") {
      return `Waits outside${it.waiting_on ? `: ${it.waiting_on}` : ""}`;
    }
    const st = stageOf(it, ctx.flight);
    if (st === "Ready") {
      return "Ready to start";
    }
    if (st === "Waiting" && dir === "down") {
      return `Blocked by ${plural(it.open_needs.length, "need", "needs")}`;
    }
    return st ? STAGE_NAMES[st] : it.state;
  }
  const m = ctx.s.milestones.find((x) => x.id === id);
  if (!m) {
    return "Not on this branch";
  }
  if (m.state === "done") {
    return "Done";
  }
  const counts = milestoneStages(m, ctx.g.items, ctx.s.items, ctx.flight);
  const st = milestoneStage(m, counts);
  const lead =
    st === "Ready"
      ? `${plural(counts.Ready, "item", "items")} ready`
      : st === "In flight"
        ? `${plural(counts["In flight"], "item", "items")} in progress`
        : STAGE_NAMES[st];
  return `${lead}, ${m.progress.done} of ${m.progress.total} done`;
}

/**
 * The whole structure, for reshaping work: every milestone at its
 * earliest possible start, in waves and project lanes, and the project
 * matrix.
 */
function WholeStructure({
  s,
  flight,
  proposals,
  onCenter,
  matrix,
}: {
  s: WorkSnapshot;
  flight: InFlight;
  proposals: boolean;
  onCenter: (id: string) => void;
  matrix: ReactNode;
}) {
  const w = useMemo(
    () => wavesOf(s, flight, proposals),
    [s, flight, proposals],
  );
  const msOf = useMemo(() => new Map(s.milestones.map((m) => [m.id, m])), [s]);
  const projectTitle = (id: string) =>
    id ? (s.projects.find((p) => p.id === id)?.title ?? id) : "No project";
  const g = useMemo(() => dependencyGraphOf(s, proposals), [s, proposals]);
  return (
    <div className="deps-whole">
      <section aria-labelledby="deps-waves-h">
        <Typography
          variant="body-md"
          render={<h3 />}
          id="deps-waves-h"
          className="deps-whole-head"
        >
          Earliest possible start, in waves
        </Typography>
        <Typography
          variant="body-sm"
          color="textSecondary"
          render={<p />}
          className="deps-whole-note"
        >
          A milestone's wave is one more than the latest wave of the milestones
          it waits on; wave 1 waits on none. It's the earliest it could start
          with unlimited hands, not when it will: the Plan view answers that.
          Choose a milestone to center on it.
        </Typography>
        {w.count === 0 ? (
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            No open milestones.
          </Typography>
        ) : (
          <div
            className="deps-waves-scroll"
            role="region"
            aria-label="Milestones by project and wave"
            tabIndex={0}
          >
            <table className="deps-waves">
              <thead>
                <tr>
                  <th scope="col" className="deps-lane-h">
                    Project
                  </th>
                  {w.perWave.map((n, k) => (
                    <th scope="col" key={k}>
                      Wave {k + 1}
                      <span className="deps-wave-n">
                        {plural(n, "milestone", "milestones")}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {w.lanes.map((lane) => (
                  <tr key={lane.id || "none"}>
                    <th scope="row" className="deps-lane-h">
                      <InlineText text={projectTitle(lane.id)} />
                    </th>
                    {lane.waves.map((ids, k) => (
                      <td key={k}>
                        {ids.length > 0 && (
                          <ul className="deps-chips">
                            {ids.map((id) => {
                              const m = msOf.get(id);
                              const loop = w.loopOf.get(id);
                              const blocked = (g.up.get(id) ?? []).length;
                              return (
                                <li key={id}>
                                  <button
                                    type="button"
                                    className={`deps-chip${m?.state === "proposed" ? " proposed" : ""}`}
                                    onClick={() => onCenter(id)}
                                    data-tip={`${m?.title ?? id}${loop ? ` · waits on ${loop.filter((x) => x !== id).join(", ")} and back` : ""}${blocked ? ` · waits on ${blocked}` : ""}`}
                                    aria-label={`${id} ${m?.title ?? ""}, wave ${k + 1}${loop ? ", in a loop" : ""}. Center on it.`}
                                  >
                                    <KindId id={id} />
                                    <span className="deps-chip-title">
                                      <InlineText text={m?.title ?? id} />
                                    </span>
                                    {loop && (
                                      <span
                                        className="deps-chip-loop"
                                        aria-hidden="true"
                                      >
                                        ↻
                                      </span>
                                    )}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section aria-labelledby="deps-matrix-h">
        <Typography
          variant="body-md"
          render={<h3 />}
          id="deps-matrix-h"
          className="deps-whole-head"
        >
          Project matrix
        </Typography>
        {matrix}
      </section>
    </div>
  );
}
