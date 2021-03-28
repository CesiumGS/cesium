import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataTable from "./MetadataTable.js";
import MetadataTexture from "./MetadataTexture.js";

/**
 * An object containing per-feature metadata.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/master/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension} for glTF.
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
        featureTables[featureTableId] = new MetadataTable({
          count: featureTable.count,
          properties: featureTable.properties,
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
        featureTexture[featureTextureId] = new MetadataTexture({
          properties: featureTexture.properties,
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
   * Feature tables.
   *
   * @memberof FeatureMetadata.prototype
   * @type {Object.<String, MetadataTable>}
   * @readonly
   * @private
   */
  featureTables: {
    get: function () {
      return this._featureTables;
    },
  },

  /**
   * Feature textures.
   *
   * @memberof FeatureMetadata.prototype
   * @type {Object.<String, MetadataTexture>}
   * @readonly
   * @private
   */
  featureTextures: {
    get: function () {
      return this._featureTextures;
    },
  },

  /**
   * Statistics about the metadata.
   * <p>
   * See the {@link https://github.com/CesiumGS/glTF/blob/master/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0/schema/statistics.schema.json|statistics schema reference}
   * in the 3D Tiles spec for the full set of properties.
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

export default FeatureMetadata;
