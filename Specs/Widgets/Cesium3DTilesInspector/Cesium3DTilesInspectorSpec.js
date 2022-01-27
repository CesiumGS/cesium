import { Ellipsoid } from "../../../Source/Cesium.js";
import { Cesium3DTileset } from "../../../Source/Cesium.js";
import { Globe } from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import { Cesium3DTilesInspector } from "../../../Source/Cesium.js";

describe(
  "Widgets/Cesium3DTilesInspector/Cesium3DTilesInspector",
  function () {
    // Parent tile with content and four child tiles with content
    const tilesetUrl = "./Data/Cesium3DTiles/Tilesets/Tileset/tileset.json";

    let scene;
    beforeAll(function () {
      scene = createScene();
      const ellipsoid = Ellipsoid.UNIT_SPHERE;
      scene.globe = new Globe(ellipsoid);
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("can create and destroy", function () {
      const container = document.createElement("div");
      container.id = "testContainer";
      document.body.appendChild(container);

      const widget = new Cesium3DTilesInspector("testContainer", scene);
      expect(widget.container).toBe(container);
      expect(widget.viewModel._scene).toBe(scene);
      expect(widget.isDestroyed()).toEqual(false);
      widget.destroy();
      expect(widget.isDestroyed()).toEqual(true);

      document.body.removeChild(container);
    });

    it("constructor throws with no element", function () {
      expect(function () {
        return new Cesium3DTilesInspector();
      }).toThrowDeveloperError();
    });

    it("constructor throws with string element that does not exist", function () {
      expect(function () {
        return new Cesium3DTilesInspector("does not exist", scene);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no scene", function () {
      expect(function () {
        return new Cesium3DTilesInspector(document.body);
      }).toThrowDeveloperError();
    });

    describe("logging", function () {
      let widget;
      let container;

      beforeAll(function () {
        container = document.createElement("div");
        container.id = "testContainer";
        document.body.appendChild(container);
        widget = new Cesium3DTilesInspector("testContainer", scene);

        const viewModel = widget.viewModel;
        viewModel.tileset = new Cesium3DTileset({
          url: tilesetUrl,
        });
        return viewModel.tileset.readyPromise;
      });

      afterAll(function () {
        widget.destroy();
        document.body.removeChild(container);
      });
    });
  },
  "WebGL"
);
