/*global define*/
define(['./Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * This enumerated type is used in determining to what extent an object, the occludee,
     * is visible during horizon culling. An occluder may fully block an occludee, in which case
     * it has no visibility, may partially block an occludee from view, or may not block it at all,
     * leading to full visibility.
     *
     * @exports Visibility
     */
    var Visibility = {
        /**
         * Represents that no part of an object is visible.
         *
         * @constant
         * @type {Enumeration}
         */
        NONE : new Enumeration(-1, 'NONE'),
        /**
        * Represents that part, but not all, of an object is visible
        *
        * @constant
        * @type {Enumeration}
        */
        PARTIAL : new Enumeration(0, 'PARTIAL'),
        /**
        * Represents that an object is visible in its entirety.
        *
        * @constant
        * @type {Enumeration}
        */
        FULL : new Enumeration(1, 'FULL')
    };

    return Visibility;
});