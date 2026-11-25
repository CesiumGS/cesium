// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.0/Vendor/EXT_structural_metadata/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/**
 * Structural metadata about a glTF element.
 *
 * @internal
 */
export interface EXT_structural_metadata extends Gltf2.Property {
  /**
   * The class that property values conform to. The value shall be a class ID
   * declared in the `classes` dictionary of the metadata schema.
   */
  class?: string;
  /**
   * A dictionary, where each key corresponds to a property ID in the class'
   * `properties` dictionary and each value contains the property values. The
   * type of the value shall match the property definition: For `BOOLEAN` use
   * `true` or `false`. For `STRING` use a JSON string. For numeric types use a
   * JSON number. For `ENUM` use a valid enum `name`, not an integer value. For
   * `ARRAY`, `VECN`, and `MATN` types use a JSON array containing values
   * matching the `componentType`. Required properties shall be included in this
   * dictionary.
   */
  properties?: Record<
    string,
    number | string | boolean | number[] | string[] | boolean[] | number[][]
  >;
}
/** @internal */
export namespace EXT_structural_metadata {
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
     * defining the property. Property IDs must be alphanumeric identifiers
     * matching the regular expression `^[a-zA-Z_][a-zA-Z0-9_]*$`.
     */
    properties?: Record<string, EXT_structural_metadata.Class.Property>;
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
       * The element type.
       *
       * Allowed values:
       *
       * - `"SCALAR"`
       * - `"VEC2"`
       * - `"VEC3"`
       * - `"VEC4"`
       * - `"MAT2"`
       * - `"MAT3"`
       * - `"MAT4"`
       * - `"STRING"`
       * - `"BOOLEAN"`
       * - `"ENUM"`
       */
      type: string;
      /**
       * The datatype of the element's components. Only applicable to `SCALAR`,
       * `VECN`, and `MATN` types.
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
       */
      componentType?: string;
      /**
       * Enum ID as declared in the `enums` dictionary. Required when `type` is
       * `ENUM`.
       */
      enumType?: string;
      /**
       * Whether the property is an array. When `count` is defined the property
       * is a fixed-length array. Otherwise the property is a variable-length
       * array.
       *
       * @default false
       */
      array?: boolean;
      /**
       * The number of array elements. May only be defined when `array` is true.
       */
      count?: number;
      /**
       * Specifies whether integer values are normalized. Only applicable to
       * `SCALAR`, `VECN`, and `MATN` types with integer component types. For
       * unsigned integer component types, values are normalized between
       * `[0.0, 1.0]`. For signed integer component types, values are normalized
       * between `[-1.0, 1.0]`. For all other component types, this property
       * must be false.
       *
       * @default false
       */
      normalized?: boolean;
      /**
       * An offset to apply to property values. Only applicable to `SCALAR`,
       * `VECN`, and `MATN` types when the component type is `FLOAT32` or
       * `FLOAT64`, or when the property is `normalized`.
       */
      offset?: number | number[] | number[][];
      /**
       * A scale to apply to property values. Only applicable to `SCALAR`,
       * `VECN`, and `MATN` types when the component type is `FLOAT32` or
       * `FLOAT64`, or when the property is `normalized`.
       */
      scale?: number | number[] | number[][];
      /**
       * Maximum allowed value for the property. Only applicable to `SCALAR`,
       * `VECN`, and `MATN` types. This is the maximum of all property values,
       * after the transforms based on the `normalized`, `offset`, and `scale`
       * properties have been applied.
       */
      max?: number | number[] | number[][];
      /**
       * Minimum allowed value for the property. Only applicable to `SCALAR`,
       * `VECN`, and `MATN` types. This is the minimum of all property values,
       * after the transforms based on the `normalized`, `offset`, and `scale`
       * properties have been applied.
       */
      min?: number | number[] | number[][];
      /**
       * If required, the property must be present in every entity conforming to
       * the class. If not required, individual entities may include `noData`
       * values, or the entire property may be omitted. As a result, `noData`
       * has no effect on a required property. Client implementations may use
       * required properties to make performance optimizations.
       *
       * @default false
       */
      required?: boolean;
      /**
       * A `noData` value represents missing data — also known as a sentinel
       * value — wherever it appears. `BOOLEAN` properties may not specify
       * `noData` values. This is given as the plain property value, without the
       * transforms from the `normalized`, `offset`, and `scale` properties.
       * Must not be defined if `required` is true.
       */
      noData?: number | string | number[] | string[] | number[][];
      /**
       * A default value to use when encountering a `noData` value or an omitted
       * property. The value is given in its final form, taking the effect of
       * `normalized`, `offset`, and `scale` properties into account. Must not
       * be defined if `required` is true.
       */
      default?:
        | number
        | string
        | boolean
        | number[]
        | string[]
        | boolean[]
        | number[][];
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
    values: EXT_structural_metadata.Enum.Value[];
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
   * glTF extension that provides structural metadata about vertices, texels,
   * and features in a glTF asset.
   */
  export interface Gltf extends Gltf2.Property {
    /**
     * An object defining classes and enums.
     */
    schema?: EXT_structural_metadata.Schema;
    /**
     * The URI (or IRI) of the external schema file.
     */
    schemaUri?: string;
    /**
     * An array of property table definitions, which may be referenced by index.
     */
    propertyTables?: EXT_structural_metadata.PropertyTable[];
    /**
     * An array of property texture definitions, which may be referenced by
     * index.
     */
    propertyTextures?: EXT_structural_metadata.PropertyTexture[];
    /**
     * An array of property attribute definitions, which may be referenced by
     * index.
     */
    propertyAttributes?: EXT_structural_metadata.PropertyAttribute[];
    /**
     * An object containing statistics about metadata entities.
     */
    statistics?: EXT_structural_metadata.Statistics;
  }
  export namespace Mesh {
    /**
     * Structural metadata about a glTF primitive.
     */
    export interface Primitive extends Gltf2.Property {
      /**
       * An array of indexes of property textures in the root
       * `EXT_structural_metadata` object.
       */
      propertyTextures?: number[];
      /**
       * An array of indexes of property attributes in the root
       * `EXT_structural_metadata` object.
       */
      propertyAttributes?: number[];
    }
  }
  export namespace Node {
    /**
     * Structural metadata about EXT_voxels attributes.
     */
    export interface EXT_voxels extends Gltf2.Property {
      /**
       * An array of indexes of property attributes in the root
       * `EXT_structural_metadata` object.
       */
      propertyAttributes?: number[];
    }
  }
  /**
   * Properties conforming to a class, organized as property values stored in
   * attributes.
   */
  export interface PropertyAttribute extends Gltf2.Property {
    /**
     * The name of the property attribute, e.g. for display purposes.
     */
    name?: string;
    /**
     * The class that property values conform to. The value must be a class ID
     * declared in the `classes` dictionary.
     */
    class: string;
    /**
     * A dictionary, where each key corresponds to a property ID in the class'
     * `properties` dictionary and each value is an object describing where
     * property values are stored. Required properties must be included in this
     * dictionary.
     */
    properties?: Record<
      string,
      EXT_structural_metadata.PropertyAttribute.Property
    >;
  }
  export namespace PropertyAttribute {
    /**
     * An attribute containing property values.
     */
    export interface Property extends Gltf2.Property {
      /**
       * The name of the attribute containing property values.
       */
      attribute: string;
      /**
       * An offset to apply to property values. Only applicable when the
       * component type is `FLOAT32` or `FLOAT64`, or when the property is
       * `normalized`. Overrides the class property's `offset` if both are
       * defined.
       */
      offset?: number | number[] | number[][];
      /**
       * A scale to apply to property values. Only applicable when the component
       * type is `FLOAT32` or `FLOAT64`, or when the property is `normalized`.
       * Overrides the class property's `scale` if both are defined.
       */
      scale?: number | number[] | number[][];
      /**
       * Maximum value present in the property values. Only applicable to
       * `SCALAR`, `VECN`, and `MATN` types. This is the maximum of all property
       * values, after the transforms based on the `normalized`, `offset`, and
       * `scale` properties have been applied.
       */
      max?: number | number[] | number[][];
      /**
       * Minimum value present in the property values. Only applicable to
       * `SCALAR`, `VECN`, and `MATN` types. This is the minimum of all property
       * values, after the transforms based on the `normalized`, `offset`, and
       * `scale` properties have been applied.
       */
      min?: number | number[] | number[][];
    }
  }
  /**
   * Properties conforming to a class, organized as property values stored in
   * binary columnar arrays.
   */
  export interface PropertyTable extends Gltf2.Property {
    /**
     * The name of the property table, e.g. for display purposes.
     */
    name?: string;
    /**
     * The class that property values conform to. The value must be a class ID
     * declared in the `classes` dictionary.
     */
    class: string;
    /**
     * The number of elements in each property array.
     */
    count: number;
    /**
     * A dictionary, where each key corresponds to a property ID in the class'
     * `properties` dictionary and each value is an object describing where
     * property values are stored. Required properties must be included in this
     * dictionary.
     */
    properties?: Record<string, EXT_structural_metadata.PropertyTable.Property>;
  }
  export namespace PropertyTable {
    /**
     * An array of binary property values.
     */
    export interface Property extends Gltf2.Property {
      /**
       * The index of the buffer view containing property values. The data type
       * of property values is determined by the property definition: When
       * `type` is `BOOLEAN` values are packed into a bitstream. When `type` is
       * `STRING` values are stored as byte sequences and decoded as UTF-8
       * strings. When `type` is `SCALAR`, `VECN`, or `MATN` the values are
       * stored as the provided `componentType` and the buffer view `byteOffset`
       * must be aligned to a multiple of the `componentType` size. When `type`
       * is `ENUM` values are stored as the enum's `valueType` and the buffer
       * view `byteOffset` must be aligned to a multiple of the `valueType`
       * size. Each enum value in the array must match one of the allowed values
       * in the enum definition. `arrayOffsets` is required for variable-length
       * arrays and `stringOffsets` is required for strings (for variable-length
       * arrays of strings, both are required).
       */
      values: number;
      /**
       * The index of the buffer view containing offsets for variable-length
       * arrays. The number of offsets is equal to the property table `count`
       * plus one. The offsets represent the start positions of each array, with
       * the last offset representing the position after the last array. The
       * array length is computed using the difference between the subsequent
       * offset and the current offset. If `type` is `STRING` the offsets index
       * into the string offsets array (stored in `stringOffsets`), otherwise
       * they index into the property array (stored in `values`). The data type
       * of these offsets is determined by `arrayOffsetType`. The buffer view
       * `byteOffset` must be aligned to a multiple of the `arrayOffsetType`
       * size.
       */
      arrayOffsets?: number;
      /**
       * The index of the buffer view containing offsets for strings. The number
       * of offsets is equal to the number of string elements plus one. The
       * offsets represent the byte offsets of each string in the property array
       * (stored in `values`), with the last offset representing the byte offset
       * after the last string. The string byte length is computed using the
       * difference between the subsequent offset and the current offset. The
       * data type of these offsets is determined by `stringOffsetType`. The
       * buffer view `byteOffset` must be aligned to a multiple of the
       * `stringOffsetType` size.
       */
      stringOffsets?: number;
      /**
       * The type of values in `arrayOffsets`.
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
      arrayOffsetType?: string;
      /**
       * The type of values in `stringOffsets`.
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
      stringOffsetType?: string;
      /**
       * An offset to apply to property values. Only applicable when the
       * component type is `FLOAT32` or `FLOAT64`, or when the property is
       * `normalized`. Overrides the class property's `offset` if both are
       * defined.
       */
      offset?: number | number[] | number[][];
      /**
       * A scale to apply to property values. Only applicable when the component
       * type is `FLOAT32` or `FLOAT64`, or when the property is `normalized`.
       * Overrides the class property's `scale` if both are defined.
       */
      scale?: number | number[] | number[][];
      /**
       * Maximum value present in the property values. Only applicable to
       * `SCALAR`, `VECN`, and `MATN` types. This is the maximum of all property
       * values, after the transforms based on the `normalized`, `offset`, and
       * `scale` properties have been applied.
       */
      max?: number | number[] | number[][];
      /**
       * Minimum value present in the property values. Only applicable to
       * `SCALAR`, `VECN`, and `MATN` types. This is the minimum of all property
       * values, after the transforms based on the `normalized`, `offset`, and
       * `scale` properties have been applied.
       */
      min?: number | number[] | number[][];
    }
  }
  /**
   * Properties conforming to a class, organized as property values stored in
   * textures.
   */
  export interface PropertyTexture extends Gltf2.Property {
    /**
     * The name of the property texture, e.g. for display purposes.
     */
    name?: string;
    /**
     * The class that property values conform to. The value must be a class ID
     * declared in the `classes` dictionary.
     */
    class: string;
    /**
     * A dictionary, where each key corresponds to a property ID in the class'
     * `properties` dictionary and each value is an object describing where
     * property values are stored. Required properties must be included in this
     * dictionary.
     */
    properties?: Record<
      string,
      EXT_structural_metadata.PropertyTexture.Property
    >;
  }
  export namespace PropertyTexture {
    /**
     * A texture containing property values.
     */
    export interface Property extends Gltf2.Material.TextureInfo {
      /**
       * Texture channels containing property values, identified by index. The
       * values may be packed into multiple channels if a single channel does
       * not have sufficient bit depth. The values are packed in little-endian
       * order.
       *
       * @default [0]
       */
      channels?: number[];
      /**
       * An offset to apply to property values. Only applicable when the
       * component type is `FLOAT32` or `FLOAT64`, or when the property is
       * `normalized`. Overrides the class property's `offset` if both are
       * defined.
       */
      offset?: number | number[] | number[][];
      /**
       * A scale to apply to property values. Only applicable when the component
       * type is `FLOAT32` or `FLOAT64`, or when the property is `normalized`.
       * Overrides the class property's `scale` if both are defined.
       */
      scale?: number | number[] | number[][];
      /**
       * Maximum value present in the property values. Only applicable to
       * `SCALAR`, `VECN`, and `MATN` types. This is the maximum of all property
       * values, after the transforms based on the `normalized`, `offset`, and
       * `scale` properties have been applied.
       */
      max?: number | number[] | number[][];
      /**
       * Minimum value present in the property values. Only applicable to
       * `SCALAR`, `VECN`, and `MATN` types. This is the minimum of all property
       * values, after the transforms based on the `normalized`, `offset`, and
       * `scale` properties have been applied.
       */
      min?: number | number[] | number[][];
    }
  }
  /**
   * An object defining classes and enums.
   */
  export interface Schema extends Gltf2.Property {
    /**
     * Unique identifier for the schema. Schema IDs must be alphanumeric
     * identifiers matching the regular expression `^[a-zA-Z_][a-zA-Z0-9_]*$`.
     */
    id: string;
    /**
     * The name of the schema, e.g. for display purposes.
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
     * defining the class. Class IDs must be alphanumeric identifiers matching
     * the regular expression `^[a-zA-Z_][a-zA-Z0-9_]*$`.
     */
    classes?: Record<string, EXT_structural_metadata.Class>;
    /**
     * A dictionary, where each key is an enum ID and each value is an object
     * defining the values for the enum. Enum IDs must be alphanumeric
     * identifiers matching the regular expression `^[a-zA-Z_][a-zA-Z0-9_]*$`.
     */
    enums?: Record<string, EXT_structural_metadata.Enum>;
  }
  /**
   * Statistics about entities.
   */
  export interface Statistics extends Gltf2.Property {
    /**
     * A dictionary, where each key corresponds to a class ID in the `classes`
     * dictionary of the metatata schema that was defined for the asset that
     * contains these statistics. Each value is an object containing statistics
     * about entities that conform to the class.
     */
    classes?: Record<string, EXT_structural_metadata.Statistics.Class>;
  }
  export namespace Statistics {
    /**
     * Statistics about entities that conform to a class that was defined in a
     * metadata schema.
     */
    export interface Class extends Gltf2.Property {
      /**
       * The number of entities that conform to the class.
       */
      count?: number;
      /**
       * A dictionary, where each key corresponds to a property ID in the class'
       * `properties` dictionary and each value is an object containing
       * statistics about property values.
       */
      properties?: Record<
        string,
        EXT_structural_metadata.Statistics.Class.Property
      >;
    }
    export namespace Class {
      /**
       * Statistics about property values.
       */
      export interface Property extends Gltf2.Property {
        /**
         * The minimum property value occurring in the asset. Only applicable to
         * `SCALAR`, `VECN`, and `MATN` types. This is the minimum of all
         * property values, after the transforms based on the `normalized`,
         * `offset`, and `scale` properties have been applied.
         */
        min?: number | number[] | number[][];
        /**
         * The maximum property value occurring in the asset. Only applicable to
         * `SCALAR`, `VECN`, and `MATN` types. This is the maximum of all
         * property values, after the transforms based on the `normalized`,
         * `offset`, and `scale` properties have been applied.
         */
        max?: number | number[] | number[][];
        /**
         * The arithmetic mean of property values occurring in the asset. Only
         * applicable to `SCALAR`, `VECN`, and `MATN` types. This is the mean of
         * all property values, after the transforms based on the `normalized`,
         * `offset`, and `scale` properties have been applied.
         */
        mean?: number | number[] | number[][];
        /**
         * The median of property values occurring in the asset. Only applicable
         * to `SCALAR`, `VECN`, and `MATN` types. This is the median of all
         * property values, after the transforms based on the `normalized`,
         * `offset`, and `scale` properties have been applied.
         */
        median?: number | number[] | number[][];
        /**
         * The standard deviation of property values occurring in the asset.
         * Only applicable to `SCALAR`, `VECN`, and `MATN` types. This is the
         * standard deviation of all property values, after the transforms based
         * on the `normalized`, `offset`, and `scale` properties have been
         * applied.
         */
        standardDeviation?: number | number[] | number[][];
        /**
         * The variance of property values occurring in the asset. Only
         * applicable to `SCALAR`, `VECN`, and `MATN` types. This is the
         * variance of all property values, after the transforms based on the
         * `normalized`, `offset`, and `scale` properties have been applied.
         */
        variance?: number | number[] | number[][];
        /**
         * The sum of property values occurring in the asset. Only applicable to
         * `SCALAR`, `VECN`, and `MATN` types. This is the sum of all property
         * values, after the transforms based on the `normalized`, `offset`, and
         * `scale` properties have been applied.
         */
        sum?: number | number[] | number[][];
        /**
         * A dictionary, where each key corresponds to an enum `name` and each
         * value is the number of occurrences of that enum. Only applicable when
         * `type` is `ENUM`. For fixed-length arrays, this is an array of
         * component-wise occurrences.
         */
        occurrences?: Record<string, number | number[]>;
      }
    }
  }
}
