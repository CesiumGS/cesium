// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/1.0/Vendor/WEB3D_quantized_attributes/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

/** @internal */
export namespace WEB3D_quantized_attributes {
  export interface Accessor {
    /**
     * A homogenous floating-point transformation matrix stored in column-major
     * order. This matrix is used to decode the compressed, quantized data of
     * this accessor.
     */
    decodeMatrix: number[];
    /**
     * Maximum decoded value of each component in this attribute.
     */
    decodedMax: number[];
    /**
     * Minimum decoded value of each component in this attribute.
     */
    decodedMin: number[];
  }
}
