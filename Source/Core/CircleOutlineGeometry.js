/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './EllipseOutlineGeometry'
    ], function(
        defaultValue,
        DeveloperError,
        EllipseOutlineGeometry) {
    "use strict";

    /**
     * A {@link Geometry} that represents vertices and indices for the outline of a circle on the ellipsoid.
     *
     * @alias CircleOutlineGeometry
     * @constructor
     *
     * @param {Cartesian3} options.center The circle's center point in the fixed frame.
     * @param {Number} options.radius The radius in meters.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid the circle will be on.
     * @param {Number} [options.height=0.0] The height above the ellipsoid.
     * @param {Number} [options.granularity=0.02] The angular distance between points on the circle in radians.
     * @param {Number} [options.extrudedHeight=0.0] The height of the extrusion relative to the ellipsoid.
     * @param {Number} [options.numberOfVerticalLines = 16] Number of lines to draw between the top and bottom of an extruded circle.
     *
     * @exception {DeveloperError} center is required.
     * @exception {DeveloperError} radius is required.
     * @exception {DeveloperError} radius must be greater than zero.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @example
     * // Create a circle.
     * var ellipsoid = Ellipsoid.WGS84;
     * var circle = new CircleOutlineGeometry({
     *   ellipsoid : ellipsoid,
     *   center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883)),
     *   radius : 100000.0
     * });
     */
    var CircleOutlineGeometry = function(options) {
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
            extrudedHeight : options.extrudedHeight,
            granularity : options.granularity,
            numberOfVerticalLines : options.numberOfVerticalLines
        };
        var ellipseGeometry = new EllipseOutlineGeometry(ellipseGeometryOptions);

        /**
         * An object containing {@link GeometryAttribute} position property.
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
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.LINES}.
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

    return CircleOutlineGeometry;
});