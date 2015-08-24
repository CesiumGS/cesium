/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/PixelFormat',
        './CubeMapFace',
        './MipmapHint',
        './PixelDatatype',
        './TextureMagnificationFilter',
        './TextureMinificationFilter',
        './TextureWrap'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        CesiumMath,
        PixelFormat,
        CubeMapFace,
        MipmapHint,
        PixelDatatype,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
    "use strict";

    /**
     * options.source can be {@link ImageData}, {@link Image}, {@link Canvas}, or {@link Video}.
     * options.context is required
     *
     * @returns {CubeMap} The newly created cube map.
     *
     * @exception {RuntimeError} When options.pixelDatatype is FLOAT, this WebGL implementation must support the OES_texture_float extension.  Check context.floatingPointTexture.
     * @exception {DeveloperError} options.source requires positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ faces.
     * @exception {DeveloperError} Each face in options.sources must have the same width and height.
     * @exception {DeveloperError} options requires a source field to create an initialized cube map or width and height fields to create a blank cube map.
     * @exception {DeveloperError} Width must equal height.
     * @exception {DeveloperError} Width and height must be greater than zero.
     * @exception {DeveloperError} Width and height must be less than or equal to the maximum cube map size.
     * @exception {DeveloperError} Invalid options.pixelFormat.
     * @exception {DeveloperError} options.pixelFormat cannot be DEPTH_COMPONENT or DEPTH_STENCIL.
     * @exception {DeveloperError} Invalid options.pixelDatatype.
     *
     * @see Context#createSampler
     *
     * @private
     */

    var CubeMap = function(options) {

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.context)) {
            throw new DeveloperError('options.context is required.');
        }
        //>>includeEnd('debug');

        var context = options.context;
        var source = options.source;
        var width;
        var height;

        if (defined(source)) {
            var faces = [source.positiveX, source.negativeX, source.positiveY, source.negativeY, source.positiveZ, source.negativeZ];

            //>>includeStart('debug', pragmas.debug);
            if (!faces[0] || !faces[1] || !faces[2] || !faces[3] || !faces[4] || !faces[5]) {
                throw new DeveloperError('options.source requires positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ faces.');
            }
            //>>includeEnd('debug');

            width = faces[0].width;
            height = faces[0].height;

            //>>includeStart('debug', pragmas.debug);
            for ( var i = 1; i < 6; ++i) {
                if ((Number(faces[i].width) !== width) || (Number(faces[i].height) !== height)) {
                    throw new DeveloperError('Each face in options.source must have the same width and height.');
                }
            }
            //>>includeEnd('debug');
        } else {
            width = options.width;
            height = options.height;
        }

        var size = width;
        var pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
        var pixelDatatype = defaultValue(options.pixelDatatype, PixelDatatype.UNSIGNED_BYTE);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(width) || !defined(height)) {
            throw new DeveloperError('options requires a source field to create an initialized cube map or width and height fields to create a blank cube map.');
        }

        if (width !== height) {
            throw new DeveloperError('Width must equal height.');
        }

        if (size <= 0) {
            throw new DeveloperError('Width and height must be greater than zero.');
        }

        if (size > context._maximumCubeMapSize) {
            throw new DeveloperError('Width and height must be less than or equal to the maximum cube map size (' + context._maximumCubeMapSize + ').  Check maximumCubeMapSize.');
        }

        if (!PixelFormat.validate(pixelFormat)) {
            throw new DeveloperError('Invalid options.pixelFormat.');
        }

        if (PixelFormat.isDepthFormat(pixelFormat)) {
            throw new DeveloperError('options.pixelFormat cannot be DEPTH_COMPONENT or DEPTH_STENCIL.');
        }

        if (!PixelDatatype.validate(pixelDatatype)) {
            throw new DeveloperError('Invalid options.pixelDatatype.');
        }
        //>>includeEnd('debug');

        if ((pixelDatatype === PixelDatatype.FLOAT) && !context.floatingPointTexture) {
            throw new DeveloperError('When options.pixelDatatype is FLOAT, this WebGL implementation must support the OES_texture_float extension.');
        }

        // Use premultiplied alpha for opaque textures should perform better on Chrome:
        // http://media.tojicode.com/webglCamp4/#20
        var preMultiplyAlpha = options.preMultiplyAlpha || ((pixelFormat === PixelFormat.RGB) || (pixelFormat === PixelFormat.LUMINANCE));
        var flipY = defaultValue(options.flipY, true);

        var gl = context._gl;
        var textureTarget = gl.TEXTURE_CUBE_MAP;
        var texture = gl.createTexture();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(textureTarget, texture);

        function createFace(target, sourceFace) {
            if (sourceFace.arrayBufferView) {
                gl.texImage2D(target, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, sourceFace.arrayBufferView);
            } else {
                gl.texImage2D(target, 0, pixelFormat, pixelFormat, pixelDatatype, sourceFace);
            }
        }

        if (defined(source)) {
            // TODO: _gl.pixelStorei(_gl._UNPACK_ALIGNMENT, 4);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

            createFace(gl.TEXTURE_CUBE_MAP_POSITIVE_X, source.positiveX);
            createFace(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, source.negativeX);
            createFace(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, source.positiveY);
            createFace(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, source.negativeY);
            createFace(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, source.positiveZ);
            createFace(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, source.negativeZ);
        } else {
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, null);
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, null);
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, null);
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, null);
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, null);
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, null);
        }
        gl.bindTexture(textureTarget, null);

        this._gl = gl;
        this._textureFilterAnisotropic = context._textureFilterAnisotropic;
        this._textureTarget = textureTarget;
        this._texture = texture;
        this._pixelFormat = pixelFormat;
        this._pixelDatatype = pixelDatatype;
        this._size = size;
        this._preMultiplyAlpha = preMultiplyAlpha;
        this._flipY = flipY;
        this._sampler = undefined;

        this._positiveX = new CubeMapFace(gl, texture, textureTarget, gl.TEXTURE_CUBE_MAP_POSITIVE_X, pixelFormat, pixelDatatype, size, preMultiplyAlpha, flipY);
        this._negativeX = new CubeMapFace(gl, texture, textureTarget, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, pixelFormat, pixelDatatype, size, preMultiplyAlpha, flipY);
        this._positiveY = new CubeMapFace(gl, texture, textureTarget, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, pixelFormat, pixelDatatype, size, preMultiplyAlpha, flipY);
        this._negativeY = new CubeMapFace(gl, texture, textureTarget, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, pixelFormat, pixelDatatype, size, preMultiplyAlpha, flipY);
        this._positiveZ = new CubeMapFace(gl, texture, textureTarget, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, pixelFormat, pixelDatatype, size, preMultiplyAlpha, flipY);
        this._negativeZ = new CubeMapFace(gl, texture, textureTarget, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, pixelFormat, pixelDatatype, size, preMultiplyAlpha, flipY);

        this.sampler = undefined;
    };

    defineProperties(CubeMap.prototype, {
        positiveX : {
            get : function() {
                return this._positiveX;
            }
        },
        negativeX : {
            get : function() {
                return this._negativeX;
            }
        },
        positiveY : {
            get : function() {
                return this._positiveY;
            }
        },
        negativeY : {
            get : function() {
                return this._negativeY;
            }
        },
        positiveZ : {
            get : function() {
                return this._positiveZ;
            }
        },
        negativeZ : {
            get : function() {
                return this._negativeZ;
            }
        },
        sampler : {
            get : function() {
                return this._sampler;
            },
            set : function(sampler) {
                var samplerDefined = true;
                if (!defined(sampler)) {
                    samplerDefined = false;
                    var minFilter = TextureMinificationFilter.LINEAR;
                    var magFilter = TextureMagnificationFilter.LINEAR;
                    if (this._pixelDatatype === PixelDatatype.FLOAT) {
                        minFilter = TextureMinificationFilter.NEAREST;
                        magFilter = TextureMagnificationFilter.NEAREST;
                    }

                    sampler = {
                        wrapS : TextureWrap.CLAMP_TO_EDGE,
                        wrapT : TextureWrap.CLAMP_TO_EDGE,
                        minificationFilter : minFilter,
                        magnificationFilter : magFilter,
                        maximumAnisotropy : 1.0
                    };
                }

                if (this._pixelDatatype === PixelDatatype.FLOAT) {
                    if (sampler.minificationFilter !== TextureMinificationFilter.NEAREST &&
                            sampler.minificationFilter !== TextureMinificationFilter.NEAREST_MIPMAP_NEAREST) {
                        throw new DeveloperError('Only NEAREST and NEAREST_MIPMAP_NEAREST minification filters are supported for floating point textures.');
                    }

                    if (sampler.magnificationFilter !== TextureMagnificationFilter.NEAREST) {
                        throw new DeveloperError('Only the NEAREST magnification filter is supported for floating point textures.');
                    }
                }

                var gl = this._gl;
                var target = this._textureTarget;

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(target, this._texture);
                gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, sampler.minificationFilter);
                gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, sampler.magnificationFilter);
                gl.texParameteri(target, gl.TEXTURE_WRAP_S, sampler.wrapS);
                gl.texParameteri(target, gl.TEXTURE_WRAP_T, sampler.wrapT);
                if (defined(this._textureFilterAnisotropic)) {
                    gl.texParameteri(target, this._textureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT, sampler.maximumAnisotropy);
                }
                gl.bindTexture(target, null);

                this._sampler = !samplerDefined ? undefined : {
                    wrapS : sampler.wrapS,
                    wrapT : sampler.wrapT,
                    minificationFilter : sampler.minificationFilter,
                    magnificationFilter : sampler.magnificationFilter,
                    maximumAnisotropy : sampler.maximumAnisotropy
                };
            }
        },
        pixelFormat: {
            get : function() {
                return this._pixelFormat;
            }
        },
        pixelDatatype : {
            get : function() {
                return this._pixelDatatype;
            }
        },
        width : {
            get : function() {
                return this._size;
            }
        },
        height: {
            get : function() {
                return this._size;
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

        _target : {
            get : function() {
                return this._textureTarget;
            }
        }
    });

    /**
     * Generates a complete mipmap chain for each cubemap face.
     *
     * @param {MipmapHint} [hint=MipmapHint.DONT_CARE] A performance vs. quality hint.
     *
     * @exception {DeveloperError} hint is invalid.
     * @exception {DeveloperError} This CubeMap's width must be a power of two to call generateMipmap().
     * @exception {DeveloperError} This CubeMap's height must be a power of two to call generateMipmap().
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     *
     * @example
     * // Generate mipmaps, and then set the sampler so mipmaps are used for
     * // minification when the cube map is sampled.
     * cubeMap.generateMipmap();
     * cubeMap.sampler = context.createSampler({
     *   minificationFilter : Cesium.TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
     * });
     */
    CubeMap.prototype.generateMipmap = function(hint) {
        hint = defaultValue(hint, MipmapHint.DONT_CARE);

        //>>includeStart('debug', pragmas.debug);
        if ((this._size > 1) && !CesiumMath.isPowerOfTwo(this._size)) {
            throw new DeveloperError('width and height must be a power of two to call generateMipmap().');
        }
        if (!MipmapHint.validate(hint)) {
            throw new DeveloperError('hint is invalid.');
        }
        //>>includeEnd('debug');

        var gl = this._gl;
        var target = this._textureTarget;
        gl.hint(gl.GENERATE_MIPMAP_HINT, hint);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);
        gl.generateMipmap(target);
        gl.bindTexture(target, null);
    };

    CubeMap.prototype.isDestroyed = function() {
        return false;
    };

    CubeMap.prototype.destroy = function() {
        this._gl.deleteTexture(this._texture);
        this._positiveX = destroyObject(this._positiveX);
        this._negativeX = destroyObject(this._negativeX);
        this._positiveY = destroyObject(this._positiveY);
        this._negativeY = destroyObject(this._negativeY);
        this._positiveZ = destroyObject(this._positiveZ);
        this._negativeZ = destroyObject(this._negativeZ);
        return destroyObject(this);
    };

    return CubeMap;
});