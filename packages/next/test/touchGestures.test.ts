// Touch gestures: the classifier, the tracker's rules (a second finger ends
// a one-finger drag, classification sticks, a third finger is ignored) and
// a pinch moving each controller's camera in. Node, no GPU.
import { afterEach, describe, expect, it, vi } from "vitest";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import * as m4 from "../src/math/mat4.ts";
import * as v3 from "../src/math/vec3.ts";
import { Camera } from "../src/scene/Camera.ts";
import { GlobeController } from "../src/scene/GlobeController.ts";
import { InspectController } from "../src/scene/InspectController.ts";
import { OrbitController } from "../src/scene/OrbitController.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import {
  TouchGestures,
  classifyTwoFinger,
  holdBrowserGestures,
  type TouchGestureListener,
  type TwoFingerMove,
} from "../src/scene/touchGestures.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { View } from "../src/scene/View.ts";
import { fakeEngine } from "./fakeGpu.ts";

const pt = (x: number, y: number) => ({ x, y });

describe("classifyTwoFinger", () => {
  const a0 = pt(0, 0);
  const b0 = pt(100, 0);

  it("waits for 8 px of total movement over both fingers", () => {
    // Apart by 2 px each: 4 px in all.
    expect(classifyTwoFinger(a0, b0, pt(-2, 0), pt(102, 0))).toBeUndefined();
    // Just under 8 (7.8), and exactly 8.
    expect(
      classifyTwoFinger(a0, b0, pt(-3.9, 0), pt(103.9, 0)),
    ).toBeUndefined();
    expect(classifyTwoFinger(a0, b0, pt(-4, 0), pt(104, 0))).toBe("pinch");
  });

  it("calls a change of distance a pinch, in or out", () => {
    expect(classifyTwoFinger(a0, b0, pt(4, 0), pt(96, 0))).toBe("pinch");
  });

  it("calls both fingers moving the same way a drag", () => {
    expect(classifyTwoFinger(a0, b0, pt(4, 3), pt(104, 3))).toBe("drag");
    expect(classifyTwoFinger(a0, b0, pt(0, -8), pt(100, -8))).toBe("drag");
  });

  it("calls a change of angle a rotation, either way", () => {
    expect(classifyTwoFinger(a0, b0, pt(0, 4), pt(100, -4))).toBe("rotate");
    expect(classifyTwoFinger(a0, b0, pt(0, -4), pt(100, 4))).toBe("rotate");
  });
});

/** Records what a tracker tells its listener. */
function record() {
  const log: string[] = [];
  const moves: TwoFingerMove[] = [];
  const listener: TouchGestureListener = {
    oneStart: (x, y) => log.push(`one+ ${x},${y}`),
    oneMove: (x, y) => log.push(`one~ ${x},${y}`),
    oneEnd: () => log.push("one-"),
    twoStart: () => log.push("two+"),
    twoBegin: (kind) => log.push(`begin ${kind}`),
    twoMove: (m) => {
      log.push(`two~ ${m.kind}`);
      moves.push(m);
    },
    twoEnd: () => log.push("two-"),
  };
  const touch = new TouchGestures(listener);
  const ev = (id: number, x: number, y: number, pointerType = "touch") => ({
    pointerId: id,
    pointerType,
    clientX: x,
    clientY: y,
  });
  return { touch, log, moves, ev };
}

