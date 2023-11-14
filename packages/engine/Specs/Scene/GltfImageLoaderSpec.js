import {
  BufferLoader,
  clone,
  CompressedTextureBuffer,
  GltfBufferViewLoader,
  GltfImageLoader,
  FeatureDetection,
  Resource,
  ResourceCache,
  RuntimeError,
} from "../../index.js";
import createContext from "../../../../Specs/createContext.js";
import dataUriToBuffer from "../../../../Specs/dataUriToBuffer.js";

describe(
  "Scene/GltfImageLoader",
  function () {
    const image = new Image();
    image.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

    const pngBuffer = dataUriToBuffer(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
    );
    const jpgBuffer = dataUriToBuffer(
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAJgABAAAAAAAAAAAAAAAAAAAAAxABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAAPwBH/9k"
    );

    const webpBuffer = dataUriToBuffer(
      "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA"
    );

    const gifBuffer = dataUriToBuffer(
      "data:image/gif;base64,R0lGODdhBAAEAIAAAP///////ywAAAAABAAEAAACBISPCQUAOw=="
    );

    let ktx2BasisBuffer;
    let ktx2BasisMipmapBuffer;

    const gltfUri = "https://example.com/model.glb";
    const gltfResource = new Resource({
      url: gltfUri,
    });

    const gltf = {
      buffers: [
        {
          uri: "external.bin",
          byteLength: 0, // updated in getGltf
        },
      ],
      bufferViews: [
        {
          buffer: 0,
          byteOffset: 0,
          byteLength: 0, // updated in getGltf
        },
      ],
      images: [
        {
          mimeType: "image/png",
          bufferView: 0,
        },
        {
          uri: "image.png",
        },
        {
          mimeType: "image/ktx2",
          bufferView: 0,
        },
        {
          uri: "image.ktx2",
        },
      ],
    };

    let context;

    function getGltf(imageBuffer) {
      const clonedGltf = clone(gltf, true);
      clonedGltf.buffers[0].byteLength = imageBuffer.byteLength;
      clonedGltf.bufferViews[0].byteLength = imageBuffer.byteLength;
      return clonedGltf;
    }

    beforeAll(function () {
      context = createContext();
      const ktx2BasisBufferPromise = Resource.fetchArrayBuffer({
        url: "./Data/Images/Green4x4_ETC1S.ktx2",
      }).then(function (arrayBuffer) {
        ktx2BasisBuffer = new Uint8Array(arrayBuffer);
      });
      const ktx2BasisMipmapBufferPromise = Resource.fetchArrayBuffer({
        url: "./Data/Images/Green4x4Mipmap_ETC1S.ktx2",
      }).then(function (arrayBuffer) {
        ktx2BasisMipmapBuffer = new Uint8Array(arrayBuffer);
      });

      return Promise.all([
        ktx2BasisBufferPromise,
        ktx2BasisMipmapBufferPromise,
      ]);
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    afterEach(function () {
      ResourceCache.clearForSpecs();
    });

    it("throws if resourceCache is undefined", function () {
      expect(function () {
        return new GltfImageLoader({
          resourceCache: undefined,
          gltf: gltf,
          imageId: 0,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltf is undefined", function () {
      expect(function () {
        return new GltfImageLoader({
          resourceCache: ResourceCache,
          gltf: undefined,
          imageId: 0,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("throws if imageId is undefined", function () {
      expect(function () {
        return new GltfImageLoader({
          resourceCache: ResourceCache,
          gltf: gltf,
          imageId: undefined,
          gltfResource: gltfResource,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltfResource is undefined", function () {
      expect(function () {
        return new GltfImageLoader({
          resourceCache: ResourceCache,
          gltf: gltf,
          imageId: 0,
          gltfResource: undefined,
          baseResource: gltfResource,
        });
      }).toThrowDeveloperError();
    });

    it("throws if baseResource is undefined", function () {
      expect(function () {
        return new GltfImageLoader({
          resourceCache: ResourceCache,
          gltf: gltf,
          imageId: 0,
          gltfResource: gltfResource,
          baseResource: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("load throws if buffer view fails to load", async function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        const error = new Error("404 Not Found");
        return Promise.reject(error);
      });

      const imageLoader = new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: getGltf(pngBuffer),
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      await expectAsync(imageLoader.load()).toBeRejectedWithError(
        RuntimeError,
        "Failed to load embedded image\nFailed to load buffer view\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
      );
    });

    it("load throws if image format is not recognized", async function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(gifBuffer)
      );

      const imageLoader = new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: getGltf(gifBuffer),
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      await expectAsync(imageLoader.load()).toBeRejectedWithError(
        RuntimeError,
        "Failed to load embedded image\nImage format is not recognized"
      );
    });

    it("load throws if uri fails to load", async function () {
      spyOn(Resource.prototype, "fetchImage").and.callFake(function () {
        const error = new Error("404 Not Found");
        return Promise.reject(error);
      });

      const imageLoader = new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: getGltf(pngBuffer),
        imageId: 1,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      await expectAsync(imageLoader.load()).toBeRejectedWithError(
        RuntimeError,
        "Failed to load image: image.png\n404 Not Found"
      );
    });

    async function loadsFromBufferView(imageBuffer) {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(imageBuffer)
      );

      const imageLoader = new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: getGltf(imageBuffer),
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      await imageLoader.load();

      expect(imageLoader.image.width).toBe(1);
      expect(imageLoader.image.height).toBe(1);
    }

    it("loads PNG from buffer view", function () {
      return loadsFromBufferView(pngBuffer);
    });

    it("loads JPEG from buffer view", function () {
      return loadsFromBufferView(jpgBuffer);
    });

    it("loads WebP from buffer view", async function () {
      await FeatureDetection.supportsWebP.initialize();

      if (!FeatureDetection.supportsWebP()) {
        return;
      }

      return loadsFromBufferView(webpBuffer);
    });

    it("loads KTX2/Basis from buffer view", async function () {
      if (!context.supportsBasis) {
        return;
      }

      spyOn(BufferLoader, "_fetchArrayBuffer").and.returnValue(
        Promise.resolve(ktx2BasisBuffer)
      );

      const imageLoader = new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: getGltf(ktx2BasisBuffer),
        imageId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      await imageLoader.load();

      expect(imageLoader.image instanceof CompressedTextureBuffer).toBe(true);
      expect(imageLoader.image.width).toBe(4);
      expect(imageLoader.image.height).toBe(4);
      expect(imageLoader.mipLevels).toBeUndefined();
    });

    it("loads KTX2/Basis with mipmap from buffer view", async function () {
      if (!context.supportsBasis) {
        return;
      }

      spyOn(BufferLoader, "_fetchArrayBuffer").and.returnValue(
        Promise.resolve(ktx2BasisMipmapBuffer)
      );

      const imageLoader = new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: getGltf(ktx2BasisMipmapBuffer),
        imageId: 2,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      await imageLoader.load();

      expect(imageLoader.image).toBeInstanceOf(CompressedTextureBuffer);
      expect(imageLoader.image.width).toBe(4);
      expect(imageLoader.image.height).toBe(4);
      expect(imageLoader.mipLevels.length).toBe(2);
    });

    it("loads from uri", async function () {
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        Promise.resolve(image)
      );

      const imageLoader = new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: clone(gltf, true),
        imageId: 1,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      await imageLoader.load();

      expect(imageLoader.image.width).toBe(1);
      expect(imageLoader.image.height).toBe(1);
    });

    it("loads KTX2/Basis from uri ", async function () {
      if (!context.supportsBasis) {
        return;
      }

      const baseResource = new Resource({
        url: "./Data/Images/",
      });

      const clonedGltf = clone(gltf, true);
      clonedGltf.images[3].uri = "Green4x4_ETC1S.ktx2";

      const imageLoader = new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: clonedGltf,
        imageId: 3,
        gltfResource: gltfResource,
        baseResource: baseResource,
      });

      await imageLoader.load();

      expect(imageLoader.image).toBeInstanceOf(CompressedTextureBuffer);
      expect(imageLoader.image.width).toBe(4);
      expect(imageLoader.image.height).toBe(4);
      expect(imageLoader.mipLevels).toBeUndefined();
    });

    it("match the ktx2 url with the ktx2Regex", function () {
      const ktx2Regex = /(^data:image\/ktx2)|(\.ktx2$)/i;
      const r = new Resource({
        url: "../../textures/test.ktx2",
        queryParameters: {
          v: "123-435-456-000",
        },
      });
      const uri = r.getUrlComponent(false, true);
      expect(ktx2Regex.test(uri)).toBe(true);
    });

    it("destroys image loader", async function () {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(pngBuffer)
      );

      const unloadBufferView = spyOn(
        GltfBufferViewLoader.prototype,
        "unload"
      ).and.callThrough();

      const imageLoader = new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: getGltf(pngBuffer),
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });
      expect(imageLoader.image).not.toBeDefined();

      await imageLoader.load();

      expect(imageLoader.image).toBeDefined();
      expect(imageLoader.isDestroyed()).toBe(false);

      imageLoader.destroy();

      expect(imageLoader.image).not.toBeDefined();
      expect(imageLoader.isDestroyed()).toBe(true);
      expect(unloadBufferView).toHaveBeenCalled();
    });

    async function resolveBufferViewAfterDestroy(rejectPromise) {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(
        () =>
          new Promise(function (resolve, reject) {
            if (rejectPromise) {
              reject(new Error());
            } else {
              resolve(pngBuffer);
            }
          })
      );

      const imageLoader = new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: getGltf(pngBuffer),
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      expect(imageLoader.image).not.toBeDefined();

      const loadPromise = imageLoader.load();
      imageLoader.destroy();

      await expectAsync(loadPromise).toBeResolved();

      expect(imageLoader.image).not.toBeDefined();
      expect(imageLoader.isDestroyed()).toBe(true);
    }

    it("handles resolving buffer view after destroy", function () {
      return resolveBufferViewAfterDestroy(false);
    });

    it("handles rejecting buffer view after destroy", function () {
      return resolveBufferViewAfterDestroy(true);
    });

    async function resolveImageFromTypedArrayAfterDestroy(rejectPromise) {
      spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
        Promise.resolve(pngBuffer)
      );

      spyOn(GltfImageLoader, "_loadImageFromTypedArray").and.callFake(
        () =>
          new Promise(function (resolve, reject) {
            if (rejectPromise) {
              reject(new Error());
            } else {
              resolve(image);
            }
          })
      );

      const imageLoader = new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: getGltf(pngBuffer),
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      expect(imageLoader.image).not.toBeDefined();

      const loadPromise = imageLoader.load();
      imageLoader.destroy();

      await expectAsync(loadPromise).toBeResolved();
      expect(imageLoader.image).not.toBeDefined();
      expect(imageLoader.isDestroyed()).toBe(true);
    }

    it("handles resolving image from typed array after destroy", function () {
      return resolveImageFromTypedArrayAfterDestroy(false);
    });

    it("handles rejecting image from typed array after destroy", function () {
      return resolveImageFromTypedArrayAfterDestroy(true);
    });

    async function resolveUriAfterDestroy(rejectPromise) {
      spyOn(Resource.prototype, "fetchImage").and.callFake(
        () =>
          new Promise(function (resolve, reject) {
            if (rejectPromise) {
              reject(new Error());
            } else {
              resolve(image);
            }
          })
      );

      const imageLoader = new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: getGltf(pngBuffer),
        imageId: 1,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      expect(imageLoader.image).not.toBeDefined();

      const loadPromise = imageLoader.load();
      imageLoader.destroy();

      await expectAsync(loadPromise).toBeResolved();

      expect(imageLoader.image).not.toBeDefined();
      expect(imageLoader.isDestroyed()).toBe(true);
    }

    it("handles resolving uri after destroy", function () {
      return resolveUriAfterDestroy(false);
    });

    it("handles rejecting uri after destroy", function () {
      return resolveUriAfterDestroy(true);
    });
  },
  "WebGL"
);
