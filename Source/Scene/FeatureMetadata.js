import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import FeatureTable from "./FeatureTable.js";
import FeatureTexture from "./FeatureTexture.js";

/**
 * An object containing feature metadata.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.extension The extension JSON object.
 * @param {MetadataSchema} options.schema The parsed schema.
 * @param {Object} [options.bufferViews] An object mapping bufferView IDs to Uint8Array objects.
 * @param {Object} [options.textures] An object mapping texture IDs to {@link Texture} objects.
 *
 * @alias FeatureMetadata
 * @constructor
 *
 * @private
 */
function FeatureMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var extension = options.extension;

  // The calling code is responsible for loading the schema.
  // This keeps metadata parsing synchronous.
  var schema = options.schema;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.extension", extension);
  Check.typeOf.object("options.schema", schema);
  //>>includeEnd('debug');

  var featureTables = {};
  if (defined(extension.featureTables)) {
    for (var featureTableId in extension.featureTables) {
      if (extension.featureTables.hasOwnProperty(featureTableId)) {
        var featureTable = extension.featureTables[featureTableId];
        featureTables[featureTableId] = new FeatureTable({
          featureTable: featureTable,
          class: schema.classes[featureTable.class],
          bufferViews: options.bufferViews,
        });
      }
    }
  }

  var featureTextures = {};
  if (defined(extension.featureTextures)) {
    for (var featureTextureId in extension.featureTextures) {
      if (extension.featureTextures.hasOwnProperty(featureTextureId)) {
        var featureTexture = extension.featureTextures[featureTextureId];
        featureTextures[featureTextureId] = new FeatureTexture({
          featureTexture: featureTexture,
          class: schema.classes[featureTexture.class],
          textures: options.textures,
        });
      }
    }
  }

  this._schema = schema;
  this._featureTables = featureTables;
  this._featureTextures = featureTextures;
  this._statistics = extension.statistics;
  this._extras = extension.extras;
  this._extensions = extension.extensions;
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
});

/**
 * Gets the feature table with the given ID.
 *
 * @param {String} featureTableId The feature table ID.
 * @returns {FeatureTable} The feature table.
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
 */
FeatureMetadata.prototype.getFeatureTexture = function (featureTextureId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("featureTextureId", featureTextureId);
  //>>includeEnd('debug');

  return this._featureTextures[featureTextureId];
};

export default FeatureMetadata;
