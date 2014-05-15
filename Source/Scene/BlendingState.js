/*global define*/
define([
        './BlendEquation',
        './BlendFunction'
    ], function(
        BlendEquation,
        BlendFunction) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports BlendingState
     */
    var BlendingState = {
        /**
         * DOC_TBA
         */
        DISABLED : {
            enabled : false
        },

        /**
         * DOC_TBA
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
         * DOC_TBA
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
         * DOC_TBA
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