import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

const ds = await Cesium.CzmlDataSource.load(
  "../../../Specs/Data/CZML/TwoSats.czml",
);

const sat1 = ds.entities.getById("Satellite/Satellite1");
const sat2 = ds.entities.getById("Satellite/Satellite2");
sat1.viewFrom = new Cesium.Cartesian3(-2000.0, -40000.0, 2000.0);
sat2.viewFrom = new Cesium.Cartesian3(-2000.0, -40000.0, 2000.0);

function reset() {
  if (!viewer.dataSources.contains(ds)) {
    viewer.dataSources.add(ds);
  }
  sat1.show = true;
}

Sandcastle.addDefaultToolbarButton("Satellite 1", function () {
  reset();

  viewer.camera.frustum.fov = Cesium.Math.toRadians(55);
  if (Cesium.defined(sat1)) {
    sat1.path.relativeTo = undefined;
    sat2.path.relativeTo = sat1.id;
    viewer.trackedEntity = sat1;
  }
});

Sandcastle.addToolbarButton("Satellite 2", function () {
  reset();

  viewer.camera.frustum.fov = Cesium.Math.toRadians(55);
  if (Cesium.defined(sat1)) {
    sat2.path.relativeTo = undefined;
    sat1.path.relativeTo = sat2.id;
    viewer.trackedEntity = sat2;
  }
});

Sandcastle.addToolbarButton("Both", function () {
  reset();

  viewer.camera.frustum.fov = Cesium.Math.toRadians(55);
  if (Cesium.defined(sat1)) {
    sat1.path.relativeTo = undefined;
    sat2.path.relativeTo = undefined;
    viewer.trackedEntity = sat1;
  }
});

Sandcastle.addToolbarButton("Earth", function () {
  reset();

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

// Vehicle demo
const dsVehicle = await Cesium.CzmlDataSource.load(
  "../../../Apps/SampleData/VehicleRelative.czml",
);

const vehicle = dsVehicle.entities.getById("Vehicle");
const helicopter = dsVehicle.entities.getById("Helicopter");
vehicle.viewFrom = new Cesium.Cartesian3(0.0, -2000.0, 500.0);
helicopter.viewFrom = new Cesium.Cartesian3(0.0, -2000.0, 500.0);

Sandcastle.addToolbarButton("Vehicle", function () {
  viewer.dataSources.removeAll();
  viewer.dataSources.add(dsVehicle);

  vehicle.path.relativeTo = undefined;
  helicopter.path.relativeTo = vehicle.id;
  viewer.trackedEntity = vehicle;
});

Sandcastle.addToolbarButton("Helicopter", function () {
  viewer.dataSources.removeAll();
  viewer.dataSources.add(dsVehicle);

  helicopter.path.relativeTo = undefined;
  vehicle.path.relativeTo = helicopter.id;
  viewer.trackedEntity = helicopter;
});
