import { Button, LinearProgress, Typography } from "@mui/material";
import { Link as RouterLink } from "@tanstack/react-router";
import { type ReactNode, useMemo } from "react";
import { type DagEdge, layoutDag } from "../dagLayout.ts";
import { InlineText } from "./ItemText.tsx";
import type { WorkSearch } from "../routes.tsx";
import {
  isOpen,
  stateOf,
  type WorkContainer,
  type WorkItem,
  type WorkSnapshot,
} from "../work.ts";

/**
 * The Work board's dependency graphs (views/Work.tsx), the same graphs as
 * `views.mjs mermaid projects` and `mermaid items --project`: without a
 * project chosen, the projects and how they wait on each other; with one,
 * its items and their needs, with items of other projects at the edges.
 * Arrows point from what is needed to what needs it. Nodes are links,
 * laid out by dagLayout.ts over an SVG of the edges; what links to
 * nothing is listed below instead of stretching the graph.
 */

const PROJECT = { w: 248, h: 78, dx: 312, dy: 94 };
const ITEM = { w: 236, h: 78, dx: 300, dy: 92 };

export function WorkGraph({
  s,
  items,
  project,
  initiative,
  selected,
  onProject,
}: {
  s: WorkSnapshot;
  /** The filtered items. */
  items: WorkItem[];
  project?: string;
  initiative?: string;
  selected?: string;
  onProject: (id: string | undefined) => void;
}) {
  return project ? (
    <ItemGraph
      s={s}
      items={items}
      project={project}
      selected={selected}
      onBack={() => onProject(undefined)}
    />
  ) : (
    <ProjectGraph s={s} initiative={initiative} onProject={onProject} />
  );
}

// ------------------------------------------------------------ projects

