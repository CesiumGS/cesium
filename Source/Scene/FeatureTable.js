import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataTable from "./MetadataTable.js";

/**
 * A feature table for use with the <code>EXT_feature_metadata</code> glTF
 * extension. It also includes some options to be compatible with the older
 * 3D Tiles 1.0 batch table.
 * <p>
 * For batch tables, properties are resolved in the following order:
 * </p>
 * <ol>
 *   <li>binary properties from options.featureTable</li>
 *   <li>JSON properties from options.jsonMetadataTable</li>
 *   <li>batch table hierarchy properties from options.batchTableHierarchy</li>
 * </ol>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.featureTable The feature table JSON for binary properties.
 * @param {MetadataClass} [options.class] The class that binary properties conform to.
 * @param {Object.<String, Uint8Array>} [options.bufferViews] An object mapping bufferView IDs to Uint8Array objects.
 * @param {JsonMetadataTable} [options.jsonMetadataTable] For compatibility with the old batch table, free-form JSON properties can be passed in.
 * @param {BatchTableHierarchy} [options.batchTableHierarchy] For compatibility with the <code>3DTILES_batch_table_hierarchy</code> extension, a hierarchy can be provided.
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
  this._jsonMetadataTable = options.jsonMetadataTable;
  this._batchTableHierarchy = options.batchTableHierarchy;
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
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  return (
    this._metadataTable.hasProperty(propertyId) ||
    (defined(this._jsonMetadataTable) &&
      this._jsonMetadataTable.hasProperty(propertyId)) ||
    (defined(this._batchTableHierarchy) &&
      this._batchTableHierarchy.hasProperty(propertyId))
  );
};

var scratchResults = [];

/**
 * Returns an array of property IDs. For compatibility with the <code>3DTILES_batch_table_hierarchy</code> extension, this is computed for a specific feature.
 *
 * @param {Number} index The index of the feature.
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 */
FeatureTable.prototype.getPropertyIds = function (index, results) {
  results = defined(results) ? results : [];
  results.length = 0;

  // concat in place to avoid unnecessary array allocation
  results.push.apply(
    results,
    this._metadataTable.getPropertyIds(scratchResults)
  );

  if (defined(this._jsonMetadataTable)) {
    results.push.apply(
      results,
      this._jsonMetadataTable.getPropertyIds(scratchResults)
    );
  }

  if (defined(this._batchTableHierarchy)) {
    results.push.apply(
      results,
      this._batchTableHierarchy.getPropertyIds(index, scratchResults)
    );
  }

  return results;
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
  var result = this._metadataTable.getProperty(index, propertyId);
  if (defined(result)) {
    return result;
  }

  if (defined(this._jsonMetadataTable)) {
    result = this._jsonMetadataTable.getProperty(index, propertyId);
    if (defined(result)) {
      return result;
    }
  }

  if (defined(this._batchTableHierarchy)) {
    result = this._batchTableHierarchy.getProperty(index, propertyId);
    if (defined(result)) {
      return result;
    }
  }

  return undefined;
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
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 */
FeatureTable.prototype.setProperty = function (index, propertyId, value) {
  if (this._metadataTable.setProperty(index, propertyId, value)) {
    return true;
  }

  if (
    defined(this._jsonMetadataTable) &&
    this._jsonMetadataTable.setProperty(index, propertyId, value)
  ) {
    return true;
  }

  return (
    defined(this._batchTableHierarchy) &&
    this._batchTableHierarchy.setProperty(index, propertyId, value)
  );
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
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 */
FeatureTable.prototype.setPropertyBySemantic = function (
  index,
  semantic,
  value
) {
  return this._metadataTable.setPropertyBySemantic(index, semantic, value);
};

export default FeatureTable;
