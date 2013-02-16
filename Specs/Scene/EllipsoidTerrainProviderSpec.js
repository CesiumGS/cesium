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

    it('requestTileGeometry creates terrain data.', function() {
        var terrain = new EllipsoidTerrainProvider();
        var terrainData = terrain.requestTileGeometry(0, 0, 0);
        expect(terrainData).toBeDefined();
    });

    it('has error event', function() {
        var provider = new EllipsoidTerrainProvider();
        expect(provider.getErrorEvent()).toBeDefined();
        expect(provider.getErrorEvent()).toBe(provider.getErrorEvent());
    });
}, 'WebGL');