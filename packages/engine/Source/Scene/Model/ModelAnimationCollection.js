import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Event from "../../Core/Event.js";
import JulianDate from "../../Core/JulianDate.js";
import CesiumMath from "../../Core/Math.js";
import ModelAnimation from "./ModelAnimation.js";
import ModelAnimationLoop from ".././ModelAnimationLoop.js";
import ModelAnimationState from ".././ModelAnimationState.js";

/**
 * <div class="notice">
 * Access a model's animations {@link Model#activeAnimations}. Do not call the constructor directly
 * </div>
 *
 * A collection of active model animations.
 *
 * @alias ModelAnimationCollection
 * @internalConstructor
 * @class
 *
 * @see Model#activeAnimations
 */
function ModelAnimationCollection(model) {
  /**
   * The event fired when an animation is added to the collection.  This can be used, for
   * example, to keep a UI in sync.
   *
   * @type {Event}
   * @default new Event()
   *
   * @example
   * model.activeAnimations.animationAdded.addEventListener(function(model, animation) {
   *   console.log(`Animation added: ${animation.name}`);
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
   *   console.log(`Animation removed: ${animation.name}`);
   * });
   */
  this.animationRemoved = new Event();

  /**
   * When true, the animation will play even when the scene time is paused. However,
   * whether animation takes place will depend on the animationTime functions assigned
   * to the model's animations. By default, this is based on scene time, so models using
   * the default will not animate regardless of this setting.
   *
   * @type {boolean}
   * @default false
   */
  this.animateWhilePaused = false;

  this._model = model;
  this._runtimeAnimations = [];
  this._previousTime = undefined;
}

