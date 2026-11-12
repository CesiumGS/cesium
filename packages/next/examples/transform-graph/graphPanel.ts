import { isSmoothFrame, isSwitchFrame, type Frame } from "@cesium/next/frames";
import { el } from "./ui.ts";

/** What sits at a node of the graph: content, or the camera. */
export interface Placement {
  readonly label: string;
  readonly frame: Frame;
  readonly kind: "content" | "camera";
}

/** What the panel draws: the nodes placements sit at, with their ancestors up to the root. */
export interface GraphSpec {
  readonly placements: readonly Placement[];
  /** Words for a node's edge, read again on `refresh()` (a slider's value); the smooth edge's own description when it returns nothing. */
  readonly detail?: (frame: Frame) => string | undefined;
}

export type NodeKind = "root" | "affine" | "smooth" | "switch";

export const kindOf = (frame: Frame): NodeKind =>
  frame.parent === undefined
    ? "root"
    : isSmoothFrame(frame)
      ? "smooth"
      : isSwitchFrame(frame)
        ? "switch"
        : "affine";

/** Frames from `frame` up to the root, `frame` first. */
const chain = (frame: Frame): Frame[] => {
  const out: Frame[] = [];
  for (let f: Frame | undefined = frame; f; f = f.parent) {
    out.push(f);
  }
  return out;
};

/** What a route between two nodes crosses: its edges in order, and how each is crossed. */
export interface RouteSummary {
  /** Edges from the content up to the common ancestor, then down to the camera. */
  readonly steps: ReadonlyArray<{
    readonly frame: Frame;
    readonly kind: NodeKind;
    readonly down: boolean;
  }>;
  /** The nodes the route passes through, content first. */
  readonly nodes: readonly Frame[];
  /** The common ancestor, where the route turns. */
  readonly top: Frame;
}

/** The route from `content` to `camera` through their lowest common ancestor, or undefined across trees. */
export function routeBetweenFrames(
  content: Frame,
  camera: Frame,
): RouteSummary | undefined {
  const up = chain(content);
  const down = chain(camera);
  const top = up.find((f) => down.includes(f));
  if (!top) {
    return undefined;
  }
  const upPart = up.slice(0, up.indexOf(top));
  const downPart = down.slice(0, down.indexOf(top)).reverse();
  return {
    steps: [
      ...upPart.map((frame) => ({ frame, kind: kindOf(frame), down: false })),
      ...downPart.map((frame) => ({ frame, kind: kindOf(frame), down: true })),
    ],
    nodes: [...upPart, top, ...downPart],
    top,
  };
}

/** The graph panel: the frame tree with node kinds and placements, and the route of the last pick highlighted. */
export interface GraphPanel {
  readonly root: HTMLElement;
  set(spec: GraphSpec | undefined): void;
  /** Highlights the route from `content` to the camera; none clears it. */
  route(content: Frame | undefined, label?: string): void;
  /** Reads the nodes' words again. */
  refresh(): void;
}

