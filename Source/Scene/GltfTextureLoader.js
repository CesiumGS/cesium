import Check from "../Core/Check.js";
import CesiumMath from "../Core/Math.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Texture from "../Renderer/Texture.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import when from "../ThirdParty/when.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";
import JobType from "./JobType.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

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
  var resourceCache = options.resourceCache;
  var gltf = options.gltf;
  var textureInfo = options.textureInfo;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var supportedImageFormats = options.supportedImageFormats;
  var cacheKey = options.cacheKey;
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.textureInfo", textureInfo);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.supportedImageFormats", supportedImageFormats);
  //>>includeEnd('debug');

  var textureId = textureInfo.index;

  // imageId is guaranteed to be defined otherwise the GltfTextureLoader
  // wouldn't have been created
  var imageId = GltfLoaderUtil.getImageIdFromTexture({
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
  this._promise = when.defer();
}

if (defined(Object.create)) {
  GltfTextureLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfTextureLoader.prototype.constructor = GltfTextureLoader;
}

Object.defineProperties(GltfTextureLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfTextureLoader.prototype
   *
   * @type {Promise.<GltfTextureLoader>}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise.promise;
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

/**
 * Loads the resource.
 * @private
 */
GltfTextureLoader.prototype.load = function () {
  var resourceCache = this._resourceCache;
  var imageLoader = resourceCache.loadImage({
    gltf: this._gltf,
    imageId: this._imageId,
    gltfResource: this._gltfResource,
    baseResource: this._baseResource,
  });

  this._imageLoader = imageLoader;
  this._state = ResourceLoaderState.LOADING;

  var that = this;

  imageLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }
      // Now wait for process() to run to finish loading
      that._image = imageLoader.image;
      that._mipLevels = imageLoader.mipLevels;
      that._state = ResourceLoaderState.PROCESSING;
    })
    .otherwise(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      that.unload();
      that._state = ResourceLoaderState.FAILED;
      var errorMessage = "Failed to load texture";
      that._promise.reject(that.getError(errorMessage, error));
    });
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

function resizeImageToNextPowerOfTwo(image) {
  var canvas = document.createElement("canvas");
  canvas.width = CesiumMath.nextPowerOfTwo(image.width);
  canvas.height = CesiumMath.nextPowerOfTwo(image.height);
  var canvasContext = canvas.getContext("2d");
  canvasContext.drawImage(
    image,
    0,
    0,
    image.width,
    image.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas;
}

function createTexture(gltf, textureInfo, image, mipLevels, context) {
  var sampler = GltfLoaderUtil.createSampler({
    gltf: gltf,
    textureInfo: textureInfo,
  });

  var minFilter = sampler.minificationFilter;
  var wrapS = sampler.wrapS;
  var wrapT = sampler.wrapT;

  // internalFormat is only defined for CompressedTextureBuffer
  var internalFormat = image.internalFormat;

  var samplerRequiresMipmap =
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
  var generateMipmap = !defined(internalFormat) && samplerRequiresMipmap;

  // WebGL 1 requires power-of-two texture dimensions for mipmapping and REPEAT/MIRRORED_REPEAT wrap modes.
  var requiresPowerOfTwo =
    generateMipmap ||
    wrapS === TextureWrap.REPEAT ||
    wrapS === TextureWrap.MIRRORED_REPEAT ||
    wrapT === TextureWrap.REPEAT ||
    wrapT === TextureWrap.MIRRORED_REPEAT;

  var nonPowerOfTwo =
    !CesiumMath.isPowerOfTwo(image.width) ||
    !CesiumMath.isPowerOfTwo(image.height);

  var requiresResize = requiresPowerOfTwo && nonPowerOfTwo;

  var texture;
  if (defined(internalFormat)) {
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

var scratchTextureJob = new CreateTextureJob();

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

  if (defined(this._texture)) {
    // Already created texture
    return;
  }

  if (!defined(this._image)) {
    // Not ready to create texture
    return;
  }

  var texture;

  if (this._asynchronous) {
    var textureJob = scratchTextureJob;
    textureJob.set(
      this._gltf,
      this._textureInfo,
      this._image,
      this._mipLevels,
      frameState.context
    );
    var jobScheduler = frameState.jobScheduler;
    if (!jobScheduler.execute(textureJob, JobType.TEXTURE)) {
      // Job scheduler is full. Try again next frame.
      return;
    }
    texture = textureJob.texture;
  } else {
    texture = createTexture(
      this._gltf,
      this._textureInfo,
      this._image,
      this._mipLevels,
      frameState.context
    );
  }

  // Unload everything except the texture
  this.unload();

  this._texture = texture;
  this._state = ResourceLoaderState.READY;
  this._promise.resolve(this);
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
