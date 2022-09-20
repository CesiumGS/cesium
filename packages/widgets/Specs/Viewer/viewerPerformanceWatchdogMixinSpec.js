import {
  PerformanceWatchdog,
  viewerPerformanceWatchdogMixin,
} from "../../../../Source/Cesium.js";
import createViewer from "../../createViewer.js";

describe(
  "Widgets/Viewer/viewerPerformanceWatchdogMixin",
  function () {
    let container;
    let viewer;
    beforeEach(function () {
      container = document.createElement("div");
      container.id = "container";
      container.style.display = "none";
      document.body.appendChild(container);
    });

    afterEach(function () {
      if (viewer && !viewer.isDestroyed()) {
        viewer = viewer.destroy();
      }

      document.body.removeChild(container);
    });

    it("mixin sets default values", function () {
      viewer = createViewer(container);
      viewer.extend(viewerPerformanceWatchdogMixin);
      expect(viewer.performanceWatchdog).toBeInstanceOf(PerformanceWatchdog);
    });

    it("mixin sets option values", function () {
      viewer = createViewer(container);
      viewer.extend(viewerPerformanceWatchdogMixin, {
        lowFrameRateMessage: "Foo",
      });
      expect(viewer.performanceWatchdog.viewModel.lowFrameRateMessage).toBe(
        "Foo"
      );
    });

    it("throws if not given a viewer", function () {
      expect(function () {
        viewerPerformanceWatchdogMixin();
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
