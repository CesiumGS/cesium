import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { EARTH, MOON } from "../src/scene/Body.ts";
import { Camera } from "../src/scene/Camera.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import { OffscreenTarget, View } from "../src/scene/View.ts";
import type { World } from "../src/scene/World.ts";
import { CapacityError } from "../src/scene/CapacityError.ts";
import { MAX_ANCHORS } from "../src/render/layout.ts";
import { fakeEngine } from "./fakeGpu.ts";

/** Column-major translation by (x, y, z). */
function translation(x: number, y: number, z: number): Float64Array {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

/** A rotation by `angle` about the unit `axis`, then a translation by `t`. */
function rigid(
  axis: readonly [number, number, number],
  angle: number,
  t: readonly [number, number, number],
): Float64Array {
  const [x, y, z] = axis;
  const c = Math.cos(angle),
    s = Math.sin(angle),
    k = 1 - c;
  // prettier-ignore
  return new Float64Array([
    c + x * x * k,     y * x * k + z * s, z * x * k - y * s, 0,
    x * y * k - z * s, c + y * y * k,     z * y * k + x * s, 0,
    x * z * k + y * s, y * z * k - x * s, c + z * z * k,     0,
    t[0], t[1], t[2], 1,
  ]);
}

const IDENTITY = translation(0, 0, 0);

/** Anchors in the transform table, and a view's placements of them (plan 5a, Task 8). */
describe("anchors", () => {
  let engine: Engine;
  let world: World;
  let view: View;
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  beforeEach(() => {
    world = engine.createWorld();
    view = new View({ target: new OffscreenTarget(640, 360), world });
  });

  it("a transform under an anchor composes relative to it", () => {
    const earth = world.bodyAnchor(EARTH);
    const t = world.addTransform(translation(1, 2, 3), earth);
    expect(world.worldMatrix(t)).toEqual(translation(1, 2, 3));
    expect(world.anchorOf(t)).toBe(earth);
    // Inherited down the tree; a transform under no anchor has none.
    const child = world.addTransform(translation(4, 5, 6), t);
    expect(world.anchorOf(child)).toBe(earth);
    expect(world.worldMatrix(child)).toEqual(translation(5, 7, 9));
    expect(world.anchorOf(world.addTransform(IDENTITY))).toBeUndefined();
    // The anchor is a top-level transform at the identity, forever.
    expect(world.anchorOf(earth)).toBe(earth);
    expect(world.worldMatrix(earth)).toEqual(IDENTITY);
    expect(() => world.setTransform(earth, translation(1, 0, 0))).toThrow(
      /setTransform: Earth is an anchor/,
    );
    expect(() => world.removeTransform(earth)).toThrow(
      /removeTransform: Earth is an anchor; remove it with removeAnchor/,
    );
    // Placing it in the table root changes no anchor-relative matrix.
    world.placeAnchor(earth, translation(7, 0, 0));
    expect(world.anchorMatrix(earth)).toEqual(translation(7, 0, 0));
    expect(world.worldMatrix(t)).toEqual(translation(1, 2, 3));
    expect(world.root).toEqual({ name: "transform table" });
    // Only a rigid place, and only for this world's anchors.
    const scaled = translation(0, 0, 0);
    scaled[5] = 2;
    expect(() => world.placeAnchor(earth, scaled)).toThrow(
      /placeAnchor: Earth's place is not rigid/,
    );
    const other = engine.createWorld().addAnchor("elsewhere");
    expect(() => world.placeAnchor(other, IDENTITY)).toThrow(
      /placeAnchor: elsewhere is not an anchor of this world/,
    );
    expect(() => view.setAnchorPlacement(other, IDENTITY)).toThrow(
      /setAnchorPlacement: elsewhere is not an anchor of this view's world/,
    );
  });

  it("a draw's parent hangs its own transform under an anchor", () => {
    const moon = world.bodyAnchor(MOON);
    const mesh = world.addMesh(createBox());
    const draw = world.addDraw({
      mesh,
      origin: Float64Array.of(10, 20, 30),
      parent: moon,
    });
    expect(world.drawMatrix(draw)).toEqual(translation(10, 20, 30));
    // Under no anchor without a parent, as today.
    const plain = world.addDraw({ mesh, origin: Float64Array.of(10, 20, 30) });
    expect(world.drawMatrix(plain)).toEqual(translation(10, 20, 30));
    expect(() => world.removeAnchor(moon)).toThrow(
      /removeAnchor: transforms still hang under Moon/,
    );
    world.removeDraw(draw);
    expect(() => world.removeAnchor(moon)).not.toThrow();
    // A parent means nothing beside a shared transform.
    const shared = world.addTransform(IDENTITY);
    expect(() =>
      world.addDraw({ mesh, transform: shared, parent: shared }),
    ).toThrow(/addDraw: a parent is for the transform a draw owns/);
    // Not on a removed parent, nor on an anchor itself (removeAnchor would
    // free the transform under the draw).
    const gone = world.addTransform(IDENTITY);
    world.removeTransform(gone);
    expect(() => world.addDraw({ mesh, parent: gone })).toThrow(
      /addDraw: the parent was removed/,
    );
    const site = world.addAnchor("site");
    expect(() => world.addDraw({ mesh, transform: site })).toThrow(
      /addDraw: site is an anchor; hang the draw under it with parent/,
    );
    expect(world.anchorOf(world.addTransform(IDENTITY, site))).toBe(site);
  });

  it("bodyAnchor makes one anchor per body, on first ask", () => {
    expect(world.anchors).toEqual([]);
    expect(view.bodyAnchor).toBeUndefined();
    const earth = world.bodyAnchor(EARTH);
    expect(earth.name).toBe("Earth");
    expect(earth.body).toBe(EARTH);
    expect(earth.slot).toBe(1);
    // By name and NAIF id, not object identity.
    expect(world.bodyAnchor({ ...EARTH })).toBe(earth);
    expect(world.bodyAnchor({ ...EARTH, naifId: 3 })).not.toBe(earth);
    expect(view.bodyAnchor).toBe(earth);
    const moon = world.bodyAnchor(MOON);
    expect(world.anchors).toEqual([earth, expect.anything(), moon]);
    expect(() => world.addAnchor("Earth again", { body: EARTH })).toThrow(
      /addAnchor: Earth already has an anchor \(Earth\)/,
    );
    // A transform node as a reference frame: one key per node.
    const site = world.addTransform(translation(1, 0, 0), earth);
    const key = world.frameOf(site, "site");
    expect(key.name).toBe("site");
    expect(key.world).toBe(world);
    expect(key.transform).toEqual(site);
    expect(world.frameOf(site, "site")).toBe(key);
    expect(() => world.frameOf(site, "other")).toThrow(
      /already the reference frame site, not other/,
    );
  });

  it("view placements default to identity; a change bumps anchorRevision once", () => {
    const earth = world.bodyAnchor(EARTH);
    expect(view.anchorPlacement(earth)).toEqual(IDENTITY);
    expect(view.anchorPlacement(undefined)).toEqual(IDENTITY);
    let wakes = 0;
    view.wake = () => wakes++;
    const revision = view.anchorRevision;
    const place = rigid([0, 0, 1], 0.3, [384_400_000, 0, 0]);
    view.setAnchorPlacement(earth, place);
    expect(view.anchorRevision).toBe(revision + 1);
    expect(wakes).toBe(1);
    expect(view.anchorPlacement(earth)).toEqual(place);
    view.setAnchorPlacement(earth, place);
    expect(view.anchorRevision).toBe(revision + 1);
    view.setAnchorPlacement(undefined, IDENTITY);
    expect(view.anchorRevision).toBe(revision + 1);
    // Stored only: the world's matrices are unchanged.
    const t = world.addTransform(translation(1, 2, 3), earth);
    expect(world.worldMatrix(t)).toEqual(translation(1, 2, 3));
    // A slot reused by a new anchor starts at the identity.
    world.removeTransform(t);
    world.removeAnchor(earth);
    const next = world.addAnchor("next");
    expect(next.slot).toBe(earth.slot);
    expect(view.anchorPlacement(next)).toEqual(IDENTITY);
    expect(() => view.anchorPlacement(earth)).toThrow(
      /anchorPlacement: Earth is not an anchor of this view's world/,
    );
  });

  it("a removed anchor, or another world, bumps anchorRevision and wakes", () => {
    const earth = world.bodyAnchor(EARTH);
    view.setAnchorPlacement(earth, translation(5, 0, 0));
    let wakes = 0;
    view.wake = () => wakes++;
    const revision = view.anchorRevision;
    world.removeAnchor(earth);
    expect(view.anchorRevision).toBe(revision + 1);
    expect(wakes).toBe(1);
    // Read again: counted once.
    expect(view.anchorRevision).toBe(revision + 1);
    view.world = engine.createWorld();
    expect(view.anchorRevision).toBe(revision + 2);
  });

  it("anchorCamera and setCameraFromAnchor invert each other to 1e-9 m at 400,000 km", () => {
    const moon = world.bodyAnchor(MOON);
    view.setAnchorPlacement(
      moon,
      rigid([0.6, 0, 0.8], 1.1, [400_000_000, -3_000_000, 1_000_000]),
    );
    const camera = view.camera;
    camera.position.set([399_000_000, -2_000_000, 1_500_000]);
    camera.direction.set([0, 0.6, -0.8]);
    camera.up.set([0, 0.8, 0.6]);
    camera.right.set([1, 0, 0]);
    camera.fov = 0.7;
    const before = [
      camera.position,
      camera.direction,
      camera.up,
      camera.right,
    ].map((v) => Array.from(v));
    const inMoon = view.anchorCamera(moon);
    expect(inMoon).toBeInstanceOf(Camera);
    expect(inMoon.fov).toBe(0.7);
    // The camera is about 1,500 km from the Moon's anchor, 400,000 km out.
    const r = Math.hypot(...inMoon.position);
    expect(r).toBeGreaterThan(1_000_000);
    expect(r).toBeLessThan(2_000_000);
    const inMoonBefore = [inMoon.position, inMoon.direction, inMoon.up].map(
      (v) => Array.from(v),
    );
    // Render space, to the anchor and back.
    view.setCameraFromAnchor(moon, inMoon);
    const after = [camera.position, camera.direction, camera.up, camera.right];
    after.forEach((v, k) => {
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(v[i]! - before[k]![i]!)).toBeLessThan(1e-9);
      }
    });
    // And the anchor's pose, to render space and back.
    const again = view.anchorCamera(moon, inMoon);
    [again.position, again.direction, again.up].forEach((v, k) => {
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(v[i]! - inMoonBefore[k]![i]!)).toBeLessThan(1e-9);
      }
    });
    // Under no anchor (and the root at the identity) it is the camera.
    const plain = view.anchorCamera(undefined);
    expect(Array.from(plain.position)).toEqual(Array.from(camera.position));
  });

  it("refuses a 32nd anchor, a non-rigid placement, and removing an anchor with content", () => {
    expect(MAX_ANCHORS).toBe(32);
    for (let i = 0; i < 31; i++) {
      world.addAnchor(`a${i}`);
    }
    expect(() => world.addAnchor("one too many")).toThrow(CapacityError);
    expect(() => world.addAnchor("one too many")).toThrow(
      "World anchor table is full.",
    );
    const a0 = world.anchors[0]!;
    expect(() =>
      view.setAnchorPlacement(a0, translation(Number.NaN, 0, 0)),
    ).toThrow(/setAnchorPlacement: a0's placement is not rigid: .*not finite/);
    const scaled = translation(0, 0, 0);
    scaled[0] = 1 + 1e-6;
    expect(() => view.setAnchorPlacement(a0, scaled)).toThrow(
      /a0's placement is not rigid: .*not orthonormal/,
    );
    const mirrored = translation(0, 0, 0);
    mirrored[0] = -1;
    expect(() => view.setAnchorPlacement(a0, mirrored)).toThrow(
      /a0's placement is not rigid: it mirrors/,
    );
    expect(() => view.setAnchorPlacement(undefined, scaled)).toThrow(
      /the transform table's root's placement is not rigid/,
    );
    // Rigid within 1e-9 passes.
    const nearly = rigid([0, 1, 0], 0.5, [1, 2, 3]);
    nearly[0] = nearly[0]! + 1e-12;
    expect(() => view.setAnchorPlacement(a0, nearly)).not.toThrow();
    world.addTransform(IDENTITY, a0);
    expect(() => world.removeAnchor(a0)).toThrow(
      /removeAnchor: transforms still hang under a0/,
    );
  });

  it("toPixel takes an anchor", () => {
    const earth = world.bodyAnchor(EARTH);
    const camera = view.camera;
    camera.position.set([0, 0, 10]);
    camera.direction.set([0, 0, -1]);
    camera.up.set([0, 1, 0]);
    camera.right.set([1, 0, 0]);
    camera.version++;
    const centre = [320, 180];
    expect(Array.from(view.toPixel([0, 0, 0])!)).toEqual(centre);
    view.setAnchorPlacement(earth, translation(100, 0, 0));
    // The body anchor by default: its origin is now 100 m to the right.
    expect(view.toPixel([0, 0, 0])![0]).toBeGreaterThan(640);
    expect(Array.from(view.toPixel([-100, 0, 0])!)).toEqual(centre);
    // Another anchor, at the identity: render space's numbers.
    const site = world.addAnchor("site");
    expect(Array.from(view.toPixel([0, 0, 0], site)!)).toEqual(centre);
    // The table's root differs from the placed body anchor.
    const atRoot = view.toPixel([0, 0, 0], world.root)!;
    expect(Array.from(atRoot)).toEqual(centre);
    expect(Array.from(atRoot)).not.toEqual(
      Array.from(view.toPixel([0, 0, 0])!),
    );
    // An explicit undefined is refused, by the type and at run time,
    // rather than read as either.
    expect(() =>
      // @ts-expect-error: no undefined anchor
      view.toPixel([0, 0, 0], undefined),
    ).toThrow(/toPixel: the anchor is undefined; pass world.root/);
  });
});
