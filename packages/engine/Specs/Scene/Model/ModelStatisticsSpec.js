import {
  AssociativeArray,
  BatchTexture,
  ModelStatistics,
} from "../../../index.js";

describe("Scene/Model/ModelStatistics", function () {
  const emptyMap = new AssociativeArray();
  it("constructs", function () {
    const statistics = new ModelStatistics();
    expect(statistics.pointsLength).toBe(0);
    expect(statistics.trianglesLength).toBe(0);
    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics.propertyTablesByteLength).toBe(0);
    expect(statistics.batchTexturesByteLength).toBe(0);
    expect(statistics._bufferIdSet).toEqual({});
    expect(statistics._textureIdSet).toEqual({});
    expect(statistics._batchTextureIdMap).toEqual(emptyMap);
  });

  it("clears", function () {
    const statistics = new ModelStatistics();
    statistics.pointsLength = 10;
    statistics.trianglesLength = 10;
    statistics.geometryByteLength = 10;
    statistics.texturesByteLength = 10;
    statistics.propertyTablesByteLength = 10;
    statistics._bufferIdSet = { uuid1: true, uuid2: true };
    statistics._textureIdSet = { uuid3: true };

    const map = new AssociativeArray();
    map.set("uuid", {});
    statistics._batchTextureIdMap = map;
    statistics.clear();

    expect(statistics.pointsLength).toBe(0);
    expect(statistics.trianglesLength).toBe(0);
    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics.propertyTablesByteLength).toBe(0);
    expect(statistics.batchTexturesByteLength).toBe(0);
    expect(statistics._bufferIdSet).toEqual({});
    expect(statistics._textureIdSet).toEqual({});
    expect(statistics._batchTextureIdMap).toEqual(emptyMap);
  });

  it("addBuffer throws without buffer", function () {
    const statistics = new ModelStatistics();

    expect(function () {
      return statistics.addBuffer(undefined, false);
    }).toThrowDeveloperError();
  });

  it("addBuffer throws without hasCpuCopy", function () {
    const statistics = new ModelStatistics();

    expect(function () {
      return statistics.addBuffer({}, undefined);
    }).toThrowDeveloperError();
  });

  it("addBuffer counts GPU buffers", function () {
    const statistics = new ModelStatistics();

    const buffer = {
      _id: "uuid",
      sizeInBytes: 10,
    };

    statistics.addBuffer(buffer, false);

    expect(statistics.pointsLength).toBe(0);
    expect(statistics.trianglesLength).toBe(0);
    expect(statistics.geometryByteLength).toBe(10);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics.propertyTablesByteLength).toBe(0);
    expect(statistics.batchTexturesByteLength).toBe(0);
    expect(statistics._bufferIdSet).toEqual({ uuid: true });
    expect(statistics._textureIdSet).toEqual({});
    expect(statistics._batchTextureIdMap).toEqual(emptyMap);
  });

  it("addBuffer counts GPU buffers with CPU copy", function () {
    const statistics = new ModelStatistics();

    const buffer = {
      _id: "uuid",
      sizeInBytes: 10,
    };

    statistics.addBuffer(buffer, true);

    expect(statistics.pointsLength).toBe(0);
    expect(statistics.trianglesLength).toBe(0);
    expect(statistics.geometryByteLength).toBe(20);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics.propertyTablesByteLength).toBe(0);
    expect(statistics.batchTexturesByteLength).toBe(0);
    expect(statistics._bufferIdSet).toEqual({ uuid: true });
    expect(statistics._textureIdSet).toEqual({});
    expect(statistics._batchTextureIdMap).toEqual(emptyMap);
  });

  it("addBuffer de-duplicates buffers", function () {
    const statistics = new ModelStatistics();

    const buffer = {
      _id: "uuid1",
      sizeInBytes: 2,
    };

    const buffer2 = {
      _id: "uuid2",
      sizeInBytes: 3,
    };

    statistics.addBuffer(buffer, false);
    statistics.addBuffer(buffer, false);
    statistics.addBuffer(buffer2, false);

    expect(statistics.pointsLength).toBe(0);
    expect(statistics.trianglesLength).toBe(0);

    // 2 + 3 = 5. If there was no de-duplication, it would be 2 * 2 + 3 = 7.
    expect(statistics.geometryByteLength).toBe(5);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics.propertyTablesByteLength).toBe(0);
    expect(statistics.batchTexturesByteLength).toBe(0);
    expect(statistics._bufferIdSet).toEqual({ uuid1: true, uuid2: true });
    expect(statistics._textureIdSet).toEqual({});
    expect(statistics._batchTextureIdMap).toEqual(emptyMap);
  });

  it("addTexture throws without texture", function () {
    const statistics = new ModelStatistics();

    expect(function () {
      return statistics.addTexture(undefined);
    }).toThrowDeveloperError();
  });

  it("addTexture counts textures", function () {
    const statistics = new ModelStatistics();

    const texture = {
      _id: "uuid",
      sizeInBytes: 10,
    };

    statistics.addTexture(texture);

    expect(statistics.pointsLength).toBe(0);
    expect(statistics.trianglesLength).toBe(0);
    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(10);
    expect(statistics.propertyTablesByteLength).toBe(0);
    expect(statistics.batchTexturesByteLength).toBe(0);
    expect(statistics._bufferIdSet).toEqual({});
    expect(statistics._textureIdSet).toEqual({ uuid: true });
    expect(statistics._batchTextureIdMap).toEqual(emptyMap);
  });

  it("addTexture de-duplicates textures", function () {
    const statistics = new ModelStatistics();

    const texture = {
      _id: "uuid1",
      sizeInBytes: 2,
    };

    const texture2 = {
      _id: "uuid2",
      sizeInBytes: 3,
    };

    statistics.addTexture(texture);
    statistics.addTexture(texture);
    statistics.addTexture(texture2);

    expect(statistics.pointsLength).toBe(0);
    expect(statistics.trianglesLength).toBe(0);

    // 2 + 3 = 5. If there was no de-duplication, it would be 2 * 2 + 3 = 7.
    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(5);
    expect(statistics.propertyTablesByteLength).toBe(0);
    expect(statistics.batchTexturesByteLength).toBe(0);
    expect(statistics._bufferIdSet).toEqual({});
    expect(statistics._textureIdSet).toEqual({ uuid1: true, uuid2: true });
    expect(statistics._batchTextureIdMap).toEqual(emptyMap);
  });

  it("addBatchTexture throws without batch texture", function () {
    const statistics = new ModelStatistics();

    expect(function () {
      return statistics.addBatchTexture(undefined);
    }).toThrowDeveloperError();
  });

  it("addBatchTexture counts batch textures as they load", function () {
    const statistics = new ModelStatistics();

    const batchTexture = new BatchTexture({
      featuresLength: 10,
      owner: {},
    });

    statistics.addBatchTexture(batchTexture);
    const expectedMap = new AssociativeArray();
    expectedMap.set(batchTexture._id, batchTexture);

    expect(statistics.pointsLength).toBe(0);
    expect(statistics.trianglesLength).toBe(0);
    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics.propertyTablesByteLength).toBe(0);
    expect(statistics.batchTexturesByteLength).toBe(0);
    expect(statistics._bufferIdSet).toEqual({});
    expect(statistics._textureIdSet).toEqual({});
    expect(statistics._batchTextureIdMap).toEqual(expectedMap);

    // Simulate creating a batch texture
    batchTexture._batchTexture = {
      sizeInBytes: 10,
    };

    expect(statistics.batchTexturesByteLength).toBe(10);

    // Simulate creating a pick texture
    batchTexture._pickTexture = {
      sizeInBytes: 15,
    };

    expect(statistics.batchTexturesByteLength).toBe(25);
  });

  it("addBatchTexture de-duplicates batch textures", function () {
    const statistics = new ModelStatistics();

    const batchTexture = new BatchTexture({
      featuresLength: 10,
      owner: {},
    });

    const batchTexture2 = new BatchTexture({
      featuresLength: 15,
      owner: {},
    });

    statistics.addBatchTexture(batchTexture);
    statistics.addBatchTexture(batchTexture2);
    statistics.addBatchTexture(batchTexture);

    const expectedMap = new AssociativeArray();
    expectedMap.set(batchTexture._id, batchTexture);
    expectedMap.set(batchTexture2._id, batchTexture2);

    expect(statistics.pointsLength).toBe(0);
    expect(statistics.trianglesLength).toBe(0);
    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics.propertyTablesByteLength).toBe(0);
    expect(statistics.batchTexturesByteLength).toBe(0);
    expect(statistics._bufferIdSet).toEqual({});
    expect(statistics._textureIdSet).toEqual({});
    expect(statistics._batchTextureIdMap).toEqual(expectedMap);

    // Simulate creating first batch texture
    batchTexture._batchTexture = {
      sizeInBytes: 10,
    };
    batchTexture._pickTexture = {
      sizeInBytes: 20,
    };

    expect(statistics.batchTexturesByteLength).toBe(30);

    // Simulate creating second pick texture
    batchTexture2._batchTexture = {
      sizeInBytes: 25,
    };
    batchTexture2._pickTexture = {
      sizeInBytes: 45,
    };

    expect(statistics.batchTexturesByteLength).toBe(100);
  });
});
