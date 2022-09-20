import Uri from "urijs";
import {
  appendForwardSlash,
  ArcGisMapServerImageryProvider,
  Cartesian2,
  Cartesian3,
  Cartographic,
  defined,
  DiscardMissingTileImagePolicy,
  GeographicTilingScheme,
  getAbsoluteUri,
  Imagery,
  ImageryLayer,
  ImageryLayerFeatureInfo,
  ImageryProvider,
  ImageryState,
  objectToQuery,
  queryToObject,
  Rectangle,
  Request,
  RequestScheduler,
  Resource,
  WebMercatorProjection,
  WebMercatorTilingScheme,
} from "../../../Source/Cesium.js";

import pollToPromise from "../pollToPromise.js";

describe("Scene/ArcGisMapServerImageryProvider", function () {
  let supportsImageBitmapOptions;
  beforeAll(function () {
    // This suite spies on requests. Resource.supportsImageBitmapOptions needs to make a request to a data URI.
    // We run it here to avoid interfering with the tests.
    return Resource.supportsImageBitmapOptions().then(function (result) {
      supportsImageBitmapOptions = result;
    });
  });

  beforeEach(function () {
    RequestScheduler.clearForSpecs();
  });

  afterEach(function () {
    Resource._Implementations.loadAndExecuteScript =
      Resource._DefaultImplementations.loadAndExecuteScript;
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
    Resource._Implementations.loadWithXhr =
      Resource._DefaultImplementations.loadWithXhr;
  });

  function expectCorrectUrl(
    expectedBaseUrl,
    actualUrl,
    functionName,
    withProxy,
    token
  ) {
    let uri = new Uri(actualUrl);

    if (withProxy) {
      uri = new Uri(decodeURIComponent(uri.query()));
    }

    const params = queryToObject(uri.query());

    const uriWithoutQuery = new Uri(uri);
    uriWithoutQuery.query("");

    expect(uriWithoutQuery.toString()).toEqual(
      appendForwardSlash(expectedBaseUrl)
    );

    const expectedParams = {
      callback: functionName,
      f: "json",
    };
    if (defined(token)) {
      expectedParams.token = token;
    }
    expect(params).toEqual(expectedParams);
  }

  function stubJSONPCall(baseUrl, result, withProxy, token) {
    Resource._Implementations.loadAndExecuteScript = function (
      url,
      functionName,
      deferred
    ) {
      expectCorrectUrl(baseUrl, url, functionName, withProxy, token);
      setTimeout(function () {
        window[functionName](result);
      }, 1);
    };
  }

  it("conforms to ImageryProvider interface", function () {
    expect(ArcGisMapServerImageryProvider).toConformToInterface(
      ImageryProvider
    );
  });

  it("constructor throws if url is not specified", function () {
    expect(function () {
      return new ArcGisMapServerImageryProvider({});
    }).toThrowDeveloperError();
  });

  const webMercatorResult = {
    currentVersion: 10.01,
    copyrightText: "Test copyright text",
    tileInfo: {
      rows: 128,
      cols: 256,
      origin: {
        x: -20037508.342787,
        y: 20037508.342787,
      },
      spatialReference: {
        wkid: 102100,
      },
      lods: [
        {
          level: 0,
          resolution: 156543.033928,
          scale: 591657527.591555,
        },
        {
          level: 1,
          resolution: 78271.5169639999,
          scale: 295828763.795777,
        },
        {
          level: 2,
          resolution: 39135.7584820001,
          scale: 147914381.897889,
        },
      ],
    },
  };

  it("resolves readyPromise", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid";

    stubJSONPCall(baseUrl, webMercatorResult);

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("resolves readyPromise with Resource", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid";

    stubJSONPCall(baseUrl, webMercatorResult);

    const resource = new Resource({
      url: baseUrl,
    });

    const provider = new ArcGisMapServerImageryProvider({
      url: resource,
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("rejects readyPromise on error", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid";

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
    });

    return provider.readyPromise
      .then(function () {
        fail("should not resolve");
      })
      .catch(function (e) {
        expect(e.message).toContain(baseUrl);
        expect(provider.ready).toBe(false);
      });
  });

  it("supports tiled servers in web mercator projection", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    stubJSONPCall(baseUrl, webMercatorResult);

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
    });

    expect(provider.url).toEqual(baseUrl);

    return provider.readyPromise.then(function () {
      expect(provider.tileWidth).toEqual(128);
      expect(provider.tileHeight).toEqual(256);
      expect(provider.maximumLevel).toEqual(2);
      expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
      expect(provider.credit).toBeDefined();
      expect(provider.tileDiscardPolicy).toBeInstanceOf(
        DiscardMissingTileImagePolicy
      );
      expect(provider.rectangle).toEqual(
        new WebMercatorTilingScheme().rectangle
      );
      expect(provider.usingPrecachedTiles).toEqual(true);
      expect(provider.hasAlphaChannel).toBeDefined();

      Resource._Implementations.createImage = function (
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
          expect(url).toEqual(getAbsoluteUri(`${baseUrl}tile/0/0/0`));

          // Just return any old image.
          Resource._DefaultImplementations.createImage(
            new Request({ url: "Data/Images/Red16x16.png" }),
            crossOrigin,
            deferred
          );
        }
      };

      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        expect(url).toEqual(getAbsoluteUri(`${baseUrl}tile/0/0/0`));

        // Just return any old image.
        Resource._DefaultImplementations.loadWithXhr(
          "Data/Images/Red16x16.png",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  const geographicResult = {
    currentVersion: 10.01,
    copyrightText: "Test copyright text",
    tileInfo: {
      rows: 128,
      cols: 256,
      origin: {
        x: -180,
        y: 90,
      },
      spatialReference: {
        wkid: 4326,
      },
      lods: [
        {
          level: 0,
          resolution: 0.3515625,
          scale: 147748799.285417,
        },
        {
          level: 1,
          resolution: 0.17578125,
          scale: 73874399.6427087,
        },
        {
          level: 2,
          resolution: 0.087890625,
          scale: 36937199.8213544,
        },
      ],
    },
  };

  it("supports tiled servers in geographic projection", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    stubJSONPCall(baseUrl, geographicResult);

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
    });

    expect(provider.url).toEqual(baseUrl);

    return provider.readyPromise.then(function () {
      expect(provider.tileWidth).toEqual(128);
      expect(provider.tileHeight).toEqual(256);
      expect(provider.maximumLevel).toEqual(2);
      expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
      expect(provider.credit).toBeDefined();
      expect(provider.tileDiscardPolicy).toBeInstanceOf(
        DiscardMissingTileImagePolicy
      );
      expect(provider.rectangle).toEqual(
        new GeographicTilingScheme().rectangle
      );
      expect(provider.usingPrecachedTiles).toEqual(true);

      Resource._Implementations.createImage = function (
        request,
        crossOrigin,
        deferred
      ) {
        const url = request.url;
        if (/^blob:/.test(url) || supportsImageBitmapOptions) {
          // If ImageBitmap is supported, we expect a loadWithXhr request to fetch it as a blob.
          Resource._DefaultImplementations.createImage(
            request,
            crossOrigin,
            deferred,
            true,
            false,
            true
          );
        } else {
          expect(url).toEqual(getAbsoluteUri(`${baseUrl}tile/0/0/0`));

          // Just return any old image.
          Resource._DefaultImplementations.createImage(
            new Request({ url: "Data/Images/Red16x16.png" }),
            crossOrigin,
            deferred
          );
        }
      };

      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        expect(url).toEqual(getAbsoluteUri(`${baseUrl}tile/0/0/0`));

        // Just return any old image.
        Resource._DefaultImplementations.loadWithXhr(
          "Data/Images/Red16x16.png",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("supports non-tiled servers", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    stubJSONPCall(baseUrl, {
      currentVersion: 10.01,
      copyrightText: "Test copyright text",
    });

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
    });

    expect(provider.url).toEqual(baseUrl);

    return provider.readyPromise.then(function () {
      expect(provider.tileWidth).toEqual(256);
      expect(provider.tileHeight).toEqual(256);
      expect(provider.maximumLevel).toBeUndefined();
      expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
      expect(provider.credit).toBeDefined();
      expect(provider.tileDiscardPolicy).toBeUndefined();
      expect(provider.rectangle).toEqual(
        new GeographicTilingScheme().rectangle
      );
      expect(provider.usingPrecachedTiles).toEqual(false);
      expect(provider.enablePickFeatures).toBe(true);

      Resource._Implementations.createImage = function (
        request,
        crossOrigin,
        deferred
      ) {
        const uri = new Uri(request.url);
        const params = queryToObject(uri.query());

        const uriWithoutQuery = new Uri(uri);
        uriWithoutQuery.query("");

        expect(uriWithoutQuery.toString()).toEqual(
          getAbsoluteUri(`${baseUrl}export`)
        );

        expect(params.f).toEqual("image");
        expect(params.bboxSR).toEqual("4326");
        expect(params.imageSR).toEqual("4326");
        expect(params.format).toEqual("png32");
        expect(params.transparent).toEqual("true");
        expect(params.size).toEqual("256,256");

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      };

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("supports non-tiled servers with various constructor parameters", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";
    const token = "5e(u|2!7Y";

    stubJSONPCall(
      baseUrl,
      {
        currentVersion: 10.01,
        copyrightText: "Test copyright text",
      },
      undefined,
      token
    );

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
      token: token,
      tileWidth: 128,
      tileHeight: 512,
      tilingScheme: new WebMercatorTilingScheme(),
      rectangle: Rectangle.fromDegrees(1.0, 2.0, 3.0, 4.0),
      layers: "foo,bar",
      enablePickFeatures: false,
    });

    expect(provider.url).toEqual(baseUrl);

    return provider.readyPromise.then(function () {
      expect(provider.tileWidth).toEqual(128);
      expect(provider.tileHeight).toEqual(512);
      expect(provider.maximumLevel).toBeUndefined();
      expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
      expect(provider.credit).toBeDefined();
      expect(provider.tileDiscardPolicy).toBeUndefined();
      expect(provider.rectangle).toEqual(
        Rectangle.fromDegrees(1.0, 2.0, 3.0, 4.0)
      );
      expect(provider.usingPrecachedTiles).toBe(false);
      expect(provider.enablePickFeatures).toBe(false);
      expect(provider.layers).toEqual("foo,bar");

      Resource._Implementations.createImage = function (
        request,
        crossOrigin,
        deferred
      ) {
        const uri = new Uri(request.url);
        const params = queryToObject(uri.query());

        const uriWithoutQuery = new Uri(uri);
        uriWithoutQuery.query("");

        expect(uriWithoutQuery.toString()).toEqual(
          getAbsoluteUri(`${baseUrl}export`)
        );

        expect(params.f).toEqual("image");
        expect(params.bboxSR).toEqual("3857");
        expect(params.imageSR).toEqual("3857");
        expect(params.format).toEqual("png32");
        expect(params.transparent).toEqual("true");
        expect(params.size).toEqual("128,512");
        expect(params.layers).toEqual("show:foo,bar");
        expect(params.token).toEqual(token);

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred
        );
      };

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("includes security token in requests if one is specified", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/",
      token = "5e(u|2!7Y";

    stubJSONPCall(baseUrl, webMercatorResult, false, token);

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
      token: token,
    });

    const expectedTileUrl = getAbsoluteUri(
      `${baseUrl}tile/0/0/0?${objectToQuery({
        token: token,
      })}`
    );

    expect(provider.url).toEqual(baseUrl);
    expect(provider.token).toEqual(token);

    return provider.readyPromise.then(function () {
      expect(provider.tileWidth).toEqual(128);
      expect(provider.tileHeight).toEqual(256);
      expect(provider.maximumLevel).toEqual(2);
      expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
      expect(provider.credit).toBeDefined();
      expect(provider.tileDiscardPolicy).toBeInstanceOf(
        DiscardMissingTileImagePolicy
      );
      expect(provider.rectangle).toEqual(
        new WebMercatorTilingScheme().rectangle
      );
      expect(provider.usingPrecachedTiles).toEqual(true);
      expect(provider.hasAlphaChannel).toBeDefined();

      Resource._Implementations.createImage = function (
        request,
        crossOrigin,
        deferred
      ) {
        const url = request.url;
        if (/^blob:/.test(url) || supportsImageBitmapOptions) {
          // If ImageBitmap is supported, we expect a loadWithXhr request to fetch it as a blob.
          Resource._DefaultImplementations.createImage(
            request,
            crossOrigin,
            deferred,
            true,
            false,
            true
          );
        } else {
          expect(url).toEqual(expectedTileUrl);

          // Just return any old image.
          Resource._DefaultImplementations.createImage(
            new Request({ url: "Data/Images/Red16x16.png" }),
            crossOrigin,
            deferred
          );
        }
      };

      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        expect(url).toEqual(expectedTileUrl);

        // Just return any old image.
        Resource._DefaultImplementations.loadWithXhr(
          "Data/Images/Red16x16.png",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      return provider.requestImage(0, 0, 0).then(function (image) {
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("raises error on unsupported WKID", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    const unsupportedWKIDResult = {
      currentVersion: 10.01,
      copyrightText: "Test copyright text",
      tileInfo: {
        rows: 128,
        cols: 256,
        origin: {
          x: -180,
          y: 90,
        },
        spatialReference: {
          wkid: 1234,
        },
        lods: [
          {
            level: 0,
            resolution: 0.3515625,
            scale: 147748799.285417,
          },
          {
            level: 1,
            resolution: 0.17578125,
            scale: 73874399.6427087,
          },
          {
            level: 2,
            resolution: 0.087890625,
            scale: 36937199.8213544,
          },
        ],
      },
    };

    stubJSONPCall(baseUrl, unsupportedWKIDResult);

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
    });

    expect(provider.url).toEqual(baseUrl);

    let tries = 0;
    provider.errorEvent.addEventListener(function (error) {
      const isWKIDError = error.message.indexOf("WKID") >= 0;
      if (isWKIDError) {
        ++tries;
        if (tries < 3) {
          error.retry = true;
        }
      }
    });

    return provider.readyPromise
      .then(function () {
        fail();
      })
      .catch(function () {
        expect(provider.ready).toEqual(false);
        expect(tries).toEqual(3);
      });
  });

  it("raises error on invalid URL", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
    });

    expect(provider.url).toEqual(baseUrl);

    let errorEventRaised = false;
    provider.errorEvent.addEventListener(function (error) {
      expect(error.message.indexOf(baseUrl) >= 0).toEqual(true);
      errorEventRaised = true;
    });

    return provider.readyPromise
      .then(function () {
        fail();
      })
      .catch(function () {
        expect(provider.ready).toEqual(false);
        expect(errorEventRaised).toEqual(true);
      });
  });

  it("raises error event when image cannot be loaded", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    stubJSONPCall(baseUrl, {
      currentVersion: 10.01,
      copyrightText: "Test copyright text",
    });

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
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

    return provider.readyPromise.then(function () {
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

  it("honors fullExtent of tiled server with web mercator projection", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    const webMercatorFullExtentResult = {
      currentVersion: 10.01,
      copyrightText: "Test copyright text",
      tileInfo: {
        rows: 128,
        cols: 256,
        origin: {
          x: -20037508.342787,
          y: 20037508.342787,
        },
        spatialReference: {
          wkid: 102100,
        },
        lods: [
          {
            level: 0,
            resolution: 156543.033928,
            scale: 591657527.591555,
          },
          {
            level: 1,
            resolution: 78271.5169639999,
            scale: 295828763.795777,
          },
          {
            level: 2,
            resolution: 39135.7584820001,
            scale: 147914381.897889,
          },
        ],
      },
      fullExtent: {
        xmin: 1.1148026611962173e7,
        ymin: -6443518.758206591,
        xmax: 1.8830976498143446e7,
        ymax: -265936.19697360107,
        spatialReference: {
          wkid: 102100,
        },
      },
    };

    stubJSONPCall(baseUrl, webMercatorFullExtentResult);

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
    });

    expect(provider.url).toEqual(baseUrl);

    return provider.readyPromise.then(function () {
      const projection = new WebMercatorProjection();
      const sw = projection.unproject(
        new Cartesian2(1.1148026611962173e7, -6443518.758206591)
      );
      const ne = projection.unproject(
        new Cartesian2(1.8830976498143446e7, -265936.19697360107)
      );
      const rectangle = new Rectangle(
        sw.longitude,
        sw.latitude,
        ne.longitude,
        ne.latitude
      );
      expect(provider.rectangle).toEqual(rectangle);
    });
  });

  it("constrains extent to the tiling scheme's rectangle", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    const webMercatorOutsideBoundsResult = {
      currentVersion: 10.01,
      copyrightText: "Test copyright text",
      tileInfo: {
        rows: 128,
        cols: 256,
        origin: {
          x: -20037508.342787,
          y: 20037508.342787,
        },
        spatialReference: {
          wkid: 102100,
        },
        lods: [
          {
            level: 0,
            resolution: 156543.033928,
            scale: 591657527.591555,
          },
          {
            level: 1,
            resolution: 78271.5169639999,
            scale: 295828763.795777,
          },
          {
            level: 2,
            resolution: 39135.7584820001,
            scale: 147914381.897889,
          },
        ],
      },
      fullExtent: {
        xmin: -2.0037507067161843e7,
        ymin: -1.4745615008589065e7,
        xmax: 2.0037507067161843e7,
        ymax: 3.0240971958386205e7,
        spatialReference: {
          wkid: 102100,
        },
      },
    };

    stubJSONPCall(baseUrl, webMercatorOutsideBoundsResult);

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
    });

    expect(provider.url).toEqual(baseUrl);

    return provider.readyPromise.then(function () {
      expect(provider.rectangle.west).toBeGreaterThanOrEqual(-Math.PI);
      expect(provider.rectangle.east).toBeLessThanOrEqual(Math.PI);
      expect(provider.rectangle.south).toBeGreaterThanOrEqual(
        -WebMercatorProjection.MaximumLatitude
      );
      expect(provider.rectangle.north).toBeLessThanOrEqual(
        WebMercatorProjection.MaximumLatitude
      );
    });
  });

  it("honors fullExtent of tiled server with geographic projection", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    const geographicFullExtentResult = {
      currentVersion: 10.01,
      copyrightText: "Test copyright text",
      tileInfo: {
        rows: 128,
        cols: 256,
        origin: {
          x: -20037508.342787,
          y: 20037508.342787,
        },
        spatialReference: {
          wkid: 102100,
        },
        lods: [
          {
            level: 0,
            resolution: 156543.033928,
            scale: 591657527.591555,
          },
          {
            level: 1,
            resolution: 78271.5169639999,
            scale: 295828763.795777,
          },
          {
            level: 2,
            resolution: 39135.7584820001,
            scale: 147914381.897889,
          },
        ],
      },
      fullExtent: {
        xmin: -123.4,
        ymin: -23.2,
        xmax: 100.7,
        ymax: 45.2,
        spatialReference: {
          wkid: 4326,
        },
      },
    };

    stubJSONPCall(baseUrl, geographicFullExtentResult);

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
    });

    expect(provider.url).toEqual(baseUrl);

    return provider.readyPromise.then(function () {
      expect(provider.rectangle).toEqual(
        Rectangle.fromDegrees(-123.4, -23.2, 100.7, 45.2)
      );
    });
  });

  it("raises error if the spatialReference of the fullExtent is unknown", function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    const unknownSpatialReferenceResult = {
      currentVersion: 10.01,
      copyrightText: "Test copyright text",
      tileInfo: {
        rows: 128,
        cols: 256,
        origin: {
          x: -180,
          y: 90,
        },
        spatialReference: {
          wkid: 1234,
        },
        lods: [
          {
            level: 0,
            resolution: 0.3515625,
            scale: 147748799.285417,
          },
          {
            level: 1,
            resolution: 0.17578125,
            scale: 73874399.6427087,
          },
          {
            level: 2,
            resolution: 0.087890625,
            scale: 36937199.8213544,
          },
        ],
      },
      fullExtent: {
        xmin: -123.4,
        ymin: -23.2,
        xmax: 100.7,
        ymax: 45.2,
        spatialReference: {
          wkid: 1234,
        },
      },
    };

    stubJSONPCall(baseUrl, unknownSpatialReferenceResult);

    const provider = new ArcGisMapServerImageryProvider({
      url: baseUrl,
    });

    expect(provider.url).toEqual(baseUrl);

    let tries = 0;
    provider.errorEvent.addEventListener(function (error) {
      const isWKIDError = error.message.indexOf("WKID") >= 0;
      if (isWKIDError) {
        ++tries;
        if (tries < 3) {
          error.retry = true;
        }
      }
    });

    return provider.readyPromise
      .then(function () {
        fail();
      })
      .catch(function () {
        expect(provider.ready).toEqual(false);
        expect(tries).toEqual(3);
      });
  });

  describe("pickFeatures", function () {
    it("works with WebMercator geometry", function () {
      const provider = new ArcGisMapServerImageryProvider({
        url: "made/up/map/server",
        usePreCachedTilesIfAvailable: false,
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
        expect(url).toContain("identify");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/ArcGIS/identify-WebMercator.json",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider.readyPromise.then(function () {
        return provider
          .pickFeatures(0, 0, 0, 0.5, 0.5)
          .then(function (pickResult) {
            expect(pickResult.length).toBe(1);

            const firstResult = pickResult[0];
            expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
            expect(firstResult.description).toContain("Hummock Grasses");
            expect(firstResult.position).toEqual(
              new WebMercatorProjection().unproject(
                new Cartesian3(1.481682457042425e7, -2710890.117898505)
              )
            );
          });
      });
    });

    it("works with Geographic geometry", function () {
      const provider = new ArcGisMapServerImageryProvider({
        url: "made/up/map/server",
        usePreCachedTilesIfAvailable: false,
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
        expect(url).toContain("identify");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/ArcGIS/identify-Geographic.json",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider.readyPromise.then(function () {
        return provider
          .pickFeatures(0, 0, 0, 0.5, 0.5)
          .then(function (pickResult) {
            expect(pickResult.length).toBe(1);

            const firstResult = pickResult[0];
            expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
            expect(firstResult.description).toContain("Hummock Grasses");
            expect(firstResult.position).toEqual(
              Cartographic.fromDegrees(123.45, -34.2)
            );
          });
      });
    });

    it("returns undefined if enablePickFeatures is false", function () {
      const provider = new ArcGisMapServerImageryProvider({
        url: "made/up/map/server",
        usePreCachedTilesIfAvailable: false,
        enablePickFeatures: false,
      });

      return provider.readyPromise.then(function () {
        expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).toBeUndefined();
      });
    });

    it("returns undefined if enablePickFeatures is dynamically set to false", function () {
      const provider = new ArcGisMapServerImageryProvider({
        url: "made/up/map/server",
        usePreCachedTilesIfAvailable: false,
        enablePickFeatures: true,
      });

      provider.enablePickFeatures = false;

      return provider.readyPromise.then(function () {
        expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).toBeUndefined();
      });
    });

    it("does not return undefined if enablePickFeatures is dynamically set to true", function () {
      const provider = new ArcGisMapServerImageryProvider({
        url: "made/up/map/server",
        usePreCachedTilesIfAvailable: false,
        enablePickFeatures: false,
      });

      provider.enablePickFeatures = true;

      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        expect(url).toContain("identify");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/ArcGIS/identify-WebMercator.json",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider.readyPromise
        .then(function () {
          return provider.pickFeatures(0, 0, 0, 0.5, 0.5);
        })
        .then(function (value) {
          expect(value).toBeDefined();
        });
    });

    it("picks from individual layers", function () {
      const provider = new ArcGisMapServerImageryProvider({
        url: "made/up/map/server",
        usePreCachedTilesIfAvailable: false,
        layers: "someLayer,anotherLayerYay",
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
        const uri = new Uri(url);
        const query = queryToObject(uri.query());

        expect(query.layers).toContain("visible:someLayer,anotherLayerYay");
        Resource._DefaultImplementations.loadWithXhr(
          "Data/ArcGIS/identify-WebMercator.json",
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };

      return provider.readyPromise
        .then(function () {
          return provider.pickFeatures(0, 0, 0, 0.5, 0.5);
        })
        .then(function (pickResult) {
          expect(pickResult.length).toBe(1);
        });
    });
  });
});
