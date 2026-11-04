import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Synthetic layered tileset:
// - The root tileset JSON declares 4 groups, each with a NAME-semantic property.
// - Each group is set on a child content that points to an external tileset.
// - The center content has no group, so it's always shown.
// Buildings are available as b3dm (legacy) or glb content. The GeoJSON variant
// uses MAXAR_content_geojson vector content instead.
// The "external groups" variant shows a known gap (#13900): its external
// tilesets define their own groups, which aren't resolved correctly yet.
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
const noteElement = document.getElementById("note");
const logElement = document.getElementById("log");

const externalGroupsNote = `Each layer's external tileset defines its own groups
(West: NW/SW, East: NE/SE), used by its building contents.

Expected: 6 layers. Each building is tinted and toggled
by its own layer.

Today: only the 2 root layers appear. The external
contents resolve their group index against the root's
groups, so the SW building acts as "Buildings East" and
the NE building as "Buildings West" (wrong tint, and
hidden by the wrong toggle).`;

let tileset;

async function loadTileset(format) {
  viewer.scene.primitives.remove(tileset);
  togglesElement.innerHTML = "";
  noteElement.textContent =
    format === "external-groups" ? externalGroupsNote : "";
  logElement.textContent = "";

  tileset = await Cesium.Cesium3DTileset.fromUrl(
    `../../SampleData/Cesium3DTiles/Layers/${format}/tileset.json`,
  );
  const layers = tileset.featureLayers;

  // Root layers exist as soon as fromUrl resolves, before any content is requested.
  // Hide the SE layer now: its external tileset won't be fetched until it's shown.
  if (format !== "external-groups") {
    layers.get(3).show = false;
  }

  // Add a toggle per layer.
  const colorByLayer = new Map();
  for (let i = 0; i < layers.length; i++) {
    const layer = layers.get(i);
    colorByLayer.set(layer, Cesium.Color[layerColors[i]]);
    Sandcastle.addToggleButton(
      `${layer.name} (${layerColors[i].toLowerCase()})`,
      layer.show,
      function (checked) {
        layer.show = checked;
      },
      "layerToggles",
    );
  }

  // Everything below is optional, for demonstration only. It is not needed to toggle layers.
  // Tint each content by its layer, and log loads to show hidden layers aren't requested.
  const loaded = [];
  tileset.tileLoad.addEventListener(function (tile) {
    const content = tile.content;
    for (let i = 0; i < content.featuresLength; i++) {
      const feature = content.getFeature(i);
      const color = colorByLayer.get(feature.featureLayer);
      if (Cesium.defined(color)) {
        feature.color = color;
      }
    }
    loaded.push(content.url.split("/").pop());
    logElement.textContent = `Loaded content:\n${loaded.join("\n")}`;
  });

  let offset;
  if (format === "geojson") {
    // GeoJSON points render at 1px by default. A style's pointSize would reset
    // the per-layer tint above, so enlarge them with point attenuation instead.
    tileset.pointCloudShading.attenuation = true;
    tileset.pointCloudShading.maximumAttenuation = 10;
    tileset.pointCloudShading.baseResolution = 4;
    offset = new Cesium.HeadingPitchRange(0, -Cesium.Math.PI_OVER_TWO, 0);
  }

  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(tileset, offset);
}

Sandcastle.addToolbarMenu(
  [
    { text: "b3dm content", onselect: () => loadTileset("b3dm") },
    { text: "glb content", onselect: () => loadTileset("glb") },
    { text: "GeoJSON content", onselect: () => loadTileset("geojson") },
    {
      text: "External groups (known gap)",
      onselect: () => loadTileset("external-groups"),
    },
  ],
  "formatMenu",
);
