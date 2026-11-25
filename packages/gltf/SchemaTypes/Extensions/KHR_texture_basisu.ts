// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Khronos/KHR_texture_basisu/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_texture_basisu {
  /**
   * glTF extension to specify textures using the KTX v2 images with Basis
   * Universal supercompression.
   */
  export interface Texture extends Gltf2.Property {
    /**
     * The index of the image which points to a KTX v2 resource with Basis
     * Universal supercompression.
     */
    source?: number;
  }
}
