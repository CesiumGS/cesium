// The frames explorer's globe (DESIGN.md "On the globe"): triads drawn as
// meshes that follow the clock, overlays as 1-device-pixel line lists
// (ruling F30) in the frame-family colors, HTML labels over the view,
// selection by tint and dimming, eased camera flights and the darker ground
// under an engineering subject. Everything is added through `scope` and
// removed with the example.
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import type { MeshData } from "../../src/scene/meshes.ts";
import type {
  DrawHandle,
  MeshHandle,
  TransformHandle,
} from "../../src/scene/World.ts";
import type { Instant } from "../../src/time/Instant.ts";
import type { Viewer } from "../../widgets/index.ts";
import type { OverlayChunk, Rgba } from "./overlays.ts";
import { AXIS_COLORS, FAMILY_INFO, type Family } from "./panel/families.ts";

/** A CSS hex color as sRGB bytes. */
export function hexRgba(hex: string, alpha = 255): Rgba {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

const linear = (byte: number): number => {
  const c = byte / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** A family's on-dark tone (the globe always takes it). */
export const familyRgba = (family: Family): Rgba =>
  hexRgba(FAMILY_INFO[family].onDark);

/** The tint a dimmed draw takes: lines are opaque, so dimming darkens (alpha 0.35 at 1 px, F30). */
const DIM = 0.35;
/** The tint of a secondary line (minor grid lines, true north, Tissot outlines). */
export const SECONDARY = 0.6;

const WHITE: Rgba = [255, 255, 255, 255];

/** `rgba` mixed half with white (DESIGN.md: the selected overlay's lighter tint). */
const lighter = (rgba: Rgba): Rgba => [
  Math.round((rgba[0] + 255) / 2),
  Math.round((rgba[1] + 255) / 2),
  Math.round((rgba[2] + 255) / 2),
  rgba[3],
];

/** A label's point farther than this many times the camera's height is off the scene (S-I3). */
const LABEL_FAR = 20;

/** Labels whose origins are closer than this on screen fade out (DESIGN.md "Labels"). */
const LABEL_NEAR_PX = 24;

// ------------------------------------------------------------------ triads

/** Shaft width as a share of the triad's length (about 2 px at the usual framing). */
const SHAFT = 0.015;
const HEAD = 0.1;
const SIDES = 8;

/**
 * A unit triad: a box shaft and an 8-sided cone per axis (x red, y green, z
 * blue), and a small cube at the origin in the family's tone. Unit length
 * along each local axis; its transform scales and places it.
 */
/** A triad mesh's proportions (S-I2, S-I8). */
interface TriadShape {
  /** Shaft width as a share of the length. */
  shaft: number;
  /** Where each shaft starts, as a share of the length (geocentric: at the surface); default 0. */
  start?: readonly [number, number, number];
  /** The origin cube (left out when the origin is inside the Earth). */
  cube: boolean;
}

function triadMesh(
  family: Family,
  light = false,
  shape: TriadShape = { shaft: SHAFT, cube: true },
): MeshData {
  const shaftW = shape.shaft;
  const head = Math.max(HEAD, 2 * shaftW);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  // The selected triad's shafts at the lighter tint (DESIGN.md "A selection").
  const color = (srgb: Rgba) => {
    const rgba = light ? lighter(srgb) : srgb;
    return [linear(rgba[0]), linear(rgba[1]), linear(rgba[2]), 1];
  };
  const vertex = (p: readonly number[], c: readonly number[]) => {
    positions.push(p[0]!, p[1]!, p[2]!);
    colors.push(...c);
    return positions.length / 3 - 1;
  };
  /** A box from `lo` to `hi` (corners in local axes). */
  const box = (lo: number[], hi: number[], c: number[]) => {
    const v: number[] = [];
    for (let i = 0; i < 8; i++) {
      v.push(
        vertex(
          [
            i & 1 ? hi[0]! : lo[0]!,
            i & 2 ? hi[1]! : lo[1]!,
            i & 4 ? hi[2]! : lo[2]!,
          ],
          c,
        ),
      );
    }
    const faces = [
      [0, 1, 3, 2],
      [4, 6, 7, 5],
      [0, 4, 5, 1],
      [2, 3, 7, 6],
      [0, 2, 6, 4],
      [1, 5, 7, 3],
    ];
    for (const [a, b, cc, d] of faces) {
      indices.push(v[a!]!, v[b!]!, v[cc!]!, v[a!]!, v[cc!]!, v[d!]!);
    }
  };
  const axes = [AXIS_COLORS.x, AXIS_COLORS.y, AXIS_COLORS.z];
  for (let axis = 0; axis < 3; axis++) {
    const c = color(hexRgba(axes[axis]!));
    const u = (axis + 1) % 3;
    const w = (axis + 2) % 3;
    const lo = [0, 0, 0];
    const hi = [0, 0, 0];
    lo[axis] = shape.start?.[axis] ?? 0;
    hi[axis] = 1 - head;
    lo[u] = lo[w] = -shaftW / 2;
    hi[u] = hi[w] = shaftW / 2;
    box(lo, hi, c);
    // The cone: a ring of SIDES at the head's base, the tip at 1.
    const tip = [0, 0, 0];
    tip[axis] = 1;
    const t = vertex(tip, c);
    const ring: number[] = [];
    for (let k = 0; k < SIDES; k++) {
      const a = (2 * Math.PI * k) / SIDES;
      const p = [0, 0, 0];
      p[axis] = 1 - head;
      p[u] = 1.5 * shaftW * Math.cos(a);
      p[w] = 1.5 * shaftW * Math.sin(a);
      ring.push(vertex(p, c));
    }
    const base = vertex(
      [
        axis === 0 ? 1 - head : 0,
        axis === 1 ? 1 - head : 0,
        axis === 2 ? 1 - head : 0,
      ],
      c,
    );
    for (let k = 0; k < SIDES; k++) {
      const a = ring[k]!;
      const b = ring[(k + 1) % SIDES]!;
      indices.push(t, a, b, base, b, a);
    }
  }
  if (shape.cube) {
    const o = 2 * shaftW;
    box([-o, -o, -o], [o, o, o], color(familyRgba(family)));
  }
  return {
    positions: Float32Array.from(positions),
    colors: Float32Array.from(colors),
    indices: Uint32Array.from(indices),
  };
}

/** A frame drawn as a triad. */
export interface TriadSpec {
  /** The tree node id it stands for. */
  id: string;
  label: string;
  frame: Frame;
  family: Family;
  /**
   * A fixed length, meters (geocentric frames at 1.5 Earth radii, so they
   * leave the globe); otherwise 6% of the camera's distance, 2 m to 2,000 km.
   */
  length?: number;
  /**
   * Geocentric: the shafts start at the Earth's surface (the axes' share
   * of `length` there: equatorial for x and y, polar for z) and there is
   * no origin cube, so nothing draws over the globe from inside it (S-I2:
   * no depth-test switch in the engine for x-ray dashes).
   */
  surface?: readonly [number, number, number];
  /** Its tint: 1, or `SECONDARY` (GCRF beside ITRF, S-I1). */
  strength?: number;
  /** Without `length`: its length as a share of the camera's distance (default 0.06; the subject of a stop, more). */
  scale?: number;
}

interface Triad {
  spec: TriadSpec;
  /** Drawn at the lighter tint: the selected frame's. */
  light: boolean;
  mesh: MeshHandle;
  transform: TransformHandle;
  draw: DrawHandle;
  origin: Float64Array;
  /** The triad is drawn (its frame resolves at the instant). */
  shown: boolean;
}

/** A drawn overlay: its draws (one per chunk) and their base tints. */
interface Overlay {
  remove(): void;
  /** Each chunk's draw, its layer's strength and, when it was recolored, its layer's color. */
  draws: { draw: DrawHandle; tint: number; color?: Rgba }[];
  /** The transform every chunk hangs under, when drawn with a `placement`. */
  placement?: TransformHandle;
  visible: boolean;
}

/**
 * What a selection emphasizes (R14): the selected overlay (lighter, the
 * rest dimmed), the frames on the selected path (full, the rest dimmed) and
 * the selected frame itself (lighter, its label white).
 */
export interface Emphasis {
  overlay?: string;
  frames: ReadonlySet<string>;
  selected?: string;
}

/** A label over the view at a point on the globe (HTML, DESIGN.md "Labels"). */
export interface LabelSpec {
  id: string;
  text: string;
  /** Earth-fixed meters, or a function giving it at the moment (a triad's origin). */
  at: ArrayLike<number> | (() => ArrayLike<number> | undefined);
  family?: Family;
  /** Higher draws first and wins a collision. */
  priority: number;
  /** A callout: a 1 px leader from the point to the text (DESIGN.md "Labels"). */
  leader?: boolean;
}

/** A camera framing: look at `center` from `range` meters, heading and pitch in its east-north-up frame. */
export interface Framing {
  center: ArrayLike<number>;
  range: number;
  heading: number;
  pitch: number;
  /**
   * Look from along this direction instead (unit vector from the center
   * toward the camera), with `up` the screen's up: for a view no
   * east-north-up frame gives, such as down on the Earth–Moon plane.
   */
  from?: { direction: ArrayLike<number>; up: ArrayLike<number> };
}

const EARTH_RADIUS = 6_356_752;

export class Globe {
  private readonly triads = new Map<string, Triad>();
  private readonly overlays = new Map<string, Overlay>();
  private readonly labels = new Map<
    string,
    { spec: LabelSpec; el: HTMLElement }
  >();
  private readonly labelHost: HTMLElement;
  private emphasis: Emphasis | undefined;
  private flight = 0;
  private dimmed = false;
  private dimTimer = 0;

  constructor(
    private readonly viewer: Viewer,
    private readonly scope: DisposableStack,
    hud: HTMLElement,
  ) {
    this.labelHost = document.createElement("div");
    this.labelHost.className = "fx-globe-labels";
    this.labelHost.setAttribute("aria-hidden", "true");
    hud.append(this.labelHost);
    scope.defer(() => {
      this.flight++;
      cancelAnimationFrame(this.dimTimer);
      this.labelHost.remove();
      for (const id of [...this.triads.keys()]) {
        this.removeTriad(id);
      }
      for (const id of [...this.overlays.keys()]) {
        this.removeOverlay(id);
      }
    });
  }

  // ------------------------------------------------------------- triads

  /** Draws exactly `specs` as triads (adding and removing as needed). */
  setTriads(specs: readonly TriadSpec[]): void {
    const wanted = new Set(specs.map((s) => s.id));
    for (const id of [...this.triads.keys()]) {
      if (!wanted.has(id)) {
        this.removeTriad(id);
      }
    }
    const { world } = this.viewer;
    for (const spec of specs) {
      const have = this.triads.get(spec.id);
      if (have !== undefined && have.spec.scale === spec.scale) {
        have.spec = spec;
        continue;
      }
      if (have !== undefined) {
        // Its proportions change with its scale: a new mesh.
        this.removeTriad(spec.id);
      }
      const mesh = world.addMesh(
        triadMesh(spec.family, false, this.shapeOf(spec)),
      );
      const transform = world.addTransform(identity());
      const draw = world.addDraw({
        mesh,
        transform,
        unlit: true,
        radius: 1,
        name: `frames explorer triad ${spec.label}`,
      });
      world.setTransformVisible(transform, false);
      this.triads.set(spec.id, {
        spec,
        light: false,
        mesh,
        transform,
        draw,
        origin: new Float64Array(3),
        shown: false,
      });
    }
    this.retint();
  }

  private removeTriad(id: string): void {
    const t = this.triads.get(id);
    if (t === undefined) {
      return;
    }
    const { world } = this.viewer;
    world.removeDraw(t.draw);
    world.removeTransform(t.transform);
    world.removeMesh(t.mesh);
    this.triads.delete(id);
  }

  /**
   * A triad's proportions: a fixed-length (geocentric) triad keeps the 1.5%
   * shaft and starts at the surface; a camera-scaled one (6% of the
   * distance, about 40 px long) gets a shaft at least 2.5 px wide on this
   * view, so a site's triad never reads as a hairline (S-I8).
   */
  private shapeOf(spec: TriadSpec): TriadShape {
    if (spec.length !== undefined) {
      return {
        shaft: SHAFT,
        cube: spec.surface === undefined,
        ...(spec.surface && { start: spec.surface }),
      };
    }
    const cam = this.viewer.view.camera;
    const w = this.viewer.canvas.clientWidth || 800;
    const h = this.viewer.canvas.clientHeight || 600;
    const pxPerRadian = h / cam.fovy(w / h);
    const lengthPx = (spec.scale ?? 0.06) * pxPerRadian;
    return {
      shaft: Math.min(0.08, Math.max(SHAFT, 2.5 / lengthPx)),
      cube: true,
    };
  }

  /** A triad's origin, Earth-fixed meters, once drawn. */
  triadOrigin(id: string): Float64Array | undefined {
    const t = this.triads.get(id);
    return t?.shown ? t.origin : undefined;
  }

  /**
   * Places every triad at `instant` (R4: `frameTransform(frame, itrf, t)`),
   * its length from the camera's distance. Called every frame.
   */
  update(itrf: Frame, instant: Instant): void {
    const { world, view } = this.viewer;
    const eye = view.camera.position;
    const m = new Float64Array(16);
    for (const t of this.triads.values()) {
      try {
        frameTransform(t.spec.frame, itrf, instant, m);
      } catch {
        // Outside its data (the ephemeris span): not drawn, never wrong.
        if (t.shown) {
          world.setTransformVisible(t.transform, false);
          t.shown = false;
        }
        continue;
      }
      t.origin.set([m[12]!, m[13]!, m[14]!]);
      const distance = Math.hypot(
        m[12]! - eye[0]!,
        m[13]! - eye[1]!,
        m[14]! - eye[2]!,
      );
      // A fixed-length (geocentric) triad is a whole-Earth view's: from a
      // regional camera its shafts, scaled with it, would bar the view.
      const hide =
        t.spec.length !== undefined && distance < 1.25 * t.spec.length;
      if (hide) {
        if (t.shown) {
          world.setTransformVisible(t.transform, false);
          t.shown = false;
        }
        continue;
      }
      const length =
        t.spec.length ??
        Math.min(2e6, Math.max(2, (t.spec.scale ?? 0.06) * distance));
      for (let i = 0; i < 12; i++) {
        if (i % 4 !== 3) {
          m[i] = m[i]! * length;
        }
      }
      world.setTransform(t.transform, m);
      if (!t.shown) {
        world.setTransformVisible(t.transform, true);
        t.shown = true;
      }
    }
    this.placeLabels();
  }

  // ----------------------------------------------------------- overlays

  /**
   * Draws an overlay's layers (the worker's chunks) as 1 px line lists in
   * `color`, each layer at its strength (1 primary, `SECONDARY`) and,
   * dashed, with every other segment left out (line-list can't dash in
   * screen space, F30). Replaces what `id` drew before.
   */
  setOverlay(
    id: string,
    layers: readonly {
      chunks: readonly OverlayChunk[];
      /** The layer's color; without one, the chunks keep their own (round-trip markers, axes). */
      color?: Rgba;
      strength?: number;
      dashed?: boolean;
    }[],
    options: {
      /**
       * Hang every chunk under one placement (a float64 column-major
       * matrix), which `placeOverlay` moves later without a rebuild: Orion's
       * path drawn in GCRF or MOON_ME follows the clock that way. Each chunk
       * keeps its own float64 origin under it.
       */
      placement?: ArrayLike<number>;
    } = {},
  ): void {
    this.removeOverlay(id);
    const { world } = this.viewer;
    const draws: Overlay["draws"] = [];
    const meshes: MeshHandle[] = [];
    const placement =
      options.placement !== undefined
        ? world.addTransform(options.placement)
        : undefined;
    const remove = () => {
      for (const { draw } of draws.splice(0)) {
        world.removeDraw(draw);
      }
      for (const mesh of meshes.splice(0)) {
        world.removeMesh(mesh);
      }
      // The placement's subtree goes with it: every chunk's transform.
      if (placement !== undefined) {
        world.removeTransform(placement);
      }
    };
    try {
      for (const layer of layers) {
        const tint = layer.strength ?? 1;
        for (const c of layer.chunks) {
          const dashed = layer.dashed ? dash(c) : c;
          // A colored layer is white in its vertices and takes its color
          // from the draw's tint, so dimming and the selected lighter mix
          // are tints within 0 to 1 (no engine assumption).
          const chunk =
            layer.color !== undefined ? recolor(dashed, WHITE) : dashed;
          const mesh = world.addMesh(chunk.mesh);
          meshes.push(mesh);
          let draw: DrawHandle;
          if (placement !== undefined) {
            const at = identity();
            at[12] = chunk.origin[0]!;
            at[13] = chunk.origin[1]!;
            at[14] = chunk.origin[2]!;
            const transform = world.addTransform(at, placement);
            draw = world.addDraw({
              mesh,
              transform,
              unlit: true,
              name: `frames explorer ${id}`,
            });
          } else {
            draw = world.addDraw({
              mesh,
              origin: chunk.origin,
              unlit: true,
              name: `frames explorer ${id}`,
            });
          }
          draws.push({
            draw,
            tint,
            ...(layer.color !== undefined && { color: layer.color }),
          });
        }
      }
    } catch (error) {
      remove();
      throw error;
    }
    this.overlays.set(id, {
      remove,
      draws,
      visible: true,
      ...(placement !== undefined && { placement }),
    });
    this.retint();
  }

  /** Moves an overlay drawn with a `placement` (a float64 column-major matrix). */
  placeOverlay(id: string, matrix: ArrayLike<number>): void {
    const placement = this.overlays.get(id)?.placement;
    if (placement !== undefined) {
      this.viewer.world.setTransform(placement, matrix);
    }
  }

  hasOverlay(id: string): boolean {
    return this.overlays.has(id);
  }

  removeOverlay(id: string): void {
    const o = this.overlays.get(id);
    if (o !== undefined) {
      o.remove();
      this.overlays.delete(id);
    }
  }

  // ---------------------------------------------------------- selection

  /**
   * R14 on the globe: the selected overlay at full strength and the frames
   * on the selected path, everything else dimmed. `undefined` clears it.
   */
  emphasize(emphasis: Emphasis | undefined): void {
    this.emphasis = emphasis;
    this.retint();
  }

  /** Shows or hides an overlay's draws, keeping them (the design grid's 2 km lines by range). */
  setOverlayVisible(id: string, visible: boolean): void {
    const o = this.overlays.get(id);
    if (o === undefined || o.visible === visible) {
      return;
    }
    o.visible = visible;
    for (const { draw } of o.draws) {
      this.viewer.world.setVisible(draw, visible);
    }
  }

  private retint(): void {
    const { world } = this.viewer;
    const e = this.emphasis;
    for (const [id, t] of this.triads) {
      const light = e?.selected === id;
      if (t.light !== light) {
        // The selected frame's triad takes its lighter mesh.
        world.removeDraw(t.draw);
        world.removeMesh(t.mesh);
        t.mesh = world.addMesh(
          triadMesh(t.spec.family, light, this.shapeOf(t.spec)),
        );
        t.draw = world.addDraw({
          mesh: t.mesh,
          transform: t.transform,
          unlit: true,
          radius: 1,
          name: `frames explorer triad ${t.spec.label}`,
        });
        t.light = light;
      }
      const k =
        (t.spec.strength ?? 1) *
        (e === undefined || e.frames.has(id) ? 1 : DIM);
      world.setColor(t.draw, [k, k, k, 1]);
    }
    for (const [id, o] of this.overlays) {
      // An overlay's parts ("designGrid:minor") go with it.
      const selected =
        e?.overlay !== undefined &&
        (e.overlay === id || id.startsWith(`${e.overlay}:`));
      const k =
        e === undefined || e.overlay === undefined || selected ? 1 : DIM;
      for (const { draw, tint, color } of o.draws) {
        const base: readonly number[] =
          color === undefined
            ? [1, 1, 1]
            : (selected ? lighter(color) : color)
                .slice(0, 3)
                .map((b) => linear(b));
        world.setColor(draw, [...base.map((c) => c * tint * k), 1]);
      }
    }
    for (const [id, l] of this.labels) {
      const hidden =
        e !== undefined &&
        l.spec.family !== undefined &&
        this.triads.has(id) &&
        !e.frames.has(id);
      l.el.classList.toggle("fx-globe-label-dim", hidden);
      l.el.classList.toggle("fx-globe-label-selected", e?.selected === id);
    }
  }

  // ------------------------------------------------------------- labels

  setLabels(specs: readonly LabelSpec[]): void {
    const wanted = new Set(specs.map((s) => s.id));
    for (const [id, l] of this.labels) {
      if (!wanted.has(id)) {
        l.el.remove();
        this.labels.delete(id);
      }
    }
    for (const spec of specs) {
      let l = this.labels.get(spec.id);
      if (l === undefined) {
        const el = document.createElement("span");
        el.className = "fx-globe-label";
        this.labelHost.append(el);
        l = { spec, el };
        this.labels.set(spec.id, l);
      }
      l.spec = spec;
      // Text only, never markup: labels can carry worker strings.
      l.el.textContent = spec.text;
      l.el.dataset.family = spec.family ?? "";
      l.el.classList.toggle("fx-globe-label-callout", spec.leader === true);
    }
    this.retint();
    this.placeLabels();
  }

  /** Projects each label's point and hides the ones that collide or are out of sight. */
  private placeLabels(): void {
    const { view } = this.viewer;
    const cam = view.camera;
    const w = this.labelHost.clientWidth || this.viewer.canvas.clientWidth;
    const h = this.labelHost.clientHeight || this.viewer.canvas.clientHeight;
    if (w === 0 || h === 0) {
      return;
    }
    const aspect = w / h;
    const t = Math.tan(cam.fovy(aspect) / 2);
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    /** The screen points of the labels shown, to fade one whose point is within 24 px of another's. */
    const anchors: { x: number; y: number }[] = [];
    const order = [...this.labels.values()].sort(
      (a, b) => b.spec.priority - a.spec.priority,
    );
    for (const { spec, el } of order) {
      const p = typeof spec.at === "function" ? spec.at() : spec.at;
      let visible = p !== undefined;
      let x = 0;
      let y = 0;
      if (p !== undefined) {
        const d = [
          p[0]! - cam.position[0]!,
          p[1]! - cam.position[1]!,
          p[2]! - cam.position[2]!,
        ];
        const z = dot(d, cam.direction);
        // Hidden behind the Earth, or far beyond what is framed (an origin
        // 384,000 km off, seen past a globe 12,000 km away: S-I3).
        const height = Math.max(
          1000,
          Math.hypot(cam.position[0]!, cam.position[1]!, cam.position[2]!) -
            EARTH_RADIUS,
        );
        const far = Math.hypot(d[0]!, d[1]!, d[2]!) > LABEL_FAR * height;
        if (z <= 0 || far || behindEarth(cam.position, p)) {
          visible = false;
        } else {
          x = ((dot(d, cam.right) / (z * t * aspect) + 1) / 2) * w;
          y = ((1 - dot(d, cam.up) / (z * t)) / 2) * h;
          visible = x >= 0 && x <= w && y >= 0 && y <= h;
        }
      }
      // Two origins under 24 px apart: the lower-priority label fades out
      // (a transition, not a cut) rather than crowding the higher one.
      const near =
        visible &&
        anchors.some((a) => Math.hypot(a.x - x, a.y - y) < LABEL_NEAR_PX);
      el.classList.toggle("fx-globe-label-near", near);
      if (visible && !near) {
        const bw = el.offsetWidth || 80;
        const bh = el.offsetHeight || 16;
        // A callout sits 48 px right of its point, its leader between;
        // every label is kept inside the view (S-I3).
        const box = {
          x: Math.min(Math.max(2, x + (spec.leader ? 48 : 12)), w - bw - 2),
          y: Math.min(
            Math.max(2, spec.leader ? y - bh / 2 : y + 4),
            h - bh - 2,
          ),
          w: bw,
          h: bh,
        };
        visible = !placed.some(
          (b) =>
            box.x < b.x + b.w &&
            b.x < box.x + box.w &&
            box.y < b.y + b.h &&
            b.y < box.y + box.h,
        );
        if (visible) {
          placed.push(box);
          anchors.push({ x, y });
          el.style.transform = `translate(${box.x.toFixed(1)}px, ${box.y.toFixed(1)}px)`;
        }
      } else if (near) {
        // Kept in place, faded: it fades back in where it was.
        el.style.transform = `translate(${(x + 12).toFixed(1)}px, ${(y + 4).toFixed(1)}px)`;
      }
      el.hidden = !visible;
    }
  }

  // -------------------------------------------------------------- camera

  /**
   * Flies to `to`, eased (cubic in and out), 1.2 s plus 0.35 s per decade of
   * distance ratio, 1.2 to 3.5 s (DESIGN.md "Flights"); under reduced
   * motion, a cut. A new flight, or the user taking the camera, ends it.
   */
  flyTo(to: Framing, seconds?: number): void {
    const token = ++this.flight;
    const { view, controller } = this.viewer;
    const cam = view.camera;
    const center = Float64Array.from(to.center);
    const place = () => {
      if (to.from === undefined) {
        cam.lookAt(center, to.heading, to.pitch, to.range);
        return;
      }
      const d = to.from.direction;
      cam.position.set([0, 1, 2].map((i) => center[i]! + d[i]! * to.range));
      cam.direction.set([-d[0]!, -d[1]!, -d[2]!]);
      cam.orient(Float64Array.from(to.from.up));
    };
    const end = () => {
      cam.near = Math.min(0.1, Math.max(0.001, to.range * 0.0008));
      if (to.from === undefined) {
        controller.focus(center, to.heading, to.pitch, to.range);
      } else {
        controller.stop();
        place();
        cam.version++;
      }
      this.viewer.engine.requestRender();
    };
    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      end();
      return;
    }
    // Where the flight ends, as a camera position and look direction.
    const target = cam.position.slice() as Float64Array;
    const saved = {
      position: Float64Array.from(cam.position),
      direction: Float64Array.from(cam.direction),
      up: Float64Array.from(cam.up),
      right: Float64Array.from(cam.right),
    };
    place();
    const endPos = Float64Array.from(cam.position);
    const endDir = Float64Array.from(cam.direction);
    cam.position.set(saved.position);
    cam.direction.set(saved.direction);
    cam.up.set(saved.up);
    cam.right.set(saved.right);
    target.set(center);
    const startRange = Math.max(1, dist(saved.position, center));
    const startLook = saved.position.map(
      (v, i) => v + saved.direction[i]! * startRange,
    );
    const ratio = Math.abs(
      Math.log10(Math.max(startRange, dist(saved.position, endPos)) / to.range),
    );
    const duration =
      1000 * (seconds ?? Math.min(3.5, Math.max(1.2, 1.2 + 0.35 * ratio)));
    const inputs = controller.inputs;
    const start = performance.now();
    cam.near = Math.min(
      cam.near,
      Math.min(0.1, Math.max(0.001, to.range * 0.0008)),
    );
    const step = (now: number) => {
      if (token !== this.flight) {
        return;
      }
      if (controller.inputs !== inputs) {
        this.flight++;
        return;
      }
      const u = Math.min(1, (now - start) / duration);
      const e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
      const look = startLook.map((v, i) => v + (center[i]! - v) * e);
      const dir = normalize(
        saved.direction.map((v, i) => v + (endDir[i]! - v) * e),
      );
      const range = Math.exp(
        Math.log(startRange) + (Math.log(to.range) - Math.log(startRange)) * e,
      );
      cam.position.set(look.map((v, i) => v - dir[i]! * range));
      cam.direction.set(dir);
      cam.orient(
        to.from !== undefined && e > 0.5
          ? Float64Array.from(to.from.up)
          : normalize(look),
      );
      cam.version++;
      this.viewer.engine.requestRender();
      if (u < 1) {
        requestAnimationFrame(step);
      } else {
        end();
      }
    };
    requestAnimationFrame(step);
  }

  /** Stops a flight in progress. */
  stopFlight(): void {
    this.flight++;
  }

  /**
   * The darker ground (DESIGN.md "Lines"): exposure compensation −0.6 dims
   * the lit globe while the unlit lines stay at full strength; eased over
   * 0.6 s, restored the same way.
   */
  dimGround(on: boolean): void {
    if (on === this.dimmed) {
      return;
    }
    this.dimmed = on;
    cancelAnimationFrame(this.dimTimer);
    const { view } = this.viewer;
    const exposure = view.exposure;
    if (!("eye" in exposure)) {
      return;
    }
    const from = exposure.compensation ?? 0;
    const to = on ? -0.6 : 0;
    const start = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / 600);
      view.exposure = { ...exposure, compensation: from + (to - from) * u };
      this.viewer.engine.requestRender();
      if (u < 1) {
        this.dimTimer = requestAnimationFrame(step);
      }
    };
    this.dimTimer = requestAnimationFrame(step);
  }
}

