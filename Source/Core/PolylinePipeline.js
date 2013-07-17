/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Cartographic',
        './Cartesian3',
        './Cartesian4',
        './EllipsoidGeodesic',
        './IntersectionTests',
        './Matrix4',
        './Plane'
    ], function(
        defaultValue,
        DeveloperError,
        Cartographic,
        Cartesian3,
        Cartesian4,
        EllipoidGeodesic,
        IntersectionTests,
        Matrix4,
        Plane) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports PolylinePipeline
     */
    var PolylinePipeline = {};

    var wrapLongitudeInversMatrix = new Matrix4();
    var wrapLongitudeOrigin = new Cartesian4();
    var wrapLongitudeXZNormal = new Cartesian4();
    var wrapLongitudeXZPlane = new Plane(Cartesian3.ZERO, 0.0);
    var wrapLongitudeYZNormal = new Cartesian4();
    var wrapLongitudeYZPlane = new Plane(Cartesian3.ZERO, 0.0);
    var wrapLongitudeIntersection = new Cartesian3();
    var wrapLongitudeOffset = new Cartesian3();

    var carto1 = new Cartographic();
    var carto2 = new Cartographic();
    function generateCartesianArc(p1, p2, granularity, ellipsoid) {
        var separationAngle = Cartesian3.angleBetween(p1, p2);
        var numPoints = Math.ceil(separationAngle/granularity) + 1;

        var result = new Array(numPoints);

        var start = ellipsoid.cartesianToCartographic(p1, carto1);
        var end = ellipsoid.cartesianToCartographic(p2, carto2);

        var arc = new EllipoidGeodesic(start, end, ellipsoid);

        var surfaceDistanceBetweenPoints = arc.surfaceDistance() / (numPoints - 1);

        for (var i = 1; i < numPoints - 1; i++) {
            var cart = arc.interpolateUsingSurfaceDistance(i * surfaceDistanceBetweenPoints);
            result[i] = ellipsoid.CartographicToCartesian(cart);
        }
        start.height = 0;
        end.height = 0;
        result[0] = ellipsoid.cartographicToCartesian(start);
        result[numPoints - 1] = ellipsoid.cartographicToCartesian(end);

        return result;
    }

    /**
     * Breaks a {@link Polyline} into segments such that it does not cross the &plusmn;180 degree meridian of an ellipsoid.
     * @memberof PolylinePipeline
     *
     * @param {Array} positions The polyline's Cartesian positions.
     * @param {Matrix4} [modelMatrix=Matrix4.IDENTITY] The polyline's model matrix. Assumed to be an affine
     * transformation matrix, where the upper left 3x3 elements are a rotation matrix, and
     * the upper three elements in the fourth column are the translation.  The bottom row is assumed to be [0, 0, 0, 1].
     * The matrix is not verified to be in the proper form.
     *
     * @returns {Object} An object with a <code>positions</code> property that is an array of positions and a
     * <code>segments</code> property.
     *
     * @see PolygonPipeline.wrapLongitude
     * @see Polyline
     * @see PolylineCollection
     *
     * @example
     * var polylines = new PolylineCollection();
     * var polyline = polylines.add(...);
     * var positions = polyline.getPositions();
     * var modelMatrix = polylines.modelMatrix;
     * var segments = PolylinePipeline.wrapLongitude(positions, modelMatrix);
     */
    PolylinePipeline.wrapLongitude = function(positions, modelMatrix) {
        var cartesians = [];
        var segments = [];

        if (typeof positions !== 'undefined' && positions.length > 0) {
            modelMatrix = defaultValue(modelMatrix, Matrix4.IDENTITY);
            var inverseModelMatrix = Matrix4.inverseTransformation(modelMatrix, wrapLongitudeInversMatrix);

            var origin = Matrix4.multiplyByPoint(inverseModelMatrix, Cartesian3.ZERO, wrapLongitudeOrigin);
            var xzNormal = Matrix4.multiplyByVector(inverseModelMatrix, Cartesian4.UNIT_Y, wrapLongitudeXZNormal);
            var xzPlane = Plane.fromPointNormal(origin, xzNormal, wrapLongitudeXZPlane);
            var yzNormal = Matrix4.multiplyByVector(inverseModelMatrix, Cartesian4.UNIT_X, wrapLongitudeYZNormal);
            var yzPlane = Plane.fromPointNormal(origin, yzNormal, wrapLongitudeYZPlane);

            var count = 1;
            cartesians.push(Cartesian3.clone(positions[0]));
            var prev = cartesians[0];

            var length = positions.length;
            for ( var i = 1; i < length; ++i) {
                var cur = positions[i];

                // intersects the IDL if either endpoint is on the negative side of the yz-plane
                if (Plane.getPointDistance(yzPlane, prev) < 0.0 || Plane.getPointDistance(yzPlane, cur) < 0.0) {
                    // and intersects the xz-plane
                    var intersection = IntersectionTests.lineSegmentPlane(prev, cur, xzPlane, wrapLongitudeIntersection);
                    if (typeof intersection !== 'undefined') {
                        // move point on the xz-plane slightly away from the plane
                        var offset = Cartesian3.multiplyByScalar(xzNormal, 5.0e-9, wrapLongitudeOffset);
                        if (Plane.getPointDistance(xzPlane, prev) < 0.0) {
                            Cartesian3.negate(offset, offset);
                        }

                        cartesians.push(Cartesian3.add(intersection, offset));
                        segments.push(count + 1);

                        Cartesian3.negate(offset, offset);
                        cartesians.push(Cartesian3.add(intersection, offset));
                        count = 1;
                    }
                }

                cartesians.push(Cartesian3.clone(positions[i]));
                count++;

                prev = cur;
            }

            segments.push(count);
        }

        return {
            positions : cartesians,
            lengths : segments
        };
    };

    /**
     * Removes adjacent duplicate positions in an array of positions.
     *
     * @memberof PolylinePipeline
     *
     * @param {Array} positions The array of positions.  Each element is usually a {@see Cartesian3}, but all that is required is that the object have an <code>equals</code> function.
     *
     * @returns {Array} A new array of positions with no adjacent duplicate positions.  Positions are shallow copied.
     *
     * @exception {DeveloperError} positions is required.
     *
     * @example
     * // Returns [(1.0, 1.0, 1.0), (2.0, 2.0, 2.0)]
     * var positions = [
     *     new Cartesian3(1.0, 1.0, 1.0),
     *     new Cartesian3(1.0, 1.0, 1.0),
     *     new Cartesian3(2.0, 2.0, 2.0)];
     * var nonDuplicatePositions = PolylinePipeline.removeDuplicates(positions);
     */
    PolylinePipeline.removeDuplicates = function(positions) {
        if (typeof positions  === 'undefined') {
            throw new DeveloperError('positions is required.');
        }

        var length = positions.length;
        if (length < 2) {
            return positions.slice(0);
        }

        var cleanedPositions = [];
        cleanedPositions.push(positions[0]);

        for (var i = 1; i < length; ++i) {
            var v0 = positions[i - 1];
            var v1 = positions[i];

            if (!v0.equals(v1)) {
                cleanedPositions.push(v1); // Shallow copy!
            }
        }

        return cleanedPositions;
    };

    PolylinePipeline.scaleToSurface = function(positions, granularity) {

    };

    return PolylinePipeline;
});
