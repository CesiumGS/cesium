import {
  Cartesian2,
  Cartesian3
} from "../../../engine/index.js";

import { SelectionIndicatorViewModel } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "Widgets/SelectionIndicator/SelectionIndicatorViewModel",
  function () {
    let scene;
    const selectionIndicatorElement = document.createElement("div");
    selectionIndicatorElement.style.width = "20px";
    selectionIndicatorElement.style.height = "20px";
    const container = document.createElement("div");
    container.appendChild(selectionIndicatorElement);
    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("constructor sets expected values", function () {
      const viewModel = new SelectionIndicatorViewModel(
        scene,
        selectionIndicatorElement,
        container
      );
      expect(viewModel.scene).toBe(scene);
      expect(viewModel.selectionIndicatorElement).toBe(
        selectionIndicatorElement
      );
      expect(viewModel.container).toBe(container);
      expect(viewModel.computeScreenSpacePosition).toBeDefined();
    });

    it("throws if scene is undefined", function () {
      expect(function () {
        return new SelectionIndicatorViewModel(undefined);
      }).toThrowDeveloperError();
    });

    it("throws if selectionIndicatorElement is undefined", function () {
      expect(function () {
        return new SelectionIndicatorViewModel(scene);
      }).toThrowDeveloperError();
    });

    it("throws if container is undefined", function () {
      expect(function () {
        return new SelectionIndicatorViewModel(
          scene,
          selectionIndicatorElement
        );
      }).toThrowDeveloperError();
    });

    it("can animate selection element", function () {
      const viewModel = new SelectionIndicatorViewModel(
        scene,
        selectionIndicatorElement,
        container
      );
      viewModel.animateAppear();
      viewModel.animateDepart();
    });

    it("can use custom screen space positions", function () {
      document.body.appendChild(container);
      const viewModel = new SelectionIndicatorViewModel(
        scene,
        selectionIndicatorElement,
        container
      );
      viewModel.showSelection = true;
      viewModel.position = new Cartesian3(1.0, 2.0, 3.0);
      viewModel.computeScreenSpacePosition = function (position, result) {
        return Cartesian2.clone(position, result);
      };
      viewModel.update();
      expect(viewModel._screenPositionX).toBe("-9px"); // Negative half the test size, plus viewModel.position.x (1)
      expect(viewModel._screenPositionY).toBe("-8px"); // Negative half the test size, plus viewModel.position.y (2)

      document.body.removeChild(container);
    });

    it("hides the indicator when position is unknown", function () {
      const viewModel = new SelectionIndicatorViewModel(
        scene,
        selectionIndicatorElement,
        container
      );
      expect(viewModel.isVisible).toBe(false);
      viewModel.showSelection = true;
      expect(viewModel.isVisible).toBe(false);
      viewModel.position = new Cartesian3(1.0, 2.0, 3.0);
      expect(viewModel.isVisible).toBe(true);
      viewModel.showSelection = false;
      expect(viewModel.isVisible).toBe(false);
    });

    it("can move the indicator off screen", function () {
      document.body.appendChild(container);
      const viewModel = new SelectionIndicatorViewModel(
        scene,
        selectionIndicatorElement,
        container
      );
      viewModel.showSelection = true;
      viewModel.position = new Cartesian3(1.0, 2.0, 3.0);
      viewModel.computeScreenSpacePosition = function (position, result) {
        return undefined;
      };
      viewModel.update();
      expect(viewModel._screenPositionX).toBe("-1000px");
      expect(viewModel._screenPositionY).toBe("-1000px");

      document.body.removeChild(container);
    });
  },
  "WebGL"
);
