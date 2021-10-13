import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";

/**
 * An object containing feature metadata.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {MetadataSchema} options.schema The parsed schema.
 * @param {FeatureTable[]} [options.featureTables] An array of feature table objects. For the older EXT_feature_metadata extension, this is sorted by the key in the featureTables dictionary
 * @param {FeatureTexture[]} [options.featureTextures] An array of feature texture objects. For the older EXT_feature_metadata extension, this is sorted by the key in the featureTextures dictionary
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
  var featureTables = options.featureTables;
  this._featureTableCount = featureTables.length;
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
   * See the {@link https://github.com/CesiumGS/glTF/blob/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata/schema/statistics.schema.json|statistics schema reference} for the full set of properties.
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

  /**
   * The feature tables in the metadata.
   *
   * @memberof FeatureMetadata.prototype
   * @type {FeatureTable[]}
   * @readonly
   * @private
   */
  featureTables: {
    get: function () {
      return this._featureTables;
    },
  },
});

/**
 * Gets the feature table with the given ID.
 * <p>
 * For the older EXT_feature_metadata, textures are stored in an array sorted
 * by the key in the featureTables dictionary.
 * </p>
 *
 * @param {Number} featureTableId The feature table ID.
 * @returns {FeatureTable} The feature table.
 * @private
 */
FeatureMetadata.prototype.getFeatureTable = function (featureTableId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("featureTableId", featureTableId);
  //>>includeEnd('debug');

  return this._featureTables[featureTableId];
};

/**
 * Gets the feature texture with the given index.
 * <p>
 * For the older EXT_feature_metadata, textures are stored in an array sorted
 * by the key in the featureTextures dictionary.
 * </p>
 *
 * @param {Number} featureTextureId The index into the feature textures array.
 * @returns {FeatureTexture} The feature texture.
 * @private
 */
FeatureMetadata.prototype.getFeatureTexture = function (featureTextureId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("featureTextureId", featureTextureId);
  //>>includeEnd('debug');

  return this._featureTextures[featureTextureId];
};

export default FeatureMetadata;
