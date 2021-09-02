import { Clock } from "../../Source/Cesium.js";
import { ClockStep } from "../../Source/Cesium.js";
import { Credit } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { objectToQuery } from "../../Source/Cesium.js";
import { queryToObject } from "../../Source/Cesium.js";
import { Request } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { RequestState } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { TimeIntervalCollection } from "../../Source/Cesium.js";
import { WebMercatorTilingScheme } from "../../Source/Cesium.js";
import { Imagery } from "../../Source/Cesium.js";
import { ImageryLayer } from "../../Source/Cesium.js";
import { ImageryProvider } from "../../Source/Cesium.js";
import { ImageryState } from "../../Source/Cesium.js";
import { WebMapTileServiceImageryProvider } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";
import { Uri } from "../../Source/Cesium.js";

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
      ImageryProvider
    );
  });

  it("generates expected tile urls", function () {
    var options = {
      url: "http://wmts.invalid",
      format: "image/png",
      layer: "someLayer",
      style: "someStyle",
      tileMatrixSetID: "someTMS",
      tileMatrixLabels: ["first", "second", "third"],
    };

    var provider = new WebMapTileServiceImageryProvider(options);

    spyOn(ImageryProvider, "loadImage");

    var tilecol = 12;
    var tilerow = 5;
    var level = 1;
    provider.requestImage(tilecol, tilerow, level);
    var uri = new Uri(ImageryProvider.loadImage.calls.mostRecent().args[1].url);
    var queryObject = queryToObject(uri.query());

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
    var options = {
      url: "http://wmts{s}.invalid",
      format: "image/png",
      layer: "someLayer",
      style: "someStyle",
      tileMatrixSetID: "someTMS",
      tileMatrixLabels: ["first", "second", "third"],
    };

    var provider = new WebMapTileServiceImageryProvider(options);

    spyOn(ImageryProvider, "loadImage");

    var tilecol = 12;
    var tilerow = 5;
    var level = 1;
    provider.requestImage(tilecol, tilerow, level);
    var uri = new Uri(ImageryProvider.loadImage.calls.mostRecent().args[1].url);
    var queryObject = queryToObject(uri.query());

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
    var options = {
      url: "{s}",
      layer: "",
      style: "",
      subdomains: "123",
      tileMatrixSetID: "",
    };

    var provider = new WebMapTileServiceImageryProvider(options);

    spyOn(ImageryProvider, "loadImage");

    var tilecol = 1;
    var tilerow = 1;
    var level = 1;
    provider.requestImage(tilecol, tilerow, level);
    var url = ImageryProvider.loadImage.calls
      .mostRecent()
      .args[1].getUrlComponent();
    expect("123".indexOf(url)).toBeGreaterThanOrEqualTo(0);
  });

  it("supports subdomains array urls", function () {
    var options = {
      url: "{s}",
      layer: "",
      style: "",
      subdomains: ["foo", "bar"],
      tileMatrixSetID: "",
    };

    var provider = new WebMapTileServiceImageryProvider(options);

    spyOn(ImageryProvider, "loadImage");

    var tilecol = 1;
    var tilerow = 1;
    var level = 1;
    provider.requestImage(tilecol, tilerow, level);
    var url = ImageryProvider.loadImage.calls
      .mostRecent()
      .args[1].getUrlComponent();
    expect(["foo", "bar"].indexOf(url)).toBeGreaterThanOrEqualTo(0);
  });

  it("generates expected tile urls from template", function () {
    var options = {
      url:
        "http://wmts.invalid/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
      format: "image/png",
      layer: "someLayer",
      style: "someStyle",
      tileMatrixSetID: "someTMS",
      tileMatrixLabels: ["first", "second", "third"],
    };

    var provider = new WebMapTileServiceImageryProvider(options);

    spyOn(ImageryProvider, "loadImage");

    var tilecol = 12;
    var tilerow = 5;
    var level = 1;
    provider.requestImage(tilecol, tilerow, level);
    var uri = new Uri(
      ImageryProvider.loadImage.calls.mostRecent().args[1].getUrlComponent()
    );
    expect(uri.toString()).toEqual(
      "http://wmts.invalid/someStyle/someTMS/second/5/12.png"
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

  it("resolves readyPromise", function () {
    var provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid",
      tileMatrixSetID: "someTMS",
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("resolves readyPromise with Resource", function () {
    var resource = new Resource({
      url: "http://wmts.invalid",
    });

    var provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: resource,
      tileMatrixSetID: "someTMS",
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  // default parameters values
  it("uses default values for undefined parameters", function () {
    var provider = new WebMapTileServiceImageryProvider({
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
    var tilingScheme = new GeographicTilingScheme();
    var rectangle = new WebMercatorTilingScheme().rectangle;
    var provider = new WebMapTileServiceImageryProvider({
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
    var provider1 = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid",
      tileMatrixSetID: "someTMS",
    });
    var provider2 = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid?",
      tileMatrixSetID: "someTMS",
    });

    return pollToPromise(function () {
      return provider1.ready && provider2.ready;
    }).then(function () {
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

      return provider1.requestImage(0, 0, 0).then(function (image) {
        return provider2.requestImage(0, 0, 0).then(function (image) {
          expect(Resource._Implementations.createImage.calls.count()).toEqual(
            2
          );
          //expect the two image URLs to be the same between the two providers
          var allCalls = Resource._Implementations.createImage.calls.all();
          expect(allCalls[1].args[0].url).toEqual(allCalls[0].args[0].url);
        });
      });
    });
  });

  it("requestImage returns a promise for an image and loads it for cross-origin use", function () {
    var provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid",
      tileMatrixSetID: "someTMS",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
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

  it("raises error event when image cannot be loaded", function () {
    var provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid",
      tileMatrixSetID: "someTMS",
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

  it("tiles preload on requestImage as we approach the next time interval", function () {
    var times = TimeIntervalCollection.fromIso8601({
      iso8601: "2017-04-26/2017-04-30/P1D",
      dataCallback: function (interval, index) {
        return {
          Time: JulianDate.toIso8601(interval.start),
        };
      },
    });
    var clock = new Clock({
      currentTime: JulianDate.fromIso8601("2017-04-26"),
      shouldAnimate: true,
    });

    var provider = new WebMapTileServiceImageryProvider({
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
      deferred
    ) {
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred
      );
    };

    var entry;
    return pollToPromise(function () {
      return provider.ready;
    })
      .then(function () {
        clock.currentTime = JulianDate.fromIso8601("2017-04-26T23:59:56Z");
        return provider.requestImage(0, 0, 0, new Request());
      })
      .then(function () {
        RequestScheduler.update();

        // Test tile 0,0,0 was prefetched
        var cache = provider._timeDynamicImagery._tileCache;
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
    var times = TimeIntervalCollection.fromIso8601({
      iso8601: "2017-04-26/2017-04-30/P1D",
      dataCallback: function (interval, index) {
        return {
          Time: JulianDate.toIso8601(interval.start),
        };
      },
    });
    var clock = new Clock({
      currentTime: JulianDate.fromIso8601("2017-04-26"),
      shouldAnimate: true,
    });

    var provider = new WebMapTileServiceImageryProvider({
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
      deferred
    ) {
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred
      );
    };

    var entry;
    return pollToPromise(function () {
      return provider.ready;
    })
      .then(function () {
        return provider.requestImage(0, 0, 0, new Request());
      })
      .then(function () {
        // Test tile 0,0,0 wasn't prefetched
        var cache = provider._timeDynamicImagery._tileCache;
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
    var times = TimeIntervalCollection.fromIso8601({
      iso8601: "2017-04-26/2017-04-30/P1D",
      dataCallback: function (interval, index) {
        return {
          Time: JulianDate.toIso8601(interval.start),
        };
      },
    });
    var clock = new Clock({
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

    var provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid/{Time}",
      tileMatrixSetID: "someTMS",
      clock: clock,
      times: times,
    });

    provider._reload = jasmine.createSpy();
    spyOn(provider._timeDynamicImagery, "getFromCache").and.callThrough();

    return pollToPromise(function () {
      return provider.ready;
    })
      .then(function () {
        clock.currentTime = JulianDate.fromIso8601("2017-04-26T23:59:59Z");
        return provider.requestImage(0, 0, 0, new Request());
      })
      .then(function () {
        RequestScheduler.update();
        clock.tick();

        return provider.requestImage(0, 0, 0, new Request());
      })
      .then(function () {
        expect(provider._reload.calls.count()).toEqual(1);

        var calls = provider._timeDynamicImagery.getFromCache.calls.all();
        expect(calls.length).toBe(2);
        expect(calls[0].returnValue).toBeUndefined();
        expect(calls[1].returnValue).toBeDefined();
      });
  });

  it("dimensions work with RESTful requests", function () {
    var lastUrl;
    Resource._Implementations.createImage = function (
      request,
      crossOrigin,
      deferred
    ) {
      lastUrl = request.url;
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred
      );
    };

    var provider = new WebMapTileServiceImageryProvider({
      layer: "someLayer",
      style: "someStyle",
      url: "http://wmts.invalid/{FOO}",
      tileMatrixSetID: "someTMS",
      dimensions: {
        FOO: "BAR",
      },
    });

    provider._reload = jasmine.createSpy();

    return pollToPromise(function () {
      return provider.ready;
    })
      .then(function () {
        return provider.requestImage(0, 0, 0, new Request());
      })
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
    var lastUrl;
    Resource._Implementations.createImage = function (
      request,
      crossOrigin,
      deferred
    ) {
      lastUrl = request.url;
      Resource._DefaultImplementations.createImage(
        new Request({ url: "Data/Images/Red16x16.png" }),
        crossOrigin,
        deferred
      );
    };

    var uri = new Uri("http://wmts.invalid/kvp");
    var query = {
      tilematrix: 0,
      layer: "someLayer",
      style: "someStyle",
      tilerow: 0,
      tilecol: 0,
      tilematrixset: "someTMS",
      format: "image/jpeg",
      FOO: "BAR",
      service: "WMTS",
      version: "1.0.0",
      request: "GetTile",
    };

    var provider = new WebMapTileServiceImageryProvider({
      layer: query.layer,
      style: query.style,
      url: uri.toString(),
      tileMatrixSetID: query.tilematrixset,
      dimensions: {
        FOO: query.FOO,
      },
    });

    provider._reload = jasmine.createSpy();

    return pollToPromise(function () {
      return provider.ready;
    })
      .then(function () {
        return provider.requestImage(0, 0, 0, new Request());
      })
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
});
