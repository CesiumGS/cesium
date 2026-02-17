import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

let sat1;
let sat2;
let sat3;
let sat4;

Promise.all([
  Cesium.CzmlDataSource.load("../../../Specs/Data/CZML/TwoSats.czml"),
  Cesium.CzmlDataSource.load(
    "../../../Specs/Data/CZML/TwoSatsOrientation.czml",
  ),
]).then(function ([ds, dsOrient]) {
  viewer.dataSources.add(ds);
  sat1 = ds.entities.getById("Satellite/Satellite1");
  sat2 = ds.entities.getById("Satellite/Satellite2");
  sat1.viewFrom = new Cesium.Cartesian3(-2000.0, -40000.0, 2000.0);
  sat2.viewFrom = new Cesium.Cartesian3(-2000.0, -40000.0, 2000.0);
  sat1.path.relativeTo = sat2.id;
  sat2.path.relativeTo = undefined;
  viewer.trackedEntity = sat2;

  viewer.dataSources.add(dsOrient);
  sat3 = dsOrient.entities.getById("Satellite/Satellite1");
  sat4 = dsOrient.entities.getById("Satellite/Satellite2");
  sat3.path.relativeTo = sat4.id;
  sat4.path.relativeTo = undefined;
  sat3.path.material = new Cesium.ColorMaterialProperty(Cesium.Color.YELLOW);
});

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
