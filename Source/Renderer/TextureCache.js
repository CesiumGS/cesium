import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import destroyObject from '../Core/destroyObject.js';

    /**
     * @private
     */
    function TextureCache() {
        this._textures = {};
        this._numberOfTextures = 0;
        this._texturesToRelease = {};
    }

    defineProperties(TextureCache.prototype, {
        numberOfTextures : {
            get : function() {
                return this._numberOfTextures;
            }
        }
    });

    TextureCache.prototype.getTexture = function(keyword) {
        var cachedTexture = this._textures[keyword];
        if (!defined(cachedTexture)) {
            return undefined;
        }

        // No longer want to release this if it was previously released.
        delete this._texturesToRelease[keyword];

        ++cachedTexture.count;
        return cachedTexture.texture;
    };

    TextureCache.prototype.addTexture = function(keyword, texture) {
        var cachedTexture = {
            texture : texture,
            count : 1
        };

        texture.finalDestroy = texture.destroy;

        var that = this;
        texture.destroy = function() {
            if (--cachedTexture.count === 0) {
                that._texturesToRelease[keyword] = cachedTexture;
            }
        };

        this._textures[keyword] = cachedTexture;
        ++this._numberOfTextures;
    };

    TextureCache.prototype.destroyReleasedTextures = function() {
        var texturesToRelease = this._texturesToRelease;

        for (var keyword in texturesToRelease) {
            if (texturesToRelease.hasOwnProperty(keyword)) {
                var cachedTexture = texturesToRelease[keyword];
                delete this._textures[keyword];
                cachedTexture.texture.finalDestroy();
                --this._numberOfTextures;
            }
        }

        this._texturesToRelease = {};
    };

    TextureCache.prototype.isDestroyed = function() {
        return false;
    };

    TextureCache.prototype.destroy = function() {
        var textures = this._textures;
        for (var keyword in textures) {
            if (textures.hasOwnProperty(keyword)) {
                textures[keyword].texture.finalDestroy();
            }
        }
        return destroyObject(this);
    };
export default TextureCache;
