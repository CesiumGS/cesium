import { Ellipsoid, Globe, SceneMode } from "@cesium/engine";

import { SceneModePickerViewModel } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "Widgets/SceneModePicker/SceneModePickerViewModel",
  function () {
    let scene;
    const ellipsoid = Ellipsoid.WGS84;
    beforeEach(function () {
      scene = createScene();
      const globe = new Globe(ellipsoid);
      scene.globe = globe;
    });

    afterEach(function () {
      scene.destroyForSpecs();
    });

    it("Can construct and destroy", function () {
      const viewModel = new SceneModePickerViewModel(scene, 1.0);
      expect(viewModel.scene).toBe(scene);
      expect(viewModel.duration).toEqual(1.0);
      expect(scene.morphStart.numberOfListeners).toEqual(1);
      expect(viewModel.isDestroyed()).toEqual(false);
      viewModel.destroy();
      expect(viewModel.isDestroyed()).toEqual(true);
      expect(scene.morphStart.numberOfListeners).toEqual(0);
    });

    it("dropDownVisible and toggleDropDown work", function () {
      const viewModel = new SceneModePickerViewModel(scene);

      expect(viewModel.dropDownVisible).toEqual(false);
      viewModel.toggleDropDown();
      expect(viewModel.dropDownVisible).toEqual(true);
      viewModel.dropDownVisible = false;
      expect(viewModel.dropDownVisible).toEqual(false);

      viewModel.destroy();
    });

    it("morphing closes the dropDown", function () {
      const viewModel = new SceneModePickerViewModel(scene);

      viewModel.dropDownVisible = true;
      viewModel.morphToColumbusView();
      expect(viewModel.dropDownVisible).toEqual(false);

      viewModel.dropDownVisible = true;
      viewModel.morphTo3D();
      expect(viewModel.dropDownVisible).toEqual(false);

      viewModel.dropDownVisible = true;
      viewModel.morphTo2D();
      expect(viewModel.dropDownVisible).toEqual(false);

      viewModel.destroy();
    });

    it("morphing calls correct transition", function () {
      const viewModel = new SceneModePickerViewModel(scene);

      expect(scene.mode).toEqual(SceneMode.SCENE3D);

      viewModel.morphToColumbusView();
      scene.completeMorph();
      expect(scene.mode).toEqual(SceneMode.COLUMBUS_VIEW);

      viewModel.morphTo3D();
      scene.completeMorph();
      expect(scene.mode).toEqual(SceneMode.SCENE3D);

      viewModel.morphTo2D();
      scene.completeMorph();
      expect(scene.mode).toEqual(SceneMode.SCENE2D);

      viewModel.destroy();
    });

    it("selectedTooltip changes on transition", function () {
      const viewModel = new SceneModePickerViewModel(scene);

      viewModel.morphToColumbusView();
      expect(viewModel.selectedTooltip).toEqual(viewModel.tooltipColumbusView);

      viewModel.morphTo3D();
      expect(viewModel.selectedTooltip).toEqual(viewModel.tooltip3D);

      viewModel.morphTo2D();
      expect(viewModel.selectedTooltip).toEqual(viewModel.tooltip2D);

      viewModel.destroy();
    });

    it("create throws with undefined scene", function () {
      expect(function () {
        return new SceneModePickerViewModel();
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
