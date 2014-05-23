/*global define*/
define(function() {
    "use strict";

    /**
     * This enumerated type is used in determining where, relative to the frustum, an
     * object is located. The object can either be fully contained within the frustum (INSIDE),
     * partially inside the frustum and partially outside (INTERSECTING), or somwhere entirely
     * outside of the frustum's 6 planes (OUTSIDE).
     *
     * @exports Intersect
     */
    var Intersect = {
        /**
         * Represents that an object is not contained within the frustum.
         *
         * @type {Number}
         * @constant
         * @default -1
         */
        OUTSIDE : -1,

        /**
         * Represents that an object intersects one of the frustum's planes.
         *
         * @type {Number}
         * @constant
         * @default 0
         */
        INTERSECTING : 0,

        /**
         * Represents that an object is fully within the frustum.
         *
         * @type {Number}
         * @constant
         * @default 1
         */
        INSIDE : 1
    };

    return Intersect;
});