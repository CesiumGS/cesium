import { Texture } from '../../Source/Cesium.js';
import { TextureCache } from '../../Source/Cesium.js';
import createContext from '../createContext.js';

describe('Renderer/TextureCache', function() {

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    it('adds and removes', function() {
        var cache = new TextureCache();

        var keyword = 'texture';
        var texture = new Texture({
            context : context,
            width : 1.0,
            height : 1.0
        });

        cache.addTexture(keyword, texture);

        expect(cache._textures[keyword].count).toEqual(1);
        expect(cache.numberOfTextures).toEqual(1);

        texture.destroy();
        expect(texture.isDestroyed()).toEqual(false);
        expect(cache.numberOfTextures).toEqual(1);

        cache.destroyReleasedTextures();
        expect(texture.isDestroyed()).toEqual(true);
        expect(cache.numberOfTextures).toEqual(0);

        cache.destroy();
    });

    it('has a cache hit', function() {
        var cache = new TextureCache(context);

        var keyword = 'texture';
        var texture = new Texture({
            context : context,
            width : 1.0,
            height : 1.0
        });

        cache.addTexture(keyword, texture);

        var texture2 = cache.getTexture(keyword);
        expect(texture2).toBeDefined();
        expect(texture).toBe(texture2);
        expect(cache._textures[keyword].count).toEqual(2);
        expect(cache.numberOfTextures).toEqual(1);

        texture.destroy();
        texture2.destroy();
        cache.destroyReleasedTextures();

        expect(texture.isDestroyed()).toEqual(true);
        expect(cache.numberOfTextures).toEqual(0);

        cache.destroy();
    });

    it('avoids thrashing', function() {
        var cache = new TextureCache();

        var keyword = 'texture';
        var texture = new Texture({
            context : context,
            width : 1.0,
            height : 1.0
        });

        cache.addTexture(keyword, texture);

        texture.destroy();

        var texture2 = cache.getTexture(keyword); // still a cache hit

        cache.destroyReleasedTextures(); // does not destroy
        expect(texture.isDestroyed()).toEqual(false);
        expect(texture2.isDestroyed()).toEqual(false);

        texture2.destroy();
        cache.destroyReleasedTextures(); // destroys

        expect(texture.isDestroyed()).toEqual(true);
        expect(texture2.isDestroyed()).toEqual(true);

        cache.destroy();
    });

    it('is destroyed', function() {
        var cache = new TextureCache();

        var keyword = 'texture';
        var texture = new Texture({
            context : context,
            width : 1.0,
            height : 1.0
        });

        cache.addTexture(keyword, texture);

        cache.destroy();

        expect(texture.isDestroyed()).toEqual(true);
        expect(cache.isDestroyed()).toEqual(true);
    });

    it('is not destroyed', function() {
        var cache = new TextureCache();
        expect(cache.isDestroyed()).toEqual(false);
    });
}, 'WebGL');
