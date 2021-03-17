import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined";
import RuntimeError from "../Core/RuntimeError.js";
import Sampler from "../Renderer/Sampler.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";

/**
 * glTF loading utilities.
 *
 * @namespace GltfLoaderUtil
 *
 * @private
 */
function GltfLoaderUtil() {}

/**
 * Get the image ID referenced by a texture.
 * <p>
 * When the texture has the EXT_texture_webp extension and the browser supports
 * WebP images the WebP image ID is returned.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.textureId The texture ID.
 * @param {Object.<String, Boolean>} options.supportedImageFormats The supported image formats.
 * @param {Boolean} options.supportedImageFormats.webp Whether the browser supports WebP images.
 * @param {Boolean} options.supportedImageFormats.s3tc Whether the browser supports s3tc compressed images.
 * @param {Boolean} options.supportedImageFormats.pvrtc Whether the browser supports pvrtc compressed images.
 * @param {Boolean} options.supportedImageFormats.etc1 Whether the browser supports etc1 compressed images.
 *
 * @returns {Number} The image ID.
 */
GltfLoaderUtil.getImageIdFromTexture = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var textureId = options.textureId;
  var supportedImageFormats = defaultValue(
    options.supportedImageFormats,
    defaultValue.EMPTY_OBJECT
  );
  var supportsWebP = supportedImageFormats.webp;
  var supportsS3tc = supportedImageFormats.s3tc;
  var supportsPvrtc = supportedImageFormats.pvrtc;
  var supportsEtc1 = supportedImageFormats.etc1;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.textureId", textureId);
  Check.typeOf.boolean("options.supportedImageFormats.webp", supportsWebP);
  Check.typeOf.boolean("options.supportedImageFormats.s3tc", supportsS3tc);
  Check.typeOf.boolean("options.supportedImageFormats.pvrtc", supportsPvrtc);
  Check.typeOf.boolean("options.supportedImageFormats.etc1", supportsEtc1);
  //>>includeEnd('debug');

  var texture = gltf.textures[textureId];
  var extensions = texture.extensions;
  if (defined(extensions)) {
    if (supportsWebP && defined(extensions.EXT_texture_webp)) {
      return extensions.EXT_texture_webp.source;
    }
  }
  return texture.source;
};

/**
 * Create a sampler for a texture.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.textureInfo The texture info object.
 *
 * @returns {Sampler} The sampler.
 */
GltfLoaderUtil.createSampler = function (options) {
  // TODO: feature ID textures and feature textures need to use NEAREST sampling
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var textureInfo = options.textureInfo;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.textureInfo", textureInfo);
  //>>includeEnd('debug');

  // Default sampler properties
  var wrapS = TextureWrap.REPEAT;
  var wrapT = TextureWrap.REPEAT;
  var minFilter = TextureMinificationFilter.LINEAR;
  var magFilter = TextureMagnificationFilter.LINEAR;

  var textureId = textureInfo.index;
  var texture = gltf.textures[textureId];
  var samplerId = texture.sampler;

  if (defined(samplerId)) {
    var sampler = gltf.samplers[samplerId];
    wrapS = defaultValue(sampler.wrapS, wrapS);
    wrapT = defaultValue(sampler.wrapT, wrapT);
    minFilter = defaultValue(sampler.minFilter, minFilter);
    magFilter = defaultValue(sampler.magFilter, magFilter);
  }

  var usesTextureTransform = false;
  var extensions = texture.extensions;
  if (defined(extensions) && defined(extensions.KHR_texture_transform)) {
    usesTextureTransform = true;
  }

  if (
    usesTextureTransform &&
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

/**
 * TODO: doc
 */
GltfLoaderUtil.getError = function (error, errorMessage) {
  if (defined(error)) {
    errorMessage += "\n" + error.message;
  }
  return new RuntimeError(errorMessage);
};
