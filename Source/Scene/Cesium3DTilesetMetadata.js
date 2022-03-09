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
 * This object represents the tileset JSON (3D Tiles 1.1) or the <code>3DTILES_metadata</code> object that contains
 * the schema ({@link MetadataSchema}), tileset metadata ({@link TilesetMetadata}), group metadata (dictionary of {@link GroupMetadata}), and metadata statistics (dictionary)
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.metadataJson Either the tileset JSON (3D Tiles 1.1) or the <code>3DTILES_metadata</code> extension object that contains the tileset metadata.
 * @param {MetadataSchema} options.schema The parsed schema.
 *
 * @alias Cesium3DTilesetMetadata
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function Cesium3DTilesetMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const metadataJson = options.metadataJson;

  // The calling code is responsible for loading the schema.
  // This keeps metadata parsing synchronous.
  const schema = options.schema;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.metadataJson", metadataJson);
  Check.typeOf.object("options.schema", schema);
  //>>includeEnd('debug');

  // An older schema stored the tileset metadata in the "tileset" property.
  const metadata = defaultValue(metadataJson.metadata, metadataJson.tileset);

  let tileset;
  if (defined(metadata)) {
    tileset = new TilesetMetadata({
      tileset: metadata,
      class: schema.classes[metadata.class],
    });
  }

  let groupIds = [];
  const groups = [];
  const groupsJson = metadataJson.groups;
  if (Array.isArray(groupsJson)) {
    const length = groupsJson.length;
    for (let i = 0; i < length; i++) {
      const group = groupsJson[i];
      groupIds.push(group.id);
      groups.push(
        new GroupMetadata({
          id: group.id,
          group: group,
          class: schema.classes[group.class],
        })
      );
    }
  } else if (defined(groupsJson)) {
    // An older version of group metadata stored groups in a dictionary
    // instead of an array.
    groupIds = Object.keys(groupsJson).sort();
    const length = groupIds.length;
    for (let i = 0; i < length; i++) {
      const groupId = groupIds[i];
      if (groupsJson.hasOwnProperty(groupId)) {
        const group = groupsJson[groupId];
        groups.push(
          new GroupMetadata({
            id: groupId,
            group: groupsJson[groupId],
            class: schema.classes[group.class],
          })
        );
      }
    }
  }

  this._schema = schema;
  this._groups = groups;
  this._groupIds = groupIds;
  this._tileset = tileset;

  this._statistics = metadataJson.statistics;
  this._extras = metadataJson.extras;
  this._extensions = metadataJson.extensions;
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
   * @type {GroupMetadata[]}
   * @readonly
   * @private
   */
  groups: {
    get: function () {
      return this._groups;
    },
  },

  /**
   * The IDs of the group metadata in the corresponding groups array.
   *
   * @memberof Cesium3DTilesetMetadata.prototype
   * @type {String[]}
   * @readonly
   * @private
   */
  groupIds: {
    get: function () {
      return this._groupIds;
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
