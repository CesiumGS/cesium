import { FullscreenButton } from "../../../Source/Cesium.js";

describe("Widgets/FullscreenButton/FullscreenButton", function () {
  it("constructor sets default values", function () {
    var fullscreenButton = new FullscreenButton(document.body);
    expect(fullscreenButton.container).toBe(document.body);
    expect(fullscreenButton.viewModel.fullscreenElement).toBe(document.body);
    expect(fullscreenButton.isDestroyed()).toEqual(false);
    fullscreenButton.destroy();
    expect(fullscreenButton.isDestroyed()).toEqual(true);
  });

  it("constructor sets expected values", function () {
    var testElement = document.createElement("span");
    var fullscreenButton = new FullscreenButton(document.body, testElement);
    expect(fullscreenButton.container).toBe(document.body);
    expect(fullscreenButton.viewModel.fullscreenElement).toBe(testElement);
    fullscreenButton.destroy();
  });

  it("constructor works with string id container", function () {
    var testElement = document.createElement("span");
    testElement.id = "testElement";
    document.body.appendChild(testElement);
    var fullscreenButton = new FullscreenButton("testElement");
    expect(fullscreenButton.container).toBe(testElement);
    document.body.removeChild(testElement);
    fullscreenButton.destroy();
  });

  it("throws if container is undefined", function () {
    expect(function () {
      return new FullscreenButton(undefined);
    }).toThrowDeveloperError();
  });

  it("throws if container string is undefined", function () {
    expect(function () {
      return new FullscreenButton("testElement");
    }).toThrowDeveloperError();
  });
});
