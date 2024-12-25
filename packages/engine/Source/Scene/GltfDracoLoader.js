import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DracoLoader from "./DracoLoader.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Load a draco buffer from a glTF.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfDracoLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {object} options.gltf The glTF JSON.
 * @param {object} options.draco The Draco extension object.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {string} [options.cacheKey] The cache key of the resource.
 *
 * @private
 */
function GltfDracoLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const resourceCache = options.resourceCache;
  const gltf = options.gltf;
  const draco = options.draco;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.resourceCache", resourceCache);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.draco", draco);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  this._resourceCache = resourceCache;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._draco = draco;
  this._cacheKey = cacheKey;
  this._bufferViewLoader = undefined;
  this._bufferViewTypedArray = undefined;
  this._decodePromise = undefined;
  this._decodedData = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = undefined;
  this._dracoError = undefined;
}

if (defined(Object.create)) {
  GltfDracoLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfDracoLoader.prototype.constructor = GltfDracoLoader;
}

Object.defineProperties(GltfDracoLoader.prototype, {
  /**
   * The cache key of the resource.
   *
   * @memberof GltfDracoLoader.prototype
   *
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
   * The decoded data.
   *
   * @memberof GltfDracoLoader.prototype
   *
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

/**
 * The only function that is called from the "ResourceLoader.load" implementation
 * of this class: It loads the buffer view data that is referred to by the
 * draco extension object.
 *
 * When the returned promise completes, then the loaded buffer view data will
 * be available as a typed array, namely, the "loader._bufferViewTypedArray",
 * and the state of the given loader will be ResourceLoaderState.PROCESSING.
 *
 * Based on this state, the "ResourceLoader.process" function of this class
 * will decode this typed array. The resulting decoded data will be handled
 * in "processDecode"
 *
 * @param {GltfDracoLoader} loader - The loader, "this"
 * @returns A promise that is fulfilled when the resources are loaded
 */
async function loadResources(loader) {
  const resourceCache = loader._resourceCache;
  try {
    const bufferViewLoader = resourceCache.getBufferViewLoader({
      gltf: loader._gltf,
      bufferViewId: loader._draco.bufferView,
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
 * Loads the resource.
 * @returns {Promise<GltfDracoLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
GltfDracoLoader.prototype.load = async function () {
  if (defined(this._promise)) {
    return this._promise;
  }

  this._state = ResourceLoaderState.LOADING;
  this._promise = loadResources(this);
  return this._promise;
};

function handleError(dracoLoader, error) {
  dracoLoader.unload();
  dracoLoader._state = ResourceLoaderState.FAILED;
  const errorMessage = "Failed to load Draco";
  throw dracoLoader.getError(errorMessage, error);
}

/**
 * Will be called from the "ResourceLoader.process" implementation of
 * this class, as soon as the underlying raw buffer view data has
 * been draco-decoded from the "loader._bufferViewTypedArray" and
 * converted into a structure that contains the "indexArray"
 * and the "attributeData" from the Draco decoding process.
 *
 * The resulting data will be stored as the "loader._decodedData".
 *
 * The exact structure of this data is not known (by me), but it is
 * later accessed with lines like
 * <code><pre>
 * dracoLoader.decodedData.indices.typedArray
 * dracoLoader.decodedData.vertexAttributes[semantic].array
 * </pre></code>
 *
 * @param {GltfDracoLoader} loader - The draco loader, "this"
 * @param {Promise<object>} decodePromise - The promise that returns
 * the decoded data.
 * @returns A promise that fulfills when the decoded data is stored
 * in the loader
 */
async function processDecode(loader, decodePromise) {
  try {
    const results = await decodePromise;
    if (loader.isDestroyed()) {
      return;
    }

    // Unload everything except the decoded data
    loader.unload();

    loader._decodedData = {
      indices: results.indexArray,
      vertexAttributes: results.attributeData,
    };
    loader._state = ResourceLoaderState.READY;
    return loader._baseResource;
  } catch (error) {
    if (loader.isDestroyed()) {
      return;
    }

    // Capture this error so it can be thrown on the next `process` call
    loader._dracoError = error;
  }
}

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GltfDracoLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (this._state === ResourceLoaderState.READY) {
    return true;
  }

  if (this._state !== ResourceLoaderState.PROCESSING) {
    return false;
  }

  if (defined(this._dracoError)) {
    handleError(this, this._dracoError);
  }

  if (!defined(this._bufferViewTypedArray)) {
    // Not ready to decode the Draco buffer
    return false;
  }

  if (defined(this._decodePromise)) {
    // Currently decoding
    return false;
  }

  const draco = this._draco;
  const gltf = this._gltf;
  const bufferViews = gltf.bufferViews;
  const bufferViewId = draco.bufferView;
  const bufferView = bufferViews[bufferViewId];
  const compressedAttributes = draco.attributes;

  const decodeOptions = {
    // Need to make a copy of the typed array otherwise the underlying
    // ArrayBuffer may be accessed on both the worker and the main thread. This
    // leads to errors such as "ArrayBuffer at index 0 is already detached".
    // PERFORMANCE_IDEA: Look into SharedArrayBuffer to get around this.
    array: new Uint8Array(this._bufferViewTypedArray),
    bufferView: bufferView,
    compressedAttributes: compressedAttributes,
    dequantizeInShader: true,
  };

  const decodePromise = DracoLoader.decodeBufferView(decodeOptions);

  if (!defined(decodePromise)) {
    // Cannot schedule task this frame
    return false;
  }

  this._decodePromise = processDecode(this, decodePromise);
};

/**
 * Unloads the resource.
 * @private
 */
GltfDracoLoader.prototype.unload = function () {
  if (defined(this._bufferViewLoader)) {
    this._resourceCache.unload(this._bufferViewLoader);
  }

  this._bufferViewLoader = undefined;
  this._bufferViewTypedArray = undefined;
  this._decodedData = undefined;
  this._gltf = undefined;
};

export default GltfDracoLoader;
