import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";

/**
 * An object containing feature metadata.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {MetadataSchema} options.schema The parsed schema.
 * @param {Object.<String, FeatureTable>} [options.featureTables] A dictionary mapping feature table IDs to feature table objects.
 * @param {Object.<String, FeatureTexture>} [options.featureTextures] A dictionary mapping feature texture IDs to feature texture objects.
 * @param {Object} [options.statistics] Statistics about metadata
 * @param {Object} [options.extras] Extra user-defined properties
 * @param {Object} [options.extensions] An object containing extensions
 *
 * @alias FeatureMetadata
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function FeatureMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.schema", options.schema);
  //>>includeEnd('debug');

  this._schema = options.schema;
  var featureTableCount = 0;
  var featureTables = options.featureTables;
  if (defined(featureTables)) {
    featureTableCount = Object.keys(featureTables).length;
  }
  this._featureTableCount = featureTableCount;
  this._featureTables = featureTables;
  this._featureTextures = options.featureTextures;
  this._statistics = options.statistics;
  this._extras = options.extras;
  this._extensions = options.extensions;
}

Object.defineProperties(FeatureMetadata.prototype, {
  /**
   * Schema containing classes and enums.
   *
   * @memberof FeatureMetadata.prototype
   * @type {MetadataSchema}
   * @readonly
   * @private
   */
  schema: {
    get: function () {
      return this._schema;
    },
  },

  /**
   * Statistics about the metadata.
   * <p>
   * See the {@link https://github.com/CesiumGS/glTF/blob/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0/schema/statistics.schema.json|statistics schema reference} for the full set of properties.
   * </p>
   *
   * @memberof FeatureMetadata.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  statistics: {
    get: function () {
      return this._statistics;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof FeatureMetadata.prototype
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
   * @memberof FeatureMetadata.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },

  /**
   * Number of feature tables in the metadata.
   *
   * @memberof FeatureMetadata.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  featureTableCount: {
    get: function () {
      return this._featureTableCount;
    },
  },
});

/**
 * Gets the feature table with the given ID.
 *
 * @param {String} featureTableId The feature table ID.
 * @returns {FeatureTable} The feature table.
 * @private
 */
FeatureMetadata.prototype.getFeatureTable = function (featureTableId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("featureTableId", featureTableId);
  //>>includeEnd('debug');

  return this._featureTables[featureTableId];
};

/**
 * Gets the feature texture with the given ID.
 *
 * @param {String} featureTextureId The feature texture ID.
 * @returns {FeatureTexture} The feature texture.
 * @private
 */
FeatureMetadata.prototype.getFeatureTexture = function (featureTextureId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("featureTextureId", featureTextureId);
  //>>includeEnd('debug');

  return this._featureTextures[featureTextureId];
};

export default FeatureMetadata;
