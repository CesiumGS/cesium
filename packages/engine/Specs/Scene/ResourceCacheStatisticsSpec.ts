import { combine, ResourceCacheStatistics } from "../../index.js";

describe("Scene/ResourceCacheStatistics", function () {
  it("constructs", function () {
    const statistics = new ResourceCacheStatistics();
    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics._geometrySizes).toEqual({});
    expect(statistics._textureSizes).toEqual({});
  });

  function mockLoader(cacheKey, data) {
    return combine(data, {
      cacheKey: cacheKey,
    });
  }

  it("clears", function () {
    const statistics = new ResourceCacheStatistics();

    const geometryLoader = mockLoader("vertices", {
      buffer: {
        sizeInBytes: 100,
      },
    });

    const textureLoader = mockLoader("texture", {
      texture: {
        sizeInBytes: 300,
      },
    });

    statistics.addGeometryLoader(geometryLoader);
    statistics.addTextureLoader(textureLoader);

    expect(statistics.geometryByteLength).not.toBe(0);
    expect(statistics.texturesByteLength).not.toBe(0);
    expect(statistics._geometrySizes).not.toEqual({});
    expect(statistics._textureSizes).not.toEqual({});

    statistics.clear();

    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics._geometrySizes).toEqual({});
    expect(statistics._textureSizes).toEqual({});
  });

  it("addGeometryLoader throws for undefined loader", function () {
    const statistics = new ResourceCacheStatistics();
    expect(function () {
      statistics.addGeometryLoader(undefined);
    }).toThrowDeveloperError();
  });

  it("addGeometryLoader counts geometry memory", function () {
    const statistics = new ResourceCacheStatistics();

    const geometryLoader = mockLoader("vertices", {
      buffer: {
        sizeInBytes: 100,
      },
    });

    statistics.addGeometryLoader(geometryLoader);
    expect(statistics.geometryByteLength).toBe(100);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics._geometrySizes).toEqual({ vertices: 100 });
    expect(statistics._textureSizes).toEqual({});
  });

  it("addGeometryLoader counts buffers with typed arrays", function () {
    const statistics = new ResourceCacheStatistics();

    const geometryLoader = mockLoader("vertices", {
      buffer: {
        sizeInBytes: 100,
      },
      typedArray: new Uint8Array(100),
    });

    statistics.addGeometryLoader(geometryLoader);
    expect(statistics.geometryByteLength).toBe(200);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics._geometrySizes).toEqual({ vertices: 200 });
    expect(statistics._textureSizes).toEqual({});
  });

  it("addGeometryLoader does not double count memory", function () {
    const statistics = new ResourceCacheStatistics();

    const geometryLoader = mockLoader("vertices", {
      buffer: {
        sizeInBytes: 100,
      },
      typedArray: new Uint8Array(100),
    });

    statistics.addGeometryLoader(geometryLoader);
    statistics.addGeometryLoader(geometryLoader);

    expect(statistics.geometryByteLength).toBe(200);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics._geometrySizes).toEqual({ vertices: 200 });
    expect(statistics._textureSizes).toEqual({});
  });

  it("addTextureLoader throws for undefined loader", function () {
    const statistics = new ResourceCacheStatistics();
    expect(function () {
      statistics.addTextureLoader(undefined);
    }).toThrowDeveloperError();
  });

  it("addTextureLoader counts texture memory", function () {
    const statistics = new ResourceCacheStatistics();

    const textureLoader = mockLoader("texture", {
      texture: {
        sizeInBytes: 100,
      },
    });

    statistics.addTextureLoader(textureLoader);
    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(100);
    expect(statistics._geometrySizes).toEqual({});
    expect(statistics._textureSizes).toEqual({ texture: 100 });
  });

  it("addTextureLoader does not double count memory", function () {
    const statistics = new ResourceCacheStatistics();

    const textureLoader = mockLoader("texture", {
      texture: {
        sizeInBytes: 100,
      },
    });

    statistics.addTextureLoader(textureLoader);
    statistics.addTextureLoader(textureLoader);

    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(100);
    expect(statistics._geometrySizes).toEqual({});
    expect(statistics._textureSizes).toEqual({ texture: 100 });
  });

  it("removeLoader throws for undefined loader", function () {
    const statistics = new ResourceCacheStatistics();
    expect(function () {
      statistics.removeLoader(undefined);
    }).toThrowDeveloperError();
  });

  it("removeLoader correctly updates memory for buffers", function () {
    const geometryLoader = mockLoader("vertices", {
      buffer: {
        sizeInBytes: 100,
      },
    });

    const geometryLoader2 = mockLoader("indices", {
      buffer: {
        sizeInBytes: 200,
      },
    });

    const textureLoader = mockLoader("texture", {
      texture: {
        sizeInBytes: 300,
      },
    });

    const statistics = new ResourceCacheStatistics();

    statistics.addGeometryLoader(geometryLoader);
    statistics.addGeometryLoader(geometryLoader2);
    statistics.addTextureLoader(textureLoader);

    expect(statistics.geometryByteLength).toBe(300);
    expect(statistics.texturesByteLength).toBe(300);
    expect(statistics._geometrySizes).toEqual({
      vertices: 100,
      indices: 200,
    });

    statistics.removeLoader(geometryLoader2);

    expect(statistics.geometryByteLength).toBe(100);
    expect(statistics.texturesByteLength).toBe(300);
    expect(statistics._geometrySizes).toEqual({ vertices: 100 });
    expect(statistics._textureSizes).toEqual({ texture: 300 });
  });

  it("removeLoader correctly updates memory for textures", function () {
    const geometryLoader = mockLoader("vertices", {
      buffer: {
        sizeInBytes: 100,
      },
    });

    const textureLoader = mockLoader("texture", {
      texture: {
        sizeInBytes: 300,
      },
    });

    const textureLoader2 = mockLoader("texture2", {
      texture: {
        sizeInBytes: 500,
      },
    });

    const statistics = new ResourceCacheStatistics();

    statistics.addGeometryLoader(geometryLoader);
    statistics.addTextureLoader(textureLoader);
    statistics.addTextureLoader(textureLoader2);

    expect(statistics.geometryByteLength).toBe(100);
    expect(statistics.texturesByteLength).toBe(800);
    expect(statistics._geometrySizes).toEqual({ vertices: 100 });
    expect(statistics._textureSizes).toEqual({
      texture: 300,
      texture2: 500,
    });

    statistics.removeLoader(textureLoader2);

    expect(statistics.geometryByteLength).toBe(100);
    expect(statistics.texturesByteLength).toBe(300);
    expect(statistics._geometrySizes).toEqual({ vertices: 100 });
    expect(statistics._textureSizes).toEqual({ texture: 300 });
  });

  it("removeLoader gracefully handles loader without tracked resources", function () {
    const statistics = new ResourceCacheStatistics();
    const textureLoader = mockLoader("texture", {
      texture: {
        sizeInBytes: 300,
      },
    });

    expect(function () {
      statistics.removeLoader(textureLoader);
    }).not.toThrowDeveloperError();

    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics._geometrySizes).toEqual({});
    expect(statistics._textureSizes).toEqual({});
  });
});
