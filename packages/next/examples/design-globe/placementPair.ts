// A site's two placements on the globe (plan 4b Task 18): the rigid and the
// reprojected tileset, one drawn solid, the other as a ghost, and the morph
// between them, the page's centrepiece.
//
// The engine has no glTF morph targets, so the morph is built here, from the
// two tilesets' retained geometry (`retainGeometry`): the generator writes
// both with identical tile trees and vertex order (the plan's call 15), so a
// tile's partner is the tile at the same place in the other tree, and vertex
// i's partner is its vertex i. For each tile the solid tileset draws, once
// both tiles have loaded, a "pair" holds:
//  - a surface mesh: the rigid tile's positions, in the rigid tile's model
//    space, with the reprojected partner's positions carried into that same
//    space as a vertex attribute; a custom shader's vertex stage blends the
//    two by a uniform `t` (0 rigid, 1 reprojected) and scales each rigid
//    error by `exaggeration`, so a frame of the morph writes four floats,
//    never a vertex buffer. Its fragment stage blends the placements' tints.
//  - a ghost mesh: the tile's creases (edges where its faces fold by more
//    than 30°: the barriers, the buildings' corners) as thin lines with the
//    same two positions, drawn at either end by two more shaders.
//
// The real tilesets do the streaming and the picking: both are always
// selected (so partners load), the ghost's own tiles never show, and the
// solid one's tiles show while the page is settled at true scale, which is
// when a pick on them gives design coordinates. While the geometry is
// between placements, or the rigid one is exaggerated, the pair's surface
// shows instead; picks then hit no tileset, so they give none.
//
// Visibility is set from each tileset's `debugTileColor` callback, which the
// tileset calls in its update, for every drawn tile, before the frame draws:
// a tile that loads or refines is shown or hidden in the frame it first
// draws, never a frame late. (Its return value is the solid placement's
// tint.)
import { CustomShader } from "../../src/scene/CustomShader.ts";
import { MaterialFlags } from "../../src/render/layout.ts";
import type {
  DrawHandle,
  DrawOptions,
  MeshHandle,
  World,
} from "../../src/scene/World.ts";
import type { ModelPlacement } from "../../src/scene/gltfModel.ts";
import type { Tile, TileGeometry } from "../../src/streaming/Tile.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import { rampAt, type Rgba } from "./colors.ts";
import type { Placement } from "./page.ts";

export type { Rgba } from "./colors.ts";

/** How the two placements look. */
export interface PairLook {
  /** Tints of the solid surface (multiplied with the content's material). */
  readonly rigidTint: Rgba;
  readonly reprojectedTint: Rgba;
  /** The ghosts' line colors (unlit). */
  readonly rigidLine: Rgba;
  readonly reprojectedLine: Rgba;
  /** The content's own material, for the pair's surfaces. */
  readonly baseColor: Rgba;
}

export interface PairOptions {
  /**
   * The farthest a vertex moves, in the rigid tiles' model units, at the
   * largest exaggeration (it pads culling bounds).
   */
  readonly maxDisplacement: number;
  /**
   * Whiskers from the pairs' own vertices: one at least every `spacing`
   * metres, coloured by length over `scale` metres (the site's largest
   * rigid error). None for a site whose whiskers are drawn otherwise (the
   * corridor's, along its alignment).
   */
  readonly whiskers?: { readonly spacing: number; readonly scale: number };
  /** Called when something on the globe changed (the page's frame driver wakes). */
  readonly wake?: () => void;
}

/** What the pair draws. */
export interface PairState {
  /** The morph: 0 rigid, 1 reprojected. */
  readonly t: number;
  /** Between placements (a morph under way). */
  readonly morphing: boolean;
  /** Each rigid error drawn this many times its size (1: true scale). */
  readonly exaggeration: number;
  /** Draw the other placement's ghost. */
  readonly ghost: boolean;
}

/** Faces folding by more than this make a crease (a ghost line). */
const CREASE_COS = Math.cos((30 * Math.PI) / 180);

