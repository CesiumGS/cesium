/*global define*/
define([
        './defaultValue',
        './Cartesian3',
        './Cartographic',
        './DeveloperError',
        './Ellipsoid',
        './Extent',
        './Intersect',
        './Math'
    ], function(
        defaultValue,
        Cartesian3,
        Cartographic,
        DeveloperError,
        Ellipsoid,
        Extent,
        Intersect,
        CesiumMath) {
    "use strict";

    /**
     * A bounding sphere with a center and a radius.
     *
     * @alias BoundingSphere
     * @constructor
     *
     * @param {Cartesian3} center The center of the bounding sphere.
     * @param {Number} radius The radius of the bounding sphere.
     *
     * @exception {DeveloperError} <code>center</code> is required.
     * @exception {DeveloperError} <code>radius</code> is required.
     *
     * @see AxisAlignedBoundingBox
     */
    var BoundingSphere = function(center, radius) {
        if (typeof center === 'undefined') {
            throw new DeveloperError('positions is required.');
        }

        if (typeof radius === 'undefined') {
            throw new DeveloperError('radius is required.');
        }

        /**
         * The center point of the sphere.
         *
         * @type {Cartesian3}
         */
        this.center = center.clone();
        /**
         * The radius of the sphere.
         *
         * @type {Number}
         */
        this.radius = radius;
    };

    /**
     * Creates a bounding sphere that contains both the left and right bounding spheres.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} left A sphere to enclose in bounding sphere.
     * @param {BoundingSphere} right A sphere to enclose in a bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     *
     * @return {BoundingSphere} A sphere that encloses both left and right bounding spheres.
     */
    BoundingSphere.expand = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required.');
        }

        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required.');
        }

        if (typeof result === 'undefined') {
            result = new BoundingSphere(Cartesian3.ZERO.clone(), 0.0);
        }

        var center = left.center.add(right.center).multiplyByScalar(0.5);
        var radius1 = left.center.subtract(center).magnitude() + left.radius;
        var radius2 = right.center.subtract(center).magnitude() + right.radius;
        var radius = Math.max(radius1, radius2);

        result.center.x = center.x;
        result.center.y = center.y;
        result.center.z = center.z;
        result.radius = radius;
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

        result.center = sphere.center.clone();
        result.radius = sphere.radius;
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
                (left.center.equals(right.center)) &&
                (left.radius === right.radius));
    };

    /**
     * Computes a tight-fitting bounding sphere enclosing a list of 3D Cartesian points.
     * The bounding sphere is computed by running two algorithms, a naive algorithm and Ritter's algorithm. The
     * smaller of the two spheres is used to ensure a tight fit.
     *
     * @param {Array} positions List of points that the bounding sphere will enclose.  Each point must have <code>x</code>, <code>y</code>, and <code>z</code> properties.
     *
     * @exception {DeveloperError} <code>positions</code> is required.
     *
     * @return {BoundingSphere} The bounding sphere computed from positions.
     *
     * @see <a href='http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/'>Bounding Sphere computation article</a>
     */
    BoundingSphere.fromPoints = function(positions) {
        if (typeof positions === 'undefined') {
            throw new DeveloperError('positions is required.');
        }

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
            return new BoundingSphere(ritterCenter, ritterRadius);
        }

        return new BoundingSphere(naiveCenter, naiveRadius);
    };

    /**
     * Computes a tight-fitting bounding sphere enclosing a list of flat 3D Cartesian points.
     * The bounding sphere is computed by running two algorithms, a naive algorithm and Ritter's algorithm. The
     * smaller of the two spheres is used to ensure a tight fit.
     *
     * @param {Array} positions List of points that the bounding sphere will enclose.
     *
     * @exception {DeveloperError} <code>positions</code> is required.
     *
     * @return {BoundingSphere} The bounding sphere computed from positions.
     *
     * @see <a href='http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/'>Bounding Sphere computation article</a>
     */
    BoundingSphere.fromFlatPoints = function(positions) {
        if (typeof positions === 'undefined') {
            throw new DeveloperError('positions is required.');
        }

        var x = positions[0];
        var y = positions[1];
        var z = positions[2];

        var xMin = new Cartesian3(x, y, z);
        var yMin = new Cartesian3(x, y, z);
        var zMin = new Cartesian3(x, y, z);

        var xMax = new Cartesian3(x, y, z);
        var yMax = new Cartesian3(x, y, z);
        var zMax = new Cartesian3(x, y, z);

        var currentPos;
        var numPositions = positions.length;
        for ( var i = 0; i < numPositions; i += 3) {
            currentPos = new Cartesian3(positions[i], positions[i + 1], positions[i + 2]);
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
        for (i = 0; i < numPositions; i += 3) {
            currentPos = new Cartesian3(positions[i], positions[i + 1], positions[i + 2]);

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
            return new BoundingSphere(ritterCenter, ritterRadius);
        }

        return new BoundingSphere(naiveCenter, naiveRadius);
    };

    /**
     * Creates a bounding sphere from an extent projected in 2D.
     *
     * @memberof BoundingSphere
     *
     * @param {Extent} extent The extent used to create a bounding sphere.
     * @param {Object} projection The projection used to project the extent into 2D.
     *
     * @exception {DeveloperError} extent is required.
     * @exception {DeveloperError} projection is required.
     *
     * @returns {BoundingSphere} The bounding sphere containing the extent.
     */
    BoundingSphere.fromExtent2D = function(extent, projection) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        if (typeof projection === 'undefined' || typeof projection.project === 'undefined') {
            throw new DeveloperError('projection is required.');
        }

        Extent.validate(extent);

        var lowerLeft = projection.project(extent.getSouthwest());
        var upperRight = projection.project(extent.getNortheast());

        var width = upperRight.x - lowerLeft.x;
        var height = upperRight.y - lowerLeft.y;

        var center = new Cartesian3(lowerLeft.x + width * 0.5, lowerLeft.y + height * 0.5, 0.0);
        var radius = Math.sqrt(width * width + height * height) * 0.5;
        return new BoundingSphere(center, radius);
    };

    function getExtentPosition(lla, ellipsoid, time, projection) {
        if (typeof time === 'undefined' || typeof projection === 'undefined') {
            return ellipsoid.cartographicToCartesian(lla);
        }

        var twod = projection.project(lla);
        twod = new Cartesian3(0.0, twod.x, twod.y);
        return twod.lerp(ellipsoid.cartographicToCartesian(lla), time);
    }

    BoundingSphere._computeExtentPositions = function(extent, ellipsoid, time, projection) {
        var positions = [];

        var lla = new Cartographic(extent.west, extent.north);
        positions.push(getExtentPosition(lla, ellipsoid, time, projection));
        lla.longitude = extent.east;
        positions.push(getExtentPosition(lla, ellipsoid, time, projection));
        lla.latitude = extent.south;
        positions.push(getExtentPosition(lla, ellipsoid, time, projection));
        lla.longitude = extent.west;
        positions.push(getExtentPosition(lla, ellipsoid, time, projection));

        if (extent.north < 0.0) {
            lla.latitude = extent.north;
        } else if (extent.south > 0.0) {
            lla.latitude = extent.south;
        } else {
            lla.latitude = 0.0;
        }

        for ( var i = 1; i < 8; ++i) {
            var temp = -Math.PI + i * CesiumMath.PI_OVER_TWO;
            if (extent.west < temp && temp < extent.east) {
                lla.longitude = temp;
                positions.push(getExtentPosition(lla, ellipsoid, time, projection));
            }
        }

        if (lla.latitude === 0.0) {
            lla.longitude = extent.west;
            positions.push(getExtentPosition(lla, ellipsoid, time, projection));
            lla.longitude = extent.east;
            positions.push(getExtentPosition(lla, ellipsoid, time, projection));
        }

        return positions;
    };

    /**
     * Creates a bounding sphere from an extent that is in the process of being morphed.
     *
     * @memberof BoundingSphere
     *
     * @param {Extent} extent The extent used to create a bounding sphere.
     * @param {Object} projection The projection used to project the extent into 2D.
     * @param {Number} time The morph time.
     *
     * @exception {DeveloperError} extent is required.
     * @exception {DeveloperError} projection is required.
     * @exception {DeveloperError} time is required.
     *
     * @returns {BoundingSphere} The bounding sphere containing the extent.
     */
    BoundingSphere.fromExtentMorph = function(extent, projection, time) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        if (typeof projection === 'undefined' || typeof projection.project === 'undefined') {
            throw new DeveloperError('projection is required.');
        }

        if (typeof time === 'undefined') {
            throw new DeveloperError('time is required.');
        }

        Extent.validate(extent);
        return BoundingSphere.fromPoints(BoundingSphere._computeExtentPositions(extent, projection.getEllipsoid(), time, projection));
    };

    /**
     * Creates a bounding sphere from an extent in 3D.
     *
     * @memberof BoundingSphere
     *
     * @param {Extent} extent The extent used to create a bounding sphere.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid used to determine positions of the extent.
     *
     * @exception {DeveloperError} extent is required.
     *
     * @returns {BoundingSphere} The bounding sphere containing the extent.
     */
    BoundingSphere.fromExtent3D = function(extent, ellipsoid) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        Extent.validate(extent);
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        return BoundingSphere.fromPoints(BoundingSphere._computeExtentPositions(extent, ellipsoid));
    };

    /**
     * Determines which side of a plane a sphere is located.
     *
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} sphere The bounding sphere to test.
     * @param {Cartesian4} plane The coefficients of the plane in the for ax + by + cz + d = 0 where the coefficients a, b, c, and d are the components x, y, z, and w of the {Cartesian4}, respectively.
     *
     * @return {Intersect} {Intersect.INSIDE} if the entire sphere is on the side of the plane the normal is pointing, {Intersect.OUTSIDE} if the entire sphere is on the opposite side, and {Intersect.INTERSETING} if the sphere intersects the plane.
     *
     * @exception {DeveloperError} sphere is required.
     * @exception {DeveloperError} plane is required.
     */
    BoundingSphere.planeIntersect = function(sphere, plane) {
        if (typeof sphere === 'undefined') {
            throw DeveloperError('sphere is required.');
        }

        if (typeof plane === 'undefined') {
            throw DeveloperError('plane is required.');
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
     * Creates a bounding sphere that contains both this bounding sphere and the argument sphere.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} sphere The sphere to enclose in this bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     *
     * @exception {DeveloperError} sphere is required.
     *
     * @return {BoundingSphere} A sphere that encloses both this sphere and the argument sphere.
     */
    BoundingSphere.prototype.expand = function(sphere, result) {
        if (typeof sphere === 'undefined') {
            throw new DeveloperError('sphere is required.');
        }

        return BoundingSphere.expand(this, sphere, result);
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
