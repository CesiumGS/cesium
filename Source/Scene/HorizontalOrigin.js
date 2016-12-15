/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * The horizontal location of an origin relative to an object, e.g., a {@link Billboard}
     * or {@link Label}.  For example, setting the horizontal origin to <code>LEFT</code>
     * or <code>RIGHT</code> will display a billboard to the left or right (in screen space)
     * of the anchor position.
     * <br /><br />
     * <div align='center'>
     * <img src='images/Billboard.setHorizontalOrigin.png' width='648' height='196' /><br />
     * </div>
     *
     * @exports HorizontalOrigin
     *
     * @see Billboard#horizontalOrigin
     * @see Label#horizontalOrigin
     */
    var HorizontalOrigin = {
        /**
         * The origin is at the horizontal center of the object.
         *
         * @type {Number}
         * @constant
         */
        CENTER : 0,

        /**
         * The origin is on the left side of the object.
         *
         * @type {Number}
         * @constant
         */
        LEFT : 1,

        /**
         * The origin is on the right side of the object.
         *
         * @type {Number}
         * @constant
         */
        RIGHT : -1
    };

    return freezeObject(HorizontalOrigin);
});
