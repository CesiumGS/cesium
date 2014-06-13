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
        TweenJS) {
    "use strict";

    /**
     * A tween is an animation interpolates the properties of two objects using an {@link EasingFunction}.  Create
     * one using {@link Scene#tweens} and {@link TweenCollection#add} and related add functions.
     *
     * @alias Tween
     * @constructor
     *
     * @example
     * DOC_TBA
     */
    var Tween = function(tweens, tween, startObject, stopObject, duration, delay, easingFunction, update, complete, cancel) {
        this._tweens = tweens;
        this._tween = tween;

        this._startObject = clone(startObject);
        this._stopObject = clone(stopObject);

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

    defineProperties(Tween.prototype, {
        /**
         * DOC_TBA
         * @memberof Tween.prototype
         *
         * @type {Object}
         * @readonly
         */
        startObject : {
            get : function() {
                return this._startObject;
            }
        },

        /**
         * DOC_TBA
         * @memberof Tween.prototype
         *
         * @type {Object}
         * @readonly
         */
        stopObject : {
            get : function() {
                return this._stopObject;
            }
        },

        /**
         * DOC_TBA
         * @memberof Tween.prototype
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
         * @memberof Tween.prototype
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
         * @memberof Tween.prototype
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
         * @memberof Tween.prototype
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
         * @memberof Tween.prototype
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
         * @memberof Tween.prototype
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
    Tween.prototype.cancelTween = function() {
        this._tweens.remove(this);
    };

    /**
     * DOC_TBA
     *
     * @alias TweenCollection
     * @constructor
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Animations.html|Cesium Sandcastle Animation Demo}
     */
    var TweenCollection = function() {
        this._tweens = [];
    };

    defineProperties(TweenCollection.prototype, {
        /**
         * The number of tweens in the collection.
         * @memberof TweenCollection.prototype
         *
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                return this._tweens.length;
            }
        }
    });

    /**
     * DOC_TBA
     */
    TweenCollection.prototype.add = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.startObject) || !defined(options.stopObject)) {
            throw new DeveloperError('options.startObject and options.stopObject are required.');
        }

        if (!defined(options.duration) || options.duration < 0.0) {
            throw new DeveloperError('options.duration is required and must be positive.');
        }
        //>>includeEnd('debug');

        if ((options.duration === 0.0) && defined(options.complete)) {
            options.complete();
            return new Tween(this);
        }

        var duration = options.duration / TimeConstants.SECONDS_PER_MILLISECOND;
        var delay = defaultValue(options.delay, 0.0) / TimeConstants.SECONDS_PER_MILLISECOND;
        var easingFunction = defaultValue(options.easingFunction, EasingFunction.LINEAR_NONE);

        var value = options.startObject;
        var tweenjs = new TweenJS.Tween(value);
        tweenjs.to(clone(options.stopObject), duration);
        tweenjs.delay(delay);
        tweenjs.easing(easingFunction);
        if (defined(options.update)) {
            tweenjs.onUpdate(function() {
                options.update(value);
            });
        }
        tweenjs.onComplete(defaultValue(options.complete, null));
        tweenjs.repeat(defaultValue(options._repeat, 0.0));

        var tween = new Tween(this, tweenjs, options.startObject, options.stopObject, duration, delay, easingFunction, options.update, options.complete, options.cancel);
        this._tweens.push(tween);
        return tween;
    };

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} object must have the specified property.
     */
    TweenCollection.prototype.addProperty = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var object = options.object;
        var property = options.property;
        var startValue = options.startValue;
        var stopValue = options.stopValue;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(object)) {
            throw new DeveloperError('options.object is required.');
        }
        if (!defined(property)) {
            throw new DeveloperError('options.property is required.');
        }
        if (!defined(object[property])) {
            throw new DeveloperError('options.object must have the specified property.');
        }
        if (!defined(startValue) || !defined(stopValue)) {
            throw new DeveloperError('options.startValue and options.stopValue are required.');
        }
        //>>includeEnd('debug');

        function update(value) {
            object[property] = value.value;
        }

        return this.add({
            duration : defaultValue(options.duration, 3.0),
            delay : options.delay,
            easingFunction : options.easingFunction,
            startObject : {
                value : startValue
            },
            stopObject : {
                value : stopValue
            },
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
    TweenCollection.prototype.addAlpha = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var material = options.material;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(material)) {
            throw new DeveloperError('options.material is required.');
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

        function update(value) {
            var length = properties.length;
            for (var i = 0; i < length; ++i) {
                material.uniforms[properties[i]].alpha = value.alpha;
            }
        }

        return this.add({
            duration : defaultValue(options.duration, 3.0),
            delay : options.delay,
            easingFunction : options.easingFunction,
            startObject : {
                alpha : defaultValue(options.startValue, 0.0)  // Default to fade in
            },
            stopObject : {
                alpha : defaultValue(options.stopValue, 1.0)
            },
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
    TweenCollection.prototype.addOffsetIncrement = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var material = options.material;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(material)) {
            throw new DeveloperError('material is required.');
        }
        if (!defined(material.uniforms.offset)) {
            throw new DeveloperError('material.uniforms must have an offset property.');
        }
        //>>includeEnd('debug');

        var uniforms = material.uniforms;
        return this.addProperty({
            object : uniforms,
            property : 'offset',
            startValue : uniforms.offset,
            stopValue :  uniforms.offset + 1,
            duration : options.duration,
            delay : options.delay,
            easingFunction : options.easingFunction,
            update : options.update,
            complete : options.complete,
            cancel : options.cancel,
            _repeat : Infinity
        });
    };

    /**
     * DOC_TBA
     */
    TweenCollection.prototype.remove = function(animation) {
        if (!defined(animation)) {
            return false;
        }

        var index = this._tweens.indexOf(animation);
        if (index !== -1) {
            animation.tween.stop();
            if (defined(animation.cancel)) {
                animation.cancel();
            }
            this._tweens.splice(index, 1);
            return true;
        }

        return false;
    };

    /**
     * DOC_TBA
     */
    TweenCollection.prototype.removeAll = function() {
        var tweens = this._tweens;

        for (var i = 0; i < tweens.length; ++i) {
            var animation = tweens[i];
            animation.tween.stop();
            if (defined(animation.cancel)) {
                animation.cancel();
            }
        }
        tweens.length = 0;
    };

    /**
     * DOC_TBA
     */
    TweenCollection.prototype.contains = function(animation) {
        return defined(animation) && (this._tweens.indexOf(animation) !== -1);
    };

    /**
     * DOC_TBA
     */
    TweenCollection.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.');
        }
        //>>includeEnd('debug');

        return this._tweens[index];
    };

    /**
     * DOC_TBA
     */
    TweenCollection.prototype.update = function(time) {
        var tweens = this._tweens;

        var i = 0;
        time = defaultValue(time, getTimestamp());
        while (i < tweens.length) {
            var animation = tweens[i];
            var tween = animation.tween;

            if (animation.needsStart) {
                animation.needsStart = false;
                tween.start(time);
            } else {
                if (tween.update(time)) {
                    i++;
                } else {
                    tween.stop();
                    tweens.splice(i, 1);
                }
            }
        }
    };

    return TweenCollection;
});