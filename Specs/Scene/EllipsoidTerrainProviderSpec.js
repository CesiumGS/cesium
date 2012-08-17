/*global defineSuite*/
defineSuite([
         'Scene/EllipsoidTerrainProvider',
         'Scene/GeographicTilingScheme',
         'Core/Extent',
         'Core/Math',
         '../Specs/createContext',
         '../Specs/destroyContext'
     ], function(
         EllipsoidTerrainProvider,
         GeographicTilingScheme,
         Extent,
         CesiumMath,
         createContext,
         destroyContext) {
    "use strict";
    /*global document,describe,it,expect*/

    describe('createTileGeometry', function() {
        it('creates a vertex array for the tile.', function() {
            var context = createContext();

            var tilingScheme = new GeographicTilingScheme();
            var terrain = new EllipsoidTerrainProvider(tilingScheme);
            var tiles = tilingScheme.createLevelZeroTiles();
            var tile = tiles[0];

            expect(terrain.createTileGeometry(context, tile)).toEqual(true);
            expect(tile.vertexArray).not.toBeNull();

            destroyContext(context);
        });
    });
});