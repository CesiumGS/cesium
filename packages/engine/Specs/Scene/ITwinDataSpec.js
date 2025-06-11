import {
  ITwinPlatform,
  RuntimeError,
  Cesium3DTileset,
  ITwinData,
  GeoJsonDataSource,
  KmlDataSource,
} from "../../index.js";

function createMockExport(
  id,
  status,
  exportType = ITwinPlatform.ExportType["3DTILES"],
) {
  return {
    id: `${id}`,
    displayName: `export ${id}`,
    status: status,
    lastModified: "2024-11-04T12:00Z",
    request: {
      iModelId: "imodel-id-1",
      changesetId: "changeset-id",
      exportType,
    },
    _links: {
      mesh: {
        // The API returns some important query params for auth that we
        // need to make sure are preserved when the path is modified
        href: `https://example.com/link/to/mesh/${id}?query=param`,
      },
    },
  };
}

describe("ITwinData", () => {
  let previousAccessToken;
  beforeEach(() => {
    previousAccessToken = ITwinPlatform.defaultAccessToken;
    ITwinPlatform.defaultAccessToken = "default-access-token";
  });

  afterEach(() => {
    ITwinPlatform.defaultAccessToken = previousAccessToken;
  });

  describe("createTilesetFromIModelId", () => {
    it("rejects when all exports are invalid", async () => {
      spyOn(ITwinPlatform, "getExports").and.resolveTo({
        exports: [
          createMockExport(1, ITwinPlatform.ExportStatus.Invalid),
          createMockExport(2, ITwinPlatform.ExportStatus.Invalid),
          createMockExport(3, ITwinPlatform.ExportStatus.Invalid),
          createMockExport(4, ITwinPlatform.ExportStatus.Invalid),
          createMockExport(5, ITwinPlatform.ExportStatus.Invalid),
        ],
      });
      await expectAsync(
        ITwinData.createTilesetFromIModelId("imodel-id-1"),
      ).toBeRejectedWithError(RuntimeError, /All exports for this iModel/);
    });

    it("returns undefined when no exports returned", async () => {
      spyOn(ITwinPlatform, "getExports").and.resolveTo({
        exports: [],
      });
      const tileset = await ITwinData.createTilesetFromIModelId("imodel-id-1");
      expect(tileset).toBeUndefined();
    });

    it("returns undefined when no exports are complete", async () => {
      spyOn(ITwinPlatform, "getExports").and.resolveTo({
        exports: [
          createMockExport(1, ITwinPlatform.ExportStatus.InProgress),
          createMockExport(2, ITwinPlatform.ExportStatus.NotStarted),
        ],
      });
      const tileset = await ITwinData.createTilesetFromIModelId("imodel-id-1");
      expect(tileset).toBeUndefined();
    });

    it("returns undefined when no exports are complete", async () => {
      spyOn(ITwinPlatform, "getExports").and.resolveTo({
        exports: [
          createMockExport(1, ITwinPlatform.ExportStatus.InProgress),
          createMockExport(2, ITwinPlatform.ExportStatus.NotStarted),
        ],
      });
      const tileset = await ITwinData.createTilesetFromIModelId("imodel-id-1");
      expect(tileset).toBeUndefined();
    });

    it("creates a tileset for the first complete export", async () => {
      spyOn(ITwinPlatform, "getExports").and.resolveTo({
        exports: [
          createMockExport(1, ITwinPlatform.ExportStatus.Invalid),
          createMockExport(2, ITwinPlatform.ExportStatus.Complete),
        ],
      });
      const tilesetSpy = spyOn(Cesium3DTileset, "fromUrl");
      await ITwinData.createTilesetFromIModelId("imodel-id-1");
      expect(tilesetSpy).toHaveBeenCalledTimes(1);
      // Check that the resource url created is for the second export because
      // the first is invalid
      expect(tilesetSpy.calls.mostRecent().args[0].toString()).toEqual(
        "https://example.com/link/to/mesh/2/tileset.json?query=param",
      );
      expect(tilesetSpy.calls.mostRecent().args[1]).toBeUndefined();
    });

    it("passes tileset options through to the tileset constructor", async () => {
      spyOn(ITwinPlatform, "getExports").and.resolveTo({
        exports: [createMockExport(1, ITwinPlatform.ExportStatus.Complete)],
      });
      const tilesetSpy = spyOn(Cesium3DTileset, "fromUrl");
      const tilesetOptions = { show: false };
      await ITwinData.createTilesetFromIModelId("imodel-id-1", tilesetOptions);
      expect(tilesetSpy).toHaveBeenCalledTimes(1);
      expect(tilesetSpy.calls.mostRecent().args[1]).toEqual(tilesetOptions);
    });
  });

  describe("createTilesetForRealityDataId", () => {
    let getMetadataSpy;
    let getUrlSpy;
    let tilesetSpy;
    beforeEach(() => {
      getMetadataSpy = spyOn(ITwinPlatform, "getRealityDataMetadata");
      getUrlSpy = spyOn(ITwinPlatform, "getRealityDataURL");
      tilesetSpy = spyOn(Cesium3DTileset, "fromUrl");
    });

    it("rejects if the type is not supported", async () => {
      await expectAsync(
        ITwinData.createTilesetForRealityDataId(
          "imodel-id-1",
          "reality-data-id-1",
          "DGN",
          "root/path.json",
        ),
      ).toBeRejectedWithError(RuntimeError, /type is not/);
    });

    it("does not fetch metadata if type and rootDocument are defined", async () => {
      await ITwinData.createTilesetForRealityDataId(
        "itwin-id-1",
        "reality-data-id-1",
        ITwinPlatform.RealityDataType.Cesium3DTiles,
        "root/document/path.json",
      );

      expect(getMetadataSpy).not.toHaveBeenCalled();
      expect(getUrlSpy).toHaveBeenCalledOnceWith(
        "itwin-id-1",
        "reality-data-id-1",
        "root/document/path.json",
      );
    });

    it("fetches metadata if type is undefined", async () => {
      getMetadataSpy.and.resolveTo({
        iModelId: "itwin-id-1",
        id: "reality-data-id-1",
        type: ITwinPlatform.RealityDataType.Cesium3DTiles,
        rootDocument: "root/document/path.json",
      });
      await ITwinData.createTilesetForRealityDataId(
        "itwin-id-1",
        "reality-data-id-1",
        undefined,
        "root/document/path.json",
      );

      expect(getMetadataSpy).toHaveBeenCalledOnceWith(
        "itwin-id-1",
        "reality-data-id-1",
      );
      expect(getUrlSpy).toHaveBeenCalledOnceWith(
        "itwin-id-1",
        "reality-data-id-1",
        "root/document/path.json",
      );
    });

    it("fetches metadata if rootDocument is undefined", async () => {
      getMetadataSpy.and.resolveTo({
        iModelId: "itwin-id-1",
        id: "reality-data-id-1",
        type: ITwinPlatform.RealityDataType.Cesium3DTiles,
        rootDocument: "root/document/path.json",
      });
      await ITwinData.createTilesetForRealityDataId(
        "itwin-id-1",
        "reality-data-id-1",
        ITwinPlatform.RealityDataType.Cesium3DTiles,
        undefined,
      );

      expect(getMetadataSpy).toHaveBeenCalledOnceWith(
        "itwin-id-1",
        "reality-data-id-1",
      );
      expect(getUrlSpy).toHaveBeenCalledOnceWith(
        "itwin-id-1",
        "reality-data-id-1",
        "root/document/path.json",
      );
    });

    it("creates a tileset from the constructed blob url", async () => {
      const tilesetUrl =
        "https://example.com/root/document/path.json?auth=token";
      getUrlSpy.and.resolveTo(tilesetUrl);

      await ITwinData.createTilesetForRealityDataId(
        "itwin-id-1",
        "reality-data-id-1",
        ITwinPlatform.RealityDataType.Cesium3DTiles,
        "root/document/path.json",
      );

      expect(tilesetSpy).toHaveBeenCalledOnceWith(tilesetUrl, {
        maximumScreenSpaceError: 4,
      });
    });
  });

  describe("createDataSourceForRealityDataId", () => {
    let getMetadataSpy;
    let getUrlSpy;
    let geojsonSpy;
    let kmlSpy;
    beforeEach(() => {
      getMetadataSpy = spyOn(ITwinPlatform, "getRealityDataMetadata");
      getUrlSpy = spyOn(ITwinPlatform, "getRealityDataURL");
      geojsonSpy = spyOn(GeoJsonDataSource, "load");
      kmlSpy = spyOn(KmlDataSource, "load");
    });

    it("rejects if the type is not supported", async () => {
      await expectAsync(
        ITwinData.createDataSourceForRealityDataId(
          "imodel-id-1",
          "reality-data-id-1",
          "DGN",
          "root/path.json",
        ),
      ).toBeRejectedWithError(RuntimeError, /type is not/);
    });

    it("does not fetch metadata if type and rootDocument are defined", async () => {
      await ITwinData.createDataSourceForRealityDataId(
        "itwin-id-1",
        "reality-data-id-1",
        ITwinPlatform.RealityDataType.GeoJSON,
        "root/document/path.json",
      );

      expect(getMetadataSpy).not.toHaveBeenCalled();
      expect(getUrlSpy).toHaveBeenCalledOnceWith(
        "itwin-id-1",
        "reality-data-id-1",
        "root/document/path.json",
      );
      expect(geojsonSpy).toHaveBeenCalled();
    });

    it("fetches metadata if type is undefined", async () => {
      getMetadataSpy.and.resolveTo({
        iModelId: "itwin-id-1",
        id: "reality-data-id-1",
        type: ITwinPlatform.RealityDataType.GeoJSON,
        rootDocument: "root/document/path.json",
      });
      await ITwinData.createDataSourceForRealityDataId(
        "itwin-id-1",
        "reality-data-id-1",
        undefined,
        "root/document/path.json",
      );

      expect(getMetadataSpy).toHaveBeenCalledOnceWith(
        "itwin-id-1",
        "reality-data-id-1",
      );
      expect(getUrlSpy).toHaveBeenCalledOnceWith(
        "itwin-id-1",
        "reality-data-id-1",
        "root/document/path.json",
      );
    });

    it("fetches metadata if rootDocument is undefined", async () => {
      getMetadataSpy.and.resolveTo({
        iModelId: "itwin-id-1",
        id: "reality-data-id-1",
        type: ITwinPlatform.RealityDataType.GeoJSON,
        rootDocument: "root/document/path.json",
      });
      await ITwinData.createDataSourceForRealityDataId(
        "itwin-id-1",
        "reality-data-id-1",
        ITwinPlatform.RealityDataType.Cesium3DTiles,
        undefined,
      );

      expect(getMetadataSpy).toHaveBeenCalledOnceWith(
        "itwin-id-1",
        "reality-data-id-1",
      );
      expect(getUrlSpy).toHaveBeenCalledOnceWith(
        "itwin-id-1",
        "reality-data-id-1",
        "root/document/path.json",
      );
    });

    it("creates a GeoJsonDataSource from the constructed blob url if the type is GeoJSON", async () => {
      const tilesetUrl =
        "https://example.com/root/document/path.json?auth=token";
      getUrlSpy.and.resolveTo(tilesetUrl);

      await ITwinData.createDataSourceForRealityDataId(
        "itwin-id-1",
        "reality-data-id-1",
        ITwinPlatform.RealityDataType.GeoJSON,
        "root/document/path.json",
      );

      expect(geojsonSpy).toHaveBeenCalledOnceWith(tilesetUrl);
      expect(kmlSpy).not.toHaveBeenCalled();
    });

    it("creates a KmlDataSource from the constructed blob url if the type is KML", async () => {
      const tilesetUrl =
        "https://example.com/root/document/path.json?auth=token";
      getUrlSpy.and.resolveTo(tilesetUrl);

      await ITwinData.createDataSourceForRealityDataId(
        "itwin-id-1",
        "reality-data-id-1",
        ITwinPlatform.RealityDataType.KML,
        "root/document/path.json",
      );

      expect(kmlSpy).toHaveBeenCalledOnceWith(tilesetUrl);
      expect(geojsonSpy).not.toHaveBeenCalled();
    });
  });

  describe("loadGeospatialFeatures", () => {
    let geojsonSpy;
    beforeEach(() => {
      geojsonSpy = spyOn(GeoJsonDataSource, "load");
    });

    it("rejects with no iTwinId", async () => {
      await expectAsync(
        // @ts-expect-error
        ITwinData.loadGeospatialFeatures(undefined),
      ).toBeRejectedWithDeveloperError(
        "Expected iTwinId to be typeof string, actual typeof was undefined",
      );
    });

    it("rejects with no collectionId", async () => {
      await expectAsync(
        // @ts-expect-error
        ITwinData.loadGeospatialFeatures("itwin-id-1", undefined),
      ).toBeRejectedWithDeveloperError(
        "Expected collectionId to be typeof string, actual typeof was undefined",
      );
    });

    it("rejects with limit < 1", async () => {
      await expectAsync(
        ITwinData.loadGeospatialFeatures("itwin-id-1", "collection-id-1", 0),
      ).toBeRejectedWithDeveloperError(
        "Expected limit to be greater than or equal to 1, actual value was 0",
      );
    });

    it("rejects with limit > 10000", async () => {
      await expectAsync(
        ITwinData.loadGeospatialFeatures(
          "itwin-id-1",
          "collection-id-1",
          20000,
        ),
      ).toBeRejectedWithDeveloperError(
        "Expected limit to be less than or equal to 10000, actual value was 20000",
      );
    });

    it("rejects with no default access token or default share key set", async () => {
      ITwinPlatform.defaultAccessToken = undefined;
      ITwinPlatform.defaultShareKey = undefined;
      await expectAsync(
        ITwinData.loadGeospatialFeatures("itwin-id-1", "collection-id-1"),
      ).toBeRejectedWithDeveloperError(
        /Must set ITwinPlatform.defaultAccessToken or ITwinPlatform.defaultShareKey/,
      );
    });

    it("creates a GeoJsonDataSource from the constructed blob url if the type is GeoJSON", async () => {
      await ITwinData.loadGeospatialFeatures("itwin-id-1", "collection-id-1");

      expect(geojsonSpy).toHaveBeenCalledTimes(1);
      expect(geojsonSpy.calls.mostRecent().args[0].url).toEqual(
        "https://api.bentley.com/geospatial-features/itwins/itwin-id-1/ogc/collections/collection-id-1/items?limit=10000&client=CesiumJS",
      );
    });
  });
});
