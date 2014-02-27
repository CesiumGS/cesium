/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        './MipmapHint',
        './PixelDatatype',
        './PixelFormat',
        './TextureMagnificationFilter',
        './TextureMinificationFilter',
        './TextureWrap'
    ], function(
        Cartesian2,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        CesiumMath,
        MipmapHint,
        PixelDatatype,
        PixelFormat,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
    "use strict";

    /**
     * Create a new Texture object that wraps a WebGL texture.
     *
     * @alias Texture
     * @internalConstructor
     *
     * @see Context#createTexture2D
     * @see Context#createTexture2DFromFramebuffer
     */
    var Texture = function(gl, textureFilterAnisotropic, textureTarget, texture, pixelFormat, pixelDatatype, width, height, preMultiplyAlpha, flipY) {
        this._gl = gl;
        this._textureFilterAnisotropic = textureFilterAnisotropic;
        this._textureTarget = textureTarget;
        this._texture = texture;
        this._pixelFormat = pixelFormat;
        this._pixelDatatype = pixelDatatype;
        this._width = width;
        this._height = height;
        this._dimensions = new Cartesian2(width, height);
        this._preMultiplyAlpha = preMultiplyAlpha;
        this._flipY = flipY;
        this._sampler = undefined;

        this.setSampler();
    };

    /**
     * Copy new image data into this texture, from a source {ImageData}, {HTMLImageElement}, {HTMLCanvasElement}, {HTMLVideoElement},
     * or an object with width, height, and arrayBufferView properties.
     *
     * @memberof Texture
     *
     * @param {Object} source The source {ImageData}, {HTMLImageElement}, {HTMLCanvasElement}, {HTMLVideoElement},
     *                        or an object with width, height, and arrayBufferView properties.
     * @param {Number} [xOffset=0] The offset in the x direction within the texture to copy into.
     * @param {Number} [yOffset=0] The offset in the y direction within the texture to copy into.
     *
     * @exception {DeveloperError} Cannot call copyFrom when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
     * @exception {DeveloperError} xOffset must be greater than or equal to zero.
     * @exception {DeveloperError} yOffset must be greater than or equal to zero.
     * @exception {DeveloperError} xOffset + source.width must be less than or equal to getWidth().
     * @exception {DeveloperError} yOffset + source.height must be less than or equal to getHeight().
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
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        if (PixelFormat.isDepthFormat(this._pixelFormat)) {
            throw new DeveloperError('Cannot call copyFrom when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.');
        }
        if (xOffset < 0) {
            throw new DeveloperError('xOffset must be greater than or equal to zero.');
        }
        if (yOffset < 0) {
            throw new DeveloperError('yOffset must be greater than or equal to zero.');
        }
        if (xOffset +  source.width > this._width) {
            throw new DeveloperError('xOffset + source.width must be less than or equal to getWidth().');
        }
        if (yOffset + source.height > this._height) {
            throw new DeveloperError('yOffset + source.height must be less than or equal to getHeight().');
        }
        //>>includeEnd('debug');

        var gl = this._gl;
        var target = this._textureTarget;

        // TODO: gl.pixelStorei(gl._UNPACK_ALIGNMENT, 4);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this._preMultiplyAlpha);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this._flipY);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);

        if (source.arrayBufferView) {
            gl.texSubImage2D(target, 0, xOffset, yOffset,  source.width, source.height, this._pixelFormat, this._pixelDatatype, source.arrayBufferView);
        } else {
            gl.texSubImage2D(target, 0, xOffset, yOffset, this._pixelFormat, this._pixelDatatype, source);
        }

        gl.bindTexture(target, null);
    };

    /**
     * DOC_TBA
     *
     * @memberof Texture
     *
     * @param {Number} [xOffset=0] The offset in the x direction within the texture to copy into.
     * @param {Number} [yOffset=0] The offset in the y direction within the texture to copy into.
     * @param {Number} [framebufferXOffset=0] optional
     * @param {Number} [framebufferYOffset=0] optional
     * @param {Number} [width=getWidth()] optional
     * @param {Number} [height=getHeight()] optional
     *
     * @exception {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
     * @exception {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel data type is FLOAT.
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     * @exception {DeveloperError} xOffset must be greater than or equal to zero.
     * @exception {DeveloperError} yOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferXOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferYOffset must be greater than or equal to zero.
     * @exception {DeveloperError} xOffset + width must be less than or equal to getWidth().
     * @exception {DeveloperError} yOffset + height must be less than or equal to getHeight().
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
        if (xOffset + width > this._width) {
            throw new DeveloperError('xOffset + width must be less than or equal to getWidth().');
        }
        if (yOffset + height > this._height) {
            throw new DeveloperError('yOffset + height must be less than or equal to getHeight().');
        }
        //>>includeEnd('debug');

        var gl = this._gl;
        var target = this._textureTarget;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);
        gl.copyTexSubImage2D(target, 0, xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height);
        gl.bindTexture(target, null);
    };

    /**
     * DOC_TBA
     *
     * @memberof Texture
     *
     * @param {MipmapHint} [hint=MipmapHint.DONT_CARE] optional.
     *
     * @exception {DeveloperError} Cannot call generateMipmap when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
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

        var gl = this._gl;
        var target = this._textureTarget;

        gl.hint(gl.GENERATE_MIPMAP_HINT, hint);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);
        gl.generateMipmap(target);
        gl.bindTexture(target, null);
    };

    /**
     * Gets the sampler to use when sampling this texture.
     *
     * @memberof Texture
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.getSampler = function() {
        return this._sampler;
    };

    /**
    * Sets the sampler to use when sampling this texture.
    *
    * @memberof Texture
    *
    * @param [sampler] The sampler to use.  Create a sampler by calling {@link Context#createSampler}.  If this
    *                  parameter is not specified, a default sampler is used.  The default sampler clamps texture
    *                  coordinates in both directions, uses linear filtering for both magnification and minifcation,
    *                  and uses a maximum anisotropy of 1.0.
    *
    * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
    *
    * @see Context#createSampler
    */
    Texture.prototype.setSampler = function(sampler) {
        if (!defined(sampler)) {
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

        this._sampler = {
            wrapS : sampler.wrapS,
            wrapT : sampler.wrapT,
            minificationFilter : sampler.minificationFilter,
            magnificationFilter : sampler.magnificationFilter,
            maximumAnisotropy : sampler.maximumAnisotropy
        };
    };

    /**
     * DOC_TBA
     * @memberof Texture
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.getPixelFormat = function() {
        return this._pixelFormat;
    };

    /**
     * DOC_TBA
     * @memberof Texture
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.getPixelDatatype = function() {
        return this._pixelDatatype;
    };

    /**
     * Gets the dimensions of this texture as a {Cartesian2}.
     *
     * @memberof Texture
     *
     * @returns {Cartesian2} The dimensions of this texture.
     *
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.getDimensions = function() {
        return this._dimensions;
    };

    /**
     * DOC_TBA
     * @memberof Texture
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.getPreMultiplyAlpha = function() {
        return this._preMultiplyAlpha;
    };

    /**
     * Returns true if the source pixels are flipped vertically when the texture is created or updated, i.e.,
     * <code>UNPACK_FLIP_Y_WEBGL</code> is used.
     *
     * @memberof Texture
     *
     * @returns {Boolean} True if the source pixels are flipped vertically; otherwise, false.
     *
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.getFlipY = function() {
        return this._flipY;
    };

    /**
     * Gets the width of this texture.
     *
     * @memberof Texture
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.getWidth = function() {
        return this._width;
    };

    /**
     * Gets the height of this texture.
     *
     * @memberof Texture
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.getHeight = function() {
        return this._height;
    };

    Texture.prototype._getTexture = function() {
        return this._texture;
    };

    Texture.prototype._getTarget = function() {
        return this._textureTarget;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Texture
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see Texture#destroy
     */
    Texture.prototype.isDestroyed = function() {
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
     * @memberof Texture
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     *
     * @see Texture#isDestroyed
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteTextures.xml'>glDeleteTextures</a>
     *
     * @example
     * texture = texture && texture.destroy();
     */
    Texture.prototype.destroy = function() {
        this._gl.deleteTexture(this._texture);
        return destroyObject(this);
    };

    return Texture;
});