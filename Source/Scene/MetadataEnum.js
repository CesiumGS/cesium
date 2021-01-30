import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import MetadataEnumType from "./MetadataEnumType.js";
import MetadataEnumValue from "./MetadataEnumValue.js";

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

  var values = enumDefinition.values.map(function (value) {
    return new MetadataEnumValue({
      value: value,
    });
  });

  this._values = values;
  this._valueType = MetadataEnumType[enumDefinition.valueType];
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
   * The enum value type.
   *
   * @memberof MetadataEnum.prototype
   * @type {MetadataEnumType}
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
