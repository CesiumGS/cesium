import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataEntity from "./MetadataEntity.js";

/**
 * Metadata about the tileset.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.tileset The tileset metadata JSON object.
 * @param {MetadataClass} [options.class] The class that tileset metadata conforms to.
 *
 * @alias TilesetMetadata
 * @constructor
 */
function TilesetMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var tileset = options.tileset;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.tileset", tileset);
  //>>includeEnd('debug');

  var properties = defined(tileset.properties) ? tileset.properties : {};

  this._class = options.class;
  this._properties = properties;
  this._name = tileset.name;
  this._description = tileset.description;
  this._extras = tileset.extras;
  this._extensions = tileset.extensions;
}

Object.defineProperties(TilesetMetadata.prototype, {
  /**
   * The class that properties conform to.
   *
   * @memberof TilesetMetadata.prototype
   * @type {MetadataClass}
   * @readonly
   */
  class: {
    get: function () {
      return this._class;
    },
  },

  /**
   * The name of the tileset.
   *
   * @memberof TilesetMetadata.prototype
   * @type {String}
   * @readonly
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * The description of the tileset.
   *
   * @memberof TilesetMetadata.prototype
   * @type {String}
   * @readonly
   */
  description: {
    get: function () {
      return this._description;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof TilesetMetadata.prototype
   * @type {*}
   * @readonly
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * Extensions in the JSON object.
   *
   * @memberof TilesetMetadata.prototype
   * @type {Object}
   * @readonly
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },
});

/**
 * Returns whether this property exists.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether this property exists.
 */
TilesetMetadata.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(propertyId, this._properties, this._class);
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 */
TilesetMetadata.prototype.getPropertyIds = function (results) {
  return MetadataEntity.getPropertyIds(this._properties, this._class, results);
};

/**
 * Returns a copy of the value of the property with the given ID.
 * <p>
 * If the property is normalized the normalized value is returned.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
TilesetMetadata.prototype.getProperty = function (propertyId) {
  return MetadataEntity.getProperty(propertyId, this._properties, this._class);
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If the property is normalized a normalized value must be provided to this function.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 */
TilesetMetadata.prototype.setProperty = function (propertyId, value) {
  return MetadataEntity.setProperty(
    propertyId,
    value,
    this._properties,
    this._class
  );
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
TilesetMetadata.prototype.getPropertyBySemantic = function (semantic) {
  return MetadataEntity.getPropertyBySemantic(
    semantic,
    this._properties,
    this._class
  );
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 */
TilesetMetadata.prototype.setPropertyBySemantic = function (semantic, value) {
  return MetadataEntity.setPropertyBySemantic(
    semantic,
    value,
    this._properties,
    this._class
  );
};

export default TilesetMetadata;
