// @ts-check

/**
 * Constants for identifying well-known reference frames.
 *
 * @enum {number}
 */
const ReferenceFrame = {
  /**
   * The fixed frame.
   *
   * @type {number}
   * @constant
   */
  FIXED: 0,

  /**
   * The inertial frame.
   *
   * @type {number}
   * @constant
   */
  INERTIAL: 1,
};

Object.freeze(ReferenceFrame);

export default ReferenceFrame;
