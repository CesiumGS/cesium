/**
 * Constants for identifying well-known tracking reference frames.
 *
 * @enum {number}
 */
const TrackingReferenceFrame = {
  /**
   * Auto-detect algorithm. The reference frame used to track the Entity will
   * be automatically selected based on its trajectory: near-surface slow moving
   * objects will be tracked in the entity's local east-north-up reference
   * frame, while faster objects like satellites will use VVLH (Vehicle Velocity,
   * Local Horizontal).
   *
   * @type {number}
   * @constant
   */
  AUTODETECT: 0,

  /**
   * The entity's inertial reference frame. If entity has no defined orientation
   * property, a {@link VelocityOrientationProperty} is used instead, thus
   * falling back to <code>TrackingReferenceFrame.VELOCITY</code>.
   * When selected, the auto-detect algorithm is overridden.
   *
   * @type {number}
   * @constant
   */
  INERTIAL: 1,

  /**
   * The entity's inertial reference frame with orientation fixed to its
   * {@link VelocityOrientationProperty}, ignoring its own orientation.
   * When selected, the auto-detect algorithm is overridden.
   *
   * @type {number}
   * @constant
   */
  VELOCITY: 2,
};
export default Object.freeze(TrackingReferenceFrame);
