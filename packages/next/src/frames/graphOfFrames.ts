import type { Instant } from "../time/Instant.ts";
import {
  affine,
  TransformGraph,
  type TransformNode,
} from "../transform/graph.ts";
import type { FrameCatalog } from "./catalog.ts";
import type { Frame } from "./Frame.ts";
import { isWarpFrame } from "./warpFrame.ts";

/** A catalogue's reference frames as affine nodes of a transform graph. */
export interface FrameGraph {
  readonly graph: TransformGraph;
  /** The node of `frame`, once it is in the catalogue's tree in use. */
  node(frame: Frame): TransformNode | undefined;
  /**
   * Adds the frames the tree in use has gained, and bumps the node of each
   * frame whose `revision` moved (data arrived, `invalidate()`), so a route's
   * `revision` follows it. Called once on creation.
   */
  sync(): void;
}

/**
 * Represents the catalogue's tree in use in a transform graph: each `Frame`
 * edge is an affine node whose matrix is `frame.toParent` at the route's
 * seconds (as `resolver.instant` reads them). The frames stay the source of
 * truth and `FrameResolver` keeps working; this is a view of them. A warp
 * frame throws: it becomes a smooth node with the warps (a later task).
 */
export function graphOfFrames(
  catalog: FrameCatalog,
  resolver: { instant(seconds: number): Instant },
  graph: TransformGraph = new TransformGraph(),
): FrameGraph {
  const nodes = new Map<Frame, TransformNode>();
  const seen = new Map<Frame, number>();
  const sync = () => {
    for (const { frame } of catalog.treeInUse()) {
      const node = nodes.get(frame);
      if (node) {
        if (seen.get(frame) !== frame.revision) {
          seen.set(frame, frame.revision);
          graph.invalidate(node);
        }
        continue;
      }
      if (isWarpFrame(frame)) {
        throw new Error(
          `graphOfFrames: "${frame.name}" is a warp frame, not an affine edge`,
        );
      }
      const parent = frame.parent && nodes.get(frame.parent);
      nodes.set(
        frame,
        parent
          ? graph.add(
              frame.name,
              parent,
              affine({
                at: (seconds, out) => {
                  frame.toParent(resolver.instant(seconds), out);
                },
              }),
            )
          : graph.root(frame.name),
      );
      seen.set(frame, frame.revision);
    }
  };
  sync();
  return { graph, node: (frame) => nodes.get(frame), sync };
}