Object.defineProperties(ModelAnimationCollection.prototype, {
  /**
   * The number of animations in the collection.
   *
   * @memberof ModelAnimationCollection.prototype
   *
   * @type {number}
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
   * @memberof ModelAnimationCollection.prototype
   *
   * @type {Model}
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
  const runtimeAnimation = new ModelAnimation(model, animation, options);
  collection._runtimeAnimations.push(runtimeAnimation);
  collection.animationAdded.raiseEvent(model, runtimeAnimation);
  return runtimeAnimation;
}

/**
 * Creates and adds an animation with the specified initial properties to the collection.
 * <p>
 * This raises the {@link ModelAnimationCollection#animationAdded} event so, for example, a UI can stay in sync.
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {string} [options.name] The glTF animation name that identifies the animation. Must be defined if <code>options.index</code> is <code>undefined</code>.
 * @param {number} [options.index] The glTF animation index that identifies the animation. Must be defined if <code>options.name</code> is <code>undefined</code>.
 * @param {JulianDate} [options.startTime] The scene time to start playing the animation.  When this is <code>undefined</code>, the animation starts at the next frame.
 * @param {number} [options.delay=0.0] The delay, in seconds, from <code>startTime</code> to start playing. This will only affect the animation if <code>options.loop</code> is ModelAnimationLoop.NONE.
 * @param {JulianDate} [options.stopTime] The scene time to stop playing the animation.  When this is <code>undefined</code>, the animation is played for its full duration.
 * @param {boolean} [options.removeOnStop=false] When <code>true</code>, the animation is removed after it stops playing. This will only affect the animation if <code>options.loop</code> is ModelAnimationLoop.NONE.
 * @param {number} [options.multiplier=1.0] Values greater than <code>1.0</code> increase the speed that the animation is played relative to the scene clock speed; values less than <code>1.0</code> decrease the speed.
 * @param {boolean} [options.reverse=false] When <code>true</code>, the animation is played in reverse.
 * @param {ModelAnimationLoop} [options.loop=ModelAnimationLoop.NONE] Determines if and how the animation is looped.
 * @param {ModelAnimation.AnimationTimeCallback} [options.animationTime=undefined] If defined, computes the local animation time for this animation.
 * @returns {ModelAnimation} The animation that was added to the collection.
 *
 * @exception {DeveloperError} Animations are not loaded.  Wait for the {@link Model#ready} to return trues.
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
 *   console.log(`Animation started: ${animation.name}`);
 * });
 * animation.update.addEventListener(function(model, animation, time) {
 *   console.log(`Animation updated: ${animation.name}. glTF animation time: ${time}`);
 * });
 * animation.stop.addEventListener(function(model, animation) {
 *   console.log(`Animation stopped: ${animation.name}`);
 * });
 */
ModelAnimationCollection.prototype.add = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const model = this._model;

  //>>includeStart('debug', pragmas.debug);
  if (!model.ready) {
    throw new DeveloperError(
      "Animations are not loaded.  Wait for Model.ready to be true."
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
 * This raises the {@link ModelAnimationCollection#animationAdded} event for each model so, for example, a UI can stay in sync.
 * </p>
 *
 * @param {object} [options] Object with the following properties:
 * @param {JulianDate} [options.startTime] The scene time to start playing the animations. When this is <code>undefined</code>, the animations starts at the next frame.
 * @param {number} [options.delay=0.0] The delay, in seconds, from <code>startTime</code> to start playing. This will only affect the animation if <code>options.loop</code> is ModelAnimationLoop.NONE.
 * @param {JulianDate} [options.stopTime] The scene time to stop playing the animations. When this is <code>undefined</code>, the animations are played for its full duration.
 * @param {boolean} [options.removeOnStop=false] When <code>true</code>, the animations are removed after they stop playing. This will only affect the animation if <code>options.loop</code> is ModelAnimationLoop.NONE.
 * @param {number} [options.multiplier=1.0] Values greater than <code>1.0</code> increase the speed that the animations play relative to the scene clock speed; values less than <code>1.0</code> decrease the speed.
 * @param {boolean} [options.reverse=false] When <code>true</code>, the animations are played in reverse.
 * @param {ModelAnimationLoop} [options.loop=ModelAnimationLoop.NONE] Determines if and how the animations are looped.
 * @param {ModelAnimation.AnimationTimeCallback} [options.animationTime=undefined] If defined, computes the local animation time for all of the animations.
 * @returns {ModelAnimation[]} An array of {@link ModelAnimation} objects, one for each animation added to the collection.  If there are no glTF animations, the array is empty.
 *
 * @exception {DeveloperError} Animations are not loaded. Wait for the {@link Model#readyPromise} to resolve.
 * @exception {DeveloperError} options.multiplier must be greater than zero.
 *
 * @example
 * model.activeAnimations.addAll({
 *   multiplier : 0.5,                            // Play at half-speed
 *   loop : Cesium.ModelAnimationLoop.REPEAT      // Loop the animations
 * });
 */
ModelAnimationCollection.prototype.addAll = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const model = this._model;

  //>>includeStart('debug', pragmas.debug);
  if (!model.ready) {
    throw new DeveloperError(
      "Animations are not loaded.  Wait for Model.ready to be true."
    );
  }

  if (defined(options.multiplier) && options.multiplier <= 0.0) {
    throw new DeveloperError("options.multiplier must be greater than zero.");
  }
  //>>includeEnd('debug');

  const animations = model.sceneGraph.components.animations;

  const addedAnimations = [];
  const length = animations.length;
  for (let i = 0; i < length; ++i) {
    const animation = addAnimation(this, animations[i], options);
    addedAnimations.push(animation);
  }
  return addedAnimations;
};

/**
 * Removes an animation from the collection.
 * <p>
 * This raises the {@link ModelAnimationCollection#animationRemoved} event so, for example, a UI can stay in sync.
 * </p>
 * <p>
 * An animation can also be implicitly removed from the collection by setting {@link ModelAnimationCollection#removeOnStop} to
 * <code>true</code>.  The {@link ModelAnimationCollection#animationRemoved} event is still fired when the animation is removed.
 * </p>
 *
 * @param {ModelAnimation} runtimeAnimation The runtime animation to remove.
 * @returns {boolean} <code>true</code> if the animation was removed; <code>false</code> if the animation was not found in the collection.
 *
 * @example
 * const a = model.activeAnimations.add({
 *   name : 'animation name'
 * });
 * model.activeAnimations.remove(a); // Returns true
 */
ModelAnimationCollection.prototype.remove = function (runtimeAnimation) {
  if (!defined(runtimeAnimation)) {
    return false;
  }

  const animations = this._runtimeAnimations;
  const i = animations.indexOf(runtimeAnimation);
  if (i !== -1) {
    animations.splice(i, 1);
    this.animationRemoved.raiseEvent(this._model, runtimeAnimation);
    return true;
  }

  return false;
};

/**
 * Removes all animations from the collection.
 * <p>
 * This raises the {@link ModelAnimationCollection#animationRemoved} event for each
 * animation so, for example, a UI can stay in sync.
 * </p>
 */
ModelAnimationCollection.prototype.removeAll = function () {
  const model = this._model;
  const animations = this._runtimeAnimations;
  const length = animations.length;

  this._runtimeAnimations.length = 0;

  for (let i = 0; i < length; ++i) {
    this.animationRemoved.raiseEvent(model, animations[i]);
  }
};

/**
 * Determines whether this collection contains a given animation.
 *
 * @param {ModelAnimation} runtimeAnimation The runtime animation to check for.
 * @returns {boolean} <code>true</code> if this collection contains the animation, <code>false</code> otherwise.
 */
ModelAnimationCollection.prototype.contains = function (runtimeAnimation) {
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
 * @param {number} index The zero-based index of the animation.
 * @returns {ModelAnimation} The runtime animation at the specified index.
 *
 * @example
 * // Output the names of all the animations in the collection.
 * const animations = model.activeAnimations;
 * const length = animations.length;
 * for (let i = 0; i < length; ++i) {
 *   console.log(animations.get(i).name);
 * }
 */
ModelAnimationCollection.prototype.get = function (index) {
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
 * @returns {boolean} <code>true</code> if an animation played during this update, <code>false</code> otherwise.
 *
 * @private
 */
ModelAnimationCollection.prototype.update = function (frameState) {
  const runtimeAnimations = this._runtimeAnimations;
  let length = runtimeAnimations.length;

  if (length === 0) {
    this._previousTime = undefined;
    return false;
  }

  if (
    !this.animateWhilePaused &&
    JulianDate.equals(frameState.time, this._previousTime)
  ) {
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

    const pastStartTime = JulianDate.lessThanOrEquals(startTime, sceneTime);
    const reachedStopTime =
      defined(stopTime) && JulianDate.greaterThan(sceneTime, stopTime);

    // [0.0, 1.0] normalized local animation time
    let delta = 0.0;
    if (duration !== 0.0) {
      const seconds = JulianDate.secondsDifference(
        reachedStopTime ? stopTime : sceneTime,
        startTime
      );
      delta = defined(runtimeAnimation._animationTime)
        ? runtimeAnimation._animationTime(duration, seconds)
        : seconds / duration;
    }

    // Play animation if
    // * we are after the start time or the animation is being repeated, and
    // * before the end of the animation's duration or the animation is being repeated, and
    // * we did not reach a user-provided stop time.

    const repeat =
      runtimeAnimation.loop === ModelAnimationLoop.REPEAT ||
      runtimeAnimation.loop === ModelAnimationLoop.MIRRORED_REPEAT;

    const play =
      (pastStartTime || (repeat && !defined(runtimeAnimation.startTime))) &&
      (delta <= 1.0 || repeat) &&
      !reachedStopTime;

    if (delta === runtimeAnimation._prevAnimationDelta) {
      const animationStopped =
        runtimeAnimation._state === ModelAnimationState.STOPPED;
      // no change to delta, and no change to the animation state means we can
      // skip the update this time around.
      if (play !== animationStopped) {
        continue;
      }
    }
    runtimeAnimation._prevAnimationDelta = delta;

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
        // When odd use (1.0 - fract) to mirror repeat
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

export default ModelAnimationCollection;
