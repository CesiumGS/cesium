// The frames module's pick interpreter (plan 5a, Task 15; spec section
// 7.9): a core pick turned into a point tagged with its reference frame,
// its body, its body-fixed position, design coordinates where the content
// has a placement, and the composed accuracy. Closes plan 3's R8.
import { beforeAll, describe, expect, it } from "vitest";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { frameTransform } from "../src/frames/Frame.ts";
import { framePoint } from "../src/frames/local.ts";
import { createFramesPickInterpreter } from "../src/frames/pickInterpreter.ts";
import { pointAccuracy } from "../src/frames/pointAccuracy.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import type { FrameKey } from "../src/camera/frameResolver.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import type { CorePick } from "../src/scene/pick.ts";
import { OffscreenTarget, View } from "../src/scene/View.ts";
import type { AnchorHandle, DrawHandle, World } from "../src/scene/World.ts";
import type { DesignPlacement } from "../src/streaming/designPlacement.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const SECONDS = Date.UTC(2026, 2, 20, 14, 3, 7, 250) / 1000;
/** An Earth-fixed point on the ground (m). */
const POINT = [R + 10, 20, 30];

const catalog = createFrameCatalog();
const resolver = createFramesResolver(catalog);
const itrf = catalog.get("ITRF");
const gcrf = catalog.get("GCRF");
const instant = resolver.instant(SECONDS);

let engine: Engine;
let world: World;
let earth: AnchorHandle;
let view: View;
let site: DrawHandle;
let other: DrawHandle;

/** A site grid 10 m east of nothing: design = body-fixed minus (R, 0, 0). */
const placement: DesignPlacement = {
  mode: "rigid",
  frameName: "site grid",
  displayed: (d, out = new Float64Array(3)) => {
    out.set([d[0]! + R, d[1]!, d[2]!]);
    return out;
  },
  designOf: (p, out = new Float64Array(3)) => {
    out.set([p[0]! - R, p[1]!, p[2]!]);
    return out;
  },
  displayError: () => 0,
};

beforeAll(async () => {
  engine = await fakeEngine();
  world = engine.createWorld({ maxDraws: 8 });
  earth = world.bodyAnchor(EARTH);
  const mesh = world.addMesh(createBox());
  site = world.addDraw({
    mesh,
    origin: Float64Array.of(R, 0, 0),
    parent: earth,
  });
  other = world.addDraw({
    mesh,
    origin: Float64Array.of(R, 0, 0),
    parent: earth,
  });
  view = new View({ target: new OffscreenTarget(64, 48), world });
});

/** `m · p` for a column-major matrix. */
function apply(m: Float64Array, p: ArrayLike<number>): Float64Array {
  return Float64Array.from(
    [0, 1, 2],
    (i) => m[i]! * p[0]! + m[4 + i]! * p[1]! + m[8 + i]! * p[2]! + m[12 + i]!,
  );
}

/**
 * A core pick of `POINT` under the Earth's anchor (or, with `under`
 * `"none"`, under no anchor), with `root` as the render root.
 */
function corePick(
  root: FrameKey,
  draw: DrawHandle | undefined,
  under: "earth" | "none" = "earth",
): CorePick {
  const anchor = under === "earth" ? earth : undefined;
  const anchorPosition = Float64Array.from(POINT);
  const position = anchor
    ? apply(
        resolver.resolve(anchor, root, SECONDS, new Float64Array(16)),
        POINT,
      )
    : Float64Array.from(POINT);
  return {
    view,
    position,
    root,
    anchor,
    anchorPosition,
    draw,
    feature: undefined,
    seconds: SECONDS,
    camera: {
      position: Float64Array.of(R + 1000, 0, 0),
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

describe("createFramesPickInterpreter", () => {
  const interpreter = createFramesPickInterpreter(resolver, catalog, {
    placements: (draw) => (draw.index === site.index ? placement : undefined),
  });

  it("tags a pick under the Earth's anchor with ITRF, the Earth, its body-fixed position and its composed accuracy", () => {
    const point = interpreter.interpret(corePick(gcrf, other))!;
    expect(point.frame).toBe(itrf);
    expect(point.body).toBe(EARTH);
    expect(Array.from(point.bodyFixed!)).toEqual(POINT);
    // Composed along the route the pick was drawn through: ITRF to the
    // render root (GCRF), each edge's stated accuracy at the point.
    const composed = pointAccuracy(framePoint(itrf, POINT, instant), gcrf);
    expect(point.accuracy).toEqual(composed);
    expect(point.accuracy.terms.length).toBeGreaterThan(0);
    expect(point.accuracy.meters).toBeGreaterThan(0);
    expect(point.design).toBeUndefined();
  });

  it("gives the point in any reference frame: in(GCRF) is frameTransform of the body-fixed point", () => {
    const point = interpreter.interpret(corePick(gcrf, other))!;
    const m = frameTransform(itrf, gcrf, instant);
    expect(Array.from(point.in(gcrf))).toEqual(Array.from(apply(m, POINT)));
    expect(Array.from(point.in(itrf))).toEqual(POINT);
    // The render-space position is the GCRF one, to rounding.
    const rendered = corePick(gcrf, other).position;
    const there = point.in(gcrf);
    expect(
      Math.hypot(
        there[0]! - rendered[0]!,
        there[1]! - rendered[1]!,
        there[2]! - rendered[2]!,
      ),
    ).toBeLessThan(1e-6);
  });

  it("a hit on content with a placement carries design coordinates; one without carries none", () => {
    const placed = interpreter.interpret(corePick(gcrf, site))!;
    expect(placed.design?.placement).toBe(placement);
    expect(Array.from(placed.design!.coordinates)).toEqual([10, 20, 30]);
    expect(
      interpreter.interpret(corePick(gcrf, other))!.design,
    ).toBeUndefined();
    // Without the option, never.
    const bare = createFramesPickInterpreter(resolver, catalog);
    expect(bare.interpret(corePick(gcrf, site))!.design).toBeUndefined();
  });

  it("on the default rig (render space Earth-fixed) the route is empty: no terms, 0 m", () => {
    const point = interpreter.interpret(corePick(world.root, site))!;
    expect(point.frame).toBe(itrf);
    expect(point.accuracy.terms).toEqual([]);
    expect(point.accuracy.meters).toBe(0);
    expect(Array.from(point.design!.coordinates)).toEqual([10, 20, 30]);
  });

  it("content under no anchor is in the render root's reference frame; with none to name, no answer", () => {
    const loose = interpreter.interpret(corePick(gcrf, undefined, "none"))!;
    expect(loose.frame).toBe(gcrf);
    expect(loose.body).toBeUndefined();
    expect(loose.bodyFixed).toBeUndefined();
    expect(Array.from(loose.in(gcrf))).toEqual(POINT);
    expect(
      interpreter.interpret(corePick(world.root, undefined, "none")),
    ).toBeUndefined();
  });

  it("a placement that can't invert the hit gives the true values without design", () => {
    const failing = createFramesPickInterpreter(resolver, catalog, {
      placements: () => ({
        ...placement,
        designOf: () => {
          throw new RangeError("outside the operation's domain");
        },
      }),
    });
    const point = failing.interpret(corePick(gcrf, site))!;
    expect(point.frame).toBe(itrf);
    expect(point.design).toBeUndefined();
  });
});
