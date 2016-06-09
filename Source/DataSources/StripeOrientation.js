/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * Defined the orientation of stripes in {@link StripeMaterialProperty}.
     *
     * @exports StripeOrientation
     */
    var StripeOrientation = {
        /**
         * Horizontal orientation.
         * @type {Number}
         */
        HORIZONTAL : 0,

        /**
         * Vertical orientation.
         * @type {Number}
         */
        VERTICAL : 1
    };

    return freezeObject(StripeOrientation);
});