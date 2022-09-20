import {
  Ellipsoid,
  Globe
} from "../../../engine/index.js";

import {
  Cesium3DTilesInspector
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "Widgets/Cesium3DTilesInspector/Cesium3DTilesInspector",
  function () {
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
  },
  "WebGL"
);