function ProjectGraph({
  s,
  initiative,
  onProject,
}: {
  s: WorkSnapshot;
  initiative?: string;
  onProject: (id: string) => void;
}) {
  const { linked, alone, edges, layout } = useMemo(() => {
    const projects = s.projects.filter(
      (p) => !initiative || p.initiative === initiative,
    );
    const shown = new Set(projects.map((p) => p.id));
    const edges: Array<DagEdge & { count: number }> = s.project_deps
      .filter((e) => shown.has(e.from) && shown.has(e.to))
      .map((e) => ({ from: e.to, to: e.from, count: e.count }));
    const linked = projects.filter((p) =>
      edges.some((e) => e.from === p.id || e.to === p.id),
    );
    return {
      linked,
      alone: projects.filter((p) => !linked.includes(p)),
      edges,
      layout: layoutDag(
        linked.map((p) => p.id),
        edges,
      ),
    };
  }, [s, initiative]);
  const node = (p: WorkContainer) => (
    <button
      type="button"
      className="graph-node graph-project"
      onClick={() => onProject(p.id)}
      aria-label={`${p.id} ${p.title}: ${p.progress.done} of ${p.progress.total - p.progress.dropped} done, ${p.progress.ready} ready. Show its items.`}
    >
      <span className="graph-node-title">{p.title}</span>
      <Typography variant="caption-md" color="textSecondary">
        {p.id} · {p.progress.done} of {p.progress.total - p.progress.dropped}{" "}
        done · {p.progress.ready} ready
      </Typography>
      <LinearProgress
        variant="determinate"
        value={
          p.progress.total - p.progress.dropped
            ? (100 * p.progress.done) / (p.progress.total - p.progress.dropped)
            : 0
        }
        className="graph-node-bar"
        aria-hidden="true"
      />
    </button>
  );
  return (
    <div className="graph">
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="graph-note"
      >
        Projects that wait on each other's items. An arrow points from the
        project needed to the one waiting, with the number of open needs. Choose
        a project to see its items.
      </Typography>
      {linked.length ? (
        <Canvas
          layout={layout}
          size={PROJECT}
          edges={edges.map((e) => ({ ...e, label: String(e.count) }))}
          nodes={linked.map((p) => ({ id: p.id, el: node(p) }))}
        />
      ) : (
        <Typography variant="body-md" color="textSecondary" render={<p />}>
          No project here waits on another.
        </Typography>
      )}
      {alone.length > 0 && (
        <>
          <Typography
            variant="subtitle-md"
            render={<h2 />}
            className="graph-alone-title"
          >
            Not waiting on other projects
          </Typography>
          <ul className="graph-alone">
            {alone.map((p) => (
              <li key={p.id}>{node(p)}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------ items

function ItemGraph({
  s,
  items,
  project,
  selected,
  onBack,
}: {
  s: WorkSnapshot;
  items: WorkItem[];
  project: string;
  selected?: string;
  onBack: () => void;
}) {
  const p = s.projects.find((x) => x.id === project);
  const { inside, outside, edges, alone, layout } = useMemo(() => {
    const itemOf = new Map(s.items.map((i) => [i.id, i]));
    const inside = items.filter((it) => it.project === project);
    const ids = new Set(inside.map((it) => it.id));
    const outside = new Map<string, WorkItem | string>();
    const edges: DagEdge[] = [];
    for (const it of inside) {
      for (const n of it.needs) {
        edges.push({ from: n, to: it.id });
        if (!ids.has(n)) {
          outside.set(n, itemOf.get(n) ?? n);
        }
      }
      for (const d of it.needed_by) {
        if (!ids.has(d)) {
          edges.push({ from: it.id, to: d });
          outside.set(d, itemOf.get(d) ?? d);
        }
      }
    }
    const touched = new Set(edges.flatMap((e) => [e.from, e.to]));
    const linked = inside.filter((it) => touched.has(it.id));
    return {
      inside: linked,
      outside: [...outside.values()],
      edges,
      alone: inside.filter((it) => !touched.has(it.id)),
      layout: layoutDag(
        [...linked.map((it) => it.id), ...outside.keys()],
        edges,
      ),
    };
  }, [s, items, project]);
  const node = (x: WorkItem | string, foreign: boolean) =>
    typeof x === "string" ? (
      <span className="graph-node graph-item foreign missing">
        <span className="work-id">{x}</span>
        <Typography variant="caption-md" color="textSecondary">
          Not in the tracker on this branch
        </Typography>
      </span>
    ) : (
      <RouterLink
        to="/work"
        search={(prev: WorkSearch) => ({ ...prev, item: x.id })}
        className={`graph-node graph-item ${toneOf(x)}${foreign ? " foreign" : ""}${x.id === selected ? " selected" : ""}`}
        aria-label={`${x.id} ${x.title}: ${describe(x)}${foreign ? `, in ${s.projects.find((q) => q.id === x.project)?.title ?? "another project"}` : ""}`}
      >
        <span className="graph-node-top">
          <span className="work-id">{x.id}</span>
          <Typography variant="caption-md" color="textSecondary">
            {describe(x)}
          </Typography>
        </span>
        <span className="graph-node-title graph-clamp">
          <InlineText text={x.title} />
        </span>
      </RouterLink>
    );
  return (
    <div className="graph">
      <div className="graph-head">
        <Button variant="text" size="small" onClick={onBack}>
          All projects
        </Button>
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          {p ? `${p.id} ${p.title}` : project}: its items and their needs. An
          arrow points from what is needed to what needs it; items of other
          projects have a dashed border.
        </Typography>
      </div>
      {inside.length ? (
        <Canvas
          layout={layout}
          size={ITEM}
          edges={edges}
          highlight={selected}
          nodes={[
            ...inside.map((it) => ({ id: it.id, el: node(it, false) })),
            ...outside.map((o) => ({
              id: typeof o === "string" ? o : o.id,
              el: node(o, true),
            })),
          ]}
        />
      ) : (
        <Typography variant="body-md" color="textSecondary" render={<p />}>
          No item here needs another, or is needed.
        </Typography>
      )}
      {alone.length > 0 && (
        <>
          <Typography
            variant="subtitle-md"
            render={<h2 />}
            className="graph-alone-title"
          >
            Linked to no other item
          </Typography>
          <ul className="graph-alone">
            {alone.map((it) => (
              <li key={it.id}>{node(it, false)}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** A node's state in words (never color alone). */
function describe(it: WorkItem): string {
  if (!isOpen(it) || it.status === "Proposed") {
    return it.status;
  }
  return stateOf(it).text;
}

function toneOf(it: WorkItem): string {
  if (it.status === "Done") {
    return "done";
  }
  if (it.status === "Dropped") {
    return "dropped";
  }
  if (it.kind === "decision") {
    return "decision";
  }
  if (it.kind === "external") {
    return "external";
  }
  if (it.status === "In progress") {
    return "moving";
  }
  return it.ready ? "ready" : "waiting";
}

// ------------------------------------------------------------ the canvas

function Canvas({
  layout,
  size,
  nodes,
  edges,
  highlight,
}: {
  layout: ReturnType<typeof layoutDag>;
  size: { w: number; h: number; dx: number; dy: number };
  nodes: Array<{ id: string; el: ReactNode }>;
  edges: Array<DagEdge & { label?: string }>;
  highlight?: string;
}) {
  const width = (layout.layers - 1) * size.dx + size.w;
  const height = (layout.rows - 1) * size.dy + size.h;
  const at = (id: string) => {
    const p = layout.place.get(id);
    return p ? { x: p.layer * size.dx, y: p.row * size.dy } : undefined;
  };
  return (
    <div className="graph-scroll">
      <div className="graph-canvas" style={{ width, height }}>
        <svg
          width={width}
          height={height}
          className="graph-edges"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="graph-arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 z" className="graph-arrowhead" />
            </marker>
          </defs>
          {edges.map((e) => {
            const a = at(e.from);
            const b = at(e.to);
            if (!a || !b) {
              return null;
            }
            const x1 = a.x + size.w;
            const y1 = a.y + size.h / 2;
            const x2 = b.x - 2;
            const y2 = b.y + size.h / 2;
            const mid = (x1 + x2) / 2;
            const lit =
              highlight && (e.from === highlight || e.to === highlight);
            return (
              <g key={`${e.from}>${e.to}`} className={lit ? "lit" : undefined}>
                <path
                  d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                  className="graph-edge"
                  markerEnd="url(#graph-arrow)"
                />
                {e.label && (
                  <text
                    x={mid}
                    y={(y1 + y2) / 2 - 4}
                    className="graph-edge-label"
                    textAnchor="middle"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {nodes.map((n) => {
          const p = at(n.id);
          return p ? (
            <div
              key={n.id}
              className="graph-slot"
              style={{ left: p.x, top: p.y, width: size.w, height: size.h }}
            >
              {n.el}
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}
