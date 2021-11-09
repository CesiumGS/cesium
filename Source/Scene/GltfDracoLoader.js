import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import when from "../ThirdParty/when.js";
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
export default function GltfDracoLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var resourceCache = options.resourceCache;
  var gltf = options.gltf;
  var draco = options.draco;
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var cacheKey = options.cacheKey;

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
  this._promise = when.defer();
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
      return this._promise.promise;
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
 * @private
 */
GltfDracoLoader.prototype.load = function () {
  var resourceCache = this._resourceCache;
  var bufferViewLoader = resourceCache.loadBufferView({
    gltf: this._gltf,
    bufferViewId: this._draco.bufferView,
    gltfResource: this._gltfResource,
    baseResource: this._baseResource,
  });

  this._bufferViewLoader = bufferViewLoader;
  this._state = ResourceLoaderState.LOADING;

  var that = this;

  bufferViewLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }
      // Now wait for process() to run to finish loading
      that._bufferViewTypedArray = bufferViewLoader.typedArray;
      that._state = ResourceLoaderState.PROCESSING;
    })
    .otherwise(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      handleError(that, error);
    });
};

function handleError(dracoLoader, error) {
  dracoLoader.unload();
  dracoLoader._state = ResourceLoaderState.FAILED;
  var errorMessage = "Failed to load Draco";
  dracoLoader._promise.reject(dracoLoader.getError(errorMessage, error));
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

  if (!defined(this._bufferViewTypedArray)) {
    // Not ready to decode the Draco buffer
    return;
  }

  if (defined(this._decodePromise)) {
    // Currently decoding
    return;
  }

  var draco = this._draco;
  var gltf = this._gltf;
  var bufferViews = gltf.bufferViews;
  var bufferViewId = draco.bufferView;
  var bufferView = bufferViews[bufferViewId];
  var compressedAttributes = draco.attributes;

  var decodeOptions = {
    // Need to make a copy of the typed array otherwise the underlying
    // ArrayBuffer may be accessed on both the worker and the main thread. This
    // leads to errors such as "ArrayBuffer at index 0 is already detached".
    // PERFORMANCE_IDEA: Look into SharedArrayBuffer to get around this.
    array: new Uint8Array(this._bufferViewTypedArray),
    bufferView: bufferView,
    compressedAttributes: compressedAttributes,
    dequantizeInShader: true,
  };

  var decodePromise = DracoLoader.decodeBufferView(decodeOptions);

  if (!defined(decodePromise)) {
    // Cannot schedule task this frame
    return;
  }

  var that = this;
  this._decodePromise = decodePromise
    .then(function (results) {
      if (that.isDestroyed()) {
        return;
      }
      // Unload everything except the decoded data
      that.unload();

      that._decodedData = {
        indices: results.indexArray,
        vertexAttributes: results.attributeData,
      };
      that._state = ResourceLoaderState.READY;
      that._promise.resolve(that);
    })
    .otherwise(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      handleError(that, error);
    });
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
