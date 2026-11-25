// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/c3fa3604e240616d021aca3ebf61d7b61379b986/extensions/2.0/Vendor/EXT_mesh_polygon
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/**
 * glTF extension adding an encoding of polygon primitive topology
 *
 * @internal
 */
export interface EXT_mesh_polygon extends Gltf2.Property {
  /**
   * Integer number of polygons encoded in the mesh primitive.
   */
  count: number;
  /**
   * Index of an accessor containing indices of the polygons' exterior and
   * interior loops. The accessor MUST have SCALAR type and an unsigned integer
   * component type.
   */
  loopIndices: number;
  /**
   * Index of an accessor containing one integer offset per polygon in the
   * primitive, indicating the first index of the first linear ring associated
   * with that polygon.
   */
  loopIndicesOffsets: number;
  /**
   * Index of an accessor containing one integer offset per polygon in the
   * primitive, indicating the first index of the first triangle associated with
   * that polygon.
   */
  indicesOffsets: number;
}
