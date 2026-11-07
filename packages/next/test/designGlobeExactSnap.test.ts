// Plan 4b Task 17: the design globe's ExactSnapService, the server side of
// Task 16's split. It snaps in design space, from the placement's design
// coordinates of the client's hit, to a station tick, the centreline or a
// section edge line, exactly; beyond the alignment's ends it gives nothing,
// so the client's snap stands (Review Focus 4).
//
// The placement here is a fake: design units to metres, laid on the plane
// x = R (E along +y, N along +z, height along +x), with the camera 100 m
// above looking down −x. The alignment is the corridor's own.
import { describe, expect, it } from "vitest";
import {
  CORRIDOR_ALIGNMENT,
  CROSS_SECTION,
  TICKS,
  sectionSurface,
} from "../examples/design-globe/corridor.ts";
import { ExactSnapService } from "../examples/design-globe/exactSnap.ts";
import { Alignment } from "../src/engineering/alignment.ts";
import type { EngineeringFrame } from "../src/engineering/EngineeringFrame.ts";
import type { TilesetPlacement } from "../src/engineering/placement.ts";
import {
  refiningSnap,
  type ClientSnapService,
  type ServiceSnapRequest,
  type SnapCamera,
  type SnapResult,
} from "../src/engineering/snap.ts";
import { projectToPixel } from "../src/scene/Camera.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";

const R = 6_378_137;
const MPU = 1200 / 3937;
const alignment = new Alignment(CORRIDOR_ALIGNMENT);
const frame = { units: { metersPerUnit: MPU } } as unknown as EngineeringFrame;
/** The design origin of the fake placement: near the picks. */
const ORIGIN = alignment.pointAt(31_000);

const placement: TilesetPlacement = {
  mode: "reprojected",
  frame,
  displayed: (d, out = new Float64Array(3)) => {
    out[0] = R + (d[2]! - ORIGIN[2]!) * MPU;
    out[1] = (d[0]! - ORIGIN[0]!) * MPU;
    out[2] = (d[1]! - ORIGIN[1]!) * MPU;
    return out;
  },
  designOf: (p, out = new Float64Array(3)) => {
    out[0] = ORIGIN[0]! + p[1]! / MPU;
    out[1] = ORIGIN[1]! + p[2]! / MPU;
    out[2] = ORIGIN[2]! + (p[0]! - R) / MPU;
    return out;
  },
  displayError: () => 0,
};

function tileset(withPlacement = true): Tileset3D {
  return {
    placement: withPlacement ? placement : undefined,
    warnings: new Set<string>(),
    isDestroyed: () => false,
  } as unknown as Tileset3D;
}

/** A design point on the section's surface at a station and offset. */
function surface(station: number, offset: number): Float64Array {
  const p = alignment.pointAt(station, offset);
  p[2]! += sectionSurface(offset);
  return p;
}

/**
 * The camera 100 m above `over` (body-fixed), looking down −x; 1000 × 500 CSS
 * px with tan(fovy / 2) = 0.5, so a CSS pixel is 0.2 m (0.656 ftUS) at the
 * surface.
 */
function cameraOver(over: Float64Array): SnapCamera {
  return {
    position: Float64Array.from([over[0]! + 100, over[1]!, over[2]!]),
    direction: Float64Array.from([-1, 0, 0]),
    up: Float64Array.from([0, 0, 1]),
    right: Float64Array.from([0, 1, 0]),
    fovy: 2 * Math.atan(0.5),
    near: 0.1,
    width: 1000,
    height: 500,
  };
}

/** A request from a raw hit at a design point, with a 10 px aperture (6.6 ftUS). */
function request(design: Float64Array, ts: Tileset3D): ServiceSnapRequest {
  const testPoint = placement.displayed(design);
  return {
    tileset: ts,
    testPoint,
    closePoint: testPoint,
    camera: cameraOver(testPoint),
    canvasWidth: 1000,
    canvasHeight: 500,
    aperture: 10,
  };
}

/** The design point a snap stands for. */
function designOf(r: SnapResult | null | undefined): Float64Array {
  expect(r?.design).toBeDefined();
  return r!.design!.design;
}

