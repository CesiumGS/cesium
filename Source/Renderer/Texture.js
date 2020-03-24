import Cartesian2 from '../Core/Cartesian2.js';
import Check from '../Core/Check.js';
import createGuid from '../Core/createGuid.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import destroyObject from '../Core/destroyObject.js';
import DeveloperError from '../Core/DeveloperError.js';
import CesiumMath from '../Core/Math.js';
import PixelFormat from '../Core/PixelFormat.js';
import WebGLConstants from '../Core/WebGLConstants.js';
import ContextLimits from './ContextLimits.js';
import MipmapHint from './MipmapHint.js';
import PixelDatatype from './PixelDatatype.js';
import Sampler from './Sampler.js';
import TextureMagnificationFilter from './TextureMagnificationFilter.js';
import TextureMinificationFilter from './TextureMinificationFilter.js';

    /**
     * @private
    */
    function Texture(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.context', options.context);
        //>>includeEnd('debug');

        var context = options.context;
        var width = options.width;
        var height = options.height;
        var source = options.source;

        if (defined(source)) {
            if (!defined(width)) {
                width = defaultValue(source.videoWidth, source.width);
            }
            if (!defined(height)) {
                height = defaultValue(source.videoHeight, source.height);
            }
        }

        var pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
        var pixelDatatype = defaultValue(options.pixelDatatype, PixelDatatype.UNSIGNED_BYTE);
        var internalFormat = pixelFormat;

        var isCompressed = PixelFormat.isCompressedFormat(internalFormat);

        if (context.webgl2) {
            if (pixelFormat === PixelFormat.DEPTH_STENCIL) {
                internalFormat = WebGLConstants.DEPTH24_STENCIL8;
            } else if (pixelFormat === PixelFormat.DEPTH_COMPONENT) {
                if (pixelDatatype === PixelDatatype.UNSIGNED_SHORT) {
                    internalFormat = WebGLConstants.DEPTH_COMPONENT16;
                } else if (pixelDatatype === PixelDatatype.UNSIGNED_INT) {
                    internalFormat = WebGLConstants.DEPTH_COMPONENT24;
                }
            }

            if (pixelDatatype === PixelDatatype.FLOAT) {
                switch (pixelFormat) {
                    case PixelFormat.RGBA:
                        internalFormat = WebGLConstants.RGBA32F;
                        break;
                    case PixelFormat.RGB:
                        internalFormat = WebGLConstants.RGB32F;
                        break;
                    case PixelFormat.RG:
                        internalFormat = WebGLConstants.RG32F;
                        break;
                    case PixelFormat.R:
                        internalFormat = WebGLConstants.R32F;
                        break;
                }
            } else if (pixelDatatype === PixelDatatype.HALF_FLOAT) {
                switch (pixelFormat) {
                    case PixelFormat.RGBA:
                        internalFormat = WebGLConstants.RGBA16F;
                        break;
                    case PixelFormat.RGB:
                        internalFormat = WebGLConstants.RGB16F;
                        break;
                    case PixelFormat.RG:
                        internalFormat = WebGLConstants.RG16F;
                        break;
                    case PixelFormat.R:
                        internalFormat = WebGLConstants.R16F;
                        break;
                }
            }
        }

        //>>includeStart('debug', pragmas.debug);
        if (!defined(width) || !defined(height)) {
            throw new DeveloperError('options requires a source field to create an initialized texture or width and height fields to create a blank texture.');
        }

        Check.typeOf.number.greaterThan('width', width, 0);

        if (width > ContextLimits.maximumTextureSize) {
            throw new DeveloperError('Width must be less than or equal to the maximum texture size (' + ContextLimits.maximumTextureSize + ').  Check maximumTextureSize.');
        }

        Check.typeOf.number.greaterThan('height', height, 0);

        if (height > ContextLimits.maximumTextureSize) {
            throw new DeveloperError('Height must be less than or equal to the maximum texture size (' + ContextLimits.maximumTextureSize + ').  Check maximumTextureSize.');
        }

        if (!PixelFormat.validate(pixelFormat)) {
            throw new DeveloperError('Invalid options.pixelFormat.');
        }

        if (!isCompressed && !PixelDatatype.validate(pixelDatatype)) {
            throw new DeveloperError('Invalid options.pixelDatatype.');
        }

        if ((pixelFormat === PixelFormat.DEPTH_COMPONENT) &&
            ((pixelDatatype !== PixelDatatype.UNSIGNED_SHORT) && (pixelDatatype !== PixelDatatype.UNSIGNED_INT))) {
            throw new DeveloperError('When options.pixelFormat is DEPTH_COMPONENT, options.pixelDatatype must be UNSIGNED_SHORT or UNSIGNED_INT.');
        }

        if ((pixelFormat === PixelFormat.DEPTH_STENCIL) && (pixelDatatype !== PixelDatatype.UNSIGNED_INT_24_8)) {
            throw new DeveloperError('When options.pixelFormat is DEPTH_STENCIL, options.pixelDatatype must be UNSIGNED_INT_24_8.');
        }

        if ((pixelDatatype === PixelDatatype.FLOAT) && !context.floatingPointTexture) {
            throw new DeveloperError('When options.pixelDatatype is FLOAT, this WebGL implementation must support the OES_texture_float extension.  Check context.floatingPointTexture.');
        }

        if ((pixelDatatype === PixelDatatype.HALF_FLOAT) && !context.halfFloatingPointTexture) {
            throw new DeveloperError('When options.pixelDatatype is HALF_FLOAT, this WebGL implementation must support the OES_texture_half_float extension. Check context.halfFloatingPointTexture.');
        }

        if (PixelFormat.isDepthFormat(pixelFormat)) {
            if (defined(source)) {
                throw new DeveloperError('When options.pixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL, source cannot be provided.');
            }

            if (!context.depthTexture) {
                throw new DeveloperError('When options.pixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL, this WebGL implementation must support WEBGL_depth_texture.  Check context.depthTexture.');
            }
        }

        if (isCompressed) {
            if (!defined(source) || !defined(source.arrayBufferView)) {
                throw new DeveloperError('When options.pixelFormat is compressed, options.source.arrayBufferView must be defined.');
            }

            if (PixelFormat.isDXTFormat(internalFormat) && !context.s3tc) {
                throw new DeveloperError('When options.pixelFormat is S3TC compressed, this WebGL implementation must support the WEBGL_texture_compression_s3tc extension. Check context.s3tc.');
            } else if (PixelFormat.isPVRTCFormat(internalFormat) && !context.pvrtc) {
                throw new DeveloperError('When options.pixelFormat is PVRTC compressed, this WebGL implementation must support the WEBGL_texture_compression_pvrtc extension. Check context.pvrtc.');
            } else if (PixelFormat.isETC1Format(internalFormat) && !context.etc1) {
                throw new DeveloperError('When options.pixelFormat is ETC1 compressed, this WebGL implementation must support the WEBGL_texture_compression_etc1 extension. Check context.etc1.');
            }

            if (PixelFormat.compressedTextureSizeInBytes(internalFormat, width, height) !== source.arrayBufferView.byteLength) {
                throw new DeveloperError('The byte length of the array buffer is invalid for the compressed texture with the given width and height.');
            }
        }
        //>>includeEnd('debug');

        // Use premultiplied alpha for opaque textures should perform better on Chrome:
        // http://media.tojicode.com/webglCamp4/#20
        var preMultiplyAlpha = options.preMultiplyAlpha || pixelFormat === PixelFormat.RGB || pixelFormat === PixelFormat.LUMINANCE;
        var flipY = defaultValue(options.flipY, true);

        var initialized = true;

        var gl = context._gl;
        var textureTarget = gl.TEXTURE_2D;
        var texture = gl.createTexture();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(textureTarget, texture);

        var unpackAlignment = 4;
        if (defined(source) && defined(source.arrayBufferView) && !isCompressed) {
            unpackAlignment = PixelFormat.alignmentInBytes(pixelFormat, pixelDatatype, width);
        }

        gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment);

        if (defined(source)) {
            if (defined(source.arrayBufferView)) {
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

                // Source: typed array
                var arrayBufferView = source.arrayBufferView;
                if (isCompressed) {
                    gl.compressedTexImage2D(textureTarget, 0, internalFormat, width, height, 0, arrayBufferView);
                } else {
                    if (flipY) {
                        arrayBufferView = PixelFormat.flipY(arrayBufferView, pixelFormat, pixelDatatype, width, height);
                    }
                    gl.texImage2D(textureTarget, 0, internalFormat, width, height, 0, pixelFormat, pixelDatatype, arrayBufferView);
                }
            } else if (defined(source.framebuffer)) {
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

                // Source: framebuffer
                if (source.framebuffer !== context.defaultFramebuffer) {
                    source.framebuffer._bind();
                }

                gl.copyTexImage2D(textureTarget, 0, internalFormat, source.xOffset, source.yOffset, width, height, 0);

                if (source.framebuffer !== context.defaultFramebuffer) {
                    source.framebuffer._unBind();
                }
            } else {
                // Only valid for DOM-Element uploads
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

                // Source: ImageData, HTMLImageElement, HTMLCanvasElement, or HTMLVideoElement
                gl.texImage2D(textureTarget, 0, internalFormat, pixelFormat, pixelDatatype, source);
            }
        } else {
            gl.texImage2D(textureTarget, 0, internalFormat, width, height, 0, pixelFormat, pixelDatatype, null);
            initialized = false;
        }
        gl.bindTexture(textureTarget, null);

        var sizeInBytes;
        if (isCompressed) {
            sizeInBytes = PixelFormat.compressedTextureSizeInBytes(pixelFormat, width, height);
        } else {
            sizeInBytes = PixelFormat.textureSizeInBytes(pixelFormat, pixelDatatype, width, height);
        }

        this._id = createGuid();
        this._context = context;
        this._textureFilterAnisotropic = context._textureFilterAnisotropic;
        this._textureTarget = textureTarget;
        this._texture = texture;
        this._pixelFormat = pixelFormat;
        this._pixelDatatype = pixelDatatype;
        this._width = width;
        this._height = height;
        this._dimensions = new Cartesian2(width, height);
        this._hasMipmap = false;
        this._sizeInBytes = sizeInBytes;
        this._preMultiplyAlpha = preMultiplyAlpha;
        this._flipY = flipY;
        this._initialized = initialized;
        this._sampler = undefined;

        this.sampler = defined(options.sampler) ? options.sampler : new Sampler();
    }

    /**
     * This function is identical to using the Texture constructor except that it can be
     * replaced with a mock/spy in tests.
     * @private
     */
    Texture.create = function(options) {
        return new Texture(options);
    };

    /**
     * Creates a texture, and copies a subimage of the framebuffer to it.  When called without arguments,
     * the texture is the same width and height as the framebuffer and contains its contents.
     *
     * @param {Object} options Object with the following properties:
     * @param {Context} options.context The context in which the Texture gets created.
     * @param {PixelFormat} [options.pixelFormat=PixelFormat.RGB] The texture's internal pixel format.
     * @param {Number} [options.framebufferXOffset=0] An offset in the x direction in the framebuffer where copying begins from.
     * @param {Number} [options.framebufferYOffset=0] An offset in the y direction in the framebuffer where copying begins from.
     * @param {Number} [options.width=canvas.clientWidth] The width of the texture in texels.
     * @param {Number} [options.height=canvas.clientHeight] The height of the texture in texels.
     * @param {Framebuffer} [options.framebuffer=defaultFramebuffer] The framebuffer from which to create the texture.  If this
     *        parameter is not specified, the default framebuffer is used.
     * @returns {Texture} A texture with contents from the framebuffer.
     *
     * @exception {DeveloperError} Invalid pixelFormat.
     * @exception {DeveloperError} pixelFormat cannot be DEPTH_COMPONENT, DEPTH_STENCIL or a compressed format.
     * @exception {DeveloperError} framebufferXOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferYOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferXOffset + width must be less than or equal to canvas.clientWidth.
     * @exception {DeveloperError} framebufferYOffset + height must be less than or equal to canvas.clientHeight.
     *
     *
     * @example
     * // Create a texture with the contents of the framebuffer.
     * var t = Texture.fromFramebuffer({
     *     context : context
     * });
     *
     * @see Sampler
     *
     * @private
     */
    Texture.fromFramebuffer = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.context', options.context);
        //>>includeEnd('debug');

        var context = options.context;
        var gl = context._gl;

        var pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGB);
        var framebufferXOffset = defaultValue(options.framebufferXOffset, 0);
        var framebufferYOffset = defaultValue(options.framebufferYOffset, 0);
        var width = defaultValue(options.width, gl.drawingBufferWidth);
        var height = defaultValue(options.height, gl.drawingBufferHeight);
        var framebuffer = options.framebuffer;

        //>>includeStart('debug', pragmas.debug);
        if (!PixelFormat.validate(pixelFormat)) {
            throw new DeveloperError('Invalid pixelFormat.');
        }
        if (PixelFormat.isDepthFormat(pixelFormat) || PixelFormat.isCompressedFormat(pixelFormat)) {
            throw new DeveloperError('pixelFormat cannot be DEPTH_COMPONENT, DEPTH_STENCIL or a compressed format.');
        }
        Check.defined('options.context', options.context);
        Check.typeOf.number.greaterThanOrEquals('framebufferXOffset', framebufferXOffset, 0);
        Check.typeOf.number.greaterThanOrEquals('framebufferYOffset', framebufferYOffset, 0);
        if (framebufferXOffset + width > gl.drawingBufferWidth) {
            throw new DeveloperError('framebufferXOffset + width must be less than or equal to drawingBufferWidth');
        }
        if (framebufferYOffset + height > gl.drawingBufferHeight) {
            throw new DeveloperError('framebufferYOffset + height must be less than or equal to drawingBufferHeight.');
        }
        //>>includeEnd('debug');

        var texture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : pixelFormat,
            source : {
                framebuffer : defined(framebuffer) ? framebuffer : context.defaultFramebuffer,
                xOffset : framebufferXOffset,
                yOffset : framebufferYOffset,
                width : width,
                height : height
            }
        });

        return texture;
    };

    Object.defineProperties(Texture.prototype, {
        /**
         * A unique id for the texture
         * @memberof Texture.prototype
         * @type {String}
         * @readonly
         * @private
         */
        id : {
            get : function() {
                return this._id;
            }
        },
        /**
         * The sampler to use when sampling this texture.
         * Create a sampler by calling {@link Sampler}.  If this
         * parameter is not specified, a default sampler is used.  The default sampler clamps texture
         * coordinates in both directions, uses linear filtering for both magnification and minification,
         * and uses a maximum anisotropy of 1.0.
         * @memberof Texture.prototype
         * @type {Object}
         */
        sampler : {
            get : function() {
                return this._sampler;
            },
            set : function(sampler) {
                var minificationFilter = sampler.minificationFilter;
                var magnificationFilter = sampler.magnificationFilter;

                var mipmap =
                    (minificationFilter === TextureMinificationFilter.NEAREST_MIPMAP_NEAREST) ||
                    (minificationFilter === TextureMinificationFilter.NEAREST_MIPMAP_LINEAR) ||
                    (minificationFilter === TextureMinificationFilter.LINEAR_MIPMAP_NEAREST) ||
                    (minificationFilter === TextureMinificationFilter.LINEAR_MIPMAP_LINEAR);

                var context = this._context;
                var pixelDatatype = this._pixelDatatype;

                // float textures only support nearest filtering unless the linear extensions are supported, so override the sampler's settings
                if ((pixelDatatype === PixelDatatype.FLOAT && !context.textureFloatLinear) || (pixelDatatype === PixelDatatype.HALF_FLOAT && !context.textureHalfFloatLinear)) {
                    minificationFilter = mipmap ? TextureMinificationFilter.NEAREST_MIPMAP_NEAREST : TextureMinificationFilter.NEAREST;
                    magnificationFilter = TextureMagnificationFilter.NEAREST;
                }

                var gl = context._gl;
                var target = this._textureTarget;

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(target, this._texture);
                gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minificationFilter);
                gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magnificationFilter);
                gl.texParameteri(target, gl.TEXTURE_WRAP_S, sampler.wrapS);
                gl.texParameteri(target, gl.TEXTURE_WRAP_T, sampler.wrapT);
                if (defined(this._textureFilterAnisotropic)) {
                    gl.texParameteri(target, this._textureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT, sampler.maximumAnisotropy);
                }
                gl.bindTexture(target, null);

                this._sampler = sampler;
            }
        },
        pixelFormat : {
            get : function() {
                return this._pixelFormat;
            }
        },
        pixelDatatype : {
            get : function() {
                return this._pixelDatatype;
            }
        },
        dimensions : {
            get : function() {
                return this._dimensions;
            }
        },
        preMultiplyAlpha : {
            get : function() {
                return this._preMultiplyAlpha;
            }
        },
        flipY : {
            get : function() {
                return this._flipY;
            }
        },
        width : {
            get : function() {
                return this._width;
            }
        },
        height : {
            get : function() {
                return this._height;
            }
        },
        sizeInBytes : {
            get : function() {
                if (this._hasMipmap) {
                    return Math.floor(this._sizeInBytes * 4 / 3);
                }
                return this._sizeInBytes;
            }
        },
        _target : {
            get : function() {
                return this._textureTarget;
            }
        }
    });

    /**
     * Copy new image data into this texture, from a source {@link ImageData}, {@link Image}, {@link Canvas}, or {@link Video}.
     * or an object with width, height, and arrayBufferView properties.
     *
     * @param {Object} source The source {@link ImageData}, {@link Image}, {@link Canvas}, or {@link Video},
     *                        or an object with width, height, and arrayBufferView properties.
     * @param {Number} [xOffset=0] The offset in the x direction within the texture to copy into.
     * @param {Number} [yOffset=0] The offset in the y direction within the texture to copy into.
     *
     * @exception {DeveloperError} Cannot call copyFrom when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
     * @exception {DeveloperError} Cannot call copyFrom with a compressed texture pixel format.
     * @exception {DeveloperError} xOffset must be greater than or equal to zero.
     * @exception {DeveloperError} yOffset must be greater than or equal to zero.
     * @exception {DeveloperError} xOffset + source.width must be less than or equal to width.
     * @exception {DeveloperError} yOffset + source.height must be less than or equal to height.
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     *
     * @example
     * texture.copyFrom({
     *   width : 1,
     *   height : 1,
     *   arrayBufferView : new Uint8Array([255, 0, 0, 255])
     * });
     */
    Texture.prototype.copyFrom = function(source, xOffset, yOffset) {
        xOffset = defaultValue(xOffset, 0);
        yOffset = defaultValue(yOffset, 0);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('source', source);
        if (PixelFormat.isDepthFormat(this._pixelFormat)) {
            throw new DeveloperError('Cannot call copyFrom when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.');
        }
        if (PixelFormat.isCompressedFormat(this._pixelFormat)) {
            throw new DeveloperError('Cannot call copyFrom with a compressed texture pixel format.');
        }
        Check.typeOf.number.greaterThanOrEquals('xOffset', xOffset, 0);
        Check.typeOf.number.greaterThanOrEquals('yOffset', yOffset, 0);
        Check.typeOf.number.lessThanOrEquals('xOffset + source.width', xOffset + source.width, this._width);
        Check.typeOf.number.lessThanOrEquals('yOffset + source.height', yOffset + source.height, this._height);
        //>>includeEnd('debug');

        var gl = this._context._gl;
        var target = this._textureTarget;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);

        var width = source.width;
        var height = source.height;
        var arrayBufferView = source.arrayBufferView;

        var textureWidth = this._width;
        var textureHeight = this._height;
        var pixelFormat = this._pixelFormat;
        var pixelDatatype = this._pixelDatatype;

        var preMultiplyAlpha = this._preMultiplyAlpha;
        var flipY = this._flipY;

        var unpackAlignment = 4;
        if (defined(arrayBufferView)) {
            unpackAlignment = PixelFormat.alignmentInBytes(pixelFormat, pixelDatatype, width);
        }

        gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment);

        var uploaded = false;
        if (!this._initialized) {
            if (xOffset === 0 && yOffset === 0 && width === textureWidth && height === textureHeight) {
                // initialize the entire texture
                if (defined(arrayBufferView)) {
                    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

                    if (flipY) {
                        arrayBufferView = PixelFormat.flipY(arrayBufferView, pixelFormat, pixelDatatype, textureWidth, textureHeight);
                    }
                    gl.texImage2D(target, 0, pixelFormat, textureWidth, textureHeight, 0, pixelFormat, pixelDatatype, arrayBufferView);
                } else {
                    // Only valid for DOM-Element uploads
                    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

                    gl.texImage2D(target, 0, pixelFormat, pixelFormat, pixelDatatype, source);
                }
                uploaded = true;
            } else {
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

                // initialize the entire texture to zero
                var bufferView = PixelFormat.createTypedArray(pixelFormat, pixelDatatype, textureWidth, textureHeight);
                gl.texImage2D(target, 0, pixelFormat, textureWidth, textureHeight, 0, pixelFormat, pixelDatatype, bufferView);
            }
            this._initialized = true;
        }

        if (!uploaded) {
            if (defined(arrayBufferView)) {
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

                if (flipY) {
                    arrayBufferView = PixelFormat.flipY(arrayBufferView, pixelFormat, pixelDatatype, width, height);
                }
                gl.texSubImage2D(target, 0, xOffset, yOffset, width, height, pixelFormat, pixelDatatype, arrayBufferView);
            } else {
                // Only valid for DOM-Element uploads
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

                gl.texSubImage2D(target, 0, xOffset, yOffset, pixelFormat, pixelDatatype, source);
            }
        }

        gl.bindTexture(target, null);
    };

    /**
     * @param {Number} [xOffset=0] The offset in the x direction within the texture to copy into.
     * @param {Number} [yOffset=0] The offset in the y direction within the texture to copy into.
     * @param {Number} [framebufferXOffset=0] optional
     * @param {Number} [framebufferYOffset=0] optional
     * @param {Number} [width=width] optional
     * @param {Number} [height=height] optional
     *
     * @exception {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
     * @exception {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel data type is FLOAT.
     * @exception {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel data type is HALF_FLOAT.
     * @exception {DeveloperError} Cannot call copyFrom with a compressed texture pixel format.
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     * @exception {DeveloperError} xOffset must be greater than or equal to zero.
     * @exception {DeveloperError} yOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferXOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferYOffset must be greater than or equal to zero.
     * @exception {DeveloperError} xOffset + width must be less than or equal to width.
     * @exception {DeveloperError} yOffset + height must be less than or equal to height.
     */
    Texture.prototype.copyFromFramebuffer = function(xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height) {
        xOffset = defaultValue(xOffset, 0);
        yOffset = defaultValue(yOffset, 0);
        framebufferXOffset = defaultValue(framebufferXOffset, 0);
        framebufferYOffset = defaultValue(framebufferYOffset, 0);
        width = defaultValue(width, this._width);
        height = defaultValue(height, this._height);

        //>>includeStart('debug', pragmas.debug);
        if (PixelFormat.isDepthFormat(this._pixelFormat)) {
            throw new DeveloperError('Cannot call copyFromFramebuffer when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.');
        }
        if (this._pixelDatatype === PixelDatatype.FLOAT) {
            throw new DeveloperError('Cannot call copyFromFramebuffer when the texture pixel data type is FLOAT.');
        }
        if (this._pixelDatatype === PixelDatatype.HALF_FLOAT) {
            throw new DeveloperError('Cannot call copyFromFramebuffer when the texture pixel data type is HALF_FLOAT.');
        }
        if (PixelFormat.isCompressedFormat(this._pixelFormat)) {
            throw new DeveloperError('Cannot call copyFrom with a compressed texture pixel format.');
        }

        Check.typeOf.number.greaterThanOrEquals('xOffset', xOffset, 0);
        Check.typeOf.number.greaterThanOrEquals('yOffset', yOffset, 0);
        Check.typeOf.number.greaterThanOrEquals('framebufferXOffset', framebufferXOffset, 0);
        Check.typeOf.number.greaterThanOrEquals('framebufferYOffset', framebufferYOffset, 0);
        Check.typeOf.number.lessThanOrEquals('xOffset + width', xOffset + width, this._width);
        Check.typeOf.number.lessThanOrEquals('yOffset + height', yOffset + height, this._height);
        //>>includeEnd('debug');

        var gl = this._context._gl;
        var target = this._textureTarget;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);
        gl.copyTexSubImage2D(target, 0, xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height);
        gl.bindTexture(target, null);
        this._initialized = true;
    };

    /**
     * @param {MipmapHint} [hint=MipmapHint.DONT_CARE] optional.
     *
     * @exception {DeveloperError} Cannot call generateMipmap when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
     * @exception {DeveloperError} Cannot call generateMipmap when the texture pixel format is a compressed format.
     * @exception {DeveloperError} hint is invalid.
     * @exception {DeveloperError} This texture's width must be a power of two to call generateMipmap().
     * @exception {DeveloperError} This texture's height must be a power of two to call generateMipmap().
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.generateMipmap = function(hint) {
        hint = defaultValue(hint, MipmapHint.DONT_CARE);

        //>>includeStart('debug', pragmas.debug);
        if (PixelFormat.isDepthFormat(this._pixelFormat)) {
            throw new DeveloperError('Cannot call generateMipmap when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.');
        }
        if (PixelFormat.isCompressedFormat(this._pixelFormat)) {
            throw new DeveloperError('Cannot call generateMipmap with a compressed pixel format.');
        }
        if (this._width > 1 && !CesiumMath.isPowerOfTwo(this._width)) {
            throw new DeveloperError('width must be a power of two to call generateMipmap().');
        }
        if (this._height > 1 && !CesiumMath.isPowerOfTwo(this._height)) {
            throw new DeveloperError('height must be a power of two to call generateMipmap().');
        }
        if (!MipmapHint.validate(hint)) {
            throw new DeveloperError('hint is invalid.');
        }
        //>>includeEnd('debug');

        this._hasMipmap = true;

        var gl = this._context._gl;
        var target = this._textureTarget;

        gl.hint(gl.GENERATE_MIPMAP_HINT, hint);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);
        gl.generateMipmap(target);
        gl.bindTexture(target, null);
    };

    Texture.prototype.isDestroyed = function() {
        return false;
    };

    Texture.prototype.destroy = function() {
        this._context._gl.deleteTexture(this._texture);
        return destroyObject(this);
    };
export default Texture;
