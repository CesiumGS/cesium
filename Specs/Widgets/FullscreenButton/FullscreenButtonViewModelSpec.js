import {
  Fullscreen,
  FullscreenButtonViewModel,
} from "../../../../Source/Cesium.js";

describe("Widgets/FullscreenButton/FullscreenButtonViewModel", function () {
  it("constructor sets default values", function () {
    const viewModel = new FullscreenButtonViewModel();
    expect(viewModel.fullscreenElement).toBe(document.body);
    expect(viewModel.isDestroyed()).toEqual(false);
    viewModel.destroy();
    expect(viewModel.isDestroyed()).toEqual(true);
  });

  it("constructor sets expected values", function () {
    const testElement = document.createElement("span");
    const viewModel = new FullscreenButtonViewModel(testElement);
    expect(viewModel.fullscreenElement).toBe(testElement);
    viewModel.destroy();
  });

  it("constructor can take an element id", function () {
    const testElement = document.createElement("span");
    testElement.id = "testElement";
    document.body.appendChild(testElement);
    const viewModel = new FullscreenButtonViewModel("testElement");
    expect(viewModel.fullscreenElement).toBe(testElement);
    viewModel.destroy();
    document.body.removeChild(testElement);
  });

  it("isFullscreenEnabled work as expected", function () {
    const viewModel = new FullscreenButtonViewModel();
    expect(viewModel.isFullscreenEnabled).toEqual(Fullscreen.enabled);
    viewModel.isFullscreenEnabled = false;
    expect(viewModel.isFullscreenEnabled).toEqual(false);
    viewModel.destroy();
  });

  it("can get and set fullscreenElement", function () {
    const testElement = document.createElement("span");
    const viewModel = new FullscreenButtonViewModel();
    expect(viewModel.fullscreenElement).not.toBe(testElement);
    viewModel.fullscreenElement = testElement;
    expect(viewModel.fullscreenElement).toBe(testElement);
  });

  it("throws is setting fullscreenElement is not an Element", function () {
    const viewModel = new FullscreenButtonViewModel();
    expect(function () {
      viewModel.fullscreenElement = {};
    }).toThrowDeveloperError();
  });
});
