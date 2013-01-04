/*global defineSuite*/
defineSuite([
         'Scene/EllipsoidTerrainProvider',
         'Scene/GeographicTilingScheme',
         'Scene/TileState',
         'Core/Extent',
         'Core/Math',
         'Specs/createContext',
         'Specs/destroyContext'
     ], function(
         EllipsoidTerrainProvider,
         GeographicTilingScheme,
         TileState,
         Extent,
         CesiumMath,
         createContext,
         destroyContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    it('creates a vertex array and bounding sphere for the tile.', function() {
        var terrain;
        var tile;

        runs(function() {
            terrain = new EllipsoidTerrainProvider();
            var tiles = terrain.tilingScheme.createLevelZeroTiles();
            tile = tiles[0];

            terrain.requestTileGeometry(tile);
        });

        waitsFor(function() {
            return tile.state === TileState.RECEIVED;
        });

        runs(function() {
            terrain.transformGeometry(context, tile);
        });

        waitsFor(function() {
            return tile.state === TileState.TRANSFORMED;
        });

        runs(function() {
            terrain.createResources(context, tile);
        });

        waitsFor(function() {
            return tile.state === TileState.READY;
        });

        runs(function() {
            expect(tile.vertexArray).not.toBeNull();
            expect(tile.boundingSphere3D).not.toBeNull();
        });
    });
}, 'WebGL');