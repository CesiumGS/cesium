import { Texture, TextureCache } from "../../index.js";

import createContext from "../../../../Specs/createContext.js";

describe(
  "Renderer/TextureCache",
  function () {
    let context;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    it("adds and removes", function () {
      const cache = new TextureCache();

      const keyword = "texture";
      const texture = new Texture({
        context: context,
        width: 1.0,
        height: 1.0,
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

    it("has a cache hit", function () {
      const cache = new TextureCache(context);

      const keyword = "texture";
      const texture = new Texture({
        context: context,
        width: 1.0,
        height: 1.0,
      });

      cache.addTexture(keyword, texture);

      const texture2 = cache.getTexture(keyword);
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

    it("avoids thrashing", function () {
      const cache = new TextureCache();

      const keyword = "texture";
      const texture = new Texture({
        context: context,
        width: 1.0,
        height: 1.0,
      });

      cache.addTexture(keyword, texture);

      texture.destroy();

      const texture2 = cache.getTexture(keyword); // still a cache hit

      cache.destroyReleasedTextures(); // does not destroy
      expect(texture.isDestroyed()).toEqual(false);
      expect(texture2.isDestroyed()).toEqual(false);

      texture2.destroy();
      cache.destroyReleasedTextures(); // destroys

      expect(texture.isDestroyed()).toEqual(true);
      expect(texture2.isDestroyed()).toEqual(true);

      cache.destroy();
    });

    it("is destroyed", function () {
      const cache = new TextureCache();

      const keyword = "texture";
      const texture = new Texture({
        context: context,
        width: 1.0,
        height: 1.0,
      });

      cache.addTexture(keyword, texture);

      cache.destroy();

      expect(texture.isDestroyed()).toEqual(true);
      expect(cache.isDestroyed()).toEqual(true);
    });

    it("is not destroyed", function () {
      const cache = new TextureCache();
      expect(cache.isDestroyed()).toEqual(false);
    });
  },
  "WebGL"
);
