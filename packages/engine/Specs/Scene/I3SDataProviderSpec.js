import {
  Cesium3DTileset,
  GeographicTilingScheme,
  I3SDataProvider,
  I3SStatistics,
  I3SSublayer,
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
    layerType: "3DObject",
    attributeStorageInfo: [],
    store: { rootNode: "mockRootNodeUrl", version: "1.6" },
    fullExtent: { xmin: 0, ymin: 1, xmax: 2, ymax: 3 },
    spatialReference: { wkid: 4326 },
    id: 0,
  };

  const mockLayerData2 = {
    href: "layers/1/",
    layerType: "IntegratedMesh",
    attributeStorageInfo: [],
    store: { rootNode: "mockRootNodeUrl", version: "1.6" },
    fullExtent: { xmin: 0, ymin: 1, xmax: 2, ymax: 3 },
    spatialReference: { wkid: 4326 },
    id: 1,
  };

  const mockLayerData3 = {
    href: "layers/2/",
    layerType: "Point",
    attributeStorageInfo: [],
    store: { rootNode: "mockRootNodeUrl", version: "1.6" },
    fullExtent: { xmin: 0, ymin: 1, xmax: 2, ymax: 3 },
    spatialReference: { wkid: 4326 },
    id: 2,
  };

  const mockLayerDataTextured = {
    href: "layers/0/",
    layerType: "IntegratedMesh",
    attributeStorageInfo: [],
    store: { rootNode: "mockRootNodeUrl", version: "1.6" },
    fullExtent: { xmin: 0, ymin: 1, xmax: 2, ymax: 3 },
    spatialReference: { wkid: 4326 },
    id: 0,
    textureSetDefinitions: [
      {
        formats: [
          {
            name: "0",
            format: "jpg",
          },
        ],
      },
    ],
  };

  const mockBuildingLayerData = {
    layerType: "Building",
    name: "Test-Building",
    version: "1.6",
    store: { rootNode: "mockRootNodeUrl", version: "1.6" },
    fullExtent: { xmin: 0, ymin: 1, xmax: 2, ymax: 3 },
    spatialReference: { wkid: 4326 },
    id: 0,
    statisticsHRef: "./statistics/summary",
    sublayers: [
      {
        id: 200,
        layerType: "group",
        visibility: false,
        name: "Full Model",
        modelName: "FullModel",
        sublayers: [
          {
            id: 210,
            layerType: "group",
            name: "Cat1",
            visibility: false,
            sublayers: [
              {
                id: 1,
                layerType: "3DObject",
                visibility: false,
                name: "SubCat1",
              },
              {
                id: 2,
                layerType: "3DObject",
                visibility: true,
                name: "SubCat2",
              },
              {
                id: 3,
                layerType: "Point",
                visibility: true,
                name: "SubCat3",
              },
            ],
          },
          { id: 220, layerType: "group", name: "Cat2", visibility: false },
        ],
      },
      {
        id: 0,
        layerType: "3DObject",
        visibility: true,
        name: "Overview",
        modelName: "Overview",
      },
    ],
  };

  const mockBuildingLayerDataNoSublayers = {
    layerType: "Building",
    name: "Test-Building",
    version: "1.6",
    store: { rootNode: "mockRootNodeUrl", version: "1.6" },
    spatialReference: { wkid: 4326 },
    id: 0,
  };

  const mockLayerDataWithLargeExtent = {
    href: "layers/0/",
    layerType: "3DObject",
    attributeStorageInfo: [],
    store: { rootNode: "mockRootNodeUrl", version: "1.6" },
    fullExtent: { xmin: -1, ymin: -1, xmax: 2, ymax: 3 },
    spatialReference: { wkid: 4326 },
    id: 0,
  };

  const mockProviderData = {
    name: "mockProviderName",
    serviceVersion: "1.6",
    layers: [mockLayerData, mockLayerData2, mockLayerData3],
  };

  const mockBSLProviderData = {
    name: "mockProviderName",
    serviceVersion: "1.6",
    layers: [mockBuildingLayerData],
  };

  const mockBSLProviderData2 = {
    name: "mockProviderName",
    serviceVersion: "1.6",
    layers: [mockBuildingLayerDataNoSublayers],
  };

  const mockProviderDataWithLargeExtent = {
    name: "mockProviderName",
    serviceVersion: "1.6",
    layers: [mockLayerDataWithLargeExtent],
  };

  const mockStatisticsData = {
    summary: [
      {
        fieldName: "BldgLevel",
        label: "BldgLevel",
        min: 0,
        max: 9,
        modelName: "bldgLevel",
        mostFrequentValues: [1, 3],
      },
      {
        fieldName: "NoValues",
        label: "NoValues",
        modelName: "noValues",
      },
    ],
  };

  const geoidService = {};
  const cesium3dTilesetOptions = {
    skipLevelOfDetail: true,
    debugShowBoundingVolume: false,
    maximumScreenSpaceError: 16,
  };
  const i3sOptions = {
    name: "testProvider",
    geoidTiledTerrainProvider: geoidService, // pass the geoid service
    cesium3dTilesetOptions: cesium3dTilesetOptions,
  };

  it("constructs I3SDataProvider with options", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData),
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl(
      "mockProviderUrl",
      i3sOptions,
    );

    expect(testProvider.name).toEqual("testProvider");
    expect(testProvider.geoidTiledTerrainProvider).toEqual(geoidService);
  });

  it("constructs I3SDataProvider with BSL", async function () {
    spyOn(Resource.prototype, "fetchJson").and.callFake(function fetch() {
      let mockedData;

      if (this.url.includes("/sublayers/")) {
        const id = this.url.match(/\/sublayers\/\d+\//)[0].split("/")[2];
        mockedData = {
          ...mockLayerData,
          href: `layers/${id}/`,
          id: parseInt(id),
        };
      } else {
        mockedData = mockBSLProviderData;
      }
      return Promise.resolve(mockedData);
    });
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl(
      "mockProviderUrl",
      i3sOptions,
    );

    expect(testProvider.name).toEqual("testProvider");
    expect(testProvider.geoidTiledTerrainProvider).toEqual(geoidService);

    expect(testProvider.sublayers[0].name).toEqual("Full Model");
    expect(testProvider.sublayers[0].modelName).toEqual("FullModel");
    expect(testProvider.sublayers[0].visibility).toEqual(false);

    expect(testProvider.sublayers[1].name).toEqual("Overview");
    expect(testProvider.sublayers[1].modelName).toEqual("Overview");
    expect(testProvider.sublayers[1].visibility).toEqual(true);

    expect(testProvider.sublayers[0].sublayers.length).toEqual(2);
    expect(testProvider.sublayers[0].sublayers[0].name).toEqual("Cat1");
    expect(testProvider.sublayers[0].sublayers[0]._parent.name).toEqual(
      "Full Model",
    );
    expect(testProvider.sublayers[0].sublayers[0]._parent.modelName).toEqual(
      "FullModel",
    );
    expect(testProvider.sublayers[0].sublayers[1].name).toEqual("Cat2");
    expect(testProvider.sublayers[0].sublayers[1]._parent.name).toEqual(
      "Full Model",
    );
    expect(testProvider.sublayers[0].sublayers[1]._parent.modelName).toEqual(
      "FullModel",
    );
    expect(testProvider.sublayers[0].sublayers[0].sublayers.length).toEqual(3);
    expect(testProvider.sublayers[0].sublayers[0].sublayers[0].name).toEqual(
      "SubCat1",
    );
    expect(
      testProvider.sublayers[0].sublayers[0].sublayers[0].visibility,
    ).toEqual(false);
    expect(
      testProvider.sublayers[0].sublayers[0].sublayers[0]._parent.name,
    ).toEqual("Cat1");
    expect(testProvider.sublayers[0].sublayers[0].sublayers[1].name).toEqual(
      "SubCat2",
    );
    expect(
      testProvider.sublayers[0].sublayers[0].sublayers[1].visibility,
    ).toEqual(true);
    expect(
      testProvider.sublayers[0].sublayers[0].sublayers[1]._parent.name,
    ).toEqual("Cat1");
    expect(testProvider.sublayers[0].sublayers[0].sublayers[2].name).toEqual(
      "SubCat3",
    );
    expect(
      testProvider.sublayers[0].sublayers[0].sublayers[2].visibility,
    ).toEqual(true);
    expect(
      testProvider.sublayers[0].sublayers[0].sublayers[2]._parent.name,
    ).toEqual("Cat1");
    expect(testProvider.sublayers[0].sublayers[1].sublayers.length).toEqual(0);
  });

  it("default options for I3SDataProvider with textured layers", async function () {
    const providerData = {
      name: "mockProviderName",
      serviceVersion: "1.6",
      layers: [mockLayerDataTextured],
    };
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(providerData),
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl");

    expect(testProvider.name).toBeUndefined();
    expect(testProvider.geoidTiledTerrainProvider).toBeUndefined();
    expect(testProvider.showFeatures).toEqual(false);
    expect(testProvider.adjustMaterialAlphaMode).toEqual(false);
    expect(testProvider.applySymbology).toEqual(false);
    expect(testProvider.calculateNormals).toEqual(false);
  });

  it("default options for I3SDataProvider without textured layers", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData),
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl");

    expect(testProvider.name).toBeUndefined();
    expect(testProvider.geoidTiledTerrainProvider).toBeUndefined();
    expect(testProvider.showFeatures).toEqual(false);
    expect(testProvider.adjustMaterialAlphaMode).toEqual(false);
    expect(testProvider.applySymbology).toEqual(false);
    expect(testProvider.calculateNormals).toEqual(true);
  });

  it("manual options for I3SDataProvider without textured layers", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData),
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      ...i3sOptions,
      showFeatures: true,
      adjustMaterialAlphaMode: true,
      applySymbology: true,
      calculateNormals: false,
    });

    expect(testProvider.name).toEqual("testProvider");
    expect(testProvider.geoidTiledTerrainProvider).toEqual(geoidService);
    expect(testProvider.showFeatures).toEqual(true);
    expect(testProvider.adjustMaterialAlphaMode).toEqual(true);
    expect(testProvider.applySymbology).toEqual(true);
    expect(testProvider.calculateNormals).toEqual(false);
  });

  it("default options for I3SDataProvider with BSL", async function () {
    spyOn(Resource.prototype, "fetchJson").and.callFake(function fetch() {
      let mockedData;

      if (this.url.includes("/sublayers/")) {
        const id = this.url.match(/\/sublayers\/\d+\//)[0].split("/")[2];
        mockedData = {
          ...mockLayerData,
          href: `layers/${id}/`,
          id: parseInt(id),
        };
      } else {
        mockedData = mockBSLProviderData;
      }
      return Promise.resolve(mockedData);
    });
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl");

    expect(testProvider.name).toBeUndefined();
    expect(testProvider.geoidTiledTerrainProvider).toBeUndefined();
    expect(testProvider.showFeatures).toEqual(true);
    expect(testProvider.adjustMaterialAlphaMode).toEqual(true);
    expect(testProvider.applySymbology).toEqual(true);
    expect(testProvider.calculateNormals).toEqual(true);
  });

  it("manual options for I3SDataProvider with BSL", async function () {
    spyOn(Resource.prototype, "fetchJson").and.callFake(function fetch() {
      let mockedData;

      if (this.url.includes("/sublayers/")) {
        const id = this.url.match(/\/sublayers\/\d+\//)[0].split("/")[2];
        mockedData = {
          ...mockLayerData,
          href: `layers/${id}/`,
          id: parseInt(id),
        };
      } else {
        mockedData = mockBSLProviderData;
      }
      return Promise.resolve(mockedData);
    });
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      ...i3sOptions,
      showFeatures: false,
      adjustMaterialAlphaMode: false,
      applySymbology: false,
      calculateNormals: false,
    });

    expect(testProvider.name).toEqual("testProvider");
    expect(testProvider.geoidTiledTerrainProvider).toEqual(geoidService);
    expect(testProvider.showFeatures).toEqual(false);
    expect(testProvider.adjustMaterialAlphaMode).toEqual(false);
    expect(testProvider.applySymbology).toEqual(false);
    expect(testProvider.calculateNormals).toEqual(false);
  });

  it("constructs I3SDataProvider with BSL without sublayers and statistics", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockBSLProviderData2),
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl(
      "mockProviderUrl",
      i3sOptions,
    );

    expect(testProvider.sublayers.length).toEqual(0);
    expect(testProvider._attributeStatistics.length).toEqual(0);
  });

  it("wraps update", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData),
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
      frameState,
    );
    expect(testProvider._layers[1]._tileset.update).toHaveBeenCalledWith(
      frameState,
    );
  });

  it("wraps prePassesUpdate", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData),
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
      testProvider._layers[0]._tileset.prePassesUpdate,
    ).toHaveBeenCalledWith(frameState);
    expect(
      testProvider._layers[1]._tileset.prePassesUpdate,
    ).toHaveBeenCalledWith(frameState);
  });

  it("wraps postPassesUpdate", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData),
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
      testProvider._layers[0]._tileset.postPassesUpdate,
    ).toHaveBeenCalledWith(frameState);
    expect(
      testProvider._layers[1]._tileset.postPassesUpdate,
    ).toHaveBeenCalledWith(frameState);
  });

  it("wraps updateForPass", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData),
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
      passState,
    );
    expect(testProvider._layers[1]._tileset.updateForPass).toHaveBeenCalledWith(
      frameState,
      passState,
    );
  });

  it("wraps show property", async function () {
    spyOn(Resource.prototype, "fetchJson").and.callFake(function fetch() {
      return Promise.resolve(mockProviderData);
    });
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl(
      "mockProviderUrl",
      i3sOptions,
    );

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
      Promise.resolve(mockProviderData),
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
      Promise.resolve(mockProviderData),
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
      Promise.resolve(mockProviderData),
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
      Promise.resolve(mockBinaryResponse),
    );

    const resource = Resource.createIfNeeded("mockBinaryUri");
    return testProvider._loadBinary(resource).then(function (result) {
      expect(Resource.prototype.fetchArrayBuffer).toHaveBeenCalled();
      expect(result).toBe(mockBinaryResponse);
    });
  });

  it("loads binary with invalid uri", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData),
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
      I3SDataProvider.fromUrl(),
    ).toBeRejectedWithDeveloperError();
  });

  it("loads json", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData),
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
      Promise.resolve(mockErrorResponse),
    );

    const resource = Resource.createIfNeeded("mockJsonUri");
    await expectAsync(I3SDataProvider.loadJson(resource)).toBeRejectedWithError(
      RuntimeError,
      mockErrorResponse.error,
    );
  });

  it("loadJson rejects error response with no details", async function () {
    const mockErrorResponse = {
      error: "Error with no details",
    };

    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockErrorResponse),
    );

    const resource = Resource.createIfNeeded("mockJsonUri");
    await expectAsync(I3SDataProvider.loadJson(resource)).toBeRejectedWithError(
      RuntimeError,
      mockErrorResponse.error,
    );
  });

  it("loads geoid data", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderDataWithLargeExtent),
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
        new Float32Array([0, 1, 2, 3]),
      );

      expect(testProvider._geoidDataList[1].height).toEqual(2);
      expect(testProvider._geoidDataList[1].width).toEqual(2);
      expect(testProvider._geoidDataList[1].buffer).toEqual(
        new Float32Array([4, 5, 6, 7]),
      );
    });
  });

  it("loadGeoidData resolves when no geoid provider is given", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData),
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
    const mockExtent1 = Rectangle.fromDegrees(-1, 0, 1, 2);
    const mockExtent2 = Rectangle.fromDegrees(3, 1, 4, 3);

    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(mockProviderData),
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
    });
    testProvider._layersExtent = [mockExtent1, mockExtent2];

    testProvider._computeExtent();
    expect(testProvider.extent.west).toEqual(CesiumMath.toRadians(-1));
    expect(testProvider.extent.south).toEqual(CesiumMath.toRadians(0));
    expect(testProvider.extent.east).toEqual(CesiumMath.toRadians(4));
    expect(testProvider.extent.north).toEqual(CesiumMath.toRadians(3));
  });

  it("loads i3s provider", async function () {
    spyOn(I3SDataProvider, "_fetchJson").and.callFake(function (resource) {
      if (
        resource.url.includes("mockProviderUrl/layers/0/mockRootNodeUrl/?") ||
        resource.url.includes("mockProviderUrl/layers/1/mockRootNodeUrl/?")
      ) {
        return Promise.resolve(mockRootNodeData);
      } else if (resource.url.includes("mockProviderUrl?")) {
        return Promise.resolve(mockProviderData);
      }

      return Promise.reject("invalid i3s request");
    });

    const testProvider = await I3SDataProvider.fromUrl("mockProviderUrl", {
      name: "testProvider",
      geoidTiledTerrainProvider: mockGeoidProvider,
    });

    // Layers have been populated and root node is loaded
    expect(testProvider.layers.length).toEqual(2);
    expect(testProvider.layers[0].rootNode.tile).toBeDefined();
    expect(testProvider.layers[0].rootNode.tile.i3sNode).toEqual(
      testProvider.layers[0].rootNode,
    );

    // Expect geoid data to have been loaded
    expect(testProvider._geoidDataList.length).toEqual(1);
    expect(testProvider._geoidDataList[0].height).toEqual(2);
    expect(testProvider._geoidDataList[0].width).toEqual(2);
    expect(testProvider._geoidDataList[0].buffer).toEqual(
      new Float32Array([4, 5, 6, 7]),
    );
  });

  it("loads i3s provider from single layer url", async function () {
    spyOn(I3SDataProvider, "_fetchJson").and.callFake(function (resource) {
      if (resource.url.includes("mockProviderUrl/layers/0/mockRootNodeUrl/?")) {
        return Promise.resolve(mockRootNodeData);
      } else if (resource.url.includes("mockProviderUrl/layers/0/?")) {
        return Promise.resolve(mockLayerData);
      }

      return Promise.reject("invalid i3s request");
    });

    const testProvider = await I3SDataProvider.fromUrl(
      "mockProviderUrl/layers/0/",
      {
        name: "testProvider",
        geoidTiledTerrainProvider: mockGeoidProvider,
      },
    );

    // Layers have been populated and root node is loaded
    expect(testProvider.layers.length).toEqual(1);
    expect(testProvider.layers[0].rootNode.tile).toBeDefined();
    expect(testProvider.layers[0].rootNode.tile.i3sNode).toEqual(
      testProvider.layers[0].rootNode,
    );

    // Expect geoid data to have been loaded
    expect(testProvider._geoidDataList.length).toEqual(1);
    expect(testProvider._geoidDataList[0].height).toEqual(2);
    expect(testProvider._geoidDataList[0].width).toEqual(2);
    expect(testProvider._geoidDataList[0].buffer).toEqual(
      new Float32Array([4, 5, 6, 7]),
    );
  });

  it("BSL change visibility", async function () {
    spyOn(Resource.prototype, "fetchJson").and.callFake(function fetch() {
      let mockedData;

      if (this.url.includes("/sublayers/")) {
        const id = this.url.match(/\/sublayers\/\d+\//)[0].split("/")[2];
        mockedData = {
          ...mockLayerData,
          href: `layers/${id}/`,
          id: parseInt(id),
        };
      } else {
        mockedData = mockBSLProviderData;
      }
      return Promise.resolve(mockedData);
    });
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl(
      "mockProviderUrl",
      i3sOptions,
    );

    expect(testProvider.sublayers[0].sublayers[0].sublayers[0].name).toEqual(
      "SubCat1",
    );
    expect(
      testProvider.sublayers[0].sublayers[0].sublayers[0].visibility,
    ).toEqual(false);

    const spy = spyOn(
      testProvider.sublayers[0].sublayers[0].sublayers[0]._i3sLayers[0],
      "_updateVisibility",
    );

    testProvider.sublayers[0].sublayers[0].sublayers[0].visibility = false;
    expect(
      testProvider.sublayers[0].sublayers[0].sublayers[0].visibility,
    ).toEqual(false);
    expect(spy).not.toHaveBeenCalled();

    testProvider.sublayers[0].sublayers[0].sublayers[0].visibility = true;
    expect(
      testProvider.sublayers[0].sublayers[0].sublayers[0].visibility,
    ).toEqual(true);
    expect(spy).toHaveBeenCalled();
  });

  it("BSL get sublayers", async function () {
    spyOn(Resource.prototype, "fetchJson").and.callFake(function fetch() {
      let mockedData;

      if (this.url.includes("/sublayers/")) {
        const id = this.url.match(/\/sublayers\/\d+\//)[0].split("/")[2];
        mockedData = {
          ...mockLayerData,
          href: `layers/${id}/`,
          id: parseInt(id),
        };
      } else {
        mockedData = mockBSLProviderData;
      }
      return Promise.resolve(mockedData);
    });
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl(
      "mockProviderUrl/layers/0/",
      i3sOptions,
    );

    const sublayers = testProvider.sublayers;
    expect(sublayers.length).toEqual(2);
    expect(sublayers[0]).toBeInstanceOf(I3SSublayer);
    expect(sublayers[0].data.name).toEqual("Full Model");
    expect(sublayers[0].data.modelName).toEqual("FullModel");
    expect(sublayers[1]).toBeInstanceOf(I3SSublayer);
    expect(sublayers[1].data.name).toEqual("Overview");
    expect(sublayers[1].data.modelName).toEqual("Overview");

    expect(sublayers[0].name).toEqual("Full Model");
    expect(sublayers[0].modelName).toEqual("FullModel");
    expect(sublayers[0].visibility).toEqual(false);
    expect(sublayers[0].sublayers.length).toEqual(2);
    expect(sublayers[0].sublayers[0].name).toEqual("Cat1");
    expect(sublayers[0].sublayers[1].name).toEqual("Cat2");
    expect(sublayers[0].sublayers[0].sublayers.length).toEqual(3);
    expect(sublayers[0].sublayers[0].sublayers[0].name).toEqual("SubCat1");
    expect(sublayers[0].sublayers[0].sublayers[1].name).toEqual("SubCat2");
    expect(sublayers[0].sublayers[0].sublayers[2].name).toEqual("SubCat3");

    expect(sublayers[1].name).toEqual("Overview");
    expect(sublayers[1].modelName).toEqual("Overview");
    expect(sublayers[1].visibility).toEqual(true);
    expect(sublayers[1].sublayers.length).toEqual(0);
  });

  it("BSL get attributes and values", async function () {
    spyOn(Resource.prototype, "fetchJson").and.callFake(function fetch() {
      let mockedData = {};
      if (this.url.includes("/sublayers/")) {
        const id = this.url.match(/\/sublayers\/\d+\//)[0].split("/")[2];
        mockedData = {
          ...mockLayerData,
          href: `layers/${id}/`,
          id: parseInt(id),
        };
      } else if (this.url.includes("/statistics/")) {
        mockedData = mockStatisticsData;
      } else {
        mockedData = mockBSLProviderData;
      }

      return Promise.resolve(mockedData);
    });
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      return tileset;
    });
    const testProvider = await I3SDataProvider.fromUrl(
      "mockProviderUrl",
      i3sOptions,
    );

    expect(
      testProvider._attributeStatistics[0].resource.url.includes(
        `${mockBuildingLayerData.statisticsHRef}/?`,
      ),
    ).toEqual(true);
    expect(testProvider._attributeStatistics[0].data).toEqual(
      mockStatisticsData,
    );

    const attributes = testProvider.getAttributeNames();
    expect(attributes.length).toEqual(2);
    expect(attributes[0]).toEqual("BldgLevel");
    expect(attributes[1]).toEqual("NoValues");

    const values = testProvider.getAttributeValues(attributes[0]);
    expect(values).toEqual([1, 3]);

    const noValues = testProvider.getAttributeValues(attributes[1]);
    expect(noValues).toEqual([]);

    const notExistingValues = testProvider.getAttributeValues(
      "notExistingAttribute",
    );
    expect(notExistingValues).toEqual([]);
  });

  it("empty statistics", async function () {
    spyOn(I3SDataProvider, "loadJson").and.returnValue(Promise.resolve({}));
    const mockProvider = { resource: new Resource({ url: "mockUrl" }) };
    const statistics = new I3SStatistics(mockProvider, "mockStatUrl");
    await statistics.load();
    expect(statistics.names).toEqual([]);
    expect(statistics._getValues("anyName")).toBeUndefined();
  });
});
