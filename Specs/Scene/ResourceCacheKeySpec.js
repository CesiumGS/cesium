import { Resource, ResourceCacheKey } from "../../Source/Cesium.js";

describe("ResourceCacheKey", function () {
  var schemaUri = "https://example.com/schema.json";
  var schemaResource = new Resource({ url: schemaUri });

  var parentUri = "https://example.com/parent.gltf";
  var parentResource = new Resource({ url: parentUri });

  var schemaJson = {};

  var bufferUri = "https://example.com/external.bin";
  var bufferResource = new Resource({ url: bufferUri });
  var bufferId = 0;

  it("getSchemaCacheKey works for external schemas", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });

    expect(cacheKey).toBe(schemaUri);
  });

  it("getSchemaCacheKey works for JSON schemas", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      schema: schemaJson,
    });

    expect(cacheKey).toEqual(JSON.stringify(schemaJson));
  });

  it("getSchemaCacheKey throws if neither options.schema nor options.resource are defined", function () {
    expect(function () {
      ResourceCacheKey.getSchemaCacheKey({});
    }).toThrowDeveloperError();
  });

  it("getSchemaCacheKey throws if both options.schema and options.resource are defined", function () {
    expect(function () {
      ResourceCacheKey.getSchemaCacheKey({
        schema: schemaJson,
        resource: schemaResource,
      });
    }).toThrowDeveloperError();
  });

  it("getExternalBufferCacheKey works", function () {
    var cacheKey = ResourceCacheKey.getExternalBufferCacheKey({
      resource: bufferResource,
    });

    expect(cacheKey).toEqual(bufferUri);
  });

  it("getExternalBufferCacheKey throws if resource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getExternalBufferCacheKey({});
    }).toThrowDeveloperError();
  });

  it("getEmbeddedBufferCacheKey works", function () {
    var cacheKey = ResourceCacheKey.getEmbeddedBufferCacheKey({
      parentResource: parentResource,
      bufferId: bufferId,
    });

    expect(cacheKey).toEqual(parentUri + "-buffer-0");
  });

  it("getEmbeddedBufferCacheKey throws if parentResource is undefined", function () {
    expect(function () {
      ResourceCacheKey.getExternalBufferCacheKey({
        bufferId: bufferId,
      });
    }).toThrowDeveloperError();
  });

  it("getEmbeddedBufferCacheKey throws if bufferId is undefined", function () {
    expect(function () {
      ResourceCacheKey.getExternalBufferCacheKey({
        parentResource: parentResource,
      });
    }).toThrowDeveloperError();
  });
});
