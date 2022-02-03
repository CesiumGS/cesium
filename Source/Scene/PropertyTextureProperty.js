import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
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
  const glslType = this.getGlslType();

  const isUint8 = classProperty.valueType === MetadataComponentType.UINT8;
  const isNormalized = classProperty.normalized;

  // No unpacking needed
  if (isUint8 && isNormalized) {
    return [];
  }

  // for UINT8s that are not normalized, we need to un-normalize and cast to
  // an int after the texture read
  if (isUint8) {
    return [
      MetadataUnpackingStep.unnormalizeU8,
      MetadataUnpackingStep.cast(glslType),
    ];
  }

  //>>includeStart('debug', pragmas.debug);
  throw new DeveloperError(
    "Only property types [UINT8, normalized UINT8] are supported in property textures"
  );
  //>>includeEnd('debug');
};

const floatTypesByComponentCount = ["float", "vec2", "vec3", "vec4"];
const intTypesByComponentCount = ["int", "ivec2", "ivec3", "ivec4"];

/**
 * @private
 */
PropertyTextureProperty.prototype.getGlslType = function () {
  const classProperty = this._classProperty;
  const componentCount = classProperty.componentCount;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(componentCount) || componentCount > 4) {
    throw new DeveloperError(
      "Only types with 1-4 components are supported in property textures"
    );
  }
  //>>includeEnd('debug');

  const isUint8 = classProperty.valueType === MetadataComponentType.UINT8;
  const isNormalized = classProperty.normalized;

  // normalized UINT8 values will be represented as float types in the shader
  if (isUint8 && isNormalized) {
    return floatTypesByComponentCount[componentCount - 1];
  }

  // UINT8 values will otherwise be converted to an int in the shader.
  if (isUint8) {
    return intTypesByComponentCount[componentCount - 1];
  }

  //>>includeStart('debug', pragmas.debug);
  throw new DeveloperError(
    "Only property types [UINT8, normalized UINT8] are supported in property textures"
  );
  //>>includeEnd('debug');
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
