// Today's pass modules (`src/transform/ad.ts`, `evaluate.ts`, `interval.ts`,
// `stepIr.ts`, `taylorBounds.ts`) with their passes on Cesium IR, through the
// adapter (`src/ir/fromTodayIr.ts`). The parity tests mock today's modules
// with these and run today's tests unchanged. CS-53 removes them with the
// adapter.
import { vi } from "vitest";
import * as adapter from "../src/ir/fromTodayIr.ts";
import { kinks, type OutputKinks } from "../src/ir/kinks.ts";
import { mapIr, taylorChain, type TaylorLink } from "../src/ir/taylor.ts";
import type * as TodayAd from "../src/transform/ad.ts";
import type * as TodayEvaluate from "../src/transform/evaluate.ts";
import type * as TodayInterval from "../src/transform/interval.ts";
import type * as TodayStepIr from "../src/transform/stepIr.ts";
import type * as TodayTaylor from "../src/transform/taylorBounds.ts";
import type { IrProgram } from "../src/transform/ir.ts";

/** How often each shim ran: a parity test checks that today's tests reached Cesium IR. */
export const calls: Record<string, number> = {};
const count = (name: string) => {
  calls[name] = (calls[name] ?? 0) + 1;
};

type Fn = (...args: never[]) => unknown;
const counted = <F extends Fn>(name: string, f: F): F =>
  ((...args: Parameters<F>) => {
    count(name);
    return f(...args);
  }) as F;

export async function adShim(): Promise<typeof TodayAd> {
  const actual = await vi.importActual<typeof TodayAd>(
    "../src/transform/ad.ts",
  );
  return {
    ...actual,
    jacobianProgram: counted(
      "jacobianProgram",
      (p: IrProgram) => adapter.jacobianProgram(p) as IrProgram,
    ),
    hessianProgram: counted(
      "hessianProgram",
      (p: IrProgram) => adapter.hessianProgram(p) as IrProgram,
    ),
    parameterProgram: counted(
      "parameterProgram",
      (p: IrProgram, names: readonly string[]) =>
        adapter.parameterProgram(p, names) as IrProgram,
    ),
    jacobian: counted("jacobian", adapter.jacobian),
    hessian: counted("hessian", adapter.hessian),
    parameterDerivatives: counted(
      "parameterDerivatives",
      adapter.parameterDerivatives,
    ),
  };
}

export async function evaluateShim(): Promise<typeof TodayEvaluate> {
  const actual = await vi.importActual<typeof TodayEvaluate>(
    "../src/transform/evaluate.ts",
  );
  return { ...actual, evaluate: counted("evaluate", adapter.evaluate) };
}

export async function intervalShim(): Promise<typeof TodayInterval> {
  const actual = await vi.importActual<typeof TodayInterval>(
    "../src/transform/interval.ts",
  );
  return {
    ...actual,
    evaluateInterval: counted("evaluateInterval", adapter.evaluateInterval),
  };
}

const anyOf = (k: Record<string, OutputKinks>, key: "kinks" | "steps") =>
  Object.values(k).some((o) => o[key].length > 0);

/** stepIr with `kinked` and `discontinuous` from Cesium IR's kinks pass, checked against today's lists. */
export async function stepIrShim(): Promise<typeof TodayStepIr> {
  const actual = await vi.importActual<typeof TodayStepIr>(
    "../src/transform/stepIr.ts",
  );
  return {
    ...actual,
    stepIr(spec) {
      const today = actual.stepIr(spec);
      if (!today) {
        return today;
      }
      count("kinks");
      const k = kinks(adapter.cirOf(today.value));
      const kinked = anyOf(k, "kinks");
      const discontinuous = anyOf(k, "steps");
      if (kinked !== today.kinked || discontinuous !== today.discontinuous) {
        throw new Error(
          `kinks: Cesium IR says kinked ${kinked}, discontinuous ${discontinuous}; today ${today.kinked}, ${today.discontinuous}`,
        );
      }
      return { ...today, kinked, discontinuous };
    },
  };
}

/** taylorBounds: today's route walk, with each edge's Taylor step on Cesium IR (`taylorChain`). */
export async function taylorShim(): Promise<typeof TodayTaylor> {
  const actual = await vi.importActual<typeof TodayTaylor>(
    "../src/transform/taylorBounds.ts",
  );
  const { stepIr } = await import("../src/transform/stepIr.ts");
  const maps = new WeakMap<IrProgram, ReturnType<typeof mapIr>>();
  const mapOf = (value: IrProgram) => {
    let m = maps.get(value);
    if (!m) {
      m = mapIr(adapter.cirOf(value));
      maps.set(value, m);
    }
    return m;
  };
  return {
    ...actual,
    taylorBounds(route, box, options = {}) {
      count("taylorBounds");
      const links: TaylorLink[] = [];
      let refused = false;
      const center = route.walk(box.center, (edge) => {
        if (refused) {
          return;
        }
        if (edge.kind === "affine") {
          links.push({
            kind: "affine",
            jacobian: Float64Array.from(edge.jacobian),
          });
          return;
        }
        const name = edge.node.name;
        const refuse = (reason: string) => {
          links.push({ kind: "refuse", reason });
          refused = true;
        };
        if (edge.down) {
          refuse(
            `"${name}" is undone by the route: a Taylor model needs the function's own derivatives`,
          );
          return;
        }
        const ir = stepIr(edge.spec!);
        if (!ir) {
          refuse(`"${name}" has no restricted-JS source for the IR`);
          return;
        }
        const given = options.params?.(edge.node);
        links.push({
          kind: "map",
          name,
          map: mapOf(ir.value),
          input: Float64Array.from(edge.input),
          params: { ...edge.params! },
          ...(given && { ranges: given }),
        });
      });
      const chain = taylorChain(box, links, {
        ...(options.cells !== undefined && { cells: options.cells }),
      });
      return chain.ok ? { ...chain, center } : chain;
    },
  };
}
