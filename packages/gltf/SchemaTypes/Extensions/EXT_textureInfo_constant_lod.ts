// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/c3fa3604e240616d021aca3ebf61d7b61379b986/extensions/2.0/Vendor/EXT_textureInfo_constant_lod/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace EXT_textureInfo_constant_lod {
  /**
   * Enables dynamically calculated UV coordinates to keep the texture near a
   * constant level of detail
   */
  export interface TextureInfo extends Gltf2.Property {
    /**
     * The number of times the texture is repeated per meter.
     *
     * @default 1
     */
    repetitions?: number;
    /**
     * The offset in meters used to shift the texture.
     *
     * @default [0,0]
     */
    offset?: [number, number];
    /**
     * The minimum distance in meters from the eye to the surface at which to
     * clamp the texture.
     *
     * @default 1
     */
    minClampDistance?: number;
    /**
     * The maximum distance in meters from the eye to the surface at which to
     * clamp the texture.
     *
     * @default 4294967296
     */
    maxClampDistance?: number;
  }
}
