import type { DesignTileMesh } from "./corridorMesh.mjs";

type Vec3 = [number, number, number];
type Rgba = [number, number, number, number];
type Feature = { name: string; kind: string };

/** WGS 84's smallest radius of curvature, a(1 − e²), metres: the sag rule's R. */
export const MIN_RADIUS: number;
/** The sag at the middle of a chord this many metres long (d²/8R), metres. */
export function edgeSag(metres: number): number;
/** The longest chord whose sag is at most `errorMetres`, metres. */
export function longestEdgeFor(errorMetres: number): number;
/** An sRGB "#rrggbb" as linear RGBA. */
export function srgb(hex: string, alpha?: number): Rgba;
/** A seeded generator of numbers in [0, 1) (mulberry32). */
export function random(seed: number): () => number;
export function pick<T>(rand: () => number, items: readonly T[]): T;
export function between(rand: () => number, lo: number, hi: number): number;
/** A horizontal frame turned `angle` radians from design east. */
export function frameAt(angle: number): { u: Vec3; v: Vec3; w: Vec3 };
export function placeIn(
  frame: { u: Vec3; v: Vec3; w: Vec3 },
  at: readonly [number, number],
  along: number,
  across: number,
  z: number,
): Vec3;
/** One tile's mesh, every edge at most `maxEdge` design units. */
export class MeshBuilder {
  constructor(maxEdge: number);
  readonly maxEdge: number;
  readonly empty: boolean;
  feature(feature: Feature): number;
  triangle(a: Vec3, b: Vec3, c: Vec3, color: Rgba, feature: Feature): void;
  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, color: Rgba, feature: Feature): void;
  polygon(points: Vec3[], color: Rgba, feature: Feature): void;
  flat(
    at: readonly [number, number],
    z: number,
    length: number,
    width: number,
    angle: number,
    color: Rgba,
    feature: Feature,
  ): void;
  build(): DesignTileMesh & { colors: Float32Array };
}
/** The longest triangle edge of a mesh, design units. */
export function longestEdge(mesh: DesignTileMesh): number;
