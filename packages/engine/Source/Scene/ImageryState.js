// @ts-check

/**
 * @private
 */
const ImageryState = {
  UNLOADED: 0,
  TRANSITIONING: 1,
  RECEIVED: 2,
  TEXTURE_LOADED: 3,
  READY: 4,
  FAILED: 5,
  INVALID: 6,
  PLACEHOLDER: 7,
};

Object.freeze(ImageryState);

export default ImageryState;
