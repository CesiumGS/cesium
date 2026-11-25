// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Vendor/CESIUM_primitive_outline/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace CESIUM_primitive_outline {
  /**
   * glTF extension for indicating that some edges of a primitive's triangles
   * should be outlined.
   */
  export interface Primitive extends Gltf2.Property {
    /**
     * The index of the accessor providing the list of highlighted lines at the
     * edge of this primitive's triangles.
     */
    indices?: number;
  }
}
