// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Khronos/KHR_node_visibility/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_node_visibility {
  /**
   * glTF extension that defines node's visibility.
   */
  export interface Node extends Gltf2.Property {
    /**
     * Specifies whether the node is visible. A value of false means that the
     * node and all its children are hidden.
     *
     * @default true
     */
    visible?: boolean;
  }
}
