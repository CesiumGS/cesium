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
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var terrainProvider = new CesiumTerrainProvider({
        url : 'http://cesiumjs.org/smallterrain'
    });

    it('queries heights', function() {
        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];
        var promise = sampleTerrain(terrainProvider, 11, positions);

        var done = false;
        when(promise, function(passedPositions) {
            expect(passedPositions).toBe(positions);
            done = true;
        });

        waitsFor(function() {
            return done;
        }, 'height query to finish');

        runs(function() {
            expect(positions[0].height).toBeGreaterThan(5000);
            expect(positions[0].height).toBeLessThan(10000);
            expect(positions[1].height).toBeGreaterThan(5000);
            expect(positions[1].height).toBeLessThan(10000);
        });
    });

    it('queries heights from STK World Terrain', function() {
        var stkWorldTerrain = new CesiumTerrainProvider({
            url : 'http://cesiumjs.org/stk-terrain/tilesets/world/tiles'
        });

        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];
        var promise = sampleTerrain(stkWorldTerrain, 11, positions);

        var done = false;
        when(promise, function(passedPositions) {
            expect(passedPositions).toBe(positions);
            done = true;
        });

        waitsFor(function() {
            return done;
        }, 'height query to finish');

        runs(function() {
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
        var promise = sampleTerrain(terrainProvider, 11, positions);

        var done = false;
        when(promise, function() {
            done = true;
        });

        waitsFor(function() {
            return done;
        }, 'height query to finish');

        runs(function() {
            expect(positions[0].height).toBeUndefined();
        });
    });

    it('fills in what it can when given a mix of positions with and without valid tiles', function() {
        var positions = [
                         Cartographic.fromDegrees(86.925145, 27.988257),
                         Cartographic.fromDegrees(0.0, 0.0, 0.0),
                         Cartographic.fromDegrees(87.0, 28.0)
                     ];
        var promise = sampleTerrain(terrainProvider, 11, positions);

        var done = false;
        when(promise, function() {
            done = true;
        });

        waitsFor(function() {
            return done;
        }, 'height query to finish');

        runs(function() {
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
});
