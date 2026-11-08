import { describe, expect, it, vi } from "vitest";
import { Camera } from "../src/scene/Camera.ts";
import { EARTH } from "../src/scene/Body.ts";
import {
  DESIGN_NOT_INVERTED,
  pickDesign,
  pickInFrame,
  type PickView,
} from "../src/engineering/pick.ts";
import type { CorePick } from "../src/scene/pick.ts";
import type { DrawHandle } from "../src/scene/World.ts";
import type { View } from "../src/scene/View.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";
import type { TilesetPlacement } from "../src/engineering/placement.ts";
import { EngineeringFrame } from "../src/engineering/EngineeringFrame.ts";

// An EngineeringFrame to `instanceof` (engineeringPlacement), with only what is read.
const frame = Object.assign(Object.create(EngineeringFrame.prototype), {
  name: "fake",
}) as EngineeringFrame;
const DRAW = { index: 3, generation: 1 } as unknown as DrawHandle;
const HIT = new Float64Array([6378137, 0, 100]);

function placement(mode: "rigid" | "reprojected"): TilesetPlacement {
  return {
    mode,
    frameName: "fake",
    frame,
    displayed: (d) => Float64Array.from(d),
    designOf: vi.fn((p: ArrayLike<number>) =>
      Float64Array.from([p[0]! - 1, p[1]! + 2, p[2]! + 3]),
    ),
    displayError: () => 0,
  };
}

function tileset(opts: {
  owns?: boolean;
  placement?: TilesetPlacement;
  destroyed?: boolean;
  /** Center of the hit tile's sphere; default is the hit. */
  center?: number[];
}): Tileset3D {
  return {
    placement: opts.placement,
    warnings: new Set<string>(),
    tileOfDraw: (d: { index: number }) =>
      (opts.owns ?? true) && d.index === DRAW.index
        ? ({
            volume: {
              kind: "sphere",
              sphere: {
                center: Float64Array.from(opts.center ?? [6378137, 0, 100]),
                radius: 50,
              },
            },
            contentVolume: undefined,
          } as never)
        : undefined,
    isDestroyed: () => opts.destroyed ?? false,
  } as unknown as Tileset3D;
}

function view(
  o: {
    hit?: Float64Array | undefined;
    feature?: boolean;
    ratio?: number;
    camera?: [number, number, number];
    rect?: { width: number; height: number };
    fov?: number;
    /** Runs when a pick is issued (to move the camera mid-flight). */
    onPick?: (camera: Camera, call: number) => void;
  } = {},
) {
  const camera = new Camera();
  camera.position.set(o.camera ?? [6378137 + 1000, 0, 100]);
  camera.fov = o.fov ?? Math.PI / 2;
  let calls = 0;
  const pick = vi.fn(async () => {
    o.onPick?.(camera, calls++);
    return o.feature === false ? undefined : { featureId: 7, name: undefined };
  });
  const pickPosition = vi.fn(async () =>
    "hit" in o ? o.hit : new Float64Array(HIT),
  );
  const v: PickView = {
    pick,
    pickPosition,
    body: EARTH,
    camera,
    target: { kind: "canvas", width: 1000, pixelRatio: o.ratio ?? 1 },
    pixelRect: () => o.rect ?? { width: 1000, height: 500 },
    world: { feature: () => ({ draw: DRAW }) },
  };
  return { v, pick, pickPosition, camera };
}

