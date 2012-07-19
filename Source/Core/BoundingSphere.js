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
     * Computes a tight-fitting bounding sphere enclosing a list of 3D Cartesian points.
     * <br /><br />
     *
     * <p>
     * When called with a list of {Cartesian3} elements as the only argument, the bounding
     * sphere is computed by running two algorithms, a naive algorithm and Ritter's algorithm. The
     * smaller of the two spheres is used to ensure a tight fit.
     * <br />
     * When called with the first argument as a {Cartesian3} instance and the second argument as a {Number},
     * then a bounding sphere is constructed using the first point as its center and the second argument
     * as its radius.
     * </p>
     *
     * @alias BoundingSphere
     *
     * @param {Array} positions List of points that the bounding sphere will enclose.  Each point must have <code>x</code>, <code>y</code>, and <code>z</code> properties.
     * @param {Number} radius An optional parameter, only to be supplied if <code>positions</code> contains a single point.
     *
     * @exception {DeveloperError} <code>positions</code> is required.
     *
     * @see AxisAlignedBoundingBox
     * @see <a href='http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/'>Bounding Sphere computation article</a>
     *
     * @constructor
     * @immutable
     *
     * @example
     * // Compute a bounding sphere enclosing two points.
     * var sphere = new BoundingSphere([new Cartesian3(-2, 0, 0),
     *     new Cartesian3(2, 0, 0)]);
     * @example
     * // Compute the same bounding sphere using a center point and a radius.
     * var sphere = new BoundingSphere(new Cartesian3(0, 0, 0), 2);
     */
    var BoundingSphere = function(positions, radius) {
        if (!positions) {
            throw new DeveloperError('positions is required.');
        }

        if ((arguments.length === 2) && (typeof arguments[1] === 'number')) {
            /**
             * The center point of the sphere.
             *
             * @type {Cartesian3}
             */
            this.center = arguments[0].clone();
            /**
             * The radius of the sphere.
             *
             * @type {Number}
             */
            this.radius = arguments[1];
        } else {
            var x = positions[0].x;
            var y = positions[0].y;
            var z = positions[0].z;

            var xMin = new Cartesian3(x, y, z);
            var yMin = new Cartesian3(x, y, z);
            var zMin = new Cartesian3(x, y, z);

            var xMax = new Cartesian3(x, y, z);
            var yMax = new Cartesian3(x, y, z);
            var zMax = new Cartesian3(x, y, z);

            var currentPos;
            var numPositions = positions.length;
            for ( var i = 0; i < numPositions; i++) {
                currentPos = positions[i];
                x = currentPos.x;
                y = currentPos.y;
                z = currentPos.z;

                // Store points containing the the smallest and largest components
                if (x < xMin.x) {
                    xMin = currentPos;
                }

                if (x > xMax.x) {
                    xMax = currentPos;
                }

                if (y < yMin.y) {
                    yMin = currentPos;
                }

                if (y > yMax.y) {
                    yMax = currentPos;
                }

                if (z < zMin.z) {
                    zMin = currentPos;
                }

                if (z > zMax.z) {
                    zMax = currentPos;
                }
            }

            // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
            var xSpan = (xMax.subtract(xMin)).magnitudeSquared();
            var ySpan = (yMax.subtract(yMin)).magnitudeSquared();
            var zSpan = (zMax.subtract(zMin)).magnitudeSquared();

            // Set the diameter endpoints to the largest span.
            var diameter1 = xMin;
            var diameter2 = xMax;
            var maxSpan = xSpan;
            if (ySpan > maxSpan) {
                maxSpan = ySpan;
                diameter1 = yMin;
                diameter2 = yMax;
            }
            if (zSpan > maxSpan) {
                maxSpan = zSpan;
                diameter1 = zMin;
                diameter2 = zMax;
            }

            // Calculate the center of the initial sphere found by Ritter's algorithm
            var ritterCenter = new Cartesian3(
                    (diameter1.x + diameter2.x) * 0.5,
                    (diameter1.y + diameter2.y) * 0.5,
                    (diameter1.z + diameter2.z) * 0.5);

            // Calculate the radius of the initial sphere found by Ritter's algorithm
            var radiusSquared = (diameter2.subtract(ritterCenter)).magnitudeSquared();
            var ritterRadius = Math.sqrt(radiusSquared);

            // Find the center of the sphere found using the Naive method.
            var minBoxPt = new Cartesian3(xMin.x, yMin.y, zMin.z);
            var maxBoxPt = new Cartesian3(xMax.x, yMax.y, zMax.z);
            var naiveCenter = (minBoxPt.add(maxBoxPt)).multiplyByScalar(0.5);

            // Begin 2nd pass to find naive radius and modify the ritter sphere.
            var naiveRadius = 0;
            for (i = 0; i < numPositions; i++) {
                currentPos = positions[i];

                // Find the furthest point from the naive center to calculate the naive radius.
                var r = (currentPos.subtract(naiveCenter)).magnitude();
                if (r > naiveRadius) {
                    naiveRadius = r;
                }

                // Make adjustments to the Ritter Sphere to include all points.
                var oldCenterToPointSquared = (currentPos.subtract(ritterCenter)).magnitudeSquared();
                if (oldCenterToPointSquared > radiusSquared) {
                    var oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
                    // Calculate new radius to include the point that lies outside
                    ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
                    radiusSquared = ritterRadius * ritterRadius;
                    // Calculate center of new Ritter sphere
                    var oldToNew = oldCenterToPoint - ritterRadius;
                    ritterCenter = new Cartesian3(
                            (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint,
                            (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint,
                            (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint);
                }
            }

            if (ritterRadius < naiveRadius) {
                this.center = ritterCenter;
                this.radius = ritterRadius;
            } else {
                this.center = naiveCenter;
                this.radius = naiveRadius;
            }
        }
    };

    /**
     * DOC_TBA
     * @memberof BoundingSphere
     */
    BoundingSphere.prototype.clone = function() {
        return new BoundingSphere(this.center, this.radius);
    };

    /**
     * DOC_TBA
     * @memberof BoundingSphere
     */
    BoundingSphere.planeSphereIntersect = function(sphere, plane) {
        var center = sphere.center;
        var radius = sphere.radius;
        var distanceToPlane = Cartesian3.dot(plane, center) + plane.w;

        if (distanceToPlane < -radius) {
            // The center point is OUTSIDE of the frustum
            return Intersect.OUTSIDE;
        } else if (distanceToPlane < radius) {
            // The center point is within the frustum, but radius extends beyond it; partial overlap
            return Intersect.INTERSECTING;
        }
        return Intersect.INSIDE;
    };

    return BoundingSphere;
});
