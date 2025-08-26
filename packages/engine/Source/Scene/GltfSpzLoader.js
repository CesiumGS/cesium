import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import CesiumMath from "../Core/Math.js";
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
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._cacheKey = cacheKey;
  this._bufferViewLoader = undefined;
  this._bufferViewTypedArray = undefined;
  this._decodePromise = undefined;
  this._typedArray = undefined;
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
   * @type {Uint8Array}
   * @readonly
   * @private
   */
  typedArray: {
    get: function () {
      return this._typedArray;
    }
  }
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

function getTypedArray(gcloudData, attributeSemantic) {
  if (attributeSemantic === "POSITION") {
    return gcloudData.positions;
  }

  if (attributeSemantic === "_SCALE") {
    return gcloudData.scales;
  }
  
  if (attributeSemantic === "_ROTATION") {
    return gcloudData.rotations;
  }
  
  if (attributeSemantic === "COLOR_0") {
    const colors = gcloudData.colors;
    const alphas = gcloudData.alphas;
    const typedArray = new Uint8Array((colors.length / 3) * 4);
    for (let i = 0; i < colors.length / 3; i++) {
      typedArray[i * 4] = CesiumMath.clamp(
        colors[i * 3] * 255.0,
        0.0,
        255.0,
      );
      typedArray[i * 4 + 1] = CesiumMath.clamp(
        colors[i * 3 + 1] * 255.0,
        0.0,
        255.0,
      );
      typedArray[i * 4 + 2] = CesiumMath.clamp(
        colors[i * 3 + 2] * 255.0,
        0.0,
        255.0,
      );
      typedArray[i * 4 + 3] = CesiumMath.clamp(
        alphas[i] * 255.0,
        0.0,
        255.0,
      );
    }

    return typedArray;
  }
}

async function processDecode(loader, decodePromise) {
  try {
    const gcloudData = await decodePromise;
    if (loader.isDestroyed()) {
      return;
    }

    loader.unload();

    // TODO: Expose each typed array under each attribute semantic
    loader._typedArray = getTypedArray(gcloudData, loader._attributeSemantics)
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

  // Could not be scheduled this frame
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
  this._typedArray = undefined;
  this._gltf = undefined;
};

export default GltfSpzLoader;
