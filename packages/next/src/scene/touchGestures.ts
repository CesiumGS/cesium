// Touch input for the camera controllers: one finger drags; two fingers
// pinch, twist and pan together, or tilt (plan 5d's ruling 26). The tracker
// takes plain numbers and has no DOM dependency; `holdBrowserGestures` is
// the one piece that touches an element.

/** A point in CSS pixels. */
export interface TouchPoint {
  x: number;
  y: number;
}

/**
 * What two fingers are doing: `combined` (pinch, twist and pan at once, as
 * the maps apps do) or `tilt` (both sliding up or down together).
 */
export type TwoFingerMode = "combined" | "tilt";

/** Total finger movement, in CSS pixels, within which `tilt` is decided. */
export const TILT_DECISION_DISTANCE = 10;

/**
 * Whether two fingers that moved from (a0, b0) to (a1, b1) are tilting:
 * each finger's move is mostly vertical (|dy| > 2 |dx|), both go the same
 * way, and the distance between them changed by less than 10%.
 */
export function isTilt(
  a0: TouchPoint,
  b0: TouchPoint,
  a1: TouchPoint,
  b1: TouchPoint,
): boolean {
  const mostlyVertical = (p: TouchPoint, q: TouchPoint) =>
    Math.abs(q.y - p.y) > 2 * Math.abs(q.x - p.x);
  if (!mostlyVertical(a0, a1) || !mostlyVertical(b0, b1)) {
    return false;
  }
  if (Math.sign(a1.y - a0.y) !== Math.sign(b1.y - b0.y)) {
    return false;
  }
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
  return d0 > 0 && Math.abs(d1 - d0) < 0.1 * d0;
}

function angleOf(a: TouchPoint, b: TouchPoint): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** An angle brought into (−π, π]. */
function wrap(angle: number): number {
  const turn = 2 * Math.PI;
  const a = angle - turn * Math.round(angle / turn);
  return a <= -Math.PI ? a + turn : a;
}

/**
 * One report of two fingers, since the last one. The midpoint is in CSS
 * pixels. Screen angles are measured clockwise (y points down), so a
 * clockwise turn of the fingers is positive.
 *
 * `combined` carries all three at once: `scale` is the ratio of the
 * distances between the fingers (now over before; 1 when either is zero),
 * `angle` the change in the line between them, and `dx`, `dy` the
 * midpoint's movement; `x`, `y` is the midpoint now. `tilt` carries the
 * midpoint's movement only.
 */
export type TwoFingerMove =
  | {
      kind: "combined";
      x: number;
      y: number;
      scale: number;
      angle: number;
      dx: number;
      dy: number;
    }
  | { kind: "tilt"; x: number; y: number; dx: number; dy: number };

/** What the controller hears. Positions are CSS pixels (client coordinates). */
export interface TouchGestureListener {
  /** A first finger went down. */
  oneStart?(x: number, y: number): void;
  oneMove?(x: number, y: number): void;
  /**
   * The one-finger gesture is over: the finger lifted, or a second finger
   * joined (`twoStart` follows at once).
   */
  oneEnd?(): void;
  /** A second finger went down; `x`, `y` is the midpoint. */
  twoStart?(x: number, y: number): void;
  /**
   * The two fingers moved 10 px in total and were decided: `tilt`, or
   * `combined` (which is the case from the start, until then). The movement
   * so far is reported by the `twoMove` that follows at once.
   */
  twoBegin?(mode: TwoFingerMode, x: number, y: number): void;
  twoMove?(move: TwoFingerMove): void;
  /** A finger of the pair lifted. A fresh one-finger gesture follows (`oneStart`). */
  twoEnd?(): void;
}

/** The parts of a PointerEvent the tracker reads. */
export interface TouchEventLike {
  pointerId: number;
  pointerType?: string;
  clientX: number;
  clientY: number;
}

interface Finger extends TouchPoint {
  id: number;
}

/**
 * Follows the touch pointers on one element and turns them into one-finger
 * and two-finger gestures for a listener. A second finger ends the
 * one-finger gesture, so nothing jumps. Two fingers pinch, twist and pan at
 * every move, unthresholded, unless both start sliding up or down together
 * within the first 10 px of movement: that is a tilt, and only tilt applies
 * until a finger lifts. A third finger is ignored. Lifting back to one
 * finger starts a fresh one-finger gesture where that finger is. Pointers
 * of other types are ignored.
 */
export class TouchGestures {
  private fingers: Finger[] = [];
  private mode: TwoFingerMode | undefined;
  /** Where the two fingers were when the second one came down. */
  private start: [TouchPoint, TouchPoint] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  /** The pair's midpoint, distance and angle at the last report. */
  private last = { x: 0, y: 0, distance: 0, angle: 0 };

  constructor(private readonly listener: TouchGestureListener) {}

  /** The fingers followed (at most two). */
  get count(): number {
    return this.fingers.length;
  }

  /** The two fingers' mode once decided. */
  get twoFingerMode(): TwoFingerMode | undefined {
    return this.mode;
  }

  /** Follows a touch pointer that went down; false if it is ignored. */
  down(e: TouchEventLike): boolean {
    if (
      e.pointerType !== "touch" ||
      this.fingers.length >= 2 ||
      this.find(e.pointerId)
    ) {
      return false;
    }
    this.fingers.push({ id: e.pointerId, x: e.clientX, y: e.clientY });
    if (this.fingers.length === 1) {
      this.listener.oneStart?.(e.clientX, e.clientY);
      return true;
    }
    this.listener.oneEnd?.();
    const [a, b] = this.fingers as [Finger, Finger];
    this.mode = undefined;
    this.start = [
      { x: a.x, y: a.y },
      { x: b.x, y: b.y },
    ];
    this.remember(a, b);
    const m = midpoint(a, b);
    this.listener.twoStart?.(m.x, m.y);
    return true;
  }

