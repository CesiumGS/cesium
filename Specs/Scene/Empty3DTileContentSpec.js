import { Empty3DTileContent } from "../../Source/Cesium.js";

describe("Scene/Empty3DTileContent", function () {
  it("destroys", function () {
    const content = new Empty3DTileContent();
    expect(content.isDestroyed()).toEqual(false);
    content.destroy();
    expect(content.isDestroyed()).toEqual(true);
  });

  it("gets properties", function () {
    const mockTileset = {};
    const mockTile = {};
    const content = new Empty3DTileContent(mockTileset, mockTile);
    expect(content.featuresLength).toBe(0);
    expect(content.pointsLength).toBe(0);
    expect(content.trianglesLength).toBe(0);
    expect(content.geometryByteLength).toBe(0);
    expect(content.texturesByteLength).toBe(0);
    expect(content.batchTableByteLength).toBe(0);
    expect(content.innerContents).toBeUndefined();
    expect(content.readyPromise).toBeUndefined();
    expect(content.tileset).toBe(mockTileset);
    expect(content.tile).toBe(mockTile);
    expect(content.url).toBeUndefined();
    expect(content.batchTable).toBeUndefined();
  });

  describe("3DTILES_metadata", function () {
    it("contentMetadata returns undefined", function () {
      const mockTileset = {};
      const mockTile = {};
      const content = new Empty3DTileContent(mockTileset, mockTile);
      expect(content.metadata).not.toBeDefined();
    });

    it("groupMetadata returns undefined", function () {
      const mockTileset = {};
      const mockTile = {};
      const content = new Empty3DTileContent(mockTileset, mockTile);
      expect(content.groupMetadata).not.toBeDefined();
    });

    it("assigning groupMetadata throws", function () {
      expect(function () {
        const mockTileset = {};
        const mockTile = {};
        const content = new Empty3DTileContent(mockTileset, mockTile);
        content.groupMetadata = {};
      }).toThrowDeveloperError();
    });
  });
});
