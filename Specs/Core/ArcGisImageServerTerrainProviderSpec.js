/*global defineSuite*/
defineSuite([
        'Core/ArcGisImageServerTerrainProvider',
        'Core/DefaultProxy',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/GeographicTilingScheme',
        'Core/HeightmapTerrainData',
        'Core/loadImage',
        'Core/Math',
        'Core/TerrainProvider',
        'ThirdParty/when'
    ], function(
        ArcGisImageServerTerrainProvider,
        DefaultProxy,
        defined,
        Ellipsoid,
        GeographicTilingScheme,
        HeightmapTerrainData,
        loadImage,
        CesiumMath,
        TerrainProvider,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    afterEach(function() {
        loadImage.createImage = loadImage.defaultCreateImage;
    });

    it('conforms to TerrainProvider interface', function() {
        expect(ArcGisImageServerTerrainProvider).toConformToInterface(TerrainProvider);
    });

    it('constructor throws if url is not provided', function() {
        expect(function() {
            return new ArcGisImageServerTerrainProvider();
        }).toThrowDeveloperError();

        expect(function() {
            return new ArcGisImageServerTerrainProvider({
            });
        }).toThrowDeveloperError();
    });

    it('uses geographic tiling scheme by default', function() {
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url'
        });

        var tilingScheme = provider.tilingScheme;
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

        expect(provider.tilingScheme).toBe(tilingScheme);
    });

    it('has error event', function() {
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.errorEvent).toBeDefined();
        expect(provider.errorEvent).toBe(provider.errorEvent);
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
        expect(provider.credit).toBeUndefined();
    });

    it('logo is defined if credit is provided', function() {
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url',
            credit : 'thanks to our awesome made up contributors!'
        });
        expect(provider.credit).toBeDefined();
    });

    it('does not have a water mask', function() {
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.hasWaterMask).toBe(false);
    });

    it('is ready immediately', function() {
        var provider = new ArcGisImageServerTerrainProvider({
            url : 'made/up/url'
        });
        expect(provider.ready).toBe(true);
    });

    describe('requestTileGeometry', function() {
        it('requests expanded rectangle to account for center versus edge', function() {
            var baseUrl = 'made/up/url';

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url.indexOf('exportImage?')).toBeGreaterThanOrEqualTo(0);
                expect(url.indexOf('bbox=-181.40625%2C-91.40625%2C1.40625%2C91.40625')).toBeGreaterThanOrEqualTo(0);

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            var terrainProvider = new ArcGisImageServerTerrainProvider({
                url : baseUrl
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

        it('uses the token if one is supplied', function() {
            var baseUrl = 'made/up/url';

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url.indexOf('exportImage?')).toBeGreaterThanOrEqualTo(0);
                expect(url.indexOf('token=foofoofoo')).toBeGreaterThanOrEqualTo(0);

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            var terrainProvider = new ArcGisImageServerTerrainProvider({
                url : baseUrl,
                token : 'foofoofoo'
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

        it('uses the proxy if one is supplied', function() {
            var baseUrl = 'made/up/url';

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url.indexOf('/proxy/?')).toBe(0);
                expect(url.indexOf('exportImage%3F')).toBeGreaterThanOrEqualTo(0);

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            var terrainProvider = new ArcGisImageServerTerrainProvider({
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

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url.indexOf('exportImage?')).toBeGreaterThanOrEqualTo(0);

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            var terrainProvider = new ArcGisImageServerTerrainProvider({
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

            loadImage.createImage = function(url, crossOrigin, deferred) {
                // Do nothing, so requests never complete
                deferreds.push(deferred);
            };

            var terrainProvider = new ArcGisImageServerTerrainProvider({
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
