import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");
const options = {
  camera: viewer.scene.camera,
  canvas: viewer.scene.canvas,
};

let tour = null;
viewer.dataSources
  .add(
    Cesium.KmlDataSource.load(
      "../../SampleData/kml/eiffel-tower-flyto.kml",
      options,
    ),
  )
  .then(function (dataSource) {
    tour = dataSource.kmlTours[0];
    tour.tourStart.addEventListener(function () {
      console.log("Start tour");
    });
    tour.tourEnd.addEventListener(function (terminated) {
      console.log(`${terminated ? "Terminate" : "End"} tour`);
    });
    tour.entryStart.addEventListener(function (entry) {
      console.log(`Play ${entry.type} (${entry.duration})`);
    });
    tour.entryEnd.addEventListener(function (entry, terminated) {
      console.log(`${terminated ? "Terminate" : "End"} ${entry.type}`);
    });
  });

Sandcastle.addToolbarButton("Play", function () {
  tour.play(viewer.cesiumWidget);
});

Sandcastle.addToolbarButton("Terminate", function () {
  tour.stop();
});

Sandcastle.reset = function () {
  viewer.dataSources.removeAll();
  viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;
  viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK;
};
