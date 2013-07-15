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
     * A {@link Geometry} that represents vertices and indices for a circle on the ellipsoid.
     *
     * @alias CircleGeometry
     * @constructor
     *
     * @param {Cartesian3} options.center The circle's center point in the fixed frame.
     * @param {Number} options.radius The radius in meters.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid the circle will be on.
     * @param {Number} [options.height=0.0] The height above the ellipsoid.
     * @param {Number} [options.granularity=0.02] The angular distance between points on the circle in radians.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} center is required.
     * @exception {DeveloperError} radius is required.
     * @exception {DeveloperError} radius must be greater than zero.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @example
     * // Create a circle.
     * var ellipsoid = Ellipsoid.WGS84;
     * var circle = new CircleGeometry({
     *   ellipsoid : ellipsoid,
     *   center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883)),
     *   radius : 100000.0
     * });
     */
    var CircleGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var radius = options.radius;

        if (typeof radius === 'undefined') {
            throw new DeveloperError('radius is required.');
        }

        if (radius <= 0.0) {
            throw new DeveloperError('radius must be greater than zero.');
        }

        var ellipseGeometryOptions = {
            center : options.center,
            semiMajorAxis : radius,
            semiMinorAxis : radius,
            ellipsoid : options.ellipsoid,
            height : options.height,
            granularity : options.granularity,
            vertexFormat : options.vertexFormat
        };
        var ellipseGeometry = new EllipseGeometry(ellipseGeometryOptions);

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type GeometryAttributes
         *
         * @see Geometry#attributes
         */
        this.attributes = ellipseGeometry.attributes;

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = ellipseGeometry.indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = ellipseGeometry.primitiveType;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = ellipseGeometry.boundingSphere;
    };

    return CircleGeometry;
});