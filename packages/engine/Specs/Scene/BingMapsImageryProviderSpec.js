import Uri from "urijs";
import {
  appendForwardSlash,
  BingMapsImageryProvider,
  BingMapsStyle,
  defined,
  DiscardEmptyTileImagePolicy,
  Imagery,
  ImageryLayer,
  ImageryProvider,
  ImageryState,
  queryToObject,
  RequestScheduler,
  Resource,
  RuntimeError,
  WebMercatorTilingScheme,
} from "../../index.js";

import pollToPromise from "../../../../Specs/pollToPromise.js";
import createFakeBingMapsMetadataResponse from "../createFakeBingMapsMetadataResponse.js";

describe("Scene/BingMapsImageryProvider", function () {
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
    BingMapsImageryProvider._metadataCache = {};
  });

  afterEach(function () {
    Resource._Implementations.loadAndExecuteScript =
      Resource._DefaultImplementations.loadAndExecuteScript;
    Resource._Implementations.loadAndExecuteScript =
      Resource._DefaultImplementations.loadAndExecuteScript;
    Resource._Implementations.loadWithXhr =
      Resource._DefaultImplementations.loadWithXhr;
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
  });

  it("tileXYToQuadKey works for examples in Bing Maps documentation", function () {
    // http://msdn.microsoft.com/en-us/library/bb259689.aspx
    // Levels are off by one compared to the documentation because our levels
    // start at 0 while Bing's start at 1.
    expect(BingMapsImageryProvider.tileXYToQuadKey(1, 0, 0)).toEqual("1");
    expect(BingMapsImageryProvider.tileXYToQuadKey(1, 2, 1)).toEqual("21");
    expect(BingMapsImageryProvider.tileXYToQuadKey(3, 5, 2)).toEqual("213");
    expect(BingMapsImageryProvider.tileXYToQuadKey(4, 7, 2)).toEqual("322");
  });

  it("quadKeyToTileXY works for examples in Bing Maps documentation", function () {
    expect(BingMapsImageryProvider.quadKeyToTileXY("1")).toEqual({
      x: 1,
      y: 0,
      level: 0,
    });
    expect(BingMapsImageryProvider.quadKeyToTileXY("21")).toEqual({
      x: 1,
      y: 2,
      level: 1,
    });
    expect(BingMapsImageryProvider.quadKeyToTileXY("213")).toEqual({
      x: 3,
      y: 5,
      level: 2,
    });
    expect(BingMapsImageryProvider.quadKeyToTileXY("322")).toEqual({
      x: 4,
      y: 7,
      level: 2,
    });
  });

  it("conforms to ImageryProvider interface", function () {
    expect(BingMapsImageryProvider).toConformToInterface(ImageryProvider);
  });

  function installFakeMetadataRequest(url, mapStyle, mapLayer) {
    const baseUri = new Uri(appendForwardSlash(url));
    const expectedUri = new Uri(
      `REST/v1/Imagery/Metadata/${mapStyle}`
    ).absoluteTo(baseUri);

    Resource._Implementations.loadAndExecuteScript = function (
      url,
      functionName
    ) {
      const uri = new Uri(url);

      const query = queryToObject(uri.query());
      expect(query.jsonp).toBeDefined();
      expect(query.incl).toEqual("ImageryProviders");
      expect(query.key).toBeDefined();

      if (defined(mapLayer)) {
        expect(query.mapLayer).toEqual(mapLayer);
      }

      uri.query("");
      expect(uri.toString()).toStartWith(expectedUri.toString());

      setTimeout(function () {
        window[functionName](createFakeBingMapsMetadataResponse(mapStyle));
      }, 1);
    };
  }

  function installFakeImageRequest(expectedUrl, expectedParams, proxy) {
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
        if (defined(expectedUrl)) {
          let uri = new Uri(url);
          if (proxy) {
            uri = new Uri(decodeURIComponent(uri.query()));
          }

          const query = queryToObject(uri.query());
          uri.query("");
          expect(uri.toString()).toEqual(expectedUrl);
          for (const param in expectedParams) {
            if (expectedParams.hasOwnProperty(param)) {
              expect(query[param]).toEqual(expectedParams[param]);
            }
          }
        }
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
      if (defined(expectedUrl)) {
        let uri = new Uri(url);
        if (proxy) {
          uri = new Uri(decodeURIComponent(uri.query()));
        }

        const query = queryToObject(uri.query());
        uri.query("");
        expect(uri.toString()).toEqual(expectedUrl);
        for (const param in expectedParams) {
          if (expectedParams.hasOwnProperty(param)) {
            expect(query[param]).toEqual(expectedParams[param]);
          }
        }
      }

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
  }

  it("fromUrl throws if url is not provided", async function () {
    await expectAsync(
      BingMapsImageryProvider.fromUrl()
    ).toBeRejectedWithDeveloperError(
      "url is required, actual value was undefined"
    );
  });

  it("fromUrl throws if key is not provided", async function () {
    await expectAsync(
      BingMapsImageryProvider.fromUrl("http://fake.fake.invalid/")
    ).toBeRejectedWithDeveloperError(
      "options.key is required, actual value was undefined"
    );
  });

  it("fromUrl resolves with created provider", async function () {
    const url = "http://fake.fake.invalid/";
    const mapStyle = BingMapsStyle.ROAD;

    installFakeMetadataRequest(url, mapStyle);
    installFakeImageRequest();

    const provider = await BingMapsImageryProvider.fromUrl(url, {
      key: "",
      mapStyle: mapStyle,
    });
    expect(provider).toBeInstanceOf(BingMapsImageryProvider);
    expect(provider.url).toEqual(url);
  });

  it("fromUrl uses cached metadata result", async function () {
    const url = "http://fake.fake.invalid/";
    const mapStyle = BingMapsStyle.ROAD;

    installFakeMetadataRequest(url, mapStyle);
    installFakeImageRequest();

    const provider = await BingMapsImageryProvider.fromUrl(url, {
      key: "",
      mapStyle: mapStyle,
    });
    const provider2 = await BingMapsImageryProvider.fromUrl(url, {
      key: "",
      mapStyle: mapStyle,
    });

    //These are the same instance only if the cache has been used
    expect(provider._attributionList).toBe(provider2._attributionList);

    installFakeMetadataRequest(url, BingMapsStyle.AERIAL);
    installFakeImageRequest();

    const provider3 = await BingMapsImageryProvider.fromUrl(url, {
      key: "",
      mapStyle: BingMapsStyle.AERIAL,
    });

    // Because the road is different, a non-cached request should have happened
    expect(provider3._attributionList).not.toBe(provider._attributionList);
  });

  it("fromUrl resolves with a path", async function () {
    const url = "http://fake.fake.invalid/some/subdirectory";
    const mapStyle = BingMapsStyle.ROAD;

    installFakeMetadataRequest(url, mapStyle);
    installFakeImageRequest();

    const provider = await BingMapsImageryProvider.fromUrl(url, {
      key: "",
      mapStyle: mapStyle,
    });
    expect(provider).toBeInstanceOf(BingMapsImageryProvider);
    expect(provider.url).toEqual(`${url}/`);
  });

  it("fromUrl resolves with a path ending with a slash", async function () {
    const url = "http://fake.fake.invalid/some/subdirectory/";
    const mapStyle = BingMapsStyle.ROAD;

    installFakeMetadataRequest(url, mapStyle);
    installFakeImageRequest();

    const provider = await BingMapsImageryProvider.fromUrl(url, {
      key: "",
      mapStyle: mapStyle,
    });
    expect(provider).toBeInstanceOf(BingMapsImageryProvider);
    expect(provider.url).toEqual(url);
  });

  it("fromUrl resolves with Resource", async function () {
    const url = "http://fake.fake.invalid/";
    const mapStyle = BingMapsStyle.ROAD;

    installFakeMetadataRequest(url, mapStyle);
    installFakeImageRequest();

    const resource = new Resource({
      url: url,
    });

    const provider = await BingMapsImageryProvider.fromUrl(resource, {
      key: "",
      mapStyle: mapStyle,
    });
    expect(provider).toBeInstanceOf(BingMapsImageryProvider);
    expect(provider.url).toEqual(url);
  });

  it("fromUrl takes mapLayer as option and sets hasAlphaChannel accordingly", async function () {
    const url = "http://fake.fake.invalid/";
    const mapStyle = BingMapsStyle.AERIAL_WITH_LABELS_ON_DEMAND;
    const mapLayer = "Foreground";

    installFakeMetadataRequest(url, mapStyle, mapLayer);
    installFakeImageRequest();

    const resource = new Resource({
      url: url,
    });

    const provider = await BingMapsImageryProvider.fromUrl(resource, {
      key: "",
      mapStyle: mapStyle,
      mapLayer: mapLayer,
    });

    expect(provider.mapLayer).toEqual("Foreground");
    expect(provider.hasAlphaChannel).toBe(true);
  });

  it("fromUrl throws if request fails", async function () {
    const url = "http://fake.fake.invalid";

    await expectAsync(
      BingMapsImageryProvider.fromUrl(url, {
        key: "",
      })
    ).toBeRejectedWithError(
      RuntimeError,
      new RegExp("An error occurred while accessing")
    );
  });

  it("fromUrl throws if metadata does not specify one resource in resourceSets", async function () {
    const url = "http://fake.fake.invalid";

    const baseUri = new Uri(appendForwardSlash(url));
    const expectedUri = new Uri(
      `REST/v1/Imagery/Metadata/${BingMapsStyle.AERIAL}`
    ).absoluteTo(baseUri);

    Resource._Implementations.loadAndExecuteScript = function (
      url,
      functionName
    ) {
      const uri = new Uri(url);
      const query = queryToObject(uri.query());
      expect(query.jsonp).toBeDefined();
      expect(query.incl).toEqual("ImageryProviders");
      expect(query.key).toBeDefined();

      uri.query("");
      expect(uri.toString()).toStartWith(expectedUri.toString());

      setTimeout(function () {
        const response = createFakeBingMapsMetadataResponse(
          BingMapsStyle.AERIAL
        );
        response.resourceSets = [];
        window[functionName](response);
      }, 1);
    };
    installFakeImageRequest();

    await expectAsync(
      BingMapsImageryProvider.fromUrl(url, {
        key: "",
      })
    ).toBeRejectedWithError(
      RuntimeError,
      new RegExp("metadata does not specify one resource in resourceSets")
    );
  });

  it("returns valid value for hasAlphaChannel", async function () {
    const url = "http://fake.fake.invalid";
    const mapStyle = BingMapsStyle.AERIAL;

    installFakeMetadataRequest(url, mapStyle);
    installFakeImageRequest();

    const provider = await BingMapsImageryProvider.fromUrl(url, {
      key: "",
      mapStyle: mapStyle,
    });

    expect(typeof provider.hasAlphaChannel).toBe("boolean");
  });

  it("can provide a root tile", async function () {
    const url = "http://fake.fake.invalid";
    const mapStyle = BingMapsStyle.ROAD;

    installFakeMetadataRequest(url, mapStyle);
    installFakeImageRequest();

    const provider = await BingMapsImageryProvider.fromUrl(url, {
      key: "fake Key",
      mapStyle: mapStyle,
    });

    expect(provider.url).toStartWith(url);
    expect(provider.key).toBeDefined();
    expect(provider.mapStyle).toEqual(mapStyle);

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toEqual(20);
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.tileDiscardPolicy).toBeInstanceOf(
      DiscardEmptyTileImagePolicy
    );
    expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
    expect(provider.credit).toBeInstanceOf(Object);

    installFakeImageRequest(
      "http://ecn.t0.tiles.virtualearth.net.fake.invalid/tiles/r0.jpeg",
      {
        g: "3031",
        mkt: "",
      }
    );

    const image = await provider.requestImage(0, 0, 0);
    expect(image).toBeImageOrImageBitmap();
  });

  it("sets correct culture in tile requests", async function () {
    const url = "http://fake.fake.invalid";
    const mapStyle = BingMapsStyle.AERIAL_WITH_LABELS;

    installFakeMetadataRequest(url, mapStyle);
    installFakeImageRequest();

    const culture = "ja-jp";

    const provider = await BingMapsImageryProvider.fromUrl(url, {
      key: "",
      mapStyle: mapStyle,
      culture: culture,
    });

    expect(provider.culture).toEqual(culture);

    installFakeImageRequest(
      "http://ecn.t0.tiles.virtualearth.net.fake.invalid/tiles/h0.jpeg",
      {
        g: "3031",
        mkt: "ja-jp",
      }
    );

    const image = await provider.requestImage(0, 0, 0);
    expect(image).toBeImageOrImageBitmap();
  });

  it("raises error event when image cannot be loaded", async function () {
    const url = "http://foo.bar.invalid";
    const mapStyle = BingMapsStyle.ROAD;

    installFakeMetadataRequest(url, mapStyle);
    installFakeImageRequest();

    const provider = await BingMapsImageryProvider.fromUrl(url, {
      key: "",
      mapStyle: mapStyle,
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
      const url = request.url;
      if (/^blob:/.test(url)) {
        // load blob url normally
        Resource._DefaultImplementations.createImage(
          request,
          crossOrigin,
          deferred
        );
      } else if (tries === 2) {
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

    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      if (tries === 2) {
        // Succeed after 2 tries
        Resource._DefaultImplementations.loadWithXhr(
          "Data/Images/Red16x16.png",
          responseType,
          method,
          data,
          headers,
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

  it("correctly handles empty tiles", async function () {
    const url = "http://foo.bar.invalid";
    const mapStyle = BingMapsStyle.ROAD_ON_DEMAND;

    installFakeMetadataRequest(url, mapStyle);

    const provider = await BingMapsImageryProvider.fromUrl(url, {
      key: "",
      mapStyle: mapStyle,
    });

    const layer = new ImageryLayer(provider);

    // Fake ImageryProvider.loadImage's expected output in the case of an empty tile
    spyOn(ImageryProvider, "loadImage").and.callFake(function () {
      const e = new Error();
      e.blob = { size: 0 };
      return Promise.reject(e);
    });

    const imagery = new Imagery(layer, 0, 0, 0);
    imagery.addReference();
    layer._requestImagery(imagery);
    RequestScheduler.update();

    return pollToPromise(function () {
      return imagery.state === ImageryState.RECEIVED;
    }).then(function () {
      expect(imagery.image).toBe(DiscardEmptyTileImagePolicy.EMPTY_IMAGE);
      imagery.releaseReference();
    });
  });
});
