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
  let defaultAssetId;
  let defaultEndpoint;
  let defaultConstructorOptions;

  function setUpTestEndpoint({
    assetId = defaultAssetId,
    endpoint = defaultEndpoint,
    constructorOptions = defaultConstructorOptions,
  } = {}) {
    const endpointResource = IonResource._createEndpointResource(
      assetId,
      constructorOptions,
    );

    spyOn(IonResource, "_createEndpointResource").and.returnValue(
      endpointResource,
    );

    spyOn(endpointResource, "fetchJson").and.returnValue(
      Promise.resolve(endpoint),
    );

    return endpointResource;
  }

  beforeEach(function () {
    RequestScheduler.clearForSpecs();
    IonImageryProvider._endpointCache = {};

    defaultAssetId = 12335;
    defaultEndpoint = {
      type: "IMAGERY",
      url: "http://test.invalid/layer",
      accessToken: "not_really_a_refresh_token",
      attributions: [],
    };
    defaultConstructorOptions = {};
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
    setUpTestEndpoint({
      endpoint: {
        type: "3DTILES",
        url: "http://test.invalid/layer",
        accessToken: "not_really_a_refresh_token",
        attributions: [],
      },
    });

    await expectAsync(
      IonImageryProvider.fromAssetId(defaultAssetId, defaultConstructorOptions),
    ).toBeRejectedWithError(
      RuntimeError,
      "Cesium ion asset 12335 is not an imagery asset.",
    );
  });

  it("fromAssetId rejects with unknown external asset type", async function () {
    setUpTestEndpoint({
      endpoint: {
        type: "IMAGERY",
        externalType: "TUBELCANE",
        options: { url: "http://test.invalid/layer" },
        attributions: [],
      },
    });

    await expectAsync(
      IonImageryProvider.fromAssetId(defaultAssetId, defaultConstructorOptions),
    ).toBeRejectedWithError(
      RuntimeError,
      "Unrecognized Cesium ion imagery type: TUBELCANE",
    );
  });

  it("fromAssetId resolves to created provider", async function () {
    setUpTestEndpoint();

    const provider = await IonImageryProvider.fromAssetId(
      defaultAssetId,
      defaultConstructorOptions,
    );
    expect(provider).toBeInstanceOf(IonImageryProvider);
    expect(provider.errorEvent).toBeDefined();
    expect(provider._imageryProvider).toBeInstanceOf(
      UrlTemplateImageryProvider,
    );

    expect(IonResource._createEndpointResource).toHaveBeenCalledWith(
      defaultAssetId,
      defaultConstructorOptions,
    );
  });

  it("propagates called to underlying imagery provider resolves when ready", async function () {
    setUpTestEndpoint();

    const provider = await IonImageryProvider.fromAssetId(
      defaultAssetId,
      defaultConstructorOptions,
    );
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

  async function testExternalImagery(type, ImageryClass, options) {
    it(`works with type "${type}"`, async function () {
      setUpTestEndpoint({
        endpoint: {
          type: "IMAGERY",
          externalType: type,
          options: options,
          attributions: [],
        },
      });

      const provider = await IonImageryProvider.fromAssetId(
        defaultAssetId,
        defaultConstructorOptions,
      );

      expect(provider._imageryProvider).toBeInstanceOf(ImageryClass);
    });

    it(`works with cached type "${type}"`, async function () {
      const endpointResource = setUpTestEndpoint({
        endpoint: {
          type: "IMAGERY",
          externalType: type,
          options: options,
          attributions: [],
        },
      });

      const providerA = await IonImageryProvider.fromAssetId(
        defaultAssetId,
        defaultConstructorOptions,
      );
      expect(providerA._imageryProvider).toBeInstanceOf(ImageryClass);

      expect(endpointResource.fetchJson.calls.count()).toBe(1);

      const providerB = await IonImageryProvider.fromAssetId(
        defaultAssetId,
        // Same options, but different reference
        { ...defaultConstructorOptions },
      );
      expect(providerB._imageryProvider).toBeInstanceOf(ImageryClass);

      expect(endpointResource.fetchJson.calls.count()).toBe(1);
    });

    it(`works with type "${type}" and server-sent credits`, async function () {
      const serverCredit = {
        html: '<a href="http://test.invalid/">Text</a>',
        collapsible: false,
      };

      setUpTestEndpoint({
        endpoint: {
          type: "IMAGERY",
          externalType: type,
          options: options,
          attributions: [serverCredit],
        },
      });

      const provider = await IonImageryProvider.fromAssetId(
        defaultAssetId,
        defaultConstructorOptions,
      );

      const credits = provider.getTileCredits(0, 0, 0);
      const credit = credits[0];
      expect(credit).toBeInstanceOf(Credit);
      expect(credit.html).toEqual(serverCredit.html);
      expect(credit.showOnScreen).toEqual(!serverCredit.collapsible);
    });
  }

  describe("ARCGIS_MAPSERVER", function () {
    beforeEach(function () {
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
      );
    });

    testExternalImagery("ARCGIS_MAPSERVER", ArcGisMapServerImageryProvider, {
      url: "http://test.invalid",
    });
  });

  describe("BING", function () {
    beforeEach(function () {
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
      );
    });

    testExternalImagery("BING", BingMapsImageryProvider, {
      url: "http://test.invalid",
      key: "",
    });
  });

  describe("GOOGLE_EARTH", function () {
    beforeEach(function () {
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
      );
    });

    testExternalImagery("GOOGLE_EARTH", GoogleEarthEnterpriseMapsProvider, {
      url: "http://test.invalid",
      channel: 0,
    });
  });

  testExternalImagery("MAPBOX", MapboxImageryProvider, {
    accessToken: "test-token",
    url: "http://test.invalid",
    mapId: 1,
  });

  describe("SINGLE_TILE", function () {
    beforeEach(function () {
      spyOn(Resource._Implementations, "createImage").and.callFake(
        function (request, crossOrigin, deferred) {
          deferred.resolve({
            height: 16,
            width: 16,
          });
        },
      );
    });

    testExternalImagery("SINGLE_TILE", SingleTileImageryProvider, {
      url: "http://test.invalid",
    });
  });

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
