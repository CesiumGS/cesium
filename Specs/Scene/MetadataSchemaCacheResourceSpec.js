import {
  CacheResourceState,
  Resource,
  ResourceCacheKey,
  MetadataSchemaCacheResource,
  when,
} from "../../Source/Cesium.js";

describe("Scene/MetadataSchemaCacheResource", function () {
  var schemaJson = {
    classes: {
      tree: {
        properties: {
          height: {
            type: "FLOAT32",
          },
          type: {
            type: "enum",
            enumType: "treeType",
          },
        },
      },
    },
    enums: {
      treeType: {
        values: [
          {
            name: "Coniferous",
            value: 0,
          },
          {
            name: "Deciduous",
            value: 1,
          },
        ],
      },
    },
  };

  var resource = new Resource({ url: "https://example.com/schema.json" });

  it("throws for undefined cacheKey", function () {
    expect(function () {
      return new MetadataSchemaCacheResource({
        schema: schemaJson,
      });
    }).toThrowDeveloperError();
  });

  it("throws if neither options.resource nor options.schema are defined", function () {
    expect(function () {
      return new MetadataSchemaCacheResource({});
    }).toThrowDeveloperError();
  });

  it("throws if both options.resource and options.schema are defined", function () {
    expect(function () {
      return new MetadataSchemaCacheResource({
        resource: resource,
        schema: schemaJson,
        cacheKey: "fakeKey",
      });
    }).toThrowDeveloperError();
  });

  it("rejects promise if schema cannot be fetched", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: resource,
    });
    var cacheResource = new MetadataSchemaCacheResource({
      resource: resource,
      cacheKey: cacheKey,
    });

    var error = new Error("404 Not Found");
    spyOn(Resource.prototype, "fetchJson").and.returnValue(when.reject(error));
    cacheResource.load();

    return cacheResource.promise
      .then(function (cacheResource) {
        fail();
      })
      .otherwise(function (error) {
        expect(error).toEqual(error);
      });
  });

  it("loads internal schemas", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      schema: schemaJson,
    });
    var cacheResource = new MetadataSchemaCacheResource({
      schema: schemaJson,
      cacheKey: cacheKey,
    });
    cacheResource.load();

    expect(cacheResource.cacheKey).toBe(cacheKey);

    return cacheResource.promise.then(function (cacheResource) {
      var schema = cacheResource.schema;
      expect(schema).toBeDefined();

      var enums = schema.enums;
      expect(enums.treeType).toBeDefined();

      var classes = schema.classes;
      expect(classes.tree).toBeDefined();
    });
  });

  it("loads external schemas", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: resource,
    });
    var cacheResource = new MetadataSchemaCacheResource({
      resource: resource,
      cacheKey: cacheKey,
    });

    expect(cacheResource.cacheKey).toBe(cacheKey);

    var fetchJson = spyOn(Resource.prototype, "fetchJson").and.returnValue(
      when.resolve(schemaJson)
    );
    cacheResource.load();

    return cacheResource.promise.then(function (cacheResource) {
      expect(fetchJson).toHaveBeenCalled();

      var schema = cacheResource.schema;
      expect(schema).toBeDefined();

      var enums = schema.enums;
      expect(enums.treeType).toBeDefined();

      var classes = schema.classes;
      expect(classes.tree).toBeDefined();
    });
  });

  it("unloads schemas", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: resource,
    });
    var cacheResource = new MetadataSchemaCacheResource({
      resource: resource,
      cacheKey: cacheKey,
    });

    expect(cacheResource.schema).not.toBeDefined();

    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      when.resolve(schemaJson)
    );
    cacheResource.load();

    return cacheResource.promise.then(function (cacheResource) {
      expect(cacheResource.schema).toBeDefined();

      cacheResource.unload();
      expect(cacheResource.schema).not.toBeDefined();
    });
  });

  it("handles unload before load finishes", function () {
    var cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: resource,
    });
    var cacheResource = new MetadataSchemaCacheResource({
      resource: resource,
      cacheKey: cacheKey,
    });

    expect(cacheResource.schema).not.toBeDefined();

    var deferred = when.defer();
    spyOn(Resource.prototype, "fetchJson").and.returnValue(deferred);

    cacheResource.load();
    cacheResource.unload();
    deferred.resolve(schemaJson);

    expect(cacheResource.schema).not.toBeDefined();
    expect(cacheResource._state).toBe(CacheResourceState.UNLOADED);
  });
});
