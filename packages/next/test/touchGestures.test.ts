// Touch gestures: the tracker's rules (a second finger ends a one-finger
// drag, two fingers act together unless they tilt, a third finger is
// ignored) and the browser-gesture hold. The controllers are in
// touchControllers.test.ts. Node, no GPU.
import { describe, expect, it } from "vitest";
import {
  TouchGestures,
  holdBrowserGestures,
  isTilt,
  type TouchGestureListener,
  type TwoFingerMove,
} from "../src/scene/touchGestures.ts";

const pt = (x: number, y: number) => ({ x, y });

describe("isTilt", () => {
  const a0 = pt(0, 0);
  const b0 = pt(100, 0);

  it("takes both fingers mostly vertical, the same way, at a steady distance", () => {
    expect(isTilt(a0, b0, pt(1, -8), pt(101, -8))).toBe(true);
    expect(isTilt(a0, b0, pt(0, 8), pt(100, 9))).toBe(true);
  });

  it("refuses fingers going opposite ways (a twist)", () => {
    expect(isTilt(a0, b0, pt(0, 8), pt(100, -8))).toBe(false);
  });

  it("refuses a move that is not mostly vertical in each finger", () => {
    expect(isTilt(a0, b0, pt(5, 8), pt(105, 8))).toBe(false);
    expect(isTilt(a0, b0, pt(0, 8), pt(100, 0))).toBe(false);
    // Exactly twice as far down as across is not "more than".
    expect(isTilt(a0, b0, pt(4, 8), pt(104, 8))).toBe(false);
  });

  it("refuses a change of distance of 10% or more (a pinch)", () => {
    expect(isTilt(a0, b0, pt(-10, 40), pt(110, 40))).toBe(false);
    expect(isTilt(a0, b0, pt(-4, 40), pt(104, 40))).toBe(true);
  });
});

/** Records what a tracker tells its listener. */
function record(schedule?: (run: () => void) => void) {
  const log: string[] = [];
  const moves: TwoFingerMove[] = [];
  const listener: TouchGestureListener = {
    oneStart: (x, y) => log.push(`one+ ${x},${y}`),
    oneMove: (x, y) => log.push(`one~ ${x},${y}`),
    oneEnd: () => log.push("one-"),
    twoStart: () => log.push("two+"),
    twoBegin: (mode) => log.push(`begin ${mode}`),
    twoMove: (m) => {
      log.push(`two~ ${m.kind}`);
      moves.push(m);
    },
    twoEnd: () => log.push("two-"),
  };
  const touch = new TouchGestures(listener, schedule ? { schedule } : {});
  const ev = (id: number, x: number, y: number, pointerType = "touch") => ({
    pointerId: id,
    pointerType,
    clientX: x,
    clientY: y,
  });
  return { touch, log, moves, ev };
}

