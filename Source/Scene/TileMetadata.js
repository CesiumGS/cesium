import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import MetadataEntity from "./MetadataEntity.js";

/**
 * Metadata about a 3D Tile. This represents the <code>3DTILES_metadata</code>
 * extension on a single {@link Cesium3DTile}
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.tile The extension JSON attached to the tile.
 * @param {MetadataClass} [options.class] The class that the tile metadata conforms to.
 *
 * @alias TileMetadata
 * @constructor
 */
export default function TileMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.tile", options.tile);
  //>>includeEnd('debug');

  this._class = options.class;

  var tileMetadata = options.tile;
  this._properties = tileMetadata.properties;
  this._extensions = tileMetadata.extensions;
  this._extras = tileMetadata.extras;
}

Object.defineProperties(TileMetadata.prototype, {
  /**
   * The class that properties conform to.
   *
   * @memberof TileMetadata.prototype
   * @type {MetadataClass}
   * @readonly
   */
  class: {
    get: function () {
      return this._class;
    },
  },

  /**
   * A dictionary containing properties.
   *
   * @memberof TileMetadata.prototype
   * @type {Object}
   * @readonly
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof TileMetadata.prototype
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
   * @memberof TileMetadata.prototype
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
TileMetadata.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(this, propertyId);
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 */
TileMetadata.prototype.getPropertyIds = function (results) {
  return MetadataEntity.getPropertyIds(this, results);
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
TileMetadata.prototype.getProperty = function (propertyId) {
  return MetadataEntity.getProperty(this, propertyId);
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If the property is normalized a normalized value must be provided to this function.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 */
TileMetadata.prototype.setProperty = function (propertyId, value) {
  MetadataEntity.setProperty(this, propertyId, value);
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
TileMetadata.prototype.getPropertyBySemantic = function (semantic) {
  return MetadataEntity.getPropertyBySemantic(this, semantic);
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 * @exception {DeveloperError} If a property with the given semantic doesn't exist.
 */
TileMetadata.prototype.setPropertyBySemantic = function (semantic, value) {
  MetadataEntity.setPropertyBySemantic(this, semantic, value);
};
