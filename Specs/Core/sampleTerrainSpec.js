/*global defineSuite*/
defineSuite([
        'Core/sampleTerrain',
        'Core/Cartographic',
        'Core/CesiumTerrainProvider',
        'ThirdParty/when'
    ], function(
        sampleTerrain,
        Cartographic,
        CesiumTerrainProvider,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var terrainProvider = new CesiumTerrainProvider({
        url : '//assets.agi.com/stk-terrain/world'
    });

    it('queries heights', function() {
        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];

        return sampleTerrain(terrainProvider, 11, positions).then(function(passedPositions) {
            expect(passedPositions).toBe(positions);
            expect(positions[0].height).toBeGreaterThan(5000);
            expect(positions[0].height).toBeLessThan(10000);
            expect(positions[1].height).toBeGreaterThan(5000);
            expect(positions[1].height).toBeLessThan(10000);
        });
    });

    it('queries heights from Small Terrain', function() {
        var terrainProvider = new CesiumTerrainProvider({
            url : '//s3.amazonaws.com/cesiumjs/smallTerrain'
        });

        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];

        return sampleTerrain(terrainProvider, 11, positions).then(function(passedPositions) {
            expect(passedPositions).toBe(positions);
            expect(positions[0].height).toBeGreaterThan(5000);
            expect(positions[0].height).toBeLessThan(10000);
            expect(positions[1].height).toBeGreaterThan(5000);
            expect(positions[1].height).toBeLessThan(10000);
        });
    });

    it('sets height to undefined if terrain data is not available at the position and specified level', function() {
        var positions = [
                         Cartographic.fromDegrees(0.0, 0.0, 0.0)
                     ];

        return sampleTerrain(terrainProvider, 18, positions).then(function() {
            expect(positions[0].height).toBeUndefined();
        });
    });

    it('fills in what it can when given a mix of positions with and without valid tiles', function() {
        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(0.0, 89.0, 0.0),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];

        return sampleTerrain(terrainProvider, 12, positions).then(function() {
            expect(positions[0].height).toBeGreaterThan(5000);
            expect(positions[0].height).toBeLessThan(10000);
            expect(positions[1].height).toBeUndefined();
            expect(positions[2].height).toBeGreaterThan(5000);
            expect(positions[2].height).toBeLessThan(10000);
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
            sampleTerrain(terrainProvider, undefined, positions);
        }).toThrowDeveloperError();

        expect(function() {
            sampleTerrain(terrainProvider, 11, undefined);
        }).toThrowDeveloperError();
    });

    it('works for a dodgy point right near the edge of a tile', function() {
        var stkWorldTerrain = new CesiumTerrainProvider({
            url : '//assets.agi.com/stk-terrain/world'
        });

        var positions = [new Cartographic(0.33179290856829535, 0.7363107781851078)];

        return sampleTerrain(stkWorldTerrain, 12, positions).then(function() {
            expect(positions[0].height).toBeDefined();
        });
    });
});
