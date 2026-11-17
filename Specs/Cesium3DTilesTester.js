import { Cartesian3, Color, Frozen, JulianDate, defined } from "@cesium/core";
import {
  ImageBasedLighting,
  Resource,
  Cesium3DTileContentFactory,
  Cesium3DTileset,
  TileBoundingSphere,
} from "@cesium/engine";
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

/**
 * @param {string} string The string to pad.
 * @param {number} byteAlignment The alignment, in bytes, of the padded string's length.
 * @returns {string} The string, padded with spaces to a multiple of <code>byteAlignment</code>.
 */
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

/**
 * Expects the tileset to render nothing when hidden, and something when shown.
 *
 * @param {SpecScene} scene The scene the tileset is in.
 * @param {Cesium3DTileset} tileset The tileset to render.
 * @param {function(Uint8Array): void} [callback] Called with the rendered pixel when the tileset is shown.
 */
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

/**
 * Expects the tileset to render nothing, whether hidden or shown.
 *
 * @param {SpecScene} scene The scene the tileset is in.
 * @param {Cesium3DTileset} tileset The tileset to render.
 */
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

/**
 * Expects the tileset to render, and a picked feature to change color and visibility.
 *
 * @param {SpecScene} scene The scene the tileset is in.
 * @param {Cesium3DTileset} tileset The tileset to render and pick from.
 */
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

/**
 * Renders the scene until all of the tileset's requested tiles are loaded.
 * <p>
 * If a spec times out, its afterEach destroys the tileset. Polling is canceled then, so the
 * timed-out spec does not keep rendering the shared scene during the next spec.
 * </p>
 *
 * @param {SpecScene} scene The scene to render while waiting.
 * @param {Cesium3DTileset} tileset The tileset to wait for.
 * @returns {Promise<Cesium3DTileset>} A promise that resolves to the tileset once all of its requested tiles are loaded.
 */
Cesium3DTilesTester.waitForTilesLoaded = function (scene, tileset) {
  return pollToPromise(
    function () {
      scene.renderForSpecs();
      return tileset.tilesLoaded;
    },
    {
      timeout: 10000,
      isCanceled: function () {
        return tileset.isDestroyed();
      },
    },
  ).then(function () {
    scene.renderForSpecs();
    return tileset;
  });
};

/**
 * @param {SpecScene} scene The scene to render while waiting.
 * @param {Cesium3DTile} tile The tile to wait for.
 * @returns {Promise<Cesium3DTile>} A promise that resolves to the tile once its content is no longer unloaded.
 */
Cesium3DTilesTester.waitForTileContent = function (scene, tile) {
  return pollToPromise(
    function () {
      scene.renderForSpecs();
      return !tile.contentUnloaded;
    },
    {
      isCanceled: function () {
        return tile.isDestroyed();
      },
    },
  ).then(function () {
    scene.renderForSpecs();
    return tile;
  });
};

/**
 * @param {SpecScene} scene The scene to render while waiting.
 * @param {Cesium3DTile} tile The tile to wait for.
 * @returns {Promise<Cesium3DTile>} A promise that resolves to the tile once its content is ready.
 */
Cesium3DTilesTester.waitForTileContentReady = function (scene, tile) {
  return pollToPromise(
    function () {
      scene.renderForSpecs();
      return tile.contentReady;
    },
    {
      isCanceled: function () {
        return tile.isDestroyed();
      },
    },
  ).then(function () {
    scene.renderForSpecs();
    return tile;
  });
};

/**
 * A white ambient light with low intensity
 * @returns {ImageBasedLighting} Image-based lighting with only that ambient light.
 */
function createDefaultImageBasedLighting() {
  return new ImageBasedLighting({
    sphericalHarmonicCoefficients: [
      new Cartesian3(0.4, 0.4, 0.4),
      Cartesian3.ZERO,
      Cartesian3.ZERO,
      Cartesian3.ZERO,
      Cartesian3.ZERO,
      Cartesian3.ZERO,
      Cartesian3.ZERO,
      Cartesian3.ZERO,
      Cartesian3.ZERO,
    ],
  });
}

/**
 * Loads a tileset, adds it to the scene, and waits for its visible tiles to load.
 *
 * @param {SpecScene} scene The scene to add the tileset to.
 * @param {string|Resource} url The URL of the tileset JSON.
 * @param {Cesium3DTileset.ConstructorOptions} [options] Options for the tileset. Unless set, requests are not culled while the camera moves, image based lighting is a dim white ambient light, and the dynamic environment map is disabled.
 * @returns {Promise<Cesium3DTileset>} A promise that resolves to the tileset once its visible tiles are loaded.
 */
