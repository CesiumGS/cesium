/*global define*/
define([
        './BoundingSphere',
        './Cartesian3',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './PrimitiveType'
    ], function(
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        PrimitiveType) {
    "use strict";

    var diffScratch = new Cartesian3();

    /**
     * A description of the outline of a cube centered at the origin.
     *
     * @alias BoxOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3} options.minimum The minimum x, y, and z coordinates of the box.
     * @param {Cartesian3} options.maximum The maximum x, y, and z coordinates of the box.
     *
     * @see BoxOutlineGeometry.fromDimensions
     * @see BoxOutlineGeometry.createGeometry
     * @see Packable
     *
     * @example
     * var box = new Cesium.BoxOutlineGeometry({
     *   maximum : new Cesium.Cartesian3(250000.0, 250000.0, 250000.0),
     *   minimum : new Cesium.Cartesian3(-250000.0, -250000.0, -250000.0)
     * });
     * var geometry = Cesium.BoxOutlineGeometry.createGeometry(box);
     */
    function BoxOutlineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var min = options.minimum;
        var max = options.maximum;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(min)) {
            throw new DeveloperError('options.minimum is required.');
        }
        if (!defined(max)) {
            throw new DeveloperError('options.maximum is required');
        }
        //>>includeEnd('debug');

        this._min = Cartesian3.clone(min);
        this._max = Cartesian3.clone(max);
        this._workerName = 'createBoxOutlineGeometry';
    }

    /**
     * Creates an outline of a cube centered at the origin given its dimensions.
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3} options.dimensions The width, depth, and height of the box stored in the x, y, and z coordinates of the <code>Cartesian3</code>, respectively.
     * @returns {BoxOutlineGeometry}
     *
     * @exception {DeveloperError} All dimensions components must be greater than or equal to zero.
     *
     * 
     * @example
     * var box = Cesium.BoxOutlineGeometry.fromDimensions({
     *   dimensions : new Cesium.Cartesian3(500000.0, 500000.0, 500000.0)
     * });
     * var geometry = Cesium.BoxOutlineGeometry.createGeometry(box);
     * 
     * @see BoxOutlineGeometry.createGeometry
     */
    BoxOutlineGeometry.fromDimensions = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var dimensions = options.dimensions;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(dimensions)) {
            throw new DeveloperError('options.dimensions is required.');
        }
        if (dimensions.x < 0 || dimensions.y < 0 || dimensions.z < 0) {
            throw new DeveloperError('All dimensions components must be greater than or equal to zero.');
        }
        //>>includeEnd('debug');

        var corner = Cartesian3.multiplyByScalar(dimensions, 0.5, new Cartesian3());

        return new BoxOutlineGeometry({
            minimum : Cartesian3.negate(corner, new Cartesian3()),
            maximum : corner
        });
    };

    /**
     * Creates an outline of a cube from the dimensions of an AxisAlignedBoundingBox.
     *
     * @param {AxisAlignedBoundingBox} boundingBox A description of the AxisAlignedBoundingBox.
     * @returns {BoxOutlineGeometry}
     *
     *
     *
     * @example
     * var aabb = Cesium.AxisAlignedBoundingBox.fromPoints(Cesium.Cartesian3.fromDegreesArray([
     *      -72.0, 40.0,
     *      -70.0, 35.0,
     *      -75.0, 30.0,
     *      -70.0, 30.0,
     *      -68.0, 40.0
     * ]));
     * var box = Cesium.BoxOutlineGeometry.fromAxisAlignedBoundingBox(aabb);
     * 
     *  @see BoxOutlineGeometry.createGeometry
     */
    BoxOutlineGeometry.fromAxisAlignedBoundingBox = function(boundingBox) {
        if (!defined(boundingBox)) {
            throw new DeveloperError('boundingBox is required.');
        }

        return new BoxOutlineGeometry({
            minimum : boundingBox.minimum,
            maximum : boundingBox.maximum
        });
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    BoxOutlineGeometry.packedLength = 2 * Cartesian3.packedLength;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {BoxOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    BoxOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        Cartesian3.pack(value._min, array, startingIndex);
        Cartesian3.pack(value._max, array, startingIndex + Cartesian3.packedLength);
    };

    var scratchMin = new Cartesian3();
    var scratchMax = new Cartesian3();
    var scratchOptions = {
        minimum : scratchMin,
        maximum : scratchMax
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {BoxOutlineGeometry} [result] The object into which to store the result.
     * @returns {BoxOutlineGeometry} The modified result parameter or a new BoxOutlineGeometry instance if one was not provided.
     */
    BoxOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var min = Cartesian3.unpack(array, startingIndex, scratchMin);
        var max = Cartesian3.unpack(array, startingIndex + Cartesian3.packedLength, scratchMax);

        if (!defined(result)) {
            return new BoxOutlineGeometry(scratchOptions);
        }

        result._min = Cartesian3.clone(min, result._min);
        result._max = Cartesian3.clone(max, result._max);

        return result;
    };

    /**
     * Computes the geometric representation of an outline of a box, including its vertices, indices, and a bounding sphere.
     *
     * @param {BoxOutlineGeometry} boxGeometry A description of the box outline.
     * @returns {Geometry} The computed vertices and indices.
     */
    BoxOutlineGeometry.createGeometry = function(boxGeometry) {
        var min = boxGeometry._min;
        var max = boxGeometry._max;

        var attributes = new GeometryAttributes();
        var indices = new Uint16Array(12 * 2);
        var positions = new Float64Array(8 * 3);

        positions[0] = min.x;
        positions[1] = min.y;
        positions[2] = min.z;
        positions[3] = max.x;
        positions[4] = min.y;
        positions[5] = min.z;
        positions[6] = max.x;
        positions[7] = max.y;
        positions[8] = min.z;
        positions[9] = min.x;
        positions[10] = max.y;
        positions[11] = min.z;

        positions[12] = min.x;
        positions[13] = min.y;
        positions[14] = max.z;
        positions[15] = max.x;
        positions[16] = min.y;
        positions[17] = max.z;
        positions[18] = max.x;
        positions[19] = max.y;
        positions[20] = max.z;
        positions[21] = min.x;
        positions[22] = max.y;
        positions[23] = max.z;

        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : positions
        });

        // top
        indices[0] = 4;
        indices[1] = 5;
        indices[2] = 5;
        indices[3] = 6;
        indices[4] = 6;
        indices[5] = 7;
        indices[6] = 7;
        indices[7] = 4;

        // bottom
        indices[8] = 0;
        indices[9] = 1;
        indices[10] = 1;
        indices[11] = 2;
        indices[12] = 2;
        indices[13] = 3;
        indices[14] = 3;
        indices[15] = 0;

        // left
        indices[16] = 0;
        indices[17] = 4;
        indices[18] = 1;
        indices[19] = 5;

        //right
        indices[20] = 2;
        indices[21] = 6;
        indices[22] = 3;
        indices[23] = 7;

        var diff = Cartesian3.subtract(max, min, diffScratch);
        var radius = Cartesian3.magnitude(diff) * 0.5;

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : new BoundingSphere(Cartesian3.ZERO, radius)
        });
    };

    return BoxOutlineGeometry;
});
