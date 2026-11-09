// Engine bug 3: the frames explorer's white view after a canvas squeezed to
// 0 width and back. A 0-wide canvas draws at 1 pixel across (`CanvasTarget`),
// and two things went wrong there.
//
// The meter read that one column: at the view's center, in a view half full
// of a sunlit Earth, stars alone, and the eye opened toward them (scale about
// 5, against 0.000013). Back at full width the first frame was white, and the
// next reading closed the eye in one step, which asked for no frame (see
// test/exposureAdapt.test.ts): white, at "settled", until reloaded. A column
// says nothing of the view: it isn't metered.
//
// A second view on that canvas (the explorer's gap inset) rounded to x = 1,
// width 0: a texture of no size, every frame rejected by the GPU.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as v3 from "../src/math/vec3.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { EYE, type View } from "../src/scene/View.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;

interface EngineInternals {
  meters: unknown[];
}

describe("a view on a canvas squeezed to 1 pixel", () => {
  let engine: Engine;

  beforeEach(async () => {
    engine = await fakeEngine();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function addView(width: number, height: number): View {
    const view = engine.addView({
      target: new OffscreenTarget(width, height),
      world: engine.createWorld(),
      exposure: EYE,
    });
    view.camera.lookAt(v3.vec3(R, 0, 0), 0, -Math.PI / 2, 100);
    return view;
  }

  const metered = (view: View) => {
    const meters = (engine as unknown as EngineInternals).meters;
    let count = 0;
    meters.push = () => ++count;
    engine.renderFrame();
    expect(view.autoExposure?.pending ?? false).toBe(count > 0);
    return count;
  };

  it("meters a view of ordinary size", () => {
    expect(metered(addView(64, 36))).toBe(1);
  });

  it.each([
    [1, 540],
    [540, 1],
    [1, 1],
  ])("doesn't meter a %d × %d view", (width, height) => {
    expect(metered(addView(width, height))).toBe(0);
  });

  it.each([
    [{ x: 0.58, y: 0.35, width: 0.39, height: 0.23 }, 1, 540],
    [{ x: 0.35, y: 0.58, width: 0.23, height: 0.39 }, 540, 1],
    [{ x: 0.99, y: 0.99, width: 0.01, height: 0.01 }, 1, 1],
    [{ x: 0.7, y: 0.02, width: 0.28, height: 0.3 }, 3, 2],
  ])(
    "a viewport %o in a %d × %d target keeps a pixel inside it",
    (viewport, width, height) => {
      const view = addView(width, height);
      view.viewport = viewport;
      const r = view.pixelRect();
      expect(r.width).toBeGreaterThanOrEqual(1);
      expect(r.height).toBeGreaterThanOrEqual(1);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(width);
      expect(r.y + r.height).toBeLessThanOrEqual(height);
    },
  );
});
