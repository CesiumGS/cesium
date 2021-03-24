import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataGroup from "./MetadataGroup.js";
import MetadataTileset from "./MetadataTileset.js";

/**
 * An object containing metadata about a 3D Tileset.
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/3d-tiles-next/extensions/3DTILES_metadata/1.0.0|3DTILES_metadata Extension} for 3D Tiles.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.extension The extension JSON object.
 * @param {MetadataSchema} [options.schema] The parsed schema.
 *
 * @alias Metadata3DTilesExtension
 * @constructor
 *
 * @private
 */
function Metadata3DTilesExtension(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var extension = options.extension;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.extension", extension);
  //>>includeEnd('debug');

  // The calling code is responsible for parsing the schema and placing it
  // in the schema cache via ResourceCache and MetadataSchemaCacheResource.
  // This keeps metadata parsing synchronous.
  var schema = options.schema;

  var groups = {};
  for (var groupId in extension.groups) {
    if (extension.groups.hasOwnProperty(groupId)) {
      var group = extension.groups[groupId];
      groups[groupId] = new MetadataGroup({
        id: groupId,
        group: extension.groups[groupId],
        class: schema.classes[group.class],
      });
    }
  }

  var tileset;
  if (defined(extension.tileset)) {
    tileset = new MetadataTileset({
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

Object.defineProperties(Metadata3DTilesExtension.prototype, {
  /**
   * Schema containing classes and enums.
   *
   * @memberof Metadata3DTilesExtension.prototype
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
   * @memberof Metadata3DTilesExtension.prototype
   * @type {Object.<String, MetadataGroup>}
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
   * @memberof Metadata3DTilesExtension.prototype
   * @type {MetadataTileset}
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
   * See the {@link https://github.com/CesiumGS/3d-tiles/blob/3d-tiles-next/extensions/3DTILES_metadata/1.0.0/schema/statistics.schema.json|statistics schema reference}
   * in the 3D Tiles spec for the full set of properties.
   * </p>
   *
   * @memberof Metadata3DTilesExtension.prototype
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
   * @memberof Metadata3DTilesExtension.prototype
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
   * @memberof Metadata3DTilesExtension.prototype
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

export default Metadata3DTilesExtension;
