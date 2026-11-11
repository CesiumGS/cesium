import { EARTH, type DrawHandle, type MeshHandle } from "@cesium/next";
import type { Viewer } from "@cesium/next/widgets";
import type { Exaggeration } from "./exaggeration.ts";

/** Segments along the ruler: the map bends a straight line, so it is drawn in pieces. */
const SEGMENTS = 64;
/** Linear colour of the ruler. */
const COLOR = [1, 0.85, 0.1, 1] as const;

/**
 * The ruler between two true points (ITRF, m): a line of short segments
 * placed once, at the first point. Each vertex is where the line truly is,
 * and the engine draws it where the route puts it, so the line stays a true
 * straight line that is drawn bent by the map. Its label says what the
 * measure module reported, in HTML at the line's drawn midpoint.
 */
export interface Ruler {
  /** Draws the line between `a` and `b`, and its label's text. */
  set(a: ArrayLike<number>, b: ArrayLike<number>, text: string): void;
  /** Hides it until `set` is called. */
  clear(): void;
  dispose(): void;
}

export function createRuler(
  viewer: Viewer,
  exaggeration: Exaggeration,
  overlay: HTMLElement,
): Ruler {
  const { world, view, engine } = viewer;
  const label = document.createElement("div");
  label.className = "vex-label ruler";
  label.hidden = true;
  overlay.append(label);
  let mesh: MeshHandle | undefined;
  let draw: DrawHandle | undefined;
  const middle = new Float64Array(3);
  const drawn = new Float64Array(3);
  let shown = false;

  const remove = () => {
    if (world.destroyed) {
      return;
    }
    if (draw) {
      world.removeDraw(draw);
    }
    if (mesh) {
      world.removeMesh(mesh);
    }
    draw = undefined;
    mesh = undefined;
  };

  const offTick = engine.onAfterTick(() => {
    if (!shown) {
      return;
    }
    exaggeration.drawn(middle, drawn);
    const px = view.toPixel(drawn, world.root);
    label.hidden = px === undefined;
    if (px) {
      label.style.transform = `translate(${px[0]!.toFixed(1)}px, ${px[1]!.toFixed(1)}px) translate(-50%, -50%)`;
    }
  });

  return {
    set(a, b, text) {
      remove();
      const positions = new Float32Array((SEGMENTS + 1) * 3);
      for (let i = 0; i <= SEGMENTS; i++) {
        for (let k = 0; k < 3; k++) {
          positions[i * 3 + k] = (i / SEGMENTS) * (b[k]! - a[k]!);
        }
      }
      const indices = new Uint32Array(SEGMENTS * 2);
      const colors = new Float32Array((SEGMENTS + 1) * 4);
      for (let i = 0; i < SEGMENTS; i++) {
        indices[i * 2] = i;
        indices[i * 2 + 1] = i + 1;
      }
      for (let i = 0; i <= SEGMENTS; i++) {
        colors.set(COLOR, i * 4);
      }
      mesh = world.addMesh({
        positions,
        colors,
        indices,
        topology: "line-list",
      });
      draw = world.addDraw({
        mesh,
        parent: world.bodyAnchor(EARTH),
        origin: Float64Array.from(a),
        unlit: true,
        ground: false,
        name: "ruler",
      });
      for (let k = 0; k < 3; k++) {
        middle[k] = (a[k]! + b[k]!) / 2;
      }
      label.textContent = text;
      shown = true;
      engine.requestRender();
    },
    clear() {
      remove();
      shown = false;
      label.hidden = true;
      engine.requestRender();
    },
    dispose() {
      offTick();
      remove();
      label.remove();
    },
  };
}
