// Parity (CS-50): today's tests of the queries, the accuracy model and the
// Taylor bounds (`transformQueries.test.ts`) run unchanged with today's
// passes on Cesium IR, through the adapter (`src/ir/fromTodayIr.ts`): the
// derivatives, evaluator and intervals, the kinks, and each curvilinear
// edge's Taylor step. CS-53 removes this file with the adapter.
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
vi.mock("../src/transform/stepIr.ts", async () =>
  (await import("./irParityShims.ts")).stepIrShim(),
);
vi.mock("../src/transform/taylorBounds.ts", async () =>
  (await import("./irParityShims.ts")).taylorShim(),
);

await import("./transformQueries.test.ts");

afterAll(() => {
  // The Taylor step builds its own J, H and parameter programs on Cesium IR.
  for (const pass of ["jacobianProgram", "evaluate", "kinks", "taylorBounds"]) {
    expect(calls[pass], pass).toBeGreaterThan(0);
  }
});
