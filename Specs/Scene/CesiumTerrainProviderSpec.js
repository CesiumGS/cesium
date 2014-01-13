/*global defineSuite*/
defineSuite([
         'Scene/CesiumTerrainProvider',
         'Core/loadWithXhr',
         'Core/defined',
         'Core/DefaultProxy',
         'Core/Ellipsoid',
         'Core/Math',
         'Scene/GeographicTilingScheme',
         'Scene/HeightmapTerrainData',
         'Scene/TerrainProvider',
         'ThirdParty/when'
     ], function(
         CesiumTerrainProvider,
         loadWithXhr,
         defined,
         DefaultProxy,
         Ellipsoid,
         CesiumMath,
         GeographicTilingScheme,
         HeightmapTerrainData,
         TerrainProvider,
         when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    afterEach(function() {
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    it('conforms to TerrainProvider interface', function() {
        expect(CesiumTerrainProvider).toConformToInterface(TerrainProvider);
    });

    it('constructor throws if url is not provided', function() {
        expect(function() {
            return new CesiumTerrainProvider();
        }).toThrow();

        expect(function() {
            return new CesiumTerrainProvider({
            });
        }).toThrow();
    });

    it('uses geographic tiling scheme by default', function() {
        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        var tilingScheme = provider.getTilingScheme();
        expect(tilingScheme instanceof GeographicTilingScheme).toBe(true);
    });

    it('has error event', function() {
        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.getErrorEvent()).toBeDefined();
        expect(provider.getErrorEvent()).toBe(provider.getErrorEvent());
    });

    it('returns reasonable geometric error for various levels', function() {
        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        expect(provider.getLevelMaximumGeometricError(0)).toBeGreaterThan(0.0);
        expect(provider.getLevelMaximumGeometricError(0)).toEqualEpsilon(provider.getLevelMaximumGeometricError(1) * 2.0, CesiumMath.EPSILON10);
        expect(provider.getLevelMaximumGeometricError(1)).toEqualEpsilon(provider.getLevelMaximumGeometricError(2) * 2.0, CesiumMath.EPSILON10);
    });

    it('logo is undefined if credit is not provided', function() {
        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.getCredit()).toBeUndefined();
    });

    it('logo is defined if credit is provided', function() {
        var provider = new CesiumTerrainProvider({
            url : 'made/up/url',
            credit : 'thanks to our awesome made up contributors!'
        });
        expect(provider.getCredit()).toBeDefined();
    });

    it('has a water mask', function() {
        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.hasWaterMask()).toBe(true);
    });

    it('is ready immediately', function() {
        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.isReady()).toBe(true);
    });

    describe('requestTileGeometry', function() {
        it('uses the proxy if one is supplied', function() {
            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
                expect(url.indexOf('/proxy/?')).toBe(0);

                // Just return any old file, as long as its big enough
                return loadWithXhr.defaultLoad('Data/EarthOrientationParameters/IcrfToFixedStkComponentsRotationData.json', responseType, method, data, headers, deferred);
            };

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl,
                proxy : new DefaultProxy('/proxy/')
            });

            var promise = terrainProvider.requestTileGeometry(0, 0, 0);

            var loaded = false;
            when(promise, function(terrainData) {
                loaded = true;
            });

            waitsFor(function() {
                return loaded;
            }, 'request to complete');
        });

        it('provides HeightmapTerrainData', function() {
            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
                // Just return any old file, as long as its big enough
                return loadWithXhr.defaultLoad('Data/EarthOrientationParameters/IcrfToFixedStkComponentsRotationData.json', responseType, method, data, headers, deferred);
            };

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl
            });

            var promise = terrainProvider.requestTileGeometry(0, 0, 0);

            var loadedData;
            when(promise, function(terrainData) {
                loadedData = terrainData;
            });

            waitsFor(function() {
                return defined(loadedData);
            }, 'request to complete');

            runs(function() {
                expect(loadedData).toBeInstanceOf(HeightmapTerrainData);
            });
        });

        it('returns undefined if too many requests are already in progress', function() {
            var baseUrl = 'made/up/url';

            var deferreds = [];

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
                // Do nothing, so requests never complete
                deferreds.push(deferred);
            };

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl
            });

            var promise = terrainProvider.requestTileGeometry(0, 0, 0);
            expect(promise).toBeDefined();

            var i;
            for (i = 0; i < 10; ++i) {
                promise = terrainProvider.requestTileGeometry(0, 0, 0);
            }

            promise = terrainProvider.requestTileGeometry(0, 0, 0);
            expect(promise).toBeUndefined();

            for (i = 0; i < deferreds.length; ++i) {
                deferreds[i].resolve();
            }
        });
    });
});
