import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

const ds = await Cesium.CzmlDataSource.load(
  "../../../Specs/Data/CZML/TwoSats.czml",
);
const dsOrient = await Cesium.CzmlDataSource.load(
  "../../../Specs/Data/CZML/TwoSatsOrientation.czml",
);

const sat1 = ds.entities.getById("Satellite/Satellite1");
const sat2 = ds.entities.getById("Satellite/Satellite2");
sat1.viewFrom = new Cesium.Cartesian3(-2000.0, -40000.0, 2000.0);
sat2.viewFrom = new Cesium.Cartesian3(-2000.0, -40000.0, 2000.0);

const sat1Orient = dsOrient.entities.getById("Satellite/Satellite1");
const sat2Orient = dsOrient.entities.getById("Satellite/Satellite2");
sat1Orient.viewFrom = new Cesium.Cartesian3(-2000.0, -40000.0, 2000.0);
sat2Orient.viewFrom = new Cesium.Cartesian3(-2000.0, -40000.0, 2000.0);

function reset() {
  if (viewer.dataSources.contains(dsOrient)) {
    viewer.dataSources.remove(dsOrient);
  }
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

Sandcastle.addToolbarButton("Satellite 2 - fixed frame path", function () {
  reset();

  if (Cesium.defined(sat1)) {
    sat1.path.relativeTo = undefined;
    sat2.path.relativeTo = "Fixed";
    viewer.trackedEntity = undefined;
  }

  viewer.camera.frustum.fov = Cesium.Math.toRadians(15);
  viewer.scene.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(290, 0, 1e8),
  });
});

Sandcastle.addToolbarButton("Satellite 2 - orientation", async function () {
  viewer.camera.frustum.fov = Cesium.Math.toRadians(55);

  viewer.dataSources.removeAll();
  viewer.dataSources.add(ds);
  viewer.dataSources.add(dsOrient);

  sat1.show = false;
  sat2.path.relativeTo = sat1.id;

  sat1Orient.path.relativeTo = undefined;
  sat2Orient.path.relativeTo = sat1Orient.id;
  viewer.trackedEntity = sat1Orient;

  sat2Orient.path.material = new Cesium.ColorMaterialProperty(
    Cesium.Color.YELLOW,
  );
});
