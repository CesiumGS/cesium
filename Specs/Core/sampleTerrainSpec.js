defineSuite([
        'Core/sampleTerrain',
        'Core/Cartographic',
        'Core/EllipsoidTerrainProvider',
        'Core/HeightmapTerrainData',
        'ThirdParty/when'
    ], function(
        sampleTerrain,
        Cartographic,
        EllipsoidTerrainProvider,
        HeightmapTerrainData,
        when) {
    'use strict';

    var ellipsoidTerrain = new EllipsoidTerrainProvider();
    var heightValue = 10.0;

    beforeEach(function() {
        // Do not generate tiles beyond level 15 or near the North pole after level 10
        spyOn(EllipsoidTerrainProvider, '_getTileGeometry').and.callFake(function(x, y, level) {
            if (level > 15 || (level > 10 && y < 50)) {
                return when.reject();
            }
            var width = 16;
            var height = 16;
            return when.resolve(new HeightmapTerrainData({
                buffer : new Uint8Array(width * height).fill(heightValue),
                width : width,
                height : height
            }));
        });
    });

    it('queries heights', function() {
        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];

        return sampleTerrain(ellipsoidTerrain, 11, positions).then(function(passedPositions) {
            expect(passedPositions).toBe(positions);
            expect(positions[0].height).toEqual(heightValue);
            expect(positions[1].height).toEqual(heightValue);
        });
    });

    it('sets height to undefined if terrain data is not available at the position and specified level', function() {
        var positions = [
                         Cartographic.fromDegrees(0.0, 0.0, 0.0)
                     ];

        return sampleTerrain(ellipsoidTerrain, 18, positions).then(function() {
            expect(positions[0].height).toBeUndefined();
        });
    });

    it('fills in what it can when given a mix of positions with and without valid tiles', function() {
        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(0.0, 89.0, 0.0),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];

        return sampleTerrain(ellipsoidTerrain, 12, positions).then(function() {
            expect(positions[0].height).toEqual(heightValue);
            expect(positions[1].height).toBeUndefined();
            expect(positions[2].height).toEqual(heightValue);
        });
    });

    it('requires terrainProvider, level, and positions', function() {
        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(0.0, 0.0, 0.0),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];

        expect(function() {
            sampleTerrain(undefined, 11, positions);
        }).toThrowDeveloperError();

        expect(function() {
            sampleTerrain(ellipsoidTerrain, undefined, positions);
        }).toThrowDeveloperError();

        expect(function() {
            sampleTerrain(ellipsoidTerrain, 11, undefined);
        }).toThrowDeveloperError();
    });
});
