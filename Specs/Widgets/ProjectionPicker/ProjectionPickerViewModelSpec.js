import { OrthographicFrustum } from "../../../Source/Cesium.js";
import { PerspectiveFrustum } from "../../../Source/Cesium.js";
import { SceneMode } from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import { ProjectionPickerViewModel } from "../../../Source/Cesium.js";

describe(
  "Widgets/ProjectionPicker/ProjectionPickerViewModel",
  function () {
    let scene;

    beforeEach(function () {
      scene = createScene();
    });

    afterEach(function () {
      scene.destroyForSpecs();
    });

    it("Can construct and destroy", function () {
      const viewModel = new ProjectionPickerViewModel(scene);
      expect(viewModel.scene).toBe(scene);
      expect(scene.morphComplete.numberOfListeners).toEqual(1);
      expect(scene.preRender.numberOfListeners).toEqual(1);
      expect(viewModel.isDestroyed()).toEqual(false);
      viewModel.destroy();
      expect(viewModel.isDestroyed()).toEqual(true);
      expect(scene.morphComplete.numberOfListeners).toEqual(0);
      expect(scene.preRender.numberOfListeners).toEqual(0);
    });

    it("dropDownVisible and toggleDropDown work", function () {
      const viewModel = new ProjectionPickerViewModel(scene);

      expect(viewModel.dropDownVisible).toEqual(false);
      viewModel.toggleDropDown();
      expect(viewModel.dropDownVisible).toEqual(true);
      viewModel.dropDownVisible = false;
      expect(viewModel.dropDownVisible).toEqual(false);

      viewModel.destroy();
    });

    it("morphing to 2D calls correct transition", function () {
      const viewModel = new ProjectionPickerViewModel(scene);

      expect(scene.mode).toEqual(SceneMode.SCENE3D);
      expect(viewModel.isOrthographicProjection).toEqual(false);

      scene.morphTo2D(0);
      expect(scene.mode).toEqual(SceneMode.SCENE2D);
      expect(viewModel.isOrthographicProjection).toEqual(true);

      viewModel.destroy();
    });

    it("switching projection calls correct transition", function () {
      const viewModel = new ProjectionPickerViewModel(scene);

      expect(scene.mode).toEqual(SceneMode.SCENE3D);
      expect(viewModel.isOrthographicProjection).toEqual(false);
      expect(scene.camera.frustum).toBeInstanceOf(PerspectiveFrustum);

      viewModel.switchToOrthographic();
      expect(viewModel.isOrthographicProjection).toEqual(true);
      expect(scene.camera.frustum).toBeInstanceOf(OrthographicFrustum);

      viewModel.switchToPerspective();
      expect(viewModel.isOrthographicProjection).toEqual(false);
      expect(scene.camera.frustum).toBeInstanceOf(PerspectiveFrustum);

      viewModel.destroy();
    });

    it("selectedTooltip changes on transition", function () {
      const viewModel = new ProjectionPickerViewModel(scene);

      viewModel.switchToOrthographic();
      expect(viewModel.selectedTooltip).toEqual(viewModel.tooltipOrthographic);

      viewModel.switchToPerspective();
      expect(viewModel.selectedTooltip).toEqual(viewModel.tooltipPerspective);

      viewModel.destroy();
    });

    it("create throws with undefined scene", function () {
      expect(function () {
        return new ProjectionPickerViewModel();
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
