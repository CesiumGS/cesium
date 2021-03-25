import {
  BufferCacheResource,
  CacheResourceState,
  Resource,
  ResourceCacheKey,
  when,
} from "../../Source/Cesium.js";

describe("Scene/BufferCacheResource", function () {
  var buffer = new Uint8Array([1, 3, 7, 15, 31, 63, 127, 255]);
  var resource = new Resource({ url: "https://example.com/buffer.bin" });
  var parentResource = new Resource({ url: "https://example.com/model.glb" });

  it("throws for undefined cacheKey", function () {
    expect(function () {
      return new BufferCacheResource({
        typedArray: buffer,
      });
    }).toThrowDeveloperError();
  });

  it("throws if neither options.resource nor options.typedArray are defined", function () {
    expect(function () {
      return new BufferCacheResource({});
    }).toThrowDeveloperError();
  });

  it("throws if both options.resource and options.typedArray are defined", function () {
    expect(function () {
      return new BufferCacheResource({
        resource: resource,
        typedArray: buffer,
      });
    }).toThrowDeveloperError();
  });

  it("rejects promise if buffer cannot be fetched", function () {
    var cacheKey = ResourceCacheKey.getExternalBufferCacheKey({
      resource: resource,
    });

    var cacheResource = new BufferCacheResource({
      resource: resource,
      cacheKey: cacheKey,
    });

    var error = new Error("404 Not Found");
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.reject(error)
    );
    cacheResource.load();

    return cacheResource.promise
      .then(function (cacheResource) {
        fail();
      })
      .otherwise(function (error) {
        expect(error).toEqual(error);
      });
  });

  it("loads buffer from typed array", function () {
    var cacheKey = ResourceCacheKey.getEmbeddedBufferCacheKey({
      parentResource: parentResource,
      bufferId: 0,
    });

    var cacheResource = new BufferCacheResource({
      typedArray: buffer,
      cacheKey: cacheKey,
    });
    cacheResource.load();

    expect(cacheResource.cacheKey).toBe(cacheKey);

    return cacheResource.promise.then(function (cacheResource) {
      var array = cacheResource.typedArray;
      expect(array).toEqual(buffer);
    });
  });

  it("loads external buffer", function () {
    var cacheKey = ResourceCacheKey.getExternalBufferCacheKey({
      resource: resource,
    });
    var cacheResource = new BufferCacheResource({
      resource: resource,
      cacheKey: cacheKey,
    });

    expect(cacheResource.cacheKey).toBe(cacheKey);

    var fetchBuffer = spyOn(
      Resource.prototype,
      "fetchArrayBuffer"
    ).and.returnValue(when.resolve(buffer));
    cacheResource.load();

    return cacheResource.promise.then(function (cacheResource) {
      expect(fetchBuffer).toHaveBeenCalled();

      var array = cacheResource.typedArray;
      expect(array).toEqual(buffer);
    });
  });

  it("unloads buffer", function () {
    var cacheKey = ResourceCacheKey.getExternalBufferCacheKey({
      resource: resource,
    });
    var cacheResource = new BufferCacheResource({
      resource: resource,
      cacheKey: cacheKey,
    });

    expect(cacheResource.typedArray).not.toBeDefined();

    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(buffer)
    );
    cacheResource.load();

    return cacheResource.promise.then(function (cacheResource) {
      expect(cacheResource.typedArray).toEqual(buffer);

      cacheResource.unload();
      expect(cacheResource.typedArray).not.toBeDefined();
    });
  });

  it("handles unload before load finishes", function () {
    var cacheKey = ResourceCacheKey.getExternalBufferCacheKey({
      resource: resource,
    });
    var cacheResource = new BufferCacheResource({
      resource: resource,
      cacheKey: cacheKey,
    });

    expect(cacheResource.typedArray).not.toBeDefined();

    var deferred = when.defer();
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(deferred);

    cacheResource.load();
    cacheResource.unload();
    deferred.resolve(buffer);

    expect(cacheResource.typedArray).not.toBeDefined();
    expect(cacheResource._state).toBe(CacheResourceState.UNLOADED);
  });
});
