/*global defineSuite*/
defineSuite([
         'Scene/ArcGisImageServerTerrainProvider',
         'Core/Ellipsoid',
         'Core/Math',
         'Scene/GeographicTilingScheme',
         'Scene/TerrainProvider'
     ], function(
         ArcGisImageServerTerrainProvider,
         Ellipsoid,
         CesiumMath,
         GeographicTilingScheme,
         TerrainProvider) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('conforms to TerrainProvider interface', function() {
        expect(ArcGisImageServerTerrainProvider).toConformToInterface(TerrainProvider);
    });

    it('constructor throws if url is not provided', function() {
        expect(function() {
            return new ArcGisImageServerTerrainProvider();
        }).toThrow();

        expect(function() {
            return new ArcGisImageServerTerrainProvider({
            });
        }).toThrow();
    });

    it('uses geographic tiling scheme by default', function() {
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url'
        });

        var tilingScheme = provider.getTilingScheme();
        expect(tilingScheme instanceof GeographicTilingScheme).toBe(true);
    });

    it('constructor can specify tiling scheme', function() {
        var tilingScheme = new GeographicTilingScheme({
            ellipsoid : Ellipsoid.UNIT_SPHERE,
            numberOfLevelZeroTilesX : 123,
            numberOfLevelZeroTilesY : 456
        });
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url',
            tilingScheme : tilingScheme
        });

        expect(provider.getTilingScheme()).toBe(tilingScheme);
    });

    it('has error event', function() {
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.getErrorEvent()).toBeDefined();
        expect(provider.getErrorEvent()).toBe(provider.getErrorEvent());
    });

    it('returns reasonable geometric error for various levels', function() {
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url'
        });

        expect(provider.getLevelMaximumGeometricError(0)).toBeGreaterThan(0.0);
        expect(provider.getLevelMaximumGeometricError(0)).toEqualEpsilon(provider.getLevelMaximumGeometricError(1) * 2.0, CesiumMath.EPSILON10);
        expect(provider.getLevelMaximumGeometricError(1)).toEqualEpsilon(provider.getLevelMaximumGeometricError(2) * 2.0, CesiumMath.EPSILON10);
    });

    it('logo is undefined if credit is not provided', function() {
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.getLogo()).toBeUndefined();
    });

    it('logo is defined if credit is provided', function() {
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url',
            credit : 'thanks to our awesome made up contributors!'
        });
        expect(provider.getLogo()).toBeDefined();
    });

    it('does not have a water mask', function() {
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.hasWaterMask()).toBe(false);
    });

    it('is ready immediately', function() {
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.isReady()).toBe(true);
    });
});
