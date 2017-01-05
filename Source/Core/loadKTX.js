/*global define*/
define([
        '../ThirdParty/when',
        './CompressedTextureBuffer',
        './defined',
        './DeveloperError',
        './loadArrayBuffer',
        './PixelFormat',
        './RuntimeError'
    ], function(
        when,
        CompressedTextureBuffer,
        defined,
        DeveloperError,
        loadArrayBuffer,
        PixelFormat,
        RuntimeError) {
    'use strict';

    /**
     * Asynchronously loads and parses the given URL to a KTX file or parses the raw binary data of a KTX file.
     * Returns a promise that will resolve to an object containing the image buffer, width, height and format once loaded,
     * or reject if the URL failed to load or failed to parse the data.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     * <p>
     * The following are part of the KTX format specification but are not supported:
     * <ul>
     *     <li>Big-endian files</li>
     *     <li>Metadata</li>
     *     <li>3D textures</li>
     *     <li>Texture Arrays</li>
     *     <li>Cubemaps</li>
     *     <li>Mipmaps</li>
     * </ul>
     * </p>
     *
     * @exports loadKTX
     *
     * @param {String|Promise.<String>|ArrayBuffer} urlOrBuffer The URL of the binary data, a promise for the URL, or an ArrayBuffer.
     * @param {Object} [headers] HTTP headers to send with the requests.
     * @returns {Promise.<CompressedTextureBuffer>} A promise that will resolve to the requested data when loaded.
     *
     * @exception {RuntimeError} Invalid KTX file.
     * @exception {RuntimeError} File is the wrong endianness.
     * @exception {RuntimeError} glInternalFormat is not a valid format.
     * @exception {RuntimeError} glType must be zero when the texture is compressed.
     * @exception {RuntimeError} The type size for compressed textures must be 1.
     * @exception {RuntimeError} glFormat must be zero when the texture is compressed.
     * @exception {RuntimeError} Generating mipmaps for a compressed texture is unsupported.
     * @exception {RuntimeError} The base internal format must be the same as the format for uncompressed textures.
     * @exception {RuntimeError} 3D textures are not supported.
     * @exception {RuntimeError} Texture arrays are not supported.
     * @exception {RuntimeError} Cubemaps are not supported.
     *
     * @example
     * // load a single URL asynchronously
     * Cesium.loadKTX('some/url').then(function(ktxData) {
     *     var width = ktxData.width;
     *     var height = ktxData.height;
     *     var format = ktxData.internalFormat;
     *     var arrayBufferView = ktxData.bufferView;
     *     // use the data to create a texture
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * @see {@link https://www.khronos.org/opengles/sdk/tools/KTX/file_format_spec/|KTX file format}
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */
    function loadKTX(urlOrBuffer, headers) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(urlOrBuffer)) {
            throw new DeveloperError('urlOrBuffer is required.');
        }
        //>>includeEnd('debug');

        var loadPromise;
        if (urlOrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(urlOrBuffer)) {
            loadPromise = when.resolve(urlOrBuffer);
        } else {
            loadPromise = loadArrayBuffer(urlOrBuffer, headers);
        }

        return loadPromise.then(function(data) {
            return parseKTX(data);
        });
    }

    var fileIdentifier = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];
    var endiannessTest = 0x04030201;

    var sizeOfUint32 = 4;

    function parseKTX(data) {
        var byteBuffer = new Uint8Array(data);

        var isKTX = true;
        for (var i = 0; i < fileIdentifier.length; ++i) {
            if (fileIdentifier[i] !== byteBuffer[i]) {
                isKTX = false;
                break;
            }
        }

        if (!isKTX) {
            throw new RuntimeError('Invalid KTX file.');
        }

        var view;
        var byteOffset;

        if (defined(data.buffer)) {
            view = new DataView(data.buffer);
            byteOffset = data.byteOffset;
        } else {
            view = new DataView(data);
            byteOffset = 0;
        }

        byteOffset += 12; // skip identifier

        var endianness = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        if (endianness !== endiannessTest) {
            throw new RuntimeError('File is the wrong endianness.');
        }

        var glType = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var glTypeSize = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var glFormat = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var glInternalFormat = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var glBaseInternalFormat = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var pixelWidth = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var pixelHeight = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var pixelDepth = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var numberOfArrayElements = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var numberOfFaces = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var numberOfMipmapLevels = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var bytesOfKeyValueByteSize = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        // skip metadata
        byteOffset += bytesOfKeyValueByteSize;

        var imageSize = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var texture;
        if (defined(data.buffer)) {
            texture = new Uint8Array(data.buffer, byteOffset, imageSize);
        } else {
            texture = new Uint8Array(data, byteOffset, imageSize);
        }

        // Some tools use a sized internal format.
        // See table 2: https://www.opengl.org/sdk/docs/man/html/glTexImage2D.xhtml
        if (glInternalFormat === 0x8051) {         // GL_RGB8
            glInternalFormat = PixelFormat.RGB;
        } else if (glInternalFormat === 0x8058) {  // GL_RGBA8
            glInternalFormat = PixelFormat.RGBA;
        }

        if (!PixelFormat.validate(glInternalFormat)) {
            throw new RuntimeError('glInternalFormat is not a valid format.');
        }

        if (PixelFormat.isCompressedFormat(glInternalFormat)) {
            if (glType !== 0) {
                throw new RuntimeError('glType must be zero when the texture is compressed.');
            }
            if (glTypeSize !== 1) {
                throw new RuntimeError('The type size for compressed textures must be 1.');
            }
            if (glFormat !== 0) {
                throw new RuntimeError('glFormat must be zero when the texture is compressed.');
            }
            if (numberOfMipmapLevels === 0) {
                throw new RuntimeError('Generating mipmaps for a compressed texture is unsupported.');
            }
        } else {
            if (glBaseInternalFormat !== glFormat) {
                throw new RuntimeError('The base internal format must be the same as the format for uncompressed textures.');
            }
        }

        if (pixelDepth !== 0) {
            throw new RuntimeError('3D textures are unsupported.');
        }

        if (numberOfArrayElements !== 0) {
            throw new RuntimeError('Texture arrays are unsupported.');
        }
        if (numberOfFaces !== 1) {
            throw new RuntimeError('Cubemaps are unsupported.');
        }

        // Only use the level 0 mipmap
        if (PixelFormat.isCompressedFormat(glInternalFormat) && numberOfMipmapLevels > 1) {
            var levelSize = PixelFormat.compressedTextureSize(glInternalFormat, pixelWidth, pixelHeight);
            texture = texture.slice(0, levelSize);
        }

        return new CompressedTextureBuffer(glInternalFormat, pixelWidth, pixelHeight, texture);
    }

    return loadKTX;
});
