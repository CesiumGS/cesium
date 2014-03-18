/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * Defined the orientation of stripes in {@link StripeMaterialProperty}.
     *
     * @exports StripeOrientation
     */
    var StripeOrientation = {
        /**
         * Horizontal orientation.
         * @type {Enumeration}
         */
        HORIZONTAL : new Enumeration(0, 'HORIZONTAL'),
        /**
         * Vertical orientation.
         * @type {Enumeration}
         */
        VERTICAL : new Enumeration(1, 'VERTICAL')
    };

    return StripeOrientation;
});
