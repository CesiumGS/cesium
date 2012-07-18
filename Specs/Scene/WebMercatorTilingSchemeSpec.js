/*global defineSuite*/
defineSuite([
         'Scene/WebMercatorTilingScheme',
         'Core/Extent',
         'Core/Math',
         'Core/Cartographic'
     ], function(
         WebMercatorTilingScheme,
         Extent,
         CesiumMath,
         Cartographic) {
    "use strict";
    /*global document,describe,it,expect,beforeEach*/

    var tilingScheme;
    beforeEach(function() {
        tilingScheme = new WebMercatorTilingScheme();
    });

    describe('Conversions between Cartographic and Web Mercator coordinates', function() {
        it('webMercatorToCartographic is correct at corners', function() {
            var southwest = tilingScheme.webMercatorToCartographic(-20037508.342787, -20037508.342787);
            expect(southwest.longitude).toEqualEpsilon(-Math.PI, CesiumMath.EPSILON12);
            expect(southwest.latitude).toEqualEpsilon(CesiumMath.toRadians(-85.05112878), CesiumMath.EPSILON11);

            var southeast = tilingScheme.webMercatorToCartographic(20037508.342787, -20037508.342787);
            expect(southeast.longitude).toEqualEpsilon(Math.PI, CesiumMath.EPSILON12);
            expect(southeast.latitude).toEqualEpsilon(CesiumMath.toRadians(-85.05112878), CesiumMath.EPSILON11);

            var northeast = tilingScheme.webMercatorToCartographic(20037508.342787, 20037508.342787);
            expect(northeast.longitude).toEqualEpsilon(Math.PI, CesiumMath.EPSILON12);
            expect(northeast.latitude).toEqualEpsilon(CesiumMath.toRadians(85.05112878), CesiumMath.EPSILON11);

            var northwest = tilingScheme.webMercatorToCartographic(-20037508.342787, 20037508.342787);
            expect(northwest.longitude).toEqualEpsilon(-Math.PI, CesiumMath.EPSILON12);
            expect(northwest.latitude).toEqualEpsilon(CesiumMath.toRadians(85.05112878), CesiumMath.EPSILON11);
        });

        it('cartographicToWebMercator is correct at corners.', function() {
            var maxLatitude = CesiumMath.toRadians(85.05112878);

            var southwest = tilingScheme.cartographicToWebMercator(-Math.PI, -maxLatitude);
            expect(southwest.x).toEqualEpsilon(-20037508.342787, CesiumMath.EPSILON3);
            expect(southwest.y).toEqualEpsilon(-20037508.342787, CesiumMath.EPSILON3);

            var southeast = tilingScheme.cartographicToWebMercator(Math.PI, -maxLatitude);
            expect(southeast.x).toEqualEpsilon(20037508.342787, CesiumMath.EPSILON3);
            expect(southeast.y).toEqualEpsilon(-20037508.342787, CesiumMath.EPSILON3);

            var northeast = tilingScheme.cartographicToWebMercator(Math.PI, maxLatitude);
            expect(northeast.x).toEqualEpsilon(20037508.342787, CesiumMath.EPSILON3);
            expect(northeast.y).toEqualEpsilon(20037508.342787, CesiumMath.EPSILON3);

            var northwest = tilingScheme.cartographicToWebMercator(-Math.PI, maxLatitude);
            expect(northwest.x).toEqualEpsilon(-20037508.342787, CesiumMath.EPSILON3);
            expect(northwest.y).toEqualEpsilon(20037508.342787, CesiumMath.EPSILON3);
        });

        it('cartographicToWebMercator y goes to infinity at poles.', function() {
            var southPole = tilingScheme.cartographicToWebMercator(0.0, -CesiumMath.PI_OVER_TWO);
            expect(southPole.y).toEqual(-1 / 0);

            // Well, at the north pole it doesn't actually return infinity because
            // Math.tan(Math.PI/2) evaluates to 16331778728383844 instead of positive
            // infinity as it should mathematically.  But it returns a big number.
            var northPole = tilingScheme.cartographicToWebMercator(0.0, CesiumMath.PI_OVER_TWO);
            expect(northPole.y).toBeGreaterThan(200000000.0);
        });
    });

    describe('Conversions from tile indices to cartographic extents', function() {
        it('tileXYToExtent returns full extent for single root tile.', function() {
            var extent = tilingScheme.tileXYToExtent(0, 0, 0);
            expect(extent.west).toEqualEpsilon(tilingScheme.extent.west, CesiumMath.EPSILON10);
            expect(extent.south).toEqualEpsilon(tilingScheme.extent.south, CesiumMath.EPSILON10);
            expect(extent.east).toEqualEpsilon(tilingScheme.extent.east, CesiumMath.EPSILON10);
            expect(extent.north).toEqualEpsilon(tilingScheme.extent.north, CesiumMath.EPSILON10);
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

            coordinates = tilingScheme.positionToTileXY(tilingScheme.extent.getSouthwest(), 0);
            expect(coordinates.x).toEqual(0);
            expect(coordinates.y).toEqual(0);

            coordinates = tilingScheme.positionToTileXY(tilingScheme.extent.getNorthwest(), 0);
            expect(coordinates.x).toEqual(0);
            expect(coordinates.y).toEqual(0);

            coordinates = tilingScheme.positionToTileXY(tilingScheme.extent.getNortheast(), 0);
            expect(coordinates.x).toEqual(0);
            expect(coordinates.y).toEqual(0);

            coordinates = tilingScheme.positionToTileXY(tilingScheme.extent.getSoutheast(), 0);
            expect(coordinates.x).toEqual(0);
            expect(coordinates.y).toEqual(0);
        });

        it('calculates correct tile indices for 4 corners at level 1', function() {
            var coordinates;

            coordinates = tilingScheme.positionToTileXY(tilingScheme.extent.getSouthwest(), 1);
            expect(coordinates.x).toEqual(0);
            expect(coordinates.y).toEqual(1);

            coordinates = tilingScheme.positionToTileXY(tilingScheme.extent.getNorthwest(), 1);
            expect(coordinates.x).toEqual(0);
            expect(coordinates.y).toEqual(0);

            coordinates = tilingScheme.positionToTileXY(tilingScheme.extent.getNortheast(), 1);
            expect(coordinates.x).toEqual(1);
            expect(coordinates.y).toEqual(0);

            coordinates = tilingScheme.positionToTileXY(tilingScheme.extent.getSoutheast(), 1);
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