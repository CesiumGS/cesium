// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Khronos/KHR_draco_mesh_compression/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_draco_mesh_compression {
  export namespace Mesh {
    export interface Primitive extends Gltf2.Property {
      /**
       * The index of the bufferView.
       */
      bufferView: number;
      /**
       * A dictionary object, where each key corresponds to an attribute and its
       * unique attribute id stored in the compressed geometry.
       */
      attributes: Record<string, number>;
    }
  }
}
