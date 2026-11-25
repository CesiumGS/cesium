// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Khronos/KHR_materials_specular/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_materials_specular {
  /**
   * glTF extension that defines the strength of the specular reflection.
   */
  export interface Material extends Gltf2.Property {
    /**
     * This parameter scales the amount of specular reflection on non-metallic
     * surfaces. It has no effect on metals.
     *
     * @default 1
     */
    specularFactor?: number;
    /**
     * A texture that defines the specular factor in the alpha channel. This
     * will be multiplied by specularFactor.
     */
    specularTexture?: Gltf2.Material.TextureInfo;
    /**
     * This is an additional RGB color parameter that tints the specular
     * reflection of non-metallic surfaces. At grazing angles, the reflection
     * still blends to white, and the parameter has not effect on metals. The
     * value is linear.
     *
     * @default [1,1,1]
     */
    specularColorFactor?: [number, number, number];
    /**
     * A texture that defines the specular color in the RGB channels (encoded in
     * sRGB). This will be multiplied by specularColorFactor.
     */
    specularColorTexture?: Gltf2.Material.TextureInfo;
  }
}
