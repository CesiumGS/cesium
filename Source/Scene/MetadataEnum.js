import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import MetadataEnumValue from "./MetadataEnumValue.js";
import MetadataType from "./MetadataType.js";

/**
 * A metadata enum.
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.id The ID of the enum.
 * @param {Object} options.enum The enum JSON object.
 *
 * @alias MetadataEnum
 * @constructor
 *
 * @private
 */
function MetadataEnum(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var id = options.id;
  var enumDefinition = options.enum;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.enum", enumDefinition);
  //>>includeEnd('debug');

  var namesByValue = {};
  var valuesByName = {};
  var values = enumDefinition.values.map(function (value) {
    namesByValue[value.value] = value.name;
    valuesByName[value.name] = value.value;
    return new MetadataEnumValue(value);
  });

  var valueType = defaultValue(
    MetadataType[enumDefinition.valueType],
    MetadataType.INT32
  );

  this._values = values;
  this._namesByValue = namesByValue;
  this._valuesByName = valuesByName;
  this._valueType = valueType;
  this._id = id;
  this._name = enumDefinition.name;
  this._description = enumDefinition.description;
  this._extras = clone(enumDefinition.extras, true); // Clone so that this object doesn't hold on to a reference to the JSON
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
   * @type {MetadataType}
   * @readonly
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
});

export default MetadataEnum;
