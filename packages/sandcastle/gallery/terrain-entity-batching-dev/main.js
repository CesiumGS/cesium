import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain({
    requestWaterMask: true,
    requestVertexNormals: true,
  }),
});

const concavePositions = [
  new Cesium.Cartesian3(
    -2353381.4891308164,
    -3747386.1222378365,
    4577999.291515961,
  ),
  new Cesium.Cartesian3(
    -2359513.937204245,
    -3743087.2343810294,
    4578357.188560644,
  ),
  new Cesium.Cartesian3(
    -2356102.0286082155,
    -3739921.552293276,
    4582670.218770547,
  ),
  new Cesium.Cartesian3(
    -2353889.0353209395,
    -3741183.2274413602,
    4582776.909071608,
  ),
  new Cesium.Cartesian3(
    -2355072.390487758,
    -3742865.615615464,
    4580808.044684757,
  ),
  new Cesium.Cartesian3(
    -2356109.6661414686,
    -3741994.0607898533,
    4580985.489703348,
  ),
  new Cesium.Cartesian3(
    -2357041.8328847606,
    -3743225.9693035223,
    4579509.2148039425,
  ),
  new Cesium.Cartesian3(
    -2354586.752280607,
    -3744890.9511893727,
    4579411.591389144,
  ),
  new Cesium.Cartesian3(
    -2353213.0268325945,
    -3743712.1202877173,
    4581070.08828045,
  ),
  new Cesium.Cartesian3(
    -2353637.930711704,
    -3743402.9513476435,
    4581104.219550749,
  ),
  new Cesium.Cartesian3(
    -2352875.095159641,
    -3742564.819171856,
    4582173.540953957,
  ),
  new Cesium.Cartesian3(
    -2350669.646050987,
    -3743751.6823160048,
    4582334.8406995395,
  ),
];

// concave polygon
viewer.entities.add({
  name: "concave polygon on surface",
  polygon: {
    hierarchy: concavePositions,
    material: "../images/Cesium_Logo_Color.jpg",
  },
  stRotation: 1.0,
});

// Randomly colored, nonoverlapping squares
const latitude = 46.2522;
const longitude = -122.2534;

Cesium.Math.setRandomNumberSeed(133);

for (let x = 0; x < 10; ++x) {
  for (let y = 0; y < 10; ++y) {
    const cornerLat = latitude + 0.01 * x;
    const cornerLon = longitude + 0.01 * y;
    viewer.entities.add({
      id: `${x} ${y}`,
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(
          cornerLon,
          cornerLat,
          cornerLon + 0.009,
          cornerLat + 0.009,
        ),
        material: Cesium.Color.fromRandom().withAlpha(0.5),
        classificationType: Cesium.ClassificationType.TERRAIN,
      },
    });
  }
}

// Checkerboard
const checkerboard = new Cesium.CheckerboardMaterialProperty({
  evenColor: Cesium.Color.ORANGE,
  oddColor: Cesium.Color.YELLOW,
  repeat: new Cesium.Cartesian2(14, 14),
});

viewer.entities.add({
  name: "checkerboard rectangle",
  rectangle: {
    coordinates: Cesium.Rectangle.fromDegrees(
      -122.17778,
      46.36169,
      -120.17778,
      48.36169,
    ),
    material: checkerboard,
    classificationType: Cesium.ClassificationType.TERRAIN,
  },
});

// Ellipse with texture rotation and repetition
viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(
    -121.70711316136793,
    45.943757948892845,
    0.0,
  ),
  name: "ellipse",
  ellipse: {
    semiMinorAxis: 15000.0,
    semiMajorAxis: 30000.0,
    material: new Cesium.ImageMaterialProperty({
      image: "../images/Cesium_Logo_Color.jpg",
      repeat: new Cesium.Cartesian2(10, 10),
    }),
    stRotation: Cesium.Math.toRadians(45),
    classificationType: Cesium.ClassificationType.TERRAIN,
  },
});

viewer.zoomTo(viewer.entities);
