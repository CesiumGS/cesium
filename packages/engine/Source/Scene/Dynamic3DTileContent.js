import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Request from "../Core/Request.js";
import RequestState from "../Core/RequestState.js";
import RequestType from "../Core/RequestType.js";
import preprocess3DTileContent from "./preprocess3DTileContent.js";
import finishContent from "./finishContent.js";
import Cesium3DTileStyle from "./Cesium3DTileStyle.js";
import defer from "../Core/defer.js";
import Cartesian3 from "../Core/Cartesian3.js";

/**
 * A generic N-dimensional map, used internally for content lookups.
 *
 * <code>
 * // The "dimensions" (property names) are "x" and "y"
 * const ndMap = new NDMap(["x", "y"]);
 *
 * // The "x" and "y" properties of the key are used when
 * // storing the value under the given key. Any other
 * // properties are ignored.
 * const keyA = { x: 12, y: 34, otherProperty: "ignored" };
 * ndMap.set(keyA, "Example");
 *
 * // The "x" and "y" properties of the key are used when
 * // retrieving the value for the given key. Any other
 * // properties are ignored.
 * const keyB = { y: 34, x: 12, differentProperty: "alsoIgnored" };
 * const value = ndMap.get(keyB); // returns "Example"
 * </code>
 *
 * All functions that receive a "key" assume that the key contains properties
 * that have the dimension names that have been given in the constructor.
 *
 * TODO This should to be tested EXTENSIVELY.
 * Or let's just add the "@private" tag.
 */
class NDMap {
  /**
   * Create a new instance where the dimensions have the given names.
   *
   * These are the names of the properties that will be looked up
   * in the 'key' for set/get operations, to determine the coordinates
   * within the N-dimensional space.
   *
   * @param {string[]} dimensionNames
   */
  constructor(dimensionNames) {
    this._dimensionNames = dimensionNames;

    /**
     * The backing map.
     *
     * @type {Map}
     */
    this._lookup = new Map();
  }

  /**
   * Returns the number of dimensions of this map
   *
   * @type {number}
   */
  get _dimensions() {
    return this._dimensionNames.length;
  }

  /**
   * Returns the current size of this map
   *
   * @returns {number} The size
   */
  get size() {
    return this._lookup.size();
  }

  /**
   * Create the key (string) that will be used for the internal
   * lookup, based on the given key object.
   *
   * @param {object} key The key object
   * @returns {string} The lookup key
   */
  _computeLookupKey(key) {
    const k = {};
    const dimensionNames = this._dimensionNames;
    for (let d = 0; d < dimensionNames.length; d++) {
      const dimensionName = dimensionNames[d];
      k[dimensionName] = key[dimensionName];
    }
    return JSON.stringify(k);
  }

  /**
   * Parse an object from the given lookup key.
   *
   * The object reflects the relevant dimensions from
   * the 'dimensions' that this map refers to.
   *
   * @param {string} lookupKey The lookup string
   * @returns {object} The key
   */
  _parseLookupKey(lookupKey) {
    return JSON.parse(lookupKey);
  }

  /**
   * Set the value for the given key.
   *
   * @param {object} key The key
   * @param {any} value The value
   */
  set(key, value) {
    const lookupKey = this._computeLookupKey(key);
    this._lookup.set(lookupKey, value);
  }

  /**
   * Get the value for the given key.
   *
   * Returns <code>undefined</code> if there is no entry for this key.
   *
   * @param {object} key The key
   * @returns {any} The value
   */
  get(key) {
    const lookupKey = this._computeLookupKey(key);
    return this._lookup.get(lookupKey);
  }

  /**
   * Returns whether an entry exists for the given key.
   *
   * @param {object} key The key
   * @returns Whether the entry exists
   */
  has(key) {
    const lookupKey = this._computeLookupKey(key);
    return this._lookup.has(lookupKey);
  }

  /**
   * Delete the entry from the given key, if it exists.
   *
   * @param {key} key The key
   */
  delete(key) {
    const lookupKey = this._computeLookupKey(key);
    this._lookup.delete(lookupKey);
  }

  /**
   * Clear this map, removing all entries.
   */
  clear() {
    this._lookup.clear();
  }

  /**
   * Returns all keys that are stored in this map.
   *
   * Note that these objects are not identical to the keys that
   * have been used in the 'set' calls. They are just objects
   * that have the same relevant properties as these keys.
   *
   * @returns {Iterable} The keys
   */
  keys() {
    return this._lookup.keys().map((k) => this._parseLookupKey(k));
  }

  /**
   * Returns all values that are stored in this map.
   *
   * @returns {Iterable} The values
   */
  values() {
    return this._lookup.values();
  }

  /**
   * Returns the entries of this map
   *
   * @returns {Iterable} The entries
   */
  entries() {
    return this._lookup.entries().map(([k, v]) => [this._parseLookupKey(k), v]);
  }

