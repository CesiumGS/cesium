import Cartesian2 from "../Core/Cartesian2.js";
import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import Matrix3 from "../Core/Matrix3.js";
import Sampler from "../Renderer/Sampler.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import ModelComponents from "./ModelComponents.js";

/**
 * glTF loading utilities.
 *
 * @namespace GltfLoaderUtil
 *
 * @private
 */
const GltfLoaderUtil = {};

/**
 * Get the image ID referenced by a texture.
 * <p>
 * When the texture has the EXT_texture_webp extension and the browser supports
 * WebP images the WebP image ID is returned.
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.gltf The glTF JSON.
 * @param {number} options.textureId The texture ID.
 * @param {SupportedImageFormats} options.supportedImageFormats The supported image formats.
 *
 * @returns {number} The image ID.
 * @private
 */
GltfLoaderUtil.getImageIdFromTexture = function (options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const { gltf, textureId, supportedImageFormats } = options;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.textureId", textureId);
  Check.typeOf.object("options.supportedImageFormats", supportedImageFormats);
  //>>includeEnd('debug');

  const texture = gltf.textures[textureId];
  const extensions = texture.extensions;
  if (defined(extensions)) {
    if (supportedImageFormats.webp && defined(extensions.EXT_texture_webp)) {
      return extensions.EXT_texture_webp.source;
    } else if (
      supportedImageFormats.basis &&
      defined(extensions.KHR_texture_basisu)
    ) {
      return extensions.KHR_texture_basisu.source;
    }
  }
  return texture.source;
};

/**
 * Create a sampler for a texture.
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.gltf The glTF JSON.
 * @param {object} options.textureInfo The texture info object.
 * @param {boolean} [options.compressedTextureNoMipmap=false] True when the texture is compressed and does not have an embedded mipmap.
 *
 * @returns {Sampler} The sampler.
 * @private
 */
GltfLoaderUtil.createSampler = function (options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const { gltf, textureInfo, compressedTextureNoMipmap = false } = options;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.textureInfo", textureInfo);
  //>>includeEnd('debug');

  // Default sampler properties
  let wrapS = TextureWrap.REPEAT;
  let wrapT = TextureWrap.REPEAT;
  let minFilter = TextureMinificationFilter.LINEAR;
  let magFilter = TextureMagnificationFilter.LINEAR;

  const textureId = textureInfo.index;
  const texture = gltf.textures[textureId];
  const samplerId = texture.sampler;

  if (defined(samplerId)) {
    const sampler = gltf.samplers[samplerId];
    wrapS = sampler.wrapS ?? wrapS;
    wrapT = sampler.wrapT ?? wrapT;
    minFilter = sampler.minFilter ?? minFilter;
    magFilter = sampler.magFilter ?? magFilter;
  }

  if (
    compressedTextureNoMipmap &&
    minFilter !== TextureMinificationFilter.LINEAR &&
    minFilter !== TextureMinificationFilter.NEAREST
  ) {
    if (
      minFilter === TextureMinificationFilter.NEAREST_MIPMAP_NEAREST ||
      minFilter === TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
    ) {
      minFilter = TextureMinificationFilter.NEAREST;
    } else {
      minFilter = TextureMinificationFilter.LINEAR;
    }
  }

  return new Sampler({
    wrapS: wrapS,
    wrapT: wrapT,
    minificationFilter: minFilter,
    magnificationFilter: magFilter,
  });
};

const defaultScale = new Cartesian2(1.0, 1.0);

/**
 * Create a model texture reader.
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.textureInfo The texture info JSON.
 * @param {string} [options.channels] The texture channels to read from.
 * @param {Texture} [options.texture] The texture object.
 *
 * @returns {ModelComponents.TextureReader} The texture reader for this model.
 */
GltfLoaderUtil.createModelTextureReader = function (options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const { textureInfo, channels, texture } = options;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.textureInfo", textureInfo);
  //>>includeEnd('debug');

  let texCoord = textureInfo.texCoord ?? 0;
  let transform;

  const textureTransform = textureInfo.extensions?.KHR_texture_transform;

  if (defined(textureTransform)) {
    texCoord = textureTransform.texCoord ?? texCoord;

    const offset = defined(textureTransform.offset)
      ? Cartesian2.unpack(textureTransform.offset)
      : Cartesian2.ZERO;
    let rotation = textureTransform.rotation ?? 0.0;
    const scale = defined(textureTransform.scale)
      ? Cartesian2.unpack(textureTransform.scale)
      : defaultScale;

    // glTF assumes UV coordinates start with (0, 0) in the top left corner
    // (y-down) unlike WebGL which puts (0, 0) in the bottom left corner (y-up).
    // This means rotations are reversed since the angle from x to y is now
    // clockwise instead of CCW. Translations and scales are not impacted by
    // this.
    rotation = -rotation;

    // prettier-ignore
    transform = new Matrix3(
        Math.cos(rotation) * scale.x, -Math.sin(rotation) * scale.y, offset.x,
        Math.sin(rotation) * scale.x, Math.cos(rotation) * scale.y, offset.y,
        0.0, 0.0, 1.0
      );
  }

  const modelTextureReader = new ModelComponents.TextureReader();
  modelTextureReader.index = textureInfo.index;
  modelTextureReader.texture = texture;
  modelTextureReader.texCoord = texCoord;
  modelTextureReader.scale = textureInfo.scale;
  modelTextureReader.transform = transform;
  modelTextureReader.channels = channels;

  return modelTextureReader;
};

export default GltfLoaderUtil;
