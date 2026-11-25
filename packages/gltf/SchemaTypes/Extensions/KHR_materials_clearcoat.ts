// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Khronos/KHR_materials_clearcoat/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_materials_clearcoat {
  /**
   * glTF extension that defines the clearcoat material layer.
   */
  export interface Material extends Gltf2.Property {
    /**
     * The clearcoat layer intensity (aka opacity) of the material. A value of
     * 0.0 means the material has no clearcoat layer enabled.
     *
     * @default 0
     */
    clearcoatFactor?: number;
    /**
     * The clearcoat layer intensity texture. These values are sampled from the
     * R channel. The values are linear. Use value 1.0 if no texture is
     * supplied.
     */
    clearcoatTexture?: Gltf2.Material.TextureInfo;
    /**
     * The clearcoat layer roughness of the material.
     *
     * @default 0
     */
    clearcoatRoughnessFactor?: number;
    /**
     * The clearcoat layer roughness texture. These values are sampled from the
     * G channel. The values are linear. Use value 1.0 if no texture is
     * supplied.
     */
    clearcoatRoughnessTexture?: Gltf2.Material.TextureInfo;
    /**
     * A tangent space normal map for the clearcoat layer. If desired, this may
     * be a reference to the same normal map used by the base material. If not
     * supplied, no normal mapping is applied to the clear coat layer.
     */
    clearcoatNormalTexture?: Gltf2.Material.NormalTextureInfo;
  }
}
