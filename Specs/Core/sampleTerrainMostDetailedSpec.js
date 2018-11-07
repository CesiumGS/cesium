defineSuite([
        'Core/sampleTerrainMostDetailed',
        'Core/Cartographic',
        'Core/CesiumTerrainProvider',
        'Core/EllipsoidTerrainProvider',
        'Core/GeographicTilingScheme',
        'Core/HeightmapTerrainData',
        'Core/TileAvailability',
        'ThirdParty/when'
    ], function(
        sampleTerrainMostDetailed,
        Cartographic,
        CesiumTerrainProvider,
        EllipsoidTerrainProvider,
        GeographicTilingScheme,
        HeightmapTerrainData,
        TileAvailability,
        when) {
    'use strict';

    var tilingScheme = new GeographicTilingScheme();

    var initialMaximumLevel = 2;
    var addonLevel = initialMaximumLevel + 1;
    var modifiedAvailability = new TileAvailability(tilingScheme, addonLevel);

    for (var i = 0; i <= initialMaximumLevel; i++) {
        var xMax = tilingScheme.getNumberOfXTilesAtLevel(i);
        var yMax = tilingScheme.getNumberOfYTilesAtLevel(i);
        modifiedAvailability.addAvailableTileRange(i, 0, 0, xMax, yMax);
    }
    var addonLevelXMax = tilingScheme.getNumberOfXTilesAtLevel(addonLevel);
    var addonLevelYMax = tilingScheme.getNumberOfYTilesAtLevel(addonLevel);
    modifiedAvailability.addAvailableTileRange(addonLevel, 0, 0, addonLevelXMax * 0.5, addonLevelYMax);

    var ellipsoidTerrain = new EllipsoidTerrainProvider({
        tileAvailability : modifiedAvailability
    });

    beforeEach(function() {
        spyOn(EllipsoidTerrainProvider, '_getTileGeometry').and.callFake(function(x, y, level) {
            var width = 16;
            var height = 16;
            return when.resolve(new HeightmapTerrainData({
                buffer : new Uint8Array(width * height).fill(level),
                width : width,
                height : height
            }));
        });
    });

    it('queries heights', function() {
        var positions = [
            Cartographic.fromDegrees(-86.925145, 27.988257),
            Cartographic.fromDegrees(-87.0, 28.0)
        ];

        return sampleTerrainMostDetailed(ellipsoidTerrain, positions).then(function(passedPositions) {
            expect(passedPositions).toBe(positions);
            expect(positions[0].height).toEqual(addonLevel);
            expect(positions[1].height).toEqual(addonLevel);
        });
    });

    it('should throw querying heights when TileAvailability is not available', function() {
        var terrainProvider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        var positions = [
            Cartographic.fromDegrees(86.925145, 27.988257),
            Cartographic.fromDegrees(87.0, 28.0)
        ];

        return sampleTerrainMostDetailed(terrainProvider, positions).then(function() {
            fail('the promise should not resolve');
        }).otherwise(function() {
        });
    });

    it('uses a suitable common tile height for a range of locations', function() {
        var positions = [
            Cartographic.fromDegrees(86.925145, 27.988257),
            Cartographic.fromDegrees(-87.0, 28.0)
        ];

        return sampleTerrainMostDetailed(ellipsoidTerrain, positions).then(function() {
            expect(positions[0].height).toEqual(initialMaximumLevel);
            expect(positions[1].height).toEqual(initialMaximumLevel + 1);
        });
    });

    it('requires terrainProvider and positions', function() {
        var positions = [
            Cartographic.fromDegrees(86.925145, 27.988257),
            Cartographic.fromDegrees(87.0, 28.0)
        ];

        expect(function() {
            sampleTerrainMostDetailed(undefined, positions);
        }).toThrowDeveloperError();

        expect(function() {
            sampleTerrainMostDetailed(ellipsoidTerrain, undefined);
        }).toThrowDeveloperError();

    });
});
