import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import EasingFunction from "../Core/EasingFunction.js";
import getTimestamp from "../Core/getTimestamp.js";
import TimeConstants from "../Core/TimeConstants.js";
import TweenJS from "../ThirdParty/Tween.js";

/**
 * A tween is an animation that interpolates the properties of two objects using an {@link EasingFunction}.  Create
 * one using {@link Scene#tweens} and {@link TweenCollection#add} and related add functions.
 *
 * @alias Tween
 * @constructor
 *
 * @private
 */
function Tween(
  tweens,
  tweenjs,
  startObject,
  stopObject,
  duration,
  delay,
  easingFunction,
  update,
  complete,
  cancel
) {
  this._tweens = tweens;
  this._tweenjs = tweenjs;

  this._startObject = clone(startObject);
  this._stopObject = clone(stopObject);

  this._duration = duration;
  this._delay = delay;
  this._easingFunction = easingFunction;

  this._update = update;
  this._complete = complete;

  /**
   * The callback to call if the tween is canceled either because {@link Tween#cancelTween}
   * was called or because the tween was removed from the collection.
   *
   * @type {TweenCollection.TweenCancelledCallback}
   */
  this.cancel = cancel;

  /**
   * @private
   */
  this.needsStart = true;
}

Object.defineProperties(Tween.prototype, {
  /**
   * An object with properties for initial values of the tween.  The properties of this object are changed during the tween's animation.
   * @memberof Tween.prototype
   *
   * @type {Object}
   * @readonly
   */
  startObject: {
    get: function () {
      return this._startObject;
    },
  },

  /**
   * An object with properties for the final values of the tween.
   * @memberof Tween.prototype
   *
   * @type {Object}
   * @readonly
   */
  stopObject: {
    get: function () {
      return this._stopObject;
    },
  },

  /**
   * The duration, in seconds, for the tween.  The tween is automatically removed from the collection when it stops.
   * @memberof Tween.prototype
   *
   * @type {Number}
   * @readonly
   */
  duration: {
    get: function () {
      return this._duration;
    },
  },

  /**
   * The delay, in seconds, before the tween starts animating.
   * @memberof Tween.prototype
   *
   * @type {Number}
   * @readonly
   */
  delay: {
    get: function () {
      return this._delay;
    },
  },

  /**
   * Determines the curve for animtion.
   * @memberof Tween.prototype
   *
   * @type {EasingFunction}
   * @readonly
   */
  easingFunction: {
    get: function () {
      return this._easingFunction;
    },
  },

  /**
   * The callback to call at each animation update (usually tied to the a rendered frame).
   * @memberof Tween.prototype
   *
   * @type {TweenCollection.TweenUpdateCallback}
   * @readonly
   */
  update: {
    get: function () {
      return this._update;
    },
  },

  /**
   * The callback to call when the tween finishes animating.
   * @memberof Tween.prototype
   *
   * @type {TweenCollection.TweenCompleteCallback}
   * @readonly
   */
  complete: {
    get: function () {
      return this._complete;
    },
  },

  /**
   * @memberof Tween.prototype
   *
   * @private
   */
  tweenjs: {
    get: function () {
      return this._tweenjs;
    },
  },
});

/**
 * Cancels the tween calling the {@link Tween#cancel} callback if one exists.  This
 * has no effect if the tween finished or was already canceled.
 */
Tween.prototype.cancelTween = function () {
  this._tweens.remove(this);
};

/**
 * A collection of tweens for animating properties.  Commonly accessed using {@link Scene#tweens}.
 *
 * @alias TweenCollection
 * @constructor
 *
 * @private
 */
function TweenCollection() {
  this._tweens = [];
}

Object.defineProperties(TweenCollection.prototype, {
  /**
   * The number of tweens in the collection.
   * @memberof TweenCollection.prototype
   *
   * @type {Number}
   * @readonly
   */
  length: {
    get: function () {
      return this._tweens.length;
    },
  },
});

