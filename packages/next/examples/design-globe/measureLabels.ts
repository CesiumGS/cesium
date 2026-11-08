// The measure tool's labels over the globe (plan 4b Task 19; the frames
// explorer's DESIGN.md "Labels"): HTML, placed by projecting each point
// each frame the camera or the morph moves. The design-distance pills, the
// ends, the station marker's pin, NGS's survey disk and the ruler's note;
// a line under 24 px on the screen gets none (far off, it would only
// clutter), and two pills that would overlap keep the earlier one.
import type { SnapKind } from "../../src/engineering/EngineeringFrame.ts";
import type { Answers } from "./answers.ts";
import { stationText } from "./measureModel.ts";
import {
  drawnAt,
  openerView,
  type DrawState,
  type Opener,
  type OpenerFigures,
  type OpenerId,
  PENDING,
  type OpenerMeasured,
  type RulerEnd,
} from "./measureOpeners.ts";
import { rulerTips } from "./measureOverlay.ts";
import type { MeasureState } from "./measureState.ts";
import { createStore, type StoreFrame } from "./stores.ts";

/** Labels over the canvas, placed each frame the camera or the morph moves. */
export interface MeasureLive {
  readonly pills: readonly {
    readonly key: string;
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly tone: "measure" | "quiet" | "ruler";
  }[];
  readonly dots: readonly {
    readonly key: string;
    readonly x: number;
    readonly y: number;
    readonly tone: "measure" | "truth";
  }[];
  /** Station 170,000's true position, labelled. */
  readonly marker?: {
    readonly x: number;
    readonly y: number;
    readonly text: string;
  };
  /** The survey mark's disk. */
  readonly disk?: {
    readonly x: number;
    readonly y: number;
    /** The datasheet card opens left of the disk, and above it, to stay in the view. */
    readonly left: boolean;
    readonly up: boolean;
  };
  /** The snap preview: where a click would land now (feedback F5). */
  readonly hover?: {
    readonly x: number;
    readonly y: number;
    readonly kind: SnapKind;
    readonly exact: boolean;
    /** The client's snap, while the exact service is still asked. */
    readonly provisional: boolean;
  };
  /** The view's centre is marked (keyboard measuring). */
  readonly crosshair: boolean;
  /** The openers' line as drawn now. */
  readonly figures: Readonly<Partial<Record<OpenerId, OpenerFigures>>>;
}

/** Labels farther than this from the camera are left out, metres. */
const LABEL_RANGE = 30_000;
/** The ruler's note shows once its last ticks are this far apart on the screen, CSS px. */
export const RULER_PX = 4;
/** A quiet line's label shows within this of the camera, metres (not at the horizon). */
const QUIET_RANGE = 15_000;
/** The user's pill shows within this of the camera, or three times its line's length, metres. */
const USER_RANGE = 5_000;

const distance = (p: ArrayLike<number>, q: ArrayLike<number>) =>
  Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);

/** A store whose listeners are told once per frame, after the render, on every `set`. */
export const liveStore = <T>(initial: T, frame: StoreFrame) =>
  createStore(initial, frame, { always: true });

/** The view the labels are projected with. */
export interface LabelView {
  readonly camera: { readonly position: ArrayLike<number> };
  toPixel(p: ArrayLike<number>): Float64Array | undefined;
}

/** What `placeLabels` places. */
export interface LabelInput {
  readonly view: LabelView;
  /** The view's size, CSS pixels. */
  readonly width: number;
  readonly height: number;
  readonly answers: Answers | undefined;
  readonly draw: DrawState;
  readonly openers: readonly Opener[];
  readonly state: MeasureState;
  /** The user's pill: its design distance, or why there is none. */
  readonly userText: string;
  /** The openers' figures from the page's `measure`, by opener. */
  readonly measured: ReadonlyMap<OpenerId, OpenerMeasured>;
  /** The ruler's far end, once the pair is measured. */
  readonly ruler: RulerEnd | undefined;
  readonly hover: MeasureLive["hover"];
  readonly crosshair: boolean;
}

