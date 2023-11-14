import Uri from "urijs";
import {
  decodeGoogleEarthEnterpriseData,
  defaultValue,
  defined,
  DiscardMissingTileImagePolicy,
  GeographicTilingScheme,
  GoogleEarthEnterpriseImageryProvider,
  GoogleEarthEnterpriseMetadata,
  GoogleEarthEnterpriseTileInformation,
  Imagery,
  ImageryLayer,
  ImageryProvider,
  ImageryState,
  Rectangle,
  Request,
  RequestScheduler,
  Resource,
  RuntimeError,
} from "../../index.js";

import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Scene/GoogleEarthEnterpriseImageryProvider", function () {
  beforeEach(function () {
    RequestScheduler.clearForSpecs();
  });

  let supportsImageBitmapOptions;
  beforeAll(async function () {
    decodeGoogleEarthEnterpriseData.passThroughDataForTesting = true;
    // This suite spies on requests. Resource.supportsImageBitmapOptions needs to make a request to a data URI.
    // We run it here to avoid interfering with the tests.
    const result = Resource.supportsImageBitmapOptions();
    supportsImageBitmapOptions = result;
  });

  afterAll(function () {
    decodeGoogleEarthEnterpriseData.passThroughDataForTesting = false;
  });

  let imageryProvider;
  afterEach(function () {
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
    Resource._Implementations.loadWithXhr =
      Resource._DefaultImplementations.loadWithXhr;
  });

  it("conforms to ImageryProvider interface", function () {
    expect(GoogleEarthEnterpriseImageryProvider).toConformToInterface(
      ImageryProvider
    );
  });

  function installMockGetQuadTreePacket() {
    spyOn(
      GoogleEarthEnterpriseMetadata.prototype,
      "getQuadTreePacket"
    ).and.callFake(function (quadKey, version) {
      quadKey = defaultValue(quadKey, "");
      this._tileInfo[`${quadKey}0`] = new GoogleEarthEnterpriseTileInformation(
        0xff,
        1,
        1,
        1
      );
      this._tileInfo[`${quadKey}1`] = new GoogleEarthEnterpriseTileInformation(
        0xff,
        1,
        1,
        1
      );
      this._tileInfo[`${quadKey}2`] = new GoogleEarthEnterpriseTileInformation(
        0xff,
        1,
        1,
        1
      );
      this._tileInfo[`${quadKey}3`] = new GoogleEarthEnterpriseTileInformation(
        0xff,
        1,
        1,
        1
      );

      return Promise.resolve();
    });
  }

  function installFakeImageRequest(expectedUrl, proxy) {
    Resource._Implementations.createImage = function (
      request,
      crossOrigin,
      deferred
    ) {
      let url = request.url;
      if (/^blob:/.test(url) || supportsImageBitmapOptions) {
        // load blob url normally
        Resource._DefaultImplementations.createImage(
          request,
          crossOrigin,
          deferred,
          true,
          false,
          true
        );
      } else {
        if (proxy) {
          const uri = new Uri(url);
          url = decodeURIComponent(uri.query());
        }
        if (defined(expectedUrl)) {
          expect(url).toEqual(expectedUrl);
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
      if (defined(expectedUrl) && !/^blob:/.test(url)) {
        if (proxy) {
          const uri = new Uri(url);
          url = decodeURIComponent(uri.query());
        }

        expect(url).toEqual(expectedUrl);
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

  it("fromMetadata throws without metadata", function () {
    expect(() =>
      GoogleEarthEnterpriseImageryProvider.fromMetadata()
    ).toThrowDeveloperError("");
  });

  it("fromMetadata throws if there isn't imagery", async function () {
    installMockGetQuadTreePacket();

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl({
      url: "made/up/url",
    });

    metadata.imageryPresent = false;

    expect(() =>
      GoogleEarthEnterpriseImageryProvider.fromMetadata(metadata)
    ).toThrowError(
      RuntimeError,
      "The server made/up/url/ doesn't have imagery"
    );
  });

  it("fromMetadata resolves to created provider", async function () {
    installMockGetQuadTreePacket();
    const url = "http://fake.fake.invalid";

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl(url);
    imageryProvider = GoogleEarthEnterpriseImageryProvider.fromMetadata(
      metadata
    );

    expect(imageryProvider).toBeInstanceOf(
      GoogleEarthEnterpriseImageryProvider
    );
  });

  it("returns false for hasAlphaChannel", async function () {
    installMockGetQuadTreePacket();
    const url = "http://fake.fake.invalid";

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl(url);
    imageryProvider = GoogleEarthEnterpriseImageryProvider.fromMetadata(
      metadata
    );

    expect(typeof imageryProvider.hasAlphaChannel).toBe("boolean");
    expect(imageryProvider.hasAlphaChannel).toBe(false);
  });

  it("can provide a root tile", async function () {
    installMockGetQuadTreePacket();
    const url = "http://fake.fake.invalid/";

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl(url);
    imageryProvider = GoogleEarthEnterpriseImageryProvider.fromMetadata(
      metadata
    );

    expect(imageryProvider.url).toEqual(url);

    expect(imageryProvider.tileWidth).toEqual(256);
    expect(imageryProvider.tileHeight).toEqual(256);
    expect(imageryProvider.maximumLevel).toEqual(23);
    expect(imageryProvider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    // Defaults to custom tile policy
    expect(imageryProvider.tileDiscardPolicy).not.toBeInstanceOf(
      DiscardMissingTileImagePolicy
    );
    expect(imageryProvider.rectangle).toEqual(
      new Rectangle(-Math.PI, -Math.PI, Math.PI, Math.PI)
    );
    expect(imageryProvider.credit).toBeUndefined();

    installFakeImageRequest("http://fake.fake.invalid/flatfile?f1-03-i.1");

    const image = await imageryProvider.requestImage(0, 0, 0);
    expect(image).toBeImageOrImageBitmap();
  });

  it("raises error event when image cannot be loaded", async function () {
    installMockGetQuadTreePacket();
    const url = "http://foo.bar.invalid";

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl(url);
    imageryProvider = GoogleEarthEnterpriseImageryProvider.fromMetadata(
      metadata
    );
    const layer = new ImageryLayer(imageryProvider);

    let tries = 0;
    imageryProvider.errorEvent.addEventListener(function (error) {
      expect(error.timesRetried).toEqual(tries);
      ++tries;
      if (tries < 3) {
        error.retry = true;
      }
      setTimeout(function () {
        RequestScheduler.update();
      }, 1);
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
});
