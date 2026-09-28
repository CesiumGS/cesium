/**
 * The state of a BoundingSphere computation being performed by a {@link Visualizer}.
 * @enum {number}
 * @private
 */
const BoundingSphereState = Object.freeze({
  /**
   * The BoundingSphere has been computed.
   * @type BoundingSphereState
   * @constant
   * @private
   */
  DONE: 0,
  /**
   * The BoundingSphere is still being computed.
   * @type BoundingSphereState
   * @constant
   * @private
   */
  PENDING: 1,
  /**
   * The BoundingSphere does not exist.
   * @type BoundingSphereState
   * @constant
   * @private
   */
  FAILED: 2,
});
export default BoundingSphereState;
