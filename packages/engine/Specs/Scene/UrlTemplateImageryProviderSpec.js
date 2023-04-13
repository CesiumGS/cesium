import {
  Ellipsoid,
  GeographicTilingScheme,
  Rectangle,
  Request,
  RequestScheduler,
  Resource,
  WebMercatorProjection,
  WebMercatorTilingScheme,
  GetFeatureInfoFormat,
  Imagery,
  ImageryLayer,
  ImageryProvider,
  ImageryState,
  UrlTemplateImageryProvider,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import pollToPromise from "../../../../Specs/pollToPromise.js";

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
    const provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server/",
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("resolves readyPromise with Resource", function () {
    const resource = new Resource({
      url: "made/up/tms/server/",
    });

    const provider = new UrlTemplateImageryProvider({
      url: resource,
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("returns valid value for hasAlphaChannel", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server/",
    });

    expect(typeof provider.hasAlphaChannel).toBe("boolean");
  });

  it("requestImage returns a promise for an image and loads it for cross-origin use", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server/{Z}/{X}/{reverseY}",
    });

    expect(provider.url).toEqual("made/up/tms/server/{Z}/{X}/{reverseY}");
    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.minimumLevel).toBe(0);
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);

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

  it("when no credit is supplied, the provider has no logo", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server",
    });
    expect(provider.credit).toBeUndefined();
  });

  it("turns the supplied credit into a logo", function () {
    const providerWithCredit = new UrlTemplateImageryProvider({
      url: "made/up/gms/server",
      credit: "Thanks to our awesome made up source of this imagery!",
    });
    expect(providerWithCredit.credit).toBeDefined();
  });

  it("rectangle passed to constructor does not affect tile numbering", function () {
    const rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
    const provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server/{z}/{x}/{reverseY}",
      rectangle: rectangle,
    });

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.minimumLevel).toBe(0);
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.rectangle).toEqualEpsilon(rectangle, CesiumMath.EPSILON14);
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

  it("uses minimumLevel and maximumLevel passed to constructor", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server",
      minimumLevel: 1,
      maximumLevel: 5,
    });

    expect(provider.minimumLevel).toEqual(1);
    expect(provider.maximumLevel).toEqual(5);
  });

  it("raises error event when image cannot be loaded", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "made/up/tms/server",
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

  it("evaluation of pattern X Y reverseX reverseY Z reverseZ", function () {
    const provider = new UrlTemplateImageryProvider({
      url:
        "made/up/tms/server/{z}/{reverseZ}/{reverseY}/{y}/{reverseX}/{x}.PNG",
      tilingScheme: new GeographicTilingScheme(),
      maximumLevel: 6,
    });

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
        deferred
      );
    });

    return provider.requestImage(3, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluation of schema zero padding for X Y Z as 0000", function () {
    const provider = new UrlTemplateImageryProvider({
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
        deferred
      );
    });

    return provider.requestImage(3, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluation of schema zero padding for reverseX reverseY reverseZ as 0000", function () {
    const provider = new UrlTemplateImageryProvider({
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
        deferred
      );
    });

    return provider.requestImage(3, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluation of schema zero padding for x y z as 0000 and large x and y", function () {
    const provider = new UrlTemplateImageryProvider({
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
        deferred
      );
    });

    return provider.requestImage(12, 10, 5).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluates pattern northDegrees", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "{northDegrees}",
      tilingScheme: new GeographicTilingScheme(),
    });

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
        deferred
      );
    });

    return provider.requestImage(3, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluates pattern southDegrees", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "{southDegrees}",
      tilingScheme: new GeographicTilingScheme(),
    });

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
        deferred
      );
    });

    return provider.requestImage(3, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluates pattern eastDegrees", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "{eastDegrees}",
      tilingScheme: new GeographicTilingScheme(),
    });

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
        deferred
      );
    });

    return provider.requestImage(3, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluates pattern westDegrees", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "{westDegrees}",
      tilingScheme: new GeographicTilingScheme(),
    });

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
        deferred
      );
    });

    return provider.requestImage(3, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluates pattern northProjected", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "{northProjected}",
      tilingScheme: new WebMercatorTilingScheme(),
    });

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
        deferred
      );
    });

    return provider.requestImage(3, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluates pattern southProjected", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "{southProjected}",
    });

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
        deferred
      );
    });

    return provider.requestImage(3, 0, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluates pattern eastProjected", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "{eastProjected}",
    });

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
        deferred
      );
    });

    return provider.requestImage(0, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluates pattern westProjected", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "{westProjected}",
    });

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
        deferred
      );
    });

    return provider.requestImage(1, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluates multiple coordinate patterns", function () {
    const provider = new UrlTemplateImageryProvider({
      url:
        "{westDegrees} {westProjected} {southProjected} {southDegrees} {eastProjected} {eastDegrees} {northDegrees} {northProjected}",
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      expect(request.url).toEqual(
        `-90 ${(-Math.PI * Ellipsoid.WGS84.maximumRadius) / 2.0} ` +
          `0 ` +
          `0 ` +
          `0 ` +
          `0 ${CesiumMath.toDegrees(
            WebMercatorProjection.mercatorAngleToGeodeticLatitude(Math.PI / 2)
          )} ${(Math.PI * Ellipsoid.WGS84.maximumRadius) / 2.0}`
      );

      // Just return any old image.
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred
      );
    });

    return provider.requestImage(1, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("evaluates pattern s", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "{s}",
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      expect(["a", "b", "c"].indexOf(request.url)).toBeGreaterThanOrEqual(0);

      // Just return any old image.
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred
      );
    });

    return provider.requestImage(3, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("uses custom subdomain string", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "{s}",
      subdomains: "123",
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      expect(["1", "2", "3"].indexOf(request.url)).toBeGreaterThanOrEqual(0);

      // Just return any old image.
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred
      );
    });

    return provider.requestImage(3, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("uses custom subdomain array", function () {
    const provider = new UrlTemplateImageryProvider({
      url: "{s}",
      subdomains: ["foo", "bar"],
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      expect(["foo", "bar"].indexOf(request.url)).toBeGreaterThanOrEqual(0);

      // Just return any old image.
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred
      );
    });

    return provider.requestImage(3, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("uses custom tags", function () {
    const provider = new UrlTemplateImageryProvider({
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
        deferred
      );
    });

    return provider.requestImage(3, 1, 2).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  describe("pickFeatures", function () {
    it("returns undefined when enablePickFeatures is false", function () {
      const provider = new UrlTemplateImageryProvider({
        url: "foo/bar",
        pickFeaturesUrl: "foo/bar",
        getFeatureInfoFormats: [
          new GetFeatureInfoFormat("json", "application/json"),
          new GetFeatureInfoFormat("xml", "text/xml"),
        ],
        enablePickFeatures: false,
      });

      expect(provider.pickFeatures(0, 0, 0, 0.0, 0.0)).toBeUndefined();
    });

    it("does not return undefined when enablePickFeatures is subsequently set to true", function () {
      const provider = new UrlTemplateImageryProvider({
        url: "foo/bar",
        pickFeaturesUrl: "foo/bar",
        getFeatureInfoFormats: [
          new GetFeatureInfoFormat("json", "application/json"),
          new GetFeatureInfoFormat("xml", "text/xml"),
        ],
        enablePickFeatures: false,
      });

      provider.enablePickFeatures = true;
      expect(provider.pickFeatures(0, 0, 0, 0.0, 0.0)).not.toBeUndefined();
    });

    it("returns undefined when enablePickFeatures is initialized as true and set to false", function () {
      const provider = new UrlTemplateImageryProvider({
        url: "foo/bar",
        pickFeaturesUrl: "foo/bar",
        getFeatureInfoFormats: [
          new GetFeatureInfoFormat("json", "application/json"),
          new GetFeatureInfoFormat("xml", "text/xml"),
        ],
        enablePickFeatures: true,
      });

      provider.enablePickFeatures = false;
      expect(provider.pickFeatures(0, 0, 0, 0.0, 0.0)).toBeUndefined();
    });
  });
});
