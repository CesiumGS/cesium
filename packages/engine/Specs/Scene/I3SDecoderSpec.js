import { I3SDecoder, RuntimeError, TaskProcessor } from "../../index.js";

describe("Scene/I3SDecoder", function () {
  const defaultGeometrySchema = {
    ordering: [],
    featureAttributeOrder: [],
  };

  const binaryData = new ArrayBuffer(8);

  const geometryDataObb = {
    _dataProvider: {},
    _data: binaryData,
    _parent: {
      _data: {
        obb: {
          center: [0, 0, 0],
        },
      },
      _inverseRotationMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
  };

  const geometryDataMbs = {
    _dataProvider: {},
    _data: binaryData,
    _parent: {
      _data: {
        mbs: [0, 0, 0],
      },
      _inverseRotationMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
  };

  const featureData = [
    {
      data: {},
    },
  ];

  beforeEach(function () {
    // Reset the initialized state
    I3SDecoder._promise = undefined;
  });

  it("constructor", function () {
    expect(new I3SDecoder()).toBeDefined();
  });

  it("throws with no url", async function () {
    await expectAsync(I3SDecoder.decode()).toBeRejectedWithDeveloperError();
  });

  it("throws with no default geometry schema", async function () {
    await expectAsync(
      I3SDecoder.decode("mockUrl"),
    ).toBeRejectedWithDeveloperError();
  });

  it("throws with no geometry data", async function () {
    await expectAsync(
      I3SDecoder.decode("mockUrl", defaultGeometrySchema),
    ).toBeRejectedWithDeveloperError();
  });

  it("throws if not initialized", async function () {
    spyOn(TaskProcessor.prototype, "initWebAssemblyModule").and.returnValue(
      Promise.resolve(false),
    );
    await expectAsync(
      I3SDecoder.decode("mockUrl", defaultGeometrySchema, geometryDataObb),
    ).toBeRejectedWithError(RuntimeError);
  });

  it("empty geometry with obb", async function () {
    const result = await I3SDecoder.decode(
      "mockUrl",
      defaultGeometrySchema,
      geometryDataObb,
    );
    expect(result).toBeDefined();
    expect(result.meshData).toBeDefined();
    expect(result.meshData.buffers).toBeDefined();
    expect(result.meshData.buffers.length).toEqual(0);
    expect(result.meshData.bufferViews).toBeDefined();
    expect(result.meshData.bufferViews.length).toEqual(0);
    expect(result.meshData.accessors).toBeDefined();
    expect(result.meshData.accessors.length).toEqual(0);
    expect(result.meshData.meshes).toBeDefined();
    expect(result.meshData.meshes.length).toEqual(0);
    expect(result.meshData.nodes).toBeDefined();
    expect(result.meshData.nodes.length).toEqual(0);
    expect(result.meshData.nodesInScene).toBeDefined();
    expect(result.meshData.nodesInScene.length).toEqual(0);
  });

  it("empty geometry with mbs", async function () {
    const result = await I3SDecoder.decode(
      "mockUrl",
      defaultGeometrySchema,
      geometryDataMbs,
    );
    expect(result).toBeDefined();
    expect(result.meshData).toBeDefined();
    expect(result.meshData.buffers).toBeDefined();
    expect(result.meshData.buffers.length).toEqual(0);
    expect(result.meshData.bufferViews).toBeDefined();
    expect(result.meshData.bufferViews.length).toEqual(0);
    expect(result.meshData.accessors).toBeDefined();
    expect(result.meshData.accessors.length).toEqual(0);
    expect(result.meshData.meshes).toBeDefined();
    expect(result.meshData.meshes.length).toEqual(0);
    expect(result.meshData.nodes).toBeDefined();
    expect(result.meshData.nodes.length).toEqual(0);
    expect(result.meshData.nodesInScene).toBeDefined();
    expect(result.meshData.nodesInScene.length).toEqual(0);
  });

  it("empty geometry with empty feature data", async function () {
    const result = await I3SDecoder.decode(
      "mockUrl",
      defaultGeometrySchema,
      geometryDataMbs,
      featureData,
    );
    expect(result).toBeDefined();
    expect(result.meshData).toBeDefined();
    expect(result.meshData.buffers).toBeDefined();
    expect(result.meshData.buffers.length).toEqual(0);
    expect(result.meshData.bufferViews).toBeDefined();
    expect(result.meshData.bufferViews.length).toEqual(0);
    expect(result.meshData.accessors).toBeDefined();
    expect(result.meshData.accessors.length).toEqual(0);
    expect(result.meshData.meshes).toBeDefined();
    expect(result.meshData.meshes.length).toEqual(0);
    expect(result.meshData.nodes).toBeDefined();
    expect(result.meshData.nodes.length).toEqual(0);
    expect(result.meshData.nodesInScene).toBeDefined();
    expect(result.meshData.nodesInScene.length).toEqual(0);
  });
});