describe("ExactSnapService", () => {
  it("snaps a pick 0.4 ft from the centreline on the arc to the centreline, exactly", async () => {
    // Station 31,000 is on the 5,000 ft arc (30,500 to 36,500).
    const ts = tileset();
    const raw = alignment.pointAt(31_000, 0.4);
    raw[2]! += 2.67; // on the median barrier's top
    const r = await new ExactSnapService(ts, alignment).snap(request(raw, ts));
    expect(r).toBeDefined();
    expect(r!.kind).toBe("arc");
    expect(r!.exact).toBe(true);
    expect(r!.tolerance).toBe(0);
    expect(r!.source).toBe("server");
    expect(r!.design!.obtained).toEqual({
      how: "snap",
      tolerance: 0,
      kind: "arc",
    });
    const design = designOf(r);
    const at = alignment.stationOffset(design);
    expect(Math.abs(at.offset)).toBeLessThanOrEqual(1e-9);
    expect(at.station).toBeCloseTo(31_000, 6);
    // On the analytic centreline (the profile grade line): within 1e-6 ft.
    const truth = alignment.pointAt(at.station);
    expect(
      Math.hypot(design[0]! - truth[0]!, design[1]! - truth[1]!),
    ).toBeLessThanOrEqual(1e-6);
    expect(
      Math.abs(design[2]! - alignment.elevationAt(at.station)),
    ).toBeLessThanOrEqual(1e-6);
    // Drawn where the placement draws that design point.
    expect(Array.from(r!.snapPoint)).toEqual(
      Array.from(placement.displayed(design)),
    );
    // The curve: 21 points over ±100 ft along the centreline.
    expect(r!.curve).toHaveLength(21);
    const ends = [r!.curve![0]!, r!.curve![20]!].map(
      (p) => alignment.stationOffset(placement.designOf(p)).station,
    );
    expect(ends[0]).toBeCloseTo(at.station - 100, 6);
    expect(ends[1]).toBeCloseTo(at.station + 100, 6);
  });

  it("gives a segment on a tangent, at the nearest section edge line", async () => {
    // Station 45,000 is on the long tangent; offset 28.6 is 0.4 ft from the
    // lanes' outer edge at 29.
    const ts = tileset();
    const r = await new ExactSnapService(ts, alignment).snap(
      request(surface(45_050, 28.6), ts),
    );
    expect(r!.kind).toBe("segment");
    const design = designOf(r);
    const at = alignment.stationOffset(design);
    expect(Math.abs(at.offset - 29)).toBeLessThanOrEqual(1e-9);
    const truth = surface(at.station, 29);
    expect(
      Math.hypot(
        design[0]! - truth[0]!,
        design[1]! - truth[1]!,
        design[2]! - truth[2]!,
      ),
    ).toBeLessThanOrEqual(1e-6);
  });

  it("gives a station tick's point near a tick at 45,000, exactly (45,000, ±35)", async () => {
    const ts = tileset();
    const service = new ExactSnapService(ts, alignment);
    for (const side of [-1, 1]) {
      const r = await service.snap(request(surface(45_000.3, side * 34.6), ts));
      expect(r!.kind).toBe("point");
      expect(r!.exact).toBe(true);
      const design = designOf(r);
      const tick = alignment.pointAt(45_000, side * 35);
      expect(design[0]).toBe(tick[0]);
      expect(design[1]).toBe(tick[1]);
      expect(design[2]).toBe(
        tick[2]! + sectionSurface(side * 35) + TICKS.raise,
      );
      const at = alignment.stationOffset(design);
      expect(at.station).toBeCloseTo(45_000, 9);
      expect(at.offset).toBeCloseTo(side * 35, 9);
    }
  });

  it("gives nothing beyond the aperture", async () => {
    // Offset 20: 9 ft from the edges at 29 and 15 ft from 5, the aperture
    // 6.6 ft, and the nearest tick 15 ft off.
    const ts = tileset();
    const r = await new ExactSnapService(ts, alignment).snap(
      request(surface(45_050, 20), ts),
    );
    expect(r).toBeUndefined();
  });

  it("snaps to the centreline and the section's edge lines", () => {
    // The strips' edges (median shoulders at ±1, lanes at ±5 and ±29, outer
    // shoulders to ±39) and the outer barriers' outer faces at ±41.
    const edges = new Set<number>([0, -41, 41]);
    for (const s of CROSS_SECTION.strips) {
      edges.add(s.from).add(s.to);
    }
    expect(ExactSnapService.lineOffsets).toEqual(
      [...edges].sort((a, b) => a - b),
    );
    expect(ExactSnapService.lineOffsets).toEqual([
      -41, -39, -29, -5, -1, 0, 1, 5, 29, 39, 41,
    ]);
  });
});

