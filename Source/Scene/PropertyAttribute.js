import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import PropertyAttributeProperty from "./PropertyAttributeProperty.js";

export default function PropertyAttribute(options) {
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
   * A human-readable name for this texture
   *
   * @memberof PropertyAttribute.prototype
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
   * An identifier for this texture. Useful for debugging.
   *
   * @memberof PropertyAttribute.prototype
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
   * Extras in the JSON object.
   *
   * @memberof PropertyAttribute.prototype
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
