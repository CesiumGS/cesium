import {
  beginDrag,
  drawGizmo,
  hitGizmo,
  sameHandle,
  solveDrag,
  AXIS_NAMES,
  type DragStart,
  type Handle,
} from "./gizmo.ts";
import { snapToPlanes, type PushPull } from "./pushPull.ts";
import type { LeafNode, Vec3 } from "./tree.ts";
import {
  anglesOf,
  axisAngle,
  closestOnLine,
  distanceToSegment,
  dot,
  mad,
  multiply,
  pixelsPerMetre,
  project,
  rayAt,
  rotationOf,
  snapTo,
  type Rig,
  type V3,
} from "./viewMath.ts";

/**
 * Direct manipulation in the view (plan §13.33, phases 1 and 2): the
 * translate and rotate gizmo of the selected leaf, and the push-pull arrow
 * of a picked face. It draws on a 2D canvas over the view, tests the handles
 * itself in pixels (so a press on a handle never reaches the orbit controls,
 * and never waits for a GPU pick), and turns a drag into an edit of the
 * leaf's placement or parameters through the host, which previews and
 * re-evaluates as for any other edit and records one undo step on release.
 */
/** Which handle the host wants: the leaf's gizmo, or the picked face's arrow, never both (the host says which by what is selected). */
export type Tool = "move" | "pushpull";

/** A picked face, as a push-pull handle: where it was picked, the solid's normal there, and what dragging it changes. */
export interface FaceHandle {
  leaf: LeafNode;
  /** On the face, the sample's metres. */
  point: V3;
  target: PushPull;
  /** The solid's planar faces, to snap the dragged face to one. */
  planes: ReadonlyArray<{ face: number; normal: V3; offset: number }>;
  /** The face the pick named, which a snap doesn't offer back. */
  face: number;
}

export interface ManipulatorHost {
  rig(): Rig | undefined;
  tool(): Tool;
  /** The leaf the gizmo sits on, if one is selected and in the model. */
  gizmoLeaf(): LeafNode | undefined;
  face(): FaceHandle | undefined;
  /** The grid's step, m; 0 for none. */
  grid(): number;
  /** A leaf's placement or parameters changed: the preview, the evaluation. */
  edited(leaf: LeafNode, phase: "drag" | "commit", label: string): void;
  /** A push-pull of the picked face ended `moved` metres on. */
  pushed(moved: number): void;
  /** The pointer moved over the view with nothing held: what face is under it. */
  hovered(x: number, y: number): void;
  cursor(kind: "" | "grab" | "grabbing" | "pointer"): void;
}

/** The arrow's length on screen, pixels. */
const ARROW_PIXELS = 70;

interface Session {
  kind: "gizmo" | "push";
  leaf: LeafNode;
  start?: DragStart;
  rotate0: Vec3;
  translate0: Vec3;
  params0: Record<string, number>;
  /** Push-pull: where along the normal the pointer took hold, m. */
  grab?: number;
  anchor?: V3;
  moved?: number;
  readout?: string;
  label: string;
}

export class Manipulator {
  private readonly canvas2d: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private hover: Handle | undefined;
  private hoverArrow = false;
  private session: Session | undefined;
  private frame = 0;
  private lastStamp = "";
  private dirty = true;
  private readonly abort = new AbortController();

