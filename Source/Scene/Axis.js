/*global define*/
define([
        '../Core/freezeObject'
], function(
        freezeObject) {
    'use strict';

    /**
     * An enum describing the x, y, z axes.
     *
     * @exports Axis
     */
    var Axis = {
        /**
         * Denotes the x-axis.
         *
         * @type {String}
         * @constant
         */
        X : 'X',

        /**
         * Denotes the y-axis.
         *
         * @type {String}
         * @constant
         */
        Y : 'Y',

        /**
         * Denotes the z-axis.
         *
         * @type {String}
         * @constant
         */
        Z : 'Z'
    };

    return freezeObject(Axis);
});
