/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
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
        CubeMapFace,
        MipmapHint,
        PixelDatatype,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
    "use strict";

    /**
     * @private
     */
    var CubeMap = function(gl, textureFilterAnisotropic, textureTarget, texture, pixelFormat, pixelDatatype, size, preMultiplyAlpha, flipY) {
        this._gl = gl;
        this._textureFilterAnisotropic = textureFilterAnisotropic;
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