Cesium3DTilesTester.loadTileset = async function (scene, url, options) {
  options = options ?? {};
  options.cullRequestsWhileMoving = options.cullRequestsWhileMoving ?? false;
  options.imageBasedLighting =
    options.imageBasedLighting ?? createDefaultImageBasedLighting();
  options.environmentMapOptions = {
    enabled: false, // disable other diffuse lighting by default
    ...options.environmentMapOptions,
  };

  const tileset = await Cesium3DTileset.fromUrl(url, options);

  // Load all visible tiles
  scene.primitives.add(tileset);
  await Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
  return tileset;
};

/**
 * @param {ArrayBuffer} arrayBuffer The tile's content.
 * @param {string} type The content type, such as "b3dm".
 * @returns {Promise<Cesium3DTileContent>} A promise that resolves to the content.
 */
Cesium3DTilesTester.createContentForMockTile = async function (
  arrayBuffer,
  type,
) {
  const tileset = {};
  const url = Resource.createIfNeeded("");
  return Cesium3DTileContentFactory[type](
    tileset,
    mockTile,
    url,
    arrayBuffer,
    0,
  );
};

/**
 * Expects the root tile's content to be destroyed when the tileset is removed from the scene.
 *
 * @param {SpecScene} scene The scene to add the tileset to.
 * @param {string|Resource} url The URL of the tileset JSON.
 * @param {Cesium3DTileset.ConstructorOptions} [options] Options for the tileset, as for loadTileset.
 * @returns {Promise<void>} A promise that resolves once the content is checked.
 */
Cesium3DTilesTester.tileDestroys = function (scene, url, options) {
  return Cesium3DTilesTester.loadTileset(scene, url, options).then(
    function (tileset) {
      const content = tileset.root.content;
      expect(content.isDestroyed()).toEqual(false);
      scene.primitives.remove(tileset);
      expect(content.isDestroyed()).toEqual(true);
    },
  );
};

/**
 * Generates a b3dm tile.
 *
 * @param {object} [options] Object with the following properties:
 * @param {number[]} [options.magic] The four magic bytes.
 * @param {number} [options.version=1] The version written to the tile's header.
 * @param {number} [options.featuresLength=1] The BATCH_LENGTH written to the feature table.
 * @returns {ArrayBuffer} The tile's binary content.
 */
Cesium3DTilesTester.generateBatchedTileBuffer = function (options) {
  // Procedurally generate the tile array buffer for testing purposes
  options = options ?? {};
  const magic = options.magic ?? [98, 51, 100, 109];
  const version = options.version ?? 1;
  const featuresLength = options.featuresLength ?? 1;
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

  let byteOffset = headerByteLength;
  for (let i = 0; i < featureTableJsonByteLength; i++) {
    view.setUint8(byteOffset, featureTableJsonString.charCodeAt(i));
    byteOffset++;
  }

  return buffer;
};

/**
 * Generates an i3dm tile.
 *
 * @param {object} [options] Object with the following properties:
 * @param {number[]} [options.magic] The four magic bytes.
 * @param {number} [options.version=1] The version written to the tile's header.
 * @param {number} [options.gltfFormat=1] 0 for a glTF URI, 1 for an embedded glTF.
 * @param {string} [options.gltfUri="model.gltf"] The contents of the glTF section.
 * @param {object} [options.featureTableJson] Replaces the default feature table JSON.
 * @param {number} [options.featuresLength=1] The number of instances, if <code>featureTableJson</code> is undefined.
 * @param {Uint8Array} [options.featureTableBinary] The feature table binary. Empty if undefined.
 * @param {object} [options.batchTableJson] The batch table JSON. Omitted if undefined or empty.
 * @param {Uint8Array} [options.batchTableBinary] The batch table binary. Empty if undefined.
 * @returns {ArrayBuffer} The tile's binary content.
 */
