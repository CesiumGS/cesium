import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataEntity from "./MetadataEntity.js";

/**
 * Metadata about a group of content.
 * <p>
 * Implements the {@link MetadataEntity} interface.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.id The ID of the group.
 * @param {Object} options.group The group JSON object.
 * @param {MetadataClass} [options.class] The class that group metadata conforms to.
 *
 * @alias MetadataGroup
 * @constructor
 *
 * @private
 */
function MetadataGroup(options) {
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
}

/**
 * Returns whether this property exists.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether this property exists.
 */
MetadataGroup.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(this, propertyId);
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 */
MetadataGroup.prototype.getPropertyIds = function (results) {
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
MetadataGroup.prototype.getProperty = function (propertyId) {
  return MetadataEntity.getProperty(this, propertyId);
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If the property is normalized a normalized value must be provided to this function.
 * </p>
 * <p>
 * If a property with the given ID doesn't exist, it is created.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 */
MetadataGroup.prototype.setProperty = function (propertyId, value) {
  MetadataEntity.setProperty(this, propertyId, value);
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
MetadataGroup.prototype.getPropertyBySemantic = function (semantic) {
  return MetadataEntity.getPropertyBySemantic(this, semantic);
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 */
MetadataGroup.prototype.setPropertyBySemantic = function (semantic, value) {
  MetadataEntity.setPropertyBySemantic(this, semantic, value);
};

Object.defineProperties(MetadataGroup.prototype, {
  /**
   * The class that properties conform to.
   *
   * @memberof MetadataGroup.prototype
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
   * @memberof MetadataGroup.prototype
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
   * The ID of the group.
   *
   * @memberof MetadataGroup.prototype
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
   * @memberof MetadataGroup.prototype
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
   * @memberof MetadataGroup.prototype
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
   * @memberof MetadataGroup.prototype
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

export default MetadataGroup;
