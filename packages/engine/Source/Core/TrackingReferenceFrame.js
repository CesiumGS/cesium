/**
 * Constants for identifying well-known tracking reference frames.
 *
 * @enum {number}
 */
const TrackingReferenceFrame = {
  /**
   * The east-north-up entity's frame.
   *
   * @type {number}
   * @constant
   */
  EAST_NORTH_UP: 0,

  /**
   * The entity's inertial frame.
   *
   * @type {number}
   * @constant
   */
  INERTIAL: 1,
};
export default Object.freeze(TrackingReferenceFrame);
