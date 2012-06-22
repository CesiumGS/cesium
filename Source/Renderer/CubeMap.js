/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        './MipmapHint',
        './TextureMagnificationFilter',
        './TextureMinificationFilter',
        './TextureWrap'
    ], function(
        DeveloperError,
        destroyObject,
        MipmapHint,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @name CubeMap
     * @internalConstructor
     *
     * @see Context#createCubeMap
     */
    function CubeMap(gl, textureFilterAnisotropic, textureTarget, texture, pixelFormat, pixelDatatype, size, preMultiplyAlpha) {
        this._gl = gl;
        this._textureFilterAnisotropic = textureFilterAnisotropic;
        this._textureTarget = textureTarget;
        this._texture = texture;
        this._pixelFormat = pixelFormat;
        this._pixelDatatype = pixelDatatype;
        this._size = size;
        this._preMultiplyAlpha = preMultiplyAlpha;
        this._sampler = undefined;

        this.setSampler();
    }

    /**
     * DOC_TBA
     *
     * @memberof CubeMap
     *
     * @param {Object} source The source {ImageData}, {HTMLImageElement}, {HTMLCanvasElement}, or {HTMLVideoElement}.
     * @param {Number} xOffset optional
     * @param {Number} yOffset optional
     *
     * @exception {DeveloperError} source is required.
     * @exception {DeveloperError} xOffset must be greater than or equal to zero.
     * @exception {DeveloperError} yOffset must be greater than or equal to zero.
     * @exception {DeveloperError} xOffset + source.width must be less than or equal to getWidth().
     * @exception {DeveloperError} yOffset + source.height must be less than or equal to getHeight().
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype._copyFrom = function(targetFace, source, xOffset, yOffset) {
        if (!source) {
            throw new DeveloperError('source is required.');
        }

        xOffset = xOffset || 0;
        yOffset = yOffset || 0;

        var width = source.width;
        var height = source.height;

        if (xOffset < 0) {
            throw new DeveloperError('xOffset must be greater than or equal to zero.');
        }

        if (yOffset < 0) {
            throw new DeveloperError('yOffset must be greater than or equal to zero.');
        }

        if (xOffset + width > this._size) {
            throw new DeveloperError('xOffset + source.width must be less than or equal to getWidth().');
        }

        if (yOffset + height > this._size) {
            throw new DeveloperError('yOffset + source.height must be less than or equal to getHeight().');
        }

        var gl = this._gl;
        var target = this._textureTarget;

        // TODO: gl.pixelStorei(gl._UNPACK_ALIGNMENT, 4);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this._preMultiplyAlpha);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);

        //Firefox bug: texSubImage2D has overloads and can't resolve our enums, so we use + to explicitly convert to a number.
        if (source.arrayBufferView) {
            gl.texSubImage2D(targetFace, 0, xOffset, yOffset, width, height, +this._pixelFormat, +this._pixelDatatype, source.arrayBufferView);
        } else {
            gl.texSubImage2D(targetFace, 0, xOffset, yOffset, +this._pixelFormat, +this._pixelDatatype, source);
        }

        gl.bindTexture(target, null);
    };

    /**
     * DOC_TBA
     *
     * @memberof CubeMap
     *
     * @param {Number} xOffset optional
     * @param {Number} yOffset optional
     * @param {Number} framebufferXOffset optional
     * @param {Number} framebufferYOffset optional
     * @param {Number} width optional
     * @param {Number} height optional
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     * @exception {DeveloperError} xOffset must be greater than or equal to zero.
     * @exception {DeveloperError} yOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferXOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferYOffset must be greater than or equal to zero.
     * @exception {DeveloperError} xOffset + source.width must be less than or equal to getWidth().
     * @exception {DeveloperError} yOffset + source.height must be less than or equal to getHeight().
     */
    CubeMap.prototype._copyFromFramebuffer = function(targetFace, xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height) {
        xOffset = xOffset || 0;
        yOffset = yOffset || 0;
        framebufferXOffset = framebufferXOffset || 0;
        framebufferYOffset = framebufferYOffset || 0;
        width = width || this._size;
        height = height || this._size;

        if (xOffset < 0) {
            throw new DeveloperError('xOffset must be greater than or equal to zero.');
        }

        if (yOffset < 0) {
            throw new DeveloperError('yOffset must be greater than or equal to zero.');
        }

        if (framebufferXOffset < 0) {
            throw new DeveloperError('framebufferXOffset must be greater than or equal to zero.');
        }

        if (framebufferYOffset < 0) {
            throw new DeveloperError('framebufferYOffset must be greater than or equal to zero.');
        }

        if (xOffset + width > this._size) {
            throw new DeveloperError('xOffset + source.width must be less than or equal to getWidth().');
        }

        if (yOffset + height > this._size) {
            throw new DeveloperError('yOffset + source.height must be less than or equal to getHeight().');
        }

        var gl = this._gl;
        var target = this._textureTarget;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);
        gl.copyTexSubImage2D(targetFace, 0, xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height);
        gl.bindTexture(target, null);
    };

    /**
     * DOC_TBA
     * @memberof CubeMap
     */
    CubeMap.prototype.getPositiveX = function() {
        var that = this;
        return {
            copyFrom : function(source, xOffset, yOffset) {
                that._copyFrom(that._gl.TEXTURE_CUBE_MAP_POSITIVE_X, source, xOffset, yOffset);
            },

            copyFromFramebuffer : function(xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height) {
                that._copyFromFramebuffer(that._gl.TEXTURE_CUBE_MAP_POSITIVE_X, xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height);
            },

            _getTexture : function() {
                return that._texture;
            },

            _getTarget : function() {
                return that._gl.TEXTURE_CUBE_MAP_POSITIVE_X;
            }
        };
    };

    /**
     * DOC_TBA
     * @memberof CubeMap
     */
    CubeMap.prototype.getNegativeX = function() {
        var that = this;
        return {
            copyFrom : function(source, xOffset, yOffset) {
                that._copyFrom(that._gl.TEXTURE_CUBE_MAP_NEGATIVE_X, source, xOffset, yOffset);
            },

            copyFromFramebuffer : function(xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height) {
                that._copyFromFramebuffer(that._gl.TEXTURE_CUBE_MAP_NEGATIVE_X, xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height);
            },

            _getTexture : function() {
                return that._texture;
            },

            _getTarget : function() {
                return that._gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
            }
        };
    };

    /**
     * DOC_TBA
     * @memberof CubeMap
     */
    CubeMap.prototype.getPositiveY = function() {
        var that = this;
        return {
            copyFrom : function(source, xOffset, yOffset) {
                that._copyFrom(that._gl.TEXTURE_CUBE_MAP_POSITIVE_Y, source, xOffset, yOffset);
            },

            copyFromFramebuffer : function(xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height) {
                that._copyFromFramebuffer(that._gl.TEXTURE_CUBE_MAP_POSITIVE_Y, xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height);
            },

            _getTexture : function() {
                return that._texture;
            },

            _getTarget : function() {
                return that._gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
            }
        };
    };

    /**
     * DOC_TBA
     * @memberof CubeMap
     */
    CubeMap.prototype.getNegativeY = function() {
        var that = this;
        return {
            copyFrom : function(source, xOffset, yOffset) {
                that._copyFrom(that._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, source, xOffset, yOffset);
            },

            copyFromFramebuffer : function(xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height) {
                that._copyFromFramebuffer(that._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height);
            },

            _getTexture : function() {
                return that._texture;
            },

            _getTarget : function() {
                return that._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
            }
        };
    };

    /**
     * DOC_TBA
     * @memberof CubeMap
     */
    CubeMap.prototype.getPositiveZ = function() {
        var that = this;
        return {
            copyFrom : function(source, xOffset, yOffset) {
                that._copyFrom(that._gl.TEXTURE_CUBE_MAP_POSITIVE_Z, source, xOffset, yOffset);
            },

            copyFromFramebuffer : function(xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height) {
                that._copyFromFramebuffer(that._gl.TEXTURE_CUBE_MAP_POSITIVE_Z, xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height);
            },

            _getTexture : function() {
                return that._texture;
            },

            _getTarget : function() {
                return that._gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
            }
        };
    };

    /**
     * DOC_TBA
     * @memberof CubeMap
     */
    CubeMap.prototype.getNegativeZ = function() {
        var that = this;
        return {
            copyFrom : function(source, xOffset, yOffset) {
                that._copyFrom(that._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, source, xOffset, yOffset);
            },

            copyFromFramebuffer : function(xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height) {
                that._copyFromFramebuffer(that._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height);
            },

            _getTexture : function() {
                return that._texture;
            },

            _getTarget : function() {
                return that._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
            }
        };
    };

    /**
     * DOC_TBA
     *
     * @memberof CubeMap
     *
     * @param {MipmapHint} hint optional.
     *
     * @exception {DeveloperError} hint is invalid.
     * @exception {DeveloperError} This CubeMap's width must be a power of two to call generateMipmap().
     * @exception {DeveloperError} This CubeMap's height must be a power of two to call generateMipmap().
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.generateMipmap = function(hint) {
        if ((this._size > 1) && (this._size % 2 !== 0)) {
            throw new DeveloperError('width and height must be a power of two to call generateMipmap().');
        }

        hint = hint || MipmapHint.DONT_CARE;
        if (!MipmapHint.validate(hint)) {
            throw new DeveloperError('hint is invalid.');
        }

        var gl = this._gl;
        var target = this._textureTarget;

        gl.hint(gl.GENERATE_MIPMAP_HINT, hint);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);
        gl.generateMipmap(target);
        gl.bindTexture(target, null);
    };

    /**
     * DOC_TBA
     *
     * @memberof CubeMap
     *
     * @param sampler optional.
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.setSampler = function(sampler) {
        var s = sampler || {
            wrapS : TextureWrap.CLAMP,
            wrapT : TextureWrap.CLAMP,
            minificationFilter : TextureMinificationFilter.LINEAR,
            magnificationFilter : TextureMagnificationFilter.LINEAR,
            maximumAnisotropy : 1.0
        };

        var gl = this._gl;
        var target = this._textureTarget;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);
        gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, s.minificationFilter);
        gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, s.magnificationFilter);
        gl.texParameteri(target, gl.TEXTURE_WRAP_S, s.wrapS);
        gl.texParameteri(target, gl.TEXTURE_WRAP_T, s.wrapT);
        if (this._textureFilterAnisotropic) {
            gl.texParameteri(target, this._textureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT, s.maximumAnisotropy);
        }
        gl.bindTexture(target, null);

        this._sampler = {
            wrapS : s.wrapS,
            wrapT : s.wrapT,
            minificationFilter : s.minificationFilter,
            magnificationFilter : s.magnificationFilter,
            maximumAnisotropy : s.maximumAnisotropy
        };
    };

    /**
     * DOC_TBA
     *
     * @memberof CubeMap
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getSampler = function() {
        return this._sampler;
    };

    /**
     * DOC_TBA
     *
     * @memberof CubeMap
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getPixelFormat = function() {
        return this._pixelFormat;
    };

    /**
     * DOC_TBA
     *
     * @memberof CubeMap
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getPixelDatatype = function() {
        return this._pixelDatatype;
    };

    /**
     * DOC_TBA
     *
     * @memberof CubeMap
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getWidth = function() {
        return this._size;
    };

    /**
     * DOC_TBA
     *
     * @memberof CubeMap
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getHeight = function() {
        return this._size;
    };

    /**
     * DOC_TBA
     *
     * @memberof CubeMap
     *
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getPreMultiplyAlpha = function() {
        return this._preMultiplyAlpha;
    };

    CubeMap.prototype._getTexture = function() {
        return this._texture;
    };

    CubeMap.prototype._getTarget = function() {
        return this._textureTarget;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof CubeMap
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see CubeMap.destroy
     */
    CubeMap.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof CubeMap
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This cube map was destroyed, i.e., destroy() was called.
     *
     * @see CubeMap.isDestroyed
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteTextures.xml'>glDeleteTextures</a>
     *
     * @example
     * cubeMap = cubeMap && cubeMap.destroy();
     */
    CubeMap.prototype.destroy = function() {
        this._gl.deleteTexture(this._texture);
        return destroyObject(this);
    };

    return CubeMap;
});