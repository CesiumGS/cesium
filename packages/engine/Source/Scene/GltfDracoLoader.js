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
 * @param {Object} options Object with the following properties:
 * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
 * @param {Object} options.gltf The glTF JSON.
 * @param {Object} options.draco The Draco extension object.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {String} [options.cacheKey] The cache key of the resource.
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
  this._process = function (loader, frameState) {};
}

if (defined(Object.create)) {
  GltfDracoLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfDracoLoader.prototype.constructor = GltfDracoLoader;
}

Object.defineProperties(GltfDracoLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfDracoLoader.prototype
   *
   * @type {Promise.<GltfDracoLoader>}
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
   * @memberof GltfDracoLoader.prototype
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
   * The decoded data.
   *
   * @memberof GltfDracoLoader.prototype
   *
   * @type {Object}
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
 * Loads the resource.
 * @returns {Promise.<GltfDracoLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
GltfDracoLoader.prototype.load = function () {
  const resourceCache = this._resourceCache;
  const bufferViewLoader = resourceCache.loadBufferView({
    gltf: this._gltf,
    bufferViewId: this._draco.bufferView,
    gltfResource: this._gltfResource,
    baseResource: this._baseResource,
  });

  this._bufferViewLoader = bufferViewLoader;
  this._state = ResourceLoaderState.LOADING;
  const that = this;
  const dracoPromise = new Promise(function (resolve, reject) {
    that._process = function (loader, frameState) {
      if (!defined(loader._bufferViewTypedArray)) {
        // Not ready to decode the Draco buffer
        return;
      }

      if (defined(loader._decodePromise)) {
        // Currently decoding
        return;
      }

      const draco = loader._draco;
      const gltf = loader._gltf;
      const bufferViews = gltf.bufferViews;
      const bufferViewId = draco.bufferView;
      const bufferView = bufferViews[bufferViewId];
      const compressedAttributes = draco.attributes;

      const decodeOptions = {
        // Need to make a copy of the typed array otherwise the underlying
        // ArrayBuffer may be accessed on both the worker and the main thread. This
        // leads to errors such as "ArrayBuffer at index 0 is already detached".
        // PERFORMANCE_IDEA: Look into SharedArrayBuffer to get around this.
        array: new Uint8Array(loader._bufferViewTypedArray),
        bufferView: bufferView,
        compressedAttributes: compressedAttributes,
        dequantizeInShader: true,
      };

      const decodePromise = DracoLoader.decodeBufferView(decodeOptions);

      if (!defined(decodePromise)) {
        // Cannot schedule task this frame
        return;
      }

      loader._decodePromise = decodePromise
        .then(function (results) {
          if (loader.isDestroyed()) {
            resolve();
            return;
          }

          // Unload everything except the decoded data
          loader.unload();

          loader._decodedData = {
            indices: results.indexArray,
            vertexAttributes: results.attributeData,
          };
          loader._state = ResourceLoaderState.READY;
          resolve(loader);
        })
        .catch(function (e) {
          if (loader.isDestroyed()) {
            resolve();
            return;
          }

          reject(e);
        });
    };
  });

  this._promise = bufferViewLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }
      // Now wait for process() to run to finish loading
      that._bufferViewTypedArray = bufferViewLoader.typedArray;
      that._state = ResourceLoaderState.PROCESSING;

      return dracoPromise;
    })
    .catch(function (error) {
      if (that.isDestroyed()) {
        return;
      }

      return handleError(that, error);
    });

  return this._promise;
};

function handleError(dracoLoader, error) {
  dracoLoader.unload();
  dracoLoader._state = ResourceLoaderState.FAILED;
  const errorMessage = "Failed to load Draco";
  return Promise.reject(dracoLoader.getError(errorMessage, error));
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

  return this._process(this, frameState);
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
