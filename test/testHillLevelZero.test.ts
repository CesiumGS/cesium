// The frames explorer's test hill states a terrain tree's level-zero error
// itself, because the engine's constant is off core's entry. The two must agree.
import { expect, it } from "vitest";
import { LEVEL_ZERO_ERROR as engine } from "../packages/core/src/globe/TerrainSource.ts";
import { LEVEL_ZERO_ERROR as hill } from "../examples/frames-explorer/scenarios/testHill.ts";

it("the test hill's level-zero error is the engine's", () => {
  expect(hill).toBe(engine);
});
