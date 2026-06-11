import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Demonstrates the fix for "Shadows ignore clipping planes" (#6261).
// Two cases shown:
//  1. OSM buildings clipped via ClippingPolygonCollection — a cleared area
//     with a wood tower; removed buildings must not cast ghost shadows.
//  2. CesiumAir clipped via ClippingPlaneCollection — rear half removed;
//     the missing half must not cast a shadow (mirrors the original bug report).
// Toggle "Clipping" off to see ghost shadows reappear for both cases.

const viewer = new Cesium.Viewer("cesiumContainer", {
  infoBox: false,
  selectionIndicator: false,
  shadows: true,
  terrainShadows: Cesium.ShadowMode.ENABLED,
  shouldAnimate: false,
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

const shadowMap = viewer.shadowMap;
shadowMap.maximumDistance = 3000.0;
shadowMap.size = 2048;

// Neuchâtel, Switzerland — 09:00 UTC (11:00 CEST), sun ESE
viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(
  "2024-06-21T09:00:00Z",
);

const centerLongitude = 6.9288;
const centerLatitude = 46.9919;

const osmBuildings = await Cesium.createOsmBuildingsAsync();
osmBuildings.shadows = Cesium.ShadowMode.ENABLED;
viewer.scene.primitives.add(osmBuildings);

// ClippingPolygon over a ~300 x 300 m footprint. Buildings inside are
// clipped to simulate a cleared redevelopment site.
const deltaLongitude = 0.002;
const deltaLatitude = 0.0014;
const footprintPositions = Cesium.Cartesian3.fromDegreesArray([
  centerLongitude - deltaLongitude,
  centerLatitude - deltaLatitude,
  centerLongitude + deltaLongitude,
  centerLatitude - deltaLatitude,
  centerLongitude + deltaLongitude,
  centerLatitude + deltaLatitude,
  centerLongitude - deltaLongitude,
  centerLatitude + deltaLatitude,
]);

const clippingPolygons = new Cesium.ClippingPolygonCollection({
  polygons: [new Cesium.ClippingPolygon({ positions: footprintPositions })],
});
osmBuildings.clippingPolygons = clippingPolygons;

// New building placed in the cleared area.
const tower = viewer.entities.add({
  name: "Wood Tower",
  position: Cesium.Cartesian3.fromDegrees(centerLongitude, centerLatitude),
  model: {
    uri: "../../SampleData/models/WoodTower/Wood_Tower.glb",
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    shadows: Cesium.ShadowMode.ENABLED,
  },
});

// CesiumAir with the rear half clipped by a ClippingPlaneCollection.
// Without the fix, the missing half still casts a full shadow below.
const airClippingPlanes = new Cesium.ClippingPlaneCollection({
  planes: [new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, 1.0, 0.0), 0.0)],
  edgeWidth: 1.0,
  edgeColor: Cesium.Color.YELLOW,
});

viewer.entities.add({
  name: "CesiumAir",
  position: Cesium.Cartesian3.fromDegrees(
    centerLongitude + deltaLongitude + 0.002,
    centerLatitude + 0.001,
    560.0,
  ),
  model: {
    uri: "../../SampleData/models/CesiumAir/Cesium_Air.glb",
    minimumPixelSize: 64,
    shadows: Cesium.ShadowMode.ENABLED,
    clippingPlanes: airClippingPlanes,
  },
});

// Camera east of the scene, looking west.
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(
    centerLongitude + 0.022,
    centerLatitude + 0.004,
    650.0,
  ),
  orientation: {
    heading: Cesium.Math.toRadians(255.0),
    pitch: Cesium.Math.toRadians(-22.0),
    roll: 0.0,
  },
});

Sandcastle.addToggleButton("Shadows", true, function (checked) {
  viewer.shadows = checked;
});

Sandcastle.addToggleButton("Clipping", true, function (checked) {
  clippingPolygons.enabled = checked;
  airClippingPlanes.enabled = checked;
  tower.show = checked;
});

Sandcastle.addToggleButton("Soft Shadows", false, function (checked) {
  shadowMap.softShadows = checked;
});
