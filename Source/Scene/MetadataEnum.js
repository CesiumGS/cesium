import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import MetadataEnumValue from "./MetadataEnumValue.js";
import MetadataComponentType from "./MetadataComponentType.js";

/**
 * A metadata enum.
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.id The ID of the enum.
 * @param {Object} options.enum The enum JSON object.
 *
 * @alias MetadataEnum
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataEnum(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const id = options.id;
  const enumDefinition = options.enum;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.enum", enumDefinition);
  //>>includeEnd('debug');

  const namesByValue = {};
  const valuesByName = {};
  const values = enumDefinition.values.map(function (value) {
    namesByValue[value.value] = value.name;
    valuesByName[value.name] = value.value;
    return new MetadataEnumValue(value);
  });

  const valueType = defaultValue(
    MetadataComponentType[enumDefinition.valueType],
    MetadataComponentType.UINT16
  );

  this._values = values;
  this._namesByValue = namesByValue;
  this._valuesByName = valuesByName;
  this._valueType = valueType;
  this._id = id;
  this._name = enumDefinition.name;
  this._description = enumDefinition.description;
  this._extras = enumDefinition.extras;
  this._extensions = enumDefinition.extensions;
}

Object.defineProperties(MetadataEnum.prototype, {
  /**
   * The enum values.
   *
   * @memberof MetadataEnum.prototype
   * @type {MetadataEnumValue[]}
   * @readonly
   * @private
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
   * @type {Object.<Number, String>}
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
   * @type {Object.<String, Number>}
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
   *
   * @private
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
   * @type {String}
   * @readonly
   * @private
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
   * @type {String}
   * @readonly
   * @private
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
   * @type {String}
   * @readonly
   * @private
   */
  description: {
    get: function () {
      return this._description;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof MetadataEnum.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * Extensions in the JSON object.
   *
   * @memberof MetadataEnum.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },
});

export default MetadataEnum;
