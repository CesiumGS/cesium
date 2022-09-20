import { loadImageFromTypedArray, Resource } from "../../../Source/Cesium.js";

describe("Core/loadImageFromTypedArray", function () {
  let supportsImageBitmapOptions;

  beforeAll(function () {
    return Resource.supportsImageBitmapOptions().then(function (result) {
      supportsImageBitmapOptions = result;
    });
  });

  it("can load an image", function () {
    return Resource.fetchArrayBuffer("./Data/Images/Blue10x10.png").then(
      function (arrayBuffer) {
        const options = {
          uint8Array: new Uint8Array(arrayBuffer),
          format: "image/png",
        };

        return loadImageFromTypedArray(options).then(function (image) {
          expect(image.width).toEqual(10);
          expect(image.height).toEqual(10);
        });
      }
    );
  });

  it("flips image only when flipY is true", function () {
    if (!supportsImageBitmapOptions) {
      return;
    }

    const options = {
      uint8Array: new Uint8Array([67, 101, 115, 105, 117, 109]), // This is an invalid PNG.
      format: "image/png",
      flipY: true,
    };
    spyOn(window, "createImageBitmap").and.returnValue(Promise.resolve({}));
    const blob = new Blob([options.uint8Array], {
      type: options.format,
    });

    return Resource.supportsImageBitmapOptions().then(function (result) {
      if (!result) {
        return;
      }

      return loadImageFromTypedArray(options)
        .then(function () {
          expect(window.createImageBitmap).toHaveBeenCalledWith(blob, {
            imageOrientation: "flipY",
            premultiplyAlpha: "none",
            colorSpaceConversion: "default",
          });

          window.createImageBitmap.calls.reset();
          options.flipY = false;
          return loadImageFromTypedArray(options);
        })
        .then(function () {
          expect(window.createImageBitmap).toHaveBeenCalledWith(blob, {
            imageOrientation: "none",
            premultiplyAlpha: "none",
            colorSpaceConversion: "default",
          });
        });
    });
  });

  it("stores colorSpaceConversion correctly", function () {
    if (!supportsImageBitmapOptions) {
      return;
    }

    const options = {
      uint8Array: new Uint8Array([67, 101, 115, 105, 117, 109]), // This is an invalid PNG.
      format: "image/png",
      flipY: false,
      skipColorSpaceConversion: true,
    };
    spyOn(window, "createImageBitmap").and.returnValue(Promise.resolve({}));
    const blob = new Blob([options.uint8Array], {
      type: options.format,
    });

    return Resource.supportsImageBitmapOptions().then(function (result) {
      if (!result) {
        return;
      }

      return loadImageFromTypedArray(options)
        .then(function () {
          expect(window.createImageBitmap).toHaveBeenCalledWith(blob, {
            imageOrientation: "none",
            premultiplyAlpha: "none",
            colorSpaceConversion: "none",
          });

          window.createImageBitmap.calls.reset();
          options.skipColorSpaceConversion = false;
          return loadImageFromTypedArray(options);
        })
        .then(function () {
          expect(window.createImageBitmap).toHaveBeenCalledWith(blob, {
            imageOrientation: "none",
            premultiplyAlpha: "none",
            colorSpaceConversion: "default",
          });
        });
    });
  });

  it("can load an image when ImageBitmap is not supported", function () {
    if (!supportsImageBitmapOptions) {
      return;
    }

    spyOn(Resource, "supportsImageBitmapOptions").and.returnValue(
      Promise.resolve(false)
    );
    spyOn(window, "createImageBitmap").and.callThrough();
    return Resource.fetchArrayBuffer("./Data/Images/Blue10x10.png").then(
      function (arrayBuffer) {
        const options = {
          uint8Array: new Uint8Array(arrayBuffer),
          format: "image/png",
        };

        return loadImageFromTypedArray(options).then(function (image) {
          expect(image.width).toEqual(10);
          expect(image.height).toEqual(10);
          expect(window.createImageBitmap).not.toHaveBeenCalled();
        });
      }
    );
  });

  it("can not load an invalid image", function () {
    const options = {
      uint8Array: new Uint8Array([67, 101, 115, 105, 117, 109]), // This is an invalid PNG.
      format: "image/png",
    };
    return loadImageFromTypedArray(options)
      .then(function (image) {
        fail("should not be called");
      })
      .catch(function () {});
  });

  it("Throws without array", function () {
    expect(function () {
      loadImageFromTypedArray({});
    }).toThrowDeveloperError();
  });

  it("Throws without format", function () {
    expect(function () {
      loadImageFromTypedArray({
        uint8Array: new Uint8Array(),
      });
    }).toThrowDeveloperError();
  });
});
