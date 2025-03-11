import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Frozen from "../Core/Frozen.js";
import MetadataEnumValue from "./MetadataEnumValue.js";
import MetadataComponentType from "./MetadataComponentType.js";

/**
 * A metadata enum.
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Metadata|3D Metadata Specification} for 3D Tiles
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {string} options.id The ID of the enum.
 * @param {MetadataEnumValue[]} options.values The enum values.
 * @param {MetadataComponentType} [options.valueType=MetadataComponentType.UINT16] The enum value type.
 * @param {string} [options.name] The name of the enum.
 * @param {string} [options.description] The description of the enum.
 * @param {*} [options.extras] Extra user-defined properties.
 * @param {object} [options.extensions] An object containing extensions.
 *
 * @alias MetadataEnum
 * @constructor
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataEnum(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const id = options.id;
  const values = options.values;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.defined("options.values", values);
  //>>includeEnd('debug');

  const namesByValue = {};
  const valuesByName = {};

  const valuesLength = values.length;
  for (let i = 0; i < valuesLength; ++i) {
    const value = values[i];
    namesByValue[value.value] = value.name;
    valuesByName[value.name] = value.value;
  }

  const valueType = options.valueType ?? MetadataComponentType.UINT16;

  this._values = values;
  this._namesByValue = namesByValue;
  this._valuesByName = valuesByName;
  this._valueType = valueType;
  this._id = id;
  this._name = options.name;
  this._description = options.description;
  this._extras = clone(options.extras, true);
  this._extensions = clone(options.extensions, true);
}

/**
 * Creates a {@link MetadataEnum} from either 3D Tiles 1.1, 3DTILES_metadata, EXT_structural_metadata, or EXT_feature_metadata.
 *
 * @param {object} options Object with the following properties:
 * @param {string} options.id The ID of the enum.
 * @param {object} options.enum The enum JSON object.
 *
 * @returns {MetadataEnum} The newly created metadata enum.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
MetadataEnum.fromJson = function (options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const id = options.id;
  const enumDefinition = options.enum;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.enum", enumDefinition);
  //>>includeEnd('debug');

  const values = enumDefinition.values.map(function (value) {
    return MetadataEnumValue.fromJson(value);
  });

  return new MetadataEnum({
    id: id,
    values: values,
    valueType: MetadataComponentType[enumDefinition.valueType],
    name: enumDefinition.name,
    description: enumDefinition.description,
    extras: enumDefinition.extras,
    extensions: enumDefinition.extensions,
  });
};

Object.defineProperties(MetadataEnum.prototype, {
  /**
   * The enum values.
   *
   * @memberof MetadataEnum.prototype
   * @type {MetadataEnumValue[]}
   * @readonly
   */
  values: {
    get: function () {
      return this._values;
    },
  },

  /**
   * A dictionary mapping enum integer values to names.
   *
   * @memberof MetadataEnum.prototype
   * @type {Object<number, string>}
   * @readonly
   *
   * @private
   */
  namesByValue: {
    get: function () {
      return this._namesByValue;
    },
  },

  /**
   * A dictionary mapping enum names to integer values.
   *
   * @memberof MetadataEnum.prototype
   * @type {Object<string, number>}
   * @readonly
   *
   * @private
   */
  valuesByName: {
    get: function () {
      return this._valuesByName;
    },
  },

  /**
   * The enum value type.
   *
   * @memberof MetadataEnum.prototype
   * @type {MetadataComponentType}
   * @readonly
   */
  valueType: {
    get: function () {
      return this._valueType;
    },
  },

  /**
   * The ID of the enum.
   *
   * @memberof MetadataEnum.prototype
   * @type {string}
   * @readonly
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * The name of the enum.
   *
   * @memberof MetadataEnum.prototype
   * @type {string}
   * @readonly
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * The description of the enum.
   *
   * @memberof MetadataEnum.prototype
   * @type {string}
   * @readonly
   */
  description: {
    get: function () {
      return this._description;
    },
  },

  /**
   * Extra user-defined properties.
   *
   * @memberof MetadataEnum.prototype
   * @type {*}
   * @readonly
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * An object containing extensions.
   *
   * @memberof MetadataEnum.prototype
   * @type {object}
   * @readonly
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },
});

export default MetadataEnum;
