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

    function returnHeightmapTileJson() {
        var oldLoad = loadWithXhr.load;
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
            if (url.indexOf('layer.json') >= 0) {
                return loadWithXhr.defaultLoad('Data/CesiumTerrainTileJson/StandardHeightmap.tile.json', responseType, method, data, headers, deferred);
            } else {
                return oldLoad(url, responseType, method, data, headers, deferred);
            }
        };
    }

    it('conforms to TerrainProvider interface', function() {
        expect(CesiumTerrainProvider).toConformToInterface(TerrainProvider);
    });

    it('constructor throws if url is not provided', function() {
        expect(function() {
            return new CesiumTerrainProvider();
        }).toThrowDeveloperError();

        expect(function() {
            return new CesiumTerrainProvider({
            });
        }).toThrowDeveloperError();
    });

    it('uses geographic tiling scheme by default', function() {
        returnHeightmapTileJson();

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        waitsFor(function() {
            return provider.isReady();
        });

        runs(function() {
            var tilingScheme = provider.getTilingScheme();
            expect(tilingScheme instanceof GeographicTilingScheme).toBe(true);
        });
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
        returnHeightmapTileJson();

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        waitsFor(function() {
            return provider.isReady();
        });

        runs(function() {
            expect(provider.getCredit()).toBeUndefined();
        });
    });

    it('logo is defined if credit is provided', function() {
        returnHeightmapTileJson();

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url',
            credit : 'thanks to our awesome made up contributors!'
        });

        waitsFor(function() {
            return provider.isReady();
        });

        runs(function() {
            expect(provider.getCredit()).toBeDefined();
        });
    });

    it('has a water mask', function() {
        returnHeightmapTileJson();

        var provider = new CesiumTerrainProvider({
            url : 'made/up/url'
        });

        waitsFor(function() {
            return provider.isReady();
        });

        runs(function() {
            expect(provider.hasWaterMask()).toBe(true);
        });
    });

    describe('requestTileGeometry', function() {
        it('uses the proxy if one is supplied', function() {
            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
                expect(url.indexOf('/proxy/?')).toBe(0);

                // Just return any old file, as long as its big enough
                return loadWithXhr.defaultLoad('Data/EarthOrientationParameters/IcrfToFixedStkComponentsRotationData.json', responseType, method, data, headers, deferred);
            };

            returnHeightmapTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl,
                proxy : new DefaultProxy('/proxy/')
            });

            waitsFor(function() {
                return terrainProvider.isReady();
            });

            var loaded = false;

            runs(function() {
                var promise = terrainProvider.requestTileGeometry(0, 0, 0);

                when(promise, function(terrainData) {
                    loaded = true;
                });
            });

            waitsFor(function() {
                return loaded;
            }, 'request to complete');
        });

        it('provides HeightmapTerrainData', function() {
            returnHeightmapTileJson();

            var baseUrl = 'made/up/url';

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
                // Just return any old file, as long as its big enough
                return loadWithXhr.defaultLoad('Data/EarthOrientationParameters/IcrfToFixedStkComponentsRotationData.json', responseType, method, data, headers, deferred);
            };

            returnHeightmapTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl
            });

            waitsFor(function() {
                return terrainProvider.isReady();
            });

            var loadedData;

            runs(function() {
                var promise = terrainProvider.requestTileGeometry(0, 0, 0);

                when(promise, function(terrainData) {
                    loadedData = terrainData;
                });
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

            returnHeightmapTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : baseUrl
            });

            waitsFor(function() {
                return terrainProvider.isReady();
            });

            runs(function() {
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
});
