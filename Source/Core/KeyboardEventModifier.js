/**
 * This enumerated type is for representing keyboard modifiers. These are keys
 * that are held down in addition to other event types.
 *
 * @enum {Number}
 */
const KeyboardEventModifier = {
  /**
   * Represents the shift key being held down.
   *
   * @type {Number}
   * @constant
   */
  SHIFT: 0,

  /**
   * Represents the control key being held down.
   *
   * @type {Number}
   * @constant
   */
  CTRL: 1,

  /**
   * Represents the alt key being held down.
   *
   * @type {Number}
   * @constant
   */
  ALT: 2,
};
export default Object.freeze(KeyboardEventModifier);
