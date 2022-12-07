import {
  EllipsoidTerrainProvider,
  FeatureDetection,
  ImageryLayerCollection,
} from "@cesium/engine";

import { BaseLayerPicker } from "../../index.js";

import DomEventSimulator from "../../../../Specs/DomEventSimulator.js";

describe("Widgets/BaseLayerPicker/BaseLayerPicker", function () {
  function MockGlobe() {
    this.imageryLayers = new ImageryLayerCollection();
    this.terrainProvider = new EllipsoidTerrainProvider();
  }

  it("can create and destroy", function () {
    const container = document.createElement("div");
    container.id = "testContainer";
    document.body.appendChild(container);

    const globe = new MockGlobe();
    const widget = new BaseLayerPicker("testContainer", {
      globe: globe,
    });
    expect(widget.container).toBe(container);
    expect(widget.viewModel.globe).toBe(globe);
    expect(widget.isDestroyed()).toEqual(false);
    widget.destroy();
    expect(widget.isDestroyed()).toEqual(true);

    document.body.removeChild(container);
  });

  function addCloseOnInputSpec(name, func) {
    it(`${name} event closes dropdown if target is not inside container`, function () {
      const container = document.createElement("div");
      container.id = "testContainer";
      document.body.appendChild(container);

      const widget = new BaseLayerPicker("testContainer", {
        globe: new MockGlobe(),
      });

      widget.viewModel.dropDownVisible = true;
      func(document.body);
      expect(widget.viewModel.dropDownVisible).toEqual(false);

      widget.viewModel.dropDownVisible = true;
      func(container.firstChild);
      expect(widget.viewModel.dropDownVisible).toEqual(true);

      widget.destroy();
      document.body.removeChild(container);
    });
  }

  if (FeatureDetection.supportsPointerEvents()) {
    addCloseOnInputSpec("pointerDown", DomEventSimulator.firePointerDown);
  } else {
    addCloseOnInputSpec("mousedown", DomEventSimulator.fireMouseDown);
    addCloseOnInputSpec("touchstart", DomEventSimulator.fireTouchStart);
  }

  it("constructor throws with no layer collection", function () {
    expect(function () {
      return new BaseLayerPicker(document.body, undefined);
    }).toThrowDeveloperError();
  });

  it("constructor throws with no element", function () {
    expect(function () {
      return new BaseLayerPicker(undefined, {
        globe: new MockGlobe(),
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws with string element that does not exist", function () {
    expect(function () {
      return new BaseLayerPicker("does not exist", {
        globe: new MockGlobe(),
      });
    }).toThrowDeveloperError();
  });
});