describe("pickDesign", () => {
  it("converts CSS pixels to target pixels by the pixel ratio", async () => {
    const { v, pick, pickPosition } = view({ ratio: 2 });
    await pickDesign(v, 10, 20, []);
    expect(pick).toHaveBeenCalledWith(20, 40);
    expect(pickPosition).toHaveBeenCalledWith(20, 40);
  });

  for (const mode of ["rigid", "reprojected"] as const) {
    it(`gives design coordinates on a ${mode} tileset's draw`, async () => {
      const pl = placement(mode);
      const ts = tileset({ placement: pl });
      const { v } = view();
      const r = await pickDesign(v, 5, 5, [ts]);
      expect(r?.tileset).toBe(ts);
      expect(r?.feature?.featureId).toBe(7);
      expect(r?.body).toBe(EARTH);
      expect(Array.from(r!.position)).toEqual(Array.from(HIT));
      // 1000 m away (camera at x+1000, hit at x), aspect 2, fov 90 deg at
      // aspect 2 gives fovy = 2 atan(1/2); footprint = d * 2 tan(fovy/2) / 500
      const fovy = 2 * Math.atan(0.5);
      const tol = (1000 * 2 * Math.tan(fovy / 2)) / 500;
      expect(r!.tolerance).toBeCloseTo(tol, 9);
      expect(tol).toBeCloseTo(2, 9);
      expect(Array.from(r!.design!.design)).toEqual(
        Array.from(pl.designOf(HIT)),
      );
      expect(r!.design!.engineeringFrame).toBe(frame);
      expect(r!.design!.obtained).toEqual({
        how: "pick",
        tolerance: r!.tolerance,
      });
    });
  }

  it("divides the target height by the pixel ratio for the footprint", async () => {
    const { v } = view({ ratio: 2, rect: { width: 2000, height: 1000 } });
    const r = await pickDesign(v, 5, 5, []);
    expect(r!.tolerance).toBeCloseTo(2, 9);
  });

  it("returns undefined over the sky", async () => {
    const { v } = view({ hit: undefined });
    expect(
      await pickDesign(v, 1, 1, [tileset({ placement: placement("rigid") })]),
    ).toBeUndefined();
  });

  it("gives the true values without design when the placement can't invert the hit", async () => {
    const pl = placement("reprojected");
    pl.designOf = () => {
      throw new RangeError(
        "PROJ cannot transform (1, 2, 3): outside the operation's domain",
      );
    };
    const ts = tileset({ placement: pl });
    const r = await pickDesign(view().v, 5, 5, [ts]);
    expect(r?.tileset).toBe(ts);
    expect(r?.feature?.featureId).toBe(7);
    expect(Array.from(r!.position)).toEqual(Array.from(HIT));
    expect(r!.tolerance).toBeGreaterThan(0);
    expect(r?.design).toBeUndefined();
    expect([...ts.warnings]).toEqual([DESIGN_NOT_INVERTED]);
    // Once, however often it happens.
    await pickDesign(view().v, 5, 5, [ts]);
    expect(ts.warnings.size).toBe(1);
  });

  it("gives no design for a tileset without a placement", async () => {
    const ts = tileset({});
    const r = await pickDesign(view().v, 1, 1, [ts]);
    expect(r?.tileset).toBe(ts);
    expect(r?.design).toBeUndefined();
  });

  it("gives neither tileset nor design for a draw of an unlisted tileset", async () => {
    const other = tileset({ owns: false, placement: placement("rigid") });
    const r = await pickDesign(view().v, 1, 1, [other]);
    expect(r?.tileset).toBeUndefined();
    expect(r?.design).toBeUndefined();
    expect(r?.feature?.featureId).toBe(7);
    expect(r?.position).toBeDefined();
  });

  it("skips a destroyed tileset and a hit with no feature", async () => {
    const dead = tileset({ destroyed: true, placement: placement("rigid") });
    expect((await pickDesign(view().v, 1, 1, [dead]))?.design).toBeUndefined();
    const r = await pickDesign(view({ feature: false }).v, 1, 1, [
      tileset({ placement: placement("rigid") }),
    ]);
    expect(r?.tileset).toBeUndefined();
    expect(r?.design).toBeUndefined();
  });
});

describe("pickDesign, one frame", () => {
  const ts = () => tileset({ placement: placement("rigid") });

  it("retries once when the camera moved, then answers", async () => {
    const { v, pick } = view({
      onPick: (c, call) => {
        if (call === 0) {
          c.version++;
        }
      },
    });
    const r = await pickDesign(v, 1, 1, [ts()]);
    expect(pick).toHaveBeenCalledTimes(2);
    expect(r?.design).toBeDefined();
  });

  it("returns the position alone when the camera keeps moving", async () => {
    const { v, pick } = view({ onPick: (c) => c.version++ });
    const r = await pickDesign(v, 1, 1, [ts()]);
    expect(pick).toHaveBeenCalledTimes(2);
    expect(r?.position).toBeDefined();
    expect(r?.tileset).toBeUndefined();
    expect(r?.feature).toBeUndefined();
    expect(r?.design).toBeUndefined();
  });

  it("notices a camera moved without a version bump", async () => {
    const { v } = view({
      onPick: (c) => {
        c.position[1] = c.position[1]! + 1;
      },
    });
    const r = await pickDesign(v, 1, 1, [ts()]);
    expect(r?.design).toBeUndefined();
  });

  it("gives no design when the position is outside the hit tile", async () => {
    const far = tileset({
      placement: placement("rigid"),
      center: [6378137 + 500, 0, 100],
    });
    const r = await pickDesign(view().v, 1, 1, [far]);
    expect(r?.tileset).toBe(far);
    expect(r?.design).toBeUndefined();
  });

  it("computes the tolerance from the camera of the position's frame", async () => {
    const { v } = view({
      onPick: (c, call) =>
        (c.position[0] = 6378137 + (call === 0 ? 5000 : 9000)),
    });
    // The camera moves during both attempts: the second snapshot saw 5000 m,
    // the camera ends 9000 m away; the tolerance is the snapshot's.
    const r = await pickDesign(v, 1, 1, [ts()]);
    expect(r!.tolerance).toBeCloseTo(
      (5000 * 2 * Math.tan(Math.atan(0.5))) / 500,
      9,
    );
  });
});

