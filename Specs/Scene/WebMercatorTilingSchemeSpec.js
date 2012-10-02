/*global defineSuite*/
defineSuite([
         'Scene/WebMercatorTilingScheme',
         'Core/Extent',
         'Core/Math',
         'Core/Cartographic',
         'Scene/TilingScheme'
     ], function(
         WebMercatorTilingScheme,
         Extent,
         CesiumMath,
         Cartographic,
         TilingScheme) {
    "use strict";
    /*global document,describe,it,expect,beforeEach*/

    var tilingScheme;
    beforeEach(function() {
        tilingScheme = new WebMercatorTilingScheme();
    });

    it('conforms to TilingScheme interface.', function() {
       expect(WebMercatorTilingScheme).toConformToInterface(TilingScheme);
    });

    describe('Conversions from tile indices to cartographic extents', function() {
        it('tileXYToExtent returns full extent for single root tile.', function() {
            var extent = tilingScheme.tileXYToExtent(0, 0, 0);
            var tilingSchemeExtent = tilingScheme.getExtent();
            expect(extent.west).toEqualEpsilon(tilingSchemeExtent.west, CesiumMath.EPSILON10);
            expect(extent.south).toEqualEpsilon(tilingSchemeExtent.south, CesiumMath.EPSILON10);
            expect(extent.east).toEqualEpsilon(tilingSchemeExtent.east, CesiumMath.EPSILON10);
            expect(extent.north).toEqualEpsilon(tilingSchemeExtent.north, CesiumMath.EPSILON10);
        });

        it('tiles are numbered from the northwest corner.', function() {
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

    describe('Conversions from cartographic positions to tile indices', function() {
        it('calculates correct tile indices for 4 corners at level 0', function() {
            var coordinates;
            var tilingSchemeExtent = tilingScheme.getExtent();

            coordinates = tilingScheme.positionToTileXY(tilingSchemeExtent.getSouthwest(), 0);
            expect(coordinates.x).toEqual(0);
            expect(coordinates.y).toEqual(0);

            coordinates = tilingScheme.positionToTileXY(tilingSchemeExtent.getNorthwest(), 0);
            expect(coordinates.x).toEqual(0);
            expect(coordinates.y).toEqual(0);

            coordinates = tilingScheme.positionToTileXY(tilingSchemeExtent.getNortheast(), 0);
            expect(coordinates.x).toEqual(0);
            expect(coordinates.y).toEqual(0);

            coordinates = tilingScheme.positionToTileXY(tilingSchemeExtent.getSoutheast(), 0);
            expect(coordinates.x).toEqual(0);
            expect(coordinates.y).toEqual(0);
        });

        it('calculates correct tile indices for 4 corners at level 1', function() {
            var coordinates;
            var tilingSchemeExtent = tilingScheme.getExtent();

            coordinates = tilingScheme.positionToTileXY(tilingSchemeExtent.getSouthwest(), 1);
            expect(coordinates.x).toEqual(0);
            expect(coordinates.y).toEqual(1);

            coordinates = tilingScheme.positionToTileXY(tilingSchemeExtent.getNorthwest(), 1);
            expect(coordinates.x).toEqual(0);
            expect(coordinates.y).toEqual(0);

            coordinates = tilingScheme.positionToTileXY(tilingSchemeExtent.getNortheast(), 1);
            expect(coordinates.x).toEqual(1);
            expect(coordinates.y).toEqual(0);

            coordinates = tilingScheme.positionToTileXY(tilingSchemeExtent.getSoutheast(), 1);
            expect(coordinates.x).toEqual(1);
            expect(coordinates.y).toEqual(1);
        });

        it('calculates correct tile indices for the center at level 1', function() {
            var coordinates;

            coordinates = tilingScheme.positionToTileXY(new Cartographic(0, 0), 1);
            expect(coordinates.x).toEqual(1);
            expect(coordinates.y).toEqual(1);
        });

        it('calculates correct tile indices for the center at level 2', function() {
            var coordinates;

            coordinates = tilingScheme.positionToTileXY(new Cartographic(0, 0), 2);
            expect(coordinates.x).toEqual(2);
            expect(coordinates.y).toEqual(2);
        });

        it('calculates correct tile indices around the center at level 2', function() {
            var coordinates;

            coordinates = tilingScheme.positionToTileXY(new Cartographic(-0.05, -0.05), 2);
            expect(coordinates.x).toEqual(1);
            expect(coordinates.y).toEqual(2);

            coordinates = tilingScheme.positionToTileXY(new Cartographic(-0.05, 0.05), 2);
            expect(coordinates.x).toEqual(1);
            expect(coordinates.y).toEqual(1);

            coordinates = tilingScheme.positionToTileXY(new Cartographic(0.05, 0.05), 2);
            expect(coordinates.x).toEqual(2);
            expect(coordinates.y).toEqual(1);

            coordinates = tilingScheme.positionToTileXY(new Cartographic(0.05, -0.05), 2);
            expect(coordinates.x).toEqual(2);
            expect(coordinates.y).toEqual(2);
        });
    });
});