describe("ExactSnapService: no design answer (Review Focus 4)", () => {
  /** 10 ft before the start, on the start tangent's extension. */
  function beforeStart(): Float64Array {
    const az = CORRIDOR_ALIGNMENT.startAzimuth;
    const [e, n] = CORRIDOR_ALIGNMENT.start;
    return Float64Array.from([
      e - 10 * Math.sin(az),
      n - 10 * Math.cos(az),
      CORRIDOR_ALIGNMENT.vertical!.startElevation,
    ]);
  }

  it("gives nothing before the start", async () => {
    const ts = tileset();
    const r = await new ExactSnapService(ts, alignment).snap(
      request(beforeStart(), ts),
    );
    expect(r).toBeUndefined();
  });

  it("gives nothing after the end", async () => {
    const ts = tileset();
    const end = alignment.endStation;
    const az = alignment.azimuthAt(end);
    const p = alignment.pointAt(end);
    p[0]! += 10 * Math.sin(az);
    p[1]! += 10 * Math.cos(az);
    const r = await new ExactSnapService(ts, alignment).snap(request(p, ts));
    expect(r).toBeUndefined();
  });

  it("gives nothing for a tileset without a placement, or another tileset", async () => {
    const ts = tileset();
    const service = new ExactSnapService(ts, alignment);
    const raw = alignment.pointAt(31_000, 0.4);
    expect(
      await new ExactSnapService(tileset(false), alignment).snap(
        request(raw, tileset(false)),
      ),
    ).toBeUndefined();
    expect(await service.snap(request(raw, tileset()))).toBeUndefined();
  });

  /** A raw client hit at a design point, as `refiningSnap` gets it. */
  function clientSnap(design: Float64Array, ts: Tileset3D) {
    const hitPoint = placement.displayed(design);
    const camera = cameraOver(hitPoint);
    const at = new Float64Array(2);
    projectToPixel(camera, camera.fovy, 1000, 500, hitPoint, at);
    const found: SnapResult = {
      snapPoint: Float64Array.from(hitPoint),
      hitPoint,
      distance: 0,
      kind: "surface",
      tolerance: 0.2,
      exact: false,
      tileset: ts,
      source: "client",
      provisional: false,
      camera,
    };
    const client = {
      snap: async () => found,
      hides: () => false,
    } as unknown as ClientSnapService;
    return {
      client,
      request: { view: undefined as never, x: at[0]!, y: at[1]!, aperture: 10 },
    };
  }

  it("through refiningSnap, leaves the raw pick with no station before the start", async () => {
    const ts = tileset();
    const { client, request: req } = clientSnap(beforeStart(), ts);
    const updates: SnapResult[] = [];
    const r = await refiningSnap(
      req,
      client,
      new ExactSnapService(ts, alignment),
      (u) => updates.push(u),
    );
    expect(r!.source).toBe("client");
    expect(r!.kind).toBe("surface");
    expect(r!.exact).toBe(false);
    expect(r!.design).toBeUndefined();
    expect(updates.map((u) => u.provisional)).toEqual([true, false]);
    expect(ts.warnings.size).toBe(0);
  });

  it("through refiningSnap, replaces the client snap with the exact one, which checks out", async () => {
    const ts = tileset();
    const raw = alignment.pointAt(31_000, 0.4);
    const { client, request: req } = clientSnap(raw, ts);
    const r = await refiningSnap(
      req,
      client,
      new ExactSnapService(ts, alignment),
      () => {},
    );
    expect(ts.warnings.size).toBe(0);
    expect(r!.source).toBe("server");
    expect(r!.exact).toBe(true);
    expect(r!.kind).toBe("arc");
    expect(
      Math.abs(alignment.stationOffset(r!.design!.design).offset),
    ).toBeLessThanOrEqual(1e-9);
  });
});
