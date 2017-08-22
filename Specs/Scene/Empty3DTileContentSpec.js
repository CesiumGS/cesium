defineSuite([
        'Scene/Empty3DTileContent'
    ], function(
        Empty3DTileContent) {
    'use strict';

    it('destroys', function() {
        var content = new Empty3DTileContent();
        expect(content.isDestroyed()).toEqual(false);
        content.destroy();
        expect(content.isDestroyed()).toEqual(true);
    });

    it('gets properties', function() {
        var mockTileset = {};
        var mockTile = {};
        var content = new Empty3DTileContent(mockTileset, mockTile);
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
});
