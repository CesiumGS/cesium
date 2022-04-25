import { arrayFill } from "../Source/Cesium.js";
import { Cartesian2 } from "../Source/Cesium.js";
import { Color } from "../Source/Cesium.js";
import { defaultValue } from "../Source/Cesium.js";
import { defined } from "../Source/Cesium.js";
import { JulianDate } from "../Source/Cesium.js";
import { ImageBasedLighting } from "../Source/Cesium.js";
import { Resource } from "../Source/Cesium.js";
import { Cesium3DTileContentFactory } from "../Source/Cesium.js";
import { Cesium3DTileset } from "../Source/Cesium.js";
import { TileBoundingSphere } from "../Source/Cesium.js";
import { RuntimeError } from "../Source/Cesium.js";
import pollToPromise from "./pollToPromise.js";

const mockTile = {
  contentBoundingVolume: new TileBoundingSphere(),
  _contentBoundingVolume: new TileBoundingSphere(),
  _header: {
    content: {
      boundingVolume: {
        sphere: [0.0, 0.0, 0.0, 1.0],
      },
    },
  },
};

function Cesium3DTilesTester() {}

function padStringToByteAlignment(string, byteAlignment) {
  const length = string.length;
  const paddedLength = Math.ceil(length / byteAlignment) * byteAlignment; // Round up to the required alignment
  const padding = paddedLength - length;
  let whitespace = "";
  for (let i = 0; i < padding; ++i) {
    whitespace += " ";
  }
  return string + whitespace;
}

const time = new JulianDate(2457522.0);

Cesium3DTilesTester.expectRender = function (scene, tileset, callback) {
  const renderOptions = {
    scene: scene,
    time: time,
  };
  tileset.show = false;
  expect(renderOptions).toRender([0, 0, 0, 255]);
  tileset.show = true;
  expect(renderOptions).toRenderAndCall(function (rgba) {
    expect(rgba).not.toEqual([0, 0, 0, 255]);
    if (defined(callback)) {
      callback(rgba);
    }
  });
};

Cesium3DTilesTester.expectRenderBlank = function (scene, tileset) {
  const renderOptions = {
    scene: scene,
    time: time,
  };
  tileset.show = false;
  expect(renderOptions).toRender([0, 0, 0, 255]);
  tileset.show = true;
  expect(renderOptions).toRender([0, 0, 0, 255]);
};

Cesium3DTilesTester.expectRenderTileset = function (scene, tileset) {
  // Verify render before being picked
  Cesium3DTilesTester.expectRender(scene, tileset);

  // Pick a feature
  expect(scene).toPickAndCall(function (result) {
    expect(result).toBeDefined();

    // Change the color of the picked feature to yellow
    result.color = Color.clone(Color.YELLOW, result.color);

    // Expect the pixel color to be some shade of yellow
    Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
      expect(rgba[0]).toBeGreaterThan(0);
      expect(rgba[1]).toBeGreaterThan(0);
      expect(rgba[2]).toEqual(0);
      expect(rgba[3]).toEqual(255);
    });

    // Turn show off and on
    result.show = false;
    Cesium3DTilesTester.expectRenderBlank(scene, tileset);
    result.show = true;
    Cesium3DTilesTester.expectRender(scene, tileset);
  });
};

Cesium3DTilesTester.waitForTilesLoaded = function (scene, tileset) {
  return pollToPromise(function () {
    scene.renderForSpecs();
    return tileset.tilesLoaded;
  }).then(function () {
    scene.renderForSpecs();
    return tileset;
  });
};

Cesium3DTilesTester.waitForReady = function (scene, tileset) {
  return pollToPromise(function () {
    scene.renderForSpecs();
    return tileset.ready;
  }).then(function () {
    return tileset;
  });
};

Cesium3DTilesTester.loadTileset = function (scene, url, options) {
  options = defaultValue(options, {});
  options.url = url;
  options.cullRequestsWhileMoving = defaultValue(
    options.cullRequestsWhileMoving,
    false
  );
  // Load all visible tiles
  const tileset = scene.primitives.add(new Cesium3DTileset(options));

  return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
};

