import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Synthetic layered tileset:
// - The root tileset JSON declares 4 groups, each with a NAME-semantic property.
// - Each group is set on a child content that points to an external tileset.
// - The center content has no group, so it's always shown.
// Buildings are b3dm content. The GeoJSON variant uses MAXAR_content_geojson
// vector content instead, loaded either as a model (default) or as vector
// primitives (vectorGeoJson).
// The standalone GeoJSON mode loads the same GeoJSON files without a tileset,
// one feature layer per file.
const viewer = new Cesium.Viewer("cesiumContainer");

const layerColors = [
  "TOMATO",
  "GOLD",
  "MEDIUMSEAGREEN",
  "DODGERBLUE",
  "ORCHID",
  "DARKORANGE",
];
const togglesElement = document.getElementById("layerToggles");
const logElement = document.getElementById("log");

const geoJsonDirectory = "../../SampleData/Cesium3DTiles/Layers/geojson/";

let tileset;
let geoJsonPrimitives = [];

function reset() {
  viewer.scene.primitives.remove(tileset);
  tileset = undefined;
  for (const primitive of geoJsonPrimitives) {
    viewer.scene.primitives.remove(primitive);
  }
  geoJsonPrimitives = [];
  togglesElement.innerHTML = "";
  logElement.textContent = "";
}

// Add a toggle per layer. Works the same for layers from any source.
function addToggles(layers) {
  layers.forEach(function (layer, i) {
    Sandcastle.addToggleButton(
      `${layer.name} (${layerColors[i].toLowerCase()})`,
      layer.show,
      function (checked) {
        layer.show = checked;
      },
      "layerToggles",
    );
  });
}

async function loadTileset(format, options) {
  reset();

  tileset = await Cesium.Cesium3DTileset.fromUrl(
    `../../SampleData/Cesium3DTiles/Layers/${format}/tileset.json`,
    options,
  );
  const layers = tileset.featureLayers;

  // Root layers exist as soon as fromUrl resolves, before any content is requested.
  // Hide the SE layer now: its external tileset won't be fetched until it's shown.
  layers.get(3).show = false;

  const layerList = [];
  for (let i = 0; i < layers.length; i++) {
    layerList.push(layers.get(i));
  }
  addToggles(layerList);

  // Everything below is optional, for demonstration only. It is not needed to toggle layers.
  // Tint each content by its layer, and log loads to show hidden layers aren't requested.
  const colorByLayer = new Map(
    layerList.map((layer, i) => [layer, Cesium.Color[layerColors[i]]]),
  );
  const loaded = [];
  tileset.tileLoad.addEventListener(function (tile) {
    const content = tile.content;
    for (let i = 0; i < content.featuresLength; i++) {
      // Vector content takes a feature table id; model content ignores it.
      const feature = content.getFeature(i, 0);
      const color = colorByLayer.get(feature.featureLayer);
      if (Cesium.defined(color)) {
        feature.color = color;
      }
      // Vector points and lines draw at 1px by default; enlarge them.
      if (tileset.vectorGeoJson) {
        feature.pointSize = 8;
        feature.lineWidth = 2;
      }
    }
    loaded.push(content.url.split("/").pop());
    logElement.textContent = `Loaded content:\n${loaded.join("\n")}`;
  });

  let offset;
  if (format === "geojson" && !tileset.vectorGeoJson) {
    // GeoJSON points render at 1px by default. A style's pointSize would reset
    // the per-layer tint above, so enlarge them with point attenuation instead.
    tileset.pointCloudShading.attenuation = true;
    tileset.pointCloudShading.maximumAttenuation = 10;
    tileset.pointCloudShading.baseResolution = 4;
  }
  if (format === "geojson") {
    offset = new Cesium.HeadingPitchRange(0, -Cesium.Math.PI_OVER_TWO, 0);
  }

  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(tileset, offset);
}

async function loadGeoJson() {
  reset();

  const files = {
    "Points NW": "points.geojson",
    "Lines NE": "lines.geojson",
    "Polygons SW": "polygons.geojson",
  };
  const layers = [];
  for (const [name, file] of Object.entries(files)) {
    const provider = await Cesium.GeoJsonFeatureLayerProvider.fromUrl(
      geoJsonDirectory + file,
      { name: name },
    );
    // @ts-expect-error Private stand-in until a public API can draw feature layers.
    const primitive = Cesium.GeoJsonPrimitive.fromProvider(provider);
    viewer.scene.primitives.add(primitive);
    geoJsonPrimitives.push(primitive);
    layers.push(provider.featureLayers.get(0));
  }
  addToggles(layers);

  // Everything below is optional, for demonstration only. It is not needed to toggle layers.
  // Tint each layer, and enlarge points (1px by default).
  geoJsonPrimitives.forEach(function (primitive, i) {
    const color = Cesium.Color[layerColors[i]];
    setMaterial(
      primitive.points,
      Cesium.BufferPoint,
      new Cesium.BufferPointMaterial({ color: color, size: 8 }),
    );
    setMaterial(
      primitive.polylines,
      Cesium.BufferPolyline,
      new Cesium.BufferPolylineMaterial({ color: color, width: 3 }),
    );
    setMaterial(
      primitive.polygons,
      Cesium.BufferPolygon,
      new Cesium.BufferPolygonMaterial({ color: color }),
    );
  });

  viewer.camera.setView({
    destination: new Cesium.Rectangle(
      -1.3197209591796106,
      0.6988424218,
      -1.3196390408203893,
      0.6989055782,
    ),
  });
}

function setMaterial(collection, PrimitiveClass, material) {
  if (!Cesium.defined(collection)) {
    return;
  }
  const primitive = new PrimitiveClass();
  for (let i = 0; i < collection.primitiveCount; i++) {
    collection.get(i, primitive).setMaterial(material);
  }
}

Sandcastle.addToolbarMenu(
  [
    { text: "b3dm content", onselect: () => loadTileset("b3dm") },
    { text: "GeoJSON content", onselect: () => loadTileset("geojson") },
    {
      text: "GeoJSON content (vector primitives)",
      onselect: () => loadTileset("geojson", { vectorGeoJson: true }),
    },
    { text: "Standalone GeoJSON (no tileset)", onselect: loadGeoJson },
  ],
  "formatMenu",
);
