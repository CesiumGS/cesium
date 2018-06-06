define([
        './Cartesian3',
        './Check',
        './defaultValue',
        './defined',
        './EllipsoidGeometry',
        './VertexFormat'
    ], function(
        Cartesian3,
        Check,
        defaultValue,
        defined,
        EllipsoidGeometry,
        VertexFormat) {
    'use strict';

    /**
     * A description of a sphere centered at the origin.
     *
     * @alias SphereGeometry
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Number} [options.radius=1.0] The radius of the sphere.
     * @param {Number} [options.stackPartitions=64] The number of times to partition the ellipsoid into stacks.
     * @param {Number} [options.slicePartitions=64] The number of times to partition the ellipsoid into radial slices.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} options.slicePartitions cannot be less than three.
     * @exception {DeveloperError} options.stackPartitions cannot be less than three.
     *
     * @see SphereGeometry#createGeometry
     *
     * @example
     * var sphere = new Cesium.SphereGeometry({
     *   radius : 100.0,
     *   vertexFormat : Cesium.VertexFormat.POSITION_ONLY
     * });
     * var geometry = Cesium.SphereGeometry.createGeometry(sphere);
     */
    function SphereGeometry(options) {
        var radius = defaultValue(options.radius, 1.0);
        var radii = new Cartesian3(radius, radius, radius);
        var ellipsoidOptions = {
                radii: radii,
                stackPartitions: options.stackPartitions,
                slicePartitions: options.slicePartitions,
                vertexFormat: options.vertexFormat
        };

        this._ellipsoidGeometry = new EllipsoidGeometry(ellipsoidOptions);
        this._workerName = 'createSphereGeometry';
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    SphereGeometry.packedLength = EllipsoidGeometry.packedLength;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {SphereGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    SphereGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        //>>includeEnd('debug');

        return EllipsoidGeometry.pack(value._ellipsoidGeometry, array, startingIndex);
    };

    var scratchEllipsoidGeometry = new EllipsoidGeometry();
    var scratchOptions = {
        radius : undefined,
        radii : new Cartesian3(),
        vertexFormat : new VertexFormat(),
        stackPartitions : undefined,
        slicePartitions : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {SphereGeometry} [result] The object into which to store the result.
     * @returns {SphereGeometry} The modified result parameter or a new SphereGeometry instance if one was not provided.
     */
    SphereGeometry.unpack = function(array, startingIndex, result) {
        var ellipsoidGeometry = EllipsoidGeometry.unpack(array, startingIndex, scratchEllipsoidGeometry);
        scratchOptions.vertexFormat = VertexFormat.clone(ellipsoidGeometry._vertexFormat, scratchOptions.vertexFormat);
        scratchOptions.stackPartitions = ellipsoidGeometry._stackPartitions;
        scratchOptions.slicePartitions = ellipsoidGeometry._slicePartitions;

        if (!defined(result)) {
            scratchOptions.radius = ellipsoidGeometry._radii.x;
            return new SphereGeometry(scratchOptions);
        }

        Cartesian3.clone(ellipsoidGeometry._radii, scratchOptions.radii);
        result._ellipsoidGeometry = new EllipsoidGeometry(scratchOptions);
        return result;
    };

    /**
     * Computes the geometric representation of a sphere, including its vertices, indices, and a bounding sphere.
     *
     * @param {SphereGeometry} sphereGeometry A description of the sphere.
     * @returns {Geometry} The computed vertices and indices.
     */
    SphereGeometry.createGeometry = function(sphereGeometry) {
        return EllipsoidGeometry.createGeometry(sphereGeometry._ellipsoidGeometry);
    };

    return SphereGeometry;
});
