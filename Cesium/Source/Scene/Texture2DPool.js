/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject'
    ], function(
        DeveloperError,
        destroyObject) {
    "use strict";

    /**
     * A collection of textures with the same width and height. Textures can be added and removed to
     * the texture pool, but the textures will not be destroyed until the entire texture pool is
     * destroyed. The pool can be queried for available textures and be marked as unavailable when
     * the texture is to be used.
     * <br/><br/>
     * Texture pools are useful when textures are being created and released repeatedly.
     *
     * @name Texture2DPool
     * @constructor
     *
     * @exception {DeveloperError} width is required and must be greater than 0.
     * @exception {DeveloperError} height is required and must be greater than 0.
     *
     * @see Texture
     * @see Context#createTexture2D
     */
    function Texture2DPool(width, height) {
        if (typeof width === "undefined" || width <= 0) {
            throw new DeveloperError("width is required and must be greater than 0.", "width");
        }

        if (typeof height === "undefined" || height <= 0) {
            throw new DeveloperError("height is required and must be greater than 0.", "height");
        }

        this._width = width;
        this._height = height;

        this._used = {
            head : null,
            tail : null
        };
        this._unused = {
            head : null,
            tail : null
        };

        this._usedCount = 0;
        this._unusedCount = 0;
    }

    /**
     * Returns the width of every texture in the pool.
     *
     * @memberof Texture2DPool
     *
     * @return {Number} The width of the textures.
     *
     * @see Texture2DPool#getHeight
     */
    Texture2DPool.prototype.getWidth = function() {
        return this._width;
    };

    /**
     * Returns the height of every texture in the pool.
     *
     * @memberof Texture2DPool
     *
     * @return {Number} The height of the textures.
     *
     * @see Texture2DPool#getWidth
     */
    Texture2DPool.prototype.getHeight = function() {
        return this._height;
    };

    Texture2DPool.prototype._addBack = function(list, texture) {
        var node = {
            texture : texture,
            previous : list.tail,
            next : null
        };

        if (list.tail) {
            list.tail.next = node;
            list.tail = node;
        } else {
            list.head = node;
            list.tail = node;
        }
    };

    /**
     * Add a texture to the pool.
     *
     * @memberof Texture2DPool
     *
     * @param {Texture} texture The texture to be added to the pool.
     * @param {Boolean} unused If left undefined or has a falsy value, the texture is currently being used.
     * Otherwise, the texture will be marked as available for use.
     *
     * @exception {DeveloperError} The texture width and/or height does not match that of every
     * other texture in the pool.
     *
     * @see Texture2DPool#remove
     * @see Texture2DPool#removeAll
     * @see Texture2DPool#getTexture
     */
    Texture2DPool.prototype.add = function(texture, unused) {
        if (!texture) {
            return;
        }

        if (texture.getWidth() !== this._width || texture.getHeight() !== this._height) {
            throw new DeveloperError("All textures in this pool must have the same dimensions.", "texture");
        }

        if (unused) {
            this._addBack(this._unused, texture);
            ++this._unusedCount;
        } else {
            this._addBack(this._used, texture);
            ++this._usedCount;
        }
    };

    /**
     * If the texture is already being managed by the texture pool, then it will be marked as available
     * for use. If the texture is not being tracked by the texture pool, then it will be added to the pool
     * and be marked as available for use.
     *
     * @memberof Texture2DPool
     *
     * @param {Texture} texture The texture to be marked as available.
     *
     * @see Texture2DPool#add
     * @see Texture2DPool#removeAll
     * @see Texture2DPool#getTexture
     */
    Texture2DPool.prototype.remove = function(texture) {
        if (!texture) {
            return;
        }

        var node = this._used.head;
        while (node !== null) {
            if (node.texture === texture) {
                break;
            }
            node = node.next;
        }

        if (node) {
            if (node.previous) {
                node.previous.next = node.next;
                if (node.next) {
                    node.next.previous = node.previous;
                } else {
                    this._used.tail = node.previous;
                }
            } else {
                this._used.head = node.next;
                if (this._used.head) {
                    this._used.head.previous = null;
                } else {
                    this._used.tail = null;
                }
            }
            --this._usedCount;
        }

        this.add(texture, true);
    };

    /**
     * Marks all textures in the pool as being available for use.
     *
     * @memberof Texture2DPool
     *
     * @see Texture2DPool#add
     * @see Texture2DPool#remove
     * @see Texture2DPool#getTexture
     */
    Texture2DPool.prototype.removeAll = function() {
        if (this._used.head && this._used.tail) {
            if (this._unused.tail) {
                this._unused.tail.next = this._used.head;
                this._unused.tail = this._used.tail;
            } else {
                this._unused.head = this._used.head;
                this._unused.tail = this._used.tail;
            }

            this._used.head = this._used.tail = null;
        }

        this._unusedCount += this._usedCount;
        this._usedCount = 0;
    };

    /**
     * Returns a boolean indicating whether any textures in the pool are available for use.
     *
     * @memberof Texture2DPool
     *
     * @return {Boolean} <code>true</code> if there are textures available for use and false otherwise.
     *
     * @see Texture2DPool#getTexture
     */
    Texture2DPool.prototype.hasAvailable = function() {
        return this._unusedCount !== 0;
    };

    /**
     * If there is a texture available for use, it will be marked as used and returned.
     *
     * @memberof Texture2DPool
     *
     * @return {Texture} A texture that can be used or <code>null</code> if none are available.
     *
     * @see Texture2DPool#add
     * @see Texture2DPool#remove
     * @see Texture2DPool#removeAll
     * @see Texture2DPool#hasAvailable
     */
    Texture2DPool.prototype.getTexture = function() {
        var node = this._unused.head;

        if (node) {
            this._unused.head = node.next;

            if (this._unused.head) {
                this._unused.head.previous = null;
            } else {
                this._unused.tail = null;
            }

            node.next = this._used.head;

            if (this._used.head) {
                this._used.head.previous = node;
            } else {
                this._used.tail = node;
            }

            this._used.head = node;

            ++this._usedCount;
            --this._unusedCount;

            return node.texture;
        }

        return null;
    };

    /**
     * Returns the number of textures being managed, includes the number in use and the number not in use.
     *
     * @memberof Texture2DPool
     *
     * @return {Number} The number of textures being managed.
     *
     * @see Texture2DPool#getNumInUse
     */
    Texture2DPool.prototype.size = function() {
        return this._usedCount + this._unusedCount;
    };

    /**
     * Returns the number of textures being managed, includes only the number in use.
     *
     * @memberof Texture2DPool
     *
     * @return {Number} The number of textures in use.
     *
     * @see Texture2DPool#size
     */
    Texture2DPool.prototype.getNumInUse = function() {
        return this._usedCount;
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
     * assign the return value (<code>null</code>) to the object as done in the example.
     *
     * @memberof Texture2DPool
     *
     * @return {null}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Texture2DPool#isDestroyed
     *
     * @example
     * pool = pool && pool.destroy();
     */
    Texture2DPool.prototype.destroy = function() {
        var destroyTextures = function(list) {
            var node = list.head;
            while (node !== null) {
                node.texture = node.texture && node.texture.destroy();
                node = node.next;
            }
        };
        destroyTextures(this._used);
        destroyTextures(this._unused);
        return destroyObject(this);
    };

    return Texture2DPool;
});