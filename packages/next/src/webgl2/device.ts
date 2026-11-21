// The WebGL 2 device (`RenderDevice`, scene/renderSeam.ts): the empty one
// of CS-35. It owns a WebGL 2 context per canvas target, takes a mirror per
// world and a renderer per view, and each tick clears every view's
// rectangle to its background color: the first thing the renderer draws, and
// what makes the device's choice, its facts and its support report visible
// before there is any content to draw (CS-36 onwards,
// docs/superpowers/plans/2026-11-13-webgl2-renderer.md, section 8).
//
// WebGL 2 and WebGPU share no resources, so nothing here touches the WebGPU
// renderer: this tier imports the scene and the profile layer only.
import { support } from "../profile/support.ts";
import type { SupportReport } from "../profile/types.ts";
import type { Webgl2Facts } from "../profile/webgl2Facts.ts";
import type {
  DeviceHost,
  RenderDevice,
  RenderTick,
  ViewRenderer,
  WorldMirror,
} from "../scene/renderSeam.ts";
import { CanvasTarget, type RenderTarget } from "../scene/renderTarget.ts";
import type { View } from "../scene/View.ts";
import type { World } from "../scene/World.ts";

/**
 * The attributes of a canvas's context: it presents the finished image, so
 * it needs no depth, stencil, antialiasing or alpha of its own (the
 * renderer's scene targets are its own framebuffers).
 */
const CANVAS_ATTRIBUTES: WebGLContextAttributes = {
  alpha: false,
  depth: false,
  stencil: false,
  antialias: false,
  powerPreference: "high-performance",
};

