import { Resource, SceneMode, SkyBox } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/SkyBox",
  function () {
    let scene;
    let skyBox;
    let loadedImage;

    beforeAll(function () {
      scene = createScene();

      return Resource.fetchImage("./Data/Images/Blue.png").then(function (
        image
      ) {
        loadedImage = image;
      });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.mode = SceneMode.SCENE3D;
    });

    afterEach(function () {
      skyBox = skyBox && skyBox.destroy();
      scene.skyBox = undefined;
    });

    it("draws a sky box from Images", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: loadedImage,
          negativeX: loadedImage,
          positiveY: loadedImage,
          negativeY: loadedImage,
          positiveZ: loadedImage,
          negativeZ: loadedImage,
        },
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.skyBox = skyBox;
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("does not render when show is false", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
        show: false,
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.skyBox = skyBox;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render in 2D", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
      });

      scene.mode = SceneMode.SCENE2D;
      expect(scene).toRender([0, 0, 0, 255]);

      scene.skyBox = skyBox;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render without a render pass", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
      });

      scene.frameState.passes.render = false;

      scene.skyBox = skyBox;

      const command = skyBox.update(scene.frameState);
      expect(command).not.toBeDefined();
    });

    it("gets constructor options", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "positiveX.png",
          negativeX: "negativeX.png",
          positiveY: "positiveY.png",
          negativeY: "negativeY.png",
          positiveZ: "positiveZ.png",
          negativeZ: "negativeZ.png",
        },
        show: false,
      });
      expect(skyBox.sources.positiveX).toEqual("positiveX.png");
      expect(skyBox.sources.negativeX).toEqual("negativeX.png");
      expect(skyBox.sources.positiveY).toEqual("positiveY.png");
      expect(skyBox.sources.negativeY).toEqual("negativeY.png");
      expect(skyBox.sources.positiveZ).toEqual("positiveZ.png");
      expect(skyBox.sources.negativeZ).toEqual("negativeZ.png");
      expect(skyBox.show).toEqual(false);
    });

    it("isDestroyed", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
      });
      expect(skyBox.isDestroyed()).toEqual(false);
      skyBox.destroy();
      expect(skyBox.isDestroyed()).toEqual(true);
      skyBox = undefined;
    });

    it("throws when constructed without positiveX", function () {
      skyBox = new SkyBox({
        sources: {
          negativeX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
      });
      scene.skyBox = skyBox;

      expect(function () {
        return scene.render();
      }).toThrowDeveloperError();
    });

    it("throws when constructed without negativeX", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
      });
      scene.skyBox = skyBox;

      expect(function () {
        return scene.render();
      }).toThrowDeveloperError();
    });

    it("throws when constructed without positiveY", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
      });
      scene.skyBox = skyBox;

      expect(function () {
        return scene.render();
      }).toThrowDeveloperError();
    });

    it("throws when constructed without negativeY", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
      });
      scene.skyBox = skyBox;

      expect(function () {
        return scene.render();
      }).toThrowDeveloperError();
    });

    it("throws when constructed without positiveZ", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
      });
      scene.skyBox = skyBox;

      expect(function () {
        return scene.render();
      }).toThrowDeveloperError();
    });

    it("throws when constructed without negativeZ", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
        },
      });
      scene.skyBox = skyBox;

      expect(function () {
        return scene.render();
      }).toThrowDeveloperError();
    });

    it("throws when constructed when positiveX is a different type", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: loadedImage,
          negativeX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
      });
      scene.skyBox = skyBox;

      expect(function () {
        return scene.render();
      }).toThrowDeveloperError();
    });

    it("throws when constructed when negativeX is a different type", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: loadedImage,
          positiveY: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
      });
      scene.skyBox = skyBox;

      expect(function () {
        return scene.render();
      }).toThrowDeveloperError();
    });

    it("throws when constructed when positiveY is a different type", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: "./Data/Images/Blue.png",
          positiveY: loadedImage,
          negativeY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
      });
      scene.skyBox = skyBox;

      expect(function () {
        return scene.render();
      }).toThrowDeveloperError();
    });

    it("throws when constructed when negativeY is a different type", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          negativeY: loadedImage,
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: "./Data/Images/Blue.png",
        },
      });
      scene.skyBox = skyBox;

      expect(function () {
        return scene.render();
      }).toThrowDeveloperError();
    });

    it("throws when constructed when positiveZ is a different type", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          positiveZ: loadedImage,
          negativeZ: "./Data/Images/Blue.png",
        },
      });
      scene.skyBox = skyBox;

      expect(function () {
        return scene.render();
      }).toThrowDeveloperError();
    });

    it("throws when constructed when negativeZ is a different type", function () {
      skyBox = new SkyBox({
        sources: {
          positiveX: "./Data/Images/Blue.png",
          negativeX: "./Data/Images/Blue.png",
          positiveY: "./Data/Images/Blue.png",
          negativeY: "./Data/Images/Blue.png",
          positiveZ: "./Data/Images/Blue.png",
          negativeZ: loadedImage,
        },
      });
      scene.skyBox = skyBox;

      expect(function () {
        return scene.render();
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
