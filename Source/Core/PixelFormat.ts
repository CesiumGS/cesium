define([
        '../Renderer/PixelDatatype',
        './freezeObject',
        './WebGLConstants'
    ], function(
        PixelDatatype,
        freezeObject,
        WebGLConstants) {
    'use strict';

    /**
     * The format of a pixel, i.e., the number of components it has and what they represent.
     *
     * @exports PixelFormat
     */
    var PixelFormat = {
        /**
         * A pixel format containing a depth value.
         *
         * @type {Number}
         * @constant
         */
        DEPTH_COMPONENT : WebGLConstants.DEPTH_COMPONENT,

        /**
         * A pixel format containing a depth and stencil value, most often used with {@link PixelDatatype.UNSIGNED_INT_24_8}.
         *
         * @type {Number}
         * @constant
         */
        DEPTH_STENCIL : WebGLConstants.DEPTH_STENCIL,

        /**
         * A pixel format containing an alpha channel.
         *
         * @type {Number}
         * @constant
         */
        ALPHA : WebGLConstants.ALPHA,

        /**
         * A pixel format containing red, green, and blue channels.
         *
         * @type {Number}
         * @constant
         */
        RGB : WebGLConstants.RGB,

        /**
         * A pixel format containing red, green, blue, and alpha channels.
         *
         * @type {Number}
         * @constant
         */
        RGBA : WebGLConstants.RGBA,

        /**
         * A pixel format containing a luminance (intensity) channel.
         *
         * @type {Number}
         * @constant
         */
        LUMINANCE : WebGLConstants.LUMINANCE,

        /**
         * A pixel format containing luminance (intensity) and alpha channels.
         *
         * @type {Number}
         * @constant
         */
        LUMINANCE_ALPHA : WebGLConstants.LUMINANCE_ALPHA,

        /**
         * A pixel format containing red, green, and blue channels that is DXT1 compressed.
         *
         * @type {Number}
         * @constant
         */
        RGB_DXT1 : WebGLConstants.COMPRESSED_RGB_S3TC_DXT1_EXT,

        /**
         * A pixel format containing red, green, blue, and alpha channels that is DXT1 compressed.
         *
         * @type {Number}
         * @constant
         */
        RGBA_DXT1 : WebGLConstants.COMPRESSED_RGBA_S3TC_DXT1_EXT,

        /**
         * A pixel format containing red, green, blue, and alpha channels that is DXT3 compressed.
         *
         * @type {Number}
         * @constant
         */
        RGBA_DXT3 : WebGLConstants.COMPRESSED_RGBA_S3TC_DXT3_EXT,

        /**
         * A pixel format containing red, green, blue, and alpha channels that is DXT5 compressed.
         *
         * @type {Number}
         * @constant
         */
        RGBA_DXT5 : WebGLConstants.COMPRESSED_RGBA_S3TC_DXT5_EXT,

        /**
         * A pixel format containing red, green, and blue channels that is PVR 4bpp compressed.
         *
         * @type {Number}
         * @constant
         */
        RGB_PVRTC_4BPPV1 : WebGLConstants.COMPRESSED_RGB_PVRTC_4BPPV1_IMG,

        /**
         * A pixel format containing red, green, and blue channels that is PVR 2bpp compressed.
         *
         * @type {Number}
         * @constant
         */
        RGB_PVRTC_2BPPV1 : WebGLConstants.COMPRESSED_RGB_PVRTC_2BPPV1_IMG,

        /**
         * A pixel format containing red, green, blue, and alpha channels that is PVR 4bpp compressed.
         *
         * @type {Number}
         * @constant
         */
        RGBA_PVRTC_4BPPV1 : WebGLConstants.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,

        /**
         * A pixel format containing red, green, blue, and alpha channels that is PVR 2bpp compressed.
         *
         * @type {Number}
         * @constant
         */
        RGBA_PVRTC_2BPPV1 : WebGLConstants.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG,

        /**
         * A pixel format containing red, green, and blue channels that is ETC1 compressed.
         *
         * @type {Number}
         * @constant
         */
        RGB_ETC1 : WebGLConstants.COMPRESSED_RGB_ETC1_WEBGL,

        /**
         * @private
         */
        componentsLength : function(pixelFormat) {
            switch (pixelFormat) {
                case PixelFormat.RGB:
                    return 3;
                case PixelFormat.RGBA:
                    return 4;
                case PixelFormat.LUMINANCE_ALPHA:
                    return 2;
                case PixelFormat.ALPHA:
                case PixelFormat.LUMINANCE:
                    return 1;
                default:
                    return 1;
            }
        },

        /**
         * @private
         */
        validate : function(pixelFormat) {
            return pixelFormat === PixelFormat.DEPTH_COMPONENT ||
                   pixelFormat === PixelFormat.DEPTH_STENCIL ||
                   pixelFormat === PixelFormat.ALPHA ||
                   pixelFormat === PixelFormat.RGB ||
                   pixelFormat === PixelFormat.RGBA ||
                   pixelFormat === PixelFormat.LUMINANCE ||
                   pixelFormat === PixelFormat.LUMINANCE_ALPHA ||
                   pixelFormat === PixelFormat.RGB_DXT1 ||
                   pixelFormat === PixelFormat.RGBA_DXT1 ||
                   pixelFormat === PixelFormat.RGBA_DXT3 ||
                   pixelFormat === PixelFormat.RGBA_DXT5 ||
                   pixelFormat === PixelFormat.RGB_PVRTC_4BPPV1 ||
                   pixelFormat === PixelFormat.RGB_PVRTC_2BPPV1 ||
                   pixelFormat === PixelFormat.RGBA_PVRTC_4BPPV1 ||
                   pixelFormat === PixelFormat.RGBA_PVRTC_2BPPV1 ||
                   pixelFormat === PixelFormat.RGB_ETC1;
        },

        /**
         * @private
         */
        isColorFormat : function(pixelFormat) {
            return pixelFormat === PixelFormat.ALPHA ||
                   pixelFormat === PixelFormat.RGB ||
                   pixelFormat === PixelFormat.RGBA ||
                   pixelFormat === PixelFormat.LUMINANCE ||
                   pixelFormat === PixelFormat.LUMINANCE_ALPHA;
        },

        /**
         * @private
         */
        isDepthFormat : function(pixelFormat) {
            return pixelFormat === PixelFormat.DEPTH_COMPONENT ||
                   pixelFormat === PixelFormat.DEPTH_STENCIL;
        },

        /**
         * @private
         */
        isCompressedFormat : function(pixelFormat) {
            return pixelFormat === PixelFormat.RGB_DXT1 ||
                   pixelFormat === PixelFormat.RGBA_DXT1 ||
                   pixelFormat === PixelFormat.RGBA_DXT3 ||
                   pixelFormat === PixelFormat.RGBA_DXT5 ||
                   pixelFormat === PixelFormat.RGB_PVRTC_4BPPV1 ||
                   pixelFormat === PixelFormat.RGB_PVRTC_2BPPV1 ||
                   pixelFormat === PixelFormat.RGBA_PVRTC_4BPPV1 ||
                   pixelFormat === PixelFormat.RGBA_PVRTC_2BPPV1 ||
                   pixelFormat === PixelFormat.RGB_ETC1;
        },

        /**
         * @private
         */
        isDXTFormat : function(pixelFormat) {
            return pixelFormat === PixelFormat.RGB_DXT1 ||
                   pixelFormat === PixelFormat.RGBA_DXT1 ||
                   pixelFormat === PixelFormat.RGBA_DXT3 ||
                   pixelFormat === PixelFormat.RGBA_DXT5;
        },

        /**
         * @private
         */
        isPVRTCFormat : function(pixelFormat) {
            return pixelFormat === PixelFormat.RGB_PVRTC_4BPPV1 ||
                   pixelFormat === PixelFormat.RGB_PVRTC_2BPPV1 ||
                   pixelFormat === PixelFormat.RGBA_PVRTC_4BPPV1 ||
                   pixelFormat === PixelFormat.RGBA_PVRTC_2BPPV1;
        },

        /**
         * @private
         */
        isETC1Format : function(pixelFormat) {
            return pixelFormat === PixelFormat.RGB_ETC1;
        },

        /**
         * @private
         */
        compressedTextureSizeInBytes : function(pixelFormat, width, height) {
            switch (pixelFormat) {
                case PixelFormat.RGB_DXT1:
                case PixelFormat.RGBA_DXT1:
                case PixelFormat.RGB_ETC1:
                    return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 8;

                case PixelFormat.RGBA_DXT3:
                case PixelFormat.RGBA_DXT5:
                    return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 16;

                case PixelFormat.RGB_PVRTC_4BPPV1:
                case PixelFormat.RGBA_PVRTC_4BPPV1:
                    return Math.floor((Math.max(width, 8) * Math.max(height, 8) * 4 + 7) / 8);

                case PixelFormat.RGB_PVRTC_2BPPV1:
                case PixelFormat.RGBA_PVRTC_2BPPV1:
                    return Math.floor((Math.max(width, 16) * Math.max(height, 8) * 2 + 7) / 8);

                default:
                    return 0;
            }
        },

        /**
         * @private
         */
        textureSizeInBytes : function(pixelFormat, pixelDatatype, width, height) {
            var componentsLength = PixelFormat.componentsLength(pixelFormat);
            if (PixelDatatype.isPacked(pixelDatatype)) {
                componentsLength = 1;
            }
            return componentsLength * PixelDatatype.sizeInBytes(pixelDatatype) * width * height;
        },

        /**
         * @private
         */
        createTypedArray : function(pixelFormat, pixelDatatype, width, height) {
            var constructor;
            var sizeInBytes = PixelDatatype.sizeInBytes(pixelDatatype);
            if (sizeInBytes === Uint8Array.BYTES_PER_ELEMENT) {
                constructor = Uint8Array;
            } else if (sizeInBytes === Uint16Array.BYTES_PER_ELEMENT) {
                constructor = Uint16Array;
            } else if (sizeInBytes === Float32Array.BYTES_PER_ELEMENT && pixelDatatype === PixelDatatype.FLOAT) {
                constructor = Float32Array;
            } else {
                constructor = Uint32Array;
            }

            var size = PixelFormat.componentsLength(pixelFormat) * width * height;
            return new constructor(size);
        },

        /**
         * @private
         */
        flipY : function(bufferView, pixelFormat, pixelDatatype, width, height) {
            if (height === 1) {
                return bufferView;
            }
            var flipped = PixelFormat.createTypedArray(pixelFormat, pixelDatatype, width, height);
            var numberOfComponents = PixelFormat.componentsLength(pixelFormat);
            var textureWidth = width * numberOfComponents;
            for (var i = 0; i < height; ++i) {
                var row = i * height * numberOfComponents;
                var flippedRow = (height - i - 1) * height * numberOfComponents;
                for (var j = 0; j < textureWidth; ++j) {
                    flipped[flippedRow + j] = bufferView[row + j];
                }
            }
            return flipped;
        }
    };

    return freezeObject(PixelFormat);
});
