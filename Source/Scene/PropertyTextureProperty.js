import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import MetadataUnpackingStep from "./MetadataUnpackingStep.js";
import MetadataComponentType from "./MetadataComponentType.js";
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

/**
 * Get a list of steps to apply in the shader after performing the texture read.
 * @private
 */
PropertyTextureProperty.prototype.getUnpackingSteps = function () {
  const classProperty = this._classProperty;
  const valueType = classProperty.valueType;

  // int8 values need to be converted from [0, 1] -> [-1, 1]
  if (valueType === MetadataComponentType.INT8) {
    return [MetadataUnpackingStep.unsignedToSigned];
  }

  // Otherwise, use the value from the texture read directly.
  return [];
};

const vectorTypes = ["float", "vec2", "vec3", "vec4"];

/**
 * @private
 */
PropertyTextureProperty.prototype.getGlslType = function () {
  const classProperty = this._classProperty;

  // get float or a vector type
  return vectorTypes[classProperty.componentCount - 1];
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
