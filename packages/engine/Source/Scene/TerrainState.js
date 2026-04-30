// @ts-check

/**
 * @enum {number}
 * @private
 */
const TerrainState = {
  FAILED: 0,
  UNLOADED: 1,
  RECEIVING: 2,
  RECEIVED: 3,
  TRANSFORMING: 4,
  TRANSFORMED: 5,
  READY: 6,
};

Object.freeze(TerrainState);

export default TerrainState;
