import {
  GltfTextureLoader,
  Resource,
  ResourceCache,
  SupportedImageFormats,
  defined,
  GltfMeshPrimitiveGpmLoader,
} from "../../../../../index.js";
import createScene from "../../../../../../../Specs/createScene.js";
import loaderProcess from "../../../../../../../Specs/loaderProcess.js";
import waitForLoaderProcess from "../../../../../../../Specs/waitForLoaderProcess.js";

/**
 * The JSON representation of the NGA_gpm_local extension object
 * that will be inserted into the mesh primitive
 */
const ngaGpmLocalExtension = {
  ppeTextures: [
    {
      traits: {
        source: "SIGZ",
        min: 0.0,
        max: 16.0,
      },
      index: 0,
      noData: 255,
      offset: 0.0,
      scale: 0.06274509803921569,
      texCoord: 0,
    },
  ],
};

/**
 * Creates an embedded glTF with a single mesh primitive.
 *
 * The mesh primitive is a single unit square with normals and texture
 * coordinates in [(0,0)-(1.1)]. The glTF defines a single texture,
 * with an image that is stored as an embdedded 16x16 PNG file
 * where the red channel contains values in [0,256] (and the alpha
 * channels contains 255).
 *
 * If the given 'gpmExtension' object is defined, then it will be
 * inserted as the "NGA_gpm_local" extension in the mesh primitive,
 * and "NGA_gpm_local" will be added to the 'extensionsUsed'.
 *
 * @param {object} gpmExtension The NGA_gpm_local extension JSON object
 * @returns The glTF
 */
function createEmbeddedGltf(gpmExtension) {
  let meshPrimitiveExtensions;
  let extensionsUsed;

  if (defined(gpmExtension)) {
    meshPrimitiveExtensions = {
      NGA_gpm_local: gpmExtension,
    };
    extensionsUsed = ["NGA_gpm_local"];
  }

  const gltf = {
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5123,
        count: 6,
        type: "SCALAR",
        max: [3],
        min: [0],
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126,
        count: 4,
        type: "VEC3",
        max: [1.0, 1.0, 0.0],
        min: [0.0, 0.0, 0.0],
      },
      {
        bufferView: 1,
        byteOffset: 48,
        componentType: 5126,
        count: 4,
        type: "VEC3",
        max: [0.0, 0.0, 1.0],
        min: [0.0, 0.0, 1.0],
      },
      {
        bufferView: 1,
        byteOffset: 96,
        componentType: 5126,
        count: 4,
        type: "VEC2",
        max: [1.0, 1.0],
        min: [0.0, 0.0],
      },
    ],
    asset: {
      generator: "JglTF from https://github.com/javagl/JglTF",
      version: "2.0",
    },
    buffers: [
      {
        uri: "data:application/gltf-buffer;base64,AAABAAIAAQADAAIAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAA",
        byteLength: 156,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 12,
        target: 34963,
      },
      {
        buffer: 0,
        byteOffset: 12,
        byteLength: 144,
        byteStride: 12,
        target: 34962,
      },
    ],
    images: [
      {
        uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABs0lEQVR42hXMUwCWBwBA0b8Wlo1lLHNt2a4tLZtbrdZatm1jWcu2bSxrtWq1Zds438O5jzcUCoU+hSEsXxCO8EQgIl8SichEISrRiE4MQjElFrGJQ1ziEZ8EJOQrEpGYJCQlGcmDQQpJSSpS8zVpSEs60pOBjGQiM1nISrZgkF2+IQff8h05yUVu8pCXfOSnAAUpROFgUESKUozilKAkpShNGcryPT9QjvJUoGIwqCQ/UpkqVKUa1alBTWpRmzrUpR71aRAMGkojGtOEn/iZpjTjF5rTgl9pyW+04vdg0Fra0JZ2tKcDHelEZ7rQlW50pwc96RUMeksf+tKP/gxgIIMYzBCGMozhjGAko4LBaBnDWMYxnglMZBJ/MJkpTGUa05nBzGAwS2Yzh7n8yTzms4CFLGIxS1jKMpazIhislFWsZg1rWcd6NrCRTWxmC1vZxnZ2BIOdsovd7GEv+9jPAQ5yiMMc4Sh/cYzjweCEnOQUpznDWc5xngv8zUUu8Q+XucLVYPCvXOM6//E/N7jJLW5zh7vc4z4PeMijYPBYnvCUZzznBS95xWve8JZ3vOcDH/nEZ7gvfpBCxLDKAAAAAElFTkSuQmCC",
        mimeType: "image/png",
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 1,
              NORMAL: 2,
              TEXCOORD_0: 3,
            },
            indices: 0,
            mode: 4,
            extensions: meshPrimitiveExtensions,
          },
        ],
      },
    ],
    nodes: [
      {
        mesh: 0,
      },
    ],
    samplers: [
      {
        magFilter: 9728,
        minFilter: 9728,
        wrapS: 33071,
        wrapT: 33071,
      },
    ],
    scene: 0,
    scenes: [
      {
        nodes: [0],
      },
    ],
    textures: [
      {
        sampler: 0,
        source: 0,
      },
    ],
    extensionsUsed: extensionsUsed,
  };
  return gltf;
}

