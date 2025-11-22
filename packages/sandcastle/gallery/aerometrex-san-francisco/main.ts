import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

// Aerometrex San Francisco High Resolution 3D Model with Street Level Enhanced 3D
const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(1415196, {
  maximumScreenSpaceError: 4,
});
viewer.scene.primitives.add(tileset);

// Ferry Building – Street Level Enhanced mesh with a resolution of ~6mm per pixel
function viewFerryBuilding(duration) {
  viewer.scene.camera.flyTo({
    destination: new Cesium.Cartesian3(
      -2703541.419456986,
      -4261164.971874713,
      3887416.257562123,
    ),
    orientation: new Cesium.HeadingPitchRoll(
      5.959123393581913,
      -0.03131876941215883,
      0.0000033030489428043097,
    ),
    duration: duration,
  });
}

// Pier 39 - 2 cm/pixel resolution
function viewPier39() {
  viewer.scene.camera.flyTo({
    destination: new Cesium.Cartesian3(
      -2704263.584923937,
      -4259336.981155519,
      3888978.5732662966,
    ),
    orientation: new Cesium.HeadingPitchRoll(
      2.4287691459386607,
      -0.49459905591668996,
      0.0000029701571779838787,
    ),
  });
}

// Skyline - 2 cm/pixel resolution
function viewSkyline() {
  viewer.scene.camera.flyTo({
    destination: new Cesium.Cartesian3(
      -2702979.5635104137,
      -4261981.190435306,
      3887092.144148863,
    ),
    orientation: new Cesium.HeadingPitchRoll(
      4.534265054628527,
      -0.08846186652294352,
      0.0000075141499165098935,
    ),
  });
}

// Lombard Street - 2 cm/pixel resolution
function viewLombardStreet() {
  viewer.scene.camera.flyTo({
    destination: new Cesium.Cartesian3(
      -2705631.6783492276,
      -4259449.36938678,
      3887903.89229016,
    ),
    orientation: new Cesium.HeadingPitchRoll(
      5.999439616451804,
      -0.20513082834763674,
      4.7213266807233367e-7,
    ),
  });
}

Sandcastle.addToolbarMenu([
  {
    text: "Ferry Building",
    onselect: viewFerryBuilding,
  },
  {
    text: "Pier 39",
    onselect: viewPier39,
  },
  {
    text: "Skyline",
    onselect: viewSkyline,
  },
  {
    text: "Lombard Street",
    onselect: viewLombardStreet,
  },
]);

viewFerryBuilding(0);
