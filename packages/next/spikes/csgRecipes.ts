// The CSG sample's trees as recipes, for measuring an update (`benchCsgUpdate.mjs`
// in a Node worker, `csgUpdate.ts` in the browser). Not the sample's own
// (examples/csg/tree.ts `defaultBracket`), which is being reshaped: the same
// shape, as data, with a parameter to move.
import type { SolidRecipe } from "../src/brep/kernelProtocol.ts";

type Vec3 = [number, number, number];

const box = (
  tag: number,
  size: Vec3,
  translate: Vec3,
  rotate?: Vec3,
): SolidRecipe => ({
  type: "primitive",
  tag,
  primitive: {
    kind: "box",
    origin: size.map((s) => -s / 2) as Vec3,
    size,
  },
  placement: { ...(rotate ? { rotate } : {}), translate },
});

const cylinder = (
  tag: number,
  radius: number,
  height: number,
  translate: Vec3,
  rotate?: Vec3,
): SolidRecipe => ({
  type: "primitive",
  tag,
  primitive: { kind: "cylinder", base: [0, 0, -height / 2], radius, height },
  placement: { ...(rotate ? { rotate } : {}), translate },
});

const cone = (
  tag: number,
  radiusBase: number,
  radiusTop: number,
  height: number,
  translate: Vec3,
): SolidRecipe => ({
  type: "primitive",
  tag,
  primitive: {
    kind: "cone",
    base: [0, 0, -height / 2],
    radiusBase,
    radiusTop,
    height,
  },
  placement: { translate },
});

/** The default bracket: a base plate and an upright with a fillet, two countersunk holes and a hole through the upright. `dx` moves the first hole. */
export function bracket(dx: number): SolidRecipe {
  return {
    type: "boolean",
    operation: "difference",
    operands: [
      {
        type: "boolean",
        operation: "union",
        operands: [
          box(1, [2.4, 1.5, 0.2], [0, -0.05, 0.1]),
          box(2, [2.2, 0.2, 1.2], [0, -0.6, 0.7]),
          {
            type: "boolean",
            operation: "difference",
            operands: [
              box(3, [2, 0.6, 0.6], [0, -0.3, 0.4]),
              cylinder(4, 0.52, 2.8, [0, 0, 0.7], [0, 90, 0]),
            ],
          },
        ],
      },
      cylinder(5, 0.14, 0.5, [-0.8 + dx, 0.4, 0.1]),
      cone(6, 0.1, 0.3, 0.2, [-0.8, 0.4, 0.2]),
      cylinder(7, 0.14, 0.5, [0.8, 0.4, 0.1]),
      cone(8, 0.1, 0.3, 0.2, [0.8, 0.4, 0.2]),
      cylinder(9, 0.2, 0.6, [0, -0.6, 0.95], [90, 0, 0]),
    ],
  };
}

/** A registered STEP part (key `key`) minus a cylinder through it, which `dx` moves along x. */
export function stepMinusCylinder(
  key: number,
  radius: number,
  length: number,
): (dx: number) => SolidRecipe {
  return (dx) => ({
    type: "boolean",
    operation: "difference",
    operands: [
      { type: "step", tag: 1, step: key },
      cylinder(2, radius, length, [dx, 0, 0], [90, 0, 0]),
    ],
  });
}

export interface CsgScene {
  /** The recipe with its parameter at `dx`. */
  recipe(dx: number): SolidRecipe;
  /** The NIST file (in the STEP samples) registered as key 1, if the tree has a STEP leaf. */
  step?: string;
  /** How far the parameter moves from one update to the next, m. */
  drag: number;
}

export const SCENES: Record<string, CsgScene> = {
  bracket: { recipe: bracket, drag: 0.01 },
  ftc06: {
    recipe: stepMinusCylinder(1, 0.02, 0.2),
    step: "nist_ftc_06_asme1_rd.stp",
    drag: 0.002,
  },
  ctc05: {
    recipe: stepMinusCylinder(1, 0.02, 0.2),
    step: "nist_ctc_05_asme1_rd.stp",
    drag: 0.002,
  },
};
