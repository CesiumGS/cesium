/*global define*/
define(['./Enumeration'], function(Enumeration) {
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
         * @constant
         * @type {Enumeration}
         */
        OUTSIDE : new Enumeration(-1, 'OUTSIDE'),

        /**
         * Represents that an object intersects one of the frustum's planes.
         *
         * @constant
         * @type {Enumeration}
         */
        INTERSECTING : new Enumeration(0, 'INTERSECTING'),

        /**
         * Represents that an object is fully within the frustum.
         *
         * @constant
         * @type {Enumeration}
         */
        INSIDE : new Enumeration(1, 'INSIDE')
    };

    return Intersect;
});
