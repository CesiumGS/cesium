import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";

/**
 * A property in a feature texture.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.property The property JSON object.
 * @param {MetadataClassProperty} options.classProperty The class property.
 * @param {Object.<String, Texture>} options.textures An object mapping texture IDs to {@link Texture} objects.
 *
 * @alias FeatureTextureProperty
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function FeatureTextureProperty(options) {
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
  var texture = GltfLoaderUtil.createModelTexture({
    textureInfo: textureInfo,
    channels: property.channels,
    texture: textures[textureInfo.index],
  });

  this._texture = texture;
  this._classProperty = classProperty;
  this._extras = property.extras;
  this._extensions = property.extensions;
}

Object.defineProperties(FeatureTextureProperty.prototype, {
  /**
   * The texture.
   *
   * @memberof FeatureTextureProperty.prototype
   * @type {ModelComponents.Texture}
   * @readonly
   * @private
   */
  texture: {
    get: function () {
      return this._texture;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof FeatureTextureProperty.prototype
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
   * @memberof FeatureTextureProperty.prototype
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

export default FeatureTextureProperty;
