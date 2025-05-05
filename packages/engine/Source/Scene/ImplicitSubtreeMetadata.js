import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataEntity from "./MetadataEntity.js";

/**
 * Metadata about an implicit subtree.
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.subtreeMetadata The subtree metadata JSON object.
 * @param {MetadataClass} options.class The class that subtree metadata conforms to.
 *
 * @alias ImplicitSubtreeMetadata
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function ImplicitSubtreeMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const subtreeMetadata = options.subtreeMetadata;
  const metadataClass = options.class;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.subtreeMetadata", subtreeMetadata);
  Check.typeOf.object("options.class", metadataClass);
  //>>includeEnd('debug');

  const properties = defined(subtreeMetadata.properties)
    ? subtreeMetadata.properties
    : {};

  this._class = metadataClass;
  this._properties = properties;
  this._extras = subtreeMetadata.extras;
  this._extensions = subtreeMetadata.extensions;
}

Object.defineProperties(ImplicitSubtreeMetadata.prototype, {
  /**
   * The class that properties conform to.
   *
   * @memberof ImplicitSubtreeMetadata.prototype
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
   * @memberof ImplicitSubtreeMetadata.prototype
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
   * @memberof ImplicitSubtreeMetadata.prototype
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
 * Returns whether the subtree has this property.
 *
 * @param {string} propertyId The case-sensitive ID of the property.
 * @returns {boolean} Whether the subtree has this property.
 * @private
 */
ImplicitSubtreeMetadata.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(propertyId, this._properties, this._class);
};

/**
 * Returns whether the subtree has a property with the given semantic.
 *
 * @param {string} semantic The case-sensitive semantic of the property.
 * @returns {boolean} Whether the subtree has a property with the given semantic.
 * @private
 */
ImplicitSubtreeMetadata.prototype.hasPropertyBySemantic = function (semantic) {
  return MetadataEntity.hasPropertyBySemantic(
    semantic,
    this._properties,
    this._class,
  );
};

/**
 * Returns an array of property IDs.
 *
 * @param {string[]} [results] An array into which to store the results.
 * @returns {string[]} The property IDs.
 * @private
 */
ImplicitSubtreeMetadata.prototype.getPropertyIds = function (results) {
  return MetadataEntity.getPropertyIds(this._properties, this._class, results);
};

/**
 * Returns a copy of the value of the property with the given ID.
 * <p>
 * If the property is normalized the normalized value is returned.
 * </p>
 *
 * @param {string} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the subtree does not have this property.
 * @private
 */
ImplicitSubtreeMetadata.prototype.getProperty = function (propertyId) {
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
ImplicitSubtreeMetadata.prototype.setProperty = function (propertyId, value) {
  return MetadataEntity.setProperty(
    propertyId,
    value,
    this._properties,
    this._class,
  );
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {string} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the subtree does not have this semantic.
 * @private
 */
ImplicitSubtreeMetadata.prototype.getPropertyBySemantic = function (semantic) {
  return MetadataEntity.getPropertyBySemantic(
    semantic,
    this._properties,
    this._class,
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
ImplicitSubtreeMetadata.prototype.setPropertyBySemantic = function (
  semantic,
  value,
) {
  return MetadataEntity.setPropertyBySemantic(
    semantic,
    value,
    this._properties,
    this._class,
  );
};

export default ImplicitSubtreeMetadata;