  constructor(
    private readonly host: ManipulatorHost,
    private readonly container: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly stamp: () => string,
  ) {
    this.canvas2d = document.createElement("canvas");
    this.canvas2d.className = "csg-overlay";
    this.canvas2d.setAttribute("aria-hidden", "true");
    canvas.after(this.canvas2d);
    this.ctx = this.canvas2d.getContext("2d")!;
    const { signal } = this.abort;
    container.addEventListener("pointerdown", (e) => this.down(e), {
      capture: true,
      signal,
    });
    container.addEventListener("pointermove", (e) => this.move(e), { signal });
    container.addEventListener("pointerup", (e) => this.up(e), { signal });
    container.addEventListener("pointercancel", (e) => this.up(e), { signal });
    container.addEventListener(
      "pointerleave",
      () => {
        if (!this.session && (this.hover || this.hoverArrow)) {
          this.hover = undefined;
          this.hoverArrow = false;
          this.host.cursor("");
          this.invalidate();
        }
      },
      { signal },
    );
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      const stamp = `${this.stamp()}|${this.canvas.clientWidth}x${this.canvas.clientHeight}`;
      if (this.dirty || stamp !== this.lastStamp) {
        this.lastStamp = stamp;
        this.dirty = false;
        this.draw();
      }
    };
    loop();
  }

  get dragging(): boolean {
    return this.session !== undefined;
  }

  /** Something that is drawn changed: redraw at the next frame. */
  invalidate(): void {
    this.dirty = true;
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.canvas2d.remove();
  }

  private pixel(event: PointerEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  // ------------------------------------------------------------ hit tests
  private arrowEnds(rig: Rig, face: FaceHandle, anchor = face.point) {
    const ppm = pixelsPerMetre(rig, anchor);
    const length = ARROW_PIXELS / ppm;
    const from = project(rig, anchor);
    const to = project(rig, mad(anchor, face.target.normal, length));
    return from && to ? { from, to, length } : undefined;
  }

  private hitArrow(rig: Rig, face: FaceHandle, x: number, y: number): boolean {
    const ends = this.arrowEnds(rig, face);
    return !!ends && distanceToSegment(x, y, ends.from, ends.to) < 9;
  }

  // -------------------------------------------------------------- events
  private down(event: PointerEvent): void {
    if (event.button !== 0 || event.target !== this.canvas || this.session) {
      return;
    }
    const rig = this.host.rig();
    if (!rig) {
      return;
    }
    const [x, y] = this.pixel(event);
    if (this.host.tool() === "move") {
      const leaf = this.host.gizmoLeaf();
      if (!leaf) {
        return;
      }
      const handle = hitGizmo(rig, leaf.translate as V3, x, y);
      const start =
        handle && beginDrag(rig, handle, [...leaf.translate] as V3, x, y);
      if (!start) {
        return;
      }
      this.session = {
        kind: "gizmo",
        leaf,
        start,
        rotate0: [...leaf.rotate],
        translate0: [...leaf.translate],
        params0: { ...leaf.params },
        label:
          start.handle.kind === "ring"
            ? `Rotate ${leaf.name}`
            : `Move ${leaf.name}`,
      };
    } else {
      const face = this.host.face();
      if (!face || !this.hitArrow(rig, face, x, y)) {
        return;
      }
      const grab = closestOnLine(
        face.point,
        face.target.normal,
        rayAt(rig, x, y),
      );
      if (grab === undefined) {
        return;
      }
      this.session = {
        kind: "push",
        leaf: face.leaf,
        rotate0: [...face.leaf.rotate],
        translate0: [...face.leaf.translate],
        params0: { ...face.leaf.params },
        grab,
        anchor: face.point,
        moved: 0,
        label: `${face.target.label} of ${face.leaf.name}`,
      };
    }
    event.stopPropagation();
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.host.cursor("grabbing");
    this.invalidate();
  }

  private move(event: PointerEvent): void {
    const rig = this.host.rig();
    if (!rig) {
      return;
    }
    const [x, y] = this.pixel(event);
    if (this.session) {
      this.drag(rig, x, y, event);
      return;
    }
    if (event.buttons !== 0 || event.target !== this.canvas) {
      return;
    }
    let hover: Handle | undefined;
    let arrow = false;
    if (this.host.tool() === "move") {
      const leaf = this.host.gizmoLeaf();
      hover = leaf ? hitGizmo(rig, leaf.translate as V3, x, y) : undefined;
    } else {
      const face = this.host.face();
      arrow = !!face && this.hitArrow(rig, face, x, y);
    }
    if (!sameHandle(hover, this.hover) || arrow !== this.hoverArrow) {
      this.hover = hover;
      this.hoverArrow = arrow;
      this.invalidate();
    }
    this.host.cursor(hover || arrow ? "grab" : "");
    if (!hover && !arrow) {
      this.host.hovered(x, y);
    }
  }

  private drag(rig: Rig, x: number, y: number, event: PointerEvent): void {
    const s = this.session!;
    const free = event.altKey;
    if (s.kind === "gizmo") {
      const result = solveDrag(rig, s.start!, x, y, {
        grid: free ? 0 : this.host.grid(),
        angleStep: free ? 0 : 15,
      });
      if (!result) {
        return;
      }
      if (result.kind === "move") {
        s.leaf.translate = [...result.centre] as Vec3;
        const d = result.delta;
        const parts = AXIS_NAMES.flatMap((name, i) =>
          Math.abs(d[i]!) > 1e-9
            ? [
                `Δ${name} ${d[i]! >= 0 ? "+" : "−"}${Math.abs(d[i]!).toFixed(3)} m`,
              ]
            : [],
        );
        s.readout = `${parts.join("  ") || "Δ 0"}  →  (${result.centre.map((v) => v.toFixed(2)).join(", ")})`;
      } else {
        const turned = multiply(
          axisAngle(
            [0, 0, 0].map((_, i) => (i === result.axis ? 1 : 0)) as V3,
            result.angle,
          ),
          rotationOf(s.rotate0),
        );
        s.leaf.rotate = anglesOf(turned);
        s.readout = `Rotate about ${AXIS_NAMES[result.axis]}: ${((result.angle * 180) / Math.PI).toFixed(1)}°`;
      }
      this.host.edited(s.leaf, "drag", s.label);
    } else {
      const face = this.host.face();
      if (!face) {
        return;
      }
      const t = closestOnLine(face.point, face.target.normal, rayAt(rig, x, y));
      if (t === undefined) {
        return;
      }
      let distance = t - s.grab!;
      let note = "";
      if (!free) {
        const n = face.target.normal;
        const ppm = pixelsPerMetre(rig, face.point);
        const snap = snapToPlanes(
          face.planes,
          dot(face.point, n),
          n,
          distance,
          8 / ppm,
          face.face,
        );
        const grid = this.host.grid();
        if (snap) {
          distance = snap.distance;
          note = `  snaps to face ${snap.face}`;
        } else if (grid > 0) {
          const aligned = n.some((c) => Math.abs(Math.abs(c) - 1) < 1e-3);
          distance = aligned
            ? snapTo(dot(face.point, n) + distance, grid) - dot(face.point, n)
            : snapTo(distance, grid);
        }
      }
      const out = face.target.apply(distance);
      s.leaf.translate = [...out.translate] as Vec3;
      Object.assign(s.leaf.params, out.params);
      s.moved = out.moved;
      s.anchor = mad(face.point, face.target.normal, out.moved);
      s.readout = `${face.target.label} ${out.value.toFixed(3)} m  (${out.moved >= 0 ? "+" : "−"}${Math.abs(out.moved).toFixed(3)})${note}`;
      this.host.edited(s.leaf, "drag", s.label);
    }
    this.invalidate();
  }

  private up(event: PointerEvent): void {
    const s = this.session;
    if (!s) {
      return;
    }
    this.session = undefined;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.host.cursor("");
    this.host.edited(s.leaf, "commit", s.label);
    if (s.kind === "push") {
      this.host.pushed(s.moved ?? 0);
    }
    this.hover = undefined;
    this.hoverArrow = false;
    this.invalidate();
  }

  // -------------------------------------------------------------- drawing
  private draw(): void {
    const rig = this.host.rig();
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (
      this.canvas2d.width !== Math.round(w * dpr) ||
      this.canvas2d.height !== Math.round(h * dpr)
    ) {
      this.canvas2d.width = Math.round(w * dpr);
      this.canvas2d.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!rig) {
      return;
    }
    const s = this.session;
    if (this.host.tool() === "move") {
      const leaf = this.host.gizmoLeaf();
      if (leaf) {
        drawGizmo(ctx, rig, leaf.translate as V3, {
          hover: this.hover,
          active: s?.kind === "gizmo" ? s.start!.handle : undefined,
        });
        if (s?.kind === "gizmo" && s.readout) {
          const at = project(rig, leaf.translate as V3);
          if (at) {
            this.label(ctx, at.x + 18, at.y + 34, s.readout);
          }
        }
      }
    } else {
      const face = this.host.face();
      if (face) {
        this.drawArrow(ctx, rig, face, s);
      }
    }
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    rig: Rig,
    face: FaceHandle,
    s: Session | undefined,
  ): void {
    const anchor = s?.kind === "push" ? (s.anchor ?? face.point) : face.point;
    const ends = this.arrowEnds(rig, face, anchor);
    if (!ends) {
      return;
    }
    const active = s?.kind === "push" || this.hoverArrow;
    const colour = active ? "#ffc53d" : "#e8590c";
    ctx.save();
    ctx.lineCap = "round";
    if (s?.kind === "push") {
      // The face's first place, and the way it has moved.
      const from = project(rig, face.point);
      if (from) {
        ctx.strokeStyle = "#fff";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(ends.from.x, ends.from.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(from.x, from.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineWidth = active ? 5 : 4;
    ctx.beginPath();
    ctx.moveTo(ends.from.x, ends.from.y);
    ctx.lineTo(ends.to.x, ends.to.y);
    ctx.stroke();
    const angle = Math.atan2(ends.to.y - ends.from.y, ends.to.x - ends.from.x);
    ctx.beginPath();
    ctx.moveTo(
      ends.to.x + Math.cos(angle) * 8,
      ends.to.y + Math.sin(angle) * 8,
    );
    ctx.lineTo(
      ends.to.x - Math.sin(angle) * 8 - Math.cos(angle) * 6,
      ends.to.y + Math.cos(angle) * 8 - Math.sin(angle) * 6,
    );
    ctx.lineTo(
      ends.to.x + Math.sin(angle) * 8 - Math.cos(angle) * 6,
      ends.to.y - Math.cos(angle) * 8 - Math.sin(angle) * 6,
    );
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ends.from.x, ends.from.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const text =
      s?.kind === "push" && s.readout
        ? s.readout
        : `${face.target.label} ${face.target.value.toFixed(3)} m: drag the arrow`;
    this.label(ctx, ends.to.x + 12, ends.to.y - 6, text);
  }

  private label(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
  ): void {
    ctx.save();
    ctx.font = "600 12px system-ui, sans-serif";
    const width = ctx.measureText(text).width + 14;
    const left = Math.max(4, Math.min(x, this.canvas.clientWidth - width - 4));
    const top = Math.max(4, Math.min(y - 11, this.canvas.clientHeight - 28));
    ctx.fillStyle = "rgba(31,35,40,.92)";
    ctx.beginPath();
    ctx.roundRect(left, top, width, 22, 5);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(text, left + 7, top + 11.5);
    ctx.restore();
  }
}
