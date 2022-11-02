import createScene from "../../../../Specs/createScene.js";
import { VRButton } from "../../index.js";

describe("Widgets/VRButton/VRButton", function () {
  let scene;

  beforeEach(function () {
    scene = createScene();
  });

  afterEach(function () {
    scene.destroyForSpecs();
  });

  it("constructor sets default values", function () {
    const vrButton = new VRButton(document.body, scene);
    expect(vrButton.container).toBe(document.body);
    expect(vrButton.viewModel.vrElement).toBe(document.body);
    expect(vrButton.isDestroyed()).toEqual(false);
    vrButton.destroy();
    expect(vrButton.isDestroyed()).toEqual(true);
  });

  it("constructor sets expected values", function () {
    const testElement = document.createElement("span");
    const vrButton = new VRButton(document.body, scene, testElement);
    expect(vrButton.container).toBe(document.body);
    expect(vrButton.viewModel.vrElement).toBe(testElement);
    vrButton.destroy();
  });

  it("constructor works with string id container", function () {
    const testElement = document.createElement("span");
    testElement.id = "testElement";
    document.body.appendChild(testElement);
    const vrButton = new VRButton("testElement", scene);
    expect(vrButton.container).toBe(testElement);
    document.body.removeChild(testElement);
    vrButton.destroy();
  });

  it("throws if container is undefined", function () {
    expect(function () {
      return new VRButton(undefined, scene);
    }).toThrowDeveloperError();
  });

  it("throws if container string is undefined", function () {
    expect(function () {
      return new VRButton("testElement", scene);
    }).toThrowDeveloperError();
  });

  it("throws if scene is undefined", function () {
    expect(function () {
      return new VRButton(document.body, undefined);
    }).toThrowDeveloperError();
  });
});
