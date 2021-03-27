import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataSchema from "./MetadataSchema.js";
import MetadataTable from "./MetadataTable.js";

/**
 * An object containing metadata about a glTF model.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/master/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.extension The extension JSON object.
 * @param {MetadataSchema} [options.externalSchema] The schema pointed to from schemaUri.
 * @param {Object} [options.bufferViews] An object mapping bufferView IDs to Uint8Array objects.
 *
 * @alias MetadataGltfExtension
 * @constructor
 *
 * @private
 */
function MetadataGltfExtension(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var extension = options.extension;
  var externalSchema = options.externalSchema;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.extension", extension);
  //>>includeEnd('debug');

  // The calling code is responsible for fetching the external schema JSON
  // pointed at by the schemaUri property. This keeps metadata parsing
  // synchronous and allows the calling code to maintain a schema cache.
  var schema = externalSchema;

  if (defined(extension.schema)) {
    schema = new MetadataSchema(extension.schema);
  }

  var featureTables = {};
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

  this._schema = schema;
  this._featureTables = featureTables;
  this._statistics = extension.statistics;
  this._extras = extension.extras;
  this._extensions = extension.extensions;
}

Object.defineProperties(MetadataGltfExtension.prototype, {
  /**
   * Schema containing classes and enums.
   *
   * @memberof MetadataGltfExtension.prototype
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
   * @memberof MetadataGltfExtension.prototype
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
   * Statistics about the metadata.
   * <p>
   * See the {@link https://github.com/CesiumGS/glTF/blob/master/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0/schema/statistics.schema.json|statistics schema reference}
   * in the 3D Tiles spec for the full set of properties.
   * </p>
   *
   * @memberof MetadataGltfExtension.prototype
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
   * @memberof MetadataGltfExtension.prototype
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
   * @memberof MetadataGltfExtension.prototype
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

export default MetadataGltfExtension;