const SURFACE_WGSL = /* wgsl */ `
fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  let reprojected = vsInput.attributes.reprojected;
  let rigid = reprojected + (vsInput.positionMC - reprojected) * uniforms.exaggeration;
  (*vsOutput).positionMC = mix(rigid, reprojected, uniforms.t);
}
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).baseColor *= mix(uniforms.rigidTint.rgb, uniforms.reprojectedTint.rgb, uniforms.t);
}
`;

const LINE_WGSL = /* wgsl */ `
fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  let reprojected = vsInput.attributes.reprojected;
  let rigid = reprojected + (vsInput.positionMC - reprojected) * uniforms.exaggeration;
  (*vsOutput).positionMC = mix(rigid, reprojected, uniforms.t);
}
`;

/** The ghost deck's hatch: its period in framebuffer pixels, and the share of it drawn. */
const GHOST_PERIOD = 6;
const GHOST_COVER = 0.34;

/**
 * The ghost deck: the other placement's surface, hatched (screen-door
 * transparency: diagonal stripes cut out of an opaque surface, so it draws
 * in the opaque pass; a blended surface makes the engine run its whole
 * translucency pipeline, about 50 ms a frame on a MacBook Air). The hatch
 * thins out where the two placements are within a couple of metres of each
 * other (near the anchor, where they coincide and a second surface would
 * only fight the first for depth).
 */
const GHOST_WGSL = /* wgsl */ `
fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  let reprojected = vsInput.attributes.reprojected;
  let rigid = reprojected + (vsInput.positionMC - reprojected) * uniforms.exaggeration;
  (*vsOutput).positionMC = mix(rigid, reprojected, uniforms.t);
}
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  let apart = smoothstep(0.25, 2.5, fsInput.attributes.error * uniforms.exaggeration);
  let stripe = fract((fsInput.screen.x + fsInput.screen.y) / ${GHOST_PERIOD.toFixed(1)});
  (*material).alpha = select(0.0, 1.0, stripe < ${GHOST_COVER} * apart);
}
`;

/** The attribute carrying each vertex's reprojected partner. */
export const PARTNER_SEMANTIC = "_DG_REPROJECTED";
/** The attribute carrying each vertex's rigid error, metres. */
export const ERROR_SEMANTIC = "_DG_ERROR";

/** What a morph shader draws: the solid surface, a ghost deck, or lines. */
export type MorphShaderKind = "surface" | "ghost" | "line";

/** A shader that blends a mesh's rigid positions toward their partners. */
export function morphShader(
  label: string,
  displacement: number,
  kind: MorphShaderKind,
): CustomShader {
  return new CustomShader({
    label,
    wgsl:
      kind === "surface"
        ? SURFACE_WGSL
        : kind === "ghost"
          ? GHOST_WGSL
          : LINE_WGSL,
    attributes: {
      reprojected: { semantic: PARTNER_SEMANTIC, type: "vec3f" },
      ...(kind === "ghost" && {
        error: { semantic: ERROR_SEMANTIC, type: "f32" as const },
      }),
    },
    uniforms: {
      t: { type: "f32", value: 0 },
      exaggeration: { type: "f32", value: 1 },
      ...(kind === "surface" && {
        rigidTint: { type: "vec4f", value: [1, 1, 1, 1] },
        reprojectedTint: { type: "vec4f", value: [1, 1, 1, 1] },
      }),
    },
    displacement,
  });
}

/** One draw's pair: its meshes and draws. */
interface Part {
  readonly surfaceMesh: MeshHandle;
  readonly surface: DrawHandle;
  /** The other placement's deck, translucent, at either end. */
  readonly rigidDeck: DrawHandle;
  readonly reprojectedDeck: DrawHandle;
  readonly lineMesh?: MeshHandle;
  readonly rigidGhost?: DrawHandle;
  readonly reprojectedGhost?: DrawHandle;
  readonly whiskerMesh?: MeshHandle;
  readonly whiskers?: DrawHandle;
}

/** The view masks a pair's draws were last given, per kind. */
interface Masks {
  readonly surface: number;
  /** The rigid ghost: its deck and its lines. */
  readonly rigid: number;
  readonly reprojected: number;
  readonly whiskers: number;
}

const NO_MASKS: Masks = { surface: 0, rigid: 0, reprojected: 0, whiskers: 0 };

