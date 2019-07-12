define([
        '../ThirdParty/basis_transcoder',
        '../ThirdParty/when',
        '../Scene/BasisLoader',
        './Check',
        './CompressedTextureBuffer',
        './defined',
        './PixelFormat',
        './Resource',
        './RuntimeError',
        './WebGLConstants'
    ], function(
        basis_transcoder,
        when,
        BasisLoader,
        Check,
        CompressedTextureBuffer,
        defined,
        PixelFormat,
        Resource,
        RuntimeError,
        WebGLConstants) {
    'use strict';

    var initialized = false;
    var basisLoader = new BasisLoader();
    var basis = basisLoader.BASIS();
    /**
     * Describes a compressed texture and contains a compressed texture buffer.
     * @alias KTX2
     * @constructor
     */
    function KTX2() {
    }

    /**
     * Is the transcoder wasm compiled yet.
     *
     * @return bool
     */
    KTX2.prototype.basisReady = function() {
        if (!defined(basis.initializeBasis)) {
            return false;
        } else if (!initialized) {
            basis.initializeBasis();
            initialized = true;
        }
        return true;
    };

    /**
     * Asynchronously loads and parses the given URL to a KTX2 file or parses the raw binary data of a KTX2 file.
     * Returns a promise that will resolve to an object containing the image buffer, width, height and format once loaded,
     * or reject if the URL failed to load or failed to parse the data.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     * <p>
     * The following are part of the KTX2 format specification but are not supported:
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
     * @param {Resource|String|ArrayBuffer} resourceOrUrlOrBuffer The URL of the binary data or an ArrayBuffer.
     * @param {Object} context The render context
     * @returns {Promise.<CompressedTextureBuffer>|undefined} A promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     *
     * @exception {RuntimeError} Invalid KTX2 file.
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
     * https://github.com/KhronosGroup/KTX-Specification/
     * @see {@link https://www.khronos.org/opengles/sdk/tools/KTX/file_format_spec/|KTX file format}
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */
    KTX2.prototype.loadKTX2 = function(resourceOrUrlOrBuffer, context) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('resourceOrUrlOrBuffer', resourceOrUrlOrBuffer);
        //>>includeEnd('debug');

        var loadPromise;
        if (resourceOrUrlOrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(resourceOrUrlOrBuffer)) {
            loadPromise = when.resolve(resourceOrUrlOrBuffer);
        } else {
            var resource = Resource.createIfNeeded(resourceOrUrlOrBuffer);
            loadPromise = resource.fetchArrayBuffer();
        }

        if (!defined(loadPromise)) {
            return undefined;
        }

        return loadPromise.then(function(data) {
            if (defined(data)) {
                return parseKTX2(data, context);
            }
        });
    };

    // TODO: Just use PixelFormat
    // DXT formats, from:
    // // http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_s3tc/
    var COMPRESSED_RGB_S3TC_DXT1_EXT  = 0x83F0;
    // var COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1;
    // var COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83F2;
    var COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3;

    var BASIS_FORMAT = {
        cTFETC1: 0,
        cTFBC1: 1,
        cTFBC4: 2,
        cTFPVRTC1_4_OPAQUE_ONLY: 3,
        cTFBC7_M6_OPAQUE_ONLY: 4,
        cTFETC2: 5,
        cTFBC3: 6,
        cTFBC5: 7
    };

    var BASIS_FORMAT_NAMES = {};
    for (var name in BASIS_FORMAT) {
        if (defined(name)) {
          BASIS_FORMAT_NAMES[BASIS_FORMAT[name]] = name;
        }
    }

    var DXT_FORMAT_MAP = {};
    DXT_FORMAT_MAP[BASIS_FORMAT.cTFBC1] = COMPRESSED_RGB_S3TC_DXT1_EXT;
    DXT_FORMAT_MAP[BASIS_FORMAT.cTFBC3] = COMPRESSED_RGBA_S3TC_DXT5_EXT;

     function parseKTX2(data, context) {
        var result;
        var BasisFile = basis.BasisFile;
        var basisFile = new BasisFile(new Uint8Array(data));
        var width = basisFile.getImageWidth(0, 0);
        var height = basisFile.getImageHeight(0, 0);
        var images = basisFile.getNumImages();
        var levels = basisFile.getNumLevels(0);
        var has_alpha = basisFile.getHasAlpha();
        if (!width || !height || !images || !levels) {
            console.warn('Invalid .basis file');
            basisFile.close();
            basisFile.delete();
            return result;
        }

        var format = BASIS_FORMAT.cTFBC1;
        if (has_alpha)
        {
            format = BASIS_FORMAT.cTFBC3;
            console.log('Decoding .basis data to BC3');
        }
        else
        {
            console.log('Decoding .basis data to BC1');
        }
        if (!basisFile.startTranscoding()) {
            console.warn('startTranscoding failed');
            basisFile.close();
            basisFile.delete();
            return result;
        }
        var dstSize = basisFile.getImageTranscodedSizeInBytes(0, 0, format);
        var dst = new Uint8Array(dstSize);
        if (!basisFile.transcodeImage(dst, 0, 0, format, 1, 0)) {
            console.warn('transcodeImage failed');
            basisFile.close();
            basisFile.delete();
            return result;
        }
        var alignedWidth = (width + 3) & ~3;
        var alignedHeight = (height + 3) & ~3;

        basisFile.close();
        basisFile.delete();
        console.log('width: ' + width);
        console.log('height: ' + height);
        console.log('images: ' + images);
        console.log('first image mipmap levels: ' + levels);
        console.log('has_alpha: ' + has_alpha);

        // TODO: context._gl is prob the WebGLRenderContext, needed for basis init
        if (context._gl.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc') || context._gl.getExtension('WEBGL_compressed_texture_s3tc')) {
            // result = createDxtTexture(context, dst, alignedWidth, alignedHeight, DXT_FORMAT_MAP[format]);
            result = new CompressedTextureBuffer(DXT_FORMAT_MAP[format], alignedWidth, alignedHeight, dst);
        } else {
            // var rgb565Data = dxtToRgb565(new Uint16Array(dst.buffer), 0, alignedWidth, alignedHeight);
            // result = createRgb565Texture(context, rgb565Data, alignedWidth, alignedHeight);
        }
        // result should be 'image' i.e. a CompressedTextureBuffer:
        // image : image,
        // bufferView : image.bufferView,
        // width : image.width,
        // height : image.height,
        // internalFormat : image.internalFormat

        return result;
    }

    // function parseKTX2(data, context) {
    //     var basisLoader = new BasisLoader();
    //     var basis = basisLoader.BASIS();
    //     var deferred = when.defer();
    //     setTimeout(function() {
    //         var result;
    //         basis.initializeBasis();
    //         var BasisFile = basis.BasisFile;
    //         var basisFile = new BasisFile(new Uint8Array(data));
    //         var width = basisFile.getImageWidth(0, 0);
    //         var height = basisFile.getImageHeight(0, 0);
    //         var images = basisFile.getNumImages();
    //         var levels = basisFile.getNumLevels(0);
    //         var has_alpha = basisFile.getHasAlpha();
    //         if (!width || !height || !images || !levels) {
    //           console.warn('Invalid .basis file');
    //           basisFile.close();
    //           basisFile.delete();
    //           deferred.resolve(result);
    //           return;
    //         }
    //
    //         var format = BASIS_FORMAT.cTFBC1;
    //         if (has_alpha)
    //         {
    //             format = BASIS_FORMAT.cTFBC3;
    //             console.log('Decoding .basis data to BC3');
    //         }
    //         else
    //         {
    //             console.log('Decoding .basis data to BC1');
    //         }
    //         if (!basisFile.startTranscoding()) {
    //             console.warn('startTranscoding failed');
    //             basisFile.close();
    //             basisFile.delete();
    //             deferred.resolve(result);
    //             return;
    //         }
    //         var dstSize = basisFile.getImageTranscodedSizeInBytes(0, 0, format);
    //         var dst = new Uint8Array(dstSize);
    //         if (!basisFile.transcodeImage(dst, 0, 0, format, 1, 0)) {
    //             console.warn('transcodeImage failed');
    //             basisFile.close();
    //             basisFile.delete();
    //             deferred.resolve(result);
    //             return;
    //         }
    //         var alignedWidth = (width + 3) & ~3;
    //         var alignedHeight = (height + 3) & ~3;
    //
    //         basisFile.close();
    //         basisFile.delete();
    //         console.log('width: ' + width);
    //         console.log('height: ' + height);
    //         console.log('images: ' + images);
    //         console.log('first image mipmap levels: ' + levels);
    //         console.log('has_alpha: ' + has_alpha);
    //
    //         // TODO: context._gl is prob the WebGLRenderContext, needed for basis init
    //         if (context._gl.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc') || context._gl.getExtension('WEBGL_compressed_texture_s3tc')) {
    //             // result = createDxtTexture(context, dst, alignedWidth, alignedHeight, DXT_FORMAT_MAP[format]);
    //             result = new CompressedTextureBuffer(DXT_FORMAT_MAP[format], alignedWidth, alignedHeight, dst);
    //         } else {
    //             // var rgb565Data = dxtToRgb565(new Uint16Array(dst.buffer), 0, alignedWidth, alignedHeight);
    //             // result = createRgb565Texture(context, rgb565Data, alignedWidth, alignedHeight);
    //         }
    //         // result should be 'image' i.e. a CompressedTextureBuffer:
    //         // image : image,
    //         // bufferView : image.bufferView,
    //         // width : image.width,
    //         // height : image.height,
    //         // internalFormat : image.internalFormat
    //
    //         deferred.resolve(result);
    //     }, 2000);
    //     return deferred;
    // }

    // function createDxtTexture(context, dxtData, width, height, format) {
    //     var gl = context._gl;
    //     var tex = gl.createTexture();
    //     gl.bindTexture(gl.TEXTURE_2D, tex);
    //     gl.compressedTexImage2D(
    //         gl.TEXTURE_2D,
    //         0,
    //         format,
    //         width,
    //         height,
    //         0,
    //         dxtData);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //     //gl.generateMipmap(gl.TEXTURE_2D)
    //     gl.bindTexture(gl.TEXTURE_2D, null);
    //     return tex;
    // }

    // function createRgb565Texture(context, rgb565Data, width, height) {
    //     var gl = context._gl;
    //     var tex = gl.createTexture();
    //     gl.bindTexture(gl.TEXTURE_2D, tex);
    //     gl.texImage2D(
    //         gl.TEXTURE_2D,
    //         0,
    //         gl.RGB,
    //         width,
    //         height,
    //         0,
    //         gl.RGB,
    //         gl.UNSIGNED_SHORT_5_6_5,
    //         rgb565Data);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //     //gl.generateMipmap(gl.TEXTURE_2D)
    //     gl.bindTexture(gl.TEXTURE_2D, null);
    //     return tex;
    // }

    /**
     * Transcodes DXT into RGB565.
     * This is an optimized version of dxtToRgb565Unoptimized() below.
     * Optimizations:
     * 1. Use integer math to compute c2 and c3 instead of floating point
     *    math.  Specifically:
     *      c2 = 5/8 * c0 + 3/8 * c1
     *      c3 = 3/8 * c0 + 5/8 * c1
     *    This is about a 40% performance improvement.  It also appears to
     *    match what hardware DXT decoders do, as the colors produced
     *    by this integer math match what hardware produces, while the
     *    floating point in dxtToRgb565Unoptimized() produce slightly
     *    different colors (for one GPU this was tested on).
     * 2. Unroll the inner loop.  Another ~10% improvement.
     * 3. Compute r0, g0, b0, r1, g1, b1 only once instead of twice.
     *    Another 10% improvement.
     * 4. Use a Uint16Array instead of a Uint8Array.  Another 10% improvement.
     * @param {Uint16Array} src The src DXT bits as a Uint16Array.
     * @param {number} srcByteOffset
     * @param {number} width
     * @param {number} height
     * @return {Uint16Array} dst
     */
    // function dxtToRgb565(src, src16Offset, width, height) {
    //     var c = new Uint16Array(4);
    //     var dst = new Uint16Array(width * height);
    //     // var nWords = (width * height) / 4;
    //     var m = 0;
    //     var dstI = 0;
    //     var i = 0;
    //     var r0 = 0, g0 = 0, b0 = 0, r1 = 0, g1 = 0, b1 = 0;
    //
    //     var blockWidth = width / 4;
    //     var blockHeight = height / 4;
    //     for (var blockY = 0; blockY < blockHeight; blockY++) {
    //         for (var blockX = 0; blockX < blockWidth; blockX++) {
    //             i = src16Offset + 4 * (blockY * blockWidth + blockX);
    //             c[0] = src[i];
    //             c[1] = src[i + 1];
    //
    //             r0 = c[0] & 0x1f;
    //             g0 = c[0] & 0x7e0;
    //             b0 = c[0] & 0xf800;
    //             r1 = c[1] & 0x1f;
    //             g1 = c[1] & 0x7e0;
    //             b1 = c[1] & 0xf800;
    //             // Interpolate between c0 and c1 to get c2 and c3.
    //             // Note that we approximate 1/3 as 3/8 and 2/3 as 5/8 for
    //             // speed.  This also appears to be what the hardware DXT
    //             // decoder in many GPUs does :)
    //
    //             // rg FIXME: This is most likely leading to wrong results vs. a GPU
    //
    //             c[2] = ((5 * r0 + 3 * r1) >> 3)
    //                 | (((5 * g0 + 3 * g1) >> 3) & 0x7e0)
    //                 | (((5 * b0 + 3 * b1) >> 3) & 0xf800);
    //             c[3] = ((5 * r1 + 3 * r0) >> 3)
    //                 | (((5 * g1 + 3 * g0) >> 3) & 0x7e0)
    //                 | (((5 * b1 + 3 * b0) >> 3) & 0xf800);
    //             m = src[i + 2];
    //             dstI = (blockY * 4) * width + blockX * 4;
    //             dst[dstI] = c[m & 0x3];
    //             dst[dstI + 1] = c[(m >> 2) & 0x3];
    //             dst[dstI + 2] = c[(m >> 4) & 0x3];
    //             dst[dstI + 3] = c[(m >> 6) & 0x3];
    //             dstI += width;
    //             dst[dstI] = c[(m >> 8) & 0x3];
    //             dst[dstI + 1] = c[(m >> 10) & 0x3];
    //             dst[dstI + 2] = c[(m >> 12) & 0x3];
    //             dst[dstI + 3] = c[(m >> 14)];
    //             m = src[i + 3];
    //             dstI += width;
    //             dst[dstI] = c[m & 0x3];
    //             dst[dstI + 1] = c[(m >> 2) & 0x3];
    //             dst[dstI + 2] = c[(m >> 4) & 0x3];
    //             dst[dstI + 3] = c[(m >> 6) & 0x3];
    //             dstI += width;
    //             dst[dstI] = c[(m >> 8) & 0x3];
    //             dst[dstI + 1] = c[(m >> 10) & 0x3];
    //             dst[dstI + 2] = c[(m >> 12) & 0x3];
    //             dst[dstI + 3] = c[(m >> 14)];
    //         }
    //     }
    //     return dst;
    // }

    return KTX2;
});
