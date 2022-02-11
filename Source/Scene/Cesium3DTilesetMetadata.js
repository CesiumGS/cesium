import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
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
 * @param {String} options.extension The extension JSON object.
 * @param {MetadataSchema} options.schema The parsed schema.
 *
 * @alias Cesium3DTilesetMetadata
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function Cesium3DTilesetMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const extension = options.extension;

  // The calling code is responsible for loading the schema.
  // This keeps metadata parsing synchronous.
  const schema = options.schema;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.extension", extension);
  Check.typeOf.object("options.schema", schema);
  //>>includeEnd('debug');

  const groups = {};
  if (defined(extension.groups)) {
    for (const groupId in extension.groups) {
      if (extension.groups.hasOwnProperty(groupId)) {
        const group = extension.groups[groupId];
        groups[groupId] = new GroupMetadata({
          id: groupId,
          group: extension.groups[groupId],
          class: schema.classes[group.class],
        });
      }
    }
  }

  let tileset;
  if (defined(extension.tileset)) {
    tileset = new TilesetMetadata({
      tileset: extension.tileset,
      class: schema.classes[extension.tileset.class],
    });
  }

  this._schema = schema;
  this._groups = groups;
  this._tileset = tileset;
  this._statistics = extension.statistics;
  this._extras = extension.extras;
  this._extensions = extension.extensions;
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
