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
    /*global document,describe,it,expect*/

    describe('Conversions from tile indices to cartographic extents.', function() {
        it('tileXYToExtent returns full extent for single root tile.', function() {
            var tilingScheme = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 1,
                numberOfLevelZeroTilesY : 1
            });
            var extent = tilingScheme.tileXYToExtent(0, 0, 0);
            expect(extent.west).toEqualEpsilon(tilingScheme.extent.west, CesiumMath.EPSILON10);
            expect(extent.south).toEqualEpsilon(tilingScheme.extent.south, CesiumMath.EPSILON10);
            expect(extent.east).toEqualEpsilon(tilingScheme.extent.east, CesiumMath.EPSILON10);
            expect(extent.north).toEqualEpsilon(tilingScheme.extent.north, CesiumMath.EPSILON10);
        });

        it('tiles are numbered from the northwest corner.', function() {
            var tilingScheme = new GeographicTilingScheme({
                numberOfLevelZeroTilesX: 2,
                numberOfLevelZeroTilesY: 2
            });
            var northwest = tilingScheme.tileXYToExtent(0, 0, 1);
            var northeast = tilingScheme.tileXYToExtent(1, 0, 1);
            var southeast = tilingScheme.tileXYToExtent(1, 1, 1);
            var southwest = tilingScheme.tileXYToExtent(0, 1, 1);

            expect(northeast.north).toEqual(northwest.north);
            expect(northeast.south).toEqual(northwest.south);
            expect(southeast.north).toEqual(southwest.north);
            expect(southeast.south).toEqual(southwest.south);

            expect(northwest.west).toEqual(southwest.west);
            expect(northwest.east).toEqual(southwest.east);
            expect(northeast.west).toEqual(southeast.west);
            expect(northeast.east).toEqual(southeast.east);

            expect(northeast.north).toBeGreaterThan(southeast.north);
            expect(northeast.south).toBeGreaterThan(southeast.south);
            expect(northwest.north).toBeGreaterThan(southwest.north);
            expect(northwest.south).toBeGreaterThan(southwest.south);

            expect(northeast.east).toBeGreaterThan(northwest.east);
            expect(northeast.west).toBeGreaterThan(northwest.west);
            expect(southeast.east).toBeGreaterThan(southwest.east);
            expect(southeast.west).toBeGreaterThan(southwest.west);
        });

        it('adjacent tiles have overlapping coordinates', function() {
            var tilingScheme = new GeographicTilingScheme({
                numberOfLevelZeroTilesX: 2,
                numberOfLevelZeroTilesY: 2
            });
            var northwest = tilingScheme.tileXYToExtent(0, 0, 1);
            var northeast = tilingScheme.tileXYToExtent(1, 0, 1);
            var southeast = tilingScheme.tileXYToExtent(1, 1, 1);
            var southwest = tilingScheme.tileXYToExtent(0, 1, 1);

            expect(northeast.south).toEqualEpsilon(southeast.north, CesiumMath.EPSILON15);
            expect(northwest.south).toEqualEpsilon(southwest.north, CesiumMath.EPSILON15);

            expect(northeast.west).toEqualEpsilon(northwest.east, CesiumMath.EPSILON15);
            expect(southeast.west).toEqualEpsilon(southwest.east, CesiumMath.EPSILON15);
        });
    });
});