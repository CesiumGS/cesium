import { FeatureDetection } from "../../../Source/Cesium.js";
import DomEventSimulator from "../../DomEventSimulator.js";
import { NavigationHelpButton } from "../../../Source/Cesium.js";

describe("Widgets/NavigationHelpButton/NavigationHelpButton", function () {
  it("can create and destroy", function () {
    var container = document.createElement("span");
    container.id = "testContainer";
    document.body.appendChild(container);

    var widget = new NavigationHelpButton({
      container: "testContainer",
    });
    expect(widget.container.id).toBe(container.id);
    expect(widget.isDestroyed()).toEqual(false);

    widget.destroy();
    expect(widget.isDestroyed()).toEqual(true);

    document.body.removeChild(container);
  });

  it("does not show instructions by default", function () {
    var widget = new NavigationHelpButton({
      container: document.body,
    });
    expect(widget.viewModel.showInstructions).toBe(false);
    widget.destroy();
  });

  it("shows instructions by default if told to do so in the constructor", function () {
    var widget = new NavigationHelpButton({
      container: document.body,
      instructionsInitiallyVisible: true,
    });
    expect(widget.viewModel.showInstructions).toBe(true);
    widget.destroy();
  });

  function addCloseOnInputSpec(name, func) {
    it(
      name + " event closes dropdown if target is not inside container",
      function () {
        var container = document.createElement("span");
        container.id = "testContainer";
        document.body.appendChild(container);

        var widget = new NavigationHelpButton({
          container: "testContainer",
        });

        widget.viewModel.showInstructions = true;
        func(document.body);
        expect(widget.viewModel.showInstructions).toEqual(false);

        widget.viewModel.showInstructions = true;
        func(container.firstChild);
        expect(widget.viewModel.showInstructions).toEqual(true);

        widget.destroy();
        document.body.removeChild(container);
      }
    );
  }

  if (FeatureDetection.supportsPointerEvents()) {
    addCloseOnInputSpec("pointerDown", DomEventSimulator.firePointerDown);
  } else {
    addCloseOnInputSpec("mousedown", DomEventSimulator.fireMouseDown);
    addCloseOnInputSpec("touchstart", DomEventSimulator.fireTouchStart);
  }

  it("throws if container is undefined", function () {
    expect(function () {
      return new NavigationHelpButton({
        container: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("throws if options is undefined", function () {
    expect(function () {
      return new NavigationHelpButton(undefined);
    }).toThrowDeveloperError();
  });

  it("throws if options.container is undefined", function () {
    expect(function () {
      return new NavigationHelpButton({
        container: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws with string element that does not exist", function () {
    expect(function () {
      return new NavigationHelpButton({
        container: "does not exist",
      });
    }).toThrowDeveloperError();
  });
});
