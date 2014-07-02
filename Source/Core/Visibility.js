/*global define*/
define([
        './freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * This enumerated type is used in determining to what extent an object, the occludee,
     * is visible during horizon culling. An occluder may fully block an occludee, in which case
     * it has no visibility, may partially block an occludee from view, or may not block it at all,
     * leading to full visibility.
     *
     * @namespace
     * @alias Visibility
     */
    var Visibility = {
        /**
         * Represents that no part of an object is visible.
         *
         * @type {Number}
         * @constant
         */
        NONE : -1,

        /**
        * Represents that part, but not all, of an object is visible
        *
        * @type {Number}
        * @constant
        */
        PARTIAL : 0,

        /**
        * Represents that an object is visible in its entirety.
        *
        * @type {Number}
        * @constant
        */
        FULL : 1
    };

    return freezeObject(Visibility);
});