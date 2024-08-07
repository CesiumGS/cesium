import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Event from "../Core/Event.js";
import loadKTX2 from "../Core/loadKTX2.js";
import PixelFormat from "../Core/PixelFormat.js";
import CubeMap from "../Renderer/CubeMap.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";

/**
 * Manages a cube map for use as a specular environment map.
 *
 * @alias SpecularEnvironmentCubeMap
 * @constructor
 *
 * @param {string} url The url to the KTX2 file containing the specular environment map and convoluted mipmaps.
 * @private
 */
function SpecularEnvironmentCubeMap(url) {
  this._url = url;

  this._cubeMapBuffers = undefined;
  this._texture = undefined;

  this._maximumMipmapLevel = undefined;

  this._loading = false;
  this._ready = false;

  this._errorEvent = new Event();
}

Object.defineProperties(SpecularEnvironmentCubeMap.prototype, {
  /**
   * The url to the KTX2 file containing the specular environment map and convoluted mipmaps.
   * @memberof SpecularEnvironmentCubeMap.prototype
   * @type {string}
   * @readonly
   */
  url: {
    get: function () {
      return this._url;
    },
  },
  /**
   * Gets an event that is raised when encountering an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.
   * @memberof SpecularEnvironmentCubeMap.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },
  /**
   * A texture containing all the packed convolutions.
   * @memberof SpecularEnvironmentCubeMap.prototype
   * @type {Texture}
   * @readonly
   */
  texture: {
    get: function () {
      return this._texture;
    },
  },
  /**
   * The maximum number of mip levels with valid environment map data.
   * This may differ from the number of mips in the WebGL cubemap.
   * The data loaded at <code>maximumMipmapLevel</code> is suitable for
   * PBR rendering of a material with maximum roughness (1.0).
   * @memberOf SpecularEnvironmentCubeMap.prototype
   * @type {number}
   * @readonly
   */
  maximumMipmapLevel: {
    get: function () {
      return this._maximumMipmapLevel;
    },
  },
  /**
   * Determines if the cube map is complete and ready to use.
   * @memberof SpecularEnvironmentCubeMap.prototype
   * @type {boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },
});

SpecularEnvironmentCubeMap.isSupported = function (context) {
  const supportsFloatBuffersAndTextures =
    (context.colorBufferHalfFloat && context.halfFloatingPointTexture) ||
    (context.floatingPointTexture && context.colorBufferFloat);
  return supportsFloatBuffersAndTextures && context.supportsTextureLod;
};

function cleanupResources(map) {
  map._cubeMapBuffers = undefined;
}

/**
 * Loads the environment map image and constructs the cube map for specular radiance calculations.
 * <p>
 * Once the image is loaded, the next call cleans up unused resources. Every call after that is a no-op.
 * </p>
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
SpecularEnvironmentCubeMap.prototype.update = function (frameState) {
  const { context } = frameState;

  if (!SpecularEnvironmentCubeMap.isSupported(context)) {
    return;
  }

  if (defined(this._texture)) {
    cleanupResources(this);
    return;
  }

  if (!defined(this._texture) && !this._loading) {
    const cachedTexture = context.textureCache.getTexture(this._url);
    if (defined(cachedTexture)) {
      cleanupResources(this);
      this._texture = cachedTexture;
      this._maximumMipmapLevel = this._texture.maximumMipmapLevel;
      this._ready = true;
    }
  }

  const cubeMapBuffers = this._cubeMapBuffers;
  if (!defined(cubeMapBuffers) && !this._loading) {
    const that = this;
    loadKTX2(this._url)
      .then(function (buffers) {
        that._cubeMapBuffers = buffers;
        that._loading = false;
      })
      .catch(function (error) {
        if (that.isDestroyed()) {
          return;
        }
        that._errorEvent.raiseEvent(error);
      });
    this._loading = true;
  }

  if (!defined(this._cubeMapBuffers)) {
    return;
  }

  // Datatype is defined if it is a normalized type (i.e. ..._UNORM, ..._SFLOAT)
  let { pixelDatatype } = cubeMapBuffers[0].positiveX;
  if (!defined(pixelDatatype)) {
    pixelDatatype = context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT;
  }
  const pixelFormat = PixelFormat.RGBA;

  const mipLevels = cubeMapBuffers.length;
  this._maximumMipmapLevel = mipLevels - 1;

  const faceSize = cubeMapBuffers[0].positiveX.width;
  const expectedMipLevels = Math.log2(faceSize) + 1;
  if (mipLevels !== expectedMipLevels) {
    // We assume the last supplied mip level was computed as the specular radiance
    // for roughness 1.0.
    // Fill the remaining levels with null values, to avoid WebGL errors.
    const dummyMipLevel = {};
    Object.values(CubeMap.FaceName).forEach((faceName) => {
      dummyMipLevel[faceName] = undefined;
    });
    for (let mipLevel = mipLevels; mipLevel < expectedMipLevels; mipLevel++) {
      cubeMapBuffers.push(dummyMipLevel);
    }
  }

  const sampler = new Sampler({
    minificationFilter: TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
  });

  const cubeMap = new CubeMap({
    context: context,
    source: cubeMapBuffers[0],
    flipY: false,
    pixelDatatype: pixelDatatype,
    pixelFormat: pixelFormat,
    sampler: sampler,
  });
  cubeMap.loadMipmaps(cubeMapBuffers.slice(1));
  this._texture = cubeMap;

  this._texture.maximumMipmapLevel = this._maximumMipmapLevel;
  context.textureCache.addTexture(this._url, this._texture);

  this._ready = true;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see SpecularEnvironmentCubeMap#destroy
 */
SpecularEnvironmentCubeMap.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see SpecularEnvironmentCubeMap#isDestroyed
 */
SpecularEnvironmentCubeMap.prototype.destroy = function () {
  cleanupResources(this);
  this._texture = this._texture && this._texture.destroy();
  return destroyObject(this);
};
export default SpecularEnvironmentCubeMap;