const identity = () => {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
};
const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const dist = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
const normalize = (v: ArrayLike<number>): Float64Array => {
  const n = Math.hypot(v[0]!, v[1]!, v[2]!) || 1;
  return Float64Array.from([v[0]! / n, v[1]! / n, v[2]! / n]);
};

/** The Earth (a sphere of its polar radius) hides `p` from `eye`. */
/** Whether the Earth (a sphere) hides `p` from `eye`. */
export function behindEarth(
  eye: ArrayLike<number>,
  p: ArrayLike<number>,
): boolean {
  const d = [p[0]! - eye[0]!, p[1]! - eye[1]!, p[2]! - eye[2]!];
  const len = Math.hypot(d[0]!, d[1]!, d[2]!);
  const u = d.map((v) => v / len);
  const b = dot(eye, u);
  const c = dot(eye, eye) - EARTH_RADIUS * EARTH_RADIUS;
  const disc = b * b - c;
  if (disc <= 0) {
    return false;
  }
  const near = -b - Math.sqrt(disc);
  return near > 0 && near < len - 1;
}

/** A chunk with every vertex in `color` (the family tone, F30). */
function recolor(chunk: OverlayChunk, color: Rgba): OverlayChunk {
  const n = chunk.mesh.positions.length / 3;
  const colors = new Float32Array(4 * n);
  const c = [
    linear(color[0]),
    linear(color[1]),
    linear(color[2]),
    color[3] / 255,
  ];
  for (let i = 0; i < n; i++) {
    colors.set(c, 4 * i);
  }
  return { ...chunk, mesh: { ...chunk.mesh, colors } };
}

/** A chunk with every other segment left out: a dashed line as world-space segments (F30). */
function dash(chunk: OverlayChunk): OverlayChunk {
  const p = chunk.mesh.positions;
  const c = chunk.mesh.colors;
  const segments = p.length / 6;
  const keep = Math.ceil(segments / 2);
  const positions = new Float32Array(keep * 6);
  const colors = new Float32Array(keep * 8);
  for (let s = 0, k = 0; s < segments; s += 2, k++) {
    positions.set(p.subarray(6 * s, 6 * s + 6), 6 * k);
    if (c !== undefined) {
      colors.set(c.subarray(8 * s, 8 * s + 8), 8 * k);
    }
  }
  const indices = new Uint32Array(keep * 2);
  for (let i = 0; i < indices.length; i++) {
    indices[i] = i;
  }
  return {
    origin: chunk.origin,
    mesh: { positions, indices, topology: "line-list", colors },
  };
}
