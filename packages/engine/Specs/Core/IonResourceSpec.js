import {
  Ion,
  IonResource,
  RequestErrorEvent,
  Resource,
  RuntimeError,
} from "../../index.js";

describe("Core/IonResource", function () {
  const assetId = 123890213;
  const endpoint = {
    type: "3DTILES",
    url: `https://assets.cesium.com/${assetId}/tileset.json`,
    accessToken: "not_really_a_refresh_token",
    attributions: [],
  };

  it("constructs with expected values", function () {
    spyOn(Resource, "call").and.callThrough();

    const endpointResource = IonResource._createEndpointResource(assetId);
    const resource = new IonResource(endpoint, endpointResource);
    expect(resource).toBeInstanceOf(Resource);
    expect(resource._ionEndpoint).toEqual(endpoint);
    expect(Resource.call).toHaveBeenCalledWith(resource, {
      url: endpoint.url,
      retryCallback: resource.retryCallback,
      retryAttempts: 1,
    });
  });

  it("clone works", function () {
    const endpointResource = IonResource._createEndpointResource(assetId);
    const resource = new IonResource(endpoint, endpointResource);
    const cloned = resource.clone();
    expect(cloned).not.toBe(resource);
    expect(cloned._ionRoot).toBe(resource);
    cloned._ionRoot = undefined;
    expect(cloned.retryCallback).toBe(resource.retryCallback);
    expect(cloned.headers.Authorization).toBe(resource.headers.Authorization);
    expect(cloned).toEqual(resource);
  });

  it("create creates the expected resource", function () {
    const endpointResource = IonResource._createEndpointResource(assetId);
    const resource = new IonResource(endpoint, endpointResource);
    expect(resource.getUrlComponent()).toEqual(endpoint.url);
    expect(resource._ionEndpoint).toBe(endpoint);
    expect(resource._ionEndpointResource).toEqual(endpointResource);
    expect(resource.retryCallback).toBeDefined();
    expect(resource.retryAttempts).toBe(1);
  });

  it("fromAssetId calls constructor for non-external endpoint with expected parameters", function () {
    const tilesAssetId = 123890213;
    const tilesEndpoint = {
      type: "3DTILES",
      url: `https://assets.cesium.com/${tilesAssetId}/tileset.json`,
      accessToken: "not_really_a_refresh_token",
      attributions: [],
    };

    const options = {};
    const resourceEndpoint = IonResource._createEndpointResource(
      tilesAssetId,
      options,
    );
    spyOn(IonResource, "_createEndpointResource").and.returnValue(
      resourceEndpoint,
    );
    spyOn(resourceEndpoint, "fetchJson").and.returnValue(
      Promise.resolve(tilesEndpoint),
    );

    return IonResource.fromAssetId(tilesAssetId, options).then(
      function (resource) {
        expect(IonResource._createEndpointResource).toHaveBeenCalledWith(
          tilesAssetId,
          options,
        );
        expect(resourceEndpoint.fetchJson).toHaveBeenCalled();
        expect(resource._ionEndpointResource).toEqual(resourceEndpoint);
        expect(resource._ionEndpoint).toEqual(tilesEndpoint);
      },
    );
  });

  function testNonImageryExternalResource(externalEndpoint) {
    it(`fromAssetId returns basic Resource for external type "${externalEndpoint.externalType}"`, async function () {
      const resourceEndpoint = IonResource._createEndpointResource(123890213);
      spyOn(IonResource, "_createEndpointResource").and.returnValue(
        resourceEndpoint,
      );
      spyOn(resourceEndpoint, "fetchJson").and.returnValue(
        Promise.resolve(externalEndpoint),
      );

      const resource = await IonResource.fromAssetId(123890213);
      expect(resource.url).toEqual(externalEndpoint.options.url);
      expect(resource.headers.Authorization).toBeUndefined();
      expect(resource.retryCallback).toBeUndefined();
    });
  }

  testNonImageryExternalResource({
    type: "3DTILES",
    externalType: "3DTILES",
    options: { url: "http://test.invalid/tileset.json" },
    attributions: [],
  });

  testNonImageryExternalResource({
    type: "TERRAIN",
    externalType: "STK_TERRAIN_SERVER",
    options: { url: "http://test.invalid/world" },
    attributions: [],
  });

  it("fromAssetId rejects for external imagery", async function () {
    const externalEndpoint = {
      type: "IMAGERY",
      externalType: "URL_TEMPLATE",
      url: "http://test.invalid/world",
      attributions: [],
    };

    const resourceEndpoint = IonResource._createEndpointResource(123890213);
    spyOn(IonResource, "_createEndpointResource").and.returnValue(
      resourceEndpoint,
    );
    spyOn(resourceEndpoint, "fetchJson").and.returnValue(
      Promise.resolve(externalEndpoint),
    );

    await expectAsync(IonResource.fromAssetId(123890213)).toBeRejectedWithError(
      RuntimeError,
    );
  });

  it("createEndpointResource creates expected values with default parameters", function () {
    const assetId = 2348234;
    const resource = IonResource._createEndpointResource(assetId);
    expect(resource.url).toBe(
      `${Ion.defaultServer.url}v1/assets/${assetId}/endpoint?access_token=${Ion.defaultAccessToken}`,
    );
  });

  it("createEndpointResource creates expected values with overridden options", function () {
    const serverUrl = "https://api.cesium.test/";
    const accessToken = "not_a_token";

    const assetId = 2348234;
    const resource = IonResource._createEndpointResource(assetId, {
      server: serverUrl,
      accessToken: accessToken,
    });
    expect(resource.url).toBe(
      `${serverUrl}v1/assets/${assetId}/endpoint?access_token=${accessToken}`,
    );
  });

  it("createEndpointResource creates expected values with overridden defaults", function () {
    const defaultServer = Ion.defaultServer;
    const defaultAccessToken = Ion.defaultAccessToken;

    Ion.defaultServer = new Resource({ url: "https://api.cesium.test/" });
    Ion.defaultAccessToken = "not_a_token";

    const assetId = 2348234;
    const resource = IonResource._createEndpointResource(assetId);
    expect(resource.url).toBe(
      `${Ion.defaultServer.url}v1/assets/${assetId}/endpoint?access_token=${Ion.defaultAccessToken}`,
    );

    Ion.defaultServer = defaultServer;
    Ion.defaultAccessToken = defaultAccessToken;
  });

  it("Calls base _makeRequest with expected options when resource no Authorization header is defined", function () {
    const originalOptions = {};
    const expectedOptions = {
      headers: jasmine.objectContaining({
        Authorization: `Bearer ${endpoint.accessToken}`,
      }),
    };

    const _makeRequest = spyOn(Resource.prototype, "_makeRequest");
    const endpointResource = IonResource._createEndpointResource(assetId);
    const resource = new IonResource(endpoint, endpointResource);
    resource._makeRequest(originalOptions);
    expect(_makeRequest).toHaveBeenCalledWith(expectedOptions);
  });

  it("Calls base _makeRequest with expected options when resource Authorization header is already defined", function () {
    const originalOptions = {};
    const expectedOptions = {
      headers: jasmine.objectContaining({
        Authorization: `Bearer ${endpoint.accessToken}`,
      }),
    };

    const _makeRequest = spyOn(Resource.prototype, "_makeRequest");
    const endpointResource = IonResource._createEndpointResource(assetId);
    const resource = new IonResource(endpoint, endpointResource);
    resource.headers.Authorization = "Not valid";
    resource._makeRequest(originalOptions);
    expect(_makeRequest).toHaveBeenCalledWith(expectedOptions);
  });

  it("Calls base _makeRequest including X-Cesium-* headers", function () {
    const originalOptions = {};
    const expectedOptions = {
      headers: jasmine.objectContaining({
        "X-Cesium-Client": "CesiumJS",
        "X-Cesium-Client-Version": jasmine.stringContaining("1."),
      }),
    };

    const _makeRequest = spyOn(Resource.prototype, "_makeRequest");
    const endpointResource = IonResource._createEndpointResource(assetId);
    const resource = new IonResource(endpoint, endpointResource);
    resource._makeRequest(originalOptions);
    expect(_makeRequest).toHaveBeenCalledWith(expectedOptions);
  });

  it("Calls base _makeRequest with no changes for external assets", function () {
    const externalEndpoint = {
      type: "3DTILES",
      externalType: "3DTILES",
      options: { url: "http://test.invalid/tileset.json" },
      attributions: [],
    };
    const options = {};

    const _makeRequest = spyOn(Resource.prototype, "_makeRequest");
    const endpointResource = IonResource._createEndpointResource(assetId);
    const resource = new IonResource(externalEndpoint, endpointResource);
    resource._makeRequest(options);
    expect(_makeRequest.calls.argsFor(0)[0]).toBe(options);
  });

  it("Calls base _makeRequest with no changes for ion assets with external urls", function () {
    const originalOptions = {};
    const expectedOptions = {};

    const _makeRequest = spyOn(Resource.prototype, "_makeRequest");
    const endpointResource = IonResource._createEndpointResource(assetId);
    const resource = new IonResource(endpoint, endpointResource);
    resource.url = "http://test.invalid";
    resource._makeRequest(originalOptions);
    expect(_makeRequest).toHaveBeenCalledWith(expectedOptions);
  });

  it("Calls base fetchImage with preferBlob for ion assets", function () {
    const fetchImage = spyOn(Resource.prototype, "fetchImage");
    const endpointResource = IonResource._createEndpointResource(assetId);
    const resource = new IonResource(endpoint, endpointResource);
    resource.fetchImage();
    expect(fetchImage).toHaveBeenCalledWith({
      preferBlob: true,
    });
  });

  it("Calls base fetchImage with no changes for external assets", function () {
    const externalEndpoint = {
      type: "3DTILES",
      externalType: "3DTILES",
      options: { url: "http://test.invalid/tileset.json" },
      attributions: [],
    };

    const fetchImage = spyOn(Resource.prototype, "fetchImage");
    const endpointResource = IonResource._createEndpointResource(assetId);
    const resource = new IonResource(externalEndpoint, endpointResource);
    resource.fetchImage({
      preferBlob: false,
    });
    expect(fetchImage).toHaveBeenCalledWith({
      preferBlob: false,
    });
  });

  describe("retryCallback", function () {
    let endpointResource;
    let originalResource;
    let retryCallback;

    beforeEach(function () {
      endpointResource = new Resource({
        url: "https://api.test.invalid",
        access_token: "not_the_token",
      });
      originalResource = new IonResource(endpoint, endpointResource);
      retryCallback = originalResource.retryCallback;
    });

    it("returns false when error is undefined", function () {
      return retryCallback(originalResource, undefined).then(function (result) {
        expect(result).toBe(false);
      });
    });

    it("returns false when error is non-401", function () {
      const error = new RequestErrorEvent(404);
      return retryCallback(originalResource, error).then(function (result) {
        expect(result).toBe(false);
      });
    });

    it("returns false when error is event with non-Image target", function () {
      const event = { target: {} };
      return retryCallback(originalResource, event).then(function (result) {
        expect(result).toBe(false);
      });
    });

    function testCallback(eventName, resourceCallback, eventCallback) {
      it(`works with ${eventName}`, async function () {
        const resource = resourceCallback();
        const newEndpoint = {
          type: "3DTILES",
          url: `https://assets.cesium.com/${assetId}`,
          accessToken: "not_not_really_a_refresh_token",
        };

        spyOn(endpointResource, "fetchJson").and.returnValue(
          Promise.resolve(newEndpoint),
        );

        const promise = retryCallback(resource, eventCallback());

        // A concurrent second retry should re-use the same pending promise
        const promise2 = retryCallback(resource, eventCallback());
        expect(promise._pendingPromise).toBe(promise2._pendingPromise);

        const result = await promise;
        expect(result).toBe(true);
        expect(resource._ionEndpoint).toBe(newEndpoint);

        // Updates root endpoint
        expect(originalResource._ionEndpoint).toBe(resource._ionEndpoint);
        expect(originalResource.headers.Authorization).toEqual(
          resource.headers.Authorization,
        );

        expect(endpointResource.fetchJson).toHaveBeenCalled();
        await expectAsync(promise2).not.toBePending();
      });

      it(`works with refresh callback and ${eventName}`, async function () {
        const resource = resourceCallback();
        const newEndpoint = {
          type: "3DTILES",
          url: `https://assets.cesium.com/${assetId}`,
          accessToken: "not_not_really_a_refresh_token",
        };

        const refreshCallbackSpy = jasmine.createSpy("refreshCallback");
        resource.refreshCallback = (ionRoot, endpoint) => {
          refreshCallbackSpy();
          expect(ionRoot).toBe(originalResource);
          expect(endpoint).toEqual(newEndpoint);
        };

        spyOn(endpointResource, "fetchJson").and.returnValue(
          Promise.resolve(newEndpoint),
        );

        const promise = retryCallback(resource, eventCallback());

        const result = await promise;
        expect(result).toBe(true);
        expect(resource._ionEndpoint).toBe(newEndpoint);

        expect(endpointResource.fetchJson).toHaveBeenCalled();
        expect(refreshCallbackSpy).toHaveBeenCalled();
      });
    }

    testCallback(
      "401 response",
      () => originalResource,
      () => new RequestErrorEvent(401),
    );

    testCallback(
      "Image target event",
      () => originalResource,
      () => ({
        target: new Image(),
      }),
    );

    testCallback(
      "derrived resource",
      () => originalResource.getDerivedResource("1"),
      () => new RequestErrorEvent(401),
    );
  });
});
