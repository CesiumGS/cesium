/**
 * Defines loading state of a image as any request is resolved and the WebGL resources are updated.
 * @private
 * @enum {number}
 */
const BillboardLoadState = Object.freeze({
  /**
   * There is no image data to load.
   * @private
   * @type {number}
   * @constant
   */
  NONE: 0,
  /**
   * Image data is in the process of downloading, or WebGL resources are being updated.
   * @private
   * @type {number}
   * @constant
   */
  LOADING: 2,
  /**
   * The image data has been downloaded and the WebGL resources have been created. It is ready for rendering.
   * @private
   * @type {number}
   * @constant
   */
  LOADED: 3,
  /**
   * There was an error while downloading an image or updating the WebGL resources.
   * @private
   * @type {number}
   * @constant
   */
  ERROR: 4,
  /**
   * Updating the WebGL resources failed, due to the resource being destroyed or another error.
   * @private
   * @type {number}
   * @constant
   */
  FAILED: 5,
});

export default BillboardLoadState;
