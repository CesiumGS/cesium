// The adapter between today's transform IR and Cesium IR (CS-53, step 2),
// round trip over every built-in and every sample: today's program, to
// Cesium IR and back, emits the same WGSL byte for byte, reads the same
// parameters in the same order, and evaluates to the same bits. CS-53
// removes this file with the adapter.
import { describe, expect, it } from "vitest";
import * as georeference from "../src/georeference/index.ts";
import { evaluate as cirEvaluate } from "../src/ir/evaluate.ts";
import { fromTodayIr, toTodayIr } from "../src/ir/fromTodayIr.ts";
import { evaluate } from "../src/transform/evaluate.ts";
import type { IrProgram } from "../src/transform/ir.ts";
import { parseTransform } from "../src/transform/parse.ts";
import { toWgsl } from "../src/transform/wgsl.ts";
import * as transforms from "../src/transforms/index.ts";
import * as samples from "./transformIrSamples.ts";

const WGS84 = [6378137, 6378137, 6356752.314245179] as const;

const sources: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(samples).map(([name, fn]) => [`sample ${name}`, String(fn)]),
  ),
  ...Object.fromEntries(
    Object.entries(transforms).flatMap(([name, d]) =>
      d && typeof d === "object" && "source" in d
        ? [[name, (d as { source: string }).source]]
        : [],
    ),
  ),
  lattice: transforms.latticeDescriptor([2, 1, 3]).source,
  corridor: transforms.corridorUnrollDescriptor({
    polyline: [
      [0, 0],
      [100, 10],
      [180, 40],
    ],
  }).source,
};
for (const name of [
  "verticalExaggerationDescriptor",
  "heightOffsetDescriptor",
  "transverseMercatorDescriptor",
  "transverseMercatorToGeographicDescriptor",
  "lambertConformalConicDescriptor",
  "lambertConformalConicToGeographicDescriptor",
  "webMercatorDescriptor",
  "webMercatorToGeographicDescriptor",
  "geographicToGeocentricDescriptor",
  "geocentricToGeographicDescriptor",
] as const) {
  sources[name] = georeference[name](WGS84).source;
}

/**
 * Samples whose program reads a 0/1 number as a condition (an early return's
 * flag, a `select` of numbers): the adapter can't tell it's a flag, so it
 * writes `x != 0`, as `not(eq(x, 0))`, and the round trip has those two
 * nodes more. The front end types the flag as a bool and has neither.
 */
const NUMBER_CONDITIONS = new Set(["sample flatten"]);

describe("the adapter, round trip", () => {
  for (const [name, source] of Object.entries(sources)) {
    it(`${name}: today's program to Cesium IR and back emits the same WGSL and the same values`, () => {
      const today = parseTransform(source);
      const cir = fromTodayIr(today);
      const back = toTodayIr(cir) as IrProgram;
      expect(back.params).toEqual(today.params);
      if (NUMBER_CONDITIONS.has(name)) {
        expect(back.nodes).toHaveLength(today.nodes.length + 2);
      } else {
        expect(back.nodes).toHaveLength(today.nodes.length);
        expect(toWgsl(back)).toBe(toWgsl(today));
      }
      const params = Object.fromEntries(
        today.params.map((p, i) => [p, 0.25 + 0.5 * Math.sin(i + 1)]),
      );
      for (const p of [
        [0.3, -0.2, 0.7],
        [1.5, 2.5, -0.5],
      ]) {
        const want = evaluate(today, p, params);
        expect(evaluate(back, p, params)).toEqual(want);
        const got = cirEvaluate(cir, { p, ...params });
        want.forEach((v, i) => expect(Object.is(got[`o${i}`], v)).toBe(true));
      }
    });
  }
});
