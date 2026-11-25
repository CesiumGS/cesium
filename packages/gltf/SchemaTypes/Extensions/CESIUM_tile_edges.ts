// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.0/Vendor/CESIUM_tile_edges/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace CESIUM_tile_edges {
  export namespace Mesh {
    /**
     * `CESIUM_tile_edges` extension for a primitive in a glTF model.
     */
    export interface Primitive extends Gltf2.Property {
      /**
       * The index of the accessor containing indices that make up the left
       * edge.
       */
      left: number;
      /**
       * The index of the accessor containing indices that make up the bottom
       * edge.
       */
      bottom: number;
      /**
       * The index of the accessor containing indices that make up the right
       * edge.
       */
      right: number;
      /**
       * The index of the accessor containing indices that make up the top edge.
       */
      top: number;
    }
  }
}
