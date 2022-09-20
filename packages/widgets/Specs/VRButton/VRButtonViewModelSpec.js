import { Fullscreen } from "../../../engine/index.js";
import { VRButtonViewModel } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe("Widgets/VRButton/VRButtonViewModel", function () {
  let scene;

  beforeEach(function () {
    scene = createScene();
  });

  afterEach(function () {
    scene.destroyForSpecs();
  });

  it("constructor sets default values", function () {
    const viewModel = new VRButtonViewModel(scene);
    expect(viewModel.vrElement).toBe(document.body);
    expect(viewModel.isDestroyed()).toEqual(false);
    viewModel.destroy();
    expect(viewModel.isDestroyed()).toEqual(true);
  });

  it("constructor sets expected values", function () {
    const testElement = document.createElement("span");
    const viewModel = new VRButtonViewModel(scene, testElement);
    expect(viewModel.vrElement).toBe(testElement);
    viewModel.destroy();
  });

  it("constructor can take an element id", function () {
    const testElement = document.createElement("span");
    testElement.id = "testElement";
    document.body.appendChild(testElement);
    const viewModel = new VRButtonViewModel(scene, "testElement");
    expect(viewModel.vrElement).toBe(testElement);
    viewModel.destroy();
    document.body.removeChild(testElement);
  });

  it("isVREnabled work as expected", function () {
    const viewModel = new VRButtonViewModel(scene);
    expect(viewModel.isVREnabled).toEqual(Fullscreen.enabled);
    viewModel.isVREnabled = false;
    expect(viewModel.isVREnabled).toEqual(false);
    viewModel.destroy();
  });

  it("can get and set vrElement", function () {
    const testElement = document.createElement("span");
    const viewModel = new VRButtonViewModel(scene);
    expect(viewModel.vrElement).not.toBe(testElement);
    viewModel.vrElement = testElement;
    expect(viewModel.vrElement).toBe(testElement);
  });

  it("throws when constructed without a scene", function () {
    expect(function () {
      return new VRButtonViewModel();
    }).toThrowDeveloperError();
  });

  it("throws is setting vrElement is not an Element", function () {
    const viewModel = new VRButtonViewModel(scene);
    expect(function () {
      viewModel.vrElement = {};
    }).toThrowDeveloperError();
  });
});
