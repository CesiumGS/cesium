import type { View } from "@cesium/next";
import { add, dot, scale, sub, type Site, type V3 } from "./site.ts";
import { designToTrue, planeAxes, type SectionState } from "./sections.ts";

/** Half the side of the plane drawn, m. */
export const PLANE_EXTENT = 120;
/** How far the arrow reaches from the plane, m. */
const ARROW = 36;
/** The rotate handle's distance from the plane's middle, as a share of its half side. */
const ROTATE_AT = 0.6;
const SMALLEST_BOX = 1;
const SVG = "http://www.w3.org/2000/svg";

type HandleKind =
  | "offset"
  | "rotate"
  | "move"
  | "face0"
  | "face1"
  | "face2"
  | "face3"
  | "face4"
  | "face5";

interface Layer {
  readonly view: View;
  readonly interactive: boolean;
  readonly root: HTMLDivElement;
  readonly svg: SVGSVGElement;
  readonly planes: SVGPathElement[];
  readonly box: SVGPathElement;
  readonly arrow: SVGLineElement;
  readonly handles: Map<HandleKind, SVGElement>;
}

/** The drag under way. */
interface Drag {
  readonly kind: HandleKind;
  readonly layer: Layer;
  readonly start: SectionState;
  /** Where the pointer was and the parameter along the handle's line there. */
  readonly x: number;
  readonly y: number;
  readonly s0: number;
  readonly grab: V3;
}

const svgElement = <K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
): SVGElementTagNameMap[K] => {
  const e = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) {
    e.setAttribute(name, value);
  }
  return e;
};

/** The parameter `s` of the point on the line `p + s·u` nearest the ray `o + t·d`, or undefined when they are parallel. */
export function nearestOnLine(o: V3, d: V3, p: V3, u: V3): number | undefined {
  const w = sub(o, p);
  const b = dot(d, u);
  const denominator = 1 - b * b;
  if (denominator < 1e-6) {
    return undefined;
  }
  return (dot(u, w) - b * dot(d, w)) / denominator;
}

/**
 * The section's handles over the views, as a drawing in the page and not in
 * the scene: a clip cuts everything its view draws, so a handle drawn there
 * would be cut by its own plane. Each view with the overlay shows the
 * planes and the box where that view's camera sees them; the one that is
 * interactive also has the handles: an arrow to drag the plane along its
 * normal, a knob to turn it, a handle on each face of the box to resize it
 * and one in its middle to move it. The drawing is re-projected from the
 * camera each tick (`update`), and the state it edits is the application's
 * (`changed` says when it moved).
 */
export class SectionOverlay {
  private readonly layers: Layer[] = [];
  private drag: Drag | undefined;

  constructor(
    private readonly container: HTMLElement,
    private readonly site: Site,
    private readonly state: SectionState,
    private readonly changed: () => void,
  ) {}

  /** Draws over `view`'s part of the container. The returned function removes it. */
  addLayer(view: View, interactive: boolean): () => void {
    const root = document.createElement("div");
    root.className = "cl-overlay";
    const svg = svgElement("svg", { class: "cl-overlay-svg" });
    root.append(svg);
    const planes = [0, 1].map(() => svgElement("path", { class: "cl-plane" }));
    const box = svgElement("path", { class: "cl-box" });
    const arrow = svgElement("line", { class: "cl-arrow" });
    svg.append(...planes, box, arrow);
    const handles = new Map<HandleKind, SVGElement>();
    if (interactive) {
      const handle = (kind: HandleKind, shape: SVGElement, label: string) => {
        shape.setAttribute("class", `cl-handle cl-handle-${kind}`);
        shape.dataset.handle = kind;
        const title = svgElement("title");
        title.textContent = label;
        shape.append(title);
        handles.set(kind, shape);
        svg.append(shape);
      };
      handle(
        "offset",
        svgElement("circle", { r: "9" }),
        "Drag to move the plane along its normal",
      );
      handle(
        "rotate",
        svgElement("circle", { r: "9" }),
        "Drag to turn the plane: left and right for its heading, up and down for its tilt",
      );
      handle(
        "move",
        svgElement("circle", { r: "8" }),
        "Drag to move the box over the ground",
      );
      for (let k = 0; k < 6; k++) {
        handle(
          `face${k}` as HandleKind,
          svgElement("rect", { width: "12", height: "12", rx: "2" }),
          "Drag to resize the box from this face",
        );
      }
    }
    const layer: Layer = {
      view,
      interactive,
      root,
      svg,
      planes,
      box,
      arrow,
      handles,
    };
    this.layers.push(layer);
    this.container.append(root);
    if (interactive) {
      svg.addEventListener("pointerdown", this.onDown);
      svg.addEventListener("pointermove", this.onMove);
      svg.addEventListener("pointerup", this.onUp);
      svg.addEventListener("pointercancel", this.onUp);
    }
    this.layout(layer);
    return () => {
      this.layers.splice(this.layers.indexOf(layer), 1);
      root.remove();
    };
  }

