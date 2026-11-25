// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.1/Vendor/3DTILES_implicit_tiling/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace _3DTILES_implicit_tiling {
  /**
   * Implicit tiling defines a concise representation of quadtrees and octrees
   * in 3D Tiles.
   */
  export interface Node extends Gltf2.Property {
    /**
     * A template URI pointing to tile content. It contains placeholders
     * `{level}`, `{x}`, `{y}`, and optionally `{z}` (for OCTREE subdivision
     * scheme) that are substituted with a tile's coordinate to resolve the
     * actual file. Example: `content/{level}/{x}/{y}.glb`.
     */
    contentUri: string;
    /**
     * A template URI pointing to subtree files. It contains placeholders
     * `{level}`, `{x}`, `{y}`, and optionally `{z}` (for OCTREE subdivision
     * scheme) that are substituted with a subtree's coordinate to resolve the
     * actual file. Example: `subtrees/{level}/{x}/{y}.json`.
     */
    subtreeUri: string;
    /**
     * Either QUADTREE or OCTREE. See Subdivision scheme.
     *
     * Allowed values:
     *
     * - `"QUADTREE"`
     * - `"OCTREE"`
     */
    subdivisionScheme: string;
    /**
     * How many levels there are in the tree with available tiles.
     */
    availableLevels: number;
    /**
     * How many levels there are in each subtree.
     */
    subtreeLevels: number;
  }
}
