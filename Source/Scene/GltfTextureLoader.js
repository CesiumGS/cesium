import Check from "../Core/Check.js";
import CesiumMath from "../Core/Math.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import PixelFormat from "../Core/PixelFormat.js";
import Texture from "../Renderer/Texture.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";
import JobType from "./JobType.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";
import resizeImageToNextPowerOfTwo from "../Core/resizeImageToNextPowerOfTwo.js";

/**
 * Loads a glTF texture.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfTextureLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.textureInfo The texture info object.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {SupportedImageFormats} options.supportedImageFormats The supported image formats.
 * @param {String} [options.cacheKey] The cache key of the resource.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @private
 */
export default function GltfTextureLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const resourceCache = options.resourceCache;
  const gltf = options.gltf;
  const textureInfo = options.textureInfo;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const supportedImageFormats = options.supportedImageFormats;
  const cacheKey = options.cacheKey;
  const asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.textureInfo", textureInfo);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.supportedImageFormats", supportedImageFormats);
  //>>includeEnd('debug');

  const textureId = textureInfo.index;

  // imageId is guaranteed to be defined otherwise the GltfTextureLoader
  // wouldn't have been created
  const imageId = GltfLoaderUtil.getImageIdFromTexture({
    gltf: gltf,
    textureId: textureId,
    supportedImageFormats: supportedImageFormats,
  });

  this._resourceCache = resourceCache;
  this._gltf = gltf;
  this._textureInfo = textureInfo;
  this._imageId = imageId;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._imageLoader = undefined;
  this._image = undefined;
  this._mipLevels = undefined;
  this._texture = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = undefined;
  this._process = function (loader, frameState) {};
}

if (defined(Object.create)) {
  GltfTextureLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfTextureLoader.prototype.constructor = GltfTextureLoader;
}

Object.defineProperties(GltfTextureLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready, or undefined if the resource hasn't started loading.
   *
   * @memberof GltfTextureLoader.prototype
   *
   * @type {Promise.<GltfTextureLoader>|undefined}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof GltfTextureLoader.prototype
   *
   * @type {String}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  /**
   * The texture.
   *
   * @memberof GltfTextureLoader.prototype
   *
   * @type {Texture}
   * @readonly
   * @private
   */
  texture: {
    get: function () {
      return this._texture;
    },
  },
});

const scratchTextureJob = new CreateTextureJob();

