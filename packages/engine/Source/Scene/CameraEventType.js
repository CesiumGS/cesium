/**
 * Enumerates the available input for interacting with the camera.
 *
 * @enum {number}
 */
const CameraEventType = {
  /**
   * A left mouse button press followed by moving the mouse and releasing the button.
   *
   * @type {number}
   * @constant
   */
  LEFT_DRAG: 0,

  /**
   *  A right mouse button press followed by moving the mouse and releasing the button.
   *
   * @type {number}
   * @constant
   */
  RIGHT_DRAG: 1,

  /**
   *  A middle mouse button press followed by moving the mouse and releasing the button.
   *
   * @type {number}
   * @constant
   */
  MIDDLE_DRAG: 2,

  /**
   * Scrolling the middle mouse button.
   *
   * @type {number}
   * @constant
   */
  WHEEL: 3,

  /**
   * A two-finger touch on a touch surface.
   *
   * @type {number}
   * @constant
   */
  PINCH: 4,
};
export default Object.freeze(CameraEventType);
