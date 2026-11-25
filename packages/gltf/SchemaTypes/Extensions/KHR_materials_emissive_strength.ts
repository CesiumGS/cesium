// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Khronos/KHR_materials_emissive_strength/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_materials_emissive_strength {
  /**
   * glTF extension that adjusts the strength of emissive material properties.
   */
  export interface Material extends Gltf2.Property {
    /**
     * The strength adjustment to be multiplied with the material's emissive
     * value.
     *
     * @default 1
     */
    emissiveStrength?: number;
  }
}
