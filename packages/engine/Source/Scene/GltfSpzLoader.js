import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";
import { loadSpz } from "@spz-loader/core";

/**
 * Load a SPZ buffer from a glTF.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 * @alias GltfSpzLoader
 * @constructor
 * @augments ResourceLoader
 * @param {object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {object} options.gltf The glTF JSON.
 * @param {object} options.primitive The primitive containing the SPZ extension.
 * @param {object} options.spz The SPZ extension object.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {string} [options.cacheKey] The cache key of the resource.
 *
 * @private
 */
function GltfSpzLoader(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const resourceCache = options.resourceCache;
  const gltf = options.gltf;
  const primitive = options.primitive;
  const spz = options.spz;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.primitive", primitive);
  Check.typeOf.object("options.spz", spz);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._primitive = primitive;
  this._spz = spz;
  this._cacheKey = cacheKey;
  this._bufferViewLoader = undefined;
  this._bufferViewTypedArray = undefined;
  this._decodePromise = undefined;
  this._decodedData = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = undefined;
  this._spzError = undefined;
}

if (defined(Object.create)) {
  GltfSpzLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfSpzLoader.prototype.constructor = GltfSpzLoader;
}

Object.defineProperties(GltfSpzLoader.prototype, {
  /**
   * The cache key of the resource.
   * @memberof GltfSpzLoader.prototype
   * @type {string}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  /**
   * The decoded SPZ data.
   * @memberof GltfSpzLoader.prototype
   * @type {object}
   * @readonly
   * @private
   */
  decodedData: {
    get: function () {
      return this._decodedData;
    },
  },
});

async function loadResources(loader) {
  const resourceCache = loader._resourceCache;
  try {
    const bufferViewLoader = resourceCache.getBufferViewLoader({
      gltf: loader._gltf,
      bufferViewId: 0,
      gltfResource: loader._gltfResource,
      baseResource: loader._baseResource,
    });
    loader._bufferViewLoader = bufferViewLoader;
    await bufferViewLoader.load();

    if (loader.isDestroyed()) {
      return;
    }

    loader._bufferViewTypedArray = bufferViewLoader.typedArray;
    loader._state = ResourceLoaderState.PROCESSING;
    return loader;
  } catch (error) {
    if (loader.isDestroyed()) {
      return;
    }

    handleError(loader, error);
  }
}

/**
 * Loads the SPZ resource.
 * @returns {Promise<Resource>} A promise that resolves to the resource when the SPZ is loaded.
 * @private
 */
GltfSpzLoader.prototype.load = async function () {
  if (defined(this._promise)) {
    return this._promise;
  }

  this._state = ResourceLoaderState.LOADING;
  this._promise = loadResources(this);
  return this._promise;
};

function handleError(spzLoader, error) {
  spzLoader.unload();
  spzLoader._state = ResourceLoaderState.FAILED;
  const errorMessage = "Failed to load SPZ";
  throw spzLoader.getError(errorMessage, error);
}

async function processDecode(loader, decodePromise) {
  try {
    const gcloud = await decodePromise;
    if (loader.isDestroyed()) {
      return;
    }

    loader.unload();

    loader._decodedData = {
      gcloud: gcloud,
    };
    loader._state = ResourceLoaderState.READY;
    return loader._baseResource;
  } catch (error) {
    if (loader.isDestroyed()) {
      return;
    }

    loader._spzError = error;
  }
}

/**
 * Processes the SPZ resource.
 * @param {FrameState} frameState The frame state.
 * @private
 */
GltfSpzLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (this._state === ResourceLoaderState.READY) {
    return true;
  }

  if (this._state !== ResourceLoaderState.PROCESSING) {
    return false;
  }

  if (defined(this._spzError)) {
    handleError(this, this._spzError);
  }

  if (!defined(this._bufferViewTypedArray)) {
    return false;
  }

  if (defined(this._decodePromise)) {
    return false;
  }

  const decodePromise = loadSpz(this._bufferViewTypedArray, {
    unpackOptions: { coordinateSystem: "UNSPECIFIED" },
  });

  if (!defined(decodePromise)) {
    return false;
  }

  this._decodePromise = processDecode(this, decodePromise);
};

/**
 * Unloads the SPZ resource and frees associated resources.
 * @private
 */
GltfSpzLoader.prototype.unload = function () {
  if (defined(this._bufferViewLoader)) {
    this._resourceCache.unload(this._bufferViewLoader);
  }

  this._bufferViewLoader = undefined;
  this._bufferViewTypedArray = undefined;
  this._decodedData = undefined;
  this._gltf = undefined;
  this._primitive = undefined;
};

export default GltfSpzLoader;
