import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";

/**
 * A property in a property attribute from EXT_structural_metadata.
 *
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata|EXT_structural_metadata Extension}
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.property The property JSON object.
 * @param {MetadataClassProperty} options.classProperty The class property.
 *
 * @alias PropertyAttributeProperty
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function PropertyAttributeProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const property = options.property;
  const classProperty = options.classProperty;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.property", property);
  Check.typeOf.object("options.classProperty", classProperty);
  //>>includeEnd('debug');

  this._attribute = property.attribute;
  this._offset = property.offset;
  this._scale = property.scale;

  this._extras = property.extras;
  this._extensions = property.extensions;
}

Object.defineProperties(PropertyAttributeProperty.prototype, {
  /**
   * The attribute semantic
   *
   * @memberof PropertyTexture.prototype
   * @type {String}
   * @readonly
   * @private
   */
  attribute: {
    get: function () {
      return this._attribute;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof PropertyAttributeProperty.prototype
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
   * @memberof PropertyAttributeProperty.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },
});
