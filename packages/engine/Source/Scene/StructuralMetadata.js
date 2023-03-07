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
 * @param {object} options Object with the following properties:
 * @param {MetadataSchema} options.schema The parsed schema.
 * @param {PropertyTable[]} [options.propertyTables] An array of property table objects. For the legacy <code>EXT_feature_metadata</code> extension, this is sorted by the key in the propertyTables dictionary
 * @param {PropertyTexture[]} [options.propertyTextures] An array of property texture objects. For the legacy <code>EXT_feature_metadata</code> extension, this is sorted by the key in the propertyTextures dictionary
 * @param {PropertyAttribute[]} [options.propertyAttributes] An array of property attribute objects. This is new in <code>EXT_structural_metadata</code>
 * @param {object} [options.statistics] Statistics about metadata
 * @param {object} [options.extras] Extra user-defined properties
 * @param {object} [options.extensions] An object containing extensions
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
  this._propertyAttributes = options.propertyAttributes;
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
   * @type {object}
   * @readonly
   * @private
   */
  statistics: {
    get: function () {
      return this._statistics;
    },
  },

  /**
   * Extra user-defined properties.
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
   * An object containing extensions.
   *
   * @memberof StructuralMetadata.prototype
   * @type {object}
   * @readonly
   * @private
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },

  /**
   * Number of property tables in the metadata.
   *
   * @memberof StructuralMetadata.prototype
   * @type {number}
   * @readonly
   * @private
   */
  propertyTableCount: {
    get: function () {
      return this._propertyTableCount;
    },
  },

  /**
   * The property tables in the metadata.
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

  /**
   * The property textures in the metadata.
   *
   * @memberof StructuralMetadata.prototype
   * @type {PropertyTexture[]}
   * @readonly
   * @private
   */
  propertyTextures: {
    get: function () {
      return this._propertyTextures;
    },
  },

  /**
   * The property attributes from the structural metadata extension
   *
   * @memberof StructuralMetadata.prototype
   * @type {PropertyAttribute[]}
   * @readonly
   * @private
   */
  propertyAttributes: {
    get: function () {
      return this._propertyAttributes;
    },
  },

  /**
   * Total size in bytes across all property tables
   *
   * @memberof StructuralMetadata.prototype
   * @type {number}
   * @readonly
   * @private
   */
  propertyTablesByteLength: {
    get: function () {
      if (!defined(this._propertyTables)) {
        return 0;
      }

      let totalByteLength = 0;
      const length = this._propertyTables.length;
      for (let i = 0; i < length; i++) {
        totalByteLength += this._propertyTables[i].byteLength;
      }

      return totalByteLength;
    },
  },
});

/**
 * Gets the property table with the given ID.
 * <p>
 * For the legacy <code>EXT_feature_metadata</code>, textures are stored in an array sorted
 * by the key in the propertyTables dictionary.
 * </p>
 *
 * @param {number} propertyTableId The property table ID.
 * @returns {PropertyTable} The property table.
 * @private
 */
StructuralMetadata.prototype.getPropertyTable = function (propertyTableId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("propertyTableId", propertyTableId);
  //>>includeEnd('debug');

  return this._propertyTables[propertyTableId];
};

/**
 * Gets the property texture with the given ID.
 * <p>
 * For the legacy <code>EXT_feature_metadata</code>, textures are stored in an array sorted
 * by the key in the propertyTextures dictionary.
 * </p>
 *
 * @param {number} propertyTextureId The index into the property textures array.
 * @returns {PropertyTexture} The property texture
 * @private
 */
StructuralMetadata.prototype.getPropertyTexture = function (propertyTextureId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("propertyTextureId", propertyTextureId);
  //>>includeEnd('debug');

  return this._propertyTextures[propertyTextureId];
};

/**
 * Gets the property attribute with the given ID. This concept is new in
 * EXT_structural_metadata
 *
 * @param {number} propertyAttributeId The index into the property attributes array.
 * @returns {PropertyAttribute} The property attribute
 * @private
 */
StructuralMetadata.prototype.getPropertyAttribute = function (
  propertyAttributeId
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("propertyAttributeId", propertyAttributeId);
  //>>includeEnd('debug');

  return this._propertyAttributes[propertyAttributeId];
};

export default StructuralMetadata;
