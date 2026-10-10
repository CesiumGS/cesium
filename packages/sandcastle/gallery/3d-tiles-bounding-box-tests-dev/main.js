import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

// Stores the tileset that is currently selected
let currentTileset;

// Creates the tileset for the sample with the given name.
async function createTileset(exampleName) {
  if (Cesium.defined(currentTileset)) {
    viewer.scene.primitives.remove(currentTileset);
    currentTileset = undefined;
  }
  // Create the tileset, and move it to a certain position on the globe
  currentTileset = await Cesium.Cesium3DTileset.fromGltf(
    `../../SampleData/Cesium3DTiles/gltf-2.1/BoundingBoxTests/${exampleName}/root.tileset.gltf`,
    {
      debugShowBoundingVolume: true,
    },
  );
  viewer.scene.primitives.add(currentTileset);
  currentTileset.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(-75.152325, 39.94704, 0),
  );
  const offset = new Cesium.HeadingPitchRange(
    Cesium.Math.toRadians(-22.5),
    Cesium.Math.toRadians(-22.5),
    12.0,
  );
  viewer.zoomTo(currentTileset, offset);
}

// Create one entry for the list of examples that can
// be selected in the dropdown menu. Selecting one of
// these will load the tileset for the sample with the
// given name.
function createSampleOption(name) {
  return {
    text: name,
    onselect: async function () {
      await createTileset(name);
    },
  };
}

Sandcastle.addToolbarMenu([
  createSampleOption("0_0_0-1_1_2"),
  createSampleOption("0_0_0-1_2_1"),
  createSampleOption("0_0_0-2_1_1"),
  createSampleOption("0_0_2-1_1_4"),
  createSampleOption("0_2_0-1_4_1"),
  createSampleOption("2_0_0-4_1_1"),
  createSampleOption("tileset0000"),
  createSampleOption("tileset0001"),
]);