Cesium3DTilesTester.loadTileExpectError = function (scene, arrayBuffer, type) {
  const tileset = {};
  const url = Resource.createIfNeeded("");
  expect(function () {
    return Cesium3DTileContentFactory[type](
      tileset,
      mockTile,
      url,
      arrayBuffer,
      0
    );
  }).toThrowError(RuntimeError);
};

Cesium3DTilesTester.loadTile = function (scene, arrayBuffer, type) {
  const tileset = {
    _statistics: {
      batchTableByteLength: 0,
    },
    root: {},
  };
  const url = Resource.createIfNeeded("");
  const content = Cesium3DTileContentFactory[type](
    tileset,
    mockTile,
    url,
    arrayBuffer,
    0
  );
  content.update(tileset, scene.frameState);
  return content;
};

// Use counter to prevent models from sharing the same cache key,
// this fixes tests that load a model with the same invalid url
let counter = 0;
Cesium3DTilesTester.rejectsReadyPromiseOnError = function (
  scene,
  arrayBuffer,
  type
) {
  const tileset = {
    basePath: counter++,
    _statistics: {
      batchTableByteLength: 0,
    },
    imageBasedLighting: new ImageBasedLighting({
      imageBasedLighting: new Cartesian2(1, 1),
    }),
  };
  const url = Resource.createIfNeeded("");
  const content = Cesium3DTileContentFactory[type](
    tileset,
    mockTile,
    url,
    arrayBuffer,
    0
  );
  content.update(tileset, scene.frameState);

  return content.readyPromise
    .then(function (content) {
      fail("should not resolve");
    })
    .catch(function (error) {
      expect(error).toBeDefined();
    });
};

Cesium3DTilesTester.resolvesReadyPromise = function (scene, url, options) {
  return Cesium3DTilesTester.loadTileset(scene, url, options).then(function (
    tileset
  ) {
    const content = tileset.root.content;
    return content.readyPromise.then(function (content) {
      expect(content).toBeDefined();
    });
  });
};

Cesium3DTilesTester.tileDestroys = function (scene, url, options) {
  return Cesium3DTilesTester.loadTileset(scene, url, options).then(function (
    tileset
  ) {
    const content = tileset.root.content;
    expect(content.isDestroyed()).toEqual(false);
    scene.primitives.remove(tileset);
    expect(content.isDestroyed()).toEqual(true);
  });
};

Cesium3DTilesTester.generateBatchedTileBuffer = function (options) {
  // Procedurally generate the tile array buffer for testing purposes
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const magic = defaultValue(options.magic, [98, 51, 100, 109]);
  const version = defaultValue(options.version, 1);
  const featuresLength = defaultValue(options.featuresLength, 1);
  const featureTableJson = {
    BATCH_LENGTH: featuresLength,
  };
  const featureTableJsonString = JSON.stringify(featureTableJson);
  const featureTableJsonByteLength = featureTableJsonString.length;

  const headerByteLength = 28;
  const byteLength = headerByteLength + featureTableJsonByteLength;
  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);
  view.setUint8(0, magic[0]);
  view.setUint8(1, magic[1]);
  view.setUint8(2, magic[2]);
  view.setUint8(3, magic[3]);
  view.setUint32(4, version, true); // version
  view.setUint32(8, byteLength, true); // byteLength
  view.setUint32(12, featureTableJsonByteLength, true); // featureTableJsonByteLength
  view.setUint32(16, 0, true); // featureTableBinaryByteLength
  view.setUint32(20, 0, true); // batchTableJsonByteLength
  view.setUint32(24, 0, true); // batchTableBinaryByteLength

  let i;
  let byteOffset = headerByteLength;
  for (i = 0; i < featureTableJsonByteLength; i++) {
    view.setUint8(byteOffset, featureTableJsonString.charCodeAt(i));
    byteOffset++;
  }

  return buffer;
};

