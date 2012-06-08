/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * The vertical location of an origin relative to an object, e.g., a {@link Billboard}.
     * For example, the vertical origin is used to display a billboard above or below (in
     * screen space) of the actual position.
     *
     * @exports VerticalOrigin
     *
     * @see Billboard#setVerticalOrigin
     */
    var VerticalOrigin = {
        /**
         * The origin is at the vertical center of the object.
         *
         * @constant
         * @type {Enumeration}
         */
        CENTER : new Enumeration(0, 'CENTER'),
        /**
         * The origin is at the bottom of the object.
         *
         * @constant
         * @type {Enumeration}
         */
        BOTTOM : new Enumeration(1, 'BOTTOM'),
        /**
         * The origin is at the top of the object.
         *
         * @constant
         * @type {Enumeration}
         */
        TOP : new Enumeration(-1, 'TOP')
    };

    return VerticalOrigin;
});