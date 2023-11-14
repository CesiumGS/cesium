import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { Request } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { WebMercatorTilingScheme } from "../../Source/Cesium.js";
import { Imagery } from "../../Source/Cesium.js";
import { ImageryLayer } from "../../Source/Cesium.js";
import { ImageryProvider } from "../../Source/Cesium.js";
import { ImageryState } from "../../Source/Cesium.js";
import { MapboxImageryProvider } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";

describe("Scene/MapboxImageryProvider", function () {
  beforeEach(function () {
    RequestScheduler.clearForSpecs();
  });

  afterEach(function () {
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
  });

  it("conforms to ImageryProvider interface", function () {
    expect(MapboxImageryProvider).toConformToInterface(ImageryProvider);
  });

  it("requires the mapId to be specified", function () {
    expect(function () {
      return new MapboxImageryProvider({ accessToken: "test-token" });
    }).toThrowDeveloperError();
  });

  it("resolves readyPromise", function () {
    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server/",
      mapId: "test-id",
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("resolves readyPromise with Resource", function () {
    const resource = new Resource({
      url: "made/up/mapbox/server/",
    });

    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: resource,
      mapId: "test-id",
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("returns valid value for hasAlphaChannel", function () {
    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server/",
      mapId: "test-id",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(typeof provider.hasAlphaChannel).toBe("boolean");
    });
  });

  it("supports a slash at the end of the URL", function () {
    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server/",
      mapId: "test-id",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).not.toContain("//");

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      });

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("supports no slash at the endof the URL", function () {
    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server",
      mapId: "test-id",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toContain("made/up/mapbox/server/");

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      });

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("requestImage returns a promise for an image and loads it for cross-origin use", function () {
    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server/",
      mapId: "test-id",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.url).toEqual(
        "made/up/mapbox/server/test-id/{z}/{x}/{y}.png?access_token=test-token"
      );
      expect(provider.tileWidth).toEqual(256);
      expect(provider.tileHeight).toEqual(256);
      expect(provider.maximumLevel).toBeUndefined();
      expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
      expect(provider.rectangle).toEqual(
        new WebMercatorTilingScheme().rectangle
      );

      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      });

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("rectangle passed to constructor does not affect tile numbering", function () {
    const rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server/",
      mapId: "test-id",
      rectangle: rectangle,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tileWidth).toEqual(256);
      expect(provider.tileHeight).toEqual(256);
      expect(provider.maximumLevel).toBeUndefined();
      expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
      expect(provider.rectangle).toEqualEpsilon(
        rectangle,
        CesiumMath.EPSILON14
      );
      expect(provider.tileDiscardPolicy).toBeUndefined();

      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toContain("/0/0/0");

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      });

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("uses maximumLevel passed to constructor", function () {
    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server/",
      mapId: "test-id",
      maximumLevel: 5,
    });
    return provider.readyPromise.then(function () {
      expect(provider.maximumLevel).toEqual(5);
    });
  });

  it("uses minimumLevel passed to constructor", function () {
    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server/",
      mapId: "test-id",
      minimumLevel: 1,
    });
    return provider.readyPromise.then(function () {
      expect(provider.minimumLevel).toEqual(1);
    });
  });

  it("when no credit is supplied, the provider adds a default credit", function () {
    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server/",
      mapId: "test-id",
    });
    return provider.readyPromise.then(function () {
      expect(provider.credit).toBe(MapboxImageryProvider._defaultCredit);
    });
  });

  it("turns the supplied credit into a logo", function () {
    const creditText = "Thanks to our awesome made up source of this imagery!";
    const providerWithCredit = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server/",
      mapId: "test-id",
      credit: creditText,
    });
    return providerWithCredit.readyPromise.then(function () {
      expect(providerWithCredit.credit.html).toEqual(creditText);
    });
  });

  it("raises error event when image cannot be loaded", function () {
    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server/",
      mapId: "test-id",
    });

    const layer = new ImageryLayer(provider);

    let tries = 0;
    provider.errorEvent.addEventListener(function (error) {
      expect(error.timesRetried).toEqual(tries);
      ++tries;
      if (tries < 3) {
        error.retry = true;
      }
      setTimeout(function () {
        RequestScheduler.update();
      }, 1);
    });

    Resource._Implementations.createImage = function (
      request,
      crossOrigin,
      deferred
    ) {
      if (tries === 2) {
        // Succeed after 2 tries
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      } else {
        // fail
        setTimeout(function () {
          deferred.reject();
        }, 1);
      }
    };

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      const imagery = new Imagery(layer, 0, 0, 0);
      imagery.addReference();
      layer._requestImagery(imagery);
      RequestScheduler.update();

      return pollToPromise(function () {
        return imagery.state === ImageryState.RECEIVED;
      }).then(function () {
        expect(imagery.image).toBeImageOrImageBitmap();
        expect(tries).toEqual(2);
        imagery.releaseReference();
      });
    });
  });

  it("appends specified format", function () {
    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server/",
      mapId: "test-id",
      format: "@2x.png",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(
          /made\/up\/mapbox\/server\/test-id\/0\/0\/0@2x\.png\?access_token=/.test(
            request.url
          )
        ).toBe(true);

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      });

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
      });
    });
  });

  it("adds missing period for format", function () {
    const provider = new MapboxImageryProvider({
      accessToken: "test-token",
      url: "made/up/mapbox/server/",
      mapId: "test-id",
      format: "png",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(
          /made\/up\/mapbox\/server\/test-id\/0\/0\/0\.png\?access_token=/.test(
            request.url
          )
        ).toBe(true);

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      });

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
      });
    });
  });
});
