import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";

/**
 * Metadata about a 3D tile, from a <code>3DTILES_metadata</code> extension
 * within a subtree from the <code>3DTILES_implicit_tiling</code> extension
 * <p>
 * This class is used in place of a {@link TileMetadata} object, as implicit
 * tile metadata is stored in a {@link MetadataTable} rather than a JSON object.
 * </p>
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles
 * </p>
 *
 * @param {ImplicitSubtree} options.implicitSubtree The implicit subtree the tile belongs to. It is assumed that the subtree's readyPromise has already resolved.
 * @param {ImplicitTileCoordinates} options.implicitCoordinates Implicit tiling coordinates for the tile.
 * @param {MetadataClass} options.class The class that the tile metadata conforms to.
 *
 * @alias ImplicitTileMetadata
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function ImplicitTileMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.implicitSubtree", options.implicitSubtree);
  Check.typeOf.object(
    "options.implicitCoordinates",
    options.implicitCoordinates
  );
  Check.typeOf.object("options.class", options.class);
  //>>includeEnd('debug');

  this._class = options.class;

  const subtree = options.implicitSubtree;
  this._metadataTable = subtree.tileMetadataTable;
  this._entityId = subtree.getEntityId(options.implicitCoordinates);

  const subtreeExtension = subtree.tileMetadataExtension;
  this._extensions = subtreeExtension.extensions;
  this._extras = subtreeExtension.extras;
}

Object.defineProperties(ImplicitTileMetadata.prototype, {
  /**
   * The class that properties conform to.
   *
   * @memberof ImplicitTileMetadata.prototype
   * @type {MetadataClass}
   * @readonly
   */
  class: {
    get: function () {
      return this._class;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof ImplicitTileMetadata.prototype
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
   * @memberof ImplicitTileMetadata.prototype
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
 * Returns whether the tile has this property.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether the tile has this property.
 * @private
 */
ImplicitTileMetadata.prototype.hasProperty = function (propertyId) {
  return this._metadataTable.hasProperty(propertyId);
};

/**
 * Returns whether the tile has a property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {Boolean} Whether the tile has a property with the given semantic.
 * @private
 */
ImplicitTileMetadata.prototype.hasPropertyBySemantic = function (semantic) {
  return this._metadataTable.hasPropertyBySemantic(semantic);
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 * @private
 */
ImplicitTileMetadata.prototype.getPropertyIds = function (results) {
  return this._metadataTable.getPropertyIds(results);
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
ImplicitTileMetadata.prototype.getProperty = function (propertyId) {
  return this._metadataTable.getProperty(this._entityId, propertyId);
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
ImplicitTileMetadata.prototype.setProperty = function (propertyId, value) {
  return this._metadataTable.setProperty(this._entityId, propertyId, value);
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the tile does not have this semantic.
 * @private
 */
ImplicitTileMetadata.prototype.getPropertyBySemantic = function (semantic) {
  return this._metadataTable.getPropertyBySemantic(this._entityId, semantic);
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 * @private
 */
ImplicitTileMetadata.prototype.setPropertyBySemantic = function (
  semantic,
  value
) {
  return this._metadataTable.setPropertyBySemantic(
    this._entityId,
    semantic,
    value
  );
};
