/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * The direction to display an ImageryLayer relative to the {@link Scene} imagerySplitPosition.


     * The vertical location of an origin relative to an object, e.g., a {@link Billboard}
     * or {@link Label}.  For example, setting the vertical origin to <code>TOP</code>
     * or <code>BOTTOM</code> will display a billboard above or below (in screen space)
     * the anchor position.
     * <br /><br />
     * <div align='center'>
     * <img src='images/Billboard.setVerticalOrigin.png' width='695' height='175' /><br />
     * </div>
     *
     * @exports ImagerySplitDirection
     *
     * @see Billboard#verticalOrigin
     * @see Label#verticalOrigin
     */
    var ImagerySplitDirection = {
        /**
         * Display the ImageryLayer to the left of the {@link Scene} imagerySplitPosition.
         *
         * @type {Number}
         * @constant
         */
        LEFT : -1.0,

        /**
        *  Always display the ImageryLayer.
         *
         * @type {Number}
         * @constant
         */
        NONE: 0.0,

        /**
         * Display the ImageryLayer to the right of the {@link Scene} imagerySplitPosition.
         *
         * @type {Number}
         * @constant
         */
        RIGHT : 1
    };

    return freezeObject(ImagerySplitDirection);
});
