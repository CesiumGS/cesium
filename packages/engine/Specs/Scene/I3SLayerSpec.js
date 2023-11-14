import {
  Cesium3DTileset,
  I3SLayer,
  I3SDataProvider,
  Math as CesiumMath,
  Resource,
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
  const nodePageResult = { nodes: [rootNodePageEntry, childNodePageEntry] };

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

  async function createMockI3SProvider(layerData, options) {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(layerData)
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      tileset._isI3STileSet = true;
      return tileset;
    });
    const mockI3SProvider = await I3SDataProvider.fromUrl(
      "mockProviderUrl?testQuery=test",
      options
    );
    spyOn(I3SDataProvider.prototype, "loadGeoidData").and.returnValue(
      Promise.resolve()
    );
    return mockI3SProvider;
  }

  it("constructs I3SLayer from url", async function () {
    spyOn(I3SLayer.prototype, "_loadNodePage").and.returnValue(
      Promise.resolve(nodePageResult)
    );

    const mockI3SProvider = await createMockI3SProvider(layerData);
    const testLayer = mockI3SProvider.layers[0];

    expect(testLayer).toBeInstanceOf(I3SLayer);
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

  it("constructs I3SLayer from index", async function () {
    spyOn(I3SLayer.prototype, "_loadNodePage").and.returnValue(
      Promise.resolve(nodePageResult)
    );

    const mockI3SProvider = await createMockI3SProvider(layerData2);
    const testLayer = new I3SLayer(mockI3SProvider, layerData2, 0);
    expect(testLayer.data).toEqual(layerData2);

    expect(testLayer.resource.url).toContain("mockProviderUrl/layers/0/");
    expect(testLayer.resource.queryParameters.testQuery).toEqual("test");

    expect(testLayer._extent.west).toEqual(CesiumMath.toRadians(0));
    expect(testLayer._extent.south).toEqual(CesiumMath.toRadians(1));
    expect(testLayer._extent.east).toEqual(CesiumMath.toRadians(2));
    expect(testLayer._extent.north).toEqual(CesiumMath.toRadians(3));
  });

  it("constructs I3SLayer from single layer url", async function () {
    spyOn(I3SLayer.prototype, "_loadNodePage").and.returnValue(
      Promise.resolve(nodePageResult)
    );

    const mockI3SProvider = await createMockI3SProvider(layerData2);
    const testLayer = mockI3SProvider.layers[0];

    expect(testLayer.resource.url).toContain("mockProviderUrl/layers/0/");

    expect(testLayer._extent.west).toEqual(CesiumMath.toRadians(0));
    expect(testLayer._extent.south).toEqual(CesiumMath.toRadians(1));
    expect(testLayer._extent.east).toEqual(CesiumMath.toRadians(2));
    expect(testLayer._extent.north).toEqual(CesiumMath.toRadians(3));
  });

  it("loads root node", async function () {
    spyOn(I3SLayer.prototype, "_loadNodePage").and.returnValue(
      Promise.resolve(nodePageResult)
    );

    const mockI3SProvider = await createMockI3SProvider(layerData);
    const testLayer = mockI3SProvider.layers[0];
    expect(testLayer.rootNode).toBeDefined();
    expect(testLayer.rootNode.data.index).toEqual(0);
  });

  it("creates 3d tileset", async function () {
    spyOn(I3SLayer.prototype, "_loadNodePage").and.returnValue(
      Promise.resolve(nodePageResult)
    );

    const mockI3SProvider = await createMockI3SProvider(layerData);
    const testLayer = mockI3SProvider.layers[0];

    expect(testLayer.tileset).toBeDefined();
    expect(testLayer.tileset.tileUnload._listeners.length).toEqual(1);
    expect(testLayer.tileset.tileVisible._listeners.length).toEqual(1);

    expect(testLayer._rootNode).toBeDefined();
    expect(testLayer._rootNode._tile).toBe(testLayer.tileset._root);
  });

  it("creates 3d tileset with options", async function () {
    const cesium3dTilesetOptions = {
      debugShowBoundingVolume: true,
      maximumScreenSpaceError: 8,
    };
    spyOn(I3SLayer.prototype, "_loadNodePage").and.returnValue(
      Promise.resolve(nodePageResult)
    );

    await createMockI3SProvider(layerData, {
      cesium3dTilesetOptions: cesium3dTilesetOptions,
    });
    expect(Cesium3DTileset.fromUrl).toHaveBeenCalledWith(
      jasmine.any(String),
      cesium3dTilesetOptions
    );
  });

  it("load i3s layer rejects unsupported spatial reference", async function () {
    spyOn(I3SLayer.prototype, "_loadNodePage").and.returnValue(
      Promise.resolve(nodePageResult)
    );
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
    await expectAsync(
      createMockI3SProvider(invalidLayerData)
    ).toBeRejectedWithError(
      RuntimeError,
      `Unsupported spatial reference: ${invalidLayerData.spatialReference.wkid}`
    );
  });
});
