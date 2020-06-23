/**
 * Determines if and how a glTF animation is looped.
 *
 * @enum {Number}
 *
 * @see ModelAnimationCollection#add
 */
var ModelAnimationLoop = {
  /**
   * Play the animation once; do not loop it.
   *
   * @type {Number}
   * @constant
   */
  NONE: 0,

  /**
   * Loop the animation playing it from the start immediately after it stops.
   *
   * @type {Number}
   * @constant
   */
  REPEAT: 1,

  /**
   * Loop the animation.  First, playing it forward, then in reverse, then forward, and so on.
   *
   * @type {Number}
   * @constant
   */
  MIRRORED_REPEAT: 2,
};
export default Object.freeze(ModelAnimationLoop);
