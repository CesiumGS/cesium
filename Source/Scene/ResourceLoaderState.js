/**
 * The {@link ResourceLoader} state.
 *
 * @private
 */
var ResourceLoaderState = {
  UNLOADED: 0,
  LOADING: 1,
  READY: 2,
  FAILED: 3,
};
export default Object.freeze(ResourceLoaderState);
