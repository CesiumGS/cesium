import { Ellipsoid } from "../../../Source/Cesium.js";
import { Globe } from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import { CesiumInspector } from "../../../Source/Cesium.js";

describe(
  "Widgets/CesiumInspector/CesiumInspector",
  function () {
    let scene;
    beforeAll(function () {
      scene = createScene();
      const ellipsoid = Ellipsoid.UNIT_SPHERE;
      const globe = new Globe(ellipsoid);
      scene.globe = globe;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("can create and destroy", function () {
      const container = document.createElement("div");
      container.id = "testContainer";
      document.body.appendChild(container);

      const widget = new CesiumInspector("testContainer", scene);
      expect(widget.container).toBe(container);
      expect(widget.viewModel.scene).toBe(scene);
      expect(widget.isDestroyed()).toEqual(false);
      widget.destroy();
      expect(widget.isDestroyed()).toEqual(true);

      document.body.removeChild(container);
    });

    it("constructor throws with no element", function () {
      expect(function () {
        return new CesiumInspector();
      }).toThrowDeveloperError();
    });

    it("constructor throws with string element that does not exist", function () {
      expect(function () {
        return new CesiumInspector("does not exist", scene);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no scene", function () {
      expect(function () {
        return new CesiumInspector(document.body);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
