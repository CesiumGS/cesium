import defaultValue from "../Core/defaultValue.js";
import Event from "../Core/Event.js";
import JulianDate from "../Core/JulianDate.js";
import ModelAnimationLoop from "./ModelAnimationLoop.js";
import ModelAnimationState from "./ModelAnimationState.js";

/**
 * An active glTF animation.  A glTF asset can contain animations.  An active animation
 * is an animation that is currently playing or scheduled to be played because it was
 * added to a model's {@link ModelAnimationCollection}.  An active animation is an
 * instance of an animation; for example, there can be multiple active animations
 * for the same glTF animation, each with a different start time.
 * <p>
 * Create this by calling {@link ModelAnimationCollection#add}.
 * </p>
 *
 * @alias ModelAnimation
 * @internalConstructor
 * @class
 *
 * @see ModelAnimationCollection#add
 */
function ModelAnimation(options, model, runtimeAnimation) {
  this._name = runtimeAnimation.name;
  this._startTime = JulianDate.clone(options.startTime);
  this._delay = defaultValue(options.delay, 0.0); // in seconds
  this._stopTime = options.stopTime;

  /**
   * When <code>true</code>, the animation is removed after it stops playing.
   * This is slightly more efficient that not removing it, but if, for example,
   * time is reversed, the animation is not played again.
   *
   * @type {Boolean}
   * @default false
   */
  this.removeOnStop = defaultValue(options.removeOnStop, false);
  this._multiplier = defaultValue(options.multiplier, 1.0);
  this._reverse = defaultValue(options.reverse, false);
  this._loop = defaultValue(options.loop, ModelAnimationLoop.NONE);
  this._startOffset = defaultValue(options.startOffset, 0.0);

  /**
   * The event fired when this animation is started.  This can be used, for
   * example, to play a sound or start a particle system, when the animation starts.
   * <p>
   * This event is fired at the end of the frame after the scene is rendered.
   * </p>
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * animation.start.addEventListener(function(model, animation) {
   *   console.log('Animation started: ' + animation.name);
   * });
   */
  this.start = new Event();

  /**
   * The event fired when on each frame when this animation is updated.  The
   * current time of the animation, relative to the glTF animation time span, is
   * passed to the event, which allows, for example, starting new animations at a
   * specific time relative to a playing animation.
   * <p>
   * This event is fired at the end of the frame after the scene is rendered.
   * </p>
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * animation.update.addEventListener(function(model, animation, time) {
   *   console.log('Animation updated: ' + animation.name + '. glTF animation time: ' + time);
   * });
   */
  this.update = new Event();

  /**
   * The event fired when this animation is stopped.  This can be used, for
   * example, to play a sound or start a particle system, when the animation stops.
   * <p>
   * This event is fired at the end of the frame after the scene is rendered.
   * </p>
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * animation.stop.addEventListener(function(model, animation) {
   *   console.log('Animation stopped: ' + animation.name);
   * });
   */
  this.stop = new Event();

  this._state = ModelAnimationState.STOPPED;
  this._runtimeAnimation = runtimeAnimation;

  // Set during animation update
  this._computedStartTime = undefined;
  this._duration = undefined;

  // To avoid allocations in ModelAnimationCollection.update
  const that = this;
  this._raiseStartEvent = function () {
    that.start.raiseEvent(model, that);
  };
  this._updateEventTime = 0.0;
  this._raiseUpdateEvent = function () {
    that.update.raiseEvent(model, that, that._updateEventTime);
  };
  this._raiseStopEvent = function () {
    that.stop.raiseEvent(model, that);
  };
}

Object.defineProperties(ModelAnimation.prototype, {
  /**
   * The glTF animation name that identifies this animation.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {String}
   * @readonly
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * The scene time to start playing this animation.  When this is <code>undefined</code>,
   * the animation starts at the next frame.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {JulianDate}
   * @readonly
   *
   * @default undefined
   */
  startTime: {
    get: function () {
      return this._startTime;
    },
  },

  /**
   * The delay, in seconds, from {@link ModelAnimation#startTime} to start playing.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {Number}
   * @readonly
   *
   * @default undefined
   */
  delay: {
    get: function () {
      return this._delay;
    },
  },

  /**
   * The scene time to stop playing this animation.  When this is <code>undefined</code>,
   * the animation is played for its full duration and perhaps repeated depending on
   * {@link ModelAnimation#loop}.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {JulianDate}
   * @readonly
   *
   * @default undefined
   */
  stopTime: {
    get: function () {
      return this._stopTime;
    },
  },
  /**
   * Values greater than <code>1.0</code> increase the speed that the animation is played relative
   * to the scene clock speed; values less than <code>1.0</code> decrease the speed.  A value of
   * <code>1.0</code> plays the animation at the speed in the glTF animation mapped to the scene
   * clock speed.  For example, if the scene is played at 2x real-time, a two-second glTF animation
   * will play in one second even if <code>multiplier</code> is <code>1.0</code>.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {Number}
   * @readonly
   *
   * @default 1.0
   */
  multiplier: {
    get: function () {
      return this._multiplier;
    },
  },

  /**
   * When <code>true</code>, the animation is played in reverse.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   */
  reverse: {
    get: function () {
      return this._reverse;
    },
  },

  /**
   * Determines if and how the animation is looped.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {ModelAnimationLoop}
   * @readonly
   *
   * @default {@link ModelAnimationLoop.NONE}
   */
  loop: {
    get: function () {
      return this._loop;
    },
  },

  /**
   * Fractional offset [0..1] in to animations timeline, to start playing
   * animation at.
   * When used with {@link ModelAnimation#startTime} and
   * {@link ModelAnimation#stopTime}, this allows an animation to effectively be
   * paused and then resumed.
   * When {@link ModelAnimation#reverse} is <code>false</code>, a value of 0
   * will start the animaton at the beginning, whereas a value of 0.25 will
   * start the animation 25% of the way through.
   * When {@link ModelAnimation#reverse} is <code>true</code>, 0 corresponds to
   * the end of the animation. So if you wish to play the first 25% of the
   * animation in reverse, this should be set to 0.75.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {Number}
   * @readonly
   *
   * @default 0
   */
  startOffset: {
    get: function () {
      return this._startOffset;
    },
  },
});
export default ModelAnimation;
