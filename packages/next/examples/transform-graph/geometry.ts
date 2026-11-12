import type { MeshData } from "@cesium/next";

export type V3 = readonly [number, number, number];
export type Rgba = readonly [number, number, number, number];

const lin = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

/** A linear RGBA colour from a CSS hex colour (sRGB). */
export function hex(color: string, alpha = 1): Rgba {
  const n = Number.parseInt(color.replace("#", ""), 16);
  return [
    lin(((n >> 16) & 255) / 255),
    lin(((n >> 8) & 255) / 255),
    lin((n & 255) / 255),
    alpha,
  ];
}

/** Triangles and their per-vertex colours, built up and turned into mesh data. */
export class MeshBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colors: number[] = [];
  private readonly indices: number[] = [];

  get vertexCount(): number {
    return this.positions.length / 3;
  }

  vertex(p: V3, n: V3, color: Rgba): number {
    const i = this.vertexCount;
    this.positions.push(p[0], p[1], p[2]);
    this.normals.push(n[0], n[1], n[2]);
    this.colors.push(color[0], color[1], color[2], color[3]);
    return i;
  }

  triangle(a: number, b: number, c: number): void {
    this.indices.push(a, b, c);
  }

  /** A flat quad a, b, c, d (counter-clockwise seen from the side its normal points to). */
  quad(a: V3, b: V3, c: V3, d: V3, color: Rgba): void {
    const n = normalOf(a, b, c);
    const i = this.vertex(a, n, color);
    this.vertex(b, n, color);
    this.vertex(c, n, color);
    this.vertex(d, n, color);
    this.triangle(i, i + 1, i + 2);
    this.triangle(i, i + 2, i + 3);
  }

  /** An axis-aligned box from `min` to `max`. */
  box(min: V3, max: V3, color: Rgba): void {
    const [x0, y0, z0] = min;
    const [x1, y1, z1] = max;
    this.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], color);
    this.quad([x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], color);
    this.quad([x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], color);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], color);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], color);
    this.quad([x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0], color);
  }

  /** A box with horizontal sides: centre, size, and rotation about z. */
  orientedBox(centre: V3, size: V3, yaw: number, color: Rgba): void {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const corner = (sx: number, sy: number, z: number): V3 => {
      const x = (sx * size[0]) / 2;
      const y = (sy * size[1]) / 2;
      return [centre[0] + c * x - s * y, centre[1] + s * x + c * y, z];
    };
    const z0 = centre[2] - size[2] / 2;
    const z1 = centre[2] + size[2] / 2;
    const pts = [
      [1, -1],
      [1, 1],
      [-1, 1],
      [-1, -1],
    ] as const;
    for (let k = 0; k < 4; k++) {
      const a = pts[k]!;
      const b = pts[(k + 1) % 4]!;
      this.quad(
        corner(a[0], a[1], z0),
        corner(b[0], b[1], z0),
        corner(b[0], b[1], z1),
        corner(a[0], a[1], z1),
        color,
      );
    }
    this.quad(
      corner(-1, -1, z1),
      corner(1, -1, z1),
      corner(1, 1, z1),
      corner(-1, 1, z1),
      color,
    );
    this.quad(
      corner(-1, 1, z0),
      corner(1, 1, z0),
      corner(1, -1, z0),
      corner(-1, -1, z0),
      color,
    );
  }

  /** A UV sphere about `centre`, its colour a function of longitude and latitude (radians). */
  sphere(
    centre: V3,
    radius: number,
    segments: number,
    colorAt: (longitude: number, latitude: number) => Rgba,
  ): void {
    const rings = Math.max(4, Math.floor(segments / 2));
    const first = this.vertexCount;
    for (let r = 0; r <= rings; r++) {
      const lat = Math.PI / 2 - (r * Math.PI) / rings;
      for (let s = 0; s <= segments; s++) {
        const lon = (s * 2 * Math.PI) / segments - Math.PI;
        const n: V3 = [
          Math.cos(lat) * Math.cos(lon),
          Math.cos(lat) * Math.sin(lon),
          Math.sin(lat),
        ];
        this.vertex(
          [
            centre[0] + radius * n[0],
            centre[1] + radius * n[1],
            centre[2] + radius * n[2],
          ],
          n,
          colorAt(lon, lat),
        );
      }
    }
    const stride = segments + 1;
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segments; s++) {
        const a = first + r * stride + s;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        this.triangle(a, c, b);
        this.triangle(b, c, d);
      }
    }
  }

  /** A closed cylinder along z. */
  cylinder(
    centre: V3,
    radius: number,
    height: number,
    sides: number,
    color: Rgba,
  ): void {
    const z0 = centre[2] - height / 2;
    const z1 = centre[2] + height / 2;
    const ring = (z: number, k: number): V3 => [
      centre[0] + radius * Math.cos((k * 2 * Math.PI) / sides),
      centre[1] + radius * Math.sin((k * 2 * Math.PI) / sides),
      z,
    ];
    for (let k = 0; k < sides; k++) {
      const a = k;
      const b = k + 1;
      this.quad(ring(z0, a), ring(z0, b), ring(z1, b), ring(z1, a), color);
      const top = this.vertex([centre[0], centre[1], z1], [0, 0, 1], color);
      const i = this.vertex(ring(z1, a), [0, 0, 1], color);
      const j = this.vertex(ring(z1, b), [0, 0, 1], color);
      this.triangle(top, i, j);
    }
  }

  build(): MeshData {
    return {
      positions: Float32Array.from(this.positions),
      normals: Float32Array.from(this.normals),
      colors: Float32Array.from(this.colors),
      indices: Uint32Array.from(this.indices),
    };
  }
}

function normalOf(a: V3, b: V3, c: V3): V3 {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  const x = uy * vz - uz * vy;
  const y = uz * vx - ux * vz;
  const z = ux * vy - uy * vx;
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/** A polyline as line-list mesh data (drawn unlit), positions relative to `origin`. */
export function polyline(
  points: ReadonlyArray<ArrayLike<number>>,
  color: Rgba,
  origin: ArrayLike<number> = [0, 0, 0],
): MeshData {
  const n = points.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 4);
  const indices = new Uint32Array(Math.max(0, n - 1) * 2);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      positions[i * 3 + k] = points[i]![k]! - origin[k]!;
    }
    colors.set(color, i * 4);
    if (i < n - 1) {
      indices[i * 2] = i;
      indices[i * 2 + 1] = i + 1;
    }
  }
  return { positions, colors, indices, topology: "line-list" };
}

/** Several polylines in one mesh. */
export function polylines(
  lines: ReadonlyArray<{
    points: ReadonlyArray<ArrayLike<number>>;
    color: Rgba;
  }>,
  origin: ArrayLike<number> = [0, 0, 0],
): MeshData {
  const total = lines.reduce((a, l) => a + l.points.length, 0);
  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 4);
  const indices: number[] = [];
  let v = 0;
  for (const line of lines) {
    for (let i = 0; i < line.points.length; i++, v++) {
      for (let k = 0; k < 3; k++) {
        positions[v * 3 + k] = line.points[i]![k]! - origin[k]!;
      }
      colors.set(line.color, v * 4);
      if (i < line.points.length - 1) {
        indices.push(v, v + 1);
      }
    }
  }
  return {
    positions,
    colors,
    indices: Uint32Array.from(indices),
    topology: "line-list",
  };
}
