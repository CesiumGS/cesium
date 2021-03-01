import Tween from "../ThirdParty/Tween.js";

/**
 * Easing functions for use with TweenCollection.  These function are from
 * {@link https://github.com/sole/tween.js/|Tween.js} and Robert Penner.  See the
 * {@link http://sole.github.io/tween.js/examples/03_graphs.html|Tween.js graphs for each function}.
 *
 * @namespace
 */
var EasingFunction = {
  /**
   * Linear easing.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  LINEAR_NONE: Tween.Easing.Linear.None,

  /**
   * Quadratic in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUADRATIC_IN: Tween.Easing.Quadratic.In,
  /**
   * Quadratic out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUADRATIC_OUT: Tween.Easing.Quadratic.Out,
  /**
   * Quadratic in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUADRATIC_IN_OUT: Tween.Easing.Quadratic.InOut,

  /**
   * Cubic in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  CUBIC_IN: Tween.Easing.Cubic.In,
  /**
   * Cubic out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  CUBIC_OUT: Tween.Easing.Cubic.Out,
  /**
   * Cubic in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  CUBIC_IN_OUT: Tween.Easing.Cubic.InOut,

  /**
   * Quartic in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUARTIC_IN: Tween.Easing.Quartic.In,
  /**
   * Quartic out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUARTIC_OUT: Tween.Easing.Quartic.Out,
  /**
   * Quartic in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUARTIC_IN_OUT: Tween.Easing.Quartic.InOut,

  /**
   * Quintic in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUINTIC_IN: Tween.Easing.Quintic.In,
  /**
   * Quintic out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUINTIC_OUT: Tween.Easing.Quintic.Out,
  /**
   * Quintic in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  QUINTIC_IN_OUT: Tween.Easing.Quintic.InOut,

  /**
   * Sinusoidal in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  SINUSOIDAL_IN: Tween.Easing.Sinusoidal.In,
  /**
   * Sinusoidal out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  SINUSOIDAL_OUT: Tween.Easing.Sinusoidal.Out,
  /**
   * Sinusoidal in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  SINUSOIDAL_IN_OUT: Tween.Easing.Sinusoidal.InOut,

  /**
   * Exponential in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  EXPONENTIAL_IN: Tween.Easing.Exponential.In,
  /**
   * Exponential out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  EXPONENTIAL_OUT: Tween.Easing.Exponential.Out,
  /**
   * Exponential in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  EXPONENTIAL_IN_OUT: Tween.Easing.Exponential.InOut,

  /**
   * Circular in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  CIRCULAR_IN: Tween.Easing.Circular.In,
  /**
   * Circular out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  CIRCULAR_OUT: Tween.Easing.Circular.Out,
  /**
   * Circular in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  CIRCULAR_IN_OUT: Tween.Easing.Circular.InOut,

  /**
   * Elastic in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  ELASTIC_IN: Tween.Easing.Elastic.In,
  /**
   * Elastic out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  ELASTIC_OUT: Tween.Easing.Elastic.Out,
  /**
   * Elastic in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  ELASTIC_IN_OUT: Tween.Easing.Elastic.InOut,

  /**
   * Back in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  BACK_IN: Tween.Easing.Back.In,
  /**
   * Back out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  BACK_OUT: Tween.Easing.Back.Out,
  /**
   * Back in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  BACK_IN_OUT: Tween.Easing.Back.InOut,

  /**
   * Bounce in.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  BOUNCE_IN: Tween.Easing.Bounce.In,
  /**
   * Bounce out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  BOUNCE_OUT: Tween.Easing.Bounce.Out,
  /**
   * Bounce in then out.
   *
   * @type {EasingFunction.Callback}
   * @constant
   */
  BOUNCE_IN_OUT: Tween.Easing.Bounce.InOut,
};

/**
 * Function interface for implementing a custom easing function.
 * @callback EasingFunction.Callback
 * @param {Number} time The time in the range <code>[0, 1]</code>.
 * @returns {Number} The value of the function at the given time.
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
