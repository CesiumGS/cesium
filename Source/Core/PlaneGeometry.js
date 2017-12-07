define([
        './BoundingSphere',
        './Cartesian3',
        './Check',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './PrimitiveType',
        './VertexFormat'
    ], function(
        BoundingSphere,
        Cartesian3,
        Check,
        ComponentDatatype,
        defaultValue,
        defined,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        PrimitiveType,
        VertexFormat) {
    'use strict';

    /**
     * Describes geometry representing a plane centered at the origin, with a unit width and length.
     *
     * @alias PlaneGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @example
     * var planeGeometry = new Cesium.PlaneGeometry({
     *   vertexFormat : Cesium.VertexFormat.POSITION_ONLY
     * });
     */
    function PlaneGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        this._vertexFormat = vertexFormat;
        this._workerName = 'createPlaneGeometry';
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    PlaneGeometry.packedLength = VertexFormat.packedLength;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {PlaneGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    PlaneGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        VertexFormat.pack(value._vertexFormat, array, startingIndex);

        return array;
    };

    var scratchVertexFormat = new VertexFormat();
    var scratchOptions = {
        vertexFormat: scratchVertexFormat
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {PlaneGeometry} [result] The object into which to store the result.
     * @returns {PlaneGeometry} The modified result parameter or a new PlaneGeometry instance if one was not provided.
     */
    PlaneGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var vertexFormat = VertexFormat.unpack(array, startingIndex, scratchVertexFormat);

        if (!defined(result)) {
            return new PlaneGeometry(scratchOptions);
        }

        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);

        return result;
    };

    /**
     * Computes the geometric representation of a plane, including its vertices, indices, and a bounding sphere.
     *
     * @param {PlaneGeometry} planeGeometry A description of the plane.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    PlaneGeometry.createGeometry = function(planeGeometry) {
        var vertexFormat = planeGeometry._vertexFormat;

        var min = new Cartesian3(-0.5, -0.5, 0.0);
        var max = new Cartesian3( 0.5,  0.5, 0.0);

        var attributes = new GeometryAttributes();
        var indices;
        var positions;

        if (vertexFormat.position &&
            (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent)) {
            if (vertexFormat.position) {
                // 4 corner points.  Duplicated 3 times each for each incident edge/face.
                positions = new Float64Array(2 * 4 * 3);

                // +z face
                positions[0]  = min.x;
                positions[1]  = min.y;
                positions[2]  = 0.0;
                positions[3]  = max.x;
                positions[4]  = min.y;
                positions[5]  = 0.0;
                positions[6]  = max.x;
                positions[7]  = max.y;
                positions[8]  = 0.0;
                positions[9]  = min.x;
                positions[10] = max.y;
                positions[11] = 0.0;

                // -z face
                positions[12] = min.x;
                positions[13] = min.y;
                positions[14] = 0.0;
                positions[15] = max.x;
                positions[16] = min.y;
                positions[17] = 0.0;
                positions[18] = max.x;
                positions[19] = max.y;
                positions[20] = 0.0;
                positions[21] = min.x;
                positions[22] = max.y;
                positions[23] = 0.0;

                attributes.position = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.DOUBLE,
                    componentsPerAttribute : 3,
                    values : positions
                });
            }

            if (vertexFormat.normal) {
                var normals = new Float32Array(2 * 4 * 3);

                // +z face
                normals[0]  = 0.0;
                normals[1]  = 0.0;
                normals[2]  = 1.0;
                normals[3]  = 0.0;
                normals[4]  = 0.0;
                normals[5]  = 1.0;
                normals[6]  = 0.0;
                normals[7]  = 0.0;
                normals[8]  = 1.0;
                normals[9]  = 0.0;
                normals[10] = 0.0;
                normals[11] = 1.0;

                // -z face
                normals[12] = 0.0;
                normals[13] = 0.0;
                normals[14] = -1.0;
                normals[15] = 0.0;
                normals[16] = 0.0;
                normals[17] = -1.0;
                normals[18] = 0.0;
                normals[19] = 0.0;
                normals[20] = -1.0;
                normals[21] = 0.0;
                normals[22] = 0.0;
                normals[23] = -1.0;

                attributes.normal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : normals
                });
            }

            if (vertexFormat.st) {
                var texCoords = new Float32Array(2 * 4 * 2);

                // +z face
                texCoords[0]  = 0.0;
                texCoords[1]  = 0.0;
                texCoords[2]  = 1.0;
                texCoords[3]  = 0.0;
                texCoords[4]  = 1.0;
                texCoords[5]  = 1.0;
                texCoords[6]  = 0.0;
                texCoords[7]  = 1.0;

                // -z face
                texCoords[8]  = 1.0;
                texCoords[9]  = 0.0;
                texCoords[10] = 0.0;
                texCoords[11] = 0.0;
                texCoords[12] = 0.0;
                texCoords[13] = 1.0;
                texCoords[14] = 1.0;
                texCoords[15] = 1.0;

                attributes.st = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : texCoords
                });
            }

            if (vertexFormat.tangent) {
                var tangents = new Float32Array(2 * 4 * 3);

                // +z face
                tangents[0]  = 1.0;
                tangents[1]  = 0.0;
                tangents[2]  = 0.0;
                tangents[3]  = 1.0;
                tangents[4]  = 0.0;
                tangents[5]  = 0.0;
                tangents[6]  = 1.0;
                tangents[7]  = 0.0;
                tangents[8]  = 0.0;
                tangents[9]  = 1.0;
                tangents[10] = 0.0;
                tangents[11] = 0.0;

                // -z face
                tangents[12] = -1.0;
                tangents[13] = 0.0;
                tangents[14] = 0.0;
                tangents[15] = -1.0;
                tangents[16] = 0.0;
                tangents[17] = 0.0;
                tangents[18] = -1.0;
                tangents[19] = 0.0;
                tangents[20] = 0.0;
                tangents[21] = -1.0;
                tangents[22] = 0.0;
                tangents[23] = 0.0;

                attributes.tangent = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : tangents
                });
            }

            if (vertexFormat.bitangent) {
                var bitangents = new Float32Array(2 * 4 * 3);

                // +z face
                bitangents[0] = 0.0;
                bitangents[1] = 1.0;
                bitangents[2] = 0.0;
                bitangents[3] = 0.0;
                bitangents[4] = 1.0;
                bitangents[5] = 0.0;
                bitangents[6] = 0.0;
                bitangents[7] = 1.0;
                bitangents[8] = 0.0;
                bitangents[9] = 0.0;
                bitangents[10] = 1.0;
                bitangents[11] = 0.0;

                // -z face
                bitangents[12] = 0.0;
                bitangents[13] = 1.0;
                bitangents[14] = 0.0;
                bitangents[15] = 0.0;
                bitangents[16] = 1.0;
                bitangents[17] = 0.0;
                bitangents[18] = 0.0;
                bitangents[19] = 1.0;
                bitangents[20] = 0.0;
                bitangents[21] = 0.0;
                bitangents[22] = 1.0;
                bitangents[23] = 0.0;

                attributes.bitangent = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : bitangents
                });
            }

            // 4 triangles:  2 faces, 2 triangles each.
            indices = new Uint16Array(2 * 2 * 3);

            // +z face
            indices[0] = 0;
            indices[1] = 1;
            indices[2] = 2;
            indices[3] = 0;
            indices[4] = 2;
            indices[5] = 3;

            // -z face
            indices[6] = 4 + 2;
            indices[7] = 4 + 1;
            indices[8] = 4 + 0;
            indices[9] = 4 + 3;
            indices[10] = 4 + 2;
            indices[11] = 4 + 0;
        } else {
            // Positions only - no need to duplicate corner points
            positions = new Float64Array(4 * 3);

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

            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });

            // 12 triangles:  2 faces, 2 triangles each.
            indices = new Uint16Array(2 * 2 * 3);

            // plane z = corner.Z
            indices[0] = 4;
            indices[1] = 5;
            indices[2] = 6;
            indices[3] = 4;
            indices[4] = 6;
            indices[5] = 7;

            // plane z = -corner.Z
            indices[6] = 1;
            indices[7] = 0;
            indices[8] = 3;
            indices[9] = 1;
            indices[10] = 3;
            indices[11] = 2;
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : new BoundingSphere(Cartesian3.ZERO, Math.sqrt(2.0)/2.0)
        });
    };

    return PlaneGeometry;
});
