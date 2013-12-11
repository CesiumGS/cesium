/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Enumeration',
        '../Core/Event',
        '../Core/JulianDate',
        './ModelAnimationWrap',
        './ModelAnimationState',
        './ModelAnimation'
    ], function(
        defined,
        defineProperties,
        defaultValue,
        DeveloperError,
        CesiumMath,
        Enumeration,
        Event,
        JulianDate,
        ModelAnimationWrap,
        ModelAnimationState,
        ModelAnimation) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias ModelAnimationCollection
     * @constructor
     */
    var ModelAnimationCollection = function(model) {
        /**
         * DOC_TBA
         */
        this.animationAdded = new Event();

        /**
         * DOC_TBA
         */
        this.animationRemoved = new Event();

        this._model = model;
        this._scheduledAnimations = [];
    };

    defineProperties(ModelAnimationCollection.prototype, {
        /**
         * DOC_TBA
         *
         * @memberof ModelAnimationCollection
         * @type {Number}
         *
         * @readonly
         */
        length : {
            get : function () {
                return this._scheduledAnimations.length;
            }
        }
    });

    /**
     * DOC_TBA
     *
     * @param {String} options.name DOC_TBA
     * @param {JulianDate} [options.startTime] DOC_TBA
     * @param {Number} [options.startOffset] DOC_TBA
     * @param {JulianDate} [options.stopTime] DOC_TBA
     * @param {Boolean} [options.removeOnStop=false] DOC_TBA
     * @param {Number} [options.scale=1.0] DOC_TBA
     * @param {Boolean} [options.reverse=false] DOC_TBA
     * @param {ModelAnimationWrap} [options.wrap=ModelAnimationWrap.CLAMP] DOC_TBA
     * @param {Event} [options.start] DOC_TBA
     * @param {Event} [options.update] DOC_TBA
     * @param {Event} [options.stop] DOC_TBA
     *
     * @exception {DeveloperError} The gltf property is not defined.  Wait for the {@see Model#jsonLoad} event.
     * @exception {DeveloperError} options.name is required and must be a valid animation name.
     * @exception {DeveloperError} options.speedup must be greater than zero.
     */
    ModelAnimationCollection.prototype.add = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var gltf = this._model.gltf;

        if (!defined(gltf)) {
            throw new DeveloperError('The gltf property is not defined.  Wait for the jsonLoad event.');
        }

        var animation = gltf.animations[options.name];

        if (!defined(animation)) {
            throw new DeveloperError('options.name is required and must be a valid animation name.');
        }

        if (defined(options.speedup) && (options.speedup <= 0.0)) {
            throw new DeveloperError('options.speedup must be greater than zero.');
        }

        var scheduledAnimation = new ModelAnimation(options, animation);
        this._scheduledAnimations.push(scheduledAnimation);
        this.animationAdded.raiseEvent(scheduledAnimation);
        return scheduledAnimation;
    };

    /**
     * DOC_TBA
     *
     * @memberof ModelAnimationCollection
     */
    ModelAnimationCollection.prototype.remove = function(animation) {
        if (defined(animation)) {
            var animations = this._scheduledAnimations;
            var i = animations.indexOf(animation);
            if (i !== -1) {
                animations.splice(i, 1);
                this.animationRemoved.raiseEvent(animation);
                return true;
            }
        }

        return false;
    };

    /**
     * DOC_TBA
     *
     * @memberof ModelAnimationCollection
     */
    ModelAnimationCollection.prototype.removeAll = function() {
        var animations = this._scheduledAnimations;
        var length = animations.length;

        this._scheduledAnimations = [];

        for (var i = 0; i < length; ++i) {
            this.animationRemoved.raiseEvent(animations[i]);
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof ModelAnimationCollection
     */
    ModelAnimationCollection.prototype.contains = function(animation) {
        if (defined(animation)) {
            return (this._scheduledAnimations.indexOf(animation) !== -1);
        }

        return false;
    };

    /**
     * DOC_TBA
     *
     * @memberof ModelAnimationCollection
     */
    ModelAnimationCollection.prototype.get = function(index) {
        if (!defined(index)) {
            throw new DeveloperError('index is required.');
        }

        return this._scheduledAnimations[index];
    };

    function animateChannels(model, scheduledAnimation, localAnimationTime) {
        var nodes = model.gltf.nodes;
        var animation = scheduledAnimation._animation;
        var samplers = animation.samplers;
        var channels = animation.channels;
        var length = channels.length;

        for (var i = 0; i < length; ++i) {
            var channel = channels[i];

            var target = channel.target;
            // TODO: Support other targets when glTF does: https://github.com/KhronosGroup/glTF/issues/142
            var czmNode = nodes[target.id].czm;
            var spline = samplers[channel.sampler].czm.spline;

            czmNode[target.path] = spline.evaluate(localAnimationTime, czmNode[target.path]);
        }
    }

    var animationsToRemove = [];

    /**
     * @private
     */
    ModelAnimationCollection.prototype.update = function(frameState) {
        if (JulianDate.equals(frameState.time, frameState.previousTime)) {
            // Animations are currently only time-dependent so do not animate when paused or picking
            return false;
        }

        var animationOccured = false;
        var sceneTime = frameState.time;
        var events = frameState.events;

        var model = this._model;
        var scheduledAnimations = this._scheduledAnimations;
        var length = scheduledAnimations.length;

        for (var i = 0; i < length; ++i) {
            var scheduledAnimation = scheduledAnimations[i];
            var animation = scheduledAnimation._animation;

            if (!defined(scheduledAnimation._startTime)) {
                scheduledAnimation._startTime = defaultValue(scheduledAnimation.startTime, sceneTime).addSeconds(scheduledAnimation.startOffset);
            }

            if (!defined(scheduledAnimation._duration)) {
                scheduledAnimation._duration = animation.czm.stopTime * (1.0 / scheduledAnimation.speedup);
            }

            var startTime = scheduledAnimation._startTime;
            var duration = scheduledAnimation._duration;
            var stopTime = scheduledAnimation.stopTime;

            // [0.0, 1.0] normalized local animation time
            var delta = startTime.getSecondsDifference(sceneTime) / duration;
            var pastStartTime = (delta >= 0.0);

            // Play animation if
            // * we are after the start time, and
            // * before the end of the animation's duration or the animation is being repeated, and
            // * we did not reach a user-provided stop time.
            var play = pastStartTime &&
                       ((delta <= 1.0) ||
                        ((scheduledAnimation.wrap === ModelAnimationWrap.REPEAT) ||
                         (scheduledAnimation.wrap === ModelAnimationWrap.MIRRORED_REPEAT))) &&
                       (!defined(stopTime) || sceneTime.lessThanOrEquals(stopTime));

            if (play) {
                // STOPPED -> ANIMATING state transition?
                if (scheduledAnimation._state === ModelAnimationState.STOPPED) {
                    scheduledAnimation._state = ModelAnimationState.ANIMATING;
                    if (defined(scheduledAnimation.start)) {
                        events.push({
                            event : scheduledAnimation.start
                        });
                    }
                }

                // Trunicate to [0.0, 1.0] for repeating animations
                if (scheduledAnimation.wrap === ModelAnimationWrap.REPEAT) {
                    delta = delta - Math.floor(delta);
                } else if (scheduledAnimation.wrap === ModelAnimationWrap.MIRRORED_REPEAT) {
                    var floor = Math.floor(delta);
                    var fract = delta - floor;
                    // When even use (1.0 - fract) to mirror repeat
                    delta = (floor % 2 === 1.0) ? (1.0 - fract) : fract;
                }

                if (scheduledAnimation.reverse) {
                    delta = 1.0 - delta;
                }

                var localAnimationTime = delta * duration * scheduledAnimation.speedup;
                // Clamp in case float-point roundoff goes outside the animation's first or last keyframe
                localAnimationTime = CesiumMath.clamp(localAnimationTime, animation.czm.startTime, animation.czm.stopTime);

                animateChannels(model, scheduledAnimation, localAnimationTime);

                if (defined(scheduledAnimation.update)) {
                    events.push({
                        event : scheduledAnimation.update
                    });
                }
                animationOccured = true;
            } else {
                // ANIMATING -> STOPPED state transition?
                if (pastStartTime && (scheduledAnimation._state === ModelAnimationState.ANIMATING)) {
                    scheduledAnimation._state = ModelAnimationState.STOPPED;
                    if (defined(scheduledAnimation.stop)) {
                        events.push({
                            event : scheduledAnimation.stop
                        });
                    }

                    if (scheduledAnimation.removeOnStop) {
                        animationsToRemove.push(scheduledAnimation);
                    }
                }
            }
        }

        // Remove animations that stopped
        length = animationsToRemove.length;
        for (var j = 0; j < length; ++j) {
            var animationToRemove = animationsToRemove[j];
            scheduledAnimations.splice(scheduledAnimations.indexOf(animationToRemove), 1);
            events.push({
                event : this.animationRemoved,
                eventArguments : [animationToRemove]
            });
        }
        animationsToRemove.length = 0;

        return animationOccured;
    };

    return ModelAnimationCollection;
});