import {
  Credit,
  defaultValue,
  IonResource,
  RequestScheduler,
  Resource,
  RuntimeError,
  ArcGisMapServerImageryProvider,
  BingMapsImageryProvider,
  GoogleEarthEnterpriseMapsProvider,
  ImageryProvider,
  IonImageryProvider,
  MapboxImageryProvider,
  SingleTileImageryProvider,
  UrlTemplateImageryProvider,
  WebMapServiceImageryProvider,
  WebMapTileServiceImageryProvider,
} from "../../index.js";

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

  async function createTestProviderAsync(endpointData) {
    endpointData = defaultValue(endpointData, {
      type: "IMAGERY",
      url: "http://test.invalid/layer",
      accessToken: "not_really_a_refresh_token",
      attributions: [],
    });

    const assetId = 12335;
    const options = {};
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

    const provider = await IonImageryProvider.fromAssetId(assetId, options);

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

  it("readyPromise rejects with non-imagery asset", function () {
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

  it("readyPromise rejects with unknown external asset type", function () {
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

  it("fromAssetId throws without assetId", async function () {
    await expectAsync(
      IonImageryProvider.fromAssetId()
    ).toBeRejectedWithDeveloperError();
  });

  it("fromAssetId throws with non-imagery asset", async function () {
    await expectAsync(
      createTestProviderAsync({
        type: "3DTILES",
        url: "http://test.invalid/layer",
        accessToken: "not_really_a_refresh_token",
        attributions: [],
      })
    ).toBeRejectedWithError(
      RuntimeError,
      "Cesium ion asset 12335 is not an imagery asset."
    );
  });

  it("fromAssetId rejects with unknown external asset type", async function () {
    await expectAsync(
      createTestProviderAsync({
        type: "IMAGERY",
        externalType: "TUBELCANE",
        options: { url: "http://test.invalid/layer" },
        attributions: [],
      })
    ).toBeRejectedWithError(
      RuntimeError,
      "Unrecognized Cesium ion imagery type: TUBELCANE"
    );
  });

  it("fromAssetId resolves to created provider", async function () {
    const provider = await createTestProviderAsync();
    expect(provider).toBeInstanceOf(IonImageryProvider);
    expect(provider.errorEvent).toBeDefined();
    expect(provider.ready).toBe(true);
    expect(provider._imageryProvider).toBeInstanceOf(
      UrlTemplateImageryProvider
    );
  });

  it("Uses previously fetched endpoint cache", async function () {
    const endpointData = {
      type: "IMAGERY",
      url: "http://test.invalid/layer",
      accessToken: "not_really_a_refresh_token",
      attributions: [],
    };

    const assetId = 12335;
    const options = {
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
    const provider = await IonImageryProvider.fromAssetId(assetId, options);
    expect(provider.ready).toBe(true);
    expect(endpointResource.fetchJson.calls.count()).toBe(1);

    // Same as options but in a different order to verify cache is order independant.
    const options2 = {
      accessToken: "token",
      server: "http://test.invalid",
    };
    const provider2 = await IonImageryProvider.fromAssetId(assetId, options2);
    //Since the data is cached, fetchJson is not called again.
    expect(endpointResource.fetchJson.calls.count()).toBe(1);
    expect(provider2.ready).toBe(true);
  });

  it("propagates called to underlying imagery provider resolves when ready", async function () {
    const provider = await createTestProviderAsync();
    const internalProvider = provider._imageryProvider;
    expect(provider.rectangle).toBe(internalProvider.rectangle);
    expect(provider.tileWidth).toBe(internalProvider.tileWidth);
    expect(provider.tileHeight).toBe(internalProvider.tileHeight);
    expect(provider.maximumLevel).toBe(internalProvider.maximumLevel);
    expect(provider.minimumLevel).toBe(internalProvider.minimumLevel);
    expect(provider.tilingScheme).toBe(internalProvider.tilingScheme);
    expect(provider.tileDiscardPolicy).toBe(internalProvider.tileDiscardPolicy);
    expect(provider.credit).toBe(internalProvider.credit);
    expect(provider.hasAlphaChannel).toBe(internalProvider.hasAlphaChannel);

    const image = new Image();
    const request = {};
    spyOn(internalProvider, "requestImage").and.returnValue(
      Promise.resolve(image)
    );
    let result = await provider.requestImage(1, 2, 3, request);
    expect(internalProvider.requestImage).toHaveBeenCalledWith(
      1,
      2,
      3,
      request
    );
    expect(result).toBe(image);
    const info = {};
    spyOn(internalProvider, "pickFeatures").and.returnValue(
      Promise.resolve(info)
    );
    result = await provider.pickFeatures(1, 2, 3, 4, 5);
    expect(internalProvider.pickFeatures).toHaveBeenCalledWith(1, 2, 3, 4, 5);
    expect(result).toBe(info);
    const innerCredit = new Credit("Data provided");
    spyOn(internalProvider, "getTileCredits").and.returnValue([innerCredit]);
    const credits = provider.getTileCredits(1, 2, 3);
    expect(internalProvider.getTileCredits).toHaveBeenCalledWith(1, 2, 3);
    expect(credits).toContain(innerCredit);
  });

  it("handles server-sent credits", async function () {
    const serverCredit = {
      html: '<a href="http://test.invalid/">Text</a>',
      collapsible: false,
    };
    const provider = await createTestProviderAsync({
      type: "IMAGERY",
      url: "http://test.invalid/layer",
      accessToken: "not_really_a_refresh_token",
      attributions: [serverCredit],
    });

    const credits = provider.getTileCredits(0, 0, 0);
    const credit = credits[0];
    expect(credit).toBeInstanceOf(Credit);
    expect(credit.html).toEqual(serverCredit.html);
    expect(credit.showOnScreen).toEqual(!serverCredit.collapsible);
  });

  async function testExternalImagery(type, options, ImageryClass) {
    const provider = await createTestProviderAsync({
      type: "IMAGERY",
      externalType: type,
      options: options,
      attributions: [],
    });
    expect(provider._imageryProvider).toBeInstanceOf(ImageryClass);
  }

  it("createImageryProvider works with ARCGIS_MAPSERVER", function () {
    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      deferred.resolve(
        JSON.stringify({ imageUrl: "", imageUrlSubdomains: [], zoomMax: 0 })
      );
    });
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
