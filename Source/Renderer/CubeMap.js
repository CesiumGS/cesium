/*global define*/
define([
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/defaultValue',
        '../Core/Math',
        './MipmapHint',
        './PixelDatatype',
        './TextureMagnificationFilter',
        './TextureMinificationFilter',
        './TextureWrap',
        './CubeMapFace'
    ], function(
        defined,
        DeveloperError,
        destroyObject,
        defaultValue,
        CesiumMath,
        MipmapHint,
        PixelDatatype,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        CubeMapFace) {
    "use strict";

    /**
     * A cube map with faces +x, -x, +y, -y, +z, and -z.  Cube maps are used for environment techniques like
     * approximate reflection and refraction as used in the Reflection and Refraction {@link Material}s.
     *
     * @alias CubeMap
     * @internalConstructor
     *
     * @see Context#createCubeMap
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

        this.setSampler();
    };

    /**
     * Returns the +x face of this cube map for modification, rendering to, etc.
     *
     * @memberof CubeMap
     *
     * @returns {CubeMapFace} The +x face of this cube map.
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getPositiveX = function() {
        return this._positiveX;
    };

    /**
     * Returns the -x face of this cube map for modification, rendering to, etc.
     *
     * @memberof CubeMap
     *
     * @returns {CubeMapFace} The -x face of this cube map.
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getNegativeX = function() {
        return this._negativeX;
    };

    /**
     * Returns the +y face of this cube map for modification, rendering to, etc.
     *
     * @memberof CubeMap
     *
     * @returns {CubeMapFace} The +y face of this cube map.
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getPositiveY = function() {
        return this._positiveY;
    };

    /**
     * Returns the -y face of this cube map for modification, rendering to, etc.
     *
     * @memberof CubeMap
     *
     * @returns {CubeMapFace} The -y face of this cube map.
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getNegativeY = function() {
        return this._negativeY;
    };

    /**
     * Returns the +z face of this cube map for modification, rendering to, etc.
     *
     * @memberof CubeMap
     *
     * @returns {CubeMapFace} The +z face of this cube map.
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getPositiveZ = function() {
        return this._positiveZ;
    };

    /**
     * Returns the -z face of this cube map for modification, rendering to, etc.
     *
     * @memberof CubeMap
     *
     * @returns {CubeMapFace} The -z face of this cube map.
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getNegativeZ = function() {
        return this._negativeZ;
    };

    /**
     * Generates a complete mipmap chain for each cubemap face.
     *
     * @memberof CubeMap
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
     * cubeMap.setSampler(context.createSampler({
     *   minificationFilter : Cesium.TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
     * }));
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

    /**
     * DOC_TBA
     *
     * @memberof CubeMap
     *
     * @param [sampler] DOC_TBA
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.setSampler = function(sampler) {
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
     *
     * @memberof CubeMap
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getSampler = function() {
        return this._sampler;
    };

    /**
     * Returns the pixel format of this cube map.  All faces in the same cube map have the same pixel format.
     *
     * @memberof CubeMap
     *
     * @returns {PixelFormat} The pixel format of this cubemap.
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getPixelFormat = function() {
        return this._pixelFormat;
    };

    /**
     * Returns the pixel datatype of this cube map.  All faces in the same cube map have the same pixel datatype.
     *
     * @memberof CubeMap
     *
     * @returns {PixelDatatype} The pixel datatype of this cubemap.
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getPixelDatatype = function() {
        return this._pixelDatatype;
    };

    /**
     * Returns the width, in texels, of faces in this cube map.  All faces in the same cube map have the same width and height, and the width equals the height.
     *
     * @memberof CubeMap
     *
     * @returns {Number} The width, in texels, of faces in this cube map.
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getWidth = function() {
        return this._size;
    };

    /**
     * Returns the height, in texels, of faces in this cube map.  All faces in the same cube map have the same width and height, and the width equals the height.
     *
     * @memberof CubeMap
     *
     * @returns {Number} The height, in texels, of faces in this cube map.
     *
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getHeight = function() {
        return this._size;
    };

    /**
     * Returns true if the cubemap was created with premultiplied alpha (UNPACK_PREMULTIPLY_ALPHA_WEBGL).
     *
     * @memberof CubeMap
     *
     * @returns {Boolean} true if the cubemap was created with premultiplied alpha; otherwise, false.
     *
     * @exception {DeveloperError} This cube map was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getPreMultiplyAlpha = function() {
        return this._preMultiplyAlpha;
    };

    /**
     * Returns true if the source pixels are flipped vertically when cube-map faces are created or updated, i.e.,
     * <code>UNPACK_FLIP_Y_WEBGL</code> is used.
     *
     * @memberof CubeMap
     *
     * @returns {Boolean} True if the source pixels are flipped vertically; otherwise, false.
     *
     * @exception {DeveloperError} This cube map was destroyed, i.e., destroy() was called.
     */
    CubeMap.prototype.getFlipY = function() {
        return this._flipY;
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
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see CubeMap#destroy
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
     * @returns {undefined}
     *
     * @exception {DeveloperError} This cube map was destroyed, i.e., destroy() was called.
     *
     * @see CubeMap#isDestroyed
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