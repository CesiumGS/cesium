import Check from "../Core/Check.js";

/**
 * A metadata enum value.
 *
 * @param {Object} value The enum value JSON object.
 *
 * @alias MetadataEnumValue
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataEnumValue(value) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  //>>includeEnd('debug');

  this._value = value.value;
  this._name = value.name;
  this._description = value.description;
  this._extras = value.extras;
  this._extensions = value.extensions;
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

  /**
   * Extensions in the JSON object.
   *
   * @memberof MetadataEnumValue.prototype
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

export default MetadataEnumValue;
