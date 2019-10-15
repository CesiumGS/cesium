import Check from '../Core/Check.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import DeveloperError from '../Core/DeveloperError.js';
import PixelFormat from '../Core/PixelFormat.js';
import PixelDatatype from './PixelDatatype.js';

    /**
     * @private
     */
    function CubeMapFace(gl, texture, textureTarget, targetFace, pixelFormat, pixelDatatype, size, preMultiplyAlpha, flipY, initialized) {
        this._gl = gl;
        this._texture = texture;
        this._textureTarget = textureTarget;
        this._targetFace = targetFace;
        this._pixelFormat = pixelFormat;
        this._pixelDatatype = pixelDatatype;
        this._size = size;
        this._preMultiplyAlpha = preMultiplyAlpha;
        this._flipY = flipY;
        this._initialized = initialized;
    }

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
        Check.defined('source', source);
        Check.typeOf.number.greaterThanOrEquals('xOffset', xOffset, 0);
        Check.typeOf.number.greaterThanOrEquals('yOffset', yOffset, 0);
        if (xOffset + source.width > this._size) {
            throw new DeveloperError('xOffset + source.width must be less than or equal to width.');
        }
        if (yOffset + source.height > this._size) {
            throw new DeveloperError('yOffset + source.height must be less than or equal to height.');
        }
        //>>includeEnd('debug');

        var gl = this._gl;
        var target = this._textureTarget;
        var targetFace = this._targetFace;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);

        var width = source.width;
        var height = source.height;
        var arrayBufferView = source.arrayBufferView;

        var size = this._size;
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
            if (xOffset === 0 && yOffset === 0 && width === size && height === size) {
                // initialize the entire texture
                if (defined(arrayBufferView)) {
                    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

                    if (flipY) {
                        arrayBufferView = PixelFormat.flipY(arrayBufferView, pixelFormat, pixelDatatype, size, size);
                    }
                    gl.texImage2D(targetFace, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, arrayBufferView);
                } else {
                    // Only valid for DOM-Element uploads
                    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

                    gl.texImage2D(targetFace, 0, pixelFormat, pixelFormat, pixelDatatype, source);
                }
                uploaded = true;
            } else {
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

                // initialize the entire texture to zero
                var bufferView = PixelFormat.createTypedArray(pixelFormat, pixelDatatype, size, size);
                gl.texImage2D(targetFace, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, bufferView);
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
                gl.texSubImage2D(targetFace, 0, xOffset, yOffset, width, height, pixelFormat, pixelDatatype, arrayBufferView);
            } else {
                // Only valid for DOM-Element uploads
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

                // Source: ImageData, HTMLImageElement, HTMLCanvasElement, or HTMLVideoElement
                gl.texSubImage2D(targetFace, 0, xOffset, yOffset, pixelFormat, pixelDatatype, source);
            }
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
     * @exception {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel data type is HALF_FLOAT.
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
        Check.typeOf.number.greaterThanOrEquals('xOffset', xOffset, 0);
        Check.typeOf.number.greaterThanOrEquals('yOffset', yOffset, 0);
        Check.typeOf.number.greaterThanOrEquals('framebufferXOffset', framebufferXOffset, 0);
        Check.typeOf.number.greaterThanOrEquals('framebufferYOffset', framebufferYOffset, 0);
        if (xOffset + width > this._size) {
            throw new DeveloperError('xOffset + source.width must be less than or equal to width.');
        }
        if (yOffset + height > this._size) {
            throw new DeveloperError('yOffset + source.height must be less than or equal to height.');
        }
        if (this._pixelDatatype === PixelDatatype.FLOAT) {
            throw new DeveloperError('Cannot call copyFromFramebuffer when the texture pixel data type is FLOAT.');
        }
        if (this._pixelDatatype === PixelDatatype.HALF_FLOAT) {
            throw new DeveloperError('Cannot call copyFromFramebuffer when the texture pixel data type is HALF_FLOAT.');
        }
        //>>includeEnd('debug');

        var gl = this._gl;
        var target = this._textureTarget;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);
        gl.copyTexSubImage2D(this._targetFace, 0, xOffset, yOffset, framebufferXOffset, framebufferYOffset, width, height);
        gl.bindTexture(target, null);
        this._initialized = true;
    };
export default CubeMapFace;