  move(e: TouchEventLike): void {
    const finger =
      e.pointerType === "touch" ? this.find(e.pointerId) : undefined;
    if (!finger) {
      return;
    }
    finger.x = e.clientX;
    finger.y = e.clientY;
    if (this.fingers.length === 1) {
      this.listener.oneMove?.(finger.x, finger.y);
      return;
    }
    const [a, b] = this.fingers as [Finger, Finger];
    const m = midpoint(a, b);
    if (this.mode === undefined) {
      const [a0, b0] = this.start;
      const moved =
        Math.hypot(a.x - a0.x, a.y - a0.y) + Math.hypot(b.x - b0.x, b.y - b0.y);
      if (moved < TILT_DECISION_DISTANCE) {
        return;
      }
      this.mode = isTilt(a0, b0, a, b) ? "tilt" : "combined";
      this.listener.twoBegin?.(this.mode, m.x, m.y);
    }
    const last = this.last;
    if (this.mode === "tilt") {
      this.listener.twoMove?.({
        kind: "tilt",
        x: m.x,
        y: m.y,
        dx: m.x - last.x,
        dy: m.y - last.y,
      });
      this.remember(a, b);
      return;
    }
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    // A zero distance has no ratio or angle: wait for the fingers to part.
    const usable = last.distance > 0 && distance > 0;
    this.listener.twoMove?.({
      kind: "combined",
      x: m.x,
      y: m.y,
      scale: usable ? distance / last.distance : 1,
      angle: usable ? wrap(angleOf(a, b) - last.angle) : 0,
      dx: m.x - last.x,
      dy: m.y - last.y,
    });
    if (usable) {
      this.remember(a, b);
    } else {
      this.last = { ...this.last, x: m.x, y: m.y };
    }
  }

  /** A touch pointer lifted or was cancelled. */
  up(e: TouchEventLike): void {
    if (e.pointerType !== "touch") {
      return;
    }
    const finger = this.find(e.pointerId);
    if (!finger) {
      return;
    }
    const wasTwo = this.fingers.length === 2;
    this.fingers = this.fingers.filter((f) => f !== finger);
    this.mode = undefined;
    if (wasTwo) {
      this.listener.twoEnd?.();
      const rest = this.fingers[0]!;
      this.listener.oneStart?.(rest.x, rest.y);
    } else {
      this.listener.oneEnd?.();
    }
  }

  private find(id: number): Finger | undefined {
    return this.fingers.find((f) => f.id === id);
  }

  private remember(a: TouchPoint, b: TouchPoint): void {
    const m = midpoint(a, b);
    this.last = {
      x: m.x,
      y: m.y,
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      angle: angleOf(a, b),
    };
  }
}

function midpoint(a: TouchPoint, b: TouchPoint): TouchPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ------------------------------------------------------- browser defaults

/** The style properties a touch-driven element takes over, and their values. */
const HELD_STYLES: Record<string, string> = {
  "touch-action": "none",
  "user-select": "none",
  "-webkit-user-select": "none",
  "-webkit-touch-callout": "none",
  "overscroll-behavior": "none",
};

interface Hold {
  count: number;
  saved: Map<string, string>;
  listeners: AbortController;
}

const holds = new WeakMap<object, Hold>();

/** The element's style, unless it is a stand-in without a real one (tests). */
function usableStyle(element: HTMLElement): CSSStyleDeclaration | undefined {
  const style = element.style as Partial<CSSStyleDeclaration> | undefined;
  return typeof style?.getPropertyValue === "function" &&
    typeof style.setProperty === "function" &&
    typeof style.removeProperty === "function"
    ? (style as CSSStyleDeclaration)
    : undefined;
}

/**
 * Keeps the browser's own touch handling off an element that takes input,
 * so a pinch over it neither zooms the page nor opens the tab overview, and
 * a long press shows no callout or selection: `touch-action`,
 * `user-select` and `overscroll-behavior` go to none, Safari's
 * `gesturestart`, `gesturechange` and `gestureend` are prevented, and so
 * are `touchstart` and `touchmove` (Safari needs that beyond
 * `touch-action`). Only this element is touched: the page's other elements
 * scroll as they did.
 *
 * Returns the function that lets go. Holds are counted per element, so two
 * holders on one canvas don't fight: the old style values come back, and
 * the listeners go, when the last holder lets go.
 */
export function holdBrowserGestures(element: HTMLElement): () => void {
  let hold = holds.get(element);
  if (!hold) {
    const listeners = new AbortController();
    const signal = listeners.signal;
    const stop = (e: Event) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };
    for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
      element.addEventListener(type, stop, { signal });
    }
    for (const type of ["touchstart", "touchmove"]) {
      element.addEventListener(type, stop, { signal, passive: false });
    }
    const saved = new Map<string, string>();
    // A stand-in for an element (in tests) has no style.
    const style = usableStyle(element);
    if (style) {
      for (const [name, value] of Object.entries(HELD_STYLES)) {
        saved.set(name, style.getPropertyValue(name));
        style.setProperty(name, value);
      }
    }
    hold = { count: 0, saved, listeners };
    holds.set(element, hold);
  }
  hold.count++;
  const held = hold;
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    if (--held.count > 0) {
      return;
    }
    holds.delete(element);
    held.listeners.abort();
    const style = usableStyle(element);
    for (const [name, value] of held.saved) {
      if (value === "") {
        style?.removeProperty(name);
      } else {
        style?.setProperty(name, value);
      }
    }
  };
}