describe("TouchGestures", () => {
  it("ignores mouse and pen pointers", () => {
    const { touch, log, ev } = record();
    expect(touch.down(ev(1, 5, 5, "mouse"))).toBe(false);
    expect(touch.down(ev(2, 5, 5, "pen"))).toBe(false);
    touch.move(ev(1, 9, 9, "mouse"));
    expect(log).toEqual([]);
  });

  it("follows one finger", () => {
    const { touch, log, ev } = record();
    touch.down(ev(1, 10, 20));
    touch.move(ev(1, 12, 25));
    touch.up(ev(1, 12, 25));
    expect(log).toEqual(["one+ 10,20", "one~ 12,25", "one-"]);
  });

  it("ends the one-finger drag when a second finger comes down", () => {
    const { touch, log, ev } = record();
    touch.down(ev(1, 10, 20));
    touch.down(ev(2, 110, 20));
    expect(log).toEqual(["one+ 10,20", "one-", "two+"]);
  });

  it("classifies once and keeps the kind until a finger lifts", () => {
    const { touch, log, moves, ev } = record();
    touch.down(ev(1, 0, 0));
    touch.down(ev(2, 100, 0));
    // Under the threshold: nothing reported.
    touch.move(ev(1, -1, 0));
    expect(log).toEqual(["one+ 0,0", "one-", "two+"]);
    touch.move(ev(1, -5, 0));
    touch.move(ev(2, 105, 0));
    // The move that classified it reports nothing: reports start there.
    expect(log.slice(3)).toEqual(["begin pinch"]);
    touch.move(ev(2, 110, 0));
    expect(log.at(-1)).toBe("two~ pinch");
    // A big drag now is still a pinch: the fingers move together.
    touch.move(ev(1, -5, 60));
    touch.move(ev(2, 115, 60));
    expect(moves.every((m) => m.kind === "pinch")).toBe(true);
    expect(touch.twoFingerKind).toBe("pinch");
    // The reports multiply up to the distance's change since the classifying move.
    const product = moves.reduce(
      (p, m) => p * (m.kind === "pinch" ? m.scale : 1),
      1,
    );
    expect(product).toBeCloseTo(120 / 110, 9);
  });

  it("reports a drag's midpoint motion and a rotation's angle", () => {
    const a = record();
    a.touch.down(a.ev(1, 0, 0));
    a.touch.down(a.ev(2, 100, 0));
    a.touch.move(a.ev(1, 5, 5));
    a.touch.move(a.ev(2, 105, 5)); // begins: a drag
    a.touch.move(a.ev(1, 15, 5));
    a.touch.move(a.ev(2, 115, 5));
    const last = a.moves.at(-1)!;
    expect(last.kind === "drag" && last.dx).toBeCloseTo(5, 9);
    expect(a.moves.length).toBeGreaterThan(0);

    const r = record();
    r.touch.down(r.ev(1, 0, 0));
    r.touch.down(r.ev(2, 100, 0));
    r.touch.move(r.ev(1, 0, 5));
    r.touch.move(r.ev(2, 100, -5)); // begins: a rotation
    r.touch.move(r.ev(1, 0, 50));
    r.touch.move(r.ev(2, 100, -50));
    const turned = r.moves.reduce(
      (s, m) => s + (m.kind === "rotate" ? m.angle : 0),
      0,
    );
    // Clockwise on screen (y down) is positive.
    expect(turned).toBeCloseTo(Math.atan2(-100, 100) - Math.atan2(-10, 100), 9);
  });

  it("ignores a third finger", () => {
    const { touch, log, ev } = record();
    touch.down(ev(1, 0, 0));
    touch.down(ev(2, 100, 0));
    expect(touch.down(ev(3, 50, 50))).toBe(false);
    touch.move(ev(3, 60, 60));
    touch.up(ev(3, 60, 60));
    expect(touch.count).toBe(2);
    expect(log).toEqual(["one+ 0,0", "one-", "two+"]);
  });

  it("starts a fresh one-finger drag where the finger is when one lifts", () => {
    const { touch, log, ev } = record();
    touch.down(ev(1, 0, 0));
    touch.down(ev(2, 100, 0));
    touch.move(ev(1, -5, 0));
    touch.move(ev(2, 105, 0));
    log.length = 0;
    touch.up(ev(1, -5, 0));
    expect(log).toEqual(["two-", "one+ 105,0"]);
    expect(touch.twoFingerKind).toBeUndefined();
    touch.move(ev(2, 110, 3));
    expect(log.at(-1)).toBe("one~ 110,3");
    // A new second finger is classified afresh.
    touch.down(ev(4, 10, 3));
    touch.move(ev(2, 114, 3));
    touch.move(ev(4, 6, 3));
    expect(log.at(-1)).toBe("begin pinch");
  });
});

describe("holdBrowserGestures", () => {
  function fakeElement() {
    const props = new Map<string, string>([["touch-action", "pan-y"]]);
    const element = new EventTarget() as EventTarget & {
      style: object;
    };
    element.style = {
      getPropertyValue: (n: string) => props.get(n) ?? "",
      setProperty: (n: string, v: string) => props.set(n, v),
      removeProperty: (n: string) => props.delete(n),
    };
    return { element: element as unknown as HTMLElement, props };
  }

  it("takes the styles, prevents touch and gesture defaults, and restores them", () => {
    const { element, props } = fakeElement();
    const release = holdBrowserGestures(element);
    expect(props.get("touch-action")).toBe("none");
    expect(props.get("overscroll-behavior")).toBe("none");
    expect(props.get("-webkit-touch-callout")).toBe("none");
    for (const type of ["gesturestart", "touchstart", "touchmove"]) {
      const e = new Event(type, { cancelable: true });
      element.dispatchEvent(e);
      expect(e.defaultPrevented).toBe(true);
    }
    release();
    expect(props.get("touch-action")).toBe("pan-y");
    expect(props.has("overscroll-behavior")).toBe(false);
    const e = new Event("touchmove", { cancelable: true });
    element.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  it("is counted per element", () => {
    const { element, props } = fakeElement();
    const a = holdBrowserGestures(element);
    const b = holdBrowserGestures(element);
    a();
    a();
    expect(props.get("touch-action")).toBe("none");
    b();
    expect(props.get("touch-action")).toBe("pan-y");
  });
});

// ------------------------------------------------------------ controllers

const SIZE = 100;
/** The engine's tick loop, standing still. */
const frames = { onTick: () => () => {} };

function pointerEvent(type: string, id: number, x: number, y: number) {
  return Object.assign(new Event(type, { cancelable: true }), {
    pointerId: id,
    pointerType: "touch",
    clientX: x,
    clientY: y,
    button: 0,
    shiftKey: false,
    ctrlKey: false,
  });
}

function box() {
  const element = new EventTarget() as EventTarget & Record<string, unknown>;
  element.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
  });
  element.setPointerCapture = () => {};
  element.releasePointerCapture = () => {};
  element.hasPointerCapture = () => false;
  const fire = (type: string, id: number, x: number, y: number) =>
    element.dispatchEvent(pointerEvent(type, id, x, y));
  /** Two fingers 20 px apart about the middle spread to `spread` px apart. */
  const pinch = (spread: number) => {
    fire("pointerdown", 1, 40, 50);
    fire("pointerdown", 2, 60, 50);
    for (let i = 1; i <= 5; i++) {
      const half = 10 + ((spread / 2 - 10) * i) / 5;
      fire("pointermove", 1, 50 - half, 50);
      fire("pointermove", 2, 50 + half, 50);
    }
  };
  return { element: element as unknown as HTMLElement, pinch, fire };
}

