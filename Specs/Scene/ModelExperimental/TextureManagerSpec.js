import {
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

    var textureManagers = [];
    afterEach(function () {
      for (var i = 0; i < textureManagers.length; i++) {
        var textureManager = textureManagers[i];
        if (!textureManager.isDestroyed()) {
          textureManager.destroy();
        }
      }
      textureManagers.length = 0;
    });

    function waitForTextureLoad(textureManager, textureId) {
      var oldValue = textureManager.getTexture(textureId);
      return pollToPromise(function () {
        scene.renderForSpecs();
        textureManager.update(scene.frameState);

        // Checking that the texture changed allows the waitForTextureLoad()
        // to be called multiple times in one promise chain.
        return textureManager.getTexture(textureId) !== oldValue;
      }).then(function () {
        return textureManager.getTexture(textureId);
      });
    }
    var blueUrl = "Data/Images/Blue2x2.png";
    var greenUrl = "Data/Images/Green1x4.png";

    it("constructs", function () {
      var textureManager = new TextureManager();
      textureManagers.push(textureManager);
      expect(textureManager._textures).toEqual({});
      expect(textureManager._loadedImages).toEqual([]);
    });

    it("loads texture from a URL", function () {
      var textureManager = new TextureManager();
      textureManagers.push(textureManager);
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
      textureManagers.push(textureManager);
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

    it("destroys old texture before adding a new one", function () {
      var textureManager = new TextureManager();
      textureManagers.push(textureManager);
      var id = "testTexture";

      textureManager.loadTexture2D(
        id,
        new TextureUniform({
          url: blueUrl,
        })
      );

      return waitForTextureLoad(textureManager, id).then(function (
        blueTexture
      ) {
        expect(blueTexture.width).toBe(2);
        expect(blueTexture.height).toBe(2);
        expect(blueTexture.isDestroyed()).toBe(false);

        textureManager.loadTexture2D(
          id,
          new TextureUniform({
            url: greenUrl,
          })
        );
        return waitForTextureLoad(textureManager, id).then(function (
          greenTexture
        ) {
          expect(blueTexture.isDestroyed()).toBe(true);
          expect(greenTexture.width).toBe(1);
          expect(greenTexture.height).toBe(4);
          expect(greenTexture.isDestroyed()).toBe(false);
        });
      });
    });

    it("getTexture returns undefined for unknown texture", function () {
      var textureManager = new TextureManager();
      textureManagers.push(textureManager);
      var texture = textureManager.getTexture("notATexture");
      expect(texture).not.toBeDefined();
    });

    it("sets a defaultTexture on error", function () {
      spyOn(Resource.prototype, "fetchImage").and.returnValue(when.reject());
      var textureManager = new TextureManager();
      textureManagers.push(textureManager);
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
      textureManagers.push(textureManager);
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
