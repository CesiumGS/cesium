// @ts-check

/**
 * @enum {number}
 * @private
 */
const TileState = {
  START: 0,
  LOADING: 1,
  READY: 2,
  UPSAMPLED_ONLY: 3,
};

Object.freeze(TileState);

export default TileState;
