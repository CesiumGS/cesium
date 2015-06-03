/*global define*/
define([
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
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
        Intersect,
        Plane,
        Rectangle,
        CesiumMath,
        Matrix3) {
    "use strict";

    /**
     * Creates an instance of an OrientedBoundingBox.
     * An OrientedBoundingBox model of an object or set of objects, is a closed volume (a cuboid), which completely contains the object or the set of objects.
     * It is oriented, so it can provide an optimum fit, it can bound more tightly.
     * @alias OrientedBoundingBox
     * @constructor
     *
     * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the box.
     * @param {Matrix3} [halfAxes=Matrix3.ZERO] The three orthogonal half-axes of the bounding box.
     *                                          Equivalently, the transformation matrix, to rotate and scale a 2x2x2
     *                                          cube centered at the origin.
     *
     * @see OrientedBoundingBox.fromBoundingRectangle
     * @see BoundingSphere
     * @see BoundingRectangle
     * @see ObjectOrientedBoundingBox
     *
     * @example
     * // Create an OrientedBoundingBox using a transformation matrix, a position where the box will be translated, and a scale.
     * var center = new Cesium.Cartesian3(1,0,0);
     * var halfAxes = Cesium.Matrix3.clone(Cesium.Matrix3.fromScale(new Cartesian3(1.0, 3.0, 2.0)));
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

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();

    var scratchRotation = new Matrix3();
    /**
     * Computes an OrientedBoundingBox from a BoundingRectangle.
     * The BoundingRectangle is placed on the XY plane.
     *
     * @param {BoundingRectangle} boundingRectangle A bounding rectangle.
     * @param {Number} [rotation=0.0] The rotation of the bounding box in radians.
     * @param {OrientedBoundingBox} [result] The object onto which to store the result.
     * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
     *
     * @example
     * // Compute an object oriented bounding box enclosing two points.
     * var box = Cesium.OrientedBoundingBox.fromBoundingRectangle(boundingRectangle, 0.0);
     */
    OrientedBoundingBox.fromBoundingRectangle = function(boundingRectangle, rotation, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(boundingRectangle)) {
            throw new DeveloperError('boundingRectangle is required');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new OrientedBoundingBox();
        }

        var rotMat;
        if (defined(rotation)) {
            rotMat = Matrix3.fromRotationZ(rotation, scratchRotation);
        } else {
            rotMat = Matrix3.clone(Matrix3.IDENTITY, scratchRotation);
        }

        var scale = scratchCartesian1;
        scale.x = boundingRectangle.width * 0.5;
        scale.y = boundingRectangle.height * 0.5;
        scale.z = 0.0;
        Matrix3.multiplyByScale(rotMat, scale, result.halfAxes);

        var translation = Matrix3.multiplyByVector(rotMat, scale, result.center);
        translation.x += boundingRectangle.x;
        translation.y += boundingRectangle.y;

        return result;
    };

    var cornersCartographicScratch = [new Cartographic(), new Cartographic(), new Cartographic(), new Cartographic(), new Cartographic(), new Cartographic()];
    var cornersCartesianScratch = [new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3()];
    var cornersProjectedScratch = [new Cartesian2(), new Cartesian2(), new Cartesian2(), new Cartesian2(), new Cartesian2(), new Cartesian2()];
    /**
     * Computes an OrientedBoundingBox from a surface {@link Rectangle} aligned with a specified {@link EllipsoidTangentPlane}.
     *
     * @param {Rectangle} rectangle The valid rectangle used to create a bounding box.
     * @param {EllipsoidTangentPlane} tangentPlane A tangent plane with which the bounding box will be aligned.
     * @param {Number} [minHeight=0.0] The minimum height (elevation) within the tile.
     * @param {Number} [maxHeight=0.0] The maximum height (elevation) within the tile.
     * @param {OrientedBoundingBox} [result] The object onto which to store the result.
     * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if none was provided.
     */
    OrientedBoundingBox.fromRectangleTangentPlane = function(rectangle, tangentPlane, minHeight, maxHeight, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        if (!defined(tangentPlane)) {
            throw new DeveloperError('tangentPlane is required');
        }
        (function() {
            var rw = rectangle.width;
            var rh = rectangle.height;
            if (rw < 0.0 || rw > CesiumMath.PI) {
                throw new DeveloperError('Rectangle width must be between 0 and pi')
            }
            if (rh < 0.0 || rh > CesiumMath.PI) {
                throw new DeveloperError('Rectangle height must be between 0 and pi')
            }
        })();
        //>>includeEnd('debug');

        minHeight = defaultValue(minHeight, 0.0);
        maxHeight = defaultValue(maxHeight, 0.0);

        var plane = tangentPlane.plane;

        // Rectangle at maximum height
        var cornerNE = cornersCartographicScratch[0];
        var cornerNW = cornersCartographicScratch[1];
        var cornerSE = cornersCartographicScratch[2];
        var cornerSW = cornersCartographicScratch[3];
        var cornerNC = cornersCartographicScratch[4];
        var cornerSC = cornersCartographicScratch[5];

        var lonWest = rectangle.west;
        var lonEast = rectangle.east;
        var lonCenter = lonWest + 0.5 * rectangle.width;
        cornerSW.latitude = cornerSC.latitude = cornerSE.latitude = rectangle.south;
        cornerNW.latitude = cornerNC.latitude = cornerNE.latitude = rectangle.north;
        cornerSW.longitude = cornerNW.longitude = lonWest;
        cornerSC.longitude = cornerNC.longitude = lonCenter;
        cornerSE.longitude = cornerNE.longitude = lonEast;

        cornerNE.height = cornerNW.height = cornerSE.height = cornerSW.height = cornerNC.height = cornerSC.height = maxHeight;

        tangentPlane.ellipsoid.cartographicArrayToCartesianArray(cornersCartographicScratch, cornersCartesianScratch);
        tangentPlane.projectPointsToNearestOnPlane(cornersCartesianScratch, cornersProjectedScratch);
        var minX = Math.min(cornersProjectedScratch[1].x, cornersProjectedScratch[3].x);
        var maxX = Math.max(cornersProjectedScratch[0].x, cornersProjectedScratch[2].x);
        var minY = Math.min(cornersProjectedScratch[2].y, cornersProjectedScratch[3].y, cornersProjectedScratch[5].y);
        var maxY = Math.max(cornersProjectedScratch[0].y, cornersProjectedScratch[1].y, cornersProjectedScratch[4].y);

        cornerNE.height = cornerNW.height = cornerSE.height = cornerSW.height = minHeight;
        tangentPlane.ellipsoid.cartographicArrayToCartesianArray(cornersCartographicScratch, cornersCartesianScratch);
        var minZ = Math.min(Plane.getPointDistance(plane, cornersCartesianScratch[0]),
                            Plane.getPointDistance(plane, cornersCartesianScratch[1]),
                            Plane.getPointDistance(plane, cornersCartesianScratch[2]),
                            Plane.getPointDistance(plane, cornersCartesianScratch[3]));
        var maxZ = maxHeight;  // Since the tangent plane touches the surface at height = 0, this is okay

        return tangentPlane.extentsToOrientedBoundingBox(minX, maxX, minY, maxY, minZ, maxZ, result);
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
        // plane is used as if it is its normal; the first three components are assumed to be normalized
        var radEffective = Math.abs(Cartesian3.dot(normal, Matrix3.getColumn(box.halfAxes, 0, scratchCartesian1))) +
                           Math.abs(Cartesian3.dot(normal, Matrix3.getColumn(box.halfAxes, 1, scratchCartesian2))) +
                           Math.abs(Cartesian3.dot(normal, Matrix3.getColumn(box.halfAxes, 2, scratchCartesian3)));
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
