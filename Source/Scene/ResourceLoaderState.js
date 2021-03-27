/**
 * The {@link ResourceLoader} state.
 *
 * @private
 */
var ResourceLoaderState = {
  UNLOADED: 0,
  LOADING: 1,
  READY: 2,
  DESTROYED: 3,
  FAILED: 4,
};
export default Object.freeze(ResourceLoaderState);
