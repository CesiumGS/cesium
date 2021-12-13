import { PntsLoader, Resource, ResourceCache } from "../../../Source/Cesium.js";
//import Cesium3DTilesTester from "../../Cesium3DTilesTester.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/PntsLoader", function () {
  var pointCloudRGBUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudRGB/pointCloudRGB.pnts";
  /*
  var pointCloudRGBAUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudRGBA/tileset.json";
  var pointCloudRGB565Url =
    "./Data/Cesium3DTiles/PointCloud/PointCloudRGB565/tileset.json";
  var pointCloudNoColorUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudNoColor/tileset.json";
  var pointCloudConstantColorUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudConstantColor/tileset.json";
  var pointCloudNormalsUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudNormals/tileset.json";
  var pointCloudNormalsOctEncodedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudNormalsOctEncoded/tileset.json";
  var pointCloudQuantizedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudQuantized/tileset.json";
  var pointCloudQuantizedOctEncodedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudQuantizedOctEncoded/tileset.json";
  var pointCloudDracoUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudDraco/tileset.json";
  var pointCloudDracoPartialUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudDracoPartial/tileset.json";
  var pointCloudDracoBatchedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudDracoBatched/tileset.json";
  var pointCloudWGS84Url =
    "./Data/Cesium3DTiles/PointCloud/PointCloudWGS84/tileset.json";
  var pointCloudBatchedUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudBatched/tileset.json";
  var pointCloudWithPerPointPropertiesUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudWithPerPointProperties/tileset.json";
  var pointCloudWithUnicodePropertyNamesUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudWithUnicodePropertyNames/tileset.json";
  var pointCloudWithTransformUrl =
    "./Data/Cesium3DTiles/PointCloud/PointCloudWithTransform/tileset.json";
  var pointCloudTilesetUrl =
    "./Data/Cesium3DTiles/Tilesets/TilesetPoints/tileset.json";
  */

  var scene;
  var pntsLoaders = [];

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    for (var i = 0; i < pntsLoaders.length; i++) {
      var loader = pntsLoaders[i];
      if (!loader.isDestroyed()) {
        loader.destroy();
      }
    }
    pntsLoaders.length = 0;
    ResourceCache.clearForSpecs();
  });

  function loadPnts(pntsPath) {
    var resource = Resource.createIfNeeded(pntsPath);

    return Resource.fetchArrayBuffer({
      url: pntsPath,
    }).then(function (arrayBuffer) {
      var loader = new PntsLoader({
        pntsResource: resource,
        arrayBuffer: arrayBuffer,
      });
      pntsLoaders.push(loader);
      loader.load();

      return waitForLoaderProcess(loader, scene);
    });
  }

  it("loads PointCloudRGB", function () {
    return loadPnts(pointCloudRGBUrl).then(function (loader) {
      var components = loader.components;
      expect(components).toBeDefined();
      // TODO: what to check here?
      var featureMetadata = components.featureMetadata;
      expect(featureMetadata).toBeUndefined();
    });
  });

  // check if it throws for invalid  version
  // check if it throws for other problems
  // check if it destroys
});
