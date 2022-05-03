import {
  ComponentDatatype,
  DracoLoader,
  GltfJsonLoader,
  MetadataSchemaLoader,
  Resource,
  ResourceCache,
  ResourceCacheKey,
  SupportedImageFormats,
} from "../../Source/Cesium.js";
import concatTypedArrays from "../concatTypedArrays.js";
import createScene from "../createScene.js";
import generateJsonBuffer from "../generateJsonBuffer.js";
import waitForLoaderProcess from "../waitForLoaderProcess.js";

describe(
  "ResourceCache",
  function () {
    const schemaResource = new Resource({
      url: "https://example.com/schema.json",
    });
    const schemaJson = {};

    const bufferParentResource = new Resource({
      url: "https://example.com/model.glb",
    });
    const bufferResource = new Resource({
      url: "https://example.com/external.bin",
    });

    const gltfUri = "https://example.com/model.glb";

    const gltfResource = new Resource({
      url: gltfUri,
    });

    const image = new Image();
    image.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

    const positions = new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0]); // prettier-ignore
    const normals = new Float32Array([-1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0]); // prettier-ignore
    const indices = new Uint16Array([0, 1, 2]);

    const bufferTypedArray = concatTypedArrays([positions, normals, indices]);
    const bufferArrayBuffer = bufferTypedArray.buffer;

    const dracoBufferTypedArray = new Uint8Array([
      1,
      3,
      7,
      15,
      31,
      63,
      127,
      255,
    ]);
    const dracoArrayBuffer = dracoBufferTypedArray.buffer;

    const decodedPositions = new Uint16Array([0, 0, 0, 65535, 65535, 65535, 0, 65535, 0]); // prettier-ignore
    const decodedNormals = new Uint8Array([0, 255, 128, 128, 255, 0]);
    const decodedIndices = new Uint16Array([0, 1, 2]);

    const decodeDracoResults = {
      indexArray: {
        typedArray: decodedIndices,
        numberOfIndices: decodedIndices.length,
      },
      attributeData: {
        POSITION: {
          array: decodedPositions,
          data: {
            byteOffset: 0,
            byteStride: 6,
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
            componentsPerAttribute: 3,
            normalized: false,
            quantization: {
              octEncoded: false,
              quantizationBits: 14,
              minValues: [-1.0, -1.0, -1.0],
              range: 2.0,
            },
          },
        },
        NORMAL: {
          array: decodedNormals,
          data: {
            byteOffset: 0,
            byteStride: 2,
            componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute: 2,
            normalized: false,
            quantization: {
              octEncoded: true,
              quantizationBits: 10,
            },
          },
        },
      },
    };

    const gltfDraco = {
      buffers: [
        {
          uri: "external.bin",
          byteLength: 8,
        },
      ],
      bufferViews: [
        {
          buffer: 0,
          byteOffset: 4,
          byteLength: 4,
        },
      ],
      accessors: [
        {
          componentType: 5126,
          count: 3,
          max: [-1.0, -1.0, -1.0],
          min: [1.0, 1.0, 1.0],
          type: "VEC3",
        },
        {
          componentType: 5126,
          count: 3,
          type: "VEC3",
        },
        {
          componentType: 5123,
          count: 3,
          type: "SCALAR",
        },
      ],
      meshes: [
        {
          primitives: [
            {
              attributes: {
                POSITION: 0,
                NORMAL: 1,
              },
              indices: 2,
              extensions: {
                KHR_draco_mesh_compression: {
                  bufferView: 0,
                  attributes: {
                    POSITION: 0,
                    NORMAL: 1,
                  },
                },
              },
            },
          ],
        },
      ],
    };

    const dracoExtension =
      gltfDraco.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression;

    const gltfUncompressed = {
      buffers: [
        {
          uri: "external.bin",
          byteLength: 78,
        },
      ],
      bufferViews: [
        {
          buffer: 0,
          byteOffset: 0,
          byteLength: 36,
        },
        {
          buffer: 0,
          byteOffset: 36,
          byteLength: 36,
        },
        {
          buffer: 0,
          byteOffset: 72,
          byteLength: 6,
        },
      ],
      accessors: [
        {
          componentType: 5126,
          count: 3,
          max: [-1.0, -1.0, -1.0],
          min: [1.0, 1.0, 1.0],
          type: "VEC3",
          bufferView: 0,
          byteOffset: 0,
        },
        {
          componentType: 5126,
          count: 3,
          type: "VEC3",
          bufferView: 1,
          byteOffset: 0,
        },
        {
          componentType: 5123,
          count: 3,
          type: "SCALAR",
          bufferView: 2,
          byteOffset: 0,
        },
      ],
      meshes: [
        {
          primitives: [
            {
              attributes: {
                POSITION: 0,
                NORMAL: 1,
              },
              indices: 2,
            },
          ],
        },
      ],
    };

    const gltfWithTextures = {
      images: [
        {
          uri: "image.png",
        },
      ],
      textures: [
        {
          source: 0,
        },
      ],
      materials: [
        {
          emissiveTexture: {
            index: 0,
          },
          occlusionTexture: {
            index: 1,
          },
        },
      ],
    };

    // Index buffers will load as typed arrays only in WebGL1.
    // In order to load them as buffers, the scene must have WebGL2 enabled.
    let scene;
    let sceneWithWebgl2;

    beforeAll(function () {
      scene = createScene();
      sceneWithWebgl2 = createScene();
      sceneWithWebgl2.context._webgl2 = true;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      ResourceCache.clearForSpecs();
    });

    it("loads resource", function () {
      const fetchJson = spyOn(Resource.prototype, "fetchJson").and.returnValue(
        Promise.resolve(schemaJson)
      );

      const cacheKey = ResourceCacheKey.getSchemaCacheKey({
        resource: schemaResource,
      });
      const resourceLoader = new MetadataSchemaLoader({
        resource: schemaResource,
        cacheKey: cacheKey,
      });

      ResourceCache.load({
        resourceLoader: resourceLoader,
      });

      const cacheEntry = ResourceCache.cacheEntries[cacheKey];
      expect(cacheEntry.referenceCount).toBe(1);
      expect(cacheEntry.resourceLoader).toBe(resourceLoader);

      return resourceLoader.promise.then(function (resourceLoader) {
        expect(fetchJson).toHaveBeenCalled();

        const schema = resourceLoader.schema;
        expect(schema).toBeDefined();
      });
    });

    it("load throws if resourceLoader is undefined", function () {
      expect(function () {
        ResourceCache.load({
          resourceLoader: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("load throws if resourceLoader's cacheKey is undefined", function () {
      const resourceLoader = new MetadataSchemaLoader({
        resource: schemaResource,
      });

      expect(function () {
        ResourceCache.load({
          resourceLoader: resourceLoader,
        });
      }).toThrowDeveloperError();
    });

    it("load throws if a resource with this cacheKey is already in the cache", function () {
      const cacheKey = ResourceCacheKey.getSchemaCacheKey({
        resource: schemaResource,
      });

      const resourceLoader = new MetadataSchemaLoader({
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

    it("destroys resource when reference count reaches 0", function () {
      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        Promise.resolve(schemaJson)
      );

      const destroy = spyOn(
        MetadataSchemaLoader.prototype,
        "destroy"
      ).and.callThrough();

      const cacheKey = ResourceCacheKey.getSchemaCacheKey({
        resource: schemaResource,
      });
      const resourceLoader = new MetadataSchemaLoader({
        resource: schemaResource,
        cacheKey: cacheKey,
      });

      ResourceCache.load({
        resourceLoader: resourceLoader,
      });

      ResourceCache.get(cacheKey);

      const cacheEntry = ResourceCache.cacheEntries[cacheKey];
      expect(cacheEntry.referenceCount).toBe(2);

      ResourceCache.unload(resourceLoader);
      expect(cacheEntry.referenceCount).toBe(1);
      expect(destroy).not.toHaveBeenCalled();

      ResourceCache.unload(resourceLoader);
      expect(cacheEntry.referenceCount).toBe(0);
      expect(destroy).toHaveBeenCalled();
      expect(ResourceCache.cacheEntries[cacheKey]).toBeUndefined();
    });

    it("unload throws if resourceLoader is undefined", function () {
      expect(function () {
        ResourceCache.unload();
      }).toThrowDeveloperError();
    });

    it("unload throws if resourceLoader is not in the cache", function () {
      const cacheKey = ResourceCacheKey.getSchemaCacheKey({
        resource: schemaResource,
      });
      const resourceLoader = new MetadataSchemaLoader({
        resource: schemaResource,
        cacheKey: cacheKey,
      });

      expect(function () {
        ResourceCache.unload(resourceLoader);
      }).toThrowDeveloperError();
    });

    it("unload throws if resourceLoader has already been unloaded from the cache", function () {
      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        Promise.resolve(schemaJson)
      );

      const cacheKey = ResourceCacheKey.getSchemaCacheKey({
        resource: schemaResource,
      });
      const resourceLoader = new MetadataSchemaLoader({
        resource: schemaResource,
        cacheKey: cacheKey,
      });

      ResourceCache.load({
        resourceLoader: resourceLoader,
      });

      ResourceCache.unload(resourceLoader);

      expect(function () {
        ResourceCache.unload(resourceLoader);
      }).toThrowDeveloperError();
    });

    it("gets resource", function () {
      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        Promise.resolve(schemaJson)
      );

      const cacheKey = ResourceCacheKey.getSchemaCacheKey({
        resource: schemaResource,
      });
      const resourceLoader = new MetadataSchemaLoader({
        resource: schemaResource,
        cacheKey: cacheKey,
      });

      ResourceCache.load({
        resourceLoader: resourceLoader,
      });

      const cacheEntry = ResourceCache.cacheEntries[cacheKey];

      ResourceCache.get(cacheKey);
      expect(cacheEntry.referenceCount).toBe(2);

      ResourceCache.get(cacheKey);
      expect(cacheEntry.referenceCount).toBe(3);
    });

    it("get returns undefined if there is no resource with this cache key", function () {
      const cacheKey = ResourceCacheKey.getSchemaCacheKey({
        resource: schemaResource,
      });

      expect(ResourceCache.get(cacheKey)).toBeUndefined();
    });

    it("loads schema from JSON", function () {
      const expectedCacheKey = ResourceCacheKey.getSchemaCacheKey({
        schema: schemaJson,
      });
      const schemaLoader = ResourceCache.loadSchema({
        schema: schemaJson,
      });
      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(schemaLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

      // The existing resource is returned if the computed cache key is the same
      expect(
        ResourceCache.loadSchema({
          schema: schemaJson,
        })
      ).toBe(schemaLoader);

      expect(cacheEntry.referenceCount).toBe(2);

      return schemaLoader.promise.then(function (schemaLoader) {
        const schema = schemaLoader.schema;
        expect(schema).toBeDefined();
      });
    });

    it("loads external schema", function () {
      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        Promise.resolve(schemaJson)
      );

      const expectedCacheKey = ResourceCacheKey.getSchemaCacheKey({
        resource: schemaResource,
      });
      const schemaLoader = ResourceCache.loadSchema({
        resource: schemaResource,
      });
      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(schemaLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

      // The existing resource is returned if the computed cache key is the same
      expect(
        ResourceCache.loadSchema({
          resource: schemaResource,
        })
      ).toBe(schemaLoader);

      expect(cacheEntry.referenceCount).toBe(2);

      return schemaLoader.promise.then(function (schemaLoader) {
        const schema = schemaLoader.schema;
        expect(schema).toBeDefined();
      });
    });

    it("loadSchema throws if neither options.schema nor options.resource are defined", function () {
      expect(function () {
        ResourceCache.loadSchema({
          schema: undefined,
          resource: undefined,
        });
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
      const expectedCacheKey = ResourceCacheKey.getEmbeddedBufferCacheKey({
        parentResource: bufferParentResource,
        bufferId: 0,
      });
      const bufferLoader = ResourceCache.loadEmbeddedBuffer({
        parentResource: bufferParentResource,
        bufferId: 0,
        typedArray: bufferTypedArray,
      });
      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(bufferLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

      // The existing resource is returned if the computed cache key is the same
      expect(
        ResourceCache.loadEmbeddedBuffer({
          parentResource: bufferParentResource,
          bufferId: 0,
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
          bufferId: 0,
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
          bufferId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("loads external buffer", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(bufferArrayBuffer)
      );

      const expectedCacheKey = ResourceCacheKey.getExternalBufferCacheKey({
        resource: bufferResource,
      });
      const bufferLoader = ResourceCache.loadExternalBuffer({
        resource: bufferResource,
      });
      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(bufferLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

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
        ResourceCache.loadExternalBuffer({
          resource: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("loads glTF", function () {
      const gltf = {
        asset: {
          version: "2.0",
        },
      };
      const arrayBuffer = generateJsonBuffer(gltf).buffer;

      spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
        Promise.resolve(arrayBuffer)
      );

      const expectedCacheKey = ResourceCacheKey.getGltfCacheKey({
        gltfResource: gltfResource,
      });
      const gltfJsonLoader = ResourceCache.loadGltfJson({
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });
      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(gltfJsonLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

      // The existing resource is returned if the computed cache key is the same
      expect(
        ResourceCache.loadGltfJson({
          gltfResource: gltfResource,
          baseResource: gltfResource,
        })
      ).toBe(gltfJsonLoader);

      expect(cacheEntry.referenceCount).toBe(2);

      return gltfJsonLoader.promise.then(function (gltfJsonLoader) {
        expect(gltfJsonLoader.gltf).toBeDefined();
      });
    });

    it("loadGltfJson throws if gltfResource is undefined", function () {
      expect(function () {
        ResourceCache.loadGltfJson({
          gltfResource: undefined,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadGltfJson throws if gltfResource is undefined", function () {
      expect(function () {
        ResourceCache.loadGltfJson({
          gltfResource: gltfResource,
          baseResource: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("loads buffer view", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(bufferArrayBuffer)
      );

      const expectedCacheKey = ResourceCacheKey.getBufferViewCacheKey({
        gltf: gltfUncompressed,
        bufferViewId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });
      const bufferViewLoader = ResourceCache.loadBufferView({
        gltf: gltfUncompressed,
        bufferViewId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });
      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(bufferViewLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

      // The existing resource is returned if the computed cache key is the same
      expect(
        ResourceCache.loadBufferView({
          gltf: gltfUncompressed,
          bufferViewId: 0,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        })
      ).toBe(bufferViewLoader);

      expect(cacheEntry.referenceCount).toBe(2);

      return bufferViewLoader.promise.then(function (bufferViewLoader) {
        expect(bufferViewLoader.typedArray).toBeDefined();
      });
    });

    it("loadBufferView throws if gltf is undefined", function () {
      expect(function () {
        ResourceCache.loadBufferView({
          gltf: undefined,
          bufferViewId: 0,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadBufferView throws if bufferViewId is undefined", function () {
      expect(function () {
        ResourceCache.loadBufferView({
          gltf: gltfUncompressed,
          bufferViewId: undefined,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadBufferView throws if gltfResource is undefined", function () {
      expect(function () {
        ResourceCache.loadBufferView({
          gltf: gltfUncompressed,
          bufferViewId: 0,
          gltfResource: undefined,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadBufferView throws if baseResource is undefined", function () {
      expect(function () {
        ResourceCache.loadBufferView({
          gltf: gltfUncompressed,
          bufferViewId: 0,
          gltfResource: gltfResource,
          baseResource: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("loads draco", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(dracoArrayBuffer)
      );

      spyOn(DracoLoader, "decodeBufferView").and.returnValue(
        Promise.resolve(decodeDracoResults)
      );

      const expectedCacheKey = ResourceCacheKey.getDracoCacheKey({
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });
      const dracoLoader = ResourceCache.loadDraco({
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(dracoLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

      // The existing resource is returned if the computed cache key is the same
      expect(
        ResourceCache.loadDraco({
          gltf: gltfDraco,
          draco: dracoExtension,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        })
      ).toBe(dracoLoader);

      expect(cacheEntry.referenceCount).toBe(2);

      return waitForLoaderProcess(dracoLoader, scene).then(function (
        dracoLoader
      ) {
        expect(dracoLoader.decodedData).toBeDefined();
      });
    });

    it("loadDraco throws if gltf is undefined", function () {
      expect(function () {
        ResourceCache.loadBufferView({
          gltf: undefined,
          draco: dracoExtension,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadDraco throws if draco is undefined", function () {
      expect(function () {
        ResourceCache.loadBufferView({
          gltf: gltfDraco,
          draco: undefined,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadDraco throws if gltfResource is undefined", function () {
      expect(function () {
        ResourceCache.loadBufferView({
          gltf: gltfDraco,
          draco: dracoExtension,
          gltfResource: undefined,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadDraco throws if baseResource is undefined", function () {
      expect(function () {
        ResourceCache.loadBufferView({
          gltf: gltfDraco,
          draco: dracoExtension,
          gltfResource: gltfResource,
          baseResource: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("loads vertex buffer from buffer view", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(bufferArrayBuffer)
      );

      const expectedCacheKey = ResourceCacheKey.getVertexBufferCacheKey({
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
      });
      const vertexBufferLoader = ResourceCache.loadVertexBuffer({
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
        accessorId: 0,
      });

      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(vertexBufferLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

      // The existing resource is returned if the computed cache key is the same
      expect(
        ResourceCache.loadVertexBuffer({
          gltf: gltfUncompressed,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          bufferViewId: 0,
        })
      ).toBe(vertexBufferLoader);

      expect(cacheEntry.referenceCount).toBe(2);

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        expect(vertexBufferLoader.buffer).toBeDefined();
      });
    });

    it("loads vertex buffer from draco", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(dracoArrayBuffer)
      );

      spyOn(DracoLoader, "decodeBufferView").and.returnValue(
        Promise.resolve(decodeDracoResults)
      );

      const expectedCacheKey = ResourceCacheKey.getVertexBufferCacheKey({
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        attributeSemantic: "POSITION",
      });
      const vertexBufferLoader = ResourceCache.loadVertexBuffer({
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
        attributeSemantic: "POSITION",
        accessorId: 0,
      });

      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(vertexBufferLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

      // The existing resource is returned if the computed cache key is the same
      expect(
        ResourceCache.loadVertexBuffer({
          gltf: gltfDraco,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          draco: dracoExtension,
          attributeSemantic: "POSITION",
          accessorId: 0,
        })
      ).toBe(vertexBufferLoader);

      expect(cacheEntry.referenceCount).toBe(2);

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        expect(vertexBufferLoader.buffer).toBeDefined();
      });
    });

    it("loads vertex buffer as typed array", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(bufferArrayBuffer)
      );

      const expectedCacheKey = ResourceCacheKey.getVertexBufferCacheKey({
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
        loadAsTypedArray: true,
      });
      const vertexBufferLoader = ResourceCache.loadVertexBuffer({
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        bufferViewId: 0,
        accessorId: 0,
        loadAsTypedArray: true,
      });

      expect(vertexBufferLoader.cacheKey).toBe(expectedCacheKey);

      return waitForLoaderProcess(vertexBufferLoader, scene).then(function (
        vertexBufferLoader
      ) {
        expect(vertexBufferLoader.typedArray).toBeDefined();
        expect(vertexBufferLoader.buffer).toBeUndefined();
      });
    });

    it("loadVertexBuffer throws if gltf is undefined", function () {
      expect(function () {
        ResourceCache.loadVertexBuffer({
          gltf: undefined,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          bufferViewId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("loadVertexBuffer throws if gltfResource is undefined", function () {
      expect(function () {
        ResourceCache.loadVertexBuffer({
          gltf: gltfUncompressed,
          gltfResource: undefined,
          baseResource: gltfResource,
          bufferViewId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("loadVertexBuffer throws if baseResource is undefined", function () {
      expect(function () {
        ResourceCache.loadVertexBuffer({
          gltf: gltfUncompressed,
          gltfResource: gltfResource,
          baseResource: undefined,
          bufferViewId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("loadVertexBuffer throws if bufferViewId and draco are both defined", function () {
      expect(function () {
        ResourceCache.loadVertexBuffer({
          gltf: gltfDraco,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          bufferViewId: 0,
          draco: dracoExtension,
          attributeSemantic: "POSITION",
          accessorId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("loadVertexBuffer throws if bufferViewId and draco are both undefined", function () {
      expect(function () {
        ResourceCache.loadVertexBuffer({
          gltf: gltfDraco,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadVertexBuffer throws if draco is defined and attributeSemantic is not defined", function () {
      expect(function () {
        ResourceCache.loadVertexBuffer({
          gltf: gltfDraco,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          draco: dracoExtension,
          attributeSemantic: undefined,
          accessorId: 0,
        });
      }).toThrowDeveloperError();
    });

    it("loadVertexBuffer throws if draco is defined and accessorId is not defined", function () {
      expect(function () {
        ResourceCache.loadVertexBuffer({
          gltf: gltfDraco,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          draco: dracoExtension,
          attributeSemantic: "POSITION",
          accessorId: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("loads index buffer from accessor as buffer", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(bufferArrayBuffer)
      );

      const expectedCacheKey = ResourceCacheKey.getIndexBufferCacheKey({
        gltf: gltfUncompressed,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });
      const indexBufferLoader = ResourceCache.loadIndexBuffer({
        gltf: gltfUncompressed,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(indexBufferLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

      // The existing resource is returned if the computed cache key is the same
      expect(
        ResourceCache.loadIndexBuffer({
          gltf: gltfUncompressed,
          accessorId: 2,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        })
      ).toBe(indexBufferLoader);

      expect(cacheEntry.referenceCount).toBe(2);

      return waitForLoaderProcess(indexBufferLoader, sceneWithWebgl2).then(
        function (indexBufferLoader) {
          expect(indexBufferLoader.buffer).toBeDefined();
        }
      );
    });

    it("loads index buffer from draco", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(dracoArrayBuffer)
      );

      spyOn(DracoLoader, "decodeBufferView").and.returnValue(
        Promise.resolve(decodeDracoResults)
      );

      const expectedCacheKey = ResourceCacheKey.getIndexBufferCacheKey({
        gltf: gltfDraco,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
      });
      const indexBufferLoader = ResourceCache.loadIndexBuffer({
        gltf: gltfDraco,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        draco: dracoExtension,
      });

      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(indexBufferLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

      // The existing resource is returned if the computed cache key is the same
      expect(
        ResourceCache.loadIndexBuffer({
          gltf: gltfDraco,
          accessorId: 2,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          draco: dracoExtension,
        })
      ).toBe(indexBufferLoader);

      expect(cacheEntry.referenceCount).toBe(2);

      return waitForLoaderProcess(indexBufferLoader, sceneWithWebgl2).then(
        function (indexBufferLoader) {
          expect(indexBufferLoader.buffer).toBeDefined();
        }
      );
    });

    it("loads index buffer as typed array using option", function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(bufferArrayBuffer)
      );

      const expectedCacheKey = ResourceCacheKey.getIndexBufferCacheKey({
        gltf: gltfUncompressed,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        loadAsTypedArray: true,
      });
      const indexBufferLoader = ResourceCache.loadIndexBuffer({
        gltf: gltfUncompressed,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        loadAsTypedArray: true,
      });

      expect(indexBufferLoader.cacheKey).toBe(expectedCacheKey);

      return waitForLoaderProcess(indexBufferLoader, sceneWithWebgl2).then(
        function (indexBufferLoader) {
          expect(indexBufferLoader.typedArray).toBeDefined();
          expect(indexBufferLoader.buffer).toBeUndefined();
        }
      );
    });

    it("loadIndexBuffer throws if gltf is undefined", function () {
      expect(function () {
        ResourceCache.loadIndexBuffer({
          gltf: undefined,
          accessorId: 2,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadIndexBuffer throws if accessorId is undefined", function () {
      expect(function () {
        ResourceCache.loadIndexBuffer({
          gltf: gltfUncompressed,
          accessorId: undefined,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadIndexBuffer throws if gltfResource is undefined", function () {
      expect(function () {
        ResourceCache.loadIndexBuffer({
          gltf: gltfUncompressed,
          accessorId: 2,
          gltfResource: undefined,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadIndexBuffer throws if baseResource is undefined", function () {
      expect(function () {
        ResourceCache.loadIndexBuffer({
          gltf: gltfUncompressed,
          accessorId: 2,
          gltfResource: gltfResource,
          baseResource: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("loads image", function () {
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        Promise.resolve(image)
      );

      const expectedCacheKey = ResourceCacheKey.getImageCacheKey({
        gltf: gltfWithTextures,
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });
      const imageLoader = ResourceCache.loadImage({
        gltf: gltfWithTextures,
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });
      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(imageLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

      // The existing resource is returned if the computed cache key is the same
      expect(
        ResourceCache.loadImage({
          gltf: gltfWithTextures,
          imageId: 0,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        })
      ).toBe(imageLoader);

      expect(cacheEntry.referenceCount).toBe(2);

      return imageLoader.promise.then(function (imageLoader) {
        expect(imageLoader.image).toBeDefined();
      });
    });

    it("loadImage throws if gltf is undefined", function () {
      expect(function () {
        ResourceCache.loadImage({
          gltf: undefined,
          imageId: 0,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadImage throws if imageId is undefined", function () {
      expect(function () {
        ResourceCache.loadImage({
          gltf: gltfWithTextures,
          imageId: undefined,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadImage throws if gltfResource is undefined", function () {
      expect(function () {
        ResourceCache.loadImage({
          gltf: gltfWithTextures,
          imageId: 0,
          gltfResource: undefined,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("loadImage throws if baseResource is undefined", function () {
      expect(function () {
        ResourceCache.loadImage({
          gltf: gltfWithTextures,
          imageId: 0,
          gltfResource: gltfResource,
          baseResource: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("loads texture", function () {
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        Promise.resolve(image)
      );

      const expectedCacheKey = ResourceCacheKey.getTextureCacheKey({
        gltf: gltfWithTextures,
        textureInfo: gltfWithTextures.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });
      const textureLoader = ResourceCache.loadTexture({
        gltf: gltfWithTextures,
        textureInfo: gltfWithTextures.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });
      const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
      expect(textureLoader.cacheKey).toBe(expectedCacheKey);
      expect(cacheEntry.referenceCount).toBe(1);

      // The existing resource is returned if the computed cache key is the same
      expect(
        ResourceCache.loadTexture({
          gltf: gltfWithTextures,
          textureInfo: gltfWithTextures.materials[0].emissiveTexture,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
        })
      ).toBe(textureLoader);

      expect(cacheEntry.referenceCount).toBe(2);

      return waitForLoaderProcess(textureLoader, scene).then(function (
        textureLoader
      ) {
        expect(textureLoader.texture).toBeDefined();
      });
    });

    it("loadTexture throws if gltf is undefined", function () {
      expect(function () {
        ResourceCache.loadTexture({
          gltf: undefined,
          textureInfo: gltfWithTextures.materials[0].emissiveTexture,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("loadTexture throws if textureInfo is undefined", function () {
      expect(function () {
        ResourceCache.loadTexture({
          gltf: gltfWithTextures,
          textureInfo: undefined,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("loadTexture throws if gltfResource is undefined", function () {
      expect(function () {
        ResourceCache.loadTexture({
          gltf: gltfWithTextures,
          textureInfo: gltfWithTextures.materials[0].emissiveTexture,
          gltfResource: undefined,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("loadTexture throws if baseResource is undefined", function () {
      expect(function () {
        ResourceCache.loadTexture({
          gltf: gltfWithTextures,
          textureInfo: gltfWithTextures.materials[0].emissiveTexture,
          gltfResource: gltfResource,
          baseResource: undefined,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("loadTexture throws if supportedImageFormats is undefined", function () {
      expect(function () {
        ResourceCache.loadTexture({
          gltf: gltfWithTextures,
          textureInfo: gltfWithTextures.materials[0].emissiveTexture,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: undefined,
        });
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
