/*global define*/
define([
        './Cartesian3',
        './defaultValue',
        './defined',
        './DeveloperError',
        './EllipseGeometry',
        './Ellipsoid',
        './Math',
        './VertexFormat'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        DeveloperError,
        EllipseGeometry,
        Ellipsoid,
        CesiumMath,
        VertexFormat) {
    "use strict";

    /**
     * A description of a circle on the ellipsoid. Circle geometry can be rendered with both {@link Primitive} and {@link GroundPrimitive}.
     *
     * @alias CircleGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3} options.center The circle's center point in the fixed frame.
     * @param {Number} options.radius The radius in meters.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid the circle will be on.
     * @param {Number} [options.height=0.0] The height above the ellipsoid.
     * @param {Number} [options.granularity=0.02] The angular distance between points on the circle in radians.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.extrudedHeight=0.0] The height of the extrusion relative to the ellipsoid.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     *
     * @exception {DeveloperError} radius must be greater than zero.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @see CircleGeometry.createGeometry
     * @see Packable
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Circle.html|Cesium Sandcastle Circle Demo}
     *
     * @example
     * // Create a circle.
     * var circle = new Cesium.CircleGeometry({
     *   center : Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
     *   radius : 100000.0
     * });
     * var geometry = Cesium.CircleGeometry.createGeometry(circle);
     */
    var CircleGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var radius = options.radius;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(radius)) {
            throw new DeveloperError('radius is required.');
        }
        if (radius <= 0.0) {
            throw new DeveloperError('radius must be greater than zero.');
        }
        //>>includeEnd('debug');

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
        this._ellipseGeometry = new EllipseGeometry(ellipseGeometryOptions);
        this._workerName = 'createCircleGeometry';
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    CircleGeometry.packedLength = EllipseGeometry.packedLength;

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {CircleGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    CircleGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        //>>includeEnd('debug');
        EllipseGeometry.pack(value._ellipseGeometry, array, startingIndex);
    };

    var scratchEllipseGeometry = new EllipseGeometry({
        center : new Cartesian3(),
        semiMajorAxis : 1.0,
        semiMinorAxis : 1.0
    });
    var scratchOptions = {
        center : new Cartesian3(),
        radius : undefined,
        ellipsoid : Ellipsoid.clone(Ellipsoid.UNIT_SPHERE),
        height : undefined,
        extrudedHeight : undefined,
        granularity : undefined,
        vertexFormat : new VertexFormat(),
        stRotation : undefined,
        semiMajorAxis : undefined,
        semiMinorAxis : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {CircleGeometry} [result] The object into which to store the result.
     * @returns {CircleGeometry} The modified result parameter or a new CircleGeometry instance if one was not provided.
     */
    CircleGeometry.unpack = function(array, startingIndex, result) {
        var ellipseGeometry = EllipseGeometry.unpack(array, startingIndex, scratchEllipseGeometry);
        scratchOptions.center = Cartesian3.clone(ellipseGeometry._center, scratchOptions.center);
        scratchOptions.ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid, scratchOptions.ellipsoid);
        scratchOptions.height = ellipseGeometry._height;
        scratchOptions.extrudedHeight = ellipseGeometry._extrudedHeight;
        scratchOptions.granularity = ellipseGeometry._granularity;
        scratchOptions.vertexFormat = VertexFormat.clone(ellipseGeometry._vertexFormat, scratchOptions.vertexFormat);
        scratchOptions.stRotation = ellipseGeometry._stRotation;

        if (!defined(result)) {
            scratchOptions.radius = ellipseGeometry._semiMajorAxis;
            return new CircleGeometry(scratchOptions);
        }

        scratchOptions.semiMajorAxis = ellipseGeometry._semiMajorAxis;
        scratchOptions.semiMinorAxis = ellipseGeometry._semiMinorAxis;
        result._ellipseGeometry = new EllipseGeometry(scratchOptions);
        return result;
    };

    /**
     * Computes the geometric representation of a circle on an ellipsoid, including its vertices, indices, and a bounding sphere.
     *
     * @param {CircleGeometry} circleGeometry A description of the circle.
     * @returns {Geometry} The computed vertices and indices.
     */
    CircleGeometry.createGeometry = function(circleGeometry) {
        return EllipseGeometry.createGeometry(circleGeometry._ellipseGeometry);
    };

    /**
     * @private
     */
    CircleGeometry.createShadowVolume = function(circleGeometry, minHeightFunc, maxHeightFunc) {
        var granularity = circleGeometry._ellipseGeometry._granularity;
        var ellipsoid = circleGeometry._ellipseGeometry._ellipsoid;

        var minHeight = minHeightFunc(granularity, ellipsoid);
        var maxHeight = maxHeightFunc(granularity, ellipsoid);

        return new CircleGeometry({
            center : circleGeometry._ellipseGeometry._center,
            radius : circleGeometry._ellipseGeometry._semiMajorAxis,
            ellipsoid : ellipsoid,
            stRotation : circleGeometry._ellipseGeometry._stRotation,
            granularity : granularity,
            extrudedHeight : minHeight,
            height : maxHeight,
            vertexFormat : VertexFormat.POSITION_ONLY
        });
    };

    return CircleGeometry;
});