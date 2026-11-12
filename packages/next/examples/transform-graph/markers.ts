import type { AnchorHandle, View } from "@cesium/next";
import { el } from "./ui.ts";
import type { SceneHost } from "./scene.ts";

/** Where a point of an anchor's content is drawn in `view`, in CSS pixels of the canvas; undefined off screen. */
export function canvasPixel(
  host: SceneHost,
  view: View,
  position: ArrayLike<number>,
  anchor: AnchorHandle,
): [number, number] | undefined {
  const px = view.toPixel(position, anchor);
  if (!px) {
    return undefined;
  }
  const rect = view.pixelRect();
  const ratio =
    host.viewer.canvas.width / Math.max(1, host.viewer.canvas.clientWidth);
  return [px[0]! + rect.x / ratio, px[1]! + rect.y / ratio];
}

interface Target {
  readonly position: ArrayLike<number>;
  readonly anchor: AnchorHandle;
  readonly view?: View;
}

/** A ring over the view at a point the scene keeps: it follows the point as the view moves and the nodes change. */
export interface Marker {
  /** Puts the ring on a point (in the anchor's coordinates, as the view draws it); undefined hides it. */
  set(target: Target | undefined): void;
}

/** A label that follows a point of the scene over the view. */
export interface PointLabel {
  set(target: Target | undefined, text?: string): void;
}

function follower(
  host: SceneHost,
  node: HTMLElement,
  shift: string,
): { set(target: Target | undefined): void } {
  const { engine, view: main } = host.viewer;
  host.overlay.append(node);
  let target: Target | undefined;
  const off = engine.onAfterTick(() => {
    if (!target) {
      return;
    }
    const px = canvasPixel(
      host,
      target.view ?? main,
      target.position,
      target.anchor,
    );
    node.hidden = px === undefined;
    if (px) {
      node.style.transform = `translate(${px[0].toFixed(1)}px, ${px[1].toFixed(1)}px) ${shift}`;
    }
  });
  host.scope.defer(() => {
    off();
    node.remove();
  });
  return {
    set(next) {
      target = next;
      node.hidden = next === undefined;
      engine.requestRender();
    },
  };
}

export function createMarker(host: SceneHost, className = ""): Marker {
  const mark = el("div", { className: `tgx-pick ${className}`, hidden: true });
  return follower(host, mark, "translate(-50%, -50%)");
}

export function createPointLabel(host: SceneHost): PointLabel {
  const label = el("div", { className: "tgx-label", hidden: true });
  const f = follower(host, label, "translate(-50%, -130%)");
  return {
    set(target, text) {
      if (text !== undefined) {
        label.textContent = text;
      }
      f.set(target);
    },
  };
}
