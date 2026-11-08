// Plan 4b task 16: ClientSnapService over retained tile geometry, View.toPixel,
// and Tileset3D's retainGeometry (with World.drawMatrix).
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  ClientSnapService,
  SNAP_SERVER_FAILED,
  SNAP_SERVER_REFUSED,
  SNAP_UPDATE_FAILED,
  SHOWN_POINT_REACH,
  refiningSnap,
  type ServiceSnapRequest,
  type SnapResult,
  type SnapService,
} from "../src/engineering/snap.ts";
import type { PickView } from "../src/engineering/pick.ts";
import type { TilesetPlacement } from "../src/engineering/placement.ts";
import {
  designPoint,
  EngineeringFrame,
} from "../src/engineering/EngineeringFrame.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import * as m4 from "../src/math/mat4.ts";
import { EARTH } from "../src/scene/Body.ts";
import { Camera, projectToPixel } from "../src/scene/Camera.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { CanvasTarget, OffscreenTarget, View } from "../src/scene/View.ts";
import type { DrawHandle, World } from "../src/scene/World.ts";
import type { SelectionView } from "../src/streaming/Stepwise.ts";
import type { TileGeometry } from "../src/streaming/Tile.ts";
import { Tileset3D } from "../src/streaming/Tileset3D.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
// An EngineeringFrame to `instanceof` (engineeringPlacement), with only what is read.
const frame = Object.assign(Object.create(EngineeringFrame.prototype), {
  name: "fake",
}) as EngineeringFrame;
const DRAW = { index: 3, generation: 1, name: undefined } as DrawHandle;
const GEOMETRIC_ERROR = 0.25;

// The camera is 1000 m above (R, 0, 0) looking down -x, with +y right and
// +z up on the screen. The view is 1000 × 500 CSS px with a 90° horizontal
// field of view, so 1 CSS px is 2 m at the tile, and (R, y, z) shows at
// (500 + y / 2, 250 - z / 2).
const toScreen = (y: number, z: number) => [500 + y / 2, 250 - z / 2] as const;

// A 40 m square of two triangles in the plane x = R: A (0, 0), B (40, 0),
// C (0, 40) and D (40, 40) in (y, z), local to a translation to (R, 0, 0).
function geometry(): TileGeometry {
  const matrix = m4.mat4();
  matrix[12] = R;
  return {
    draw: DRAW,
    positions: new Float32Array([0, 0, 0, 0, 40, 0, 0, 0, 40, 0, 40, 40]),
    indices: new Uint32Array([0, 1, 3, 0, 3, 2]),
    matrix,
  };
}

function placement(): TilesetPlacement {
  return {
    mode: "rigid",
    frameName: "fake",
    frame,
    // The inverse of designOf.
    displayed: (d) => Float64Array.from([d[0]! + R, d[1]! / 2, d[2]! / 3]),
    designOf: (p: ArrayLike<number>) =>
      Float64Array.from([p[0]! - R, p[1]! * 2, p[2]! * 3]),
    displayError: () => 0,
  };
}

function tileset(
  o: {
    placement?: TilesetPlacement;
    retain?: boolean;
    owns?: boolean;
    geometry?: TileGeometry;
  } = {},
): Tileset3D {
  const retain = o.retain ?? true;
  const tile = {
    geometricError: GEOMETRIC_ERROR,
    volume: {
      kind: "sphere",
      sphere: { center: Float64Array.from([R, 20, 20]), radius: 200 },
    },
    contentVolume: undefined,
    ...(retain && { geometry: [o.geometry ?? geometry()] }),
  };
  return {
    placement: o.placement,
    retainGeometry: retain,
    warnings: new Set<string>(),
    tileOfDraw: (d: DrawHandle) =>
      (o.owns ?? true) &&
      d.index === DRAW.index &&
      d.generation === DRAW.generation
        ? tile
        : undefined,
    isDestroyed: () => false,
  } as unknown as Tileset3D;
}

/** The raw hit under a CSS pixel: on the plane x = R. */
function under(x: number, y: number): Float64Array {
  return Float64Array.from([R, (x - 500) * 2, (250 - y) * 2]);
}

function view(
  o: {
    sky?: boolean;
    feature?: boolean;
    onPick?: (c: Camera) => void;
    /** Places the camera (default: 1000 m above (R, 0, 0), looking down). */
    aim?: (c: Camera) => void;
  } = {},
): PickView {
  const camera = new Camera();
  camera.position.set([R + 1000, 0, 0]);
  camera.direction.set([-1, 0, 0]);
  camera.orient(Float64Array.from([0, 0, 1]));
  camera.fov = Math.PI / 2;
  o.aim?.(camera);
  return {
    pick: async () => {
      o.onPick?.(camera);
      return o.feature === false
        ? undefined
        : { featureId: 7, name: undefined };
    },
    pickPosition: async (x, y) => (o.sky ? undefined : under(x, y)),
    body: EARTH,
    camera,
    target: { kind: "canvas", width: 1000, pixelRatio: 1 },
    pixelRect: () => ({ width: 1000, height: 500 }),
    world: { feature: () => ({ draw: DRAW }) },
  };
}

