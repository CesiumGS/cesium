/*global defineSuite*/
defineSuite([
         'Scene/WebMercatorTilingScheme',
         'Core/Cartesian2',
         'Core/Ellipsoid',
         'Core/Extent',
         'Core/Math',
         'Core/Cartographic',
         'Core/WebMercatorProjection',
         'Scene/Tile',
         'Scene/TilingScheme'
     ], function(
         WebMercatorTilingScheme,
         Cartesian2,
         Ellipsoid,
         Extent,
         CesiumMath,
         Cartographic,
         WebMercatorProjection,
         Tile,
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

    it('default constructing uses WGS84 ellipsoid', function() {
        var tilingScheme = new WebMercatorTilingScheme();
        expect(tilingScheme.ellipsoid).toEqual(Ellipsoid.WGS84);
    });

    it('uses specified ellipsoid', function() {
        var tilingScheme = new WebMercatorTilingScheme({
            ellipsoid : Ellipsoid.UNIT_SPHERE
        });
        expect(tilingScheme.ellipsoid).toEqual(Ellipsoid.UNIT_SPHERE);
    });

    describe('Conversions from tile indices to cartographic extents', function() {
        it('tileXYToExtent returns full extent for single root tile.', function() {
            var extent = tilingScheme.tileXYToExtent(0, 0, 0);
            var tilingSchemeExtent = tilingScheme.extent;
            expect(extent.west).toEqualEpsilon(tilingSchemeExtent.west, CesiumMath.EPSILON10);
            expect(extent.south).toEqualEpsilon(tilingSchemeExtent.south, CesiumMath.EPSILON10);
            expect(extent.east).toEqualEpsilon(tilingSchemeExtent.east, CesiumMath.EPSILON10);
            expect(extent.north).toEqualEpsilon(tilingSchemeExtent.north, CesiumMath.EPSILON10);
        });

        it('tileXYToExtent uses result parameter if provided', function() {
            var tilingSchemeExtent = tilingScheme.extent;
            var result = new Extent(0.0, 0.0, 0.0);
            var extent = tilingScheme.tileXYToExtent(0, 0, 0, result);
            expect(result).toEqual(extent);
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
            var tilingSchemeExtent = tilingScheme.extent;

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
            var tilingSchemeExtent = tilingScheme.extent;

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

    it('uses a WebMercatorProjection', function() {
        var tilingScheme = new WebMercatorTilingScheme();
        expect(tilingScheme.projection).toBeInstanceOf(WebMercatorProjection);
    });

    describe('extentToNativeExtent', function() {
        it('converts radians to web mercator meters', function() {
            var tilingScheme = new WebMercatorTilingScheme();
            var extentInRadians = new Extent(0.1, 0.2, 0.3, 0.4);
            var nativeExtent = tilingScheme.extentToNativeExtent(extentInRadians);

            var projection = new WebMercatorProjection();
            var expectedSouthwest = projection.project(extentInRadians.getSouthwest());
            var expectedNortheast = projection.project(extentInRadians.getNortheast());

            expect(nativeExtent.west).toEqualEpsilon(expectedSouthwest.x, CesiumMath.EPSILON13);
            expect(nativeExtent.south).toEqualEpsilon(expectedSouthwest.y, CesiumMath.EPSILON13);
            expect(nativeExtent.east).toEqualEpsilon(expectedNortheast.x, CesiumMath.EPSILON13);
            expect(nativeExtent.north).toEqualEpsilon(expectedNortheast.y, CesiumMath.EPSILON13);
        });

        it('uses result parameter if provided', function() {
            var tilingScheme = new WebMercatorTilingScheme();
            var extentInRadians = new Extent(0.1, 0.2, 0.3, 0.4);

            var projection = new WebMercatorProjection();
            var expectedSouthwest = projection.project(extentInRadians.getSouthwest());
            var expectedNortheast = projection.project(extentInRadians.getNortheast());

            var resultExtent = new Extent(0.0, 0.0, 0.0, 0.0);
            var outputExtent = tilingScheme.extentToNativeExtent(extentInRadians, resultExtent);
            expect(outputExtent).toEqual(resultExtent);

            expect(resultExtent.west).toEqualEpsilon(expectedSouthwest.x, CesiumMath.EPSILON13);
            expect(resultExtent.south).toEqualEpsilon(expectedSouthwest.y, CesiumMath.EPSILON13);
            expect(resultExtent.east).toEqualEpsilon(expectedNortheast.x, CesiumMath.EPSILON13);
            expect(resultExtent.north).toEqualEpsilon(expectedNortheast.y, CesiumMath.EPSILON13);
        });
    });

    describe('positionToTileXY', function() {
        it('returns undefined when outside extent', function() {
            var projection = new WebMercatorProjection();
            var extentInRadians = new Extent(0.1, 0.2, 0.3, 0.4);
            var tilingScheme = new WebMercatorTilingScheme({
                extentSouthwestInMeters : projection.project(extentInRadians.getSouthwest()),
                extentNortheastInMeters : projection.project(extentInRadians.getNortheast())
            });

            var tooFarWest = new Cartographic(0.05, 0.3);
            expect(tilingScheme.positionToTileXY(tooFarWest, 0)).toBeUndefined();
            var tooFarSouth = new Cartographic(0.2, 0.1);
            expect(tilingScheme.positionToTileXY(tooFarSouth, 0)).toBeUndefined();
            var tooFarEast = new Cartographic(0.4, 0.3);
            expect(tilingScheme.positionToTileXY(tooFarEast, 0)).toBeUndefined();
            var tooFarNorth = new Cartographic(0.2, 0.5);
            expect(tilingScheme.positionToTileXY(tooFarNorth, 0)).toBeUndefined();
        });

        it('returns correct tile for position in center of tile', function() {
            var tilingScheme = new WebMercatorTilingScheme();

            var centerOfSouthwesternChild = new Cartographic(-Math.PI / 2.0, -Math.PI / 4.0);
            expect(tilingScheme.positionToTileXY(centerOfSouthwesternChild, 1)).toEqual(new Cartesian2(0, 1));

            var centerOfNortheasternChild = new Cartographic(Math.PI / 2.0, Math.PI / 4.0);
            expect(tilingScheme.positionToTileXY(centerOfNortheasternChild, 1)).toEqual(new Cartesian2(1, 0));
        });

        it('returns Southeast tile when on the boundary between tiles', function() {
            var tilingScheme = new WebMercatorTilingScheme();

            var centerOfMap = new Cartographic(0.0, 0.0);
            expect(tilingScheme.positionToTileXY(centerOfMap, 1)).toEqual(new Cartesian2(1, 1));
        });

        it('does not return tile outside valid range', function() {
            var tilingScheme = new WebMercatorTilingScheme();

            var southeastCorner = tilingScheme.extent.getSoutheast();
            expect(tilingScheme.positionToTileXY(southeastCorner, 1)).toEqual(new Cartesian2(1, 1));
        });

        it('uses result parameter if supplied', function() {
            var tilingScheme = new WebMercatorTilingScheme();

            var centerOfNortheasternChild = new Cartographic(Math.PI / 2.0, Math.PI / 4.0);
            var resultParameter = new Cartesian2(0, 0);
            var returnedResult = tilingScheme.positionToTileXY(centerOfNortheasternChild, 1, resultParameter);
            expect(resultParameter).toEqual(returnedResult);
            expect(resultParameter).toEqual(new Cartesian2(1, 0));
        });
    });

    describe('createLevelZeroTiles', function() {
        function expectArrayToContainTiles(tilesArray, tilingScheme) {
            for (var i = 0; i < tilesArray; ++i) {
                var tile = tilesArray[i];
                expect(tile).toBeInstanceOf(Tile);
                expect(tile.tilingScheme).toEqual(tilingScheme);
            }
        }

        it('creates a single root tile', function() {
            tilingScheme = new WebMercatorTilingScheme({
                numberOfLevelZeroTilesX : 1,
                numberOfLevelZeroTilesY : 1
            });

            var tiles = tilingScheme.createLevelZeroTiles();
            expect(tiles.length).toEqual(1);
            expectArrayToContainTiles(tiles, tilingScheme);
        });

        it('creates four root tiles', function() {
            tilingScheme = new WebMercatorTilingScheme({
                numberOfLevelZeroTilesX : 2,
                numberOfLevelZeroTilesY : 2
            });

            var tiles = tilingScheme.createLevelZeroTiles();
            expect(tiles.length).toEqual(4);
            expectArrayToContainTiles(tiles, tilingScheme);
        });

        it('creates two root tiles', function() {
            tilingScheme = new WebMercatorTilingScheme({
                numberOfLevelZeroTilesX : 2,
                numberOfLevelZeroTilesY : 1
            });

            var tiles = tilingScheme.createLevelZeroTiles();
            expect(tiles.length).toEqual(2);
            expectArrayToContainTiles(tiles, tilingScheme);
        });
    });
});