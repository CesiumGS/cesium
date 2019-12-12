import freezeObject from '../Core/freezeObject.js';

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
export default freezeObject(StripeOrientation);
