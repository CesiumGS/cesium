/*global define*/
define([
        './clone',
        './defaultValue',
        './DeveloperError',
        './EllipseGeometry'
    ], function(
        clone,
        defaultValue,
        DeveloperError,
        EllipseGeometry) {
    "use strict";

    /**
     * Computes boundary points for a circle on the ellipsoid.
     * <br /><br />
     * The <code>granularity</code> determines the number of points
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
     *   ellipsoid, ellipsoid.cartographicToCartesian(
     *     Cartographic.fromDegrees(-75.59777, 40.03883, 0.0)), 100000.0));
     */
    var CircleGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var radius = defaultValue(options.radius, 1.0);
        if (radius <= 0.0) {
            throw new DeveloperError('radius must be greater than zero.');
        }

        var ellipseGeometryOptions = clone(options);
        ellipseGeometryOptions.semiMajorAxis = radius;
        ellipseGeometryOptions.semiMinorAxis = radius;
        var ellipseGeometry = new EllipseGeometry(ellipseGeometryOptions);

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         */
        this.attributes = ellipseGeometry.attributes;

        /**
         * An array of {@link GeometryIndices} defining primitives.
         *
         * @type Array
         */
        this.indexLists = ellipseGeometry.indexLists;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = ellipseGeometry.boundingSphere;

        /**
         * The 4x4 transformation matrix that transforms the geometry from model to world coordinates.
         * When this is the identity matrix, the geometry is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type Matrix4
         *
         * @see Transforms.eastNorthUpToFixedFrame
         */
        //this.modelMatrix = ellipseGeometry.modelMatrix;

        /**
         * DOC_TBA
         */
        this.pickData = ellipseGeometry.pickData;
    };

    return CircleGeometry;
});