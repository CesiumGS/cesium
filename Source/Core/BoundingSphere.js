/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './Cartographic',
        './Ellipsoid',
        './GeographicProjection',
        './Extent',
        './Intersect',
        './Interval',
        './Matrix4'
    ], function(
        defaultValue,
        DeveloperError,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        Ellipsoid,
        GeographicProjection,
        Extent,
        Intersect,
        Interval,
        Matrix4) {
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
    var fromPointsNaiveCenterScratch = new Cartesian3();

    /**
     * Computes a tight-fitting bounding sphere enclosing a list of 3D Cartesian points.
     * The bounding sphere is computed by running two algorithms, a naive algorithm and
     * Ritter's algorithm. The smaller of the two spheres is used to ensure a tight fit.
     * @memberof BoundingSphere
     *
     * @param {Array} positions An array of points that the bounding sphere will enclose.  Each point must have <code>x</code>, <code>y</code>, and <code>z</code> properties.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
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

        var naiveCenter = Cartesian3.multiplyByScalar(Cartesian3.add(minBoxPt, maxBoxPt, fromPointsScratch), 0.5, fromPointsNaiveCenterScratch);

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

    var defaultProjection = new GeographicProjection();
    var fromExtent2DLowerLeft = new Cartesian3();
    var fromExtent2DUpperRight = new Cartesian3();
    var fromExtent2DSouthwest = new Cartographic();
    var fromExtent2DNortheast = new Cartographic();

    /**
     * Computes a bounding sphere from an extent projected in 2D.
     *
     * @memberof BoundingSphere
     *
     * @param {Extent} extent The extent around which to create a bounding sphere.
     * @param {Object} [projection=GeographicProjection] The projection used to project the extent into 2D.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.fromExtent2D = function(extent, projection, result) {
        return BoundingSphere.fromExtentWithHeights2D(extent, projection, 0.0, 0.0, result);
    };

    /**
     * Computes a bounding sphere from an extent projected in 2D.  The bounding sphere accounts for the
     * object's minimum and maximum heights over the extent.
     *
     * @memberof BoundingSphere
     *
     * @param {Extent} extent The extent around which to create a bounding sphere.
     * @param {Object} [projection=GeographicProjection] The projection used to project the extent into 2D.
     * @param {Number} [minimumHeight=0.0] The minimum height over the extent.
     * @param {Number} [maximumHeight=0.0] The maximum height over the extent.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.fromExtentWithHeights2D = function(extent, projection, minimumHeight, maximumHeight, result) {
        if (typeof result === 'undefined') {
            result = new BoundingSphere();
        }

        if (typeof extent === 'undefined') {
            result.center = Cartesian3.ZERO.clone(result.center);
            result.radius = 0.0;
            return result;
        }

        projection = (typeof projection !== 'undefined') ? projection : defaultProjection;

        extent.getSouthwest(fromExtent2DSouthwest);
        fromExtent2DSouthwest.height = minimumHeight;
        extent.getNortheast(fromExtent2DNortheast);
        fromExtent2DNortheast.height = maximumHeight;

        var lowerLeft = projection.project(fromExtent2DSouthwest, fromExtent2DLowerLeft);
        var upperRight = projection.project(fromExtent2DNortheast, fromExtent2DUpperRight);

        var width = upperRight.x - lowerLeft.x;
        var height = upperRight.y - lowerLeft.y;
        var elevation = upperRight.z - lowerLeft.z;

        result.radius = Math.sqrt(width * width + height * height + elevation * elevation) * 0.5;
        var center = result.center;
        center.x = lowerLeft.x + width * 0.5;
        center.y = lowerLeft.y + height * 0.5;
        center.z = lowerLeft.z + elevation * 0.5;
        return result;
    };

    var fromExtent3DScratch = [];

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
        var positions = typeof extent !== 'undefined' ? extent.subsample(ellipsoid, fromExtent3DScratch) : undefined;
        return BoundingSphere.fromPoints(positions, result);
    };

    /**
     * Computes a tight-fitting bounding sphere enclosing a list of 3D points, where the points are
     * stored in a flat array in X, Y, Z, order.  The bounding sphere is computed by running two
     * algorithms, a naive algorithm and Ritter's algorithm. The smaller of the two spheres is used to
     * ensure a tight fit.
     *
     * @memberof BoundingSphere
     *
     * @param {Array} positions An array of points that the bounding sphere will enclose.  Each point
     *        is formed from three elements in the array in the order X, Y, Z.
     * @param {Cartesian3} [center=Cartesian3.ZERO] The position to which the positions are relative, which need not be the
     *        origin of the coordinate system.  This is useful when the positions are to be used for
     *        relative-to-center (RTC) rendering.
     * @param {Number} [stride=3] The number of array elements per vertex.  It must be at least 3, but it may
     *        be higher.  Regardless of the value of this parameter, the X coordinate of the first position
     *        is at array index 0, the Y coordinate is at array index 1, and the Z coordinate is at array index
     *        2.  When stride is 3, the X coordinate of the next position then begins at array index 3.  If
     *        the stride is 5, however, two array elements are skipped and the next position begins at array
     *        index 5.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
     *
     * @see <a href='http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/'>Bounding Sphere computation article</a>
     *
     * @example
     * // Compute the bounding sphere from 3 positions, each specified relative to a center.
     * // In addition to the X, Y, and Z coordinates, the points array contains two additional
     * // elements per point which are ignored for the purpose of computing the bounding sphere.
     * var center = new Cartesian3(1.0, 2.0, 3.0);
     * var points = [1.0, 2.0, 3.0, 0.1, 0.2,
     *               4.0, 5.0, 6.0, 0.1, 0.2,
     *               7.0, 8.0, 9.0, 0.1, 0.2];
     * var sphere = BoundingSphere.fromVertices(points, center, 5);
     */
    BoundingSphere.fromVertices = function(positions, center, stride, result) {
        if (typeof result === 'undefined') {
            result = new BoundingSphere();
        }

        if (typeof positions === 'undefined' || positions.length === 0) {
            result.center = Cartesian3.ZERO.clone(result.center);
            result.radius = 0.0;
            return result;
        }

        if (typeof center === 'undefined') {
            center = Cartesian3.ZERO;
        }

        if (typeof stride === 'undefined') {
            stride = 3;
        }

        if (stride < 3) {
            throw new DeveloperError('stride must be 3 or greater.');
        }

        var currentPos = fromPointsCurrentPos;
        currentPos.x = positions[0] + center.x;
        currentPos.y = positions[1] + center.y;
        currentPos.z = positions[2] + center.z;

        var xMin = Cartesian3.clone(currentPos, fromPointsXMin);
        var yMin = Cartesian3.clone(currentPos, fromPointsYMin);
        var zMin = Cartesian3.clone(currentPos, fromPointsZMin);

        var xMax = Cartesian3.clone(currentPos, fromPointsXMax);
        var yMax = Cartesian3.clone(currentPos, fromPointsYMax);
        var zMax = Cartesian3.clone(currentPos, fromPointsZMax);

        var numElements = positions.length;
        for (var i = 0; i < numElements; i += stride) {
            var x = positions[i] + center.x;
            var y = positions[i + 1] + center.y;
            var z = positions[i + 2] + center.z;

            currentPos.x = x;
            currentPos.y = y;
            currentPos.z = z;

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

        var naiveCenter = Cartesian3.multiplyByScalar(Cartesian3.add(minBoxPt, maxBoxPt, fromPointsScratch), 0.5, fromPointsNaiveCenterScratch);

        // Begin 2nd pass to find naive radius and modify the ritter sphere.
        var naiveRadius = 0;
        for (i = 0; i < numElements; i += stride) {
            currentPos.x = positions[i] + center.x;
            currentPos.y = positions[i + 1] + center.y;
            currentPos.z = positions[i + 2] + center.z;

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

    /**
     * Computes a bounding sphere from the corner points of an axis-aligned bounding box.  The sphere
     * tighly and fully encompases the box.
     *
     * @memberof BoundingSphere
     *
     * @param {Number} [corner] The minimum height over the extent.
     * @param {Number} [oppositeCorner] The maximum height over the extent.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     *
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @exception {DeveloperError} corner and oppositeCorner are required.
     *
     * @example
     * // Create a bounding sphere around the unit cube
     * var sphere = BoundingSphere.fromCornerPoints(new Cartesian3(-0.5, -0.5, -0.5), new Cartesian3(0.5, 0.5, 0.5));
     */
    BoundingSphere.fromCornerPoints = function(corner, oppositeCorner, result) {
        if ((typeof corner === 'undefined') || (typeof oppositeCorner === 'undefined')) {
            throw new DeveloperError('corner and oppositeCorner are required.');
        }

        if (typeof result === 'undefined') {
            result = new BoundingSphere();
        }

        var center = result.center;
        Cartesian3.add(corner, oppositeCorner, center);
        Cartesian3.multiplyByScalar(center, 0.5, center);
        result.radius = Cartesian3.distance(center, oppositeCorner);
        return result;
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
    var unionScratchCenter = new Cartesian3();
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

        Cartesian3.add(leftCenter, rightCenter, unionScratchCenter);
        var center = Cartesian3.multiplyByScalar(unionScratchCenter, 0.5, unionScratchCenter);

        var radius1 = Cartesian3.subtract(leftCenter, center, unionScratch).magnitude() + left.radius;
        var radius2 = Cartesian3.subtract(rightCenter, center, unionScratch).magnitude() + right.radius;

        result.radius = Math.max(radius1, radius2);
        Cartesian3.clone(center, result.center);

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

    var transformCart4 = Cartesian4.UNIT_W.clone();
    /**
     * Applies a 4x4 affine transformation matrix to a bounding sphere.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} sphere The bounding sphere to apply the transformation to.
     * @param {Matrix4} transform The transformation matrix to apply to the bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @exception {DeveloperError} sphere is required.
     * @exception {DeveloperError} transform is required.
     */
    BoundingSphere.transform = function(sphere, transform, result) {
        if (typeof sphere === 'undefined') {
            throw new DeveloperError('sphere is required.');
        }

        if (typeof transform === 'undefined') {
            throw new DeveloperError('transform is required.');
        }

        if (typeof result === 'undefined') {
            result = new BoundingSphere();
        }

        Matrix4.multiplyByPoint(transform, sphere.center, transformCart4);

        Cartesian3.clone(transformCart4, result.center);
        result.radius = sphere.radius;
        return result;
    };

    var scratchCartesian3 = new Cartesian3();
    /**
     * The distances calculated by the vector from the center of the bounding sphere to position projected onto direction
     * plus/minus the radius of the bounding sphere.
     * <br>
     * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
     * closest and farthest planes from position that intersect the bounding sphere.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} sphere The bounding sphere to calculate the distance to.
     * @param {Cartesian3} position The position to calculate the distance from.
     * @param {Cartesian3} direction The direction from position.
     * @param {Cartesian2} [result] A Cartesian2 to store the nearest and farthest distances.
     * @return {Interval} The nearest and farthest distances on the bounding sphere from position in direction.
     *
     * @exception {DeveloperError} sphere is required.
     * @exception {DeveloperError} position is required.
     * @exception {DeveloperError} direction is required.
     */
    BoundingSphere.getPlaneDistances = function(sphere, position, direction, result) {
        if (typeof sphere === 'undefined') {
            throw new DeveloperError('sphere is required.');
        }

        if (typeof position === 'undefined') {
            throw new DeveloperError('position is required.');
        }

        if (typeof direction === 'undefined') {
            throw new DeveloperError('direction is required.');
        }

        if (typeof result === 'undefined') {
            result = new Interval();
        }

        var toCenter = Cartesian3.subtract(sphere.center, position, scratchCartesian3);
        var proj = Cartesian3.multiplyByScalar(direction, direction.dot(toCenter), scratchCartesian3);
        var mag = proj.magnitude();

        result.start = mag - sphere.radius;
        result.stop = mag + sphere.radius;
        return result;
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
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
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
     * Applies a 4x4 affine transformation matrix to this bounding sphere.
     * @memberof BoundingSphere
     *
     * @param {Matrix4} transform The transformation matrix to apply to the bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @exception {DeveloperError} transform is required.
     */
    BoundingSphere.prototype.transform = function(transform, result) {
        return BoundingSphere.transform(this, transform, result);
    };

    /**
     * The distances calculated by the vector from the center of the bounding sphere to position projected onto direction
     * plus/minus the radius of the bounding sphere.
     * <br>
     * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
     * closest and farthest planes from position that intersect the bounding sphere.
     * @memberof BoundingSphere
     *
     * @param {Cartesian3} position The position to calculate the distance from.
     * @param {Cartesian3} direction The direction from position.
     * @param {Cartesian2} [result] A Cartesian2 to store the nearest and farthest distances.
     * @return {Interval} The nearest and farthest distances on the bounding sphere from position in direction.
     *
     * @exception {DeveloperError} position is required.
     * @exception {DeveloperError} direction is required.
     */
    BoundingSphere.prototype.getPlaneDistances = function(position, direction, result) {
        return BoundingSphere.getPlaneDistances(this, position, direction, result);
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
