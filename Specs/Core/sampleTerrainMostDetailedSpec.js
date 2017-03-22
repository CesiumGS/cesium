/*global defineSuite*/
defineSuite([
        'Core/sampleTerrainMostDetailed',
        'Core/Cartographic',
        'Core/CesiumTerrainProvider'
    ], function(
        sampleTerrainMostDetailed,
        Cartographic,
        CesiumTerrainProvider) {
    "use strict";

    var terrainProvider = new CesiumTerrainProvider({
        url : '//assets.agi.com/stk-terrain/world'
    });

    it('queries heights', function() {
        var positions = [
            Cartographic.fromDegrees(86.925145, 27.988257),
            Cartographic.fromDegrees(87.0, 28.0)
        ];

        return sampleTerrainMostDetailed(terrainProvider, positions).then(function(passedPositions) {
            expect(passedPositions).toBe(positions);
            expect(positions[0].height).toBeGreaterThan(5000);
            expect(positions[0].height).toBeLessThan(10000);
            expect(positions[1].height).toBeGreaterThan(5000);
            expect(positions[1].height).toBeLessThan(10000);
        });
    });

    it('should throw querying heights from Small Terrain', function() {
        var terrainProvider = new CesiumTerrainProvider({
            url : '//cesiumjs.org/smallTerrain'
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
            Cartographic.fromDegrees(87.0, 28.0)
        ];

        return sampleTerrainMostDetailed(terrainProvider, positions).then(function() {
            expect(positions[0].height).toBeGreaterThan(5000);
            expect(positions[0].height).toBeLessThan(10000);
            expect(positions[1].height).toBeGreaterThan(5000);
            expect(positions[1].height).toBeLessThan(10000);
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
            sampleTerrainMostDetailed(terrainProvider, undefined);
        }).toThrowDeveloperError();

    });

    it('works for a dodgy point right near the edge of a tile', function() {
        var stkWorldTerrain = new CesiumTerrainProvider({
            url : '//assets.agi.com/stk-terrain/world'
        });

        var positions = [new Cartographic(0.33179290856829535, 0.7363107781851078)];

        return sampleTerrainMostDetailed(stkWorldTerrain, positions).then(function() {
            expect(positions[0].height).toBeDefined();
        });
    });

});
