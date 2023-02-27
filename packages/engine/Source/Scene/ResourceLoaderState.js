/**
 * The {@link ResourceLoader} state.
 *
 * @private
 */
const ResourceLoaderState = {
  /**
   * The resource has not yet been loaded.
   *
   * @type {number}
   * @constant
   * @private
   */
  UNLOADED: 0,
  /**
   * The resource is loading. In this state, external resources are fetched as needed.
   *
   * @type {number}
   * @constant
   * @private
   */
  LOADING: 1,
  /**
   * The resource has finished loading, but requires further processing. GPU resources are allocated in this state as needed.
   *
   * @type {number}
   * @constant
   * @private
   */
  PROCESSING: 2,
  /**
   * The resource has finished loading and processing; the results are ready to be used.
   *
   * @type {number}
   * @constant
   * @private
   */
  READY: 3,
  /**
   * The resource loading or processing has failed due to an error.
   *
   * @type {number}
   * @constant
   * @private
   */
  FAILED: 4,
};
export default Object.freeze(ResourceLoaderState);
