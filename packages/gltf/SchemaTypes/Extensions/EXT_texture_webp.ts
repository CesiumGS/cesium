// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Vendor/EXT_texture_webp/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace EXT_texture_webp {
  /**
   * glTF extension to specify textures using the WebP image format.
   */
  export interface Gltf extends Gltf2.Property {
    /**
     * The index of the WebP image.
     */
    source?: number;
  }
}
