import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import MetadataEntity from "./MetadataEntity.js";

/**
 * Metadata about a 3D tile. This can either be defined directly with
 * a <code>3DTILES_metadata</code> on the tile, or indirectly by using
 * <code>3DTILES_metadata</code> inside an implicit subtree file.
 * <p>
 * options.tile and options.implicitSubtree are mutually exclusive.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} [options.tile] The extension JSON attached to the tile.
 * @param {ImplicitSubtree} [options.implicitSubtree] If using implicit tiling, the subtree is passed in instead of options.tile. It is assumed that the subtree's readyPromise has already resolved.
 * @param {ImplicitTileCoordinates} [options.implicitCoordinates] Implicit tiling coordinates for the tile. Required if options.implicitSubtree is defined.
 * @param {MetadataClass} [options.class] The class that group metadata conforms to.
 *
 * @alias TileMetadata
 * @constructor
 */
export default function TileMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var entityId;
  var metadataTable;
  var properties;
  var extras;
  var extensions;

  var hasImplicitMetadata = defined(options.implicitSubtree);
  var hasExplicitMetadata = defined(options.tile);

  //>>includeStart('debug', pragmas.debug);
  if (hasImplicitMetadata === hasExplicitMetadata) {
    throw new DeveloperError(
      "Exactly one of options.implictSubtree and options.tileMetadata is defined"
    );
  }
  //>>includeEnd('debug');

  if (defined(options.implicitSubtree)) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object(
      "options.implicitCoordinates",
      options.implicitCoordinates
    );
    //>>includeEnd('debug');

    var subtree = options.implicitSubtree;
    entityId = subtree.getEntityId(options.implicitCoordinates);
    metadataTable = subtree.metadataTable;

    var subtreeExtension = subtree.metadataExtension;
    extras = subtreeExtension.extras;
    extensions = subtreeExtension.extensions;
  } else {
    var tileMetadata = options.tile;
    properties = tileMetadata.properties;
    extras = tileMetadata.extras;
    extensions = tileMetadata.extensions;
  }

  // implicit only
  this._metadataTable = metadataTable;
  this._entityId = entityId;

  // explicit only
  this._properties = properties;

  // both
  this._class = options.class;
  this._extensions = extensions;
  this._extras = extras;
}

Object.defineProperties(TileMetadata.prototype, {
  /**
   * The class that properties conform to.
   *
   * @memberof TileMetadata.prototype
   * @type {MetadataClass}
   * @readonly
   */
  class: {
    get: function () {
      return this._class;
    },
  },

  /**
   * A dictionary containing properties. This is only defined when
   * explicit tile metadata is used.
   *
   * @memberof TileMetadata.prototype
   * @type {Object}
   * @readonly
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof MetadataGroup.prototype
   * @type {*}
   * @readonly
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * Extensions in the JSON object.
   *
   * @memberof MetadataGroup.prototype
   * @type {Object}
   * @readonly
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },
});

/**
 * Returns whether this property exists.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether this property exists.
 */
TileMetadata.prototype.hasProperty = function (propertyId) {
  if (defined(this._metadataTable)) {
    return this._metadataTable.hasProperty(propertyId);
  }

  return MetadataEntity.hasProperty(this, propertyId);
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 */
TileMetadata.prototype.getPropertyIds = function (results) {
  if (defined(this._metadataTable)) {
    return this._metadataTable.getPropertyIds(results);
  }

  return MetadataEntity.getPropertyIds(this, results);
};

/**
 * Returns a copy of the value of the property with the given ID.
 * <p>
 * If the property is normalized the normalized value is returned.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
TileMetadata.prototype.getProperty = function (propertyId) {
  if (defined(this._metadataTable)) {
    return this._metadataTable.getProperty(this._entityId, propertyId);
  }

  return MetadataEntity.getProperty(this, propertyId);
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If the property is normalized a normalized value must be provided to this function.
 * </p>
 * <p>
 * If a property with the given ID doesn't exist, it is created.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 */
TileMetadata.prototype.setProperty = function (propertyId, value) {
  if (defined(this._metadataTable)) {
    this._metadataTable.setProperty(this._entityId, propertyId, value);
  }

  return MetadataEntity.setProperty(this, propertyId, value);
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
TileMetadata.prototype.getPropertyBySemantic = function (semantic) {
  if (defined(this._metadataTable)) {
    return this._metadataTable.getPropertyBySemantic(this._entityId, semantic);
  }

  return MetadataEntity.getPropertyBySemantic(this, semantic);
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 */
TileMetadata.prototype.setPropertyBySemantic = function (semantic, value) {
  if (defined(this._metadataTable)) {
    this._metadataTable.setPropertyBySemantic(this._entityId, semantic, value);
  }

  return MetadataEntity.setPropertyBySemantic(this, semantic, value);
};
