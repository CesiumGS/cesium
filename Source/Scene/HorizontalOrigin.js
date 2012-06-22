/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * The horizontal location of an origin relative to an object, e.g., a {@link Billboard}.
     * For example, the horizontal origin is used to display a billboard to the left or right (in
     * screen space) of the actual position.
     *
     * @exports HorizontalOrigin
     *
     * @see Billboard#setHorizontalOrigin
     */
    var HorizontalOrigin = {
        /**
         * The origin is at the horizontal center of the object.
         *
         * @constant
         * @type {Enumeration}
         */
        CENTER : new Enumeration(0, 'CENTER'),
        /**
         * The origin is on the left side of the object.
         *
         * @constant
         * @type {Enumeration}
         */
        LEFT : new Enumeration(1, 'LEFT'),
        /**
         * The origin is on the right side of the object.
         *
         * @constant
         * @type {Enumeration}
         */
        RIGHT : new Enumeration(-1, 'RIGHT')
    };

    return HorizontalOrigin;
});