// The coordinate service (plan 5a, Task 16; spec section 7.9): an
// interface between a design CRS and the body's geodetic coordinates that
// `EngineeringFrame` is built on, so a host can supply its own; and the
// third placement mode, `hosted`, whose design coordinates come only from
// the host's service. No PROJ here: the service is a fake, a plain scale
// and offset. Review Focus 5: a service that throws, rejects, returns NaN,
// or answers slowly and is aborted makes `load` reject naming the
// engineering frame, and nothing is cached.
import { beforeAll, describe, expect, it } from "vitest";
import type {
  CoordinateOperation,
  CoordinateRequest,
  CoordinateService,
  ResolvedCoordinates,
} from "../src/frames/coordinates.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { createFramesPickInterpreter } from "../src/frames/pickInterpreter.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import {
  EngineeringFrame,
  type EngineeringFrameDefinition,
} from "../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../src/engineering/factors.ts";
import { DESIGN_NOT_INVERTED } from "../src/engineering/pick.ts";
import {
  engineeringPlacement,
  placeHosted,
} from "../src/engineering/placement.ts";
import { cartographic } from "../src/math/ellipsoid.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import type { CorePick } from "../src/scene/pick.ts";
import { OffscreenTarget, View } from "../src/scene/View.ts";
import type { AnchorHandle, DrawHandle, World } from "../src/scene/World.ts";
import type { PlacementMode } from "../src/streaming/designPlacement.ts";
import { fakeEngine } from "./fakeGpu.ts";

const RADIANS = Math.PI / 180;
/**
 * Degrees per design unit (about 1.1 m), and the offset of design (0, 0):
 * near 10° E, 40° N, where a longitude's rounding is a fifth of a
 * nanometre. (Near 122° W it is 1.6 nm, which alone would use up the
 * round trip's 1e-9 m; near the equator the ellipsoid's own geodetic
 * height loses some 0.3 µm.)
 */
const SCALE = 1e-5;
const LON0 = 10;
const LAT0 = 40;
/** Design points across the fake's area. */
const DESIGNS = [
  [0, 0, 0],
  [1_234.5, -987.25, 42],
  [-5_000, 5_000, -12.5],
  [5, 6, 7],
];

/** The fake operation: lon, lat = offset + SCALE x (E, N); height = U. */
function plainOperation(
  overrides: Partial<CoordinateOperation> = {},
): CoordinateOperation {
  return {
    forward: (xyz, out = new Float64Array(3)) => {
      out[0] = LON0 + xyz[0]! * SCALE;
      out[1] = LAT0 + xyz[1]! * SCALE;
      out[2] = xyz[2] ?? 0;
      return out;
    },
    inverse: (xyz, out = new Float64Array(3)) => {
      out[0] = (xyz[0]! - LON0) / SCALE;
      out[1] = (xyz[1]! - LAT0) / SCALE;
      out[2] = xyz[2] ?? 0;
      return out;
    },
    accuracy: 0.02,
    description: "a plain scale and offset (the host's own)",
    ...overrides,
  };
}

const FACTORS = {
  pointScale: 0.9999,
  meridionalScale: 0.9999,
  arealScale: 0.9998,
  angularDistortion: 0,
  meridianParallelAngle: Math.PI / 2,
  elevationFactor: 0.99999,
  combinedFactor: 0.9999 * 0.99999,
  convergence: 0.001,
};

function resolved(
  overrides: Partial<ResolvedCoordinates> = {},
): ResolvedCoordinates {
  return {
    operation: plainOperation(),
    units: {
      projected: true,
      horizontalUnitName: "metre",
      metersPerUnit: 1,
      verticalUnitName: "metre",
      metersPerVerticalUnit: 1,
      verticalDirection: "up",
    },
    gridFactors: () => FACTORS,
    credits: ["The host's survey office"],
    ...overrides,
  };
}

/** A service answering `answer()` and recording each request. */
function service(answer: () => Promise<ResolvedCoordinates>) {
  const requests: CoordinateRequest[] = [];
  const coordinates: CoordinateService = {
    resolve: (request) => {
      requests.push(request);
      return answer();
    },
  };
  return { coordinates, requests };
}

