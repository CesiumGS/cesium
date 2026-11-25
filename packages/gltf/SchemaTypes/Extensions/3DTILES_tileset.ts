// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.1/Vendor/3DTILES_tileset/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace _3DTILES_tileset {
  /**
   * Content object in node-level 3DTILES_tileset extension.
   */
  export interface Content extends Gltf2.Property {
    /**
     * The content bounding volume.
     */
    boundingVolume?: Gltf2.Node.BoundingVolume;
  }
  /**
   * glTF-level 3DTILES_tileset extension.
   */
  export interface Gltf extends Gltf2.Property {
    /**
     * The tileset geometric error. A nonnegative number that defines the error,
     * in meters, that determines if the tileset is rendered. At runtime, the
     * geometric error is used to compute Screen-Space Error (SSE), the error
     * measured in pixels. If the SSE does not exceed a required minimum, the
     * tileset should not be rendered, and none of its tiles should be
     * considered for rendering.
     */
    geometricError: number;
  }
  /**
   * Node-level 3DTILES_tileset extension.
   */
  export interface Node extends Gltf2.Property {
    /**
     * The tile geometric error. A nonnegative number that defines the error, in
     * meters, introduced if this tile is rendered and its children are not. At
     * runtime, the geometric error is used to compute Screen-Space Error (SSE),
     * the error measured in pixels. The SSE determines if a tile is
     * sufficiently detailed for the current view or if its children should be
     * considered.
     */
    geometricError: number;
    /**
     * Specifies the refinement type. A string that is either "REPLACE" for
     * replacement refinement or "ADD" for additive refinement. It is required
     * for the root tile of a tileset; it is optional for all other tiles. A
     * tileset can use any combination of additive and replacement refinement.
     * When the refine property is omitted, it is inherited from the parent
     * tile.
     *
     * Allowed values:
     *
     * - `"REPLACE"`
     * - `"ADD"`
     */
    refine?: string;
    /**
     * An object that provides additional information about the tile's content.
     * If the tile does not have content (i.e. the node's `externalAsset`
     * property is not defined) then `content` **MUST** be omitted.
     */
    content?: _3DTILES_tileset.Content;
  }
}
