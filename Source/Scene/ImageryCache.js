/*global define*/
define([
        '../Core/DeveloperError',
        '../Renderer/Texture'
    ],function(
        DeveloperError,
        Texture) {
    "use strict";

    function CacheItem() {
        this.texture = undefined;
    }

    function ReferenceCountedTexture(texture, url, cache) {
        this._texture = texture;
        this._url = url;
        this._cache = cache;
        this._referenceCount = 1;
    }

    //pass through all methods to the underlying texture
    //except for destroy, which decrements the reference count
    Object.keys(Texture.prototype).forEach(function(methodName) {
        if (methodName !== 'destroy') {
            ReferenceCountedTexture.prototype[methodName] = function() {
                var texture = this._texture;
                return texture[methodName].apply(texture, arguments);
            };
        }
    });

    ReferenceCountedTexture.prototype.destroy = function() {
        --this._referenceCount;
        if (this._referenceCount === 0) {
            this._texture.destroy();
            this._cache[this._url] = undefined;
        }
    };

    var ImageryCache = function() {
    };

    ImageryCache.prototype.get = function(url) {
        var cacheItem = this[url];
        if (typeof cacheItem !== 'undefined' && typeof cacheItem.texture !== 'undefined') {
            cacheItem.texture._referenceCount++;
        }
        return cacheItem;
    };

    ImageryCache.prototype.beginAdd = function(url) {
        this[url] = new CacheItem();
    };

    ImageryCache.prototype.finishAdd = function(url, texture) {
        var cacheItem = this[url];
        if (typeof cacheItem === 'undefined') {
            throw new DeveloperError('beginAdd must be called before finishAdd.');
        }

        texture = new ReferenceCountedTexture(texture, url, this);
        cacheItem.texture = texture;
        return texture;
    };

    ImageryCache.prototype.abortAdd = function(url) {
        this[url] = undefined;
    };

    return ImageryCache;
});