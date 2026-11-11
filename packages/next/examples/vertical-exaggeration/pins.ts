import {
  EARTH,
  mat4,
  type DrawHandle,
  type MeshData,
  type MeshHandle,
  type TransformHandle,
} from "@cesium/next";
import type { Viewer } from "@cesium/next/widgets";
import type { Site } from "./sites.ts";

/** Pixels a pin stands tall. */
const PIN_SIZE = { summit: 30, town: 24 } as const;
/** Linear colours of the pins. */
const PIN_COLOR = {
  summit: [0.9, 0.12, 0.08, 1],
  town: [0.05, 0.45, 0.9, 1],
} as const;

/**
 * A map pin in billboard units (`DrawOptions.billboard`: the draw's `size`
 * pixels to a unit): its tip at the origin, a round head above it.
 */
export function pinMesh(): MeshData {
  const head = { x: 0, y: 0.72, r: 0.3 };
  // From the head's lower right, round the top, to its lower left.
  const ring: Array<[number, number]> = [[0, 0]];
  const steps = 18;
  const from = (-60 * Math.PI) / 180;
  const sweep = (300 * Math.PI) / 180;
  for (let i = 0; i <= steps; i++) {
    const a = from + (sweep * i) / steps;
    ring.push([head.x + head.r * Math.cos(a), head.y + head.r * Math.sin(a)]);
  }
  const positions = new Float32Array((ring.length + 1) * 3);
  positions.set([head.x, head.y, 0], 0);
  ring.forEach(([x, y], i) => positions.set([x, y, 0], (i + 1) * 3));
  const indices: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    indices.push(0, 1 + i, 1 + ((i + 1) % ring.length));
  }
  const normals = new Float32Array(positions.length);
  for (let i = 2; i < normals.length; i += 3) {
    normals[i] = 1;
  }
  return { positions, normals, indices: Uint32Array.from(indices) };
}

const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = className;
  e.append(...children);
  return e;
};

const metres = (m: number) => `${Math.round(m).toLocaleString("en-US")} m`;

interface Pin {
  readonly site: Site;
  readonly transform: TransformHandle;
  readonly draw: DrawHandle;
  readonly label: HTMLElement;
  readonly height: HTMLElement;
}

export interface Pins {
  /** The ground moved at these sites: stand their pins on it again. */
  update(moved: readonly Site[]): void;
  dispose(): void;
}

/**
 * A pin on each site's ground and a label over it. Each pin is a billboard
 * at the site's true position (ITRF): the engine draws it where the route
 * puts that point, upright and not stretched, with nothing set on it. The
 * label is HTML, placed where the drawn point is on screen.
 */
export function createPins(
  viewer: Viewer,
  sites: readonly Site[],
  overlay: HTMLElement,
): Pins {
  const { world, view, engine } = viewer;
  const earth = world.bodyAnchor(EARTH);
  const mesh: MeshHandle = world.addMesh(pinMesh());
  const pins = new Map<Site, Pin>();

  const place = (site: Site) => {
    const matrix = mat4.setTranslation(mat4.mat4(), site.position);
    const existing = pins.get(site);
    if (existing) {
      world.setTransform(existing.transform, matrix);
    } else {
      const kind = site.place.kind;
      const transform = world.addTransform(matrix, earth);
      const draw = world.addDraw({
        mesh,
        transform,
        billboard: { size: PIN_SIZE[kind] },
        color: PIN_COLOR[kind],
        unlit: true,
        ground: false,
        name: site.place.name,
      });
      const height = element("span", "vex-label-height");
      const label = element(
        "div",
        `vex-label ${kind}`,
        element("b", "", site.place.name),
        height,
      );
      overlay.append(label);
      pins.set(site, { site, transform, draw, label, height });
    }
    pins.get(site)!.height.textContent = metres(site.height ?? 0);
  };

  const offTick = engine.onAfterTick(() => {
    for (const { site, label } of pins.values()) {
      // The true position: the view carries it through its route.
      const px = view.toPixel(site.position, earth);
      if (px === undefined) {
        label.hidden = true;
        continue;
      }
      label.hidden = false;
      label.style.transform = `translate(${px[0]!.toFixed(1)}px, ${(px[1]! - PIN_SIZE[site.place.kind] - 4).toFixed(1)}px) translate(-50%, -100%)`;
    }
  });

  return {
    update(moved) {
      for (const site of moved) {
        place(site);
      }
      engine.requestRender();
    },
    dispose() {
      offTick();
      for (const { draw, transform, label } of pins.values()) {
        label.remove();
        if (!world.destroyed) {
          world.removeDraw(draw);
          world.removeTransform(transform);
        }
      }
      pins.clear();
      if (!world.destroyed) {
        world.removeMesh(mesh);
      }
    },
  };
}
