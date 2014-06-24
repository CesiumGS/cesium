/*global define*/
define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/getTimestamp',
        '../ThirdParty/Tween'
    ], function(
        clone,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        getTimestamp,
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
            throw new DeveloperError('duration is required.');
        }
        //>>includeEnd('debug');

        if (options.duration > 0) {
            var delayDuration = defaultValue(options.delayDuration, 0);
            var easingFunction = defaultValue(options.easingFunction, Tween.Easing.Linear.None);

            var value = clone(options.startValue);
            var tween = new Tween.Tween(value);
            // set the callback on the instance to avoid extra bookkeeping
            // or patching Tween.js
            tween.onCancel = options.onCancel;
            tween.to(options.stopValue, options.duration);
            tween.delay(delayDuration);
            tween.easing(easingFunction);
            if (typeof options.onUpdate === 'function') {
                tween.onUpdate(function() {
                    options.onUpdate(value);
                });
            }
            tween.onComplete(defaultValue(options.onComplete, null));

            // start then stop to remove the tween from the global array
            tween.start().stop();
            this._tweens.push(tween);

            return {
                _tween : tween
            };
        } else if (typeof options.onComplete === 'function') {
            options.onComplete();
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

        for ( var property in material.uniforms) {
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
        start = defaultValue(start, 0.0);
        stop = defaultValue(stop, 1.0);

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var duration = defaultValue(options.duration, 3000);
        var delayDuration = defaultValue(options.delayDuration, 0);
        var easingFunction = defaultValue(options.easingFunction, Tween.Easing.Linear.None);

        var value = {
            alpha : start
        };
        var tween = new Tween.Tween(value);
        tween.to({
            alpha : stop
        }, duration);
        tween.delay(delayDuration);
        tween.easing(easingFunction);
        tween.onUpdate(function() {
            var length = properties.length;
            for ( var i = 0; i < length; ++i) {
                material.uniforms[properties[i]].alpha = value.alpha;
            }
        });
        tween.onComplete(defaultValue(options.onComplete, null));

        // start then stop to remove the tween from the global array
        tween.start().stop();
        this._tweens.push(tween);

        return {
            _tween : tween
        };
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

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var duration = defaultValue(options.duration, 3000);
        var delayDuration = defaultValue(options.delayDuration, 0);
        var easingFunction = defaultValue(options.easingFunction, Tween.Easing.Linear.None);

        var value = {
            value : start
        };
        var tween = new Tween.Tween(value);
        tween.to({
            value : stop
        }, duration);
        tween.delay(delayDuration);
        tween.easing(easingFunction);
        tween.onUpdate(function() {
            object[property] = value.value;
        });
        tween.onComplete(defaultValue(options.onComplete, null));

        // start then stop to remove the tween from the global array
        tween.start().stop();
        this._tweens.push(tween);

        return {
            _tween : tween
        };
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

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var duration = defaultValue(options.duration, 3000);
        var delayDuration = defaultValue(options.delayDuration, 0);
        var easingFunction = defaultValue(options.easingFunction, Tween.Easing.Linear.None);

        var value = {
            offset : material.uniforms.offset
        };
        var tween = new Tween.Tween(value);
        tween.to({
            offset : material.uniforms.offset + 1.0
        }, duration);
        tween.delay(delayDuration);
        tween.easing(easingFunction);
        tween.onUpdate(function() {
            material.uniforms.offset = value.offset;
        });
        // options.onComplete is ignored.
        tween.repeat(Infinity);

        // start then stop to remove the tween from the global array
        tween.start().stop();
        this._tweens.push(tween);

        return {
            _tween : tween
        };
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
            if (typeof tween.onCancel === 'function') {
                tween.onCancel();
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
            if (typeof tween.onCancel === 'function') {
                tween.onCancel();
            }
        }
        this._tweens.length = 0;
    };

    /**
     * DOC_TBA
     */
    AnimationCollection.prototype.contains = function(animation) {
        if (!defined(animation)) {
            return false;
        }

        return this._tweens.indexOf(animation._tween) !== -1;
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