// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.0/Vendor/EXT_primitive_voxels/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace EXT_primitive_voxels {
  export namespace Mesh {
    /**
     * `EXT_primitive_voxels` extension for a primitive in a glTF model to
     * indicate voxel-based volumetric data
     */
    export interface Primitive extends Gltf2.Property {
      /**
       * The index of the shape in `KHR_implicit_shapes` that the voxel grid
       * adheres to.
       */
      shape: number;
      /**
       * Dimensions of the voxel grid. The values are interpreted with respect
       * to the shape indicated by `KHR_implicit_shapes`.
       */
      dimensions: [number, number, number];
      /**
       * The optional padding of the voxels.
       */
      padding?: EXT_primitive_voxels.Padding;
      /**
       * A plain JSON object, where each key corresponds to an existing semantic
       * in the primitive's `attributes`, and each value is the attribute's
       * `noData` value. A `noData` value represents missing data — also known
       * as a sentinel value — wherever it appears.
       */
      noData?: Record<string, number[]>;
    }
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
