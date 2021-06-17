import {
  clone,
  GltfBufferViewLoader,
  GltfImageLoader,
  FeatureDetection,
  Resource,
  ResourceCache,
  SupportedImageFormats,
  when,
} from "../../Source/Cesium.js";
import dataUriToBuffer from "../dataUriToBuffer.js";
import pollToPromise from "../pollToPromise.js";

describe("Scene/GltfImageLoader", function () {
  var image = new Image();
  image.src =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

  var pngBuffer = dataUriToBuffer(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
  );
  var jpgBuffer = dataUriToBuffer(
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAJgABAAAAAAAAAAAAAAAAAAAAAxABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAAPwBH/9k"
  );

  var webpBuffer = dataUriToBuffer(
    "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA"
  );

  var gifBuffer = dataUriToBuffer(
    "data:image/gif;base64,R0lGODdhBAAEAIAAAP///////ywAAAAABAAEAAACBISPCQUAOw=="
  );

  var gltfUri = "https://example.com/model.glb";
  var gltfResource = new Resource({
    url: gltfUri,
  });

  var gltf = {
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
    ],
  };

  function getGltf(imageBuffer) {
    var clonedGltf = clone(gltf, true);
    clonedGltf.buffers[0].byteLength = imageBuffer.byteLength;
    clonedGltf.bufferViews[0].byteLength = imageBuffer.byteLength;
    return clonedGltf;
  }

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
        supportedImageFormats: new SupportedImageFormats(),
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
        supportedImageFormats: new SupportedImageFormats(),
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
        supportedImageFormats: new SupportedImageFormats(),
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
        supportedImageFormats: new SupportedImageFormats(),
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
        supportedImageFormats: new SupportedImageFormats(),
      });
    }).toThrowDeveloperError();
  });

  it("throws if supportedImageFormats is undefined", function () {
    expect(function () {
      return new GltfImageLoader({
        resourceCache: ResourceCache,
        gltf: gltf,
        imageId: 0,
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

    var imageLoader = new GltfImageLoader({
      resourceCache: ResourceCache,
      gltf: getGltf(pngBuffer),
      imageId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      supportedImageFormats: new SupportedImageFormats(),
    });

    imageLoader.load();

    return imageLoader.promise
      .then(function (imageLoader) {
        fail();
      })
      .otherwise(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load embedded image\nFailed to load buffer view\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
        );
      });
  });

  it("rejects promise if image format is not recognized", function () {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(gifBuffer)
    );

    var imageLoader = new GltfImageLoader({
      resourceCache: ResourceCache,
      gltf: getGltf(gifBuffer),
      imageId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      supportedImageFormats: new SupportedImageFormats(),
    });

    imageLoader.load();

    return imageLoader.promise
      .then(function (imageLoader) {
        fail();
      })
      .otherwise(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load embedded image\nImage format is not recognized"
        );
      });
  });

  it("rejects promise if uri fails to load", function () {
    var error = new Error("404 Not Found");
    spyOn(Resource.prototype, "fetchImage").and.returnValue(when.reject(error));

    var imageLoader = new GltfImageLoader({
      resourceCache: ResourceCache,
      gltf: getGltf(pngBuffer),
      imageId: 1,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      supportedImageFormats: new SupportedImageFormats(),
    });

    imageLoader.load();

    return imageLoader.promise
      .then(function (imageLoader) {
        fail();
      })
      .otherwise(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load image: image.png\n404 Not Found"
        );
      });
  });

  function loadsFromBufferView(imageBuffer) {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(imageBuffer)
    );

    var imageLoader = new GltfImageLoader({
      resourceCache: ResourceCache,
      gltf: getGltf(imageBuffer),
      imageId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      supportedImageFormats: new SupportedImageFormats(),
    });

    imageLoader.load();

    return imageLoader.promise.then(function (imageLoader) {
      expect(imageLoader.image.width).toBe(1);
      expect(imageLoader.image.height).toBe(1);
    });
  }

  it("loads PNG from buffer view", function () {
    return loadsFromBufferView(pngBuffer);
  });

  it("loads JPEG from buffer view", function () {
    return loadsFromBufferView(jpgBuffer);
  });

  it("loads WebP from buffer view", function () {
    return pollToPromise(function () {
      FeatureDetection.supportsWebP.initialize();
      return FeatureDetection.supportsWebP.initialized;
    }).then(function () {
      if (!FeatureDetection.supportsWebP()) {
        return;
      }
      return loadsFromBufferView(webpBuffer);
    });
  });

  it("loads from uri", function () {
    spyOn(Resource.prototype, "fetchImage").and.returnValue(
      when.resolve(image)
    );

    var imageLoader = new GltfImageLoader({
      resourceCache: ResourceCache,
      gltf: getGltf(pngBuffer),
      imageId: 1,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      supportedImageFormats: new SupportedImageFormats(),
    });

    imageLoader.load();

    return imageLoader.promise.then(function (imageLoader) {
      expect(imageLoader.image.width).toBe(1);
      expect(imageLoader.image.height).toBe(1);
    });
  });

  it("destroys image loader", function () {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(pngBuffer)
    );

    var unloadBufferView = spyOn(
      GltfBufferViewLoader.prototype,
      "unload"
    ).and.callThrough();

    var imageLoader = new GltfImageLoader({
      resourceCache: ResourceCache,
      gltf: getGltf(pngBuffer),
      imageId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      supportedImageFormats: new SupportedImageFormats(),
    });
    expect(imageLoader.image).not.toBeDefined();

    imageLoader.load();

    return imageLoader.promise.then(function (imageLoader) {
      expect(imageLoader.image).toBeDefined();
      expect(imageLoader.isDestroyed()).toBe(false);

      imageLoader.destroy();

      expect(imageLoader.image).not.toBeDefined();
      expect(imageLoader.isDestroyed()).toBe(true);
      expect(unloadBufferView).toHaveBeenCalled();
    });
  });

  function resolveBufferViewAfterDestroy(reject) {
    var deferredPromise = when.defer();
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      deferredPromise.promise
    );

    // Load a copy of the buffer view into the cache so that the buffer view
    // promise resolves even if the image loader is destroyed
    var bufferViewLoaderCopy = ResourceCache.loadBufferView({
      gltf: getGltf(pngBuffer),
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    var imageLoader = new GltfImageLoader({
      resourceCache: ResourceCache,
      gltf: getGltf(pngBuffer),
      imageId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      supportedImageFormats: new SupportedImageFormats(),
    });

    expect(imageLoader.image).not.toBeDefined();

    imageLoader.load();
    imageLoader.destroy();

    if (reject) {
      deferredPromise.reject(new Error());
    } else {
      deferredPromise.resolve(pngBuffer);
    }

    expect(imageLoader.image).not.toBeDefined();
    expect(imageLoader.isDestroyed()).toBe(true);

    ResourceCache.unload(bufferViewLoaderCopy);
  }

  it("handles resolving buffer view after destroy", function () {
    resolveBufferViewAfterDestroy(false);
  });

  it("handles rejecting buffer view after destroy", function () {
    resolveBufferViewAfterDestroy(true);
  });

  function resolveImageFromTypedArrayAfterDestroy(reject) {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(pngBuffer)
    );

    var deferredPromise = when.defer();
    spyOn(GltfImageLoader, "_loadImageFromTypedArray").and.returnValue(
      deferredPromise.promise
    );

    // Load a copy of the buffer view into the cache so that the buffer view
    // promise resolves even if the image loader is destroyed
    var bufferViewLoaderCopy = ResourceCache.loadBufferView({
      gltf: getGltf(pngBuffer),
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    var imageLoader = new GltfImageLoader({
      resourceCache: ResourceCache,
      gltf: getGltf(pngBuffer),
      imageId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      supportedImageFormats: new SupportedImageFormats(),
    });

    expect(imageLoader.image).not.toBeDefined();

    imageLoader.load();
    imageLoader.destroy();

    if (reject) {
      deferredPromise.reject(new Error());
    } else {
      deferredPromise.resolve(image);
    }

    expect(imageLoader.image).not.toBeDefined();
    expect(imageLoader.isDestroyed()).toBe(true);

    ResourceCache.unload(bufferViewLoaderCopy);
  }

  it("handles resolving image from typed array after destroy", function () {
    resolveImageFromTypedArrayAfterDestroy(false);
  });

  it("handles rejecting image from typed array after destroy", function () {
    resolveImageFromTypedArrayAfterDestroy(true);
  });

  function resolveUriAfterDestroy(reject) {
    var deferredPromise = when.defer();
    spyOn(Resource.prototype, "fetchImage").and.returnValue(
      deferredPromise.promise
    );

    var imageLoader = new GltfImageLoader({
      resourceCache: ResourceCache,
      gltf: getGltf(pngBuffer),
      imageId: 1,
      gltfResource: gltfResource,
      baseResource: gltfResource,
      supportedImageFormats: new SupportedImageFormats(),
    });

    expect(imageLoader.image).not.toBeDefined();

    imageLoader.load();
    imageLoader.destroy();

    if (reject) {
      deferredPromise.reject(new Error());
    } else {
      deferredPromise.resolve(image);
    }

    expect(imageLoader.image).not.toBeDefined();
    expect(imageLoader.isDestroyed()).toBe(true);
  }

  it("handles resolving uri after destroy", function () {
    resolveUriAfterDestroy(false);
  });

  it("handles rejecting uri after destroy", function () {
    resolveUriAfterDestroy(true);
  });
});
