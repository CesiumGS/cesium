// The corridor's point, dragged on the globe (spec scenario 6: "a draggable
// point"): a hit target over the point's marker (the marker is the label
// board's, as Orion's is), followed every frame. Dragged, the pointer's ray
// meets the ellipsoid, the evaluation's local placement takes that to the
// site grid's design feet, and the road gives its station and offset
// (`knobsAt`): the knobs move to them, rounded to their steps, and the
// worker answers there exactly. The sliders stay the keyboard's way in; the
// target is a pointer convenience, hidden from assistive technology.
import { Alignment } from "../../src/engineering/alignment.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import { vec3 } from "../../src/math/vec3.ts";
import type { Viewer } from "../../widgets/index.ts";
import type { ScenarioEvaluation } from "./scenarios/evaluate.ts";
import { CLOTHOID_ROAD } from "./scenarios/sites.ts";
import type { KnobSpec } from "./scenarios/spec.ts";

const road = new Alignment(CLOTHOID_ROAD);

/**
 * The station and offset of an Earth-fixed point `p` (m), through `toDesign`
 * (ITRF to design feet, column-major), rounded to the knobs' steps and kept
 * in their ranges; undefined off the road's ends.
 */
export function knobsAt(
  p: ArrayLike<number>,
  toDesign: readonly number[],
  knobs: readonly KnobSpec[],
): { station: number; offset: number } | undefined {
  const m = toDesign;
  const d = [0, 1].map(
    (i) => m[i]! * p[0]! + m[4 + i]! * p[1]! + m[8 + i]! * p[2]! + m[12 + i]!,
  );
  let found;
  try {
    found = road.stationOffset(d);
  } catch {
    // Beyond the road's start or end: nothing to snap to.
    return undefined;
  }
  const snap = (id: string, v: number) => {
    const k = knobs.find((x) => x.id === id);
    const step = k?.step ?? 1;
    const digits = Math.max(0, -Math.floor(Math.log10(step)) + 1);
    const r = Number((Math.round(v / step) * step).toFixed(digits));
    return Math.min(k?.max ?? Infinity, Math.max(k?.min ?? -Infinity, r));
  };
  return {
    station: snap("station", found.station),
    offset: snap("offset", found.offset),
  };
}

export interface PointDrag {
  /** The point as dragged, while it is: the marker follows it before the answer comes. */
  point(): Float64Array | undefined;
  /** Every frame: the target over the point, or hidden. */
  tick(): void;
  dispose(): void;
}

export function createPointDrag(deps: {
  viewer: Viewer;
  hud: HTMLElement;
  /** The current scenario's evaluation, while its scene shows. */
  evaluation(): ScenarioEvaluation | undefined;
  knobs(): readonly KnobSpec[];
  setKnobs(values: { station: number; offset: number }): void;
  refreshCallouts(): void;
}): PointDrag {
  const { viewer } = deps;
  const target = document.createElement("div");
  target.className = "fx-drag-target";
  target.setAttribute("aria-hidden", "true");
  target.title = "Drag the point along the road";
  target.hidden = true;
  deps.hud.append(target);
  let dragged: Float64Array | undefined;
  let pointer: number | undefined;

  /** Where the pointer's ray meets the ellipsoid, Earth-fixed metres. */
  function ground(e: PointerEvent): Float64Array | undefined {
    const rect = viewer.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return undefined;
    }
    const cam = viewer.view.camera;
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = 1 - ((e.clientY - rect.top) / rect.height) * 2;
    const dir = cam.rayDirection(ndcX, ndcY, rect.width / rect.height, vec3());
    const hit = Ellipsoid.WGS84.rayIntersection(cam.position, dir, vec3());
    return hit && Float64Array.from(hit);
  }

  function move(e: PointerEvent): void {
    const drag = deps.evaluation()?.drag;
    const p = drag && ground(e);
    if (!drag || !p) {
      return;
    }
    const k = knobsAt(p, drag.toDesign, deps.knobs());
    if (k) {
      dragged = p;
      deps.setKnobs(k);
      deps.refreshCallouts();
    }
  }

  const ac = new AbortController();
  const signal = ac.signal;
  target.addEventListener(
    "pointerdown",
    (e) => {
      if (!deps.evaluation()?.drag) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      pointer = e.pointerId;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic pointers can't be captured.
      }
      target.classList.add("fx-drag-target-active");
    },
    { signal },
  );
  target.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerId === pointer) {
        move(e);
      }
    },
    { signal },
  );
  const end = (e: PointerEvent) => {
    if (e.pointerId !== pointer) {
      return;
    }
    pointer = undefined;
    target.classList.remove("fx-drag-target-active");
    // The marker goes back to the answer's point once it is in.
    dragged = undefined;
    deps.refreshCallouts();
  };
  target.addEventListener("pointerup", end, { signal });
  target.addEventListener("pointercancel", end, { signal });

  function tick(): void {
    const drag = deps.evaluation()?.drag;
    const p = dragged ?? drag?.at;
    if (!p) {
      target.hidden = true;
      return;
    }
    const cam = viewer.view.camera;
    const w = viewer.canvas.clientWidth;
    const h = viewer.canvas.clientHeight;
    const d = [0, 1, 2].map((i) => p[i]! - cam.position[i]!);
    const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
      a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
    const z = dot(d, cam.direction);
    if (z <= 0 || w === 0 || h === 0) {
      target.hidden = true;
      return;
    }
    const aspect = w / h;
    const t = Math.tan(cam.fovy(aspect) / 2);
    const x = ((dot(d, cam.right) / (z * t * aspect) + 1) / 2) * w;
    const y = ((1 - dot(d, cam.up) / (z * t)) / 2) * h;
    target.hidden = x < 0 || x > w || y < 0 || y > h;
    target.style.transform = `translate(${x}px, ${y}px)`;
  }

  return {
    point: () => dragged,
    tick,
    dispose: () => {
      ac.abort();
      target.remove();
    },
  };
}
