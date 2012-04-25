/*global define*/
define([
        './DeveloperError',
        './Cartesian2'
    ], function(
        DeveloperError,
        Cartesian2) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @name AxisAlignedBoundingRectangle
     *
     * @exception {DeveloperError} <code>positions</code> is required.
     *
     * @constructor
     */
    function AxisAlignedBoundingRectangle(positions) {
        if (!positions) {
            throw new DeveloperError("positions is required.", "positions");
        }

        this.minimum = undefined;
        this.maximum = undefined;
        this.center = undefined;

        var length = positions.length;
        if (length > 0) {
            var minimumX = positions[0].x;
            var minimumY = positions[0].y;

            var maximumX = positions[0].x;
            var maximumY = positions[0].y;

            for ( var i = 1; i < length; i++) {
                var p = positions[i];
                var x = p.x;
                var y = p.y;

                if (x < minimumX) {
                    minimumX = x;
                }

                if (x > maximumX) {
                    maximumX = x;
                }

                if (y < minimumY) {
                    minimumY = y;
                }

                if (y > maximumY) {
                    maximumY = y;
                }
            }

            var min = new Cartesian2(minimumX, minimumY);
            var max = new Cartesian2(maximumX, maximumY);

            /**
             * DOC_TBA
             *
             * @type Cartesian2
             */
            this.minimum = min;

            /**
             * DOC_TBA
             *
             * @type Cartesian2
             */
            this.maximum = max;

            /**
             * DOC_TBA
             *
             * @type Cartesian2
             */
            this.center = (min.add(max)).multiplyWithScalar(0.5);
        }
    }

    return AxisAlignedBoundingRectangle;
});