  /**
   * Call the given function on each key/value pair
   *
   * @param {Function} callback The callback
   * @param {any} thisArg A value to use as this when executing the callback
   */
  forEach(callback, thisArg) {
    this._entries().forEach(callback, thisArg);
  }

  /**
   * Returns an iterator over the entries of this map
   *
   * @returns {Iterator} The iterator
   */
  [Symbol.iterator]() {
    return this.entries();
  }
}

/**
 * Implementation of an LRU (least recently used) cache.
 *
 * Calling the 'get' or 'set' function constitutes "using" the
 * respective key. When 'set' is called and this causes the
 * size of the cache to grow beyond its maximum size, then
 * the least recently used element will be evicted.
 *
 * It is possible to create a cache with an infinite maximum
 * size. In this case, the 'trimToSize' method can be used
 * to manually trim the cache to a certain size.
 *
 * The implementation resembles that of a Map
 */
class LRUCache {
  /**
   * Creates a new instance with the given maximum size.
   *
   * @param {number} maxSize The maximum size
   * @param {Function|undefined} evictionCallback The callback that will
   * receive the key and value of all evicted entries.
   */
  constructor(maxSize, evictionCallback) {
    this._maxSize = maxSize;
    this._evictionCallback = evictionCallback;

    /**
     * The backing map
     *
     * @type {Map}
     * @readonly
     */
    this._map = new Map();
  }

  /**
   * Set the maximum size that this cache may have.
   *
   * If the new maximum size is smaller than the current size
   * of this cache, then the least recently used elements will
   * be evicted until the size matches the maximum size.
   *
   * @param {number} maxSize The maximum size
   */
  setMaximumSize(maxSize) {
    this._maxSize = maxSize;
    this._ensureMaxSize();
  }

  /**
   * Returns the current size of this map
   *
   * @returns {number} The size
   */
  get size() {
    return this._map.size;
  }

  /**
   * Set the value for the given key.
   *
   * @param {object} key The key
   * @param {any} value The value
   */
  set(key, value) {
    this._map.delete(key);
    this._map.set(key, value);
    this._ensureMaxSize();
  }

  /**
   * Trim this cache to the given size.
   *
   * While the size is larger than the given size, the oldest
   * (least recently used) elements will be evicted.
   *
   * @param {number} newSize The new size
   */
  trimToSize(newSize) {
    while (this.size > newSize) {
      const oldestEntry = this._map.entries().next().value;
      const oldestKey = oldestEntry[0];
      this._map.delete(oldestKey);
      if (this._evictionCallback !== undefined) {
        const oldestValue = oldestEntry[1];
        this._evictionCallback(oldestKey, oldestValue);
      }
    }
  }

  /**
   * Ensure that the number of elements in this cache is not
   * larger than the maximum size.
   *
   * This will evict as many entries as necessary, in the
   * order of their least recent usage.
   */
  _ensureMaxSize() {
    this.trimToSize(this._maxSize);
  }

  /**
   * Get the value for the given key.
   *
   * Returns <code>undefined</code> if there is no entry for this key.
   *
   * @param {object} key The key
   * @returns {any} The value
   */
  get(key) {
    if (this._map.has(key)) {
      const value = this._map.get(key);

      // Remove the entry and add it again, to put it
      // at the end of the map (most recently used)
      this._map.delete(key);
      this._map.set(key, value);
      return value;
    }
    return undefined;
  }

  /**
   * Returns whether an entry exists for the given key.
   *
   * @param {object} key The key
   * @returns Whether the entry exists
   */
  has(key) {
    return this._map.has(key);
  }

  /**
   * Delete the entry from the given key, if it exists.
   *
   * @param {key} key The key
   */
  delete(key) {
    this._map.delete(key);
  }

  /**
   * Clear this map, removing all entries.
   */
  clear() {
    this._map.clear();
  }

  /**
   * Returns the keys of this map
   *
   * @returns {Iterable} The keys
   */
  keys() {
    return this._map.keys();
  }

  /**
   * Returns the values of this map
   *
   * @returns {Iterable} The values
   */
  values() {
    return this._map.values();
  }

  /**
   * Returns the entries of this map
   *
   * @returns {Iterable} The entries
   */
  entries() {
    return this._map.entries();
  }

  /**
   * Call the given function on each key/value pair
   *
   * @param {Function} callback The callback
   * @param {any} thisArg A value to use as this when executing the callback
   */
  forEach(callback, thisArg) {
    this._map.forEach(callback, thisArg);
  }

  /**
   * Returns an iterator over the elements of this cache.
   *
   * @returns {Iterator} The iterator
   */
  [Symbol.iterator]() {
    return this._map[Symbol.iterator];
  }
}

/**
 * A class serving as a convenience wrapper around a request for
 * a resource.
 */
