import {
  clone,
  GltfBufferViewLoader,
  GltfFeatureMetadataLoader,
  GltfTextureLoader,
  MetadataSchemaLoader,
  Resource,
  ResourceCache,
  SupportedImageFormats,
  when,
} from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import loaderProcess from "../loaderProcess.js";
import MetadataTester from "../MetadataTester.js";
import waitForLoaderProcess from "../waitForLoaderProcess.js";

describe(
  "Scene/GltfFeatureMetadataLoader",
  function () {
    if (!MetadataTester.isSupported()) {
      return;
    }

    var image = new Image();
    image.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

    var gltfUri = "https://example.com/model.glb";
    var gltfResource = new Resource({
      url: gltfUri,
    });

    var schemaJson = {
      classes: {
        building: {
          properties: {
            name: {
              componentType: "STRING",
            },
            height: {
              componentType: "FLOAT64",
            },
          },
        },
        tree: {
          properties: {
            species: {
              type: "ARRAY",
              componentType: "STRING",
            },
          },
        },
        map: {
          properties: {
            color: {
              type: "ARRAY",
              componentType: "UINT8",
              componentCount: 3,
            },
            intensity: {
              componentType: "UINT8",
            },
          },
        },
        ortho: {
          properties: {
            vegetation: {
              type: "UINT8",
              normalized: true,
            },
          },
        },
      },
    };

    var results = MetadataTester.createGltf({
      schema: schemaJson,
      featureTables: {
        buildings: {
          class: "building",
          properties: {
            name: ["House", "Hospital"],
            height: [10.0, 20.0],
          },
        },
        trees: {
          class: "tree",
          properties: {
            species: [["Sparrow", "Squirrel"], ["Crow"]],
          },
        },
      },
      images: [
        {
          uri: "map.png",
        },
        {
          uri: "ortho.png",
        },
      ],
      textures: [
        {
          source: 0,
        },
        {
          source: 1,
        },
      ],
      featureTextures: {
        mapTexture: {
          class: "map",
          properties: {
            color: {
              channels: "rgb",
              texture: {
                index: 0,
                texCoord: 0,
              },
            },
            intensity: {
              channels: "a",
              texture: {
                index: 0,
                texCoord: 0,
              },
            },
          },
        },
        orthoTexture: {
          class: "ortho",
          properties: {
            vegetation: {
              channels: "r",
              texture: {
                index: 1,
                texCoord: 1,
              },
            },
          },
        },
      },
    });

    var gltf = results.gltf;
    var extension = gltf.extensions.EXT_feature_metadata;
    var buffer = results.buffer.buffer;

    var gltfSchemaUri = clone(gltf, true);
    var extensionSchemaUri = gltfSchemaUri.extensions.EXT_feature_metadata;
    extensionSchemaUri.schemaUri = "schema.json";
    delete extensionSchemaUri.schema;

    var scene;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      ResourceCache.clearForSpecs();
    });

    it("throws if gltf is undefined", function () {
      expect(function () {
        return new GltfFeatureMetadataLoader({
          gltf: undefined,
          extensionLegacy: extension,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("throws if neither extension nor extensionLegacy is defined", function () {
      expect(function () {
        return new GltfFeatureMetadataLoader({
          gltf: gltf,
          extension: undefined,
          extensionLegacy: undefined,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltfResource is undefined", function () {
      expect(function () {
        return new GltfFeatureMetadataLoader({
          gltf: gltf,
          extensionLegacy: extension,
          gltfResource: undefined,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("throws if baseResource is undefined", function () {
      expect(function () {
        return new GltfFeatureMetadataLoader({
          gltf: gltf,
          extensionLegacy: extension,
          gltfResource: gltfResource,
          baseResource: undefined,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltf is undefined", function () {
      expect(function () {
        return new GltfFeatureMetadataLoader({
          gltf: gltf,
          extensionLegacy: extension,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("rejects promise if buffer view fails to load", function () {
      var error = new Error("404 Not Found");
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.reject(error)
      );

      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(image)
      );

      var featureMetadataLoader = new GltfFeatureMetadataLoader({
        gltf: gltf,
        extensionLegacy: extension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      featureMetadataLoader.load();

      return featureMetadataLoader.promise
        .then(function (featureMetadataLoader) {
          fail();
        })
        .otherwise(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load feature metadata\nFailed to load buffer view\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
          );
        });
    });

    it("rejects promise if texture fails to load", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(buffer)
      );

      var error = new Error("404 Not Found");
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.reject(error)
      );

      var featureMetadataLoader = new GltfFeatureMetadataLoader({
        gltf: gltf,
        extensionLegacy: extension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      featureMetadataLoader.load();

      return featureMetadataLoader.promise
        .then(function (featureMetadataLoader) {
          fail();
        })
        .otherwise(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load feature metadata\nFailed to load texture\nFailed to load image: map.png\n404 Not Found"
          );
        });
    });

    it("rejects promise if external schema fails to load", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(buffer)
      );

      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(image)
      );

      var error = new Error("404 Not Found");
      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        when.reject(error)
      );

      var featureMetadataLoader = new GltfFeatureMetadataLoader({
        gltf: gltfSchemaUri,
        extensionLegacy: extensionSchemaUri,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      featureMetadataLoader.load();

      return featureMetadataLoader.promise
        .then(function (featureMetadataLoader) {
          fail();
        })
        .otherwise(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load feature metadata\nFailed to load schema: https://example.com/schema.json\n404 Not Found"
          );
        });
    });

    it("loads feature metadata", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(buffer)
      );

      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(image)
      );

      var featureMetadataLoader = new GltfFeatureMetadataLoader({
        gltf: gltf,
        extensionLegacy: extension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      featureMetadataLoader.load();

      return waitForLoaderProcess(featureMetadataLoader, scene).then(function (
        featureMetadataLoader
      ) {
        loaderProcess(featureMetadataLoader, scene); // Check that calling process after load doesn't break anything
        var featureMetadata = featureMetadataLoader.featureMetadata;
        var buildingsTable = featureMetadata.getFeatureTable(0);
        expect(buildingsTable.id).toBe("buildings");
        var treesTable = featureMetadata.getFeatureTable(1);
        expect(treesTable.id).toBe("trees");
        var mapTexture = featureMetadata.getFeatureTexture(0);
        expect(mapTexture.id).toBe("mapTexture");
        var orthoTexture = featureMetadata.getFeatureTexture(1);
        expect(orthoTexture.id).toBe("orthoTexture");

        expect(buildingsTable.getProperty(0, "name")).toBe("House");
        expect(buildingsTable.getProperty(1, "name")).toBe("Hospital");
        expect(treesTable.getProperty(0, "species")).toEqual([
          "Sparrow",
          "Squirrel",
        ]);
        expect(treesTable.getProperty(1, "species")).toEqual(["Crow"]);

        var colorProperty = mapTexture.getProperty("color");
        var intensityProperty = mapTexture.getProperty("intensity");
        var vegetationProperty = orthoTexture.getProperty("vegetation");

        expect(colorProperty.textureReader.texture.width).toBe(1);
        expect(colorProperty.textureReader.texture.height).toBe(1);
        expect(colorProperty.textureReader.texture).toBe(
          intensityProperty.textureReader.texture
        );

        expect(vegetationProperty.textureReader.texture.width).toBe(1);
        expect(vegetationProperty.textureReader.texture.height).toBe(1);
        expect(vegetationProperty.textureReader.texture).not.toBe(
          colorProperty.textureReader.texture
        );

        expect(Object.keys(featureMetadata.schema.classes).sort()).toEqual([
          "building",
          "map",
          "ortho",
          "tree",
        ]);
      });
    });

    it("loads feature metadata with external schema", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(buffer)
      );

      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(image)
      );

      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        when.resolve(schemaJson)
      );

      var featureMetadataLoader = new GltfFeatureMetadataLoader({
        gltf: gltfSchemaUri,
        extension: extensionSchemaUri,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      featureMetadataLoader.load();

      return waitForLoaderProcess(featureMetadataLoader, scene).then(function (
        featureMetadataLoader
      ) {
        var featureMetadata = featureMetadataLoader.featureMetadata;
        expect(Object.keys(featureMetadata.schema.classes).sort()).toEqual([
          "building",
          "map",
          "ortho",
          "tree",
        ]);
      });
    });

    it("destroys feature metadata", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(buffer)
      );

      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(image)
      );

      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        when.resolve(schemaJson)
      );

      var destroyBufferView = spyOn(
        GltfBufferViewLoader.prototype,
        "destroy"
      ).and.callThrough();

      var destroyTexture = spyOn(
        GltfTextureLoader.prototype,
        "destroy"
      ).and.callThrough();

      var destroySchema = spyOn(
        MetadataSchemaLoader.prototype,
        "destroy"
      ).and.callThrough();

      var featureMetadataLoader = new GltfFeatureMetadataLoader({
        gltf: gltf,
        extensionLegacy: extension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      featureMetadataLoader.load();

      return waitForLoaderProcess(featureMetadataLoader, scene).then(function (
        featureMetadataLoader
      ) {
        expect(featureMetadataLoader.featureMetadata).toBeDefined();
        expect(featureMetadataLoader.isDestroyed()).toBe(false);

        featureMetadataLoader.destroy();

        expect(featureMetadataLoader.featureMetadata).not.toBeDefined();
        expect(featureMetadataLoader.isDestroyed()).toBe(true);

        expect(destroyBufferView.calls.count()).toBe(6);
        expect(destroyTexture.calls.count()).toBe(2);
        expect(destroySchema.calls.count()).toBe(1);
      });
    });

    function resolveAfterDestroy(reject) {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.resolve(buffer)
      );
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(image)
      );
      var deferredPromise = when.defer();
      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        deferredPromise.promise
      );

      var destroyBufferView = spyOn(
        GltfBufferViewLoader.prototype,
        "destroy"
      ).and.callThrough();
      var destroyTexture = spyOn(
        GltfTextureLoader.prototype,
        "destroy"
      ).and.callThrough();
      var destroySchema = spyOn(
        MetadataSchemaLoader.prototype,
        "destroy"
      ).and.callThrough();

      // Load a copy of feature metadata into the cache so that the resource
      // promises resolve even if the feature metadata loader is destroyed
      var featureMetadataLoaderCopy = new GltfFeatureMetadataLoader({
        gltf: gltf,
        extensionLegacy: extension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });
      // Also load a copy of the schema into the cache
      var schemaResource = gltfResource.getDerivedResource({
        url: "schema.json",
      });
      var schemaCopy = ResourceCache.loadSchema({
        resource: schemaResource,
      });

      featureMetadataLoaderCopy.load();

      return waitForLoaderProcess(featureMetadataLoaderCopy, scene).then(
        function (featureMetadataLoaderCopy) {
          // Ignore featureMetadataLoaderCopy destroying its buffer views
          destroyBufferView.calls.reset();

          var featureMetadataLoader = new GltfFeatureMetadataLoader({
            gltf: gltfSchemaUri,
            extensionLegacy: extensionSchemaUri,
            gltfResource: gltfResource,
            baseResource: gltfResource,
            supportedImageFormats: new SupportedImageFormats(),
          });
          expect(featureMetadataLoader.featureMetadata).not.toBeDefined();
          featureMetadataLoader.load();
          featureMetadataLoader.destroy();

          if (reject) {
            deferredPromise.reject(new Error());
          } else {
            deferredPromise.resolve(schemaJson);
          }

          expect(featureMetadataLoader.featureMetadata).not.toBeDefined();
          expect(featureMetadataLoader.isDestroyed()).toBe(true);

          featureMetadataLoaderCopy.destroy();

          expect(destroyBufferView.calls.count()).toBe(6);
          expect(destroyTexture.calls.count()).toBe(2);
          expect(destroySchema.calls.count()).toBe(1);

          ResourceCache.unload(schemaCopy);
        }
      );
    }

    it("handles resolving resources after destroy", function () {
      resolveAfterDestroy(false);
    });

    it("handles rejecting resources after destroy", function () {
      resolveAfterDestroy(true);
    });
  },
  "WebGL"
);
