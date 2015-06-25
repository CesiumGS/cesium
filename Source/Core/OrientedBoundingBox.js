/*global define*/
define([
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './Intersect',
        './Plane',
        './Rectangle',
        './Math',
        './Matrix3'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        EllipsoidTangentPlane,
        Intersect,
        Plane,
        Rectangle,
        CesiumMath,
        Matrix3) {
    "use strict";

    /**
     * Creates an instance of an OrientedBoundingBox.
     * An OrientedBoundingBox of some object is a closed and convex cuboid. It can provide a tighter bounding volume than {@link BoundingSphere} or {@link AxisAlignedBoundingBox} in many cases.
     * @alias OrientedBoundingBox
     * @constructor
     *
     * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the box.
     * @param {Matrix3} [halfAxes=Matrix3.ZERO] The three orthogonal half-axes of the bounding box.
     *                                          Equivalently, the transformation matrix, to rotate and scale a 2x2x2
     *                                          cube centered at the origin.
     *
     * @see BoundingSphere
     * @see BoundingRectangle
     *
     * @example
     * // Create an OrientedBoundingBox using a transformation matrix, a position where the box will be translated, and a scale.
     * var center = new Cesium.Cartesian3(1.0, 0.0, 0.0);
     * var halfAxes = Cesium.Matrix3.fromScale(new Cartesian3(1.0, 3.0, 2.0), new Matrix3());
     *
     * var obb = new Cesium.OrientedBoundingBox(center, halfAxes);
     */
    var OrientedBoundingBox = function(center, halfAxes) {
        /**
         * The center of the box.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.center = Cartesian3.clone(defaultValue(center, Cartesian3.ZERO));
        /**
         * The transformation matrix, to rotate the box to the right position.
         * @type {Matrix3}
         * @default {@link Matrix3.IDENTITY}
         */
        this.halfAxes = Matrix3.clone(defaultValue(halfAxes, Matrix3.ZERO));
    };

    var scratchOffset = new Cartesian3();
    var scratchScale = new Cartesian3();
    /**
     * Computes an OrientedBoundingBox given extents in the east-north-up space of the tangent plane.
     *
     * @param {Number} minimumX Minimum X extent in tangent plane space.
     * @param {Number} maximumX Maximum X extent in tangent plane space.
     * @param {Number} minimumY Minimum Y extent in tangent plane space.
     * @param {Number} maximumY Maximum Y extent in tangent plane space.
     * @param {Number} minimumZ Minimum Z extent in tangent plane space.
     * @param {Number} maximumZ Maximum Z extent in tangent plane space.
     * @param {OrientedBoundingBox} [result] The object onto which to store the result.
     * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
     */
    var fromTangentPlaneExtents = function(tangentPlane, minimumX, maximumX, minimumY, maximumY, minimumZ, maximumZ, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(minimumX) ||
            !defined(maximumX) ||
            !defined(minimumY) ||
            !defined(maximumY) ||
            !defined(minimumZ) ||
            !defined(maximumZ)) {
            throw new DeveloperError('all extents (minimum/maximum X/Y/Z) are required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new OrientedBoundingBox();
        }

        var halfAxes = result.halfAxes;
        Matrix3.setColumn(halfAxes, 0, tangentPlane.xAxis, halfAxes);
        Matrix3.setColumn(halfAxes, 1, tangentPlane.yAxis, halfAxes);
        Matrix3.setColumn(halfAxes, 2, tangentPlane.zAxis, halfAxes);

        var centerOffset = scratchOffset;
        centerOffset.x = (minimumX + maximumX) / 2.0;
        centerOffset.y = (minimumY + maximumY) / 2.0;
        centerOffset.z = (minimumZ + maximumZ) / 2.0;

        var scale = scratchScale;
        scale.x = (maximumX - minimumX) / 2.0;
        scale.y = (maximumY - minimumY) / 2.0;
        scale.z = (maximumZ - minimumZ) / 2.0;

        var center = result.center;
        centerOffset = Matrix3.multiplyByVector(halfAxes, centerOffset, centerOffset);
        Cartesian3.add(tangentPlane.origin, centerOffset, center);
        Matrix3.multiplyByScale(halfAxes, scale, halfAxes);

        return result;
    };

    var scratchRectangleCenterCartographic = new Cartographic();
    var scratchRectangleCenter = new Cartesian3();
    var perimeterCartographicScratch = [new Cartographic(), new Cartographic(), new Cartographic(), new Cartographic(), new Cartographic(), new Cartographic(), new Cartographic(), new Cartographic()];
    var perimeterCartesianScratch = [new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3()];
    var perimeterProjectedScratch = [new Cartesian2(), new Cartesian2(), new Cartesian2(), new Cartesian2(), new Cartesian2(), new Cartesian2(), new Cartesian2(), new Cartesian2()];
    /**
     * Computes an OrientedBoundingBox that bounds a {@link Rectangle} on the surface of an {@link Ellipsoid}.
     * There are no guarantees about the orientation of the bounding box.
     *
     * @param {Rectangle} rectangle The cartographic rectangle on the surface of the ellipsoid.
     * @param {Number} [minimumHeight=0.0] The minimum height (elevation) within the tile.
     * @param {Number} [maximumHeight=0.0] The maximum height (elevation) within the tile.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the rectangle is defined.
     * @param {OrientedBoundingBox} [result] The object onto which to store the result.
     * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if none was provided.
     *
     * @exception {DeveloperError} rectangle.width must be between 0 and pi.
     * @exception {DeveloperError} rectangle.height must be between 0 and pi.
     * @exception {DeveloperError} ellipsoid must be an ellipsoid of revolution (<code>radii.x == radii.y</code>)
     */
    OrientedBoundingBox.fromRectangle = function(rectangle, minimumHeight, maximumHeight, ellipsoid, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        if (rectangle.width < 0.0 || rectangle.width > CesiumMath.PI) {
            throw new DeveloperError('Rectangle width must be between 0 and pi');
        }
        if (rectangle.height < 0.0 || rectangle.height > CesiumMath.PI) {
            throw new DeveloperError('Rectangle height must be between 0 and pi');
        }
        if (defined(ellipsoid) && !CesiumMath.equalsEpsilon(ellipsoid.radii.x, ellipsoid.radii.y, CesiumMath.EPSILON15)) {
            throw new DeveloperError('Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)');
        }
        //>>includeEnd('debug');

        minimumHeight = defaultValue(minimumHeight, 0.0);
        maximumHeight = defaultValue(maximumHeight, 0.0);
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        // The bounding box will be aligned with the tangent plane at the center of the rectangle.
        var tangentPointCartographic = Rectangle.center(rectangle, scratchRectangleCenterCartographic);
        var tangentPoint = ellipsoid.cartographicToCartesian(tangentPointCartographic, scratchRectangleCenter);
        var tangentPlane = new EllipsoidTangentPlane(tangentPoint, ellipsoid);
        var plane = tangentPlane.plane;

        // Corner arrangement:
        //          N/+y
        //      [0] [1] [2]
        // W/-x [7]     [3] E/+x
        //      [6] [5] [4]
        //          S/-y
        // "C" refers to the central lat/long, which by default aligns with the tangent point (above).
        // If the rectangle spans the equator, CW and CE are instead aligned with the equator.
        var perimeterNW = perimeterCartographicScratch[0];
        var perimeterNC = perimeterCartographicScratch[1];
        var perimeterNE = perimeterCartographicScratch[2];
        var perimeterCE = perimeterCartographicScratch[3];
        var perimeterSE = perimeterCartographicScratch[4];
        var perimeterSC = perimeterCartographicScratch[5];
        var perimeterSW = perimeterCartographicScratch[6];
        var perimeterCW = perimeterCartographicScratch[7];

        var lonCenter = tangentPointCartographic.longitude;
        var latCenter = (rectangle.south < 0.0 && rectangle.north > 0.0) ? 0.0 : tangentPointCartographic.latitude;
        perimeterSW.latitude = perimeterSC.latitude = perimeterSE.latitude = rectangle.south;
        perimeterCW.latitude = perimeterCE.latitude = latCenter;
        perimeterNW.latitude = perimeterNC.latitude = perimeterNE.latitude = rectangle.north;
        perimeterSW.longitude = perimeterCW.longitude = perimeterNW.longitude = rectangle.west;
        perimeterSC.longitude = perimeterNC.longitude = lonCenter;
        perimeterSE.longitude = perimeterCE.longitude = perimeterNE.longitude = rectangle.east;

        // Compute XY extents using the rectangle at maximum height
        perimeterNE.height = perimeterNC.height = perimeterNW.height = perimeterCW.height = perimeterSW.height = perimeterSC.height = perimeterSE.height = perimeterCE.height = maximumHeight;

        ellipsoid.cartographicArrayToCartesianArray(perimeterCartographicScratch, perimeterCartesianScratch);
        tangentPlane.projectPointsToNearestOnPlane(perimeterCartesianScratch, perimeterProjectedScratch);
        // See the `perimeterXX` definitions above for what these are
        var minX = Math.min(perimeterProjectedScratch[6].x, perimeterProjectedScratch[7].x, perimeterProjectedScratch[0].x);
        var maxX = Math.max(perimeterProjectedScratch[2].x, perimeterProjectedScratch[3].x, perimeterProjectedScratch[4].x);
        var minY = Math.min(perimeterProjectedScratch[4].y, perimeterProjectedScratch[5].y, perimeterProjectedScratch[6].y);
        var maxY = Math.max(perimeterProjectedScratch[0].y, perimeterProjectedScratch[1].y, perimeterProjectedScratch[2].y);

        // Compute minimum Z using the rectangle at minimum height
        perimeterNE.height = perimeterNW.height = perimeterSE.height = perimeterSW.height = minimumHeight;
        ellipsoid.cartographicArrayToCartesianArray(perimeterCartographicScratch, perimeterCartesianScratch);
        var minZ = Math.min(Plane.getPointDistance(plane, perimeterCartesianScratch[0]),
                            Plane.getPointDistance(plane, perimeterCartesianScratch[2]),
                            Plane.getPointDistance(plane, perimeterCartesianScratch[4]),
                            Plane.getPointDistance(plane, perimeterCartesianScratch[6]));
        var maxZ = maximumHeight;  // Since the tangent plane touches the surface at height = 0, this is okay

        return fromTangentPlaneExtents(tangentPlane, minX, maxX, minY, maxY, minZ, maxZ, result);
    };

    /**
     * Duplicates a OrientedBoundingBox instance.
     *
     * @param {OrientedBoundingBox} box The bounding box to duplicate.
     * @param {OrientedBoundingBox} [result] The object onto which to store the result.
     * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if none was provided. (Returns undefined if box is undefined)
     */
    OrientedBoundingBox.clone = function(box, result) {
        if (!defined(box)) {
            return undefined;
        }

        if (!defined(result)) {
            return new OrientedBoundingBox(box.center, box.halfAxes);
        }

        Cartesian3.clone(box.center, result.center);
        Matrix3.clone(box.halfAxes, result.halfAxes);

        return result;
    };

    /**
     * Determines which side of a plane the oriented bounding box is located.
     *
     * @param {OrientedBoundingBox} box The oriented bounding box to test.
     * @param {Plane} plane The plane to test against.
     * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
     *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
     *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
     *                      intersects the plane.
     */
    OrientedBoundingBox.intersectPlane = function(box, plane) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(box)) {
            throw new DeveloperError('box is required.');
        }

        if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }
        //>>includeEnd('debug');

        var center = box.center;
        var normal = plane.normal;
        var halfAxes = box.halfAxes;
        var normalX = normal.x, normalY = normal.y, normalZ = normal.z;
        // plane is used as if it is its normal; the first three components are assumed to be normalized
        var radEffective = Math.abs(normalX * halfAxes[Matrix3.COLUMN0ROW0] + normalY * halfAxes[Matrix3.COLUMN0ROW1] + normalZ * halfAxes[Matrix3.COLUMN0ROW2]) +
                           Math.abs(normalX * halfAxes[Matrix3.COLUMN1ROW0] + normalY * halfAxes[Matrix3.COLUMN1ROW1] + normalZ * halfAxes[Matrix3.COLUMN1ROW2]) +
                           Math.abs(normalX * halfAxes[Matrix3.COLUMN2ROW0] + normalY * halfAxes[Matrix3.COLUMN2ROW1] + normalZ * halfAxes[Matrix3.COLUMN2ROW2]);
        var distanceToPlane = Cartesian3.dot(normal, center) + plane.distance;

        if (distanceToPlane <= -radEffective) {
            // The entire box is on the negative side of the plane normal
            return Intersect.OUTSIDE;
        } else if (distanceToPlane >= radEffective) {
            // The entire box is on the positive side of the plane normal
            return Intersect.INSIDE;
        }
        return Intersect.INTERSECTING;
    };

    /**
     * Determines which side of a plane the oriented bounding box is located.
     *
     * @param {Plane} plane The plane to test against.
     * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
     *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
     *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
     *                      intersects the plane.
     */
    OrientedBoundingBox.prototype.intersectPlane = function(plane) {
        return OrientedBoundingBox.intersectPlane(this, plane);
    };

    /**
     * Compares the provided OrientedBoundingBox componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {OrientedBoundingBox} left The first OrientedBoundingBox.
     * @param {OrientedBoundingBox} right The second OrientedBoundingBox.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    OrientedBoundingBox.equals = function(left, right) {
        return (left === right) ||
                ((defined(left)) &&
                 (defined(right)) &&
                 Cartesian3.equals(left.center, right.center) &&
                 Matrix3.equals(left.halfAxes, right.halfAxes));
    };

    /**
     * Duplicates this OrientedBoundingBox instance.
     *
     * @param {OrientedBoundingBox} [result] The object onto which to store the result.
     * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
     */
    OrientedBoundingBox.prototype.clone = function(result) {
        return OrientedBoundingBox.clone(this, result);
    };

    /**
     * Compares this OrientedBoundingBox against the provided OrientedBoundingBox componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {OrientedBoundingBox} [right] The right hand side OrientedBoundingBox.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    OrientedBoundingBox.prototype.equals = function(right) {
        return OrientedBoundingBox.equals(this, right);
    };

    return OrientedBoundingBox;
});
