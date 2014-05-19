/*global define*/
define([
        './BlendEquation',
        './BlendFunction'
    ], function(
        BlendEquation,
        BlendFunction) {
    "use strict";

    /**
     * The blending state combines {@link BlendEquation} and {@link BlendFunction} and the
     * <code>enabled</code> flag to define the full blending state for combining source and
     * destination fragments when rendering.
     * <p>
     * This is a helper when using custom render states with {@link Appearance#renderState}.
     * </p>
     *
     * @exports BlendingState
     */
    var BlendingState = {
        /**
         * Blending is disabled.
         *
         * @type {Object}
         * @readonly
         */
        DISABLED : {
            enabled : false
        },

        /**
         * Blending is enabled using alpha blending, <code>source(source.alpha) + destination(1 - source.alpha)</code>.
         *
         * @type {Object}
         * @readonly
         */
        ALPHA_BLEND : {
            enabled : true,
            equationRgb : BlendEquation.ADD,
            equationAlpha : BlendEquation.ADD,
            functionSourceRgb : BlendFunction.SOURCE_ALPHA,
            functionSourceAlpha : BlendFunction.SOURCE_ALPHA,
            functionDestinationRgb : BlendFunction.ONE_MINUS_SOURCE_ALPHA,
            functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
        },

        /**
         * Blending is enabled using alpha blending with premultiplied alpha, <code>source + destination(1 - source.alpha)</code>.
         *
         * @type {Object}
         * @readonly
         */
        PRE_MULTIPLIED_ALPHA_BLEND : {
            enabled : true,
            equationRgb : BlendEquation.ADD,
            equationAlpha : BlendEquation.ADD,
            functionSourceRgb : BlendFunction.ONE,
            functionSourceAlpha : BlendFunction.ONE,
            functionDestinationRgb : BlendFunction.ONE_MINUS_SOURCE_ALPHA,
            functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
        },

        /**
         * Blending is enabled using additive blending, <code>source(source.alpha) + destination</code>.
         *
         * @type {Object}
         * @readonly
         */
        ADDITIVE_BLEND : {
            enabled : true,
            equationRgb : BlendEquation.ADD,
            equationAlpha : BlendEquation.ADD,
            functionSourceRgb : BlendFunction.SOURCE_ALPHA,
            functionSourceAlpha : BlendFunction.SOURCE_ALPHA,
            functionDestinationRgb : BlendFunction.ONE,
            functionDestinationAlpha : BlendFunction.ONE
        }
    };

    return BlendingState;
});