/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * Specifies whether the object casts or receives shadows from each light source when
     * shadows are enabled.
     *
     * @exports ShadowMode
     */
    var ShadowMode = {
        /**
         * The object does not cast or receive shadows.
         *
         * @type {Number}
         * @constant
         */
        DISABLED : 0,

        /**
         * The object casts and receives shadows.
         *
         * @type {Number}
         * @constant
         */
        ENABLED : 1,

        /**
         * The object casts shadows only.
         *
         * @type {Number}
         * @constant
         */
        CAST_ONLY : 2,

        /**
         * The object receives shadows only.
         *
         * @type {Number}
         * @constant
         */
        RECEIVE_ONLY : 3,

        /**
         * @private
         */
        NUMBER_OF_SHADOW_MODES : 4
    };

    /**
     * @private
     */
    ShadowMode.castShadows = function(shadowMode) {
        return (shadowMode === ShadowMode.ENABLED) || (shadowMode === ShadowMode.CAST_ONLY);
    };

    /**
     * @private
     */
    ShadowMode.receiveShadows = function(shadowMode) {
        return (shadowMode === ShadowMode.ENABLED) || (shadowMode === ShadowMode.RECEIVE_ONLY);
    };
    
    return freezeObject(ShadowMode);
});
