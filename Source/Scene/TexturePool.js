/*global define*/
define([
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Renderer/PixelDatatype',
        '../Renderer/PixelFormat',
        '../Renderer/Texture'
    ], function(
        defined,
        destroyObject,
        DeveloperError,
        PixelDatatype,
        PixelFormat,
        Texture) {
    "use strict";

    var PooledTexture;
    function createPooledTexture(texture, textureTypeKey, pool) {
        if (!defined(PooledTexture)) {
            // define the class only when needed, so we can use modern
            // language features without breaking legacy browsers at setup time.
            PooledTexture = function(texture, textureTypeKey, pool) {
                this._texture = texture;
                this._textureTypeKey = textureTypeKey;
                this._pool = pool;
            };

            // pass through all methods to the underlying texture
            Object.keys(Texture.prototype).forEach(function(methodName) {
                PooledTexture.prototype[methodName] = function() {
                    var texture = this._texture;
                    return texture[methodName].apply(texture, arguments);
                };
            });

            // except for destroy, which releases back into the pool
            PooledTexture.prototype.destroy = function() {
                var freeList = this._pool._free[this._textureTypeKey];
                if (!defined(freeList)) {
                    freeList = this._pool._free[this._textureTypeKey] = [];
                }

                if (freeList.length >= 8) {
                    this._texture.destroy();
                } else {
                    freeList.push(this);
                }
            };
        }

        return new PooledTexture(texture, textureTypeKey, pool);
    }

    /**
     * A pool of textures.  Textures created from the pool will be released back into the pool
     * when destroy() is called, so future calls to create may re-use a released texture.
     * <br/><br/>
     * Texture pools are useful when textures are being created and destroyed repeatedly.
     *
     * @alias Texture2DPool
     * @constructor
     *
     * @see Texture
     */
    var TexturePool = function() {
        this._free = {};
    };

    /**
     * Create a texture.  This function takes the same arguments as {@link Context#createTexture2D},
     * but may return a pooled texture if there are any available.  If a pooled texture is re-used,
     * and no source is provided, the new texture will still retain its old contents.
     *
     * @memberof TexturePool
     *
     * @param {Context} context The context to use to create textures when needed.
     *
     * @see Context#createTexture2D
     */
    TexturePool.prototype.createTexture2D = function(context, description) {
        //>>includeStart('debug', pragmas.debug);
        if (!description) {
            throw new DeveloperError('description is required.');
        }
        //>>includeEnd('debug');

        var source = description.source;
        var width = defined(source) ? source.width : description.width;
        var height = defined(source) ? source.height : description.height;
        var pixelFormat = (description.pixelFormat || PixelFormat.RGBA);
        var pixelDatatype = (description.pixelDatatype || PixelDatatype.UNSIGNED_BYTE);
        //coerce boolean to number to make textureTypeKey smaller.
        var preMultiplyAlpha = +(description.preMultiplyAlpha || pixelFormat === PixelFormat.RGB || pixelFormat === PixelFormat.LUMINANCE);

        var textureTypeKey = JSON.stringify([width, height, pixelFormat, pixelDatatype, preMultiplyAlpha]);

        var freeList = this._free[textureTypeKey];
        if (defined(freeList) && freeList.length > 0) {
            var texture = freeList.pop();
            if (defined(source)) {
                texture.copyFrom(source);
            }
            return texture;
        }

        return createPooledTexture(context.createTexture2D(description), textureTypeKey, this);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof TexturePool
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see TexturePool#destroy
     */
    TexturePool.prototype.isDestroyed = function() {
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
     * @memberof TexturePool
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see TexturePool#isDestroyed
     *
     * @example
     * pool = pool && pool.destroy();
     */
    TexturePool.prototype.destroy = function() {
        var free = this._free;
        Object.keys(free).forEach(function(textureTypeKey) {
            free[textureTypeKey].forEach(function(texture) {
                texture._texture.destroy();
            });
        });
        return destroyObject(this);
    };

    return TexturePool;
});