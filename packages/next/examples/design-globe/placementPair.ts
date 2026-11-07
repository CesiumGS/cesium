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
import type { MeshHandle, World, DrawHandle } from "../../src/scene/World.ts";
import type { ModelPlacement } from "../../src/scene/gltfModel.ts";
import type { Tile, TileGeometry } from "../../src/streaming/Tile.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import type { Placement } from "./page.ts";

/** Linear RGBA. */
export type Rgba = readonly [number, number, number, number];

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

/** The attribute carrying each vertex's reprojected partner. */
export const PARTNER_SEMANTIC = "_DG_REPROJECTED";

/** A shader that blends a mesh's rigid positions toward their partners. */
export function morphShader(
  label: string,
  displacement: number,
  surface: boolean,
): CustomShader {
  return new CustomShader({
    label,
    wgsl: surface ? SURFACE_WGSL : LINE_WGSL,
    attributes: {
      reprojected: { semantic: PARTNER_SEMANTIC, type: "vec3f" },
    },
    uniforms: {
      t: { type: "f32", value: 0 },
      exaggeration: { type: "f32", value: 1 },
      ...(surface && {
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
  readonly lineMesh?: MeshHandle;
  readonly rigidGhost?: DrawHandle;
  readonly reprojectedGhost?: DrawHandle;
}

interface Pair {
  readonly rigidTile: Tile;
  readonly reprojectedTile: Tile;
  readonly rigidGeometry: readonly TileGeometry[];
  readonly reprojectedGeometry: readonly TileGeometry[];
  readonly parts: readonly Part[];
  /** The view mask the pair's draws were last given, per kind. */
  masks: { surface: number; rigid: number; reprojected: number };
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

/** The reprojected tile's positions in the rigid tile's model space. */
function partnerPositions(
  rigid: TileGeometry,
  reprojected: TileGeometry,
): Float32Array {
  const m = between(reprojected.matrix, rigid.matrix);
  const q = reprojected.positions;
  const out = new Float32Array(q.length);
  for (let v = 0; v < q.length; v += 3) {
    const x = q[v]!;
    const y = q[v + 1]!;
    const z = q[v + 2]!;
    out[v] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
    out[v + 1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    out[v + 2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
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
  // Weld: the first vertex at each position (to 1e-4 model units).
  const weld = new Uint32Array(positions.length / 3);
  const seen = new Map<string, number>();
  for (let v = 0; v < weld.length; v++) {
    const key = `${Math.round(positions[3 * v]! * 1e4)},${Math.round(positions[3 * v + 1]! * 1e4)},${Math.round(positions[3 * v + 2]! * 1e4)}`;
    const first = seen.get(key);
    weld[v] = first ?? v;
    if (first === undefined) {
      seen.set(key, v);
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
    maxDisplacement: number,
  ) {
    this.surfaceShader = morphShader(
      "design globe morph",
      maxDisplacement,
      true,
    );
    this.rigidLineShader = morphShader(
      "design globe rigid ghost",
      maxDisplacement,
      false,
    );
    this.reprojectedLineShader = morphShader(
      "design globe reprojected ghost",
      maxDisplacement,
      false,
    );
    this.reprojectedLineShader.setUniform("t", 1);
    this.surfaceShader.setUniform("rigidTint", look.rigidTint);
    this.surfaceShader.setUniform("reprojectedTint", look.reprojectedTint);
    this.material = world.addMaterial({
      baseColor: look.baseColor,
      metallic: 0,
      roughness: 1,
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
    }
    if (before.exaggeration !== next.exaggeration) {
      this.surfaceShader.setUniform("exaggeration", next.exaggeration);
      this.rigidLineShader.setUniform("exaggeration", next.exaggeration);
    }
    const structural =
      before.morphing !== next.morphing ||
      before.ghost !== next.ghost ||
      (before.exaggeration === 1) !== (next.exaggeration === 1) ||
      before.t >= 0.5 !== next.t >= 0.5;
    if (structural) {
      this.reapply();
    }
    this.changed = true;
  }

  /** Re-runs every drawn tile's visibility (both tilesets' callbacks). */
  private reapply(): void {
    for (const pair of this.pairs.values()) {
      this.setMasks(pair, 0, 0, 0);
    }
    const rigid = this.rigid.debugTileColor;
    const reprojected = this.reprojected.debugTileColor;
    this.rigid.debugTileColor = rigid;
    this.reprojected.debugTileColor = reprojected;
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
        this.changed = true;
      }
      return undefined;
    }
    const pair = this.pairFor(role, tile);
    const drawn = tile.viewMask;
    const { ghost, morphing } = this.state;
    const standIn = pair !== undefined && this.standIn;
    if (showTile(this.world, tile, !standIn)) {
      this.changed = true;
    }
    if (pair !== undefined) {
      this.setMasks(
        pair,
        standIn ? drawn : 0,
        ghost && (morphing || solid === "reprojected") ? drawn : 0,
        ghost && (morphing || solid === "rigid") ? drawn : 0,
      );
    }
    return solid === "rigid" ? this.look.rigidTint : this.look.reprojectedTint;
  }

  private setMasks(
    pair: Pair,
    surface: number,
    rigid: number,
    reprojected: number,
  ): void {
    const m = pair.masks;
    if (
      m.surface === surface &&
      m.rigid === rigid &&
      m.reprojected === reprojected
    ) {
      return;
    }
    for (const part of pair.parts) {
      if (m.surface !== surface) {
        this.world.setViewMask(part.surface, surface);
      }
      if (part.rigidGhost && m.rigid !== rigid) {
        this.world.setViewMask(part.rigidGhost, rigid);
      }
      if (part.reprojectedGhost && m.reprojected !== reprojected) {
        this.world.setViewMask(part.reprojectedGhost, reprojected);
      }
    }
    pair.masks = { surface, rigid, reprojected };
    this.changed = true;
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
      masks: { surface: 0, rigid: 0, reprojected: 0 },
    };
    this.pairs.set(path, pair);
    return pair;
  }

  private buildPart(rigid: TileGeometry, reprojected: TileGeometry): Part {
    const { world } = this;
    const partner = partnerPositions(rigid, reprojected);
    const m = rigid.matrix;
    const origin = Float64Array.from([m[12]!, m[13]!, m[14]!]);
    const model = Float64Array.from(m);
    model[12] = model[13] = model[14] = 0;
    const surfaceMesh = world.addMesh({
      positions: rigid.positions,
      normals: vertexNormals(rigid.positions, rigid.indices),
      indices: rigid.indices,
      attributes: { [PARTNER_SEMANTIC]: { data: partner, components: 3 } },
    });
    const surface = world.addDraw({
      mesh: surfaceMesh,
      origin,
      model,
      material: this.material,
      doubleSided: true,
      shader: this.surfaceShader,
      viewMask: 0,
      name: "design globe morph",
    });
    const creases = creaseEdges(rigid.positions, rigid.indices);
    if (creases.length === 0) {
      return { surfaceMesh, surface };
    }
    // The creases' own vertices, in order, so the mesh is just its lines.
    const positions = new Float32Array(creases.length * 3);
    const partners = new Float32Array(creases.length * 3);
    for (let k = 0; k < creases.length; k++) {
      const v = creases[k]! * 3;
      positions.set(rigid.positions.subarray(v, v + 3), k * 3);
      partners.set(partner.subarray(v, v + 3), k * 3);
    }
    const lineMesh = world.addMesh({
      positions,
      indices: Uint32Array.from({ length: creases.length }, (_, i) => i),
      topology: "line-list",
      attributes: { [PARTNER_SEMANTIC]: { data: partners, components: 3 } },
    });
    const ghost = (shader: CustomShader, color: Rgba, name: string) =>
      world.addDraw({
        mesh: lineMesh,
        origin,
        model,
        unlit: true,
        color,
        shader,
        viewMask: 0,
        name,
      });
    return {
      surfaceMesh,
      surface,
      lineMesh,
      rigidGhost: ghost(
        this.rigidLineShader,
        this.look.rigidLine,
        "design globe rigid ghost",
      ),
      reprojectedGhost: ghost(
        this.reprojectedLineShader,
        this.look.reprojectedLine,
        "design globe reprojected ghost",
      ),
    };
  }

  private release(path: string, pair: Pair): void {
    const { world } = this;
    for (const part of pair.parts) {
      world.removeDraw(part.surface);
      if (part.rigidGhost) {
        world.removeDraw(part.rigidGhost);
      }
      if (part.reprojectedGhost) {
        world.removeDraw(part.reprojectedGhost);
      }
      world.removeMesh(part.surfaceMesh);
      if (part.lineMesh) {
        world.removeMesh(part.lineMesh);
      }
    }
    this.pairs.delete(path);
    this.changed = true;
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
    }
  }
}
