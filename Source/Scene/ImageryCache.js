/*global define*/
define([
        '../Renderer/Texture'
    ],function(
        Texture) {
    "use strict";

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
        var texture = this[url];
        if (typeof texture !== 'undefined') {
            texture._referenceCount++;
        }
        return texture;
    };

    ImageryCache.prototype.add = function(url, texture) {
        texture = new ReferenceCountedTexture(texture, url, this);
        this[url] = texture;
        return texture;
    };

    return ImageryCache;
});