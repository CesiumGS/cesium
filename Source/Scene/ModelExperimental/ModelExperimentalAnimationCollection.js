import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Event from "../../Core/Event.js";
import JulianDate from "../../Core/JulianDate.js";
import CesiumMath from "../../Core/Math.js";
import ModelExperimentalAnimation from "./ModelExperimentalAnimation.js";
import ModelAnimationLoop from ".././ModelAnimationLoop.js";
import ModelAnimationState from ".././ModelAnimationState.js";

/**
 * A collection of active model animations. Access this using {@link ModelExperimental#activeAnimations}.
 *
 * @alias ModelExperimentalAnimationCollection
 * @internalConstructor
 * @class
 *
 * @see ModelExperimental#activeAnimations
 */
function ModelExperimentalAnimationCollection(model) {
  /**
   * The event fired when an animation is added to the collection.  This can be used, for
   * example, to keep a UI in sync.
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * model.activeAnimations.animationAdded.addEventListener(function(model, animation) {
   *   console.log('Animation added: ' + animation.name);
   * });
   */
  this.animationAdded = new Event();

  /**
   * The event fired when an animation is removed from the collection.  This can be used, for
   * example, to keep a UI in sync.
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * model.activeAnimations.animationRemoved.addEventListener(function(model, animation) {
   *   console.log('Animation removed: ' + animation.name);
   * });
   */
  this.animationRemoved = new Event();

  this._model = model;
  this._runtimeAnimations = [];
  this._previousTime = undefined;
}

Object.defineProperties(ModelExperimentalAnimationCollection.prototype, {
  /**
   * The number of animations in the collection.
   *
   * @memberof ModelExperimentalAnimationCollection.prototype
   *
   * @type {Number}
   * @readonly
   */
  length: {
    get: function () {
      return this._runtimeAnimations.length;
    },
  },

  /**
   * The model that owns this animation collection.
   *
   * @memberof ModelExperimentalAnimationCollection.prototype
   *
   * @type {ModelExperimental}
   * @readonly
   */
  model: {
    get: function () {
      return this._model;
    },
  },
});

function addAnimation(collection, animation, options) {
  const model = collection._model;
  const runtimeAnimation = new ModelExperimentalAnimation(
    model,
    animation,
    options
  );
  collection._runtimeAnimations.push(runtimeAnimation);
  collection.animationAdded.raiseEvent(model, runtimeAnimation);
  return runtimeAnimation;
}

/**
 * Creates and adds an animation with the specified initial properties to the collection.
 * <p>
 * This raises the {@link ModelExperimentalAnimationCollection#animationAdded} event so, for example, a UI can stay in sync.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {String} [options.name] The glTF animation name that identifies the animation. Must be defined if <code>options.index</code> is <code>undefined</code>.
 * @param {Number} [options.index] The glTF animation index that identifies the animation. Must be defined if <code>options.name</code> is <code>undefined</code>.
 * @param {JulianDate} [options.startTime] The scene time to start playing the animation.  When this is <code>undefined</code>, the animation starts at the next frame.
 * @param {Number} [options.delay=0.0] The delay, in seconds, from <code>startTime</code> to start playing.
 * @param {JulianDate} [options.stopTime] The scene time to stop playing the animation.  When this is <code>undefined</code>, the animation is played for its full duration.
 * @param {Boolean} [options.removeOnStop=false] When <code>true</code>, the animation is removed after it stops playing.
 * @param {Number} [options.multiplier=1.0] Values greater than <code>1.0</code> increase the speed that the animation is played relative to the scene clock speed; values less than <code>1.0</code> decrease the speed.
 * @param {Boolean} [options.reverse=false] When <code>true</code>, the animation is played in reverse.
 * @param {ModelAnimationLoop} [options.loop=ModelAnimationLoop.NONE] Determines if and how the animation is looped.
 * @returns {ModelAnimation} The animation that was added to the collection.
 *
 * @exception {DeveloperError} Animations are not loaded.  Wait for the {@link ModelExperimental#readyPromise} to resolve.
 * @exception {DeveloperError} options.name must be a valid animation name.
 * @exception {DeveloperError} options.index must be a valid animation index.
 * @exception {DeveloperError} Either options.name or options.index must be defined.
 * @exception {DeveloperError} options.multiplier must be greater than zero.
 *
 * @example
 * // Example 1. Add an animation by name
 * model.activeAnimations.add({
 *   name : 'animation name'
 * });
 *
 * @example
 * // Example 2. Add an animation by index
 * model.activeAnimations.add({
 *   index : 0
 * });
 *
 * @example
 * // Example 3. Add an animation and provide all properties and events
 * const startTime = Cesium.JulianDate.now();
 *
 * const animation = model.activeAnimations.add({
 *   name : 'another animation name',
 *   startTime : startTime,
 *   delay : 0.0,                                 // Play at startTime (default)
 *   stopTime : Cesium.JulianDate.addSeconds(startTime, 4.0, new Cesium.JulianDate()),
 *   removeOnStop : false,                        // Do not remove when animation stops (default)
 *   multiplier : 2.0,                            // Play at double speed
 *   reverse : true,                              // Play in reverse
 *   loop : Cesium.ModelAnimationLoop.REPEAT      // Loop the animation
 * });
 *
 * animation.start.addEventListener(function(model, animation) {
 *   console.log('Animation started: ' + animation.name);
 * });
 * animation.update.addEventListener(function(model, animation, time) {
 *   console.log('Animation updated: ' + animation.name + '. glTF animation time: ' + time);
 * });
 * animation.stop.addEventListener(function(model, animation) {
 *   console.log('Animation stopped: ' + animation.name);
 * });
 */
