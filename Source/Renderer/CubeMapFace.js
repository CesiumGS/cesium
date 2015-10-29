/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        './PixelDatatype'
    ], function(
        defaultValue,
        defineProperties,
        DeveloperError,
        PixelDatatype) {
    "use strict";

    /**
     * @private
     */
    var CubeMapFace = function(gl, texture, textureTarget, targetFace, pixelFormat, pixelDatatype, size, preMultiplyAlpha, flipY) {
        this._gl = gl;
        this._texture = texture;
        this._textureTarget = textureTarget;
        this._targetFace = targetFace;
        this._pixelFormat = pixelFormat;
        this._pixelDatatype = pixelDatatype;
        this._size = size;
        this._preMultiplyAlpha = preMultiplyAlpha;
        this._flipY = flipY;
    };

    defineProperties(CubeMapFace.prototype, {
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
        _target : {
            get : function() {
                return this._targetFace;
            }
        }
    });

    /**
     * Copies texels from the source to the cubemap's face.
     *
     * @param {Object} source The source ImageData, HTMLImageElement, HTMLCanvasElement, HTMLVideoElement, or an object with a width, height, and typed array as shown in the example.
     * @param {Number} [xOffset=0] An offset in the x direction in the cubemap where copying begins.
     * @param {Number} [yOffset=0] An offset in the y direction in the cubemap where copying begins.
     *
     * @exception {DeveloperError} xOffset must be greater than or equal to zero.
     * @exception {DeveloperError} yOffset must be greater than or equal to zero.
     * @exception {DeveloperError} xOffset + source.width must be less than or equal to width.
     * @exception {DeveloperError} yOffset + source.height must be less than or equal to height.
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     *
     * @example
     * // Create a cubemap with 1x1 faces, and make the +x face red.
     * var cubeMap = new CubeMap({
     *   context : context
     *   width : 1,
     *   height : 1
     * });
     * cubeMap.positiveX.copyFrom({
     *   width : 1,
     *   height : 1,
     *   arrayBufferView : new Uint8Array([255, 0, 0, 255])
     * });
     */
    CubeMapFace.prototype.copyFrom = function(source, xOffset, yOffset) {
        xOffset = defaultValue(xOffset, 0);
        yOffset = defaultValue(yOffset, 0);

        //>>includeStart('debug', pragmas.debug);
        if (!source) {
            throw new DeveloperError('source is required.');
        }
        if (xOffset < 0) {
            throw new DeveloperError('xOffset must be greater than or equal to zero.');
        }
        if (yOffset < 0) {
            throw new DeveloperError('yOffset must be greater than or equal to zero.');
        }
        if (xOffset + source.width > this._size) {
            throw new DeveloperError('xOffset + source.width must be less than or equal to width.');
        }
        if (yOffset + source.height > this._size) {
            throw new DeveloperError('yOffset + source.height must be less than or equal to height.');
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
            gl.texSubImage2D(this._targetFace, 0, xOffset, yOffset, source.width, source.height, this._pixelFormat, this._pixelDatatype, source.arrayBufferView);
        } else {
            gl.texSubImage2D(this._targetFace, 0, xOffset, yOffset, this._pixelFormat, this._pixelDatatype, source);
        }

        gl.bindTexture(target, null);
    };

    /**
     * Copies texels from the framebuffer to the cubemap's face.
     *
     * @param {Number} [xOffset=0] An offset in the x direction in the cubemap where copying begins.
     * @param {Number} [yOffset=0] An offset in the y direction in the cubemap where copying begins.
     * @param {Number} [framebufferXOffset=0] An offset in the x direction in the framebuffer where copying begins from.
     * @param {Number} [framebufferYOffset=0] An offset in the y direction in the framebuffer where copying begins from.
     * @param {Number} [width=CubeMap's width] The width of the subimage to copy.
     * @param {Number} [height=CubeMap's height] The height of the subimage to copy.
     *
     * @exception {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel data type is FLOAT.
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     * @exception {DeveloperError} xOffset must be greater than or equal to zero.
     * @exception {DeveloperError} yOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferXOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferYOffset must be greater than or equal to zero.
     * @exception {DeveloperError} xOffset + source.width must be less than or equal to width.
     * @exception {DeveloperError} yOffset + source.height must be less than or equal to height.
     * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
     *
     * @example
     * // Copy the framebuffer contents to the +x cube map face.
     * cubeMap.positiveX.copyFromFramebuffer();
     */
    CubeMapFace.prototype.copyFromFramebuffer = function(xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height) {
        xOffset = defaultValue(xOffset, 0);
        yOffset = defaultValue(yOffset, 0);
        framebufferXOffset = defaultValue(framebufferXOffset, 0);
        framebufferYOffset = defaultValue(framebufferYOffset, 0);
        width = defaultValue(width, this._size);
        height = defaultValue(height, this._size);

        //>>includeStart('debug', pragmas.debug);
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
            throw new DeveloperError('xOffset + source.width must be less than or equal to width.');
        }
        if (yOffset + height > this._size) {
            throw new DeveloperError('yOffset + source.height must be less than or equal to height.');
        }
        if (this._pixelDatatype === PixelDatatype.FLOAT) {
            throw new DeveloperError('Cannot call copyFromFramebuffer when the texture pixel data type is FLOAT.');
        }
        //>>includeEnd('debug');

        var gl = this._gl;
        var target = this._textureTarget;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);
        gl.copyTexSubImage2D(this._targetFace, 0, xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height);
        gl.bindTexture(target, null);
    };

    return CubeMapFace;
});