Cesium3DTilesTester.generateInstancedTileBuffer = function (options) {
  // Procedurally generate the tile array buffer for testing purposes
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const magic = defaultValue(options.magic, [105, 51, 100, 109]);
  const version = defaultValue(options.version, 1);

  const gltfFormat = defaultValue(options.gltfFormat, 1);
  const gltfUri = defaultValue(options.gltfUri, "model.gltf");
  const gltfUriByteLength = gltfUri.length;

  const featureTableJson = options.featureTableJson;
  let featureTableJsonString = "";
  if (defined(featureTableJson)) {
    if (Object.keys(featureTableJson).length > 0) {
      featureTableJsonString = JSON.stringify(featureTableJson);
    }
  } else {
    const featuresLength = defaultValue(options.featuresLength, 1);
    featureTableJsonString = JSON.stringify({
      INSTANCES_LENGTH: featuresLength,
      POSITION: arrayFill(new Array(featuresLength * 3), 0),
    });
  }
  featureTableJsonString = padStringToByteAlignment(featureTableJsonString, 8);
  const featureTableJsonByteLength = featureTableJsonString.length;

  const featureTableBinary = defaultValue(
    options.featureTableBinary,
    new Uint8Array(0)
  );
  const featureTableBinaryByteLength = featureTableBinary.length;

  const batchTableJson = options.batchTableJson;
  let batchTableJsonString = "";
  if (defined(batchTableJson) && Object.keys(batchTableJson).length > 0) {
    batchTableJsonString = JSON.stringify(batchTableJson);
  }
  batchTableJsonString = padStringToByteAlignment(batchTableJsonString, 8);
  const batchTableJsonByteLength = batchTableJsonString.length;

  const batchTableBinary = defaultValue(
    options.batchTableBinary,
    new Uint8Array(0)
  );
  const batchTableBinaryByteLength = batchTableBinary.length;

  const headerByteLength = 32;
  const byteLength =
    headerByteLength +
    featureTableJsonByteLength +
    featureTableBinaryByteLength +
    batchTableJsonByteLength +
    batchTableBinaryByteLength +
    gltfUriByteLength;
  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);
  view.setUint8(0, magic[0]);
  view.setUint8(1, magic[1]);
  view.setUint8(2, magic[2]);
  view.setUint8(3, magic[3]);
  view.setUint32(4, version, true);
  view.setUint32(8, byteLength, true);
  view.setUint32(12, featureTableJsonByteLength, true);
  view.setUint32(16, featureTableBinaryByteLength, true);
  view.setUint32(20, batchTableJsonByteLength, true);
  view.setUint32(24, batchTableBinaryByteLength, true);
  view.setUint32(28, gltfFormat, true);

  let i;
  let byteOffset = headerByteLength;
  for (i = 0; i < featureTableJsonByteLength; i++) {
    view.setUint8(byteOffset, featureTableJsonString.charCodeAt(i));
    byteOffset++;
  }
  for (i = 0; i < featureTableBinaryByteLength; i++) {
    view.setUint8(byteOffset, featureTableBinary[i]);
    byteOffset++;
  }
  for (i = 0; i < batchTableJsonByteLength; i++) {
    view.setUint8(byteOffset, batchTableJsonString.charCodeAt(i));
    byteOffset++;
  }
  for (i = 0; i < batchTableBinaryByteLength; i++) {
    view.setUint8(byteOffset, batchTableBinary[i]);
    byteOffset++;
  }
  for (i = 0; i < gltfUriByteLength; i++) {
    view.setUint8(byteOffset, gltfUri.charCodeAt(i));
    byteOffset++;
  }
  return buffer;
};

