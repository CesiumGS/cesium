import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Synthetic layered tileset:
// - The root tileset JSON declares 4 groups, each with a NAME-semantic property.
// - Each group is set on a child content that points to an external tileset.
// - The center content has no group, so it's always shown.
// Buildings are available as b3dm (legacy) or glb content. The GeoJSON variant
// uses MAXAR_content_geojson vector content instead.
const viewer = new Cesium.Viewer("cesiumContainer");

const layerColors = ["TOMATO", "GOLD", "MEDIUMSEAGREEN", "DODGERBLUE"];
const togglesElement = document.getElementById("layerToggles");
const logElement = document.getElementById("log");

let tileset;

// Groups are set on the external tileset content, not on the features below it,
// so find the nearest ancestor content with a group.
function findLayerIndex(tile) {
  for (let t = tile; Cesium.defined(t); t = t.parent) {
    const group = t.content?.group;
    if (Cesium.defined(group)) {
      const name = group.metadata.getPropertyBySemantic("NAME");
      return tileset.layers.getByName(name)[0].index;
    }
  }
  return undefined;
}

async function loadTileset(format) {
  viewer.scene.primitives.remove(tileset);
  togglesElement.innerHTML = "";
  logElement.textContent = "";

  tileset = await Cesium.Cesium3DTileset.fromUrl(
    `../../SampleData/Cesium3DTiles/Layers/${format}/tileset.json`,
  );

  // Root layers exist as soon as fromUrl resolves, before any content is requested.
  // Hide the SE layer now: its external tileset won't be fetched until it's shown.
  tileset.layers.get(3).show = false;

  // Tint each content by layer, and log loads to show hidden layers aren't requested.
  const loaded = [];
  tileset.tileLoad.addEventListener(function (tile) {
    const content = tile.content;
    const index = findLayerIndex(tile);
    if (Cesium.defined(index)) {
      for (let i = 0; i < content.featuresLength; i++) {
        content.getFeature(i).color = Cesium.Color[layerColors[index]];
      }
    }
    loaded.push(content.url.split("/").pop());
    logElement.textContent = `Loaded content:\n${loaded.join("\n")}`;
  });

  for (let i = 0; i < tileset.layers.length; i++) {
    const layer = tileset.layers.get(i);
    Sandcastle.addToggleButton(
      `${layer.name} (${layerColors[i].toLowerCase()})`,
      layer.show,
      function (checked) {
        layer.show = checked;
      },
      "layerToggles",
    );
  }

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
  ],
  "formatMenu",
);