class RequestHandle {
  /**
   * Creates a new request handle for requesting the data for
   * the given resource.
   *
   * @param {Resource} resource The resource
   */
  constructor(resource) {
    this._resource = resource;

    /**
     * The actual CesiumJS Request object.
     *
     * This created when 'ensureRequested' is called and no
     * request (promise) is currently pending.
     *
     * @type {Request|undefined}
     */
    this._request = undefined;

    /**
     * The possibly pending request promise.
     *
     * This created when 'ensureRequested' is called and no
     * request (promise) is currently pending.
     *
     * @type {Promise<ArrayBuffer>|undefined}
     */
    this._requestPromise = undefined;

    /**
     * The deferred object that contains the promise for the
     * actual result (i.e. the response from the request).
     *
     * This is created once and never changes. Its promise can
     * be obtained with 'getResultPromise'.
     *
     * @type {object}
     * @readonly
     */
    this._deferred = defer();
  }

  /**
   * Returns the promise for the result of the request.
   *
   * This will never be 'undefined'. It will never change. It will
   * just be a promise that is either fulfilled with the response
   * data from the equest, or rejected with an error indicating
   * the reason for the rejection.
   *
   * The reason for the rejection can either be a real error,
   * or 'RequestState.CANCELLED' when the request was cancelled
   * (or never issued due to this throttling thingy).
   *
   * @returns {Promise<ArrayBuffer>} The promise
   */
  getResultPromise() {
    return this._deferred.promise;
  }

  /**
   * Ensure that there is a pending request, and that the promise
   * that was returned bs 'getResultPromise' will eventually be
   * fulfilled or rejected.
   *
   * This has to be called ~"in each frame". It will take care of
   * making sure that the request is actually going out, eventually.
   */
  ensureRequested() {
    // Return immediately if there already is a pending promise.
    if (defined(this._requestPromise)) {
      return;
    }

    // XXX_DYNAMIC The tileset.statistics.numberOfAttemptedRequests
    // and tileset.statistics.numberOfPendingRequests values will
    // have to be updated here. This class should not know these
    // statistics, and even less know the tileset.

    // XXX_DYNAMIC: The Multiple3DTileContent class rambled about it being
    // important to CLONE the resource, because of some resource leak, and
    // to create a new request, to "avoid getting stuck in the cancelled state".
    // Nobody knows what this was about. Let's wait for the issue to come in.

    // Create the request and assign it to the resource.
    const request = this._createRequest();
    this._request = request;
    const resource = this._resource;
    resource.request = request;

    // Try to perform the actual request. Note that throttling may cause
    // 'fetchArrayBuffer' to return 'undefined'. In this case, wait for
    // the next call to 'ensureRequested'.
    const requestPromise = resource.fetchArrayBuffer();
    if (!defined(requestPromise)) {
      return;
    }

    this._requestPromise = requestPromise;

    // When the promise is fulfilled, resolve it with the array buffer
    // from the response.
    // Regardless of whether the promise is fulfilled or rejected (with
    // an 'undefined' error), it may always have been cancelled. No
    // matter where the cancellation appears, reject the result promise
    // with the CANCELLED state.
    const onFulfilled = (arrayBuffer) => {
      if (request.state === RequestState.CANCELLED) {
        console.log(
          `RequestHandle: Resource promise fulfilled but cancelled for ${request.url}`,
        );
        this._requestPromise = undefined;
        this._deferred.reject(RequestState.CANCELLED);
        return;
      }
      console.log(
        `RequestHandle: Resource promise fulfilled for ${request.url}`,
      );
      this._deferred.resolve(arrayBuffer);
    };

    // Only when there is a real error, reject the result promise with
    // this exact error. Otherwise, do that CANCELLED handling.
    const onRejected = (error) => {
      console.log(
        `RequestHandle: Resource promise rejected for ${request.url} with error ${error}`,
      );
      if (request.state === RequestState.CANCELLED) {
        console.log(
          `RequestHandle: Resource promise rejected but actually only cancelled for ${request.url} - better luck next time!`,
        );
        this._requestPromise = undefined;
        this._deferred.reject(RequestState.CANCELLED);
        return;
      }
      this._deferred.reject(error);
    };
    requestPromise.then(onFulfilled, onRejected);
  }

  /**
   * Create and return the request.
   *
   * This is similar to what was done in Multiple3DTileContent, except
   * for the "priority function", which may not be applicable here...
   *
   * @returns {Request} The request
   */
  _createRequest() {
    const priorityFunction = () => {
      return 0;
    };
    const request = new Request({
      throttle: true,
      throttleByServer: true,
      type: RequestType.TILES3D,
      priorityFunction: priorityFunction,
    });
    return request;
  }

  /**
   * Cancel any pending request.
   *
   * This will cause a rejection
   */
  cancel() {
    if (defined(this._request)) {
      // XXX_DYNAMIC For some reason, "cancel()" is
      // marked as "private". So there is no valid
      // way to cancel a request after all.
      this._request.cancel();
      this._request = undefined;
    }
    this._deferred.reject(RequestState.CANCELLED);
  }
}

