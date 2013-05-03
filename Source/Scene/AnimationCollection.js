/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/clone',
        '../ThirdParty/Tween',
        '../Core/defaultValue'
    ], function(
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
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Animations.html">Cesium Sandcastle Animation Demo</a>
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

        if (typeof options.duration === 'undefined') {
            throw new DeveloperError('duration is required.');
        }

        var delayDuration = defaultValue(options.delayDuration, 0);
        var easingFunction = defaultValue(options.easingFunction, Tween.Easing.Linear.None);

        var value = clone(options.startValue);
        var tween = new Tween.Tween(value);
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
    };

    /**
     * DOC_TBA
     * @memberof AnimationCollection
     *
     * @exception {DeveloperError} material is required.
     * @exception {DeveloperError} material has no properties with alpha components.
     */
    AnimationCollection.prototype.addAlpha = function(material, start, stop, options) {
        if (typeof material === 'undefined') {
            throw new DeveloperError('material is required.');
        }

        var properties = [];

        for ( var property in material.uniforms) {
            if (material.uniforms.hasOwnProperty(property) &&
                typeof material.uniforms[property] !== 'undefined' &&
                typeof material.uniforms[property].alpha !== 'undefined') {
                properties.push(property);
            }
        }

        if (properties.length === 0) {
            throw new DeveloperError('material has no properties with alpha components.');
        }

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
        if (typeof object === 'undefined') {
            throw new DeveloperError('object is required.');
        }

        if (typeof property === 'undefined') {
            throw new DeveloperError('property is required.');
        }

        if (typeof object[property] === 'undefined') {
            throw new DeveloperError('object must have the specified property.');
        }

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
        if (typeof material === 'undefined') {
            throw new DeveloperError('material is required.');
        }

        if (typeof material.uniforms.offset === 'undefined') {
            throw new DeveloperError('material must have an offset property.');
        }

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
        if (typeof animation !== 'undefined') {
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
        Tween.removeAll();
    };

    /**
     * DOC_TBA
     * @memberof Animationcollection
     */
    AnimationCollection.prototype.contains = function(animation) {
        if (typeof animation !== 'undefined') {
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