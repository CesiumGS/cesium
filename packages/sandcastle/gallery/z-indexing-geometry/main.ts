import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

viewer.entities.add({
  id: "Red rectangle, zIndex 1",
  rectangle: {
    coordinates: Cesium.Rectangle.fromDegrees(-110.0, 20.0, -100.5, 30.0),
    material: Cesium.Color.RED,
    zIndex: 1,
  },
});

viewer.entities.add({
  id: "Textured rectangle, zIndex 2",
  rectangle: {
    coordinates: Cesium.Rectangle.fromDegrees(-112.0, 25.0, -102.5, 35.0),
    material: "../images/Cesium_Logo_Color.jpg",
    zIndex: 2,
  },
});

viewer.entities.add({
  id: "Blue rectangle, zIndex 3",
  rectangle: {
    coordinates: Cesium.Rectangle.fromDegrees(-110.0, 31.0, -100.5, 41.0),
    material: Cesium.Color.BLUE,
    zIndex: 3,
  },
});

viewer.entities.add({
  id: "Textured rectangle, zIndex 3",
  rectangle: {
    coordinates: Cesium.Rectangle.fromDegrees(-99.5, 20.0, -90.0, 30.0),
    material: "../images/Cesium_Logo_Color.jpg",
    zIndex: 3,
  },
});

viewer.entities.add({
  id: "Green rectangle, zIndex 2",
  rectangle: {
    coordinates: Cesium.Rectangle.fromDegrees(-97.5, 25.0, -88.0, 35.0),
    material: Cesium.Color.GREEN,
    zIndex: 2,
  },
});

viewer.entities.add({
  id: "Blue rectangle, zIndex 1",
  rectangle: {
    coordinates: Cesium.Rectangle.fromDegrees(-99.5, 31.0, -90.0, 41.0),
    material: Cesium.Color.BLUE,
    zIndex: 1,
  },
});

if (!Cesium.Entity.supportsPolylinesOnTerrain(viewer.scene)) {
  window.alert(
    "Polylines on terrain are not supported on this platform, Z-index will be ignored",
  );
}

if (!Cesium.Entity.supportsMaterialsforEntitiesOnTerrain(viewer.scene)) {
  window.alert(
    "Textured materials on terrain polygons are not supported on this platform, Z-index will be ignored",
  );
}

viewer.entities.add({
  id: "Polyline, zIndex 2",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArray([-120.0, 22.0, -80.0, 22.0]),
    width: 8.0,
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.2,
      color: Cesium.Color.BLUE,
    }),
    zIndex: 2,
    clampToGround: true,
  },
});

viewer.zoomTo(viewer.entities);
