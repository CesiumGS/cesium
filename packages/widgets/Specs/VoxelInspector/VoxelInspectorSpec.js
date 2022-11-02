import { Ellipsoid, Globe } from "@cesium/engine";
import { VoxelInspector } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "Widgets/VoxelInspector/VoxelInspector",
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

      const widget = new VoxelInspector("testContainer", scene);
      expect(widget.container).toBe(container);
      expect(widget.viewModel.scene).toBe(scene);
      expect(widget.isDestroyed()).toEqual(false);
      widget.destroy();
      expect(widget.isDestroyed()).toEqual(true);

      document.body.removeChild(container);
    });

    it("constructor throws with no element", function () {
      expect(function () {
        return new VoxelInspector();
      }).toThrowDeveloperError();
    });

    it("constructor throws with string element that does not exist", function () {
      expect(function () {
        return new VoxelInspector("does not exist", scene);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no scene", function () {
      expect(function () {
        return new VoxelInspector(document.body);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
