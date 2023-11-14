import {
  BufferLoader,
  GltfBufferViewLoader,
  GltfDracoLoader,
  GltfImageLoader,
  GltfIndexBufferLoader,
  GltfJsonLoader,
  GltfTextureLoader,
  GltfVertexBufferLoader,
  MetadataSchemaLoader,
  Resource,
  ResourceCache,
  ResourceCacheKey,
  SupportedImageFormats,
} from "../../index.js";
import concatTypedArrays from "../../../../Specs/concatTypedArrays.js";
import createScene from "../../../../Specs/createScene.js";

describe("ResourceCache", function () {
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

  const mockFrameState = {
    context: {
      id: "01234",
    },
  };

  const mockFrameState2 = {
    context: {
      id: "56789",
    },
  };

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

  it("adds resource", function () {
    const cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });
    const resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
      cacheKey: cacheKey,
    });

    ResourceCache.add(resourceLoader);

    const cacheEntry = ResourceCache.cacheEntries[cacheKey];
    expect(cacheEntry.referenceCount).toBe(1);
    expect(cacheEntry.resourceLoader).toBe(resourceLoader);
  });

  it("add throws if resourceLoader is undefined", function () {
    expect(() => ResourceCache.add()).toThrowDeveloperError();
  });

  it("add throws if resourceLoader's cacheKey is undefined", function () {
    const resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
    });

    expect(() => ResourceCache.add(resourceLoader)).toThrowDeveloperError();
  });

  it("add throws if a resource with this cacheKey is already in the cache", function () {
    const cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });

    const resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
      cacheKey: cacheKey,
    });

    ResourceCache.add(resourceLoader);

    expect(() => ResourceCache.add(resourceLoader)).toThrowDeveloperError();
  });

  it("destroys resource when reference count reaches 0", function () {
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

    ResourceCache.add(resourceLoader);

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
    const cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });
    const resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
      cacheKey: cacheKey,
    });

    ResourceCache.add(resourceLoader);

    ResourceCache.unload(resourceLoader);

    expect(function () {
      ResourceCache.unload(resourceLoader);
    }).toThrowDeveloperError();
  });

  it("gets resource", function () {
    const cacheKey = ResourceCacheKey.getSchemaCacheKey({
      resource: schemaResource,
    });
    const resourceLoader = new MetadataSchemaLoader({
      resource: schemaResource,
      cacheKey: cacheKey,
    });

    ResourceCache.add(resourceLoader);

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

  it("gets schema loader", function () {
    const expectedCacheKey = ResourceCacheKey.getSchemaCacheKey({
      schema: schemaJson,
    });
    const schemaLoader = ResourceCache.getSchemaLoader({
      schema: schemaJson,
    });
    const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(schemaLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(schemaLoader).toBeInstanceOf(MetadataSchemaLoader);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.getSchemaLoader({
        schema: schemaJson,
      })
    ).toBe(schemaLoader);

    expect(cacheEntry.referenceCount).toBe(2);
  });

  it("gets embedded buffer loader", function () {
    const expectedCacheKey = ResourceCacheKey.getEmbeddedBufferCacheKey({
      parentResource: bufferParentResource,
      bufferId: 0,
    });
    const bufferLoader = ResourceCache.getEmbeddedBufferLoader({
      parentResource: bufferParentResource,
      bufferId: 0,
      typedArray: bufferTypedArray,
    });
    const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(bufferLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(bufferLoader).toBeInstanceOf(BufferLoader);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.getEmbeddedBufferLoader({
        parentResource: bufferParentResource,
        bufferId: 0,
        typedArray: bufferTypedArray,
      })
    ).toBe(bufferLoader);

    expect(cacheEntry.referenceCount).toBe(2);
  });

  it("getEmbeddedBufferLoader throws if parentResource is undefined", function () {
    expect(() =>
      ResourceCache.getEmbeddedBufferLoader({
        bufferId: 0,
        typedArray: bufferTypedArray,
      })
    ).toThrowDeveloperError();
  });

  it("getEmbeddedBufferLoader throws if bufferId is undefined", function () {
    expect(() =>
      ResourceCache.getEmbeddedBufferLoader({
        parentResource: bufferParentResource,
        typedArray: bufferTypedArray,
      })
    ).toThrowDeveloperError();
  });

  it("getEmbeddedBufferLoader throws if typedArray is undefined", function () {
    expect(() =>
      ResourceCache.getEmbeddedBufferLoader({
        parentResource: bufferParentResource,
        bufferId: 0,
      })
    ).toThrowDeveloperError();
  });

  it("gets external buffer loader", function () {
    const expectedCacheKey = ResourceCacheKey.getExternalBufferCacheKey({
      resource: bufferResource,
    });
    const bufferLoader = ResourceCache.getExternalBufferLoader({
      resource: bufferResource,
    });
    const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(bufferLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(bufferLoader).toBeInstanceOf(BufferLoader);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.getExternalBufferLoader({
        resource: bufferResource,
      })
    ).toBe(bufferLoader);

    expect(cacheEntry.referenceCount).toBe(2);
  });

  it("getExternalBufferLoader throws if resource is undefined", function () {
    expect(() =>
      ResourceCache.getExternalBufferLoader({
        resource: undefined,
      })
    ).toThrowDeveloperError();
  });

  it("gets glTF loader", function () {
    const expectedCacheKey = ResourceCacheKey.getGltfCacheKey({
      gltfResource: gltfResource,
    });
    const gltfJsonLoader = ResourceCache.getGltfJsonLoader({
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });
    const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(gltfJsonLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(gltfJsonLoader).toBeInstanceOf(GltfJsonLoader);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.getGltfJsonLoader({
        gltfResource: gltfResource,
        baseResource: gltfResource,
      })
    ).toBe(gltfJsonLoader);

    expect(cacheEntry.referenceCount).toBe(2);
  });

  it("getGltfJsonLoader throws if gltfResource is undefined", function () {
    expect(() =>
      ResourceCache.getGltfJsonLoader({
        gltfResource: undefined,
        baseResource: gltfResource,
      })
    ).toThrowDeveloperError();
  });

  it("loadGltfJson throws if gltfResource is undefined", function () {
    expect(() =>
      ResourceCache.getGltfJsonLoader({
        gltfResource: gltfResource,
        baseResource: undefined,
      })
    ).toThrowDeveloperError();
  });

  it("gets buffer view loader", function () {
    const expectedCacheKey = ResourceCacheKey.getBufferViewCacheKey({
      gltf: gltfUncompressed,
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });
    const bufferViewLoader = ResourceCache.getBufferViewLoader({
      gltf: gltfUncompressed,
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });
    const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(bufferViewLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(bufferViewLoader).toBeInstanceOf(GltfBufferViewLoader);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.getBufferViewLoader({
        gltf: gltfUncompressed,
        bufferViewId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      })
    ).toBe(bufferViewLoader);

    expect(cacheEntry.referenceCount).toBe(2);
  });

  it("getBufferViewLoader throws if gltf is undefined", function () {
    expect(() =>
      ResourceCache.getBufferViewLoader({
        gltf: undefined,
        bufferViewId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      })
    ).toThrowDeveloperError();
  });

  it("getBufferViewLoader throws if bufferViewId is undefined", function () {
    expect(() =>
      ResourceCache.getBufferViewLoader({
        gltf: gltfUncompressed,
        bufferViewId: undefined,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      })
    ).toThrowDeveloperError();
  });

  it("getBufferViewLoader throws if gltfResource is undefined", function () {
    expect(() =>
      ResourceCache.getBufferViewLoader({
        gltf: gltfUncompressed,
        bufferViewId: 0,
        gltfResource: undefined,
        baseResource: gltfResource,
      })
    ).toThrowDeveloperError();
  });

  it("getBufferViewLoader throws if baseResource is undefined", function () {
    expect(() =>
      ResourceCache.getBufferViewLoader({
        gltf: gltfUncompressed,
        bufferViewId: 0,
        gltfResource: gltfResource,
        baseResource: undefined,
      })
    ).toThrowDeveloperError();
  });

  it("gets draco loader", function () {
    const expectedCacheKey = ResourceCacheKey.getDracoCacheKey({
      gltf: gltfDraco,
      draco: dracoExtension,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });
    const dracoLoader = ResourceCache.getDracoLoader({
      gltf: gltfDraco,
      draco: dracoExtension,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(dracoLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(dracoLoader).toBeInstanceOf(GltfDracoLoader);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.getDracoLoader({
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      })
    ).toBe(dracoLoader);

    expect(cacheEntry.referenceCount).toBe(2);
  });

  it("getDracoLoader throws if gltf is undefined", function () {
    expect(() =>
      ResourceCache.getDracoLoader({
        gltf: undefined,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      })
    ).toThrowDeveloperError();
  });

  it("getDracoLoader throws if draco is undefined", function () {
    expect(() =>
      ResourceCache.getDracoLoader({
        gltf: gltfDraco,
        draco: undefined,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      })
    ).toThrowDeveloperError();
  });

  it("getDracoLoader throws if gltfResource is undefined", function () {
    expect(() =>
      ResourceCache.getDracoLoader({
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: undefined,
        baseResource: gltfResource,
      })
    ).toThrowDeveloperError();
  });

  it("getDracoLoader throws if baseResource is undefined", function () {
    expect(() =>
      ResourceCache.getDracoLoader({
        gltf: gltfDraco,
        draco: dracoExtension,
        gltfResource: gltfResource,
        baseResource: undefined,
      })
    ).toThrowDeveloperError();
  });

  it("gets vertex buffer loader for buffer view", function () {
    const expectedCacheKey = ResourceCacheKey.getVertexBufferCacheKey({
      gltf: gltfUncompressed,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState,
      bufferViewId: 0,
      loadBuffer: true,
    });
    const vertexBufferLoader = ResourceCache.getVertexBufferLoader({
      gltf: gltfUncompressed,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState,
      bufferViewId: 0,
      accessorId: 0,
      loadBuffer: true,
    });

    const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(vertexBufferLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(vertexBufferLoader).toBeInstanceOf(GltfVertexBufferLoader);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.getVertexBufferLoader({
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        bufferViewId: 0,
        loadBuffer: true,
      })
    ).toBe(vertexBufferLoader);

    expect(cacheEntry.referenceCount).toBe(2);
  });

  it("gets vertex buffer loader for draco", function () {
    const expectedCacheKey = ResourceCacheKey.getVertexBufferCacheKey({
      gltf: gltfDraco,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState,
      draco: dracoExtension,
      attributeSemantic: "POSITION",
      loadBuffer: true,
    });
    const vertexBufferLoader = ResourceCache.getVertexBufferLoader({
      gltf: gltfDraco,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState,
      draco: dracoExtension,
      attributeSemantic: "POSITION",
      accessorId: 0,
      loadBuffer: true,
    });

    const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(vertexBufferLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(vertexBufferLoader).toBeInstanceOf(GltfVertexBufferLoader);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.getVertexBufferLoader({
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        draco: dracoExtension,
        attributeSemantic: "POSITION",
        accessorId: 0,
        loadBuffer: true,
      })
    ).toBe(vertexBufferLoader);

    expect(cacheEntry.referenceCount).toBe(2);
  });

  it("gets vertex buffer loaders on different contexts", function () {
    const vertexBufferLoader1 = ResourceCache.getVertexBufferLoader({
      gltf: gltfUncompressed,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState,
      bufferViewId: 0,
      accessorId: 0,
      loadBuffer: true,
    });

    const vertexBufferLoader2 = ResourceCache.getVertexBufferLoader({
      gltf: gltfUncompressed,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState2,
      bufferViewId: 0,
      accessorId: 0,
      loadBuffer: true,
    });

    expect(vertexBufferLoader1).toBeDefined();
    expect(vertexBufferLoader2).toBeDefined();

    expect(vertexBufferLoader1).not.toBe(vertexBufferLoader2);
  });

  it("getVertexBufferLoader throws if gltf is undefined", function () {
    expect(() =>
      ResourceCache.getVertexBufferLoader({
        gltf: undefined,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        bufferViewId: 0,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getVertexBufferLoader throws if gltfResource is undefined", function () {
    expect(() =>
      ResourceCache.getVertexBufferLoader({
        gltf: gltfUncompressed,
        gltfResource: undefined,
        baseResource: gltfResource,
        frameState: mockFrameState,
        bufferViewId: 0,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getVertexBufferLoader throws if baseResource is undefined", function () {
    expect(() =>
      ResourceCache.getVertexBufferLoader({
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: undefined,
        frameState: mockFrameState,
        bufferViewId: 0,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getVertexBufferLoader throws if frameState is undefined", function () {
    expect(() =>
      ResourceCache.getVertexBufferLoader({
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: undefined,
        bufferViewId: 0,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getVertexBufferLoader throws if bufferViewId and draco are both defined", function () {
    expect(() =>
      ResourceCache.getVertexBufferLoader({
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        bufferViewId: 0,
        draco: dracoExtension,
        attributeSemantic: "POSITION",
        accessorId: 0,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getVertexBufferLoader throws if bufferViewId and draco are both undefined", function () {
    expect(() =>
      ResourceCache.getVertexBufferLoader({
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getVertexBufferLoader throws if draco is defined and attributeSemantic is not defined", function () {
    expect(() =>
      ResourceCache.getVertexBufferLoader({
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        draco: dracoExtension,
        attributeSemantic: undefined,
        accessorId: 0,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getVertexBufferLoader throws if draco is defined and accessorId is not defined", function () {
    expect(() =>
      ResourceCache.getVertexBufferLoader({
        gltf: gltfDraco,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        draco: dracoExtension,
        attributeSemantic: "POSITION",
        accessorId: undefined,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getVertexBufferLoader throws if both loadBuffer and loadTypedArray are false", function () {
    expect(() =>
      ResourceCache.getVertexBufferLoader({
        gltf: gltfUncompressed,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        bufferViewId: 0,
        loadBuffer: false,
        loadTypedArray: false,
      })
    ).toThrowDeveloperError();
  });

  it("gets index buffer loader for accessor as buffer", function () {
    const expectedCacheKey = ResourceCacheKey.getIndexBufferCacheKey({
      gltf: gltfUncompressed,
      accessorId: 2,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState,
      loadBuffer: true,
    });
    const indexBufferLoader = ResourceCache.getIndexBufferLoader({
      gltf: gltfUncompressed,
      accessorId: 2,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState,
      loadBuffer: true,
    });

    const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(indexBufferLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(indexBufferLoader).toBeInstanceOf(GltfIndexBufferLoader);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.getIndexBufferLoader({
        gltf: gltfUncompressed,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        loadBuffer: true,
      })
    ).toBe(indexBufferLoader);

    expect(cacheEntry.referenceCount).toBe(2);
  });

  it("loads index buffer from draco", function () {
    const expectedCacheKey = ResourceCacheKey.getIndexBufferCacheKey({
      gltf: gltfDraco,
      accessorId: 2,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState,
      draco: dracoExtension,
      loadBuffer: true,
    });
    const indexBufferLoader = ResourceCache.getIndexBufferLoader({
      gltf: gltfDraco,
      accessorId: 2,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState,
      draco: dracoExtension,
      loadBuffer: true,
    });

    const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(indexBufferLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(indexBufferLoader).toBeInstanceOf(GltfIndexBufferLoader);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.getIndexBufferLoader({
        gltf: gltfDraco,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        draco: dracoExtension,
        loadBuffer: true,
      })
    ).toBe(indexBufferLoader);

    expect(cacheEntry.referenceCount).toBe(2);
  });

  it("gets index buffer loaders on different contexts", function () {
    const indexBufferLoader1 = ResourceCache.getIndexBufferLoader({
      gltf: gltfUncompressed,
      accessorId: 2,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState,
      loadBuffer: true,
    });

    const indexBufferLoader2 = ResourceCache.getIndexBufferLoader({
      gltf: gltfUncompressed,
      accessorId: 2,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState2,
      loadBuffer: true,
    });

    expect(indexBufferLoader1).toBeDefined();
    expect(indexBufferLoader2).toBeDefined();

    expect(indexBufferLoader1).not.toBe(indexBufferLoader2);
  });

  it("getIndexBufferLoader throws if gltf is undefined", function () {
    expect(() =>
      ResourceCache.getIndexBufferLoader({
        gltf: undefined,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getIndexBufferLoader throws if accessorId is undefined", function () {
    expect(() =>
      ResourceCache.getIndexBufferLoader({
        gltf: gltfUncompressed,
        accessorId: undefined,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getIndexBufferLoader throws if gltfResource is undefined", function () {
    expect(() =>
      ResourceCache.getIndexBufferLoader({
        gltf: gltfUncompressed,
        accessorId: 2,
        gltfResource: undefined,
        baseResource: gltfResource,
        frameState: mockFrameState,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getIndexBufferLoader throws if baseResource is undefined", function () {
    expect(() =>
      ResourceCache.getIndexBufferLoader({
        gltf: gltfUncompressed,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: undefined,
        frameState: mockFrameState,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getIndexBufferLoader throws if frameState is undefined", function () {
    expect(() =>
      ResourceCache.getIndexBufferLoader({
        gltf: gltfUncompressed,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: undefined,
        loadBuffer: true,
      })
    ).toThrowDeveloperError();
  });

  it("getIndexBufferLoader throws if both loadBuffer and loadTypedArray are false", function () {
    expect(() =>
      ResourceCache.getIndexBufferLoader({
        gltf: gltfUncompressed,
        accessorId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        loadBuffer: false,
        loadTypedArray: false,
      })
    ).toThrowDeveloperError();
  });

  it("gets image loader", function () {
    const expectedCacheKey = ResourceCacheKey.getImageCacheKey({
      gltf: gltfWithTextures,
      imageId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });
    const imageLoader = ResourceCache.getImageLoader({
      gltf: gltfWithTextures,
      imageId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });
    const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(imageLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(imageLoader).toBeInstanceOf(GltfImageLoader);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.getImageLoader({
        gltf: gltfWithTextures,
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      })
    ).toBe(imageLoader);

    expect(cacheEntry.referenceCount).toBe(2);
  });

  it("getImageLoader throws if gltf is undefined", function () {
    expect(() =>
      ResourceCache.getImageLoader({
        gltf: undefined,
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      })
    ).toThrowDeveloperError();
  });

  it("getImageLoader throws if imageId is undefined", function () {
    expect(() =>
      ResourceCache.getImageLoader({
        gltf: gltfWithTextures,
        imageId: undefined,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      })
    ).toThrowDeveloperError();
  });

  it("getImageLoader throws if gltfResource is undefined", function () {
    expect(() =>
      ResourceCache.getImageLoader({
        gltf: gltfWithTextures,
        imageId: 0,
        gltfResource: undefined,
        baseResource: gltfResource,
      })
    ).toThrowDeveloperError();
  });

  it("getImageLoader throws if baseResource is undefined", function () {
    expect(() =>
      ResourceCache.getImageLoader({
        gltf: gltfWithTextures,
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: undefined,
      })
    ).toThrowDeveloperError();
  });

  it("gets texture loader", function () {
    const expectedCacheKey = ResourceCacheKey.getTextureCacheKey({
      gltf: gltfWithTextures,
      textureInfo: gltfWithTextures.materials[0].emissiveTexture,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      supportedImageFormats: new SupportedImageFormats(),
      frameState: mockFrameState,
    });
    const textureLoader = ResourceCache.getTextureLoader({
      gltf: gltfWithTextures,
      textureInfo: gltfWithTextures.materials[0].emissiveTexture,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState,
      supportedImageFormats: new SupportedImageFormats(),
    });
    const cacheEntry = ResourceCache.cacheEntries[expectedCacheKey];
    expect(textureLoader.cacheKey).toBe(expectedCacheKey);
    expect(cacheEntry.referenceCount).toBe(1);
    expect(textureLoader).toBeInstanceOf(GltfTextureLoader);

    // The existing resource is returned if the computed cache key is the same
    expect(
      ResourceCache.getTextureLoader({
        gltf: gltfWithTextures,
        textureInfo: gltfWithTextures.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        frameState: mockFrameState,
        supportedImageFormats: new SupportedImageFormats(),
      })
    ).toBe(textureLoader);

    expect(cacheEntry.referenceCount).toBe(2);
  });

  it("get texture loaders in different contexts", function () {
    const textureLoader1 = ResourceCache.getTextureLoader({
      gltf: gltfWithTextures,
      textureInfo: gltfWithTextures.materials[0].emissiveTexture,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState,
      supportedImageFormats: new SupportedImageFormats(),
    });

    const textureLoader2 = ResourceCache.getTextureLoader({
      gltf: gltfWithTextures,
      textureInfo: gltfWithTextures.materials[0].emissiveTexture,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      frameState: mockFrameState2,
      supportedImageFormats: new SupportedImageFormats(),
    });

    expect(textureLoader1).toBeDefined();
    expect(textureLoader2).toBeDefined();

    expect(textureLoader1).not.toBe(textureLoader2);
  });

  it("getTextureLoader throws if gltf is undefined", function () {
    expect(() =>
      ResourceCache.getTextureLoader({
        gltf: undefined,
        textureInfo: gltfWithTextures.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
        frameState: mockFrameState,
      })
    ).toThrowDeveloperError();
  });

  it("getTextureLoader throws if textureInfo is undefined", function () {
    expect(() =>
      ResourceCache.getTextureLoader({
        gltf: gltfWithTextures,
        textureInfo: undefined,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
        frameState: mockFrameState,
      })
    ).toThrowDeveloperError();
  });

  it("getTextureLoader throws if gltfResource is undefined", function () {
    expect(() =>
      ResourceCache.getTextureLoader({
        gltf: gltfWithTextures,
        textureInfo: gltfWithTextures.materials[0].emissiveTexture,
        gltfResource: undefined,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
        frameState: mockFrameState,
      })
    ).toThrowDeveloperError();
  });

  it("getTextureLoader throws if baseResource is undefined", function () {
    expect(() =>
      ResourceCache.getTextureLoader({
        gltf: gltfWithTextures,
        textureInfo: gltfWithTextures.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: undefined,
        supportedImageFormats: new SupportedImageFormats(),
        frameState: mockFrameState,
      })
    ).toThrowDeveloperError();
  });

  it("getTextureLoader throws if supportedImageFormats is undefined", function () {
    expect(() =>
      ResourceCache.getTextureLoader({
        gltf: gltfWithTextures,
        textureInfo: gltfWithTextures.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: undefined,
        frameState: mockFrameState,
      })
    ).toThrowDeveloperError();
  });

  it("getTextureLoader throws if frameState is undefined", function () {
    expect(() =>
      ResourceCache.getTextureLoader({
        gltf: gltfWithTextures,
        textureInfo: gltfWithTextures.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
        frameState: undefined,
      })
    ).toThrowDeveloperError();
  });
});