/** The sRGB encoding of a linear value (the clear color is linear). */
function srgb(linear: number): number {
  const v = Math.min(1, Math.max(0, linear));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/** What a view's clear color is on a canvas, for its output encoding. */
function encoded(linear: number, encoding: View["outputEncoding"]): number {
  return encoding === "srgb"
    ? srgb(linear)
    : Math.pow(Math.min(1, Math.max(0, linear)), 1 / 2.2);
}

/** One per world: the device draws no content yet, so it copies nothing. */
class Webgl2WorldMirror implements WorldMirror {
  sync(): void {}
  destroy(): void {}
}

/** What draws one view on the WebGL 2 device. */
export class Webgl2ViewRenderer implements ViewRenderer {
  rendered = false;

  constructor(
    readonly view: View,
    private readonly device: Webgl2Device,
  ) {}

  /** What every view on this device can do. */
  get support(): SupportReport {
    return this.device.support;
  }

  /** No exposure yet: the scene arrives with the first draws (CS-36). */
  exposure(): number {
    return 1;
  }

  destroy(): void {}
}

export class Webgl2Device implements RenderDevice {
  readonly kind = "webgl2" as const;
  private support_: SupportReport | undefined;
  /** The canvases whose context loss is listened for. */
  private readonly watched = new Set<CanvasTarget>();
  private readonly unlisten: Array<() => void> = [];
  private readonly complained = new Set<RenderTarget>();
  /** The context was lost: the engine stops drawing, as it does after a WebGPU device loss. */
  private lost = false;

  /** `facts` is one object a device, so a change of it is a new device (`ViewProfile`). */
  constructor(
    readonly facts: Webgl2Facts,
    private readonly host: DeviceHost,
  ) {}

  /** What views can do on this device, in scene terms (`View.support`). */
  get support(): SupportReport {
    return (this.support_ ??= support(this.facts));
  }

  createWorld(_world: World): WorldMirror {
    return new Webgl2WorldMirror();
  }

  createRenderer(view: View): Webgl2ViewRenderer {
    return new Webgl2ViewRenderer(view, this);
  }

  /**
   * Clears each enabled view's rectangle to its background color: the
   * views of `tick.targets` (every enabled view's target when not given).
   * The sky arrives with CS-42, so `"atmosphere"` and `"color"` both clear
   * to the view's `clearColor`.
   */
  render(tick: RenderTick): void {
    if (this.lost) {
      return;
    }
    const byTarget = new Map<RenderTarget, View[]>();
    for (const view of this.host.views) {
      if (!view.enabled || (tick.targets && !tick.targets.has(view.target))) {
        continue;
      }
      const views = byTarget.get(view.target);
      if (views) {
        views.push(view);
      } else {
        byTarget.set(view.target, [view]);
      }
    }
    let drawn = 0;
    for (const [target, views] of byTarget) {
      const gl = this.contextFor(target);
      if (!gl) {
        continue;
      }
      clearViews(gl, target, views);
      drawn += views.length;
    }
    if (drawn > 0) {
      this.host.drewFrame(drawn);
    }
  }

  /** Nothing is drawn, so nothing is picked: a pick over this device answers "nothing there". */
  servePicks(rendering: ReadonlySet<View>): void {
    for (const view of this.host.views) {
      if (!view.enabled || rendering.has(view)) {
        continue;
      }
      for (const pick of view.pendingPicks.splice(0)) {
        pick.resolve?.(undefined);
        pick.resolvePosition?.(undefined);
        pick.resolvePoint?.(undefined);
      }
    }
  }

  destroy(): void {
    for (const remove of this.unlisten) {
      remove();
    }
    this.unlisten.length = 0;
    this.watched.clear();
  }

  /**
   * The WebGL 2 context of a canvas target, made the first time it is
   * drawn into (the probe's context was a throwaway; a canvas holds one
   * context type). A loss is reported once and stops drawing; the other
   * targets (an `OffscreenTarget`) aren't drawn by this device yet.
   */
  private contextFor(target: RenderTarget): WebGL2RenderingContext | undefined {
    if (!(target instanceof CanvasTarget)) {
      if (!this.complained.has(target)) {
        this.complained.add(target);
        this.host.report(
          "frame",
          "The WebGL 2 renderer draws into canvases only so far: an OffscreenTarget is not drawn into.",
        );
      }
      return undefined;
    }
    let gl: WebGL2RenderingContext;
    try {
      // Each tick: the target sizes its canvas first (an element's CSS box ×
      // the pixel ratio), as it does for WebGPU, then hands back its context.
      gl = target.webgl2(CANVAS_ATTRIBUTES);
    } catch (error) {
      if (!this.complained.has(target)) {
        this.complained.add(target);
        this.host.report(
          "frame",
          error instanceof Error ? error.message : String(error),
        );
      }
      return undefined;
    }
    if (!this.watched.has(target)) {
      this.watched.add(target);
      this.watchLoss(target.canvas);
    }
    if (gl.isContextLost()) {
      this.loseContext();
      return undefined;
    }
    return gl;
  }

  private watchLoss(canvas: CanvasTarget["canvas"]): void {
    const lost = () => this.loseContext();
    canvas.addEventListener("webglcontextlost", lost);
    this.unlisten.push(() =>
      canvas.removeEventListener("webglcontextlost", lost),
    );
  }

  private loseContext(): void {
    if (this.lost) {
      return;
    }
    this.lost = true;
    this.host.report(
      "device",
      "The WebGL 2 context was lost. The engine stops drawing.",
    );
  }
}

/** Clears each view's pixel rectangle on a target to its background color. */
function clearViews(
  gl: WebGL2RenderingContext,
  target: RenderTarget,
  views: readonly View[],
): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, target.width, target.height);
  const covered = views.some((view) => {
    const r = view.pixelRect();
    return (
      r.x <= 0 &&
      r.y <= 0 &&
      r.width >= target.width &&
      r.height >= target.height
    );
  });
  if (!covered) {
    // What no view covers is black, not what the last tick left.
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.enable(gl.SCISSOR_TEST);
  for (const view of views) {
    const r = view.pixelRect();
    // GL's origin is the bottom-left; a view's rectangle is from the top-left.
    gl.scissor(
      Math.round(r.x),
      Math.round(target.height - (r.y + r.height)),
      Math.round(r.width),
      Math.round(r.height),
    );
    const [red, green, blue] = view.clearColor;
    const encoding = view.outputEncoding;
    gl.clearColor(
      encoded(red, encoding),
      encoded(green, encoding),
      encoded(blue, encoding),
      1,
    );
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.disable(gl.SCISSOR_TEST);
}
