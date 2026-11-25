// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Khronos/KHR_materials_anisotropy/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_materials_anisotropy {
  /**
   * glTF extension that defines anisotropy.
   */
  export interface Material extends Gltf2.Property {
    /**
     * The anisotropy strength. When the anisotropy texture is present, this
     * value is multiplied by the texture's blue channel.
     *
     * @default 0
     */
    anisotropyStrength?: number;
    /**
     * The rotation of the anisotropy in tangent, bitangent space, measured in
     * radians counter-clockwise from the tangent. When the anisotropy texture
     * is present, this value provides additional rotation to the vectors in the
     * texture.
     *
     * @default 0
     */
    anisotropyRotation?: number;
    /**
     * The anisotropy texture. Red and green channels represent the anisotropy
     * direction in $[-1, 1]$ tangent, bitangent space, to be rotated by the
     * anisotropy rotation. The blue channel contains strength as $[0, 1]$ to be
     * multiplied by the anisotropy strength.
     */
    anisotropyTexture?: Gltf2.Material.TextureInfo;
  }
}
