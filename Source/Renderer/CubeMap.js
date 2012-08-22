/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        './MipmapHint',
        './TextureMagnificationFilter',
        './TextureMinificationFilter',
        './TextureWrap',
        './CubeMapFace'
    ], function(
        DeveloperError,
        destroyObject,
        MipmapHint,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        CubeMapFace) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias CubeMap
     * @internalConstructor
     *
     * @see Context#createCubeMap
     */
    var CubeMap = function(gl, textureFilterAnisotropic, textureTarget, texture, pixelFormat, pixelDatatype, size, preMultiplyAlpha) {
        this._gl = gl;
        this._textureFilterAnisotropic = textureFilterAnisotropic;
        this._textureTarget = textureTarget;
        this._texture = texture;
        this._pixelFormat = pixelFormat;
        this._pixelDatatype = pixelDatatype;
        this._size = size;
        this._preMultiplyAlpha = preMultiplyAlpha;
        this._sampler = undefined;

        this._positiveX = new CubeMapFace(gl, texture, textureTarget, gl.TEXTURE_CUBE_MAP_POSITIVE_X, pixelFormat, pixelDatatype, size, preMultiplyAlpha);
        this._negativeX = new CubeMapFace(gl, texture, textureTarget, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, pixelFormat, pixelDatatype, size, preMultiplyAlpha);
        this._positiveY = new CubeMapFace(gl, texture, textureTarget, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, pixelFormat, pixelDatatype, size, preMultiplyAlpha);
        this._negativeY = new CubeMapFace(gl, texture, textureTarget, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, pixelFormat, pixelDatatype, size, preMultiplyAlpha);
        this._positiveZ = new CubeMapFace(gl, texture, textureTarget, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, pixelFormat, pixelDatatype, size, preMultiplyAlpha);
        this._negativeZ = new CubeMapFace(gl, texture, textureTarget, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, pixelFormat, pixelDatatype, size, preMultiplyAlpha);

        this.setSampler();
    };

    /**
     * DOC_TBA
     * @memberof CubeMap
     */
    CubeMap.prototype.getPositiveX = function() {
        return this._positiveX;
    };

    /**
     * DOC_TBA
     * @memberof CubeMap
     */
    CubeMap.prototype.getNegativeX = function() {
        return this._negativeX;
    };

    /**
     * DOC_TBA
     * @memberof CubeMap
     */
    CubeMap.prototype.getPositiveY = function() {
        return this._positiveY;
    };

    /**
     * DOC_TBA
     * @memberof CubeMap
     */
    CubeMap.prototype.getNegativeY = function() {
        return this._negativeY;
    };

    /**
     * DOC_TBA
     * @memberof CubeMap
     */
    CubeMap.prototype.getPositiveZ = function() {
        return this._positiveZ;
    };

    /**
     * DOC_TBA
     * @memberof CubeMap
     */
    CubeMap.prototype.getNegativeZ = function() {
        return this._negativeZ;
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