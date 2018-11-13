defineSuite([
        'Core/ArbitraryProjectionTilingScheme',
        'Core/Cartesian2',
        'Core/Cartographic',
        'Core/GeographicProjection',
        'Core/Math',
        'Core/Proj4Projection',
        'Core/Rectangle',
        'Core/TilingScheme'
    ], function(
        ArbitraryProjectionTilingScheme,
        Cartesian2,
        Cartographic,
        GeographicProjection,
        CesiumMath,
        Proj4Projection,
        Rectangle,
        TilingScheme) {
    'use strict';

    var mollweideWellKnownText = '+proj=moll +lon_0=0 +x_0=0 +y_0=0 +a=6371000 +b=6371000 +units=m +no_defs';
    var projection = new Proj4Projection(mollweideWellKnownText);
    var mollweideProjectedRectangle = new Rectangle();
    mollweideProjectedRectangle.west = projection.project(Cartographic.fromDegrees(-180, 0)).x;
    mollweideProjectedRectangle.east = projection.project(Cartographic.fromDegrees(180, 0)).x;
    mollweideProjectedRectangle.north = projection.project(Cartographic.fromDegrees(0, 90)).y;
    mollweideProjectedRectangle.south = projection.project(Cartographic.fromDegrees(0, -90)).y;

    it('conforms to TilingScheme interface.', function() {
        expect(ArbitraryProjectionTilingScheme).toConformToInterface(TilingScheme);
    });

    describe('Conversions from tile indices to cartographic rectangles.', function() {
        it('tileXYToRectangle returns full rectangle for single root tile.', function() {
            var tilingScheme = new ArbitraryProjectionTilingScheme({
                numberOfLevelZeroTilesX : 1,
                numberOfLevelZeroTilesY : 1,
                mapProjection : projection,
                projectedRectangle : mollweideProjectedRectangle
            });
            var tilingSchemeRectangle = tilingScheme.rectangle;
            var rectangle = tilingScheme.tileXYToRectangle(0, 0, 0);
            expect(rectangle.west).toEqualEpsilon(tilingSchemeRectangle.west, CesiumMath.EPSILON10);
            expect(rectangle.south).toEqualEpsilon(tilingSchemeRectangle.south, CesiumMath.EPSILON10);
            expect(rectangle.east).toEqualEpsilon(tilingSchemeRectangle.east, CesiumMath.EPSILON10);
            expect(rectangle.north).toEqualEpsilon(tilingSchemeRectangle.north, CesiumMath.EPSILON10);
        });

        it('tileXYToRectangle uses result parameter if provided', function() {
            var tilingScheme = new ArbitraryProjectionTilingScheme({
                numberOfLevelZeroTilesX : 1,
                numberOfLevelZeroTilesY : 1,
                mapProjection : projection,
                projectedRectangle : mollweideProjectedRectangle
            });
            var tilingSchemeRectangle = tilingScheme.rectangle;
            var result = new Rectangle(0.0, 0.0, 0.0);
            var rectangle = tilingScheme.tileXYToRectangle(0, 0, 0, result);
            expect(result).toEqual(rectangle);
            expect(rectangle.west).toEqualEpsilon(tilingSchemeRectangle.west, CesiumMath.EPSILON10);
            expect(rectangle.south).toEqualEpsilon(tilingSchemeRectangle.south, CesiumMath.EPSILON10);
            expect(rectangle.east).toEqualEpsilon(tilingSchemeRectangle.east, CesiumMath.EPSILON10);
            expect(rectangle.north).toEqualEpsilon(tilingSchemeRectangle.north, CesiumMath.EPSILON10);
        });

        it('tiles are numbered from the northwest corner.', function() {
            var tilingScheme = new ArbitraryProjectionTilingScheme({
                numberOfLevelZeroTilesX : 2,
                numberOfLevelZeroTilesY : 2,
                mapProjection : projection,
                projectedRectangle : mollweideProjectedRectangle
            });
            var northwestCenter = Rectangle.center(tilingScheme.tileXYToRectangle(0, 0, 1));
            var northeastCenter = Rectangle.center(tilingScheme.tileXYToRectangle(1, 0, 1));
            var southeastCenter = Rectangle.center(tilingScheme.tileXYToRectangle(1, 1, 1));
            var southwestCenter = Rectangle.center(tilingScheme.tileXYToRectangle(0, 1, 1));

            expect(northeastCenter.longitude > northwestCenter.longitude).toBe(true);
            expect(southeastCenter.longitude > southwestCenter.longitude).toBe(true);

            expect(northeastCenter.latitude > southeastCenter.latitude).toBe(true);
            expect(northwestCenter.latitude > southwestCenter.latitude).toBe(true);
        });
    });

    describe('rectangleToNativeRectangle', function() {
        it('approximates the native bounds of the cartographic rectangle', function() {
            var tilingScheme = new ArbitraryProjectionTilingScheme({
                mapProjection : projection,
                projectedRectangle : mollweideProjectedRectangle
            });
            var rectangleInRadians = Rectangle.fromDegrees(0, 0, 180, 90);
            var nativeRectangle = tilingScheme.rectangleToNativeRectangle(rectangleInRadians);
            expect(nativeRectangle.west).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
            expect(nativeRectangle.south).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
            expect(nativeRectangle.east).toEqualEpsilon(mollweideProjectedRectangle.east, CesiumMath.EPSILON7);
            expect(nativeRectangle.north).toEqualEpsilon(mollweideProjectedRectangle.north, CesiumMath.EPSILON7);
        });

        it('uses result parameter if provided', function() {
            var tilingScheme = new ArbitraryProjectionTilingScheme({
                mapProjection : projection,
                projectedRectangle : mollweideProjectedRectangle
            });
            var rectangleInRadians = Rectangle.fromDegrees(0, 0, 180, 90);
            var resultRectangle = new Rectangle(0.0, 0.0, 0.0, 0.0);
            var nativeRectangle = tilingScheme.rectangleToNativeRectangle(rectangleInRadians, resultRectangle);
            expect(nativeRectangle).toBe(resultRectangle);
            expect(nativeRectangle.west).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
            expect(nativeRectangle.south).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
            expect(nativeRectangle.east).toEqualEpsilon(mollweideProjectedRectangle.east, CesiumMath.EPSILON7);
            expect(nativeRectangle.north).toEqualEpsilon(mollweideProjectedRectangle.north, CesiumMath.EPSILON7);
        });
    });

    describe('positionToTileXY', function() {
        it('returns undefined when outside rectangle', function() {
            var tilingScheme = new ArbitraryProjectionTilingScheme({
                mapProjection : projection,
                projectedRectangle : new Rectangle(0, 0, mollweideProjectedRectangle.east, mollweideProjectedRectangle.north)
            });

            var southWest = Cartographic.fromDegrees(-170, -80);
            expect(tilingScheme.positionToTileXY(southWest, 0)).toBeUndefined();
        });

        it('returns correct tile for position near center of tile', function() {
            var tilingScheme = new ArbitraryProjectionTilingScheme({
                mapProjection : projection,
                projectedRectangle : mollweideProjectedRectangle
            });
            var southWest = Cartographic.fromDegrees(-90, -45);
            expect(tilingScheme.positionToTileXY(southWest, 1)).toEqual(new Cartesian2(0, 1));
        });

        it('uses result parameter if supplied', function() {
            var tilingScheme = new ArbitraryProjectionTilingScheme({
                mapProjection : projection,
                projectedRectangle : mollweideProjectedRectangle
            });
            var southWest = Cartographic.fromDegrees(-90, -45);
            var result = new Cartesian2();
            var tileCoordinate = tilingScheme.positionToTileXY(southWest, 1, result);
            expect(tileCoordinate).toEqual(new Cartesian2(0, 1));
            expect(result).toBe(tileCoordinate);
        });
    });
});