export function createGraphPanel(): GraphPanel {
  const root = el("div", { className: "tgx-graph" });
  const routeLine = el("p", { className: "tgx-route", role: "status" });
  const tree = el("ol", { className: "tgx-tree" });
  root.append(routeLine, tree);
  let spec: GraphSpec | undefined;
  const items = new Map<Frame, HTMLElement>();
  const details = new Map<Frame, HTMLElement>();
  let lastContent: Frame | undefined;
  let lastLabel: string | undefined;

  const cameraFrame = () =>
    spec?.placements.find((p) => p.kind === "camera")?.frame;

  function build() {
    tree.replaceChildren();
    items.clear();
    details.clear();
    if (!spec) {
      return;
    }
    const shown = new Set<Frame>();
    for (const p of spec.placements) {
      for (const f of chain(p.frame)) {
        shown.add(f);
      }
    }
    const placed = new Set(spec.placements.map((p) => p.frame));
    const children = new Map<Frame, Frame[]>();
    let top: Frame | undefined;
    for (const f of shown) {
      if (f.parent && shown.has(f.parent)) {
        const list = children.get(f.parent) ?? [];
        list.push(f);
        children.set(f.parent, list);
      } else {
        top = f;
      }
    }
    // A node folds into its child when it is a plain affine edge with one child and nothing placed at it.
    const folds = (f: Frame) =>
      kindOf(f) === "affine" &&
      !placed.has(f) &&
      (children.get(f)?.length ?? 0) === 1;
    const emit = (f: Frame, into: HTMLElement, folded: number): void => {
      if (folds(f)) {
        emit(children.get(f)![0]!, into, folded + 1);
        return;
      }
      const kind = kindOf(f);
      const own = kind === "affine" ? 1 : 0;
      const li = el("li", { className: `tgx-node tgx-${kind}` });
      const detail = el("span", { className: "tgx-detail" });
      details.set(f, detail);
      const edges = folded + own;
      li.append(
        el(
          "div",
          { className: "tgx-row" },
          el("span", { className: `tgx-kind tgx-kind-${kind}` }, kind),
          el("b", {}, f.name),
          detail,
        ),
      );
      if (kind === "affine" && edges > 1) {
        li.append(
          el(
            "div",
            { className: "tgx-fold" },
            `${edges} affine edges collapsed into one 4×4`,
          ),
        );
      }
      const here = spec!.placements.filter((p) => p.frame === f);
      if (here.length > 0) {
        const ul = el("ul", { className: "tgx-here" });
        for (const p of here) {
          ul.append(
            el(
              "li",
              { className: `tgx-${p.kind}` },
              p.kind === "camera" ? "▶ " : "◆ ",
              p.label,
            ),
          );
        }
        li.append(ul);
      }
      const kids = children.get(f) ?? [];
      if (kids.length > 0) {
        const ol = el("ol", { className: "tgx-tree" });
        for (const k of kids) {
          emit(k, ol, 0);
        }
        li.append(ol);
      }
      items.set(f, li);
      into.append(li);
    };
    if (top) {
      emit(top, tree, 0);
    }
  }

  function words() {
    for (const [f, node] of details) {
      node.textContent = spec?.detail?.(f) ?? describe(f) ?? "";
    }
  }

  function mark() {
    for (const li of items.values()) {
      li.classList.remove("tgx-on", "tgx-turn");
    }
    const camera = cameraFrame();
    if (!lastContent || !camera) {
      routeLine.textContent =
        "Pick something in the view: its route to the camera is lit here.";
      return;
    }
    const route = routeBetweenFrames(lastContent, camera);
    if (!route) {
      routeLine.textContent = "That content is in another tree.";
      return;
    }
    // A folded node is lit through the node it folds into.
    const lit = new Set<Frame>();
    for (const f of route.nodes) {
      for (let g: Frame | undefined = f; g; g = g.parent) {
        if (items.has(g)) {
          lit.add(g);
          break;
        }
      }
    }
    for (const f of lit) {
      items.get(f)?.classList.add("tgx-on");
    }
    for (let g: Frame | undefined = route.top; g; g = g.parent) {
      const li = items.get(g);
      if (li) {
        li.classList.add("tgx-turn");
        break;
      }
    }
    const smooth = route.steps.filter((s) => s.kind === "smooth");
    const switches = route.steps.filter((s) => s.kind === "switch");
    const affineEdges = route.steps.filter(
      (s) => s.kind === "affine" || s.kind === "root",
    ).length;
    const parts: string[] = [];
    for (const s of smooth) {
      parts.push(
        `${s.frame.name}, ${s.down ? "inverse (down, by its inverse or Newton)" : "forward (up)"}`,
      );
    }
    for (const s of switches) {
      parts.push(`switch ${s.frame.name}, as this view chooses`);
    }
    routeLine.textContent = `${lastLabel ?? "The pick"}: ${
      parts.length > 0 ? `${parts.join("; ")}` : "no smooth step"
    }${
      affineEdges > 0
        ? `${parts.length > 0 ? "; " : ""}${affineEdges} affine ${affineEdges === 1 ? "edge" : "edges"}, collapsed to one matrix`
        : ""
    }.`;
  }

  return {
    root,
    set(next) {
      spec = next;
      build();
      words();
      mark();
    },
    route(content, label) {
      lastContent = content;
      lastLabel = label;
      mark();
    },
    refresh() {
      words();
    },
  };
}

/** The words an edge says of itself. */
function describe(frame: Frame): string | undefined {
  if (isSmoothFrame(frame)) {
    return frame.warp.description;
  }
  if (isSwitchFrame(frame)) {
    const edges = frame.edges();
    const name = (w: { description?: string } | undefined) =>
      w ? (w.description ?? "smooth") : "identity";
    const distinct = new Set<string>([
      ...[...edges.byView.values()].map(name),
      ...(edges.default !== null ? [name(edges.default)] : []),
    ]);
    return `one of: ${[...distinct].join(" | ")}, by view`;
  }
  return undefined;
}
