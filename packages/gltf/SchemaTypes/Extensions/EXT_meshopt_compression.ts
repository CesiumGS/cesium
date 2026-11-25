// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Vendor/EXT_meshopt_compression/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace EXT_meshopt_compression {
  /**
   * Compressed data for bufferView.
   */
  export interface Buffer extends Gltf2.Property {
    /**
     * Set to true to indicate that the buffer is only referenced by bufferViews
     * that have EXT_meshopt_compression extension and as such doesn't need to
     * be loaded.
     *
     * @default false
     */
    fallback?: boolean;
  }
  /**
   * Compressed data for bufferView.
   */
  export interface BufferView extends Gltf2.Property {
    /**
     * The index of the buffer with compressed data.
     */
    buffer: number;
    /**
     * The offset into the buffer in bytes.
     *
     * @default 0
     */
    byteOffset?: number;
    /**
     * The length of the compressed data in bytes.
     */
    byteLength: number;
    /**
     * The stride, in bytes.
     */
    byteStride: number;
    /**
     * The number of elements.
     */
    count: number;
    /**
     * The compression mode.
     *
     * Allowed values:
     *
     * - `"ATTRIBUTES"`
     * - `"TRIANGLES"`
     * - `"INDICES"`
     */
    mode: "ATTRIBUTES" | "TRIANGLES" | "INDICES";
    /**
     * The compression filter.
     *
     * Allowed values:
     *
     * - `"NONE"`
     * - `"OCTAHEDRAL"`
     * - `"QUATERNION"`
     * - `"EXPONENTIAL"`
     *
     * @default "NONE"
     */
    filter?: "NONE" | "OCTAHEDRAL" | "QUATERNION" | "EXPONENTIAL";
  }
}
