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
import * as m4 from "../src/math/mat4.ts";
import type { PickView } from "../src/engineering/pick.ts";
import { EARTH } from "../src/scene/Body.ts";
import { Camera, projectToPixel } from "../src/scene/Camera.ts";
import type { DrawHandle } from "../src/scene/World.ts";
import type { TileGeometry } from "../src/streaming/Tile.ts";
import {
  CORRIDOR_ALIGNMENT,
  CROSS_SECTION,
  TICKS,
  sectionSurface,
} from "../examples/design-globe/corridor.ts";
import {
  ExactSnapService,
  visibleRise,
} from "../examples/design-globe/exactSnap.ts";
import { Alignment } from "../src/engineering/alignment.ts";
import { EngineeringFrame } from "../src/engineering/EngineeringFrame.ts";
import type { TilesetPlacement } from "../src/engineering/placement.ts";
import {
  ClientSnapService,
  SNAP_SERVER_REFUSED,
  refiningSnap,
  type ServiceSnapRequest,
  type SnapCamera,
  type SnapResult,
} from "../src/engineering/snap.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";

const R = 6_378_137;
const MPU = 1200 / 3937;
const alignment = new Alignment(CORRIDOR_ALIGNMENT);
// An EngineeringFrame to `instanceof` (engineeringPlacement), with only what is read.
const frame = Object.assign(Object.create(EngineeringFrame.prototype), {
  units: { metersPerUnit: MPU },
}) as EngineeringFrame;
/** The design origin of the fake placement: near the picks. */
const ORIGIN = alignment.pointAt(31_000);

