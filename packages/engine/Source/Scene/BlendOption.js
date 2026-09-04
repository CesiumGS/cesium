// @ts-check

/**
 * Determines how opaque and translucent parts of primitives in a collection are blended
 * with the scene. Collections differ in the render pass, blending, and depth behavior
 * they select for each option; see the <code>blendOption</code> documentation of the
 * collection in question.
 *
 * @enum {number}
 */
const BlendOption = {
  /**
   * The primitives in the collection are completely opaque.
   * @type {number}
   * @constant
   */
  OPAQUE: 0,

  /**
   * The primitives in the collection are completely translucent.
   * @type {number}
   * @constant
   */
  TRANSLUCENT: 1,

  /**
   * The primitives in the collection are both opaque and translucent, and each primitive
   * is drawn according to its own opacity.
   * @type {number}
   * @constant
   */
  OPAQUE_AND_TRANSLUCENT: 2,
};

Object.freeze(BlendOption);

export default BlendOption;
