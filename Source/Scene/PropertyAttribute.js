import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import PropertyAttributeProperty from "./PropertyAttributeProperty.js";

/**
 * A property attribute; a collection of per-point properties stored as custom
 * vertex attributes.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata|EXT_structural_metadata Extension}
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {String} [options.name] Optional human-readable name to describe the attribute
 * @param {Number} [options.id] A unique id to identify the property attribute, useful for debugging. This is the array index in the property attributes array
 * @param {Object} options.propertyAttribute The property attribute JSON, following the EXT_structural_metadata schema.
 * @param {MetadataClass} options.class The class that properties conform to.
 *
 * @alias PropertyAttribute
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function PropertyAttribute(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const propertyAttribute = options.propertyAttribute;
  const classDefinition = options.class;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.propertyAttribute", propertyAttribute);
  Check.typeOf.object("options.class", classDefinition);
  //>>includeEnd('debug');

  const properties = {};
  if (defined(propertyAttribute.properties)) {
    for (const propertyId in propertyAttribute.properties) {
      if (propertyAttribute.properties.hasOwnProperty(propertyId)) {
        properties[propertyId] = new PropertyAttributeProperty({
          property: propertyAttribute.properties[propertyId],
          classProperty: classDefinition.properties[propertyId],
        });
      }
    }
  }

  this._name = options.name;
  this._id = options.id;
  this._class = classDefinition;
  this._properties = properties;
  this._extras = propertyAttribute.extras;
  this._extensions = propertyAttribute.extensions;
}

Object.defineProperties(PropertyAttribute.prototype, {
  /**
   * A human-readable name for this attribute
   *
   * @memberof PropertyAttribute.prototype
   *
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
   * An identifier for this attribute. Useful for debugging.
   *
   * @memberof PropertyAttribute.prototype
   *
   * @type {String|Number}
   * @readonly
   * @private
   */
  id: {
    get: function () {
      return this._id;
    },
  },
  /**
   * The class that properties conform to.
   *
   * @memberof PropertyAttribute.prototype
   *
   * @type {MetadataClass}
   * @readonly
   * @private
   */
  class: {
    get: function () {
      return this._class;
    },
  },

  /**
   * The properties in this property attribute.
   *
   * @memberof PropertyAttribute.prototype
   *
   * @type {Object.<String, PropertyAttributeProperty>}
   * @readonly
   * @private
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof PropertyAttribute.prototype
   *
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
   * @memberof PropertyAttribute.prototype
   *
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

/**
 * Gets the property with the given property ID.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {PropertyAttributeProperty|undefined} The property, or <code>undefined</code> if the property does not exist.
 * @private
 */
PropertyAttribute.prototype.getProperty = function (propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  return this._properties[propertyId];
};

export default PropertyAttribute;
