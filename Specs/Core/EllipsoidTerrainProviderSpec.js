defineSuite([
        'Core/EllipsoidTerrainProvider',
        'Core/TerrainProvider',
        'Specs/createContext',
        'ThirdParty/when'
    ], function(
        EllipsoidTerrainProvider,
        TerrainProvider,
        createContext,
        when) {
    'use strict';

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    it('conforms to TerrainProvider interface', function() {
        expect(EllipsoidTerrainProvider).toConformToInterface(TerrainProvider);
    });

    it('resolves readyPromise', function() {
        var provider = new EllipsoidTerrainProvider();

        return provider.readyPromise.then(function (result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('requestTileGeometry creates terrain data.', function() {
        var terrain = new EllipsoidTerrainProvider();
        var terrainData = terrain.requestTileGeometry(0, 0, 0);
        expect(when.isPromise(terrainData)).toBeTruthy();
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
