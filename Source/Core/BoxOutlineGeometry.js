define([
        './arrayFill',
        './Cartesian3',
        './Check',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './GeometryAttribute',
        './GeometryInstance',
        './GeometryOffsetAttribute',
        './GeometryPipeline',
        './PolylineGeometry'
    ], function(
        arrayFill,
        Cartesian3,
        Check,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        GeometryAttribute,
        GeometryInstance,
        GeometryOffsetAttribute,
        GeometryPipeline,
        PolylineGeometry) {
    'use strict';

    /**
     * A description of the outline of a cube centered at the origin.
     *
     * @alias BoxOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3} options.minimum The minimum x, y, and z coordinates of the box.
     * @param {Cartesian3} options.maximum The maximum x, y, and z coordinates of the box.
     * @param {Number} [options.width=2] The width of the outline in pixels.
     *
     * @exception {DeveloperError} width must be greater than or equal to 1.0.
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
        var width = defaultValue(options.width, 2.0);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('min', min);
        Check.typeOf.object('max', max);
        Check.typeOf.number.greaterThanOrEquals('width', width, 1.0);
        if (defined(options.offsetAttribute) && options.offsetAttribute === GeometryOffsetAttribute.TOP) {
            throw new DeveloperError('GeometryOffsetAttribute.TOP is not a supported options.offsetAttribute for this geometry.');
        }
        //>>includeEnd('debug');

        this._min = Cartesian3.clone(min);
        this._max = Cartesian3.clone(max);
        this._offsetAttribute = options.offsetAttribute;
        this._width = width;
        this._workerName = 'createBoxOutlineGeometry';
    }

    /**
     * Creates an outline of a cube centered at the origin given its dimensions.
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3} options.dimensions The width, depth, and height of the box stored in the x, y, and z coordinates of the <code>Cartesian3</code>, respectively.
     * @param {Number} [options.width=2] The width of the outline in pixels.
     * @returns {BoxOutlineGeometry}
     *
     * @exception {DeveloperError} All dimensions components must be greater than or equal to zero.
     * @exception {DeveloperError} width must be greater than or equal to 1.0.
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
        Check.typeOf.object('dimensions', dimensions);
        Check.typeOf.number.greaterThanOrEquals('dimensions.x', dimensions.x, 0);
        Check.typeOf.number.greaterThanOrEquals('dimensions.y', dimensions.y, 0);
        Check.typeOf.number.greaterThanOrEquals('dimensions.z', dimensions.z, 0);
        //>>includeEnd('debug');

        var corner = Cartesian3.multiplyByScalar(dimensions, 0.5, new Cartesian3());

        return new BoxOutlineGeometry({
            minimum : Cartesian3.negate(corner, new Cartesian3()),
            maximum : corner,
            offsetAttribute: options.offsetAttribute,
            width : options.width
        });
    };

    /**
     * Creates an outline of a cube from the dimensions of an AxisAlignedBoundingBox.
     *
     * @param {AxisAlignedBoundingBox} boundingBox A description of the AxisAlignedBoundingBox.
     * @param {Number} [options.width=2] The width of the outline in pixels.
     * @returns {BoxOutlineGeometry}
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
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('boundindBox', boundingBox);
        //>>includeEnd('debug');

        return new BoxOutlineGeometry({
            minimum : boundingBox.minimum,
            maximum : boundingBox.maximum
        });
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    BoxOutlineGeometry.packedLength = 2 * Cartesian3.packedLength + 2;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {BoxOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    BoxOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        Cartesian3.pack(value._min, array, startingIndex);
        startingIndex += Cartesian3.packedLength;

        Cartesian3.pack(value._max, array, startingIndex);
        startingIndex += Cartesian3.packedLength;

        array[startingIndex++] = defaultValue(value._offsetAttribute, -1);
        array[startingIndex] = value._width;

        return array;
    };

    var scratchMin = new Cartesian3();
    var scratchMax = new Cartesian3();
    var scratchOptions = {
        minimum : scratchMin,
        maximum : scratchMax,
        offsetAttribute : undefined,
        width : undefined
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
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var min = Cartesian3.unpack(array, startingIndex, scratchMin);
        startingIndex += Cartesian3.packedLength;
        var max = Cartesian3.unpack(array, startingIndex, scratchMax);
        startingIndex += Cartesian3.packedLength;
        var offsetAttribute = array[startingIndex++];
        var width = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
            scratchOptions.width = width;
            return new BoxOutlineGeometry(scratchOptions);
        }

        result._min = Cartesian3.clone(min, result._min);
        result._max = Cartesian3.clone(max, result._max);
        result._offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
        result._width = width;

        return result;
    };

    var facePositionsScratch = [new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3()];
    var cornersScratch = [new Cartesian3(), new Cartesian3()];

    /**
     * Computes the geometric representation of an outline of a box, including its vertices, indices, and a bounding sphere.
     *
     * @param {BoxOutlineGeometry} boxGeometry A description of the box outline.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    BoxOutlineGeometry.createGeometry = function(boxGeometry) {
        var min = boxGeometry._min;
        var max = boxGeometry._max;
        var width = boxGeometry._width;

        if (Cartesian3.equals(min, max)) {
            return;
        }

        var instances = new Array(6);

        var top = facePositionsScratch;
        Cartesian3.fromElements(min.x, min.y, min.z, top[0]);
        Cartesian3.fromElements(max.x, min.y, min.z, top[1]);
        Cartesian3.fromElements(max.x, max.y, min.z, top[2]);
        Cartesian3.fromElements(min.x, max.y, min.z, top[3]);
        Cartesian3.clone(top[0], top[4]);

        instances[0] = new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : top,
                width : width,
                followSurface : false
            }))
        });

        var bottom = facePositionsScratch;
        Cartesian3.fromElements(min.x, min.y, max.z, bottom[0]);
        Cartesian3.fromElements(max.x, min.y, max.z, bottom[1]);
        Cartesian3.fromElements(max.x, max.y, max.z, bottom[2]);
        Cartesian3.fromElements(min.x, max.y, max.z, bottom[3]);
        Cartesian3.clone(bottom[0], bottom[4]);

        instances[1] = new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : top,
                width : width,
                followSurface : false
            }))
        });

        var corners = cornersScratch;
        Cartesian3.fromElements(min.x, min.x, min.z, corners[0]);
        Cartesian3.fromElements(min.x, min.y, max.z, corners[1]);
        instances[2] = new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : corners,
                width : width,
                followSurface : false
            }))
        });

        Cartesian3.fromElements(max.x, min.x, min.z, corners[0]);
        Cartesian3.fromElements(max.x, min.y, max.z, corners[1]);
        instances[3] = new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : corners,
                width : width,
                followSurface : false
            }))
        });

        Cartesian3.fromElements(max.x, max.x, min.z, corners[0]);
        Cartesian3.fromElements(max.x, max.y, max.z, corners[1]);
        instances[4] = new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : corners,
                width : width,
                followSurface : false
            }))
        });

        Cartesian3.fromElements(min.x, max.x, min.z, corners[0]);
        Cartesian3.fromElements(min.x, max.y, max.z, corners[1]);
        instances[5] = new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : corners,
                width : width,
                followSurface : false
            }))
        });

        var geometry = GeometryPipeline.combineInstances(instances)[0];

        if (defined(boxGeometry._offsetAttribute)) {
            var length = geometry.attributes.position.values.length;
            var applyOffset = new Uint8Array(length / 3);
            var offsetValue = boxGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
            arrayFill(applyOffset, offsetValue);
            geometry.attributes.applyOffset = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 1,
                values: applyOffset
            });
        }

        return geometry;
    };

    return BoxOutlineGeometry;
});
