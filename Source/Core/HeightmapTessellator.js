/*global define*/
define([
        './DeveloperError',
        './Math',
        './Ellipsoid',
        './Extent',
        './Cartesian3',
        './Cartographic3',
        './ComponentDatatype',
        './PrimitiveType',
        './defaultValue'
    ], function(
        DeveloperError,
        CesiumMath,
        Ellipsoid,
        Extent,
        Cartesian3,
        Cartographic3,
        ComponentDatatype,
        PrimitiveType,
        defaultValue) {
    "use strict";

    /**
     * Contains class functions to create a mesh or vertex array from a heightmap image.
     *
     * @exports HeightmapTessellator
     *
     * @see CubeMapEllipsoidTessellator
     * @see BoxTessellator
     * @see PlaneTessellator
     */
    var HeightmapTessellator = {};

    HeightmapTessellator._computeVertices = function(description) {
        var desc = description || {};

        var heightmap = desc.heightmap;
        var heightScale = desc.heightScale;
        var heightOffset = desc.heightOffset;
        var bytesPerHeight = desc.bytesPerHeight;
        var strideBytes = desc.strideBytes;
        var width = desc.width;
        var height = desc.height;

        var extent = desc.extent.clone();
        var ellipsoid = desc.ellipsoid;
        var granularityX = (extent.east - extent.west) / width;
        var granularityY = (extent.north - extent.south) / height;
        var genTexCoords = desc.generateTextureCoords;
        var interleave = desc.interleave;
        var relativeToCenter = desc.relativeToCenter;

        var vertices = desc.vertices;
        var texCoords = desc.texCoords;
        var indices = desc.indices;

        var radiiSquared = ellipsoid.getRadiiSquared();
        var radiiSquaredX = radiiSquared.x;
        var radiiSquaredY = radiiSquared.y;
        var radiiSquaredZ = radiiSquared.z;

        var cos = Math.cos;
        var sin = Math.sin;
        var sqrt = Math.sqrt;

        for (var row = 0; row < height; ++row) {
            var latitude = extent.north - granularityY * row;
            var cosLatitude = cos(latitude);
            var nZ = sin(latitude);
            var kZ = radiiSquaredZ * nZ;

            var v = (height - row - 1) / (height - 1);

            for (var col = 0; col < width; ++col) {
                var longitude = extent.west + granularityX * col;

                var terrainOffset = row * (width * strideBytes) + col * strideBytes;
                var heightSample = (heightmap[terrainOffset] << 16) +
                             (heightmap[terrainOffset + 1] << 8) +
                             heightmap[terrainOffset + 2];
                if (bytesPerHeight === 4) {
                    heightSample = (heightSample << 8) + heightmap[terrainOffset + 3];
                }
                heightSample = heightSample / heightScale - heightOffset;

                var nX = cosLatitude * cos(longitude);
                var nY = cosLatitude * sin(longitude);

                var kX = radiiSquaredX * nX;
                var kY = radiiSquaredY * nY;

                var gamma = sqrt((kX * nX) + (kY * nY) + (kZ * nZ));

                var rSurfaceX = kX / gamma;
                var rSurfaceY = kY / gamma;
                var rSurfaceZ = kZ / gamma;

                vertices.push(rSurfaceX + nX * heightSample - relativeToCenter.x);
                vertices.push(rSurfaceY + nY * heightSample - relativeToCenter.y);
                vertices.push(rSurfaceZ + nZ * heightSample - relativeToCenter.z);

                if (genTexCoords) {
                    var u = col / (width - 1);
                    if (interleave) {
                        vertices.push(u);
                        vertices.push(v);
                    } else {
                        texCoords.push(u);
                        texCoords.push(v);
                    }
                }
            }
        }

        var index = 0;
        for (var i = 0; i < height - 1; ++i) {
            for (var j = 0; j < width - 1; ++j) {
                var upperLeft = index;
                var lowerLeft = upperLeft + width;
                var lowerRight = lowerLeft + 1;
                var upperRight = upperLeft + 1;

                indices.push(upperLeft, lowerLeft, upperRight);
                indices.push(upperRight, lowerLeft, lowerRight);

                ++index;
            }
            ++index;
        }
    };

    /**
     * Creates a mesh from a heightmap.
     *
     * @param {Ellipsoid} description.ellipsoid The ellipsoid on which the extent lies. Defaults to a WGS84 ellipsoid.
     * @param {Extent} description.extent A cartographic extent with north, south, east and west properties in radians.
     * @param {Number} description.granularity The distance, in radians, between each latitude and longitude.
     * Determines the number of positions in the buffer. Defaults to 0.1.
     * @param {Number} description.altitude The height from the surface of the ellipsoid. Defaults to 0.
     * @param {Boolean} description.generateTextureCoords A truthy value will cause texture coordinates to be generated.
     * @param {Cartesian3} description.relativetoCenter If this parameter is provided, the positions will be
     * computed as <code>worldPosition.subtract(relativeToCenter)</code>. Defaults to (0, 0, 0).
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
     * @see MeshFilters#createAttributeIndices
     * @see MeshFilters#toWireframeInPlace
     * @see Extent
     *
     * @example
     * // Create a vertex array for rendering a wireframe extent.
     * var mesh = HeightmapTessellator.compute({
     *     ellipsoid : Ellipsoid.WGS84,
     *     extent : new Extent(
     *         CesiumMath.toRadians(-80.0),
     *         CesiumMath.toRadians(39.0),
     *         CesiumMath.toRadians(-74.0),
     *         CesiumMath.toRadians(42.0)
     *     ),
     *     granularity : 0.01,
     *     altitude : 10000.0
     * });
     * mesh = MeshFilters.toWireframeInPlace(mesh);
     * var va = context.createVertexArrayFromMesh({
     *     mesh             : mesh,
     *     attributeIndices : MeshFilters.createAttributeIndices(mesh)
     * });
     */
    HeightmapTessellator.compute = function(description) {
        var desc = description || {};

        Extent.validate(desc.extent);

        desc.ellipsoid = defaultValue(desc.ellipsoid, Ellipsoid.WGS84);
        desc.relativeToCenter = (desc.relativeToCenter) ? Cartesian3.clone(desc.relativeToCenter) : Cartesian3.ZERO;
        desc.boundaryWidth = desc.boundaryWidth || 0; // NOTE: may want to expose in the future.
        desc.interleave = false;
        desc.positionName = desc.positionName || 'position';
        desc.textureCoordName = desc.textureCoordName || 'textureCoordinates';

        var vertices = [];
        var indices = [];
        var texCoords = [];

        desc.vertices = vertices;
        desc.texCoords = texCoords;
        desc.indices = indices;
        desc.boundaryExtent = new Extent(
            desc.extent.west - desc.granularity * desc.boundaryWidth,
            desc.extent.south - desc.granularity * desc.boundaryWidth,
            desc.extent.east + desc.granularity * desc.boundaryWidth,
            desc.extent.north + desc.granularity * desc.boundaryWidth
        );

        HeightmapTessellator._computeVertices(desc);

        var mesh = {};
        mesh.attributes = {};
        mesh.indexLists = [];

        mesh.attributes[desc.positionName] = {
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : vertices
        };

        if (desc.generateTextureCoords) {
            mesh.attributes[desc.textureCoordName] = {
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : texCoords
            };
        }

        mesh.indexLists.push({
            primitiveType : PrimitiveType.TRIANGLES,
            values : indices
        });

        return mesh;
    };

    /**
     * Creates arrays of vertex attributes and indices from a heightmap.
     *
     * @param {Ellipsoid} description.ellipsoid The ellipsoid on which the extent lies. Defaults to a WGS84 ellipsoid.
     * @param {Extent} description.extent A cartographic extent with north, south, east and west properties in radians.
     * @param {Number} description.granularity The distance, in radians, between each latitude and longitude.
     * Determines the number of positions in the buffer. Defaults to 0.1.
     * @param {Number} description.altitude The height from the surface of the ellipsoid. Defaults to 0.
     * @param {Boolean} description.generateTextureCoords A truthy value will cause texture coordinates to be generated.
     * @param {Boolean} description.interleave If both this parameter and <code>generateTextureCoords</code> are truthy,
     * the positions and texture coordinates will be interleaved in a single buffer.
     * @param {Object} description.attributeIndices An object with possibly two numeric attributes, <code>position</code>
     * and <code>textureCoordinates</code>, used to index the shader attributes of the same names.
     * <code>position</code> defaults to 0 and <code>textureCoordinates</code> defaults to 1.
     * @param {Cartesian3} description.relativetoCenter If this parameter is provided, the positions will be
     * computed as <code>worldPosition.subtract(relativeToCenter)</code>. Defaults to (0, 0, 0).
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
     * var buffers = HeightmapTessellator.computeBuffers({
     *     ellipsoid : ellipsoid,
     *     extent : extent,
     *     generateTextureCoords : true
     * });
     *
     * var datatype = ComponentDatatype.FLOAT;
     * var usage = BufferUsage.STATIC_DRAW;
     * var positionBuffer = context.createVertexBuffer(datatype.toTypedArray(buffers.positions), usage);
     * var texCoordBuffer = context.createVertexBuffer(datatype.toTypedArray(buffers.textureCoords), usage);
     * attributes = [{
     *         index : attributeIndices.position,
     *         vertexBuffer : positionBuffer,
     *         componentDatatype : datatype,
     *         componentsPerAttribute : 3
     *     }, {
     *         index : attributeIndices.textureCoordinates,
     *         vertexBuffer : texCoordBuffer,
     *         componentDatatype : datatype,
     *         componentsPerAttribute : 2
     *     }];
     * var indexBuffer = context.createIndexBuffer(new Uint16Array(buffers.indices), usage, IndexDatatype.UNSIGNED_SHORT);
     * var va = context.createVertexArray(attributes, indexBuffer);
     *
     * @example
     * // Example 2:
     * // Create a vertex array for a solid extent, with interleaved positions and texture coordinates.
     * var buffers = HeightmapTessellator.computeBuffers({
     *     ellipsoid : ellipsoid,
     *     extent : extent,
     *     generateTextureCoords : true,
     *     interleave : true
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
     *
     */
    HeightmapTessellator.computeBuffers = function(description) {
        var desc = description || {};

        Extent.validate(desc.extent);

        desc.ellipsoid = desc.ellipsoid || Ellipsoid.WGS84;
        desc.relativeToCenter = (desc.relativeToCenter) ? Cartesian3.clone(desc.relativeToCenter) : Cartesian3.ZERO;
        desc.boundaryWidth = desc.boundaryWidth || 0; // NOTE: may want to expose in the future.

        desc.vertices = [];
        desc.texCoords = [];
        desc.indices = [];
        desc.boundaryExtent = new Extent(
            desc.extent.west - desc.granularity * desc.boundaryWidth,
            desc.extent.south - desc.granularity * desc.boundaryWidth,
            desc.extent.east + desc.granularity * desc.boundaryWidth,
            desc.extent.north + desc.granularity * desc.boundaryWidth
        );

        HeightmapTessellator._computeVertices(desc);

        var result = {};
        if (desc.interleave) {
            result.vertices = desc.vertices;
        } else {
            result.positions = desc.vertices;
            if (desc.generateTextureCoords) {
                result.textureCoords = desc.texCoords;
            }
        }

        result.indices = desc.indices;
        return result;
    };

    return HeightmapTessellator;
});
