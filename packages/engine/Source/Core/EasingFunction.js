import { Easing } from "@tweenjs/tween.js";

/**
 * Easing functions for use with TweenCollection.  These function are from
 * {@link https://github.com/sole/tween.js/|Tween.js} and Robert Penner.  See the
 * {@link http://sole.github.io/tween.js/examples/03_graphs.html|Tween.js graphs for each function}.
 *
 * @namespace
 */
const EasingFunction = {
  /**
   * Linear easing.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  LINEAR_NONE: Easing.Linear.None,

  /**
   * Quadratic in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUADRATIC_IN: Easing.Quadratic.In,
  /**
   * Quadratic out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUADRATIC_OUT: Easing.Quadratic.Out,
  /**
   * Quadratic in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUADRATIC_IN_OUT: Easing.Quadratic.InOut,

  /**
   * Cubic in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  CUBIC_IN: Easing.Cubic.In,
  /**
   * Cubic out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  CUBIC_OUT: Easing.Cubic.Out,
  /**
   * Cubic in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  CUBIC_IN_OUT: Easing.Cubic.InOut,

  /**
   * Quartic in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUARTIC_IN: Easing.Quartic.In,
  /**
   * Quartic out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUARTIC_OUT: Easing.Quartic.Out,
  /**
   * Quartic in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUARTIC_IN_OUT: Easing.Quartic.InOut,

  /**
   * Quintic in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUINTIC_IN: Easing.Quintic.In,
  /**
   * Quintic out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUINTIC_OUT: Easing.Quintic.Out,
  /**
   * Quintic in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUINTIC_IN_OUT: Easing.Quintic.InOut,

  /**
   * Sinusoidal in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  SINUSOIDAL_IN: Easing.Sinusoidal.In,
  /**
   * Sinusoidal out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  SINUSOIDAL_OUT: Easing.Sinusoidal.Out,
  /**
   * Sinusoidal in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  SINUSOIDAL_IN_OUT: Easing.Sinusoidal.InOut,

  /**
   * Exponential in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  EXPONENTIAL_IN: Easing.Exponential.In,
  /**
   * Exponential out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  EXPONENTIAL_OUT: Easing.Exponential.Out,
  /**
   * Exponential in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  EXPONENTIAL_IN_OUT: Easing.Exponential.InOut,

  /**
   * Circular in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  CIRCULAR_IN: Easing.Circular.In,
  /**
   * Circular out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  CIRCULAR_OUT: Easing.Circular.Out,
  /**
   * Circular in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  CIRCULAR_IN_OUT: Easing.Circular.InOut,

  /**
   * Elastic in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  ELASTIC_IN: Easing.Elastic.In,
  /**
   * Elastic out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  ELASTIC_OUT: Easing.Elastic.Out,
  /**
   * Elastic in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  ELASTIC_IN_OUT: Easing.Elastic.InOut,

  /**
   * Back in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  BACK_IN: Easing.Back.In,
  /**
   * Back out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  BACK_OUT: Easing.Back.Out,
  /**
   * Back in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  BACK_IN_OUT: Easing.Back.InOut,

  /**
   * Bounce in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  BOUNCE_IN: Easing.Bounce.In,
  /**
   * Bounce out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  BOUNCE_OUT: Easing.Bounce.Out,
  /**
   * Bounce in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  BOUNCE_IN_OUT: Easing.Bounce.InOut,
};

/**
 * Function interface for implementing a custom easing function.
 * @callback EasingFunction.Callback
 * @param {number} time The time in the range <code>[0, 1]</code>.
 * @returns {number} The value of the function at the given time.
 *
 * @example
 * function quadraticIn(time) {
 *     return time * time;
 * }
 *
 * @example
 * function quadraticOut(time) {
 *     return time * (2.0 - time);
 * }
 */

export default Object.freeze(EasingFunction);
