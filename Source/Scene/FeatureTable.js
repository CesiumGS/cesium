import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import MetadataTable from "./MetadataTable.js";

/**
 * A feature table.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.featureTable The feature table JSON.
 * @param {MetadataClass} [options.class] The class that properties conform to.
 * @param {Object.<String, Uint8Array>} [options.bufferViews] An object mapping bufferView IDs to Uint8Array objects.
 *
 * @alias FeatureTable
 * @constructor
 *
 * @private
 */
function FeatureTable(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var featureTable = options.featureTable;
  var classDefinition = options.class;
  var bufferViews = options.bufferViews;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.featureTable", featureTable);
  //>>includeEnd('debug');

  var count = featureTable.count;
  var properties = featureTable.properties;
  var extensions = featureTable.extensions;
  var extras = featureTable.extras;

  var metadataTable = new MetadataTable({
    count: count,
    properties: properties,
    class: classDefinition,
    bufferViews: bufferViews,
  });

  this._metadataTable = metadataTable;
  this._extras = extras;
  this._extensions = extensions;
}

Object.defineProperties(FeatureTable.prototype, {
  /**
   * The number of features in the table.
   *
   * @memberof FeatureTable.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  count: {
    get: function () {
      return this._metadataTable.count;
    },
  },

  /**
   * The class that properties conform to.
   *
   * @memberof FeatureTable.prototype
   * @type {MetadataClass}
   * @readonly
   */
  class: {
    get: function () {
      return this._metadataTable.class;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof FeatureTable.prototype
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
   * @memberof FeatureTable.prototype
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
 * Returns whether this property exists.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether this property exists.
 */
FeatureTable.prototype.hasProperty = function (propertyId) {
  return this._metadataTable.hasProperty(propertyId);
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 */
FeatureTable.prototype.getPropertyIds = function (results) {
  return this._metadataTable.getPropertyIds(results);
};

/**
 * Returns a copy of the value of the property with the given ID.
 * <p>
 * If the property is normalized the normalized value is returned.
 * </p>
 *
 * @param {Number} index The index of the feature.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
FeatureTable.prototype.getProperty = function (index, propertyId) {
  return this._metadataTable.getProperty(index, propertyId);
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If the property is normalized a normalized value must be provided to this function.
 * </p>
 *
 * @param {Number} index The index of the feature.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 * @exception {DeveloperError} A property with the given ID doesn't exist.
 */
FeatureTable.prototype.setProperty = function (index, propertyId, value) {
  this._metadataTable.setProperty(index, propertyId, value);
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {Number} index The index of the feature.
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
FeatureTable.prototype.getPropertyBySemantic = function (index, semantic) {
  return this._metadataTable.getPropertyBySemantic(index, semantic);
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {Number} index The index of the feature.
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 * @exception {DeveloperError} A property with the given semantic doesn't exist.
 */
FeatureTable.prototype.setPropertyBySemantic = function (
  index,
  semantic,
  value
) {
  this._metadataTable.setPropertyBySemantic(index, semantic, value);
};

export default FeatureTable;
