import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataEntity from "./MetadataEntity.js";

/**
 * Metadata about a group of {@link Cesium3DTileContent}
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/3d-tiles-next/extensions/3DTILES_metadata/1.0.0|3DTILES_metadata Extension} for 3D Tiles
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.id The ID of the group.
 * @param {Object} options.group The group JSON object.
 * @param {MetadataClass} [options.class] The class that group metadata conforms to.
 *
 * @alias GroupMetadata
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function GroupMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var id = options.id;
  var group = options.group;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.group", group);
  //>>includeEnd('debug');

  var properties = defined(group.properties) ? group.properties : {};

  this._class = options.class;
  this._properties = properties;
  this._id = id;
  this._name = group.name;
  this._description = group.description;
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
   * @type {String}
   * @readonly
   * @private
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * The name of the group.
   *
   * @memberof GroupMetadata.prototype
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
   * The description of the group.
   *
   * @memberof GroupMetadata.prototype
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
   * Extensions in the JSON object.
   *
   * @memberof GroupMetadata.prototype
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
 * Returns whether the group has this property.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether the group has this property.
 * @private
 */
GroupMetadata.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(propertyId, this._properties, this._class);
};

/**
 * Returns whether the group has a property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {Boolean} Whether the group has a property with the given semantic.
 * @private
 */
GroupMetadata.prototype.hasSemantic = function (semantic) {
  return MetadataEntity.hasSemantic(semantic, this._properties, this._class);
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
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
 * @param {String} propertyId The case-sensitive ID of the property.
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
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 * @private
 */
GroupMetadata.prototype.setProperty = function (propertyId, value) {
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
 * @returns {*} The value of the property or <code>undefined</code> if the group does not have this property.
 * @private
 */
GroupMetadata.prototype.getPropertyBySemantic = function (semantic) {
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
GroupMetadata.prototype.setPropertyBySemantic = function (semantic, value) {
  return MetadataEntity.setPropertyBySemantic(
    semantic,
    value,
    this._properties,
    this._class
  );
};

export default GroupMetadata;
