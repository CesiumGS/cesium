import { defined } from "../../../Source/Cesium.js";
import pollToPromise from "../../pollToPromise.js";
import { InfoBox } from "../../../Source/Cesium.js";

describe("Widgets/InfoBox/InfoBox", function () {
  var testContainer;
  var infoBox;
  beforeEach(function () {
    testContainer = document.createElement("span");
    testContainer.id = "testContainer";
    document.body.appendChild(testContainer);
  });

  afterEach(function () {
    if (defined(infoBox) && !infoBox.isDestroyed()) {
      infoBox = infoBox.destroy();
    }
    document.body.removeChild(testContainer);
  });

  it("constructor sets expected values", function () {
    infoBox = new InfoBox(testContainer);
    expect(infoBox.container).toBe(testContainer);
    expect(infoBox.viewModel).toBeDefined();
    expect(infoBox.isDestroyed()).toEqual(false);
    infoBox.destroy();
    expect(infoBox.isDestroyed()).toEqual(true);
  });

  it("can set description body", function () {
    var infoBox = new InfoBox(testContainer);
    var node;

    var infoElement = testContainer.firstChild;

    infoBox.viewModel.description = "Please do not crash";
    return pollToPromise(function () {
      node = infoBox.frame.contentDocument.body.firstChild;
      return node !== null;
    })
      .then(function () {
        expect(infoElement.style["background-color"]).toEqual("");
        return pollToPromise(function () {
          return node.innerHTML === infoBox.viewModel.description;
        });
      })
      .then(function () {
        infoBox.viewModel.description =
          '<div style="background-color: rgb(255, 255, 255);">Please do not crash</div>';
        expect(infoElement.style["background-color"]).toEqual(
          "rgb(255, 255, 255)"
        );
        return pollToPromise(function () {
          return node.innerHTML === infoBox.viewModel.description;
        });
      })
      .then(function () {
        expect(infoElement["background-color"]).toBeUndefined();
      });
  });

  it("constructor works with string id container", function () {
    infoBox = new InfoBox("testContainer");
    expect(infoBox.container.id).toBe(testContainer.id);
  });

  it("throws if container is undefined", function () {
    expect(function () {
      return new InfoBox(undefined);
    }).toThrowDeveloperError();
  });

  it("throws if container string is undefined", function () {
    expect(function () {
      return new InfoBox("foo");
    }).toThrowDeveloperError();
  });
});
