/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError',
        './EllipseOutlineGeometry'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        EllipseOutlineGeometry) {
    "use strict";

    /**
     * A description of the outline of a circle on the ellipsoid.
     *
     * @alias CircleOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3} options.center The circle's center point in the fixed frame.
     * @param {Number} options.radius The radius in meters.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid the circle will be on.
     * @param {Number} [options.height=0.0] The height above the ellipsoid.
     * @param {Number} [options.granularity=0.02] The angular distance between points on the circle in radians.
     * @param {Number} [options.extrudedHeight=0.0] The height of the extrusion relative to the ellipsoid.
     * @param {Number} [options.numberOfVerticalLines=16] Number of lines to draw between the top and bottom of an extruded circle.
     *
     * @exception {DeveloperError} radius must be greater than zero.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @see CircleOutlineGeometry.createGeometry
     * @see Packable
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Circle%20Outline.html|Cesium Sandcastle Circle Outline Demo}
     *
     * @example
     * // Create a circle.
     * var circle = new Cesium.CircleOutlineGeometry({
     *   center : Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
     *   radius : 100000.0
     * });
     * var geometry = Cesium.CircleOutlineGeometry.createGeometry(circle);
     */
    var CircleOutlineGeometry = function(options) {
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
            numberOfVerticalLines : options.numberOfVerticalLines
        };
        this._ellipseGeometry = new EllipseOutlineGeometry(ellipseGeometryOptions);
        this._workerName = 'createCircleOutlineGeometry';
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    CircleOutlineGeometry.packedLength = EllipseOutlineGeometry.packedLength;

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {Object} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    CircleOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        //>>includeEnd('debug');
        EllipseOutlineGeometry.pack(value._ellipseGeometry, array, startingIndex);
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {CircleOutlineGeometry} [result] The object into which to store the result.
     */
    CircleOutlineGeometry.unpack = function(array, startingIndex, result) {
        var ellipseGeometry = EllipseOutlineGeometry.unpack(array, startingIndex);

        if (!defined(result)) {
            return new CircleOutlineGeometry({
                center : ellipseGeometry._center,
                radius : ellipseGeometry._semiMajorAxis,
                ellipsoid : ellipseGeometry._ellipsoid,
                height : ellipseGeometry._height,
                extrudedHeight : ellipseGeometry._extrudedHeight,
                granularity : ellipseGeometry._granularity,
                numberOfVerticalLines : ellipseGeometry._numberOfVerticalLines
            });
        }

        result._ellipseGeometry = ellipseGeometry;
        return result;
    };

    /**
     * Computes the geometric representation of an outline of a circle on an ellipsoid, including its vertices, indices, and a bounding sphere.
     *
     * @param {CircleOutlineGeometry} circleGeometry A description of the circle.
     * @returns {Geometry} The computed vertices and indices.
     */
    CircleOutlineGeometry.createGeometry = function(circleGeometry) {
        return EllipseOutlineGeometry.createGeometry(circleGeometry._ellipseGeometry);
    };

    return CircleOutlineGeometry;
});