/**
 * A class summarizing what is necessary to request tile content.
 *
 * Its main functionality is offered via the 'tryGetContent' function.
 * It handles the "laziness" of the content request, and simply
 * returns the content when it's done, and otherwise, it returns
 * 'undefined', but ensures that there is a pending request and the
 * content will eventually be available. When the content request
 * or creation fails, then this will be indicated by the 'failed'
 * flag becoming 'true'.
 *
 * The purpose of this class is to encapuslate the lifecycle
 * and asynchronicity of content creation. Users should always
 * and only use this content handle, and not rely on the presence
 * of the content object, and not store the content object once
 * it is created.
 *
 * @example
 * // Pseudocode:
 * const contentHandle = new ContentHandle(...);
 * inEachFrame() {
 *   if (contentHandle.failed) {
 *     console.log("Error!");
 *     return;
 *   }
 *   const content = contentHandle.tryGetContent();
 *   if (!defined(content)) {
 *      console.log("Still waiting for content");
 *      return;
 *   }
 *   console.log("Got content: ", content);
 * }
 */
class ContentHandle {
  /**
   * Creates a new instance for the specified content of the given tile.
   *
   * @param {Cesium3DTile} tile The tile that the content belongs to
   * @param {Resource} baseResource The base resource that the URLs
   * will be resolved against.
   * @param {object} contentHeader The content header, which is just the
   * JSON representation of the 'content' from the tileset JSON.
   */
  constructor(tile, baseResource, contentHeader) {
    this._tile = tile;
    this._baseResource = baseResource;
    this._contentHeader = contentHeader;

    /**
     * The request handle that will be used for issuing the actual
     * request.
     *
     * This will be created when 'tryGetContent' is called. When
     * its associated promise is fulfilled, then the actual
     * content is created from the response.
     *
     * @type {RequestHandle|undefined}
     */
    this._requestHandle = undefined;

    /**
     * The actual content that was created.
     *
     * Calling 'tryGetContent' will initiate the creation of the
     * content. When the underlying request succeeds and the
     * content can be created, this will store the resulting
     * content.
     *
     * @type {Cesium3DTileContent|undefined}
     */
    this._content = undefined;

    /**
     * Whether the content creation failed.
     *
     * See 'get failed()' for details.
     *
     * @type {boolean}
     */
    this._failed = false;
  }

  /**
   * Returns whether the content creation ultimately failed.
   *
   * This will be 'true' if the underlying request was attempted
   * and really failed (meaning that it was not just cancelled
   * or deferred, but really failed, e.g. due to an invalid
   * URL), OR when the creation of the content from the request
   * response failed.
   *
   * The state of this flag will be reset to 'false' when calling
   * the 'reset()' method.
   *
   * @returns {boolean} Whether the request or content creation failed
   */
  get failed() {
    return this._failed;
  }

  /**
   * Returns the content if it was already requested, received and created.
   *
   * This will not attempt to request or create the content. It will only
   * return the content if it already exists. When this returns 'undefined',
   * then the content was not requested yet, or the content creation
   * actually failed. The latter can be checked with the 'failed()' getter.
   *
   * @returns {Cesium3DTileContent|undefined} The content
   */
  getContentOptional() {
    if (this.failed) {
      //console.log(`ContentHandle: Failed for ${this._contentHeader.uri}`);
      return undefined;
    }
    if (defined(this._content)) {
      //console.log(`ContentHandle: Content exists for ${this._contentHeader.uri}`);
      return this._content;
    }
    return undefined;
  }

  /**
   * Tries to obtain the content.
   *
   * If the content was already requested, received, and created, then
   * this will return the content.
   *
   * Otherwise, this will return 'undefined'.
   *
   * If the request did not already fail, it will trigger the request
   * and content creation if necessary, so that this method
   * (or 'getContentOptional') will eventually return the content if
   * its creation succeeds.
   *
   * @returns {Cesium3DTileContent|undefined} The content
   */
  tryGetContent() {
    const content = this.getContentOptional();
    if (defined(content)) {
      return content;
    }
    // Don't retry a failed request
    if (this.failed) {
      return undefined;
    }
    this._ensureRequestPending();
    return undefined;
  }

