/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Cartesian3',
        './Ellipsoid',
        './EquidistantCylindricalProjection',
        './Extent',
        './Intersect'
    ], function(
        defaultValue,
        DeveloperError,
        Cartesian3,
        Ellipsoid,
        EquidistantCylindricalProjection,
        Extent,
        Intersect) {
    "use strict";

    /**
     * A bounding sphere with a center and a radius.
     * @alias BoundingSphere
     * @constructor
     *
     * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the bounding sphere.
     * @param {Number} [radius=0.0] The radius of the bounding sphere.
     *
     * @see AxisAlignedBoundingBox
     * @see BoundingRectangle
     */
    var BoundingSphere = function(center, radius) {
        /**
         * The center point of the sphere.
         * @type {Cartesian3}
         */
        this.center = (typeof center !== 'undefined') ? Cartesian3.clone(center) : Cartesian3.ZERO.clone();
        /**
         * The radius of the sphere.
         * @type {Number}
         */
        this.radius = defaultValue(radius, 0.0);
    };

    var fromPointsXMin = new Cartesian3();
    var fromPointsYMin = new Cartesian3();
    var fromPointsZMin = new Cartesian3();
    var fromPointsXMax = new Cartesian3();
    var fromPointsYMax = new Cartesian3();
    var fromPointsZMax = new Cartesian3();
    var fromPointsCurrentPos = new Cartesian3();
    var fromPointsScratch = new Cartesian3();
    var fromPointsRitterCenter = new Cartesian3();
    var fromPointsMinBoxPt = new Cartesian3();
    var fromPointsMaxBoxPt = new Cartesian3();

    /**
     * Computes a tight-fitting bounding sphere enclosing a list of 3D Cartesian points.
     * The bounding sphere is computed by running two algorithms, a naive algorithm and
     * Ritter's algorithm. The smaller of the two spheres is used to ensure a tight fit.
     * @memberof BoundingSphere
     *
     * @param {Array} positions An array of points that the bounding sphere will enclose.  Each point must have <code>x</code>, <code>y</code>, and <code>z</code> properties.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @see <a href='http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/'>Bounding Sphere computation article</a>
     */
    BoundingSphere.fromPoints = function(positions, result) {
        if (typeof result === 'undefined') {
            result = new BoundingSphere();
        }

        if (typeof positions === 'undefined' || positions.length === 0) {
            result.center = Cartesian3.ZERO.clone(result.center);
            result.radius = 0.0;
            return result;
        }

        var currentPos = Cartesian3.clone(positions[0], fromPointsCurrentPos);

        var xMin = Cartesian3.clone(currentPos, fromPointsXMin);
        var yMin = Cartesian3.clone(currentPos, fromPointsYMin);
        var zMin = Cartesian3.clone(currentPos, fromPointsZMin);

        var xMax = Cartesian3.clone(currentPos, fromPointsXMax);
        var yMax = Cartesian3.clone(currentPos, fromPointsYMax);
        var zMax = Cartesian3.clone(currentPos, fromPointsZMax);

        var numPositions = positions.length;
        for ( var i = 1; i < numPositions; i++) {
            Cartesian3.clone(positions[i], currentPos);

            var x = currentPos.x;
            var y = currentPos.y;
            var z = currentPos.z;

            // Store points containing the the smallest and largest components
            if (x < xMin.x) {
                Cartesian3.clone(currentPos, xMin);
            }

            if (x > xMax.x) {
                Cartesian3.clone(currentPos, xMax);
            }

            if (y < yMin.y) {
                Cartesian3.clone(currentPos, yMin);
            }

            if (y > yMax.y) {
                Cartesian3.clone(currentPos, yMax);
            }

            if (z < zMin.z) {
                Cartesian3.clone(currentPos, zMin);
            }

            if (z > zMax.z) {
                Cartesian3.clone(currentPos, zMax);
            }
        }

        // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
        var xSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(xMax, xMin, fromPointsScratch));
        var ySpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(yMax, yMin, fromPointsScratch));
        var zSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(zMax, zMin, fromPointsScratch));

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
        var ritterCenter = fromPointsRitterCenter;
        ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
        ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
        ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

        // Calculate the radius of the initial sphere found by Ritter's algorithm
        var radiusSquared = Cartesian3.magnitudeSquared(Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch));
        var ritterRadius = Math.sqrt(radiusSquared);

        // Find the center of the sphere found using the Naive method.
        var minBoxPt = fromPointsMinBoxPt;
        minBoxPt.x = xMin.x;
        minBoxPt.y = yMin.y;
        minBoxPt.z = zMin.z;

        var maxBoxPt = fromPointsMaxBoxPt;
        maxBoxPt.x = xMax.x;
        maxBoxPt.y = yMax.y;
        maxBoxPt.z = zMax.z;

        var naiveCenter = Cartesian3.multiplyByScalar(Cartesian3.add(minBoxPt, maxBoxPt, fromPointsScratch), 0.5);

        // Begin 2nd pass to find naive radius and modify the ritter sphere.
        var naiveRadius = 0;
        for (i = 0; i < numPositions; i++) {
            Cartesian3.clone(positions[i], currentPos);

            // Find the furthest point from the naive center to calculate the naive radius.
            var r = Cartesian3.magnitude(Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch));
            if (r > naiveRadius) {
                naiveRadius = r;
            }

            // Make adjustments to the Ritter Sphere to include all points.
            var oldCenterToPointSquared = Cartesian3.magnitudeSquared(Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch));
            if (oldCenterToPointSquared > radiusSquared) {
                var oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
                // Calculate new radius to include the point that lies outside
                ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
                radiusSquared = ritterRadius * ritterRadius;
                // Calculate center of new Ritter sphere
                var oldToNew = oldCenterToPoint - ritterRadius;
                ritterCenter.x = (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint;
                ritterCenter.y = (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint;
                ritterCenter.z = (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint;
            }
        }

        if (ritterRadius < naiveRadius) {
            Cartesian3.clone(ritterCenter, result.center);
            result.radius = ritterRadius;
        } else {
            Cartesian3.clone(naiveCenter, result.center);
            result.radius = naiveRadius;
        }

        return result;
    };

    var defaultProjection = new EquidistantCylindricalProjection();
    /**
     * Computes a bounding sphere from an extent projected in 2D.
     * @memberof BoundingSphere
     *
     * @param {Extent} extent The extent around which to create a bounding sphere.
     * @param {Object} [projection=EquidistantCylindricalProjection] The projection used to project the extent into 2D.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.fromExtent2D = function(extent, projection, result) {
        if (typeof result === 'undefined') {
            result = new BoundingSphere();
        }

        if (typeof extent === 'undefined') {
            result.center = Cartesian3.ZERO.clone(result.center);
            result.radius = 0.0;
            return result;
        }

        projection = (typeof projection !== 'undefined') ? projection : defaultProjection;

        var lowerLeft = projection.project(extent.getSouthwest());
        var upperRight = projection.project(extent.getNortheast());

        var width = upperRight.x - lowerLeft.x;
        var height = upperRight.y - lowerLeft.y;

        result.radius = Math.sqrt(width * width + height * height) * 0.5;
        var center = result.center;
        center.x = lowerLeft.x + width * 0.5;
        center.y = lowerLeft.y + height * 0.5;
        center.z = 0;
        return result;
    };

    /**
     * Computes a bounding sphere from an extent in 3D. The bounding sphere is created using a subsample of points
     * on the ellipsoid and contained in the extent. It may not be accurate for all extents on all types of ellipsoids.
     * @memberof BoundingSphere
     *
     * @param {Extent} extent The valid extent used to create a bounding sphere.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid used to determine positions of the extent.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.fromExtent3D = function(extent, ellipsoid, result) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        var positions = typeof extent !== 'undefined' ? extent.subsample(ellipsoid) : undefined;
        return BoundingSphere.fromPoints(positions, result);
    };

    BoundingSphere.fromFlatArray = function(positions, center, stride) {
        var boundingSphere = new BoundingSphere(new Cartesian3(0.0, 0.0, 0.0), 0.0);
        var x = positions[0] + center.x;
        var y = positions[1] + center.y;
        var z = positions[2] + center.z;

        var xMin = new Cartesian3(x, y, z);
        var yMin = new Cartesian3(x, y, z);
        var zMin = new Cartesian3(x, y, z);

        var xMax = new Cartesian3(x, y, z);
        var yMax = new Cartesian3(x, y, z);
        var zMax = new Cartesian3(x, y, z);

        var numElements = positions.length;
        for (var i = 0; i < numElements; i += stride) {
            x = positions[i] + center.x;
            y = positions[i + 1] + center.y;
            z = positions[i + 2] + center.z;

            // Store points containing the the smallest and largest components
            if (x < xMin.x) {
                xMin.x = x;
                xMin.y = y;
                xMin.z = z;
            }

            if (x > xMax.x) {
                xMax.x = x;
                xMax.y = y;
                xMax.z = z;
            }

            if (y < yMin.y) {
                yMin.x = x;
                yMin.y = y;
                yMin.z = z;
            }

            if (y > yMax.y) {
                yMax.x = x;
                yMax.y = y;
                yMax.z = z;
            }

            if (z < zMin.z) {
                zMin.x = x;
                zMin.y = y;
                zMin.z = z;
            }

            if (z > zMax.z) {
                zMax.x = x;
                zMax.y = y;
                zMax.z = z;
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
        var ritterRadiusSquared = (diameter2.subtract(ritterCenter)).magnitudeSquared();
        var ritterRadius = Math.sqrt(ritterRadiusSquared);

        // Find the center of the sphere found using the Naive method.
        var minBoxPt = new Cartesian3(xMin.x, yMin.y, zMin.z);
        var maxBoxPt = new Cartesian3(xMax.x, yMax.y, zMax.z);
        var naiveCenter = (minBoxPt.add(maxBoxPt)).multiplyByScalar(0.5);

        // Begin 2nd pass to find naive radius and modify the ritter sphere.
        var naiveRadiusSquared = 0;
        var currentPos = new Cartesian3(0.0, 0.0, 0.0);
        for (i = 0; i < numElements; i += stride) {
            currentPos.x = positions[i] + center.x;
            currentPos.y = positions[i + 1] + center.y;
            currentPos.z = positions[i + 2] + center.z;

            // Find the furthest point from the naive center to calculate the naive radius.
            var rSquared = (currentPos.subtract(naiveCenter)).magnitudeSquared();
            if (rSquared > naiveRadiusSquared) {
                naiveRadiusSquared = rSquared;
            }

            // Make adjustments to the Ritter Sphere to include all points.
            var oldCenterToPointSquared = (currentPos.subtract(ritterCenter)).magnitudeSquared();
            if (oldCenterToPointSquared > ritterRadiusSquared) {
                var oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
                // Calculate new radius to include the point that lies outside
                ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
                ritterRadiusSquared = ritterRadius * ritterRadius;
                // Calculate center of new Ritter sphere
                var oldToNew = oldCenterToPoint - ritterRadius;
                ritterCenter = new Cartesian3(
                        (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint,
                        (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint,
                        (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint);
            }
        }

        if (ritterRadiusSquared < naiveRadiusSquared) {
            boundingSphere.center = ritterCenter;
            boundingSphere.radius = ritterRadius;
        } else {
            boundingSphere.center = naiveCenter;
            boundingSphere.radius = Math.sqrt(naiveRadiusSquared);
        }

        return boundingSphere;
    };

    /**
     * Duplicates a BoundingSphere instance.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} sphere The bounding sphere to duplicate.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @exception {DeveloperError} sphere is required.
     */
    BoundingSphere.clone = function(sphere, result) {
        if (typeof sphere === 'undefined') {
            throw new DeveloperError('sphere is required');
        }

        if (typeof result === 'undefined') {
            return new BoundingSphere(sphere.center, sphere.radius);
        }

        result.center = Cartesian3.clone(sphere.center, result.center);
        result.radius = sphere.radius;
        return result;
    };

    var unionScratch = new Cartesian3();
    /**
     * Computes a bounding sphere that contains both the left and right bounding spheres.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} left A sphere to enclose in a bounding sphere.
     * @param {BoundingSphere} right A sphere to enclose in a bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    BoundingSphere.union = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required.');
        }

        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required.');
        }

        if (typeof result === 'undefined') {
            result = new BoundingSphere();
        }

        var leftCenter = left.center;
        var rightCenter = right.center;

        var center = Cartesian3.add(leftCenter, rightCenter, result.center);
        result.center = Cartesian3.multiplyByScalar(center, 0.5, center);

        var radius1 = Cartesian3.subtract(leftCenter, center, unionScratch).magnitude() + left.radius;
        var radius2 = Cartesian3.subtract(rightCenter, center, unionScratch).magnitude() + right.radius;
        result.radius = Math.max(radius1, radius2);
        return result;
    };

    var expandScratch = new Cartesian3();
    /**
     * Computes a bounding sphere by enlarging the provided sphere to contain the provided point.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} sphere A sphere to expand.
     * @param {Cartesian3} point A point to enclose in a bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @exception {DeveloperError} sphere is required.
     * @exception {DeveloperError} point is required.
     */
    BoundingSphere.expand = function(sphere, point, result) {
        if (typeof sphere === 'undefined') {
            throw new DeveloperError('sphere is required.');
        }

        if (typeof point === 'undefined') {
            throw new DeveloperError('point is required.');
        }

        result = BoundingSphere.clone(sphere, result);

        var radius = Cartesian3.subtract(point, result.center, expandScratch).magnitude();
        if (radius > result.radius) {
            result.radius = radius;
        }

        return result;
    };

    /**
     * Determines which side of a plane a sphere is located.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} sphere The bounding sphere to test.
     * @param {Cartesian4} plane The coefficients of the plane in the for ax + by + cz + d = 0
     *                           where the coefficients a, b, c, and d are the components x, y, z,
     *                           and w of the {Cartesian4}, respectively.
     * @return {Intersect} {Intersect.INSIDE} if the entire sphere is on the side of the plane the normal
     *                     is pointing, {Intersect.OUTSIDE} if the entire sphere is on the opposite side,
     *                     and {Intersect.INTERSETING} if the sphere intersects the plane.
     *
     * @exception {DeveloperError} sphere is required.
     * @exception {DeveloperError} plane is required.
     */
    BoundingSphere.intersect = function(sphere, plane) {
        if (typeof sphere === 'undefined') {
            throw new DeveloperError('sphere is required.');
        }

        if (typeof plane === 'undefined') {
            throw new DeveloperError('plane is required.');
        }

        var center = sphere.center;
        var radius = sphere.radius;
        var distanceToPlane = Cartesian3.dot(plane, center) + plane.w;

        if (distanceToPlane < -radius) {
            // The center point is negative side of the plane normal
            return Intersect.OUTSIDE;
        } else if (distanceToPlane < radius) {
            // The center point is positive side of the plane, but radius extends beyond it; partial overlap
            return Intersect.INTERSECTING;
        }
        return Intersect.INSIDE;
    };

    /**
     * Compares the provided BoundingSphere componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} [left] The first BoundingSphere.
     * @param {BoundingSphere} [right] The second BoundingSphere.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    BoundingSphere.equals = function(left, right) {
        return (left === right) ||
               ((typeof left !== 'undefined') &&
                (typeof right !== 'undefined') &&
                Cartesian3.equals(left.center, right.center) &&
                left.radius === right.radius);
    };

    /**
     * Duplicates this BoundingSphere instance.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.prototype.clone = function(result) {
        return BoundingSphere.clone(this, result);
    };

    /**
     * Computes a bounding sphere that contains both this bounding sphere and the argument sphere.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} right The sphere to enclose in this bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @exception {DeveloperError} sphere is required.
     */
    BoundingSphere.prototype.union = function(right, result) {
        return BoundingSphere.union(this, right, result);
    };

    /**
     * Computes a bounding sphere that is sphere expanded to contain point.
     * @memberof BoundingSphere
     *
     * @param {Cartesian3} point A point to enclose in a bounding sphere.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @exception {DeveloperError} point is required.
     */
    BoundingSphere.prototype.expand = function(point, result) {
        return BoundingSphere.expand(this, point, result);
    };

    /**
     * Determines which side of a plane the sphere is located.
     * @memberof BoundingSphere
     *
     * @param {Cartesian4} plane The coefficients of the plane in the for ax + by + cz + d = 0
     *                           where the coefficients a, b, c, and d are the components x, y, z,
     *                           and w of the {Cartesian4}, respectively.
     * @return {Intersect} {Intersect.INSIDE} if the entire sphere is on the side of the plane the normal
     *                     is pointing, {Intersect.OUTSIDE} if the entire sphere is on the opposite side,
     *                     and {Intersect.INTERSETING} if the sphere intersects the plane.
     *
     * @exception {DeveloperError} plane is required.
     */
    BoundingSphere.prototype.intersect = function(plane) {
        return BoundingSphere.intersect(this, plane);
    };

    /**
     * Compares this BoundingSphere against the provided BoundingSphere componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} [right] The right hand side BoundingSphere.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    BoundingSphere.prototype.equals = function(right) {
        return BoundingSphere.equals(this, right);
    };

    return BoundingSphere;
});