const AREA = { west: 9.9, south: 39.9, east: 10.1, north: 40.1 };
const definition: EngineeringFrameDefinition = {
  name: "Host site grid",
  body: EARTH,
  crs: { format: "wkid", authority: "HOST", wkid: 1 },
  areaOfInterest: AREA,
  pipeline: "the host's pinned operation",
};

describe("an EngineeringFrame on a host's coordinate service", () => {
  it("builds with no PROJ loaded, and asks the service for its CRS, body, area and pin", async () => {
    const { coordinates, requests } = service(async () => resolved());
    const frame = await EngineeringFrame.load(definition, { coordinates });
    expect(requests).toHaveLength(1);
    expect(requests[0]!.crs).toBe(definition.crs);
    expect(requests[0]!.body).toBe(EARTH);
    expect(requests[0]!.areaOfInterest).toBe(AREA);
    expect(requests[0]!.pinned).toBe(definition.pipeline);
    expect(frame.proj).toBeUndefined();
    expect(frame.fallback).toBeUndefined();
    expect(frame.operation.description).toBe(
      "a plain scale and offset (the host's own)",
    );
    expect(frame.operation.accuracy).toBe(0.02);
    expect(frame.gridCredits).toEqual(["The host's survey office"]);
    expect(frame.units.metersPerUnit).toBe(1);
    for (const design of DESIGNS) {
      // Where the fake puts it, through the body's ellipsoid.
      const expected = EARTH.ellipsoid.cartographicToCartesian(
        cartographic(
          (LON0 + design[0]! * SCALE) * RADIANS,
          (LAT0 + design[1]! * SCALE) * RADIANS,
          design[2]!,
        ),
        new Float64Array(3),
      );
      expect(Array.from(frame.toBodyFixed(design))).toEqual(
        Array.from(expected),
      );
    }
  });

  // The round trip's bound is 1e-9 m on the Moon, about four float64 steps
  // of a Moon-fixed coordinate (0.23 nm near 1.7e6 m). On the Earth one
  // step near 4.9e6 m is already 0.93 nm, so rounding alone can take a
  // round trip past 1e-9 m there: its bound is three steps.
  const ROUND_TRIPS: [string, typeof EARTH, number][] = [
    ["the Moon", MOON, 1e-9],
    ["the Earth", EARTH, 3 * 2 ** -30],
  ];
  for (const [where, body, bound] of ROUND_TRIPS) {
    it(`toBodyFixed and fromBodyFixed round-trip within ${bound.toPrecision(2)} m on ${where}`, async () => {
      const { coordinates } = service(async () => resolved());
      const frame = await EngineeringFrame.load(
        { ...definition, body },
        { coordinates },
      );
      const metres = SCALE * RADIANS * body.ellipsoid.maximumRadius;
      for (const design of DESIGNS) {
        const fixed = frame.toBodyFixed(design);
        const back = frame.fromBodyFixed(fixed);
        for (let i = 0; i < 3; i++) {
          const unit = i < 2 ? metres : 1;
          expect(Math.abs(back[i]! - design[i]!) * unit).toBeLessThan(bound);
        }
        const again = frame.toBodyFixed(back);
        expect(
          Math.hypot(
            again[0]! - fixed[0]!,
            again[1]! - fixed[1]!,
            again[2]! - fixed[2]!,
          ),
        ).toBeLessThan(bound);
      }
    });
  }

  it("a site transform runs before the service's operation", async () => {
    const { coordinates } = service(async () => resolved());
    const site = { origin: [100, 200, 10] as const, rotation: 0, scale: 2 };
    const frame = await EngineeringFrame.load(
      { ...definition, site },
      { coordinates },
    );
    const plain = await EngineeringFrame.load(definition, { coordinates });
    expect(Array.from(frame.toBodyFixed([5, 6, 7]))).toEqual(
      Array.from(plain.toBodyFixed([110, 212, 17])),
    );
    const back = frame.fromBodyFixed(frame.toBodyFixed([5, 6, 7]));
    for (let i = 0; i < 3; i++) {
      expect(back[i]!).toBeCloseTo([5, 6, 7][i]!, 8);
    }
  });

  it("gridFactors comes from the service, at the design point's projected coordinates", async () => {
    const asked: number[][] = [];
    const { coordinates } = service(async () =>
      resolved({
        gridFactors: (projected) => {
          asked.push(Array.from(projected));
          return FACTORS;
        },
      }),
    );
    const frame = await EngineeringFrame.load(
      {
        ...definition,
        site: { origin: [100, 200, 10], rotation: 0, scale: 2 },
      },
      { coordinates },
    );
    expect(gridFactors(frame, [5, 6, 7])).toEqual(FACTORS);
    expect(asked).toEqual([[110, 212, 17]]);
  });

  it("a Moon frame asks the service with the Moon", async () => {
    const { coordinates, requests } = service(async () => resolved());
    const frame = await EngineeringFrame.load(
      { ...definition, body: MOON },
      { coordinates },
    );
    expect(requests[0]!.body).toBe(MOON);
    expect(frame.body).toBe(MOON);
  });

  it("needs a coordinate service or PROJ, not both", async () => {
    await expect(
      EngineeringFrame.load(definition, {} as never),
    ).rejects.toThrow(/Host site grid.*a coordinate service or PROJ/);
    const { coordinates } = service(async () => resolved());
    await expect(
      EngineeringFrame.load(definition, {
        coordinates,
        proj: {} as never,
      } as never),
    ).rejects.toThrow(/Host site grid.*not both/);
  });

  it("refuses PROJ's own options with a host's service, before asking it", async () => {
    const { coordinates, requests } = service(async () => resolved());
    await expect(
      EngineeringFrame.load(
        { ...definition, geoidFallback: "EGM96", fallbackSigma: 0.1 },
        { coordinates },
      ),
    ).rejects.toThrow(
      /Host site grid.*geoidFallback, fallbackSigma are PROJ's/,
    );
    await expect(
      EngineeringFrame.load(
        { ...definition, allowBallpark: true },
        { coordinates },
      ),
    ).rejects.toThrow(/allowBallpark is PROJ's/);
    expect(requests).toHaveLength(0);
  });

  it("refuses a host's service for a definition with neither a site nor an area of interest, before asking it", async () => {
    const { coordinates, requests } = service(async () => resolved());
    const nowhere: EngineeringFrameDefinition = {
      name: definition.name,
      body: definition.body,
      crs: definition.crs,
    };
    await expect(
      EngineeringFrame.load(nowhere, { coordinates }),
    ).rejects.toThrow(
      /EngineeringFrame "Host site grid": a host's coordinate service needs a site or an areaOfInterest/,
    );
    expect(requests).toHaveLength(0);
    // A site alone is enough.
    const frame = await EngineeringFrame.load(
      { ...nowhere, site: { origin: [0, 0, 0], rotation: 0, scale: 1 } },
      { coordinates },
    );
    expect(frame.definition.name).toBe("Host site grid");
  });

  it("gridFactors refuses a host's non-finite factors, naming the frame", async () => {
    const { coordinates } = service(async () =>
      resolved({
        gridFactors: () => ({
          ...FACTORS,
          pointScale: NaN,
          convergence: Infinity,
        }),
      }),
    );
    const frame = await EngineeringFrame.load(definition, { coordinates });
    expect(() => gridFactors(frame, [1, 2, 3])).toThrow(RangeError);
    expect(() => gridFactors(frame, [1, 2, 3])).toThrow(
      /EngineeringFrame "Host site grid".*grid factors.*pointScale, convergence/,
    );
  });

  it("refuses a geographic (not projected) answer, naming the frame", async () => {
    const { coordinates } = service(async () =>
      resolved({
        units: {
          projected: false,
          horizontalUnitName: "degree",
          metersPerUnit: RADIANS,
        },
      }),
    );
    await expect(
      EngineeringFrame.load(definition, { coordinates }),
    ).rejects.toThrow(/Host site grid.*projected/);
  });
});

describe("a coordinate service that misbehaves (Review Focus 5)", () => {
  it("rejects: load rejects naming the engineering frame, and caches nothing", async () => {
    let fail = true;
    const { coordinates, requests } = service(async () => {
      if (fail) {
        throw new Error("the host's server is down");
      }
      return resolved();
    });
    const failed = EngineeringFrame.load(definition, { coordinates });
    await expect(failed).rejects.toThrow(
      'EngineeringFrame "Host site grid": the coordinate service failed: the host\'s server is down',
    );
    await expect(failed).rejects.toHaveProperty(
      "cause.message",
      "the host's server is down",
    );
    // Nothing cached: the next load asks again, and succeeds.
    await expect(
      EngineeringFrame.load(definition, { coordinates }),
    ).rejects.toThrow(/Host site grid/);
    fail = false;
    const frame = await EngineeringFrame.load(definition, { coordinates });
    expect(requests).toHaveLength(3);
    expect(frame.toBodyFixed([0, 0, 0]).every(Number.isFinite)).toBe(true);
  });

  it("throws synchronously: load still rejects (never throws) naming the frame", async () => {
    const coordinates: CoordinateService = {
      resolve: () => {
        throw new TypeError("not a function");
      },
    };
    const loading = EngineeringFrame.load(definition, { coordinates });
    expect(loading).toBeInstanceOf(Promise);
    await expect(loading).rejects.toThrow(
      /EngineeringFrame "Host site grid": the coordinate service failed: not a function/,
    );
  });

  it("returns NaN in its units, its accuracy or its operation: load rejects naming the frame", async () => {
    const answers: [string, ResolvedCoordinates, RegExp][] = [
      [
        "units",
        resolved({
          units: {
            projected: true,
            horizontalUnitName: "metre",
            metersPerUnit: NaN,
          },
        }),
        /metersPerUnit/,
      ],
      [
        "vertical units",
        resolved({
          units: {
            projected: true,
            horizontalUnitName: "metre",
            metersPerUnit: 1,
            metersPerVerticalUnit: Number.POSITIVE_INFINITY,
          },
        }),
        /metersPerVerticalUnit/,
      ],
      [
        "accuracy",
        resolved({ operation: plainOperation({ accuracy: NaN }) }),
        /accuracy/,
      ],
      [
        "inverse",
        resolved({
          operation: plainOperation({
            inverse: (_xyz, out = new Float64Array(3)) => out.fill(NaN),
          }),
        }),
        /not finite/,
      ],
      [
        "forward",
        resolved({
          operation: plainOperation({
            forward: (_xyz, out = new Float64Array(3)) => out.fill(NaN),
          }),
        }),
        /not finite/,
      ],
      [
        "no operation",
        resolved({ operation: undefined as never }),
        /operation/,
      ],
    ];
    for (const [what, answer, why] of answers) {
      const { coordinates } = service(async () => answer);
      const loading = EngineeringFrame.load(definition, { coordinates });
      await expect(loading, what).rejects.toThrow(/Host site grid/);
      await expect(loading, what).rejects.toThrow(why);
    }
  });

  it("an operation that turns non-finite later: toBodyFixed and fromBodyFixed throw RangeErrors naming the frame", async () => {
    let broken = false;
    const base = plainOperation();
    const operation = plainOperation({
      forward: (xyz, out) =>
        broken
          ? (out ?? new Float64Array(3)).fill(NaN)
          : base.forward(xyz, out),
      inverse: (xyz, out) =>
        broken
          ? (out ?? new Float64Array(3)).fill(NaN)
          : base.inverse(xyz, out),
    });
    const { coordinates } = service(async () => resolved({ operation }));
    const frame = await EngineeringFrame.load(definition, { coordinates });
    const fixed = frame.toBodyFixed([1, 2, 3]);
    broken = true;
    expect(() => frame.toBodyFixed([1, 2, 3])).toThrow(RangeError);
    expect(() => frame.toBodyFixed([1, 2, 3])).toThrow(/Host site grid/);
    expect(() => frame.fromBodyFixed(fixed)).toThrow(RangeError);
    expect(() => frame.fromBodyFixed(fixed)).toThrow(/Host site grid/);
  });

  it("answers slowly and is aborted: load rejects with an AbortError naming the frame, and a late answer is dropped", async () => {
    let answer: ((r: ResolvedCoordinates) => void) | undefined;
    const signals: (AbortSignal | undefined)[] = [];
    const coordinates: CoordinateService = {
      resolve: (_request, options) => {
        signals.push(options?.signal);
        // A slow host that ignores the signal.
        return new Promise((resolve) => (answer = resolve));
      },
    };
    const controller = new AbortController();
    const loading = EngineeringFrame.load(definition, {
      coordinates,
      signal: controller.signal,
    });
    await Promise.resolve();
    controller.abort();
    await expect(loading).rejects.toMatchObject({ name: "AbortError" });
    await expect(loading).rejects.toThrow(/Host site grid/);
    // The service was handed the signal.
    expect(signals[0]).toBe(controller.signal);
    // The late answer changes nothing.
    answer!(resolved());
    await expect(loading).rejects.toMatchObject({ name: "AbortError" });
  });

  it("an already aborted signal: rejects with an AbortError before asking the service; nothing is cached", async () => {
    const { coordinates, requests } = service(async () => resolved());
    const controller = new AbortController();
    controller.abort();
    const loading = EngineeringFrame.load(definition, {
      coordinates,
      signal: controller.signal,
    });
    await expect(loading).rejects.toMatchObject({ name: "AbortError" });
    await expect(loading).rejects.toThrow(/Host site grid/);
    expect(requests).toHaveLength(0);
    // A load without the signal asks the service and succeeds.
    const frame = await EngineeringFrame.load(definition, { coordinates });
    expect(requests).toHaveLength(1);
    expect(frame.definition.name).toBe("Host site grid");
  });

  it("a service that answers then the signal aborts before the frame is built: AbortError", async () => {
    const controller = new AbortController();
    const coordinates: CoordinateService = {
      resolve: async () => {
        controller.abort();
        return resolved();
      },
    };
    await expect(
      EngineeringFrame.load(definition, {
        coordinates,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

// The hosted placement through the frames module's pick interpreter.
const R = 6_378_137;
const SECONDS = Date.UTC(2026, 2, 20, 14, 3, 7, 250) / 1000;

describe("the hosted placement mode", () => {
  const catalog = createFrameCatalog();
  const resolver = createFramesResolver(catalog);
  const itrf = catalog.get("ITRF");
  let engine: Engine;
  let world: World;
  let earth: AnchorHandle;
  let view: View;
  let site: DrawHandle;
  /** Where the host delivered the content: its body-fixed metres. */
  let point: Float64Array;

  beforeAll(async () => {
    engine = await fakeEngine();
    world = engine.createWorld({ maxDraws: 4 });
    earth = world.bodyAnchor(EARTH);
    const mesh = world.addMesh(createBox());
    site = world.addDraw({
      mesh,
      origin: Float64Array.of(R, 0, 0),
      parent: earth,
    });
    view = new View({ target: new OffscreenTarget(64, 48), world });
    point = EARTH.ellipsoid.cartographicToCartesian(
      cartographic(
        (LON0 + 1_000 * SCALE) * RADIANS,
        (LAT0 + 2_000 * SCALE) * RADIANS,
        30,
      ),
      new Float64Array(3),
    );
  });

  function corePick(): CorePick {
    return {
      view,
      position: Float64Array.from(point),
      root: itrf,
      anchor: earth,
      anchorPosition: Float64Array.from(point),
      draw: site,
      feature: undefined,
      seconds: SECONDS,
      camera: {
        position: Float64Array.of(point[0]! + 1000, point[1]!, point[2]!),
        direction: Float64Array.of(-1, 0, 0),
        up: Float64Array.of(0, 0, 1),
        right: Float64Array.of(0, 1, 0),
        fovy: 1,
        near: 0.1,
        width: 64,
        height: 48,
      },
    };
  }

  it("is a placement mode", () => {
    const mode: PlacementMode = "hosted";
    expect(placeHosted("host grid").mode).toBe(mode);
  });

  it("draws the content as delivered: displayed is the identity on body-fixed metres, displayError 0", () => {
    const hosted = placeHosted("host grid");
    expect(hosted.frameName).toBe("host grid");
    const shown = hosted.displayed([R, 20, 30]);
    expect(Array.from(shown)).toEqual([R, 20, 30]);
    const out = new Float64Array(3);
    expect(hosted.displayed([1, 2, 3], out)).toBe(out);
    expect(hosted.displayError([R, 20, 30])).toBe(0);
    // Not an engineering placement: pickDesign and snapping give no design.
    expect(engineeringPlacement(hosted)).toBeUndefined();
  });

  it("without a coordinate service, designOf throws DESIGN_NOT_INVERTED, and a pick reports true values only", () => {
    const hosted = placeHosted("host grid");
    expect(() => hosted.designOf(point)).toThrow(DESIGN_NOT_INVERTED);
    const interpreter = createFramesPickInterpreter(resolver, catalog, {
      placements: () => hosted,
    });
    const picked = interpreter.interpret(corePick())!;
    expect(picked.frame).toBe(itrf);
    expect(picked.body).toBe(EARTH);
    expect(Array.from(picked.bodyFixed!)).toEqual(Array.from(point));
    expect(picked.design).toBeUndefined();
    expect(picked.accuracy.terms.some((t) => t.kind === "content")).toBe(false);
  });

  it("with the host's coordinates, a pick has design coordinates from the host's operation", () => {
    const hosted = placeHosted("host grid", resolved());
    const design = hosted.designOf(point);
    expect(design[0]!).toBeCloseTo(1_000, 6);
    expect(design[1]!).toBeCloseTo(2_000, 6);
    expect(design[2]!).toBeCloseTo(30, 6);
    const interpreter = createFramesPickInterpreter(resolver, catalog, {
      placements: () => hosted,
    });
    const picked = interpreter.interpret(corePick())!;
    expect(Array.from(picked.bodyFixed!)).toEqual(Array.from(point));
    expect(picked.design!.placement).toBe(hosted);
    expect(picked.design!.coordinates[0]!).toBeCloseTo(1_000, 6);
    expect(picked.design!.coordinates[1]!).toBeCloseTo(2_000, 6);
    const content = picked.accuracy.terms.find((t) => t.kind === "content")!;
    expect(content.frame).toBe("host grid");
    expect(content.meters).toBe(0);
    expect(content.note).toMatch(/as delivered/);
  });

  it("on the Moon, designOf goes through the Moon's ellipsoid", () => {
    const hosted = placeHosted("lunar grid", resolved(), MOON);
    const onMoon = MOON.ellipsoid.cartographicToCartesian(
      cartographic(
        (LON0 + 10 * SCALE) * RADIANS,
        (LAT0 + 20 * SCALE) * RADIANS,
        5,
      ),
      new Float64Array(3),
    );
    const design = hosted.designOf(onMoon);
    expect(design[0]!).toBeCloseTo(10, 6);
    expect(design[1]!).toBeCloseTo(20, 6);
    expect(design[2]!).toBeCloseTo(5, 6);
  });

  it("a host operation that can't invert the point throws, and the pick keeps its true values", () => {
    const hosted = placeHosted(
      "host grid",
      resolved({
        operation: plainOperation({
          inverse: (_xyz, out = new Float64Array(3)) => out.fill(NaN),
        }),
      }),
    );
    expect(() => hosted.designOf(point)).toThrow(DESIGN_NOT_INVERTED);
    const picked = createFramesPickInterpreter(resolver, catalog, {
      placements: () => hosted,
    }).interpret(corePick())!;
    expect(picked.design).toBeUndefined();
    expect(Array.from(picked.bodyFixed!)).toEqual(Array.from(point));
  });
});
