/*global define*/
define([
        './arrayRemoveDuplicates',
        './BoundingRectangle',
        './BoundingSphere',
        './Cartesian2',
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
        './Math',
        './PolygonPipeline',
        './PrimitiveType',
        './VertexFormat',
        './WindingOrder'
    ], function(
        arrayRemoveDuplicates,
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
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
        CesiumMath,
        PolygonPipeline,
        PrimitiveType,
        VertexFormat,
        WindingOrder) {
    'use strict';

    var scratchPositions2D = [];
    var scratchBR = new BoundingRectangle();
    var textureCoordinatesOrigin = new Cartesian2();
    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBitangent = new Cartesian3();

    /**
     * A description of a polygon composed of arbitrary coplanar positions.
     *
     * @alias CoplanarPolygonGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions The positions of the polygon
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @example
     * var polygon = new Cesium.CoplanarPolygonGeometry({
     *   positions : Cesium.Cartesian3.fromDegreesArrayHeights([
     *      -90.0, 30.0, 0.0,
     *      -90.0, 30.0, 1000.0,
     *      -80.0, 30.0, 1000.0,
     *      -80.0, 30.0, 0.0
     *   ])
     * });
     * var geometry = Cesium.CoplanarPolygonGeometry.createGeometry(polygon);
     *
     * @see CoplanarPolygonGeometry.createGeometry
     */
    function CoplanarPolygonGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;
        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.positions', positions);
        //>>includeEnd('debug');

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        this._vertexFormat = VertexFormat.clone(vertexFormat);
        this._positions = positions;
        this._workerName = 'createCoplanarPolygonGeometry';

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = 1 + positions.length * Cartesian3.packedLength + VertexFormat.packedLength;
    }

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {CoplanarPolygonGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    CoplanarPolygonGeometry.pack = function(value, array, startingIndex) {
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

        VertexFormat.pack(value._vertexFormat, array, startingIndex);

        return array;
    };

    var scratchVertexFormat = new VertexFormat();
    var scratchOptions = {
        positions : undefined,
        vertexFormat : scratchVertexFormat
    };
    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {CoplanarPolygonGeometry} [result] The object into which to store the result.
     * @returns {CoplanarPolygonGeometry} The modified result parameter or a new CoplanarPolygonGeometry instance if one was not provided.
     */
    CoplanarPolygonGeometry.unpack = function(array, startingIndex, result) {
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

        var vertexFormat = VertexFormat.unpack(array, startingIndex, scratchVertexFormat);

        if (!defined(result)) {
            scratchOptions.positions = positions;
            scratchOptions.vertexFormat = vertexFormat;
            return new CoplanarPolygonGeometry(scratchOptions);
        }

        result._positions = positions;
        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);

        return result;
    };

    /**
     * Computes the geometric representation of an arbitrary coplanar polygon, including its vertices, indices, and a bounding sphere.
     *
     * @param {CoplanarPolygonGeometry} polygonGeometry A description of the polygon.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    CoplanarPolygonGeometry.createGeometry = function(polygonGeometry) {
        var vertexFormat = polygonGeometry._vertexFormat;
        var positions = polygonGeometry._positions;
        positions = arrayRemoveDuplicates(positions, Cartesian3.equalsEpsilon, true);
        if (positions.length < 3) {
            return;
        }
        var boundingSphere = BoundingSphere.fromPoints(positions);

        var normal;
        var tangent;
        var bitangent;
        if (vertexFormat.normal) {
            normal = scratchNormal;
        }
        if (vertexFormat.tangent) {
            tangent = scratchTangent;
        }
        if (vertexFormat.bitangent) {
            bitangent = scratchBitangent;
        }
        var positions2D = CoplanarPolygonGeometryLibrary.projectTo2D(positions, scratchPositions2D, normal, tangent, bitangent);
        if (!defined(positions2D)) {
            return;
        }

        if (PolygonPipeline.computeWindingOrder2D(positions2D) === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            positions = positions.slice().reverse();
        }

        var indices = PolygonPipeline.triangulate(positions2D);
        if (indices.length < 3) {
            return;
        }
        var newIndices = IndexDatatype.createTypedArray(positions.length, indices.length);
        newIndices.set(indices);

        var boundingRectangle;
        var stOrigin = textureCoordinatesOrigin;
        if (vertexFormat.st) {
            boundingRectangle = BoundingRectangle.fromPoints(positions2D, scratchBR);
            stOrigin.x = boundingRectangle.x;
            stOrigin.y = boundingRectangle.y;
        }

        var length = positions.length;
        var size = length * 3;
        var flatPositions = new Float64Array(size);
        var normals = vertexFormat.normal ? new Float32Array(size) : undefined;
        var tangents = vertexFormat.tangent ? new Float32Array(size) : undefined;
        var bitangents = vertexFormat.bitangent ? new Float32Array(size) : undefined;
        var textureCoordinates = vertexFormat.st ? new Float32Array(length * 2) : undefined;

        var positionIndex = 0;
        var normalIndex = 0;
        var bitangentIndex = 0;
        var tangentIndex = 0;
        var stIndex = 0;

        for (var i = 0; i < length; i++) {
            var position = positions[i];
            flatPositions[positionIndex++] = position.x;
            flatPositions[positionIndex++] = position.y;
            flatPositions[positionIndex++] = position.z;

            if (vertexFormat.st) {
                var st = positions2D[i];
                st = Cartesian2.subtract(st, stOrigin, st);

                var stx = CesiumMath.clamp(st.x / boundingRectangle.width, 0, 1);
                var sty = CesiumMath.clamp(st.y / boundingRectangle.height, 0, 1);
                textureCoordinates[stIndex++] = stx;
                textureCoordinates[stIndex++] = sty;
            }

            if (vertexFormat.normal) {
                normals[normalIndex++] = normal.x;
                normals[normalIndex++] = normal.y;
                normals[normalIndex++] = normal.z;
            }

            if (vertexFormat.tangent) {
                tangents[tangentIndex++] = tangent.x;
                tangents[tangentIndex++] = tangent.y;
                tangents[tangentIndex++] = tangent.z;
            }

            if (vertexFormat.bitangent) {
                bitangents[bitangentIndex++] = bitangent.x;
                bitangents[bitangentIndex++] = bitangent.y;
                bitangents[bitangentIndex++] = bitangent.z;
            }
        }

        var attributes = new GeometryAttributes();

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : flatPositions
            });
        }

        if (vertexFormat.normal) {
            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : normals
            });
        }

        if (vertexFormat.tangent) {
            attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : tangents
            });
        }

        if (vertexFormat.bitangent) {
            attributes.bitangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : bitangents
            });
        }

        if (vertexFormat.st) {
            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : textureCoordinates
            });
        }

        return new Geometry({
            attributes : attributes,
            indices : newIndices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : boundingSphere
        });
    };

    return CoplanarPolygonGeometry;
});
