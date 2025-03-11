import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Frozen from "../Core/Frozen.js";

/**
 * A metadata enum value.
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Metadata|3D Metadata Specification} for 3D Tiles
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {number} options.value The integer value.
 * @param {string} options.name The name of the enum value.
 * @param {string} [options.description] The description of the enum value.
 * @param {*} [options.extras] Extra user-defined properties.
 * @param {object} [options.extensions] An object containing extensions.
 *
 * @alias MetadataEnumValue
 * @constructor
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataEnumValue(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const value = options.value;
  const name = options.name;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("options.value", value);
  Check.typeOf.string("options.name", name);

  //>>includeEnd('debug');

  this._value = value;
  this._name = name;
  this._description = options.description;
  this._extras = clone(options.extras, true);
  this._extensions = clone(options.extensions, true);
}

/**
 * Creates a {@link MetadataEnumValue} from either 3D Tiles 1.1, 3DTILES_metadata, EXT_structural_metadata, or EXT_feature_metadata.
 *
 * @param {object} value The enum value JSON object.
 *
 * @returns {MetadataEnumValue} The newly created metadata enum value.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
MetadataEnumValue.fromJson = function (value) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  //>>includeEnd('debug');

  return new MetadataEnumValue({
    value: value.value,
    name: value.name,
    description: value.description,
    extras: value.extras,
    extensions: value.extensions,
  });
};

Object.defineProperties(MetadataEnumValue.prototype, {
  /**
   * The integer value.
   *
   * @memberof MetadataEnumValue.prototype
   * @type {number}
   * @readonly
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
   * @type {string}
   * @readonly
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
   * @memberof MetadataEnumValue.prototype
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
   * @memberof MetadataEnumValue.prototype
   * @type {object}
   * @readonly
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },
});

export default MetadataEnumValue;
