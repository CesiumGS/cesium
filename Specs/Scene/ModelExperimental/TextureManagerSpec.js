import {
  defined,
  Resource,
  TextureManager,
  TextureUniform,
  when,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import pollToPromise from "../../pollToPromise.js";

describe(
  "Scene/ModelExperimental/TextureManager",
  function () {
    var scene;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    function waitForTextureLoad(textureManager, textureId) {
      return pollToPromise(function () {
        scene.renderForSpecs();
        textureManager.update(scene.frameState);
        return defined(textureManager.getTexture(textureId));
      }).then(function () {
        return textureManager.getTexture(textureId);
      });
    }
    var blueUrl = "Data/Images/Blue2x2.png";

    it("constructs", function () {
      var textureManager = new TextureManager();
      expect(textureManager._textures).toEqual({});
      expect(textureManager._loadedImages).toEqual([]);
    });

    it("loads texture from a URL", function () {
      var textureManager = new TextureManager();
      var id = "testTexture";

      textureManager.loadTexture2D(
        id,
        new TextureUniform({
          url: blueUrl,
        })
      );

      return waitForTextureLoad(textureManager, id).then(function (texture) {
        expect(texture.width).toBe(2);
        expect(texture.height).toBe(2);
      });
    });

    it("loads texture from a typed array", function () {
      var textureManager = new TextureManager();
      var id = "testTexture";

      textureManager.loadTexture2D(
        id,
        new TextureUniform({
          typedArray: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]),
          width: 1,
          height: 2,
        })
      );

      return waitForTextureLoad(textureManager, id).then(function (texture) {
        expect(texture.width).toBe(1);
        expect(texture.height).toBe(2);
      });
    });

    it("getTexture returns undefined for unknown texture", function () {
      var textureManager = new TextureManager();
      var texture = textureManager.getTexture("notATexture");
      expect(texture).not.toBeDefined();
    });

    it("sets a defaultTexture on error", function () {
      spyOn(Resource.prototype, "fetchImage").and.returnValue(when.reject());
      var textureManager = new TextureManager();
      var id = "testTexture";

      // Call update first to ensure the default texture is available
      // when the fetchImage() call rejects
      textureManager.update(scene.frameState);
      textureManager.loadTexture2D(
        id,
        new TextureUniform({
          url: "https://example.com/not-a-texture.jpg",
        })
      );
      return waitForTextureLoad(textureManager, id)
        .then(function (texture) {
          var defaultTexture = scene.frameState.context.defaultTexture;
          expect(texture).toBe(defaultTexture);
        })
        .otherwise(console.error);
    });

    it("destroys", function () {
      var textureManager = new TextureManager();
      var id = "testTexture";

      textureManager.loadTexture2D(
        id,
        new TextureUniform({
          url: blueUrl,
        })
      );

      return waitForTextureLoad(textureManager, id).then(function (texture) {
        expect(textureManager.isDestroyed()).toBe(false);
        expect(texture.isDestroyed()).toBe(false);

        textureManager.destroy();
        expect(textureManager.isDestroyed()).toBe(true);
        expect(texture.isDestroyed()).toBe(true);
      });
    });
  },
  "WebGL"
);
