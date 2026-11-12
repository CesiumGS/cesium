import {
  measureIn,
  pointIn,
  type AnchorHandle,
  type CorePick,
  type MeasureIn,
  type PointIn,
  type SigmaIn,
  type View,
} from "@cesium/next";
import {
  graphOfFrames,
  pickIn,
  type Frame,
  type FrameCatalog,
  type FrameGraph,
  type PickedIn,
  type PickInOptions,
  type PickTarget,
} from "@cesium/next/frames";

/** A point of a frame's own coordinates, m. */
export interface FramePoint {
  readonly frame: Frame;
  readonly position: ArrayLike<number>;
  readonly sigma?: SigmaIn;
}

/**
 * Questions asked of the graph: a pick, or a point of any node, carried to
 * another node in float64 through the route between them, and distances in a
 * named node. The frames' own graph (`graphOfFrames`) is the one asked; it
 * holds the application's nodes, smooth ones included.
 */
export interface Queries {
  readonly graph: FrameGraph;
  /** `pick` in "true" (its content's node), "drawn" (the view's render space) or a frame. */
  pickIn(pick: CorePick, target: PickTarget): PickedIn;
  /** A point of `from`'s coordinates in `to`, as `view` draws its route (a switch's choice, a view's parameter values). */
  pointIn(point: FramePoint, to: Frame, view?: View, seconds?: number): PointIn;
  /** Distances of the points, each carried to `node` first. */
  measure(
    points: readonly FramePoint[],
    node: Frame,
    view?: View,
    seconds?: number,
  ): MeasureIn;
}

export function createQueries(
  catalog: FrameCatalog,
  resolver: {
    instant: Parameters<typeof graphOfFrames>[1]["instant"];
    binding?(anchor: AnchorHandle): unknown;
  },
): Queries {
  const graph = graphOfFrames(catalog, resolver);
  const nodeOf = (frame: Frame) => {
    graph.sync();
    const node = graph.node(frame);
    if (!node) {
      throw new Error(
        `"${frame.name}" is not in the frames' graph: bind content to it first`,
      );
    }
    return node;
  };
  const frames: NonNullable<PickInOptions["frames"]> = {
    graph,
    frameOf: (key) =>
      key !== undefined && "slot" in key
        ? (resolver.binding?.(key as AnchorHandle) as Frame | undefined)
        : undefined,
  };
  return {
    graph,
    pickIn(pick, target) {
      graph.sync();
      return pickIn(pick, target, { frames, view: pick.view });
    },
    pointIn(point, to, view, seconds) {
      return pointIn(
        {
          node: nodeOf(point.frame),
          position: point.position,
          ...(point.sigma !== undefined && { sigma: point.sigma }),
        },
        nodeOf(to),
        {
          ...(view !== undefined && { view }),
          ...(seconds !== undefined && { seconds }),
        },
      );
    },
    measure(points, node, view, seconds) {
      return measureIn(
        points.map((p) => ({
          node: nodeOf(p.frame),
          position: p.position,
          ...(p.sigma !== undefined && { sigma: p.sigma }),
        })),
        nodeOf(node),
        {
          ...(view !== undefined && { view }),
          ...(seconds !== undefined && { seconds }),
        },
      );
    },
  };
}
