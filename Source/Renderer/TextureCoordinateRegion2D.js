/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Cartesian2'
    ], function(
        DeveloperError,
        Cartesian2) {
    "use strict";

    /**
     * A 2D texture coordinate region made up of {@link Cartesian2} bottom-left and bottom-right
     * corners. This object is used by TextureAtlas to represent the region of a texture devoted
     * to a specific image.
     * <br/>
     * If either <code>bottomLeft</code> or <code>topRight</code> is undefined, then the corresponding
     * components will be initialized to Cartesian2(0.0, 0.0) and Cartesian2(1.0, 1.0) respectively.
     *
     * @name TextureCoordinateRegion2D
     * @constructor
     *
     * @param {Cartesian2} bottomLeft The bottom-left texture coordinate.
     * @param {Cartesian2} topRight The top-right texture coordinate.
     *
     * @exception {DeveloperError} bottomLeft and topRight must be in the range [(0.0, 0.0), (1.0, 1.0)].
     * @exception {DeveloperError} bottomLeft must be smaller than topRight.
     *
     * @see Cartesian2
     * @see TextureAtlas
     */

    function TextureCoordinateRegion2D(bottomLeft, topRight) {

        bottomLeft = (typeof bottomLeft !== 'undefined') ? bottomLeft : new Cartesian2(0.0, 0.0);
        topRight = (typeof topRight !== 'undefined') ? topRight : new Cartesian2(1.0, 1.0);

        if (bottomLeft.x < 0.0 || bottomLeft.y < 0.0 || bottomLeft.x > 1.0 || bottomLeft.y > 1.0 ||
            topRight.x < 0.0 || topRight.y < 0.0 || topRight.x > 1.0 || topRight.y > 1.0) {
            throw new DeveloperError('bottomLeft and topRight must be in the range [(0.0, 0.0), (1.0, 1.0)].');
        }

        if (bottomLeft.x > topRight.x || bottomLeft.y > topRight.y) {
            throw new DeveloperError('bottomLeft must be smaller than topRight.');
        }

        /**
         * Bottom-left texture coordinate.
         *
         * @type Cartesian2
         *
         * @see Cartesian2
         */
        this.bottomLeft = bottomLeft;

        /**
         * Top-right texture coordinate.
         *
         * @type Cartesian2
         *
         * @see Cartesian2
         */
        this.topRight = topRight;
    }

    /**
     * Returns a string representing this instance in the format
     * ((bottomLeft.x, bottomLeft.y), (topRight.x, topRight.y)).
     *
     * @memberof TextureCoordinateRegion2D
     * @return {String} A string representing this instance.
     */
    TextureCoordinateRegion2D.prototype.toString = function() {
        return '((' + this.bottomLeft.x + ', ' + this.bottomLeft.y + '), ' +
               '('  + this.topRight.x + ', ' + this.topRight.y + '))';
    };

    return TextureCoordinateRegion2D;
});
