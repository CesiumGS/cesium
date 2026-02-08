import Uri from "urijs";
import {
  Clock,
  ClockStep,
  Credit,
  GeographicTilingScheme,
  Imagery,
  ImageryLayer,
  ImageryProvider,
  ImageryState,
  JulianDate,
  objectToQuery,
  queryToObject,
  Request,
  RequestScheduler,
  RequestState,
  Resource,
  TimeIntervalCollection,
  WebMapTileServiceImageryProvider,
  WebMercatorTilingScheme,
} from "../../index.js";

import pollToPromise from "../../../../Specs/pollToPromise.js";
import GetFeatureInfoFormat from "../../Source/Scene/GetFeatureInfoFormat.js";
import ImageryLayerFeatureInfo from "../../Source/Scene/ImageryLayerFeatureInfo.js";

describe("Scene/WebMapTileServiceImageryProvider", function () {
  beforeEach(function () {
    RequestScheduler.clearForSpecs();
  });

  afterEach(function () {
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
  });

  it("conforms to ImageryProvider interface", function () {
    expect(WebMapTileServiceImageryProvider).toConformToInterface(
      ImageryProvider,
    );
  });

  it("generates expected tile urls", function () {
    const options = {
      url: "http://wmts.invalid",
      format: "image/png",
      layer: "someLayer",
      style: "someStyle",
      tileMatrixSetID: "someTMS",
      tileMatrixLabels: ["first", "second", "third"],
    };

    const provider = new WebMapTileServiceImageryProvider(options);

    spyOn(ImageryProvider, "loadImage");

    let tilecol = 12;
    let tilerow = 5;
    let level = 1;
    provider.requestImage(tilecol, tilerow, level);
    let uri = new Uri(ImageryProvider.loadImage.calls.mostRecent().args[1].url);
    let queryObject = queryToObject(uri.query());

    expect(queryObject.request).toEqual("GetTile");
    expect(queryObject.service).toEqual("WMTS");
    expect(queryObject.version).toEqual("1.0.0");
    expect(queryObject.format).toEqual(options.format);
    expect(queryObject.layer).toEqual(options.layer);
    expect(queryObject.style).toEqual(options.style);
    expect(parseInt(queryObject.tilecol, 10)).toEqual(tilecol);
    expect(queryObject.tilematrixset).toEqual(options.tileMatrixSetID);
    expect(queryObject.tilematrix).toEqual(options.tileMatrixLabels[level]);
    expect(parseInt(queryObject.tilerow, 10)).toEqual(tilerow);

    tilecol = 1;
    tilerow = 3;
    level = 2;
    provider.requestImage(tilecol, tilerow, level);
    uri = new Uri(ImageryProvider.loadImage.calls.mostRecent().args[1].url);
    queryObject = queryToObject(uri.query());

    expect(queryObject.request).toEqual("GetTile");
    expect(queryObject.service).toEqual("WMTS");
    expect(queryObject.version).toEqual("1.0.0");
    expect(queryObject.format).toEqual(options.format);
    expect(queryObject.layer).toEqual(options.layer);
    expect(queryObject.style).toEqual(options.style);
    expect(parseInt(queryObject.tilecol, 10)).toEqual(tilecol);
    expect(queryObject.tilematrixset).toEqual(options.tileMatrixSetID);
    expect(queryObject.tilematrix).toEqual(options.tileMatrixLabels[level]);
    expect(parseInt(queryObject.tilerow, 10)).toEqual(tilerow);
  });

  it("generates expected tile urls for subdomains", function () {
    const options = {
      url: "http://wmts{s}.invalid",
      format: "image/png",
      layer: "someLayer",
      style: "someStyle",
      tileMatrixSetID: "someTMS",
      tileMatrixLabels: ["first", "second", "third"],
    };

    const provider = new WebMapTileServiceImageryProvider(options);

    spyOn(ImageryProvider, "loadImage");

    let tilecol = 12;
    let tilerow = 5;
    let level = 1;
    provider.requestImage(tilecol, tilerow, level);
    let uri = new Uri(ImageryProvider.loadImage.calls.mostRecent().args[1].url);
    let queryObject = queryToObject(uri.query());

    expect(queryObject.request).toEqual("GetTile");
    expect(queryObject.service).toEqual("WMTS");
    expect(queryObject.version).toEqual("1.0.0");
    expect(queryObject.format).toEqual(options.format);
    expect(queryObject.layer).toEqual(options.layer);
    expect(queryObject.style).toEqual(options.style);
    expect(parseInt(queryObject.tilecol, 10)).toEqual(tilecol);
    expect(queryObject.tilematrixset).toEqual(options.tileMatrixSetID);
    expect(queryObject.tilematrix).toEqual(options.tileMatrixLabels[level]);
    expect(parseInt(queryObject.tilerow, 10)).toEqual(tilerow);
    expect(uri.authority()).toEqual("wmtsa.invalid");

    tilecol = 2;
    tilerow = 3;
    level = 2;
    provider.requestImage(tilecol, tilerow, level);
    uri = new Uri(ImageryProvider.loadImage.calls.mostRecent().args[1].url);
    queryObject = queryToObject(uri.query());

    expect(queryObject.request).toEqual("GetTile");
    expect(queryObject.service).toEqual("WMTS");
    expect(queryObject.version).toEqual("1.0.0");
    expect(queryObject.format).toEqual(options.format);
    expect(queryObject.layer).toEqual(options.layer);
    expect(queryObject.style).toEqual(options.style);
    expect(parseInt(queryObject.tilecol, 10)).toEqual(tilecol);
    expect(queryObject.tilematrixset).toEqual(options.tileMatrixSetID);
    expect(queryObject.tilematrix).toEqual(options.tileMatrixLabels[level]);
    expect(parseInt(queryObject.tilerow, 10)).toEqual(tilerow);
    expect(uri.authority()).toEqual("wmtsb.invalid");
  });

  it("supports subdomains string urls", function () {
    const options = {
      url: "{s}",
      layer: "",
      style: "",
      subdomains: "123",
      tileMatrixSetID: "",
    };

    const provider = new WebMapTileServiceImageryProvider(options);

    spyOn(ImageryProvider, "loadImage");

    const tilecol = 1;
    const tilerow = 1;
    const level = 1;
    provider.requestImage(tilecol, tilerow, level);
    const url = ImageryProvider.loadImage.calls
      .mostRecent()
      .args[1].getUrlComponent();
    expect("123".indexOf(url)).toBeGreaterThanOrEqual(0);
  });

  it("supports subdomains array urls", function () {
    const options = {
      url: "{s}",
      layer: "",
      style: "",
      subdomains: ["foo", "bar"],
      tileMatrixSetID: "",
    };

    const provider = new WebMapTileServiceImageryProvider(options);

    spyOn(ImageryProvider, "loadImage");

    const tilecol = 1;
    const tilerow = 1;
    const level = 1;
    provider.requestImage(tilecol, tilerow, level);
    const url = ImageryProvider.loadImage.calls
      .mostRecent()
      .args[1].getUrlComponent();
    expect(["foo", "bar"].indexOf(url)).toBeGreaterThanOrEqual(0);
  });

  it("generates expected tile urls from template", function () {
    const options = {
      url: "http://wmts.invalid/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
      format: "image/png",
      layer: "someLayer",
      style: "someStyle",
      tileMatrixSetID: "someTMS",
      tileMatrixLabels: ["first", "second", "third"],
    };

    const provider = new WebMapTileServiceImageryProvider(options);

    spyOn(ImageryProvider, "loadImage");

    const tilecol = 12;
    const tilerow = 5;
    const level = 1;
    provider.requestImage(tilecol, tilerow, level);
    const uri = new Uri(
      ImageryProvider.loadImage.calls.mostRecent().args[1].getUrlComponent(),
    );
    expect(uri.toString()).toEqual(
      "http://wmts.invalid/someStyle/someTMS/second/5/12.png",
    );
  });

  it("requires the url to be specified", function () {
    function createWithoutUrl() {
      return new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        tileMatrixSetID: "someTMS",
      });
    }

    expect(createWithoutUrl).toThrowDeveloperError();
  });

  it("requires the layer to be specified", function () {
    function createWithoutLayer() {
      return new WebMapTileServiceImageryProvider({
        url: "http://wmts.invalid",
        style: "someStyle",
        tileMatrixSetID: "someTMS",
      });
    }

    expect(createWithoutLayer).toThrowDeveloperError();
  });

  it("requires the style to be specified", function () {
    function createWithoutStyle() {
      return new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
      });
    }

    expect(createWithoutStyle).toThrowDeveloperError();
  });

  it("requires the tileMatrixSetID to be specified", function () {
    function createWithoutTMS() {
      return new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
      });
    }

    expect(createWithoutTMS).toThrowDeveloperError();
  });

  it("requires clock if times is specified", function () {
    function createWithoutClock() {
      return new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
        times: new TimeIntervalCollection(),
      });
    }

    expect(createWithoutClock).toThrowDeveloperError();
  });

  // default parameters values
  it("uses default values for undefined parameters", function () {
    const provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid",
      tileMatrixSetID: "someTMS",
    });
    expect(provider.format).toEqual("image/jpeg");
    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.minimumLevel).toEqual(0);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.rectangle).toEqual(provider.tilingScheme.rectangle);
    expect(provider.credit).toBeUndefined();
    expect(provider.proxy).toBeUndefined();
  });

  // non default parameters values
  it("uses parameters passed to constructor", function () {
    const tilingScheme = new GeographicTilingScheme();
    const rectangle = new WebMercatorTilingScheme().rectangle;
    const provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid",
      tileMatrixSetID: "someTMS",
      format: "someFormat",
      tileWidth: 512,
      tileHeight: 512,
      tilingScheme: tilingScheme,
      minimumLevel: 0,
      maximumLevel: 12,
      rectangle: rectangle,
      credit: "Thanks for using our WMTS server.",
    });
    expect(provider.format).toEqual("someFormat");
    expect(provider.tileWidth).toEqual(512);
    expect(provider.tileHeight).toEqual(512);
    expect(provider.minimumLevel).toEqual(0);
    expect(provider.maximumLevel).toEqual(12);
    expect(provider.tilingScheme).toEqual(tilingScheme);
    expect(provider.credit).toBeDefined();
    expect(provider.credit).toBeInstanceOf(Credit);
    expect(provider.rectangle).toEqual(rectangle);
  });

  it("doesn't care about trailing question mark at the end of URL", function () {
    const provider1 = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid",
      tileMatrixSetID: "someTMS",
    });
    const provider2 = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid?",
      tileMatrixSetID: "someTMS",
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(
      function (request, crossOrigin, deferred) {
        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
        );
      },
    );

    return provider1.requestImage(0, 0, 0).then(function (image) {
      return provider2.requestImage(0, 0, 0).then(function (image) {
        expect(Resource._Implementations.createImage.calls.count()).toEqual(2);
        //expect the two image URLs to be the same between the two providers
        const allCalls = Resource._Implementations.createImage.calls.all();
        expect(allCalls[1].args[0].url).toEqual(allCalls[0].args[0].url);
      });
    });
  });

  it("requestImage returns a promise for an image and loads it for cross-origin use", function () {
    const provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid",
      tileMatrixSetID: "someTMS",
    });

    spyOn(Resource._Implementations, "createImage").and.callFake(
      function (request, crossOrigin, deferred) {
        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
        );
      },
    );

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("raises error event when image cannot be loaded", function () {
    const provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid",
      tileMatrixSetID: "someTMS",
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
      deferred,
    ) {
      if (tries === 2) {
        // Succeed after 2 tries
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
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

    const provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid/{Time}",
      tileMatrixSetID: "someTMS",
      clock: clock,
      times: times,
    });

    Resource._Implementations.createImage = function (
      request,
      crossOrigin,
      deferred,
    ) {
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred,
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

    const provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid/{Time}",
      tileMatrixSetID: "someTMS",
      clock: clock,
      times: times,
    });

    Resource._Implementations.createImage = function (
      request,
      crossOrigin,
      deferred,
    ) {
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred,
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
      deferred,
    ) {
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred,
      );
    };

    const provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid/{Time}",
      tileMatrixSetID: "someTMS",
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

  it("hasAlphaChannel returns true", function () {
    const provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid",
      tileMatrixSetID: "someTMS",
    });
    expect(provider.hasAlphaChannel).toBe(true);
  });

  it("dimensions setter does not trigger reload when set to the same reference", function () {
    const dims = { FOO: "BAR" };
    const provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid/{FOO}",
      tileMatrixSetID: "someTMS",
      dimensions: dims,
    });

    provider._reload = jasmine.createSpy();

    provider.dimensions = dims;
    expect(provider._reload).not.toHaveBeenCalled();
  });

  it("dimensions work with RESTful requests", function () {
    let lastUrl;
    Resource._Implementations.createImage = function (
      request,
      crossOrigin,
      deferred,
    ) {
      lastUrl = request.url;
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred,
      );
    };

    const provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid/{FOO}",
      tileMatrixSetID: "someTMS",
      dimensions: {
        FOO: "BAR",
      },
    });

    provider._reload = jasmine.createSpy();

    return provider
      .requestImage(0, 0, 0, new Request())
      .then(function () {
        expect(lastUrl).toStartWith("http://wmts.invalid/BAR");
        expect(provider._reload.calls.count()).toEqual(0);
        provider.dimensions = {
          FOO: "BAZ",
        };
        expect(provider._reload.calls.count()).toEqual(1);
        return provider.requestImage(0, 0, 0, new Request());
      })
      .then(function () {
        expect(lastUrl).toStartWith("http://wmts.invalid/BAZ");
      });
  });

  it("dimensions work with KVP requests", function () {
    let lastUrl;
    Resource._Implementations.createImage = function (
      request,
      crossOrigin,
      deferred,
    ) {
      lastUrl = request.url;
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred,
      );
    };

    const uri = new Uri("http://wmts.invalid/kvp");
    const query = {
      FOO: "BAR",
      service: "WMTS",
      version: "1.0.0",
      request: "GetTile",
      tilematrix: 0,
      layer: "someLayer",
      style: "someStyle",
      tilerow: 0,
      tilecol: 0,
      tilematrixset: "someTMS",
      format: "image/jpeg",
    };

    const provider = new WebMapTileServiceImageryProvider({
      layer: query.layer,
      style: query.style,
      url: uri.toString(),
      tileMatrixSetID: query.tilematrixset,
      dimensions: {
        FOO: query.FOO,
      },
    });

    provider._reload = jasmine.createSpy();

    return provider
      .requestImage(0, 0, 0, new Request())
      .then(function () {
        // Verify request is correct
        uri.query(objectToQuery(query));
        expect(lastUrl).toEqual(uri.toString());
        expect(provider._reload.calls.count()).toEqual(0);

        // Change value of FOO dimension
        query.FOO = "BAZ";
        provider.dimensions = {
          FOO: query.FOO,
        };
        expect(provider._reload.calls.count()).toEqual(1);
        return provider.requestImage(0, 0, 0, new Request());
      })
      .then(function () {
        // Verify request changed
        uri.query(objectToQuery(query));
        expect(lastUrl).toEqual(uri.toString());
      });
  });

  describe("pickFeatures", function () {
    it("returns undefined if getFeatureInfoFormats is empty", function () {
      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
        getFeatureInfoFormats: [],
      });

      expect(provider.pickFeatures(0, 0, 0, 0.0, 0.0)).toBeUndefined();
    });

    it("returns undefined if enablePickFeatures is false", function () {
      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
        enablePickFeatures: false,
      });
      expect(provider.enablePickFeatures).toBe(false);
      expect(provider.pickFeatures(0, 0, 0, 0.0, 0.0)).toBeUndefined();
    });

    it("defaults enablePickFeatures to true for KVP without getFeatureInfoUrl", function () {
      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
      });
      expect(provider.enablePickFeatures).toBe(true);
    });

    it("defaults enablePickFeatures to false for RESTful without getFeatureInfoUrl", function () {
      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
        tileMatrixSetID: "someTMS",
      });
      expect(provider.enablePickFeatures).toBe(false);
    });

    it("defaults enablePickFeatures to true for RESTful when getFeatureInfoUrl is specified", function () {
      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
        tileMatrixSetID: "someTMS",
        getFeatureInfoUrl:
          "http://wmts.invalid/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}/{j}/{i}?format={format}",
      });
      expect(provider.enablePickFeatures).toBe(true);
    });

    it("honors explicit enablePickFeatures for RESTful without getFeatureInfoUrl", function () {
      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
        tileMatrixSetID: "someTMS",
        enablePickFeatures: true,
      });
      expect(provider.enablePickFeatures).toBe(true);
    });

    it("does not return undefined when enablePickFeatures is toggled to true", function () {
      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
      });

      provider.enablePickFeatures = false;

      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        Promise.resolve({
          type: "FeatureCollection",
          features: [],
        }),
      );

      provider.enablePickFeatures = true;
      expect(provider.enablePickFeatures).toBe(true);

      const pickPromise = provider.pickFeatures(0, 0, 0, 0.0, 0.0);
      expect(pickPromise).toBeDefined();

      return pickPromise.then(function (features) {
        expect(Array.isArray(features)).toBe(true);
        expect(features.length).toBe(0);
      });
    });

    it("getFeatureInfoUrl defaults to url when not specified", function () {
      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
      });
      expect(provider.getFeatureInfoUrl).toBe("http://wmts.invalid");
    });

    it("getFeatureInfoUrl returns custom value when specified", function () {
      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
        getFeatureInfoUrl: "http://wmts.invalid/gfi",
      });
      expect(provider.getFeatureInfoUrl).toBe("http://wmts.invalid/gfi");
    });

    it("uses getFeatureInfoUrl for picking while tile requests use url", function () {
      const tileUrl = "http://wmts.invalid/tiles";
      const gfiUrl = "http://wmts.invalid/gfi";

      spyOn(ImageryProvider, "loadImage");
      let capturedGfiUrl;
      spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
        capturedGfiUrl = this.getUrlComponent(true);
        return Promise.resolve({ type: "FeatureCollection", features: [] });
      });

      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: tileUrl,
        tileMatrixSetID: "someTMS",
        getFeatureInfoUrl: gfiUrl,
        getFeatureInfoFormats: [new GetFeatureInfoFormat("json")],
      });

      provider.requestImage(0, 0, 0);
      const tileRequestUrl =
        ImageryProvider.loadImage.calls.mostRecent().args[1].url;
      expect(tileRequestUrl).toStartWith(tileUrl);
      expect(tileRequestUrl).not.toContain("gfi");

      return provider.pickFeatures(0, 0, 0, 0.0, 0.0).then(function () {
        expect(capturedGfiUrl).toStartWith(gfiUrl);
        expect(capturedGfiUrl).not.toContain("/tiles");
      });
    });

    it("builds correct GetFeatureInfo URL (KVP Encoding)", function () {
      const expectedUrl = new URL("http://wmts.invalid");
      expectedUrl.searchParams.set("service", "WMTS");
      expectedUrl.searchParams.set("version", "1.0.0");
      expectedUrl.searchParams.set("request", "GetFeatureInfo");
      expectedUrl.searchParams.set("infoformat", "application/json");
      expectedUrl.searchParams.set("i", "128");
      expectedUrl.searchParams.set("j", "128");
      expectedUrl.searchParams.set("format", "image/jpeg");
      expectedUrl.searchParams.set("tilematrix", "0");
      expectedUrl.searchParams.set("layer", "someLayer");
      expectedUrl.searchParams.set("style", "someStyle");
      expectedUrl.searchParams.set("tilerow", "0");
      expectedUrl.searchParams.set("tilecol", "0");
      expectedUrl.searchParams.set("tilematrixset", "someTMS");

      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
      });

      spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
        const url = this.getUrlComponent(true);
        expect(url).toBe(expectedUrl.toString());
        return Promise.resolve({ type: "FeatureCollection", features: [] });
      });

      return provider.pickFeatures(0, 0, 0, 0.0, 0.0).then(function (features) {
        expect(Array.isArray(features)).toBe(true);
      });
    });

    it("builds correct GetFeatureInfo URL (RESTful template)", function () {
      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid/rest/{layer}/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}?format={format}",
        tileMatrixSetID: "someTMS",
        tileMatrixLabels: ["someTMS:0"],
        tilingScheme: new GeographicTilingScheme({
          numberOfLevelZeroTilesX: 1,
        }),
        format: "image/png",
        getFeatureInfoUrl:
          "http://wmts.invalid/rest/{layer}/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}/{j}/{i}?format={format}",
        getFeatureInfoFormats: [new GetFeatureInfoFormat("json")],
      });

      spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
        const url = this.getUrlComponent(true);
        expect(url).toBe(
          "http://wmts.invalid/rest/someLayer/someStyle/someTMS/someTMS%3A0/0/0/128/128?format=application%2Fjson",
        );
        return Promise.resolve({ type: "FeatureCollection", features: [] });
      });

      return provider.pickFeatures(0, 0, 0, 0.0, 0.0).then(function (features) {
        expect(Array.isArray(features)).toBe(true);
      });
    });

    it("builds GetFeatureInfo request and parses JSON response", function () {
      const tilingScheme = new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 1,
      });
      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
        tileMatrixLabels: ["level-zero"],
        tilingScheme: tilingScheme,
        format: "image/png",
        getFeatureInfoFormats: [new GetFeatureInfoFormat("json")],
      });

      spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
        const url = this.getUrlComponent(true);
        const uri = new Uri(url);
        const params = queryToObject(uri.query());
        expect(params.tilematrix).toBe("level-zero");

        return Promise.resolve({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [0, 0],
              },
              properties: {
                name: "Feature name",
              },
            },
          ],
        });
      });

      return provider.pickFeatures(0, 0, 0, 0.0, 0.0).then(function (features) {
        expect(Resource.prototype.fetchJson).toHaveBeenCalled();
        expect(features.length).toBe(1);

        const featureInfo = features[0];
        expect(featureInfo).toBeInstanceOf(ImageryLayerFeatureInfo);
        expect(featureInfo.name).toBe("Feature name");
        expect(featureInfo.position.longitude).toBeCloseTo(0, 10);
        expect(featureInfo.position.latitude).toBeCloseTo(0, 10);
      });
    });

    it("includes dimensions in GetFeatureInfo KVP requests", function () {
      let capturedUrl;
      spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
        capturedUrl = this.getUrlComponent(true);
        return Promise.resolve({ type: "FeatureCollection", features: [] });
      });

      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid/kvp",
        tileMatrixSetID: "someTMS",
        dimensions: { FOO: "BAR" },
        getFeatureInfoFormats: [new GetFeatureInfoFormat("json")],
      });

      return provider.pickFeatures(0, 0, 0, 0.0, 0.0).then(function () {
        const uri = new Uri(capturedUrl);
        const params = queryToObject(uri.query());
        expect(params.FOO).toBe("BAR");
      });
    });

    it("includes dimensions in GetFeatureInfo RESTful requests via template values", function () {
      let capturedUrl;
      spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
        capturedUrl = this.getUrlComponent(true);
        return Promise.resolve({ type: "FeatureCollection", features: [] });
      });

      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid/{FOO}",
        tileMatrixSetID: "someTMS",
        dimensions: { FOO: "BAR" },
        getFeatureInfoFormats: [new GetFeatureInfoFormat("json")],
        getFeatureInfoUrl: "http://wmts.invalid/{FOO}?format={format}",
      });

      return provider.pickFeatures(0, 0, 0, 0.0, 0.0).then(function () {
        expect(capturedUrl).toStartWith("http://wmts.invalid/BAR");
      });
    });

    it("includes time-dynamic template values in GetFeatureInfo RESTful requests", function () {
      let capturedUrl;
      spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
        capturedUrl = this.getUrlComponent(true);
        return Promise.resolve({ type: "FeatureCollection", features: [] });
      });

      const times = TimeIntervalCollection.fromIso8601({
        iso8601: "2017-04-26/2017-04-30/P1D",
        dataCallback: function (interval, index) {
          return { Time: JulianDate.toIso8601(interval.start) };
        },
      });
      const clock = new Clock({
        currentTime: JulianDate.fromIso8601("2017-04-26"),
        shouldAnimate: false,
      });

      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid/{Time}",
        tileMatrixSetID: "someTMS",
        clock: clock,
        times: times,
        getFeatureInfoFormats: [new GetFeatureInfoFormat("json")],
        getFeatureInfoUrl: "http://wmts.invalid/{Time}?format={format}",
      });

      return provider.pickFeatures(0, 0, 0, 0.0, 0.0).then(function () {
        expect(decodeURIComponent(capturedUrl)).toContain(
          "/2017-04-26T00:00:00Z",
        );
      });
    });

    it("includes both static dimensions and time-dynamic data in KVP GetFeatureInfo requests", function () {
      let capturedUrl;
      spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
        capturedUrl = this.getUrlComponent(true);
        return Promise.resolve({ type: "FeatureCollection", features: [] });
      });

      const times = TimeIntervalCollection.fromIso8601({
        iso8601: "2017-04-26/2017-04-30/P1D",
        dataCallback: function (interval) {
          return { Time: JulianDate.toIso8601(interval.start) };
        },
      });
      const clock = new Clock({
        currentTime: JulianDate.fromIso8601("2017-04-26"),
        shouldAnimate: false,
      });

      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
        clock: clock,
        times: times,
        dimensions: { ELEVATION: "500" },
        getFeatureInfoFormats: [new GetFeatureInfoFormat("json")],
      });

      return provider.pickFeatures(0, 0, 0, 0.0, 0.0).then(function () {
        const uri = new Uri(capturedUrl);
        const params = queryToObject(uri.query());
        expect(params.ELEVATION).toBe("500");
        expect(params.Time).toBe("2017-04-26T00:00:00Z");
      });
    });

    it("applies getFeatureInfoParameters with lowercased keys", function () {
      let capturedUrl;
      spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
        capturedUrl = this.getUrlComponent(true);
        return Promise.resolve({ type: "FeatureCollection", features: [] });
      });

      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
        getFeatureInfoParameters: { CUSTOM_PARAM: "foo" },
        getFeatureInfoFormats: [new GetFeatureInfoFormat("json")],
      });

      return provider.pickFeatures(0, 0, 0, 0.0, 0.0).then(function () {
        const uri = new Uri(capturedUrl);
        const params = queryToObject(uri.query());
        expect(params.custom_param).toBe("foo");
      });
    });

    it("applies getFeatureInfoParameters as template values in RESTful requests", function () {
      let capturedUrl;
      spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
        capturedUrl = this.getUrlComponent(true);
        return Promise.resolve({ type: "FeatureCollection", features: [] });
      });

      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
        tileMatrixSetID: "someTMS",
        getFeatureInfoUrl:
          "http://wmts.invalid/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}/{j}/{i}?format={format}&custom_key={custom_key}",
        getFeatureInfoParameters: { CUSTOM_KEY: "custom_value" },
        getFeatureInfoFormats: [new GetFeatureInfoFormat("json")],
      });

      return provider.pickFeatures(0, 0, 0, 0.0, 0.0).then(function () {
        expect(decodeURIComponent(capturedUrl)).toContain(
          "custom_key=custom_value",
        );
      });
    });

    it("sets correct infoformat for XML and HTML requests", function () {
      const providerXml = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
        getFeatureInfoFormats: [new GetFeatureInfoFormat("xml")],
      });

      spyOn(Resource.prototype, "fetchXML").and.callFake(function () {
        const url = this.getUrlComponent(true);
        const uri = new Uri(url);
        const params = queryToObject(uri.query());
        expect(params.infoformat).toBe("text/xml");
        const parser = new DOMParser();
        return Promise.resolve(
          parser.parseFromString("<Foo/>", "application/xml"),
        );
      });

      const providerHtml = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
        getFeatureInfoFormats: [new GetFeatureInfoFormat("html")],
      });

      spyOn(Resource.prototype, "fetchText").and.callFake(function () {
        const url = this.getUrlComponent(true);
        const uri = new Uri(url);
        const params = queryToObject(uri.query());
        expect(params.infoformat).toBe("text/html");
        return Promise.resolve("<html><title>x</title></html>");
      });

      return providerXml
        .pickFeatures(0, 0, 0, 0.0, 0.0)
        .then(function () {
          return providerHtml.pickFeatures(0, 0, 0, 0.0, 0.0);
        })
        .then(function () {
          expect(true).toBe(true);
        });
    });

    it("falls back to the next format when the first request fails", function () {
      function fallbackProcessor(response) {
        expect(response.custom).toBe(true);
        const feature = new ImageryLayerFeatureInfo();
        feature.name = "Fallback feature";
        return [feature];
      }

      const formats = [
        new GetFeatureInfoFormat("json"),
        new GetFeatureInfoFormat("foo", "application/foo", fallbackProcessor),
      ];

      const provider = new WebMapTileServiceImageryProvider({
        layer: "someLayer",
        style: "someStyle",
        url: "http://wmts.invalid",
        tileMatrixSetID: "someTMS",
        tilingScheme: new GeographicTilingScheme(),
        getFeatureInfoFormats: formats,
      });

      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        Promise.reject(new Error("no json")),
      );

      spyOn(Resource.prototype, "fetch").and.callFake(function (options) {
        const url = (options && options.url) || this.getUrlComponent(true);
        const uri = new Uri(url);
        const params = queryToObject(uri.query());
        expect(params.infoformat).toBe("application/foo");
        expect(options.responseType).toBe("application/foo");
        return Promise.resolve({
          custom: true,
        });
      });

      return provider.pickFeatures(0, 0, 0, 0.0, 0.0).then(function (features) {
        expect(Resource.prototype.fetchJson).toHaveBeenCalled();
        expect(Resource.prototype.fetch).toHaveBeenCalled();
        expect(features.length).toBe(1);
        expect(features[0].name).toBe("Fallback feature");
      });
    });
  });
});
