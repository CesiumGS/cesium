// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.0/Vendor/EXT_feature_metadata/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace EXT_feature_metadata {
  /**
   * An object describing per-instance feature IDs to be used as indices to
   * property arrays in the feature table.
   */
  export interface EXT_mesh_gpu_instancing extends Gltf2.Property {
    /**
     * An array of objects mapping per-instance feature IDs to property arrays
     * in a feature table.
     */
    featureIdAttributes?: EXT_feature_metadata.FeatureIdAttribute[];
  }
  /**
   * A class containing a set of properties.
   */
  export interface Class extends Gltf2.Property {
    /**
     * The name of the class, e.g. for display purposes.
     */
    name?: string;
    /**
     * The description of the class.
     */
    description?: string;
    /**
     * A dictionary, where each key is a property ID and each value is an object
     * defining the property.
     */
    properties?: Record<string, EXT_feature_metadata.Class.Property>;
  }
  export namespace Class {
    /**
     * A class property.
     */
    export interface Property extends Gltf2.Property {
      /**
       * The name of the property, e.g. for display purposes.
       */
      name?: string;
      /**
       * The description of the property.
       */
      description?: string;
      /**
       * The property type. If `ENUM` is used, then `enumType` must also be
       * specified. If `ARRAY` is used, then `componentType` must also be
       * specified. `ARRAY` is a fixed-length array when `componentCount` is
       * defined, and variable-length otherwise.
       *
       * Allowed values:
       *
       * - `"INT8"`
       * - `"UINT8"`
       * - `"INT16"`
       * - `"UINT16"`
       * - `"INT32"`
       * - `"UINT32"`
       * - `"INT64"`
       * - `"UINT64"`
       * - `"FLOAT32"`
       * - `"FLOAT64"`
       * - `"BOOLEAN"`
       * - `"STRING"`
       * - `"ENUM"`
       * - `"ARRAY"`
       */
      type: string;
      /**
       * An enum ID as declared in the `enums` dictionary. This value must be
       * specified when `type` or `componentType` is `ENUM`.
       */
      enumType?: string;
      /**
       * When `type` is `ARRAY` this indicates the type of each component of the
       * array. If `ENUM` is used, then `enumType` must also be specified.
       *
       * Allowed values:
       *
       * - `"INT8"`
       * - `"UINT8"`
       * - `"INT16"`
       * - `"UINT16"`
       * - `"INT32"`
       * - `"UINT32"`
       * - `"INT64"`
       * - `"UINT64"`
       * - `"FLOAT32"`
       * - `"FLOAT64"`
       * - `"BOOLEAN"`
       * - `"STRING"`
       * - `"ENUM"`
       */
      componentType?: string;
      /**
       * The number of components per element for `ARRAY` elements.
       */
      componentCount?: number;
      /**
       * Specifies whether integer values are normalized. This applies both when
       * `type` is an integer type, or when `type` is `ARRAY` with a
       * `componentType` that is an integer type. For unsigned integer types,
       * values are normalized between `[0.0, 1.0]`. For signed integer types,
       * values are normalized between `[-1.0, 1.0]`. For all other types, this
       * property is ignored.
       *
       * @default false
       */
      normalized?: boolean;
      /**
       * Maximum allowed values for property values. Only applicable for numeric
       * types and fixed-length arrays of numeric types. For numeric types this
       * is a single number. For fixed-length arrays this is an array with
       * `componentCount` number of elements. The `normalized` property has no
       * effect on these values: they always correspond to the integer values.
       */
      max?: number | unknown[];
      /**
       * Minimum allowed values for property values. Only applicable for numeric
       * types and fixed-length arrays of numeric types. For numeric types this
       * is a single number. For fixed-length arrays this is an array with
       * `componentCount` number of elements. The `normalized` property has no
       * effect on these values: they always correspond to the integer values.
       */
      min?: number | unknown[];
      /**
       * A default value to use when the property value is not defined. If used,
       * `optional` must be set to true. The type of the default value must
       * match the property definition: For `BOOLEAN` use `true` or `false`. For
       * `STRING` use a JSON string. For a numeric type use a JSON number. For
       * `ENUM` use the enum `name`, not the integer value. For `ARRAY` use a
       * JSON array containing values matching the `componentType`.
       */
      default?: boolean | number | string | unknown[];
      /**
       * If true, this property is optional.
       *
       * @default false
       */
      optional?: boolean;
      /**
       * An identifier that describes how this property should be interpreted.
       * The semantic cannot be used by other properties in the class.
       */
      semantic?: string;
    }
  }
  /**
   * An object defining the values of an enum.
   */
  export interface Enum extends Gltf2.Property {
    /**
     * The name of the enum, e.g. for display purposes.
     */
    name?: string;
    /**
     * The description of the enum.
     */
    description?: string;
    /**
     * The type of the integer enum value.
     *
     * Allowed values:
     *
     * - `"INT8"`
     * - `"UINT8"`
     * - `"INT16"`
     * - `"UINT16"`
     * - `"INT32"`
     * - `"UINT32"`
     * - `"INT64"`
     * - `"UINT64"`
     *
     * @default "UINT16"
     */
    valueType?: string;
    /**
     * An array of enum values. Duplicate names or duplicate integer values are
     * not allowed.
     */
    values: EXT_feature_metadata.Enum.Value[];
  }
  export namespace Enum {
    /**
     * An enum value.
     */
    export interface Value extends Gltf2.Property {
      /**
       * The name of the enum value.
       */
      name: string;
      /**
       * The description of the enum value.
       */
      description?: string;
      /**
       * The integer enum value.
       */
      value: number;
    }
  }
  /**
   * An object mapping feature IDs to a feature table.
   */
  export interface FeatureIdAttribute extends Gltf2.Property {
    /**
     * The ID of the feature table in the model's root
     * `EXT_feature_metadata.featureTables` dictionary.
     */
    featureTable: string;
    /**
     * An object describing feature IDs to be used as indices to property arrays
     * in the feature table. Feature IDs must be whole numbers in the range
     * `[0, count - 1]` (inclusive), where `count` is the total number of
     * features in the feature table.
     */
    featureIds: EXT_feature_metadata.FeatureIdAttribute.FeatureIds;
  }
  export namespace FeatureIdAttribute {
    /**
     * Feature IDs to be used as indices to property arrays in the feature
     * table.
     */
    export interface FeatureIds extends Gltf2.Property {
      /**
       * The name of the attribute containing feature IDs.
       */
      attribute?: string;
      /**
       * Sets a constant feature ID when the attribute property is omitted.
       *
       * @default 0
       */
      constant?: number;
      /**
       * The rate at which feature IDs increment. If `divisor` is 0 then
       * `constant` is used. If `divisor` is non-zero the feature ID increments
       * once per `divisor` sets of elements, starting at `constant`. For
       * example, if `constant` is 0 and `divisor` is 1 the feature IDs are [0,
       * 1, 2, ...]; if `constant` is 2 and `divisor` is 3 the feature IDs are
       * [2, 2, 2, 3, 3, 3, 4, 4, 4, ...]
       *
       * @default 0
       */
      divisor?: number;
    }
  }
  /**
   * An object describing a texture used for storing per-texel feature IDs.
   */
  export interface FeatureIdTexture extends Gltf2.Property {
    /**
     * The ID of the feature table in the model's root
     * `EXT_feature_metadata.featureTables` dictionary.
     */
    featureTable: string;
    /**
     * A description of the texture and channel to use for feature IDs. The
     * `channels` property must have a single channel. Furthermore, feature IDs
     * must be whole numbers in the range `[0, count - 1]` (inclusive), where
     * `count` is the total number of features in the feature table. Texel
     * values must be read as integers. Texture filtering should be disabled
     * when fetching feature IDs.
     */
    featureIds: EXT_feature_metadata.TextureAccessor;
  }
  /**
   * A feature table defined by a class and property values stored in arrays.
   */
  export interface FeatureTable extends Gltf2.Property {
    /**
     * The class that property values conform to. The value must be a class ID
     * declared in the `classes` dictionary.
     */
    class?: string;
    /**
     * The number of features, as well as the number of elements in each
     * property array.
     */
    count: number;
    /**
     * A dictionary, where each key corresponds to a property ID in the class'
     * `properties` dictionary and each value is an object describing where
     * property values are stored. Optional properties may be excluded from this
     * dictionary.
     */
    properties?: Record<string, EXT_feature_metadata.FeatureTable.Property>;
  }
  export namespace FeatureTable {
    /**
     * An array of binary property values.
     */
    export interface Property extends Gltf2.Property {
      /**
       * The index of the buffer view containing property values. The data type
       * of property values is determined by the property definition: When
       * `type` is `BOOLEAN` values are packed into a bitfield. When `type` is
       * `STRING` values are stored as byte sequences and decoded as UTF-8
       * strings. When `type` is a numeric type values are stored as the
       * provided `type`. When `type` is `ENUM` values are stored as the enum's
       * `valueType`. Each enum value in the buffer must match one of the
       * allowed values in the enum definition. When `type` is `ARRAY` elements
       * are packed tightly together and the data type is based on the
       * `componentType` following the same rules as above.
       * `arrayOffsetBufferView` is required for variable-size arrays and
       * `stringOffsetBufferView` is required for strings (for variable-length
       * arrays of strings, both are required). The buffer view `byteOffset`
       * must be aligned to a multiple of 8 bytes. If the buffer view's `buffer`
       * is the GLB-stored `BIN` chunk, the byte offset is measured relative to
       * the beginning of the GLB. Otherwise, it is measured relative to the
       * beginning of the buffer.
       */
      bufferView: number;
      /**
       * The type of values in `arrayOffsetBufferView` and
       * `stringOffsetBufferView`.
       *
       * Allowed values:
       *
       * - `"UINT8"`
       * - `"UINT16"`
       * - `"UINT32"`
       * - `"UINT64"`
       *
       * @default "UINT32"
       */
      offsetType?: string;
      /**
       * The index of the buffer view containing offsets for variable-length
       * arrays. The number of offsets is equal to the feature table `count`
       * plus one. The offsets represent the start positions of each array, with
       * the last offset representing the position after the last array. The
       * array length is computed using the difference between the current
       * offset and the subsequent offset. If `componentType` is `STRING` the
       * offsets index into the string offsets array (stored in
       * `stringOffsetBufferView`), otherwise they index into the property array
       * (stored in `bufferView`). The data type of these offsets is determined
       * by `offsetType`. The buffer view `byteOffset` must be aligned to a
       * multiple of 8 bytes in the same manner as the main `bufferView`
       */
      arrayOffsetBufferView?: number;
      /**
       * The index of the buffer view containing offsets for strings. The number
       * of offsets is equal to the number of string components plus one. The
       * offsets represent the byte offsets of each string in the main
       * `bufferView`, with the last offset representing the byte offset after
       * the last string. The string byte length is computed using the
       * difference between the current offset and the subsequent offset. The
       * data type of these offsets is determined by `offsetType`. The buffer
       * view `byteOffset` must be aligned to a multiple of 8 bytes in the same
       * manner as the main `bufferView`.
       */
      stringOffsetBufferView?: number;
    }
  }
  /**
   * Features whose property values are stored directly in texture channels.
   * This is not to be confused with feature ID textures which store feature IDs
   * for use with a feature table.
   */
  export interface FeatureTexture extends Gltf2.Property {
    /**
     * The class this feature texture conforms to. The value must be a class ID
     * declared in the `classes` dictionary.
     */
    class: string;
    /**
     * A dictionary, where each key corresponds to a property ID in the class'
     * `properties` dictionary and each value describes the texture channels
     * containing property values.
     */
    properties: Record<string, EXT_feature_metadata.TextureAccessor>;
  }
  /**
   * glTF extension that assigns metadata to features in a model.
   */
  export interface Gltf extends Gltf2.Property {
    /**
     * An object defining classes and enums.
     */
    schema?: EXT_feature_metadata.Schema;
    /**
     * The URI (or IRI) of the external schema file.
     */
    schemaUri?: string;
    /**
     * An object containing statistics about features.
     */
    statistics?: EXT_feature_metadata.Statistics;
    /**
     * A dictionary, where each key is a feature table ID and each value is an
     * object defining the feature table.
     */
    featureTables?: Record<string, EXT_feature_metadata.FeatureTable>;
    /**
     * A dictionary, where each key is a feature texture ID and each value is an
     * object defining the feature texture.
     */
    featureTextures?: Record<string, EXT_feature_metadata.FeatureTexture>;
  }
  export namespace Mesh {
    /**
     * `EXT_feature_metadata extension` for a primitive in a glTF model, to
     * associate it with the root `EXT_feature_metadata` object.
     */
    export interface Primitive extends Gltf2.Property {
      /**
       * An array of objects mapping per-vertex feature IDs to a feature table.
       */
      featureIdAttributes?: EXT_feature_metadata.FeatureIdAttribute[];
      /**
       * An array of objects mapping per-texel feature IDs to a feature table.
       */
      featureIdTextures?: EXT_feature_metadata.FeatureIdTexture[];
      /**
       * An array of IDs of feature textures from the root
       * `EXT_feature_metadata` object.
       */
      featureTextures?: string[];
    }
  }
  /**
   * An object defining classes and enums.
   */
  export interface Schema extends Gltf2.Property {
    /**
     * The name of the schema.
     */
    name?: string;
    /**
     * The description of the schema.
     */
    description?: string;
    /**
     * Application-specific version of the schema.
     */
    version?: string;
    /**
     * A dictionary, where each key is a class ID and each value is an object
     * defining the class.
     */
    classes?: Record<string, EXT_feature_metadata.Class>;
    /**
     * A dictionary, where each key is an enum ID and each value is an object
     * defining the values for the enum.
     */
    enums?: Record<string, EXT_feature_metadata.Enum>;
  }
  /**
   * Statistics about features.
   */
  export interface Statistics extends Gltf2.Property {
    /**
     * A dictionary, where each key is a class ID declared in the `classes`
     * dictionary and each value is an object containing statistics about
     * features that conform to the class.
     */
    classes?: Record<string, EXT_feature_metadata.Statistics.Class>;
  }
  export namespace Statistics {
    /**
     * Statistics about features that conform to the class.
     */
    export interface Class extends Gltf2.Property {
      /**
       * The number of features that conform to the class.
       */
      count?: number;
      /**
       * A dictionary, where each key corresponds to a property ID in the class'
       * `properties` dictionary and each value is an object containing
       * statistics about property values.
       */
      properties?: Record<
        string,
        EXT_feature_metadata.Statistics.Class.Property
      >;
    }
    export namespace Class {
      /**
       * Statistics about property values.
       */
      export interface Property extends Gltf2.Property {
        /**
         * The minimum property value. Only applicable for numeric types and
         * fixed-length arrays of numeric types. For numeric types this is a
         * single number. For fixed-length arrays this is an array with
         * `componentCount` number of elements. The `normalized` property has no
         * effect on these values.
         */
        min?: number | unknown[];
        /**
         * The maximum property value. Only applicable for numeric types and
         * fixed-length arrays of numeric types. For numeric types this is a
         * single number. For fixed-length arrays this is an array with
         * `componentCount` number of elements. The `normalized` property has no
         * effect on these values.
         */
        max?: number | unknown[];
        /**
         * The arithmetic mean of the property values. Only applicable for
         * numeric types and fixed-length arrays of numeric types. For numeric
         * types this is a single number. For fixed-length arrays this is an
         * array with `componentCount` number of elements. The `normalized`
         * property has no effect on these values.
         */
        mean?: number | unknown[];
        /**
         * The median of the property values. Only applicable for numeric types
         * and fixed-length arrays of numeric types. For numeric types this is a
         * single number. For fixed-length arrays this is an array with
         * `componentCount` number of elements. The `normalized` property has no
         * effect on these values.
         */
        median?: number | unknown[];
        /**
         * The standard deviation of the property values. Only applicable for
         * numeric types and fixed-length arrays of numeric types. For numeric
         * types this is a single number. For fixed-length arrays this is an
         * array with `componentCount` number of elements. The `normalized`
         * property has no effect on these values.
         */
        standardDeviation?: number | unknown[];
        /**
         * The variance of the property values. Only applicable for numeric
         * types and fixed-length arrays of numeric types. For numeric types
         * this is a single number. For fixed-length arrays this is an array
         * with `componentCount` number of elements. The `normalized` property
         * has no effect on these values.
         */
        variance?: number | unknown[];
        /**
         * The sum of the property values. Only applicable for numeric types and
         * fixed-length arrays of numeric types. For numeric types this is a
         * single number. For fixed-length arrays this is an array with
         * `componentCount` number of elements. The `normalized` property has no
         * effect on these values.
         */
        sum?: number | unknown[];
        /**
         * A dictionary, where each key corresponds to an enum `name` and each
         * value is the number of occurrences of that enum. Only applicable when
         * `type` or `componentType` is `ENUM`. For fixed-length arrays, this is
         * an array with `componentCount` number of elements.
         */
        occurrences?: Record<string, number | unknown[]>;
      }
    }
  }
  /**
   * A description of how to access property values from the color channels of a
   * texture.
   */
  export interface TextureAccessor extends Gltf2.Property {
    /**
     * Texture channels containing property values. Channels are labeled by
     * `rgba` and are swizzled with a string of 1-4 characters.
     */
    channels: string;
    /**
     * The glTF texture and texture coordinates to use.
     */
    texture: Gltf2.Material.TextureInfo;
  }
}