ModelExperimentalAnimationCollection.prototype.add = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const model = this._model;

  //>>includeStart('debug', pragmas.debug);
  if (!model.ready) {
    throw new DeveloperError(
      "Animations are not loaded.  Wait for ModelExperimental.readyPromise to resolve."
    );
  }
  //>>includeEnd('debug');

  const animations = model.sceneGraph.components.animations;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.name) && !defined(options.index)) {
    throw new DeveloperError(
      "Either options.name or options.index must be defined."
    );
  }

  if (defined(options.multiplier) && options.multiplier <= 0.0) {
    throw new DeveloperError("options.multiplier must be greater than zero.");
  }

  if (
    defined(options.index) &&
    (options.index >= animations.length || options.index < 0)
  ) {
    throw new DeveloperError("options.index must be a valid animation index.");
  }
  //>>includeEnd('debug');

  let index = options.index;
  if (defined(index)) {
    return addAnimation(this, animations[index], options);
  }

  // Find the index of the animation with the given name
  const length = animations.length;
  for (let i = 0; i < length; ++i) {
    if (animations[i].name === options.name) {
      index = i;
      break;
    }
  }

  //>>includeStart('debug', pragmas.debug);
  if (!defined(index)) {
    throw new DeveloperError("options.name must be a valid animation name.");
  }
  //>>includeEnd('debug');

  return addAnimation(this, animations[index], options);
};

/**
 * Creates and adds animations with the specified initial properties to the collection
 * for all animations in the model.
 * <p>
 * This raises the {@link ModelExperimentalAnimationCollection#animationAdded} event for each model so, for example, a UI can stay in sync.
 * </p>
 *
 * @param {Object} [options] Object with the following properties:
 * @param {JulianDate} [options.startTime] The scene time to start playing the animations. When this is <code>undefined</code>, the animations starts at the next frame.
 * @param {Number} [options.delay=0.0] The delay, in seconds, from <code>startTime</code> to start playing.
 * @param {JulianDate} [options.stopTime] The scene time to stop playing the animations. When this is <code>undefined</code>, the animations are played for its full duration.
 * @param {Boolean} [options.removeOnStop=false] When <code>true</code>, the animations are removed after they stop playing.
 * @param {Number} [options.multiplier=1.0] Values greater than <code>1.0</code> increase the speed that the animations play relative to the scene clock speed; values less than <code>1.0</code> decrease the speed.
 * @param {Boolean} [options.reverse=false] When <code>true</code>, the animations are played in reverse.
 * @param {ModelAnimationLoop} [options.loop=ModelAnimationLoop.NONE] Determines if and how the animations are looped.
 * @returns {ModelExperimentalAnimation[]} An array of {@link ModelExperimentalAnimation} objects, one for each animation added to the collection.  If there are no glTF animations, the array is empty.
 *
 * @exception {DeveloperError} Animations are not loaded. Wait for the {@link ModelExperimental#readyPromise} to resolve.
 * @exception {DeveloperError} options.multiplier must be greater than zero.
 *
 * @example
 * model.activeAnimations.addAll({
 *   multiplier : 0.5,                            // Play at half-speed
 *   loop : Cesium.ModelAnimationLoop.REPEAT      // Loop the animations
 * });
 */
ModelExperimentalAnimationCollection.prototype.addAll = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const model = this._model;

  //>>includeStart('debug', pragmas.debug);
  if (!model.ready) {
    throw new DeveloperError(
      "Animations are not loaded.  Wait for Model.readyPromise to resolve."
    );
  }

  if (defined(options.multiplier) && options.multiplier <= 0.0) {
    throw new DeveloperError("options.multiplier must be greater than zero.");
  }
  //>>includeEnd('debug');

  const animations = model.sceneGraph.components.animations;

  const runtimeAnimations = [];
  const length = animations.length;
  for (let i = 0; i < length; ++i) {
    runtimeAnimations.push(addAnimation(this, animations[i], options));
  }
  return runtimeAnimations;
};

