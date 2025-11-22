/**
 * This enumerated type is for representing keyboard modifiers. These are keys
 * that are held down in addition to other event types.
 *
 * @enum {number}
 */
const KeyboardEventModifier = {
  /**
   * Represents the shift key being held down.
   *
   * @type {number}
   * @constant
   */
  SHIFT: 0,

  /**
   * Represents the control key being held down.
   *
   * @type {number}
   * @constant
   */
  CTRL: 1,

  /**
   * Represents the alt key being held down.
   *
   * @type {number}
   * @constant
   */
  ALT: 2,
};
export default Object.freeze(KeyboardEventModifier);