/**
 * Whether the Earth hides `p` from the camera at `c`: the straight line
 * between them dips under a sphere a little inside the ground at both ends.
 * (A point above the camera's height but in view is seen: the tour's lifted
 * shots look up at the marker's line.)
 */
export function behindEarth(
  c: ArrayLike<number>,
  p: ArrayLike<number>,
): boolean {
  const d = [0, 1, 2].map((k) => p[k]! - c[k]!);
  const dd = d[0]! * d[0]! + d[1]! * d[1]! + d[2]! * d[2]!;
  if (dd === 0) {
    return false;
  }
  const t = Math.min(
    1,
    Math.max(0, -(c[0]! * d[0]! + c[1]! * d[1]! + c[2]! * d[2]!) / dd),
  );
  const closest = Math.hypot(...[0, 1, 2].map((k) => c[k]! + t * d[k]!));
  const radius = Math.min(
    Math.hypot(c[0]!, c[1]!, c[2]!),
    Math.hypot(p[0]!, p[1]!, p[2]!),
  );
  return closest < radius - EARTH_MARGIN;
}

/** How far under the lower end the line may dip before the Earth hides it, metres. */
const EARTH_MARGIN = 200;

/** The labels and the openers' live figures, for this frame. */
export function placeLabels(input: LabelInput): MeasureLive {
  const { view, answers: a, draw: s, openers, state, hover, crosshair } = input;
  const seen = (p: ArrayLike<number>): Float64Array | undefined => {
    const c = view.camera.position;
    if (
      Math.hypot(c[0]! - p[0]!, c[1]! - p[1]!, c[2]! - p[2]!) > LABEL_RANGE ||
      behindEarth(c, p)
    ) {
      return undefined;
    }
    // In front of the camera (`toPixel` is undefined behind it).
    return view.toPixel(p);
  };
  const pills: MeasureLive["pills"][number][] = [];
  const dots: MeasureLive["dots"][number][] = [];
  const figures: Partial<Record<OpenerId, OpenerFigures>> = {};
  let marker: MeasureLive["marker"];
  let disk: MeasureLive["disk"];
  const middle = (p: Float64Array, q: Float64Array) =>
    Float64Array.from([0, 1, 2].map((k) => (p[k]! + q[k]!) / 2));
  /**
   * A line's pill and end dots; none when the line is under 24 px on the
   * screen (far off, it would only clutter). Whether it is labelled.
   */
  const label = (
    key: string,
    pa: Float64Array,
    pb: Float64Array,
    text: string,
    tone: "measure" | "quiet",
    first = false,
  ): boolean => {
    const ea = seen(pa);
    const eb = seen(pb);
    if (
      ea !== undefined &&
      eb !== undefined &&
      Math.hypot(ea[0]! - eb[0]!, ea[1]! - eb[1]!) < 24
    ) {
      return false;
    }
    const mid = seen(middle(pa, pb));
    if (mid !== undefined) {
      const pill = { key, x: mid[0]!, y: mid[1]!, text, tone };
      // The user's own first: it wins a clash with an opener's.
      if (first) {
        pills.unshift(pill);
      } else {
        pills.push(pill);
      }
    }
    [ea, eb].forEach((e, i) => {
      if (e !== undefined) {
        dots.push({
          key: `${key}-${i}`,
          x: e[0]!,
          y: e[1]!,
          tone: "measure",
        });
      }
    });
    return true;
  };
  const cameraTo = (p: ArrayLike<number>) => {
    const c = view.camera.position;
    return Math.hypot(c[0]! - p[0]!, c[1]! - p[1]!, c[2]! - p[2]!);
  };
  for (const o of openers) {
    if (a === undefined) {
      break;
    }
    const f = openerView(o, a, s, input.measured.get(o.id));
    figures[o.id] = f;
    const pa = drawnAt(o.shown.a, s.t, s.exaggeration);
    const pb = drawnAt(o.shown.b, s.t, s.exaggeration);
    const text =
      o.id === "marker"
        ? f.drawn !== undefined
          ? `${f.drawn} drawn apart`
          : undefined
        : f.design === PENDING
          ? "Measuring…"
          : `${f.design} horizontal`;
    // Exaggerated, the self-check's gap has no figure, and the toolbar's
    // badge and the headlines already say so: no pill (UX review P5).
    if (
      text !== undefined &&
      (!o.quiet || cameraTo(middle(pa, pb)) < QUIET_RANGE)
    ) {
      label(o.id, pa, pb, text, o.quiet ? "quiet" : "measure");
    }
    // The fixed ends: the marker's pin and the survey disk.
    const fixedAt = seen(pa);
    if (o.id === "marker" && fixedAt !== undefined) {
      marker = {
        x: fixedAt[0]!,
        y: fixedAt[1]!,
        text: `Sta. ${stationText(a.marker.station)}, where it truly is`,
      };
    } else if (o.id === "mark" && fixedAt !== undefined) {
      disk = {
        x: fixedAt[0]!,
        y: fixedAt[1]!,
        left: fixedAt[0]! > input.width / 2,
        up: fixedAt[1]! > input.height / 2,
      };
    }
    // The ruler's gap shows only within a few hundred feet of its far
    // end, where its ticks can be told apart.
    // The ruler's note, only where its bracket can be seen: the two last
    // ticks' tips at least `RULER_PX` apart on the screen.
    if (o.id === "pair" && input.ruler !== undefined) {
      const [ta, tb] = rulerTips(o, input.ruler).map((e) =>
        seen(drawnAt(e, s.t, s.exaggeration)),
      );
      if (
        ta !== undefined &&
        tb !== undefined &&
        Math.hypot(ta[0]! - tb[0]!, ta[1]! - tb[1]!) >= RULER_PX
      ) {
        pills.push({
          key: "ruler",
          x: (ta[0]! + tb[0]!) / 2,
          y: (ta[1]! + tb[1]!) / 2 + 30,
          text: input.ruler.text,
          tone: "ruler",
        });
      }
    }
  }
  if (state.phase === "first") {
    const p = seen(drawnAt(state.a, s.t, s.exaggeration));
    if (p !== undefined) {
      dots.push({ key: "user-0", x: p[0]!, y: p[1]!, tone: "measure" });
    }
  } else if (state.phase === "done") {
    const ua = drawnAt(state.a, s.t, s.exaggeration);
    const ub = drawnAt(state.b, s.t, s.exaggeration);
    // Not from anywhere: within a few times its length, or 5 km (page M7).
    const reach = Math.max(USER_RANGE, 3 * distance(ua, ub));
    if (cameraTo(middle(ua, ub)) < reach) {
      label("user", ua, ub, input.userText, "measure", true);
    }
  }
  return {
    pills: declutter(pills.map((p) => keepInside(p, input.width))),
    dots,
    ...(marker !== undefined && { marker }),
    ...(disk !== undefined && { disk }),
    ...(hover !== undefined && { hover }),
    crosshair,
    figures,
  };
}

/** A pill moved sideways to stay inside a view `width` CSS pixels wide. */
function keepInside<T extends { x: number; text: string }>(
  p: T,
  width: number,
): T {
  const half = (p.text.length * 7 + 16) / 2;
  const x = Math.min(Math.max(p.x, half + 6), width - half - 6);
  return x === p.x || width < 2 * half + 12 ? p : { ...p, x };
}

/**
 * Hides the lower-priority of two pills that would overlap (earlier first),
 * by an estimate of their size: 7 px a character, 22 px tall.
 */
function declutter<T extends { x: number; y: number; text: string }>(
  pills: readonly T[],
): T[] {
  const kept: T[] = [];
  for (const p of pills) {
    const w = p.text.length * 7 + 16;
    const clash = kept.some((q) => {
      const qw = q.text.length * 7 + 16;
      return Math.abs(p.x - q.x) < (w + qw) / 2 && Math.abs(p.y - q.y) < 24;
    });
    if (!clash) {
      kept.push(p);
    }
  }
  return kept;
}
