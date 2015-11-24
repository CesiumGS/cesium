/*global define*/
define([
        './AttributeCompression',
        './Cartesian2',
        './Cartesian3',
        './ComponentDatatype',
        './defined',
        './Math',
        './Matrix3',
        './Matrix4',
        './TerrainCompression'
    ], function(
        AttributeCompression,
        Cartesian2,
        Cartesian3,
        ComponentDatatype,
        defined,
        CesiumMath,
        Matrix3,
        Matrix4,
        TerrainCompression
    ) {
    "use strict";

    var cartesian3Scratch = new Cartesian3();
    var cartesian2Scratch = new Cartesian2();
    var matrix4Scratch = new Matrix4();
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
        var compression;
        var center;
        var toENU;
        var matrix;

        if (defined(minimumX) && defined(maximumX) && defined(minimumY) && defined(maximumY) && defined(minimumZ) && defined(maximumZ) && defined(minimumHeight) && defined(maximumHeight) && defined(fromENU)) {
            var xDim = maximumX - minimumX;
            var yDim = maximumY - minimumY;
            var zDim = maximumZ - minimumZ;
            var hDim = maximumHeight - minimumHeight;
            var maxDim = Math.max(xDim, yDim, zDim, hDim);

            if (maxDim < SHIFT_LEFT_12 - 1.0) {
                compression = TerrainCompression.BITS12;
            } else {
                compression = TerrainCompression.NONE;
            }

            center = Matrix4.getTranslation(fromENU, new Cartesian3());

            toENU = Matrix4.inverseTransformation(fromENU, new Matrix4());

            var translation = cartesian3Scratch;
            translation.x = -minimumX;
            translation.y = -minimumY;
            translation.z = -minimumZ;
            Matrix4.multiply(Matrix4.fromTranslation(translation, matrix4Scratch), toENU, toENU);

            var scale = cartesian3Scratch;
            scale.x = 1.0 / xDim;
            scale.y = 1.0 / yDim;
            scale.z = 1.0 / zDim;
            Matrix4.multiply(Matrix4.fromScale(scale, matrix4Scratch), toENU, toENU);

            matrix = Matrix4.clone(fromENU);
            Matrix4.setTranslation(matrix, Cartesian3.ZERO, matrix);

            fromENU = Matrix4.clone(fromENU, new Matrix4());

            scale = new Cartesian3();
            scale.x = xDim;
            scale.y = yDim;
            scale.z = zDim;
            translation = new Cartesian3();
            translation.x = minimumX;
            translation.y = minimumY;
            translation.z = minimumZ;

            var st = Matrix4.multiply(Matrix4.fromTranslation(translation), Matrix4.fromScale(scale), new Matrix4());
            Matrix4.multiply(fromENU, st, fromENU);

            Matrix4.multiply(matrix, st, matrix);
        }

        /**
         * How the vertices of the mesh were compressed.
         * @type {TerrainCompression}
         */
        this.compression = compression;

        this.minimumHeight = minimumHeight;
        this.maximumHeight = maximumHeight;

        this.center = center;

        this.toScaledENU = toENU;
        this.fromScaledENU = fromENU;

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

    TerrainEncoding.prototype.encode = function(vertexBuffer, bufferIndex, position, uv, height, normalToPack) {
        var u = uv.x;
        var v = uv.y;

        if (this.compression === TerrainCompression.BITS12) {
            position = Matrix4.multiplyByPoint(this.toScaledENU, position, cartesian3Scratch);

            position.x = CesiumMath.clamp(position.x, 0.0, 1.0);
            position.y = CesiumMath.clamp(position.y, 0.0, 1.0);
            position.z = CesiumMath.clamp(position.z, 0.0, 1.0);

            var hDim = this.maximumHeight - this.minimumHeight;
            var h = (height - this.minimumHeight) / hDim;

            Cartesian2.fromElements(position.x, position.y, cartesian2Scratch);
            var compressed0 = AttributeCompression.compressTextureCoordinates(cartesian2Scratch);

            Cartesian2.fromElements(position.z, h, cartesian2Scratch);
            var compressed1 = AttributeCompression.compressTextureCoordinates(cartesian2Scratch);

            Cartesian2.fromElements(u, v, cartesian2Scratch);
            var compressed2 = AttributeCompression.compressTextureCoordinates(cartesian2Scratch);

            vertexBuffer[bufferIndex++] = compressed0;
            vertexBuffer[bufferIndex++] = compressed1;
            vertexBuffer[bufferIndex++] = compressed2;
        } else {
            Cartesian3.subtract(position, this.center, cartesian3Scratch);

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

            return Matrix4.multiplyByPoint(this.fromScaledENU, result, result);
        }

        result.x = buffer[index];
        result.y = buffer[index + 1];
        result.z = buffer[index + 2];
        return Cartesian3.add(result, this.center, result);
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
            result = new TerrainEncoding();
        }

        result.compression = encoding.compression;
        result.minimumHeight = encoding.minimumHeight;
        result.maximumHeight = encoding.maximumHeight;
        result.center = Cartesian3.clone(encoding.center);
        result.toScaledENU = Matrix4.clone(encoding.toScaledENU);
        result.fromScaledENU = Matrix4.clone(encoding.fromScaledENU);
        result.matrix = Matrix4.clone(encoding.matrix);
        result.hasVertexNormals = encoding.hasVertexNormals;
        return result;
    };

    return TerrainEncoding;
});
