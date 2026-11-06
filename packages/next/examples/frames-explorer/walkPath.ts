// The selected frame's path on the globe (DESIGN.md "A selection"): the
// walk's origins, from the reference (the shared "Against", S-I5) through
// the common ancestor to the frame, joined by a dotted 1 px line, revealed
// one edge at a time with the walk's 90 ms stagger (at once under reduced
// motion), and redrawn as the clock moves the origins.
import { frameTransform } from "../../src/frames/Frame.ts";
import { familyRgba } from "./globe.ts";
import { overlayMesh } from "./overlays.ts";
import type { PageCore } from "./page.ts";
import type { Family } from "./panel/families.ts";
import { sig } from "./panel/format.ts";
import type { LabelBoard } from "./triadLayer.ts";
import { pathToRoot, type TreeNode } from "./tree.ts";

/** An origin farther than this from the geocentre is off the scene (the barycentre, the Sun), m. */
const FAR_ORIGIN = 1e10;
/** The walk's stub toward an off-scene origin, m (past the Moon). */
const WALK_STUB = 5e8;
const AU = 1.495978707e11;

/**
 * The walk's nodes from `against` up to the common ancestor and down to
 * `id`, the ancestor once. Throws when either isn't in the tree.
 */
export function walkNodes(
  tree: TreeNode,
  against: string,
  id: string,
): TreeNode[] {
  const up = pathToRoot(tree, against);
  const down = pathToRoot(tree, id);
  const common = up.findIndex((n) => down.some((d) => d.id === n.id));
  const at = down.findIndex((d) => d.id === up[common]!.id);
  return [...up.slice(0, common + 1), ...down.slice(0, at).reverse()];
}

export interface WalkPath {
  /** Starts the walk to frame `id`, or clears it. */
  start(id: string | undefined): void;
  /** Redraws it where the clock has moved its origins. */
  draw(): void;
  /** A walk is shown. */
  active(): boolean;
  dispose(): void;
}

export function createWalkPath(deps: {
  core: Pick<PageCore, "frames" | "instantNow" | "globe" | "view" | "disposed">;
  labels: LabelBoard;
  tree(): TreeNode | undefined;
  familyOf(id: string): Family;
  /** The triads and labels again (the walk's far label among them). */
  refreshTriads(): void;
  /** Placed nodes with no frame on the main thread: Orion's, the engineering frame's. */
  placedOrigin(id: string): ArrayLike<number> | undefined;
}): WalkPath {
  const { frames: framesNow, instantNow, globe, view, disposed } = deps.core;
  let walk: { id: string; shown: number; timer: number } | undefined;

  /**
   * The walk's origins on the globe, coincident ones merged. An origin far
   * off the scene (the barycentre, the Sun) is drawn as a stub toward it
   * from the first near origin, with a label naming it and its distance.
   */
  function walkOrigins(id: string): {
    points: Float64Array[];
    far?: { at: Float64Array; text: string };
  } {
    const tree = deps.tree();
    const frames = framesNow();
    const instant = instantNow();
    if (!tree || !frames || !instant) {
      return { points: [] };
    }
    let path: TreeNode[];
    try {
      path = walkNodes(tree, view.get().against, id);
    } catch {
      return { points: [] };
    }
    const out: Float64Array[] = [];
    let far: { id: string; p: ArrayLike<number> } | undefined;
    for (const n of path) {
      let o: ArrayLike<number> | undefined;
      if (n.frame) {
        try {
          const m = frameTransform(n.frame, frames.itrf, instant);
          o = [m[12]!, m[13]!, m[14]!];
        } catch {
          continue;
        }
      } else {
        o = deps.placedOrigin(n.id);
      }
      if (o === undefined) {
        continue;
      }
      if (Math.hypot(o[0]!, o[1]!, o[2]!) > FAR_ORIGIN) {
        // The barycentre or the Sun: off the scene; pointed at, not drawn to.
        far ??= { id: n.id, p: o };
        continue;
      }
      const prev = out.at(-1);
      if (
        prev === undefined ||
        Math.hypot(o[0]! - prev[0]!, o[1]! - prev[1]!, o[2]! - prev[2]!) > 1
      ) {
        out.push(Float64Array.from(o));
      }
    }
    const first = out[0];
    if (!far || !first) {
      return { points: out };
    }
    const d = [0, 1, 2].map((i) => far!.p[i]! - first[i]!);
    const len = Math.hypot(d[0]!, d[1]!, d[2]!);
    const stub = Float64Array.from(
      [0, 1, 2].map((i) => first[i]! + (d[i]! / len) * WALK_STUB),
    );
    return {
      points: [stub, ...out],
      far: {
        at: stub,
        text: `→ ${far.id} origin, ${sig(len / AU, 2)} au`,
      },
    };
  }

  function draw(): void {
    if (!walk) {
      globe.removeOverlay("walk");
      deps.labels.delete("walk");
      deps.refreshTriads();
      return;
    }
    const { points: origins, far } = walkOrigins(walk.id);
    deps.labels.set(
      "walk",
      far
        ? [{ id: "label:walk-far", text: far.text, at: far.at, priority: 2 }]
        : [],
    );
    const points: number[] = [];
    const colors: number[] = [];
    const color = familyRgba(deps.familyOf(walk.id));
    for (let k = 0; k + 1 < origins.length && k < walk.shown; k++) {
      const a = origins[k]!;
      const b = origins[k + 1]!;
      // 40 dots per edge: world-space segments, a dot and a gap each.
      const dots = 40;
      for (let d = 0; d < dots; d++) {
        const f0 = d / dots;
        const f1 = (d + 0.5) / dots;
        for (const f of [f0, f1]) {
          points.push(
            a[0]! + (b[0]! - a[0]!) * f,
            a[1]! + (b[1]! - a[1]!) * f,
            a[2]! + (b[2]! - a[2]!) * f,
          );
          colors.push(...color);
        }
      }
    }
    deps.refreshTriads();
    if (points.length === 0) {
      globe.removeOverlay("walk");
      return;
    }
    globe.setOverlay("walk", [
      {
        // Dots up to 1e7 m long (an Earth–Moon edge): its own path's chunks.
        chunks: overlayMesh(
          {
            positions: Float64Array.from(points),
            colors: Uint8Array.from(colors),
          },
          { extent: 1e7 },
        ),
      },
    ]);
  }

  function start(id: string | undefined): void {
    if (walk) {
      clearTimeout(walk.timer);
    }
    walk = undefined;
    if (id === undefined) {
      draw();
      return;
    }
    const edges = Math.max(0, walkOrigins(id).points.length - 1);
    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    walk = { id, shown: reduced ? edges : 1, timer: 0 };
    const step = () => {
      if (!walk || walk.id !== id || disposed()) {
        return;
      }
      draw();
      if (walk.shown < edges) {
        walk.shown++;
        walk.timer = window.setTimeout(step, 90);
      }
    };
    step();
  }

  return {
    start,
    draw,
    active: () => walk !== undefined,
    dispose: () => {
      if (walk) {
        clearTimeout(walk.timer);
      }
    },
  };
}
