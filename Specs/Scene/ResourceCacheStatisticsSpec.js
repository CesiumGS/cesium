import { combine, ResourceCacheStatistics } from "../../Source/Cesium.js";

describe("Scene/ResourceCacheStatistics", function () {
  it("constructs", function () {
    const statistics = new ResourceCacheStatistics();
    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics._geometrySizes).toEqual({});
    expect(statistics._textureSizes).toEqual({});
  });

  function mockLoader(cacheKey, shouldResolve, data) {
    const loader = combine(data, {
      cacheKey: cacheKey,
    });

    if (shouldResolve) {
      loader.promise = Promise.resolve(loader);
    } else {
      loader.promise = Promise.reject();
    }

    return loader;
  }

  function mockCanceledLoader(cacheKey, data) {
    const loader = combine(data, {
      cacheKey: cacheKey,
    });

    loader.promise = new Promise(function (resolve) {
      // Deferred so the unit test can decide when the cancellation happens
      // via loader.cancel();
      loader.cancel = resolve;
    });

    return loader;
  }

  it("clears", function () {
    const statistics = new ResourceCacheStatistics();

    const geometryLoader = mockLoader("vertices", true, {
      buffer: {
        sizeInBytes: 100,
      },
    });

    const textureLoader = mockLoader("texture", true, {
      texture: {
        sizeInBytes: 300,
      },
    });

    const geometryPromise = statistics.addGeometryLoader(geometryLoader);
    const texturePromise = statistics.addTextureLoader(textureLoader);

    return Promise.all([geometryPromise, texturePromise]).then(function () {
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
  });

  it("addGeometryLoader throws for undefined loader", function () {
    const statistics = new ResourceCacheStatistics();
    expect(function () {
      return statistics.addGeometryLoader(undefined);
    }).toThrowDeveloperError();
  });

  it("addGeometryLoader counts geometry memory", function () {
    const statistics = new ResourceCacheStatistics();

    const geometryLoader = mockLoader("vertices", true, {
      buffer: {
        sizeInBytes: 100,
      },
    });

    return statistics.addGeometryLoader(geometryLoader).then(function () {
      expect(statistics.geometryByteLength).toBe(100);
      expect(statistics.texturesByteLength).toBe(0);
      expect(statistics._geometrySizes).toEqual({ vertices: 100 });
      expect(statistics._textureSizes).toEqual({});
    });
  });

  it("addGeometryLoader counts buffers with typed arrays", function () {
    const statistics = new ResourceCacheStatistics();

    const geometryLoader = mockLoader("vertices", true, {
      buffer: {
        sizeInBytes: 100,
      },
      typedArray: new Uint8Array(100),
    });

    return statistics.addGeometryLoader(geometryLoader).then(function () {
      expect(statistics.geometryByteLength).toBe(200);
      expect(statistics.texturesByteLength).toBe(0);
      expect(statistics._geometrySizes).toEqual({ vertices: 200 });
      expect(statistics._textureSizes).toEqual({});
    });
  });

  it("addGeometryLoader does not double count memory", function () {
    const statistics = new ResourceCacheStatistics();

    const geometryLoader = mockLoader("vertices", true, {
      buffer: {
        sizeInBytes: 100,
      },
      typedArray: new Uint8Array(100),
    });

    const promise = statistics.addGeometryLoader(geometryLoader);
    const promise2 = statistics.addGeometryLoader(geometryLoader);

    return Promise.all([promise, promise2]).then(function () {
      expect(statistics.geometryByteLength).toBe(200);
      expect(statistics.texturesByteLength).toBe(0);
      expect(statistics._geometrySizes).toEqual({ vertices: 200 });
      expect(statistics._textureSizes).toEqual({});
    });
  });

  it("addGeometryLoader handles failed buffer load", function () {
    const statistics = new ResourceCacheStatistics();

    const geometryLoader = mockLoader("vertices", false, {
      buffer: {
        sizeInBytes: 100,
      },
    });

    return statistics.addGeometryLoader(geometryLoader).then(function () {
      expect(statistics.geometryByteLength).toBe(0);
      expect(statistics.texturesByteLength).toBe(0);
      expect(statistics._geometrySizes).toEqual({});
      expect(statistics._textureSizes).toEqual({});
    });
  });

  it("addGeometryLoader handles canceled buffer load", function () {
    const statistics = new ResourceCacheStatistics();

    const geometryLoader = mockCanceledLoader("vertices", {
      buffer: {
        sizeInBytes: 100,
      },
    });

    const promise = statistics.addGeometryLoader(geometryLoader);

    expect(statistics.geometryByteLength).toBe(0);
    expect(statistics._geometrySizes).toEqual({ vertices: 0 });

    // simulate removing the loader before the promise resolves
    statistics.removeLoader(geometryLoader);
    geometryLoader.cancel();

    return promise.then(function () {
      expect(statistics.geometryByteLength).toBe(0);
      expect(statistics.texturesByteLength).toBe(0);
      expect(statistics._geometrySizes).toEqual({});
      expect(statistics._textureSizes).toEqual({});
    });
  });

  it("addTextureLoader throws for undefined loader", function () {
    const statistics = new ResourceCacheStatistics();
    expect(function () {
      return statistics.addTextureLoader(undefined);
    }).toThrowDeveloperError();
  });

  it("addTextureLoader counts texture memory", function () {
    const statistics = new ResourceCacheStatistics();

    const textureLoader = mockLoader("texture", true, {
      texture: {
        sizeInBytes: 100,
      },
    });

    return statistics.addTextureLoader(textureLoader).then(function () {
      expect(statistics.geometryByteLength).toBe(0);
      expect(statistics.texturesByteLength).toBe(100);
      expect(statistics._geometrySizes).toEqual({});
      expect(statistics._textureSizes).toEqual({ texture: 100 });
    });
  });

  it("addTextureLoader handles failed texture load", function () {
    const statistics = new ResourceCacheStatistics();

    const textureLoader = mockLoader("texture", false, {
      texture: {
        sizeInBytes: 100,
      },
    });

    return statistics.addTextureLoader(textureLoader).then(function () {
      expect(statistics.geometryByteLength).toBe(0);
      expect(statistics.texturesByteLength).toBe(0);
      expect(statistics._geometrySizes).toEqual({});
      expect(statistics._textureSizes).toEqual({});
    });
  });

  it("addTextureLoader handles canceled texture load", function () {
    const statistics = new ResourceCacheStatistics();

    const textureLoader = mockCanceledLoader("texture", {
      texture: {
        sizeInBytes: 100,
      },
    });

    const promise = statistics.addTextureLoader(textureLoader);

    expect(statistics.texturesByteLength).toBe(0);
    expect(statistics._textureSizes).toEqual({ texture: 0 });

    // simulate removing the loader before the promise resolves
    statistics.removeLoader(textureLoader);
    textureLoader.cancel();

    return promise.then(function () {
      expect(statistics.geometryByteLength).toBe(0);
      expect(statistics.texturesByteLength).toBe(0);
      expect(statistics._geometrySizes).toEqual({});
      expect(statistics._textureSizes).toEqual({});
    });
  });

  it("addTextureLoader does not double count memory", function () {
    const statistics = new ResourceCacheStatistics();

    const textureLoader = mockLoader("texture", true, {
      texture: {
        sizeInBytes: 100,
      },
    });

    const promise = statistics.addTextureLoader(textureLoader);
    const promise2 = statistics.addTextureLoader(textureLoader);
    return Promise.all([promise, promise2]).then(function () {
      expect(statistics.geometryByteLength).toBe(0);
      expect(statistics.texturesByteLength).toBe(100);
      expect(statistics._geometrySizes).toEqual({});
      expect(statistics._textureSizes).toEqual({ texture: 100 });
    });
  });

  it("removeLoader throws for undefined loader", function () {
    const statistics = new ResourceCacheStatistics();
    expect(function () {
      return statistics.removeLoader(undefined);
    }).toThrowDeveloperError();
  });

  it("removeLoader correctly updates memory for buffers", function () {
    const geometryLoader = mockLoader("vertices", true, {
      buffer: {
        sizeInBytes: 100,
      },
    });

    const geometryLoader2 = mockLoader("indices", true, {
      buffer: {
        sizeInBytes: 200,
      },
    });

    const textureLoader = mockLoader("texture", true, {
      texture: {
        sizeInBytes: 300,
      },
    });

    const statistics = new ResourceCacheStatistics();

    const geometryPromise = statistics.addGeometryLoader(geometryLoader);
    const geometryPromise2 = statistics.addGeometryLoader(geometryLoader2);
    const texturePromise = statistics.addTextureLoader(textureLoader);

    return Promise.all([
      geometryPromise,
      geometryPromise2,
      texturePromise,
    ]).then(function () {
      expect(statistics.geometryByteLength).toBe(300);
      expect(statistics.texturesByteLength).toBe(300);
      expect(statistics._geometrySizes).toEqual({
        vertices: 100,
        indices: 200,
      });
      expect(statistics._textureSizes).toEqual({ texture: 300 });

      statistics.removeLoader(geometryLoader2);

      expect(statistics.geometryByteLength).toBe(100);
      expect(statistics.texturesByteLength).toBe(300);
      expect(statistics._geometrySizes).toEqual({ vertices: 100 });
      expect(statistics._textureSizes).toEqual({ texture: 300 });
    });
  });

  it("removeLoader correctly updates memory for textures", function () {
    const geometryLoader = mockLoader("vertices", true, {
      buffer: {
        sizeInBytes: 100,
      },
    });

    const textureLoader = mockLoader("texture", true, {
      texture: {
        sizeInBytes: 300,
      },
    });

    const textureLoader2 = mockLoader("texture2", true, {
      texture: {
        sizeInBytes: 500,
      },
    });

    const statistics = new ResourceCacheStatistics();

    const geometryPromise = statistics.addGeometryLoader(geometryLoader);
    const texturePromise = statistics.addTextureLoader(textureLoader);
    const texturePromise2 = statistics.addTextureLoader(textureLoader2);

    return Promise.all([geometryPromise, texturePromise, texturePromise2]).then(
      function () {
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
      }
    );
  });

  it("removeLoader gracefully handles loader without tracked resources", function () {
    const statistics = new ResourceCacheStatistics();
    const textureLoader = mockLoader("texture", true, {
      texture: {
        sizeInBytes: 300,
      },
    });

    expect(function () {
      return statistics.removeLoader(textureLoader);
    }).not.toThrowDeveloperError();
  });
});