interface Pair {
  readonly rigidTile: Tile;
  readonly reprojectedTile: Tile;
  readonly rigidGeometry: readonly TileGeometry[];
  readonly reprojectedGeometry: readonly TileGeometry[];
  readonly parts: readonly Part[];
  /** The view mask the pair's draws were last given, per kind. */
  masks: Masks;
}

/** `m⁻¹` of a column-major affine matrix (float64). */
function invertAffine(m: ArrayLike<number>): Float64Array {
  const [a, b, c, , d, e, f, , g, h, i] = [
    m[0]!,
    m[1]!,
    m[2]!,
    m[3]!,
    m[4]!,
    m[5]!,
    m[6]!,
    m[7]!,
    m[8]!,
    m[9]!,
    m[10]!,
  ];
  const det = a * (e * i - f * h) - d * (b * i - c * h) + g * (b * f - c * e);
  const r = new Float64Array(16);
  r[0] = (e * i - f * h) / det;
  r[1] = (c * h - b * i) / det;
  r[2] = (b * f - c * e) / det;
  r[4] = (f * g - d * i) / det;
  r[5] = (a * i - c * g) / det;
  r[6] = (c * d - a * f) / det;
  r[8] = (d * h - e * g) / det;
  r[9] = (b * g - a * h) / det;
  r[10] = (a * e - b * d) / det;
  const [tx, ty, tz] = [m[12]!, m[13]!, m[14]!];
  r[12] = -(r[0] * tx + r[4] * ty + r[8] * tz);
  r[13] = -(r[1] * tx + r[5] * ty + r[9] * tz);
  r[14] = -(r[2] * tx + r[6] * ty + r[10] * tz);
  r[15] = 1;
  return r;
}

/** `b⁻¹·a`, both affine: from a's model space to b's. */
function between(a: ArrayLike<number>, b: ArrayLike<number>): Float64Array {
  const inv = invertAffine(b);
  const out = new Float64Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let s = 0;
      for (let k = 0; k < 4; k++) {
        s += inv[k * 4 + row]! * a[col * 4 + k]!;
      }
      out[col * 4 + row] = s;
    }
  }
  return out;
}

/**
 * The reprojected tile's positions in the rigid tile's model space, each
 * vertex's rigid error (metres, the distance between the two placements'
 * Earth-fixed positions), and the rigid positions Earth-fixed.
 */
