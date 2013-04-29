/*global define*/
define([
        './clone',
        './defaultValue',
        './DeveloperError',
        './Math',
        './Ellipsoid',
        './Extent',
        './Cartesian3',
        './ComponentDatatype',
        './PrimitiveType'
    ], function(
        clone,
        defaultValue,
        DeveloperError,
        CesiumMath,
        Ellipsoid,
        Extent,
        Cartesian3,
        ComponentDatatype,
        PrimitiveType) {
    "use strict";

    /**
     * Contains class functions to create a mesh or vertex array from a cartographic extent.
     *
     * @exports ExtentTessellator
     *
     * @see HeightmapTessellator
     * @see CubeMapEllipsoidTessellator
     * @see BoxTessellator
     * @see PlaneTessellator
     */
    var ExtentTessellator = {};

    /**
     * Compute vertices from a cartographic extent.  This function is different from
     * {@link ExtentTessellator#compute} and {@link ExtentTessellator#computeBuffers}
     * in that it assumes that you have already allocated output arrays of the correct size.
     *
     * @param {Extent} description.extent A cartographic extent with north, south, east and west properties in radians.
     * @param {Number} description.width The number of vertices in the longitude direction.
     * @param {Number} description.height The number of vertices in the latitude direction.
     * @param {Number} description.granularityX The distance, in radians, between each longitude.
     * @param {Number} description.granularityY The distance, in radians, between each latitude.
     * @param {Number} description.surfaceHeight The height from the surface of the ellipsoid.
     * @param {Boolean} description.generateTextureCoordinates Whether to generate texture coordinates.
     * @param {Boolean} description.interleaveTextureCoordinates Whether to interleave the texture coordinates into the vertex array.
     * @param {Cartesian3} description.relativetoCenter The positions will be computed as <code>worldPosition.subtract(relativeToCenter)</code>.
     * @param {Cartesian3} description.radiiSquared The radii squared of the ellipsoid to use.
     * @param {Array|Float32Array} description.vertices The array to use to store computed vertices.
     * @param {Array|Float32Array} description.textureCoordinates The array to use to store computed texture coordinates, unless interleaved.
     * @param {Array|Float32Array} [description.indices] The array to use to store computed indices.  If undefined, indices will be not computed.
     */
    ExtentTessellator.computeVertices = function(description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);

        var extent = description.extent;
        var surfaceHeight = description.surfaceHeight;
        var width = description.width;
        var height = description.height;

        var granularityX = (extent.east - extent.west) / (width - 1);
        var granularityY = (extent.north - extent.south) / (height - 1);
        var generateTextureCoordinates = description.generateTextureCoordinates;
        var interleaveTextureCoordinates = description.interleaveTextureCoordinates;
        var relativeToCenter = description.relativeToCenter;

        var vertices = description.vertices;
        var textureCoordinates = description.textureCoordinates;
        var indices = description.indices;

        var radiiSquared = description.radiiSquared;
        var radiiSquaredX = radiiSquared.x;
        var radiiSquaredY = radiiSquared.y;
        var radiiSquaredZ = radiiSquared.z;

        var cos = Math.cos;
        var sin = Math.sin;
        var sqrt = Math.sqrt;

        // for computing texture coordinates
        var lonScalar = 1.0 / (extent.east - extent.west);
        var latScalar = 1.0 / (extent.north - extent.south);

        var vertexArrayIndex = 0;
        var textureCoordinatesIndex = 0;

        for ( var row = 0; row < height; ++row) {
            var latitude = extent.north - granularityY * row;
            var cosLatitude = cos(latitude);
            var nZ = sin(latitude);
            var kZ = radiiSquaredZ * nZ;

            var geographicV = (latitude - extent.south) * latScalar;

            var v = geographicV;

            for ( var col = 0; col < width; ++col) {
                var longitude = extent.west + granularityX * col;

                var nX = cosLatitude * cos(longitude);
                var nY = cosLatitude * sin(longitude);

                var kX = radiiSquaredX * nX;
                var kY = radiiSquaredY * nY;

                var gamma = sqrt((kX * nX) + (kY * nY) + (kZ * nZ));

                var rSurfaceX = kX / gamma;
                var rSurfaceY = kY / gamma;
                var rSurfaceZ = kZ / gamma;

                vertices[vertexArrayIndex++] = rSurfaceX + nX * surfaceHeight - relativeToCenter.x;
                vertices[vertexArrayIndex++] = rSurfaceY + nY * surfaceHeight - relativeToCenter.y;
                vertices[vertexArrayIndex++] = rSurfaceZ + nZ * surfaceHeight - relativeToCenter.z;

                if (generateTextureCoordinates) {
                    var geographicU = (longitude - extent.west) * lonScalar;

                    var u = geographicU;

                    if (interleaveTextureCoordinates) {
                        vertices[vertexArrayIndex++] = u;
                        vertices[vertexArrayIndex++] = v;
                    } else {
                        textureCoordinates[textureCoordinatesIndex++] = u;
                        textureCoordinates[textureCoordinatesIndex++] = v;
                    }
                }
            }
        }

        if (typeof indices !== 'undefined') {
            var index = 0;
            var indicesIndex = 0;
            for ( var i = 0; i < height - 1; ++i) {
                for ( var j = 0; j < width - 1; ++j) {
                    var upperLeft = index;
                    var lowerLeft = upperLeft + width;
                    var lowerRight = lowerLeft + 1;
                    var upperRight = upperLeft + 1;

                    indices[indicesIndex++] = upperLeft;
                    indices[indicesIndex++] = lowerLeft;
                    indices[indicesIndex++] = upperRight;
                    indices[indicesIndex++] = upperRight;
                    indices[indicesIndex++] = lowerLeft;
                    indices[indicesIndex++] = lowerRight;

                    ++index;
                }
                ++index;
            }
        }
    };

    /**
     * Creates a mesh from a cartographic extent.
     *
     * @param {Extent} description.extent A cartographic extent with north, south, east and west properties in radians.
     * @param {Ellipsoid} [description.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the extent lies.
     * @param {Number} [description.granularity=0.1] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [description.surfaceHeight=0.0] The height from the surface of the ellipsoid.
     * @param {Cartesian3} [description.relativetoCenter=Cartesian3.ZERO] The positions will be computed as <code>worldPosition.subtract(relativeToCenter)</code>.
     * @param {Boolean} [description.generateTextureCoordinates=false] Whether to generate texture coordinates.
     *
     * @exception {DeveloperError} <code>description.extent</code> is required and must have north, south, east and west attributes.
     * @exception {DeveloperError} <code>description.extent.north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>description.extent.south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>description.extent.east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>description.extent.west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>description.extent.north</code> must be greater than <code>extent.south</code>.
     * @exception {DeveloperError} <code>description.extent.east</code> must be greater than <code>extent.west</code>.
     * @exception {DeveloperError} <code>description.context</code> is required.
     *
     * @return {Object} A mesh containing attributes for positions, possibly texture coordinates and indices
     * from the extent for creating a vertex array.
     *
     * @see Context#createVertexArrayFromMesh
     * @see MeshFilters.createAttributeIndices
     * @see MeshFilters.toWireframeInPlace
     * @see Extent
     *
     * @example
     * // Create a vertex array for rendering a wireframe extent.
     * var mesh = ExtentTessellator.compute({
     *     ellipsoid : Ellipsoid.WGS84,
     *     extent : new Extent(
     *         CesiumMath.toRadians(-80.0),
     *         CesiumMath.toRadians(39.0),
     *         CesiumMath.toRadians(-74.0),
     *         CesiumMath.toRadians(42.0)
     *     ),
     *     granularity : 0.01,
     *     surfaceHeight : 10000.0
     * });
     * mesh = MeshFilters.toWireframeInPlace(mesh);
     * var va = context.createVertexArrayFromMesh({
     *     mesh             : mesh,
     *     attributeIndices : MeshFilters.createAttributeIndices(mesh)
     * });
     */
    ExtentTessellator.compute = function(description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);

        // make a copy of description to allow us to change values before passing to computeVertices
        var computeVerticesDescription = clone(description);

        var extent = description.extent;
        extent.validate();

        var ellipsoid = defaultValue(description.ellipsoid, Ellipsoid.WGS84);
        computeVerticesDescription.radiiSquared = ellipsoid.getRadiiSquared();
        computeVerticesDescription.relativeToCenter = defaultValue(description.relativeToCenter, Cartesian3.ZERO);

        var granularity = defaultValue(description.granularity, 0.1);
        computeVerticesDescription.surfaceHeight = defaultValue(description.surfaceHeight, 0.0);

        computeVerticesDescription.width = Math.ceil((extent.east - extent.west) / granularity) + 1;
        computeVerticesDescription.height = Math.ceil((extent.north - extent.south) / granularity) + 1;

        var vertices = [];
        var indices = [];
        var textureCoordinates = [];

        computeVerticesDescription.generateTextureCoordinates = defaultValue(computeVerticesDescription.generateTextureCoordinates, false);
        computeVerticesDescription.interleaveTextureCoordinates = false;
        computeVerticesDescription.vertices = vertices;
        computeVerticesDescription.textureCoordinates = textureCoordinates;
        computeVerticesDescription.indices = indices;

        ExtentTessellator.computeVertices(computeVerticesDescription);

        var mesh = {
            attributes : {},
            indexLists : [{
                primitiveType : PrimitiveType.TRIANGLES,
                values : indices
            }]
        };

        var positionName = defaultValue(description.positionName, 'position');
        mesh.attributes[positionName] = {
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : vertices
        };

        if (description.generateTextureCoordinates) {
            var textureCoordinatesName = defaultValue(description.textureCoordinatesName, 'textureCoordinates');
            mesh.attributes[textureCoordinatesName] = {
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : textureCoordinates
            };
        }

        return mesh;
    };

    /**
     * Creates arrays of vertex attributes and indices from a cartographic extent.
     *
     * @param {Extent} description.extent A cartographic extent with north, south, east and west properties in radians.
     * @param {Ellipsoid} [description.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the extent lies.
     * @param {Number} [description.granularity=0.1] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [description.surfaceHeight=0.0] The height from the surface of the ellipsoid.
     * @param {Cartesian3} [description.relativetoCenter=Cartesian3.ZERO] The positions will be computed as <code>worldPosition.subtract(relativeToCenter)</code>.
     * @param {Boolean} [description.generateTextureCoordinates=false] Whether to generate texture coordinates.
     * @param {Boolean} [description.interleaveTextureCoordinates=false] If texture coordinates are generated, whether to interleave the positions and texture coordinates in a single buffer.
     *
     * @exception {DeveloperError} <code>description.extent</code> is required and must have north, south, east and west attributes.
     * @exception {DeveloperError} <code>description.extent.north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>description.extent.south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>description.extent.east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>description.extent.west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>description.extent.north</code> must be greater than <code>extent.south</code>.     *
     * @exception {DeveloperError} <code>description.extent.east</code> must be greater than <code>extent.west</code>.
     *
     * @return {Object} An object with flattened arrays for vertex attributes and indices.
     *
     * @example
     * // Example 1:
     * // Create a vertex array for a solid extent, with separate positions and texture coordinates.
     * var buffers = ExtentTessellator.computeBuffers({
     *     ellipsoid : ellipsoid,
     *     extent : extent,
     *     generateTextureCoordinates : true
     * });
     *
     * var datatype = ComponentDatatype.FLOAT;
     * var usage = BufferUsage.STATIC_DRAW;
     * var positionBuffer = context.createVertexBuffer(datatype.toTypedArray(buffers.positions), usage);
     * var textureCoordinateBuffer = context.createVertexBuffer(datatype.toTypedArray(buffers.textureCoordinates), usage);
     * attributes = [{
     *         index : attributeIndices.position,
     *         vertexBuffer : positionBuffer,
     *         componentDatatype : datatype,
     *         componentsPerAttribute : 3
     *     }, {
     *         index : attributeIndices.textureCoordinates,
     *         vertexBuffer : textureCoordinateBuffer,
     *         componentDatatype : datatype,
     *         componentsPerAttribute : 2
     *     }];
     * var indexBuffer = context.createIndexBuffer(new Uint16Array(buffers.indices), usage, IndexDatatype.UNSIGNED_SHORT);
     * var va = context.createVertexArray(attributes, indexBuffer);
     *
     * @example
     * // Example 2:
     * // Create a vertex array for a solid extent, with interleaved positions and texture coordinates.
     * var buffers = ExtentTessellator.computeBuffers({
     *     ellipsoid : ellipsoid,
     *     extent : extent,
     *     generateTextureCoordinates : true,
     *     interleaveTextureCoordinates : true
     * });
     *
     * var datatype = ComponentDatatype.FLOAT;
     * var usage = BufferUsage.STATIC_DRAW;
     * var typedArray = datatype.toTypedArray(buffers.vertices);
     * var buffer = context.createVertexBuffer(typedArray, usage);
     * var stride = 5 * datatype.sizeInBytes;
     * var attributes = [{
     *         index : attributeIndices.position3D,
     *         vertexBuffer : buffer,
     *         componentDatatype : datatype,
     *         componentsPerAttribute : 3,
     *         normalize : false,
     *         offsetInBytes : 0,
     *         strideInBytes : stride
     *     }, {
     *         index : attributeIndices.textureCoordinates,
     *         vertexBuffer : buffer,
     *         componentDatatype : datatype,
     *         componentsPerAttribute : 2,
     *         normalize : false,
     *         offsetInBytes : 3 * datatype.sizeInBytes,
     *         strideInBytes : stride
     *     }];
     * var indexBuffer = context.createIndexBuffer(new Uint16Array(buffers.indices), usage, IndexDatatype.UNSIGNED_SHORT);
     * var vacontext.createVertexArray(attributes, indexBuffer);
     */
    ExtentTessellator.computeBuffers = function(description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);

        // make a copy of description to allow us to change values before passing to computeVertices
        var computeVerticesDescription = clone(description);

        var extent = description.extent;
        extent.validate();

        var ellipsoid = defaultValue(description.ellipsoid, Ellipsoid.WGS84);
        computeVerticesDescription.radiiSquared = ellipsoid.getRadiiSquared();
        computeVerticesDescription.relativeToCenter = defaultValue(description.relativeToCenter, Cartesian3.ZERO);

        var granularity = defaultValue(description.granularity, 0.1);
        computeVerticesDescription.surfaceHeight = defaultValue(description.surfaceHeight, 0.0);

        computeVerticesDescription.width = Math.ceil((extent.east - extent.west) / granularity) + 1;
        computeVerticesDescription.height = Math.ceil((extent.north - extent.south) / granularity) + 1;

        var vertices = [];
        var indices = [];
        var textureCoordinates = [];

        computeVerticesDescription.generateTextureCoordinates = defaultValue(description.generateTextureCoordinates, false);
        computeVerticesDescription.interleaveTextureCoordinates = defaultValue(description.interleaveTextureCoordinates, false);
        computeVerticesDescription.vertices = vertices;
        computeVerticesDescription.textureCoordinates = textureCoordinates;
        computeVerticesDescription.indices = indices;

        ExtentTessellator.computeVertices(computeVerticesDescription);

        var result = {
            indices : indices
        };

        if (description.interleaveTextureCoordinates) {
            result.vertices = vertices;
        } else {
            result.positions = vertices;
            if (description.generateTextureCoordinates) {
                result.textureCoordinates = textureCoordinates;
            }
        }

        return result;
    };

    return ExtentTessellator;
});
