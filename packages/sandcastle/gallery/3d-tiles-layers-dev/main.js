import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Synthetic layered tileset:
// - The root tileset JSON declares 4 groups, each with a NAME-semantic property.
// - Each group is set on a child content that points to an external tileset.
// - The center buildings have no group, so they're always shown.
// The same tileset is available with b3dm (legacy) or glb content.
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
  // Hide one now: its external tileset won't be fetched until it's shown.
  tileset.layers.getByName("Buildings SE")[0].show = false;

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

  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(tileset);
}

Sandcastle.addToolbarMenu(
  [
    { text: "b3dm content", onselect: () => loadTileset("b3dm") },
    { text: "glb content", onselect: () => loadTileset("glb") },
  ],
  "formatMenu",
);
