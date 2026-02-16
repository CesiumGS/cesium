import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

let sat1;
let sat2;

Cesium.CzmlDataSource.load("../../../Specs/Data/CZML/TwoSats.czml").then(
  function (ds) {
    viewer.dataSources.add(ds);
    sat1 = ds.entities.getById("Satellite/Satellite1");
    sat2 = ds.entities.getById("Satellite/Satellite2");

    sat1.viewFrom = new Cesium.Cartesian3(-2000.0, -40000.0, 2000.0);
    sat2.viewFrom = new Cesium.Cartesian3(-2000.0, -40000.0, 2000.0);

    viewer.trackedEntity = sat1;
  },
);

Sandcastle.addDefaultToolbarButton("Satellite 1", function () {
  viewer.camera.frustum.fov = Cesium.Math.toRadians(55);
  if (Cesium.defined(sat1)) {
    sat1.path.relativeTo = undefined;
    sat2.path.relativeTo = sat1.id;
    viewer.trackedEntity = sat1;
  }
});

Sandcastle.addToolbarButton("Satellite 2", function () {
  viewer.camera.frustum.fov = Cesium.Math.toRadians(55);
  if (Cesium.defined(sat1)) {
    sat2.path.relativeTo = undefined;
    sat1.path.relativeTo = sat2.id;
    viewer.trackedEntity = sat2;
  }
});

Sandcastle.addDefaultToolbarButton("Both", function () {
  viewer.camera.frustum.fov = Cesium.Math.toRadians(55);
  if (Cesium.defined(sat1)) {
    sat1.path.relativeTo = undefined;
    sat2.path.relativeTo = undefined;
    viewer.trackedEntity = sat1;
  }
});

Sandcastle.addToolbarButton("Earth", function () {
  if (Cesium.defined(sat1)) {
    sat1.path.relativeTo = undefined;
    sat2.path.relativeTo = undefined;
    viewer.trackedEntity = undefined;
  }

  viewer.camera.frustum.fov = Cesium.Math.toRadians(15);
  viewer.scene.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-150, 60, 1e8),
  });
});

Sandcastle.addToolbarButton("Test", function () {
  if (Cesium.defined(sat1)) {
    sat1.path.relativeTo = undefined;
    sat2.path.relativeTo = "Fixed";
    viewer.trackedEntity = undefined;
  }

  viewer.camera.frustum.fov = Cesium.Math.toRadians(15);
  viewer.scene.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-150, 60, 1e8),
  });
});
