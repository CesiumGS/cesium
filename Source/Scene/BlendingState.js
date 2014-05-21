/*global define*/
define([
        '../Core/defineProperties',
        './BlendEquation',
        './BlendFunction'
    ], function(
        defineProperties,
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
    var BlendingState = function() {
        this._DISABLED = {
            enabled : false
        };
        this._ALPHA_BLEND = {
            enabled : true,
            equationRgb : BlendEquation.ADD,
            equationAlpha : BlendEquation.ADD,
            functionSourceRgb : BlendFunction.SOURCE_ALPHA,
            functionSourceAlpha : BlendFunction.SOURCE_ALPHA,
            functionDestinationRgb : BlendFunction.ONE_MINUS_SOURCE_ALPHA,
            functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
        };
        this._PRE_MULTIPLIED_ALPHA_BLEND = {
            enabled : true,
            equationRgb : BlendEquation.ADD,
            equationAlpha : BlendEquation.ADD,
            functionSourceRgb : BlendFunction.ONE,
            functionSourceAlpha : BlendFunction.ONE,
            functionDestinationRgb : BlendFunction.ONE_MINUS_SOURCE_ALPHA,
            functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
        };
        this._ADDITIVE_BLEND = {
            enabled : true,
            equationRgb : BlendEquation.ADD,
            equationAlpha : BlendEquation.ADD,
            functionSourceRgb : BlendFunction.SOURCE_ALPHA,
            functionSourceAlpha : BlendFunction.SOURCE_ALPHA,
            functionDestinationRgb : BlendFunction.ONE,
            functionDestinationAlpha : BlendFunction.ONE
        };
    };

    defineProperties(BlendingState.prototype, {
        /**
         * Blending is disabled.
         *
         * @memberof BlendingState.prototype
         *
         * @type {Object}
         * @readonly
         */
        DISABLED : {
            get : function() {
                return this._DISABLED;
            }
        },

        /**
         * Blending is enabled using alpha blending, <code>source(source.alpha) + destination(1 - source.alpha)</code>.
         *
         * @memberof BlendingState.prototype
         *
         * @type {Object}
         * @readonly
         */
        ALPHA_BLEND : {
            get : function() {
                return this._ALPHA_BLEND;
            }
        },

        /**
         * Blending is enabled using alpha blending with premultiplied alpha, <code>source + destination(1 - source.alpha)</code>.
         *
         * @memberof BlendingState.prototype
         *
         * @type {Object}
         * @readonly
         */
        PRE_MULTIPLIED_ALPHA_BLEND : {
            get : function() {
                return this._PRE_MULTIPLIED_ALPHA_BLEND;
            }
        },

        /**
         * Blending is enabled using additive blending, <code>source(source.alpha) + destination</code>.
         *
         * @memberof BlendingState.prototype
         *
         * @type {Object}
         * @readonly
         */
        ADDITIVE_BLEND : {
            get : function() {
                return this._ADDITIVE_BLEND;
            }
        }
    });

    return BlendingState;
});