/**
 * Loads the resource.
 * @returns {Promise.<GltfDracoLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
GltfTextureLoader.prototype.load = function () {
  const resourceCache = this._resourceCache;
  const imageLoader = resourceCache.loadImage({
    gltf: this._gltf,
    imageId: this._imageId,
    gltfResource: this._gltfResource,
    baseResource: this._baseResource,
  });

  this._imageLoader = imageLoader;
  this._state = ResourceLoaderState.LOADING;
  const that = this;
  const processPromise = new Promise(function (resolve) {
    that._process = function (loader, frameState) {
      if (defined(loader._texture)) {
        // Already created texture
        return;
      }

      if (!defined(loader._image)) {
        // Not ready to create texture
        return;
      }

      let texture;

      if (loader._asynchronous) {
        const textureJob = scratchTextureJob;
        textureJob.set(
          loader._gltf,
          loader._textureInfo,
          loader._image,
          loader._mipLevels,
          frameState.context
        );
        const jobScheduler = frameState.jobScheduler;
        if (!jobScheduler.execute(textureJob, JobType.TEXTURE)) {
          // Job scheduler is full. Try again next frame.
          return;
        }
        texture = textureJob.texture;
      } else {
        texture = createTexture(
          loader._gltf,
          loader._textureInfo,
          loader._image,
          loader._mipLevels,
          frameState.context
        );
      }

      // Unload everything except the texture
      loader.unload();

      loader._texture = texture;
      loader._state = ResourceLoaderState.READY;
      resolve(loader);
    };
  });

  this._promise = imageLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }
      // Now wait for process() to run to finish loading
      that._image = imageLoader.image;
      that._mipLevels = imageLoader.mipLevels;
      that._state = ResourceLoaderState.PROCESSING;
      return processPromise;
    })
    .catch(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      that.unload();
      that._state = ResourceLoaderState.FAILED;
      const errorMessage = "Failed to load texture";
      return Promise.reject(that.getError(errorMessage, error));
    });

  return this._promise;
};

function CreateTextureJob() {
  this.gltf = undefined;
  this.textureInfo = undefined;
  this.image = undefined;
  this.context = undefined;
  this.texture = undefined;
}

CreateTextureJob.prototype.set = function (
  gltf,
  textureInfo,
  image,
  mipLevels,
  context
) {
  this.gltf = gltf;
  this.textureInfo = textureInfo;
  this.image = image;
  this.mipLevels = mipLevels;
  this.context = context;
};

CreateTextureJob.prototype.execute = function () {
  this.texture = createTexture(
    this.gltf,
    this.textureInfo,
    this.image,
    this.mipLevels,
    this.context
  );
};

function createTexture(gltf, textureInfo, image, mipLevels, context) {
  // internalFormat is only defined for CompressedTextureBuffer
  const internalFormat = image.internalFormat;

  let compressedTextureNoMipmap = false;
  if (PixelFormat.isCompressedFormat(internalFormat) && !defined(mipLevels)) {
    compressedTextureNoMipmap = true;
  }

  const sampler = GltfLoaderUtil.createSampler({
    gltf: gltf,
    textureInfo: textureInfo,
    compressedTextureNoMipmap: compressedTextureNoMipmap,
  });

  const minFilter = sampler.minificationFilter;
  const wrapS = sampler.wrapS;
  const wrapT = sampler.wrapT;

  const samplerRequiresMipmap =
    minFilter === TextureMinificationFilter.NEAREST_MIPMAP_NEAREST ||
    minFilter === TextureMinificationFilter.NEAREST_MIPMAP_LINEAR ||
    minFilter === TextureMinificationFilter.LINEAR_MIPMAP_NEAREST ||
    minFilter === TextureMinificationFilter.LINEAR_MIPMAP_LINEAR;

  // generateMipmap is disallowed for compressed textures. Compressed textures
  // can have mipmaps but they must come with the KTX2 instead of generated by
  // WebGL. Also note from the KHR_texture_basisu spec:
  //
  //   When a texture refers to a sampler with mipmap minification or when the
  //   sampler is undefined, the KTX2 image SHOULD contain a full mip pyramid.
  //
  const generateMipmap = !defined(internalFormat) && samplerRequiresMipmap;

  // WebGL 1 requires power-of-two texture dimensions for mipmapping and REPEAT/MIRRORED_REPEAT wrap modes.
  const requiresPowerOfTwo =
    generateMipmap ||
    wrapS === TextureWrap.REPEAT ||
    wrapS === TextureWrap.MIRRORED_REPEAT ||
    wrapT === TextureWrap.REPEAT ||
    wrapT === TextureWrap.MIRRORED_REPEAT;

  const nonPowerOfTwo =
    !CesiumMath.isPowerOfTwo(image.width) ||
    !CesiumMath.isPowerOfTwo(image.height);

  const requiresResize = requiresPowerOfTwo && nonPowerOfTwo;

  let texture;
  if (defined(internalFormat)) {
    if (
      !context.webgl2 &&
      PixelFormat.isCompressedFormat(internalFormat) &&
      nonPowerOfTwo &&
      requiresPowerOfTwo
    ) {
      console.warn(
        "Compressed texture uses REPEAT or MIRRORED_REPEAT texture wrap mode and dimensions are not powers of two. The texture may be rendered incorrectly."
      );
    }

    texture = Texture.create({
      context: context,
      source: {
        arrayBufferView: image.bufferView, // Only defined for CompressedTextureBuffer
        mipLevels: mipLevels,
      },
      width: image.width,
      height: image.height,
      pixelFormat: image.internalFormat, // Only defined for CompressedTextureBuffer
      sampler: sampler,
    });
  } else {
    if (requiresResize) {
      image = resizeImageToNextPowerOfTwo(image);
    }
    texture = Texture.create({
      context: context,
      source: image,
      sampler: sampler,
      flipY: false,
      skipColorSpaceConversion: true,
    });
  }

  if (generateMipmap) {
    texture.generateMipmap();
  }

  return texture;
}

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GltfTextureLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  return this._process(this, frameState);
};

/**
 * Unloads the resource.
 * @private
 */
GltfTextureLoader.prototype.unload = function () {
  if (defined(this._texture)) {
    this._texture.destroy();
  }

  if (defined(this._imageLoader)) {
    this._resourceCache.unload(this._imageLoader);
  }

  this._imageLoader = undefined;
  this._image = undefined;
  this._mipLevels = undefined;
  this._texture = undefined;
  this._gltf = undefined;
};
