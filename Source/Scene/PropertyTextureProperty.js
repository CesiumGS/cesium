import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";

/**
 * A property in a feature texture.
 *
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_mesh_features|EXT_mesh_features Extension} as well as the
 * previous {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.textureInfo The textureInfo JSON object of the property texture
 * @param {MetadataClassProperty} options.classProperty The class property.
 * @param {Texture} options.texture The texture that stores this property
 *
 * @alias PropertyTextureProperty
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function PropertyTextureProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const classProperty = options.classProperty;
  const channels = options.channels;
  const texture = options.texture;
  const textureInfo = options.textureInfo;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.textureInfo", textureInfo);
  Check.typeOf.object("options.channels", channels);
  Check.typeOf.object("options.classProperty", classProperty);
  Check.typeOf.object("options.texture", texture);
  //>>includeEnd('debug');

  const glslChannels = getGlslChannels(channels);
  const textureReader = GltfLoaderUtil.createModelTextureReader({
    textureInfo: textureInfo,
    channels: glslChannels,
    texture: texture,
  });

  this._channels = channels;
  this._glslChannels = glslChannels;
  this._textureReader = textureReader;
  this._classProperty = classProperty;
}

Object.defineProperties(PropertyTextureProperty.prototype, {
  /**
   * The texture reader.
   *
   * @memberof PropertyTextureProperty.prototype
   * @type {ModelComponents.TextureReader}
   * @readonly
   * @private
   */
  textureReader: {
    get: function () {
      return this._textureReader;
    },
  },
});

// uint8, normalized:
// float property = texture2D(...).r;
// vec2 property = texture2D(...).rg;
// vec3 property = texture2D(...).rgb;
// vec4 property = texture2D(...).rgba;

// int8, normalized:
// float property = 1.0 + 2.0 * (texture2D(...).r)

PropertyTextureProperty.prototype.getGlslType = function () {
  // TODO: fill this out
  return "float";
  //var classProperty = this._classProperty;

  // Supported types:
  // UINT8, normalized -> float
  // FLOAT -> float

  //var componentCount = classProperty.componentCount;

  //var normalized = classProperty.normalized;

  //if (classProperty.isFloat)
  // FLOAT -> float
  // VECn -> vecn
  // ARRAY[FLOAT, 1] -> float
  // ARRAY[FLOAT, 2] -> vec2
  // ARRAY[FLOAT, 3] -> vec3
  // ARRAY[FLOAT, 4] -> vec4
  // ARRAY[FLOAT]
};

/**
 * Reformat from an array of channel indices like <code>[0, 1]</code> to a
 * string of channels as would be used in GLSL swizzling (e.g. "rg")
 *
 * @param {Number[]} channels the channel indices
 * @return {String} The channels as a string of "r", "g", "b" or "a" characters.
 * @private
 */
function getGlslChannels(channelIndices) {
  return channelIndices
    .map(function (channelIndex) {
      return "rgba".charAt(channelIndex);
    })
    .join("");
}

export default PropertyTextureProperty;
