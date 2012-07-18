/*global define*/
define([
        './DeveloperError',
        './Cartesian3',
        './Intersect'
    ], function(
        DeveloperError,
        Cartesian3,
        Intersect) {
    "use strict";

    /**
     * Creates an instance of an AxisAlignedBoundingBox. The box is determined by finding the points spaced the
     * furthest apart on the x-, y-, and z-axes.
     *
     * @alias AxisAlignedBoundingBox
     *
     * @param {Array} positions List of points that the bounding box will enclose.  Each point must have a <code>x</code>, <code>y</code>, and <code>z</code> properties.
     *
     * @exception {DeveloperError} <code>positions</code> is required.
     *
     * @constructor
     * @immutable
     *
     * @example
     * // Compute an axis aligned bounding box enclosing two points.
     * var box = new AxisAlignedBoundingBox(
     *     [new Cartesian3(2, 0, 0), new Cartesian3(-2, 0, 0)]);
     */
    var AxisAlignedBoundingBox = function(positions) {
        if (!positions) {
            throw new DeveloperError('positions is required.');
        }

        var length = positions.length;
        if (length !== 0) {
            var minimumX = positions[0].x;
            var minimumY = positions[0].y;
            var minimumZ = positions[0].z;

            var maximumX = positions[0].x;
            var maximumY = positions[0].y;
            var maximumZ = positions[0].z;

            for ( var i = 1; i < length; i++) {
                var p = positions[i];
                var x = p.x;
                var y = p.y;
                var z = p.z;

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

                if (z < minimumZ) {
                    minimumZ = z;
                }

                if (z > maximumZ) {
                    maximumZ = z;
                }
            }

            var min = new Cartesian3(minimumX, minimumY, minimumZ);
            var max = new Cartesian3(maximumX, maximumY, maximumZ);

            /**
             * The minimum point defining the bounding box.
             *
             * @type {Cartesian3}
             */
            this.minimum = min;

            /**
             * The maximum point defining the bounding box.
             *
             * @type {Cartesian3}
             */
            this.maximum = max;

            /**
             * The center point of the bounding box.
             *
             * @type {Cartesian3}
             */
            this.center = (min.add(max)).multiplyByScalar(0.5);
        } else {
            this.minimum = undefined;
            this.maximum = undefined;
            this.center = undefined;
        }
    };

    /**
     * DOC_TBA
     * @memberof AxisAlignedBoundingBox
     */
    AxisAlignedBoundingBox.planeAABBIntersect = function(box, plane) {
        var max = box.maximum;
        var min = box.minimum;
        var center = max.add(min).divideByScalar(2);
        var h = max.subtract(min).divideByScalar(2); //The positive half diagonal
        var e = h.x * Math.abs(plane.x) + h.y * Math.abs(plane.y) + h.z * Math.abs(plane.z);
        var s = center.dot(plane) + plane.w; //signed distance from center
        if (s - e > 0) {
            return Intersect.INSIDE;
        }

        if (s + e < 0) {
            //Not in front because normals point inwards
            return Intersect.OUTSIDE;
        }

        return Intersect.INTERSECTING;
    };

    return AxisAlignedBoundingBox;
});