  /**
   * Ensures that there is a pending request for the content.
   *
   * If there already is a request handle, then its 'ensureRequested'
   * function will be called
   *
   * Otherwise, this will create a request handle for the content request.
   * When the request succeeds, then the content will be created from
   * the response. When the request or the content creation fails, then
   * this content handle will turn into the 'failed()' state.
   */
  _ensureRequestPending() {
    if (defined(this._requestHandle)) {
      this._requestHandle.ensureRequested();
      return;
    }

    // Create the actual request handle
    const uri = this._contentHeader.uri;
    const baseResource = this._baseResource;
    const resource = baseResource.getDerivedResource({
      url: uri,
    });
    const requestHandle = new RequestHandle(resource);
    this._requestHandle = requestHandle;
    const requestHandleResultPromise = requestHandle.getResultPromise();

    // When the request succeeds, try to create the content
    // and store it as 'this._content'. If the content
    // creation fails, store this as 'this._failed'.
    const onRequestFulfilled = async (arrayBuffer) => {
      console.log(`ContentHandle: Request was fulfilled for ${uri}`);
      try {
        const content = await this._createContent(resource, arrayBuffer);
        console.log(`ContentHandle: Content was created for ${uri}`);
        this._content = content;
        // XXX_DYNAMIC Trigger some update...?!
      } catch (error) {
        console.log(
          `ContentHandle: Content creation for ${uri} caused error ${error}`,
        );
        this._failed = true;
      }
    };

    // The request being rejected may have different reasons.
    // It might really have failed. It may just have been
    // cancelled. It may count as cancelled because it was
    // not scheduled at all. Try to handle each case here:
    const onRequestRejected = (error) => {
      console.log(
        `ContentHandle: Request was rejected for ${uri} with error ${error}`,
      );
      // Apparently, cancelling causes a rejection.
      // This should not count as "failed". Instead,
      // the request handle is discarded, so that it
      // will be re-created during the next call to
      // _ensureRequestPending
      if (error === RequestState.CANCELLED) {
        console.log(
          `ContentHandle: Request was rejected for ${uri}, but actually only cancelled. Better luck next time!`,
        );
        this._requestHandle = undefined;
        return;
      }

      // Other errors should indeed cause this handle
      // to be marked as "failed"
      this._failed = true;
    };
    requestHandleResultPromise.then(onRequestFulfilled, onRequestRejected);
    requestHandle.ensureRequested();
  }

  /**
   * Creates and returns the content for the given array buffer that was obtained
   * as the response data for the given resource.
   *
   * @param {Resource} resource The content resource
   * @param {ArrayBuffer} arrayBuffer The array buffer that was
   * obtained as the response to the request.
   * @returns {Cesium3DTileContent} The content
   * @throws If the content creation fails for whatever reason
   */
  _createContent(resource, arrayBuffer) {
    const preprocessed = preprocess3DTileContent(arrayBuffer);
    const contentHeader = this._contentHeader;
    const tile = this._tile;
    return finishContent(tile, resource, preprocessed, contentHeader, 0);
  }

  /**
   * Reset this handle to its initial state.
   *
   * This will cancel any pending requests, destroy any content that may
   * already have been created, and prepare the handle to retry the
   * requests and content creation when 'tryGetContent' is called.
   */
  reset() {
    if (defined(this._requestHandle)) {
      console.log(
        `ContentHandle: Cancelling request for ${this._contentHeader.uri}`,
      );
      this._requestHandle.cancel();
    }
    this._requestHandle = undefined;
    if (defined(this._content)) {
      this._content.destroy();
    }
    this._content = undefined;
    this._failed = false;
  }
}

// XXX_DYNAMIC See where to put these. Should be static
// properties, but eslint complains about that.
const DYNAMIC_CONTENT_HIDE_STYLE = new Cesium3DTileStyle({
  show: false,
});
const DYNAMIC_CONTENT_SHOW_STYLE = new Cesium3DTileStyle({
  show: true,
});

/**
 * XXX_DYNAMIC Comments!
 *
 * NOTE: Some of the more obscure request handling has been taken from
 * Multiple3DTileContent.
 *
 *
 * @extends Cesium3DTileContent
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * Yup. It's a class. Sanity is spreading. Get used to it.
 */
class Dynamic3DTileContent {
  /**
   * Creates an instance of Dynamic3DTileContent from a parsed JSON object
   * @param {Cesium3DTileset} tileset The tileset that the content belongs to
   * @param {Cesium3DTile} tile The tile that contained the content
   * @param {Resource} tilesetResource The tileset Resource
   * @param {object} contentJson The content JSON that contains the 'dynamicContents' array
   * @returns {Dynamic3DTileContent}
   */
  static fromJson(tileset, tile, resource, contentJson) {
    const content = new Dynamic3DTileContent(
      tileset,
      tile,
      resource,
      contentJson,
    );
    return content;
  }

