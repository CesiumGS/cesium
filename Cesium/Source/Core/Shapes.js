/*global define*/
define([
        './DeveloperError',
        './Math',
        './Cartesian2',
        './Cartesian3',
        './Quaternion',
        './EllipsoidTangentPlane'
    ], function(
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Cartesian3,
        Quaternion,
        EllipsoidTangentPlane) {
    "use strict";

    /**
     * Functions to compute the boundary positions for shapes, such as circles,
     * drawn on the ellipsoid.
     *
     * @exports Shapes
     */
    var Shapes = {
        /**
         * Computes boundary points for a circle on the ellipsoid.
         * <br /><br />
         * The <code>radius</code> uses the distance along the plane tangent to the
         * ellipsoid at the circle's <code>center</code>; this is not the same as
         * arc-distance.  The <code>granularity</code> determines the number of points
         * in the boundary.  A lower granularity results in more points and a more
         * exact circle.
         * <br /><br />
         * An outlined circle is rendered by passing the result of this function call to
         * {@link Polyline#setPositions}.  A filled circle is rendered by passing
         * the result to {@link Polygon#setPositions}.
         *
         * @param {Ellipsoid} ellipsoid The ellipsoid the circle will be on.
         * @param {Cartesian3} center The circle's center point in the fixed frame.
         * @param {Number} radius The radius in meters.
         * @param {Number} [granularity] The angular distance between points on the circle.
         *
         * @exception {DeveloperError} ellipsoid, center, and radius are required.
         * @exception {DeveloperError} radius must be greater than zero.
         * @exception {DeveloperError} granularity must be greater than zero.
         *
         * @see Polyline#setPositions
         * @see Polygon#setPositions
         *
         * @example
         * // Create a polyline of a circle
         * var polyline = new Polyline();
         * polyline.setPositions(Shapes.computeCircleBoundary(
         *   ellipsoid, ellipsoid.cartographicDegreesToCartesian(
         *     new Cartographic2(-75.59777, 40.03883)), 100000.0));
         */
        computeCircleBoundary : function(ellipsoid, center, radius, granularity) {

            if (!ellipsoid || !center || !radius) {
                throw new DeveloperError("ellipsoid, center, and radius are required.");
            }

            if (radius <= 0.0) {
                throw new DeveloperError("radius must be greater than zero.", "radius");
            }

            granularity = granularity || CesiumMath.toRadians(1.0);
            if (granularity <= 0.0) {
                throw new DeveloperError("granularity must be greater than zero.", "granularity");
            }

            var steps = Math.floor(CesiumMath.TWO_PI / granularity);

            var positions = [];
            for ( var i = 0; i < steps; ++i) {
                var theta = (i / steps) * CesiumMath.TWO_PI;
                positions.push(new Cartesian2(radius * Math.cos(theta), radius * Math.sin(theta)));
            }
            positions.push(positions[0].clone()); // Duplicates first and last point for polyline

            var tangentPlane = new EllipsoidTangentPlane(ellipsoid, center);
            return tangentPlane.projectPointsOntoEllipsoid(positions);
        }
    };

    return Shapes;
});