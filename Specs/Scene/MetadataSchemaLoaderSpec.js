import {
  Resource,
  ResourceLoaderState,
  MetadataSchemaLoader,
  when,
} from "../../Source/Cesium.js";

describe("Scene/MetadataSchemaLoader", function () {
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

  it("throws if neither options.schema nor options.resource are defined", function () {
    expect(function () {
      return new MetadataSchemaLoader({});
    }).toThrowDeveloperError();
  });

  it("throws if both options.schema and options.resource are defined", function () {
    expect(function () {
      return new MetadataSchemaLoader({
        resource: resource,
        schema: schemaJson,
      });
    }).toThrowDeveloperError();
  });

  it("rejects promise if schema cannot be fetched", function () {
    var error = new Error("404 Not Found");
    spyOn(Resource.prototype, "fetchJson").and.returnValue(when.reject(error));

    var schemaLoader = new MetadataSchemaLoader({
      resource: resource,
    });

    schemaLoader.load();

    return schemaLoader.promise
      .then(function (schemaLoader) {
        fail();
      })
      .otherwise(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load schema: https://example.com/schema.json\n404 Not Found"
        );
      });
  });

  it("loads schema from JSON", function () {
    var schemaLoader = new MetadataSchemaLoader({
      schema: schemaJson,
    });
    schemaLoader.load();

    return schemaLoader.promise.then(function (schemaLoader) {
      var schema = schemaLoader.schema;
      expect(schema).toBeDefined();

      var enums = schema.enums;
      expect(enums.treeType).toBeDefined();

      var classes = schema.classes;
      expect(classes.tree).toBeDefined();
    });
  });

  it("loads external schema", function () {
    var fetchJson = spyOn(Resource.prototype, "fetchJson").and.returnValue(
      when.resolve(schemaJson)
    );

    var schemaLoader = new MetadataSchemaLoader({
      resource: resource,
    });

    schemaLoader.load();

    return schemaLoader.promise.then(function (schemaLoader) {
      expect(fetchJson).toHaveBeenCalled();

      var schema = schemaLoader.schema;
      expect(schema).toBeDefined();

      var enums = schema.enums;
      expect(enums.treeType).toBeDefined();

      var classes = schema.classes;
      expect(classes.tree).toBeDefined();
    });
  });

  it("destroys schema", function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      when.resolve(schemaJson)
    );

    var schemaLoader = new MetadataSchemaLoader({
      resource: resource,
    });

    expect(schemaLoader.schema).not.toBeDefined();

    schemaLoader.load();

    return schemaLoader.promise.then(function (schemaLoader) {
      expect(schemaLoader.schema).toBeDefined();
      expect(schemaLoader.isDestroyed()).toBe(false);

      schemaLoader.destroy();
      expect(schemaLoader.schema).not.toBeDefined();
      expect(schemaLoader.isDestroyed()).toBe(true);
    });
  });

  it("handles destroy before load finishes", function () {
    var deferredPromise = when.defer();
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      deferredPromise.promise
    );

    var schemaLoader = new MetadataSchemaLoader({
      resource: resource,
    });

    expect(schemaLoader.schema).not.toBeDefined();

    schemaLoader.load();
    expect(schemaLoader._state).toBe(ResourceLoaderState.LOADING);
    schemaLoader.destroy();

    deferredPromise.resolve(schemaJson);

    expect(schemaLoader.schema).not.toBeDefined();
    expect(schemaLoader._state).toBe(ResourceLoaderState.DESTROYED);
  });
});