/**
 * Creates a tween for animating between two sets of properties.  The tween starts animating at the next call to {@link TweenCollection#update}, which
 * is implicit when {@link Viewer} or {@link CesiumWidget} render the scene.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Object} options.startObject An object with properties for initial values of the tween.  The properties of this object are changed during the tween's animation.
 * @param {Object} options.stopObject An object with properties for the final values of the tween.
 * @param {Number} options.duration The duration, in seconds, for the tween.  The tween is automatically removed from the collection when it stops.
 * @param {Number} [options.delay=0.0] The delay, in seconds, before the tween starts animating.
 * @param {EasingFunction} [options.easingFunction=EasingFunction.LINEAR_NONE] Determines the curve for animtion.
 * @param {TweenCollection.TweenUpdateCallback} [options.update] The callback to call at each animation update (usually tied to the a rendered frame).
 * @param {TweenCollection.TweenCompleteCallback} [options.complete] The callback to call when the tween finishes animating.
 * @param {TweenCollection.TweenCancelledCallback} [options.cancel] The callback to call if the tween is canceled either because {@link Tween#cancelTween} was called or because the tween was removed from the collection.
 * @returns {Tween} The tween.
 *
 * @exception {DeveloperError} options.duration must be positive.
 */
TweenCollection.prototype.add = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.startObject) || !defined(options.stopObject)) {
    throw new DeveloperError(
      "options.startObject and options.stopObject are required."
    );
  }

  if (!defined(options.duration) || options.duration < 0.0) {
    throw new DeveloperError(
      "options.duration is required and must be positive."
    );
  }
  //>>includeEnd('debug');

  if (options.duration === 0.0) {
    if (defined(options.complete)) {
      options.complete();
    }
    return new Tween(this);
  }

  const duration = options.duration / TimeConstants.SECONDS_PER_MILLISECOND;
  const delayInSeconds = defaultValue(options.delay, 0.0);
  const delay = delayInSeconds / TimeConstants.SECONDS_PER_MILLISECOND;
  const easingFunction = defaultValue(
    options.easingFunction,
    EasingFunction.LINEAR_NONE
  );

  const value = options.startObject;
  const tweenjs = new TweenJS.Tween(value);
  tweenjs.to(clone(options.stopObject), duration);
  tweenjs.delay(delay);
  tweenjs.easing(easingFunction);
  if (defined(options.update)) {
    tweenjs.onUpdate(function () {
      options.update(value);
    });
  }
  tweenjs.onComplete(defaultValue(options.complete, null));
  tweenjs.repeat(defaultValue(options._repeat, 0.0));

  const tween = new Tween(
    this,
    tweenjs,
    options.startObject,
    options.stopObject,
    options.duration,
    delayInSeconds,
    easingFunction,
    options.update,
    options.complete,
    options.cancel
  );
  this._tweens.push(tween);
  return tween;
};

/**
 * Creates a tween for animating a scalar property on the given object.  The tween starts animating at the next call to {@link TweenCollection#update}, which
 * is implicit when {@link Viewer} or {@link CesiumWidget} render the scene.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Object} options.object The object containing the property to animate.
 * @param {String} options.property The name of the property to animate.
 * @param {Number} options.startValue The initial value.
 * @param {Number} options.stopValue The final value.
 * @param {Number} [options.duration=3.0] The duration, in seconds, for the tween.  The tween is automatically removed from the collection when it stops.
 * @param {Number} [options.delay=0.0] The delay, in seconds, before the tween starts animating.
 * @param {EasingFunction} [options.easingFunction=EasingFunction.LINEAR_NONE] Determines the curve for animtion.
 * @param {TweenCollection.TweenUpdateCallback} [options.update] The callback to call at each animation update (usually tied to the a rendered frame).
 * @param {TweenCollection.TweenCompleteCallback} [options.complete] The callback to call when the tween finishes animating.
 * @param {TweenCollection.TweenCancelledCallback} [options.cancel] The callback to call if the tween is canceled either because {@link Tween#cancelTween} was called or because the tween was removed from the collection.
 * @returns {Tween} The tween.
 *
 * @exception {DeveloperError} options.object must have the specified property.
 * @exception {DeveloperError} options.duration must be positive.
 */
