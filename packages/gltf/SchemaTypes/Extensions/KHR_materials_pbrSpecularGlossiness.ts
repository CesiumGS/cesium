// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Archived/KHR_materials_pbrSpecularGlossiness/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_materials_pbrSpecularGlossiness {
  /**
   * glTF extension that defines the specular-glossiness material model from
   * Physically-Based Rendering (PBR) methodology.
   */
  export interface Gltf extends Gltf2.Property {
    /**
     * The RGBA components of the reflected diffuse color of the material.
     * Metals have a diffuse value of `[0.0, 0.0, 0.0]`. The fourth component
     * (A) is the alpha coverage of the material. The `alphaMode` property
     * specifies how alpha is interpreted. The values are linear.
     *
     * @default [1,1,1,1]
     */
    diffuseFactor?: [number, number, number, number];
    /**
     * The diffuse texture. This texture contains RGB components of the
     * reflected diffuse color of the material encoded with the sRGB transfer
     * function. If the fourth component (A) is present, it represents the
     * linear alpha coverage of the material. Otherwise, an alpha of 1.0 is
     * assumed. The `alphaMode` property specifies how alpha is interpreted. The
     * stored texels must not be premultiplied.
     */
    diffuseTexture?: Gltf2.Material.TextureInfo;
    /**
     * The specular RGB color of the material. This value is linear.
     *
     * @default [1,1,1]
     */
    specularFactor?: [number, number, number];
    /**
     * The glossiness or smoothness of the material. A value of 1.0 means the
     * material has full glossiness or is perfectly smooth. A value of 0.0 means
     * the material has no glossiness or is completely rough. This value is
     * linear.
     *
     * @default 1
     */
    glossinessFactor?: number;
    /**
     * The specular-glossiness texture is an RGBA texture, containing the
     * specular color (RGB) encoded with the sRGB transfer function and the
     * linear glossiness value (A).
     */
    specularGlossinessTexture?: Gltf2.Material.TextureInfo;
  }
}
