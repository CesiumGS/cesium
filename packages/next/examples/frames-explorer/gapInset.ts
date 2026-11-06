// The picture-in-picture view of the rigid line's gap at 20 km (stop 4,
// owner's rework, 2026-11-06): a second engine view on the viewer's target
// and world (`engine.addView`), its own camera side-on to the two lines at
// the mark, and its frame, caption and labels in the HUD. Where it goes and
// how its camera frames the gap are inset.ts's plain functions.
//
// The engine is shared with the next example (Dyno keeps one while the page
// is open), so the view is removed on `hide`, which `dispose` calls: main.ts
// defers it on the example's scope, before the viewer goes.
import type { View } from "../../src/scene/View.ts";
import type { Viewer } from "../../widgets/index.ts";
import {
  insetBox,
  insetCamera,
  insetViewport,
  projectInto,
  type Box,
} from "./inset.ts";

/** What the inset shows: both placements at the mark, the line's direction, and its words. */
export interface GapInsetSpec {
  exact: ArrayLike<number>;
  rigid: ArrayLike<number>;
  along: ArrayLike<number>;
  caption: string;
  leader: string;
}

export class GapInset {
  private view: View | undefined;
  private spec: GapInsetSpec | undefined;
  private readonly frame: HTMLElement;
  private readonly caption: HTMLElement;
  private readonly labels: {
    leader: HTMLElement;
    line: HTMLElement;
    rigid: HTMLElement;
    exact: HTMLElement;
  };
  private readonly resize = new ResizeObserver(() => this.layout());
  /** The HUD's `--fx-hud-bottom` (the time controls' room) changes as the view does. */
  private readonly hudStyle = new MutationObserver(() => this.layout());

  /**
   * `exclude` is told the inset view's bit while it shows (0 after), to keep
   * things sized for the main camera, the triads, out of it.
   */
  constructor(
    private readonly viewer: Viewer,
    private readonly hud: HTMLElement,
    private readonly exclude: (bits: number) => void = () => {},
  ) {
    const el = (className: string, parent: HTMLElement) => {
      const e = document.createElement("div");
      e.className = className;
      parent.append(e);
      return e;
    };
    this.frame = document.createElement("div");
    this.frame.className = "fx-inset";
    this.frame.setAttribute("role", "img");
    this.caption = el("fx-inset-caption", this.frame);
    this.labels = {
      rigid: el("fx-inset-label fx-inset-label-muted", this.frame),
      exact: el("fx-inset-label fx-inset-label-muted", this.frame),
      line: el("fx-inset-leader", this.frame),
      leader: el("fx-inset-label", this.frame),
    };
    this.labels.rigid.textContent = "rigid";
    this.labels.exact.textContent = "exact";
  }

  get shown(): boolean {
    return this.view !== undefined;
  }

  /** Shows the inset (adding its view the first time) or updates what it shows. */
  show(spec: GapInsetSpec): void {
    this.spec = spec;
    if (this.view === undefined) {
      const main = this.viewer.view;
      const view = this.viewer.engine.addView({
        target: this.viewer.target,
        world: this.viewer.world,
        viewport: { x: 0, y: 0, width: 0, height: 0 },
      });
      Object.assign(view.lighting, main.lighting);
      view.cityLights = main.cityLights;
      view.outputEncoding = main.outputEncoding;
      view.camera.fov = main.camera.fov;
      view.camera.near = 0.1;
      this.view = view;
      this.exclude(this.viewer.engine.viewBit(view));
      this.hud.append(this.frame);
      this.resize.observe(this.viewer.container);
      this.hudStyle.observe(this.hud, {
        attributes: true,
        attributeFilter: ["style"],
      });
    }
    this.caption.textContent = spec.caption;
    this.labels.leader.textContent = spec.leader;
    this.frame.setAttribute(
      "aria-label",
      `Inset: ${spec.caption}. The dashed rigid line above, the solid exact line below.`,
    );
    this.layout();
  }

  /** Removes the view, its frame and the legend's lift. Safe to call again. */
  hide(): void {
    this.spec = undefined;
    if (this.view === undefined) {
      return;
    }
    const view = this.view;
    this.view = undefined;
    this.resize.disconnect();
    this.hudStyle.disconnect();
    this.frame.remove();
    // Its bit is freed with it: the triads draw everywhere again first.
    this.exclude(0);
    this.viewer.engine.removeView(view);
    this.viewer.engine.requestRender();
  }

  dispose(): void {
    this.hide();
  }

  private layout(): void {
    const view = this.view;
    const spec = this.spec;
    if (view === undefined || spec === undefined) {
      return;
    }
    const container = this.viewer.container;
    const size = {
      width: container.clientWidth,
      height: container.clientHeight,
    };
    if (size.width === 0 || size.height === 0) {
      return;
    }
    const hudBottom =
      parseFloat(this.hud.style.getPropertyValue("--fx-hud-bottom")) || 64;
    const box = insetBox(size, hudBottom);
    place(this.frame, box.frame);
    view.viewport = insetViewport(box.view, size);
    view.exposure = this.viewer.view.exposure;

    const aspect = box.view.width / box.view.height;
    const pose = insetCamera(
      spec.exact,
      spec.rigid,
      spec.along,
      aspect,
      view.camera.fov,
    );
    const cam = view.camera;
    cam.position.set(pose.position);
    cam.direction.set(pose.direction);
    cam.orient(pose.up);

    // The labels, projected with the inset's own camera (the globe's labels
    // follow the main view's).
    const top = box.view.y - box.frame.y;
    const at = (p: ArrayLike<number>) => {
      const q = projectInto(p, pose, aspect, view.camera.fov);
      return q && { x: q.x * box.view.width, y: top + q.y * box.view.height };
    };
    const middle = [0, 1, 2].map((i) => (spec.exact[i]! + spec.rigid[i]!) / 2);
    const m = at(middle);
    const r = at(spec.rigid);
    const e = at(spec.exact);
    const set = (
      el: HTMLElement,
      p: { x: number; y: number } | undefined,
      dx: number,
      dy = 0,
    ) => {
      el.hidden = p === undefined;
      if (p) {
        el.style.left = `${(p.x + dx).toFixed(1)}px`;
        el.style.top = `${(p.y + dy).toFixed(1)}px`;
      }
    };
    set(this.labels.leader, m, 30);
    set(this.labels.line, m, 4);
    this.labels.line.style.width = "22px";
    set(this.labels.rigid, r && { x: 0, y: r.y }, 6, -9);
    set(this.labels.exact, e && { x: 0, y: e.y }, 6, 9);
    this.viewer.engine.requestRender();
  }
}

function place(el: HTMLElement, box: Box): void {
  el.style.left = `${box.x}px`;
  el.style.top = `${box.y}px`;
  el.style.width = `${box.width}px`;
  el.style.height = `${box.height}px`;
}
