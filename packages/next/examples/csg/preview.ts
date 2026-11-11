import { isStepLeaf, primitiveOf, type LeafNode, type Vec3 } from "./tree.ts";
import type { Primitive } from "../../src/brep/kernelProtocol.ts";

/**
 * The transient preview of a primitive while a parameter is dragged (plan
 * §13.33, editing): its wire, as line segments in the world's coordinates,
 * made at once on the page without a kernel, so the edit shows at the
 * pointer's pace while the solid re-evaluates behind it. The wire is a
 * proxy: a box's edges, circles for the round parts and the lines joining
 * them.
 */
export interface Outline {
  /** Points, x y z each, m. */
  positions: Float32Array;
  /** Pairs of points: the segments. */
  indices: Uint32Array;
}

const CIRCLE_SEGMENTS = 48;

/** A point turned about the world's x, then y, then z axes (degrees) and moved: the kernels' placement. */
export function place(p: Vec3, rotate: Vec3, translate: Vec3): Vec3 {
  let [x, y, z] = p;
  const [rx, ry, rz] = rotate.map((a) => (a * Math.PI) / 180) as Vec3;
  [y, z] = [
    y * Math.cos(rx) - z * Math.sin(rx),
    y * Math.sin(rx) + z * Math.cos(rx),
  ];
  [x, z] = [
    x * Math.cos(ry) + z * Math.sin(ry),
    -x * Math.sin(ry) + z * Math.cos(ry),
  ];
  [x, y] = [
    x * Math.cos(rz) - y * Math.sin(rz),
    x * Math.sin(rz) + y * Math.cos(rz),
  ];
  return [x + translate[0], y + translate[1], z + translate[2]];
}

/** Collects polylines and segments, then places them. */
class Wire {
  readonly points: Vec3[] = [];
  readonly pairs: number[] = [];

  /** An open or closed chain through the points. */
  chain(points: Vec3[], closed: boolean): void {
    const first = this.points.length;
    this.points.push(...points);
    for (let i = 0; i + 1 < points.length; i++) {
      this.pairs.push(first + i, first + i + 1);
    }
    if (closed && points.length > 2) {
      this.pairs.push(first + points.length - 1, first);
    }
  }

  segment(a: Vec3, b: Vec3): void {
    this.chain([a, b], false);
  }

  /** A circle of `radius` about an axis through `centre`, in the plane across `u` and `v`. */
  circle(centre: Vec3, u: Vec3, v: Vec3, radius: number): void {
    if (radius <= 0) {
      return;
    }
    const points: Vec3[] = [];
    for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
      const a = (i / CIRCLE_SEGMENTS) * 2 * Math.PI;
      const c = Math.cos(a) * radius;
      const s = Math.sin(a) * radius;
      points.push([
        centre[0] + c * u[0] + s * v[0],
        centre[1] + c * u[1] + s * v[1],
        centre[2] + c * u[2] + s * v[2],
      ]);
    }
    this.chain(points, true);
  }
}

const X: Vec3 = [1, 0, 0];
const Y: Vec3 = [0, 1, 0];
const Z: Vec3 = [0, 0, 1];

/** The leaf's wire: its primitive's (a STEP part's is its bounds' box), then its placement. */
export function outlineOf(leaf: LeafNode): Outline {
  const primitive: Primitive = isStepLeaf(leaf)
    ? {
        kind: "box",
        origin: [
          -leaf.step.size[0] / 2,
          -leaf.step.size[1] / 2,
          -leaf.step.size[2] / 2,
        ],
        size: leaf.step.size,
      }
    : primitiveOf(leaf);
  const wire = new Wire();
  switch (primitive.kind) {
    case "box": {
      const [x0, y0, z0] = primitive.origin;
      const [x1, y1, z1] = [
        x0 + primitive.size[0],
        y0 + primitive.size[1],
        z0 + primitive.size[2],
      ];
      wire.chain(
        [
          [x0, y0, z0],
          [x1, y0, z0],
          [x1, y1, z0],
          [x0, y1, z0],
        ],
        true,
      );
      wire.chain(
        [
          [x0, y0, z1],
          [x1, y0, z1],
          [x1, y1, z1],
          [x0, y1, z1],
        ],
        true,
      );
      for (const [x, y] of [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ] as const) {
        wire.segment([x, y, z0], [x, y, z1]);
      }
      break;
    }
    case "cylinder": {
      const [bx, by, bz] = primitive.base;
      const top = bz + primitive.height;
      wire.circle([bx, by, bz], X, Y, primitive.radius);
      wire.circle([bx, by, top], X, Y, primitive.radius);
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ] as const) {
        wire.segment(
          [bx + dx * primitive.radius, by + dy * primitive.radius, bz],
          [bx + dx * primitive.radius, by + dy * primitive.radius, top],
        );
      }
      break;
    }
    case "cone": {
      const [bx, by, bz] = primitive.base;
      const top = bz + primitive.height;
      wire.circle([bx, by, bz], X, Y, primitive.radiusBase);
      wire.circle([bx, by, top], X, Y, primitive.radiusTop);
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ] as const) {
        wire.segment(
          [bx + dx * primitive.radiusBase, by + dy * primitive.radiusBase, bz],
          [bx + dx * primitive.radiusTop, by + dy * primitive.radiusTop, top],
        );
      }
      break;
    }
    case "sphere": {
      const [cx, cy, cz] = primitive.centre;
      const c: Vec3 = [cx, cy, cz];
      wire.circle(c, X, Y, primitive.radius);
      wire.circle(c, Y, Z, primitive.radius);
      wire.circle(c, Z, X, primitive.radius);
      break;
    }
    case "torus": {
      const [cx, cy, cz] = primitive.centre;
      const { major, minor } = primitive;
      wire.circle([cx, cy, cz], X, Y, major + minor);
      wire.circle([cx, cy, cz], X, Y, Math.max(0, major - minor));
      wire.circle([cx, cy, cz + minor], X, Y, major);
      wire.circle([cx, cy, cz - minor], X, Y, major);
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ] as const) {
        // A section through the tube: a circle in the plane of the axis and the radius.
        wire.circle(
          [cx + dx * major, cy + dy * major, cz],
          [dx, dy, 0],
          Z,
          minor,
        );
      }
      break;
    }
  }
  const positions = new Float32Array(wire.points.length * 3);
  wire.points.forEach((point, i) => {
    positions.set(place(point, leaf.rotate, leaf.translate), i * 3);
  });
  return { positions, indices: Uint32Array.from(wire.pairs) };
}
