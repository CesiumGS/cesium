import { Ellipsoid } from "../../../Source/Cesium.js";
import { Globe } from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import { HomeButtonViewModel } from "../../../Source/Cesium.js";

describe(
  "Widgets/HomeButton/HomeButtonViewModel",
  function () {
    let scene;
    const ellipsoid = Ellipsoid.WGS84;
    const globe = new Globe(ellipsoid);
    beforeAll(function () {
      scene = createScene();
      scene.globe = globe;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("constructor sets default values", function () {
      const viewModel = new HomeButtonViewModel(scene);
      expect(viewModel.scene).toBe(scene);
    });

    it("throws if scene is undefined", function () {
      expect(function () {
        return new HomeButtonViewModel(undefined);
      }).toThrowDeveloperError();
    });

    //These remaining tests are sanity checks to make sure the code executes
    //The actual position of the camera at the end of the command is
    //tied to the implementation of various camera features.
    it("works in 3D", function () {
      scene.render();
      const viewModel = new HomeButtonViewModel(scene);
      viewModel.command();
    });

    it("works in 2D", function () {
      scene.render();
      const viewModel = new HomeButtonViewModel(scene);
      scene.morphTo2D();
      viewModel.command();
    });

    it("works in Columbus View", function () {
      scene.render();
      const viewModel = new HomeButtonViewModel(scene);
      scene.morphToColumbusView();
      viewModel.command();
    });

    it("works while morphing", function () {
      scene.render();
      const viewModel = new HomeButtonViewModel(scene);
      scene.morphToColumbusView(2000);
      viewModel.command();
    });
  },
  "WebGL"
);
