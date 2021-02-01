import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataEntity from "./MetadataEntity.js";

/**
 * Metadata about the tileset.
 * <p>
 * Implements the {@link MetadataEntity} interface.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.tileset The tileset metadata JSON object.
 * @param {MetadataClass} [options.class] The class that tileset metadata conforms to.
 *
 * @alias MetadataTileset
 * @constructor
 *
 * @private
 */
function MetadataTileset(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var tileset = options.tileset;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.tileset", tileset);
  //>>includeEnd('debug');

  var properties = defined(tileset.properties)
    ? clone(tileset.properties, true) // Clone so that this object doesn't hold on to a reference to the JSON
    : {};

  this._class = options.class;
  this._properties = properties;
  this._name = tileset.name;
  this._description = tileset.description;
  this._extras = clone(tileset.extras, true); // Clone so that this object doesn't hold on to a reference to the JSON
}

/**
 * Returns whether this property exists.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether this property exists.
 */
MetadataTileset.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(this, propertyId);
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 */
MetadataTileset.prototype.getPropertyIds = function (results) {
  return MetadataEntity.getPropertyIds(this, results);
};

/**
 * Returns a copy of the value of the property with the given ID.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
MetadataTileset.prototype.getProperty = function (propertyId) {
  return MetadataEntity.getProperty(this, propertyId);
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If a property with the given ID doesn't exist, it is created.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 */
MetadataTileset.prototype.setProperty = function (propertyId, value) {
  MetadataEntity.setProperty(this, propertyId, value);
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
MetadataTileset.prototype.getPropertyBySemantic = function (semantic) {
  return MetadataEntity.getPropertyBySemantic(this, semantic);
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 */
MetadataTileset.prototype.setPropertyBySemantic = function (semantic, value) {
  MetadataEntity.setPropertyBySemantic(this, semantic, value);
};

Object.defineProperties(MetadataTileset.prototype, {
  /**
   * The class that properties conforms to.
   *
   * @memberof MetadataTileset.prototype
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
   * A dictionary containing properties.
   *
   * @memberof MetadataTileset.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * The name of the tileset.
   *
   * @memberof MetadataTileset.prototype
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
   * The description of the tileset.
   *
   * @memberof MetadataTileset.prototype
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
   * @memberof MetadataTileset.prototype
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

export default MetadataTileset;