const placement: TilesetPlacement = {
  mode: "reprojected",
  frameName: "corridor",
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
    // Shown on the median barrier's top over it, 2.67 ft up.
    const shown = placement.designOf(r!.shownPoint!);
    expect(shown[2]! - design[2]!).toBeCloseTo(2.67, 9);
    expect(
      Math.hypot(shown[0]! - design[0]!, shown[1]! - design[1]!),
    ).toBeLessThan(1e-6);
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
    // A breakline on the surface is visible as it is.
    expect(r!.shownPoint).toBeUndefined();
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

// The page's case: a client whose retained triangles really are the median
// barrier over the profile grade line, which hides the line from the camera.
describe("ExactSnapService through refiningSnap, the barrier drawn", () => {
  const DRAW = { index: 1, generation: 1, name: undefined } as DrawHandle;
  /** The section across the median, as drawn: offset and rise above the profile. */
  const SECTION: readonly (readonly [number, number])[] = [
    [-10, sectionSurface(-10)],
    [-5, sectionSurface(-5)],
    [-1, sectionSurface(-1)],
    [-0.25, 2.67],
    [0.25, 2.67],
    [1, sectionSurface(1)],
    [5, sectionSurface(5)],
    [10, sectionSurface(10)],
  ];

  /** The median's mesh from 30,950 to 31,050, every 5 ft, as a tile keeps it. */
  function barrierGeometry(): { geometry: TileGeometry; origin: Float64Array } {
    const origin = placement.displayed(ORIGIN).map(Math.round);
    const stations = Array.from({ length: 21 }, (_, i) => 30_950 + 5 * i);
    const local: number[] = [];
    for (const station of stations) {
      for (const [offset, rise] of SECTION) {
        const d = alignment.pointAt(station, offset);
        d[2]! += rise;
        const p = placement.displayed(d);
        local.push(p[0]! - origin[0]!, p[1]! - origin[1]!, p[2]! - origin[2]!);
      }
    }
    const n = SECTION.length;
    const indices: number[] = [];
    for (let i = 0; i + 1 < stations.length; i++) {
      for (let k = 0; k + 1 < n; k++) {
        const a = i * n + k;
        const b = a + n;
        indices.push(a, b, b + 1, a, b + 1, a + 1);
      }
    }
    const matrix = m4.mat4();
    matrix.set(origin, 12);
    return {
      geometry: {
        draw: DRAW,
        positions: new Float32Array(local),
        indices: new Uint32Array(indices),
        matrix,
      },
      origin: Float64Array.from(origin),
    };
  }

  function drawnTileset(): Tileset3D {
    const { geometry, origin } = barrierGeometry();
    const tile = {
      // The mesh's chords err by under 0.2 mm.
      geometricError: 0.001,
      volume: { kind: "sphere", sphere: { center: origin, radius: 200 } },
      contentVolume: undefined,
      geometry: [geometry],
    };
    return {
      placement,
      retainGeometry: true,
      warnings: new Set<string>(),
      tileOfDraw: (d: DrawHandle) =>
        d.index === DRAW.index && d.generation === DRAW.generation
          ? tile
          : undefined,
      isDestroyed: () => false,
    } as unknown as Tileset3D;
  }

  /** The nearest crossing of a ray with the tileset's triangles. */
  function cast(
    ts: Tileset3D,
    eye: Float64Array,
    dir: Float64Array,
  ): Float64Array | undefined {
    const { geometry, origin } = barrierGeometry();
    void ts;
    const p = geometry.positions;
    const at = (i: number) => [
      p[3 * i]! + origin[0]! - eye[0]!,
      p[3 * i + 1]! + origin[1]! - eye[1]!,
      p[3 * i + 2]! + origin[2]! - eye[2]!,
    ];
    let best = Infinity;
    const ix = geometry.indices;
    for (let t = 0; t < ix.length; t += 3) {
      const [o, b, c] = [at(ix[t]!), at(ix[t + 1]!), at(ix[t + 2]!)];
      const e1 = [b[0]! - o[0]!, b[1]! - o[1]!, b[2]! - o[2]!];
      const e2 = [c[0]! - o[0]!, c[1]! - o[1]!, c[2]! - o[2]!];
      const q = [
        dir[1]! * e2[2]! - dir[2]! * e2[1]!,
        dir[2]! * e2[0]! - dir[0]! * e2[2]!,
        dir[0]! * e2[1]! - dir[1]! * e2[0]!,
      ];
      const det = e1[0]! * q[0]! + e1[1]! * q[1]! + e1[2]! * q[2]!;
      if (Math.abs(det) < 1e-12) {
        continue;
      }
      const sv = [-o[0]!, -o[1]!, -o[2]!];
      const u = (sv[0]! * q[0]! + sv[1]! * q[1]! + sv[2]! * q[2]!) / det;
      const r = [
        sv[1]! * e1[2]! - sv[2]! * e1[1]!,
        sv[2]! * e1[0]! - sv[0]! * e1[2]!,
        sv[0]! * e1[1]! - sv[1]! * e1[0]!,
      ];
      const v = (dir[0]! * r[0]! + dir[1]! * r[1]! + dir[2]! * r[2]!) / det;
      const dist = (e2[0]! * r[0]! + e2[1]! * r[1]! + e2[2]! * r[2]!) / det;
      if (u >= 0 && v >= 0 && u + v <= 1 && dist > 0 && dist < best) {
        best = dist;
      }
    }
    return Number.isFinite(best)
      ? Float64Array.from([0, 1, 2].map((k) => eye[k]! + best * dir[k]!))
      : undefined;
  }

  const W = 1000;
  const H = 500;

  /**
   * A view of the drawn tileset from `eye` (body-fixed) looking at `target`,
   * whose picks ray-cast the barrier's mesh.
   */
  function viewOf(ts: Tileset3D, eye: Float64Array, target: Float64Array) {
    const camera = new Camera();
    camera.position.set(eye);
    const d = [0, 1, 2].map((k) => target[k]! - eye[k]!);
    const l = Math.hypot(...d);
    camera.direction.set(d.map((v) => v / l));
    // The fake placement's up is +x.
    camera.orient(Float64Array.from([1, 0, 0]));
    camera.fov = Math.PI / 3;
    camera.near = 0.1;
    const fovy = camera.fovy(W / H);
    const view: PickView = {
      pick: async () => ({ featureId: 7, name: undefined }),
      pickPosition: async (px, py) => {
        const t = Math.tan(fovy / 2);
        const nx = ((2 * px) / W - 1) * t * (W / H);
        const ny = (1 - (2 * py) / H) * t;
        const ray = [0, 1, 2].map(
          (k) =>
            camera.direction[k]! + nx * camera.right[k]! + ny * camera.up[k]!,
        );
        const rl = Math.hypot(...ray);
        return cast(ts, eye, Float64Array.from(ray.map((v) => v / rl)));
      },
      body: EARTH,
      camera,
      target: { kind: "canvas", width: W, pixelRatio: 1 },
      pixelRect: () => ({ width: W, height: H }),
      world: { feature: () => ({ draw: DRAW }) },
    };
    const pixel = (p: ArrayLike<number>) => {
      const out = new Float64Array(2);
      projectToPixel(camera, fovy, W, H, p, out);
      return out;
    };
    return { view, pixel };
  }

  /** On the barrier's top at a station and offset (body-fixed). */
  const onTop = (station: number, offset: number) => {
    const d = alignment.pointAt(station, offset);
    d[2]! += visibleRise(offset);
    return placement.displayed(d);
  };

  it("shows the profile grade line's exact snap on the barrier's top, which hides the line", async () => {
    const ts = drawnTileset();
    const target = onTop(31_000, 0);
    // 12 m above and 6 m to the side, looking down at the barrier.
    const eye = Float64Array.from([
      target[0]! + 12,
      target[1]! + 6,
      target[2]!,
    ]);
    const { view, pixel } = viewOf(ts, eye, target);
    const cursor = pixel(onTop(31_002, 0.2));
    const req = { view, x: cursor[0]!, y: cursor[1]!, aperture: 8 };
    const client = new ClientSnapService([ts]);
    const r = await refiningSnap(
      req,
      client,
      new ExactSnapService(ts, alignment),
      () => {},
    );
    expect([...ts.warnings]).toEqual([]);
    expect(r!.source).toBe("server");
    expect(r!.exact).toBe(true);
    expect(r!.kind).toBe("arc");
    // The readout's design point is exactly on the profile grade line.
    const design = r!.design!.design;
    const at = alignment.stationOffset(design);
    expect(Math.abs(at.offset)).toBeLessThanOrEqual(1e-9);
    expect(
      Math.abs(design[2]! - alignment.elevationAt(at.station)),
    ).toBeLessThanOrEqual(1e-6);
    expect(Array.from(r!.snapPoint)).toEqual(
      Array.from(placement.displayed(design)),
    );
    // Shown on the barrier's top over it: 2.67 ft up.
    const shown = placement.designOf(r!.shownPoint!);
    expect(shown[0]).toBeCloseTo(design[0]!, 6);
    expect(shown[1]).toBeCloseTo(design[1]!, 6);
    expect(shown[2]! - design[2]!).toBeCloseTo(2.67, 6);

    // The same answer without its shown point: the barrier hides it.
    const plain = drawnTileset();
    const exact = new ExactSnapService(plain, alignment);
    const bare = {
      snap: async (q: ServiceSnapRequest) => {
        const found = await exact.snap(q);
        if (found === undefined) {
          return undefined;
        }
        const { shownPoint: ignored, ...rest } = found;
        void ignored;
        return rest;
      },
    };
    const refused = await refiningSnap(
      // A wide aperture, so only the occlusion test can refuse it.
      { ...req, aperture: 200, view: viewOf(plain, eye, target).view },
      new ClientSnapService([plain]),
      bare,
      () => {},
    );
    expect(refused!.source).toBe("client");
    expect([...plain.warnings]).toEqual([
      `${SNAP_SERVER_REFUSED}: snapPoint hidden from the camera by the drawn mesh`,
    ]);
  });

  it("judges the aperture where the snap is shown, in a close oblique view", async () => {
    const ts = drawnTileset();
    const target = onTop(31_000, 0);
    // 2.5 m up and 6 m back along the road, to the right: close and oblique.
    const back = alignment.pointAt(30_980, 6);
    back[2]! += 2.67;
    const eye = placement.displayed(back);
    eye[0]! += 2.5;
    const { view, pixel } = viewOf(ts, eye, target);
    const cursor = pixel(onTop(31_000, 0.2));
    const hit = await view.pickPosition(cursor[0]!, cursor[1]!);
    const station = alignment.stationOffset(placement.designOf(hit!)).station;
    // Where the centreline is shown (the barrier's top) and where it is (the
    // profile grade line, 0.81 m below), in pixels from the cursor.
    const shownAt = pixel(onTop(station, 0));
    const pgl = alignment.pointAt(station);
    const exactAt = pixel(placement.displayed(pgl));
    const shown = Math.hypot(
      shownAt[0]! - cursor[0]!,
      shownAt[1]! - cursor[1]!,
    );
    const exact = Math.hypot(
      exactAt[0]! - cursor[0]!,
      exactAt[1]! - cursor[1]!,
    );
    expect(exact).toBeGreaterThan(shown + 20);

    const run = (aperture: number, tileset = drawnTileset()) =>
      refiningSnap(
        {
          view: viewOf(tileset, eye, target).view,
          x: cursor[0]!,
          y: cursor[1]!,
          aperture,
        },
        new ClientSnapService([tileset]),
        new ExactSnapService(tileset, alignment),
        () => {},
      ).then((r) => ({ r, tileset }));

    // Just inside: the centreline, accepted, though its exact point is far
    // outside the aperture on the screen.
    const inside = await run(shown + 0.5);
    expect([...inside.tileset.warnings]).toEqual([]);
    expect(inside.r!.source).toBe("server");
    expect(
      Math.abs(alignment.stationOffset(inside.r!.design!.design).offset),
    ).toBeLessThanOrEqual(1e-9);
    expect(inside.r!.distance).toBeCloseTo(shown, 6);

    // Just outside: no exact snap (the edge lines at ±1 are further), so the
    // client's stands, with nothing refused.
    const outside = await run(shown - 0.5);
    expect(outside.r!.source).toBe("client");
    expect([...outside.tileset.warnings]).toEqual([]);
  });
});
