import {
  defined,
  getTimestamp,
  FrameRateMonitor,
  PerformanceWatchdogViewModel,
} from "../../../../Source/Cesium.js";

import createScene from "../../createScene.js";

describe(
  "Widgets/PerformanceWatchdog/PerformanceWatchdogViewModel",
  function () {
    let scene;
    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    let viewModel;
    afterEach(function () {
      if (defined(viewModel)) {
        viewModel.destroy();
        viewModel = undefined;
      }

      FrameRateMonitor.fromScene(scene).destroy();
    });

    function spinWait(milliseconds) {
      /*eslint-disable no-empty*/
      const endTime = getTimestamp() + milliseconds;
      while (getTimestamp() < endTime) {}
      /*eslint-enable no-empty*/
    }

    it("throws when constructed without a scene", function () {
      expect(function () {
        viewModel = new PerformanceWatchdogViewModel();
      }).toThrowDeveloperError();

      expect(function () {
        viewModel = new PerformanceWatchdogViewModel({});
      }).toThrowDeveloperError();
    });

    it("can be constructed with just a scene", function () {
      viewModel = new PerformanceWatchdogViewModel({
        scene: scene,
      });

      expect(viewModel.lowFrameRateMessage).toBeDefined();
      expect(viewModel.lowFrameRateMessageDismissed).toBe(false);
      expect(viewModel.showingLowFrameRateMessage).toBe(false);
      expect(viewModel.scene).toBe(scene);
    });

    it("honors parameters to the constructor", function () {
      const options = {
        scene: scene,
        lowFrameRateMessage: "why so slow?",
      };

      viewModel = new PerformanceWatchdogViewModel(options);

      expect(viewModel.lowFrameRateMessage).toBe("why so slow?");
      expect(viewModel.scene).toBe(scene);
    });

    it("shows a message on low frame rate", function () {
      const monitor = FrameRateMonitor.fromScene(scene);
      monitor.quietPeriod = 0.001;
      monitor.warmupPeriod = 0.001;
      monitor.samplingWindow = 0.001;
      monitor.minimumFrameRateDuringWarmup = 1000;
      monitor.minimumFrameRateAfterWarmup = 1000;

      viewModel = new PerformanceWatchdogViewModel({
        scene: scene,
      });

      expect(viewModel.showingLowFrameRateMessage).toBe(false);

      // Rendering once starts the quiet period
      scene.render();

      // Wait until we're well past the end of the quiet period.
      spinWait(2);

      // Rendering again records our first sample.
      scene.render();

      // Wait well over a millisecond, which is the maximum frame time allowed by this instance.
      spinWait(2);

      // Record our second sample.  The watchdog should notice that our frame rate is too low.
      scene.render();
      expect(viewModel.showingLowFrameRateMessage).toBe(true);
    });

    it("does not report a low frame rate during the queit period", function () {
      const monitor = FrameRateMonitor.fromScene(scene);
      monitor.quietPeriod = 1.0;
      monitor.warmupPeriod = 0.001;
      monitor.samplingWindow = 0.001;
      monitor.minimumFrameRateDuringWarmup = 1000;
      monitor.minimumFrameRateAfterWarmup = 1000;

      viewModel = new PerformanceWatchdogViewModel({
        scene: scene,
      });

      // Rendering once starts the quiet period
      scene.render();

      // Wait well over a millisecond, which is the maximum frame time allowed by this instance.
      spinWait(2);

      // Render again.  Even though our frame rate is too low, the watchdog shouldn't bark because we're in the quiet period.
      scene.render();
      expect(viewModel.showingLowFrameRateMessage).toBe(false);
    });

    it("the low frame rate message goes away after the warmup period if the frame rate returns to nominal", function () {
      const monitor = FrameRateMonitor.fromScene(scene);
      monitor.quietPeriod = 0.001;
      monitor.warmupPeriod = 0.001;
      monitor.samplingWindow = 0.001;
      monitor.minimumFrameRateDuringWarmup = 10;
      monitor.minimumFrameRateAfterWarmup = 10;

      viewModel = new PerformanceWatchdogViewModel({
        scene: scene,
      });

      expect(viewModel.showingLowFrameRateMessage).toBe(false);

      // Rendering once starts the quiet period
      scene.render();

      // Wait until we're well past the end of the quiet period.
      spinWait(2);

      // Rendering again records our first sample.
      scene.render();

      // Wait 120 millseconds, which is over the maximum frame time allowed by this instance.
      spinWait(120);

      // Record our second sample.  The watchdog should notice that our frame rate is too low.
      scene.render();
      expect(viewModel.showingLowFrameRateMessage).toBe(true);

      // Render as fast as possible for a samplingWindow, quietPeriod, and warmupPeriod.
      const endTime = getTimestamp() + 50;
      while (getTimestamp() < endTime) {
        scene.render();
      }

      // The low frame rate message should have gone away.
      expect(viewModel.showingLowFrameRateMessage).toBe(false);
    });

    it("does not show the low frame rate message again once it is dismissed", function () {
      const monitor = FrameRateMonitor.fromScene(scene);
      monitor.quietPeriod = 0.001;
      monitor.warmupPeriod = 0.001;
      monitor.samplingWindow = 0.001;
      monitor.minimumFrameRateDuringWarmup = 1000;
      monitor.minimumFrameRateAfterWarmup = 1000;

      viewModel = new PerformanceWatchdogViewModel({
        scene: scene,
      });

      expect(viewModel.showingLowFrameRateMessage).toBe(false);

      // Rendering once starts the quiet period
      scene.render();

      // Wait until we're well past the end of the quiet period.
      spinWait(2);

      // Rendering again records our first sample.
      scene.render();

      // Wait well over a millisecond, which is the maximum frame time allowed by this instance.
      spinWait(2);

      // Record our second sample.  The watchdog should notice that our frame rate is too low.
      scene.render();
      expect(viewModel.showingLowFrameRateMessage).toBe(true);

      viewModel.dismissMessage();

      // Render several slow frames.  The message should not re-appear.
      scene.render();
      spinWait(2);
      scene.render();
      expect(viewModel.showingLowFrameRateMessage).toBe(false);
    });
  },
  "WebGL"
);
