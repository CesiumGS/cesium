// What the docked diagram keeps in view (examples/frames-explorer/panel/
// diagramFocus.ts, fix 1, item 5): the scenario's own frames, never a
// Verification result's, and its chips fold again on a scenario switch.
import { describe, expect, it } from "vitest";
import {
  keepSet,
  unfoldedFor,
} from "../examples/frames-explorer/panel/diagramFocus.ts";
import { routeSteps } from "../examples/frames-explorer/panel/routeSteps.ts";
import { focusTree } from "../examples/frames-explorer/panel/treeLayout.ts";
import { SCENES } from "../examples/frames-explorer/scenarios/scenes.ts";
import {
  buildScenarioTree,
  type TreeNode,
} from "../examples/frames-explorer/tree.ts";

const edge: TreeNode["edge"] = {
  kind: "constant",
  detail: "",
  accuracy: { note: "not known: test" },
};
const node = (id: string, ...children: TreeNode[]): TreeNode => ({
  id,
  label: id,
  edge,
  children,
});
/** The built-in tree's shape (tree.ts buildTree). */
const BASE = node(
  "ICRF",
  node("HCRS"),
  node("GCRF", node("ITRF")),
  node("EARTH_ICRF", node("EME2000")),
  node("MOON_ICRF", node("MOON_ME", node("MOON_PA"))),
);

describe("the docked diagram's focus", () => {
  it("keeps earth-turns' frames only: no Moon frame, HCRS or EME2000, whatever result Verification has selected", () => {
    const tree = buildScenarioTree(BASE, [
      {
        id: "Sacramento ENU",
        label: "Sacramento ENU",
        parentId: "ITRF",
        edge,
      },
    ]);
    const keep = keepSet(
      tree,
      {
        focus: SCENES["earth-turns"]!.focus,
        path: { up: ["ITRF"], ancestor: "GCRF", down: [] },
      },
      undefined,
    );
    const shown: string[] = [];
    const walk = (n: TreeNode) => {
      shown.push(n.id);
      n.children.forEach(walk);
    };
    walk(focusTree(tree, keep, new Set()).tree);
    expect(shown).toEqual(["ICRF", "GCRF", "ITRF", "Sacramento ENU"]);
    for (const id of shown) {
      expect(id).not.toMatch(/^MOON_|^HCRS$|^EME2000$/);
    }
  });

  it("keeps the diagram's own selection", () => {
    const keep = keepSet(BASE, { focus: [] }, { kind: "node", id: "MOON_PA" });
    expect(keep.has("MOON_PA")).toBe(true);
  });

  it("folds unfolded chips again when the scenario changes", () => {
    const state = { key: "one-path", ids: new Set(["ICRF"]) };
    expect(unfoldedFor(state, "one-path")).toBe(state);
    expect(unfoldedFor(state, "earth-turns")).toEqual({
      key: "earth-turns",
      ids: new Set(),
    });
  });
});

describe("the route spelled out (routeSteps)", () => {
  it("gives the start, each edge of branchPath in order (up named child to parent, down parent to child), and the end", () => {
    const steps = routeSteps(
      BASE,
      {
        up: ["EME2000", "EARTH_ICRF"],
        ancestor: "ICRF",
        down: ["GCRF", "ITRF"],
      },
      { title: "Orion's data, as delivered", does: "in EME2000 (OEM)" },
      { title: "Drawn in ITRF", does: "the path loops" },
    );
    expect(steps.map((s) => s.title)).toEqual([
      "Orion's data, as delivered",
      "EME2000 to EARTH_ICRF",
      "EARTH_ICRF to ICRF",
      "ICRF to GCRF",
      "GCRF to ITRF",
      "Drawn in ITRF",
    ]);
    expect(steps.filter((s) => s.kind === "edge").map((s) => s.edge)).toEqual([
      "EME2000",
      "EARTH_ICRF",
      "GCRF",
      "ITRF",
    ]);
    expect(steps[4]!.does).toMatch(/Earth's rotation/);
    for (const s of steps.filter((x) => x.kind === "edge")) {
      expect(s.accuracy?.text.length, s.title).toBeGreaterThan(0);
    }
  });
});
