/*global define*/
define([
        './ComponentDatatype',
        './defined',
        './TerrainCompression'
    ], function(
        ComponentDatatype,
        defined,
        TerrainCompression
    ) {
    "use strict";

    /**
     * Data used to decompress the terrain mesh.
     *
     * @alias TerrainEncoding
     * @constructor
     *
     * @param {TerrainCompression} compression How the vertices of the mesh were compressed.
     * @param {Number} minimumX The minimum distance in the x direction.
     * @param {Number} maximumX The maximum distance in the x direction.
     * @param {Number} minimumY The minimum distance in the y direction.
     * @param {Number} maximumY The maximum distance in the y direction.
     * @param {Number} minimumZ The minimum distance in the z direction.
     * @param {Number} maximumZ The maximum distance in the z direction.
     * @param {Matrix3} matrix The matrix used to decompress the vertices.
     */
    var TerrainEncoding = function(compression, minimumX, maximumX, minimumY, maximumY, minimumZ, maximumZ, matrix, hasVertexNormals) {
        /**
         * How the vertices of the mesh were compressed.
         * @type {TerrainCompression}
         */
        this.compression = compression;

        /**
         * The minimum distance in the x direction.
         * @type {Number}
         */
        this.minimumX = minimumX;

        /**
         * The maximum distance in the x direction.
         * @type {Number}
         */
        this.maximumX = maximumX;

        /**
         * The minimum distance in the y direction.
         * @type {Number}
         */
        this.minimumY = minimumY;

        /**
         * The maximum distance in the y direction.
         * @type {Number}
         */
        this.maximumY = maximumY;

        /**
         * The minimumdistance in the z direction.
         * @type {Number}
         */
        this.minimumZ = minimumZ;

        /**
         * The maximum distance in the z direction.
         * @type {Number}
         */
        this.maximumZ = maximumZ;

        /**
         * The matrix used to decompress the terrain vertices.
         * @type {Matrix3}
         */
        this.matrix = matrix;

        /**
         * The terrain mesh contains normals.
         * @type {Boolean}
         */
        this.hasVertexNormals = hasVertexNormals;
    };

    var attributesNone = {
        position3DAndHeight : 0,
        textureCoordAndEncodedNormals : 1
    };
    var attributes16WithNormals = {
        compressed : 0,
        encodedNormal : 1
    };
    var attributes = {
        compressed : 0
    };

    TerrainEncoding.prototype.getAttributes = function(buffer) {
        var datatype = ComponentDatatype.FLOAT;
        var sizeInBytes = ComponentDatatype.getSizeInBytes(datatype);
        var stride;

        if (this.compression === TerrainCompression.NONE) {
            var position3DAndHeightLength = 4;
            var numTexCoordComponents = this.hasVertexNormals ? 3 : 2;
            stride = (this.hasVertexNormals ? 7 : 6) * sizeInBytes;
            return[{
                index : attributesNone.position3DAndHeight,
                vertexBuffer : buffer,
                componentDatatype : datatype,
                componentsPerAttribute : position3DAndHeightLength,
                offsetInBytes : 0,
                strideInBytes : stride
            }, {
                index : attributesNone.textureCoordAndEncodedNormals,
                vertexBuffer : buffer,
                componentDatatype : datatype,
                componentsPerAttribute : numTexCoordComponents,
                offsetInBytes : position3DAndHeightLength * sizeInBytes,
                strideInBytes : stride
            }];
        } else if (this.compression === TerrainCompression.BITS16 && this.hasVertexNormals) {
            var compressedLength = 4;
            stride = 5;
            return[{
                index : attributes16WithNormals.compressed,
                vertexBuffer : buffer,
                componentDatatype : datatype,
                componentsPerAttribute : compressedLength,
                offsetInBytes : 0,
                strideInBytes : stride
            }, {
                index : attributes16WithNormals.encodedNormal,
                vertexBuffer : buffer,
                componentDatatype : datatype,
                componentsPerAttribute : 1,
                offsetInBytes : compressedLength * sizeInBytes,
                strideInBytes : stride
            }];
        } else if (this.compression === TerrainCompression.BITS16) {
            return[{
                index : attributes.compressed,
                vertexBuffer : buffer,
                componentDatatype : datatype,
                componentsPerAttribute : 4
            }];
        }

        var numComponents = this.compression === TerrainCompression.BITS12 ? 3 : 2;
        numComponents += this.hasVertexNormals ? 1 : 0;
        return [{
            index : attributes.compressed,
            vertexBuffer : buffer,
            componentDatatype : datatype,
            componentsPerAttribute : numComponents
        }];
    };

    TerrainEncoding.prototype.getAttributeLocations = function() {
        if (this.compression === TerrainCompression.NONE) {
            return attributesNone;
        } else if (this.compression === TerrainCompression.BITS16 && this.hasVertexNormals) {
            return attributes16WithNormals;
        } else {
            return attributes;
        }
    };

    /**
     * @param {TerrainEncoding} encoding
     * @param {TerrainEncoding} [result]
     * @returns {TerrainEncoding}
     */
    TerrainEncoding.clone = function(encoding, result) {
        if (!defined(result)) {
            return new TerrainEncoding(
                encoding.compression,
                encoding.minimumX,
                encoding.maximumX,
                encoding.minimumY,
                encoding.maximumY,
                encoding.minimumZ,
                encoding.maximumZ,
                encoding.matrix,
                encoding.hasVertexNormals);
        }

        result.compression = encoding.compression;
        result.minimumX = encoding.minimumX;
        result.maximumX = encoding.maximumX;
        result.minimumY = encoding.minimumY;
        result.maximumY = encoding.maximumY;
        result.minimumZ = encoding.minimumZ;
        result.maximumZ = encoding.maximumZ;
        result.matrix = encoding.matrix;
        result.hasVertexNormals = encoding.hasVertexNormals;
        return result;
    };

    return TerrainEncoding;
});