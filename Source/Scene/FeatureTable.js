import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";

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
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Number} options.count The number of features in the table.
 * @param {MetadataTable} [options.metadataTable] A table of binary properties.
 * @param {JsonMetadataTable} [options.jsonMetadataTable] For compatibility with the old batch table, free-form JSON properties can be passed in.
 * @param {BatchTableHierarchy} [options.batchTableHierarchy] For compatibility with the <code>3DTILES_batch_table_hierarchy</code> extension, a hierarchy can be provided.
 * @param {Object} [options.extras] Extra user-defined properties
 * @param {Object} [options.extensions] An object containing extensions
 *
 * @alias FeatureTable
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function FeatureTable(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("options.count", options.count);
  //>>includeEnd('debug');

  this._count = options.count;
  this._extras = options.extras;
  this._extensions = options.extensions;
  this._metadataTable = options.metadataTable;
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
      return this._count;
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
      if (defined(this._metadataTable)) {
        return this._metadataTable.class;
      }

      return undefined;
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
 * Returns whether the feature has this property. For compatibility with the <code>3DTILES_batch_table_hierarchy</code> extension, this is computed for a specific feature.
 *
 * @param {Number} index The index of the feature.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether the feature has this property.
 * @private
 */
FeatureTable.prototype.hasProperty = function (index, propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  if (
    defined(this._metadataTable) &&
    this._metadataTable.hasProperty(propertyId)
  ) {
    return true;
  }

  if (
    defined(this._jsonMetadataTable) &&
    this._jsonMetadataTable.hasProperty(propertyId)
  ) {
    return true;
  }

  if (
    defined(this._batchTableHierarchy) &&
    this._batchTableHierarchy.hasProperty(index, propertyId)
  ) {
    return true;
  }

  return false;
};

/**
 * Returns whether the feature has a property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {Boolean} Whether the feature has a property with the given semantic.
 * @private
 */
FeatureTable.prototype.hasSemantic = function (index, semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  if (defined(this._metadataTable)) {
    return this._metadataTable.hasSemantic(semantic);
  }

  return false;
};

/**
 * Returns whether any feature has this property.
 * This is mainly useful for checking whether a property exists in the class
 * hierarchy when using the <code>3DTILES_batch_table_hierarchy</code> extension.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether any feature has this property.
 * @private
 */
FeatureTable.prototype.propertyExists = function (propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  if (
    defined(this._metadataTable) &&
    this._metadataTable.hasProperty(propertyId)
  ) {
    return true;
  }

  if (
    defined(this._jsonMetadataTable) &&
    this._jsonMetadataTable.hasProperty(propertyId)
  ) {
    return true;
  }

  if (
    defined(this._batchTableHierarchy) &&
    this._batchTableHierarchy.propertyExists(propertyId)
  ) {
    return true;
  }

  return false;
};

/**
 * Returns whether any feature has a property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {Boolean} Whether any feature has a property with the given semantic.
 * @private
 */
FeatureTable.prototype.semanticExists = function (semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  if (defined(this._metadataTable)) {
    return this._metadataTable.hasSemantic(semantic);
  }

  return false;
};

var scratchResults = [];

/**
 * Returns an array of property IDs. For compatibility with the <code>3DTILES_batch_table_hierarchy</code> extension, this is computed for a specific feature.
 *
 * @param {Number} index The index of the feature.
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 * @private
 */
FeatureTable.prototype.getPropertyIds = function (index, results) {
  results = defined(results) ? results : [];
  results.length = 0;

  if (defined(this._metadataTable)) {
    // concat in place to avoid unnecessary array allocation
    results.push.apply(
      results,
      this._metadataTable.getPropertyIds(scratchResults)
    );
  }

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
 * @returns {*} The value of the property or <code>undefined</code> if the feature does not have this property.
 * @private
 */
FeatureTable.prototype.getProperty = function (index, propertyId) {
  var result;
  if (defined(this._metadataTable)) {
    result = this._metadataTable.getProperty(index, propertyId);
    if (defined(result)) {
      return result;
    }
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
 * @private
 */
FeatureTable.prototype.setProperty = function (index, propertyId, value) {
  if (
    defined(this._metadataTable) &&
    this._metadataTable.setProperty(index, propertyId, value)
  ) {
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
 * @returns {*} The value of the property or <code>undefined</code> if the feature does not have this property.
 * @private
 */
FeatureTable.prototype.getPropertyBySemantic = function (index, semantic) {
  if (defined(this._metadataTable)) {
    return this._metadataTable.getPropertyBySemantic(index, semantic);
  }

  return undefined;
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {Number} index The index of the feature.
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 * @private
 */
FeatureTable.prototype.setPropertyBySemantic = function (
  index,
  semantic,
  value
) {
  if (defined(this._metadataTable)) {
    return this._metadataTable.setPropertyBySemantic(index, semantic, value);
  }

  return false;
};

/**
 * Returns a typed array containing the property values for a given propertyId.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The typed array containing the property values or <code>undefined</code> if the property values are not stored in a typed array.
 *
 * @private
 */
FeatureTable.prototype.getPropertyTypedArray = function (propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  if (defined(this._metadataTable)) {
    return this._metadataTable.getPropertyTypedArray(propertyId);
  }

  return undefined;
};

/**
 * Returns a typed array containing the property values for the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The typed array containing the property values or <code>undefined</code> if the property values are not stored in a typed array.
 *
 * @private
 */
FeatureTable.prototype.getPropertyTypedArrayBySemantic = function (semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  if (defined(this._metadataTable)) {
    return this._metadataTable.getPropertyTypedArrayBySemantic(semantic);
  }

  return undefined;
};

export default FeatureTable;
