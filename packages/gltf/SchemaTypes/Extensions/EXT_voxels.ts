// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.1/Vendor/EXT_voxels/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { EXT_structural_metadata } from "./EXT_structural_metadata.js";
import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace EXT_voxels {
  /**
   * `EXT_voxels` extension for a node in a glTF model to indicate voxel-based
   * volumetric data
   */
  export interface Node extends Gltf2.Property {
    /**
     * Dimensions of the voxel grid. The values are interpreted with respect to
     * the shape indicated by `shape`.
     */
    dimensions: [number, number, number];
    /**
     * The optional padding of the voxels.
     */
    padding?: EXT_voxels.Padding;
    /**
     * A plain JSON object, where each key corresponds to an attribute semantic
     * and each value is the index of the accessor containing the attribute's
     * data.
     */
    attributes: Record<string, number>;
    /**
     * A plain JSON object, where each key corresponds to an existing semantic
     * in `attributes`, and each value is the attribute's `noData` value. A
     * `noData` value represents missing data—also known as a sentinel
     * value—wherever it appears.
     */
    noData?: Record<string, number[]>;
    /**
     * JSON object with extension objects. Property names correspond to glTF
     * extension names and property values are extension-specific objects.
     */
    extensions?: EXT_voxels.Node.Extensions;
  }
  export namespace Node {
    export interface Extensions extends Gltf2.Property.Extensions {
      /**
       * Structural metadata about EXT_voxels attributes.
       */
      EXT_structural_metadata?: EXT_structural_metadata.Node.EXT_voxels;
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
