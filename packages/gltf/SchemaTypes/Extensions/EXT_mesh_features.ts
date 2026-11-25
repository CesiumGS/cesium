// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.0/Vendor/EXT_mesh_features/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace EXT_mesh_features {
  /**
   * Feature IDs stored in an attribute or texture.
   */
  export interface FeatureId extends Gltf2.Property {
    /**
     * The number of unique features in the attribute or texture.
     */
    featureCount: number;
    /**
     * A value that indicates that no feature is associated with this vertex or
     * texel.
     */
    nullFeatureId?: number;
    /**
     * A label assigned to this feature ID set. Labels must be alphanumeric
     * identifiers matching the regular expression `^[a-zA-Z_][a-zA-Z0-9_]*$`.
     */
    label?: string;
    /**
     * An attribute containing feature IDs. When `attribute` and `texture` are
     * omitted the feature IDs are assigned to vertices by their index.
     */
    attribute?: number;
    /**
     * A texture containing feature IDs.
     */
    texture?: EXT_mesh_features.FeatureIdTexture;
    /**
     * The index of the property table containing per-feature property values.
     * Only applicable when using the `EXT_structural_metadata` extension.
     */
    propertyTable?: number;
  }
  /**
   * A texture containing feature IDs
   */
  export interface FeatureIdTexture extends Gltf2.Material.TextureInfo {
    /**
     * Texture channels containing feature IDs, identified by index. Feature IDs
     * may be packed into multiple channels if a single channel does not have
     * sufficient bit depth to represent all feature ID values. The values are
     * packed in little-endian order.
     *
     * @default [0]
     */
    channels?: number[];
  }
  export namespace Mesh {
    /**
     * An object describing feature IDs for a mesh primitive.
     */
    export interface Primitive extends Gltf2.Property {
      /**
       * An array of feature ID sets.
       */
      featureIds: EXT_mesh_features.FeatureId[];
    }
  }
}
