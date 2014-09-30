/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * The vertical location of an origin relative to an object, e.g., a {@link Billboard}.
     * For example, the vertical origin is used to display a billboard above or below (in
     * screen space) of the actual position.
     *
     * @namespace
     * @alias VerticalOrigin
     *
     * @see Billboard#verticalOrigin
     */
    var VerticalOrigin = {
        /**
         * The origin is at the vertical center of the object.
         *
         * @type {Number}
         * @constant
         */
        CENTER : 0,

        /**
         * The origin is at the bottom of the object.
         *
         * @type {Number}
         * @constant
         */
        BOTTOM : 1,

        /**
         * The origin is at the top of the object.
         *
         * @type {Number}
         * @constant
         */
        TOP : -1
    };

    return freezeObject(VerticalOrigin);
});