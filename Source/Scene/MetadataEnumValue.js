import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";

/**
 * A metadata enum value.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.value The enum value JSON object.
 *
 * @alias MetadataEnumValue
 * @constructor
 *
 * @private
 */
function MetadataEnumValue(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var value = options.value;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.value", value);
  //>>includeEnd('debug');

  this._value = value.value;
  this._name = value.name;
  this._description = value.description;
  this._extras = clone(enumDefinition.extras, true); // Clone so that this object doesn't hold on to a reference to the JSON
}

Object.defineProperties(MetadataEnumValue.prototype, {
  /**
   * The integer value.
   *
   * @memberof MetadataEnumValue.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  value: {
    get: function () {
      return this._value;
    },
  },

  /**
   * The name of the enum value.
   *
   * @memberof MetadataEnumValue.prototype
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
   * The description of the enum value.
   *
   * @memberof MetadataEnumValue.prototype
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
   * @memberof MetadataEnumValue.prototype
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

export default MetadataEnumValue;