describe("ClientSnapService", () => {
  it("snaps to a vertex within the aperture, exactly", async () => {
    const [x, y] = toScreen(40, 0);
    const ts = tileset({ placement: placement() });
    const r = await new ClientSnapService([ts]).snap({
      view: view(),
      x: x + 3,
      y,
      aperture: 6,
    });
    expect(r?.kind).toBe("point");
    expect(Array.from(r!.snapPoint)).toEqual([R, 40, 0]);
    expect(Array.from(r!.hitPoint)).toEqual(Array.from(under(x + 3, y)));
    expect(r!.distance).toBeCloseTo(3, 9);
    expect(r!.exact).toBe(false);
    expect(r!.tileset).toBe(ts);
    expect(r!.curve).toBeUndefined();
    expect(r!.source).toBe("client");
    expect(r!.provisional).toBe(false);
    expect(r!.feature).toEqual({ featureId: 7, name: undefined });
    expect(r!.camera!.position[0]).toBe(R + 1000);
    // The face normal, toward the camera.
    expect(Array.from(r!.normal!)).toEqual([1, 0, 0]);
  });

  it("snaps to the nearest point of an edge", async () => {
    const [x, y] = toScreen(20, 0);
    const r = await new ClientSnapService([tileset()]).snap({
      view: view(),
      x,
      y: y + 3,
      aperture: 6,
    });
    expect(r?.kind).toBe("segment");
    expect(r!.snapPoint[0]).toBe(R);
    expect(r!.snapPoint[1]).toBeCloseTo(20, 9);
    expect(r!.snapPoint[2]).toBeCloseTo(0, 9);
    expect(r!.distance).toBeCloseTo(3, 9);
    expect(r!.curve!.map((p) => Array.from(p))).toEqual([
      [R, 0, 0],
      [R, 40, 0],
    ]);
  });

  it("gives the raw hit as a surface 20 px from everything", async () => {
    const [x, y] = toScreen(40, 0);
    const r = await new ClientSnapService([tileset()]).snap({
      view: view(),
      x: x + 20,
      y: y + 20,
      aperture: 6,
    });
    expect(r?.kind).toBe("surface");
    const raw = Array.from(under(x + 20, y + 20));
    expect(Array.from(r!.snapPoint)).toEqual(raw);
    expect(Array.from(r!.hitPoint)).toEqual(raw);
    expect(r!.distance).toBe(0);
    expect(r!.exact).toBe(false);
  });

  it("states the tile's geometric error as the tolerance", async () => {
    const [x, y] = toScreen(0, 40);
    const r = await new ClientSnapService([tileset()]).snap({
      view: view(),
      x: x - 2,
      y: y + 1,
      aperture: 6,
    });
    expect(r?.kind).toBe("point");
    expect(Array.from(r!.snapPoint)).toEqual([R, 0, 40]);
    expect(r!.tolerance).toBe(GEOMETRIC_ERROR);
  });

  it("gives design coordinates through the placement", async () => {
    const pl = placement();
    const [x, y] = toScreen(40, 40);
    const r = await new ClientSnapService([tileset({ placement: pl })]).snap({
      view: view(),
      x: x + 1,
      y: y - 1,
      aperture: 6,
    });
    expect(r?.kind).toBe("point");
    expect(r!.design!.engineeringFrame).toBe(frame);
    expect(Array.from(r!.design!.design)).toEqual([0, 80, 120]);
    expect(r!.design!.obtained).toEqual({
      how: "snap",
      tolerance: GEOMETRIC_ERROR,
      kind: "point",
    });
  });

  it("gives a surface and warns once when the geometry isn't retained", async () => {
    const ts = tileset({ retain: false, placement: placement() });
    const add = vi.spyOn(ts.warnings, "add");
    const service = new ClientSnapService([ts]);
    const [x, y] = toScreen(40, 0);
    for (let i = 0; i < 3; i++) {
      const r = await service.snap({ view: view(), x, y, aperture: 6 });
      expect(r?.kind).toBe("surface");
      expect(Array.from(r!.snapPoint)).toEqual(Array.from(under(x, y)));
      expect(r!.design?.obtained?.kind).toBe("surface");
    }
    expect([...ts.warnings]).toEqual(["snap: geometry not retained"]);
    expect(add).toHaveBeenCalledTimes(1);
  });

  it("throws for an aperture that is negative or not finite", async () => {
    const service = new ClientSnapService([tileset()]);
    for (const aperture of [-1, NaN, Infinity]) {
      await expect(
        service.snap({ view: view(), x: 1, y: 1, aperture }),
      ).rejects.toThrow(/aperture/);
    }
  });
});

