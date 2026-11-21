// Cesium IR joins the transform code on demand (CS-794). A default view has no
// curvilinear map, so it needs none of `src/ir` or the transform passes built on
// it: this module is the seam. It imports nothing at run time but the dynamic
// `import()` below, so whatever imports it (the queries, the world's routes, the
// function maps) starts without Cesium IR. `test/lazyIr.test.ts` fails, naming the
// line, when a static import brings it back.
//
// `irPasses.ts` holds what needs Cesium IR and installs it here when it loads
// (`installIrPasses`), so a caller that already imports it (the aggregate
// `transform/index.ts`, a test) has it at once. A caller that can't wait asks
// `irPasses()`: the passes, or undefined while they aren't loaded; and
// `requestIr()` starts the load. Anything that can wait awaits `loadIr()`.
import type { Params, CurvilinearSpec } from "./graph.ts";
import type { IrPasses } from "./irPasses.ts";

export type { IrPasses } from "./irPasses.ts";

let installed: IrPasses | undefined;
let loading: Promise<IrPasses> | undefined;

/** The passes built on Cesium IR, or undefined until they have loaded. */
export function irPasses(): IrPasses | undefined {
  return installed;
}

/** Called by `irPasses.ts` when it is evaluated. */
export function installIrPasses(passes: IrPasses): void {
  installed = passes;
}

/**
 * Loads Cesium IR and the passes built on it (once; later calls share the
 * answer). A failed load is forgotten, so a later call tries again.
 */
export function loadIr(): Promise<IrPasses> {
  if (installed) {
    return Promise.resolve(installed);
  }
  loading ??= import("./irPasses.ts").then(
    () => {
      if (!installed) {
        throw new Error("Cesium IR loaded but did not install its passes");
      }
      return installed;
    },
    (error: unknown) => {
      loading = undefined;
      throw error;
    },
  );
  return loading;
}

/**
 * Starts the load when it hasn't been, and says nothing of how it went (a
 * caller that needs to know awaits `loadIr()`). For a synchronous caller that
 * has a fallback for now.
 */
export function requestIr(): void {
  if (!installed) {
    loadIr().catch(() => undefined);
  }
}

/**
 * J of the spec's IR at `p`, column-major, or undefined: the spec has no IR, or
 * Cesium IR isn't loaded yet (this asks for it, so a later call has it).
 */
export function adJacobian(
  spec: CurvilinearSpec,
  p: ArrayLike<number>,
  params: Params,
  out: Float64Array,
): Float64Array | undefined {
  if (!installed) {
    if (spec.source !== undefined) {
      requestIr();
    }
    return undefined;
  }
  return installed.adJacobian(spec, p, params, out);
}
