import { Resource, ResourceCacheKey } from "../../Source/Cesium.js";

describe("ResourceCacheKey", function () {
  var schemaUri = "https://example.com/schema.json";
  var schemaResource = new Resource({ url: schemaUri });

  it("getSchemaCacheKey works for external schemas", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });

    expect(cacheKey).toBe(schemaUri);
  });

  it("getSchemaCacheKey works for internal schemas", function () {
    var schema = {
      classes: {},
      enums: {},
    };
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      schema: schema,
    });

    expect(cacheKey).toEqual(JSON.stringify(schema));
  });
});
