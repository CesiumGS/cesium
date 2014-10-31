/*global defineSuite*/
defineSuite([
        'Core/EllipsoidTerrainProvider',
        'Core/TerrainProvider',
        'Specs/createContext',
        'Specs/destroyContext'
    ], function(
        EllipsoidTerrainProvider,
        TerrainProvider,
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

    it('conforms to TerrainProvider interface', function() {
        expect(EllipsoidTerrainProvider).toConformToInterface(TerrainProvider);
    });

    it('requestTileGeometry creates terrain data.', function() {
        var terrain = new EllipsoidTerrainProvider();
        var terrainData = terrain.requestTileGeometry(0, 0, 0);
        expect(terrainData).toBeDefined();
    });

    it('has error event', function() {
        var provider = new EllipsoidTerrainProvider();
        expect(provider.errorEvent).toBeDefined();
        expect(provider.errorEvent).toBe(provider.errorEvent);
    });

    it('returns undefined on getTileDataAvailable()', function() {
        var provider = new EllipsoidTerrainProvider();
        expect(provider.getTileDataAvailable()).toBeUndefined();
    });
}, 'WebGL');