describe("ClientSnapService: no design answer (Review Focus 4)", () => {
  const near = toScreen(40, 0);

  it("resolves undefined over the sky", async () => {
    const r = await new ClientSnapService([
      tileset({ placement: placement() }),
    ]).snap({ view: view({ sky: true }), x: 1, y: 1, aperture: 6 });
    expect(r).toBeUndefined();
  });

  it("snaps on a tileset without a placement, with no design", async () => {
    const r = await new ClientSnapService([tileset()]).snap({
      view: view(),
      x: near[0] + 1,
      y: near[1],
      aperture: 6,
    });
    expect(r?.kind).toBe("point");
    expect(r!.design).toBeUndefined();
  });

  it("gives the raw surface for a draw not in the given tilesets", async () => {
    const other = tileset({ owns: false, placement: placement() });
    const r = await new ClientSnapService([other]).snap({
      view: view(),
      x: near[0] + 1,
      y: near[1],
      aperture: 6,
    });
    expect(r?.kind).toBe("surface");
    expect(r!.tileset).toBeUndefined();
    expect(r!.design).toBeUndefined();
    expect([...other.warnings]).toEqual([]);
  });

  it("gives the raw surface, with no design, when the camera keeps moving", async () => {
    const r = await new ClientSnapService([
      tileset({ placement: placement() }),
    ]).snap({
      view: view({ onPick: (c) => c.version++ }),
      x: near[0] + 1,
      y: near[1],
      aperture: 6,
    });
    expect(r?.kind).toBe("surface");
    expect(r!.design).toBeUndefined();
    expect(r!.tileset).toBeUndefined();
  });

  it("projects with the camera of the pick's frame, not a later one", async () => {
    // The camera turns once the pick has checked its frame (the feature is
    // resolved after): the snap still lands on the vertex that frame showed
    // under the cursor.
    const v = view();
    const camera = v.camera as Camera;
    v.world.feature = () => {
      camera.direction.set([-1, 0.5, 0]);
      camera.orient(Float64Array.from([0, 0, 1]));
      return { draw: DRAW };
    };
    const r = await new ClientSnapService([tileset()]).snap({
      view: v,
      x: near[0] + 1,
      y: near[1],
      aperture: 6,
    });
    expect(r?.kind).toBe("point");
    expect(Array.from(r!.snapPoint)).toEqual([R, 40, 0]);
  });
});

