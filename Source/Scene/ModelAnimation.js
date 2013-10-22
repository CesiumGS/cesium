/*global define*/
define([
        '../Core/defaultValue',
        './ModelAnimationState'
    ], function(
        defaultValue,
        ModelAnimationState) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias ModelAnimation
     * @internalConstructor
     */
    var ModelAnimation = function(options, animation) {
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
        this.loop = defaultValue(options.loop, false);

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
        this._animation = animation;
        this._startTime = undefined;
        this._duration = undefined;
        this._previousIndex = undefined;
    };

    return ModelAnimation;
});