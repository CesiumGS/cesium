// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Khronos/KHR_materials_transmission/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_materials_transmission {
  /**
   * glTF extension that defines the optical transmission of a material.
   */
  export interface Material extends Gltf2.Property {
    /**
     * The base percentage of non-specularly reflected light that is transmitted
     * through the surface. i.e. of the light that penetrates a surface (isn't
     * specularly reflected), this is the percentage that is transmitted and not
     * diffusely re-emitted.
     *
     * @default 0
     */
    transmissionFactor?: number;
    /**
     * A texture that defines the transmission percentage of the surface,
     * sampled from the R channel. These values are linear, and will be
     * multiplied by transmissionFactor. This indicates the percentage of
     * non-specularly reflected light that is transmitted through the surface.
     * i.e. of the light that penetrates a surface (isn't specularly reflected),
     * this is the percentage is transmitted and not diffusely re-emitted.
     */
    transmissionTexture?: Gltf2.Material.TextureInfo;
  }
}