  /**
   * Creates a new instance.
   *
   * This should only be called from 'fromJson'.
   *
   * @constructor
   *
   * @param {Cesium3DTileset} tileset The tileset this content belongs to
   * @param {Cesium3DTile} tile The content this content belongs to
   * @param {Resource} tilesetResource The resource that points to the tileset. This will be used to derive each inner content's resource.
   * @param {object} contentJson The content JSON that contains the 'dynamicContents' array
   *
   * @private
   */
  constructor(tileset, tile, tilesetResource, contentJson) {
    this._tileset = tileset;
    this._tile = tile;
    this._baseResource = tilesetResource;

    /**
     * The array of content objects.
     *
     * Each of these objects is a 3D Tiles 'content', with an
     * additional 'keys' property that contains the keys that
     * are used for selecting the "active" content at any
     * point in time.
     *
     * @type {object[]} The dynamic contents array
     */
    this._dynamicContents = contentJson.dynamicContents;

    /**
     * A mapping from URL strings to ContentHandle objects.
     *
     * This is initialized with all the content definitions that
     * are found in the 'dynamicContents' array. It will create
     * one ContentHandle for each content. This map will never
     * be modified after it was created.
     *
     * @type {Map<string, ContentHandle>}
     * @readonly
     */
    this._contentHandles = this._createContentHandles();

    /**
     * The maximum number of content objects that should be kept
     * in memory at the same time.
     *
     * This is initialized with an arbitrary value. It will be
     * increased as necessary to accommodate for the maximum
     * number of contents that are found to be "active" at
     * the same time.
     *
     * @type {number}
     */
    this._loadedContentHandlesMaxSize = 10;

    /**
     * The mapping from URLs to the ContentHandle objects whose
     * content is currently defined (i.e. loaded).
     *
     * This will be filled in the 'update' function, evicting
     * the least recently used content handles if necessary,
     * and calling 'loadedContentHandleEvicted' for them.
     *
     * It is initialized with a maximum size of +Infinity.
     * The maximum size will be ensured by calling its
     * trimToSize function accordingly.
     *
     * @type {LRUCache}
     */
    this._loadedContentHandles = new LRUCache(
      Number.POSITIVE_INFINITY,
      this.loadedContentHandleEvicted,
    );

    /**
     * The mapping from "keys" to arrays(!) of URIs for the dynamic content.
     *
     * The keys are the 'keys' from the 'dynamicContents' array. They
     * are just plain structures like
     * '{ time: "2025-09-13", revision: "revision0" }
     * that are used for looking up the associated URLs.
     *
     * This lookup will be used for determining the 'activeContentUris':
     * The 'dynamicContentPropertyProvider' of the tileset will return
     * an object that serves as a key for this lookup. The corresponding
     * values (URIs) are the URIs of the contents that are currently active.
     *
     * @type {NDMap}
     */
    this._dynamicContentUriLookup = this._createDynamicContentUriLookup();

    /**
     * The last style that was applied to this content.
     *
     * It will be applied to all "active" contents in the 'update'
     * function.
     *
     * @type {Cesium3DTileStyle}
     */
    this._lastStyle = DYNAMIC_CONTENT_SHOW_STYLE;
  }

  /**
   * The function that will be called when a content handle is
   * evicted from the '_loadedContentHandles'.
   *
   * This will be called when the size of the '_loadedContentHandles'
   * is trimmed to the '_loadedContentHandlesMaxSize', and receive
   * the least recently used content handles.
   *
   * It will call 'reset()' on the content handle, cancelling all
   * pending requests, and destroying the content.
   *
   * @param {string} uri The URI of the evicted content
   * @param {ContentHandle} contentHandle The ContentHandle
   */
  loadedContentHandleEvicted(uri, contentHandle) {
    console.log("_loadedContentHandleEvicted with ", uri);
    contentHandle.reset();
  }

  /**
   * Create the mapping from URL strings to ContentHandle objects.
   *
   * This is called once from the constructor. The content handles
   * will be used for tracking the process of requesting and
   * creating the content objects.
   *
   * @returns {Map}
   */
  _createContentHandles() {
    const dynamicContents = this._dynamicContents;

    const contentHandles = new Map();
    for (let i = 0; i < dynamicContents.length; i++) {
      const contentHeader = dynamicContents[i];
      const contentHandle = new ContentHandle(
        this._tile,
        this._baseResource,
        contentHeader,
      );
      const uri = contentHeader.uri;
      contentHandles.set(uri, contentHandle);
    }
    return contentHandles;
  }

  /**
   * Creates the mapping from the "keys" that are found in the
   * 'dynamicContents' array, to the arrays of URLs that are
   * associated with these keys.
   *
   * @returns {NDMap} The mapping
   */
  _createDynamicContentUriLookup() {
    // XXX_DYNAMIC This assumes the presence and structure
    // of the extension object. Add error handling here.
    const tileset = this.tileset;
    const topLevelExtensionObject = tileset.extensions["3DTILES_dynamic"];
    const dimensions = topLevelExtensionObject.dimensions;
    const dimensionNames = dimensions.map((d) => d.name);

    const dynamicContents = this._dynamicContents;
    const dynamicContentUriLookup = new NDMap(dimensionNames);
    for (let i = 0; i < dynamicContents.length; i++) {
      const dynamicContent = dynamicContents[i];
      let entries = dynamicContentUriLookup.get(dynamicContent.keys);
      if (!defined(entries)) {
        entries = Array();
        dynamicContentUriLookup.set(dynamicContent.keys, entries);
      }
      const uri = dynamicContent.uri;
      entries.push(uri);
    }
    return dynamicContentUriLookup;
  }

