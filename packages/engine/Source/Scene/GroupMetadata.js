import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataEntity from "./MetadataEntity.js";

/**
 * Metadata about a group of {@link Cesium3DTileContent}
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {string} options.id The ID of the group.
 * @param {object} options.group The group JSON object.
 * @param {MetadataClass} options.class The class that group metadata conforms to.
 *
 * @alias GroupMetadata
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function GroupMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const id = options.id;
  const group = options.group;
  const metadataClass = options.class;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.group", group);
  Check.typeOf.object("options.class", metadataClass);
  //>>includeEnd('debug');

  const properties = defined(group.properties) ? group.properties : {};

  this._class = metadataClass;
  this._properties = properties;
  this._id = id;
  this._extras = group.extras;
  this._extensions = group.extensions;
}

Object.defineProperties(GroupMetadata.prototype, {
  /**
   * The class that properties conform to.
   *
   * @memberof GroupMetadata.prototype
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
   * The ID of the group.
   *
   * @memberof GroupMetadata.prototype
   * @type {string}
   * @readonly
   * @private
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * Extra user-defined properties.
   *
   * @memberof GroupMetadata.prototype
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
   * An object containing extensions.
   *
   * @memberof GroupMetadata.prototype
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
 * Returns whether the group has this property.
 *
 * @param {string} propertyId The case-sensitive ID of the property.
 * @returns {boolean} Whether the group has this property.
 * @private
 */
GroupMetadata.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(propertyId, this._properties, this._class);
};

/**
 * Returns whether the group has a property with the given semantic.
 *
 * @param {string} semantic The case-sensitive semantic of the property.
 * @returns {boolean} Whether the group has a property with the given semantic.
 * @private
 */
GroupMetadata.prototype.hasPropertyBySemantic = function (semantic) {
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
GroupMetadata.prototype.getPropertyIds = function (results) {
  return MetadataEntity.getPropertyIds(this._properties, this._class, results);
};

/**
 * Returns a copy of the value of the property with the given ID.
 * <p>
 * If the property is normalized the normalized value is returned.
 * </p>
 *
 * @param {string} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the group does not have this property.
 * @private
 */
GroupMetadata.prototype.getProperty = function (propertyId) {
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
GroupMetadata.prototype.setProperty = function (propertyId, value) {
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
 * @returns {*} The value of the property or <code>undefined</code> if the group does not have this semantic.
 * @private
 */
GroupMetadata.prototype.getPropertyBySemantic = function (semantic) {
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
GroupMetadata.prototype.setPropertyBySemantic = function (semantic, value) {
  return MetadataEntity.setPropertyBySemantic(
    semantic,
    value,
    this._properties,
    this._class,
  );
};

export default GroupMetadata;
