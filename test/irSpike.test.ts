// CS-48: the spike's style, twist and MaterialX programs evaluate, in the
// core, to exactly what the spike's own evaluator gives (bit for bit, the
// sign of zero included). The programs are the spike front ends' output; the
// core takes them as they are, since its program structure is the spike's.
import { describe, expect, it } from "vitest";
import { evaluate as spikeEvaluate } from "../spikes/core-ir/cir.ts";
import { styleProgram } from "../spikes/core-ir/fromStyle.ts";
import { transformProgram } from "../spikes/core-ir/fromTransform.ts";
import { materialXProgram } from "../spikes/core-ir/fromMaterialX.ts";
import {
  FEATURES,
  MTLX,
  STYLE,
  STYLE_EDITED,
  TWIST_PARAMS,
  TWIST_POINTS,
  TWIST_SOURCE,
} from "../spikes/core-ir/samples.ts";
import {
  Builder,
  evaluate,
  print,
  type Program,
  type Value,
} from "../packages/next/src/ir/index.ts";

/** Values as bit patterns, so -0 and NaN compare exactly. */
const bits = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    typeof x === "number" && (Object.is(x, -0) || Number.isNaN(x))
      ? String(x)
      : x,
  );

function same(p: Program, inputs: Record<string, Value>): Value[] {
  const ours = evaluate(p, inputs);
  const theirs = spikeEvaluate(p as never, inputs);
  expect(bits(ours)).toBe(bits(theirs));
  return Object.values(ours);
}

describe("the spike's programs in the core", () => {
  it("style: show and color over every feature", () => {
    for (const style of [STYLE, STYLE_EDITED]) {
      const p = styleProgram(style) as Program;
      for (const f of FEATURES) {
        same(p, f);
      }
    }
    // The 1.x rules at the edges: Height 120 is not above 120.
    const p = styleProgram(STYLE) as Program;
    expect(evaluate(p, { Height: 120, Floors: 31 }).show).toBe(true);
    expect(evaluate(p, { Height: 0, Floors: 0 }).show).toBe(false);
  });

  it("twist: the built-in transform over its sample points", () => {
    const p = transformProgram(TWIST_SOURCE) as Program;
    for (const q of TWIST_POINTS) {
      same(p, { p: q, ...TWIST_PARAMS });
    }
  });

  it("MaterialX: the bands graph", () => {
    const p = materialXProgram(MTLX) as Program;
    for (const height of [0, 20, 50, 100, 400]) {
      for (const u of [0, 0.03, 0.5, 0.97]) {
        const inputs: Record<string, Value> = {};
        for (const input of p.inputs) {
          inputs[input.name] =
            input.type === "float2"
              ? [u, 0.25]
              : input.type === "float3"
                ? [u, 0.25, 1]
                : height;
        }
        same(p, inputs);
      }
    }
  });

  it("a rebuilt program lists and evaluates the same", () => {
    const p = transformProgram(TWIST_SOURCE) as Program;
    const b = Builder.from(p);
    const again = b.program(
      Object.fromEntries(p.outputs.map((o) => [o.name, o.id])),
    );
    expect(print(again)).toBe(print(p));
  });
});