/**
 * Removes an animation from the collection.
 * <p>
 * This raises the {@link ModelExperimentalAnimationCollection#animationRemoved} event so, for example, a UI can stay in sync.
 * </p>
 * <p>
 * An animation can also be implicitly removed from the collection by setting {@link ModelExperimentalAnimationCollection#removeOnStop} to
 * <code>true</code>.  The {@link ModelExperimentalAnimationCollection#animationRemoved} event is still fired when the animation is removed.
 * </p>
 *
 * @param {ModelExperimentalAnimation} runtimeAnimation The runtime animation to remove.
 * @returns {Boolean} <code>true</code> if the animation was removed; <code>false</code> if the animation was not found in the collection.
 *
 * @example
 * const a = model.activeAnimations.add({
 *   name : 'animation name'
 * });
 * model.activeAnimations.remove(a); // Returns true
 */
ModelExperimentalAnimationCollection.prototype.remove = function (
  runtimeAnimation
) {
  if (defined(runtimeAnimation)) {
    const animations = this._runtimeAnimations;
    const i = animations.indexOf(runtimeAnimation);
    if (i !== -1) {
      animations.splice(i, 1);
      this.animationRemoved.raiseEvent(this._model, runtimeAnimation);
      return true;
    }
  }

  return false;
};

/**
 * Removes all animations from the collection.
 * <p>
 * This raises the {@link ModelExperimentalAnimationCollection#animationRemoved} event for each
 * animation so, for example, a UI can stay in sync.
 * </p>
 */
ModelExperimentalAnimationCollection.prototype.removeAll = function () {
  const model = this._model;
  const animations = this._runtimeAnimations;
  const length = animations.length;

  this._runtimeAnimations = [];

  for (let i = 0; i < length; ++i) {
    this.animationRemoved.raiseEvent(model, animations[i]);
  }
};

/**
 * Determines whether this collection contains a given animation.
 *
 * @param {ModelExperimentalAnimation} runtimeAnimation The runtime animation to check for.
 * @returns {Boolean} <code>true</code> if this collection contains the animation, <code>false</code> otherwise.
 */
ModelExperimentalAnimationCollection.prototype.contains = function (
  runtimeAnimation
) {
  if (defined(runtimeAnimation)) {
    return this._runtimeAnimations.indexOf(runtimeAnimation) !== -1;
  }

  return false;
};

/**
 * Returns the animation in the collection at the specified index.  Indices are zero-based
 * and increase as animations are added.  Removing an animation shifts all animations after
 * it to the left, changing their indices.  This function is commonly used to iterate over
 * all the animations in the collection.
 *
 * @param {Number} index The zero-based index of the animation.
 * @returns {ModelExperimentalAnimation} The runtime animation at the specified index.
 *
 * @example
 * // Output the names of all the animations in the collection.
 * const animations = model.activeAnimations;
 * const length = animations.length;
 * for (let i = 0; i < length; ++i) {
 *   console.log(animations.get(i).name);
 * }
 */
ModelExperimentalAnimationCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(index)) {
    throw new DeveloperError("index is required.");
  }

  if (index >= this._runtimeAnimations.length || index < 0) {
    throw new DeveloperError(
      "index must be valid within the range of the collection"
    );
  }
  //>>includeEnd('debug');

  return this._runtimeAnimations[index];
};

const animationsToRemove = [];

function createAnimationRemovedFunction(
  modelAnimationCollection,
  model,
  animation
) {
  return function () {
    modelAnimationCollection.animationRemoved.raiseEvent(model, animation);
  };
}

/**
 * Updates the runtime animations in this collection, removing any animations
 * that have stopped.
 *
 * @param {FrameState} frameState The current frame state.
 * @returns {Boolean} <code>true</code> if an animation played during this update, <code>false</code> otherwise.
 *
 * @private
 */
