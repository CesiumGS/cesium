// Parity (CS-50): today's IR tests (`transformIr.test.ts`: parse, evaluate,
// autodiff, intervals) run unchanged with today's passes on Cesium IR,
// through the adapter (`src/ir/fromTodayIr.ts`). CS-53 removes this file
// with the adapter.
import { afterAll, expect, vi } from "vitest";
import { calls } from "./irParityShims.ts";

vi.mock("../src/transform/ad.ts", async () =>
  (await import("./irParityShims.ts")).adShim(),
);
vi.mock("../src/transform/evaluate.ts", async () =>
  (await import("./irParityShims.ts")).evaluateShim(),
);
vi.mock("../src/transform/interval.ts", async () =>
  (await import("./irParityShims.ts")).intervalShim(),
);

await import("./transformIr.test.ts");

afterAll(() => {
  // The tests reached Cesium IR's passes.
  for (const pass of [
    "evaluate",
    "jacobian",
    "hessian",
    "parameterDerivatives",
    "evaluateInterval",
  ]) {
    expect(calls[pass], pass).toBeGreaterThan(0);
  }
});
