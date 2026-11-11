import { defined } from "@cesium/core";
import Cesium3DTilesTester from "../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../Specs/createScene.js";
import createCanvas from "../../../../Specs/createCanvas.js";

/**
 * Gathers the given content and all its 'innerContents', and stores them
 * in the given result array, if the content is defined.
 *
 * @param {Cesium3DTileContent|undefined} content The content
 * @param {Cesium3DTileContent[]} result The array for the results
 */
function gatherAllContentsFromContent(content, result) {
  if (!defined(content)) {
    return;
  }
  result.push(content);
  const innerContents = content.innerContents;
  if (defined(innerContents)) {
    for (const innerContent of innerContents) {
      result.push(innerContent);
    }
  }
}

/**
 * Gathers all contents of the given tile and all its descendants,
 * and stores them in the given result array
 *
 * @param {Cesium3DTile} tile The tile
 * @param {Cesium3DTileContent[]} result The array for the results
 */
function gatherAllContentsFromTile(tile, result) {
  const content = tile.content;
  gatherAllContentsFromContent(content, result);
  const children = tile.children;
  for (const child of children) {
    gatherAllContentsFromTile(child, result);
  }
}

/**
 * Gathers all contents of the given tileset, recursively
 *
 * @param {Cesium3DTile} tile The tile
 * @returns {Cesium3DTileContent[]} The array containing the results
 */
function gatherAllContentsFromTileset(tileset) {
  const result = [];
  gatherAllContentsFromTile(tileset.root, result);
  return result;
}

describe(
  "Scene/Cesium3DTileContent",
  function () {
    // The set of test case URLs. For some reason, I think that it can
    // make sense to use the same names for these variables as they
    // have in the respective "*ContentSpec" tests.
    const glbContentUrl = "./Data/Cesium3DTiles/GltfContent/glb/tileset.json";
    const withBatchTableUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json";
    const instancedWithBatchTableUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/tileset.json";
    const pointCloudRGBUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudRGB/tileset.json";
    const geoJsonMultiPolygonUrl =
      "./Data/Cesium3DTiles/GeoJson/MultiPolygon/tileset.json";
    const vectorTilePolylinesTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylines/tileset.json";
    const implicitTilesetUrl =
      "./Data/Cesium3DTiles/Implicit/ImplicitTileset/tileset_1.1.json";
    const tilesetOfTilesetsUrl =
      "./Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json";
    // TODO Gaussian splats are not supported. See issue XYZ
    //const sphericalHarmonicUrl =
    //  "./Data/Cesium3DTiles/GaussianSplats/sh_unit_cube/tileset.json";
    const geometryAll =
      "./Data/Cesium3DTiles/Geometry/GeometryTileAll/tileset.json";
    const vectorUsStatesUrl = "./Data/vector/sample-us-states-v02.tileset.json";

    // The set of test cases
    const testCases = [];
    testCases.push({
      description: "GLB",
      url: glbContentUrl,
    });
    testCases.push({
      description: "B3DM",
      url: withBatchTableUrl,
    });
    testCases.push({
      description: "I3DM",
      url: instancedWithBatchTableUrl,
    });
    testCases.push({
      description: "PNTS",
      url: pointCloudRGBUrl,
    });
    testCases.push({
      description: "GeoJSON",
      url: geoJsonMultiPolygonUrl,
    });
    testCases.push({
      description: "VCTR",
      url: vectorTilePolylinesTileset,
    });
    testCases.push({
      description: "ImplicitTileset",
      url: implicitTilesetUrl,
    });
    testCases.push({
      description: "ExternalTileset",
      url: tilesetOfTilesetsUrl,
    });

    // TODO Gaussian splats are not supported. See issue XYZ
    /*/
    testCases.push({
      description: "GaussianSplats",
      url: sphericalHarmonicUrl,
    });
    //*/

    testCases.push({
      description: "GEOM",
      url: geometryAll,
    });

    testCases.push({
      description: "Vector (glTF)",
      url: vectorUsStatesUrl,
    });

    let scene;
    beforeAll(function () {
      const canvas = createCanvas(100, 100);
      scene = createScene({
        canvas: canvas,
      });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    describe("generates draw commands only when content.show !== false", () => {
      testCases.forEach((testCase) => {
        it(`for ${testCase.description}`, async () => {
          // Load the tileset, fly to its bounding sphere, and wait
          // until all tiles are loaded
          const tileset = await Cesium3DTilesTester.loadTileset(
            scene,
            testCase.url,
          );
          tileset.maximumScreenSpaceError = 0.0;
          scene.camera.flyToBoundingSphere(tileset.boundingSphere, {
            duration: 0,
          });
          await Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);

          // Perform a spec-rendering pass, and expect ANY draw commands
          // to be present
          const commandList = scene.frameState.commandList;
          scene.renderForSpecs();
          expect(commandList.length).toBeGreaterThan(0);

          // Gather all contents, and set 'show=false' for all of them
          const contents = gatherAllContentsFromTileset(tileset);
          for (const content of contents) {
            content.show = false;
          }

          // Perform another spec-rendering pass, and expect NO draw commands
          scene.renderForSpecs();
          expect(commandList.length).toBe(0);
        });
      });
    });
  },
  "WebGL",
);
