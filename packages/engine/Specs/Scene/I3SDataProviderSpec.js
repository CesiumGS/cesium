import {
  Cesium3DTileset,
  GeographicTilingScheme,
  I3SDataProvider,
  Math as CesiumMath,
  Rectangle,
  Resource,
  RuntimeError,
} from "../../index.js";

describe("Scene/I3SDataProvider", function () {
  const mockTileset = {
    destroy: function () {},
    isDestroyed: function () {
      return false;
    },
    update: function (frameState) {},
    prePassesUpdate: function (frameState) {},
    postPassesUpdate: function (frameState) {},
    updateForPass: function (frameState, passState) {},
  };
  const mockTilesetReady = {
    destroy: function () {},
    isDestroyed: function () {
      return false;
    },
    update: function (frameState) {},
    prePassesUpdate: function (frameState) {},
    postPassesUpdate: function (frameState) {},
    updateForPass: function (frameState, passState) {},
  };

  const mockLayers = [
    {
      _tileset: mockTileset,
    },
    {
      _tileset: mockTilesetReady,
    },
    {
      // Need to handle the case of undefined tilesets because update may be called before they're created
      _tileset: undefined,
    },
  ];

  const geoidTiles = [
    [
      {
        _buffer: new Float32Array([0, 1, 2, 3]),
        _encoding: 0,
        _height: 2,
        _structure: {
          elementMultiplier: 1,
          elementsPerHeight: 1,
          heightOffset: 0,
          heightScale: 1,
          isBigEndian: false,
          stride: 1,
        },
        _width: 2,
      },
    ],
    [
      {
        _buffer: new Float32Array([4, 5, 6, 7]),
        _encoding: 0,
        _height: 2,
        _structure: {
          elementMultiplier: 1,
          elementsPerHeight: 1,
          heightOffset: 0,
          heightScale: 1,
          isBigEndian: false,
          stride: 1,
        },
        _width: 2,
      },
    ],
  ];

  const mockGeoidProvider = {
    _lodCount: 0,
    tilingScheme: new GeographicTilingScheme(),
    requestTileGeometry: function (x, y, level) {
      if (level === 0) {
        return Promise.resolve(geoidTiles[x][y]);
      }

      return undefined;
    },
  };

  const mockRootNodeData = {
    id: "root",
    level: 0,
    mbs: [-90, 45, 0, 28288.6903196],
    obb: {
      center: [-90, 45, 0],
      halfSize: [20000, 20000, 500],
      quaternion: [1, 0, 0, 0],
    },
    lodSelection: [
      { metricType: "maxScreenThresholdSQ", maxError: 4 },
      { metricType: "maxScreenThreshold", maxError: 2 },
    ],
    children: [],
  };

  const mockLayerData = {
    href: "layers/0/",
    attributeStorageInfo: [],
    store: { rootNode: "mockRootNodeUrl", version: "1.6" },
    fullExtent: { xmin: 0, ymin: 1, xmax: 2, ymax: 3 },
    spatialReference: { wkid: 4326 },
    id: 0,
  };

  const mockLayerDataWithLargeExtent = {
    href: "layers/0/",
    attributeStorageInfo: [],
    store: { rootNode: "mockRootNodeUrl", version: "1.6" },
    fullExtent: { xmin: -1, ymin: -1, xmax: 2, ymax: 3 },
    spatialReference: { wkid: 4326 },
    id: 0,
  };

  const mockProviderData = {
    name: "mockProviderName",
    serviceVersion: "1.6",
    layers: [mockLayerData],
  };

  const mockProviderDataWithLargeExtent = {
    name: "mockProviderName",
    serviceVersion: "1.6",
    layers: [mockLayerDataWithLargeExtent],
  };

  it("constructs I3SDataProvider with options", async function () {
    const geoidService = {};
    const cesium3dTilesetOptions = {
      skipLevelOfDetail: true,
      debugShowBoundingVolume: false,
      maximumScreenSpaceError: 16,
    };
    const i3sOptions = {
      name: "testProvider",
      traceFetches: true, // for tracing I3S fetches
      geoidTiledTerrainProvider: geoidService, // pass the geoid service
      cesium3dTilesetOptions: cesium3dTilesetOptions,
    };

    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl(
      "mockProviderUrl",
      i3sOptions
    );

    expect(testProvider.name).toEqual("testProvider");
    expect(testProvider.traceFetches).toEqual(true);
    expect(testProvider.geoidTiledTerrainProvider).toEqual(geoidService);
  });

  it("sets properties", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });

    testProvider.traceFetches = true;

    expect(testProvider.traceFetches).toEqual(true);
  });

  it("wraps update", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });
    testProvider._layers = mockLayers;

    spyOn(testProvider._layers[0]._tileset, "update");
    spyOn(testProvider._layers[1]._tileset, "update");

    const frameState = {};
    testProvider.update(frameState);

    expect(testProvider._layers[0]._tileset.update).toHaveBeenCalledWith(
      frameState
    );
    expect(testProvider._layers[1]._tileset.update).toHaveBeenCalledWith(
      frameState
    );
  });

  it("wraps prePassesUpdate", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });
    testProvider._layers = mockLayers;

    spyOn(testProvider._layers[0]._tileset, "prePassesUpdate");
    spyOn(testProvider._layers[1]._tileset, "prePassesUpdate");

    const frameState = {};
    testProvider.prePassesUpdate(frameState);

    expect(
      testProvider._layers[0]._tileset.prePassesUpdate
    ).toHaveBeenCalledWith(frameState);
    expect(
      testProvider._layers[1]._tileset.prePassesUpdate
    ).toHaveBeenCalledWith(frameState);
  });

  it("wraps postPassesUpdate", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });
    testProvider._layers = mockLayers;

    spyOn(testProvider._layers[0]._tileset, "postPassesUpdate");
    spyOn(testProvider._layers[1]._tileset, "postPassesUpdate");

    const frameState = {};
    testProvider.postPassesUpdate(frameState);

    expect(
      testProvider._layers[0]._tileset.postPassesUpdate
    ).toHaveBeenCalledWith(frameState);
    expect(
      testProvider._layers[1]._tileset.postPassesUpdate
    ).toHaveBeenCalledWith(frameState);
  });

  it("wraps updateForPass", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });
    testProvider._layers = mockLayers;

    spyOn(testProvider._layers[0]._tileset, "updateForPass");
    spyOn(testProvider._layers[1]._tileset, "updateForPass");

    const frameState = {};
    const passState = { test: "test" };
    testProvider.updateForPass(frameState, passState);

    expect(testProvider._layers[0]._tileset.updateForPass).toHaveBeenCalledWith(
      frameState,
      passState
    );
    expect(testProvider._layers[1]._tileset.updateForPass).toHaveBeenCalledWith(
      frameState,
      passState
    );
  });

  it("wraps show property", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });
    testProvider._layers = mockLayers;

    // Function should not be called for tilesets that are not yet ready
    testProvider.show = true;
    expect(testProvider._layers[0]._tileset.show).toEqual(true);
    expect(testProvider._layers[1]._tileset.show).toEqual(true);

    testProvider.show = false;
    expect(testProvider._layers[0]._tileset.show).toEqual(false);
    expect(testProvider._layers[1]._tileset.show).toEqual(false);
  });

  it("isDestroyed returns false for new provider", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });
    testProvider._layers = mockLayers;

    expect(testProvider.isDestroyed()).toEqual(false);
  });

  it("destroys provider", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });
    testProvider._layers = mockLayers;

    spyOn(mockTileset, "destroy");
    spyOn(mockTilesetReady, "destroy");

    testProvider.destroy();

    expect(mockTileset.destroy).toHaveBeenCalled();
    expect(mockTilesetReady.destroy).toHaveBeenCalled();

    expect(testProvider.isDestroyed()).toEqual(true);
  });

  it("loads binary", async function () {
    const mockBinaryResponse = new ArrayBuffer(1);

    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });

    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      Promise.resolve(mockBinaryResponse)
    );

    const resource = Resource.createIfNeeded("mockBinaryUri");
    return testProvider._loadBinary(resource).then(function (result) {
      expect(Resource.prototype.fetchArrayBuffer).toHaveBeenCalled();
      expect(result).toBe(mockBinaryResponse);
    });
  });

  it("loads binary with traceFetches", async function () {
    const mockBinaryResponse = new ArrayBuffer(1);

    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
      traceFetches: true,
    });

    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      Promise.resolve(mockBinaryResponse)
    );

    const resource = Resource.createIfNeeded("mockBinaryUri");
    return testProvider._loadBinary(resource).then(function (result) {
      expect(Resource.prototype.fetchArrayBuffer).toHaveBeenCalled();
      expect(result).toBe(mockBinaryResponse);
    });
  });

  it("loads binary with invalid uri", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });

    const resource = Resource.createIfNeeded("mockBinaryUri");
    return testProvider
      ._loadBinary(resource)
      .then(function () {
        fail("Promise should not be resolved for invalid uri");
      })
      .catch(function (error) {
        expect(error.statusCode).toEqual(404);
      });
  });

  it("fromUrl throws without url ", async function () {
    await expectAsync(
      I3SDataProvider.fromUrl()
    ).toBeRejectedWithDeveloperError();
  });

  it("loads json", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });

    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });

    expect(Resource.prototype.fetchJson).toHaveBeenCalled();
    expect(testProvider).toBeInstanceOf(I3SDataProvider);
    expect(testProvider.data).toEqual(mockProviderData);
    expect(Cesium3DTileset.fromUrl).toHaveBeenCalled();
  });

  it("loadJson rejects invalid uri", async function () {
    const resource = Resource.createIfNeeded("mockJsonUri");
    await expectAsync(I3SDataProvider.loadJson(resource)).toBeRejected();
  });

  it("loadJson rejects error response", async function () {
    const mockErrorResponse = {
      error: {
        code: 498,
        details: [
          "Token would have expired, regenerate token and send the request again.",
          "If the token is generated based on the referrer ma…mation is available with every request in header.",
        ],
        message: "Invalid Token.",
      },
    };

    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockErrorResponse)
    );

    const resource = Resource.createIfNeeded("mockJsonUri");
    await expectAsync(I3SDataProvider.loadJson(resource)).toBeRejectedWithError(
      RuntimeError,
      mockErrorResponse.error
    );
  });

  it("loads geoid data", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderDataWithLargeExtent)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
      geoidTiledTerrainProvider: mockGeoidProvider,
    });

    return testProvider.loadGeoidData().then(function () {
      expect(testProvider._geoidDataList.length).toEqual(2);
      expect(testProvider._geoidDataList[0].height).toEqual(2);
      expect(testProvider._geoidDataList[0].width).toEqual(2);
      expect(testProvider._geoidDataList[0].buffer).toEqual(
        new Float32Array([0, 1, 2, 3])
      );

      expect(testProvider._geoidDataList[1].height).toEqual(2);
      expect(testProvider._geoidDataList[1].width).toEqual(2);
      expect(testProvider._geoidDataList[1].buffer).toEqual(
        new Float32Array([4, 5, 6, 7])
      );
    });
  });

  it("loadGeoidData resolves when no geoid provider is given", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });

    return testProvider.loadGeoidData().then(function () {
      expect(testProvider._geoidDataList).toBeUndefined();
    });
  });

  it("computes extent from layers", async function () {
    const mockLayer1 = {
      _extent: Rectangle.fromDegrees(-1, 0, 1, 2),
    };
    const mockLayer2 = {
      _extent: Rectangle.fromDegrees(3, 1, 4, 3),
    };

    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });
    testProvider._layers = [mockLayer1, mockLayer2, {}];

    testProvider._computeExtent();
    expect(testProvider._extent.west).toEqual(CesiumMath.toRadians(-1));
    expect(testProvider._extent.south).toEqual(CesiumMath.toRadians(0));
    expect(testProvider._extent.east).toEqual(CesiumMath.toRadians(4));
    expect(testProvider._extent.north).toEqual(CesiumMath.toRadians(3));
  });

  it("loads i3s provider", async function () {
    spyOn(I3SDataProvider, "_fetchJson").and.callFake(function (resource) {
      if (resource.url.endsWith("mockProviderUrl/layers/0/mockRootNodeUrl/")) {
        return Promise.resolve(mockRootNodeData);
      } else if (resource.url.endsWith("mockProviderUrl")) {
        return Promise.resolve(mockProviderData);
      }

      return Promise.reject("invalid i3s request");
    });

    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
      geoidTiledTerrainProvider: mockGeoidProvider,
    });

    // Layers have been populated and root node is loaded
    expect(testProvider.layers.length).toEqual(1);
    expect(testProvider.layers[0].rootNode.tile).toBeDefined();
    expect(testProvider.layers[0].rootNode.tile.i3sNode).toEqual(
      testProvider.layers[0].rootNode
    );

    // Expect geoid data to have been loaded
    expect(testProvider._geoidDataList.length).toEqual(1);
    expect(testProvider._geoidDataList[0].height).toEqual(2);
    expect(testProvider._geoidDataList[0].width).toEqual(2);
    expect(testProvider._geoidDataList[0].buffer).toEqual(
      new Float32Array([4, 5, 6, 7])
    );
  });

  it("loads i3s provider from single layer url", async function () {
    spyOn(I3SDataProvider, "_fetchJson").and.callFake(function (resource) {
      if (resource.url.endsWith("mockProviderUrl/layers/0/mockRootNodeUrl/")) {
        return Promise.resolve(mockRootNodeData);
      } else if (resource.url.endsWith("mockProviderUrl/layers/0/")) {
        return Promise.resolve(mockLayerData);
      }

      return Promise.reject("invalid i3s request");
    });

    const testProvider = await I3SDataProvider.fromUrl(
      "mockProviderUrl/layers/0/",
      {
        name: "testProvider",
        geoidTiledTerrainProvider: mockGeoidProvider,
      }
    );

    // Layers have been populated and root node is loaded
    expect(testProvider.layers.length).toEqual(1);
    expect(testProvider.layers[0].rootNode.tile).toBeDefined();
    expect(testProvider.layers[0].rootNode.tile.i3sNode).toEqual(
      testProvider.layers[0].rootNode
    );

    // Expect geoid data to have been loaded
    expect(testProvider._geoidDataList.length).toEqual(1);
    expect(testProvider._geoidDataList[0].height).toEqual(2);
    expect(testProvider._geoidDataList[0].width).toEqual(2);
    expect(testProvider._geoidDataList[0].buffer).toEqual(
      new Float32Array([4, 5, 6, 7])
    );
  });
});
