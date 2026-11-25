// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/c3fa3604e240616d021aca3ebf61d7b61379b986/extensions/2.0/Khronos/KHR_gaussian_splatting_compression_spz_2/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_gaussian_splatting_compression_spz_2 {
  export namespace Mesh {
    /**
     * Compressed data for SPZ v2 primitive.
     */
    export interface Primitive extends Gltf2.Property {
      /**
       * The index of the bufferView.
       */
      bufferView: number;
    }
  }
}
