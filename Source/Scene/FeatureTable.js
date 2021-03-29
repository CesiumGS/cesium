import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import MetadataTable from "./MetadataTable.js";

/**
 * A feature table.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/master/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.featureTable The feature table JSON.
 * @param {MetadataSchema} options.schema The parsed schema.
 * @param {Object} [options.bufferViews] An object mapping bufferView IDs to Uint8Array objects.
 *
 * @alias FeatureTable
 * @constructor
 */
function FeatureTable(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var featureTable = options.featureTable;
  var schema = options.schema;
  var bufferViews = options.bufferViews;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.featureTable", featureTable);
  Check.typeOf.object("options.schema", schema);
  //>>includeEnd('debug');

  var count = featureTable.count;
  var properties = featureTable.properties;
  var classDefinition = schema.classes[featureTable.class];
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

export default FeatureTable;
