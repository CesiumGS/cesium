import {
  Cartesian3,
  Cartographic,
  Cesium3DTileRefine,
  Math as CesiumMath,
  Ellipsoid,
  Matrix4,
  I3SNode,
  I3SLayer,
  I3SDataProvider,
  Rectangle,
  Resource,
  WebMercatorProjection,
} from "../../Source/Cesium.js";

describe(
  "Scene/I3SNode",
  function () {
    const mockI3SProvider = new I3SDataProvider(
      "",
      "mockProviderUrl?testQuery=test",
      {}
    );
    mockI3SProvider._taskProcessorReadyPromise = Promise.resolve();

    const mockI3SProviderWithoutQuery = new I3SDataProvider(
      "",
      "mockProviderUrl",
      {}
    );
    mockI3SProviderWithoutQuery._taskProcessorReadyPromise = Promise.resolve();

    //Mock geoid data. 2x2 pixels for the whole world
    const geoidDataList = [
      {
        buffer: new Float32Array([0, 10, 10, 20]),
        height: 2,
        nativeExtent: new Rectangle(
          -20037508.342787e7,
          -20037508.342787e7,
          20037508.342787e7,
          20037508.342787e7
        ),
        offset: 0,
        projection: new WebMercatorProjection(
          new Ellipsoid(6378137, 6378137, 6356752.314245179)
        ),
        projectionType: "WebMercator",
        scale: 1,
        width: 2,
      },
    ];

    const mockI3SProviderWithGeoidConversion = new I3SDataProvider(
      "",
      "mockProviderUrl?testQuery=test",
      {}
    );
    mockI3SProviderWithGeoidConversion._geoidDataList = geoidDataList;
    mockI3SProviderWithGeoidConversion._taskProcessorReadyPromise = Promise.resolve();

    const mockCesiumTileset = {
      debugShowBoundingVolume: true,
      debugShowViewerRequestVolume: true,
      modelMatrix: Matrix4.IDENTITY,
      _geometricError: 2,
      _isI3STileSet: true,
    };

    const rootNodeWithChildren = {
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
      children: [
        {
          id: 1,
          href: "../1",
        },
        {
          id: 2,
          href: "../2",
        },
      ],
    };
    const nodeWithContent = {
      id: 1,
      level: 1,
      mbs: [-90, 45, 0, 14144.3451598],
      lodSelection: [
        { metricType: "maxScreenThreshold", maxError: 2 },
        { metricType: "maxScreenThresholdSQ", maxError: 4 },
      ],
      children: [],
      featureData: [
        {
          href: "mockFeatureDataUrl",
        },
      ],
      geometryData: [
        {
          href: "mockGeometryDataUrl",
        },
      ],
    };
    const nodeWithTexturedContent = {
      id: 1,
      level: 1,
      mbs: [-90, 45, 0, 14144.3451598],
      lodSelection: [
        { metricType: "maxScreenThreshold", maxError: 2 },
        { metricType: "maxScreenThresholdSQ", maxError: 4 },
      ],
      children: [],
      featureData: [
        {
          href: "mockFeatureDataUrl",
        },
      ],
      geometryData: [
        {
          href: "mockGeometryDataUrl",
        },
      ],
      textureData: [
        {
          href: "mockTextureDataUrl",
        },
      ],
    };

    const mockMesh = {
      attribute: { resource: 1 },
      geometry: {
        definition: 0,
        featureCount: 2,
        resource: 1,
        vertexCount: 6,
      },
      material: { definition: 0, resource: 1 },
    };
    const mockMeshWithMaterial = {
      attribute: { resource: 2 },
      geometry: {
        definition: 0,
        featureCount: 2,
        resource: 2,
        vertexCount: 6,
      },
      material: { definition: 1, resource: 2 },
    };

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
      mesh: mockMesh,
    };
    const texturedChildNodePageEntry = {
      index: 2,
      children: [],
      obb: {
        center: [-90, 45, 0],
        halfSize: [10000, 10000, 250],
        quaternion: [1, 0, 0, 0],
      },
      lodThreshold: 500,
      parentIndex: 0,
      mesh: mockMeshWithMaterial,
    };

    const base64ToArrayBuffer = function (base64String) {
      const byteString = atob(base64String);
      const buffer = new ArrayBuffer(byteString.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < byteString.length; i++) {
        view[i] = byteString.charCodeAt(i);
      }
      return buffer;
    };

    const int8AttrBufferBase64 = "AgAAAAEC"; // 2 attribute values: 1, 2
    const int16AttrBufferBase64 = "AgAAAAEAAgA="; // 2 attribute values: 1, 2
    const int32AttrBufferBase64 = "AgAAAAEAAAD/////"; // 2 attribute values: 1, -1
    const int64AttrBufferBase64 = "AgAAAAAAAAABAAAAAAAAAP//////////"; // 2 attribute values: 1, -1
    const float32AttrBufferBase64 = "AgAAAAAAgD8AAABA"; // 2 attribute values: 1.0, 2.0
    const float64AttrBufferBase64 = "AgAAAAAAAAAAAAAAAADwPwAAAAAAAABA"; // 2 attribute values: 1.0, 2.0
    const stringAttrBufferBase64 = "AgAAABAAAAAEAAAABAAAAGFiYwBkZWYA"; // 2 string values: "abc", "def"

    const attrStorageInfo = [
      {
        attributeValues: { valueType: "UInt8", valuesPerElement: 1 },
        header: [{ property: "count", valueType: "UInt32" }],
        key: "f_0",
        name: "testUInt8",
        ordering: ["attributeValues"],
      },
      {
        attributeValues: { valueType: "Int8", valuesPerElement: 1 },
        header: [{ property: "count", valueType: "UInt32" }],
        key: "f_1",
        name: "testInt8",
        ordering: ["attributeValues"],
      },
      {
        attributeValues: { valueType: "UInt16", valuesPerElement: 1 },
        header: [{ property: "count", valueType: "UInt32" }],
        key: "f_2",
        name: "testUInt16",
        ordering: ["attributeValues"],
      },
      {
        attributeValues: { valueType: "Int16", valuesPerElement: 1 },
        header: [{ property: "count", valueType: "UInt32" }],
        key: "f_3",
        name: "testInt16",
        ordering: ["attributeValues"],
      },
      {
        attributeValues: { valueType: "Oid32", valuesPerElement: 1 },
        header: [{ property: "count", valueType: "UInt32" }],
        key: "f_4",
        name: "testOid32",
        ordering: ["attributeValues"],
      },
      {
        attributeValues: { valueType: "UInt32", valuesPerElement: 1 },
        header: [{ property: "count", valueType: "UInt32" }],
        key: "f_5",
        name: "testUInt32",
        ordering: ["attributeValues"],
      },
      {
        attributeValues: { valueType: "Int32", valuesPerElement: 1 },
        header: [{ property: "count", valueType: "UInt32" }],
        key: "f_6",
        name: "testInt32",
        ordering: ["attributeValues"],
      },
      {
        attributeValues: { valueType: "UInt64", valuesPerElement: 1 },
        header: [{ property: "count", valueType: "UInt32" }],
        key: "f_7",
        name: "testUInt64",
        ordering: ["attributeValues"],
      },
      {
        attributeValues: { valueType: "Int64", valuesPerElement: 1 },
        header: [{ property: "count", valueType: "UInt32" }],
        key: "f_8",
        name: "testInt64",
        ordering: ["attributeValues"],
      },
      {
        attributeValues: { valueType: "Float32", valuesPerElement: 1 },
        header: [{ property: "count", valueType: "UInt32" }],
        key: "f_9",
        name: "testFloat32",
        ordering: ["attributeValues"],
      },
      {
        attributeValues: { valueType: "Float64", valuesPerElement: 1 },
        header: [{ property: "count", valueType: "UInt32" }],
        key: "f_10",
        name: "testFloat64",
        ordering: ["attributeValues"],
      },
      {
        attributeByteCounts: { valueType: "UInt32", valuesPerElement: 1 },
        attributeValues: {
          valueType: "String",
          valuesPerElement: 1,
          encoding: "UTF-8",
        },
        header: [
          { property: "count", valueType: "UInt32" },
          { property: "attributeValuesByteCount", valueType: "UInt32" },
        ],
        key: "f_11",
        name: "testString",
        ordering: ["attributeByteCounts", "attributeValues"],
      },
    ];

    const layerData = {
      href: "mockLayerUrl",
      nodePages: {
        lodSelectionMetricType: "maxScreenThresholdSQ",
        nodesPerPage: 64,
      },
      attributeStorageInfo: attrStorageInfo,
      store: { defaultGeometrySchema: {} },
      materialDefinitions: [
        {
          doubleSided: true,
          pbrMetallicRoughness: {
            metallicFactor: 0,
          },
        },
        {
          doubleSided: true,
          pbrMetallicRoughness: {
            baseColorTexture: { textureSetDefinitionId: 0 },
            metallicFactor: 0,
          },
        },
      ],
      textureSetDefinitions: [
        {
          formats: [
            { name: "0", format: "dds" },
            { name: "1", format: "jpg" },
          ],
        },
      ],
    };
    const mockI3SLayerWithNodePages = new I3SLayer(mockI3SProvider, layerData);
    mockI3SLayerWithNodePages._tileset = mockCesiumTileset;
    mockI3SLayerWithNodePages._nodePages = [
      [rootNodePageEntry, childNodePageEntry, texturedChildNodePageEntry],
    ];
    mockI3SLayerWithNodePages._nodePageFetches = [Promise.resolve()];
    mockI3SLayerWithNodePages._geometryDefinitions = [
      [
        { index: 0, compressed: false, attributes: ["position"] },
        {
          index: 1,
          compressed: false,
          attributes: [
            "position",
            "normal",
            "uv0",
            "color",
            "featureId",
            "faceRange",
          ],
        },
      ],
    ];

    const mockI3SLayerGeoid = new I3SLayer(
      mockI3SProviderWithGeoidConversion,
      layerData
    );
    mockI3SLayerGeoid._tileset = mockCesiumTileset;
    mockI3SLayerGeoid._nodePages = [
      [rootNodePageEntry, childNodePageEntry, texturedChildNodePageEntry],
    ];
    mockI3SLayerGeoid._nodePageFetches = [Promise.resolve()];
    mockI3SLayerGeoid._geometryDefinitions = [
      [
        { index: 0, compressed: false, attributes: ["position"] },
        {
          index: 1,
          compressed: false,
          attributes: [
            "position",
            "normal",
            "uv0",
            "color",
            "featureId",
            "faceRange",
          ],
        },
      ],
    ];

    const mockI3SLayerWithoutNodePages = new I3SLayer(
      mockI3SProviderWithoutQuery,
      layerData
    );
    mockI3SLayerWithoutNodePages._tileset = mockCesiumTileset;
    mockI3SLayerWithoutNodePages._geometryDefinitions = [
      [
        { index: 0, compressed: false, attributes: ["position"] },
        {
          index: 1,
          compressed: false,
          attributes: [
            "position",
            "normal",
            "uv0",
            "color",
            "featureId",
            "faceRange",
          ],
        },
      ],
    ];

    it("constructs nodes", function () {
      const rootNode = new I3SNode(
        mockI3SLayerWithoutNodePages,
        "mockRootUrl",
        true
      );
      expect(rootNode.resource.url).toContain(
        "mockProviderUrl/mockLayerUrl/mockRootUrl/"
      );
      expect(rootNode.parent).toEqual(mockI3SLayerWithoutNodePages);
      expect(rootNode.layer).toEqual(mockI3SLayerWithoutNodePages);
      expect(rootNode._level).toEqual(0);

      const childNode = new I3SNode(rootNode, 3, false);
      expect(childNode.uri).toBeUndefined();
      expect(childNode._nodeIndex).toEqual(3);
      expect(childNode.parent).toEqual(rootNode);
      expect(childNode.layer).toEqual(mockI3SLayerWithoutNodePages);
      expect(childNode._level).toEqual(1);
    });

    const customAttributes = {
      cartesianCenter: Ellipsoid.WGS84.cartographicToCartesian(
        new Cartographic(-90, 45, 0)
      ),
      featureIndex: new Uint32Array([0, 0, 1, 1]),
      positions: new Float32Array([
        -20,
        -20,
        0,
        20,
        0,
        0,
        -20,
        0,
        0,
        -20,
        -20,
        0,
        20,
        -20,
        0,
        20,
        0,
        0,
        -20,
        0,
        0,
        20,
        20,
        0,
        -20,
        20,
        0,
        -20,
        0,
        0,
        20,
        0,
        0,
        20,
        20,
        0,
      ]),
      parentRotation: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    };
    const customAttributesIndexed = {
      cartesianCenter: Ellipsoid.WGS84.cartographicToCartesian(
        new Cartographic(-90, 45, 0)
      ),
      featureIndex: new Uint32Array([0, 0, 1, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 3, 1, 2, 4, 5, 2, 1, 4]),
      positions: new Float32Array([
        -20,
        -20,
        0,
        20,
        0,
        0,
        -20,
        0,
        0,
        20,
        -20,
        0,
        20,
        20,
        0,
        -20,
        20,
        0,
      ]),
      parentRotation: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    };

    //Test points for getClosestPointIndexOnTriangle
    //Simple clean intersection
    const intersectPoint = new Cartesian3(
      -19 + customAttributes.cartesianCenter.x,
      -19 + customAttributes.cartesianCenter.y,
      0 + customAttributes.cartesianCenter.z
    );
    //On triangle edge
    const borderPoint = new Cartesian3(
      20 + customAttributes.cartesianCenter.x,
      15 + customAttributes.cartesianCenter.y,
      0 + customAttributes.cartesianCenter.z
    );
    //Above triangle
    const floatingIntersectPoint = new Cartesian3(
      -19 + customAttributes.cartesianCenter.x,
      19 + customAttributes.cartesianCenter.y,
      2 + customAttributes.cartesianCenter.z
    );
    //No intersection
    const noIntersectPoint = new Cartesian3(
      -21 + customAttributes.cartesianCenter.x,
      -21 + customAttributes.cartesianCenter.y,
      0 + customAttributes.cartesianCenter.z
    );

    const i3sGeometryData = {
      meshData: {
        nodesInScene: [0],
        nodes: [{ mesh: 0 }],
        meshes: [
          {
            primitives: [
              {
                attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
                indices: 4,
                material: 0,
              },
            ],
          },
        ],
        buffers: [
          {
            byteLength: 336,
            uri: "i3sMockBufferUrl",
          },
        ],
        bufferViews: [
          {
            buffer: 0,
            byteLength: 108,
            byteOffset: 48,
            target: 34962,
          },
          {
            buffer: 0,
            byteLength: 108,
            byteOffset: 156,
            target: 34962,
          },
          {
            buffer: 0,
            byteLength: 72,
            byteOffset: 264,
            target: 34962,
          },
          {
            buffer: 0,
            byteLength: 48,
            byteOffset: 0,
            target: 34963,
          },
        ],
        accessors: [
          {
            bufferView: 0,
            byteOffset: 0,
            componentType: 5126,
            count: 9,
            max: [20.0, 20.0, 0.0],
            min: [-20.0, -20.0, 0.0],
            type: "VEC3",
          },
          {
            bufferView: 1,
            byteOffset: 0,
            componentType: 5126,
            count: 9,
            max: [0.0, 0.0, 1.0],
            min: [0.0, 0.0, 1.0],
            type: "VEC3",
          },
          {
            bufferView: 2,
            byteOffset: 0,
            componentType: 5126,
            count: 9,
            max: [0.0, 1.0],
            min: [0.0, 1.0],
            type: "VEC2",
          },
          {
            bufferView: 3,
            byteOffset: 0,
            componentType: 5125,
            count: 12,
            max: [8],
            min: [0],
            type: "SCALAR",
          },
        ],
        customAttributes: customAttributes,
      },
    };

    it("loads root node from uri", function (done) {
      const rootNode = new I3SNode(
        mockI3SLayerWithoutNodePages,
        "mockUrl",
        true
      );

      spyOn(rootNode._dataProvider, "_loadJson").and.returnValue(
        Promise.resolve(rootNodeWithChildren)
      );

      rootNode.load().then(function (result) {
        expect(rootNode._dataProvider._loadJson).toHaveBeenCalledWith(
          rootNode.resource
        );
        expect(rootNode.data.children.length).toEqual(2);
        done();
      });
    });

    it("loads child node from uri", function (done) {
      const rootNode = new I3SNode(
        mockI3SLayerWithoutNodePages,
        "mockUrl",
        true
      );
      const childNode = new I3SNode(rootNode, "mockUrlChild", false);
      spyOn(childNode._dataProvider, "_loadJson").and.returnValue(
        Promise.resolve(nodeWithContent)
      );

      rootNode
        .load()
        .then(function (result) {
          return childNode.load();
        })
        .then(function (result) {
          expect(childNode._dataProvider._loadJson).toHaveBeenCalledWith(
            childNode.resource
          );
          expect(childNode.data.children.length).toEqual(0);
          expect(childNode.tile).toBeDefined();
          expect(childNode.tile.i3sNode).toBe(childNode);
          done();
        });
    });

    it("loads root from node pages", function (done) {
      const rootNode = new I3SNode(mockI3SLayerWithNodePages, 0, true);

      rootNode.load().then(function (result) {
        expect(rootNode.data.children.length).toEqual(2);
        expect(rootNode.data.mesh).toBeUndefined();
        done();
      });
    });

    it("loads node from node pages", function (done) {
      const rootNode = new I3SNode(mockI3SLayerWithNodePages, 0, true);
      const childNode = new I3SNode(rootNode, 1, false);

      rootNode
        .load()
        .then(function (result) {
          return childNode.load();
        })
        .then(function (result) {
          expect(childNode.data.children.length).toEqual(0);
          expect(childNode.data.mesh).toBeDefined();
          done();
        });
    });

    it("loads node with geoid conversion", function (done) {
      const rootNode = new I3SNode(mockI3SLayerGeoid, 0, true);
      const childNode = new I3SNode(rootNode, 1, false);

      rootNode
        .load()
        .then(function (result) {
          return childNode.load();
        })
        .then(function (result) {
          expect(childNode.data.children.length).toEqual(0);
          expect(childNode.data.mesh).toBeDefined();

          const nodeOrigin = new Cartesian3(
            childNode._globalTransforms[3],
            childNode._globalTransforms[7],
            childNode._globalTransforms[11]
          );
          const cartographicOrigin = Ellipsoid.WGS84.cartesianToCartographic(
            nodeOrigin
          );

          const expectedHeight = 10;
          const expectedPosition = new Cartographic(
            CesiumMath.toRadians(-90),
            CesiumMath.toRadians(45),
            expectedHeight
          );

          expect(cartographicOrigin.longitude).toBeCloseTo(
            expectedPosition.longitude,
            -3
          );
          expect(cartographicOrigin.latitude).toBeCloseTo(
            expectedPosition.latitude,
            -3
          );
          expect(cartographicOrigin.height).toBeCloseTo(
            expectedPosition.height,
            -3
          );

          done();
        });
    });

    it("load rejects invalid uri", function (done) {
      const rootNode = new I3SNode(
        mockI3SLayerWithoutNodePages,
        "invalidUri",
        true
      );

      rootNode.load().then(
        function () {
          done(new Error("Promise should not be resolved for invalid uri"));
        },
        function (reason) {
          // Promise is rejected
          expect(reason.statusCode).toEqual(404);
          done(); // Success
        }
      );
    });

    it("loads children", function (done) {
      const rootNode = new I3SNode(mockI3SLayerWithNodePages, 0, true);

      //Mock cesium tile to associate with the root, since we don't have a real Cesium3dTileset
      const mockCesiumTilesetRootTile = {
        children: [],
        computedTransform: new Matrix4(),
        _initialTransform: new Matrix4(),
        geometricError: 1,
        refine: Cesium3DTileRefine.REPLACE,
      };
      rootNode._tile = mockCesiumTilesetRootTile;

      rootNode
        .load()
        .then(function () {
          return rootNode._loadChildren();
        })
        .then(function () {
          expect(rootNode.children.length).toEqual(2);
          expect(rootNode.children[0].data.index).toEqual(1);
          expect(rootNode.children[1].data.index).toEqual(2);
          done();
        });
    });

    it("loads children for leaf node", function (done) {
      const nodeWithoutChildren = new I3SNode(
        mockI3SLayerWithNodePages,
        1,
        true
      );

      nodeWithoutChildren
        .load()
        .then(function () {
          return nodeWithoutChildren._loadChildren();
        })
        .then(function () {
          //loadChildren should still resolve if there are no children
          expect(nodeWithoutChildren.children.length).toEqual(0);
          done();
        });
    });

    it("loads fields", function (done) {
      const rootNode = new I3SNode(mockI3SLayerWithNodePages, 1, true);

      spyOn(rootNode._dataProvider, "_loadBinary").and.callFake(function (
        resource
      ) {
        return new Promise(function (resolve, reject) {
          let resultBuffer = "";
          if (resource.url.includes("f_0/") || resource.url.includes("f_1/")) {
            resultBuffer = int8AttrBufferBase64;
          } else if (
            resource.url.includes("f_2/") ||
            resource.url.includes("f_3/")
          ) {
            resultBuffer = int16AttrBufferBase64;
          } else if (
            resource.url.includes("f_4/") ||
            resource.url.includes("f_5/") ||
            resource.url.includes("f_6/")
          ) {
            resultBuffer = int32AttrBufferBase64;
          } else if (
            resource.url.includes("f_7/") ||
            resource.url.includes("f_8/")
          ) {
            resultBuffer = int64AttrBufferBase64;
          } else if (resource.url.includes("f_9/")) {
            resultBuffer = float32AttrBufferBase64;
          } else if (resource.url.includes("f_10/")) {
            resultBuffer = float64AttrBufferBase64;
          } else if (resource.url.includes("f_11/")) {
            resultBuffer = stringAttrBufferBase64;
          }

          resolve(base64ToArrayBuffer(resultBuffer));
        });
      });

      rootNode
        .load()
        .then(function () {
          return rootNode.loadFields();
        })
        .then(function () {
          expect(rootNode.fields.testInt8.name).toEqual("testInt8");
          expect(rootNode.fields.testInt8.resource.url).toContain(
            "mockProviderUrl/mockLayerUrl/nodes/1/attributes/f_1/0"
          );
          expect(
            rootNode.fields.testInt8.resource.queryParameters.testQuery
          ).toEqual("test");

          expect(rootNode.fields.testInt8.header.count).toEqual(2);
          expect(rootNode.fields.testInt8.values[0]).toEqual(1);
          expect(rootNode.fields.testInt8.values[1]).toEqual(2);
          expect(rootNode.fields.testUInt8.header.count).toEqual(2);
          expect(rootNode.fields.testUInt8.values[0]).toEqual(1);
          expect(rootNode.fields.testUInt8.values[1]).toEqual(2);

          expect(rootNode.fields.testInt16.header.count).toEqual(2);
          expect(rootNode.fields.testInt16.values[0]).toEqual(1);
          expect(rootNode.fields.testInt16.values[1]).toEqual(2);
          expect(rootNode.fields.testUInt16.header.count).toEqual(2);
          expect(rootNode.fields.testUInt16.values[0]).toEqual(1);
          expect(rootNode.fields.testUInt16.values[1]).toEqual(2);

          expect(rootNode.fields.testInt32.header.count).toEqual(2);
          expect(rootNode.fields.testInt32.values[0]).toEqual(1);
          expect(rootNode.fields.testInt32.values[1]).toEqual(-1);
          expect(rootNode.fields.testUInt32.header.count).toEqual(2);
          expect(rootNode.fields.testUInt32.values[0]).toEqual(1);
          expect(rootNode.fields.testUInt32.values[1]).toEqual(
            Math.pow(2, 32) - 1
          );

          expect(rootNode.fields.testInt64.header.count).toEqual(2);
          expect(rootNode.fields.testInt64.values[0]).toEqual(1);
          expect(rootNode.fields.testInt64.values[1]).toEqual(-1);
          expect(rootNode.fields.testUInt64.header.count).toEqual(2);
          expect(rootNode.fields.testUInt64.values[0]).toEqual(1);
          expect(rootNode.fields.testUInt64.values[1]).toEqual(Math.pow(2, 64)); //Value loses precision because js doesn't support int64

          expect(rootNode.fields.testFloat32.header.count).toEqual(2);
          expect(rootNode.fields.testFloat32.values[0]).toEqual(1.0);
          expect(rootNode.fields.testFloat32.values[1]).toEqual(2.0);
          expect(rootNode.fields.testFloat64.header.count).toEqual(2);
          expect(rootNode.fields.testFloat64.values[0]).toEqual(1.0);
          expect(rootNode.fields.testFloat64.values[1]).toEqual(2.0);

          expect(rootNode.fields.testString.header.count).toEqual(2);
          expect(
            rootNode.fields.testString.header.attributeValuesByteCount
          ).toEqual(16);
          expect(rootNode.fields.testString.values[0]).toEqual("abc");
          expect(rootNode.fields.testString.values[1]).toEqual("def");
          done();
        });
    });

    it("load fields rejects invalid uri", function (done) {
      const rootNode = new I3SNode(mockI3SLayerWithNodePages, 0, true);

      rootNode
        .load()
        .then(function () {
          return rootNode.loadFields();
        })
        .then(
          function () {
            done(new Error("Promise should not be resolved for invalid uri"));
          },
          function (reason) {
            // Promise is rejected
            expect(reason.statusCode).toEqual(404);
            done(); // Success
          }
        );
    });

    it("loads geometry from node pages", function (done) {
      const nodeWithMesh = new I3SNode(mockI3SLayerWithNodePages, 1, true);

      spyOn(nodeWithMesh._dataProvider, "_loadBinary").and.returnValue(
        Promise.resolve(new ArrayBuffer())
      );

      nodeWithMesh
        .load()
        .then(function () {
          return nodeWithMesh._loadGeometryData();
        })
        .then(function (result) {
          expect(nodeWithMesh.geometryData.length).toEqual(1);

          expect(nodeWithMesh.geometryData[0].resource.url).toContain(
            "mockProviderUrl/mockLayerUrl/nodes/1/geometries/1"
          );
          expect(
            nodeWithMesh.geometryData[0].resource.queryParameters.testQuery
          ).toEqual("test");

          //Expect geometry 1 to have been picked because geometry 0 didn't have all the required properties
          expect(nodeWithMesh._dataProvider._loadBinary).toHaveBeenCalledWith(
            nodeWithMesh.geometryData[0].resource
          );
          expect(
            nodeWithMesh.geometryData[0]._geometryBufferInfo.index
          ).toEqual(1);
          expect(
            nodeWithMesh.geometryData[0]._geometryDefinitions
          ).toBeDefined();

          //Expect data to match the empty data returned by our spy
          expect(nodeWithMesh.geometryData[0].data).toEqual(new ArrayBuffer());

          done();
        });
    });

    it("loads geometry from url", function (done) {
      const nodeWithMesh = new I3SNode(
        mockI3SLayerWithoutNodePages,
        "mockNodeUrl",
        true
      );

      spyOn(nodeWithMesh._dataProvider, "_loadJson").and.returnValue(
        Promise.resolve(nodeWithContent)
      );
      spyOn(nodeWithMesh._dataProvider, "_loadBinary").and.returnValue(
        Promise.resolve(new ArrayBuffer())
      );

      nodeWithMesh
        .load()
        .then(function () {
          return nodeWithMesh._loadGeometryData();
        })
        .then(function (result) {
          expect(nodeWithMesh.geometryData.length).toEqual(1);

          expect(nodeWithMesh.geometryData[0].resource.url).toContain(
            "mockProviderUrl/mockLayerUrl/mockNodeUrl/mockGeometryDataUrl"
          );
          expect(nodeWithMesh._dataProvider._loadBinary).toHaveBeenCalledWith(
            nodeWithMesh.geometryData[0].resource
          );

          //Expect data to match the empty data returned by our spy
          expect(nodeWithMesh.geometryData[0].data).toEqual(new ArrayBuffer());

          done();
        });
    });

    it("generate geometry from node pages", function (done) {
      const nodeWithTexturedMesh = new I3SNode(
        mockI3SLayerWithNodePages,
        1,
        true
      );

      spyOn(nodeWithTexturedMesh._dataProvider, "_loadBinary").and.returnValue(
        Promise.resolve(new ArrayBuffer())
      );

      nodeWithTexturedMesh
        .load()
        .then(function () {
          return nodeWithTexturedMesh._loadGeometryData();
        })
        .then(function (result) {
          const rawGltf = nodeWithTexturedMesh.geometryData[0]._generateGltf(
            i3sGeometryData.meshData.nodesInScene,
            i3sGeometryData.meshData.nodes,
            i3sGeometryData.meshData.meshes,
            i3sGeometryData.meshData.buffers,
            i3sGeometryData.meshData.bufferViews,
            i3sGeometryData.meshData.accessors
          );

          expect(rawGltf.scene).toEqual(0);
          expect(rawGltf.scenes.length).toEqual(1);

          expect(rawGltf.nodes).toEqual(i3sGeometryData.meshData.nodes);
          expect(rawGltf.meshes).toEqual(i3sGeometryData.meshData.meshes);
          expect(rawGltf.buffers).toEqual(i3sGeometryData.meshData.buffers);
          expect(rawGltf.bufferViews).toEqual(
            i3sGeometryData.meshData.bufferViews
          );
          expect(rawGltf.accessors).toEqual(i3sGeometryData.meshData.accessors);

          expect(rawGltf.textures).toEqual([]);
          expect(rawGltf.samplers).toEqual([]);
          expect(rawGltf.images).toEqual([]);

          done();
        });
    });

    it("generate textured geometry from node pages", function (done) {
      const nodeWithTexturedMesh = new I3SNode(
        mockI3SLayerWithNodePages,
        2,
        true
      );

      spyOn(nodeWithTexturedMesh._dataProvider, "_loadBinary").and.returnValue(
        Promise.resolve(new ArrayBuffer())
      );

      nodeWithTexturedMesh
        .load()
        .then(function () {
          return nodeWithTexturedMesh._loadGeometryData();
        })
        .then(function (result) {
          const rawGltf = nodeWithTexturedMesh.geometryData[0]._generateGltf(
            i3sGeometryData.meshData.nodesInScene,
            i3sGeometryData.meshData.nodes,
            i3sGeometryData.meshData.meshes,
            i3sGeometryData.meshData.buffers,
            i3sGeometryData.meshData.bufferViews,
            i3sGeometryData.meshData.accessors
          );

          expect(rawGltf.textures).toBeDefined();
          expect(rawGltf.textures.length).toEqual(1);
          expect(rawGltf.textures[0].sampler).toEqual(0);
          expect(rawGltf.textures[0].source).toEqual(0);

          expect(rawGltf.samplers).toBeDefined();
          expect(rawGltf.samplers.length).toEqual(1);

          expect(rawGltf.images).toBeDefined();
          expect(rawGltf.images.length).toEqual(1);
          expect(rawGltf.images[0].uri).toContain(
            "mockProviderUrl/mockLayerUrl/nodes/2/textures/1?testQuery=test"
          );

          done();
        });
    });

    it("generate textured geometry from url", function (done) {
      const nodeWithTexturedMesh = new I3SNode(
        mockI3SLayerWithoutNodePages,
        "mockNodeUrl",
        true
      );

      spyOn(nodeWithTexturedMesh._dataProvider, "_loadJson").and.returnValue(
        Promise.resolve(nodeWithTexturedContent)
      );
      spyOn(nodeWithTexturedMesh._dataProvider, "_loadBinary").and.returnValue(
        Promise.resolve(new ArrayBuffer())
      );

      nodeWithTexturedMesh
        .load()
        .then(function () {
          return nodeWithTexturedMesh._loadGeometryData();
        })
        .then(function (result) {
          const rawGltf = nodeWithTexturedMesh.geometryData[0]._generateGltf(
            i3sGeometryData.meshData.nodesInScene,
            i3sGeometryData.meshData.nodes,
            i3sGeometryData.meshData.meshes,
            i3sGeometryData.meshData.buffers,
            i3sGeometryData.meshData.bufferViews,
            i3sGeometryData.meshData.accessors
          );

          expect(rawGltf.textures).toBeDefined();
          expect(rawGltf.textures.length).toEqual(1);
          expect(rawGltf.textures[0].sampler).toEqual(0);
          expect(rawGltf.textures[0].source).toEqual(0);

          expect(rawGltf.samplers).toBeDefined();
          expect(rawGltf.samplers.length).toEqual(1);

          expect(rawGltf.images).toBeDefined();
          expect(rawGltf.images.length).toEqual(1);
          expect(rawGltf.images[0].uri).toContain(
            "mockProviderUrl/mockLayerUrl/mockNodeUrl/mockTextureDataUrl"
          );

          done();
        });
    });

    it("load geometry rejects invalid url", function (done) {
      const nodeWithMesh = new I3SNode(mockI3SLayerWithNodePages, 1, true);

      nodeWithMesh
        .load()
        .then(function () {
          return nodeWithMesh._loadGeometryData();
        })
        .then(
          function () {
            done(new Error("Promise should not be resolved for invalid uri"));
          },
          function (reason) {
            // Promise is rejected
            expect(reason.statusCode).toEqual(404);
            done(); // Success
          }
        );
    });

    it("loads feature data from uri", function (done) {
      const nodeWithMesh = new I3SNode(
        mockI3SLayerWithoutNodePages,
        "mockNodeUrl",
        true
      );

      spyOn(nodeWithMesh._dataProvider, "_loadJson").and.callFake(function (
        resource
      ) {
        if (
          resource
            .getUrlComponent()
            .endsWith(
              "mockProviderUrl/mockLayerUrl/mockNodeUrl/mockFeatureDataUrl"
            )
        ) {
          return Promise.resolve({ featureData: [], geometryData: [] });
        }
        if (
          resource
            .getUrlComponent()
            .endsWith("mockProviderUrl/mockLayerUrl/mockNodeUrl/")
        ) {
          return Promise.resolve(nodeWithContent);
        }

        return Promise.reject();
      });

      nodeWithMesh
        .load()
        .then(function () {
          return nodeWithMesh._loadFeatureData();
        })
        .then(function (result) {
          expect(nodeWithMesh.featureData.length).toEqual(1);
          expect(nodeWithMesh.featureData[0].resource.url).toContain(
            "mockProviderUrl/mockLayerUrl/mockNodeUrl/mockFeatureDataUrl"
          );
          expect(nodeWithMesh.featureData[0].data.featureData).toEqual([]);
          expect(nodeWithMesh.featureData[0].data.geometryData).toEqual([]);

          expect(nodeWithMesh._dataProvider._loadJson).toHaveBeenCalledWith(
            nodeWithMesh.featureData[0].resource
          );

          done();
        });
    });

    it("loads feature data from node pages", function (done) {
      const nodeWithMesh = new I3SNode(mockI3SLayerWithNodePages, 1, true);

      spyOn(nodeWithMesh._dataProvider, "_loadJson").and.returnValue(
        Promise.resolve({ featureData: [], geometryData: [] })
      );

      nodeWithMesh
        .load()
        .then(function () {
          return nodeWithMesh._loadFeatureData();
        })
        .then(function (result) {
          expect(nodeWithMesh.featureData.length).toEqual(1);
          expect(nodeWithMesh.featureData[0].resource.url).toContain(
            "mockProviderUrl/mockLayerUrl/nodes/1/features/0"
          );
          expect(
            nodeWithMesh.featureData[0].resource.queryParameters.testQuery
          ).toEqual("test");

          expect(nodeWithMesh.featureData[0].data.featureData).toEqual([]);
          expect(nodeWithMesh.featureData[0].data.geometryData).toEqual([]);

          expect(nodeWithMesh._dataProvider._loadJson).toHaveBeenCalledWith(
            nodeWithMesh.featureData[0].resource
          );

          done();
        });
    });

    it("load feature data rejects invalid url", function (done) {
      const nodeWithMesh = new I3SNode(mockI3SLayerWithNodePages, 1, true);

      nodeWithMesh
        .load()
        .then(function () {
          return nodeWithMesh._loadFeatureData();
        })
        .then(
          function () {
            done(new Error("Promise should not be resolved for invalid uri"));
          },
          function (reason) {
            // Promise is rejected
            expect(reason.statusCode).toEqual(404);
            done(); // Success
          }
        );
    });

    it("creates 3d tile content", function (done) {
      const rootNode = new I3SNode(mockI3SLayerWithNodePages, 0, true);
      const nodeWithMesh = new I3SNode(rootNode, 1, false);

      spyOn(nodeWithMesh._dataProvider, "_loadBinary").and.returnValue(
        Promise.resolve(new ArrayBuffer())
      );
      spyOn(nodeWithMesh._dataProvider, "_loadJson").and.returnValue(
        Promise.resolve({ featureData: [], geometryData: [] })
      );

      const mockProcessor = {
        scheduleTask: function (payload, transferrableObjects) {
          //Expect results to match what was returned by our spy
          expect(payload.binaryData).toEqual(new ArrayBuffer());
          expect(payload.featureData).toEqual({
            featureData: [],
            geometryData: [],
          });

          expect(payload.bufferInfo).toEqual(
            mockI3SLayerWithNodePages._geometryDefinitions[0][1]
          );

          expect(payload.cartographicCenter.long).toEqual(-90);
          expect(payload.cartographicCenter.lat).toEqual(45);
          expect(payload.cartographicCenter.alt).toEqual(0);

          expect(
            payload.url.endsWith(
              "mockProviderUrl/mockLayerUrl/nodes/1/geometries/1/?testQuery=test"
            )
          ).toEqual(true);
          return Promise.resolve(i3sGeometryData);
        },
      };
      spyOn(
        nodeWithMesh._dataProvider,
        "_getDecoderTaskProcessor"
      ).and.returnValue(mockProcessor);

      rootNode
        .load()
        .then(function () {
          return nodeWithMesh.load();
        })
        .then(function () {
          return nodeWithMesh._scheduleCreateContentURL();
        })
        .then(function (result) {
          expect(nodeWithMesh._glbURL).toBeDefined();
          expect(nodeWithMesh.tile).toBeDefined();

          //Test fetching the blob url that was created
          return Resource.fetchArrayBuffer(nodeWithMesh._glbURL);
        })
        .then(function (data) {
          expect(data.error).toBeUndefined();

          const magic = new Uint8Array(data, 0, 4);
          const version = new Uint32Array(data, 4, 1);
          const length = new Uint32Array(data, 8, 1);
          const chunkType = new Uint8Array(data, 16, 4);

          expect(magic[0]).toEqual("g".charCodeAt());
          expect(magic[1]).toEqual("l".charCodeAt());
          expect(magic[2]).toEqual("T".charCodeAt());
          expect(magic[3]).toEqual("F".charCodeAt());

          expect(version[0]).toEqual(2);

          expect(length[0]).toEqual(data.byteLength);

          expect(chunkType[0]).toEqual("J".charCodeAt());
          expect(chunkType[1]).toEqual("S".charCodeAt());
          expect(chunkType[2]).toEqual("O".charCodeAt());
          expect(chunkType[3]).toEqual("N".charCodeAt());
          done();
        });
    });

    it("picks closest point in geometry", function (done) {
      const nodeWithMesh = new I3SNode(mockI3SLayerWithNodePages, 1, true);

      spyOn(nodeWithMesh._dataProvider, "_loadBinary").and.returnValue(
        Promise.resolve(new ArrayBuffer())
      );

      nodeWithMesh
        .load()
        .then(function () {
          return nodeWithMesh._loadGeometryData();
        })
        .then(function (result) {
          //Set mock customAttributes
          const geometryData = nodeWithMesh.geometryData[0];
          geometryData.customAttributes = customAttributes;

          expect(
            geometryData.getClosestPointIndexOnTriangle(
              intersectPoint.x,
              intersectPoint.y,
              intersectPoint.z
            ).index
          ).toEqual(0);
          expect(
            geometryData.getClosestPointIndexOnTriangle(
              borderPoint.x,
              borderPoint.y,
              borderPoint.z
            ).index
          ).toEqual(11);
          expect(
            geometryData.getClosestPointIndexOnTriangle(
              floatingIntersectPoint.x,
              floatingIntersectPoint.y,
              floatingIntersectPoint.z
            ).index
          ).toEqual(8);
          expect(
            geometryData.getClosestPointIndexOnTriangle(
              noIntersectPoint.x,
              noIntersectPoint.y,
              noIntersectPoint.z
            ).index
          ).toEqual(-1);

          done();
        });
    });

    it("picks closest point in indexed geometry", function (done) {
      const nodeWithMesh = new I3SNode(mockI3SLayerWithNodePages, 1, true);

      spyOn(nodeWithMesh._dataProvider, "_loadBinary").and.returnValue(
        Promise.resolve(new ArrayBuffer())
      );

      nodeWithMesh
        .load()
        .then(function () {
          return nodeWithMesh._loadGeometryData();
        })
        .then(function (result) {
          //Set mock customAttributes
          const geometryData = nodeWithMesh.geometryData[0];
          geometryData.customAttributes = customAttributesIndexed;

          expect(
            geometryData.getClosestPointIndexOnTriangle(
              intersectPoint.x,
              intersectPoint.y,
              intersectPoint.z
            ).index
          ).toEqual(0);
          expect(
            geometryData.getClosestPointIndexOnTriangle(
              borderPoint.x,
              borderPoint.y,
              borderPoint.z
            ).index
          ).toEqual(4);
          expect(
            geometryData.getClosestPointIndexOnTriangle(
              floatingIntersectPoint.x,
              floatingIntersectPoint.y,
              floatingIntersectPoint.z
            ).index
          ).toEqual(5);
          expect(
            geometryData.getClosestPointIndexOnTriangle(
              noIntersectPoint.x,
              noIntersectPoint.y,
              noIntersectPoint.z
            ).index
          ).toEqual(-1);

          done();
        });
    });

    it("requests content", function (done) {
      const rootNode = new I3SNode(mockI3SLayerWithNodePages, 0, true);
      const childNode = new I3SNode(rootNode, 1, false);

      rootNode
        .load()
        .then(function () {
          return childNode.load();
        })
        .then(function (result) {
          spyOn(childNode, "_scheduleCreateContentURL").and.callFake(
            function () {
              childNode._glbURL = "mockGlbUrl";
              return Promise.resolve();
            }
          );
          spyOn(childNode.tile, "_hookedRequestContent").and.callFake(
            function () {
              childNode.tile._contentReadyToProcessPromise = Promise.resolve();
              childNode.tile._contentReadyPromise = Promise.resolve();
            }
          );

          childNode.tile._contentResource = { _url: "mockOriginalContentUrl" };
          childNode.tile.requestContent();
          return Promise.all([
            childNode.tile._contentReadyToProcessPromise,
            childNode.tile._contentReadyPromise,
          ]);
        })
        .then(function () {
          expect(childNode.tile._contentResource._url).toEqual("mockGlbUrl");
          done();
        });
    });
  },
  "WebGL"
);
