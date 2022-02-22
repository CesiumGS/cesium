import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";

/**
 * An object containing structural metadata.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadatas|EXT_structural_metadata Extension} as well as the
 * previous {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {MetadataSchema} options.schema The parsed schema.
 * @param {PropertyTable[]} [options.propertyTables] An array of property table objects. For the legacy <code>EXT_feature_metadata</code> extension, this is sorted by the key in the propertyTables dictionary
 * @param {PropertyTexture[]} [options.propertyTextures] An array of feature texture objects. For the legacy <code>EXT_feature_metadata</code> extension, this is sorted by the key in the propertyTextures dictionary
 * @param {Object} [options.statistics] Statistics about metadata
 * @param {Object} [options.extras] Extra user-defined properties
 * @param {Object} [options.extensions] An object containing extensions
 *
 * @alias StructuralMetadata
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function StructuralMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.schema", options.schema);
  //>>includeEnd('debug');

  this._schema = options.schema;
  const propertyTables = options.propertyTables;
  this._propertyTableCount = defined(propertyTables)
    ? propertyTables.length
    : 0;
  this._propertyTables = propertyTables;
  this._propertyTextures = options.propertyTextures;
  this._statistics = options.statistics;
  this._extras = options.extras;
  this._extensions = options.extensions;
}

Object.defineProperties(StructuralMetadata.prototype, {
  /**
   * Schema containing classes and enums.
   *
   * @memberof StructuralMetadata.prototype
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
   * @memberof StructuralMetadata.prototype
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
   * @memberof StructuralMetadata.prototype
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
   * @memberof StructuralMetadata.prototype
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
   * @memberof StructuralMetadata.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  propertyTableCount: {
    get: function () {
      return this._propertyTableCount;
    },
  },

  /**
   * The feature tables in the metadata.
   *
   * @memberof StructuralMetadata.prototype
   * @type {PropertyTable[]}
   * @readonly
   * @private
   */
  propertyTables: {
    get: function () {
      return this._propertyTables;
    },
  },
});

/**
 * Gets the feature table with the given ID.
 * <p>
 * For the legacy <code>EXT_feature_metadata</code>, textures are stored in an array sorted
 * by the key in the propertyTables dictionary.
 * </p>
 *
 * @param {Number} propertyTableId The feature table ID.
 * @returns {PropertyTable} The feature table.
 * @private
 */
StructuralMetadata.prototype.getPropertyTable = function (propertyTableId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("propertyTableId", propertyTableId);
  //>>includeEnd('debug');

  return this._propertyTables[propertyTableId];
};

/**
 * Gets the feature texture with the given ID.
 * <p>
 * For the legacy <code>EXT_feature_metadata</code>, textures are stored in an array sorted
 * by the key in the propertyTextures dictionary.
 * </p>
 *
 * @param {Number} propertyTextureId The index into the feature textures array.
 * @returns {PropertyTexture} The feature texture.
 * @private
 */
StructuralMetadata.prototype.getPropertyTexture = function (propertyTextureId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("propertyTextureId", propertyTextureId);
  //>>includeEnd('debug');

  return this._propertyTextures[propertyTextureId];
};

export default StructuralMetadata;
