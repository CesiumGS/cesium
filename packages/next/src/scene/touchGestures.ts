// Touch input for the camera controllers: one finger drags, two fingers
// pinch, drag or rotate (plan 5d's ruling 26). The tracker's core takes
// plain numbers and has no DOM dependency; `holdBrowserGestures` is the one
// piece that touches an element.

/** A point in CSS pixels. */
export interface TouchPoint {
  x: number;
  y: number;
}

/** What two fingers are doing: spreading, moving together, or turning. */
export type TwoFingerKind = "pinch" | "drag" | "rotate";

/** Total finger movement, in CSS pixels, before two fingers are classified. */
export const TWO_FINGER_THRESHOLD = 8;

/**
 * Classifies two fingers by how they moved from (a0, b0) to (a1, b1), or
 * returns undefined while the two have moved less than `threshold` CSS px
 * in total (summed over both fingers). Each kind is measured as the share
 * of the fingers' movement it explains: the change in their distance
 * (pinch), twice the midpoint's movement (drag), and the arc their angle
 * change sweeps at their distance (rotate). The largest wins; a tie goes
 * to drag, then pinch.
 */
export function classifyTwoFinger(
  a0: TouchPoint,
  b0: TouchPoint,
  a1: TouchPoint,
  b1: TouchPoint,
  threshold = TWO_FINGER_THRESHOLD,
): TwoFingerKind | undefined {
  const moved =
    Math.hypot(a1.x - a0.x, a1.y - a0.y) + Math.hypot(b1.x - b0.x, b1.y - b0.y);
  if (moved < threshold) {
    return undefined;
  }
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
  const pinch = Math.abs(d1 - d0);
  const drag =
    2 *
    Math.hypot(
      (a1.x + b1.x - a0.x - b0.x) / 2,
      (a1.y + b1.y - a0.y - b0.y) / 2,
    );
  const rotate =
    d0 > 0 && d1 > 0
      ? Math.abs(wrap(angleOf(a1, b1) - angleOf(a0, b0))) * ((d0 + d1) / 2)
      : 0;
  if (drag >= pinch && drag >= rotate) {
    return "drag";
  }
  return pinch >= rotate ? "pinch" : "rotate";
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
 * One report of a classified two-finger gesture, since the last one. The
 * midpoint is in CSS pixels. Screen angles are measured clockwise (y points
 * down), so a clockwise turn of the fingers is positive.
 */
export type TwoFingerMove =
  | { kind: "pinch"; x: number; y: number; scale: number }
  | { kind: "drag"; x: number; y: number; dx: number; dy: number }
  | { kind: "rotate"; x: number; y: number; angle: number };

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
   * The two fingers were classified, at this midpoint. Movement before this
   * (the first 8 px) is dropped; `twoMove` reports from here on.
   */
  twoBegin?(kind: TwoFingerKind, x: number, y: number): void;
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
 * one-finger gesture, so nothing jumps. Two fingers are classified once, and
 * stay that kind until a finger lifts. A third finger is ignored. Lifting
 * back to one finger starts a fresh one-finger gesture where that finger is.
 * Pointers of other types are ignored.
 */
export class TouchGestures {
  private fingers: Finger[] = [];
  private kind: TwoFingerKind | undefined;
  /** Where the two fingers were when the second one came down. */
  private start: [TouchPoint, TouchPoint] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  /** The pair's midpoint, distance and angle at the last report. */
  private last = { x: 0, y: 0, distance: 0, angle: 0 };

  constructor(
    private readonly listener: TouchGestureListener,
    private readonly threshold = TWO_FINGER_THRESHOLD,
  ) {}

  /** The fingers followed (at most two). */
  get count(): number {
    return this.fingers.length;
  }

  /** The two fingers' kind once classified. */
  get twoFingerKind(): TwoFingerKind | undefined {
    return this.kind;
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
    this.kind = undefined;
    this.start = [
      { x: a.x, y: a.y },
      { x: b.x, y: b.y },
    ];
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
    if (this.kind === undefined) {
      this.kind = classifyTwoFinger(
        this.start[0],
        this.start[1],
        a,
        b,
        this.threshold,
      );
      if (this.kind !== undefined) {
        this.remember(a, b);
        this.listener.twoBegin?.(this.kind, m.x, m.y);
      }
      return;
    }
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = angleOf(a, b);
    const last = this.last;
    if (this.kind === "pinch") {
      // A zero distance has no ratio; wait for the fingers to part.
      if (last.distance > 0 && distance > 0) {
        this.listener.twoMove?.({
          kind: "pinch",
          x: m.x,
          y: m.y,
          scale: distance / last.distance,
        });
        this.remember(a, b);
      }
      return;
    }
    if (this.kind === "drag") {
      this.listener.twoMove?.({
        kind: "drag",
        x: m.x,
        y: m.y,
        dx: m.x - last.x,
        dy: m.y - last.y,
      });
    } else {
      this.listener.twoMove?.({
        kind: "rotate",
        x: m.x,
        y: m.y,
        angle: wrap(angle - last.angle),
      });
    }
    this.remember(a, b);
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
    this.kind = undefined;
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
