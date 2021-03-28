import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";

/**
 * A property in a metadata texture.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.property The property JSON object.
 * @param {MetadataClassProperty} options.classProperty The class property.
 * @param {Object} options.textures An object mapping texture IDs to {@link Texture} objects.
 *
 * @alias MetadataTextureProperty
 * @constructor
 *
 * @private
 */
function MetadataTextureProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var property = options.property;
  var classProperty = options.classProperty;
  var textures = options.textures;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.property", property);
  Check.typeOf.object("options.classProperty", classProperty);
  Check.typeOf.object("options.textures", textures);
  //>>includeEnd('debug');

  var textureInfo = property.texture;

  this._channels = property.channels;
  this._texCoord = textureInfo.texCoord;
  this._texture = textures[textureInfo.index];
  this._classProperty = classProperty;
  this._extras = property.extras;
  this._extensions = property.extensions;
}

Object.defineProperties(MetadataTextureProperty.prototype, {
  /**
   * Extras in the JSON object.
   *
   * @memberof MetadataTextureProperty.prototype
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
   * @memberof MetadataTextureProperty.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },
});

export default MetadataTextureProperty;