const flatView = (camera: Camera, extra: object = {}) =>
  ({
    camera,
    world: { findBodyAnchor: () => undefined },
    anchorPlacement: () => m4.mat4(),
    target: { width: SIZE, height: SIZE },
    contains: () => true,
    pixelRect: () => ({ x: 0, y: 0, width: SIZE, height: SIZE }),
    ...extra,
  }) as unknown as View;

describe("a pinch moves the camera in", () => {
  let engine: Engine | undefined;
  afterEach(() => vi.restoreAllMocks());

  it("GlobeController: lower toward the point under the midpoint", async () => {
    engine = await fakeEngine();
    const world = engine.createWorld();
    const view = engine.addView({
      target: new OffscreenTarget(SIZE, SIZE),
      world,
    });
    view.camera.lookAt(Float64Array.of(6_378_137, 0, 0), 0.4, -0.5, 3_000);
    vi.spyOn(view, "pickPosition").mockResolvedValue(undefined);
    const { element, pinch } = box();
    const controller = new GlobeController(view, element, frames);
    const height = () =>
      Ellipsoid.WGS84.cartesianToCartographic(view.camera.position, {
        longitude: 0,
        latitude: 0,
        height: 0,
      })!.height;
    const before = height();
    pinch(60);
    expect(height()).toBeLessThan(before * 0.7);
    expect(controller.inputs).toBeGreaterThan(0);
    controller.dispose();
    engine.removeWorld(world);
  });

  it("GlobeController: a rotation turns the heading and keeps the camera level", async () => {
    engine = await fakeEngine();
    const world = engine.createWorld();
    const view = engine.addView({
      target: new OffscreenTarget(SIZE, SIZE),
      world,
    });
    view.camera.lookAt(Float64Array.of(6_378_137, 0, 0), 0.4, -0.5, 3_000);
    vi.spyOn(view, "pickPosition").mockResolvedValue(undefined);
    const { element, fire } = box();
    const controller = new GlobeController(view, element, frames);
    const camera = view.camera;
    const before = v3.copy(v3.vec3(), camera.right);
    // A ground point right of the middle of the view.
    const right = Ellipsoid.WGS84.rayIntersection(
      camera.position,
      camera.rayDirection(0.6, 0, 1, v3.vec3()),
      v3.vec3(),
    )!;
    fire("pointerdown", 1, 40, 50);
    fire("pointerdown", 2, 60, 50);
    for (let i = 1; i <= 5; i++) {
      // Clockwise on screen: the left finger up, the right finger down.
      fire("pointermove", 1, 40 + i, 50 - 4 * i);
      fire("pointermove", 2, 60 - i, 50 + 4 * i);
    }
    expect(v3.dot(camera.right, before)).toBeLessThan(0.99);
    // The scene turned clockwise with the fingers: that point went down.
    const rel = v3.sub(v3.vec3(), right, camera.position);
    expect(v3.dot(rel, camera.up) / v3.dot(rel, camera.direction)).toBeLessThan(
      -0.01,
    );
    const up = Ellipsoid.WGS84.geodeticSurfaceNormal(
      camera.position,
      v3.vec3(),
    )!;
    // No roll: the right stays level.
    expect(Math.abs(v3.dot(camera.right, up))).toBeLessThan(1e-6);
    controller.dispose();
    engine.removeWorld(world);
  });

  it("OrbitController: closer to the ground", () => {
    const camera = new Camera();
    camera.lookAt(Float64Array.of(6_378_137, 0, 0), 0, -1, 10_000);
    const { element, pinch } = box();
    const controller = new OrbitController(flatView(camera), element);
    const height = () =>
      Ellipsoid.WGS84.cartesianToCartographic(camera.position, {
        longitude: 0,
        latitude: 0,
        height: 0,
      })!.height;
    const before = height();
    pinch(60);
    expect(height()).toBeLessThan(before * 0.8);
    controller.dispose();
  });

  it("InspectController: a smaller range", () => {
    const camera = new Camera();
    const { element, pinch } = box();
    const controller = new InspectController(flatView(camera), element);
    controller.focus(Float64Array.of(6_378_137, 0, 0), 0, -0.5, 100);
    pinch(60);
    expect(controller.range).toBeLessThan(50);
    expect(v3.distance(camera.position, controller.target)).toBeCloseTo(
      controller.range,
      6,
    );
    controller.dispose();
  });
});