const last = <T>(items: T[]): T => items[items.length - 1]!;

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

  it("holds two fingers' first 10 px, then reports them from where they started", () => {
    const { touch, log, moves, ev } = record();
    touch.down(ev(1, 0, 0));
    touch.down(ev(2, 100, 0));
    touch.move(ev(1, -3, 0));
    touch.move(ev(2, 103, 0)); // 6 px of 10
    expect(log).toEqual(["one+ 0,0", "one-", "two+"]);
    touch.move(ev(1, -5, 0)); // 8
    touch.move(ev(2, 105, 0)); // 10: decided
    expect(log.slice(3)).toEqual(["begin combined", "two~ combined"]);
    const m = moves[0]!;
    if (m.kind !== "combined") {
      throw new Error("not combined");
    }
    // The 10 px so far in one report: the spread 100 to 110.
    expect(m.scale).toBeCloseTo(1.1, 12);
    expect(m.angle).toBeCloseTo(0, 12);
    expect([m.x, m.y, m.dx, m.dy]).toEqual([50, 0, 0, 0]);
  });

  it("applies pinch, twist and pan together at every move, unthresholded", () => {
    const { touch, moves, ev } = record();
    touch.down(ev(1, 0, 0));
    touch.down(ev(2, 100, 0));
    touch.move(ev(1, -5, 0));
    touch.move(ev(2, 105, 0));
    moves.length = 0;
    // A 0.1 px nudge of one finger still reports, with all three.
    touch.move(ev(2, 105, 0.1));
    const m = last(moves);
    if (m.kind !== "combined") {
      throw new Error("not combined");
    }
    expect(m.scale).toBeCloseTo(Math.hypot(110, 0.1) / 110, 9);
    expect(m.angle).toBeCloseTo(Math.atan2(0.1, 110), 9);
    expect(m.dx).toBeCloseTo(0, 12);
    expect(m.dy).toBeCloseTo(0.05, 12);
    // A move with everything at once: the midpoint, the spread and the angle.
    touch.move(ev(1, 10, 20));
    const n = last(moves);
    if (n.kind !== "combined") {
      throw new Error("not combined");
    }
    expect(n.x).toBeCloseTo(57.5, 9);
    expect(n.y).toBeCloseTo(10.05, 9);
    expect(n.dx).toBeCloseTo(7.5, 9);
    expect(n.scale).toBeLessThan(1);
    expect(n.angle).toBeLessThan(0);
  });

  it("reports a clockwise turn of the fingers as a positive angle", () => {
    const { touch, moves, ev } = record();
    touch.down(ev(1, 0, 0));
    touch.down(ev(2, 100, 0));
    touch.move(ev(1, 0, -5));
    touch.move(ev(2, 100, 5)); // 10 px: the right finger down, the left up
    const m = last(moves);
    if (m.kind !== "combined") {
      throw new Error("not combined");
    }
    expect(m.angle).toBeGreaterThan(0);
    expect(m.angle).toBeCloseTo(Math.atan2(10, 100), 9);
  });

  it("enters tilt when both fingers slide up together, and only tilts after", () => {
    const { touch, log, moves, ev } = record();
    touch.down(ev(1, 0, 100));
    touch.down(ev(2, 100, 100));
    touch.move(ev(1, 0, 95));
    touch.move(ev(2, 100, 95)); // 10 px, both up
    expect(log.slice(3)).toEqual(["begin tilt", "two~ tilt"]);
    expect(touch.twoFingerMode).toBe("tilt");
    // Later the fingers spread and turn: still only tilt, the midpoint's slide.
    touch.move(ev(1, -30, 80));
    touch.move(ev(2, 140, 70));
    expect(moves.every((m) => m.kind === "tilt")).toBe(true);
    const m = last(moves);
    expect(m.kind === "tilt" && m.dy).toBeCloseTo(-12.5, 9);
  });

  it("does not tilt for a pinch, a twist or one finger moving", () => {
    for (const moves of [
      [
        [-5, 0, 105, 0],
        [-5, 0, 105, 0],
      ],
      [[0, -5, 100, 5]],
      [[0, -10, 100, 0]],
    ]) {
      const { touch, log, ev } = record();
      touch.down(ev(1, 0, 100));
      touch.down(ev(2, 100, 100));
      for (const [ax, ay, bx, by] of moves as number[][]) {
        touch.move(ev(1, ax!, 100 + ay!));
        touch.move(ev(2, bx!, 100 + by!));
      }
      expect(log).toContain("begin combined");
      expect(touch.twoFingerMode).toBe("combined");
    }
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

  it("leaves the last finger of a pair spent: it moves nothing and ends nothing, so no flick", () => {
    const { touch, log, ev } = record();
    touch.down(ev(1, 0, 0));
    touch.down(ev(2, 100, 0));
    touch.move(ev(1, -5, 0));
    touch.move(ev(2, 105, 0));
    expect(touch.twoFingerMode).toBe("combined");
    touch.up(ev(1, -5, 0));
    expect(touch.twoFingerMode).toBeUndefined();
    log.length = 0;
    touch.move(ev(2, 110, 3));
    touch.move(ev(2, 140, 9));
    touch.up(ev(2, 140, 9));
    expect(log).toEqual([]);
  });

  it("a finger lifting during two ends them and starts no one-finger gesture", () => {
    const { touch, log, ev } = record();
    touch.down(ev(1, 0, 0));
    touch.down(ev(2, 100, 7));
    log.length = 0;
    touch.up(ev(1, 0, 0));
    expect(log).toEqual(["two-"]);
  });

  it("a finger joining a spent one starts two fingers again, and a fresh touch after all lift is one finger", () => {
    const { touch, log, ev } = record();
    touch.down(ev(1, 0, 0));
    touch.down(ev(2, 100, 0));
    touch.up(ev(1, 0, 0));
    log.length = 0;
    touch.down(ev(3, 50, 50));
    expect(log[0]).toMatch(/^two\+/);
    expect(log).not.toContain("one-");
    touch.up(ev(2, 100, 0));
    touch.up(ev(3, 50, 50));
    log.length = 0;
    touch.down(ev(4, 10, 10));
    touch.move(ev(4, 20, 10));
    expect(log).toEqual(["one+ 10,10", "one~ 20,10"]);
  });
});

describe("TouchGestures, once per displayed frame", () => {
  it("reports both fingers' moves as one, from their latest positions", () => {
    const queued: (() => void)[] = [];
    const { touch, log, moves, ev } = record((run) => queued.push(run));
    touch.down(ev(1, 0, 0));
    touch.down(ev(2, 100, 0));
    touch.move(ev(1, -10, 0));
    touch.move(ev(2, 110, 0));
    queued.splice(0).forEach((run) => run());
    log.length = 0;
    moves.length = 0;
    touch.move(ev(1, -20, 0));
    touch.move(ev(2, 120, 0));
    expect(log).toEqual([]);
    queued.splice(0).forEach((run) => run());
    expect(log).toEqual(["two~ combined"]);
    const move = moves[0]!;
    if (move.kind !== "combined") {
      throw new Error(`expected a combined move, got ${move.kind}`);
    }
    expect(move.scale).toBeCloseTo(140 / 120, 12);
    expect(move.dx).toBeCloseTo(0, 12);
  });

  it("reports a waiting move before a finger lifts, and skips the stale report", () => {
    const queued: (() => void)[] = [];
    const { touch, log, ev } = record((run) => queued.push(run));
    touch.down(ev(1, 0, 0));
    touch.down(ev(2, 100, 0));
    touch.move(ev(1, -10, 0));
    touch.move(ev(2, 110, 0));
    log.length = 0;
    touch.up(ev(1, -10, 0));
    expect(log).toEqual(["begin combined", "two~ combined", "two-"]);
    queued.splice(0).forEach((run) => run());
    expect(log).toEqual(["begin combined", "two~ combined", "two-"]);
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