  /**
   * Returns the array of URIs of contents that are currently 'active'.
   *
   * This will query the 'dynamicContentPropertyProvider' of the tileset.
   * This provider returns what serves as a 'key' for the
   * '_dynamicContentUriLookup'. This method returns the array of
   * URIs that are found in that lookup, for the respective key.
   *
   * @type {string[]} The active content URIs
   */
  get _activeContentUris() {
    const tileset = this._tileset;
    let dynamicContentPropertyProvider = tileset.dynamicContentPropertyProvider;

    // XXX_DYNAMIC For testing
    if (!defined(dynamicContentPropertyProvider)) {
      console.log("No dynamicContentPropertyProvider, using default");
      dynamicContentPropertyProvider = () => {
        return {
          exampleTimeStamp: "2025-09-26",
          exampleRevision: "revision2",
        };
      };
      tileset.dynamicContentPropertyProvider = dynamicContentPropertyProvider;
    }

    const currentProperties = dynamicContentPropertyProvider();
    const lookup = this._dynamicContentUriLookup;
    const currentEntries = lookup.get(currentProperties) ?? [];
    return currentEntries;
  }

  /**
   * Returns the contents that are currently "active" AND loaded (!).
   *
   * This will obtain the '_activeContentUris'. For each URI, it will
   * check whether the content was already requested and created. If
   * it was already requested and created, it will be contained in
   * the returned array.
   *
   * @type {Cesium3DTileContent[]}
   */
  get _activeContents() {
    const activeContents = [];
    const activeContentUris = this._activeContentUris;
    for (const activeContentUri of activeContentUris) {
      const contentHandle = this._contentHandles.get(activeContentUri);
      const activeContent = contentHandle.tryGetContent();
      if (defined(activeContent)) {
        activeContents.push(activeContent);
      }
    }
    return activeContents;
  }

  /**
   * Returns ALL content URIs that have been defined as contents
   * in the dynamic content definition.
   *
   * @type {string[]} The content URIs
   */
  get _allContentUris() {
    // TODO Should be computed from the dynamicContents,
    // once, in the constructor, as a SET (!)
    const keys = this._contentHandles.keys();
    const allContentUris = [...keys];
    return allContentUris;
  }

