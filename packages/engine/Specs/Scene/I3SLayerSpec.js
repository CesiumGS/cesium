import {
  I3SLayer,
  I3SDataProvider,
  Math as CesiumMath,
  RuntimeError,
} from "../../index.js";

describe("Scene/I3SLayer", function () {
  const rootNodePageEntry = {
    index: 0,
    children: [1, 2],
    obb: {
      center: [-90, 45, 0],
      halfSize: [20000, 20000, 500],
      quaternion: [1, 0, 0, 0],
    },
  };
  const childNodePageEntry = {
    index: 1,
    children: [],
    obb: {
      center: [-90, 45, 0],
      halfSize: [10000, 10000, 250],
      quaternion: [1, 0, 0, 0],
    },
    lodThreshold: 500,
    parentIndex: 0,
  };
  const childNodePageEntry2 = {
    index: 2,
    children: [],
    obb: {
      center: [-90, 45, 0],
      halfSize: [10000, 10000, 250],
      quaternion: [1, 0, 0, 0],
    },
    lodThreshold: 500,
    parentIndex: 0,
  };
  const nodePageResult = { nodes: [rootNodePageEntry, childNodePageEntry] };
  const nodePageResult2 = { nodes: [childNodePageEntry2] };

  const geometryDefinitions = [
    {
      geometryBuffers: [
        {
          color: { type: "UInt8", component: 4 },
          faceRange: { type: "UInt32", component: 2, binding: "per-feature" },
          featureId: { type: "UInt64", component: 1, binding: "per-feature" },
          normal: { type: "Float32", component: 3 },
          offset: 8,
          position: { type: "Float32", component: 3 },
          uv0: { type: "Float32", component: 2 },
        },
        {
          compressedAttributes: {
            attributes: ["position", "normal", "uv0", "color", "feature-index"],
            encoding: "draco",
          },
        },
        {
          compressedAttributes: {
            attributes: ["position", "color", "feature-index"],
            encoding: "draco",
          },
        },
        {
          offset: 8,
          color: { type: "UInt8", component: 4 },
          faceRange: { type: "UInt32", component: 2, binding: "per-feature" },
          featureId: { type: "UInt64", component: 1, binding: "per-feature" },
          normal: { type: "Float32", component: 3 },
          position: { type: "Float32", component: 3 },
          uv0: { type: "Float32", component: 2 },
          uv1: { type: "Float32", component: 2 },
        },
      ],
    },
  ];

  const layerData = {
    href: "mockLayerUrl",
    nodePages: {
      lodSelectionMetricType: "maxScreenThresholdSQ",
      nodesPerPage: 2,
      rootIndex: 0,
    },
    attributeStorageInfo: [],
    store: { defaultGeometrySchema: {}, version: "1.7" },
    geometryDefinitions: geometryDefinitions,
    fullExtent: { xmin: 0, ymin: 1, xmax: 2, ymax: 3 },
    spatialReference: { wkid: 4326 },
  };
  const layerData2 = {
    nodePages: {
      lodSelectionMetricType: "maxScreenThresholdSQ",
      nodesPerPage: 2,
      rootIndex: 0,
    },
    attributeStorageInfo: [],
    store: { defaultGeometrySchema: {}, extent: [0, 1, 2, 3], version: "1.7" },
    spatialReference: { wkid: 4326 },
  };

  function createMockI3SProvider() {
    spyOn(I3SDataProvider.prototype, "_load");
    const mockI3SProvider = new I3SDataProvider({
      url: "mockProviderUrl?testQuery=test",
    });
    spyOn(I3SDataProvider.prototype, "loadGeoidData").and.returnValue(
      Promise.resolve()
    );
    return mockI3SProvider;
  }

  it("constructs I3SLayer from url", function () {
    const mockI3SProvider = createMockI3SProvider();
    const testLayer = new I3SLayer(mockI3SProvider, layerData);

    expect(testLayer.resource.url).toContain("mockProviderUrl/mockLayerUrl/");
    expect(testLayer.resource.queryParameters.testQuery).toEqual("test");

    expect(testLayer.version).toEqual("1.7");
    expect(testLayer.majorVersion).toEqual(1);
    expect(testLayer.minorVersion).toEqual(7);
    expect(testLayer.legacyVersion16).toEqual(false);

    expect(testLayer.data).toEqual(layerData);

    expect(testLayer._extent.west).toEqual(CesiumMath.toRadians(0));
    expect(testLayer._extent.south).toEqual(CesiumMath.toRadians(1));
    expect(testLayer._extent.east).toEqual(CesiumMath.toRadians(2));
    expect(testLayer._extent.north).toEqual(CesiumMath.toRadians(3));

    expect(testLayer._geometryDefinitions.length).toEqual(1);
    expect(testLayer._geometryDefinitions[0].length).toEqual(4);

    //Expect definitions to be sorted in a specific order
    //Compressed definitions first, then sorted based on number of attributes
    expect(testLayer._geometryDefinitions[0][0].compressed).toEqual(true);
    expect(testLayer._geometryDefinitions[0][0].attributes).toEqual([
      "position",
      "color",
      "feature-index",
    ]);

    expect(testLayer._geometryDefinitions[0][1].compressed).toEqual(true);
    expect(testLayer._geometryDefinitions[0][1].attributes).toEqual([
      "position",
      "normal",
      "uv0",
      "color",
      "feature-index",
    ]);

    expect(testLayer._geometryDefinitions[0][2].compressed).toEqual(false);
    expect(testLayer._geometryDefinitions[0][2].attributes).toEqual([
      "color",
      "faceRange",
      "featureId",
      "normal",
      "position",
      "uv0",
    ]);

    expect(testLayer._geometryDefinitions[0][3].compressed).toEqual(false);
    expect(testLayer._geometryDefinitions[0][3].attributes).toEqual([
      "color",
      "faceRange",
      "featureId",
      "normal",
      "position",
      "uv0",
      "uv1",
    ]);
  });
  it("constructs I3SLayer from index", function () {
    const mockI3SProvider = createMockI3SProvider();
    const testLayer = new I3SLayer(mockI3SProvider, layerData2, 0);
    expect(testLayer.data).toEqual(layerData2);

    expect(testLayer.resource.url).toContain("mockProviderUrl/./layers/0/");
    expect(testLayer.resource.queryParameters.testQuery).toEqual("test");

    expect(testLayer._extent.west).toEqual(CesiumMath.toRadians(0));
    expect(testLayer._extent.south).toEqual(CesiumMath.toRadians(1));
    expect(testLayer._extent.east).toEqual(CesiumMath.toRadians(2));
    expect(testLayer._extent.north).toEqual(CesiumMath.toRadians(3));
  });

  it("constructs I3SLayer from single layer url", function () {
    spyOn(I3SDataProvider.prototype, "_load");
    const mockI3SProviderSingleLayer = new I3SDataProvider({
      url: "mockProviderUrl/layers/1/",
    });

    const testLayer = new I3SLayer(mockI3SProviderSingleLayer, layerData2);

    expect(testLayer.resource.url).toContain("mockProviderUrl/layers/1/");

    expect(testLayer._extent.west).toEqual(CesiumMath.toRadians(0));
    expect(testLayer._extent.south).toEqual(CesiumMath.toRadians(1));
    expect(testLayer._extent.east).toEqual(CesiumMath.toRadians(2));
    expect(testLayer._extent.north).toEqual(CesiumMath.toRadians(3));
  });

  it("loads node page", function () {
    const mockI3SProvider = createMockI3SProvider();
    const testLayer = new I3SLayer(mockI3SProvider, layerData);

    spyOn(I3SLayer, "_fetchJson").and.returnValue(
      Promise.resolve(nodePageResult)
    );

    return testLayer._loadNodePage(0).then(function (result) {
      expect(I3SLayer._fetchJson).toHaveBeenCalled();
      expect(I3SLayer._fetchJson.calls.mostRecent().args[0].url).toContain(
        "mockProviderUrl/mockLayerUrl/nodepages/0/"
      );
    });
  });

  it("load node page rejects invalid url", function () {
    const mockI3SProvider = createMockI3SProvider();
    const testLayer = new I3SLayer(mockI3SProvider, layerData);

    return testLayer
      ._loadNodePage(0)
      .then(function () {
        fail("Promise should not be resolved for invalid uri");
      })
      .catch(function (error) {
        expect(error.statusCode).toEqual(404);
      });
  });

  it("gets node for unloaded node page", function () {
    const mockI3SProvider = createMockI3SProvider();
    const testLayer = new I3SLayer(mockI3SProvider, layerData);

    spyOn(I3SLayer, "_fetchJson").and.returnValue(
      Promise.resolve(nodePageResult2)
    );

    return testLayer._getNodeInNodePages(2).then(function (result) {
      expect(I3SLayer._fetchJson).toHaveBeenCalled();
      expect(I3SLayer._fetchJson.calls.mostRecent().args[0].url).toContain(
        "mockProviderUrl/mockLayerUrl/nodepages/1/"
      );
      expect(result.index).toEqual(2);
    });
  });

  it("gets node for preloaded node page", function () {
    const mockI3SProvider = createMockI3SProvider();
    const testLayer = new I3SLayer(mockI3SProvider, layerData);

    spyOn(I3SLayer, "_fetchJson").and.returnValue(
      Promise.resolve(nodePageResult2)
    );

    return testLayer
      ._loadNodePage(1)
      .then(function () {
        expect(I3SLayer._fetchJson).toHaveBeenCalled();
        expect(I3SLayer._fetchJson.calls.mostRecent().args[0].url).toContain(
          "mockProviderUrl/mockLayerUrl/nodepages/1/"
        );

        return testLayer._getNodeInNodePages(2);
      })
      .then(function (result) {
        //Json was not fetched again
        expect(I3SLayer._fetchJson).toHaveBeenCalledTimes(1);
        expect(result.index).toEqual(2);
      });
  });

  it("loads root node", function () {
    const mockI3SProvider = createMockI3SProvider();
    const testLayer = new I3SLayer(mockI3SProvider, layerData);
    testLayer._nodePages = [
      [rootNodePageEntry, childNodePageEntry],
      [childNodePageEntry2],
    ];
    testLayer._nodePageFetches = [Promise.resolve()];

    return testLayer._loadRootNode().then(function (result) {
      expect(testLayer.rootNode).toBeDefined();
      expect(testLayer.rootNode.data.index).toEqual(0);
    });
  });

  it("creates 3d tileset", async function () {
    const mockI3SProvider = createMockI3SProvider();
    const testLayer = new I3SLayer(mockI3SProvider, layerData);
    testLayer._nodePages = [
      [rootNodePageEntry, childNodePageEntry],
      [childNodePageEntry2],
    ];
    testLayer._nodePageFetches = [Promise.resolve()];

    await testLayer._loadRootNode();
    await testLayer._create3DTileset();

    expect(testLayer.tileset).toBeDefined();
    expect(testLayer.tileset.tileUnload._listeners.length).toEqual(1);
    expect(testLayer.tileset.tileVisible._listeners.length).toEqual(1);
  });

  it("creates 3d tileset with options", async function () {
    const cesium3dTilesetOptions = {
      debugShowBoundingVolume: true,
      maximumScreenSpaceError: 8,
    };

    spyOn(I3SDataProvider.prototype, "_load");
    const mockI3SProviderWithOptions = new I3SDataProvider({
      url: "mockProviderUrl?testQuery=test",
      cesium3dTilesetOptions: cesium3dTilesetOptions,
    });

    const testLayer = new I3SLayer(mockI3SProviderWithOptions, layerData);
    testLayer._nodePages = [
      [rootNodePageEntry, childNodePageEntry],
      [childNodePageEntry2],
    ];
    testLayer._nodePageFetches = [Promise.resolve()];

    await testLayer._loadRootNode();
    await testLayer._create3DTileset();
    expect(testLayer.tileset).toBeDefined();
    expect(testLayer.tileset.debugShowBoundingVolume).toEqual(true);
    expect(testLayer.tileset.maximumScreenSpaceError).toEqual(8);

    expect(testLayer.tileset.tileUnload._listeners.length).toEqual(1);
    expect(testLayer.tileset.tileVisible._listeners.length).toEqual(1);
  });

  it("loads i3s layer", async function () {
    const mockI3SProvider = createMockI3SProvider();
    const testLayer = new I3SLayer(mockI3SProvider, layerData);
    testLayer._nodePages = [
      [rootNodePageEntry, childNodePageEntry],
      [childNodePageEntry2],
    ];
    testLayer._nodePageFetches = [Promise.resolve()];

    await testLayer.load();
    expect(testLayer.tileset).toBeDefined();
    expect(testLayer._rootNode).toBeDefined();
    expect(testLayer._rootNode._tile).toBe(testLayer.tileset._root);
    expect(testLayer._rootNode).toBe(testLayer.tileset._root.i3sNode);
  });

  it("load i3s layer rejects unsupported spatial reference", async function () {
    const invalidLayerData = {
      nodePages: {
        lodSelectionMetricType: "maxScreenThresholdSQ",
        nodesPerPage: 2,
        rootIndex: 0,
      },
      store: {
        defaultGeometrySchema: {},
        extent: [0, 1, 2, 3],
        version: "1.7",
      },
      spatialReference: { wkid: 3857 },
    };
    const mockI3SProvider = createMockI3SProvider();
    const testLayer = new I3SLayer(mockI3SProvider, invalidLayerData);
    testLayer._nodePages = [
      [rootNodePageEntry, childNodePageEntry],
      [childNodePageEntry2],
    ];
    testLayer._nodePageFetches = [Promise.resolve()];

    await expectAsync(testLayer.load()).toBeRejectedWithError(
      RuntimeError,
      `Unsupported spatial reference: ${invalidLayerData.spatialReference.wkid}`
    );
  });
});
