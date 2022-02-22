import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";

/**
 * Metadata about a tile or content in an implicit subtree from the
 * <code>3DTILES_implicit_tiling</code> extension.
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles
 * </p>
 *
 * @param {MetadataTable} options.metadataTable The metadata table.
 * @param {MetadataClass} options.class The class that the metadata conforms to.
 * @param {Number} options.entityId The ID of the entity the metadata belongs to.
 * @param {Number} [options.contentIndex = 0] The index of the content metadata, in the case of multiple contents.
 * @param {Object} options.propertyTableJson The JSON that contains the property table of the entity.
 *
 * @alias ImplicitMetadataTableView
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function ImplicitMetadataTableView(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const metadataTable = options.metadataTable;
  const metadataClass = options.class;
  const entityId = options.entityId;
  const contentIndex = defaultValue(options.contentIndex, 0);
  const propertyTableJson = options.propertyTableJson;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.metadataTable", metadataTable);
  Check.typeOf.object("options.class", metadataClass);
  Check.typeOf.number("options.entityId", entityId);
  Check.typeOf.number("options.contentIndex", contentIndex);
  Check.typeOf.object("options.propertyTableJson", propertyTableJson);

  //>>includeEnd('debug');

  this._class = metadataClass;
  this._metadataTable = metadataTable;
  this._entityId = entityId;
  this._contentIndex = contentIndex;

  this._extensions = propertyTableJson.extensions;
  this._extras = propertyTableJson.extras;
}

Object.defineProperties(ImplicitMetadataTableView.prototype, {
  /**
   * The class that properties conform to.
   *
   * @memberof ImplicitMetadataTableView.prototype
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
   * @memberof ImplicitMetadataTableView.prototype
   * @type {Object}
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
   * @memberof ImplicitMetadataTableView.prototype
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
 * Returns whether the metadata contains this property.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether the tile has this property.
 * @private
 */
ImplicitMetadataTableView.prototype.hasProperty = function (propertyId) {
  return this._metadataTable.hasProperty(propertyId);
};

/**
 * Returns whether the metadata contains a property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {Boolean} Whether the tile has a property with the given semantic.
 * @private
 */
ImplicitMetadataTableView.prototype.hasPropertyBySemantic = function (
  semantic
) {
  return this._metadataTable.hasPropertyBySemantic(semantic);
};

/**
 * Returns an array of property IDs in the metadata able.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 * @private
 */
ImplicitMetadataTableView.prototype.getPropertyIds = function (results) {
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
ImplicitMetadataTableView.prototype.getProperty = function (propertyId) {
  return this._metadataTable.getProperty(this._entityId, propertyId);
};

/**
 * Sets the value of the property with the given ID in the metadata table.
 * <p>
 * If the property is normalized a normalized value must be provided to this function.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 * @private
 */
ImplicitMetadataTableView.prototype.setProperty = function (propertyId, value) {
  return this._metadataTable.setProperty(this._entityId, propertyId, value);
};

/**
 * Returns a copy of the value of the property with the given semantic in the metadata table.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the tile does not have this semantic.
 * @private
 */
ImplicitMetadataTableView.prototype.getPropertyBySemantic = function (
  semantic
) {
  return this._metadataTable.getPropertyBySemantic(this._entityId, semantic);
};

/**
 * Sets the value of the property with the given semantic in the metadata table.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 * @private
 */

ImplicitMetadataTableView.prototype.setPropertyBySemantic = function (
  semantic,
  value
) {
  return this._metadataTable.setPropertyBySemantic(
    this._entityId,
    semantic,
    value
  );
};