ModelExperimentalAnimationCollection.prototype.update = function (frameState) {
  const runtimeAnimations = this._runtimeAnimations;
  let length = runtimeAnimations.length;

  if (length === 0) {
    this._previousTime = undefined;
    return false;
  }

  if (JulianDate.equals(frameState.time, this._previousTime)) {
    // Animations are only time-dependent, so do not animate when paused or picking
    return false;
  }
  this._previousTime = JulianDate.clone(frameState.time, this._previousTime);

  let animationOccurred = false;
  const sceneTime = frameState.time;
  const model = this._model;

  for (let i = 0; i < length; ++i) {
    const runtimeAnimation = runtimeAnimations[i];

    if (!defined(runtimeAnimation._computedStartTime)) {
      runtimeAnimation._computedStartTime = JulianDate.addSeconds(
        defaultValue(runtimeAnimation.startTime, sceneTime),
        runtimeAnimation.delay,
        new JulianDate()
      );
    }

    if (!defined(runtimeAnimation._duration)) {
      runtimeAnimation._duration =
        runtimeAnimation.localStopTime * (1.0 / runtimeAnimation.multiplier);
    }

    const startTime = runtimeAnimation._computedStartTime;
    const duration = runtimeAnimation._duration;
    const stopTime = runtimeAnimation.stopTime;

    // [0.0, 1.0] normalized local animation time
    let delta =
      duration !== 0.0
        ? JulianDate.secondsDifference(sceneTime, startTime) / duration
        : 0.0;

    // Clamp delta to stop time, if defined.
    if (
      duration !== 0.0 &&
      defined(stopTime) &&
      JulianDate.greaterThan(sceneTime, stopTime)
    ) {
      delta = JulianDate.secondsDifference(stopTime, startTime) / duration;
    }

    const pastStartTime = delta >= 0.0;

    // Play animation if
    // * we are after the start time or the animation is being repeated, and
    // * before the end of the animation's duration or the animation is being repeated, and
    // * we did not reach a user-provided stop time.

    const repeat =
      runtimeAnimation.loop === ModelAnimationLoop.REPEAT ||
      runtimeAnimation.loop === ModelAnimationLoop.MIRRORED_REPEAT;

    const reachedStopTime =
      defined(stopTime) && JulianDate.greaterThan(sceneTime, stopTime);

    const play =
      (pastStartTime || (repeat && !defined(runtimeAnimation.startTime))) &&
      (delta <= 1.0 || repeat) &&
      !reachedStopTime;

    // If it IS, or WAS, animating...
    if (play || runtimeAnimation._state === ModelAnimationState.ANIMATING) {
      // ...transition from STOPPED to ANIMATING
      if (play && runtimeAnimation._state === ModelAnimationState.STOPPED) {
        runtimeAnimation._state = ModelAnimationState.ANIMATING;
        if (runtimeAnimation.start.numberOfListeners > 0) {
          frameState.afterRender.push(runtimeAnimation._raiseStartEvent);
        }
      }

      // Truncate to [0.0, 1.0] for repeating animations
      if (runtimeAnimation.loop === ModelAnimationLoop.REPEAT) {
        delta = delta - Math.floor(delta);
      } else if (runtimeAnimation.loop === ModelAnimationLoop.MIRRORED_REPEAT) {
        const floor = Math.floor(delta);
        const fract = delta - floor;
        // When even, use (1.0 - fract) to mirror repeat
        delta = floor % 2 === 1.0 ? 1.0 - fract : fract;
      }

      if (runtimeAnimation.reverse) {
        delta = 1.0 - delta;
      }

      let localAnimationTime = delta * duration * runtimeAnimation.multiplier;
      // Clamp in case floating-point roundoff goes outside the animation's first or last keyframe
      localAnimationTime = CesiumMath.clamp(
        localAnimationTime,
        runtimeAnimation.localStartTime,
        runtimeAnimation.localStopTime
      );

      runtimeAnimation.animate(localAnimationTime);

      if (runtimeAnimation.update.numberOfListeners > 0) {
        runtimeAnimation._updateEventTime = localAnimationTime;
        frameState.afterRender.push(runtimeAnimation._raiseUpdateEvent);
      }
      animationOccurred = true;

      if (!play) {
        // transition from ANIMATING to STOPPED
        runtimeAnimation._state = ModelAnimationState.STOPPED;
        if (runtimeAnimation.stop.numberOfListeners > 0) {
          frameState.afterRender.push(runtimeAnimation._raiseStopEvent);
        }

        if (runtimeAnimation.removeOnStop) {
          animationsToRemove.push(runtimeAnimation);
        }
      }
    }
  }

  // Remove animations that stopped
  length = animationsToRemove.length;
  for (let j = 0; j < length; ++j) {
    const animationToRemove = animationsToRemove[j];
    runtimeAnimations.splice(runtimeAnimations.indexOf(animationToRemove), 1);
    frameState.afterRender.push(
      createAnimationRemovedFunction(this, model, animationToRemove)
    );
  }
  animationsToRemove.length = 0;

  return animationOccurred;
};

export default ModelExperimentalAnimationCollection;
