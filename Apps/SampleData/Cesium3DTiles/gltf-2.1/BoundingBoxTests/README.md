# Bounding Box Tests

Sample tilesets for 3D Tiles 2.0 that embed single, simple glTF models as external assets into a tileset, and showing the appropriate tileset bounding volumes for the respective glTF bounding volumes.

## Structure

The directory contains six different tilesets, each with a single external glTF asset. The assets and directories are named based on the bounding volumes of the models, given as the minimum- and maximum points:

- (0,0,0) - (1,1,2)
- (0,0,0) - (1,2,1)
- (0,0,0) - (2,1,1)
- (0,0,2) - (1,1,4)
- (0,2,0) - (1,4,1)
- (2,0,0) - (4,1,1)

## Sandcastle Code

The Sandcastle code that can be used to view the test cases:

```JavaScript
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
    `http://localhost:8003/2.0/BoundingBoxTests/${exampleName}/root.tileset.gltf`,
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

//============================================================================
// Sandcastle UI setup:

// Create one entry for the list of examples that can
// be selected in the dropdown menu. Selecting one of
// these will load the tileset for the sample with the
// given name, and display the given info text in the
// infoTextDisplay
function createSampleOption(name, infoText) {
  return {
    text: name,
    onselect: async function () {
      await createTileset(name);
    },
  };
}

// Create the list of available samples, and add them
// to the sandcastle toolbar
const sampleOptions = [
  createSampleOption("0_0_0-1_1_2", "0_0_0-1_1_2"),
  createSampleOption("0_0_0-1_2_1", "0_0_0-1_2_1"),
  createSampleOption("0_0_0-2_1_1", "0_0_0-2_1_1"),
  createSampleOption("0_0_2-1_1_4", "0_0_2-1_1_4"),
  createSampleOption("0_2_0-1_4_1", "0_2_0-1_4_1"),
  createSampleOption("2_0_0-4_1_1", "2_0_0-4_1_1"),
];
Sandcastle.addToolbarMenu(sampleOptions);
```

## License

[CC0](https://creativecommons.org/share-your-work/public-domain/cc0/)