// NOTE: Much of this was taken from 'GltfSructuralMetadataLoaderSpec.js'.
// I don't know what things like the 'mockFrameState' are.
// I don't know how much of the 'Resource'-specific testing belongs here.
// I don't know what 'resolveAfterDestroy' is actually testing.
// Otherwise, I would have added comments...
describe(
  "Scene/Model/Extensions/Gpm/GltfMeshPrimitiveGpmLoader",
  function () {
    const gltfUri = "https://example.com/model.glb";
    const gltfResource = new Resource({
      url: gltfUri,
    });

    const mockFrameState = {
      context: {
        id: "01234",
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

    it("throws if gltf is undefined", function () {
      const extension = undefined;
      const gltf = undefined;

      expect(function () {
        return new GltfMeshPrimitiveGpmLoader({
          gltf: gltf,
          extension: extension,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
          frameState: mockFrameState,
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltfResource is undefined", function () {
      const extension = undefined;
      const gltf = undefined;

      expect(function () {
        return new GltfMeshPrimitiveGpmLoader({
          gltf: gltf,
          extension: extension,
          gltfResource: undefined,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
          frameState: mockFrameState,
        });
      }).toThrowDeveloperError();
    });

    it("throws if baseResource is undefined", function () {
      const extension = undefined;
      const gltf = undefined;

      expect(function () {
        return new GltfMeshPrimitiveGpmLoader({
          gltf: gltf,
          extension: extension,
          gltfResource: gltfResource,
          baseResource: undefined,
          supportedImageFormats: new SupportedImageFormats(),
          frameState: mockFrameState,
        });
      }).toThrowDeveloperError();
    });

    it("throws if supportedImageFormats is undefined", function () {
      const extension = undefined;
      const gltf = undefined;

      expect(function () {
        return new GltfMeshPrimitiveGpmLoader({
          gltf: gltf,
          extension: extension,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: undefined,
          frameState: mockFrameState,
        });
      }).toThrowDeveloperError();
    });

    it("throws if frameState is undefined", function () {
      const extension = undefined;
      const gltf = undefined;

      expect(function () {
        return new GltfMeshPrimitiveGpmLoader({
          gltf: gltf,
          extension: extension,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
          frameState: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("loads mesh primitive GPM extension data", async function () {
      const extension = ngaGpmLocalExtension;
      const gltf = createEmbeddedGltf(extension);

      const loader = new GltfMeshPrimitiveGpmLoader({
        gltf: gltf,
        extension: extension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
        frameState: mockFrameState,
      });

      await loader.load();
      await waitForLoaderProcess(loader, scene);
      expect(() => loaderProcess(loader, scene)).not.toThrow();

      const gpmData = loader.meshPrimitiveGpmLocal;
      expect(gpmData).toBeDefined();

      const ppeTextures = gpmData.ppeTextures;
      expect(ppeTextures).toBeDefined();
      expect(ppeTextures.length).toBe(1);

      const ppeTexture = ppeTextures[0];
      expect(ppeTexture.index).toBe(0);
      expect(ppeTexture.texCoord).toBe(0);
      expect(ppeTexture.noData).toBe(255);
      expect(ppeTexture.offset).toBe(0.0);
      expect(ppeTexture.scale).toBe(0.06274509803921569);

      expect(ppeTexture.traits).toBeDefined();

      const traits = ppeTexture.traits;
      expect(traits.min).toBe(0);
      expect(traits.max).toBe(16);
      expect(traits.source).toBe("SIGZ");
    });

    it("converts mesh primitive GPM extension data into structural metadata", async function () {
      const extension = ngaGpmLocalExtension;
      const gltf = createEmbeddedGltf(extension);

      const loader = new GltfMeshPrimitiveGpmLoader({
        gltf: gltf,
        extension: extension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
        frameState: mockFrameState,
      });

      await loader.load();
      await waitForLoaderProcess(loader, scene);
      expect(() => loaderProcess(loader, scene)).not.toThrow();

      const structuralMetadata = loader.structuralMetadata;
      expect(structuralMetadata).toBeDefined();

      const ppePropertyTexture = structuralMetadata.getPropertyTexture(0);
      expect(ppePropertyTexture.id).toBe(0);

      const sigzProperty = ppePropertyTexture.getProperty("SIGZ");

      expect(sigzProperty.textureReader.texture.width).toBe(16);
      expect(sigzProperty.textureReader.texture.height).toBe(16);
    });

    it("destroys structural metadata", async function () {
      const extension = ngaGpmLocalExtension;
      const gltf = createEmbeddedGltf(extension);

      const destroyTexture = spyOn(
        GltfTextureLoader.prototype,
        "destroy",
      ).and.callThrough();

      const loader = new GltfMeshPrimitiveGpmLoader({
        gltf: gltf,
        extension: extension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
        frameState: mockFrameState,
      });

      await loader.load();

      await waitForLoaderProcess(loader, scene);
      expect(loader.structuralMetadata).toBeDefined();
      expect(loader.isDestroyed()).toBe(false);

      loader.destroy();

      expect(loader.structuralMetadata).not.toBeDefined();
      expect(loader.isDestroyed()).toBe(true);

      expect(destroyTexture.calls.count()).toBe(1);
    });

    async function resolveAfterDestroy(rejectPromise) {
      const extension = ngaGpmLocalExtension;
      const gltf = createEmbeddedGltf(extension);

      const destroyTexture = spyOn(
        GltfTextureLoader.prototype,
        "destroy",
      ).and.callThrough();

      const loader = new GltfMeshPrimitiveGpmLoader({
        gltf: gltf,
        extension: extension,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
        frameState: mockFrameState,
      });
      expect(loader.structuralMetadata).not.toBeDefined();
      const promise = loader.load();
      loader.destroy();

      expect(loader.structuralMetadata).not.toBeDefined();
      expect(loader.isDestroyed()).toBe(true);

      expect(destroyTexture.calls.count()).toBe(1);
      await expectAsync(promise).toBeResolved();
    }

    it("handles resolving resources after destroy", function () {
      return resolveAfterDestroy(false);
    });

    it("handles rejecting resources after destroy", function () {
      return resolveAfterDestroy(true);
    });
  },
  "WebGL",
);
