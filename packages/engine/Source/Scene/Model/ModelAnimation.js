import defined from "../../Core/defined.js";
import Event from "../../Core/Event.js";
import JulianDate from "../../Core/JulianDate.js";
import ModelAnimationLoop from "../ModelAnimationLoop.js";
import ModelAnimationState from "../ModelAnimationState.js";
import ModelAnimationChannel from "./ModelAnimationChannel.js";

/**
 * <div class="notice">
 * Create animations by calling {@link ModelAnimationCollection#add}. Do not call the constructor directly.
 * </div>
 *
 * An active animation derived from a glTF asset. An active animation is an
 * animation that is either currently playing or scheduled to be played due to
 * being added to a model's {@link ModelAnimationCollection}. An active animation
 * is an instance of an animation; for example, there can be multiple active
 * animations for the same glTF animation, each with a different start time.
 *
 * @alias ModelAnimation
 * @internalConstructor
 * @class
 *
 * @see ModelAnimationCollection#add
 */
function ModelAnimation(model, animation, options) {
  this._animation = animation;
  this._name = animation.name;
  this._runtimeChannels = undefined;

  this._startTime = JulianDate.clone(options.startTime);
  this._delay = options.delay ?? 0.0; // in seconds
  this._stopTime = JulianDate.clone(options.stopTime);

  /**
   * When <code>true</code>, the animation is removed after it stops playing.
   * This is slightly more efficient that not removing it, but if, for example,
   * time is reversed, the animation is not played again.
   *
   * @type {boolean}
   * @default false
   */
  this.removeOnStop = options.removeOnStop ?? false;
  this._multiplier = options.multiplier ?? 1.0;
  this._reverse = options.reverse ?? false;
  this._loop = options.loop ?? ModelAnimationLoop.NONE;
  this._animationTime = options.animationTime;
  this._prevAnimationDelta = undefined;

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
   *   console.log(`Animation started: ${animation.name}`);
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
   *   console.log(`Animation updated: ${animation.name}. glTF animation time: ${time}`);
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
   *   console.log(`Animation stopped: ${animation.name}`);
   * });
   */
  this.stop = new Event();

  this._state = ModelAnimationState.STOPPED;

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

  this._model = model;

  this._localStartTime = undefined;
  this._localStopTime = undefined;

  initialize(this);
}

Object.defineProperties(ModelAnimation.prototype, {
  /**
   * The glTF animation.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {ModelComponents.Animation}
   * @readonly
   *
   * @private
   */
  animation: {
    get: function () {
      return this._animation;
    },
  },

  /**
   * The name that identifies this animation in the model, if it exists.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {string}
   * @readonly
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * The runtime animation channels for this animation.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {ModelAnimationChannel[]}
   * @readonly
   *
   * @private
   */
  runtimeChannels: {
    get: function () {
      return this._runtimeChannels;
    },
  },

  /**
   * The {@link Model} that owns this animation.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {Model}
   * @readonly
   *
   * @private
   */
  model: {
    get: function () {
      return this._model;
    },
  },

  /**
   * The starting point of the animation in local animation time. This is the minimum
   * time value across all of the keyframes belonging to this animation.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {number}
   * @readonly
   *
   * @private
   */
  localStartTime: {
    get: function () {
      return this._localStartTime;
    },
  },

  /**
   * The stopping point of the animation in local animation time. This is the maximum
   * time value across all of the keyframes belonging to this animation.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {number}
   * @readonly
   *
   * @private
   */
  localStopTime: {
    get: function () {
      return this._localStopTime;
    },
  },

  /**
   * The scene time to start playing this animation. When this is <code>undefined</code>,
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
   * @type {number}
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
   * The scene time to stop playing this animation. When this is <code>undefined</code>,
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
   * @type {number}
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
   * @type {boolean}
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
   * If this is defined, it will be used to compute the local animation time
   * instead of the scene's time.
   *
   * @memberof ModelAnimation.prototype
   *
   * @type {ModelAnimation.AnimationTimeCallback}
   * @default undefined
   */
  animationTime: {
    get: function () {
      return this._animationTime;
    },
  },
});

function initialize(runtimeAnimation) {
  let localStartTime = Number.MAX_VALUE;
  let localStopTime = -Number.MAX_VALUE;

  const sceneGraph = runtimeAnimation._model.sceneGraph;
  const animation = runtimeAnimation._animation;
  const channels = animation.channels;
  const length = channels.length;

  const runtimeChannels = [];
  for (let i = 0; i < length; i++) {
    const channel = channels[i];
    const target = channel.target;

    // Ignore this channel if the target is invalid, i.e. if the node
    // it references doesn't exist.
    if (!defined(target)) {
      continue;
    }

    const nodeIndex = target.node.index;
    const runtimeNode = sceneGraph._runtimeNodes[nodeIndex];

    const runtimeChannel = new ModelAnimationChannel({
      channel: channel,
      runtimeAnimation: runtimeAnimation,
      runtimeNode: runtimeNode,
    });

    const times = channel.sampler.input;
    localStartTime = Math.min(localStartTime, times[0]);
    localStopTime = Math.max(localStopTime, times[times.length - 1]);

    runtimeChannels.push(runtimeChannel);
  }

  runtimeAnimation._runtimeChannels = runtimeChannels;
  runtimeAnimation._localStartTime = localStartTime;
  runtimeAnimation._localStopTime = localStopTime;
}

/**
 * Evaluate all animation channels to advance this animation.
 *
 * @param {number} time The local animation time.
 *
 * @private
 */
ModelAnimation.prototype.animate = function (time) {
  const runtimeChannels = this._runtimeChannels;
  const length = runtimeChannels.length;
  for (let i = 0; i < length; i++) {
    runtimeChannels[i].animate(time);
  }
};

/**
 * A function used to compute the local animation time for a ModelAnimation.
 * @callback ModelAnimation.AnimationTimeCallback
 *
 * @param {number} duration The animation's original duration in seconds.
 * @param {number} seconds The seconds since the animation started, in scene time.
 * @returns {number} Returns the local animation time.
 *
 * @example
 * // Use real time for model animation (assuming animateWhilePaused was set to true)
 * function animationTime(duration) {
 *     return Date.now() / 1000 / duration;
 * }
 *
 * @example
 * // Offset the phase of the animation, so it starts halfway through its cycle.
 * function animationTime(duration, seconds) {
 *     return seconds / duration + 0.5;
 * }
 */
export default ModelAnimation;
