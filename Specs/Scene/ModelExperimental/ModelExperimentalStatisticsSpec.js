import { ModelExperimentalStatistics } from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalStatistics", function () {
  it("constructs", function () {
    const statistics = new ModelExperimentalStatistics();
    expect(statistics.pointsLength).toBe(0);
    expect(statistics.trianglesLength).toBe(0);
    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics.propertyTablesByteLength).toBe(0);
    expect(statistics.bufferIdSet).toEqual({});
    expect(statistics.textureIdSet).toEqual({});
  });

  it("clears", function () {
    const statistics = new ModelExperimentalStatistics();
    statistics.pointsLength = 10;
    statistics.trianglesLength = 10;
    statistics.geometryByteLength = 10;
    statistics.texturesByteLength = 10;
    statistics.propertyTablesByteLength = 10;
    statistics.bufferIdSet = { uuid1: true, uuid2: true };
    statistics.textureIdSet = { uuid3: true };

    statistics.clear();

    expect(statistics.pointsLength).toBe(0);
    expect(statistics.trianglesLength).toBe(0);
    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics.propertyTablesByteLength).toBe(0);
    expect(statistics.bufferIdSet).toEqual({});
    expect(statistics.textureIdSet).toEqual({});
  });

  it("addBuffer throws without buffer", function () {
    const statistics = new ModelExperimentalStatistics();

    expect(function () {
      return statistics.addBuffer(undefined, false);
    }).toThrowDeveloperError();
  });

  it("addBuffer throws without hasCpuCopy", function () {
    const statistics = new ModelExperimentalStatistics();

    expect(function () {
      return statistics.addBuffer({}, undefined);
    }).toThrowDeveloperError();
  });

  it("addBuffer counts GPU buffers", function () {
    const statistics = new ModelExperimentalStatistics();

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
    expect(statistics.bufferIdSet).toEqual({ uuid: true });
    expect(statistics.textureIdSet).toEqual({});
  });

  it("addBuffer counts GPU buffers with CPU copy", function () {
    const statistics = new ModelExperimentalStatistics();

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
    expect(statistics.bufferIdSet).toEqual({ uuid: true });
    expect(statistics.textureIdSet).toEqual({});
  });

  it("addBuffer de-duplicates buffers", function () {
    const statistics = new ModelExperimentalStatistics();

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
    expect(statistics.bufferIdSet).toEqual({ uuid1: true, uuid2: true });
    expect(statistics.textureIdSet).toEqual({});
  });

  it("addTexture throws without texture", function () {
    const statistics = new ModelExperimentalStatistics();

    expect(function () {
      return statistics.addTexture(undefined);
    }).toThrowDeveloperError();
  });

  it("addTexture counts textures", function () {
    const statistics = new ModelExperimentalStatistics();

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
    expect(statistics.bufferIdSet).toEqual({});
    expect(statistics.textureIdSet).toEqual({ uuid: true });
  });

  it("addTexture de-duplicates textures", function () {
    const statistics = new ModelExperimentalStatistics();

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
    expect(statistics.bufferIdSet).toEqual({});
    expect(statistics.textureIdSet).toEqual({ uuid1: true, uuid2: true });
  });
});
