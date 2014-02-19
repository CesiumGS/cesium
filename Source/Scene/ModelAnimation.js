/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Event',
        './ModelAnimationLoop',
        './ModelAnimationState'
    ], function(
        defaultValue,
        Event,
        ModelAnimationLoop,
        ModelAnimationState) {
    "use strict";

    /**
     * An active glTF animation.  A glTF asset can contain animations.  An active animation
     * is an animation that is currently playing or scheduled to be played because it was
     * added to a model's {@link ModelAnimationCollection}.  An active animation is an
     * instance of an animation; for example, there can be multiple active animations
     * for the same glTF animation, each with a different start time.
     * <p>
     * Create this by calling {@link ModelAnimationCollection#add}.
     * </p>
     *
     * @alias ModelAnimation
     * @internalConstructor
     *
     * @see ModelAnimationCollection#add
     */
    var ModelAnimation = function(options, model, runtimeAnimation) {
        /**
         * The glTF animation name that identifies this animation.
         *
         * @type {String}
         *
         * @readonly
         */
        this.name = options.name;

        /**
         * The scene time to start playing this animation.  When this is <code>undefined</code>,
         * the animation starts at the next frame.
         *
         * @type {JulianDate}
         * @default undefined
         *
         * @readonly
         */
        this.startTime = options.startTime;

        /**
         * The offset, in seconds, from {@link ModelAnimation#startTime} to start playing.
         *
         * @type {Number}
         * @default undefined
         *
         * @readonly
         */
        this.startOffset = defaultValue(options.startOffset, 0.0); // in seconds

        /**
         * The scene time to stop playing this animation.  When this is <code>undefined</code>,
         * the animation is played for its full duration and perhaps repeated depending on
         * {@link ModelAnimation#loop}.
         *
         * @type {JulianDate}
         * @default undefined
         *
         * @readonly
         */
        this.stopTime = options.stopTime;

        /**
         * When <code>true</code>, the animation is removed after it stops playing.
         * This is slightly more efficient that not removing it, but if, for example,
         * time is reversed, the animation is not played again.
         *
         * @type {Boolean}
         * @default false
         */
        this.removeOnStop = defaultValue(options.removeOnStop, false);

        /**
         * Values greater than <code>1.0</code> increase the speed that the animation is played relative
         * to the scene clock speed; values less than <code>1.0</code> decrease the speed.  A value of
         * <code>1.0</code> plays the animation at the speed in the glTF animation mapped to the scene
         * clock speed.  For example, if the scene is played at 2x real-time, a two-second glTF animation
         * will play in one second even if <code>speedup</code> is <code>1.0</code>.
         *
         * @type {Number}
         * @default 1.0
         *
         * @readonly
         */
        this.speedup = defaultValue(options.speedup, 1.0);

        /**
         * When <code>true</code>, the animation is played in reverse.
         *
         * @type {Boolean}
         * @default false
         *
         * @readonly
         */
        this.reverse = defaultValue(options.reverse, false);

        /**
         * Determines if and how the animation is looped.
         *
         * @type {ModelAnimationLoop}
         * @default {@link ModelAnimationLoop.NONE}
         *
         * @readonly
         */
        this.loop = defaultValue(options.loop, ModelAnimationLoop.NONE);

        /**
         * The event fired when this animation is started.  This can be used, for
         * example, to play a sound or start a particle system, when the animation starts.
         * <p>
         * This event is fired at the end of the frame after the scene is rendered.
         * </p>
         *
         * @type {Event}
         * @default new Event()
         *
         * @example
         * animation.start.addEventListener(function(model, animation) {
         *   console.log('Animation started: ' + animation.name);
         * });
         */
        this.start = new Event();

        /**
         * The event fired when on each frame when this animation is updated.  The
         * current time of the animation, relative to the glTF animation time span, is
         * passed to the event, which allows, for example, starting new animations at a
         * specific time relative to a playing animation.
         * <p>
         * This event is fired at the end of the frame after the scene is rendered.
         * </p>
         *
         * @type {Event}
         * @default new Event()
         *
         * @example
         * animation.update.addEventListener(function(model, animation, time) {
         *   console.log('Animation updated: ' + animation.name + '. glTF animation time: ' + time);
         * });
         */
        this.update = new Event();

        /**
         * The event fired when this animation is stopped.  This can be used, for
         * example, to play a sound or start a particle system, when the animation stops.
         * <p>
         * This event is fired at the end of the frame after the scene is rendered.
         * </p>
         *
         * @type {Event}
         * @default new Event()
         *
         * @example
         * animation.stop.addEventListener(function(model, animation) {
         *   console.log('Animation stopped: ' + animation.name);
         * });
         */
        this.stop = new Event();

        this._state = ModelAnimationState.STOPPED;
        this._runtimeAnimation = runtimeAnimation;
        this._startTime = undefined;
        this._duration = undefined;

        // To avoid allocations in ModelAnimationCollection.update
        var that = this;
        this._raiseStartEvent = function() {
            that.start.raiseEvent(model, that);
        };
        this._updateEventTime = 0.0;
        this._raiseUpdateEvent = function() {
            that.update.raiseEvent(model, that, that._updateEventTime);
        };
        this._raiseStopEvent = function() {
            that.stop.raiseEvent(model, that);
        };
    };

    return ModelAnimation;
});