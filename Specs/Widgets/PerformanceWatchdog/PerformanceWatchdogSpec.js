import createScene from "../../createScene.js";
import { PerformanceWatchdog } from "../../../Source/Cesium.js";

describe(
  "Widgets/PerformanceWatchdog/PerformanceWatchdog",
  function () {
    var scene;
    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("can create and destroy", function () {
      var container = document.createElement("span");
      container.id = "testContainer";
      document.body.appendChild(container);

      var widget = new PerformanceWatchdog({
        container: "testContainer",
        scene: scene,
      });
      expect(widget.container.id).toEqual(container.id);
      expect(widget.isDestroyed()).toEqual(false);

      widget.destroy();
      expect(widget.isDestroyed()).toEqual(true);

      document.body.removeChild(container);
    });

    it("throws if options is undefined", function () {
      expect(function () {
        return new PerformanceWatchdog(undefined);
      }).toThrowDeveloperError();
    });

    it("throws if options.container is undefined", function () {
      expect(function () {
        return new PerformanceWatchdog({
          container: undefined,
          scene: scene,
        });
      }).toThrowDeveloperError();
    });

    it("throws if options.scene is undefined", function () {
      var container = document.createElement("span");
      container.id = "testContainer";
      document.body.appendChild(container);

      expect(function () {
        return new PerformanceWatchdog({
          container: container,
          scene: undefined,
        });
      }).toThrowDeveloperError();

      document.body.removeChild(container);
    });

    it("constructor throws with string element that does not exist", function () {
      expect(function () {
        return new PerformanceWatchdog({
          container: "does not exist",
          scene: scene,
        });
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
