// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.0/Vendor/EXT_instance_features/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace EXT_instance_features {
  /**
   * Feature IDs stored in a GPU mesh instancing attribute
   */
  export interface FeatureId extends Gltf2.Property {
    /**
     * The number of unique features in the attribute.
     */
    featureCount: number;
    /**
     * A value that indicates that no feature is associated with this instance.
     */
    nullFeatureId?: number;
    /**
     * A label assigned to this feature ID set. Labels must be alphanumeric
     * identifiers matching the regular expression `^[a-zA-Z_][a-zA-Z0-9_]*$`.
     */
    label?: string;
    /**
     * An attribute containing feature IDs. When this is omitted, then the
     * feature IDs are assigned to the GPU instances by their index.
     */
    attribute?: number;
    /**
     * The index of the property table containing per-feature property values.
     * Only applicable when using the `EXT_structural_metadata` extension.
     */
    propertyTable?: number;
  }
  /**
   * An object describing per-instance feature IDs.
   */
  export interface Node extends Gltf2.Property {
    /**
     * An array of feature ID sets.
     */
    featureIds: EXT_instance_features.FeatureId[];
  }
}
