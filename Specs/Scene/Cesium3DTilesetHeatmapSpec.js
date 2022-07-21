import {
  Color,
  JulianDate,
  Matrix4,
  Cesium3DTile,
  Cesium3DTileContentState,
  Cesium3DTilesetHeatmap,
} from "../../../Source/Cesium.js";

import createScene from "../createScene.js";

describe("Scene/Cesium3DTilesetHeatmap", function () {
  const tileWithBoundingSphere = {
    geometricError: 1,
    refine: "REPLACE",
    children: [],
    boundingVolume: {
      sphere: [0.0, 0.0, 0.0, 5.0],
    },
  };

  const mockTileset = {
    debugShowBoundingVolume: true,
    debugShowViewerRequestVolume: true,
    modelMatrix: Matrix4.IDENTITY,
    _geometricError: 2,
  };

  let scene;
  beforeEach(function () {
    scene = createScene();
    scene.frameState.passes.render = true;
  });

  afterEach(function () {
    scene.destroyForSpecs();
  });

  function verifyColor(tileColor, expectedColor) {
    const diff = new Color(
      Math.abs(expectedColor.red - tileColor.red),
      Math.abs(expectedColor.green - tileColor.green),
      Math.abs(expectedColor.blue - tileColor.blue)
    );

    const threshold = 0.11;
    expect(diff.red).toBeLessThan(threshold);
    expect(diff.green).toBeLessThan(threshold);
    expect(diff.blue).toBeLessThan(threshold);
  }

  it("resetMinimumMaximum", function () {
    const heatmap = new Cesium3DTilesetHeatmap("_centerZDepth");
    heatmap._minimum = -1;
    heatmap._maximum = 1;
    heatmap.resetMinimumMaximum(); // Preparing for next frame, previousMinimum/Maximum take current frame's values

    expect(heatmap._minimum).toBe(Number.MAX_VALUE);
    expect(heatmap._maximum).toBe(-Number.MAX_VALUE);
    expect(heatmap._previousMinimum).toBe(-1);
    expect(heatmap._previousMaximum).toBe(1);
  });

  it("uses reference minimum maximum", function () {
    const tilePropertyName = "_loadTimestamp";
    const heatmap = new Cesium3DTilesetHeatmap(tilePropertyName);

    const referenceMinimumJulianDate = new JulianDate();
    const referenceMaximumJulianDate = new JulianDate();
    JulianDate.now(referenceMinimumJulianDate);
    JulianDate.addSeconds(
      referenceMinimumJulianDate,
      10,
      referenceMaximumJulianDate
    );

    heatmap.setReferenceMinimumMaximum(
      referenceMinimumJulianDate,
      referenceMaximumJulianDate,
      tilePropertyName
    ); // User wants to colorize to a fixed reference.
    const referenceMinimum = heatmap._referenceMinimum[tilePropertyName];
    const referenceMaximum = heatmap._referenceMaximum[tilePropertyName];

    heatmap._minimum = -1;
    heatmap._maximum = 1;
    heatmap.resetMinimumMaximum(); // Preparing for next frame, previousMinimum/Maximum always uses the reference values if they exist for the variable.

    expect(heatmap._minimum).toBe(Number.MAX_VALUE);
    expect(heatmap._maximum).toBe(-Number.MAX_VALUE);
    expect(heatmap._previousMinimum).toBe(referenceMinimum);
    expect(heatmap._previousMaximum).toBe(referenceMaximum);
  });

  it("expected color", function () {
    const heatmap = new Cesium3DTilesetHeatmap("_centerZDepth");

    const tile = new Cesium3DTile(
      mockTileset,
      "/some_url",
      tileWithBoundingSphere,
      undefined
    );
    tile._contentState = Cesium3DTileContentState.READY;
    tile.hasEmptyContent = false;
    const frameState = scene.frameState;
    tile._selectedFrame = frameState.frameNumber;
    const originalColor = tile._debugColor;

    // This is first frame, previousMinimum/Maximum are unititialized so no coloring occurs
    tile._centerZDepth = 1;
    heatmap.colorize(tile, frameState);
    tile._centerZDepth = -1;
    heatmap.colorize(tile, frameState);

    expect(heatmap._minimum).toBe(-1);
    expect(heatmap._maximum).toBe(1);
    verifyColor(tile._debugColor, originalColor);

    // Preparing for next frame, previousMinimum/Maximum take current frame's values
    heatmap.resetMinimumMaximum();

    tile._centerZDepth = -1;
    heatmap.colorize(tile, frameState);

    const expectedColor = Color.BLACK;
    verifyColor(tile._debugColor, expectedColor);
  });
});
