/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian2',
        '../Core/Math',
        './PixelFormat',
        './MipmapHint',
        './TextureMagnificationFilter',
        './TextureMinificationFilter',
        './TextureWrap'
    ], function(
        DeveloperError,
        destroyObject,
        Cartesian2,
        CesiumMath,
        PixelFormat,
        MipmapHint,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Texture
     * @internalConstructor
     *
     * @see Context#createTexture2D
     * @see Context#createTexture2DFromFramebuffer
     */
    var Texture = function(gl, textureFilterAnisotropic, textureTarget, texture, pixelFormat, pixelDatatype, width, height, preMultiplyAlpha) {
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
        this._sampler = undefined;

        this.setSampler();
    };

    /**
     * DOC_TBA
     *
     * @memberof Texture
     *
     * @param {Object} source The source {ImageData}, {HTMLImageElement}, {HTMLCanvasElement}, or {HTMLVideoElement}.
     * @param {Number} xOffset optional
     * @param {Number} yOffset optional
     *
     * @exception {DeveloperError} Cannot call copyFrom when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
     * @exception {DeveloperError} source is required.
     * @exception {DeveloperError} xOffset must be greater than or equal to zero.
     * @exception {DeveloperError} yOffset must be greater than or equal to zero.
     * @exception {DeveloperError} xOffset + source.width must be less than or equal to getWidth().
     * @exception {DeveloperError} yOffset + source.height must be less than or equal to getHeight().
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.copyFrom = function(source, xOffset, yOffset) {
        if (!source) {
            throw new DeveloperError('source is required.');
        }

        xOffset = xOffset || 0;
        yOffset = yOffset || 0;

        var width = source.width;
        var height = source.height;

        if (PixelFormat.isDepthFormat(this._pixelFormat)) {
            throw new DeveloperError('Cannot call copyFrom when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.');
        }

        if (xOffset < 0) {
            throw new DeveloperError('xOffset must be greater than or equal to zero.');
        }

        if (yOffset < 0) {
            throw new DeveloperError('yOffset must be greater than or equal to zero.');
        }

        if (xOffset + width > this._width) {
            throw new DeveloperError('xOffset + source.width must be less than or equal to getWidth().');
        }

        if (yOffset + height > this._height) {
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
            gl.texSubImage2D(target, 0, xOffset, yOffset, width, height, +this._pixelFormat, +this._pixelDatatype, source.arrayBufferView);
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
     * @param {Number} xOffset optional
     * @param {Number} yOffset optional
     * @param {Number} framebufferXOffset optional
     * @param {Number} framebufferYOffset optional
     * @param {Number} width optional
     * @param {Number} height optional
     *
     * @exception {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     * @exception {DeveloperError} xOffset must be greater than or equal to zero.
     * @exception {DeveloperError} yOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferXOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferYOffset must be greater than or equal to zero.
     * @exception {DeveloperError} xOffset + source.width must be less than or equal to getWidth().
     * @exception {DeveloperError} yOffset + source.height must be less than or equal to getHeight().
     */
    Texture.prototype.copyFromFramebuffer = function(xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height) {
        xOffset = xOffset || 0;
        yOffset = yOffset || 0;
        framebufferXOffset = framebufferXOffset || 0;
        framebufferYOffset = framebufferYOffset || 0;
        width = width || this._width;
        height = height || this._height;

        if (PixelFormat.isDepthFormat(this._pixelFormat)) {
            throw new DeveloperError('Cannot call copyFromFramebuffer when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.');
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
            throw new DeveloperError('xOffset + source.width must be less than or equal to getWidth().');
        }

        if (yOffset + height > this._height) {
            throw new DeveloperError('yOffset + source.height must be less than or equal to getHeight().');
        }

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
     * @param {MipmapHint} hint optional.
     *
     * @exception {DeveloperError} Cannot call generateMipmap when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
     * @exception {DeveloperError} hint is invalid.
     * @exception {DeveloperError} This texture's width must be a power of two to call generateMipmap().
     * @exception {DeveloperError} This texture's height must be a power of two to call generateMipmap().
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.generateMipmap = function(hint) {
        if (PixelFormat.isDepthFormat(this._pixelFormat)) {
            throw new DeveloperError('Cannot call generateMipmap when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.');
        }

        if ((this._width > 1) && !CesiumMath.isPowerOfTwo(this._width)) {
            throw new DeveloperError('width must be a power of two to call generateMipmap().');
        } else if ((this._height > 1) && !CesiumMath.isPowerOfTwo(this._height)) {
            throw new DeveloperError('height must be a power of two to call generateMipmap().');
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
    * @memberof Texture
    *
    * @param sampler optional.
    *
    * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
    */
    Texture.prototype.setSampler = function(sampler) {
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
        if (typeof this._textureFilterAnisotropic !== 'undefined') {
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
     * @memberof Texture
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.getSampler = function() {
        return this._sampler;
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
     * DOC_TBA
     * @memberof Texture
     * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
     */
    Texture.prototype.getWidth = function() {
        return this._width;
    };

    /**
     * DOC_TBA
     * @memberof Texture
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
     * DOC_TBA
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
     * @return {Boolean} True if this object was destroyed; otherwise, false.
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
     * @return {undefined}
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