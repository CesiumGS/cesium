/**
 * The state of a {@link QuadtreeTile} in the tile load pipeline.
 * @enum {Number}
 * @private
 */
const QuadtreeTileLoadState = {
  /**
   * The tile is new and loading has not yet begun.
   * @type QuadtreeTileLoadState
   * @constant
   * @default 0
   */
  START: 0,

  /**
   * Loading is in progress.
   * @type QuadtreeTileLoadState
   * @constant
   * @default 1
   */
  LOADING: 1,

  /**
   * Loading is complete.
   * @type QuadtreeTileLoadState
   * @constant
   * @default 2
   */
  DONE: 2,

  /**
   * The tile has failed to load.
   * @type QuadtreeTileLoadState
   * @constant
   * @default 3
   */
  FAILED: 3,
};
export default Object.freeze(QuadtreeTileLoadState);
