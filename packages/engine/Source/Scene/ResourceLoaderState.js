/**
 * The {@link ResourceLoader} state.
 *
 * @private
 */
const ResourceLoaderState = {
  /**
   * The resource has not yet been loaded.
   *
   * @type {Number}
   * @constant
   * @private
   */
  UNLOADED: 0,
  /**
   * The resource is loading. In this state, external resources are fetched as needed.
   *
   * @type {Number}
   * @constant
   * @private
   */
  LOADING: 1,
  /**
   * The resource has finished loading, but requires further processing.
   *
   * @type {Number}
   * @constant
   * @private
   */
  LOADED: 2,
  /**
   * The resource is processing. GPU resources are allocated in this state as needed.
   *
   * @type {Number}
   * @constant
   * @private
   */
  PROCESSING: 3,
  /**
   * The resource has finished loading and processing; the results are ready to be used.
   *
   * @type {Number}
   * @constant
   * @private
   */
  READY: 4,
  /**
   * The resource loading or processing has failed due to an error.
   *
   * @type {Number}
   * @constant
   * @private
   */
  FAILED: 5,
};
export default Object.freeze(ResourceLoaderState);
