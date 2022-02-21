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

    const image = new Image();
    image.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

    const gltfUri = "https://example.com/model.glb";
    const gltfResource = new Resource({
      url: gltfUri,
    });

    const schemaJson = {
      classes: {
        building: {
          properties: {
            name: {
              type: "STRING",
            },
            height: {
              type: "SCALAR",
              componentType: "FLOAT64",
            },
          },
        },
        tree: {
          properties: {
            species: {
              type: "STRING",
              array: true,
            },
          },
        },
        map: {
          properties: {
            color: {
              type: "SCALAR",
              componentType: "UINT8",
              array: true,
              count: 3,
            },
            intensity: {
              type: "SCALAR",
              componentType: "UINT8",
            },
          },
        },
        ortho: {
          properties: {
            vegetation: {
              type: "SCALAR",
              componentType: "UINT8",
              normalized: true,
            },
          },
        },
      },
    };

    const results = MetadataTester.createGltf({
      schema: schemaJson,
      propertyTables: [
        {
          name: "Buildings",
          class: "building",
          properties: {
            name: ["House", "Hospital"],
            height: [10.0, 20.0],
          },
        },
        {
          name: "Trees",
          class: "tree",
          properties: {
            species: [["Sparrow", "Squirrel"], ["Crow"]],
          },
        },
      ],
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
      propertyTextures: [
        {
          name: "Map",
          class: "map",
          index: 0,
          texCoord: 0,
          properties: {
            color: [0, 1, 2],
            intensity: [3],
          },
        },
        {
          name: "Ortho",
          class: "ortho",
          index: 1,
          texCoord: 1,
          properties: {
            vegetation: [0],
          },
        },
      ],
    });

    const gltf = results.gltf;
    const extension = gltf.extensions.EXT_structural_metadata;
    const buffer = results.buffer.buffer;

    const gltfSchemaUri = clone(gltf, true);
    const extensionSchemaUri = gltfSchemaUri.extensions.EXT_structural_metadata;
    extensionSchemaUri.schemaUri = "schema.json";
    delete extensionSchemaUri.schema;

    let scene;

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
          extension: extension,
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
          extension: extension,
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
          extension: extension,
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
          extension: extension,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("rejects promise if buffer view fails to load", function () {
      const error = new Error("404 Not Found");
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        when.reject(error)
      );

      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(image)
      );

      const featureMetadataLoader = new GltfFeatureMetadataLoader({
        gltf: gltf,
        extension: extension,
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

      const error = new Error("404 Not Found");
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.reject(error)
      );

      const featureMetadataLoader = new GltfFeatureMetadataLoader({
        gltf: gltf,
        extension: extension,
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

      const error = new Error("404 Not Found");
      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        when.reject(error)
      );

      const featureMetadataLoader = new GltfFeatureMetadataLoader({
        gltf: gltfSchemaUri,
        extension: extensionSchemaUri,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      featureMetadataLoader.load();

      return featureMetadataLoader.promise
        .then(function () {
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

      const featureMetadataLoader = new GltfFeatureMetadataLoader({
        gltf: gltf,
        extension: extension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      featureMetadataLoader.load();

      return waitForLoaderProcess(featureMetadataLoader, scene).then(function (
        featureMetadataLoader
      ) {
        loaderProcess(featureMetadataLoader, scene); // Check that calling process after load doesn't break anything
        const featureMetadata = featureMetadataLoader.featureMetadata;
        const buildingsTable = featureMetadata.getPropertyTable(0);
        expect(buildingsTable.id).toBe(0);
        const treesTable = featureMetadata.getPropertyTable(1);
        expect(treesTable.id).toBe(1);
        const mapTexture = featureMetadata.getPropertyTexture(0);
        expect(mapTexture.id).toBe(0);
        const orthoTexture = featureMetadata.getPropertyTexture(1);
        expect(orthoTexture.id).toBe(1);

        expect(buildingsTable.getProperty(0, "name")).toBe("House");
        expect(buildingsTable.getProperty(1, "name")).toBe("Hospital");
        expect(treesTable.getProperty(0, "species")).toEqual([
          "Sparrow",
          "Squirrel",
        ]);
        expect(treesTable.getProperty(1, "species")).toEqual(["Crow"]);

        const colorProperty = mapTexture.getProperty("color");
        const intensityProperty = mapTexture.getProperty("intensity");
        const vegetationProperty = orthoTexture.getProperty("vegetation");

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

      const featureMetadataLoader = new GltfFeatureMetadataLoader({
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
        const featureMetadata = featureMetadataLoader.featureMetadata;
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

      const destroyBufferView = spyOn(
        GltfBufferViewLoader.prototype,
        "destroy"
      ).and.callThrough();

      const destroyTexture = spyOn(
        GltfTextureLoader.prototype,
        "destroy"
      ).and.callThrough();

      const destroySchema = spyOn(
        MetadataSchemaLoader.prototype,
        "destroy"
      ).and.callThrough();

      const featureMetadataLoader = new GltfFeatureMetadataLoader({
        gltf: gltf,
        extension: extension,
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
      const deferredPromise = when.defer();
      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        deferredPromise.promise
      );

      const destroyBufferView = spyOn(
        GltfBufferViewLoader.prototype,
        "destroy"
      ).and.callThrough();
      const destroyTexture = spyOn(
        GltfTextureLoader.prototype,
        "destroy"
      ).and.callThrough();
      const destroySchema = spyOn(
        MetadataSchemaLoader.prototype,
        "destroy"
      ).and.callThrough();

      // Load a copy of feature metadata into the cache so that the resource
      // promises resolve even if the feature metadata loader is destroyed
      const featureMetadataLoaderCopy = new GltfFeatureMetadataLoader({
        gltf: gltf,
        extension: extension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });
      // Also load a copy of the schema into the cache
      const schemaResource = gltfResource.getDerivedResource({
        url: "schema.json",
      });
      const schemaCopy = ResourceCache.loadSchema({
        resource: schemaResource,
      });

      featureMetadataLoaderCopy.load();

      return waitForLoaderProcess(featureMetadataLoaderCopy, scene).then(
        function (featureMetadataLoaderCopy) {
          // Ignore featureMetadataLoaderCopy destroying its buffer views
          destroyBufferView.calls.reset();

          const featureMetadataLoader = new GltfFeatureMetadataLoader({
            gltf: gltfSchemaUri,
            extension: extensionSchemaUri,
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