Cesium3DTilesTester.generateInstancedTileBuffer = function (options) {
  // Procedurally generate the tile array buffer for testing purposes
  options = options ?? {};
  const magic = options.magic ?? [105, 51, 100, 109];
  const version = options.version ?? 1;

  const gltfFormat = options.gltfFormat ?? 1;
  const gltfUri = options.gltfUri ?? "model.gltf";
  const gltfUriByteLength = gltfUri.length;

  const featureTableJson = options.featureTableJson;
  let featureTableJsonString = "";
  if (defined(featureTableJson)) {
    if (Object.keys(featureTableJson).length > 0) {
      featureTableJsonString = JSON.stringify(featureTableJson);
    }
  } else {
    const featuresLength = options.featuresLength ?? 1;
    featureTableJsonString = JSON.stringify({
      INSTANCES_LENGTH: featuresLength,
      POSITION: new Array(featuresLength * 3).fill(0),
    });
  }
  featureTableJsonString = padStringToByteAlignment(featureTableJsonString, 8);
  const featureTableJsonByteLength = featureTableJsonString.length;

  const featureTableBinary = options.featureTableBinary ?? new Uint8Array(0);
  const featureTableBinaryByteLength = featureTableBinary.length;

  const batchTableJson = options.batchTableJson;
  let batchTableJsonString = "";
  if (defined(batchTableJson) && Object.keys(batchTableJson).length > 0) {
    batchTableJsonString = JSON.stringify(batchTableJson);
  }
  batchTableJsonString = padStringToByteAlignment(batchTableJsonString, 8);
  const batchTableJsonByteLength = batchTableJsonString.length;

  const batchTableBinary = options.batchTableBinary ?? new Uint8Array(0);
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

  let byteOffset = headerByteLength;
  for (let i = 0; i < featureTableJsonByteLength; i++) {
    view.setUint8(byteOffset, featureTableJsonString.charCodeAt(i));
    byteOffset++;
  }
  for (let i = 0; i < featureTableBinaryByteLength; i++) {
    view.setUint8(byteOffset, featureTableBinary[i]);
    byteOffset++;
  }
  for (let i = 0; i < batchTableJsonByteLength; i++) {
    view.setUint8(byteOffset, batchTableJsonString.charCodeAt(i));
    byteOffset++;
  }
  for (let i = 0; i < batchTableBinaryByteLength; i++) {
    view.setUint8(byteOffset, batchTableBinary[i]);
    byteOffset++;
  }
  for (let i = 0; i < gltfUriByteLength; i++) {
    view.setUint8(byteOffset, gltfUri.charCodeAt(i));
    byteOffset++;
  }
  return buffer;
};

/**
 * Generates a pnts tile.
 *
 * @param {object} [options] Object with the following properties:
 * @param {number[]} [options.magic] The four magic bytes.
 * @param {number} [options.version=1] The version written to the tile's header.
 * @param {object} [options.featureTableJson] Replaces the default feature table JSON.
 * @param {number} [options.featureTableJsonByteLength] Overrides the feature table JSON byte length written to the header.
 * @returns {ArrayBuffer} The tile's binary content.
 */
Cesium3DTilesTester.generatePointCloudTileBuffer = function (options) {
  // Procedurally generate the tile array buffer for testing purposes
  options = options ?? {};
  const magic = options.magic ?? [112, 110, 116, 115];
  const version = options.version ?? 1;
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
  const featureTableJsonByteLength =
    options.featureTableJsonByteLength ?? featureTableJsonString.length;

  const featureTableBinary = new Uint8Array(12); // Enough space to hold 3 floats
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

  let byteOffset = headerByteLength;
  for (let i = 0; i < featureTableJsonByteLength; i++) {
    view.setUint8(byteOffset, featureTableJsonString.charCodeAt(i));
    byteOffset++;
  }
  for (let i = 0; i < featureTableBinaryByteLength; i++) {
    view.setUint8(byteOffset, featureTableBinary[i]);
    byteOffset++;
  }
  return buffer;
};

/**
 * Generates a cmpt tile.
 *
 * @param {object} [options] Object with the following properties:
 * @param {number[]} [options.magic] The four magic bytes.
 * @param {number} [options.version=1] The version written to the tile's header.
 * @param {ArrayBuffer[]} [options.tiles] The inner tiles.
 * @returns {ArrayBuffer} The tile's binary content.
 */