  /** Places each layer over its view's viewport. */
  private layout(layer: Layer): void {
    const { x, y, width, height } = layer.view.viewport;
    const style = layer.root.style;
    style.left = `${x * 100}%`;
    style.top = `${y * 100}%`;
    style.width = `${width * 100}%`;
    style.height = `${height * 100}%`;
  }

  /** Where a local point is in the layer's view, pixels from its top left. */
  private project(layer: Layer, local: V3): [number, number] | undefined {
    const p = layer.view.toPixel(this.site.world(local));
    return p ? [p[0]!, p[1]!] : undefined;
  }

  private planePoint = (local: V3): V3 =>
    this.state.curved ? designToTrue(local) : local;

  /** Re-projects every layer: call it each tick. */
  update(): void {
    for (const layer of this.layers) {
      this.layout(layer);
      this.drawLayer(layer);
    }
  }

  private drawLayer(layer: Layer): void {
    const { state } = this;
    const { plane, box } = state;
    const { n, a, b } = planeAxes(plane.heading, plane.tilt);
    const line = (points: ([number, number] | undefined)[]) => {
      let d = "";
      let pen = false;
      for (const p of points) {
        if (!p) {
          pen = false;
          continue;
        }
        d += `${pen ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
        pen = true;
      }
      return d;
    };
    // A quad of the plane through the middle, spanned by `u` and `v`, as a grid.
    const grid = (u: V3, v: V3, cells: number) => {
      const at = (i: number, j: number) =>
        this.project(
          layer,
          this.planePoint(
            add(
              plane.center,
              add(
                scale(u, ((2 * i) / cells - 1) * PLANE_EXTENT),
                scale(v, ((2 * j) / cells - 1) * PLANE_EXTENT),
              ),
            ),
          ),
        );
      const parts: string[] = [];
      // The outline, closed so it can be filled.
      const ring: ([number, number] | undefined)[] = [];
      for (let j = 0; j <= cells; j++) {
        ring.push(at(0, j));
      }
      for (let i = 1; i <= cells; i++) {
        ring.push(at(i, cells));
      }
      for (let j = cells - 1; j >= 0; j--) {
        ring.push(at(cells, j));
      }
      for (let i = cells - 1; i > 0; i--) {
        ring.push(at(i, 0));
      }
      if (ring.every((p) => p !== undefined)) {
        parts.push(`${line(ring)}Z`);
      }
      for (let i = 0; i <= cells; i++) {
        const edge = i === 0 || i === cells;
        const lines = [
          line(Array.from({ length: cells + 1 }, (_, j) => at(i, j))),
          line(Array.from({ length: cells + 1 }, (_, j) => at(j, i))),
        ];
        parts.push(...(edge || i % 2 === 0 ? lines : []));
      }
      return parts.join("");
    };
    const cells = state.curved ? 16 : 8;
    layer.planes[0]!.setAttribute("d", plane.on ? grid(a, b, cells) : "");
    layer.planes[1]!.setAttribute(
      "d",
      plane.on && plane.second ? grid(n, b, cells) : "",
    );

    // The box: twelve edges.
    const corner = (sx: number, sy: number, sz: number): V3 => [
      box.center[0] + sx * box.half[0],
      box.center[1] + sy * box.half[1],
      box.center[2] + sz * box.half[2],
    ];
    let edges = "";
    if (box.on) {
      for (const [i, j] of [
        [0, 1],
        [0, 2],
        [0, 4],
        [3, 1],
        [3, 2],
        [3, 7],
        [5, 1],
        [5, 4],
        [5, 7],
        [6, 2],
        [6, 4],
        [6, 7],
      ] as const) {
        const c = (k: number) =>
          corner(k & 1 ? 1 : -1, k & 2 ? 1 : -1, k & 4 ? 1 : -1);
        edges += line([this.project(layer, c(i)), this.project(layer, c(j))]);
      }
    }
    layer.box.setAttribute("d", edges);

    if (!layer.interactive) {
      layer.arrow.setAttribute("visibility", "hidden");
      return;
    }
    const place = (kind: HandleKind, local: V3 | undefined) => {
      const e = layer.handles.get(kind)!;
      const p = local && this.project(layer, local);
      e.setAttribute("visibility", p ? "visible" : "hidden");
      if (p) {
        if (e.tagName === "rect") {
          e.setAttribute("x", (p[0] - 6).toFixed(1));
          e.setAttribute("y", (p[1] - 6).toFixed(1));
        } else {
          e.setAttribute("cx", p[0].toFixed(1));
          e.setAttribute("cy", p[1].toFixed(1));
        }
      }
      return p;
    };
    const tip = plane.on
      ? this.planePoint(add(plane.center, scale(n, ARROW)))
      : undefined;
    const from = plane.on
      ? this.project(layer, this.planePoint(plane.center))
      : undefined;
    const to = place("offset", tip);
    layer.arrow.setAttribute("visibility", from && to ? "visible" : "hidden");
    if (from && to) {
      layer.arrow.setAttribute("x1", from[0].toFixed(1));
      layer.arrow.setAttribute("y1", from[1].toFixed(1));
      layer.arrow.setAttribute("x2", to[0].toFixed(1));
      layer.arrow.setAttribute("y2", to[1].toFixed(1));
    }
    place(
      "rotate",
      plane.on
        ? this.planePoint(add(plane.center, scale(a, ROTATE_AT * PLANE_EXTENT)))
        : undefined,
    );
    place("move", box.on ? box.center : undefined);
    for (let k = 0; k < 6; k++) {
      place(`face${k}` as HandleKind, box.on ? this.facePoint(k) : undefined);
    }
  }

  /** The middle of face `k` of the box: axis `k >> 1`, the far side for an even `k`. */
  private facePoint(k: number): V3 {
    const { center, half } = this.state.box;
    const axis = k >> 1;
    const sign = k & 1 ? -1 : 1;
    const p: V3 = [center[0], center[1], center[2]];
    p[axis] = p[axis]! + sign * half[axis]!;
    return p;
  }

  // --------------------------------------------------------------- dragging

  /** The pointer's ray in local metres. */
  private ray(layer: Layer, e: PointerEvent): { o: V3; d: V3 } {
    const rect = layer.root.getBoundingClientRect();
    const camera = layer.view.camera;
    const d = camera.rayDirection(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((e.clientY - rect.top) / rect.height) * 2,
      rect.width / rect.height,
      new Float64Array(3),
    );
    return {
      o: this.site.local(camera.position),
      d: this.site.localDirection(d),
    };
  }

  /** The line a handle moves along in `state`, in local metres: a point on it and its direction. */
  private lineOf(
    state: SectionState,
    kind: HandleKind,
  ): { p: V3; u: V3 } | undefined {
    if (kind === "offset") {
      return {
        p: state.plane.center,
        u: planeAxes(state.plane.heading, state.plane.tilt).n,
      };
    }
    if (!kind.startsWith("face")) {
      return undefined;
    }
    const k = Number(kind.slice(4));
    const u: V3 = [0, 0, 0];
    u[k >> 1] = k & 1 ? -1 : 1;
    const p: V3 = [...state.box.center];
    p[k >> 1] = p[k >> 1]! + u[k >> 1]! * state.box.half[k >> 1]!;
    return { p, u };
  }

  private readonly onDown = (e: PointerEvent): void => {
    const target = (e.target as Element).closest<SVGElement>("[data-handle]");
    const layer = this.layers.find((l) => l.svg.contains(target));
    if (!target || !layer || e.button !== 0) {
      return;
    }
    const kind = target.dataset.handle as HandleKind;
    const { o, d } = this.ray(layer, e);
    const line = this.lineOf(this.state, kind);
    let s0 = 0;
    let grab: V3 = [0, 0, 0];
    if (line) {
      s0 = nearestOnLine(o, d, line.p, line.u) ?? 0;
    } else if (kind === "move") {
      grab = this.groundPoint(o, d, this.state.box.center[2]) ?? [0, 0, 0];
      grab = sub(this.state.box.center, grab);
    }
    this.drag = {
      kind,
      layer,
      start: structuredClone(this.state),
      x: e.clientX,
      y: e.clientY,
      s0,
      grab,
    };
    target.setPointerCapture(e.pointerId);
    layer.svg.classList.add("dragging");
    e.preventDefault();
    e.stopPropagation();
  };

  /** Where the ray meets the level plane at height `z`. */
  private groundPoint(o: V3, d: V3, z: number): V3 | undefined {
    if (Math.abs(d[2]) < 1e-6) {
      return undefined;
    }
    const t = (z - o[2]) / d[2];
    return t > 0 ? add(o, scale(d, t)) : undefined;
  }

  private readonly onMove = (e: PointerEvent): void => {
    const drag = this.drag;
    if (!drag) {
      return;
    }
    const { state } = this;
    const { kind, start } = drag;
    const { o, d } = this.ray(drag.layer, e);
    if (kind === "rotate") {
      state.plane.heading =
        (((start.plane.heading + (e.clientX - drag.x) * 0.4) % 360) + 360) %
        360;
      state.plane.tilt = Math.min(
        90,
        Math.max(0, start.plane.tilt + (e.clientY - drag.y) * 0.3),
      );
    } else if (kind === "move") {
      const hit = this.groundPoint(o, d, start.box.center[2]);
      if (hit) {
        state.box.center = [
          hit[0] + drag.grab[0],
          hit[1] + drag.grab[1],
          start.box.center[2],
        ];
      }
    } else {
      const startLine = this.lineOf(start, kind);
      const s = startLine && nearestOnLine(o, d, startLine.p, startLine.u);
      if (s === undefined || !startLine) {
        return;
      }
      const delta = s - drag.s0;
      if (kind === "offset") {
        state.plane.center = add(start.plane.center, scale(startLine.u, delta));
      } else {
        // The far face follows the pointer; the opposite one stays.
        const k = Number(kind.slice(4));
        const axis = k >> 1;
        const outward = k & 1 ? -1 : 1;
        const half = Math.max(SMALLEST_BOX, start.box.half[axis]! + delta / 2);
        const grown = half - start.box.half[axis]!;
        state.box.half = [...start.box.half] as V3;
        state.box.half[axis] = half;
        state.box.center = [...start.box.center] as V3;
        state.box.center[axis] = start.box.center[axis]! + outward * grown;
      }
    }
    this.changed();
  };

  private readonly onUp = (e: PointerEvent): void => {
    const drag = this.drag;
    this.drag = undefined;
    if (drag) {
      drag.layer.svg.classList.remove("dragging");
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    }
  };

  dispose(): void {
    for (const layer of this.layers) {
      layer.root.remove();
    }
    this.layers.length = 0;
  }
}
