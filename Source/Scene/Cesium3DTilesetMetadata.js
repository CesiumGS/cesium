import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import GroupMetadata from "./GroupMetadata.js";
import TilesetMetadata from "./TilesetMetadata.js";

/**
 * An object containing metadata about a 3D Tileset.
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles.
 * </p>
 * <p>
 * This object represents the <code>3DTILES_metadata</code> object which
 * contains the schema ({@link MetadataSchema}), tileset metadata ({@link TilesetMetadata}), group metadata (dictionary of {@link GroupMetadata}), and metadata statistics (dictionary)
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} [options.tilesetJson] The tileset JSON object. If this is undefined, then options.extension must be defined.
 * @param {Object} [options.extension] The JSON object, used for backwards compatibility with the 3DTILES_metadata extension.
 * @param {MetadataSchema} options.schema The parsed schema.
 *
 * @exception {DeveloperError} One of tilesetJson and extension must be defined.
 *
 * @alias Cesium3DTilesetMetadata
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function Cesium3DTilesetMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const tilesetJson = options.tilesetJson;
  const extension = options.extension;

  // The calling code is responsible for loading the schema.
  // This keeps metadata parsing synchronous.
  const schema = options.schema;

  //>>includeStart('debug', pragmas.debug);
  if (defined(tilesetJson) === defined(extension)) {
    throw new DeveloperError(
      "One of options.tilesetJson and extension must be defined."
    );
  }
  Check.typeOf.object("options.schema", schema);
  //>>includeEnd('debug');

  let metadata;
  if (defined(tilesetJson)) {
    metadata = tilesetJson.metadata;
  } else {
    metadata = extension.tileset;
  }

  let tileset;
  if (defined(metadata)) {
    tileset = new TilesetMetadata({
      tileset: metadata,
      class: schema.classes[metadata.class],
    });
  }

  const definedJson = defaultValue(tilesetJson, extension);
  const groupsJson = definedJson.groups;

  const groups = {};
  if (defined(groupsJson)) {
    for (const groupId in groupsJson) {
      if (groupsJson.hasOwnProperty(groupId)) {
        const group = groupsJson[groupId];
        groups[groupId] = new GroupMetadata({
          id: groupId,
          group: groupsJson[groupId],
          class: schema.classes[group.class],
        });
      }
    }
  }

  this._schema = schema;
  this._groups = groups;
  this._tileset = tileset;

  this._statistics = definedJson.statistics;
  this._extras = definedJson.extras;
  this._extensions = definedJson.extensions;
}

Object.defineProperties(Cesium3DTilesetMetadata.prototype, {
  /**
   * Schema containing classes and enums.
   *
   * @memberof Cesium3DTilesetMetadata.prototype
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
   * Metadata about groups of content.
   *
   * @memberof Cesium3DTilesetMetadata.prototype
   * @type {Object.<String, GroupMetadata>}
   * @readonly
   * @private
   */
  groups: {
    get: function () {
      return this._groups;
    },
  },

  /**
   * Metadata about the tileset as a whole.
   *
   * @memberof Cesium3DTilesetMetadata.prototype
   * @type {TilesetMetadata}
   * @readonly
   * @private
   */
  tileset: {
    get: function () {
      return this._tileset;
    },
  },

  /**
   * Statistics about the metadata.
   * <p>
   * See the {@link https://github.com/CesiumGS/3d-tiles/blob/main/extensions/3DTILES_metadata/schema/statistics.schema.json|statistics schema reference}
   * in the 3D Tiles spec for the full set of properties.
   * </p>
   *
   * @memberof Cesium3DTilesetMetadata.prototype
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
   * @memberof Cesium3DTilesetMetadata.prototype
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
   * @memberof Cesium3DTilesetMetadata.prototype
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

export default Cesium3DTilesetMetadata;
