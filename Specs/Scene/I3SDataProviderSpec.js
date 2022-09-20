import {
  GeographicTilingScheme,
  I3SDataProvider,
  Resource,
} from "../../Source/Cesium.js";

describe(
  "Scene/I3SDataProvider",
  function () {
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
      ready: true,
    };

    const mockLayerCollection = [
      {
        _tileset: mockTileset,
      },
      {
        _tileset: mockTilesetReady,
      },
      {
        //Need to handle the case of undefined tilesets because update may be called before they're created
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
      readyPromise: Promise.resolve(),
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
      store: { rootNode: "mockRootNodeUrl" },
      fullExtent: { xmin: 0, ymin: 1, xmax: 2, ymax: 3 },
      spatialReference: { wkid: 4326 },
      id: 0,
    };

    const mockProviderData = {
      name: "mockProviderName",
      serviceVersion: "1.6",
      layers: [mockLayerData],
    };

    it("constructs default I3SDataProvider", function () {
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );

      expect(testProvider.name).toEqual("testProvider");
      expect(testProvider.isLoading).toEqual(false);
      expect(testProvider.changedEvent).toBeDefined();
      expect(testProvider.errorEvent).toBeDefined();
      expect(testProvider.loadingEvent).toBeDefined();

      expect(testProvider.traceFetches).toEqual(false);
      expect(testProvider.geoidTiledServiceProvider).toBeUndefined();
    });

    it("constructs I3SDataProvider with options", function () {
      const geoidService = {};
      const cesium3dTilesetOptions = {
        skipLevelOfDetail: true,
        debugShowBoundingVolume: false,
        maximumScreenSpaceError: 16,
      };
      const i3sOptions = {
        traceFetches: true, // for tracing I3S fetches
        autoCenterCameraOnStart: true, // auto center to the location of the i3s
        geoidTiledTerrainProvider: geoidService, // pass the geoid service
        cesium3dTilesetOptions: cesium3dTilesetOptions,
      };
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        i3sOptions
      );

      expect(testProvider.name).toEqual("testProvider");
      expect(testProvider.isLoading).toEqual(false);
      expect(testProvider.changedEvent).toBeDefined();
      expect(testProvider.errorEvent).toBeDefined();
      expect(testProvider.loadingEvent).toBeDefined();

      expect(testProvider.traceFetches).toEqual(true);
      expect(testProvider.geoidTiledTerrainProvider).toEqual(geoidService);
    });

    it("sets properties", function () {
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );

      testProvider.traceFetches = true;
      testProvider.autoCenterCameraOnStart = true;
      testProvider.geoidTiledTerrainProvider = {};

      expect(testProvider.traceFetches).toEqual(true);
      expect(testProvider.autoCenterCameraOnStart).toEqual(true);
      expect(testProvider.geoidTiledTerrainProvider).toEqual({});
    });

    it("wraps update", function () {
      //Wrapper function. We only want to verify the equivalent function on the internal Cesium3DTileset is called correctly
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );
      testProvider._layerCollection = mockLayerCollection;

      spyOn(testProvider._layerCollection[0]._tileset, "update");
      spyOn(testProvider._layerCollection[1]._tileset, "update");

      const frameState = {};
      testProvider.update(frameState);

      //Function should not be called for tilesets that are not yet ready
      expect(
        testProvider._layerCollection[0]._tileset.update
      ).not.toHaveBeenCalled();
      expect(
        testProvider._layerCollection[1]._tileset.update
      ).toHaveBeenCalledWith(frameState);
    });

    it("wraps prePassesUpdate", function () {
      //Wrapper function. We only want to verify the equivalent function on the internal Cesium3DTileset is called correctly
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );
      testProvider._layerCollection = mockLayerCollection;

      spyOn(testProvider._layerCollection[0]._tileset, "prePassesUpdate");
      spyOn(testProvider._layerCollection[1]._tileset, "prePassesUpdate");

      const frameState = {};
      testProvider.prePassesUpdate(frameState);

      //Function should not be called for tilesets that are not yet ready
      expect(
        testProvider._layerCollection[0]._tileset.prePassesUpdate
      ).not.toHaveBeenCalled();
      expect(
        testProvider._layerCollection[1]._tileset.prePassesUpdate
      ).toHaveBeenCalledWith(frameState);
    });

    it("wraps postPassesUpdate", function () {
      //Wrapper function. We only want to verify the equivalent function on the internal Cesium3DTileset is called correctly
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );
      testProvider._layerCollection = mockLayerCollection;

      spyOn(testProvider._layerCollection[0]._tileset, "postPassesUpdate");
      spyOn(testProvider._layerCollection[1]._tileset, "postPassesUpdate");

      const frameState = {};
      testProvider.postPassesUpdate(frameState);

      //Function should not be called for tilesets that are not yet ready
      expect(
        testProvider._layerCollection[0]._tileset.postPassesUpdate
      ).not.toHaveBeenCalled();
      expect(
        testProvider._layerCollection[1]._tileset.postPassesUpdate
      ).toHaveBeenCalledWith(frameState);
    });

    it("wraps updateForPass", function () {
      //Wrapper function. We only want to verify the equivalent function on the internal Cesium3DTileset is called correctly
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );
      testProvider._layerCollection = mockLayerCollection;

      spyOn(testProvider._layerCollection[0]._tileset, "updateForPass");
      spyOn(testProvider._layerCollection[1]._tileset, "updateForPass");

      const frameState = {};
      const passState = { test: "test" };
      testProvider.updateForPass(frameState, passState);

      //Function should not be called for tilesets that are not yet ready
      expect(
        testProvider._layerCollection[0]._tileset.updateForPass
      ).not.toHaveBeenCalled();
      expect(
        testProvider._layerCollection[1]._tileset.updateForPass
      ).toHaveBeenCalledWith(frameState, passState);
    });

    it("wraps show property", function () {
      //Wrapper function. We only want to verify the equivalent function on the internal Cesium3DTileset is called correctly
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );
      testProvider._layerCollection = mockLayerCollection;

      //Function should not be called for tilesets that are not yet ready
      testProvider.show = true;
      expect(testProvider._layerCollection[0]._tileset.show).toEqual(true);
      expect(testProvider._layerCollection[1]._tileset.show).toEqual(true);

      testProvider.show = false;
      expect(testProvider._layerCollection[0]._tileset.show).toEqual(false);
      expect(testProvider._layerCollection[1]._tileset.show).toEqual(false);
    });

    it("isDestroyed returns false for new provider", function () {
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );
      testProvider._layerCollection = mockLayerCollection;

      expect(testProvider.isDestroyed()).toEqual(false);
    });

    it("destroys provider", function () {
      //Wrapper function. We only want to verify the equivalent function on the internal Cesium3DTileset is called correctly
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );
      testProvider._layerCollection = mockLayerCollection;

      spyOn(mockTileset, "destroy");
      spyOn(mockTilesetReady, "destroy");

      testProvider.destroy();

      expect(mockTileset.destroy).toHaveBeenCalled();
      expect(mockTilesetReady.destroy).toHaveBeenCalled();

      expect(testProvider.isDestroyed()).toEqual(true);
    });

    it("loads binary", function (done) {
      const mockBinaryResponse = new ArrayBuffer(1);
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );

      spyOn(Resource, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(mockBinaryResponse)
      );

      const uri = "mockBinaryUri";
      testProvider._loadBinary(uri).then(function (result) {
        expect(Resource.fetchArrayBuffer).toHaveBeenCalledWith(uri);
        expect(result).toBe(mockBinaryResponse);
        done();
      });
    });
    it("loads binary with traceFetches", function (done) {
      const mockBinaryResponse = new ArrayBuffer(1);
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {
          traceFetches: true,
        }
      );

      spyOn(Resource, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(mockBinaryResponse)
      );

      spyOn(console, "log");

      const uri = "mockBinaryUri";
      testProvider._loadBinary(uri).then(function (result) {
        expect(Resource.fetchArrayBuffer).toHaveBeenCalledWith(uri);
        expect(console.log).toHaveBeenCalledWith("I3S FETCH:", uri);

        expect(result).toBe(mockBinaryResponse);
        done();
      });
    });
    it("loads binary with invalid uri", function (done) {
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );

      const uri = "mockBinaryUri";
      testProvider._loadBinary(uri).then(
        function (result) {
          done(new Error("Promise should not be resolved for invalid uri"));
        },
        function (reason) {
          expect(reason.statusCode).toEqual(404);
          done();
        }
      );
    });

    it("loads json", function (done) {
      const mockJsonResponse = { test: 1 };
      const testProvider = new I3SDataProvider("testProvider", {});

      spyOn(Resource, "fetchJson").and.returnValue(
        Promise.resolve(mockJsonResponse)
      );

      const uri = "mockJsonUri";
      testProvider._loadJson(uri).then(function (result) {
        expect(Resource.fetchJson).toHaveBeenCalledWith(uri);
        expect(result).toBe(mockJsonResponse);
        done();
      });
    });
    it("loads json with traceFetches enabled", function (done) {
      const mockJsonResponse = { test: 1 };
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {
          traceFetches: true,
        }
      );

      spyOn(Resource, "fetchJson").and.returnValue(
        Promise.resolve(mockJsonResponse)
      );

      spyOn(console, "log");

      const uri = "mockJsonUri";
      testProvider._loadJson(uri).then(function (result) {
        expect(Resource.fetchJson).toHaveBeenCalledWith(uri);
        expect(console.log).toHaveBeenCalledWith("I3S FETCH:", uri);

        expect(result).toBe(mockJsonResponse);
        done();
      });
    });
    it("loadJson rejects invalid uri", function (done) {
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );

      const uri = "mockJsonUri";
      testProvider._loadJson(uri).then(
        function (result) {
          done(new Error("Promise should not be resolved for invalid uri"));
        },
        function (reason) {
          expect(reason.statusCode).toEqual(404);
          done();
        }
      );
    });
    it("loadJson rejects error response", function (done) {
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

      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );

      spyOn(Resource, "fetchJson").and.returnValue(
        Promise.resolve(mockErrorResponse)
      );

      const uri = "mockJsonUri";
      testProvider._loadJson(uri).then(
        function (result) {
          done(new Error("Promise should not be resolved for error response"));
        },
        function (reason) {
          expect(reason).toBe(mockErrorResponse.error);
          done();
        }
      );
    });

    it("loads geoid data", function (done) {
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {
          geoidTiledTerrainProvider: mockGeoidProvider,
        }
      );
      testProvider._extent = {
        minLongitude: -1,
        minLatitude: 0,
        maxLongitude: 1,
        maxLatitude: 2,
      };

      testProvider.loadGeoidData().then(function () {
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
        done();
      });
    });

    it("loadGeoidData resolves when no geoid provider is given", function (done) {
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );
      testProvider._extent = {
        minLongitude: -1,
        minLatitude: 0,
        maxLongitude: 1,
        maxLatitude: 2,
      };

      testProvider.loadGeoidData().then(function () {
        expect(testProvider._geoidDataList).toBeUndefined();
        done();
      });
    });

    it("computes extent from layers", function () {
      const mockLayer1 = {
        _extent: {
          minLongitude: -1,
          minLatitude: 0,
          maxLongitude: 1,
          maxLatitude: 2,
        },
      };
      const mockLayer2 = {
        _extent: {
          minLongitude: 3,
          minLatitude: 1,
          maxLongitude: 4,
          maxLatitude: 3,
        },
      };

      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {}
      );
      testProvider._layerCollection = [mockLayer1, mockLayer2, {}];

      testProvider._computeExtent();
      expect(testProvider.extent.minLongitude).toEqual(-1);
      expect(testProvider.extent.minLatitude).toEqual(0);
      expect(testProvider.extent.maxLongitude).toEqual(4);
      expect(testProvider.extent.maxLatitude).toEqual(3);
    });

    it("loads i3s provider", function (done) {
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl",
        {
          geoidTiledTerrainProvider: mockGeoidProvider,
        }
      );

      spyOn(Resource, "fetchJson").and.callFake(function (url) {
        if (url.endsWith("mockProviderUrl/layers/0/mockRootNodeUrl/")) {
          return Promise.resolve(mockRootNodeData);
        } else if (url.endsWith("mockProviderUrl")) {
          return Promise.resolve(mockProviderData);
        }

        return Promise.reject();
      });

      testProvider.load().then(function () {
        expect(testProvider.readyPromise).toBeDefined();

        //Layers have been populated and root node is loaded
        expect(testProvider.layers.length).toEqual(1);
        expect(testProvider.layers[0].rootNode.tile).toBeDefined();
        expect(testProvider.layers[0].rootNode.tile.i3sNode).toEqual(
          testProvider.layers[0].rootNode
        );

        //Expect geoid data to have been loaded
        expect(testProvider._geoidDataList.length).toEqual(1);
        expect(testProvider._geoidDataList[0].height).toEqual(2);
        expect(testProvider._geoidDataList[0].width).toEqual(2);
        expect(testProvider._geoidDataList[0].buffer).toEqual(
          new Float32Array([4, 5, 6, 7])
        );

        done();
      });
    });

    it("loads i3s provider from single layer url", function (done) {
      const testProvider = new I3SDataProvider(
        "testProvider",
        "mockProviderUrl/layers/0/",
        {
          geoidTiledTerrainProvider: mockGeoidProvider,
        }
      );

      spyOn(Resource, "fetchJson").and.callFake(function (url) {
        if (url.endsWith("mockProviderUrl/layers/0/mockRootNodeUrl/")) {
          return Promise.resolve(mockRootNodeData);
        } else if (url.endsWith("mockProviderUrl/layers/0/")) {
          return Promise.resolve(mockLayerData);
        }

        return Promise.reject();
      });

      testProvider.load().then(function () {
        expect(testProvider.readyPromise).toBeDefined();

        //Layers have been populated and root node is loaded
        expect(testProvider.layers.length).toEqual(1);
        expect(testProvider.layers[0].rootNode.tile).toBeDefined();
        expect(testProvider.layers[0].rootNode.tile.i3sNode).toEqual(
          testProvider.layers[0].rootNode
        );

        //Expect geoid data to have been loaded
        expect(testProvider._geoidDataList.length).toEqual(1);
        expect(testProvider._geoidDataList[0].height).toEqual(2);
        expect(testProvider._geoidDataList[0].width).toEqual(2);
        expect(testProvider._geoidDataList[0].buffer).toEqual(
          new Float32Array([4, 5, 6, 7])
        );

        done();
      });
    });
  },
  "WebGL"
);
