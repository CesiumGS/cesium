/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Renderer/PixelDatatype',
        '../Renderer/PixelFormat',
        '../Renderer/Texture'
    ], function(
        DeveloperError,
        destroyObject,
        PixelDatatype,
        PixelFormat,
        Texture) {
    "use strict";

    var PooledTexture;
    function createPooledTexture(texture, textureTypeKey, pool) {
        if (typeof PooledTexture === 'undefined') {
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
                if (typeof freeList === 'undefined') {
                    freeList = this._pool._free[this._textureTypeKey] = [];
                }
                freeList.push(this);
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
     * @param {Context} context The context to use to create textures when needed.
     *
     * @see Texture
     */
    var Texture2DPool = function(context) {
        if (typeof context === 'undefined') {
            throw new DeveloperError('context is required.');
        }

        this._context = context;
        this._free = {};
    };

    /**
     * Create a texture.  This function takes the same arguments as {@link Context#createTexture2D},
     * but may return a pooled texture if there are any available.  If a pooled texture is re-used,
     * and no source is provided, the new texture will still retain its old contents.
     *
     * @memberof Texture2DPool
     *
     * @exception {DeveloperError} description is required.
     *
     * @see Context#createTexture2D
     */
    Texture2DPool.prototype.createTexture2D = function(description) {
        if (!description) {
            throw new DeveloperError('description is required.');
        }

        var source = description.source;
        var width = typeof source !== 'undefined' ? source.width : description.width;
        var height = typeof source !== 'undefined' ? source.height : description.height;
        //coerce values to primitive numbers to make textureTypeKey smaller.
        var pixelFormat = +(description.pixelFormat || PixelFormat.RGBA);
        var pixelDatatype = +(description.pixelDatatype || PixelDatatype.UNSIGNED_BYTE);
        var preMultiplyAlpha = +(description.preMultiplyAlpha || pixelFormat === PixelFormat.RGB || pixelFormat === PixelFormat.LUMINANCE);

        var textureTypeKey = JSON.stringify([width, height, pixelFormat, pixelDatatype, preMultiplyAlpha]);

        var freeList = this._free[textureTypeKey];
        if (typeof freeList !== 'undefined' && freeList.length > 0) {
            var texture = freeList.pop();
            if (typeof source !== 'undefined') {
                texture.copyFrom(source);
            }
            return texture;
        }

        return createPooledTexture(this._context.createTexture2D(description), textureTypeKey, this);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Texture2DPool
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see Texture2DPool#destroy
     */
    Texture2DPool.prototype.isDestroyed = function() {
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
     * @memberof Texture2DPool
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Texture2DPool#isDestroyed
     *
     * @example
     * pool = pool && pool.destroy();
     */
    Texture2DPool.prototype.destroy = function() {
        var free = this._free;
        Object.keys(free).forEach(function(textureTypeKey) {
            free[textureTypeKey].forEach(function(texture) {
                texture._texture.destroy();
            });
        });
        return destroyObject(this);
    };

    return Texture2DPool;
});