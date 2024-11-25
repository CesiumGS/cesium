import {
  ITwinPlatform,
  RuntimeError,
  Cesium3DTileset,
  ITwinData,
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
});
