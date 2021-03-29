import {
  MetadataSchemaLoader,
  Resource,
  ResourceCache,
  ResourceCacheKey,
  when,
} from "../../Source/Cesium.js";

describe("ResourceCache", function () {
  var schemaResource = new Resource({ url: "https://example.com/schema.json" });
  var schemaJson = {};

  var bufferTypedArray = new Uint8Array([1, 3, 7, 15, 31, 63, 127, 255]);
  var bufferArrayBuffer = bufferTypedArray.buffer;
  var bufferParentResource = new Resource({
    url: "https://example.com/model.glb",
  });
  var bufferId = 0;
  var bufferResource = new Resource({ url: "https://example.com/buffer.bin" });

  beforeEach(function () {
    ResourceCache.clearForSpecs();
  });

  it("loads resource", function () {
    var fetchJson = spyOn(Resource.prototype, "fetchJson").and.returnValue(
      when.resolve(schemaJson)
    );

    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });
    var resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
      cacheKey: cacheKey,
    });

    ResourceCache.load({
      resourceLoader: resourceLoader,
    });

    var cacheEntry = ResourceCache.cacheEntries[cacheKey];
    expect(cacheEntry.referenceCount).toBe(1);
    expect(cacheEntry.resourceLoader).toBe(resourceLoader);
    expect(cacheEntry.keepResident).toBe(false);

    return resourceLoader.promise.then(function (resourceLoader) {
      expect(fetchJson).toHaveBeenCalled();

      var schema = resourceLoader.schema;
      expect(schema).toBeDefined();
    });
  });

  it("load throws if resourceLoader is undefined", function () {
    expect(function () {
      ResourceCache.load({});
    }).toThrowDeveloperError();
  });

  it("load throws if resourceLoader cacheKey is undefined", function () {
    var resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
    });

    expect(function () {
      ResourceCache.load({
        resourceLoader: resourceLoader,
      });
    }).toThrowDeveloperError();
  });

  it("load throws if a resource with this cacheKey is already in the cache", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });

    var resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
      cacheKey: cacheKey,
    });

    ResourceCache.load({
      resourceLoader: resourceLoader,
    });

    expect(function () {
      ResourceCache.load({
        resourceLoader: resourceLoader,
      });
    }).toThrowDeveloperError();
  });

  it("unloads resource", function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      when.resolve(schemaJson)
    );

    var destroy = spyOn(
      MetadataSchemaLoader.prototype,
      "destroy"
    ).and.callThrough();

    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });
    var resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
      cacheKey: cacheKey,
    });

    ResourceCache.load({
      resourceLoader: resourceLoader,
    });

    ResourceCache.get(cacheKey);

    var cacheEntry = ResourceCache.cacheEntries[cacheKey];
    expect(cacheEntry.referenceCount).toBe(2);

    ResourceCache.unload(resourceLoader);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(destroy).not.toHaveBeenCalled();

    ResourceCache.unload(resourceLoader);
    expect(cacheEntry.referenceCount).toBe(0);
    expect(destroy).toHaveBeenCalled();
    expect(ResourceCache.cacheEntries[cacheKey]).toBeUndefined();
  });

  it("unload keeps resource in the cache if keepResident is true", function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      when.resolve(schemaJson)
    );

    var destroy = spyOn(
      MetadataSchemaLoader.prototype,
      "destroy"
    ).and.callThrough();

    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });
    var resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
      cacheKey: cacheKey,
    });

    ResourceCache.load({
      resourceLoader: resourceLoader,
      keepResident: true,
    });

    var cacheEntry = ResourceCache.cacheEntries[cacheKey];
    expect(cacheEntry.keepResident).toBe(true);
    expect(cacheEntry.referenceCount).toBe(1);

    ResourceCache.unload(resourceLoader);
    expect(cacheEntry.referenceCount).toBe(0);
    expect(destroy).not.toHaveBeenCalled();
    expect(ResourceCache.cacheEntries[cacheKey]).toBe(cacheEntry);
  });

  it("unload throws if resourceLoader is undefined", function () {
    expect(function () {
      ResourceCache.unload();
    }).toThrowDeveloperError();
  });

  it("unload throws if resourceLoader is not in the cache", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });
    var resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
      cacheKey: cacheKey,
    });

    expect(function () {
      ResourceCache.unload({
        resourceLoader: resourceLoader,
      });
    }).toThrowDeveloperError();
  });

  it("unload throws if resource has no references", function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      when.resolve(schemaJson)
    );

    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });
    var resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
      cacheKey: cacheKey,
    });

    ResourceCache.load({
      resourceLoader: resourceLoader,
      keepResident: true,
    });

    ResourceCache.unload(resourceLoader);

    expect(function () {
      ResourceCache.unload(resourceLoader);
    }).toThrowDeveloperError();
  });

  it("gets resource", function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      when.resolve(schemaJson)
    );

    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });
    var resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
      cacheKey: cacheKey,
    });

    ResourceCache.load({
      resourceLoader: resourceLoader,
    });

    var cacheEntry = ResourceCache.cacheEntries[cacheKey];

    ResourceCache.get(cacheKey);
    expect(cacheEntry.referenceCount).toBe(2);

    ResourceCache.get(cacheKey);
    expect(cacheEntry.referenceCount).toBe(3);
  });

  it("get returns undefined if there is no resource with this cache key", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });

    expect(ResourceCache.get(cacheKey)).toBeUndefined();
  });

  it("loads schema from JSON", function () {
    var expectedCacheKey = ResourceCacheKey.getSchemaCacheKey({
      schema: schemaJson,
    });
    var schemaLoader = ResourceCache.loadSchema({
      schema: schemaJson,
    });
    var cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(schemaLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(cacheEntry.keepResident).toBe(false);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.loadSchema({
        schema: schemaJson,
      })
    ).toBe(schemaLoader);

    expect(cacheEntry.referenceCount).toBe(2);

    return schemaLoader.promise.then(function (schemaLoader) {
      var schema = schemaLoader.schema;
      expect(schema).toBeDefined();
    });
  });

  it("loads external schema", function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      when.resolve(schemaJson)
    );

    var expectedCacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });
    var schemaLoader = ResourceCache.loadSchema({
      resource: schemaResource,
    });
    var cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(schemaLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(cacheEntry.keepResident).toBe(false);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.loadSchema({
        resource: schemaResource,
      })
    ).toBe(schemaLoader);

    expect(cacheEntry.referenceCount).toBe(2);

    return schemaLoader.promise.then(function (schemaLoader) {
      var schema = schemaLoader.schema;
      expect(schema).toBeDefined();
    });
  });

  it("loadSchema throws if neither options.schema nor options.resource are defined", function () {
    expect(function () {
      ResourceCache.loadSchema({});
    }).toThrowDeveloperError();
  });

  it("loadSchema throws if both options.schema and options.resource are defined", function () {
    expect(function () {
      ResourceCache.loadSchema({
        schema: schemaJson,
        resource: schemaResource,
      });
    }).toThrowDeveloperError();
  });

  it("loads embedded buffer", function () {
    var expectedCacheKey = ResourceCacheKey.getEmbeddedBufferCacheKey({
      parentResource: bufferParentResource,
      bufferId: bufferId,
    });
    var bufferLoader = ResourceCache.loadEmbeddedBuffer({
      parentResource: bufferParentResource,
      bufferId: bufferId,
      typedArray: bufferTypedArray,
    });
    var cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(bufferLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(cacheEntry.keepResident).toBe(false);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.loadEmbeddedBuffer({
        parentResource: bufferParentResource,
        bufferId: bufferId,
        typedArray: bufferTypedArray,
      })
    ).toBe(bufferLoader);

    expect(cacheEntry.referenceCount).toBe(2);

    return bufferLoader.promise.then(function (bufferLoader) {
      expect(bufferLoader.typedArray).toBe(bufferTypedArray);
    });
  });

  it("loadEmbeddedBuffer throws if parentResource is undefined", function () {
    expect(function () {
      ResourceCache.loadEmbeddedBuffer({
        bufferId: bufferId,
        typedArray: bufferTypedArray,
      });
    }).toThrowDeveloperError();
  });

  it("loadEmbeddedBuffer throws if bufferId is undefined", function () {
    expect(function () {
      ResourceCache.loadEmbeddedBuffer({
        parentResource: bufferParentResource,
        typedArray: bufferTypedArray,
      });
    }).toThrowDeveloperError();
  });

  it("loadEmbeddedBuffer throws if typedArray is undefined", function () {
    expect(function () {
      ResourceCache.loadEmbeddedBuffer({
        parentResource: bufferParentResource,
        bufferId: bufferId,
      });
    }).toThrowDeveloperError();
  });

  it("loads external buffer", function () {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(bufferArrayBuffer)
    );

    var expectedCacheKey = ResourceCacheKey.getExternalBufferCacheKey({
      resource: bufferResource,
    });
    var bufferLoader = ResourceCache.loadExternalBuffer({
      resource: bufferResource,
    });
    var cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(bufferLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(cacheEntry.keepResident).toBe(false);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.loadExternalBuffer({
        resource: bufferResource,
      })
    ).toBe(bufferLoader);

    expect(cacheEntry.referenceCount).toBe(2);

    return bufferLoader.promise.then(function (bufferLoader) {
      expect(bufferLoader.typedArray.buffer).toBe(bufferArrayBuffer);
    });
  });

  it("loadExternalBuffer throws if resource is undefined", function () {
    expect(function () {
      ResourceCache.loadExternalBuffer({});
    }).toThrowDeveloperError();
  });
});
