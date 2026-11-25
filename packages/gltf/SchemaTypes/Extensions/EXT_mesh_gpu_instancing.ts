// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Vendor/EXT_mesh_gpu_instancing/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { EXT_feature_metadata } from "./EXT_feature_metadata.js";
import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace EXT_mesh_gpu_instancing {
  /**
   * glTF extension defines instance attributes for a node with a mesh.
   */
  export interface Gltf extends Gltf2.Property {
    /**
     * A dictionary object, where each key corresponds to instance attribute and
     * each value is the index of the accessor containing attribute's data.
     * Attributes TRANSLATION, ROTATION, SCALE define instance transformation.
     * For "TRANSLATION" the values are FLOAT_VEC3's specifying translation
     * along the x, y, and z axes. For "ROTATION" the values are VEC4's
     * specifying rotation as a quaternion in the order (x, y, z, w), where w is
     * the scalar, with component type `FLOAT` or normalized integer. For
     * "SCALE" the values are FLOAT_VEC3's specifying scaling factors along the
     * x, y, and z axes.
     */
    attributes?: Record<string, number>;
    /**
     * JSON object with extension objects. Property names correspond to glTF
     * extension names and property values are extension-specific objects.
     */
    extensions?: EXT_mesh_gpu_instancing.Gltf.Extensions;
  }
  export namespace Gltf {
    export interface Extensions extends Gltf2.Property.Extensions {
      /**
       * An object describing per-instance feature IDs to be used as indices to
       * property arrays in the feature table.
       */
      EXT_feature_metadata?: EXT_feature_metadata.EXT_mesh_gpu_instancing;
    }
  }
}
