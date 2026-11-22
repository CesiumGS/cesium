import { el } from "./ui.ts";
import type { Rig } from "./viewMath.ts";

/**
 * A view cube: a small CSS 3D cube that turns with the camera, so it always
 * shows which way the model is seen from, and a click on a face turns the
 * camera to that standard view. CSS's axes (x right, y down, z toward the
 * viewer) are left-handed, so the cube's frame is too: its x is the model's
 * east, its y is the model's down and its z is the model's south. Then the
 * camera's matrix maps it to the screen without a mirror.
 */
export type StandardView =
  "front" | "back" | "left" | "right" | "top" | "bottom";

/** Where each standard view looks from: heading (degrees clockwise from north) and pitch, as `Viewer.zoomTo` takes them. */
export const VIEW_ANGLES: Record<
  StandardView | "iso",
  { heading: number; pitch: number }
> = {
  front: { heading: 0, pitch: 0 },
  back: { heading: 180, pitch: 0 },
  left: { heading: 90, pitch: 0 },
  right: { heading: -90, pitch: 0 },
  top: { heading: 0, pitch: -89.9 },
  bottom: { heading: 0, pitch: 89.9 },
  iso: { heading: -30, pitch: -32 },
};

const FACES: ReadonlyArray<[StandardView, string, string]> = [
  ["right", "Right", "rotateY(90deg)"],
  ["left", "Left", "rotateY(-90deg)"],
  ["back", "Back", "rotateY(180deg)"],
  ["front", "Front", ""],
  ["top", "Top", "rotateX(90deg)"],
  ["bottom", "Bottom", "rotateX(-90deg)"],
];

export interface ViewCube {
  element: HTMLElement;
  /** Turns the cube to the camera now. */
  update(rig: Rig | undefined): void;
}

export function createViewCube(go: (view: StandardView) => void): ViewCube {
  const half = 28;
  const inner = el("div", { className: "csg-cube-inner" });
  for (const [view, label, rotate] of FACES) {
    const face = el(
      "button",
      {
        type: "button",
        className: "csg-cube-face",
        title: `${label} view`,
        ariaLabel: `${label} view`,
        onclick: () => go(view),
      },
      label,
    );
    face.style.transform = `${rotate} translateZ(${half}px)`;
    inner.append(face);
  }
  const element = el(
    "div",
    { className: "csg-cube", role: "group", ariaLabel: "View cube" },
    inner,
  );
  return {
    element,
    update: (rig) => {
      if (!rig) {
        return;
      }
      const { right: r, up: u, forward: f } = rig;
      inner.style.transform = `matrix3d(${r[0]},${-u[0]},${-f[0]},0, ${-r[2]},${u[2]},${f[2]},0, ${-r[1]},${u[1]},${f[1]},0, 0,0,0,1)`;
    },
  };
}
