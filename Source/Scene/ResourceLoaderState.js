/**
 * The {@link ResourceLoader} state.
 *
 * @private
 */
var ResourceLoaderState = {
  UNLOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  READY: 3,
  FAILED: 4,
};
export default Object.freeze(ResourceLoaderState);