describe("pickDesign on View.pickPoint", () => {
  /**
   * `view()`'s fake with a `pickPoint` that answers `HIT` from one tick:
   * the camera it was read with is `camera` (in the hit anchor's
   * coordinates), whatever the view's own camera says now.
   */
  function pointView(
    o: {
      hit?: Float64Array | undefined;
      feature?: boolean;
      ratio?: number;
      camera?: [number, number, number];
      rect?: { width: number; height: number };
    } = {},
  ) {
    const fake = view(o);
    const ratio = o.ratio ?? 1;
    const rect = o.rect ?? { width: 1000, height: 500 };
    const eye = Float64Array.from(o.camera ?? [6378137 + 1000, 0, 100]);
    const at = new Camera();
    at.position.set(eye);
    at.fov = Math.PI / 2;
    const pickPoint = vi.fn(async (): Promise<CorePick | undefined> => {
      const hit = "hit" in o ? o.hit : new Float64Array(HIT);
      if (hit === undefined) {
        return undefined;
      }
      return {
        view: fake.v as unknown as View,
        // Render space is elsewhere (a rig on another reference frame).
        position: Float64Array.from([1, 2, 3]),
        root: { name: "render root" },
        anchor: undefined,
        anchorPosition: hit,
        draw: o.feature === false ? undefined : DRAW,
        feature:
          o.feature === false ? undefined : { featureId: 7, name: undefined },
        seconds: 0,
        camera: {
          position: eye,
          direction: Float64Array.from(at.direction),
          up: Float64Array.from(at.up),
          right: Float64Array.from(at.right),
          fovy: at.fovy(rect.width / rect.height),
          near: at.near,
          width: rect.width / ratio,
          height: rect.height / ratio,
        },
      };
    });
    const v: PickView = { ...fake.v, pickPoint };
    return { ...fake, v, pickPoint };
  }

  it("gives what the two-read path gives, with the camera it read", async () => {
    const pl = placement("rigid");
    const ts = tileset({ placement: pl });
    const before = await pickInFrame(view().v, 5, 5, [ts]);
    const { v, pick, pickPosition, pickPoint } = pointView();
    const after = await pickInFrame(v, 5, 5, [ts]);
    expect(pickPoint).toHaveBeenCalledTimes(1);
    expect(pick).not.toHaveBeenCalled();
    expect(pickPosition).not.toHaveBeenCalled();
    expect(after!.pick).toEqual(before!.pick);
    expect(after!.draw).toEqual(before!.draw);
    expect(after!.tile).toEqual(before!.tile);
    expect(after!.camera).toEqual(before!.camera);
  });

  it("converts CSS pixels to target pixels by the pixel ratio", async () => {
    const { v, pickPoint } = pointView({
      ratio: 2,
      rect: { width: 2000, height: 1000 },
    });
    const r = await pickDesign(v, 10, 20, []);
    expect(pickPoint).toHaveBeenCalledWith(20, 40);
    expect(r!.tolerance).toBeCloseTo(2, 9);
  });

  it("takes the eye from the pick's camera, never the view's camera now", async () => {
    // The view's camera has moved on (or is in render space): 5000 m.
    const { v, camera } = pointView();
    camera.position[0] = 6378137 + 5000;
    camera.version++;
    const r = await pickDesign(v, 1, 1, [
      tileset({ placement: placement("rigid") }),
    ]);
    // 1000 m from the hit, as read: no retry, the design kept.
    expect(r!.tolerance).toBeCloseTo(2, 9);
    expect(r!.design).toBeDefined();
    expect(r!.feature?.featureId).toBe(7);
  });

  it("returns undefined over the sky, and no tileset without a draw", async () => {
    expect(
      await pickDesign(pointView({ hit: undefined }).v, 1, 1, []),
    ).toBeUndefined();
    const r = await pickDesign(pointView({ feature: false }).v, 1, 1, [
      tileset({ placement: placement("rigid") }),
    ]);
    expect(r?.tileset).toBeUndefined();
    expect(r?.design).toBeUndefined();
    expect(Array.from(r!.position)).toEqual(Array.from(HIT));
  });
});

/** Compile-time only: a real View is a PickView. */
export type ViewIsPickView = View extends PickView ? true : never;
export const viewIsPickView: ViewIsPickView = true;
