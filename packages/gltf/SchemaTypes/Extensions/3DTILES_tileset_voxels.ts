// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.1/Vendor/3DTILES_tileset_voxels/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace _3DTILES_tileset_voxels {
  /**
   * Voxels are stored as glTFs with the EXT_voxels extension and are paired
   * with EXT_structural_metadata to unify the schema between a tileset and its
   * tiles. This extension is paired with Implicit Tiling for efficient
   * representation of massive sparse voxel datasets. This extension lets
   * runtimes detect voxel content in advance to allocate necessary resources
   * before tiles load.
   */
  export interface Gltf extends Gltf2.Property {
    /**
     * Dimensions of the voxel grid.
     */
    dimensions: [number, number, number];
    /**
     * The optional padding of the voxels.
     */
    padding?: _3DTILES_tileset_voxels.Padding;
    /**
     * The class that property values conform to. The value shall be a class ID
     * declared in the `classes` dictionary.
     */
    class: string;
  }
  /**
   * The padding around a voxel grid. Specifies how many rows of attribute data
   * come from neighboring grids in each dimension.
   */
  export interface Padding extends Gltf2.Property {
    before: [number, number, number];
    after: [number, number, number];
  }
}
