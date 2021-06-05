import Cartesian2 from "../Core/Cartesian2.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
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
var GltfLoaderUtil = {};

/**
 * Get the uri or buffer view for an image.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {Number} options.imageId The image ID.
 * @param {SupportedImageFormats} options.supportedImageFormats The supported image formats.
 *
 * @returns {Object} An object containing a <code>uri</code> and <code>bufferView</code> property.
 * @private
 */
GltfLoaderUtil.getImageUriOrBufferView = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var imageId = options.imageId;
  var supportedImageFormats = options.supportedImageFormats;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.imageId", imageId);
  Check.typeOf.object("options.supportedImageFormats", supportedImageFormats);
  //>>includeEnd('debug');

  var image = gltf.images[imageId];
  var extras = image.extras;

  var bufferViewId = image.bufferView;
  var uri = image.uri;

  // First check for a compressed texture
  if (defined(extras) && defined(extras.compressedImage3DTiles)) {
    var crunch = extras.compressedImage3DTiles.crunch;
    var s3tc = extras.compressedImage3DTiles.s3tc;
    var pvrtc = extras.compressedImage3DTiles.pvrtc1;
    var etc1 = extras.compressedImage3DTiles.etc1;

    if (supportedImageFormats.s3tc && defined(crunch)) {
      if (defined(crunch.bufferView)) {
        bufferViewId = crunch.bufferView;
      } else {
        uri = crunch.uri;
      }
    } else if (supportedImageFormats.s3tc && defined(s3tc)) {
      if (defined(s3tc.bufferView)) {
        bufferViewId = s3tc.bufferView;
      } else {
        uri = s3tc.uri;
      }
    } else if (supportedImageFormats.pvrtc && defined(pvrtc)) {
      if (defined(pvrtc.bufferView)) {
        bufferViewId = pvrtc.bufferView;
      } else {
        uri = pvrtc.uri;
      }
    } else if (supportedImageFormats.etc1 && defined(etc1)) {
      if (defined(etc1.bufferView)) {
        bufferViewId = etc1.bufferView;
      } else {
        uri = etc1.uri;
      }
    }
  }

  return {
    bufferViewId: bufferViewId,
    uri: uri,
  };
};

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
 * @param {SupportedImageFormats} options.supportedImageFormats The supported image formats.
 *
 * @returns {Number} The image ID.
 * @private
 */
GltfLoaderUtil.getImageIdFromTexture = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var textureId = options.textureId;
  var supportedImageFormats = options.supportedImageFormats;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.number("options.textureId", textureId);
  Check.typeOf.object("options.supportedImageFormats", supportedImageFormats);
  //>>includeEnd('debug');

  var texture = gltf.textures[textureId];
  var extensions = texture.extensions;
  if (defined(extensions)) {
    if (supportedImageFormats.webp && defined(extensions.EXT_texture_webp)) {
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
 * @private
 */
GltfLoaderUtil.createSampler = function (options) {
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
  var extensions = textureInfo.extensions;
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

var defaultScale = new Cartesian2(1.0, 1.0);

/**
 * Create a model texture.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.textureInfo The texture info JSON.
 * @param {String} [options.channels] The texture channels to read from.
 * @param {Texture} [options.texture] The texture object.
 *
 * @returns {ModelComponents.Texture} The texture.
 */
GltfLoaderUtil.createModelTexture = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var textureInfo = options.textureInfo;
  var channels = options.channels;
  var texture = options.texture;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.textureInfo", textureInfo);
  //>>includeEnd('debug');

  var texCoord = defaultValue(textureInfo.texCoord, 0);
  var transform;

  var textureTransform = defaultValue(
    textureInfo.extensions,
    defaultValue.EMPTY_OBJECT
  ).KHR_texture_transform;

  if (defined(textureTransform)) {
    texCoord = defaultValue(textureTransform.texCoord, texCoord);

    var offset = defined(textureTransform.offset)
      ? Cartesian2.unpack(textureTransform.offset)
      : Cartesian2.ZERO;
    var rotation = defaultValue(textureTransform.rotation, 0.0);
    var scale = defined(textureTransform.scale)
      ? Cartesian2.unpack(textureTransform.scale)
      : defaultScale;

    // prettier-ignore
    transform = new Matrix3(
        Math.cos(rotation) * scale.x, -Math.sin(rotation) * scale.y, offset.x,
        Math.sin(rotation) * scale.x, Math.cos(rotation) * scale.y, offset.y,
        0.0, 0.0, 1.0
      );
  }

  var modelTexture = new ModelComponents.Texture();
  modelTexture.texture = texture;
  modelTexture.texCoord = texCoord;
  modelTexture.transform = transform;
  modelTexture.channels = channels;

  return modelTexture;
};

export default GltfLoaderUtil;