Cesium3DTilesTester.generatePointCloudTileBuffer = function (options) {
  // Procedurally generate the tile array buffer for testing purposes
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const magic = defaultValue(options.magic, [112, 110, 116, 115]);
  const version = defaultValue(options.version, 1);
  let featureTableJson = options.featureTableJson;
  if (!defined(featureTableJson)) {
    featureTableJson = {
      POINTS_LENGTH: 1,
      POSITIONS: {
        byteOffset: 0,
      },
    };
  }

  let featureTableJsonString = JSON.stringify(featureTableJson);
  featureTableJsonString = padStringToByteAlignment(featureTableJsonString, 4);
  const featureTableJsonByteLength = defaultValue(
    options.featureTableJsonByteLength,
    featureTableJsonString.length
  );

  const featureTableBinary = new ArrayBuffer(12); // Enough space to hold 3 floats
  const featureTableBinaryByteLength = featureTableBinary.byteLength;

  const headerByteLength = 28;
  const byteLength =
    headerByteLength +
    featureTableJsonByteLength +
    featureTableBinaryByteLength;
  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);
  view.setUint8(0, magic[0]);
  view.setUint8(1, magic[1]);
  view.setUint8(2, magic[2]);
  view.setUint8(3, magic[3]);
  view.setUint32(4, version, true); // version
  view.setUint32(8, byteLength, true); // byteLength
  view.setUint32(12, featureTableJsonByteLength, true); // featureTableJsonByteLength
  view.setUint32(16, featureTableBinaryByteLength, true); // featureTableBinaryByteLength
  view.setUint32(20, 0, true); // batchTableJsonByteLength
  view.setUint32(24, 0, true); // batchTableBinaryByteLength

  let i;
  let byteOffset = headerByteLength;
  for (i = 0; i < featureTableJsonByteLength; i++) {
    view.setUint8(byteOffset, featureTableJsonString.charCodeAt(i));
    byteOffset++;
  }
  for (i = 0; i < featureTableBinaryByteLength; i++) {
    view.setUint8(byteOffset, featureTableBinary[i]);
    byteOffset++;
  }
  return buffer;
};

Cesium3DTilesTester.generateCompositeTileBuffer = function (options) {
  // Procedurally generate the tile array buffer for testing purposes
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const magic = defaultValue(options.magic, [99, 109, 112, 116]);
  const version = defaultValue(options.version, 1);
  const tiles = defaultValue(options.tiles, []);
  const tilesLength = tiles.length;

  let i;
  let tilesByteLength = 0;
  for (i = 0; i < tilesLength; ++i) {
    tilesByteLength += tiles[i].byteLength;
  }

  const headerByteLength = 16;
  const byteLength = headerByteLength + tilesByteLength;
  const buffer = new ArrayBuffer(byteLength);
  const uint8Array = new Uint8Array(buffer);
  const view = new DataView(buffer);
  view.setUint8(0, magic[0]);
  view.setUint8(1, magic[1]);
  view.setUint8(2, magic[2]);
  view.setUint8(3, magic[3]);
  view.setUint32(4, version, true); // version
  view.setUint32(8, byteLength, true); // byteLength
  view.setUint32(12, tilesLength, true); // tilesLength

  let byteOffset = headerByteLength;
  for (i = 0; i < tilesLength; ++i) {
    const tile = new Uint8Array(tiles[i]);
    uint8Array.set(tile, byteOffset);
    byteOffset += tile.byteLength;
  }

  return buffer;
};