describe("refiningSnap: the client's snap, then the server's", () => {
  // 3 px right of vertex B (R, 40, 0).
  const [bx, by] = toScreen(40, 0);
  const request = () => ({ view: view(), x: bx + 3, y: by, aperture: 6 });
  /** The server's answer: B moved 1 cm, as the design data has it. */
  const designB = Float64Array.from([R, 40.01, 0]);
  function answer(over: Partial<SnapResult> = {}): SnapResult {
    return {
      snapPoint: designB,
      hitPoint: designB,
      distance: 99,
      kind: "point",
      tolerance: 0,
      exact: true,
      source: "server",
      provisional: false,
      ...over,
    };
  }
  function server(
    snap: (
      r: ServiceSnapRequest,
      s?: AbortSignal,
    ) => Promise<SnapResult | null | undefined>,
  ) {
    const fn = vi.fn(snap);
    return { service: { snap: fn } as SnapService, fn };
  }

  it("calls onUpdate with the client snap, then the server's", async () => {
    const ts = tileset({ placement: placement() });
    const client = new ClientSnapService([ts]);
    const { service, fn } = server(async () => answer());
    const updates: SnapResult[] = [];
    const r = await refiningSnap(request(), client, service, (u) =>
      updates.push(u),
    );
    expect(updates.map((u) => [u.source, u.provisional])).toEqual([
      ["client", true],
      ["server", false],
    ]);
    const first = updates[0]!;
    expect(first.kind).toBe("point");
    expect(Array.from(first.snapPoint)).toEqual([R, 40, 0]);
    expect(first.exact).toBe(false);
    expect(r).toBe(updates[1]);
    expect(Array.from(r!.snapPoint)).toEqual(Array.from(designB));
    expect(r!.exact).toBe(true);
    expect(r!.tileset).toBe(ts);
    // Its distance is from the cursor, on the client's camera.
    expect(r!.distance).toBeCloseTo(3 - 0.005, 6);
    // The request, as 1.x's SnapService.snap takes it.
    const [req, signal] = fn.mock.calls[0]!;
    expect(signal).toBeUndefined();
    expect(req.tileset).toBe(ts);
    expect(req.feature).toEqual({ featureId: 7, name: undefined });
    expect(req.testPoint).toBe(first.hitPoint);
    expect(req.closePoint).toBe(first.snapPoint);
    expect(req.camera).toBe(first.camera);
    expect(req.camera.width).toBe(1000);
    expect([req.canvasWidth, req.canvasHeight, req.aperture]).toEqual([
      1000, 500, 6,
    ]);
  });

  it("keeps the client snap when the server finds none", async () => {
    const client = new ClientSnapService([tileset()]);
    const { service } = server(async () => undefined);
    const updates: SnapResult[] = [];
    const r = await refiningSnap(request(), client, service, (u) =>
      updates.push(u),
    );
    expect(updates.map((u) => [u.source, u.provisional])).toEqual([
      ["client", true],
      ["client", false],
    ]);
    expect(r).toBe(updates[1]);
    expect(r!.exact).toBe(false);
    expect(Array.from(r!.snapPoint)).toEqual([R, 40, 0]);
  });

  it("keeps the client snap and warns once when the server fails", async () => {
    const ts = tileset();
    const client = new ClientSnapService([ts]);
    const { service } = server(async () => {
      throw new Error("503");
    });
    for (let i = 0; i < 2; i++) {
      const updates: SnapResult[] = [];
      const r = await refiningSnap(request(), client, service, (u) =>
        updates.push(u),
      );
      expect(updates.map((u) => u.provisional)).toEqual([true, false]);
      expect(r?.source).toBe("client");
      expect(r?.provisional).toBe(false);
    }
    expect([...ts.warnings]).toEqual([SNAP_SERVER_FAILED]);
  });

  it("treats a malformed server answer as a failure", async () => {
    const ts = tileset();
    const { service } = server(async () =>
      answer({ snapPoint: Float64Array.from([NaN, 0, 0]) }),
    );
    const r = await refiningSnap(
      request(),
      new ClientSnapService([ts]),
      service,
      () => {},
    );
    expect(r?.source).toBe("client");
    expect([...ts.warnings]).toEqual([
      `${SNAP_SERVER_REFUSED}: snapPoint is not 3 finite numbers`,
    ]);
  });

  it("keeps the client snap, with no warning, when the server answers null", async () => {
    const ts = tileset();
    const updates: SnapResult[] = [];
    const r = await refiningSnap(
      request(),
      new ClientSnapService([ts]),
      server(async () => null).service,
      (u) => updates.push(u),
    );
    expect(updates.map((u) => [u.source, u.provisional])).toEqual([
      ["client", true],
      ["client", false],
    ]);
    expect(r?.source).toBe("client");
    expect([...ts.warnings]).toEqual([]);
  });

  it("returns at once for a signal already aborted", async () => {
    const v = view();
    const pick = vi.spyOn(v, "pick");
    const onUpdate = vi.fn();
    const { service, fn } = server(async () => answer());
    const a = new AbortController();
    a.abort();
    const r = await refiningSnap(
      { view: v, x: bx + 3, y: by, aperture: 6 },
      new ClientSnapService([tileset()]),
      service,
      onUpdate,
      a.signal,
    );
    expect(r).toBeUndefined();
    expect(pick).not.toHaveBeenCalled();
    expect(fn).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("catches an onUpdate that throws, and warns once", async () => {
    const ts = tileset();
    const client = new ClientSnapService([ts]);
    const { service } = server(async () => answer());
    const onUpdate = vi.fn(() => {
      throw new Error("render failed");
    });
    for (let i = 0; i < 2; i++) {
      const r = await refiningSnap(request(), client, service, onUpdate);
      expect(r?.source).toBe("server");
    }
    expect(onUpdate).toHaveBeenCalledTimes(4);
    expect([...ts.warnings]).toEqual([SNAP_UPDATE_FAILED]);
  });

  it("keeps the client's feature, not the server's", async () => {
    const { service } = server(async () => ({
      ...answer(),
      feature: { featureId: 99, name: undefined },
    }));
    const r = await refiningSnap(
      request(),
      new ClientSnapService([tileset()]),
      service,
      () => {},
    );
    expect(r?.source).toBe("server");
    expect(r?.feature?.featureId).toBe(7);
  });

  it("accepts an exact design point a little inside the drawn mesh", async () => {
    // 10 cm behind the square's face, under the tile's 0.25 m error.
    const pl = placement();
    const snapPoint = Float64Array.from([R - 0.1, 32, 6]);
    const ts = tileset({ placement: pl });
    const r = await refiningSnap(
      { view: view(), x: 517, y: 248, aperture: 6 },
      new ClientSnapService([ts]),
      server(async () =>
        answer({
          snapPoint,
          design: designPoint(frame, pl.designOf(snapPoint), {
            how: "snap",
            tolerance: 0,
            kind: "point",
          }),
        }),
      ).service,
      () => {},
    );
    expect(r?.source).toBe("server");
    expect([...ts.warnings]).toEqual([]);
  });

  it("judges an exact point under the drawn mesh by its shown point on it", async () => {
    // 1.5 m behind the square's face, which hides it from the camera; shown
    // on the face over it. The design stays the hidden, exact point.
    const pl = placement();
    const snapPoint = Float64Array.from([R - 1.5, 32.32, 6.06]);
    const shownPoint = Float64Array.from([R, 32.32, 6.06]);
    const exactAt = (over: Partial<SnapResult>) =>
      answer({
        snapPoint,
        design: designPoint(frame, pl.designOf(snapPoint), {
          how: "snap",
          tolerance: 0,
          kind: "point",
        }),
        ...over,
      });
    const req = { view: view(), x: 517, y: 248, aperture: 6 };
    const ts = tileset({ placement: pl });
    const r = await refiningSnap(
      req,
      new ClientSnapService([ts]),
      server(async () => exactAt({ shownPoint })).service,
      () => {},
    );
    expect([...ts.warnings]).toEqual([]);
    expect(r?.source).toBe("server");
    expect(Array.from(r!.snapPoint)).toEqual(Array.from(snapPoint));
    expect(Array.from(r!.shownPoint!)).toEqual(Array.from(shownPoint));
    expect(Array.from(r!.design!.design)).toEqual(
      Array.from(pl.designOf(snapPoint)),
    );
    // The cursor's distance is to what is shown.
    const [sx, sy] = toScreen(32.32, 6.06);
    expect(r!.distance).toBeCloseTo(Math.hypot(sx - 517, sy - 248), 9);

    // Without the shown point, the same answer is hidden and refused.
    const hidden = tileset({ placement: pl });
    const refused = await refiningSnap(
      req,
      new ClientSnapService([hidden]),
      server(async () => exactAt({})).service,
      () => {},
    );
    expect(refused?.source).toBe("client");
    expect([...hidden.warnings]).toEqual([
      `${SNAP_SERVER_REFUSED}: snapPoint hidden from the camera by the drawn mesh`,
    ]);
  });

  describe("refuses a server answer that doesn't check out", () => {
    const pl = placement();
    const behind = Float64Array.from([R - 10, 32.32, 6.06]);
    const cases: Array<[string, Partial<SnapResult>, string]> = [
      [
        "exact with a tolerance",
        { exact: true, tolerance: 0.01 },
        "exact with a tolerance other than 0",
      ],
      [
        "a design not where the placement draws snapPoint",
        {
          tolerance: 0.001,
          exact: false,
          design: designPoint(frame, pl.designOf([R, 40.02, 0]), {
            how: "snap",
            tolerance: 0.001,
            kind: "point",
          }),
        },
        "design coordinates not where the placement draws snapPoint",
      ],
      [
        // Where the placement draws snapPoint, but in another frame.
        "a design in another engineering frame",
        {
          design: designPoint(
            { name: "other" } as unknown as EngineeringFrame,
            pl.designOf(designB),
            { how: "snap", tolerance: 0, kind: "point" },
          ),
        },
        "design coordinates in another engineering frame than the placement's",
      ],
      [
        "an unknown kind",
        { kind: "vertex" as SnapResult["kind"] },
        "kind is not a SnapKind",
      ],
      [
        "a non-finite normal",
        { normal: Float64Array.from([1, NaN, 0]) },
        "normal is not 3 finite numbers",
      ],
      [
        "a normal of the wrong length",
        { normal: Float64Array.from([1, 0]) },
        "normal is not 3 finite numbers",
      ],
      [
        "a curve with a non-finite point",
        { curve: [designB, Float64Array.from([R, Infinity, 0])] },
        "curve is not two or more points of 3 finite numbers",
      ],
      [
        "a curve of one point",
        { curve: [designB] },
        "curve is not two or more points of 3 finite numbers",
      ],
      [
        "a point behind the camera",
        { snapPoint: Float64Array.from([R + 2000, 0, 0]) },
        "snapPoint behind the camera or nearer than its near plane",
      ],
      [
        "a point nearer than the near plane",
        { snapPoint: Float64Array.from([R + 1000 - 0.05, 0, 0]) },
        "snapPoint behind the camera or nearer than its near plane",
      ],
      [
        "a point outside the aperture",
        { snapPoint: Float64Array.from([R, 70, 0]) },
        "snapPoint outside the aperture",
      ],
      [
        "a point the drawn mesh hides",
        { snapPoint: behind },
        "snapPoint hidden from the camera by the drawn mesh",
      ],
      [
        "a non-finite shown point",
        { shownPoint: Float64Array.from([R, NaN, 0]) },
        "shownPoint is not 3 finite numbers",
      ],
      [
        "a shown point more than SHOWN_POINT_REACH from snapPoint",
        { shownPoint: Float64Array.from([R, 40.01, SHOWN_POINT_REACH + 0.01]) },
        `shownPoint more than ${SHOWN_POINT_REACH} m from snapPoint`,
      ],
      [
        "a shown point the drawn mesh hides",
        {
          snapPoint: Float64Array.from([R - 1.5, 32.32, 6.06]),
          shownPoint: Float64Array.from([R - 1, 32.32, 6.06]),
        },
        "shownPoint hidden from the camera by the drawn mesh",
      ],
      [
        "a shown point outside the aperture, its snapPoint inside",
        {
          // 6.5 px from the cursor (inside 6 px and 1 px of slack), shown
          // 1.9 m further on, at 7.45 px.
          snapPoint: Float64Array.from([R, 47, 4]),
          shownPoint: Float64Array.from([R, 48.9, 4]),
        },
        "shownPoint outside the aperture",
      ],
    ];
    for (const [name, over, reason] of cases) {
      it(name, async () => {
        const ts = tileset({ placement: pl });
        const updates: SnapResult[] = [];
        // 3.6 px from B, inside the square on the screen.
        const r = await refiningSnap(
          { view: view(), x: 517, y: 248, aperture: 6 },
          new ClientSnapService([ts]),
          server(async () => answer(over)).service,
          (u) => updates.push(u),
        );
        expect(updates.map((u) => [u.source, u.provisional])).toEqual([
          ["client", true],
          ["client", false],
        ]);
        expect(r?.source).toBe("client");
        expect(Array.from(r!.snapPoint)).toEqual([R, 40, 0]);
        expect([...ts.warnings]).toEqual([`${SNAP_SERVER_REFUSED}: ${reason}`]);
      });
    }

    it("design coordinates on a placement with no engineering frame", async () => {
      // A DesignPlacement whose frame isn't an EngineeringFrame: it draws
      // and inverts, but gives no design points (engineeringPlacement).
      const plain = { ...pl, frame: { name: "fake" } };
      const ts = tileset({ placement: plain as unknown as TilesetPlacement });
      const r = await refiningSnap(
        { view: view(), x: 517, y: 248, aperture: 6 },
        new ClientSnapService([ts]),
        server(async () =>
          answer({
            design: designPoint(frame, pl.designOf(designB), {
              how: "snap",
              tolerance: 0,
              kind: "point",
            }),
          }),
        ).service,
        () => {},
      );
      expect(r?.source).toBe("client");
      expect(r?.design).toBeUndefined();
      expect([...ts.warnings]).toEqual([
        `${SNAP_SERVER_REFUSED}: design coordinates on a tileset without an engineering frame's placement`,
      ]);
    });
  });

  it("ignores a superseded snap's late server answer", async () => {
    const client = new ClientSnapService([tileset()]);
    const late: Array<(r: SnapResult) => void> = [];
    const signals: AbortSignal[] = [];
    // A server that ignores the signal and answers whenever it likes.
    const { service } = server(
      (_req, signal) =>
        new Promise((resolve) => {
          signals.push(signal!);
          late.push(resolve);
        }),
    );
    const first: SnapResult[] = [];
    const second: SnapResult[] = [];
    const a = new AbortController();
    const one = refiningSnap(
      request(),
      client,
      service,
      (u) => first.push(u),
      a.signal,
    );
    await vi.waitFor(() => expect(late).toHaveLength(1));
    // A newer snap supersedes it: the caller aborts the older one.
    a.abort();
    const b = new AbortController();
    const two = refiningSnap(
      request(),
      client,
      service,
      (u) => second.push(u),
      b.signal,
    );
    await vi.waitFor(() => expect(late).toHaveLength(2));
    expect(signals[0]!.aborted).toBe(true);
    expect(signals[1]!.aborted).toBe(false);
    late[1]!(answer());
    late[0]!(answer({ kind: "segment" }));
    const [r1, r2] = await Promise.all([one, two]);
    expect(first.map((u) => [u.source, u.provisional])).toEqual([
      ["client", true],
    ]);
    expect(r1?.source).toBe("client");
    expect(r1?.provisional).toBe(false);
    expect(second.map((u) => u.source)).toEqual(["client", "server"]);
    expect(r2?.kind).toBe("point");
  });

  it("gives the client snap, not provisional, without a server", async () => {
    const updates: SnapResult[] = [];
    const r = await refiningSnap(
      request(),
      new ClientSnapService([tileset()]),
      undefined,
      (u) => updates.push(u),
    );
    expect(updates).toHaveLength(1);
    expect(r).toBe(updates[0]);
    expect(r?.source).toBe("client");
    expect(r?.provisional).toBe(false);
  });

  it("asks no server for a snap off the listed tilesets", async () => {
    const { service, fn } = server(async () => answer());
    const updates: SnapResult[] = [];
    const r = await refiningSnap(
      request(),
      new ClientSnapService([tileset({ owns: false })]),
      service,
      (u) => updates.push(u),
    );
    expect(fn).not.toHaveBeenCalled();
    expect(r?.kind).toBe("surface");
    expect(updates.map((u) => u.provisional)).toEqual([false]);
  });

  it("resolves undefined over the sky, with no update", async () => {
    const onUpdate = vi.fn();
    const r = await refiningSnap(
      { view: view({ sky: true }), x: 1, y: 1, aperture: 6 },
      new ClientSnapService([tileset()]),
      server(async () => answer()).service,
      onUpdate,
    );
    expect(r).toBeUndefined();
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

function expectPixel(p: Float64Array | undefined, x: number, y: number) {
  expect(p).toHaveLength(2);
  expect(p![0]).toBeCloseTo(x, 9);
  expect(p![1]).toBeCloseTo(y, 9);
}

/** A draw of `triangles` (local metres, nine per triangle) at (R, 0, 0). */
function soup(triangles: number[]): TileGeometry {
  const matrix = m4.mat4();
  matrix[12] = R;
  return {
    draw: DRAW,
    positions: new Float32Array(triangles),
    indices: Uint32Array.from(
      triangles.slice(0, triangles.length / 3),
      (_, i) => i,
    ),
    matrix,
  };
}

describe("ClientSnapService: what the camera can't see", () => {
  // The front square of geometry() (A, B, C, D at x = R, 2 m per px) and,
  // 100 m behind it (2.2 m per px), a triangle whose first vertex shows at
  // (517, 232): inside the square, hidden by it.
  const front = [0, 0, 0, 0, 40, 0, 0, 40, 40, 0, 0, 0, 0, 40, 40, 0, 0, 40];
  const hiddenAt = [517, 232] as const;
  const back = (dy: number, dz: number) => {
    const y = (hiddenAt[0] - 500) * 2.2,
      z = (250 - hiddenAt[1]) * 2.2;
    return [-100, y, z, -100, y + dy, z, -100, y + dy, z + dz];
  };

  it("passes over a hidden vertex for the visible one behind it on the screen", async () => {
    const ts = tileset({
      placement: placement(),
      geometry: soup([...front, ...back(40, 40)]),
    });
    // 1 px from the hidden vertex, 2.8 px from D at (520, 230).
    const r = await new ClientSnapService([ts]).snap({
      view: view(),
      x: hiddenAt[0] + 1,
      y: hiddenAt[1],
      aperture: 6,
    });
    expect(r?.kind).toBe("point");
    expect(Array.from(r!.snapPoint)).toEqual([R, 40, 40]);
    expect(r!.distance).toBeCloseTo(Math.hypot(2, 2), 6);
    expect(r!.design!.obtained!.kind).toBe("point");
  });

  it("gives the surface when everything near the cursor is hidden", async () => {
    // An 80 m square in front, (500..540, 210..250) on the screen, and
    // behind it a small triangle at (520, 218), (524, 218) and (520, 214),
    // all hidden. The square's corners and edges (its diagonal x + y = 750
    // too) are more than 6 px from the cursor.
    const big = front.map((c) => c * 2);
    const y = 20 * 2.2,
      z = 32 * 2.2;
    const geometry = soup([
      ...big,
      ...[-100, y, z, -100, y + 8.8, z, -100, y, z + 8.8],
    ]);
    const r = await new ClientSnapService([
      tileset({ placement: placement(), geometry }),
    ]).snap({ view: view(), x: 521, y: 218, aperture: 6 });
    expect(r?.kind).toBe("surface");
    expect(Array.from(r!.snapPoint)).toEqual(Array.from(under(521, 218)));
    expect(r!.design!.obtained!.kind).toBe("surface");
  });

  it("still snaps to a road's edge 3 px away, seen 2 m above it", async () => {
    // A road 10 m wide from 10 m to 210 m ahead, in the plane x = R, and the
    // camera 2 m above it looking at a point 50 m ahead.
    const road = [
      0, -5, 10, 0, 5, 10, 0, 5, 210, 0, -5, 10, 0, 5, 210, 0, -5, 210,
    ];
    const aim = (c: Camera) => {
      c.position.set([R + 2, 0, 0]);
      c.fov = Math.PI / 2;
      c.direction.set([-2 / Math.hypot(2, 50), 0, 50 / Math.hypot(2, 50)]);
      c.orient(Float64Array.from([1, 0, 0]));
    };
    const camera = new Camera();
    aim(camera);
    const shown = new Float64Array(2);
    const pose = {
      position: camera.position,
      direction: camera.direction,
      up: camera.up,
      right: camera.right,
    };
    projectToPixel(pose, camera.fovy(2), 1000, 500, [R, 5, 50], shown);
    // 3 px toward the road's middle (the edge y = 5 shows to one side).
    const side = Math.sign(shown[0]! - 500);
    const x = shown[0]! - 3 * side,
      y = shown[1]!;
    const r = await new ClientSnapService([
      tileset({ geometry: soup(road) }),
    ]).snap({ view: view({ aim }), x, y, aperture: 6 });
    expect(r?.kind).toBe("segment");
    expect(r!.distance).toBeLessThanOrEqual(3 + 1e-9);
    expect(r!.snapPoint[0]).toBeCloseTo(R, 6);
    expect(r!.snapPoint[1]).toBeCloseTo(5, 6);
    // The 3D point is where the screen's nearest point shows.
    const at = new Float64Array(2);
    projectToPixel(pose, camera.fovy(2), 1000, 500, r!.snapPoint, at);
    expect(Math.hypot(at[0]! - x, at[1]! - y)).toBeCloseTo(r!.distance, 6);
    // The camera sees the road from above: the normal is up.
    expect(r!.normal![0]).toBeCloseTo(1, 9);
  });

  it("ignores vertices nearer than the camera's near plane", async () => {
    // A triangle 5 cm in front of the camera, its vertex under the cursor.
    const ts = tileset({
      geometry: soup([
        999.95,
        0,
        0,
        999.95,
        0.01,
        0,
        999.95,
        0,
        0.01,
        ...front,
      ]),
    });
    const r = await new ClientSnapService([ts]).snap({
      view: view(),
      x: 500,
      y: 250,
      aperture: 6,
    });
    // A (500, 250) of the square, not the triangle in front of the lens.
    expect(r?.kind).toBe("point");
    expect(Array.from(r!.snapPoint)).toEqual([R, 0, 0]);
  });
});

describe("View.toPixel", () => {
  function realView(target: OffscreenTarget | CanvasTarget): View {
    const v = new View({ target, world: {} as World });
    v.camera.position.set([R + 1000, 0, 0]);
    v.camera.direction.set([-1, 0, 0]);
    v.camera.orient(Float64Array.from([0, 0, 1]));
    v.camera.fov = Math.PI / 2;
    return v;
  }

  it("gives CSS pixels from the view's top-left", () => {
    const v = realView(new OffscreenTarget(1000, 500));
    expectPixel(v.toPixel([R, 40, -20]), 520, 260);
    // The viewport's offset within the target doesn't move it.
    v.viewport = { x: 0.5, y: 0, width: 0.5, height: 1 };
    // 500 × 500: aspect 1, fovy 90°: 1 px is 4 m at 1000 m.
    expectPixel(v.toPixel([R, 40, -20]), 260, 255);
  });

  it("divides by the canvas's pixel ratio", () => {
    const canvas = { width: 2000, height: 1000, clientWidth: 1000 };
    const v = realView(
      new CanvasTarget(canvas as unknown as HTMLCanvasElement, {
        pixelRatio: 2,
      }),
    );
    expectPixel(v.toPixel([R, 40, -20]), 520, 260);
  });

  it("is undefined behind the camera and nearer than the near plane", () => {
    const v = realView(new OffscreenTarget(1000, 500));
    expect(v.camera.near).toBe(0.1);
    expect(v.toPixel([R + 1000 - 0.05, 0, 0])).toBeUndefined();
    expect(v.toPixel([R + 1000 - 0.2, 0, 0])).toBeDefined();
    expect(v.toPixel([R + 2000, 0, 0])).toBeUndefined();
    expect(v.toPixel([R + 1000, 5, 0])).toBeUndefined();
  });
});

// ------------------------------------------------- Tileset3D.retainGeometry

const BASE = "https://tiles.test/snap/";
const URL_ = `${BASE}tileset.json`;

/** Two triangles, one draw, the default material. */
function square(): GltfAsset {
  return {
    meshes: [
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 3, 0, 3, 2]),
      },
    ],
    materials: [],
    textures: [],
    images: [],
    draws: [{ mesh: 0, material: -1, matrix: m4.mat4() }],
    featureTables: [],
    warnings: [],
  };
}

const TILESET = {
  asset: { version: "1.1" },
  geometricError: 100,
  root: {
    geometricError: 0,
    refine: "REPLACE",
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R, 0, 0, 1],
    boundingVolume: { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] },
    content: { uri: "tile.gltf" },
  },
};

function selectionView(): SelectionView {
  return {
    id: 0,
    position: new Float64Array([R + 1000, 0, 0]),
    direction: new Float64Array([-1, 0, 0]),
    cartographic: { longitude: 0, latitude: 0, height: 1000 },
    planes: new Float64Array(0),
    sseDenominator: 2 * Math.tan(Math.PI / 6),
    height: 1000,
  };
}

describe("Tileset3D.retainGeometry", () => {
  let engine: Engine;
  /** What the tile's content decodes to. */
  let content = square;
  afterEach(() => (content = square));
  beforeAll(async () => {
    engine = await fakeEngine();
    vi.spyOn(engine, "loadGltf").mockImplementation(async () => content());
  });
  afterEach(() => vi.unstubAllGlobals());

  async function loaded(retainGeometry?: boolean) {
    vi.stubGlobal("fetch", async (input: string | URL) =>
      String(input) === URL_
        ? new Response(JSON.stringify(TILESET), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("not found", { status: 404 }),
    );
    const world = engine.createWorld();
    const tileset = await Tileset3D.load(engine, world, URL_, {
      cacheBytes: 0,
      ...(retainGeometry !== undefined && { retainGeometry }),
    });
    const tile = tileset.root;
    for (let i = 0; i < 100 && tile.state !== "ready"; i++) {
      tileset.update([selectionView()]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(tile.state).toBe("ready");
    return { tileset, tile, world };
  }

  it("keeps a mesh drawn by two nodes once", async () => {
    content = () => {
      const asset = square();
      const moved = m4.mat4();
      moved[12] = 3;
      asset.draws.push({ mesh: 0, material: -1, matrix: moved });
      return asset;
    };
    const off = await loaded(false);
    const { tileset, tile } = await loaded(true);
    const [a, b] = tile.geometry!;
    expect(tile.geometry).toHaveLength(2);
    expect(b!.positions).toBe(a!.positions);
    expect(b!.indices).toBe(a!.indices);
    expect(b!.matrix).not.toEqual(a!.matrix);
    expect(tile.bytes).toBe(
      off.tile.bytes + a!.positions.byteLength + a!.indices.byteLength,
    );
    off.tileset.destroy();
    tileset.destroy();
  });

  it("keeps nothing by default", async () => {
    const { tileset, tile } = await loaded();
    expect(tileset.retainGeometry).toBe(false);
    expect(tile.geometry).toBeUndefined();
    tileset.destroy();
  });

  it("keeps each draw's triangles and world matrix, released on unload and destroy", async () => {
    const { tileset, tile, world } = await loaded(true);
    expect(tileset.retainGeometry).toBe(true);
    const [g, ...rest] = tile.geometry!;
    expect(rest).toEqual([]);
    expect(g!.draw).toEqual(tile.placement!.draws[0]);
    expect(Array.from(g!.positions)).toEqual(
      Array.from(square().meshes[0]!.positions),
    );
    expect(Array.from(g!.indices)).toEqual([0, 1, 3, 0, 3, 2]);
    expect(Array.from(g!.matrix)).toEqual(
      Array.from(world.drawMatrix(g!.draw)!),
    );
    // 3D Tiles y-up content, at the root transform's (R, 0, 0).
    expect(g!.matrix[12]).toBe(R);
    // The retained bytes count in the tile and the cache, not in uploads.
    const off = await loaded(false);
    expect(tile.bytes).toBe(
      off.tile.bytes + g!.positions.byteLength + g!.indices.byteLength,
    );
    expect(tileset.stats.bytes).toBe(tile.bytes);
    expect(tileset.stats.bytesTotal).toBe(off.tileset.stats.bytesTotal);
    off.tileset.destroy();

    // A changed modelMatrix moves the retained matrix with the draw.
    const moved = m4.mat4();
    moved[14] = 5;
    tileset.modelMatrix = moved;
    expect(g!.matrix[14]).toBe(5);
    expect(Array.from(g!.matrix)).toEqual(
      Array.from(world.drawMatrix(g!.draw)!),
    );

    // Unloaded over a zero budget: the geometry goes with it.
    tileset.update([]);
    expect(tile.state).toBe("unloaded");
    expect(tile.geometry).toBeUndefined();
    expect(world.drawMatrix(g!.draw)).toBeUndefined();

    for (let i = 0; i < 100 && tile.state !== "ready"; i++) {
      tileset.update([selectionView()]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(tile.geometry).toHaveLength(1);
    tileset.destroy();
    expect(tile.geometry).toBeUndefined();
  });
});
