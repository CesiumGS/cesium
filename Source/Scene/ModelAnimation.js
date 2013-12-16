/*global define*/
define([
        '../Core/defaultValue',
        './ModelAnimationWrap',
        './ModelAnimationState'
    ], function(
        defaultValue,
        ModelAnimationWrap,
        ModelAnimationState) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias ModelAnimation
     * @internalConstructor
     */
    var ModelAnimation = function(options, runtimeAnimation) {
        /**
         * DOC_TBA
         *
         * @type {String}
         *
         * @readonly
         */
        this.name = options.name;

        /**
         * DOC_TBA
         *
         * @type {JulianDate}
         * @default undefined
         *
         * @readonly
         */
        this.startTime = options.startTime; // when undefined, start next frame

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @default undefined
         *
         * @readonly
         */
        this.startOffset = defaultValue(options.startOffset, 0.0); // in seconds

        /**
         * DOC_TBA
         *
         * @type {JulianDate}
         * @default undefined
         *
         * @readonly
         */
        this.stopTime = options.stopTime; // when defined, play until end of animation depending on wrap

        /**
         * DOC_TBA
         *
         * @type {Boolean}
         * @default false
         */
        this.removeOnStop = defaultValue(options.removeOnStop, false);

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @default 1.0
         *
         * @readonly
         */
        this.speedup = defaultValue(options.speedup, 1.0);

        /**
         * DOC_TBA
         *
         * @type {Boolean}
         * @default false
         *
         * @readonly
         */
        this.reverse = defaultValue(options.reverse, false);

        /**
         * DOC_TBA
         *
         * @type {ModelAnimationRepea}
         * @default {@link ModelAnimationWrap.CLAMP}
         *
         * @readonly
         */
        this.wrap = defaultValue(options.wrap, ModelAnimationWrap.CLAMP);

        /**
         * DOC_TBA
         *
         * @type {Event}
         * @default undefined
         */
        this.start = options.start;

        /**
         * DOC_TBA
         *
         * @type {Event}
         * @default undefined
         */
        this.update = options.update;

        /**
         * DOC_TBA
         *
         * @type {Event}
         * @default undefined
         */
        this.stop = options.stop;

        this._state = ModelAnimationState.STOPPED;
        this._runtimeAnimation = runtimeAnimation;
        this._startTime = undefined;
        this._duration = undefined;
    };

    return ModelAnimation;
});