Cesium3DTilesTester.generateVectorTileBuffer = function (options) {
  // Procedurally generate the tile array buffer for testing purposes
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const magic = defaultValue(options.magic, [118, 99, 116, 114]);
  const version = defaultValue(options.version, 1);

  let featureTableJsonString;
  let featureTableJsonByteLength = 0;
  const defineFeatureTable = defaultValue(options.defineFeatureTable, true);
  if (defineFeatureTable) {
    const defineRegion = defaultValue(options.defineRegion, true);
    const featureTableJson = {
      REGION: defineRegion ? [-1.0, -1.0, 1.0, 1.0, -1.0, 1.0] : undefined,
      POLYGONS_LENGTH: defaultValue(options.polygonsLength, 0),
      POLYLINES_LENGTH: defaultValue(options.polylinesLength, 0),
      POINTS_LENGTH: defaultValue(options.pointsLength, 0),
      POLYGON_BATCH_IDS: options.polygonBatchIds,
      POLYLINE_BATCH_IDS: options.polylineBatchIds,
      POINT_BATCH_IDS: options.pointBatchIds,
    };
    featureTableJsonString = JSON.stringify(featureTableJson);
    featureTableJsonByteLength = featureTableJsonString.length;
  }

  const headerByteLength = 44;
  const byteLength = headerByteLength + featureTableJsonByteLength;
  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);
  view.setUint8(0, magic[0]);
  view.setUint8(1, magic[1]);
  view.setUint8(2, magic[2]);
  view.setUint8(3, magic[3]);
  view.setUint32(4, version, true); // version
  view.setUint32(8, byteLength, true); // byteLength
  view.setUint32(12, featureTableJsonByteLength, true); // featureTableJsonByteLength
  view.setUint32(16, 0, true); // featureTableBinaryByteLength
  view.setUint32(20, 0, true); // batchTableJsonByteLength
  view.setUint32(24, 0, true); // batchTableBinaryByteLength
  view.setUint32(28, 0, true); // indicesByteLength
  view.setUint32(32, 0, true); // polygonPositionByteLength
  view.setUint32(36, 0, true); // polylinePositionByteLength
  view.setUint32(40, 0, true); // pointsPositionByteLength

  let i;
  let byteOffset = headerByteLength;
  for (i = 0; i < featureTableJsonByteLength; i++) {
    view.setUint8(byteOffset, featureTableJsonString.charCodeAt(i));
    byteOffset++;
  }

  return buffer;
};

Cesium3DTilesTester.generateGeometryTileBuffer = function (options) {
  // Procedurally generate the tile array buffer for testing purposes
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const magic = defaultValue(options.magic, [103, 101, 111, 109]);
  const version = defaultValue(options.version, 1);

  let featureTableJsonString;
  let featureTableJsonByteLength = 0;
  const defineFeatureTable = defaultValue(options.defineFeatureTable, true);
  if (defineFeatureTable) {
    const featureTableJson = {
      BOXES_LENGTH: defaultValue(options.boxesLength, 0),
      CYLINDERS_LENGTH: defaultValue(options.cylindersLength, 0),
      ELLIPSOIDS_LENGTH: defaultValue(options.ellipsoidsLength, 0),
      SPHERES_LENGTH: defaultValue(options.spheresLength, 0),
      BOX_BATCH_IDS: options.boxBatchIds,
      CYLINDER_BATCH_IDS: options.cylinderBatchIds,
      ELLIPSOID_BATCH_IDS: options.ellipsoidBatchIds,
      SPHERE_BATCH_IDS: options.sphereBatchIds,
    };
    featureTableJsonString = JSON.stringify(featureTableJson);
    featureTableJsonByteLength = featureTableJsonString.length;
  }

  const headerByteLength = 28;
  const byteLength = headerByteLength + featureTableJsonByteLength;
  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);
  view.setUint8(0, magic[0]);
  view.setUint8(1, magic[1]);
  view.setUint8(2, magic[2]);
  view.setUint8(3, magic[3]);
  view.setUint32(4, version, true); // version
  view.setUint32(8, byteLength, true); // byteLength
  view.setUint32(12, featureTableJsonByteLength, true); // featureTableJsonByteLength
  view.setUint32(16, 0, true); // featureTableBinaryByteLength
  view.setUint32(20, 0, true); // batchTableJsonByteLength
  view.setUint32(24, 0, true); // batchTableBinaryByteLength

  let i;
  let byteOffset = headerByteLength;
  for (i = 0; i < featureTableJsonByteLength; i++) {
    view.setUint8(byteOffset, featureTableJsonString.charCodeAt(i));
    byteOffset++;
  }

  return buffer;
};

export default Cesium3DTilesTester;
