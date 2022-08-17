import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import MetadataEntity from "./MetadataEntity.js";

/**
 * Metadata about a 3D Tile. This represents the tile metadata JSON (3D Tiles 1.1)
 * or the <code>3DTILES_metadata</code> extension on a single {@link Cesium3DTile}
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.tile Either the tile metadata JSON (3D Tiles 1.1), or the extension JSON attached to the tile.
 * @param {MetadataClass} options.class The class that the tile metadata conforms to.
 *
 * @alias TileMetadata
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function TileMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const tile = options.tile;
  const metadataClass = options.class;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.tile", tile);
  Check.typeOf.object("options.class", metadataClass);
  //>>includeEnd('debug');

  this._class = metadataClass;
  this._properties = tile.properties;
  this._extensions = tile.extensions;
  this._extras = tile.extras;
}

Object.defineProperties(TileMetadata.prototype, {
  /**
   * The class that properties conform to.
   *
   * @memberof TileMetadata.prototype
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
   * @memberof TileMetadata.prototype
   * @type {Object}
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
   * @memberof TileMetadata.prototype
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
 * Returns whether the tile has this property.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether the tile has this property.
 * @private
 */
TileMetadata.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(propertyId, this._properties, this._class);
};

/**
 * Returns whether the tile has a property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {Boolean} Whether the tile has a property with the given semantic.
 * @private
 */
TileMetadata.prototype.hasPropertyBySemantic = function (semantic) {
  return MetadataEntity.hasPropertyBySemantic(
    semantic,
    this._properties,
    this._class
  );
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 * @private
 */
TileMetadata.prototype.getPropertyIds = function (results) {
  return MetadataEntity.getPropertyIds(this._properties, this._class, results);
};

/**
 * Returns a copy of the value of the property with the given ID.
 * <p>
 * If the property is normalized the normalized value is returned.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the tile does not have this property.
 * @private
 */
TileMetadata.prototype.getProperty = function (propertyId) {
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
 * @private
 */
TileMetadata.prototype.setProperty = function (propertyId, value) {
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
 * @returns {*} The value of the property or <code>undefined</code> if the tile does not have this semantic.
 * @private
 */
TileMetadata.prototype.getPropertyBySemantic = function (semantic) {
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
 * @private
 */
TileMetadata.prototype.setPropertyBySemantic = function (semantic, value) {
  return MetadataEntity.setPropertyBySemantic(
    semantic,
    value,
    this._properties,
    this._class
  );
};

export default TileMetadata;
