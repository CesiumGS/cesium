/*global defineSuite*/
defineSuite([
         'Scene/TilingScheme',
         'Scene/GeographicTilingScheme'
     ], function(
         TilingScheme,
         GeographicTilingScheme) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    describe('createRectangleOfLevelZeroTiles', function() {
        var tilingScheme1x1;
        var tilingScheme2x2;
        var tilingScheme2x1;
        var tilingScheme1x2;

        beforeEach(function() {
            tilingScheme1x1 = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 1,
                numberOfLevelZeroTilesY : 1
            });
            tilingScheme2x2 = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 2,
                numberOfLevelZeroTilesY : 2
            });
            tilingScheme2x1 = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 2,
                numberOfLevelZeroTilesY : 1
            });
            tilingScheme1x2 = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 1,
                numberOfLevelZeroTilesY : 2
            });
        });

        it('requires tilingScheme', function() {
            expect(function() {
                return TilingScheme.createRectangleOfLevelZeroTiles(undefined, 1, 1);
            }).toThrow();
        });

        it('requires numberOfLevelZeroTilesX', function() {
            expect(function() {
                return TilingScheme.createRectangleOfLevelZeroTiles(tilingScheme1x1, undefined, 1);
            }).toThrow();
        });

        it('requires numberOfLevelZeroTilesY', function() {
            expect(function() {
                return TilingScheme.createRectangleOfLevelZeroTiles(tilingScheme1x1, 1, undefined);
            }).toThrow();
        });

        it('creates expected number of tiles', function() {
            var tiles = TilingScheme.createRectangleOfLevelZeroTiles(tilingScheme1x1, 1, 1);
            expect(tiles.length).toBe(1);

            tiles = TilingScheme.createRectangleOfLevelZeroTiles(tilingScheme2x2, 2, 2);
            expect(tiles.length).toBe(4);

            tiles = TilingScheme.createRectangleOfLevelZeroTiles(tilingScheme2x1, 2, 1);
            expect(tiles.length).toBe(2);

            tiles = TilingScheme.createRectangleOfLevelZeroTiles(tilingScheme1x2, 1, 2);
            expect(tiles.length).toBe(2);
        });

        it('created tiles are associated with specified tiling scheme', function() {
            var tiles = TilingScheme.createRectangleOfLevelZeroTiles(tilingScheme2x2, 2, 2);
            for (var i = 0; i < tiles.length; ++i) {
                expect(tiles[i].tilingScheme).toBe(tilingScheme2x2);
            }
        });

        it('created tiles are ordered from the northwest and proceeding east and then south', function() {
            var tiles = TilingScheme.createRectangleOfLevelZeroTiles(tilingScheme2x2, 2, 2);
            var northwest = tiles[0];
            var northeast = tiles[1];
            var southwest = tiles[2];
            var southeast = tiles[3];

            expect(northeast.extent.west).toBeGreaterThan(northwest.extent.west);
            expect(southeast.extent.west).toBeGreaterThan(southwest.extent.west);
            expect(northeast.extent.south).toBeGreaterThan(southeast.extent.south);
            expect(northwest.extent.south).toBeGreaterThan(southwest.extent.south);
        });
    });
});