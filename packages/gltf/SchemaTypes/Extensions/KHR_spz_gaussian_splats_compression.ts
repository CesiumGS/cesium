// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/a4d88217e20f1ad86f4539bbae55ab6b931cb9cc/extensions/2.0/Khronos/KHR_spz_gaussian_splats_compression/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_spz_gaussian_splats_compression {
  export namespace Mesh {
    /**
     * Compressed data for SPZ primitive.
     */
    export interface Primitive extends Gltf2.Property {
      /**
       * The index of the bufferView.
       */
      bufferView: number;
    }
  }
}