TweenCollection.prototype.addProperty = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const object = options.object;
  const property = options.property;
  const startValue = options.startValue;
  const stopValue = options.stopValue;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(object) || !defined(options.property)) {
    throw new DeveloperError(
      "options.object and options.property are required."
    );
  }
  if (!defined(object[property])) {
    throw new DeveloperError(
      "options.object must have the specified property."
    );
  }
  if (!defined(startValue) || !defined(stopValue)) {
    throw new DeveloperError(
      "options.startValue and options.stopValue are required."
    );
  }
  //>>includeEnd('debug');

  function update(value) {
    object[property] = value.value;
  }

  return this.add({
    startObject: {
      value: startValue,
    },
    stopObject: {
      value: stopValue,
    },
    duration: defaultValue(options.duration, 3.0),
    delay: options.delay,
    easingFunction: options.easingFunction,
    update: update,
    complete: options.complete,
    cancel: options.cancel,
    _repeat: options._repeat,
  });
};

/**
 * Creates a tween for animating the alpha of all color uniforms on a {@link Material}.  The tween starts animating at the next call to {@link TweenCollection#update}, which
 * is implicit when {@link Viewer} or {@link CesiumWidget} render the scene.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Material} options.material The material to animate.
 * @param {Number} [options.startValue=0.0] The initial alpha value.
 * @param {Number} [options.stopValue=1.0] The final alpha value.
 * @param {Number} [options.duration=3.0] The duration, in seconds, for the tween.  The tween is automatically removed from the collection when it stops.
 * @param {Number} [options.delay=0.0] The delay, in seconds, before the tween starts animating.
 * @param {EasingFunction} [options.easingFunction=EasingFunction.LINEAR_NONE] Determines the curve for animtion.
 * @param {TweenCollection.TweenUpdateCallback} [options.update] The callback to call at each animation update (usually tied to the a rendered frame).
 * @param {TweenCollection.TweenCompleteCallback} [options.complete] The callback to call when the tween finishes animating.
 * @param {TweenCollection.TweenCancelledCallback} [options.cancel] The callback to call if the tween is canceled either because {@link Tween#cancelTween} was called or because the tween was removed from the collection.
 * @returns {Tween} The tween.
 *
 * @exception {DeveloperError} material has no properties with alpha components.
 * @exception {DeveloperError} options.duration must be positive.
 */
TweenCollection.prototype.addAlpha = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const material = options.material;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(material)) {
    throw new DeveloperError("options.material is required.");
  }
  //>>includeEnd('debug');

  const properties = [];

  for (const property in material.uniforms) {
    if (
      material.uniforms.hasOwnProperty(property) &&
      defined(material.uniforms[property]) &&
      defined(material.uniforms[property].alpha)
    ) {
      properties.push(property);
    }
  }

  //>>includeStart('debug', pragmas.debug);
  if (properties.length === 0) {
    throw new DeveloperError(
      "material has no properties with alpha components."
    );
  }
  //>>includeEnd('debug');

  function update(value) {
    const length = properties.length;
    for (let i = 0; i < length; ++i) {
      material.uniforms[properties[i]].alpha = value.alpha;
    }
  }

  return this.add({
    startObject: {
      alpha: defaultValue(options.startValue, 0.0), // Default to fade in
    },
    stopObject: {
      alpha: defaultValue(options.stopValue, 1.0),
    },
    duration: defaultValue(options.duration, 3.0),
    delay: options.delay,
    easingFunction: options.easingFunction,
    update: update,
    complete: options.complete,
    cancel: options.cancel,
  });
};

/**
 * Creates a tween for animating the offset uniform of a {@link Material}.  The tween starts animating at the next call to {@link TweenCollection#update}, which
 * is implicit when {@link Viewer} or {@link CesiumWidget} render the scene.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Material} options.material The material to animate.
 * @param {Number} options.startValue The initial alpha value.
 * @param {Number} options.stopValue The final alpha value.
 * @param {Number} [options.duration=3.0] The duration, in seconds, for the tween.  The tween is automatically removed from the collection when it stops.
 * @param {Number} [options.delay=0.0] The delay, in seconds, before the tween starts animating.
 * @param {EasingFunction} [options.easingFunction=EasingFunction.LINEAR_NONE] Determines the curve for animtion.
 * @param {TweenCollection.TweenUpdateCallback} [options.update] The callback to call at each animation update (usually tied to the a rendered frame).
 * @param {TweenCollection.TweenCancelledCallback} [options.cancel] The callback to call if the tween is canceled either because {@link Tween#cancelTween} was called or because the tween was removed from the collection.
 * @returns {Tween} The tween.
 *
 * @exception {DeveloperError} material.uniforms must have an offset property.
 * @exception {DeveloperError} options.duration must be positive.
 */
