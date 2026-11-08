// Plan 4b Task 17: the design globe's measurement model, the display strings
// the measure panel shows (the frames explorer's DESIGN.md, "Copy and
// numbers": units always, thousands separators, "±" on accuracy). The
// measurement here is answers.pairs[0], "10,000 ftUS on the last tangent"
// (stations 162,000 to 172,000 on its +0.33% grade), with the values the
// generator recorded for it on 2026-11-07; test/data/designTiles.test.ts
// runs the same model on the library's own measurement of that pair.
import { describe, expect, it } from "vitest";
import {
  measurementModel,
  meters,
  unitSymbol,
} from "../examples/design-globe/measureModel.ts";
import {
  designPoint,
  type EngineeringFrame,
} from "../src/engineering/EngineeringFrame.ts";
import type { SnapResult } from "../src/engineering/snap.ts";
import type { Measurement } from "../src/measure/measure.ts";

const MPU = 1200 / 3937;
const frame = { units: { metersPerUnit: MPU } } as unknown as EngineeringFrame;
const A = Float64Array.from([6_080_000, 2_110_000, 120]);
const B = Float64Array.from([6_089_848.077530122, 2_108_263.518223331, 320]);
const ARC_SECOND = Math.PI / 648_000;

function snap(design: Float64Array, o: Partial<SnapResult> = {}): SnapResult {
  const exact = o.exact ?? true;
  const kind = o.kind ?? "segment";
  const tolerance = o.tolerance ?? 0;
  return {
    snapPoint: new Float64Array(3),
    hitPoint: new Float64Array(3),
    distance: 0,
    kind,
    design: designPoint(frame, design, { how: "snap", tolerance, kind }),
    tolerance,
    exact,
    source: exact ? "server" : "client",
    provisional: false,
    ...o,
  };
}

function measurement(o: { accuracy?: number } = {}): Measurement {
  return {
    distance: 3_048.8484955078147,
    design: {
      unitName: "US survey foot",
      metersPerUnit: MPU,
      distance: 10_001.999800040241,
      horizontalDistance: 10_000.000000000253,
      delta: Float64Array.from([B[0]! - A[0]!, B[1]! - A[1]!, 200]),
      combinedFactor: { a: 0.999928612862724, b: 0.99993, mean: 0.9999286 },
      convergence: {
        a: -(52 * 60 + 39.1) * ARC_SECOND,
        b: -(52 * 60 + 39.1) * ARC_SECOND,
      },
      siteScale: 1,
    },
    alignment: {
      name: "Mainline",
      a: { station: 10_000, offset: 0, elevation: 120 },
      b: { station: 20_000, offset: 0, elevation: 320 },
    },
    accuracy: {
      meters: "accuracy" in o ? o.accuracy : 2.85,
      terms: [],
      warnings: [],
    },
  } as unknown as Measurement;
}

describe("measurementModel", () => {
  it("shows answers.pairs[0]: the horizontal and 3D design distances, labelled, and the true distance to the millimetre", () => {
    const view = measurementModel(snap(A), snap(B), measurement());
    expect(view.horizontalDistance).toBe("10,000.000 ftUS");
    expect(view.designDistance).toBe("10,002.000 ftUS");
    expect(view.trueDistance).toBe("3,048.848 m");
    expect(view.unitName).toBe("US survey foot");
    expect(view.delta).toEqual([
      "9,848.078 ftUS",
      "−1,736.482 ftUS",
      "200.000 ftUS",
    ]);
    expect(view.exact).toBe(true);
  });

  it("shows the combined factor in ppm, the convergence and the accuracy", () => {
    const view = measurementModel(snap(A), snap(B), measurement());
    expect(view.combinedFactorPpm).toBe("−71.4 ppm");
    expect(view.convergence).toBe("−0°52′39.1″");
    expect(view.accuracy).toBe("±2.9 m (1σ)");
    expect(
      measurementModel(snap(A), snap(B), measurement({ accuracy: undefined }))
        .accuracy,
    ).toBe("not stated");
  });

  it("shows each end's station, offset, elevation, snap kind and tolerance", () => {
    const view = measurementModel(
      snap(A, { kind: "point" }),
      snap(B, { exact: false, kind: "surface", tolerance: 0.0123 }),
      measurement(),
    );
    expect(view.a).toEqual({
      station: "100+00.000",
      offset: "0.000 ftUS",
      elevation: "120.000 ftUS",
      snapKind: "point",
      tolerance: "exact",
    });
    expect(view.b.station).toBe("200+00.000");
    expect(view.b.snapKind).toBe("surface");
    expect(view.b.tolerance).toBe("±12 mm");
    expect(view.exact).toBe(false);
  });

  it("names the side of an offset", () => {
    const m = measurement();
    const view = measurementModel(snap(A), snap(B), {
      ...m,
      alignment: {
        name: "Mainline",
        a: { station: 45_000.5, offset: 35, elevation: 300 },
        b: { station: 174_042, offset: -17.25, elevation: 910 },
      },
    } as Measurement);
    expect(view.a.station).toBe("450+00.500");
    expect(view.a.offset).toBe("35.000 ftUS right");
    expect(view.b.station).toBe("1740+42.000");
    expect(view.b.offset).toBe("17.250 ftUS left");
  });

  it("shows true values only when the ends have no design coordinates (Review Focus 4)", () => {
    const raw = (): SnapResult => {
      const { design: ignored, ...rest } = snap(A, {
        exact: false,
        kind: "surface",
        tolerance: 0.2,
      });
      void ignored;
      return rest;
    };
    const { design: d, alignment: al, ...rest } = measurement();
    void d;
    void al;
    const view = measurementModel(raw(), raw(), rest as Measurement);
    expect(view.trueDistance).toBe("3,048.848 m");
    expect(view.designDistance).toBe("no design coordinates");
    expect(view.horizontalDistance).toBe("—");
    expect(view.delta).toEqual(["—", "—", "—"]);
    expect(view.a.station).toBeUndefined();
    expect(view.a.offset).toBeUndefined();
    expect(view.a.elevation).toBeUndefined();
    expect(view.a.tolerance).toBe("±200 mm");
  });

  it("writes lengths in the unit that reads best, km to nm", () => {
    expect(meters(1_500)).toBe("1.5 km");
    expect(meters(2.85)).toBe("2.9 m");
    expect(meters(0.9996)).toBe("1.0 m");
    expect(meters(0.0123)).toBe("12 mm");
    expect(meters(1e-4)).toBe("100 µm");
    expect(meters(-3e-9)).toBe("−3.0 nm");
  });

  it("abbreviates the design units", () => {
    expect(unitSymbol("US survey foot")).toBe("ftUS");
    expect(unitSymbol("foot")).toBe("ft");
    expect(unitSymbol("metre")).toBe("m");
    expect(unitSymbol("meter")).toBe("m");
    expect(unitSymbol("link")).toBe("link");
  });
});
