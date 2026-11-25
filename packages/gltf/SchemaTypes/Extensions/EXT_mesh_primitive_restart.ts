// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Vendor/EXT_mesh_primitive_restart/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/**
 * glTF extension enabling the use of primitive restart values in index buffers
 *
 * @internal
 */
export interface EXT_mesh_primitive_restart extends Gltf2.Property {
  /**
   * The list of groups of primitives that can be drawn using a single index
   * buffer with primitive restart
   */
  primitiveGroups: EXT_mesh_primitive_restart.PrimitiveGroup[];
}
/** @internal */
export namespace EXT_mesh_primitive_restart {
  /**
   * A group of primitives that can be drawn together using a single index
   * buffer containing restart values
   */
  export interface PrimitiveGroup extends Gltf2.Property {
    /**
     * The indices of the primitives that will be combined and drawn using a
     * single set of indices. All properties except for `indices` (e.g.,
     * `material`, `mode`, and `attributes`) will be obtained from the first
     * primitive in the list, and all other primitives in the list **MUST** have
     * identical values for those properties. The `mode` must be TRIANGLE_FAN,
     * TRIANGLE_STRIP, LINE_LOOP, or LINE_STRIP.
     */
    primitives: number[];
    /**
     * The index of the accessor that contains the vertex indices. The accessor
     * **MUST** have `SCALAR` type and an unsigned integer component type. The
     * indices are permitted to include the maximal index value for the
     * component type, indicating the start of a new primitive.
     */
    indices: number;
  }
}
