import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";

/**
 * Metadata about the tileset.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.tileset The tileset metadata JSON object.
 * @param {MetadataClass} [options.class] The class that tileset metadata conforms to.
 *
 * @alias MetadataTileset
 * @constructor
 *
 * @private
 */
function MetadataTileset(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var tileset = options.tileset;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.tileset", tileset);
  //>>includeEnd('debug');

  this._class = options.class;
  this._properties = clone(tileset.properties, true); // Clone so that this object doesn't hold on to a reference to the JSON
  this._name = tileset.name;
  this._description = tileset.description;
  this._extras = clone(tileset.extras, true); // Clone so that this object doesn't hold on to a reference to the JSON
}

Object.defineProperties(MetadataTileset.prototype, {
  /**
   * The class that tileset metadata conform to.
   *
   * @memberof MetadataTileset.prototype
   * @type {MetadataClass}
   * @readonly
   * @private
   */
  class: {
    get: function () {
      return this._class;
    },
  },

  /**
   * A dictionary containing tileset properties.
   *
   * @memberof MetadataTileset.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * The name of the tileset.
   *
   * @memberof MetadataTileset.prototype
   * @type {String}
   * @readonly
   * @private
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * The description of the tileset.
   *
   * @memberof MetadataTileset.prototype
   * @type {String}
   * @readonly
   * @private
   */
  description: {
    get: function () {
      return this._description;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof MetadataTileset.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },
});

export default MetadataTileset;