  /**
   * Returns ALL contents that are currently loaded.
   *
   * @type {Cesium3DTileContent[]} The contents
   */
  get _allContents() {
    const allContents = [];
    const contentHandleValues = this._contentHandles.values();
    for (const contentHandle of contentHandleValues) {
      const content = contentHandle.getContentOptional();
      if (defined(content)) {
        allContents.push(content);
      }
    }
    return allContents;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface. Checks if any of the inner contents have dirty featurePropertiesDirty.
   *
   * @type {boolean}
   */
  get featurePropertiesDirty() {
    const allContents = this._allContents;
    for (const content of allContents) {
      if (content.featurePropertiesDirty) {
        return true;
      }
    }

    return false;
  }
  set featurePropertiesDirty(value) {
    const allContents = this._allContents;
    for (const content of allContents) {
      content.featurePropertiesDirty = value;
    }
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   * Always returns <code>0</code>.  Instead call <code>featuresLength</code> for a specific inner content.
   *
   * @type {number}
   * @readonly
   */
  get featuresLength() {
    return 0;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   * Always returns <code>0</code>.  Instead, call <code>pointsLength</code> for a specific inner content.
   *
   * @type {number}
   * @readonly
   */
  get pointsLength() {
    return 0;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   * Always returns <code>0</code>.  Instead call <code>trianglesLength</code> for a specific inner content.
   *
   * @type {number}
   * @readonly
   */
  get trianglesLength() {
    return 0;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   * Always returns <code>0</code>.  Instead call <code>geometryByteLength</code> for a specific inner content.
   *
   * @type {number}
   * @readonly
   */
  get geometryByteLength() {
    return 0;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   * Always returns <code>0</code>.  Instead call <code>texturesByteLength</code> for a specific inner content.
   *
   * @type {number}
   * @readonly
   */
  get texturesByteLength() {
    return 0;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   * Always returns <code>0</code>.  Instead call <code>batchTableByteLength</code> for a specific inner content.
   *
   * @type {number}
   * @readonly
   */
  get batchTableByteLength() {
    return 0;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  get innerContents() {
    return this._allContents;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * @type {boolean}
   * @readonly
   */
  get ready() {
    // XXX_DYNAMIC Always true....!?
    return true;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  get tileset() {
    return this._tileset;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  get tile() {
    return this._tile;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Unlike other content types, this content does not
   * have a single URL, so this returns undefined.
   *
   * @type {string}
   * @readonly
   * @private
   */
  get url() {
    return undefined;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Always returns <code>undefined</code>.  Instead call <code>metadata</code> for a specific inner content.
   */
  get metadata() {
    return undefined;
  }
  set metadata(value) {
    ////>>includeStart('debug', pragmas.debug);
    //throw new DeveloperError("This content cannot have metadata");
    ////>>includeEnd('debug');
    console.log(
      "Assigning metadata to dynamic content - what should that even mean?",
      value,
    );
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Always returns <code>undefined</code>.  Instead call <code>batchTable</code> for a specific inner content.
   */
  get batchTable() {
    return undefined;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Always returns <code>undefined</code>.  Instead call <code>group</code> for a specific inner content.
   */
  get group() {
    return undefined;
  }
  set group(value) {
    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError("This content cannot have group metadata");
    //>>includeEnd('debug');
  }

  /**
   * Cancel all requests for inner contents. This is called by the tile
   * when a tile goes out of view.
   *
   * XXX_DYNAMIC See checks for "tile.hasMultipleContents"
   * This comment is WRONG. The conditions under which it is called are
   * completely unclear. They are related to some frame counters and the
   * tile state and some flags of the tile.
   */
  cancelRequests() {
    console.log("Cancelling requests for Dynamic3DTileContent");
    for (const contentHandle of this._contentHandles.values()) {
      contentHandle.reset();
    }
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Always returns <code>false</code>.  Instead call <code>hasProperty</code> for a specific inner content
   */
  hasProperty(batchId, name) {
    return false;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Always returns <code>undefined</code>.  Instead call <code>getFeature</code> for a specific inner content
   */
  getFeature(batchId) {
    return undefined;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  applyDebugSettings(enabled, color) {
    // XXX_DYNAMIC This has to store the last state, probably,
    // and assign it in "update" to all contents that became active
    const allContents = this._allContents;
    for (const content of allContents) {
      content.applyDebugSettings(enabled, color);
    }
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  applyStyle(style) {
    this._lastStyle = style;
    const activeContents = this._activeContents;
    for (const activeContent of activeContents) {
      activeContent.applyStyle(style);
    }
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  update(tileset, frameState) {
    // Call the 'update' on all contents.
    const allContents = this._allContents;
    for (const content of allContents) {
      content.update(tileset, frameState);
    }

    // XXX_DYNAMIC There is no way to show or hide contents.
    // Whether something is shown or not eventually depends
    // on whether draw commands are scheduled. This happens
    // as part of the "update" call. The "update" does not
    // differentiate between "doing random stuff that has
    // to be done somewhere", and scheduling the draw commands.
    // It could be called "doRandomStuff" at this point.

    // Hide all contents.
    for (const content of allContents) {
      content.applyStyle(DYNAMIC_CONTENT_HIDE_STYLE);
    }

    // Show only the active contents.
    const activeContents = this._activeContents;
    for (const activeContent of activeContents) {
      activeContent.applyStyle(this._lastStyle);
    }

    this._unloadOldContent();
  }

  /**
   * Unload the least-recently used content.
   */
  _unloadOldContent() {
    // Collect all content handles that have a content that
    // is currently loaded
    const loadedContentHandles = this._loadedContentHandles;
    const contentHandleEntries = this._contentHandles.entries();
    for (const [url, contentHandle] of contentHandleEntries) {
      if (!loadedContentHandles.has(url)) {
        const content = contentHandle.getContentOptional();
        if (defined(content)) {
          loadedContentHandles.set(url, contentHandle);
        }
      }
    }

    // Mark the active contents as "recently used"
    const activeContentUris = this._activeContentUris;
    for (const activeContentUri of activeContentUris) {
      if (loadedContentHandles.has(activeContentUri)) {
        loadedContentHandles.get(activeContentUri);
      }
    }

    // Ensure that at least the number of active contents
    // is retained
    const numActiveContents = activeContentUris.length;
    this._loadedContentHandlesMaxSize = Math.max(
      this._loadedContentHandlesMaxSize,
      numActiveContents,
    );

    // Trim the LRU cache to the target size, calling the
    // '_loadedContentHandleEvicted' for the least recently
    // used content handles.
    loadedContentHandles.trimToSize(this._loadedContentHandlesMaxSize);
  }

  // XXX_DYNAMIC Unused right now...
  /**
   * Computes the difference of the given iterables.
   *
   * This will return a set containing all elements from the
   * first iterable, omitting the ones from the second iterable.
   *
   * @param {Iterable} iterable0 The base set
   * @param {Iterable} iterable1 The set to remove
   * @returns {Iterable} The difference
   */
  static _difference(iterable0, iterable1) {
    const difference = new Set(iterable0);
    iterable1.forEach((e) => difference.delete(e));
    return difference;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Find an intersection between a ray and the tile content surface that was rendered. The ray must be given in world coordinates.
   *
   * @param {Ray} ray The ray to test for intersection.
   * @param {FrameState} frameState The frame state.
   * @param {Cartesian3|undefined} [result] The intersection or <code>undefined</code> if none was found.
   * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.
   */
  pick(ray, frameState, result) {
    let intersection;
    let minDistance = Number.POSITIVE_INFINITY;
    const contents = this._activeContents;
    const length = contents.length;

    for (let i = 0; i < length; ++i) {
      const candidate = contents[i].pick(ray, frameState, result);

      if (!defined(candidate)) {
        continue;
      }

      const distance = Cartesian3.distance(ray.origin, candidate);
      if (distance < minDistance) {
        intersection = candidate;
        minDistance = distance;
      }
    }

    if (!defined(intersection)) {
      return undefined;
    }
    return result;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  destroy() {
    const allContents = this._allContents;
    for (const content of allContents) {
      content.destroy();
    }
    return destroyObject(this);
  }
}

export default Dynamic3DTileContent;
