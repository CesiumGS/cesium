// Frame families (R16, DESIGN.md "Frame families"): one categorical palette,
// used the same way in the tree, the triads, the labels and the legend. The
// colors are CSS custom properties (panel.css, `--fx-family-*`), each with a
// tone for light surfaces and one for dark ones and the globe; the globe's
// geometry takes the `onDark` values here, which match panel.css.
import type { EdgeKind, TreeNode } from "../tree.ts";

export type Family =
  "celestial" | "earth" | "moon" | "engineering" | "trajectory";

export const FAMILIES: readonly Family[] = [
  "celestial",
  "earth",
  "moon",
  "engineering",
  "trajectory",
];

/** Each family's name and what it holds, as the legend and the tree's detail say it. */
export const FAMILY_INFO: Record<
  Family,
  { label: string; holds: string; onDark: string; onLight: string }
> = {
  celestial: {
    label: "Celestial",
    holds:
      "non-rotating frames: ICRF, HCRS, GCRF, EME2000 and the bodies' ICRF frames",
    onDark: "#b298f9",
    onLight: "#6e44bc",
  },
  earth: {
    label: "Earth-fixed",
    holds: "frames that turn with the Earth: ITRF and the sites on it",
    onDark: "#3bcddc",
    onLight: "#02717a",
  },
  moon: {
    label: "Moon-fixed",
    holds: "frames that turn with the Moon: MOON_ME, MOON_PA and lunar sites",
    onDark: "#bfc8d4",
    onLight: "#525f6f",
  },
  engineering: {
    label: "Engineering",
    holds: "projected design frames placed by a recorded PROJ operation",
    onDark: "#f07ec2",
    onLight: "#ae2881",
  },
  trajectory: {
    label: "Trajectory",
    holds: "a vehicle's path from its ephemeris file (Orion's OEM)",
    onDark: "#fc9252",
    onLight: "#ae5517",
  },
};

/** The axis colors of every triad: x red, y green, z blue (R16), on the globe. */
export const AXIS_COLORS = { x: "#fc5855", y: "#5ad664", z: "#5d97f7" };

const CELESTIAL = new Set([
  "ICRF",
  "HCRS",
  "GCRF",
  "EARTH_ICRF",
  "EME2000",
  "MOON_ICRF",
]);

/** A node's family; a local frame takes its parent's. */
export function familyOf(node: TreeNode, parent?: Family): Family {
  if (node.edge.kind === "trajectory") {
    return "trajectory";
  }
  if (node.edge.kind === "proj-operation") {
    return "engineering";
  }
  if (CELESTIAL.has(node.id)) {
    return "celestial";
  }
  if (node.id === "ITRF") {
    return "earth";
  }
  if (node.id === "MOON_ME" || node.id === "MOON_PA") {
    return "moon";
  }
  return parent ?? "earth";
}

/** An edge kind as a word for its chip. */
export const EDGE_LABEL: Record<EdgeKind, string> = {
  root: "root",
  translation: "translation",
  rotation: "rotation",
  "translation+rotation": "translation and rotation",
  "iers-affine": "IERS affine",
  constant: "fixed",
  trajectory: "trajectory",
  "proj-operation": "PROJ operation",
};

/** Every node's family, by id. */
export function familyMap(tree: TreeNode): Map<string, Family> {
  const out = new Map<string, Family>();
  const walk = (n: TreeNode, parent: Family | undefined) => {
    const f = familyOf(n, parent);
    out.set(n.id, f);
    n.children.forEach((c) => walk(c, f));
  };
  walk(tree, undefined);
  return out;
}
