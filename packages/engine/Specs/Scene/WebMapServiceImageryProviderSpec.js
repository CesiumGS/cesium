import Uri from "urijs";
import {
  Cartographic,
  Clock,
  ClockStep,
  Ellipsoid,
  GeographicTilingScheme,
  GetFeatureInfoFormat,
  Imagery,
  ImageryLayer,
  ImageryLayerFeatureInfo,
  ImageryProvider,
  ImageryState,
  JulianDate,
  queryToObject,
  Rectangle,
  Request,
  RequestScheduler,
  RequestState,
  Resource,
  TimeIntervalCollection,
  WebMapServiceImageryProvider,
  WebMercatorTilingScheme,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Scene/WebMapServiceImageryProvider", function () {
  beforeEach(function () {
    RequestScheduler.clearForSpecs();
  });

  afterEach(function () {
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
    Resource._Implementations.loadWithXhr =
      Resource._DefaultImplementations.loadWithXhr;
  });

  it("conforms to ImageryProvider interface", function () {
    expect(WebMapServiceImageryProvider).toConformToInterface(ImageryProvider);
  });

  it("requires the url to be specified", function () {
    function createWithoutUrl() {
      return new WebMapServiceImageryProvider({
        layers: "someLayer",
      });
    }
    expect(createWithoutUrl).toThrowDeveloperError();
  });

  it("requires the layers to be specified", function () {
    function createWithoutUrl() {
      return new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
      });
    }
    expect(createWithoutUrl).toThrowDeveloperError();
  });

  it("returns valid value for hasAlphaChannel", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
    });

    expect(typeof provider.hasAlphaChannel).toBe("boolean");
  });

  it("can use a custom ellipsoid", function () {
    const ellipsoid = new Ellipsoid(1, 2, 3);
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      ellipsoid: ellipsoid,
    });

    expect(provider.tilingScheme.ellipsoid).toEqual(ellipsoid);
  });

  it("includes specified parameters in URL", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      parameters: {
        something: "foo",
        another: false,
        version: "1.3.0",
      },
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());
      expect(params.something).toEqual("foo");
      expect(params.another).toEqual("false");
      expect(params.version).toEqual("1.3.0");

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
    });
  });

  it("includes crs parameters in URL for WMS version 1.3.0", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      crs: "CRS:27",
      parameters: {
        version: "1.3.0",
      },
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());
      expect(params.crs).toEqual("CRS:27");
      expect(params.version).toEqual("1.3.0");

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
    });
  });

  it("includes bbox parameters in URL for WMS version 1.3.0 and CRS EPSG:4326", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      crs: "EPSG:4326",
      parameters: {
        version: "1.3.0",
      },
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());
      expect(params.crs).toEqual("EPSG:4326");
      expect(params.version).toEqual("1.3.0");
      expect(params.bbox).toEqual("-90,-180,90,0");

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
    });
  });

  it("reverses axis order for EPSG code between 4000-5000 for WMS version 1.3.0", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      crs: "EPSG:4321",
      parameters: {
        version: "1.3.0",
      },
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());
      expect(params.crs).toEqual("EPSG:4321");
      expect(params.version).toEqual("1.3.0");
      expect(params.bbox).toEqual("-90,-180,90,0");

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
    });
  });

  it("reverses axis order for included EPSG code for WMS version 1.3.0", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      crs: "EPSG:3035",
      parameters: {
        version: "1.3.0",
      },
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());
      expect(params.crs).toEqual("EPSG:3035");
      expect(params.version).toEqual("1.3.0");
      expect(params.bbox).toEqual("-90,-180,90,0");

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
    });
  });

  it("does not reverse axis order for excluded EPSG code for WMS version 1.3.0", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      crs: "EPSG:4559",
      parameters: {
        version: "1.3.0",
      },
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());
      expect(params.crs).toEqual("EPSG:4559");
      expect(params.version).toEqual("1.3.0");
      expect(params.bbox).toEqual("-180,-90,0,90");

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
    });
  });

  it("disregard crs parameters in URL for WMS version 1.1.0", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      crs: "CRS:27",
      parameters: {
        version: "1.1.0",
      },
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());
      expect(params.srs).toEqual("EPSG:4326");
      expect(params.version).toEqual("1.1.0");

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
    });
  });

  it("includes srs parameters in URL for WMS version 1.1.0", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      srs: "IAU2000:30118",
      parameters: {
        version: "1.1.0",
      },
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());
      expect(params.srs).toEqual("IAU2000:30118");
      expect(params.version).toEqual("1.1.0");

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
    });
  });

  it("includes bbox parameters in URL for WMS version 1.1.1", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      crs: "CRS:27",
      parameters: {
        version: "1.1.0",
      },
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());
      expect(params.srs).toEqual("EPSG:4326");
      expect(params.version).toEqual("1.1.0");
      expect(params.bbox).toEqual("-180,-90,0,90");

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
    });
  });

  it("supports subdomains string in URL", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "{s}",
      subdomains: "123",
      layers: "",
    });

    spyOn(ImageryProvider, "loadImage");

    provider.requestImage(0, 0, 0);
    const url = ImageryProvider.loadImage.calls.mostRecent().args[1].url;
    expect("123".indexOf(url.substring(0, 1))).toBeGreaterThanOrEqual(0);
  });

  it("supports subdomains array in URL", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "{s}",
      subdomains: ["foo", "bar"],
      layers: "",
    });

    spyOn(ImageryProvider, "loadImage");
    provider.requestImage(0, 0, 0);
    const url = ImageryProvider.loadImage.calls.mostRecent().args[1].url;
    expect(["foo", "bar"].indexOf(url.substring(0, 3))).toBeGreaterThanOrEqual(
      0
    );
  });

  it("supports a question mark at the end of the URL", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server?",
      layers: "someLayer",
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const questionMarkCount = request.url.match(/\?/g).length;
      expect(questionMarkCount).toEqual(1);

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
    });
  });

  it("supports an ampersand at the end of the URL", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server?foo=bar&",
      layers: "someLayer",
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const url = request.url;
      const questionMarkCount = url.match(/\?/g).length;
      expect(questionMarkCount).toEqual(1);
      expect(url).not.toContain("&&");

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
    });
  });

  it("supports a query parameter at the end of the URL", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server?foo=bar",
      layers: "someLayer",
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const url = request.url;
      const questionMarkCount = url.match(/\?/g).length;
      expect(questionMarkCount).toEqual(1);

      const uri = new Uri(url);
      const params = queryToObject(uri.query());
      expect(params.foo).toEqual("bar");

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    provider.requestImage(0, 0, 0);

    expect(Resource._Implementations.createImage).toHaveBeenCalled();
  });

  it("defaults WMS version to 1.1.1", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server?foo=bar",
      layers: "someLayer",
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const url = request.url;
      const uri = new Uri(url);
      const params = queryToObject(uri.query());
      expect(params.version).toEqual("1.1.1");

      // Don't need to actually load image, but satisfy the request.
      deferred.resolve(true);
    });

    provider.requestImage(0, 0, 0);

    expect(Resource._Implementations.createImage).toHaveBeenCalled();
  });

  it("requestImage returns a promise for an image and loads it for cross-origin use", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
    });

    expect(provider.url).toEqual("made/up/wms/server");
    expect(provider.layers).toEqual("someLayer");

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

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

  it("requestImage requests tiles with SRS EPSG:3857 when tiling scheme is WebMercatorTilingScheme, WMS 1.1.1", function () {
    const tilingScheme = new WebMercatorTilingScheme();
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      tilingScheme: tilingScheme,
    });

    expect(provider.url).toEqual("made/up/wms/server");
    expect(provider.layers).toEqual("someLayer");

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());

      expect(params.srs).toEqual("EPSG:3857");
      expect(params.version).toEqual("1.1.1");

      const rect = tilingScheme.tileXYToNativeRectangle(0, 0, 0);
      expect(params.bbox).toEqual(
        `${rect.west},${rect.south},${rect.east},${rect.north}`
      );

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

  it("requestImage requests tiles with CRS EPSG:3857 when tiling scheme is WebMercatorTilingScheme, WMS 1.3.0", function () {
    const tilingScheme = new WebMercatorTilingScheme();
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      tilingScheme: tilingScheme,
      parameters: {
        version: "1.3.0",
      },
    });

    expect(provider.url).toEqual("made/up/wms/server");
    expect(provider.layers).toEqual("someLayer");

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());

      expect(params.crs).toEqual("EPSG:3857");
      expect(params.version).toEqual("1.3.0");

      const rect = tilingScheme.tileXYToNativeRectangle(0, 0, 0);
      expect(params.bbox).toEqual(
        `${rect.west},${rect.south},${rect.east},${rect.north}`
      );

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

  it("requestImage requests tiles with SRS EPSG:4326 when tiling scheme is GeographicTilingScheme, WMS 1.1.1", function () {
    const tilingScheme = new GeographicTilingScheme();
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      tilingScheme: tilingScheme,
    });

    expect(provider.url).toEqual("made/up/wms/server");
    expect(provider.layers).toEqual("someLayer");

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());

      expect(params.srs).toEqual("EPSG:4326");
      expect(params.version).toEqual("1.1.1");

      const rect = tilingScheme.tileXYToNativeRectangle(0, 0, 0);
      expect(params.bbox).toEqual(
        `${rect.west},${rect.south},${rect.east},${rect.north}`
      );

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

  it("requestImage requests tiles with SRS EPSG:4326 when tiling scheme is GeographicTilingScheme, WMS 1.1.0", function () {
    const tilingScheme = new GeographicTilingScheme();
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      tilingScheme: tilingScheme,
      parameters: {
        version: "1.1.0",
      },
    });

    expect(provider.url).toEqual("made/up/wms/server");
    expect(provider.layers).toEqual("someLayer");

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());

      expect(params.srs).toEqual("EPSG:4326");
      expect(params.version).toEqual("1.1.0");

      const rect = tilingScheme.tileXYToNativeRectangle(0, 0, 0);
      expect(params.bbox).toEqual(
        `${rect.west},${rect.south},${rect.east},${rect.north}`
      );

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

  it("requestImage requests tiles with CRS CRS:84 when tiling scheme is GeographicTilingScheme, WMS 1.3.0", function () {
    const tilingScheme = new GeographicTilingScheme();
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      tilingScheme: tilingScheme,
      parameters: {
        version: "1.3.0",
      },
    });

    expect(provider.url).toEqual("made/up/wms/server");
    expect(provider.layers).toEqual("someLayer");

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());

      expect(params.crs).toEqual("CRS:84");
      expect(params.version).toEqual("1.3.0");

      const rect = tilingScheme.tileXYToNativeRectangle(0, 0, 0);
      expect(params.bbox).toEqual(
        `${rect.west},${rect.south},${rect.east},${rect.north}`
      );

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

  it("requestImage requests tiles with CRS CRS:84 when tiling scheme is GeographicTilingScheme, WMS 1.3.1", function () {
    const tilingScheme = new GeographicTilingScheme();
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      tilingScheme: tilingScheme,
      parameters: {
        version: "1.3.1",
      },
    });

    expect(provider.url).toEqual("made/up/wms/server");
    expect(provider.layers).toEqual("someLayer");

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());

      expect(params.crs).toEqual("CRS:84");
      expect(params.version).toEqual("1.3.1");

      const rect = tilingScheme.tileXYToNativeRectangle(0, 0, 0);
      expect(params.bbox).toEqual(
        `${rect.west},${rect.south},${rect.east},${rect.north}`
      );

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

  it("does not treat parameter names as case sensitive", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server?foo=bar",
      layers: "someLayer",
      parameters: {
        FORMAT: "foo",
      },
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const uri = new Uri(request.url);
      const params = queryToObject(uri.query());

      expect(params.format).toEqual("foo");
      expect(params.format).not.toEqual("image/jpeg");

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

  it("turns the supplied credit into a logo", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server?foo=bar",
      layers: "someLayer",
    });
    expect(provider.credit).toBeUndefined();

    const providerWithCredit = new WebMapServiceImageryProvider({
      url: "made/up/wms/server?foo=bar",
      layers: "someLayer",
      credit: "Thanks to our awesome made up source of this imagery!",
    });
    expect(providerWithCredit.credit).toBeDefined();
  });

  it("uses rectangle passed to constructor", function () {
    const rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      rectangle: rectangle,
    });

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    expect(provider.rectangle).toEqualEpsilon(rectangle, CesiumMath.EPSILON14);
    expect(provider.tileDiscardPolicy).toBeUndefined();
  });

  it("uses maximumLevel passed to constructor", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      maximumLevel: 5,
    });
    expect(provider.maximumLevel).toEqual(5);
  });

  it("uses minimumLevel passed to constructor", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      minimumLevel: 1,
    });
    expect(provider.minimumLevel).toEqual(1);
  });

  it("uses tilingScheme passed to constructor", function () {
    const tilingScheme = new WebMercatorTilingScheme();
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      tilingScheme: tilingScheme,
    });
    expect(provider.tilingScheme).toBe(tilingScheme);
  });

  it("uses tileWidth passed to constructor", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      tileWidth: 123,
    });
    expect(provider.tileWidth).toBe(123);
  });

  it("uses tileHeight passed to constructor", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      tileWidth: 456,
    });
    expect(provider.tileWidth).toBe(456);
  });

  it("raises error event when image cannot be loaded", function () {
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
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

  describe("pickFeatures", function () {
    it("works with GeoJSON responses", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
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
        expect(url).toContain("GetFeatureInfo");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo-GeoJSON.json",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider
        .pickFeatures(0, 0, 0, 0.5, 0.5)
        .then(function (pickResult) {
          expect(pickResult.length).toBe(1);

          const firstResult = pickResult[0];
          expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
          expect(firstResult.name).toBe("TOP TANK");
          expect(firstResult.description).toContain("GEOSCIENCE AUSTRALIA");
          expect(firstResult.position).toEqual(
            Cartographic.fromDegrees(145.91299, -30.19445)
          );
        });
    });

    it("works with MapInfo MXP responses", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
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
        expect(url).toContain("GetFeatureInfo");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo-MapInfoMXP.xml",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider
        .pickFeatures(0, 0, 0, 0.5, 0.5)
        .then(function (pickResult) {
          expect(pickResult.length).toBe(1);

          const firstResult = pickResult[0];
          expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
          expect(firstResult.name).toBe("SPRINGWOOD");
          expect(firstResult.description).toContain("NSW");
        });
    });

    it("works with Esri WMS responses", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
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
        expect(url).toContain("GetFeatureInfo");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo-Esri.xml",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider
        .pickFeatures(0, 0, 0, 0.5, 0.5)
        .then(function (pickResult) {
          expect(pickResult.length).toBe(1);

          const firstResult = pickResult[0];
          expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
          expect(firstResult.name).toBe("Kyogle (A)");
          expect(firstResult.description).toContain("New South Wales");
        });
    });

    it("works with THREDDS XML format", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
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
        expect(url).toContain("GetFeatureInfo");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo-THREDDS.xml",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider
        .pickFeatures(0, 0, 0, 0.5, 0.5)
        .then(function (pickResult) {
          expect(pickResult.length).toBe(1);

          const firstResult = pickResult[0];
          expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
          expect(+firstResult.properties.value).toBe(42);
          expect(firstResult.description).toContain("42");
        });
    });

    it("works with msGMLOutput format", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
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
        expect(url).toContain("GetFeatureInfo");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo-msGMLOutput.xml",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider
        .pickFeatures(0, 0, 0, 0.5, 0.5)
        .then(function (pickResult) {
          expect(pickResult.length).toBe(1);

          const firstResult = pickResult[0];
          expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
          expect(firstResult.name).toBe("Hovercraft");
          expect(firstResult.description).toContain("Hovercraft");
        });
    });

    it("works with unknown XML responses", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
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
        expect(url).toContain("GetFeatureInfo");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo-Unknown.xml",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider
        .pickFeatures(0, 0, 0, 0.5, 0.5)
        .then(function (pickResult) {
          expect(pickResult.length).toBe(1);

          const firstResult = pickResult[0];
          expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
          expect(firstResult.name).toBeUndefined();
          expect(firstResult.description).toContain("&lt;FooFeature&gt;");
        });
    });

    it("resolves to undefined on a ServiceException", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
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
        expect(url).toContain("GetFeatureInfo");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo-ServiceException.xml",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider
        .pickFeatures(0, 0, 0, 0.5, 0.5)
        .then(function (pickResult) {
          expect(pickResult).toBeUndefined();
        });
    });

    it("returns undefined if list of feature info formats is empty", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
        getFeatureInfoFormats: [],
      });
      expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).toBeUndefined();
    });

    it("returns undefined if enablePickFeatures is false", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
        enablePickFeatures: false,
      });
      expect(provider.enablePickFeatures).toBe(false);
      expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).toBeUndefined();
    });

    it("returns undefined if enablePickFeatures is set to false after initialization", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
        enablePickFeatures: true,
      });

      provider.enablePickFeatures = false;
      expect(provider.enablePickFeatures).toBe(false);
      expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).toBeUndefined();
    });

    it("does not return undefined if enablePickFeatures is set to true after initialization as false", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
        enablePickFeatures: false,
      });

      provider.enablePickFeatures = true;
      expect(provider.enablePickFeatures).toBe(true);
      expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).not.toBeUndefined();
    });

    it("requests XML exclusively if specified in getFeatureInfoFormats", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
        getFeatureInfoFormats: [new GetFeatureInfoFormat("xml")],
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
        expect(url).toContain("GetFeatureInfo");
        expect(url).not.toContain("json");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo-MapInfoMXP.xml",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider
        .pickFeatures(0, 0, 0, 0.5, 0.5)
        .then(function (pickResult) {
          expect(pickResult.length).toBe(1);

          const firstResult = pickResult[0];
          expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
          expect(firstResult.name).toBe("SPRINGWOOD");
          expect(firstResult.description).toContain("NSW");
        });
    });

    it("requests GeoJSON exclusively if specified in getFeatureInfoFormats", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
        getFeatureInfoFormats: [new GetFeatureInfoFormat("json")],
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
        expect(url).toContain("GetFeatureInfo");

        if (url.indexOf("json") >= 0) {
          deferred.reject();
        } else {
          // this should not happen
          Resource._DefaultImplementations.loadWithXhr(
            "Data/WMS/GetFeatureInfo-MapInfoMXP.xml",
            responseType,
            method,
            data,
            headers,
            deferred,
            overrideMimeType
          );
        }
      };

      return provider
        .pickFeatures(0, 0, 0, 0.5, 0.5)
        .then(function (features) {
          expect(features.length).toBe(0);
        })
        .catch(function () {});
    });

    it("generates correct getFeatureInfo link, WMS 1.1.1, version in getFeatureInfoParameters", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
        getFeatureInfoParameters: {
          version: "1.1.1",
        },
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
        expect(url).toContain("GetFeatureInfo");
        expect(url).toContain("1.1.1");
        expect(url).not.toContain("1.3.0");
        expect(url).toContain("&x=");
        expect(url).toContain("&y=");
        expect(url).not.toContain("&i=");
        expect(url).not.toContain("&j=");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo-MapInfoMXP.xml",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider.pickFeatures(0, 0, 0, 0.5, 0.5);
    });

    it("generates correct getFeatureInfo link, WMS 1.3.0, version in getFeatureInfoParameters", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
        getFeatureInfoParameters: {
          version: "1.3.0",
        },
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
        expect(url).toContain("GetFeatureInfo");
        expect(url).not.toContain("1.1.1");
        expect(url).toContain("1.3.0");
        expect(url).not.toContain("&x=");
        expect(url).not.toContain("&y=");
        expect(url).toContain("&i=");
        expect(url).toContain("&j=");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo-MapInfoMXP.xml",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider.pickFeatures(0, 0, 0, 0.5, 0.5);
    });

    it("generates correct getFeatureInfo link, WMS 1.1.1, default version", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
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
        expect(url).toContain("GetFeatureInfo");
        expect(url).toContain("1.1.1");
        expect(url).not.toContain("1.3.0");
        expect(url).toContain("&x=");
        expect(url).toContain("&y=");
        expect(url).not.toContain("&i=");
        expect(url).not.toContain("&j=");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo-MapInfoMXP.xml",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };
      return provider.pickFeatures(0, 0, 0, 0.5, 0.5);
    });

    it("uses custom GetFeatureInfo handling function if specified", function () {
      function fooProcessor(response) {
        const json = JSON.parse(response);
        expect(json.custom).toBe(true);
        const feature = new ImageryLayerFeatureInfo();
        feature.name = "Foo processed!";
        return [feature];
      }

      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
        getFeatureInfoFormats: [
          new GetFeatureInfoFormat("foo", "application/foo", fooProcessor),
        ],
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
        expect(url).toContain("GetFeatureInfo");

        if (url.indexOf(encodeURIComponent("application/foo")) < 0) {
          deferred.reject();
        }

        return Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo-Custom.json",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider.pickFeatures(0, 0, 0, 0.5, 0.5).then(function (features) {
        expect(features.length).toBe(1);
        expect(features[0].name).toEqual("Foo processed!");
      });
    });

    it("works with HTML response", function () {
      const provider = new WebMapServiceImageryProvider({
        url: "made/up/wms/server",
        layers: "someLayer",
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
        expect(url).toContain("GetFeatureInfo");
        if (url.indexOf(encodeURIComponent("text/html")) < 0) {
          deferred.reject();
        }
        Resource._DefaultImplementations.loadWithXhr(
          "Data/WMS/GetFeatureInfo.html",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider
        .pickFeatures(0, 0, 0, 0.5, 0.5)
        .then(function (pickResult) {
          expect(pickResult.length).toBe(1);

          const firstResult = pickResult[0];
          expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
          expect(firstResult.name).toBe("HTML yeah!");
          expect(firstResult.description).toContain("great information");
        });
    });
  });

  describe("verifyClockTimes", function () {
    it("requires clock if times is specified", function () {
      function createWithoutClock() {
        return new WebMapServiceImageryProvider({
          layers: "someLayer",
          url: "http://wms.invalid/",
          times: new TimeIntervalCollection(),
        });
      }

      expect(createWithoutClock).toThrowDeveloperError();
    });

    it("tiles preload on requestImage as we approach the next time interval", function () {
      const times = TimeIntervalCollection.fromIso8601({
        iso8601: "2017-04-26/2017-04-30/P1D",
        dataCallback: function (interval, index) {
          return {
            Time: JulianDate.toIso8601(interval.start),
          };
        },
      });
      const clock = new Clock({
        currentTime: JulianDate.fromIso8601("2017-04-26"),
        shouldAnimate: true,
      });

      const provider = new WebMapServiceImageryProvider({
        layers: "someLayer",
        style: "someStyle",
        url: "http://wms.invalid/",
        clock: clock,
        times: times,
      });

      Resource._Implementations.createImage = function (
        request,
        crossOrigin,
        deferred
      ) {
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      };

      let entry;
      clock.currentTime = JulianDate.fromIso8601("2017-04-26T23:59:56Z");
      return provider
        .requestImage(0, 0, 0, new Request())
        .then(function () {
          RequestScheduler.update();

          // Test tile 0,0,0 was prefetched
          const cache = provider._timeDynamicImagery._tileCache;
          expect(cache["1"]).toBeDefined();
          entry = cache["1"]["0-0-0"];
          expect(entry).toBeDefined();
          expect(entry.promise).toBeDefined();
          return entry.promise;
        })
        .then(function () {
          expect(entry.request).toBeDefined();
          expect(entry.request.state).toEqual(RequestState.RECEIVED);
        });
    });

    it("tiles preload onTick event as we approach the next time interval", function () {
      const times = TimeIntervalCollection.fromIso8601({
        iso8601: "2017-04-26/2017-04-30/P1D",
        dataCallback: function (interval, index) {
          return {
            Time: JulianDate.toIso8601(interval.start),
          };
        },
      });
      const clock = new Clock({
        currentTime: JulianDate.fromIso8601("2017-04-26"),
        shouldAnimate: true,
      });

      const provider = new WebMapServiceImageryProvider({
        layers: "someLayer",
        style: "someStyle",
        url: "http://wms.invalid/",
        clock: clock,
        times: times,
      });

      Resource._Implementations.createImage = function (
        request,
        crossOrigin,
        deferred
      ) {
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      };

      let entry;
      return provider
        .requestImage(0, 0, 0, new Request())
        .then(function () {
          // Test tile 0,0,0 wasn't prefetched
          const cache = provider._timeDynamicImagery._tileCache;
          expect(cache["1"]).toBeUndefined();

          // Update the clock and process any requests
          clock.currentTime = JulianDate.fromIso8601("2017-04-26T23:59:55Z");
          clock.tick();
          RequestScheduler.update();

          // Test tile 0,0,0 was prefetched
          expect(cache["1"]).toBeDefined();
          entry = cache["1"]["0-0-0"];
          expect(entry).toBeDefined();
          expect(entry.promise).toBeDefined();
          return entry.promise;
        })
        .then(function () {
          expect(entry.request).toBeDefined();
          expect(entry.request.state).toEqual(RequestState.RECEIVED);
        });
    });

    it("reload is called once we cross into next interval", function () {
      const times = TimeIntervalCollection.fromIso8601({
        iso8601: "2017-04-26/2017-04-30/P1D",
        dataCallback: function (interval, index) {
          return {
            Time: JulianDate.toIso8601(interval.start),
          };
        },
      });
      const clock = new Clock({
        currentTime: JulianDate.fromIso8601("2017-04-26"),
        clockStep: ClockStep.TICK_DEPENDENT,
        shouldAnimate: true,
      });

      Resource._Implementations.createImage = function (
        request,
        crossOrigin,
        deferred
      ) {
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      };

      const provider = new WebMapServiceImageryProvider({
        layers: "someLayer",
        style: "someStyle",
        url: "http://wms.invalid/",
        clock: clock,
        times: times,
      });

      provider._reload = jasmine.createSpy();
      spyOn(provider._timeDynamicImagery, "getFromCache").and.callThrough();

      clock.currentTime = JulianDate.fromIso8601("2017-04-26T23:59:59Z");
      return provider
        .requestImage(0, 0, 0, new Request())
        .then(function () {
          RequestScheduler.update();
          clock.tick();

          return provider.requestImage(0, 0, 0, new Request());
        })
        .then(function () {
          expect(provider._reload.calls.count()).toEqual(1);

          const calls = provider._timeDynamicImagery.getFromCache.calls.all();
          expect(calls.length).toBe(2);
          expect(calls[0].returnValue).toBeUndefined();
          expect(calls[1].returnValue).toBeDefined();
        });
    });

    it("Data in request comes from the time interval collection", function () {
      const times = TimeIntervalCollection.fromIso8601({
        iso8601: "2017-04-26/2017-04-30/P1D",
        dataCallback: function (interval, index) {
          return {
            Time: JulianDate.toIso8601(interval.start),
            Test: "testValue",
          };
        },
      });
      const clock = new Clock({
        currentTime: JulianDate.fromIso8601("2017-04-26"),
        clockStep: ClockStep.TICK_DEPENDENT,
        shouldAnimate: false,
      });

      Resource._Implementations.createImage = function (
        request,
        crossOrigin,
        deferred
      ) {
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      };

      const provider = new WebMapServiceImageryProvider({
        layers: "someLayer",
        style: "someStyle",
        url: "http://wms.invalid/",
        clock: clock,
        times: times,
      });

      provider._reload = jasmine.createSpy();
      spyOn(provider._timeDynamicImagery, "getFromCache").and.callThrough();

      return provider.requestImage(0, 0, 0, new Request()).then(function () {
        const queryParameters =
          provider._tileProvider._resource.queryParameters;
        expect(queryParameters.Time).toEqual("2017-04-26T00:00:00Z");
        expect(queryParameters.Test).toEqual("testValue");
      });
    });
  });

  it("uses getFeatureInfoUrl in options for getting the getFeatureInfo URL", function () {
    const featureUrl = "made/up/wms/feature/server";
    const provider = new WebMapServiceImageryProvider({
      url: "made/up/wms/server",
      layers: "someLayer",
      getFeatureInfoUrl: featureUrl,
    });
    expect(provider._pickFeaturesResource.url).toContain(featureUrl);
  });

  it("uses url in options if getFeatureInfoUrl is absent for pickResources", function () {
    const featureUrl = "made/up/wms/feature/server";
    const getCapabilitiesUrl = "made/up/wms/server";
    const provider = new WebMapServiceImageryProvider({
      url: getCapabilitiesUrl,
      layers: "someLayer",
    });

    expect(provider._pickFeaturesResource.url).not.toContain(featureUrl);
    expect(provider._pickFeaturesResource.url).toContain(getCapabilitiesUrl);
  });
});
