/*global define*/
define([
    './arrayRemoveDuplicates',
    './BoundingSphere',
    './Cartesian3',
    './Check',
    './ComponentDatatype',
    './CoplanarPolygonGeometryLibrary',
    './defaultValue',
    './defined',
    './Geometry',
    './GeometryAttribute',
    './GeometryAttributes',
    './IndexDatatype',
    './PolygonPipeline',
    './PrimitiveType',
    './WindingOrder'
], function(
    arrayRemoveDuplicates,
    BoundingSphere,
    Cartesian3,
    Check,
    ComponentDatatype,
    CoplanarPolygonGeometryLibrary,
    defaultValue,
    defined,
    Geometry,
    GeometryAttribute,
    GeometryAttributes,
    IndexDatatype,
    PolygonPipeline,
    PrimitiveType,
    WindingOrder) {
    'use strict';

    var scratchPositions2D = [];

    /**
     * A description of the outline of a polygon composed of arbitrary coplanar positions.
     *
     * @alias CoplanarPolygonOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions The positions of the polygon
     *
     * @see CoplanarPolygonOutlineGeometry.createGeometry
     *
     * @example
     * var polygonOutline = new Cesium.CoplanarPolygonOutlineGeometry({
     *   positions : Cesium.Cartesian3.fromDegreesArrayHeights([
     *      -90.0, 30.0, 0.0,
     *      -90.0, 30.0, 1000.0,
     *      -80.0, 30.0, 1000.0,
     *      -80.0, 30.0, 0.0
     *   ])
     * });
     * var geometry = Cesium.CoplanarPolygonOutlineGeometry.createGeometry(polygonOutline);
     */
    function CoplanarPolygonOutlineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;
        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.positions', positions);
        //>>includeEnd('debug');

        this._positions = positions;
        this._workerName = 'createCoplanarPolygonOutlineGeometry';

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = 1 + positions.length * Cartesian3.packedLength;
    }

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {CoplanarPolygonOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    CoplanarPolygonOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var positions = value._positions;
        var length = positions.length;
        array[startingIndex++] = length;

        for (var i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
            Cartesian3.pack(positions[i], array, startingIndex);
        }

        return array;
    };

    var scratchOptions = {
        positions : undefined
    };
    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {CoplanarPolygonOutlineGeometry} [result] The object into which to store the result.
     * @returns {CoplanarPolygonOutlineGeometry} The modified result parameter or a new CoplanarPolygonOutlineGeometry instance if one was not provided.
     */
    CoplanarPolygonOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var i;

        var length = array[startingIndex++];
        var positions = new Array(length);

        for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
            positions[i] = Cartesian3.unpack(array, startingIndex);
        }

        if (!defined(result)) {
            scratchOptions.positions = positions;
            return new CoplanarPolygonOutlineGeometry(scratchOptions);
        }

        result._positions = positions;

        return result;
    };

    /**
     * Computes the geometric representation of an arbitrary coplanar polygon, including its vertices, indices, and a bounding sphere.
     *
     * @param {CoplanarPolygonOutlineGeometry} polygonGeometry A description of the polygon.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    CoplanarPolygonOutlineGeometry.createGeometry = function(polygonGeometry) {
        var positions = polygonGeometry._positions;
        positions = arrayRemoveDuplicates(positions, Cartesian3.equalsEpsilon, true);
        if (positions.length < 3) {
            return;
        }
        var boundingSphere = BoundingSphere.fromPoints(positions);

        var positions2D = CoplanarPolygonGeometryLibrary.projectTo2D(positions, scratchPositions2D);
        if (!defined(positions2D)) {
            return;
        }

        if (PolygonPipeline.computeWindingOrder2D(positions2D) === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            positions = positions.slice().reverse();
        }

        var length = positions.length;
        var flatPositions = new Float64Array(length * 3);
        var indices = IndexDatatype.createTypedArray(length, length * 2);

        var positionIndex = 0;
        var index = 0;

        for (var i = 0; i < length; i++) {
            var position = positions[i];
            flatPositions[positionIndex++] = position.x;
            flatPositions[positionIndex++] = position.y;
            flatPositions[positionIndex++] = position.z;

            indices[index++] = i;
            indices[index++] = (i + 1) % length;
        }

        var attributes = new GeometryAttributes({
            position: new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : flatPositions
            })
        });

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : boundingSphere
        });
    };

    return CoplanarPolygonOutlineGeometry;
});
