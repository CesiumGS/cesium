import {
  Cartesian3,
  HeadingPitchRoll,
  ImageryLayer,
  TileCoordinatesImageryProvider,
  Transforms,
  WebMercatorTilingScheme,
} from "../../../index.js";
import pollToPromise from "../../../../../Specs/pollToPromise";
import Cesium3DTilesTester from "../../../../../Specs/Cesium3DTilesTester.js";

// A currently hard-wired tileset to be loaded for imagery draping tests
const tileset_unitSquare_fourPrimitives_plain_url =
  "./Data/Models/glTF-2.0/unitSquare/tileset_unitSquare_fourPrimitives_plain.json";

/**
 * Wait until the root tile of the given tileset is loaded
 *
 * @param {Cesium3DTileset} tileset The tileset
 * @param {Scene} scene The scene
 */
async function waitForRootLoaded(tileset, scene) {
  scene.renderForSpecs();
  const root = tileset.root;
  await pollToPromise(() => {
    scene.renderForSpecs();
    return root.contentFailed || root.contentReady;
  });
}

/**
 * Load and return a test tileset that defines an imagery layer,
 * waiting until the root of that tileset is loaded.
 *
 * This means that the resulting <code>tileset.root.content._model._modelImagery</code>
 * (including the <code>ModelPrimitiveImagery</code> instances) will be defined and ready.
 *
 * @param {Scene} scene The scene
 * @returns {Cesium3DTileset} The tileset
 */
async function loadTilesetWithImagery(scene) {
  const url = tileset_unitSquare_fourPrimitives_plain_url;
  const tileset = await Cesium3DTilesTester.loadTileset(scene, url);

  // Create a non-trivial transform for the tileset
  const transform = Transforms.eastNorthUpToFixedFrame(
    Cartesian3.fromDegrees(-120.0, 40.0, 1.0),
  );
  tileset.modelMatrix = transform;

  // Set a view that fully shows the tile content
  // (a unit square at the position given above)
  scene.camera.setView({
    destination: new Cartesian3(
      -2446354.452726738,
      -4237211.248955036,
      4077988.0921552004,
    ),
    orientation: new HeadingPitchRoll(Math.PI * 2, -Math.PI / 2, 0),
  });

  const imageryProvider = new TileCoordinatesImageryProvider({
    tilingScheme: new WebMercatorTilingScheme(),
  });
  const imageryLayer = new ImageryLayer(imageryProvider);
  tileset.imageryLayers.add(imageryLayer);

  await waitForRootLoaded(tileset, scene);
  return tileset;
}

export default loadTilesetWithImagery;
