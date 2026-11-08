import type { PortfolioSite } from "../../examples/design-globe/sites.ts";
import type { CoarsenStats } from "./coarsen.mjs";
import type { DesignTileMesh } from "./corridorMesh.mjs";

/** A leaf's geometric error, metres (1 mm). */
export const LEAF_ERROR_METRES: number;
/** A coarse tile clusters its solids on cells of its larger side / this. */
export const CELL_DIVISOR: number;

export interface LadderLod {
  /** A bound on the distance from full detail to what is drawn, design units. */
  error: number;
  draw: ((builder: unknown) => void) | null;
}
export interface LadderPart {
  at: [number, number];
  lods: LadderLod[];
  height?: number;
}
export interface LadderGround {
  at: [number, number];
  length: number;
  width: number;
  angle: number;
  z: number;
  lods: { error: number; keep: boolean }[];
}
export interface LadderPlan {
  anchor: [number, number, number];
  leafSize: number;
  parts: LadderPart[];
  grounds: LadderGround[];
  landmark: { label: string; design: [number, number, number] };
  /** The pole line's pole count. */
  poles?: number;
}
export interface LadderNode {
  id: string;
  level: number;
  geometricError: number;
  children: LadderNode[];
  /** The parts the tile holds (by their `at`). */
  parts: LadderPart[];
  /** A coarse tile's clustering cell, design units (0 at the leaves). */
  cell: number;
  /** What a coarse tile's simplification did (undefined at the leaves). */
  stats?: CoarsenStats;
  mesh(): (DesignTileMesh & { colors: Float32Array }) | null;
}

/** A portfolio site's model as parts, grounds, a leaf size and a landmark. */
export function ladderPlan(
  site: PortfolioSite,
  units: { metersPerUnit: number },
): LadderPlan;
/** The plan's tile tree (leaves at level 0), with its levels and tile count. */
export function ladderTree(
  plan: LadderPlan,
  options: { leafError: number; metersPerUnit: number },
): { top: LadderNode; levels: number; tiles: number };
/** The full-detail model's extent and its farthest vertex from `anchor` (design units). */
export function planExtent(
  plan: LadderPlan,
  anchor: readonly number[],
): { extent: number; farthest: [number, number, number]; reach: number };
