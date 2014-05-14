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
     * @see Billboard#horizontalOrigin
     */
    var HorizontalOrigin = {
        /**
         * The origin is at the horizontal center of the object.
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        CENTER : new Enumeration(0, 'CENTER'),
        /**
         * The origin is on the left side of the object.
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        LEFT : new Enumeration(1, 'LEFT'),
        /**
         * The origin is on the right side of the object.
         *
         * @type {Enumeration}
         * @constant
         * @default -1
         */
        RIGHT : new Enumeration(-1, 'RIGHT')
    };

    return HorizontalOrigin;
});
