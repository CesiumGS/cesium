import {
  GeographicTilingScheme,
  Rectangle,
  Request,
  RequestScheduler,
  Resource,
  RuntimeError,
  WebMercatorTilingScheme,
  GoogleEarthEnterpriseMapsProvider,
  Imagery,
  ImageryLayer,
  ImageryProvider,
  ImageryState,
} from "../../index.js";

import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Scene/GoogleEarthEnterpriseMapsProvider", function () {
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

  it("conforms to ImageryProvider interface", function () {
    expect(GoogleEarthEnterpriseMapsProvider).toConformToInterface(
      ImageryProvider
    );
  });

  it("constructor throws when url is not specified", function () {
    function constructWithoutServer() {
      return new GoogleEarthEnterpriseMapsProvider({
        channel: 1234,
      });
    }

    expect(constructWithoutServer).toThrowDeveloperError();
  });

  it("constructor throws when channel is not specified", function () {
    function constructWithoutChannel() {
      return new GoogleEarthEnterpriseMapsProvider({
        url: "http://invalid.localhost",
      });
    }

    expect(constructWithoutChannel).toThrowDeveloperError();
  });

  it("resolves readyPromise", function () {
    const path = "";
    const url = "http://example.invalid";
    const channel = 1234;

    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/good.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: url,
      channel: channel,
      path: path,
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("resolves readyPromise with Resource", function () {
    const path = "";
    const url = "http://example.invalid";
    const channel = 1234;

    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/good.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const resource = new Resource({
      url: url,
    });

    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: resource,
      channel: channel,
      path: path,
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("rejects readyPromise on error", function () {
    const url = "http://invalid.localhost";
    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: url,
      channel: 1234,
    });

    return provider.readyPromise
      .then(function () {
        fail("should not resolve");
      })
      .catch(function (e) {
        expect(provider.ready).toBe(false);
        expect(e.message).toContain(url);
      });
  });

  it("fromUrl throws without url", async function () {
    await expectAsync(
      GoogleEarthEnterpriseMapsProvider.fromUrl(undefined, 1234)
    ).toBeRejectedWithDeveloperError();
  });

  it("fromUrl throws without channel", async function () {
    await expectAsync(
      GoogleEarthEnterpriseMapsProvider.fromUrl("url", undefined)
    ).toBeRejectedWithDeveloperError();
  });

  it("fromUrl resolves to imagery provider", async function () {
    const path = "";
    const url = "http://example.invalid";
    const channel = 1234;

    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/good.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const provider = await GoogleEarthEnterpriseMapsProvider.fromUrl(
      url,
      channel,
      {
        path: path,
      }
    );

    expect(provider).toBeInstanceOf(GoogleEarthEnterpriseMapsProvider);
  });

  it("fromUrl with Resource resolves to imagery provider", async function () {
    const path = "";
    const url = "http://example.invalid";
    const channel = 1234;

    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/good.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const resource = new Resource({
      url: url,
    });

    const provider = await GoogleEarthEnterpriseMapsProvider.fromUrl(
      resource,
      channel,
      { path: path }
    );

    expect(provider).toBeInstanceOf(GoogleEarthEnterpriseMapsProvider);
  });

  it("fromUrl throws with invalid url", async function () {
    const url = "http://invalid.localhost";
    await expectAsync(
      GoogleEarthEnterpriseMapsProvider.fromUrl(url, 1234)
    ).toBeRejectedWithError(
      RuntimeError,
      new RegExp("An error occurred while accessing")
    );
  });

  it("fromUrl throws when channel cannot be found", async function () {
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/bad_channel.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const url = "http://invalid.localhost";
    await expectAsync(
      GoogleEarthEnterpriseMapsProvider.fromUrl(url, 1235)
    ).toBeRejectedWithError(
      RuntimeError,
      new RegExp("Could not find layer with channel \\(id\\) of 1235")
    );
  });

  it("fromUrl throws when channel version cannot be found", async function () {
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/bad_version.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const url = "http://invalid.localhost";
    await expectAsync(
      GoogleEarthEnterpriseMapsProvider.fromUrl(url, 1234)
    ).toBeRejectedWithError(
      RuntimeError,
      new RegExp("Could not find a version in channel \\(id\\) 1234")
    );
  });

  it("fromUrl throws when unsupported projection is specified", async function () {
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/bad_projection.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const url = "http://invalid.localhost";
    await expectAsync(
      GoogleEarthEnterpriseMapsProvider.fromUrl(url, 1234)
    ).toBeRejectedWithError(
      RuntimeError,
      new RegExp("Unsupported projection asdf")
    );
  });

  it("returns valid value for hasAlphaChannel", function () {
    const path = "";
    const url = "http://example.invalid";
    const channel = 1234;

    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/good.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: url,
      channel: channel,
      path: path,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(typeof provider.hasAlphaChannel).toBe("boolean");
    });
  });

  it("can provide a root tile", function () {
    const path = "";
    const url = "http://example.invalid";
    const channel = 1234;
    const version = 1;

    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/good.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: url,
      channel: channel,
      path: path,
    });

    expect(provider.url).toEqual(url);
    expect(provider.path).toEqual(path);
    expect(provider.channel).toEqual(channel);

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tileWidth).toEqual(256);
      expect(provider.tileHeight).toEqual(256);
      expect(provider.maximumLevel).toBeUndefined();
      expect(provider.minimumLevel).toEqual(0);
      expect(provider.version).toEqual(version);
      expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
      expect(provider.tileDiscardPolicy).toBeUndefined();
      expect(provider.rectangle).toEqual(
        new WebMercatorTilingScheme().rectangle
      );
      expect(provider.credit).toBeInstanceOf(Object);

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
          expect(url).toEqual(
            "http://example.invalid/query?request=ImageryMaps&channel=1234&version=1&x=0&y=0&z=1"
          );

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
        expect(url).toEqual(
          "http://example.invalid/query?request=ImageryMaps&channel=1234&version=1&x=0&y=0&z=1"
        );

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

  it("handles malformed JSON data returned by the server", function () {
    const path = "/default_map";
    const url = "http://example.invalid";
    const version = 1;
    const channel = 1234;

    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      return deferred.resolve(
        "{\n" +
          "isAuthenticated: true,\n" +
          "layers: [\n" +
          "   {\n" +
          '        icon: "icons/773_l.png",\n' +
          "        id: 1234,\n" +
          "        initialState: true,\n" +
          '        label: "Imagery",\n' +
          '        lookAt: "none",\n' +
          '        requestType: "ImageryMaps",\n' +
          "        version: 1\n" +
          "    },{\n" +
          '        icon: "icons/773_l.png",\n' +
          "        id: 1007,\n" +
          "        initialState: true,\n" +
          '        label: "Labels",\n' +
          '        lookAt: "none",\n' +
          '        requestType: "VectorMapsRaster",\n' +
          "        version: 8\n" +
          "    }\n" +
          "],\n" +
          'serverUrl: "https://example.invalid",\n' +
          "useGoogleLayers: false\n" +
          "}"
      );
    };

    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: url,
      channel: channel,
    });

    return provider.readyPromise.then(function () {
      expect(provider.url).toEqual(url);
      expect(provider.path).toEqual(path);
      expect(provider.version).toEqual(version);
      expect(provider.channel).toEqual(channel);
    });
  });

  it("raises error on invalid url", function () {
    const url = "http://invalid.localhost";
    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: url,
      channel: 1234,
    });

    let errorEventRaised = false;
    provider.errorEvent.addEventListener(function (error) {
      expect(error.message.indexOf(url) >= 0).toEqual(true);
      errorEventRaised = true;
    });

    return provider.readyPromise
      .catch(function (e) {
        // catch error and continue
      })
      .finally(function () {
        expect(provider.ready).toEqual(false);
        expect(errorEventRaised).toEqual(true);
      });
  });

  it("raises error event when image cannot be loaded", function () {
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/good.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: "example.invalid",
      channel: 1234,
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

  it("defaults to WebMercatorTilingScheme when no projection specified", function () {
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      return deferred.resolve(
        JSON.stringify({
          isAuthenticated: true,
          layers: [
            {
              icon: "icons/773_l.png",
              id: 1234,
              initialState: true,
              label: "Imagery",
              requestType: "ImageryMaps",
              version: 1,
            },
          ],
          serverUrl: "https://example.invalid",
          useGoogleLayers: false,
        })
      );
    };

    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: "http://example.invalid",
      channel: 1234,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
      expect(provider.rectangle).toEqual(
        new WebMercatorTilingScheme().rectangle
      );
    });
  });

  it("Projection is WebMercatorTilingScheme when server projection is mercator", function () {
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      return deferred.resolve(
        JSON.stringify({
          isAuthenticated: true,
          layers: [
            {
              icon: "icons/773_l.png",
              id: 1234,
              initialState: true,
              label: "Imagery",
              requestType: "ImageryMaps",
              version: 1,
            },
          ],
          projection: "mercator",
          serverUrl: "https://example.invalid",
          useGoogleLayers: false,
        })
      );
    };

    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: "http://example.invalid",
      channel: 1234,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
      expect(provider.rectangle).toEqual(
        new WebMercatorTilingScheme().rectangle
      );
    });
  });

  it("Projection is GeographicTilingScheme when server projection is flat", function () {
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      return deferred.resolve(
        JSON.stringify({
          isAuthenticated: true,
          layers: [
            {
              icon: "icons/773_l.png",
              id: 1234,
              initialState: true,
              label: "Imagery",
              requestType: "ImageryMaps",
              version: 1,
            },
          ],
          projection: "flat",
          serverUrl: "https://example.invalid",
          useGoogleLayers: false,
        })
      );
    };

    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: "http://example.invalid",
      channel: 1234,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
      expect(provider.rectangle).toEqual(
        new Rectangle(-Math.PI, -Math.PI, Math.PI, Math.PI)
      );
    });
  });

  it("raises error when channel cannot be found", function () {
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/bad_channel.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: "http://invalid.localhost",
      channel: 1235,
    });

    let errorEventRaised = false;
    provider.errorEvent.addEventListener(function (error) {
      expect(
        error.message.indexOf("Could not find layer with channel") >= 0
      ).toEqual(true);
      errorEventRaised = true;
    });

    return provider.readyPromise
      .catch(function (e) {
        // catch error and continue
      })
      .finally(function () {
        expect(provider.ready).toEqual(false);
        expect(errorEventRaised).toEqual(true);
      });
  });

  it("raises error when channel version cannot be found", function () {
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/bad_version.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: "http://invalid.localhost",
      channel: 1234,
    });

    let errorEventRaised = false;
    provider.errorEvent.addEventListener(function (error) {
      expect(
        error.message.indexOf("Could not find a version in channel") >= 0
      ).toEqual(true);
      errorEventRaised = true;
    });

    return provider.readyPromise
      .catch(function (e) {
        // catch error and continue
      })
      .finally(function () {
        expect(provider.ready).toEqual(false);
        expect(errorEventRaised).toEqual(true);
      });
  });

  it("raises error when unsupported projection is specified", function () {
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      Resource._DefaultImplementations.loadWithXhr(
        "Data/GoogleEarthEnterpriseMapsProvider/bad_projection.json",
        responseType,
        method,
        data,
        headers,
        deferred
      );
    };

    const provider = new GoogleEarthEnterpriseMapsProvider({
      url: "http://invalid.localhost",
      channel: 1234,
    });

    let errorEventRaised = false;
    provider.errorEvent.addEventListener(function (error) {
      expect(error.message.indexOf("Unsupported projection") >= 0).toEqual(
        true
      );
      errorEventRaised = true;
    });

    return provider.readyPromise
      .catch(function (e) {
        // catch error
      })
      .finally(function () {
        expect(provider.ready).toEqual(false);
        expect(errorEventRaised).toEqual(true);
      });
  });
});
