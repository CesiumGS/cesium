import {
  GltfImageLoader,
  GltfTextureLoader,
  GltfLoaderUtil,
  JobScheduler,
  Resource,
  ResourceCache,
  SupportedImageFormats,
  Texture,
  when,
} from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import waitForLoaderProcess from "../waitForLoaderProcess.js";

describe(
  "Scene/GltfTextureLoader",
  function () {
    var image = new Image();
    image.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

    var imageNpot = new Image();
    imageNpot.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAACAQMAAACnuvRZAAAAA3NCSVQICAjb4U/gAAAABlBMVEUAAAD///+l2Z/dAAAAAnRSTlP/AOW3MEoAAAAJcEhZcwAACxIAAAsSAdLdfvwAAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzQGstOgAAAAFnRFWHRDcmVhdGlvbiBUaW1lADAxLzA0LzE0Kb6O2wAAAAxJREFUCJljeMDwAAADhAHBgGgjpQAAAABJRU5ErkJggg==";

    var gltfUri = "https://example.com/model.glb";
    var gltfResource = new Resource({
      url: gltfUri,
    });

    var gltf = {
      images: [
        {
          uri: "image.png",
        },
      ],
      textures: [
        {
          source: 0,
        },
        {
          source: 0,
          sampler: 0,
        },
        {
          source: 0,
          sampler: 1,
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
          normalTexture: {
            index: 2,
          },
        },
      ],
      samplers: [
        {
          magFilter: 9728, // NEAREST
          minFilter: 9984, // NEAREST_MIPMAP_NEAREST
          wrapS: 10497, // REPEAT
          wrapT: 10497, // REPEAT
        },
        {
          magFilter: 9728, // NEAREST
          minFilter: 9728, // NEAREST
          wrapS: 33071, // CLAMP_TO_EDGE
          wrapT: 33071, // CLAMP_TO_EDGE
        },
      ],
    };

    var gltfKtx2BaseResource = new Resource({
      url: "./Data/Images/",
    });

    var gltfKtx2 = {
      images: [
        {
          uri: "image.png",
        },
        {
          uri: "Green4x4_ETC1S.ktx2",
        },
        {
          uri: "Green4x4Mipmap_ETC1S.ktx2",
        },
      ],
      textures: [
        {
          source: 0,
          sampler: 0,
          extensions: {
            KHR_texture_basisu: {
              source: 1,
            },
          },
        },
        {
          source: 0,
          sampler: 1,
          extensions: {
            KHR_texture_basisu: {
              source: 2,
            },
          },
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
      samplers: [
        {
          magFilter: 9728, // NEAREST
          minFilter: 9984, // NEAREST_MIPMAP_NEAREST
          wrapS: 10497, // REPEAT
          wrapT: 10497, // REPEAT
        },
        {
          magFilter: 9728, // NEAREST
          minFilter: 9728, // NEAREST
          wrapS: 33071, // CLAMP_TO_EDGE
          wrapT: 33071, // CLAMP_TO_EDGE
        },
      ],
    };

    var gltfKtx2MissingMipmap = {
      images: [
        {
          uri: "Green4x4_ETC1S.ktx2",
        },
      ],
      textures: [
        {
          source: 0,
          sampler: 0,
          extensions: {
            KHR_texture_basisu: {
              source: 0,
            },
          },
        },
      ],
      samplers: [
        {
          magFilter: 9728, // NEAREST
          minFilter: 9984, // NEAREST_MIPMAP_NEAREST
          wrapS: 10497, // REPEAT
          wrapT: 10497, // REPEAT
        },
      ],
    };

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

    it("throws if resourceCache is undefined", function () {
      expect(function () {
        return new GltfTextureLoader({
          resourceCache: undefined,
          gltf: gltf,
          imageId: 0,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltf is undefined", function () {
      expect(function () {
        return new GltfTextureLoader({
          resourceCache: ResourceCache,
          gltf: undefined,
          textureInfo: gltf.materials[0].emissiveTexture,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("throws if textureInfo is undefined", function () {
      expect(function () {
        return new GltfTextureLoader({
          resourceCache: ResourceCache,
          gltf: gltf,
          textureInfo: undefined,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("throws if gltfResource is undefined", function () {
      expect(function () {
        return new GltfTextureLoader({
          resourceCache: ResourceCache,
          gltf: gltf,
          textureInfo: gltf.materials[0].emissiveTexture,
          gltfResource: undefined,
          baseResource: gltfResource,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("throws if baseResource is undefined", function () {
      expect(function () {
        return new GltfTextureLoader({
          resourceCache: ResourceCache,
          gltf: gltf,
          textureInfo: gltf.materials[0].emissiveTexture,
          gltfResource: gltfResource,
          baseResource: undefined,
          supportedImageFormats: new SupportedImageFormats(),
        });
      }).toThrowDeveloperError();
    });

    it("throws if supportedImageFormats is undefined", function () {
      expect(function () {
        return new GltfTextureLoader({
          resourceCache: ResourceCache,
          gltf: gltf,
          textureInfo: gltf.materials[0].emissiveTexture,
          gltfResource: gltfResource,
          baseResource: gltfResource,
          supportedImageFormats: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("rejects promise if image fails to load", function () {
      var error = new Error("404 Not Found");
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.reject(error)
      );

      var textureLoader = new GltfTextureLoader({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: gltf.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      textureLoader.load();

      return textureLoader.promise
        .then(function (textureLoader) {
          fail();
        })
        .otherwise(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load texture\nFailed to load image: image.png\n404 Not Found"
          );
        });
    });

    it("loads texture", function () {
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(image)
      );

      // Simulate JobScheduler not being ready for a few frames
      var processCallsTotal = 3;
      var processCallsCount = 0;
      var jobScheduler = scene.frameState.jobScheduler;
      var originalJobSchedulerExecute = jobScheduler.execute;
      spyOn(JobScheduler.prototype, "execute").and.callFake(function (
        job,
        jobType
      ) {
        if (processCallsCount++ >= processCallsTotal) {
          return originalJobSchedulerExecute.call(jobScheduler, job, jobType);
        }
        return false;
      });

      var textureLoader = new GltfTextureLoader({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: gltf.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      textureLoader.process(scene.frameState); // Check that calling process before load doesn't break anything

      textureLoader.load();

      return waitForLoaderProcess(textureLoader, scene).then(function (
        textureLoader
      ) {
        textureLoader.process(scene.frameState); // Check that calling process after load doesn't break anything
        expect(textureLoader.texture.width).toBe(1);
        expect(textureLoader.texture.height).toBe(1);
      });
    });

    it("creates texture synchronously", function () {
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(image)
      );

      var textureLoader = new GltfTextureLoader({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: gltf.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
        asynchronous: false,
      });

      textureLoader.load();

      return waitForLoaderProcess(textureLoader, scene).then(function (
        textureLoader
      ) {
        textureLoader.process(scene.frameState); // Check that calling process after load doesn't break anything
        expect(textureLoader.texture.width).toBe(1);
        expect(textureLoader.texture.height).toBe(1);
      });
    });

    it("loads KTX2/Basis texture", function () {
      if (!scene.context.supportsBasis) {
        return;
      }

      var gl = scene.context._gl;
      spyOn(gl, "compressedTexImage2D").and.callThrough();

      var textureLoader = new GltfTextureLoader({
        resourceCache: ResourceCache,
        gltf: gltfKtx2,
        textureInfo: gltf.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfKtx2BaseResource,
        supportedImageFormats: new SupportedImageFormats({
          basis: true,
        }),
      });

      textureLoader.load();

      return waitForLoaderProcess(textureLoader, scene).then(function (
        textureLoader
      ) {
        expect(textureLoader.texture.width).toBe(4);
        expect(textureLoader.texture.height).toBe(4);
        expect(gl.compressedTexImage2D.calls.count()).toEqual(1);
      });
    });

    it("loads KTX2/Basis texture with mipmap", function () {
      if (!scene.context.supportsBasis) {
        return;
      }

      var gl = scene.context._gl;
      spyOn(gl, "compressedTexImage2D").and.callThrough();

      var textureLoader = new GltfTextureLoader({
        resourceCache: ResourceCache,
        gltf: gltfKtx2,
        textureInfo: gltf.materials[0].occlusionTexture,
        gltfResource: gltfResource,
        baseResource: gltfKtx2BaseResource,
        supportedImageFormats: new SupportedImageFormats({
          basis: true,
        }),
      });

      textureLoader.load();

      return waitForLoaderProcess(textureLoader, scene).then(function (
        textureLoader
      ) {
        expect(textureLoader.texture.width).toBe(4);
        expect(textureLoader.texture.height).toBe(4);
        expect(gl.compressedTexImage2D.calls.count()).toEqual(3);
      });
    });

    it("createTexture() calls createSampler() with compressedTextureNoMipmap = true", function () {
      if (!scene.context.supportsBasis) {
        return;
      }

      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(image)
      );
      spyOn(GltfLoaderUtil, "createSampler").and.callThrough();
      var textureLoader = new GltfTextureLoader({
        resourceCache: ResourceCache,
        gltf: gltfKtx2MissingMipmap,
        textureInfo: gltf.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfKtx2BaseResource,
        supportedImageFormats: new SupportedImageFormats({
          basis: true,
        }),
        asynchronous: false,
      });

      textureLoader.load();

      return waitForLoaderProcess(textureLoader, scene).then(function (
        textureLoader
      ) {
        expect(GltfLoaderUtil.createSampler).toHaveBeenCalledWith({
          gltf: gltfKtx2MissingMipmap,
          textureInfo: gltf.materials[0].emissiveTexture,
          compressedTextureNoMipmap: true,
        });
      });
    });

    it("generates mipmap if sampler requires it", function () {
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(image)
      );

      var generateMipmap = spyOn(
        Texture.prototype,
        "generateMipmap"
      ).and.callThrough();

      var textureLoader = new GltfTextureLoader({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: gltf.materials[0].occlusionTexture, // This texture has a sampler that require a mipmap
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      textureLoader.load();

      return waitForLoaderProcess(textureLoader, scene).then(function (
        textureLoader
      ) {
        expect(textureLoader.texture.width).toBe(1);
        expect(textureLoader.texture.height).toBe(1);
        expect(generateMipmap).toHaveBeenCalled();
      });
    });

    it("generates power-of-two texture if sampler requires it", function () {
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(imageNpot)
      );

      var textureLoader = new GltfTextureLoader({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: gltf.materials[0].occlusionTexture, // This texture has a sampler that require power-of-two texture
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      textureLoader.load();

      return waitForLoaderProcess(textureLoader, scene).then(function (
        textureLoader
      ) {
        expect(textureLoader.texture.width).toBe(4);
        expect(textureLoader.texture.height).toBe(2);
      });
    });

    it("does not generate power-of-two texture if sampler does not require it", function () {
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(imageNpot)
      );

      var textureLoader = new GltfTextureLoader({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: gltf.materials[0].normalTexture, // This texture has a sampler that does not require power-of-two texture
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      textureLoader.load();

      return waitForLoaderProcess(textureLoader, scene).then(function (
        textureLoader
      ) {
        expect(textureLoader.texture.width).toBe(3);
        expect(textureLoader.texture.height).toBe(2);
      });
    });

    it("destroys texture loader", function () {
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.resolve(image)
      );

      var unloadImage = spyOn(
        GltfImageLoader.prototype,
        "unload"
      ).and.callThrough();

      var destroyTexture = spyOn(
        Texture.prototype,
        "destroy"
      ).and.callThrough();

      var textureLoader = new GltfTextureLoader({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: gltf.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      expect(textureLoader.texture).not.toBeDefined();

      textureLoader.load();

      return waitForLoaderProcess(textureLoader, scene).then(function (
        textureLoader
      ) {
        expect(textureLoader.texture).toBeDefined();
        expect(textureLoader.isDestroyed()).toBe(false);

        textureLoader.destroy();

        expect(textureLoader.texture).not.toBeDefined();
        expect(textureLoader.isDestroyed()).toBe(true);
        expect(unloadImage).toHaveBeenCalled();
        expect(destroyTexture).toHaveBeenCalled();
      });
    });

    function resolveImageAfterDestroy(reject) {
      var deferredPromise = when.defer();
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        deferredPromise.promise
      );

      // Load a copy of the image into the cache so that the image
      // promise resolves even if the texture loader is destroyed
      var imageLoaderCopy = ResourceCache.loadImage({
        gltf: gltf,
        imageId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      var textureLoader = new GltfTextureLoader({
        resourceCache: ResourceCache,
        gltf: gltf,
        textureInfo: gltf.materials[0].emissiveTexture,
        gltfResource: gltfResource,
        baseResource: gltfResource,
        supportedImageFormats: new SupportedImageFormats(),
      });

      expect(textureLoader.texture).not.toBeDefined();

      textureLoader.load();
      textureLoader.destroy();

      if (reject) {
        deferredPromise.reject(new Error());
      } else {
        deferredPromise.resolve(image);
      }

      expect(textureLoader.texture).not.toBeDefined();
      expect(textureLoader.isDestroyed()).toBe(true);

      ResourceCache.unload(imageLoaderCopy);
    }

    it("handles resolving image after destroy", function () {
      resolveImageAfterDestroy(false);
    });

    it("handles rejecting image after destroy", function () {
      resolveImageAfterDestroy(true);
    });
  },
  "WebGL"
);
