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
     * DOC_TBA
     *
     * @alias AnimationCollection
     * @constructor
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Animations.html|Cesium Sandcastle Animation Demo}
     */
    var AnimationCollection = function() {
        this._tweens = [];
    };

    /**
     * DOC_TBA
     */
    AnimationCollection.prototype.add = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.duration)) {
            throw new DeveloperError('options.duration is required.');
        }
        //>>includeEnd('debug');

        if (options.duration > 0.0) {
            var duration = options.duration / TimeConstants.SECONDS_PER_MILLISECOND;
            var delay = defaultValue(options.delay, 0.0) / TimeConstants.SECONDS_PER_MILLISECOND;
            var easingFunction = defaultValue(options.easingFunction, EasingFunction.LINEAR_NONE);

            var value = clone(options.startValue);
            var tween = new Tween.Tween(value);
            // set the callback on the instance to avoid extra bookkeeping
            // or patching Tween.js
            tween.cancel = options.cancel;
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

            // start then stop to remove the tween from the global array
            tween.start().stop();
            this._tweens.push(tween);

            return {
                _tween : tween
            };
        } else if (defined(options.complete)) {
            options.complete();
        }
    };

    defineProperties(AnimationCollection.prototype, {
        /**
         * DOC_TBA
         * @memberof AnimationCollection.prototype
         */
        all : {
            get : function() {
                return this._tweens;
            }
        }
    });

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
     * @exception {DeveloperError} material must have an offset property.
     */
    AnimationCollection.prototype.addOffsetIncrement = function(material, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(material)) {
            throw new DeveloperError('material is required.');
        }
        if (!defined(material.uniforms.offset)) {
            throw new DeveloperError('material must have an offset property.');
        }
        //>>includeEnd('debug');

        var startValue = {
            offset : material.uniforms.offset
        };
        var stopValue = {
            offset : material.uniforms.offset + 1
        };

        function update(value) {
            material.uniforms.offset = value.offset;
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
            _repeat : Infinity
        });
    };

    /**
     * DOC_TBA
     */
    AnimationCollection.prototype.remove = function(animation) {
        if (!defined(animation)) {
            return false;
        }

        var tween = animation._tween;
        var index = this._tweens.indexOf(tween);
        if (index !== -1) {
            if (defined(tween.cancel)) {
                tween.cancel();
            }
            this._tweens.splice(index, 1);
            return true;
        }

        return false;
    };

    /**
     * DOC_TBA
     */
    AnimationCollection.prototype.removeAll = function() {
        for (var i = 0; i < this._tweens.length; ++i) {
            var tween = this._tweens[i];
            if (defined(tween.cancel)) {
                tween.cancel();
            }
        }
        this._tweens.length = 0;
    };

    /**
     * DOC_TBA
     */
    AnimationCollection.prototype.contains = function(animation) {
        return defined(animation) && (this._tweens.indexOf(animation._tween) !== -1);
    };

    /**
     * DOC_TBA
     */
    AnimationCollection.prototype.update = function() {
        var tweens = this._tweens;
        if (tweens.length === 0) {
            return false;
        }

        var i = 0;
        var time = getTimestamp();
        while (i < tweens.length) {
            if (tweens[i].update(time)) {
                i++;
            } else {
                tweens.splice(i, 1);
            }
        }

        return true;
    };

    return AnimationCollection;
});