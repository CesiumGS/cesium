/*global defineSuite*/
defineSuite([
         'Scene/GeographicTilingScheme',
         'Core/Extent',
         'Core/Math'
     ], function(
         GeographicTilingScheme,
         Extent,
         CesiumMath) {
    "use strict";
    /*global document,it,expect*/

    describe('Conversions from cartographic extent to tile indices and back', function() {
        it('extentToTileXY identifies extent of single root tile', function() {
            var tilingScheme = new GeographicTilingScheme({
                rootTilesX : 1,
                rootTilesY : 1
            });
            var tile = tilingScheme.extentToTileXY(tilingScheme.extent, 0);
            expect(tile.x).toEqual(0);
            expect(tile.y).toEqual(0);
        });

        it('tileXYToExtent returns full extent for single root tile.', function() {
            var tilingScheme = new GeographicTilingScheme({
                rootTilesX : 1,
                rootTilesY : 1
            });
            var extent = tilingScheme.tileXYToExtent(0, 0, 0);
            expect(extent.west).toEqualEpsilon(tilingScheme.extent.west, CesiumMath.EPSILON10);
            expect(extent.south).toEqualEpsilon(tilingScheme.extent.south, CesiumMath.EPSILON10);
            expect(extent.east).toEqualEpsilon(tilingScheme.extent.east, CesiumMath.EPSILON10);
            expect(extent.north).toEqualEpsilon(tilingScheme.extent.north, CesiumMath.EPSILON10);
        });

        it('tileXYToExtent for single root tile can be passed back into extentToTileXY.', function() {
            var tilingScheme = new GeographicTilingScheme({
                rootTilesX : 1,
                rootTilesY : 1
            });
            var extent = tilingScheme.tileXYToExtent(0, 0, 0);
            var tile = tilingScheme.extentToTileXY(extent, 0);
            expect(tile.x).toEqual(0);
            expect(tile.y).toEqual(0);
        });

        it('tileXYToExtent for (2, 1) root tiles can be passed back into extentToTileXY.', function() {
            var tilingScheme = new GeographicTilingScheme({
                rootTilesX : 2,
                rootTilesY : 1
            });

            var extent00 = tilingScheme.tileXYToExtent(0, 0, 0);
            var tile00 = tilingScheme.extentToTileXY(extent00, 0);
            expect(tile00.x).toEqual(0);
            expect(tile00.y).toEqual(0);

            var extent10 = tilingScheme.tileXYToExtent(1, 0, 0);
            var tile10 = tilingScheme.extentToTileXY(extent10, 0);
            expect(tile10.x).toEqual(1);
            expect(tile10.y).toEqual(0);
        });

        it('tileXYToExtent for (2, 2) root tiles can be passed back into extentToTileXY.', function() {
            var tilingScheme = new GeographicTilingScheme({
                rootTilesX : 2,
                rootTilesY : 2
            });

            for (var x = 0; x < 2; ++x) {
                for (var y = 0; y < 2; ++y) {
                    var extent = tilingScheme.tileXYToExtent(x, y, 0);
                    var tile = tilingScheme.extentToTileXY(extent, 0);
                    expect(tile.x).toEqual(x);
                    expect(tile.y).toEqual(y);
                }
            }
        });

        it('tileXYToExtent for first level tiles can be passed back into extentToTileXY.', function() {
            var tilingScheme = new GeographicTilingScheme({
                rootTilesX : 1,
                rootTilesY : 1
            });

            for (var x = 0; x < 2; ++x) {
                for (var y = 0; y < 2; ++y) {
                    var extent = tilingScheme.tileXYToExtent(x, y, 1);
                    var tile = tilingScheme.extentToTileXY(extent, 1);
                    expect(tile.x).toEqual(x);
                    expect(tile.y).toEqual(y);
                }
            }
        });

        it('tileXYToExtent for first level tiles can be passed back into extentToTileXY when root has (2,2) tiles.', function() {
            var tilingScheme = new GeographicTilingScheme({
                rootTilesX : 2,
                rootTilesY : 2
            });

            for (var x = 0; x < 4; ++x) {
                for (var y = 0; y < 4; ++y) {
                    var extent = tilingScheme.tileXYToExtent(x, y, 1);
                    var tile = tilingScheme.extentToTileXY(extent, 1);
                    expect(tile.x).toEqual(x);
                    expect(tile.y).toEqual(y);
                }
            }
        });
    });
});