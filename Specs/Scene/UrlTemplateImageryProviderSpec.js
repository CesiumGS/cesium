import { Ellipsoid } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { Request } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { WebMercatorProjection } from "../../Source/Cesium.js";
import { WebMercatorTilingScheme } from "../../Source/Cesium.js";
import { GetFeatureInfoFormat } from "../../Source/Cesium.js";
import { Imagery } from "../../Source/Cesium.js";
import { ImageryLayer } from "../../Source/Cesium.js";
import { ImageryProvider } from "../../Source/Cesium.js";
import { ImageryState } from "../../Source/Cesium.js";
import { UrlTemplateImageryProvider } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";
import { when } from "../../Source/Cesium.js";

describe("Scene/UrlTemplateImageryProvider", function () {
  beforeEach(function () {
    RequestScheduler.clearForSpecs();
  });

  afterEach(function () {
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
  });

  it("conforms to ImageryProvider interface", function () {
    expect(UrlTemplateImageryProvider).toConformToInterface(ImageryProvider);
  });

  it("requires the url to be specified", function () {
    function createWithoutUrl() {
      return new UrlTemplateImageryProvider({});
    }
    expect(createWithoutUrl).toThrowDeveloperError();
  });

  it("resolves readyPromise", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server/",
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("resolves readyPromise with Resource", function () {
    var resource = new Resource({
      url: "made/up/tms/server/",
    });

    var provider = new UrlTemplateImageryProvider({
      url: resource,
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("returns valid value for hasAlphaChannel", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server/",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(typeof provider.hasAlphaChannel).toBe("boolean");
    });
  });

  it("requestImage returns a promise for an image and loads it for cross-origin use", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server/{Z}/{X}/{reverseY}",
    });

    expect(provider.url).toEqual("made/up/tms/server/{Z}/{X}/{reverseY}");

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tileWidth).toEqual(256);
      expect(provider.tileHeight).toEqual(256);
      expect(provider.maximumLevel).toBeUndefined();
      expect(provider.minimumLevel).toBe(0);
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
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("when no credit is supplied, the provider has no logo", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server",
    });
    expect(provider.credit).toBeUndefined();
  });

  it("turns the supplied credit into a logo", function () {
    var providerWithCredit = new UrlTemplateImageryProvider({
      url: "made/up/gms/server",
      credit: "Thanks to our awesome made up source of this imagery!",
    });
    expect(providerWithCredit.credit).toBeDefined();
  });

  it("rectangle passed to constructor does not affect tile numbering", function () {
    var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
    var provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server/{z}/{x}/{reverseY}",
      rectangle: rectangle,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tileWidth).toEqual(256);
      expect(provider.tileHeight).toEqual(256);
      expect(provider.maximumLevel).toBeUndefined();
      expect(provider.minimumLevel).toBe(0);
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
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("uses minimumLevel and maximumLevel passed to constructor", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server",
      minimumLevel: 1,
      maximumLevel: 5,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.minimumLevel).toEqual(1);
      expect(provider.maximumLevel).toEqual(5);
    });
  });

  it("raises error event when image cannot be loaded", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server",
    });

    var layer = new ImageryLayer(provider);

    var tries = 0;
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
          deferred,
          true,
          true
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
      var imagery = new Imagery(layer, 0, 0, 0);
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

  it("evaluation of pattern X Y reverseX reverseY Z reverseZ", function () {
    var provider = new UrlTemplateImageryProvider({
      url:
        "made/up/tms/server/{z}/{reverseZ}/{reverseY}/{y}/{reverseX}/{x}.PNG",
      tilingScheme: new GeographicTilingScheme(),
      maximumLevel: 6,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqual("made/up/tms/server/2/3/2/1/4/3.PNG");

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evaluation of schema zero padding for X Y Z as 0000", function () {
    var provider = new UrlTemplateImageryProvider({
      url:
        "made/up/tms/server/{z}/{reverseZ}/{reverseY}/{y}/{reverseX}/{x}.PNG",
      urlSchemeZeroPadding: {
        "{x}": "0000",
        "{y}": "0000",
        "{z}": "0000",
      },
      tilingScheme: new GeographicTilingScheme(),
      maximumLevel: 6,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqual(
          "made/up/tms/server/0002/3/2/0001/4/0003.PNG"
        );

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evaluation of schema zero padding for reverseX reverseY reverseZ as 0000", function () {
    var provider = new UrlTemplateImageryProvider({
      url:
        "made/up/tms/server/{z}/{reverseZ}/{reverseY}/{y}/{reverseX}/{x}.PNG",
      urlSchemeZeroPadding: {
        "{reverseX}": "0000",
        "{reverseY}": "0000",
        "{reverseZ}": "0000",
      },
      tilingScheme: new GeographicTilingScheme(),
      maximumLevel: 6,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqual(
          "made/up/tms/server/2/0003/0002/1/0004/3.PNG"
        );

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evaluation of schema zero padding for x y z as 0000 and large x and y", function () {
    var provider = new UrlTemplateImageryProvider({
      url:
        "made/up/tms/server/{z}/{reverseZ}/{reverseY}/{y}/{reverseX}/{x}.PNG",
      urlSchemeZeroPadding: {
        "{x}": "0000",
        "{y}": "0000",
        "{z}": "0000",
      },
      tilingScheme: new GeographicTilingScheme(),
      maximumLevel: 6,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqual(
          "made/up/tms/server/0005/0/21/0010/51/0012.PNG"
        );

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(12, 10, 5).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evaluates pattern northDegrees", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "{northDegrees}",
      tilingScheme: new GeographicTilingScheme(),
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqualEpsilon(45.0, CesiumMath.EPSILON11);

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evaluates pattern southDegrees", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "{southDegrees}",
      tilingScheme: new GeographicTilingScheme(),
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqualEpsilon(0.0, CesiumMath.EPSILON11);

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evaluates pattern eastDegrees", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "{eastDegrees}",
      tilingScheme: new GeographicTilingScheme(),
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqualEpsilon(0.0, CesiumMath.EPSILON11);

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evaluates pattern westDegrees", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "{westDegrees}",
      tilingScheme: new GeographicTilingScheme(),
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqualEpsilon(-45.0, CesiumMath.EPSILON11);

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evaluates pattern northProjected", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "{northProjected}",
      tilingScheme: new WebMercatorTilingScheme(),
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqualEpsilon(
          (Math.PI * Ellipsoid.WGS84.maximumRadius) / 2.0,
          CesiumMath.EPSILON11
        );

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evaluates pattern southProjected", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "{southProjected}",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqualEpsilon(
          (Math.PI * Ellipsoid.WGS84.maximumRadius) / 2.0,
          CesiumMath.EPSILON11
        );

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 0, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evaluates pattern eastProjected", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "{eastProjected}",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqualEpsilon(
          (-Math.PI * Ellipsoid.WGS84.maximumRadius) / 2.0,
          CesiumMath.EPSILON11
        );

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(0, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evaluates pattern westProjected", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "{westProjected}",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqualEpsilon(
          (-Math.PI * Ellipsoid.WGS84.maximumRadius) / 2.0,
          CesiumMath.EPSILON11
        );

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(1, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evalutes multiple coordinate patterns", function () {
    var provider = new UrlTemplateImageryProvider({
      url:
        "{westDegrees} {westProjected} {southProjected} {southDegrees} {eastProjected} {eastDegrees} {northDegrees} {northProjected}",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqual(
          "-90 " +
            (-Math.PI * Ellipsoid.WGS84.maximumRadius) / 2.0 +
            " " +
            "0 " +
            "0 " +
            "0 " +
            "0 " +
            CesiumMath.toDegrees(
              WebMercatorProjection.mercatorAngleToGeodeticLatitude(Math.PI / 2)
            ) +
            " " +
            (Math.PI * Ellipsoid.WGS84.maximumRadius) / 2.0
        );

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(1, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("evaluates pattern s", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "{s}",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(["a", "b", "c"].indexOf(request.url)).toBeGreaterThanOrEqualTo(
          0
        );

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("uses custom subdomain string", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "{s}",
      subdomains: "123",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(["1", "2", "3"].indexOf(request.url)).toBeGreaterThanOrEqualTo(
          0
        );

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("uses custom subdomain array", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "{s}",
      subdomains: ["foo", "bar"],
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(["foo", "bar"].indexOf(request.url)).toBeGreaterThanOrEqualTo(0);

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("uses custom tags", function () {
    var provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server/{custom1}/{custom2}/{z}/{y}/{x}.PNG",
      tilingScheme: new GeographicTilingScheme(),
      maximumLevel: 6,
      customTags: {
        custom1: function () {
          return "foo";
        },
        custom2: function () {
          return "bar";
        },
      },
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url).toEqual("made/up/tms/server/foo/bar/2/1/3.PNG");

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
          true,
          true
        );
      });

      return provider.requestImage(3, 1, 2).then(function (image) {
        expect(Resource._Implementations.createImage).toHaveBeenCalled();
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  describe("pickFeatures", function () {
    it("returns undefined when enablePickFeatures is false", function () {
      var provider = new UrlTemplateImageryProvider({
        url: "foo/bar",
        pickFeaturesUrl: "foo/bar",
        getFeatureInfoFormats: [
          new GetFeatureInfoFormat("json", "application/json"),
          new GetFeatureInfoFormat("xml", "text/xml"),
        ],
        enablePickFeatures: false,
      });

      return pollToPromise(function () {
        return provider.ready;
      }).then(function () {
        expect(provider.pickFeatures(0, 0, 0, 0.0, 0.0)).toBeUndefined();
      });
    });

    it("does not return undefined when enablePickFeatures is subsequently set to true", function () {
      var provider = new UrlTemplateImageryProvider({
        url: "foo/bar",
        pickFeaturesUrl: "foo/bar",
        getFeatureInfoFormats: [
          new GetFeatureInfoFormat("json", "application/json"),
          new GetFeatureInfoFormat("xml", "text/xml"),
        ],
        enablePickFeatures: false,
      });

      provider.enablePickFeatures = true;

      return pollToPromise(function () {
        return provider.ready;
      }).then(function () {
        expect(provider.pickFeatures(0, 0, 0, 0.0, 0.0)).not.toBeUndefined();
      });
    });

    it("returns undefined when enablePickFeatures is initialized as true and set to false", function () {
      var provider = new UrlTemplateImageryProvider({
        url: "foo/bar",
        pickFeaturesUrl: "foo/bar",
        getFeatureInfoFormats: [
          new GetFeatureInfoFormat("json", "application/json"),
          new GetFeatureInfoFormat("xml", "text/xml"),
        ],
        enablePickFeatures: true,
      });

      provider.enablePickFeatures = false;

      return pollToPromise(function () {
        return provider.ready;
      }).then(function () {
        expect(provider.pickFeatures(0, 0, 0, 0.0, 0.0)).toBeUndefined();
      });
    });
  });

  it("throws if tileWidth called before provider is ready", function () {
    var provider = new UrlTemplateImageryProvider(when.defer());

    expect(function () {
      return provider.tileWidth();
    }).toThrowDeveloperError();
  });

  it("throws if tileHeight called before provider is ready", function () {
    var provider = new UrlTemplateImageryProvider(when.defer());

    expect(function () {
      return provider.tileHeight();
    }).toThrowDeveloperError();
  });

  it("throws if maximumLevel called before provider is ready", function () {
    var provider = new UrlTemplateImageryProvider(when.defer());

    expect(function () {
      return provider.maximumLevel();
    }).toThrowDeveloperError();
  });

  it("throws if minimumLevel called before provider is ready", function () {
    var provider = new UrlTemplateImageryProvider(when.defer());

    expect(function () {
      return provider.minimumLevel();
    }).toThrowDeveloperError();
  });

  it("throws if tilingScheme called before provider is ready", function () {
    var provider = new UrlTemplateImageryProvider(when.defer());

    expect(function () {
      return provider.tilingScheme();
    }).toThrowDeveloperError();
  });

  it("throws if rectangle called before provider is ready", function () {
    var provider = new UrlTemplateImageryProvider(when.defer());

    expect(function () {
      return provider.rectangle();
    }).toThrowDeveloperError();
  });

  it("throws if tileDiscardPolicy called before provider is ready", function () {
    var provider = new UrlTemplateImageryProvider(when.defer());

    expect(function () {
      return provider.tileDiscardPolicy();
    }).toThrowDeveloperError();
  });

  it("throws if credit called before provider is ready", function () {
    var provider = new UrlTemplateImageryProvider(when.defer());

    expect(function () {
      return provider.credit();
    }).toThrowDeveloperError();
  });

  it("throws if hasAlphaChannel called before provider is ready", function () {
    var provider = new UrlTemplateImageryProvider(when.defer());

    expect(function () {
      return provider.hasAlphaChannel();
    }).toThrowDeveloperError();
  });

  it("throws if getTileCredits called before provider is ready", function () {
    var provider = new UrlTemplateImageryProvider(when.defer());

    expect(function () {
      return provider.getTileCredits();
    }).toThrowDeveloperError();
  });

  it("throws if requestImage called before provider is ready", function () {
    var provider = new UrlTemplateImageryProvider(when.defer());

    expect(function () {
      return provider.requestImage();
    }).toThrowDeveloperError();
  });

  it("throws if pickFeatures called before provider is ready", function () {
    var provider = new UrlTemplateImageryProvider(when.defer());

    expect(function () {
      return provider.pickFeatures();
    }).toThrowDeveloperError();
  });
});
