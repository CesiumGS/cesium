import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

const tileCoordsLayer = viewer.imageryLayers.addImageryProvider(
  new Cesium.TileCoordinatesImageryProvider({
    color: Cesium.Color.YELLOW,
  }),
);

const toggleButton = document.getElementById("toggleTileCoords");
toggleButton.addEventListener("click", function () {
  tileCoordsLayer.show = !tileCoordsLayer.show;
  toggleButton.textContent = tileCoordsLayer.show
    ? "Hide Tile Coordinates"
    : "Show Tile Coordinates";
});

viewer.camera.setView({
  destination: new Cesium.Cartesian3(
    -3046596.558550092,
    4065701.630895504,
    3854536.407434127,
  ),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-45),
    roll: 0.0,
  },
});

const terrain = Cesium.Terrain.fromWorldTerrain({
  requestVertexNormals: true,
});

const provider = await new Promise((resolve) => {
  terrain.readyEvent.addEventListener(() => resolve(terrain.provider));
});

// Region 1: Level 13 world terrain covering area A
const region1 = {
  provider,
  tiles: new Map().set(13, { x: [13963, 13967], y: [2389, 2393] }),
};

// Region 2: Level 13 world terrain covering area B
const region2 = {
  provider,
  tiles: new Map().set(13, { x: [13956, 13959], y: 2392 }),
};

// Region 3: Level 14 ellipsoid terrain (higher zoom override)
const region3 = {
  provider: new Cesium.EllipsoidTerrainProvider(),
  tiles: new Map().set(14, { x: [27930, 27931], y: [4784, 4785] }),
};

const hybrid = new Cesium.HybridTerrainProvider({
  regions: [region1, region2, region3],
  defaultProvider: new Cesium.EllipsoidTerrainProvider(),
});

viewer.terrainProvider = hybrid;

document.getElementById("info").innerHTML =
  `Regions: ${hybrid.regions.length}<br>` +
  `Has Water Mask: ${hybrid.hasWaterMask}<br>` +
  `Has Vertex Normals: ${hybrid.hasVertexNormals}`;
