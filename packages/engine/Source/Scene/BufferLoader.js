import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads an embedded or external buffer.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @private
 */
class BufferLoader extends ResourceLoader {
  /**
   * @param {object} options Object with the following properties:
   * @param {Uint8Array} [options.typedArray] The typed array containing the embedded buffer contents. Mutually exclusive with options.resource.
   * @param {Resource} [options.resource] The {@link Resource} pointing to the external buffer. Mutually exclusive with options.typedArray.
   * @param {string} [options.cacheKey] The cache key of the resource.
   *
   * @exception {DeveloperError} One of options.typedArray and options.resource must be defined.
   */
  constructor(options) {
    super();

    options = options ?? Frozen.EMPTY_OBJECT;
    const typedArray = options.typedArray;
    const resource = options.resource;
    const cacheKey = options.cacheKey;

    //>>includeStart('debug', pragmas.debug);
    if (defined(typedArray) === defined(resource)) {
      throw new DeveloperError(
        "One of options.typedArray and options.resource must be defined.",
      );
    }
    //>>includeEnd('debug');

    this._typedArray = typedArray;
    this._resource = resource;
    this._cacheKey = cacheKey;
    this._state = ResourceLoaderState.UNLOADED;
    this._promise = undefined;
  }

  /**
   * The cache key of the resource.
   *
   * @memberof BufferLoader.prototype
   *
   * @type {string}
   * @readonly
   * @private
   */
  get cacheKey() {
    return this._cacheKey;
  }

  /**
   * The typed array containing the embedded buffer contents.
   *
   * @memberof BufferLoader.prototype
   *
   * @type {Uint8Array}
   * @readonly
   * @private
   */
  get typedArray() {
    return this._typedArray;
  }

  /**
   * Loads the resource.
   * @returns {Promise<BufferLoader>} A promise which resolves to the loader when the resource loading is completed.
   * @private
   */
  async load() {
    if (defined(this._promise)) {
      return this._promise;
    }

    if (defined(this._typedArray)) {
      this._promise = Promise.resolve(this);
      return this._promise;
    }

    this._promise = loadExternalBuffer(this);
    return this._promise;
  }

  /**
   * Exposed for testing
   * @private
   */
  static _fetchArrayBuffer(resource) {
    return resource.fetchArrayBuffer();
  }

  /**
   * Unloads the resource.
   * @private
   */
  unload() {
    this._typedArray = undefined;
  }
}

async function loadExternalBuffer(bufferLoader) {
  const resource = bufferLoader._resource;
  bufferLoader._state = ResourceLoaderState.LOADING;
  try {
    const arrayBuffer = await BufferLoader._fetchArrayBuffer(resource);
    if (bufferLoader.isDestroyed()) {
      return;
    }

    bufferLoader._typedArray = new Uint8Array(arrayBuffer);
    bufferLoader._state = ResourceLoaderState.READY;
    return bufferLoader;
  } catch (error) {
    if (bufferLoader.isDestroyed()) {
      return;
    }

    bufferLoader._state = ResourceLoaderState.FAILED;
    const errorMessage = `Failed to load external buffer: ${resource.url}`;
    throw bufferLoader.getError(errorMessage, error);
  }
}

export default BufferLoader;
