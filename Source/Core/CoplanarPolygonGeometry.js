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
        './GeometryInstance',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './Matrix3',
        './PolygonGeometryLibrary',
        './PolygonPipeline',
        './PrimitiveType',
        './Quaternion',
        './VertexFormat'
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
        GeometryInstance,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        Matrix3,
        PolygonGeometryLibrary,
        PolygonPipeline,
        PrimitiveType,
        Quaternion,
        VertexFormat) {
    'use strict';

    var scratchPosition = new Cartesian3();
    var scratchBR = new BoundingRectangle();
    var stScratch = new Cartesian2();
    var textureCoordinatesOrigin = new Cartesian2();
    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBitangent = new Cartesian3();
    var centerScratch = new Cartesian3();
    var axis1Scratch = new Cartesian3();
    var axis2Scratch = new Cartesian3();
    var quaternionScratch = new Quaternion();
    var textureMatrixScratch = new Matrix3();
    var tangentRotationScratch = new Matrix3();

    function createGeometryFromPolygon(polygon, vertexFormat, boundingRectangle, stRotation, projectPointTo2D, normal, tangent, bitangent) {
        var positions = polygon.positions;
        var indices = PolygonPipeline.triangulate(polygon.positions2D, polygon.holes);

        /* If polygon is completely unrenderable, just use the first three vertices */
        if (indices.length < 3) {
            indices = [0, 1, 2];
        }

        var newIndices = IndexDatatype.createTypedArray(positions.length, indices.length);
        newIndices.set(indices);

        var textureMatrix = textureMatrixScratch;
        if (stRotation !== 0.0) {
            var rotation = Quaternion.fromAxisAngle(normal, stRotation, quaternionScratch);
            textureMatrix = Matrix3.fromQuaternion(rotation, textureMatrix);

            if (vertexFormat.tangent || vertexFormat.bitangent) {
                rotation = Quaternion.fromAxisAngle(normal, -stRotation, quaternionScratch);
                var tangentRotation = Matrix3.fromQuaternion(rotation, tangentRotationScratch);

                tangent = Cartesian3.normalize(Matrix3.multiplyByVector(tangentRotation, tangent, tangent), tangent);
                if (vertexFormat.bitangent) {
                    bitangent = Cartesian3.normalize(Cartesian3.cross(normal, tangent, bitangent), bitangent);
                }
            }
        } else {
            textureMatrix = Matrix3.clone(Matrix3.IDENTITY, textureMatrix);
        }

        var stOrigin = textureCoordinatesOrigin;
        if (vertexFormat.st) {
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
                var p = Matrix3.multiplyByVector(textureMatrix, position, scratchPosition);
                var st = projectPointTo2D(p, stScratch);
                Cartesian2.subtract(st, stOrigin, st);

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
            primitiveType : PrimitiveType.TRIANGLES
        });
    }

    /**
     * A description of a polygon composed of arbitrary coplanar positions.
     *
     * @alias CoplanarPolygonGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {PolygonHierarchy} options.polygonHierarchy A polygon hierarchy that can include holes.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
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
        var polygonHierarchy = options.polygonHierarchy;
        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.polygonHierarchy', polygonHierarchy);
        //>>includeEnd('debug');

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        this._vertexFormat = VertexFormat.clone(vertexFormat);
        this._polygonHierarchy = polygonHierarchy;
        this._stRotation = defaultValue(options.stRotation, 0.0);
        this._workerName = 'createCoplanarPolygonGeometry';

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = PolygonGeometryLibrary.computeHierarchyPackedLength(polygonHierarchy) + VertexFormat.packedLength + 2;
    }

    /**
     * A description of a coplanar polygon from an array of positions.
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions An array of positions that defined the corner points of the polygon.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @returns {CoplanarPolygonGeometry}
     *
     * @example
     * // create a polygon from points
     * var polygon = Cesium.CoplanarPolygonGeometry.fromPositions({
     *   positions : Cesium.Cartesian3.fromDegreesArray([
     *     -72.0, 40.0,
     *     -70.0, 35.0,
     *     -75.0, 30.0,
     *     -70.0, 30.0,
     *     -68.0, 40.0
     *   ])
     * });
     * var geometry = Cesium.PolygonGeometry.createGeometry(polygon);
     *
     * @see PolygonGeometry#createGeometry
     */
    CoplanarPolygonGeometry.fromPositions = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.positions', options.positions);
        //>>includeEnd('debug');

        var newOptions = {
            polygonHierarchy : {
                positions : options.positions
            },
            vertexFormat : options.vertexFormat,
            stRotation : options.stRotation
        };
        return new CoplanarPolygonGeometry(newOptions);
    };

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

        startingIndex = PolygonGeometryLibrary.packPolygonHierarchy(value._polygonHierarchy, array, startingIndex);

        VertexFormat.pack(value._vertexFormat, array, startingIndex);
        startingIndex += VertexFormat.packedLength;

        array[startingIndex++] = value._stRotation;
        array[startingIndex] = value.packedLength;

        return array;
    };

    var scratchVertexFormat = new VertexFormat();
    var scratchOptions = {
        polygonHierarchy : {}
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

        var polygonHierarchy = PolygonGeometryLibrary.unpackPolygonHierarchy(array, startingIndex);
        startingIndex = polygonHierarchy.startingIndex;
        delete polygonHierarchy.startingIndex;

        var vertexFormat = VertexFormat.unpack(array, startingIndex, scratchVertexFormat);
        startingIndex += VertexFormat.packedLength;

        var stRotation = array[startingIndex++];
        var packedLength = array[startingIndex];

        if (!defined(result)) {
            result = new CoplanarPolygonGeometry(scratchOptions);
        }

        result._polygonHierarchy = polygonHierarchy;
        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
        result._stRotation = stRotation;
        result.packedLength = packedLength;
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
        var polygonHierarchy = polygonGeometry._polygonHierarchy;
        var stRotation = polygonGeometry._stRotation;

        var outerPositions = polygonHierarchy.positions;
        outerPositions = arrayRemoveDuplicates(outerPositions, Cartesian3.equalsEpsilon, true);
        if (outerPositions.length < 3) {
            return;
        }

        var normal = scratchNormal;
        var tangent = scratchTangent;
        var bitangent = scratchBitangent;

        var validGeometry = CoplanarPolygonGeometryLibrary.computeProjectTo2DArguments(outerPositions, centerScratch, axis1Scratch, axis2Scratch);
        if (!validGeometry) {
            return undefined;
        }
        var projectPoints = CoplanarPolygonGeometryLibrary.createProjectPointsTo2DFunction(centerScratch, axis1Scratch, axis2Scratch);
        var projectPoint = CoplanarPolygonGeometryLibrary.createProjectPointTo2DFunction(centerScratch, axis1Scratch, axis2Scratch);

        normal = Cartesian3.cross(axis1Scratch, axis2Scratch, normal);
        normal = Cartesian3.normalize(normal, normal);

        if (vertexFormat.tangent) {
            tangent = Cartesian3.clone(axis1Scratch, tangent);
        }
        if (vertexFormat.bitangent) {
            bitangent = Cartesian3.clone(axis2Scratch, bitangent);
        }

        var results = PolygonGeometryLibrary.polygonsFromHierarchy(polygonHierarchy, projectPoints, false);
        var hierarchy = results.hierarchy;
        var polygons = results.polygons;

        if (hierarchy.length === 0) {
            return;
        }
        outerPositions = hierarchy[0].outerRing;

        var boundingSphere = BoundingSphere.fromPoints(outerPositions);
        var boundingRectangle = PolygonGeometryLibrary.computeBoundingRectangle(normal, projectPoint, outerPositions, stRotation, scratchBR);

        var geometries = [];
        for (var i = 0; i < polygons.length; i++) {
            var geometryInstance = new GeometryInstance({
                geometry : createGeometryFromPolygon(polygons[i], vertexFormat, boundingRectangle, stRotation, projectPoint, normal, tangent, bitangent)
            });

            geometries.push(geometryInstance);
        }

        var geometry = GeometryPipeline.combineInstances(geometries)[0];
        geometry.attributes.position.values = new Float64Array(geometry.attributes.position.values);
        geometry.indices = IndexDatatype.createTypedArray(geometry.attributes.position.values.length / 3, geometry.indices);

        var attributes = geometry.attributes;
        if (!vertexFormat.position) {
            delete attributes.position;
        }
        return new Geometry({
            attributes : attributes,
            indices : geometry.indices,
            primitiveType : geometry.primitiveType,
            boundingSphere : boundingSphere
        });
    };

    return CoplanarPolygonGeometry;
});
