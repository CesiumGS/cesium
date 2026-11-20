// Parity (CS-50): today's descriptor tests (`transformsParity.test.ts`: each
// built-in's TS function against the IR of its source, values, J and H) run
// unchanged with today's passes on Cesium IR,
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

await import("./transformsParity.test.ts");

afterAll(() => {
  // The tests reached Cesium IR's passes.
  for (const pass of ["evaluate", "jacobian", "hessianProgram"]) {
    expect(calls[pass], pass).toBeGreaterThan(0);
  }
});