TweenCollection.prototype.addOffsetIncrement = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const material = options.material;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(material)) {
    throw new DeveloperError("material is required.");
  }
  if (!defined(material.uniforms.offset)) {
    throw new DeveloperError("material.uniforms must have an offset property.");
  }
  //>>includeEnd('debug');

  const uniforms = material.uniforms;
  return this.addProperty({
    object: uniforms,
    property: "offset",
    startValue: uniforms.offset,
    stopValue: uniforms.offset + 1,
    duration: options.duration,
    delay: options.delay,
    easingFunction: options.easingFunction,
    update: options.update,
    cancel: options.cancel,
    _repeat: Infinity,
  });
};

/**
 * Removes a tween from the collection.
 * <p>
 * This calls the {@link Tween#cancel} callback if the tween has one.
 * </p>
 *
 * @param {Tween} tween The tween to remove.
 * @returns {Boolean} <code>true</code> if the tween was removed; <code>false</code> if the tween was not found in the collection.
 */
TweenCollection.prototype.remove = function (tween) {
  if (!defined(tween)) {
    return false;
  }

  const index = this._tweens.indexOf(tween);
  if (index !== -1) {
    tween.tweenjs.stop();
    if (defined(tween.cancel)) {
      tween.cancel();
    }
    this._tweens.splice(index, 1);
    return true;
  }

  return false;
};

/**
 * Removes all tweens from the collection.
 * <p>
 * This calls the {@link Tween#cancel} callback for each tween that has one.
 * </p>
 */
TweenCollection.prototype.removeAll = function () {
  const tweens = this._tweens;

  for (let i = 0; i < tweens.length; ++i) {
    const tween = tweens[i];
    tween.tweenjs.stop();
    if (defined(tween.cancel)) {
      tween.cancel();
    }
  }
  tweens.length = 0;
};

/**
 * Determines whether this collection contains a given tween.
 *
 * @param {Tween} tween The tween to check for.
 * @returns {Boolean} <code>true</code> if this collection contains the tween, <code>false</code> otherwise.
 */
TweenCollection.prototype.contains = function (tween) {
  return defined(tween) && this._tweens.indexOf(tween) !== -1;
};

/**
 * Returns the tween in the collection at the specified index.  Indices are zero-based
 * and increase as tweens are added.  Removing a tween shifts all tweens after
 * it to the left, changing their indices.  This function is commonly used to iterate over
 * all the tween in the collection.
 *
 * @param {Number} index The zero-based index of the tween.
 * @returns {Tween} The tween at the specified index.
 *
 * @example
 * // Output the duration of all the tweens in the collection.
 * const tweens = scene.tweens;
 * const length = tweens.length;
 * for (let i = 0; i < length; ++i) {
 *   console.log(tweens.get(i).duration);
 * }
 */
TweenCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(index)) {
    throw new DeveloperError("index is required.");
  }
  //>>includeEnd('debug');

  return this._tweens[index];
};

/**
 * Updates the tweens in the collection to be at the provide time.  When a tween finishes, it is removed
 * from the collection.
 *
 * @param {Number} [time=getTimestamp()] The time in seconds.  By default tweens are synced to the system clock.
 */
TweenCollection.prototype.update = function (time) {
  const tweens = this._tweens;

  let i = 0;
  time = defined(time)
    ? time / TimeConstants.SECONDS_PER_MILLISECOND
    : getTimestamp();
  while (i < tweens.length) {
    const tween = tweens[i];
    const tweenjs = tween.tweenjs;

    if (tween.needsStart) {
      tween.needsStart = false;
      tweenjs.start(time);
    } else if (tweenjs.update(time)) {
      i++;
    } else {
      tweenjs.stop();
      tweens.splice(i, 1);
    }
  }
};

/**
 * A function that will execute when a tween completes.
 * @callback TweenCollection.TweenCompleteCallback
 */

/**
 * A function that will execute when a tween updates.
 * @callback TweenCollection.TweenUpdateCallback
 */

/**
 * A function that will execute when a tween is cancelled.
 * @callback TweenCollection.TweenCancelledCallback
 */
export default TweenCollection;
