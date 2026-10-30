import { BoundingSphere, Cartesian3 } from "@cesium/core";
import {
  Cesium3DTileBatchTable,
  Cesium3DTileFeature,
  ElementService,
  IonAssetElementService,
  RequestErrorEvent,
  Resource,
} from "../../index.js";

describe("Scene/IonAssetElementService", function () {
  const assetId = 1234;
  let service;

  function createService() {
    return new IonAssetElementService({
      assetId: assetId,
      resource: new Resource({
        url: `https://example.com/v1/assets/${assetId}/`,
      }),
    });
  }

  function mockFetchJson(response) {
    let fetchedResource;
    spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
      fetchedResource = this;
      return Promise.resolve(response);
    });
    return function () {
      return fetchedResource;
    };
  }

  beforeEach(function () {
    service = createService();
  });

  it("conforms to ElementService interface", function () {
    for (const name of Object.getOwnPropertyNames(ElementService.prototype)) {
      if (name === "constructor") {
        continue;
      }
      expect(typeof IonAssetElementService.prototype[name]).toBe("function");
      expect(IonAssetElementService.prototype[name]).not.toBe(
        ElementService.prototype[name],
      );
    }
    expect(service).toBeInstanceOf(ElementService);
  });

  it("fromAssetId creates resources for versioned and unversioned endpoints", function () {
    const result = IonAssetElementService.fromAssetId(assetId, {
      server: "https://example.com/",
      accessToken: "token",
    });

    expect(result.assetId).toBe(assetId);
    expect(result._resource.getUrlComponent(false)).toBe(
      `https://example.com/v1/assets/${assetId}/`,
    );
    expect(result._resource.queryParameters.access_token).toBe("token");
  });

  it("fromAssetId throws when assetId is not a number", function () {
    expect(function () {
      IonAssetElementService.fromAssetId("1234");
    }).toThrowDeveloperError();
  });

  it("getElementId returns a decimal string", function () {
    const content = {
      tileset: {
        statistics: {
          texturesByteLength: 0,
        },
      },
    };
    content.batchTable = new Cesium3DTileBatchTable(content, 1, {
      element: [8589934767n],
    });
    const feature = new Cesium3DTileFeature(content, 0);

    expect(IonAssetElementService.getElementId(feature)).toBe("8589934767");
    expect(IonAssetElementService.getElementId(undefined)).toBeUndefined();
    expect(IonAssetElementService.getElementId({})).toBeUndefined();

    content.batchTable.destroy();
  });

  it("getBoundingSphere converts an element location", function () {
    const element = {
      location: {
        center: {
          longitude: -75.0,
          latitude: 40.0,
          height: 100.0,
        },
        radius: 25.0,
      },
    };

    const result = IonAssetElementService.getBoundingSphere(element);
    expect(result).toBeInstanceOf(BoundingSphere);
    expect(result.center).toEqual(Cartesian3.fromDegrees(-75.0, 40.0, 100.0));
    expect(result.radius).toBe(25.0);
  });

  it("getBoundingSphere returns undefined for an invalid location", function () {
    expect(IonAssetElementService.getBoundingSphere({})).toBeUndefined();
    expect(
      IonAssetElementService.getBoundingSphere({
        location: {
          center: { longitude: 0.0, latitude: 0.0 },
          radius: -1.0,
        },
      }),
    ).toBeUndefined();
  });

  it("listElements sends query options and adapts elements", async function () {
    const getFetchedResource = mockFetchJson({
      items: [
        {
          id: 8589934767n,
          label: "Wall",
          properties: {
            Height: {
              value: 3.5,
              displayValue: "3.5 m",
              units: "m",
              ignored: true,
            },
          },
          location: {
            center: { longitude: 1.0, latitude: 2.0, height: 3.0 },
            radius: 4.0,
          },
        },
      ],
      total: 10,
      continuationToken: "next",
    });

    const result = await service.listElements({
      top: 5,
      continuationToken: "current",
      filter: { Category: "Wall" },
    });

    const resource = getFetchedResource();
    expect(resource.getUrlComponent(false)).toBe(
      `https://example.com/v1/assets/${assetId}/elements`,
    );
    expect(resource.queryParameters).toEqual({
      top: 5,
      continuationToken: "current",
      filter: JSON.stringify({ Category: "Wall" }),
    });
    expect(result).toEqual({
      items: [
        {
          id: "8589934767",
          label: "Wall",
          properties: {
            Height: {
              value: 3.5,
              displayValue: "3.5 m",
              units: "m",
            },
          },
          location: {
            center: { longitude: 1.0, latitude: 2.0, height: 3.0 },
            radius: 4.0,
          },
        },
      ],
      total: 10,
      continuationToken: "next",
    });
  });

  it("listElements validates pagination options", async function () {
    await expectAsync(
      service.listElements({ top: 0 }),
    ).toBeRejectedWithDeveloperError();
    await expectAsync(
      service.listElements({ continuationToken: 1 }),
    ).toBeRejectedWithDeveloperError();
  });

  it("getElement requests and adapts one element", async function () {
    const getFetchedResource = mockFetchJson({ id: 42, label: "Door" });

    const result = await service.getElement("42");

    expect(getFetchedResource().getUrlComponent(false)).toBe(
      `https://example.com/v1/assets/${assetId}/elements/42`,
    );
    expect(result).toEqual({ id: "42", label: "Door" });
  });

  it("aggregate requests and adapts statistics", async function () {
    const getFetchedResource = mockFetchJson({
      aggregations: [
        {
          key: "Height",
          count: 2,
          min: 1,
          max: 3,
          avg: 2,
          sum: 4,
          ignored: true,
        },
      ],
      total: 2,
    });

    const result = await service.aggregate({
      propertyKeys: ["Height"],
      filter: { Category: "Wall" },
    });

    const resource = getFetchedResource();
    expect(resource.getUrlComponent(false)).toBe(
      `https://example.com/v1/assets/${assetId}/elements/aggregate`,
    );
    expect(resource.queryParameters).toEqual({
      aggregations: '["Height"]',
      filter: JSON.stringify({ Category: "Wall" }),
    });
    expect(result).toEqual({
      aggregations: [
        {
          propertyKey: "Height",
          count: 2,
          min: 1,
          max: 3,
          avg: 2,
          sum: 4,
        },
      ],
      total: 2,
    });
  });

  it("aggregate accepts propertyKey in the response", async function () {
    mockFetchJson({
      aggregations: [
        {
          propertyKey: "Height",
          count: 2,
          min: 1,
          max: 3,
          avg: 2,
          sum: 4,
        },
      ],
      total: 2,
    });

    const result = await service.aggregate({
      propertyKeys: ["Height"],
    });

    expect(result).toEqual({
      aggregations: [
        {
          propertyKey: "Height",
          count: 2,
          min: 1,
          max: 3,
          avg: 2,
          sum: 4,
        },
      ],
      total: 2,
    });
  });

  it("aggregate validates propertyKeys", async function () {
    await expectAsync(service.aggregate()).toBeRejectedWithDeveloperError();
    await expectAsync(
      service.aggregate({ propertyKeys: [] }),
    ).toBeRejectedWithDeveloperError();
    await expectAsync(
      service.aggregate({ propertyKeys: [1] }),
    ).toBeRejectedWithDeveloperError();
  });

  it("getElementTreeChildren requests and adapts nodes", async function () {
    const getFetchedResource = mockFetchJson({
      nodes: [
        {
          key: "node-key",
          label: "Model",
          hasChildren: true,
          id: 7,
          kind: "model",
          ignored: true,
        },
      ],
    });

    const result = await service.getElementTreeChildren({
      nodeKey: "parent-key",
    });

    const resource = getFetchedResource();
    expect(resource.getUrlComponent(false)).toBe(
      `https://example.com/v1/assets/${assetId}/tree/children`,
    );
    expect(resource.queryParameters).toEqual({ nodeKey: "parent-key" });
    expect(result).toEqual({
      nodes: [
        {
          key: "node-key",
          label: "Model",
          hasChildren: true,
          id: "7",
          kind: "model",
        },
      ],
    });
  });

  it("getElementTreeParents requests and adapts the path", async function () {
    const getFetchedResource = mockFetchJson({
      path: [
        { kind: "model", id: 7 },
        { kind: "element", id: 8589934767n },
      ],
    });

    const result = await service.getElementTreeParents("8589934767");

    const resource = getFetchedResource();
    expect(resource.getUrlComponent(false)).toBe(
      `https://example.com/v1/assets/${assetId}/tree/parents`,
    );
    expect(resource.queryParameters).toEqual({ elementId: "8589934767" });
    expect(result).toEqual({
      path: [
        { kind: "model", id: "7" },
        { kind: "element", id: "8589934767" },
      ],
    });
  });

  it("propagates request errors", async function () {
    const error = new RequestErrorEvent(404, "Not found");
    spyOn(Resource.prototype, "fetchJson").and.rejectWith(error);

    await expectAsync(service.getElement("missing")).toBeRejectedWith(error);
  });
});
