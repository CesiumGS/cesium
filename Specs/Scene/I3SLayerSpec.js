import { I3SLayer, I3SDataProvider, Resource } from "../../Source/Cesium.js";

describe(
  "Scene/I3SLayer",
  function () {
    const mockI3SProvider = new I3SDataProvider(
      "",
      "mockProviderUrl?testQuery=test",
      {}
    );
    mockI3SProvider.geoidDataIsReadyPromise = Promise.resolve();

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
              attributes: [
                "position",
                "normal",
                "uv0",
                "color",
                "feature-index",
              ],
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
      store: { defaultGeometrySchema: {} },
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
      store: { defaultGeometrySchema: {}, extent: [0, 1, 2, 3] },
      spatialReference: { wkid: 4326 },
    };

    it("constructs I3SLayer from url", function () {
      const testLayer = new I3SLayer(mockI3SProvider, layerData);

      expect(testLayer.resource.url).toContain("mockProviderUrl/mockLayerUrl/");
      expect(testLayer.resource.queryParameters.testQuery).toEqual("test");

      expect(testLayer.data).toEqual(layerData);

      expect(testLayer._extent.minLongitude).toEqual(0);
      expect(testLayer._extent.minLatitude).toEqual(1);
      expect(testLayer._extent.maxLongitude).toEqual(2);
      expect(testLayer._extent.maxLatitude).toEqual(3);

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
      const testLayer = new I3SLayer(mockI3SProvider, layerData2, 0);
      expect(testLayer.data).toEqual(layerData2);

      expect(testLayer.resource.url).toContain("mockProviderUrl/./layers/0/");
      expect(testLayer.resource.queryParameters.testQuery).toEqual("test");

      expect(testLayer._extent.minLongitude).toEqual(0);
      expect(testLayer._extent.minLatitude).toEqual(1);
      expect(testLayer._extent.maxLongitude).toEqual(2);
      expect(testLayer._extent.maxLatitude).toEqual(3);
    });

    it("constructs I3SLayer from single layer url", function () {
      const mockI3SProviderSingleLayer = new I3SDataProvider(
        "",
        "mockProviderUrl/layers/1/",
        {}
      );

      const testLayer = new I3SLayer(mockI3SProviderSingleLayer, layerData2);

      expect(testLayer.resource.url).toContain("mockProviderUrl/layers/1/");

      expect(testLayer._extent.minLongitude).toEqual(0);
      expect(testLayer._extent.minLatitude).toEqual(1);
      expect(testLayer._extent.maxLongitude).toEqual(2);
      expect(testLayer._extent.maxLatitude).toEqual(3);
    });

    it("loads node page", function (done) {
      const testLayer = new I3SLayer(mockI3SProvider, layerData);

      spyOn(Resource, "fetchJson").and.returnValue(
        Promise.resolve(nodePageResult)
      );

      testLayer._loadNodePage(0).then(function (result) {
        expect(Resource.fetchJson).toHaveBeenCalled();
        expect(Resource.fetchJson.calls.mostRecent().args[0].url).toContain(
          "mockProviderUrl/mockLayerUrl/nodepages/0/"
        );
        done();
      });
    });

    it("load node page rejects invalid url", function (done) {
      const testLayer = new I3SLayer(mockI3SProvider, layerData);

      testLayer._loadNodePage(0).then(
        function (result) {
          done(new Error("Promise should not be resolved for invalid uri"));
        },
        function (reason) {
          expect(reason.statusCode).toEqual(404);
          done();
        }
      );
    });

    it("gets node for unloaded node page", function (done) {
      const testLayer = new I3SLayer(mockI3SProvider, layerData);

      spyOn(Resource, "fetchJson").and.returnValue(
        Promise.resolve(nodePageResult2)
      );

      testLayer._getNodeInNodePages(2).then(function (result) {
        expect(Resource.fetchJson).toHaveBeenCalled();
        expect(Resource.fetchJson.calls.mostRecent().args[0].url).toContain(
          "mockProviderUrl/mockLayerUrl/nodepages/1/"
        );
        expect(result.index).toEqual(2);
        done();
      });
    });

    it("gets node for preloaded node page", function (done) {
      const testLayer = new I3SLayer(mockI3SProvider, layerData);

      spyOn(Resource, "fetchJson").and.returnValue(
        Promise.resolve(nodePageResult2)
      );

      testLayer
        ._loadNodePage(1)
        .then(function (result) {
          expect(Resource.fetchJson).toHaveBeenCalled();
          expect(Resource.fetchJson.calls.mostRecent().args[0].url).toContain(
            "mockProviderUrl/mockLayerUrl/nodepages/1/"
          );

          return testLayer._getNodeInNodePages(2);
        })
        .then(function (result) {
          //Json was not fetched again
          expect(Resource.fetchJson).toHaveBeenCalledTimes(1);
          expect(result.index).toEqual(2);
          done();
        });
    });

    it("loads root node", function (done) {
      const testLayer = new I3SLayer(mockI3SProvider, layerData);
      testLayer._nodePages = [
        [rootNodePageEntry, childNodePageEntry],
        [childNodePageEntry2],
      ];
      testLayer._nodePageFetches = [Promise.resolve()];

      testLayer._loadRootNode().then(function (result) {
        expect(testLayer.rootNode).toBeDefined();
        expect(testLayer.rootNode.data.index).toEqual(0);
        done();
      });
    });

    it("creates 3d tileset", function (done) {
      const testLayer = new I3SLayer(mockI3SProvider, layerData);
      testLayer._nodePages = [
        [rootNodePageEntry, childNodePageEntry],
        [childNodePageEntry2],
      ];
      testLayer._nodePageFetches = [Promise.resolve()];

      testLayer
        ._loadRootNode()
        .then(function (result) {
          testLayer._create3DTileSet();
          expect(testLayer.tileset).toBeDefined();

          return testLayer.tileset.readyPromise;
        })
        .then(function (result) {
          expect(testLayer.tileset.tileUnload._listeners.length).toEqual(1);
          expect(testLayer.tileset.tileVisible._listeners.length).toEqual(1);
          done();
        });
    });

    it("creates 3d tileset with options", function (done) {
      const cesium3dTilesetOptions = {
        debugShowBoundingVolume: true,
        maximumScreenSpaceError: 8,
      };
      const mockI3SProviderWithOptions = new I3SDataProvider(
        "",
        "mockProviderUrl?testQuery=test",
        {
          cesium3dTilesetOptions: cesium3dTilesetOptions,
        }
      );

      const testLayer = new I3SLayer(mockI3SProviderWithOptions, layerData);
      testLayer._nodePages = [
        [rootNodePageEntry, childNodePageEntry],
        [childNodePageEntry2],
      ];
      testLayer._nodePageFetches = [Promise.resolve()];

      testLayer
        ._loadRootNode()
        .then(function (result) {
          testLayer._create3DTileSet();
          expect(testLayer.tileset).toBeDefined();
          expect(testLayer.tileset.debugShowBoundingVolume).toEqual(true);
          expect(testLayer.tileset.maximumScreenSpaceError).toEqual(8);

          return testLayer._tileset.readyPromise;
        })
        .then(function (result) {
          expect(testLayer.tileset.tileUnload._listeners.length).toEqual(1);
          expect(testLayer.tileset.tileVisible._listeners.length).toEqual(1);
          done();
        });
    });

    it("loads i3s layer", function (done) {
      const testLayer = new I3SLayer(mockI3SProvider, layerData);
      testLayer._nodePages = [
        [rootNodePageEntry, childNodePageEntry],
        [childNodePageEntry2],
      ];
      testLayer._nodePageFetches = [Promise.resolve()];

      testLayer.load().then(function (result) {
        expect(testLayer.tileset).toBeDefined();
        expect(testLayer._rootNode).toBeDefined();
        expect(testLayer._rootNode._tile).toBe(testLayer.tileset._root);
        expect(testLayer._rootNode).toBe(testLayer.tileset._root.i3sNode);
        done();
      });
    });

    it("load i3s layer rejects unsupported spatial reference", function (done) {
      const invalidLayerData = {
        nodePages: {
          lodSelectionMetricType: "maxScreenThresholdSQ",
          nodesPerPage: 2,
          rootIndex: 0,
        },
        store: { defaultGeometrySchema: {}, extent: [0, 1, 2, 3] },
        spatialReference: { wkid: 3857 },
      };
      const testLayer = new I3SLayer(mockI3SProvider, invalidLayerData);
      testLayer._nodePages = [
        [rootNodePageEntry, childNodePageEntry],
        [childNodePageEntry2],
      ];
      testLayer._nodePageFetches = [Promise.resolve()];

      spyOn(console, "log");

      testLayer.load().then(
        function (result) {
          done(
            new Error(
              "Promise should not be resolved for unsupported spatial reference"
            )
          );
        },
        function () {
          expect(console.log).toHaveBeenCalledWith(
            `Unsupported spatial reference: ${invalidLayerData.spatialReference.wkid}`
          );
          done();
        }
      );
    });
  },
  "WebGL"
);
