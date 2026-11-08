// The frames module's pick interpreter (plan 5a, Task 15; spec section
// 7.9): a core pick turned into a point tagged with its reference frame,
// its body, its body-fixed position, design coordinates where the content
// has a placement, and the composed accuracy. Closes plan 3's R8.
import { beforeAll, describe, expect, it } from "vitest";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import { createFramesPickInterpreter } from "../src/frames/pickInterpreter.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import {
  FrameUnavailableError,
  type FrameKey,
} from "../src/camera/frameResolver.ts";
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
  // Rigid: a sag of 4.2 cm at every point, for the content term.
  displayError: () => 0.042,
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

/** Column-major translation by (x, y, z). */
function translation(x: number, y: number, z: number): Float64Array {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

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

  it("tags a pick under the Earth's anchor with ITRF, the Earth and its body-fixed position", () => {
    const point = interpreter.interpret(corePick(gcrf, other))!;
    expect(point.frame).toBe(itrf);
    expect(point.body).toBe(EARTH);
    expect(Array.from(point.bodyFixed!)).toEqual(POINT);
    expect(point.design).toBeUndefined();
  });

  describe("its accuracy, composed from the point's own terms", () => {
    // The pick's camera, as `corePick` gives it, is 990 m above the point
    // along x: this far from it.
    const distance = Math.hypot(990, 20, 30);

    it("the pick's footprint: one CSS pixel at the hit's distance (pickDesign's tolerance)", () => {
      const { terms } = interpreter.interpret(corePick(gcrf, other))!.accuracy;
      const footprint = terms.find(
        (t) => t.kind === "pick" && t.part === "footprint",
      )!;
      expect(footprint.frame).toBe("ITRF");
      // fovy 1 rad over 48 CSS pixels.
      expect(footprint.meters).toBeCloseTo(
        (distance * 2 * Math.tan(0.5)) / 48,
        12,
      );
      expect(footprint.meters).toBeGreaterThan(20);
      expect(terms[0]).toBe(footprint);
    });

    it("the pick's depth: half a float32 step of the stored depth, along the ray", () => {
      const { terms } = interpreter.interpret(corePick(gcrf, other))!.accuracy;
      const depth = terms.find((t) => t.kind === "pick" && t.part === "depth")!;
      // z = 990 m along the view axis; near 0.1 m: depth = 0.1 / 990.
      const d = Math.fround(0.1 / 990);
      const step = 2 ** (Math.floor(Math.log2(d)) - 23);
      expect(depth.meters).toBeCloseTo((distance * step) / 2 / d, 15);
      // About 30 µm at a kilometre: a float32 step is 2⁻²³ to 2⁻²⁴ of it.
      expect(depth.meters).toBeGreaterThan(distance * 2 ** -25);
      expect(depth.meters).toBeLessThan(distance * 2 ** -24);
    });

    it("the content's own error: the placement's displayError, only with design coordinates", () => {
      const placed = interpreter.interpret(corePick(gcrf, site))!.accuracy;
      const content = placed.terms.find((t) => t.kind === "content")!;
      expect(content).toMatchObject({ frame: "site grid", meters: 0.042 });
      expect(content.note).toMatch(/rigid placement/);
      const bare = interpreter.interpret(corePick(gcrf, other))!.accuracy;
      expect(bare.terms.some((t) => t.kind === "content")).toBe(false);
    });

    it("an Earth pick on the default analytic catalog: no reference frame term, so metres (the pick's and the content's)", () => {
      for (const root of [gcrf, world.root]) {
        const { accuracy } = interpreter.interpret(corePick(root, site))!;
        // Tagged in ITRF, a catalog reference frame: no catalog-to-catalog
        // edge (the Earth's orientation, its place among the planets) moves
        // the point, which comes back through the placement that drew it.
        expect(accuracy.terms.map((t) => t.kind)).toEqual([
          "pick",
          "pick",
          "content",
        ]);
        expect(accuracy.meters).toBe(
          Math.hypot(...accuracy.terms.map((t) => t.meters!)),
        );
        expect(accuracy.meters).toBeGreaterThan(20);
        expect(accuracy.meters).toBeLessThan(30);
        expect(accuracy.unboundedBy).toBeUndefined();
        expect(accuracy.combination).toMatch(
          /none: the point is in a catalog reference frame, ITRF/,
        );
      }
    });

    it("a point in an application's reference frame under ITRF: its own edges, up to ITRF", () => {
      const site = Frame.constant("site", itrf, translation(R, 0, 0), {
        accuracy: { meters: 0.5, note: "surveyed site origin" },
      });
      const arm = Frame.constant("arm", site, translation(0, 0, 2), {
        accuracy: { radians: 1e-6, note: "encoder" },
      });
      catalog.add(site);
      catalog.add(arm);
      const tool = world.addAnchor("tool");
      resolver.bindAnchor(tool, arm);
      const local = [1, 2, 3];
      const pick = {
        ...corePick(world.root, undefined),
        anchor: tool,
        anchorPosition: Float64Array.from(local),
      };
      const point = interpreter.interpret(pick)!;
      expect(point.frame).toBe(arm);
      expect(point.body).toBe(EARTH);
      expect(Array.from(point.bodyFixed!)).toEqual([R + 1, 2, 5]);
      const edges = point.accuracy.terms.filter(
        (t) => t.kind !== "pick" && t.kind !== "content",
      );
      expect(edges).toEqual([
        {
          frame: "arm",
          kind: "angular",
          meters: 1e-6 * Math.hypot(...local),
          radians: 1e-6,
          lever: Math.hypot(...local),
          note: "encoder",
        },
        {
          frame: "site",
          kind: "meters",
          meters: 0.5,
          note: "surveyed site origin",
        },
      ]);
      expect(point.accuracy.combination).toMatch(
        /up to the nearest catalog reference frame, ITRF/,
      );
    });

    it("a point with no body tagged in GCRF: no reference frame term, so metres", () => {
      const point = interpreter.interpret(corePick(gcrf, undefined, "none"))!;
      expect(point.body).toBeUndefined();
      const { accuracy } = point;
      expect(accuracy.terms.map((t) => t.kind)).toEqual(["pick", "pick"]);
      expect(accuracy.meters).toBeGreaterThan(20);
      expect(accuracy.meters).toBeLessThan(30);
      expect(accuracy.combination).toMatch(
        /none: the point is in a catalog reference frame, GCRF/,
      );
    });

    it("a point in an application's reference frame under GCRF (a spacecraft's): only its own edge", () => {
      const craft = Frame.constant("craft", gcrf, translation(7e6, 0, 0), {
        accuracy: { meters: 120, note: "the trajectory's covariance" },
      });
      catalog.add(craft);
      const probe = world.addAnchor("probe");
      resolver.bindAnchor(probe, craft);
      const pick = {
        ...corePick(gcrf, undefined),
        anchor: probe,
        anchorPosition: Float64Array.of(1, 2, 3),
      };
      const point = interpreter.interpret(pick)!;
      expect(point.frame).toBe(craft);
      expect(point.body).toBeUndefined();
      expect(point.accuracy.terms.filter((t) => t.kind !== "pick")).toEqual([
        {
          frame: "craft",
          kind: "meters",
          meters: 120,
          note: "the trajectory's covariance",
        },
      ]);
      // The pick's terms (the test's camera is far from this point) and
      // 120 m, nothing for GCRF's place.
      expect(point.accuracy.meters).toBe(
        Math.hypot(...point.accuracy.terms.map((t) => t.meters!)),
      );
      expect(point.accuracy.combination).toMatch(
        /up to the nearest catalog reference frame, GCRF/,
      );
    });

    it("throws, naming it, when an application's edge can't answer at the pick's instant", () => {
      const lost = new Frame(
        "lost",
        gcrf,
        () => {
          throw new FrameUnavailableError("lost", "outsideData");
        },
        { accuracy: { meters: 1, note: "a trajectory's" } },
      );
      catalog.add(lost);
      const anchor = world.addAnchor("lost probe");
      resolver.bindAnchor(anchor, lost);
      const pick = { ...corePick(gcrf, undefined), anchor };
      expect(() => interpreter.interpret(pick)).toThrow(FrameUnavailableError);
    });

    it("never 0 m: on the default rig too, the pick's own terms remain", () => {
      const { accuracy } = interpreter.interpret(corePick(world.root, other))!;
      expect(accuracy.terms.length).toBe(2);
      expect(accuracy.meters).toBeGreaterThan(0);
    });
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

  it("on the default rig (render space Earth-fixed) gives the same reference frame and design", () => {
    const point = interpreter.interpret(corePick(world.root, site))!;
    expect(point.frame).toBe(itrf);
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
