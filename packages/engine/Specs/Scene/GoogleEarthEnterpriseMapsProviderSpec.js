import {
  GeographicTilingScheme,
  Rectangle,
  Request,
  Resource,
  RuntimeError,
  WebMercatorTilingScheme,
  GoogleEarthEnterpriseMapsProvider,
  ImageryProvider,
} from "../../index.js";

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

  it("returns valid value for hasAlphaChannel", async function () {
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

    expect(typeof provider.hasAlphaChannel).toBe("boolean");
  });

  it("can provide a root tile", async function () {
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

    const provider = await GoogleEarthEnterpriseMapsProvider.fromUrl(
      url,
      channel,
      {
        path: path,
      }
    );

    expect(provider.url).toEqual(url);
    expect(provider.path).toEqual(path);
    expect(provider.channel).toEqual(channel);
    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBeUndefined();
    expect(provider.minimumLevel).toEqual(0);
    expect(provider.version).toEqual(version);
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.tileDiscardPolicy).toBeUndefined();
    expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
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

  it("handles malformed JSON data returned by the server", async function () {
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

    const provider = await GoogleEarthEnterpriseMapsProvider.fromUrl(
      url,
      channel
    );

    expect(provider.url).toEqual(url);
    expect(provider.path).toEqual(path);
    expect(provider.version).toEqual(version);
    expect(provider.channel).toEqual(channel);
  });

  it("defaults to WebMercatorTilingScheme when no projection specified", async function () {
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

    const provider = await GoogleEarthEnterpriseMapsProvider.fromUrl(
      "http://example.invalid",
      1234
    );

    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
  });

  it("Projection is WebMercatorTilingScheme when server projection is mercator", async function () {
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

    const provider = await GoogleEarthEnterpriseMapsProvider.fromUrl(
      "http://example.invalid",
      1234
    );

    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
  });

  it("Projection is GeographicTilingScheme when server projection is flat", async function () {
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

    const provider = await GoogleEarthEnterpriseMapsProvider.fromUrl(
      "http://example.invalid",
      1234
    );

    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    expect(provider.rectangle).toEqual(
      new Rectangle(-Math.PI, -Math.PI, Math.PI, Math.PI)
    );
  });
});
