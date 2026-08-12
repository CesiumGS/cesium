import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Point discs draped onto world terrain.
//
// Draped points are sized on the ground, not on screen: `size` is read as a
// diameter in meters, so a disc covers the same patch of terrain no matter
// where the camera is. It should grow when zooming in, follow slopes rather
// than floating over them, and stay round at high latitude even though a
// degree of longitude is much shorter there than a degree of latitude.

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  sceneModePicker: false,
  baseLayerPicker: false,
});
const scene = viewer.scene;

try {
  scene.terrainProvider = await Cesium.createWorldTerrainAsync();
} catch (error) {
  console.log(`Error loading world terrain. ${error}`);
}

/////////////////////////////////////////////////////////////////////////////
// Points

// A ridge in the Grand Tetons: steep, so discs have to follow the surface.
const ridgeCenter = [-110.79, 43.75];
// A fjord in Svalbard, at 78 degrees north, where a longitude span covers
// roughly a fifth of the ground a latitude span does.
const arcticCenter = [15.6, 78.22];

const palette = [
  "#ff375f",
  "#ff9f0a",
  "#ffd60a",
  "#30d158",
  "#0a84ff",
  "#bf5af0",
];

// [lon, lat, diameter in meters, css color]
const points = [];

// A row of increasing diameters, to read off ground size directly.
const sizes = [40, 80, 120, 160, 200, 240];
for (let i = 0; i < sizes.length; i++) {
  points.push([
    ridgeCenter[0] - 0.008 + i * 0.0032,
    ridgeCenter[1],
    sizes[i],
    palette[i],
  ]);
}

// A dense scatter across the ridge, to exercise several lookup grid cells and
// to show discs overlapping and compositing against sloped terrain.
let seed = 7;
function random() {
  // Deterministic, so repeated runs are comparable.
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
for (let i = 0; i < 200; i++) {
  points.push([
    ridgeCenter[0] - 0.03 + random() * 0.06,
    ridgeCenter[1] - 0.025 + random() * 0.02,
    30 + Math.floor(random() * 60),
    palette[Math.floor(random() * palette.length)],
  ]);
}

// Same discs near the pole. Sized in meters, these must stay circles even
// though they span far more longitude than latitude.
for (let i = 0; i < sizes.length; i++) {
  points.push([
    arcticCenter[0] - 0.04 + i * 0.016,
    arcticCenter[1],
    sizes[i],
    palette[i],
  ]);
}

const collection = new Cesium.BufferPointCollection({
  primitiveCountMax: points.length,
  heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
});

for (const [longitude, latitude, size, css] of points) {
  collection.add({
    position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 0.0),
    material: new Cesium.BufferPointMaterial({
      color: Cesium.Color.fromCssColorString(css),
      size,
    }),
  });
}

// A clamping `heightReference` drapes the collection instead of drawing it as
// standalone geometry; adding it to the scene is all the registration needed.
scene.primitives.add(collection);

/////////////////////////////////////////////////////////////////////////////
// Views

function flyTo(longitude, latitude, height, headingDegrees, pitchDegrees) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
    orientation: {
      heading: Cesium.Math.toRadians(headingDegrees),
      pitch: Cesium.Math.toRadians(pitchDegrees),
      roll: 0.0,
    },
    duration: 2.0,
  });
}

// Overhead: discs should read as true circles, and the size row should step up
// evenly from 40 to 240 meters across. The ridge tops out around 3200 meters,
// so every view is well above that.
Sandcastle.addToolbarButton("Size row", () =>
  flyTo(ridgeCenter[0], ridgeCenter[1], 9000.0, 0.0, -90.0),
);
// Oblique across the ridge: discs should lie on the slopes, foreshortened on
// screen but still covering the same ground.
Sandcastle.addToolbarButton("Ridge oblique", () =>
  flyTo(ridgeCenter[0], ridgeCenter[1] - 0.07, 8000.0, 0.0, -30.0),
);
// Close in: ground sizing means the discs keep growing rather than holding a
// fixed pixel size.
Sandcastle.addToolbarButton("Close up", () =>
  flyTo(ridgeCenter[0] - 0.008, ridgeCenter[1] - 0.008, 5000.0, 0.0, -55.0),
);
// High latitude: the same diameters, where longitude and latitude scales differ
// by roughly five to one.
Sandcastle.addToolbarButton("Arctic", () =>
  flyTo(arcticCenter[0], arcticCenter[1], 6000.0, 0.0, -90.0),
);

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(
    ridgeCenter[0],
    ridgeCenter[1],
    9000.0,
  ),
});
