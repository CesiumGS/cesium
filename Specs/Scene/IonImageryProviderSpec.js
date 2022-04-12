import { Credit } from "../../Source/Cesium.js";
import { defaultValue } from "../../Source/Cesium.js";
import { IonResource } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { RuntimeError } from "../../Source/Cesium.js";
import { ArcGisMapServerImageryProvider } from "../../Source/Cesium.js";
import { BingMapsImageryProvider } from "../../Source/Cesium.js";
import { GoogleEarthEnterpriseMapsProvider } from "../../Source/Cesium.js";
import { ImageryProvider } from "../../Source/Cesium.js";
import { IonImageryProvider } from "../../Source/Cesium.js";
import { MapboxImageryProvider } from "../../Source/Cesium.js";
import { SingleTileImageryProvider } from "../../Source/Cesium.js";
import { UrlTemplateImageryProvider } from "../../Source/Cesium.js";
import { WebMapServiceImageryProvider } from "../../Source/Cesium.js";
import { WebMapTileServiceImageryProvider } from "../../Source/Cesium.js";

describe("Scene/IonImageryProvider", function () {
  function createTestProvider(endpointData) {
    endpointData = defaultValue(endpointData, {
      type: "IMAGERY",
      url: "http://test.invalid/layer",
      accessToken: "not_really_a_refresh_token",
      attributions: [],
    });

    const assetId = 12335;
    const options = { assetId: assetId };
    const endpointResource = IonResource._createEndpointResource(
      assetId,
      options
    );
    spyOn(IonResource, "_createEndpointResource").and.returnValue(
      endpointResource
    );

    spyOn(endpointResource, "fetchJson").and.returnValue(
      Promise.resolve(endpointData)
    );

    const provider = new IonImageryProvider(options);

    expect(IonResource._createEndpointResource).toHaveBeenCalledWith(
      assetId,
      options
    );
    return provider;
  }

  beforeEach(function () {
    RequestScheduler.clearForSpecs();
    IonImageryProvider._endpointCache = {};
  });

  it("conforms to ImageryProvider interface", function () {
    expect(IonImageryProvider).toConformToInterface(ImageryProvider);
  });

  it("throws without asset ID", function () {
    expect(function () {
      return new IonImageryProvider({});
    }).toThrowDeveloperError(ImageryProvider);
  });

  it("readyPromise rejects with non-imagery asset", function (done) {
    const provider = createTestProvider({
      type: "3DTILES",
      url: "http://test.invalid/layer",
      accessToken: "not_really_a_refresh_token",
      attributions: [],
    });

    return provider.readyPromise
      .then(function () {
        fail("should not be called");
      })
      .catch(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(provider.ready).toBe(false);
      });
  });

  it("readyPromise rejects with unknown external asset type", function (done) {
    const provider = createTestProvider({
      type: "IMAGERY",
      externalType: "TUBELCANE",
      options: { url: "http://test.invalid/layer" },
      attributions: [],
    });

    return provider.readyPromise
      .then(function () {
        fail("should not be called");
      })
      .catch(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(provider.ready).toBe(false);
      });
  });

  it("readyPromise resolves when ready", function () {
    const provider = createTestProvider();
    return provider.readyPromise.then(function () {
      expect(provider.errorEvent).toBeDefined();
      expect(provider.ready).toBe(true);
      expect(provider._imageryProvider).toBeInstanceOf(
        UrlTemplateImageryProvider
      );
    });
  });

  it("Uses previously fetched endpoint cache", function () {
    const endpointData = {
      type: "IMAGERY",
      url: "http://test.invalid/layer",
      accessToken: "not_really_a_refresh_token",
      attributions: [],
    };

    const assetId = 12335;
    const options = {
      assetId: assetId,
      accessToken: "token",
      server: "http://test.invalid",
    };
    const endpointResource = IonResource._createEndpointResource(
      assetId,
      options
    );
    spyOn(IonResource, "_createEndpointResource").and.returnValue(
      endpointResource
    );
    spyOn(endpointResource, "fetchJson").and.returnValue(
      Promise.resolve(endpointData)
    );

    expect(endpointResource.fetchJson.calls.count()).toBe(0);
    const provider = new IonImageryProvider(options);
    let provider2;
    return provider.readyPromise
      .then(function () {
        expect(provider.ready).toBe(true);
        expect(endpointResource.fetchJson.calls.count()).toBe(1);

        // Same as options but in a different order to verify cache is order independant.
        const options2 = {
          accessToken: "token",
          server: "http://test.invalid",
          assetId: assetId,
        };
        provider2 = new IonImageryProvider(options2);
        return provider2.readyPromise;
      })
      .then(function () {
        //Since the data is cached, fetchJson is not called again.
        expect(endpointResource.fetchJson.calls.count()).toBe(1);
        expect(provider2.ready).toBe(true);
      });
  });

  it("propagates called to underlying imagery provider resolves when ready", function () {
    const provider = createTestProvider();
    let internalProvider;

    return provider.readyPromise
      .then(function () {
        internalProvider = provider._imageryProvider;
        expect(provider.rectangle).toBe(internalProvider.rectangle);
        expect(provider.tileWidth).toBe(internalProvider.tileWidth);
        expect(provider.tileHeight).toBe(internalProvider.tileHeight);
        expect(provider.maximumLevel).toBe(internalProvider.maximumLevel);
        expect(provider.minimumLevel).toBe(internalProvider.minimumLevel);
        expect(provider.tilingScheme).toBe(internalProvider.tilingScheme);
        expect(provider.tileDiscardPolicy).toBe(
          internalProvider.tileDiscardPolicy
        );
        expect(provider.credit).toBe(internalProvider.credit);
        expect(provider.hasAlphaChannel).toBe(internalProvider.hasAlphaChannel);

        const image = new Image();
        const request = {};
        spyOn(internalProvider, "requestImage").and.returnValue(
          Promise.resolve(image)
        );
        return provider.requestImage(1, 2, 3, request).then(function (result) {
          expect(internalProvider.requestImage).toHaveBeenCalledWith(
            1,
            2,
            3,
            request
          );
          expect(result).toBe(image);
        });
      })
      .then(function () {
        const info = {};
        spyOn(internalProvider, "pickFeatures").and.returnValue(
          Promise.resolve(info)
        );
        return provider.pickFeatures(1, 2, 3, 4, 5).then(function (result) {
          expect(internalProvider.pickFeatures).toHaveBeenCalledWith(
            1,
            2,
            3,
            4,
            5
          );
          expect(result).toBe(info);
        });
      })
      .then(function () {
        const innerCredit = new Credit("Data provided");
        spyOn(internalProvider, "getTileCredits").and.returnValue([
          innerCredit,
        ]);
        const credits = provider.getTileCredits(1, 2, 3);
        expect(internalProvider.getTileCredits).toHaveBeenCalledWith(1, 2, 3);
        expect(credits).toContain(innerCredit);
      });
  });

  it("throws developer errors when not ready", function () {
    const provider = createTestProvider();
    provider._ready = false;

    expect(function () {
      return provider.rectangle;
    }).toThrowDeveloperError();
    expect(function () {
      return provider.tileWidth;
    }).toThrowDeveloperError();
    expect(function () {
      return provider.tileHeight;
    }).toThrowDeveloperError();
    expect(function () {
      return provider.maximumLevel;
    }).toThrowDeveloperError();
    expect(function () {
      return provider.minimumLevel;
    }).toThrowDeveloperError();
    expect(function () {
      return provider.tilingScheme;
    }).toThrowDeveloperError();
    expect(function () {
      return provider.tileDiscardPolicy;
    }).toThrowDeveloperError();
    expect(function () {
      return provider.credit;
    }).toThrowDeveloperError();
    expect(function () {
      return provider.hasAlphaChannel;
    }).toThrowDeveloperError();
    expect(function () {
      return provider.requestImage(1, 2, 3, {});
    }).toThrowDeveloperError();
    expect(function () {
      return provider.pickFeatures(1, 2, 3, 4, 5);
    }).toThrowDeveloperError();
    expect(function () {
      return provider.getTileCredits(1, 2, 3);
    }).toThrowDeveloperError();
  });

  it("handles server-sent credits", function () {
    const serverCredit = {
      html: '<a href="http://test.invalid/">Text</a>',
      collapsible: false,
    };
    const provider = createTestProvider({
      type: "IMAGERY",
      url: "http://test.invalid/layer",
      accessToken: "not_really_a_refresh_token",
      attributions: [serverCredit],
    });

    return provider.readyPromise.then(function () {
      const credits = provider.getTileCredits(0, 0, 0);
      const credit = credits[0];
      expect(credit).toBeInstanceOf(Credit);
      expect(credit.html).toEqual(serverCredit.html);
      expect(credit.showOnScreen).toEqual(!serverCredit.collapsible);
    });
  });

  function testExternalImagery(type, options, ImageryClass) {
    const provider = createTestProvider({
      type: "IMAGERY",
      externalType: type,
      options: options,
      attributions: [],
    });
    return provider.readyPromise.then(function () {
      expect(provider._imageryProvider).toBeInstanceOf(ImageryClass);
    });
  }

  it("createImageryProvider works with ARCGIS_MAPSERVER", function () {
    spyOn(Resource._Implementations, "loadAndExecuteScript").and.callFake(
      function (url, name, deffered) {
        deffered.resolve({
          resourceSets: [
            {
              resources: [{ imageUrl: "", imageUrlSubdomains: [], zoomMax: 0 }],
            },
          ],
        });
      }
    );
    return testExternalImagery(
      "ARCGIS_MAPSERVER",
      { url: "http://test.invalid" },
      ArcGisMapServerImageryProvider
    );
  });

  it("createImageryProvider works with BING", function () {
    spyOn(Resource._Implementations, "loadAndExecuteScript").and.callFake(
      function (url, name, deffered) {
        deffered.resolve({
          resourceSets: [
            {
              resources: [{ imageUrl: "", imageUrlSubdomains: [], zoomMax: 0 }],
            },
          ],
        });
      }
    );
    return testExternalImagery(
      "BING",
      { url: "http://test.invalid", key: "" },
      BingMapsImageryProvider
    );
  });

  it("createImageryProvider works with GOOGLE_EARTH", function () {
    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      deferred.resolve(JSON.stringify({ layers: [{ id: 0, version: "" }] }));
    });

    return testExternalImagery(
      "GOOGLE_EARTH",
      { url: "http://test.invalid", channel: 0 },
      GoogleEarthEnterpriseMapsProvider
    );
  });

  it("createImageryProvider works with MAPBOX", function () {
    return testExternalImagery(
      "MAPBOX",
      { accessToken: "test-token", url: "http://test.invalid", mapId: 1 },
      MapboxImageryProvider
    );
  });

  it("createImageryProvider works with SINGLE_TILE", function () {
    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      deferred.resolve({});
    });

    return testExternalImagery(
      "SINGLE_TILE",
      { url: "http://test.invalid" },
      SingleTileImageryProvider
    );
  });

  it("createImageryProvider works with TMS", function () {
    return testExternalImagery(
      "TMS",
      { url: "http://test.invalid" },
      UrlTemplateImageryProvider
    );
  });

  it("createImageryProvider works with URL_TEMPLATE", function () {
    return testExternalImagery(
      "URL_TEMPLATE",
      { url: "http://test.invalid" },
      UrlTemplateImageryProvider
    );
  });

  it("createImageryProvider works with WMS", function () {
    return testExternalImagery(
      "WMS",
      { url: "http://test.invalid", layers: [] },
      WebMapServiceImageryProvider
    );
  });

  it("createImageryProvider works with WMTS", function () {
    return testExternalImagery(
      "WMTS",
      { url: "http://test.invalid", layer: "", style: "", tileMatrixSetID: 1 },
      WebMapTileServiceImageryProvider
    );
  });
});
