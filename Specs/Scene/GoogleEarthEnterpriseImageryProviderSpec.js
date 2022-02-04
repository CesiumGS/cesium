import { decodeGoogleEarthEnterpriseData } from "../../Source/Cesium.js";
import { defaultValue } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { GoogleEarthEnterpriseMetadata } from "../../Source/Cesium.js";
import { GoogleEarthEnterpriseTileInformation } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { Request } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { DiscardMissingTileImagePolicy } from "../../Source/Cesium.js";
import { GoogleEarthEnterpriseImageryProvider } from "../../Source/Cesium.js";
import { Imagery } from "../../Source/Cesium.js";
import { ImageryLayer } from "../../Source/Cesium.js";
import { ImageryProvider } from "../../Source/Cesium.js";
import { ImageryState } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";
import { Uri } from "../../Source/Cesium.js";
import { when } from "../../Source/Cesium.js";

describe("Scene/GoogleEarthEnterpriseImageryProvider", function () {
  beforeEach(function () {
    RequestScheduler.clearForSpecs();
  });

  let supportsImageBitmapOptions;
  beforeAll(function () {
    decodeGoogleEarthEnterpriseData.passThroughDataForTesting = true;
    // This suite spies on requests. Resource.supportsImageBitmapOptions needs to make a request to a data URI.
    // We run it here to avoid interfering with the tests.
    return Resource.supportsImageBitmapOptions().then(function (result) {
      supportsImageBitmapOptions = result;
    });
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

  it("constructor throws when url is not specified", function () {
    function constructWithoutServer() {
      return new GoogleEarthEnterpriseImageryProvider({});
    }

    expect(constructWithoutServer).toThrowDeveloperError();
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

      return when();
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

  it("resolves readyPromise", function () {
    installMockGetQuadTreePacket();
    const url = "http://fake.fake.invalid";

    const resource = new Resource({
      url: url,
    });

    imageryProvider = new GoogleEarthEnterpriseImageryProvider({
      url: resource,
    });

    return imageryProvider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(imageryProvider.ready).toBe(true);
    });
  });

  it("resolves readyPromise with Resource", function () {
    installMockGetQuadTreePacket();
    const url = "http://fake.fake.invalid";

    imageryProvider = new GoogleEarthEnterpriseImageryProvider({
      url: url,
    });

    return imageryProvider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(imageryProvider.ready).toBe(true);
    });
  });

  it("rejects readyPromise on error", function () {
    const url = "http://host.invalid";
    imageryProvider = new GoogleEarthEnterpriseImageryProvider({
      url: url,
    });

    return imageryProvider.readyPromise
      .then(function () {
        fail("should not resolve");
      })
      .otherwise(function (e) {
        expect(imageryProvider.ready).toBe(false);
        expect(e.message).toContain(url);
      });
  });

  it("readyPromise rejects if there isn't imagery", function () {
    installMockGetQuadTreePacket();

    const metadata = new GoogleEarthEnterpriseMetadata({
      url: "made/up/url",
    });

    metadata.imageryPresent = false;

    imageryProvider = new GoogleEarthEnterpriseImageryProvider({
      metadata: metadata,
    });

    return imageryProvider.readyPromise
      .then(function () {
        fail("Server does not have imagery, so we shouldn't resolve.");
      })
      .otherwise(function () {
        expect(imageryProvider.ready).toBe(false);
      });
  });

  it("returns false for hasAlphaChannel", function () {
    installMockGetQuadTreePacket();
    const url = "http://fake.fake.invalid";

    imageryProvider = new GoogleEarthEnterpriseImageryProvider({
      url: url,
    });

    return pollToPromise(function () {
      return imageryProvider.ready;
    }).then(function () {
      expect(typeof imageryProvider.hasAlphaChannel).toBe("boolean");
      expect(imageryProvider.hasAlphaChannel).toBe(false);
    });
  });

  it("can provide a root tile", function () {
    installMockGetQuadTreePacket();
    const url = "http://fake.fake.invalid/";

    imageryProvider = new GoogleEarthEnterpriseImageryProvider({
      url: url,
    });

    expect(imageryProvider.url).toEqual(url);

    return pollToPromise(function () {
      return imageryProvider.ready;
    }).then(function () {
      expect(imageryProvider.tileWidth).toEqual(256);
      expect(imageryProvider.tileHeight).toEqual(256);
      expect(imageryProvider.maximumLevel).toEqual(23);
      expect(imageryProvider.tilingScheme).toBeInstanceOf(
        GeographicTilingScheme
      );
      // Defaults to custom tile policy
      expect(imageryProvider.tileDiscardPolicy).not.toBeInstanceOf(
        DiscardMissingTileImagePolicy
      );
      expect(imageryProvider.rectangle).toEqual(
        new Rectangle(-Math.PI, -Math.PI, Math.PI, Math.PI)
      );
      expect(imageryProvider.credit).toBeUndefined();

      installFakeImageRequest("http://fake.fake.invalid/flatfile?f1-03-i.1");

      return imageryProvider.requestImage(0, 0, 0).then(function (image) {
        expect(image).toBeImageOrImageBitmap();
      });
    });
  });

  it("raises error on invalid url", function () {
    const url = "http://host.invalid";
    imageryProvider = new GoogleEarthEnterpriseImageryProvider({
      url: url,
    });

    let errorEventRaised = false;
    imageryProvider.errorEvent.addEventListener(function (error) {
      expect(error.message).toContain(url);
      errorEventRaised = true;
    });

    return pollToPromise(function () {
      return imageryProvider.ready || errorEventRaised;
    }).then(function () {
      expect(imageryProvider.ready).toEqual(false);
      expect(errorEventRaised).toEqual(true);
    });
  });

  it("raises error event when image cannot be loaded", function () {
    installMockGetQuadTreePacket();
    const url = "http://foo.bar.invalid";

    imageryProvider = new GoogleEarthEnterpriseImageryProvider({
      url: url,
    });

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

    return pollToPromise(function () {
      return imageryProvider.ready;
    }).then(function () {
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
});