function partnerPositions(
  rigid: TileGeometry,
  reprojected: TileGeometry,
): { partner: Float32Array; error: Float32Array; world: Float64Array } {
  const m = between(reprojected.matrix, rigid.matrix);
  const q = reprojected.positions;
  const p = rigid.positions;
  const r = rigid.matrix;
  const s = reprojected.matrix;
  const partner = new Float32Array(q.length);
  const error = new Float32Array(q.length / 3);
  const world = new Float64Array(q.length);
  for (let v = 0; v < q.length; v += 3) {
    const x = q[v]!;
    const y = q[v + 1]!;
    const z = q[v + 2]!;
    partner[v] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
    partner[v + 1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    partner[v + 2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
    const a = p[v]!;
    const b = p[v + 1]!;
    const c = p[v + 2]!;
    let d2 = 0;
    for (let k = 0; k < 3; k++) {
      const w = r[k]! * a + r[4 + k]! * b + r[8 + k]! * c + r[12 + k]!;
      world[v + k] = w;
      const t = s[k]! * x + s[4 + k]! * y + s[8 + k]! * z + s[12 + k]!;
      d2 += (w - t) ** 2;
    }
    error[v / 3] = Math.sqrt(d2);
  }
  return { partner, error, world };
}

/**
 * Vertices at least `spacing` metres apart (greedy, on a grid of that
 * size): where a model's whiskers stand.
 */
export function spacedVertices(world: Float64Array, spacing: number): number[] {
  const taken = new Map<string, number[]>();
  const out: number[] = [];
  const cell = (x: number) => Math.floor(x / spacing);
  for (let v = 0; v < world.length / 3; v++) {
    const x = world[3 * v]!;
    const y = world[3 * v + 1]!;
    const z = world[3 * v + 2]!;
    const [cx, cy, cz] = [cell(x), cell(y), cell(z)];
    let near = false;
    for (let dx = -1; dx <= 1 && !near; dx++) {
      for (let dy = -1; dy <= 1 && !near; dy++) {
        for (let dz = -1; dz <= 1 && !near; dz++) {
          for (const u of taken.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
            if (
              Math.hypot(
                world[3 * u]! - x,
                world[3 * u + 1]! - y,
                world[3 * u + 2]! - z,
              ) < spacing
            ) {
              near = true;
              break;
            }
          }
        }
      }
    }
    if (!near) {
      out.push(v);
      const key = `${cx},${cy},${cz}`;
      taken.set(key, [...(taken.get(key) ?? []), v]);
    }
  }
  return out;
}

/** Area-weighted vertex normals (the retained geometry keeps none). */
function vertexNormals(
  positions: Float32Array,
  indices: Uint32Array,
): Float32Array {
  const n = new Float32Array(positions.length);
  for (let t = 0; t < indices.length; t += 3) {
    const ia = indices[t]! * 3;
    const ib = indices[t + 1]! * 3;
    const ic = indices[t + 2]! * 3;
    const ux = positions[ib]! - positions[ia]!;
    const uy = positions[ib + 1]! - positions[ia + 1]!;
    const uz = positions[ib + 2]! - positions[ia + 2]!;
    const vx = positions[ic]! - positions[ia]!;
    const vy = positions[ic + 1]! - positions[ia + 1]!;
    const vz = positions[ic + 2]! - positions[ia + 2]!;
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    for (const i of [ia, ib, ic]) {
      n[i] = n[i]! + cx;
      n[i + 1] = n[i + 1]! + cy;
      n[i + 2] = n[i + 2]! + cz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i]!, n[i + 1]!, n[i + 2]!) || 1;
    n[i] = n[i]! / l;
    n[i + 1] = n[i + 1]! / l;
    n[i + 2] = n[i + 2]! / l;
  }
  return n;
}

/**
 * The creases of a triangle mesh, as vertex index pairs: edges shared by two
 * faces that fold by more than 30°. Vertices are welded by position first
 * (flat-shaded content repeats them per face).
 */
export function creaseEdges(
  positions: Float32Array,
  indices: Uint32Array,
): Uint32Array {
  // Weld: the first vertex at each position (to 1e-4 model units), by a
  // numeric hash of the quantized position (no per-vertex string), each
  // bucket checked exactly.
  const weld = new Uint32Array(positions.length / 3);
  const buckets = new Map<number, number[]>();
  const q = (x: number) => Math.round(x * 1e4);
  for (let v = 0; v < weld.length; v++) {
    const x = q(positions[3 * v]!);
    const y = q(positions[3 * v + 1]!);
    const z = q(positions[3 * v + 2]!);
    const key =
      (Math.imul(x, 73_856_093) ^
        Math.imul(y, 19_349_663) ^
        Math.imul(z, 83_492_791)) >>>
      0;
    const bucket = buckets.get(key);
    const first = bucket?.find(
      (u) =>
        q(positions[3 * u]!) === x &&
        q(positions[3 * u + 1]!) === y &&
        q(positions[3 * u + 2]!) === z,
    );
    weld[v] = first ?? v;
    if (first === undefined) {
      if (bucket === undefined) {
        buckets.set(key, [v]);
      } else {
        bucket.push(v);
      }
    }
  }
  const normal = (t: number): [number, number, number] => {
    const a = indices[t]! * 3;
    const b = indices[t + 1]! * 3;
    const c = indices[t + 2]! * 3;
    const ux = positions[b]! - positions[a]!;
    const uy = positions[b + 1]! - positions[a + 1]!;
    const uz = positions[b + 2]! - positions[a + 2]!;
    const vx = positions[c]! - positions[a]!;
    const vy = positions[c + 1]! - positions[a + 1]!;
    const vz = positions[c + 2]! - positions[a + 2]!;
    const x = uy * vz - uz * vy;
    const y = uz * vx - ux * vz;
    const z = ux * vy - uy * vx;
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  };
  /** Edge (welded, low-high) → its first face's normal and its own vertices, or done. */
  const edges = new Map<
    number,
    { n: [number, number, number]; a: number; b: number } | null
  >();
  const out: number[] = [];
  const count = weld.length;
  for (let t = 0; t < indices.length; t += 3) {
    const n = normal(t);
    for (let k = 0; k < 3; k++) {
      const a = indices[t + k]!;
      const b = indices[t + ((k + 1) % 3)]!;
      const wa = weld[a]!;
      const wb = weld[b]!;
      if (wa === wb) {
        continue;
      }
      const key = wa < wb ? wa * count + wb : wb * count + wa;
      const other = edges.get(key);
      if (other === undefined) {
        edges.set(key, { n, a, b });
      } else if (other !== null) {
        const dot = n[0] * other.n[0] + n[1] * other.n[1] + n[2] * other.n[2];
        // Opposite windings of one surface (dot ≈ −1) aren't a fold.
        if (Math.abs(dot) < CREASE_COS) {
          out.push(other.a, other.b);
        }
        edges.set(key, null);
      }
    }
  }
  return Uint32Array.from(out);
}

/** The path from the root to `tile`, as child indices: "0/3/1". */
function pathOf(tile: Tile): string {
  const parts: number[] = [];
  for (let t: Tile | undefined = tile; t?.parent; t = t.parent) {
    parts.push(t.parent.children.indexOf(t));
  }
  return parts.reverse().join("/");
}

/** The tile at `path` under `root`, if the tree has it. */
function tileAt(root: Tile, path: string): Tile | undefined {
  let t: Tile | undefined = root;
  for (const p of path === "" ? [] : path.split("/")) {
    t = t?.children[Number(p)];
  }
  return t;
}

const hidden = new WeakMap<ModelPlacement, boolean>();

/** Shows or hides a tile's own draws, touching them only on a change. */
function showTile(world: World, tile: Tile, show: boolean): boolean {
  const placement = tile.placement;
  if (placement === undefined || (hidden.get(placement) ?? false) === !show) {
    return false;
  }
  hidden.set(placement, !show);
  for (const draw of placement.draws) {
    world.setVisible(draw, show);
  }
  return true;
}

export class PlacementPair {
  private readonly pairs = new Map<string, Pair>();
  private readonly surfaceShader: CustomShader;
  private readonly rigidLineShader: CustomShader;
  private readonly reprojectedLineShader: CustomShader;
  private readonly material: number;
  private readonly deckMaterial: number;
  private readonly rigidDeckShader: CustomShader;
  private readonly reprojectedDeckShader: CustomShader;
  private readonly whiskerShader: CustomShader;
  private state: PairState = {
    t: 0,
    morphing: false,
    exaggeration: 1,
    ghost: true,
  };
  private readonly paths = new WeakMap<Tile, string>();
  private disposed = false;
  /** Something on the globe changed since the last `takeChanged`. */
  private changed = false;

  /**
   * `maxDisplacement`: the farthest a vertex moves, in the rigid tiles'
   * model units, at the largest exaggeration (it pads culling bounds).
   */
  constructor(
    private readonly world: World,
    readonly rigid: Tileset3D,
    readonly reprojected: Tileset3D,
    private readonly look: PairLook,
    private readonly options: PairOptions,
  ) {
    const pad = options.maxDisplacement;
    this.surfaceShader = morphShader("design globe morph", pad, "surface");
    this.rigidLineShader = morphShader("design globe rigid ghost", pad, "line");
    this.reprojectedLineShader = morphShader(
      "design globe reprojected ghost",
      pad,
      "line",
    );
    this.rigidDeckShader = morphShader("design globe rigid deck", pad, "ghost");
    this.reprojectedDeckShader = morphShader(
      "design globe reprojected deck",
      pad,
      "ghost",
    );
    this.whiskerShader = morphShader("design globe whiskers", pad, "line");
    this.reprojectedLineShader.setUniform("t", 1);
    this.reprojectedDeckShader.setUniform("t", 1);
    this.surfaceShader.setUniform("rigidTint", look.rigidTint);
    this.surfaceShader.setUniform("reprojectedTint", look.reprojectedTint);
    this.material = world.addMaterial({
      baseColor: look.baseColor,
      metallic: 0,
      roughness: 1,
    });
    // The ghost deck: white, cut out (the hatch), tinted per draw by its
    // placement.
    this.deckMaterial = world.addMaterial({
      baseColor: [1, 1, 1, 1],
      metallic: 0,
      roughness: 1,
      alphaCutoff: 0.5,
      flags: MaterialFlags.alphaMask,
    });
    rigid.debugTileColor = (tile) => this.onTile("rigid", tile);
    reprojected.debugTileColor = (tile) => this.onTile("reprojected", tile);
  }

  /** The placement whose own tiles draw: the one the page is at, settled. */
  private get solid(): Placement {
    return this.state.t >= 0.5 ? "reprojected" : "rigid";
  }

  /** Whether the pair's surfaces stand in for the solid tileset's tiles. */
  private get standIn(): boolean {
    return (
      this.state.morphing || (this.state.exaggeration !== 1 && this.state.t < 1)
    );
  }

  setState(next: PairState): void {
    const before = this.state;
    this.state = next;
    if (before.t !== next.t) {
      this.surfaceShader.setUniform("t", next.t);
      this.whiskerShader.setUniform("t", next.t);
    }
    if (before.exaggeration !== next.exaggeration) {
      for (const shader of [
        this.surfaceShader,
        this.rigidLineShader,
        this.rigidDeckShader,
        this.whiskerShader,
      ]) {
        shader.setUniform("exaggeration", next.exaggeration);
      }
    }
    const structural =
      before.morphing !== next.morphing ||
      before.ghost !== next.ghost ||
      (before.exaggeration === 1) !== (next.exaggeration === 1) ||
      before.t >= 0.5 !== next.t >= 0.5 ||
      (before.t === 1) !== (next.t === 1);
    if (structural) {
      this.reapply();
    }
    this.markChanged();
  }

  /** Re-runs every drawn tile's visibility (both tilesets' callbacks). */
  private reapply(): void {
    for (const pair of this.pairs.values()) {
      this.setMasks(pair, NO_MASKS);
    }
    const rigid = this.rigid.debugTileColor;
    const reprojected = this.reprojected.debugTileColor;
    this.rigid.debugTileColor = rigid;
    this.reprojected.debugTileColor = reprojected;
  }

  private markChanged(): void {
    this.changed = true;
    this.options.wake?.();
  }

  /** True once after anything on the globe changed (for on-demand rendering). */
  takeChanged(): boolean {
    const c = this.changed;
    this.changed = false;
    return c;
  }

  private pathOf(tile: Tile): string {
    let p = this.paths.get(tile);
    if (p === undefined) {
      p = pathOf(tile);
      this.paths.set(tile, p);
    }
    return p;
  }

  /** A drawn tile of `role`'s tileset: its visibility, and the solid tint. */
  private onTile(
    role: Placement,
    tile: Tile,
  ): readonly [number, number, number, number] | undefined {
    if (this.disposed) {
      return undefined;
    }
    const solid = this.solid;
    if (role !== solid) {
      // The ghost's own tiles never show; its pair draws for it.
      if (showTile(this.world, tile, false)) {
        this.markChanged();
      }
      return undefined;
    }
    const pair = this.pairFor(role, tile);
    const drawn = tile.viewMask;
    const { ghost, morphing, t } = this.state;
    const standIn = pair !== undefined && this.standIn;
    // Mid-morph, a tile whose partner hasn't loaded would draw at its end,
    // not between: a brief hole is more honest than a wrong position.
    const show = !standIn && !(morphing && pair === undefined);
    if (showTile(this.world, tile, show)) {
      this.markChanged();
    }
    if (pair !== undefined) {
      this.setMasks(pair, {
        surface: standIn ? drawn : 0,
        rigid: ghost && (morphing || solid === "reprojected") ? drawn : 0,
        reprojected: ghost && (morphing || solid === "rigid") ? drawn : 0,
        // Whiskers shrink to nothing at t = 1: drawn until then.
        whiskers: t < 1 ? drawn : 0,
      });
    }
    return solid === "rigid" ? this.look.rigidTint : this.look.reprojectedTint;
  }

  private setMasks(pair: Pair, next: Masks): void {
    const m = pair.masks;
    if (
      m.surface === next.surface &&
      m.rigid === next.rigid &&
      m.reprojected === next.reprojected &&
      m.whiskers === next.whiskers
    ) {
      return;
    }
    const set = (draw: DrawHandle | undefined, was: number, now: number) => {
      if (draw !== undefined && was !== now) {
        this.world.setViewMask(draw, now);
      }
    };
    for (const part of pair.parts) {
      set(part.surface, m.surface, next.surface);
      set(part.rigidDeck, m.rigid, next.rigid);
      set(part.rigidGhost, m.rigid, next.rigid);
      set(part.reprojectedDeck, m.reprojected, next.reprojected);
      set(part.reprojectedGhost, m.reprojected, next.reprojected);
      set(part.whiskers, m.whiskers, next.whiskers);
    }
    pair.masks = next;
    this.markChanged();
  }

  /** The pair for a tile of `role`'s tileset, built once both tiles have loaded. */
  private pairFor(role: Placement, tile: Tile): Pair | undefined {
    const path = this.pathOf(tile);
    const other = tileAt(
      (role === "rigid" ? this.reprojected : this.rigid).root,
      path,
    );
    const rigidTile = role === "rigid" ? tile : other;
    const reprojectedTile = role === "rigid" ? other : tile;
    const existing = this.pairs.get(path);
    if (existing !== undefined) {
      if (
        existing.rigidTile === rigidTile &&
        existing.reprojectedTile === reprojectedTile &&
        existing.rigidGeometry === rigidTile.geometry &&
        existing.reprojectedGeometry === reprojectedTile?.geometry
      ) {
        return existing;
      }
      this.release(path, existing);
    }
    const rg = rigidTile?.geometry;
    const pg = reprojectedTile?.geometry;
    if (
      rigidTile === undefined ||
      reprojectedTile === undefined ||
      rg === undefined ||
      pg === undefined ||
      rg.length !== pg.length ||
      rg.some((g, i) => g.positions.length !== pg[i]!.positions.length)
    ) {
      return undefined;
    }
    const parts = rg.map((g, i) => this.buildPart(g, pg[i]!));
    const pair: Pair = {
      rigidTile,
      reprojectedTile,
      rigidGeometry: rg,
      reprojectedGeometry: pg,
      parts,
      masks: NO_MASKS,
    };
    this.pairs.set(path, pair);
    return pair;
  }

  private buildPart(rigid: TileGeometry, reprojected: TileGeometry): Part {
    const { world } = this;
    const {
      partner,
      error,
      world: rigidWorld,
    } = partnerPositions(rigid, reprojected);
    const m = rigid.matrix;
    const origin = Float64Array.from([m[12]!, m[13]!, m[14]!]);
    const model = Float64Array.from(m);
    model[12] = model[13] = model[14] = 0;
    const surfaceMesh = world.addMesh({
      positions: rigid.positions,
      normals: vertexNormals(rigid.positions, rigid.indices),
      indices: rigid.indices,
      attributes: {
        [PARTNER_SEMANTIC]: { data: partner, components: 3 },
        [ERROR_SEMANTIC]: { data: error, components: 1 },
      },
    });
    const draw = (
      mesh: MeshHandle,
      shader: CustomShader,
      name: string,
      extra: Partial<DrawOptions>,
    ) =>
      world.addDraw({
        mesh,
        origin,
        model,
        shader,
        viewMask: 0,
        name,
        ...extra,
      });
    const surface = draw(
      surfaceMesh,
      this.surfaceShader,
      "design globe morph",
      {
        material: this.material,
        doubleSided: true,
      },
    );
    // The other placement's deck: the same mesh, hatched, unlit, in its
    // placement's colour (the "before" beside the solid "after").
    const deck = (shader: CustomShader, color: Rgba, name: string) =>
      draw(surfaceMesh, shader, name, {
        material: this.deckMaterial,
        doubleSided: true,
        unlit: true,
        color,
      });
    const rigidDeck = deck(
      this.rigidDeckShader,
      this.look.rigidLine,
      "design globe rigid deck",
    );
    const reprojectedDeck = deck(
      this.reprojectedDeckShader,
      this.look.reprojectedLine,
      "design globe reprojected deck",
    );
    const part: {
      -readonly [K in keyof Part]: Part[K];
    } = { surfaceMesh, surface, rigidDeck, reprojectedDeck };
    const lines = (positions: Float32Array, partners: Float32Array) =>
      world.addMesh({
        positions,
        indices: Uint32Array.from(
          { length: positions.length / 3 },
          (_, i) => i,
        ),
        topology: "line-list",
        attributes: { [PARTNER_SEMANTIC]: { data: partners, components: 3 } },
      });
    const creases = creaseEdges(rigid.positions, rigid.indices);
    if (creases.length > 0) {
      // The creases' own vertices, in order, so the mesh is just its lines.
      const positions = new Float32Array(creases.length * 3);
      const partners = new Float32Array(creases.length * 3);
      for (let k = 0; k < creases.length; k++) {
        const v = creases[k]! * 3;
        positions.set(rigid.positions.subarray(v, v + 3), k * 3);
        partners.set(partner.subarray(v, v + 3), k * 3);
      }
      part.lineMesh = lines(positions, partners);
      part.rigidGhost = draw(
        part.lineMesh,
        this.rigidLineShader,
        "design globe rigid ghost",
        { unlit: true, color: this.look.rigidLine },
      );
      part.reprojectedGhost = draw(
        part.lineMesh,
        this.reprojectedLineShader,
        "design globe reprojected ghost",
        { unlit: true, color: this.look.reprojectedLine },
      );
    }
    const spec = this.options.whiskers;
    if (spec !== undefined) {
      const chosen = spacedVertices(rigidWorld, spec.spacing);
      if (chosen.length > 0) {
        // Each whisker: from the vertex's rigid position (blended by the
        // morph) to its true one, which both ends carry as their partner.
        const positions = new Float32Array(chosen.length * 6);
        const partners = new Float32Array(chosen.length * 6);
        const colors = new Float32Array(chosen.length * 8);
        chosen.forEach((v, i) => {
          positions.set(rigid.positions.subarray(3 * v, 3 * v + 3), i * 6);
          positions.set(partner.subarray(3 * v, 3 * v + 3), i * 6 + 3);
          partners.set(partner.subarray(3 * v, 3 * v + 3), i * 6);
          partners.set(partner.subarray(3 * v, 3 * v + 3), i * 6 + 3);
          const c = rampAt(error[v]! / spec.scale);
          colors.set(c, i * 8);
          colors.set(c, i * 8 + 4);
        });
        part.whiskerMesh = world.addMesh({
          positions,
          colors,
          indices: Uint32Array.from({ length: chosen.length * 2 }, (_, i) => i),
          topology: "line-list",
          attributes: {
            [PARTNER_SEMANTIC]: { data: partners, components: 3 },
          },
        });
        part.whiskers = draw(
          part.whiskerMesh,
          this.whiskerShader,
          "design globe whiskers",
          { unlit: true },
        );
      }
    }
    return part;
  }

  private release(path: string, pair: Pair): void {
    const { world } = this;
    for (const part of pair.parts) {
      for (const d of [
        part.surface,
        part.rigidDeck,
        part.reprojectedDeck,
        part.rigidGhost,
        part.reprojectedGhost,
        part.whiskers,
      ]) {
        if (d !== undefined) {
          world.removeDraw(d);
        }
      }
      for (const mesh of [part.surfaceMesh, part.lineMesh, part.whiskerMesh]) {
        if (mesh !== undefined) {
          world.removeMesh(mesh);
        }
      }
    }
    this.pairs.delete(path);
    this.markChanged();
  }

  /** Releases pairs whose tiles unloaded (call once a frame). */
  sweep(): void {
    for (const [path, pair] of this.pairs) {
      if (
        pair.rigidTile.geometry !== pair.rigidGeometry ||
        pair.reprojectedTile.geometry !== pair.reprojectedGeometry
      ) {
        this.release(path, pair);
      }
    }
  }

  /** The pairs built now (for the browser check). */
  get size(): number {
    return this.pairs.size;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.rigid.debugTileColor = undefined;
    this.reprojected.debugTileColor = undefined;
    for (const [path, pair] of [...this.pairs]) {
      this.release(path, pair);
    }
    if (!this.world.destroyed) {
      this.world.removeMaterial(this.material);
      this.world.removeMaterial(this.deckMaterial);
    }
  }
}
