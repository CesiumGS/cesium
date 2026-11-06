// The walk's nodes on the globe (examples/frames-explorer/walkPath.ts) and
// the tree's lookups (treeState.ts): from the reference up to the common
// ancestor and down to the frame, the ancestor once (Review Focus 5).
import { describe, expect, it } from "vitest";
import type { TreeNode } from "../examples/frames-explorer/tree.ts";
import { findNode, nodeIds } from "../examples/frames-explorer/treeState.ts";
import { walkNodes } from "../examples/frames-explorer/walkPath.ts";

const node = (id: string, children: TreeNode[] = []): TreeNode => ({
  id,
  label: id,
  edge: { kind: "root", detail: "", accuracy: { note: "" } },
  children,
});

// ICRF ─┬─ EARTH_ICRF ─ GCRF ─ ITRF
//       └─ MOON_ICRF ─ MOON_ME ─ Lunar site
const TREE = node("ICRF", [
  node("EARTH_ICRF", [node("GCRF", [node("ITRF")])]),
  node("MOON_ICRF", [node("MOON_ME", [node("Lunar site")])]),
]);
const ids = (ns: TreeNode[]) => ns.map((n) => n.id);

describe("walkNodes", () => {
  it("meets at ICRF between the Earth and the Moon", () => {
    expect(ids(walkNodes(TREE, "ITRF", "Lunar site"))).toEqual([
      "ITRF",
      "GCRF",
      "EARTH_ICRF",
      "ICRF",
      "MOON_ICRF",
      "MOON_ME",
      "Lunar site",
    ]);
  });

  it("goes straight up when the frame is an ancestor", () => {
    expect(ids(walkNodes(TREE, "ITRF", "GCRF"))).toEqual(["ITRF", "GCRF"]);
  });

  it("is the frame alone against itself", () => {
    expect(ids(walkNodes(TREE, "GCRF", "GCRF"))).toEqual(["GCRF"]);
  });

  it("throws for a frame not in the tree", () => {
    expect(() => walkNodes(TREE, "ITRF", "Mars")).toThrow();
  });
});

describe("the tree's lookups", () => {
  it("finds a node anywhere", () => {
    expect(findNode(TREE, "MOON_ME")?.id).toBe("MOON_ME");
    expect(findNode(TREE, "Mars")).toBeUndefined();
  });

  it("lists every id, and none with no tree", () => {
    expect(nodeIds(TREE).size).toBe(7);
    expect(nodeIds(undefined).size).toBe(0);
  });
});
