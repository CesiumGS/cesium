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
     * @param {Number} [options.extrudedHeight=0.0] The height of the extrusion relative to the ellipsoid.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
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
            extrudedHeight : options.extrudedHeight,
            granularity : options.granularity,
            vertexFormat : options.vertexFormat,
            stRotation : options.stRotation
        };
        this.ellipseGeometry = new EllipseGeometry(ellipseGeometryOptions);
        this.workerName = 'createCircleGeometry';
    };

    CircleGeometry.createGeometry = function(circleGeometry) {
        return EllipseGeometry.createGeometry(circleGeometry.ellipseGeometry);
    };

    return CircleGeometry;
});