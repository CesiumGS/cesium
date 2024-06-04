import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import MetadataEntity from "./MetadataEntity.js";

/**
 * Metadata about the content of a 3D Tile. This represents the content metadata JSON (3D Tiles 1.1)
 * or the <code>3DTILES_metadata</code> extension on a single {@link Cesium3DTileContent}
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.content Either the content metadata JSON (3D Tiles 1.1) or the extension JSON attached to the content.
 * @param {MetadataClass} options.class The class that the content metadata conforms to.
 *
 * @alias ContentMetadata
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function ContentMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const content = options.content;
  const metadataClass = options.class;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.content", content);
  Check.typeOf.object("options.class", metadataClass);
  //>>includeEnd('debug');

  this._class = metadataClass;
  this._properties = content.properties;
  this._extensions = content.extensions;
  this._extras = content.extras;
}

Object.defineProperties(ContentMetadata.prototype, {
  /**
   * The class that properties conform to.
   *
   * @memberof ContentMetadata.prototype
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
   * Extra user-defined properties.
   *
   * @memberof ContentMetadata.prototype
   * @type {object}
   * @readonly
   * @private
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * An object containing extensions.
   *
   * @memberof ContentMetadata.prototype
   * @type {object}
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
 * Returns whether the content has this property.
 *
 * @param {string} propertyId The case-sensitive ID of the property.
 * @returns {boolean} Whether the content has this property.
 * @private
 */
ContentMetadata.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(propertyId, this._properties, this._class);
};

/**
 * Returns whether the content has a property with the given semantic.
 *
 * @param {string} semantic The case-sensitive semantic of the property.
 * @returns {boolean} Whether the content has a property with the given semantic.
 * @private
 */
ContentMetadata.prototype.hasPropertyBySemantic = function (semantic) {
  return MetadataEntity.hasPropertyBySemantic(
    semantic,
    this._properties,
    this._class
  );
};

/**
 * Returns an array of property IDs.
 *
 * @param {string[]} [results] An array into which to store the results.
 * @returns {string[]} The property IDs.
 * @private
 */
ContentMetadata.prototype.getPropertyIds = function (results) {
  return MetadataEntity.getPropertyIds(this._properties, this._class, results);
};

/**
 * Returns a copy of the value of the property with the given ID.
 * <p>
 * If the property is normalized the normalized value is returned.
 * </p>
 *
 * @param {string} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the content does not have this property.
 * @private
 */
ContentMetadata.prototype.getProperty = function (propertyId) {
  return MetadataEntity.getProperty(propertyId, this._properties, this._class);
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If the property is normalized a normalized value must be provided to this function.
 * </p>
 *
 * @param {string} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 * @private
 */
ContentMetadata.prototype.setProperty = function (propertyId, value) {
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
 * @param {string} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the content does not have this semantic.
 * @private
 */
ContentMetadata.prototype.getPropertyBySemantic = function (semantic) {
  return MetadataEntity.getPropertyBySemantic(
    semantic,
    this._properties,
    this._class
  );
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {string} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 * @private
 */
ContentMetadata.prototype.setPropertyBySemantic = function (semantic, value) {
  return MetadataEntity.setPropertyBySemantic(
    semantic,
    value,
    this._properties,
    this._class
  );
};

export default ContentMetadata;
