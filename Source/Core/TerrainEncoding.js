/*global define*/
define([
        './AttributeCompression',
        './Cartesian2',
        './Cartesian3',
        './ComponentDatatype',
        './defined',
        './Matrix3',
        './Matrix4',
        './TerrainCompression'
    ], function(
        AttributeCompression,
        Cartesian2,
        Cartesian3,
        ComponentDatatype,
        defined,
        Matrix3,
        Matrix4,
        TerrainCompression
    ) {
    "use strict";

    var SHIFT_LEFT_12 = Math.pow(2.0, 12.0);

    /**
     * Data used to decompress the terrain mesh.
     *
     * @alias TerrainEncoding
     * @constructor
     *
     * @param {Number} minimumX The minimum distance in the x direction.
     * @param {Number} maximumX The maximum distance in the x direction.
     * @param {Number} minimumY The minimum distance in the y direction.
     * @param {Number} maximumY The maximum distance in the y direction.
     * @param {Number} minimumZ The minimum distance in the z direction.
     * @param {Number} maximumZ The maximum distance in the z direction.
     * @param {Number} minimumHeight The minimum height.
     * @param {Number} maximumHeight The maximum height.
     * @param {Matrix3} fromENU The east-north-up to fixed frame matrix at the center of the terrain mesh.
     * @param {Boolean} hasVertexNormals If the mesh has vertex normals.
     *
     * @private
     */
    var TerrainEncoding = function(minimumX, maximumX, minimumY, maximumY, minimumZ, maximumZ, minimumHeight, maximumHeight, fromENU, hasVertexNormals) {
        var xDim = maximumX - minimumX;
        var yDim = maximumY - minimumY;
        var zDim = maximumZ - minimumZ;
        var hDim = maximumHeight - minimumHeight;
        var maxDim = Math.max(xDim, yDim, zDim, hDim);

        var compression;
        if (maxDim < SHIFT_LEFT_12 - 1.0) {
            compression = TerrainCompression.BITS12;
        } else {
            compression = TerrainCompression.NONE;
        }

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
         * The minimum distance in the z direction.
         * @type {Number}
         */
        this.minimumZ = minimumZ;

        /**
         * The maximum distance in the z direction.
         * @type {Number}
         */
        this.maximumZ = maximumZ;

        this.minimumHeight = minimumHeight;
        this.maximumHeight = maximumHeight;

        this.fromENU = Matrix4.clone(fromENU);
        this.toENU = Matrix4.inverseTransformation(fromENU, new Matrix4());

        /**
         * The matrix used to decompress the terrain vertices.
         * @type {Matrix3}
         */
        this.matrix = Matrix4.getRotation(this.fromENU, new Matrix3());

        /**
         * The terrain mesh contains normals.
         * @type {Boolean}
         */
        this.hasVertexNormals = hasVertexNormals;
    };

    var cartesian3Scratch = new Cartesian3();
    var cartesian2Scratch = new Cartesian2();

    TerrainEncoding.prototype.encode = function(vertexBuffer, bufferIndex, position, uv, height, normalToPack) {
        var u = uv.x;
        var v = uv.y;

        if (this.compression === TerrainCompression.BITS12) {
            var xDim = this.maximumX - this.minimumX;
            var yDim = this.maximumY - this.minimumY;
            var zDim = this.maximumZ - this.minimumZ;
            var hDim = this.maximumHeight - this.minimumHeight;

            Matrix4.multiplyByPoint(this.toENU, position, cartesian3Scratch);

            var x = (cartesian3Scratch.x - this.minimumX) / xDim;
            var y = (cartesian3Scratch.y - this.minimumY) / yDim;
            var z = (cartesian3Scratch.z - this.minimumZ) / zDim;
            var h = (height - this.minimumHeight) / hDim;

            Cartesian2.fromElements(x, y, cartesian2Scratch);
            var compressed0 = AttributeCompression.compressTextureCoordinates(cartesian2Scratch);

            Cartesian2.fromElements(z, h, cartesian2Scratch);
            var compressed1 = AttributeCompression.compressTextureCoordinates(cartesian2Scratch);

            Cartesian2.fromElements(u, v, cartesian2Scratch);
            var compressed2 = AttributeCompression.compressTextureCoordinates(cartesian2Scratch);

            vertexBuffer[bufferIndex++] = compressed0;
            vertexBuffer[bufferIndex++] = compressed1;
            vertexBuffer[bufferIndex++] = compressed2;
        } else {
            var center = Matrix4.getTranslation(this.fromENU, cartesian3Scratch);
            Cartesian3.subtract(position, center, cartesian3Scratch);

            vertexBuffer[bufferIndex++] = cartesian3Scratch.x;
            vertexBuffer[bufferIndex++] = cartesian3Scratch.y;
            vertexBuffer[bufferIndex++] = cartesian3Scratch.z;
            vertexBuffer[bufferIndex++] = height;
            vertexBuffer[bufferIndex++] = u;
            vertexBuffer[bufferIndex++] = v;
        }

        if (this.hasVertexNormals) {
            vertexBuffer[bufferIndex++] = AttributeCompression.octPackFloat(normalToPack);
        }

        return bufferIndex;
    };

    TerrainEncoding.prototype.decodePosition = function(buffer, index, result) {
        if (!defined(result)) {
            result = new Cartesian3();
        }

        index *= this.getStride();

        if (this.compression === TerrainCompression.BITS12) {
            var xy = AttributeCompression.decompressTextureCoordinates(buffer[index], cartesian2Scratch);
            result.x = xy.x;
            result.y = xy.y;

            var zh = AttributeCompression.decompressTextureCoordinates(buffer[index + 1], cartesian2Scratch);
            result.z = zh.x;

            // TODO: remove
            result.x = result.x * (this.maximumX - this.minimumX) + this.minimumX;
            result.y = result.y * (this.maximumY - this.minimumY) + this.minimumY;
            result.z = result.z * (this.maximumZ - this.minimumZ) + this.minimumZ;

            return Matrix4.multiplyByPoint(this.fromENU, result, result);
        }

        result.x = buffer[index] + this.fromENU[Matrix4.getElementIndex(3, 0)];
        result.y = buffer[index + 1] + this.fromENU[Matrix4.getElementIndex(3, 1)];
        result.z = buffer[index + 2] + this.fromENU[Matrix4.getElementIndex(3, 2)];
        return result;
    };

    TerrainEncoding.prototype.getStride = function() {
        var vertexStride;

        switch (this.compression) {
            case TerrainCompression.BITS12:
                vertexStride = 3;
                break;
            default:
                vertexStride = 6;
        }

        if (this.hasVertexNormals) {
            ++vertexStride;
        }

        return vertexStride;
    };

    var attributesNone = {
        position3DAndHeight : 0,
        textureCoordAndEncodedNormals : 1
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
            return [{
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
        }

        var numComponents = 3;
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
                encoding.minimumX,
                encoding.maximumX,
                encoding.minimumY,
                encoding.maximumY,
                encoding.minimumZ,
                encoding.maximumZ,
                encoding.minimumHeight,
                encoding.maximumHeight,
                encoding.fromENU,
                encoding.hasVertexNormals);
        }

        result.minimumX = encoding.minimumX;
        result.maximumX = encoding.maximumX;
        result.minimumY = encoding.minimumY;
        result.maximumY = encoding.maximumY;
        result.minimumZ = encoding.minimumZ;
        result.maximumZ = encoding.maximumZ;
        result.minimumHeight = encoding.minimumHeight;
        result.maximumHeight = encoding.maximumHeight;
        result.fromENU = encoding.fromENU;
        result.hasVertexNormals = encoding.hasVertexNormals;
        return result;
    };

    return TerrainEncoding;
});
