
define([
        './arrayFill',
        './Cartesian3',
        './Check',
        './ComponentDatatype',
        './CylinderGeometryLibrary',
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
        CylinderGeometryLibrary,
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
     * A description of the outline of a cylinder.
     *
     * @alias CylinderOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Number} options.length The length of the cylinder.
     * @param {Number} options.topRadius The radius of the top of the cylinder.
     * @param {Number} options.bottomRadius The radius of the bottom of the cylinder.
     * @param {Number} [options.slices=128] The number of edges around the perimeter of the cylinder.
     * @param {Number} [options.numberOfVerticalLines=16] Number of lines to draw between the top and bottom surfaces of the cylinder.
     * @param {Number} [options.width=2] The width of the outline in pixels.
     *
     * @exception {DeveloperError} options.length must be greater than 0.
     * @exception {DeveloperError} options.topRadius must be greater than 0.
     * @exception {DeveloperError} options.bottomRadius must be greater than 0.
     * @exception {DeveloperError} bottomRadius and topRadius cannot both equal 0.
     * @exception {DeveloperError} options.slices must be greater than or equal to 3.
     * @exception {DeveloperError} options.width must be greater than or equal to 1.
     *
     * @see CylinderOutlineGeometry.createGeometry
     *
     * @example
     * // create cylinder geometry
     * var cylinder = new Cesium.CylinderOutlineGeometry({
     *     length: 200000,
     *     topRadius: 80000,
     *     bottomRadius: 200000,
     * });
     * var geometry = Cesium.CylinderOutlineGeometry.createGeometry(cylinder);
     */
    function CylinderOutlineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var length = options.length;
        var topRadius = options.topRadius;
        var bottomRadius = options.bottomRadius;
        var slices = defaultValue(options.slices, 128);
        var numberOfVerticalLines = Math.max(defaultValue(options.numberOfVerticalLines, 16), 0);
        var width = defaultValue(options.width, 2.0);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number('options.positions', length);
        Check.typeOf.number('options.topRadius', topRadius);
        Check.typeOf.number('options.bottomRadius', bottomRadius);
        Check.typeOf.number.greaterThanOrEquals('options.slices', slices, 3);
        Check.typeOf.number.greaterThanOrEquals('options.width', width, 1);
        if (defined(options.offsetAttribute) && options.offsetAttribute === GeometryOffsetAttribute.TOP) {
            throw new DeveloperError('GeometryOffsetAttribute.TOP is not a supported options.offsetAttribute for this geometry.');
        }
        //>>includeEnd('debug');

        this._length = length;
        this._topRadius = topRadius;
        this._bottomRadius = bottomRadius;
        this._slices = slices;
        this._numberOfVerticalLines = numberOfVerticalLines;
        this._offsetAttribute = options.offsetAttribute;
        this._width = width;
        this._workerName = 'createCylinderOutlineGeometry';
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    CylinderOutlineGeometry.packedLength = 7;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {CylinderOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    CylinderOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value._length;
        array[startingIndex++] = value._topRadius;
        array[startingIndex++] = value._bottomRadius;
        array[startingIndex++] = value._slices;
        array[startingIndex++] = value._numberOfVerticalLines;
        array[startingIndex++] = defaultValue(value._offsetAttribute, -1);
        array[startingIndex] = value._width;

        return array;
    };

    var scratchOptions = {
        length : undefined,
        topRadius : undefined,
        bottomRadius : undefined,
        slices : undefined,
        numberOfVerticalLines : undefined,
        offsetAttribute : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {CylinderOutlineGeometry} [result] The object into which to store the result.
     * @returns {CylinderOutlineGeometry} The modified result parameter or a new CylinderOutlineGeometry instance if one was not provided.
     */
    CylinderOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var length = array[startingIndex++];
        var topRadius = array[startingIndex++];
        var bottomRadius = array[startingIndex++];
        var slices = array[startingIndex++];
        var numberOfVerticalLines = array[startingIndex++];
        var offsetAttribute = array[startingIndex++];
        var width = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.length = length;
            scratchOptions.topRadius = topRadius;
            scratchOptions.bottomRadius = bottomRadius;
            scratchOptions.slices = slices;
            scratchOptions.numberOfVerticalLines = numberOfVerticalLines;
            scratchOptions.offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
            scratchOptions.width = width;
            return new CylinderOutlineGeometry(scratchOptions);
        }

        result._length = length;
        result._topRadius = topRadius;
        result._bottomRadius = bottomRadius;
        result._slices = slices;
        result._numberOfVerticalLines = numberOfVerticalLines;
        result._offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
        result._width = width;

        return result;
    };

    var scratchVerticalLines = [new Cartesian3(), new Cartesian3()];

    /**
     * Computes the geometric representation of an outline of a cylinder, including its vertices, indices, and a bounding sphere.
     *
     * @param {CylinderOutlineGeometry} cylinderGeometry A description of the cylinder outline.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    CylinderOutlineGeometry.createGeometry = function(cylinderGeometry) {
        var length = cylinderGeometry._length;
        var topRadius = cylinderGeometry._topRadius;
        var bottomRadius = cylinderGeometry._bottomRadius;
        var slices = cylinderGeometry._slices;
        var numberOfVerticalLines = cylinderGeometry._numberOfVerticalLines;
        var width = cylinderGeometry._width;

        if ((length <= 0) || (topRadius < 0) || (bottomRadius < 0) || ((topRadius === 0) && (bottomRadius === 0))) {
            return;
        }

        var positions = CylinderGeometryLibrary.computePositions(length, topRadius, bottomRadius, slices, false);

        length = positions.length / (3 * 2);
        var topPositions = new Array(length + 1);
        var bottomPositions = new Array(length + 1);

        var i;
        for (i = 0; i < length; ++i) {
            topPositions[i] = Cartesian3.unpack(positions, i * 3);
            bottomPositions[i] = Cartesian3.unpack(positions, (i + slices) * 3);
        }

        topPositions[length] = topPositions[0];
        bottomPositions[length] = bottomPositions[0];

        var instances = [];
        instances.push(new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : topPositions,
                followSurface : false,
                width : width
            }))
        }));
        instances.push(new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : bottomPositions,
                followSurface : false,
                width : width
            }))
        }));

        var numSide;
        if (numberOfVerticalLines > 0) {
            var numSideLines = Math.min(numberOfVerticalLines, slices);
            numSide = Math.round(slices / numSideLines);

            for (i = 0; i < slices; i += numSide) {
                var verticalLines = scratchVerticalLines;
                Cartesian3.unpack(positions, i * 3, verticalLines[0]);
                Cartesian3.unpack(positions, (i + slices) * 3, verticalLines[1]);

                instances.push(new GeometryInstance({
                    geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                        positions : verticalLines,
                        followSurface : false,
                        width : width
                    }))
                }));
            }
        }

        var geometry = GeometryPipeline.combineInstances(instances)[0];

        if (defined(cylinderGeometry._offsetAttribute)) {
            length = geometry.attributes.position.values.length / 3;
            var applyOffset = new Uint8Array(length);
            var offsetValue = cylinderGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
            arrayFill(applyOffset, offsetValue);
            geometry.attributes.applyOffset = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 1,
                values: applyOffset
            });
        }

        return geometry;
    };

    return CylinderOutlineGeometry;
});