Cesium3DTilesTester.generateCompositeTileBuffer = function (options) {
  // Procedurally generate the tile array buffer for testing purposes
  options = options ?? {};
  const magic = options.magic ?? [99, 109, 112, 116];
  const version = options.version ?? 1;
  const tiles = options.tiles ?? Frozen.EMPTY_ARRAY;
  const tilesLength = tiles.length;

  let tilesByteLength = 0;
  for (let i = 0; i < tilesLength; ++i) {
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
  for (let i = 0; i < tilesLength; ++i) {
    const tile = new Uint8Array(tiles[i]);
    uint8Array.set(tile, byteOffset);
    byteOffset += tile.byteLength;
  }

  return buffer;
};

/**
 * Generates a vctr tile.
 *
 * @param {object} [options] Object with the following properties:
 * @param {number[]} [options.magic] The four magic bytes.
 * @param {number} [options.version=1] The version written to the tile's header.
 * @param {boolean} [options.defineFeatureTable=true] Whether to write the feature table JSON.
 * @param {boolean} [options.defineRegion=true] Whether the feature table includes a REGION.
 * @param {number} [options.polygonsLength=0] The POLYGONS_LENGTH written to the feature table.
 * @param {number} [options.polylinesLength=0] The POLYLINES_LENGTH written to the feature table.
 * @param {number} [options.pointsLength=0] The POINTS_LENGTH written to the feature table.
 * @param {number[]} [options.polygonBatchIds] The POLYGON_BATCH_IDS written to the feature table.
 * @param {number[]} [options.polylineBatchIds] The POLYLINE_BATCH_IDS written to the feature table.
 * @param {number[]} [options.pointBatchIds] The POINT_BATCH_IDS written to the feature table.
 * @returns {ArrayBuffer} The tile's binary content.
 */
Cesium3DTilesTester.generateVectorTileBuffer = function (options) {
  // Procedurally generate the tile array buffer for testing purposes
  options = options ?? {};
  const magic = options.magic ?? [118, 99, 116, 114];
  const version = options.version ?? 1;

  let featureTableJsonString = "";
  let featureTableJsonByteLength = 0;
  const defineFeatureTable = options.defineFeatureTable ?? true;
  if (defineFeatureTable) {
    const defineRegion = options.defineRegion ?? true;
    const featureTableJson = {
      REGION: defineRegion ? [-1.0, -1.0, 1.0, 1.0, -1.0, 1.0] : undefined,
      POLYGONS_LENGTH: options.polygonsLength ?? 0,
      POLYLINES_LENGTH: options.polylinesLength ?? 0,
      POINTS_LENGTH: options.pointsLength ?? 0,
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

  let byteOffset = headerByteLength;
  for (let i = 0; i < featureTableJsonByteLength; i++) {
    view.setUint8(byteOffset, featureTableJsonString.charCodeAt(i));
    byteOffset++;
  }

  return buffer;
};

/**
 * Generates a geom tile.
 *
 * @param {object} [options] Object with the following properties:
 * @param {number[]} [options.magic] The four magic bytes.
 * @param {number} [options.version=1] The version written to the tile's header.
 * @param {boolean} [options.defineFeatureTable=true] Whether to write the feature table JSON.
 * @param {number} [options.boxesLength=0] The BOXES_LENGTH written to the feature table.
 * @param {number} [options.cylindersLength=0] The CYLINDERS_LENGTH written to the feature table.
 * @param {number} [options.ellipsoidsLength=0] The ELLIPSOIDS_LENGTH written to the feature table.
 * @param {number} [options.spheresLength=0] The SPHERES_LENGTH written to the feature table.
 * @param {number[]} [options.boxBatchIds] The BOX_BATCH_IDS written to the feature table.
 * @param {number[]} [options.cylinderBatchIds] The CYLINDER_BATCH_IDS written to the feature table.
 * @param {number[]} [options.ellipsoidBatchIds] The ELLIPSOID_BATCH_IDS written to the feature table.
 * @param {number[]} [options.sphereBatchIds] The SPHERE_BATCH_IDS written to the feature table.
 * @returns {ArrayBuffer} The tile's binary content.
 */
Cesium3DTilesTester.generateGeometryTileBuffer = function (options) {
  // Procedurally generate the tile array buffer for testing purposes
  options = options ?? {};
  const magic = options.magic ?? [103, 101, 111, 109];
  const version = options.version ?? 1;

  let featureTableJsonString = "";
  let featureTableJsonByteLength = 0;
  const defineFeatureTable = options.defineFeatureTable ?? true;
  if (defineFeatureTable) {
    const featureTableJson = {
      BOXES_LENGTH: options.boxesLength ?? 0,
      CYLINDERS_LENGTH: options.cylindersLength ?? 0,
      ELLIPSOIDS_LENGTH: options.ellipsoidsLength ?? 0,
      SPHERES_LENGTH: options.spheresLength ?? 0,
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

  let byteOffset = headerByteLength;
  for (let i = 0; i < featureTableJsonByteLength; i++) {
    view.setUint8(byteOffset, featureTableJsonString.charCodeAt(i));
    byteOffset++;
  }

  return buffer;
};

export default Cesium3DTilesTester;
