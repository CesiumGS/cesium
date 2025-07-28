import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Create a clock that loops on Christmas day 2013 and runs in 4000x real time.
const clock = new Cesium.Clock({
  startTime: Cesium.JulianDate.fromIso8601("2013-12-25"),
  currentTime: Cesium.JulianDate.fromIso8601("2013-12-25"),
  stopTime: Cesium.JulianDate.fromIso8601("2013-12-26"),
  clockRange: Cesium.ClockRange.LOOP_STOP, // loop when we hit the end time
  clockStep: Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER,
  multiplier: 4000, // how much time to advance each tick
  shouldAnimate: true, // Animation on by default
});

const viewer = new Cesium.Viewer("cesiumContainer", {
  clockViewModel: new Cesium.ClockViewModel(clock),
});

viewer.scene.globe.enableLighting = true;

Sandcastle.addToolbarButton("Reset Current Time", function () {
  const resetTime = viewer.clockViewModel.startTime;
  viewer.clockViewModel.currentTime = resetTime;
  viewer.timeline.updateFromClock();
});

Sandcastle.addToolbarButton("Slow Down Clock", function () {
  viewer.clockViewModel.multiplier /= 2;
});

Sandcastle.addToolbarButton("Speed Up Clock", function () {
  viewer.clockViewModel.multiplier *= 2;
});
