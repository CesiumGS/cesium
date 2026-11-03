import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: false,
  baseLayerPicker: false,
  geocoder: false,
  timeline: false,
  animation: false,
});
const scene = viewer.scene;
scene.globe.baseColor = Cesium.Color.fromCssColorString("#263238");

// A small dataset with every geometry type, laid out on a grid.
const originLongitude = -75.1652;
const originLatitude = 39.9526;
const cellSize = 0.0005;

function toDegrees([x, y]) {
  return [originLongitude + x * cellSize, originLatitude + y * cellSize];
}

function feature(name, kind, geometry) {
  return { type: "Feature", properties: { name, kind }, geometry };
}

function polygon(name, kind, outer, holes = []) {
  const close = (ring) => [...ring, ring[0]].map(toDegrees);
  return feature(name, kind, {
    type: "Polygon",
    coordinates: [close(outer), ...holes.map(close)],
  });
}

function line(name, kind, coordinates) {
  return feature(name, kind, {
    type: "LineString",
    coordinates: coordinates.map(toDegrees),
  });
}

function points(name, kind, coordinates) {
  return feature(name, kind, {
    type: "MultiPoint",
    coordinates: coordinates.map(toDegrees),
  });
}

const geoJson = {
  type: "FeatureCollection",
  features: [
    polygon(
      "Park",
      "park",
      [
        [0, 0],
        [4, 0],
        [4, 3],
        [0, 3],
      ],
      [
        [
          [1.5, 1],
          [2.5, 1],
          [2.5, 2],
          [1.5, 2],
        ],
      ],
    ),
    polygon("Library", "building", [
      [5, 0],
      [8, 0],
      [8, 3],
      [5, 3],
    ]),
    line("Main Street", "road", [
      [-1, -1],
      [9, -1],
      [9, 4],
    ]),
    line("Side Street", "road", [
      [4.5, -1],
      [4.5, 4],
    ]),
    points("Trees", "tree", [
      [0.5, 0.5],
      [3.5, 0.5],
      [0.5, 2.5],
      [3.5, 2.5],
    ]),
    points("Entrance", "entrance", [[6.5, 0]]),
  ],
};

function createJsonUrl(json) {
  return URL.createObjectURL(
    new Blob([JSON.stringify(json)], { type: "application/json" }),
  );
}

// A single-tile tileset whose content is the GeoJSON above.
const [west, south] = toDegrees([-2, -2]);
const [east, north] = toDegrees([10, 5]);
const tilesetUrl = createJsonUrl({
  asset: { version: "1.1" },
  extensionsUsed: ["MAXAR_content_geojson"],
  geometricError: 100,
  root: {
    boundingVolume: {
      region: [
        Cesium.Math.toRadians(west),
        Cesium.Math.toRadians(south),
        Cesium.Math.toRadians(east),
        Cesium.Math.toRadians(north),
        0,
        10,
      ],
    },
    geometricError: 0,
    refine: "ADD",
    content: { uri: createJsonUrl(geoJson) },
  },
});

const style = new Cesium.Cesium3DTileStyle({
  color: {
    conditions: [
      ["${kind} === 'park'", "color('#66bb6a')"],
      ["${kind} === 'building'", "color('#ffa726')"],
      ["${kind} === 'road'", "color('#eceff1')"],
      ["${kind} === 'tree'", "color('#1b5e20')"],
      ["true", "color('#e91e63')"],
    ],
  },
  pointSize: 10,
});

let tileset;
async function loadTileset(vectorGeoJson) {
  if (Cesium.defined(tileset)) {
    scene.primitives.remove(tileset);
  }
  tileset = await Cesium.Cesium3DTileset.fromUrl(tilesetUrl, {
    vectorGeoJson: vectorGeoJson,
  });
  tileset.style = style;
  scene.primitives.add(tileset);
}

await loadTileset(true);
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(...toDegrees([4, 1.5]), 1200),
});

Sandcastle.addToggleButton("vectorGeoJson", true, function (checked) {
  loadTileset(checked);
});

const info = document.createElement("div");
info.textContent = "Click a feature";
document.getElementById("toolbar").appendChild(info);

let highlighted;
const highlightedColor = new Cesium.Color();
const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
handler.setInputAction(function (movement) {
  if (Cesium.defined(highlighted)) {
    highlighted.color = highlightedColor;
    highlighted = undefined;
  }

  const picked = scene.pick(movement.position);
  if (
    !(picked instanceof Cesium.Cesium3DTileFeature) &&
    !(picked instanceof Cesium.Cesium3DTileVectorFeature)
  ) {
    info.textContent = "Click a feature";
    return;
  }

  info.textContent = `${picked.getProperty("name")} (${picked.getProperty("kind")})`;
  highlighted = picked;
  Cesium.Color.clone(picked.color, highlightedColor);
  picked.color = Cesium.Color.YELLOW;
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
