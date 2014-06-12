/*global define*/
define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/EasingFunction',
        '../Core/getTimestamp',
        '../Core/TimeConstants',
        '../ThirdParty/Tween'
    ], function(
        clone,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        EasingFunction,
        getTimestamp,
        TimeConstants,
        Tween) {
    "use strict";

    /**
     * An animation interpolates the properties of two objects using an {@link EasingFunction}.  Create
     * one using {@link Scene#animations} and {@link AnimationCollection#add} and related add functions.
     *
     * @alias Animation
     * @constructor
     *
     * @example
     * DOC_TBA
     */
    var Animation = function(animations, tween, startValue, stopValue, duration, delay, easingFunction, update, complete, cancel) {
        this._animations = animations;
        this._tween = tween;

        this._startValue = clone(startValue);
        this._stopValue = clone(stopValue);

        this._duration = duration;
        this._delay = delay;
        this._easingFunction = easingFunction;

        this._update = update;
        this._complete = complete;

        /**
         * DOC_TBA
         */
        this.cancel = cancel;

        /**
         * @private
         */
        this.needsStart = true;
    };

    defineProperties(Animation.prototype, {
        /**
         * DOC_TBA
         * @memberof Animation.prototype
         *
         * @type {Object}
         * @readonly
         */
        startValue : {
            get : function() {
                return this._startValue;
            }
        },

        /**
         * DOC_TBA
         * @memberof Animation.prototype
         *
         * @type {Object}
         * @readonly
         */
        stopValue : {
            get : function() {
                return this._stopValue;
            }
        },

        /**
         * DOC_TBA
         * @memberof Animation.prototype
         *
         * @type {Number}
         * @readonly
         */
        duration : {
            get : function() {
                return this._duration;
            }
        },

        /**
         * DOC_TBA
         * @memberof Animation.prototype
         *
         * @type {Number}
         * @readonly
         */
        delay : {
            get : function() {
                return this._delay;
            }
        },

        /**
         * DOC_TBA
         * @memberof Animation.prototype
         *
         * @type {EasingFunction}
         * @readonly
         */
        easingFunction : {
            get : function() {
                return this._easingFunction;
            }
        },

        /**
         * DOC_TBA
         * @memberof Animation.prototype
         *
         * @type {Function}
         * @readonly
         */
        update : {
            get : function() {
                return this._update;
            }
        },

        /**
         * DOC_TBA
         * @memberof Animation.prototype
         *
         * @type {Function}
         * @readonly
         */
        complete : {
            get : function() {
                return this._complete;
            }
        },

        /**
         * @memberof Animation.prototype
         *
         * @private
         */
        tween : {
            get : function() {
                return this._tween;
            }
        }
    });

    /**
     * Cancels the animation calling the {@link Animation#cancel} callback if one exists.  This
     * has no effect if the animation finished or was already canceled.
     */
    Animation.prototype.cancelAnimation = function() {
        this._animations.remove(this);
    };

    /**
     * DOC_TBA
     *
     * @alias AnimationCollection
     * @constructor
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Animations.html|Cesium Sandcastle Animation Demo}
     */
    var AnimationCollection = function() {
        this._animations = [];
    };

    defineProperties(AnimationCollection.prototype, {
        /**
         * The number of animations in the collection.
         * @memberof AnimationCollection.prototype
         *
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                return this._animations.length;
            }
        }
    });

    /**
     * DOC_TBA
     */
    AnimationCollection.prototype.add = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.startValue) || !defined(options.stopValue)) {
            throw new DeveloperError('options.startValue and options.stopValue are required.');
        }

        if (!defined(options.duration) || options.duration < 0.0) {
            throw new DeveloperError('options.duration is required and must be positive.');
        }
        //>>includeEnd('debug');

        if ((options.duration === 0.0) && defined(options.complete)) {
            options.complete();
            return new Animation(this);
        }

        var duration = options.duration / TimeConstants.SECONDS_PER_MILLISECOND;
        var delay = defaultValue(options.delay, 0.0) / TimeConstants.SECONDS_PER_MILLISECOND;
        var easingFunction = defaultValue(options.easingFunction, EasingFunction.LINEAR_NONE);

        var value = options.startValue;
        var tween = new Tween.Tween(value);
        tween.to(clone(options.stopValue), duration);
        tween.delay(delay);
        tween.easing(easingFunction);
        if (defined(options.update)) {
            tween.onUpdate(function() {
                options.update(value);
            });
        }
        tween.onComplete(defaultValue(options.complete, null));
        tween.repeat(defaultValue(options._repeat, 0.0));

        /**
         * DOC_TBA
         */
        var animation = new Animation(this, tween, options.startValue, options.stopValue, duration, delay, easingFunction, options.update, options.complete, options.cancel);
        this._animations.push(animation);
        return animation;
    };

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} object must have the specified property.
     */
    AnimationCollection.prototype.addProperty = function(object, property, start, stop, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(object)) {
            throw new DeveloperError('object is required.');
        }
        if (!defined(property)) {
            throw new DeveloperError('property is required.');
        }
        if (!defined(object[property])) {
            throw new DeveloperError('object must have the specified property.');
        }
        //>>includeEnd('debug');

        var startValue = {
            value : start
        };
        var stopValue = {
            value : stop
        };

        function update(value) {
            object[property] = value.value;
        }

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        return this.add({
            duration : defaultValue(options.duration, 3.0),
            delay : options.delay,
            easingFunction : options.easingFunction,
            startValue : startValue,
            stopValue : stopValue,
            update : update,
            complete : options.complete,
            cancel : options.cancel,
            _repeat : options._repeat
        });
    };

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} material has no properties with alpha components.
     */
    AnimationCollection.prototype.addAlpha = function(material, start, stop, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(material)) {
            throw new DeveloperError('material is required.');
        }
        //>>includeEnd('debug');

        var properties = [];

        for (var property in material.uniforms) {
            if (material.uniforms.hasOwnProperty(property) &&
                defined(material.uniforms[property]) &&
                defined(material.uniforms[property].alpha)) {
                properties.push(property);
            }
        }

        //>>includeStart('debug', pragmas.debug);
        if (properties.length === 0) {
            throw new DeveloperError('material has no properties with alpha components.');
        }
        //>>includeEnd('debug');

        // Default to fade in
        var startValue = {
            alpha : defaultValue(start, 0.0)
        };
        var stopValue = {
            alpha : defaultValue(stop, 1.0)
        };

        function update(value) {
            var length = properties.length;
            for (var i = 0; i < length; ++i) {
                material.uniforms[properties[i]].alpha = value.alpha;
            }
        }

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        return this.add({
            duration : defaultValue(options.duration, 3.0),
            delay : options.delay,
            easingFunction : options.easingFunction,
            startValue : startValue,
            stopValue : stopValue,
            update : update,
            complete : options.complete,
            cancel : options.cancel
        });
    };

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} material must have an offset property.
     */
    AnimationCollection.prototype.addOffsetIncrement = function(material, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(material)) {
            throw new DeveloperError('material is required.');
        }
        if (!defined(material.uniforms.offset)) {
            throw new DeveloperError('material.uniforms must have an offset property.');
        }
        //>>includeEnd('debug');

        options = defaultValue(options, {});
        options._repeat = Infinity;

        var uniforms = material.uniforms;
        return this.addProperty(uniforms, 'offset', uniforms.offset, uniforms.offset + 1, options);
    };

    /**
     * DOC_TBA
     */
    AnimationCollection.prototype.remove = function(animation) {
        if (!defined(animation)) {
            return false;
        }

        var index = this._animations.indexOf(animation);
        if (index !== -1) {
            animation.tween.stop();
            if (defined(animation.cancel)) {
                animation.cancel();
            }
            this._animations.splice(index, 1);
            return true;
        }

        return false;
    };

    /**
     * DOC_TBA
     */
    AnimationCollection.prototype.removeAll = function() {
        var animations = this._animations;

        for (var i = 0; i < animations.length; ++i) {
            var animation = animations[i];
            animation.tween.stop();
            if (defined(animation.cancel)) {
                animation.cancel();
            }
        }
        animations.length = 0;
    };

    /**
     * DOC_TBA
     */
    AnimationCollection.prototype.contains = function(animation) {
        return defined(animation) && (this._animations.indexOf(animation) !== -1);
    };

    /**
     * DOC_TBA
     */
    AnimationCollection.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.');
        }
        //>>includeEnd('debug');

        return this._animations[index];
    };

    /**
     * DOC_TBA
     */
    AnimationCollection.prototype.update = function(time) {
        var animations = this._animations;

        var i = 0;
        time = defaultValue(time, getTimestamp());
        while (i < animations.length) {
            var animation = animations[i];
            var tween = animation.tween;

            if (animation.needsStart) {
                animation.needsStart = false;
                tween.start(time);
            } else {
                if (tween.update(time)) {
                    i++;
                } else {
                    tween.stop();
                    animations.splice(i, 1);
                }
            }
        }
    };

    return AnimationCollection;
});