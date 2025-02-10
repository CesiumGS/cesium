import {
  Cesium3DTileset,
  I3SDataProvider,
  I3SField,
  I3SNode,
  Resource,
  RuntimeError,
} from "../../index.js";

describe("Scene/I3SField", function () {
  async function createMockProvider(url, layerData, geoidDataList) {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(layerData),
    );
    spyOn(Cesium3DTileset, "fromUrl").and.callFake(async () => {
      const tileset = new Cesium3DTileset();
      tileset._root = {}; // Mock the root tile so that i3s property can be appended
      tileset._isI3STileSet = true;
      return tileset;
    });
    const mockI3SProvider = await I3SDataProvider.fromUrl(url);
    mockI3SProvider._taskProcessorReadyPromise = Promise.resolve();
    mockI3SProvider._geoidDataList = geoidDataList;
    return mockI3SProvider;
  }

  async function createMockLayer(providerUrl, layerData, geoidDataList) {
    const provider = await createMockProvider(
      providerUrl,
      layerData,
      geoidDataList,
    );
    const mockI3SLayer = provider.layers[0];
    mockI3SLayer._geometryDefinitions = [
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

    return mockI3SLayer;
  }

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

  const layerDataWithoutNodePages = {
    href: "mockLayerUrl",
    layerType: "3DObject",
    attributeStorageInfo: attrStorageInfo,
    store: { defaultGeometrySchema: {}, version: "1.6" },
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
    spatialReference: { wkid: 4326 },
  };

  it("create field for root node loaded from uri", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const field = new I3SField(rootNode, { key: "test_key" });
    expect(
      field.resource.url.includes("mockUrl/attributes/test_key/0?"),
    ).toEqual(true);
  });

  it("get field values", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const field = new I3SField(rootNode, {});

    field._values = [1, 2];
    expect(field.values).toEqual([]);
    field._values["objectIds"] = [3, 4];
    expect(field.values).toEqual([3, 4]);
    field._values["attributeValues"] = [5, 6];
    expect(field.values).toEqual([5, 6]);
  });

  it("get body offset for objectIds", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const field = new I3SField(rootNode, {
      objectIds: { valueType: "UInt16" },
    });

    expect(field._getBodyOffset(7)).toEqual(8);
  });

  it("get body offset for unsupported property", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const field = new I3SField(rootNode, {
      property: { valueType: "UInt16" },
    });

    expect(field._getBodyOffset(7)).toEqual(7);
  });

  it("validate field header with invalid attribute buffer size", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const field = new I3SField(rootNode, { header: [{ valueType: "String" }] });
    field["_header"] = { count: 1 };

    expect(function () {
      field._validateHeader({ byteLength: 0 });
    }).toThrowError(RuntimeError);
  });

  it("validate field body with empty header", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const field = new I3SField(rootNode, {});
    field["_header"] = {};

    expect(function () {
      field._validateBody(undefined, undefined);
    }).toThrowError(RuntimeError);
  });

  it("validate field body with invalid attribute buffer", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const field = new I3SField(rootNode, {
      ordering: ["testAttr"],
      testAttr: { valueType: "String" },
    });
    field["_header"] = { count: 1 };

    expect(function () {
      field._validateBody({ byteLength: 5 }, 4);
    }).toThrowError(RuntimeError);
  });

  it("validate field body with invalid offset", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const field = new I3SField(rootNode, { ordering: [] });
    field["_header"] = { count: 1 };

    expect(function () {
      field._validateBody({ byteLength: 3 }, 4);
    }).toThrowError(RuntimeError);
  });

  it("validate field body with missing property", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const field = new I3SField(rootNode, { ordering: ["ObjectIds"] });
    field["_header"] = { count: 0 };

    expect(function () {
      field._validateBody({ byteLength: 5 }, 4);
    }).toThrowError(RuntimeError);
  });

  it("load field with unavailable resource", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    const spy = spyOn(Resource.prototype, "fetchArrayBuffer");
    spy.and.callFake(function () {
      const text = "{404}";
      const buffer = new ArrayBuffer(text.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < text.length; i++) {
        view[i] = text.charCodeAt(i);
      }
      return Promise.resolve(buffer);
    });
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const field = new I3SField(rootNode, { ordering: [] });
    await field.load();
    expect(spy).toHaveBeenCalledTimes(1);
    await field.load();
    expect(spy).toHaveBeenCalledTimes(1);

    expect(field._data).toBeUndefined();
  });

  it("load field with invalid header", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    spyOn(
      mockI3SLayerWithoutNodePages._dataProvider,
      "_loadBinary",
    ).and.callFake(function () {
      return Promise.resolve(new ArrayBuffer(1));
    });
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const field = new I3SField(rootNode, { header: [{ valueType: "UInt16" }] });
    const spy = spyOn(field, "_parseBody");
    await field.load();

    expect(spy).not.toHaveBeenCalled();
    expect(field.header).toBeUndefined();
  });

  it("load field with invalid body", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    spyOn(
      mockI3SLayerWithoutNodePages._dataProvider,
      "_loadBinary",
    ).and.callFake(function () {
      return Promise.resolve(new ArrayBuffer(1));
    });
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const field = new I3SField(rootNode, { header: [] });
    const spy = spyOn(field, "_parseBody");
    await field.load();

    expect(spy).not.toHaveBeenCalled();
    expect(field.header).toBeDefined();
    expect(field._values).toBeUndefined();
  });

  it("load field with valid buffer", async function () {
    const mockI3SLayerWithoutNodePages = await createMockLayer(
      "mockProviderUrl",
      layerDataWithoutNodePages,
    );
    const text = "Pass";
    spyOn(
      mockI3SLayerWithoutNodePages._dataProvider,
      "_loadBinary",
    ).and.callFake(function () {
      const buffer = new ArrayBuffer(text.length + 3);
      const view = new Uint8Array(buffer);
      view[0] = 1; // header count
      view[1] = text.length + 1; // byte count for text
      for (let i = 0; i < text.length; i++) {
        view[i + 2] = text.charCodeAt(i);
      }
      return Promise.resolve(buffer);
    });
    const rootNode = new I3SNode(mockI3SLayerWithoutNodePages, "mockUrl", true);

    const attributeStorageInfo = {
      objectIds: { valueType: "String" },
      attributeByteCounts: { valueType: "UInt8" },
      header: [{ property: "count", valueType: "UInt8" }],
      ordering: ["attributeByteCounts", "ObjectIds", "custom"],
    };
    const field = new I3SField(rootNode, attributeStorageInfo);
    await field.load();

    expect(field.values).toEqual([text]);
  });
});
