// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Vendor/EXT_mesh_primitive_edge_visibility/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace EXT_mesh_primitive_edge_visibility {
  /**
   * Represents one or more line strings to be drawn as edges of a triangle mesh
   */
  export interface LineString extends Gltf2.Property {
    /**
     * The index of the accessor that contains the vertex indices. The accessor
     * **MUST** have `SCALAR` type and an unsigned integer component type. The
     * indices are permitted to include the maximal index value for the
     * component type, indicating the start of a new line string.
     */
    indices: number;
    /**
     * The index of a glTF material with which the edges are to be drawn. If
     * omitted, the edges are drawn using the same material as the edges encoded
     * by the extension's `visibility` field, or else that of the triangle mesh
     * primitive.
     */
    material?: number;
  }
  /**
   * glTF extension encoding the visibility of the edges of a triangles
   * primitive
   */
  export interface Primitive extends Gltf2.Property {
    /**
     * An edge visibility of 0 indicates the edge is never drawn; 1 indicates
     * the edge is only drawn in silhouette; 2 indicates a 'hard' (always-drawn)
     * edge; and 3 indicates a repeated occurrence of a 'hard' edge.
     */
    visibility?: number;
    /**
     * The index of a glTF material with which the edges are to be drawn. If
     * omitted, the edges are drawn using the same material as the triangle mesh
     * primitive.
     */
    material?: number;
    /**
     * This property **MUST** be defined if and only if `visibility` encodes at
     * least one edge with visibility value `1`.
     */
    silhouetteNormals?: number;
    /**
     * Edges encoded as line strings **MUST NOT** also be encoded by the
     * `visibility` property.
     */
    lineStrings?: EXT_mesh_primitive_edge_visibility.LineString[];
  }
}
