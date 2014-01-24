/*global define*/
define([
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/clone',
        '../ThirdParty/Tween',
        '../Core/defaultValue'
    ], function(
        defined,
        DeveloperError,
        clone,
        Tween,
        defaultValue) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias AnimationCollection
     * @constructor
     *
     * @demo <a href="http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Animations.html">Cesium Sandcastle Animation Demo</a>
     */
    var AnimationCollection = function() {
    };

    /**
     * DOC_TBA
     * @memberof AnimationCollection
     *
     * @exception {DeveloperError} duration is required.
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
            tween.start();

            return {
                _tween : tween
            };
        } else if (typeof options.onComplete === 'function') {
            options.onComplete();
        }
    };

    /**
     * DOC_TBA
     * @memberof AnimationCollection
     *
     * @exception {DeveloperError} material is required.
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
        tween.start();

        return {
            _tween : tween
        };
    };

    /**
     * DOC_TBA
     * @memberof AnimationCollection
     *
     * @exception {DeveloperError} object is required.
     * @exception {DeveloperError} property is required.
     * @exception {DeveloperError} pbject must have the specified property.
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
        tween.start();

        return {
            _tween : tween
        };
    };

    /**
     * DOC_TBA
     * @memberof AnimationCollection
     *
     * @exception {DeveloperError} material is required.
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
        tween.onComplete(function() {
            tween.to({
                offset : material.uniforms.offset + 1.0
            }, duration);
            tween.start();
        });
        tween.start();

        return {
            _tween : tween
        };
    };

    /**
     * DOC_TBA
     * @memberof AnimationCollection
     */
    AnimationCollection.prototype.remove = function(animation) {
        if (defined(animation)) {
            var count = Tween.getAll().length;
            Tween.remove(animation._tween);

            return Tween.getAll().length === (count - 1);
        }

        return false;
    };

    /**
     * DOC_TBA
     * @memberof AnimationCollection
     */
    AnimationCollection.prototype.removeAll = function() {
        var tweens = Tween.getAll();
        var n = tweens.length;
        var i = -1;
        while (++i < n) {
            var t = tweens[i];
            if (typeof t.onCancel === 'function') {
                t.onCancel();
            }
        }
        Tween.removeAll();
    };

    /**
     * DOC_TBA
     * @memberof Animationcollection
     */
    AnimationCollection.prototype.contains = function(animation) {
        if (defined(animation)) {
            return Tween.getAll().indexOf(animation._tween) !== -1;
        }
        return false;
    };

    /**
     * DOC_TBA
     * @memberof AnimationCollection
     */
    AnimationCollection.prototype.update = function() {
        Tween.update();
    };

    return AnimationCollection;
});
