// The measure tool's labels over the globe (plan 4b Task 19; the frames
// explorer's DESIGN.md "Labels"): HTML, placed by projecting each point
// each frame the camera or the morph moves. The design-distance pills, the
// ends, the station marker's pin, NGS's survey disk and the ruler's note;
// a line under 24 px on the screen gets none (far off, it would only
// clutter), and two pills that would overlap keep the earlier one.
import type { SnapKind } from "../../src/engineering/EngineeringFrame.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import type { Answers } from "./answers.ts";
import { stationText } from "./measureModel.ts";
import {
  drawnAt,
  openerView,
  rulerGap,
  type DrawState,
  type Opener,
  type OpenerFigures,
  type OpenerId,
} from "./measureOpeners.ts";
import type { MeasureState } from "./measureState.ts";

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
  /** The snap under the pointer. */
  readonly hover?: {
    readonly x: number;
    readonly y: number;
    readonly kind: SnapKind;
    readonly exact: boolean;
  };
  /** The view's centre is marked (keyboard measuring). */
  readonly crosshair: boolean;
  /** The openers' line as drawn now. */
  readonly figures: Readonly<Partial<Record<OpenerId, OpenerFigures>>>;
}

/** Labels farther than this from the camera are left out, metres. */
const LABEL_RANGE = 30_000;
/** The ruler's note shows within this of its far end, metres. */
const RULER_RANGE = 400;

/** A store whose listeners are told once per animation frame. */
export function liveStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  let queued = 0;
  return {
    get: () => value,
    set(next: T) {
      value = next;
      if (queued === 0) {
        queued = requestAnimationFrame(() => {
          queued = 0;
          for (const l of [...listeners]) {
            l();
          }
        });
      }
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    dispose: () => cancelAnimationFrame(queued),
  };
}

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
  readonly hover: MeasureLive["hover"];
  readonly crosshair: boolean;
}

/** The labels and the openers' live figures, for this frame. */
export function placeLabels(input: LabelInput): MeasureLive {
  const { view, answers: a, draw: s, openers, state, hover, crosshair } = input;
  const seen = (p: ArrayLike<number>): Float64Array | undefined => {
    const cam = view.camera;
    const to = [0, 1, 2].map((k) => cam.position[k]! - p[k]!);
    const up = new Float64Array(3);
    Ellipsoid.WGS84.geodeticSurfaceNormal(Float64Array.from(p), up);
    if (
      Math.hypot(to[0]!, to[1]!, to[2]!) > LABEL_RANGE ||
      // Below the camera's horizon from there.
      to[0]! * up[0]! + to[1]! * up[1]! + to[2]! * up[2]! < 0
    ) {
      return undefined;
    }
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
    const f = openerView(o, a, s);
    figures[o.id] = f;
    const pa = drawnAt(o.shown.a, s.t, s.exaggeration);
    const pb = drawnAt(o.shown.b, s.t, s.exaggeration);
    const text =
      o.id === "marker"
        ? f.drawn !== undefined
          ? `${f.drawn} drawn apart`
          : "Not to scale"
        : `${f.design} design`;
    label(o.id, pa, pb, text, o.quiet ? "quiet" : "measure");
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
    if (o.id === "pair" && cameraTo(pb) < RULER_RANGE) {
      const gap = rulerGap(a);
      const ruler = seen(pb);
      if (ruler !== undefined && gap !== undefined) {
        pills.push({
          key: "ruler",
          x: ruler[0]!,
          y: ruler[1]! + 26,
          text: gap,
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
    label(
      "user",
      drawnAt(state.a, s.t, s.exaggeration),
      drawnAt(state.b, s.t, s.exaggeration),
      input.userText,
      "measure",
      true,
    );
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
