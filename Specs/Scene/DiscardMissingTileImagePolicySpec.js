import { Cartesian2 } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { DiscardMissingTileImagePolicy } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";
import { when } from "../../Source/Cesium.js";

describe("Scene/DiscardMissingTileImagePolicy", function () {
  let supportsImageBitmapOptions;
  beforeAll(function () {
    // This suite spies on requests. Resource.supportsImageBitmapOptions needs to make a request to a data URI.
    // We run it here to avoid interfering with the tests.
    return Resource.supportsImageBitmapOptions().then(function (result) {
      supportsImageBitmapOptions = result;
    });
  });

  afterEach(function () {
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
    Resource._Implementations.loadWithXhr =
      Resource._DefaultImplementations.loadWithXhr;
  });

  describe("construction", function () {
    it("throws if missingImageUrl is not provided", function () {
      function constructWithoutMissingImageUrl() {
        return new DiscardMissingTileImagePolicy({
          pixelsToCheck: [new Cartesian2(0, 0)],
        });
      }
      expect(constructWithoutMissingImageUrl).toThrowDeveloperError();
    });

    it("throws if pixelsToCheck is not provided", function () {
      function constructWithoutPixelsToCheck() {
        return new DiscardMissingTileImagePolicy({
          missingImageUrl: "http://some.host.invalid/missingImage.png",
        });
      }
      expect(constructWithoutPixelsToCheck).toThrowDeveloperError();
    });

    it("requests the missing image url", function () {
      const missingImageUrl = "http://some.host.invalid/missingImage.png";

      spyOn(Resource, "createImageBitmapFromBlob").and.callThrough();
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        const url = request.url;
        if (/^blob:/.test(url)) {
          Resource._DefaultImplementations.createImage(
            request,
            crossOrigin,
            deferred
          );
        } else {
          expect(url).toEqual(missingImageUrl);
          Resource._DefaultImplementations.createImage(
            new Request({ url: "Data/Images/Red16x16.png" }),
            crossOrigin,
            deferred
          );
        }
      });

      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        expect(url).toEqual(missingImageUrl);
        return Resource._DefaultImplementations.loadWithXhr(
          "Data/Images/Red16x16.png",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      const policy = new DiscardMissingTileImagePolicy({
        missingImageUrl: missingImageUrl,
        pixelsToCheck: [new Cartesian2(0, 0)],
      });

      return pollToPromise(function () {
        return policy.isReady();
      }).then(function () {
        if (supportsImageBitmapOptions) {
          expect(Resource.createImageBitmapFromBlob).toHaveBeenCalled();
        } else {
          expect(Resource._Implementations.createImage).toHaveBeenCalled();
        }
      });
    });
  });

  describe("shouldDiscardImage", function () {
    it("discards an image that is identical to the missing image", function () {
      const promises = [];

      promises.push(Resource.fetchImage("Data/Images/Red16x16.png"));
      promises.push(Resource.fetchImage("Data/Images/Green4x4.png"));

      const missingImageUrl = "Data/Images/Red16x16.png";
      const policy = new DiscardMissingTileImagePolicy({
        missingImageUrl: missingImageUrl,
        pixelsToCheck: [new Cartesian2(0, 0)],
      });

      promises.push(
        pollToPromise(function () {
          return policy.isReady();
        })
      );

      return when.all(promises, function (results) {
        const redImage = results[0];
        const greenImage = results[1];

        expect(policy.shouldDiscardImage(redImage)).toEqual(true);
        expect(policy.shouldDiscardImage(greenImage)).toEqual(false);
      });
    });

    it("discards an image that is identical to the missing image even if the missing image is transparent", function () {
      const promises = [];

      promises.push(Resource.fetchImage("Data/Images/Transparent.png"));

      const missingImageUrl = "Data/Images/Transparent.png";
      const policy = new DiscardMissingTileImagePolicy({
        missingImageUrl: missingImageUrl,
        pixelsToCheck: [new Cartesian2(0, 0)],
      });

      promises.push(
        pollToPromise(function () {
          return policy.isReady();
        })
      );

      return when.all(promises, function (results) {
        const transparentImage = results[0];
        expect(policy.shouldDiscardImage(transparentImage)).toEqual(true);
      });
    });

    it("does not discard at all when the missing image is transparent and disableCheckIfAllPixelsAreTransparent is set", function () {
      const promises = [];

      promises.push(Resource.fetchImage("Data/Images/Transparent.png"));

      const missingImageUrl = "Data/Images/Transparent.png";
      const policy = new DiscardMissingTileImagePolicy({
        missingImageUrl: missingImageUrl,
        pixelsToCheck: [new Cartesian2(0, 0)],
        disableCheckIfAllPixelsAreTransparent: true,
      });

      promises.push(
        pollToPromise(function () {
          return policy.isReady();
        })
      );

      return when.all(promises, function (results) {
        const transparentImage = results[0];
        expect(policy.shouldDiscardImage(transparentImage)).toEqual(false);
      });
    });

    it("throws if called before the policy is ready", function () {
      const policy = new DiscardMissingTileImagePolicy({
        missingImageUrl: "Data/Images/Transparent.png",
        pixelsToCheck: [new Cartesian2(0, 0)],
        disableCheckIfAllPixelsAreTransparent: true,
      });

      expect(function () {
        policy.shouldDiscardImage(new Image());
      }).toThrowDeveloperError();
    });
  });
});
