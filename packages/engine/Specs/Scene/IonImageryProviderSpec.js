import {
  Credit,
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
  Google2DImageryProvider,
  Azure2DImageryProvider,
} from "../../index.js";

describe("Scene/IonImageryProvider", function () {
  async function createTestProviderAsync(endpointData) {
    endpointData = endpointData ?? {
      type: "IMAGERY",
      url: "http://test.invalid/layer",
      accessToken: "not_really_a_refresh_token",
      attributions: [],
    };

    const assetId = 12335;
    const options = {};
    const endpointResource = IonResource._createEndpointResource(
      assetId,
      options,
    );
    spyOn(IonResource, "_createEndpointResource").and.returnValue(
      endpointResource,
    );

    spyOn(endpointResource, "fetchJson").and.returnValue(
      Promise.resolve(endpointData),
    );

    const provider = await IonImageryProvider.fromAssetId(assetId, options);

    expect(IonResource._createEndpointResource).toHaveBeenCalledWith(
      assetId,
      options,
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

  it("fromAssetId throws without assetId", async function () {
    await expectAsync(
      IonImageryProvider.fromAssetId(),
    ).toBeRejectedWithDeveloperError();
  });

  it("fromAssetId throws with non-imagery asset", async function () {
    await expectAsync(
      createTestProviderAsync({
        type: "3DTILES",
        url: "http://test.invalid/layer",
        accessToken: "not_really_a_refresh_token",
        attributions: [],
      }),
    ).toBeRejectedWithError(
      RuntimeError,
      "Cesium ion asset 12335 is not an imagery asset.",
    );
  });

  it("fromAssetId rejects with unknown external asset type", async function () {
    await expectAsync(
      createTestProviderAsync({
        type: "IMAGERY",
        externalType: "TUBELCANE",
        options: { url: "http://test.invalid/layer" },
        attributions: [],
      }),
    ).toBeRejectedWithError(
      RuntimeError,
      "Unrecognized Cesium ion imagery type: TUBELCANE",
    );
  });

  it("fromAssetId resolves to created provider", async function () {
    const provider = await createTestProviderAsync();
    expect(provider).toBeInstanceOf(IonImageryProvider);
    expect(provider.errorEvent).toBeDefined();
    expect(provider._imageryProvider).toBeInstanceOf(
      UrlTemplateImageryProvider,
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
      options,
    );
    spyOn(IonResource, "_createEndpointResource").and.returnValue(
      endpointResource,
    );
    spyOn(endpointResource, "fetchJson").and.returnValue(
      Promise.resolve(endpointData),
    );

    expect(endpointResource.fetchJson.calls.count()).toBe(0);
    await IonImageryProvider.fromAssetId(assetId, options);
    expect(endpointResource.fetchJson.calls.count()).toBe(1);

    // Same as options but in a different order to verify cache is order independent.
    const options2 = {
      accessToken: "token",
      server: "http://test.invalid",
    };
    await IonImageryProvider.fromAssetId(assetId, options2);
    // Since the data is cached, fetchJson is not called again.
    expect(endpointResource.fetchJson.calls.count()).toBe(1);
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
      Promise.resolve(image),
    );
    let result = await provider.requestImage(1, 2, 3, request);
    expect(internalProvider.requestImage).toHaveBeenCalledWith(
      1,
      2,
      3,
      request,
    );
    expect(result).toBe(image);
    const info = {};
    spyOn(internalProvider, "pickFeatures").and.returnValue(
      Promise.resolve(info),
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

  async function testExternalImagery(type, ImageryClass, options, beforeFn) {
    it(`works with "${type}"`, async function () {
      if (beforeFn) {
        beforeFn();
      }

      const provider = await createTestProviderAsync({
        type: "IMAGERY",
        externalType: type,
        options: options,
        attributions: [],
      });
      expect(provider._imageryProvider).toBeInstanceOf(ImageryClass);
    });
  }

  testExternalImagery(
    "ARCGIS_MAPSERVER",
    ArcGisMapServerImageryProvider,
    { url: "http://test.invalid" },
    () =>
      spyOn(Resource._Implementations, "loadWithXhr").and.callFake(
        function (
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType,
        ) {
          deferred.resolve(
            JSON.stringify({
              imageUrl: "",
              imageUrlSubdomains: [],
              zoomMax: 0,
            }),
          );
        },
      ),
  );

  testExternalImagery(
    "BING",
    BingMapsImageryProvider,
    { url: "http://test.invalid", key: "" },
    () =>
      spyOn(Resource._Implementations, "loadWithXhr").and.callFake(
        function (
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType,
        ) {
          deferred.resolve(
            JSON.stringify({
              resourceSets: [
                {
                  resources: [
                    { imageUrl: "", imageUrlSubdomains: [], zoomMax: 0 },
                  ],
                },
              ],
            }),
          );
        },
      ),
  );

  testExternalImagery(
    "GOOGLE_EARTH",
    GoogleEarthEnterpriseMapsProvider,
    { url: "http://test.invalid", channel: 0 },
    () =>
      spyOn(Resource._Implementations, "loadWithXhr").and.callFake(
        function (
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType,
        ) {
          deferred.resolve(
            JSON.stringify({ layers: [{ id: 0, version: "" }] }),
          );
        },
      ),
  );

  testExternalImagery("MAPBOX", MapboxImageryProvider, {
    accessToken: "test-token",
    url: "http://test.invalid",
    mapId: 1,
  });

  testExternalImagery(
    "SINGLE_TILE",
    SingleTileImageryProvider,
    { url: "http://test.invalid" },
    () =>
      spyOn(Resource._Implementations, "createImage").and.callFake(
        function (request, crossOrigin, deferred) {
          deferred.resolve({
            height: 16,
            width: 16,
          });
        },
      ),
  );

  testExternalImagery("TMS", UrlTemplateImageryProvider, {
    url: "http://test.invalid",
  });

  testExternalImagery("URL_TEMPLATE", UrlTemplateImageryProvider, {
    url: "http://test.invalid",
  });

  testExternalImagery("WMS", WebMapServiceImageryProvider, {
    url: "http://test.invalid",
    layers: [],
  });

  testExternalImagery("WMTS", WebMapTileServiceImageryProvider, {
    url: "http://test.invalid",
    layer: "",
    style: "",
    tileMatrixSetID: 1,
  });

  testExternalImagery("GOOGLE_2D_MAPS", Google2DImageryProvider, {
    url: "http://test.invalid",
    key: "",
    session: "",
    tileWidth: 256,
    tileHeight: 256,
  });

  testExternalImagery("AZURE_MAPS", Azure2DImageryProvider, {
    url: "http://test.invalid",
    subscriptionKey: "",
  });
});
