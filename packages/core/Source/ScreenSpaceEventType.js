/**
 * This enumerated type is for classifying mouse events: down, up, click, double click, move and move while a button is held down.
 *
 * @enum {number}
 */
const ScreenSpaceEventType = {
  /**
   * Represents a mouse left button down event.
   *
   * @type {number}
   * @constant
   */
  LEFT_DOWN: 0,

  /**
   * Represents a mouse left button up event.
   *
   * @type {number}
   * @constant
   */
  LEFT_UP: 1,

  /**
   * Represents a mouse left click event.
   *
   * @type {number}
   * @constant
   */
  LEFT_CLICK: 2,

  /**
   * Represents a mouse left double click event.
   *
   * @type {number}
   * @constant
   */
  LEFT_DOUBLE_CLICK: 3,

  /**
   * Represents a mouse left button down event.
   *
   * @type {number}
   * @constant
   */
  RIGHT_DOWN: 5,

  /**
   * Represents a mouse right button up event.
   *
   * @type {number}
   * @constant
   */
  RIGHT_UP: 6,

  /**
   * Represents a mouse right click event.
   *
   * @type {number}
   * @constant
   */
  RIGHT_CLICK: 7,

  /**
   * Represents a mouse middle button down event.
   *
   * @type {number}
   * @constant
   */
  MIDDLE_DOWN: 10,

  /**
   * Represents a mouse middle button up event.
   *
   * @type {number}
   * @constant
   */
  MIDDLE_UP: 11,

  /**
   * Represents a mouse middle click event.
   *
   * @type {number}
   * @constant
   */
  MIDDLE_CLICK: 12,

  /**
   * Represents a mouse move event.
   *
   * @type {number}
   * @constant
   */
  MOUSE_MOVE: 15,

  /**
   * Represents a mouse wheel event.
   *
   * @type {number}
   * @constant
   */
  WHEEL: 16,

  /**
   * Represents the start of a two-finger event on a touch surface.
   *
   * @type {number}
   * @constant
   */
  PINCH_START: 17,

  /**
   * Represents the end of a two-finger event on a touch surface.
   *
   * @type {number}
   * @constant
   */
  PINCH_END: 18,

  /**
   * Represents a change of a two-finger event on a touch surface.
   *
   * @type {number}
   * @constant
   */
  PINCH_MOVE: 19,
};
export default Object.freeze(ScreenSpaceEventType);
