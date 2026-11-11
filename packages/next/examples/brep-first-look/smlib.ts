import type { BrepForm } from "../../src/index.ts";
import { SmlibKernel, type SmlibBoolean } from "../../src/brep/smlib.ts";

/**
 * The CSG spike's shapes (plan §13.33): booleans made live by SMLib in
 * WebAssembly and converted to the engine's render form. Each input's faces
 * are tagged first, so every face of the result says which input it came
 * from. SMLib loads only here, from the dev server's /smlib/ (npm run setup
 * builds it), on the main thread: the CSG sample will run it in a worker.
 */

export interface SmlibShape {
  name: string;
  form: BrepForm;
  scale: number;
  doubleSided: boolean;
  note: string;
  faceSources: readonly string[];
}

export async function smlibSolids(): Promise<{
  shapes: SmlibShape[];
  problem?: string;
}> {
  const loadStart = performance.now();
  let kernel: SmlibKernel;
  try {
    kernel = await SmlibKernel.load();
  } catch (error) {
    return {
      shapes: [],
      problem: `SMLib's column is empty: the module didn't load (${String(error)}). npm run setup builds it, and the dev server serves it at /smlib/.`,
    };
  }
  const loadMs = performance.now() - loadStart;

  const recipes: Array<{
    name: string;
    operation: SmlibBoolean;
    a: [string, () => ReturnType<SmlibKernel["box"]>];
    b: [string, () => ReturnType<SmlibKernel["box"]>];
    scale: number;
  }> = [
    {
      name: "Box minus a cylinder",
      operation: "difference",
      a: ["the box", () => kernel.box([-1, -1, 0], [2, 2, 1])],
      b: ["the cylinder", () => kernel.cylinder([0, 0, -0.5], 0.5, 2)],
      scale: 0.9,
    },
    {
      name: "Box and sphere, union",
      operation: "union",
      a: ["the box", () => kernel.box([-0.8, -0.8, 0], [1.6, 1.6, 1.6])],
      b: ["the sphere", () => kernel.sphere([0.8, 0.8, 1.6], 0.7)],
      scale: 0.8,
    },
    {
      name: "Box and sphere, intersection",
      operation: "intersection",
      a: ["the box", () => kernel.box([-0.8, -0.8, 0], [1.6, 1.6, 1.6])],
      b: ["the sphere", () => kernel.sphere([0, 0, 0.8], 1.05)],
      scale: 1.1,
    },
  ];

  const shapes: SmlibShape[] = [];
  const problems: string[] = [];
  for (const recipe of recipes) {
    try {
      const a = recipe.a[1]();
      const b = recipe.b[1]();
      kernel.tag(a, 1);
      kernel.tag(b, 2);
      let start = performance.now();
      const result = kernel.boolean(recipe.operation, a, b);
      const booleanMs = performance.now() - start;
      start = performance.now();
      let brep;
      try {
        brep = kernel.toForm(result);
      } finally {
        result.delete();
      }
      const convertMs = performance.now() - start;
      const loaded =
        shapes.length === 0
          ? `, after loading the module in ${loadMs.toFixed(0)} ms`
          : "";
      shapes.push({
        name: `${recipe.name} (SMLib)`,
        form: brep.form,
        scale: recipe.scale,
        doubleSided: false,
        note: `Made live by SMLib in WebAssembly: the ${recipe.operation} in ${booleanMs.toFixed(1)} ms, to the render form in ${convertMs.toFixed(1)} ms${loaded}. Every face is a Bézier surface: SMLib's analytic surfaces arrive as their NURBS. A picked face says which input it came from.`,
        faceSources: Array.from(brep.faceTags, (tag) =>
          tag === 1
            ? recipe.a[0]
            : tag === 2
              ? recipe.b[0]
              : "neither input (untagged)",
        ),
      });
    } catch (error) {
      problems.push(`${recipe.name}: ${String(error)}`);
    }
  }
  return {
    shapes,
    problem: problems.length > 0 ? problems.join("; ") : undefined,
  };
}
