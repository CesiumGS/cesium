import Uri from "urijs";
import {
  ArcGisMapServerImageryProvider,
  ArcGisBaseMapType,
  ArcGisMapService,
  Cartesian2,
  Cartesian3,
  Cartographic,
  DiscardMissingTileImagePolicy,
  GeographicTilingScheme,
  getAbsoluteUri,
  ImageryLayerFeatureInfo,
  ImageryProvider,
  objectToQuery,
  queryToObject,
  Rectangle,
  Request,
  RequestScheduler,
  Resource,
  RuntimeError,
  WebMercatorProjection,
  WebMercatorTilingScheme,
} from "../../index.js";

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

  function stubJSONCall(baseUrl, result, withProxy, token) {
    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      deferred.resolve(JSON.stringify(result));
    });
  }

  it("conforms to ImageryProvider interface", function () {
    expect(ArcGisMapServerImageryProvider).toConformToInterface(
      ImageryProvider
    );
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

  it("fromUrl throws if url is not provided", async function () {
    await expectAsync(
      ArcGisMapServerImageryProvider.fromUrl()
    ).toBeRejectedWithDeveloperError(
      "url is required, actual value was undefined"
    );
  });

  it("fromUrl resolves with created provider", async function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    stubJSONCall(baseUrl, webMercatorResult);

    const provider = await ArcGisMapServerImageryProvider.fromUrl(baseUrl);
    expect(provider).toBeInstanceOf(ArcGisMapServerImageryProvider);
    expect(provider.url).toEqual(baseUrl);
  });

  it("fromUrl resolves with created provider with Resource parameter", async function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    stubJSONCall(baseUrl, webMercatorResult);

    const resource = new Resource({
      url: baseUrl,
    });

    const provider = await ArcGisMapServerImageryProvider.fromUrl(resource);
    expect(provider).toBeInstanceOf(ArcGisMapServerImageryProvider);
    expect(provider.url).toEqual(baseUrl);
  });

  it("fromUrl throws if request fails", async function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    await expectAsync(
      ArcGisMapServerImageryProvider.fromUrl(baseUrl)
    ).toBeRejectedWithError(
      RuntimeError,
      "An error occurred while accessing //tiledArcGisMapServer.invalid/"
    );
  });

  it("fromUrl throws on unsupported WKID", async function () {
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

    stubJSONCall(baseUrl, unsupportedWKIDResult);

    await expectAsync(
      ArcGisMapServerImageryProvider.fromUrl(baseUrl)
    ).toBeRejectedWithError(
      RuntimeError,
      "An error occurred while accessing //tiledArcGisMapServer.invalid/: Tile spatial reference WKID 1234 is not supported."
    );
  });

  it("fromUrl throws if request fails", async function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    const unsupportedFullExtentWKIDResult = {
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
          wkid: 1234,
        },
      },
    };

    stubJSONCall(baseUrl, unsupportedFullExtentWKIDResult);

    await expectAsync(
      ArcGisMapServerImageryProvider.fromUrl(baseUrl)
    ).toBeRejectedWithError(
      RuntimeError,
      "An error occurred while accessing //tiledArcGisMapServer.invalid/: fullExtent.spatialReference WKID 1234 is not supported."
    );
  });

  it("fromUrl creates provider for tiled servers in web mercator projection", async function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    stubJSONCall(baseUrl, webMercatorResult);

    const provider = await ArcGisMapServerImageryProvider.fromUrl(baseUrl);
    expect(provider.tileWidth).toEqual(128);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toEqual(2);
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.credit).toBeDefined();
    expect(provider.tileDiscardPolicy).toBeInstanceOf(
      DiscardMissingTileImagePolicy
    );
    expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
    expect(provider.usingPrecachedTiles).toEqual(true);
    expect(provider.hasAlphaChannel).toBeDefined();
  });

  it("fromBasemapType throws without style", async function () {
    await expectAsync(
      ArcGisMapServerImageryProvider.fromBasemapType()
    ).toBeRejectedWithDeveloperError(
      "style is required, actual value was undefined"
    );
  });

  it("fromBasemapType throws with unknown style", async function () {
    await expectAsync(
      ArcGisMapServerImageryProvider.fromBasemapType("unknown")
    ).toBeRejectedWithDeveloperError("Unsupported basemap type: unknown");
  });

  it("fromBasemapType creates an ImageryProvider with expected values", async function () {
    const expectedUrl = ArcGisMapService.defaultWorldImageryServer;
    stubJSONCall(expectedUrl, webMercatorResult);
    const provider = await ArcGisMapServerImageryProvider.fromBasemapType(
      ArcGisBaseMapType.SATELLITE,
      {
        token: "myToken",
      }
    );

    expect(provider.url).toContain(expectedUrl);
    expect(provider.token).toEqual("myToken");
    expect(provider.credit.html).toEqual("Test copyright text");
    expect(provider.usingPrecachedTiles).toBeTrue();
  });

  it("fromBasemapType displays default Credit if default token is used", async function () {
    const expectedUrl = ArcGisMapService.defaultWorldImageryServer;
    stubJSONCall(expectedUrl, webMercatorResult);
    const provider = await ArcGisMapServerImageryProvider.fromBasemapType(
      ArcGisBaseMapType.SATELLITE
    );

    expect(provider.url).toContain(expectedUrl);
    expect(provider.token).toBeDefined();
    expect(provider.credit.html).toContain(
      "This application is using a default ArcGIS access token."
    );
    expect(provider.getTileCredits(0, 0, 0)[0].html).toEqual(
      "Test copyright text"
    );
  });

  it("supports tiled servers in web mercator projection", async function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    stubJSONCall(baseUrl, webMercatorResult);

    const provider = await ArcGisMapServerImageryProvider.fromUrl(baseUrl);

    expect(provider.url).toEqual(baseUrl);

    expect(provider.tileWidth).toEqual(128);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toEqual(2);
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.credit).toBeDefined();
    expect(provider.tileDiscardPolicy).toBeInstanceOf(
      DiscardMissingTileImagePolicy
    );
    expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
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

  it("supports tiled servers in geographic projection", async function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    stubJSONCall(baseUrl, geographicResult);

    const provider = await ArcGisMapServerImageryProvider.fromUrl(baseUrl);

    expect(provider.url).toEqual(baseUrl);

    expect(provider.tileWidth).toEqual(128);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toEqual(2);
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    expect(provider.credit).toBeDefined();
    expect(provider.tileDiscardPolicy).toBeInstanceOf(
      DiscardMissingTileImagePolicy
    );
    expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);
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

  it("fromUrl creates provider for tiled servers in geographic projection", async function () {
    const baseUrl = "//tiledArcGisMapServer.invalid";

    stubJSONCall(baseUrl, geographicResult);

    const provider = await ArcGisMapServerImageryProvider.fromUrl(baseUrl);
    expect(provider.tileWidth).toEqual(128);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toEqual(2);
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    expect(provider.credit).toBeDefined();
    expect(provider.tileDiscardPolicy).toBeInstanceOf(
      DiscardMissingTileImagePolicy
    );
    expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);
    expect(provider.usingPrecachedTiles).toEqual(true);
  });

  it("supports non-tiled servers", async function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    stubJSONCall(baseUrl, {
      currentVersion: 10.01,
      copyrightText: "Test copyright text",
    });

    const provider = await ArcGisMapServerImageryProvider.fromUrl(baseUrl);

    expect(provider.url).toEqual(baseUrl);

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    expect(provider.credit).toBeDefined();
    expect(provider.tileDiscardPolicy).toBeUndefined();
    expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);
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

  it("fromUrl creates provider for non-tiled servers", async function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";

    stubJSONCall(baseUrl, {
      currentVersion: 10.01,
      copyrightText: "Test copyright text",
    });

    const provider = await ArcGisMapServerImageryProvider.fromUrl(baseUrl);
    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    expect(provider.credit).toBeDefined();
    expect(provider.tileDiscardPolicy).toBeUndefined();
    expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);
    expect(provider.usingPrecachedTiles).toEqual(false);
    expect(provider.enablePickFeatures).toBe(true);
  });

  it("supports non-tiled servers with various constructor parameters", async function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/";
    const token = "5e(u|2!7Y";

    stubJSONCall(
      baseUrl,
      {
        currentVersion: 10.01,
        copyrightText: "Test copyright text",
      },
      undefined,
      token
    );

    const provider = await ArcGisMapServerImageryProvider.fromUrl(baseUrl, {
      token: token,
      tileWidth: 128,
      tileHeight: 512,
      tilingScheme: new WebMercatorTilingScheme(),
      rectangle: Rectangle.fromDegrees(1.0, 2.0, 3.0, 4.0),
      layers: "foo,bar",
      enablePickFeatures: false,
    });

    expect(provider.url).toEqual(baseUrl);

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

  it("includes security token in requests if one is specified", async function () {
    const baseUrl = "//tiledArcGisMapServer.invalid/",
      token = "5e(u|2!7Y";

    stubJSONCall(baseUrl, webMercatorResult, false, token);

    const provider = await ArcGisMapServerImageryProvider.fromUrl(baseUrl, {
      token: token,
    });

    const expectedTileUrl = getAbsoluteUri(
      `${baseUrl}tile/0/0/0?${objectToQuery({
        token: token,
      })}`
    );

    expect(provider.url).toEqual(baseUrl);
    expect(provider.token).toEqual(token);

    expect(provider.tileWidth).toEqual(128);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toEqual(2);
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.credit).toBeDefined();
    expect(provider.tileDiscardPolicy).toBeInstanceOf(
      DiscardMissingTileImagePolicy
    );
    expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
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

    const image = await provider.requestImage(0, 0, 0);
    expect(image).toBeImageOrImageBitmap();
  });

  it("honors fullExtent of tiled server with web mercator projection", async function () {
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

    stubJSONCall(baseUrl, webMercatorFullExtentResult);

    const provider = await ArcGisMapServerImageryProvider.fromUrl(baseUrl);

    expect(provider.url).toEqual(baseUrl);

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

  it("constrains extent to the tiling scheme's rectangle", async function () {
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

    stubJSONCall(baseUrl, webMercatorOutsideBoundsResult);

    const provider = await ArcGisMapServerImageryProvider.fromUrl(baseUrl);

    expect(provider.url).toEqual(baseUrl);

    expect(provider.rectangle.west).toBeGreaterThanOrEqual(-Math.PI);
    expect(provider.rectangle.east).toBeLessThanOrEqual(Math.PI);
    expect(provider.rectangle.south).toBeGreaterThanOrEqual(
      -WebMercatorProjection.MaximumLatitude
    );
    expect(provider.rectangle.north).toBeLessThanOrEqual(
      WebMercatorProjection.MaximumLatitude
    );
  });

  it("honors fullExtent of tiled server with geographic projection", async function () {
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

    stubJSONCall(baseUrl, geographicFullExtentResult);

    const provider = await ArcGisMapServerImageryProvider.fromUrl(baseUrl);

    expect(provider.url).toEqual(baseUrl);
    expect(provider.rectangle).toEqual(
      Rectangle.fromDegrees(-123.4, -23.2, 100.7, 45.2)
    );
  });

  it("throws if the spatialReference of the fullExtent is unknown", async function () {
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

    stubJSONCall(baseUrl, unknownSpatialReferenceResult);

    await expectAsync(
      ArcGisMapServerImageryProvider.fromUrl(baseUrl)
    ).toBeRejectedWithError(
      RuntimeError,
      "An error occurred while accessing //tiledArcGisMapServer.invalid/: Tile spatial reference WKID 1234 is not supported."
    );
  });

  describe("pickFeatures", function () {
    it("works with WebMercator geometry", async function () {
      stubJSONCall("made/up/map/server", webMercatorResult);
      const provider = await ArcGisMapServerImageryProvider.fromUrl(
        "made/up/map/server",
        {
          usePreCachedTilesIfAvailable: false,
        }
      );

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

      const pickResult = await provider.pickFeatures(0, 0, 0, 0.5, 0.5);
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

    it("works with Geographic geometry", async function () {
      stubJSONCall("made/up/map/server", geographicResult);
      const provider = await ArcGisMapServerImageryProvider.fromUrl(
        "made/up/map/server",
        {
          usePreCachedTilesIfAvailable: false,
        }
      );

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

    it("returns undefined if enablePickFeatures is false", async function () {
      stubJSONCall("made/up/map/server", webMercatorResult);
      const provider = await ArcGisMapServerImageryProvider.fromUrl(
        "made/up/map/server",
        {
          usePreCachedTilesIfAvailable: false,
          enablePickFeatures: false,
        }
      );

      expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).toBeUndefined();
    });

    it("returns undefined if enablePickFeatures is dynamically set to false", async function () {
      stubJSONCall("made/up/map/server", geographicResult);
      const provider = await ArcGisMapServerImageryProvider.fromUrl(
        "made/up/map/server",
        {
          usePreCachedTilesIfAvailable: false,
          enablePickFeatures: true,
        }
      );

      provider.enablePickFeatures = false;
      expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).toBeUndefined();
    });

    it("does not return undefined if enablePickFeatures is dynamically set to true", async function () {
      stubJSONCall("made/up/map/server", webMercatorResult);
      const provider = await ArcGisMapServerImageryProvider.fromUrl(
        "made/up/map/server",
        {
          usePreCachedTilesIfAvailable: false,
          enablePickFeatures: false,
        }
      );

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

      const value = await provider.pickFeatures(0, 0, 0, 0.5, 0.5);
      expect(value).toBeDefined();
    });

    it("picks from individual layers", async function () {
      stubJSONCall("made/up/map/server", webMercatorResult);
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

      const provider = await ArcGisMapServerImageryProvider.fromUrl(
        "made/up/map/server",
        {
          usePreCachedTilesIfAvailable: false,
          layers: "someLayer,anotherLayerYay",
        }
      );

      const pickResult = await provider.pickFeatures(0, 0, 0, 0.5, 0.5);
      expect(pickResult.length).toBe(1);
    });
  });
});
