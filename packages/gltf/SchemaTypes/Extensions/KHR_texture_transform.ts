// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Khronos/KHR_texture_transform/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_texture_transform {
  /**
   * glTF extension that enables shifting and scaling UV coordinates on a
   * per-texture basis
   */
  export interface TextureInfo extends Gltf2.Property {
    /**
     * The offset of the UV coordinate origin as a factor of the texture
     * dimensions.
     *
     * @default [0,0]
     */
    offset?: [number, number];
    /**
     * Rotate the UVs by this many radians counter-clockwise around the origin.
     *
     * @default 0
     */
    rotation?: number;
    /**
     * The scale factor applied to the components of the UV coordinates.
     *
     * @default [1,1]
     */
    scale?: [number, number];
    /**
     * Overrides the textureInfo texCoord value if supplied, and if this
     * extension is supported.
     */
    texCoord?: number;
  }
}
