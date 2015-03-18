/*global defineSuite*/
defineSuite([
        'Core/ArcGisImageServerTerrainProvider',
        'Core/DefaultProxy',
        'Core/Ellipsoid',
        'Core/GeographicTilingScheme',
        'Core/HeightmapTerrainData',
        'Core/loadImage',
        'Core/Math',
        'Core/queryToObject',
        'Core/TerrainProvider',
        'ThirdParty/Uri',
        'ThirdParty/when'
    ], function(
        ArcGisImageServerTerrainProvider,
        DefaultProxy,
        Ellipsoid,
        GeographicTilingScheme,
        HeightmapTerrainData,
        loadImage,
        CesiumMath,
        queryToObject,
        TerrainProvider,
        Uri,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

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
            return new ArcGisImageServerTerrainProvider({});
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

            var terrainProvider = new ArcGisImageServerTerrainProvider({
                url : baseUrl
            });

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var uri = new Uri(url);
                var params = queryToObject(uri.query);

                expect(uri.path).toMatch(/exportImage$/);

                expect(params.bbox).toEqual('-181.40625,-91.40625,1.40625,91.40625');

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return when(terrainProvider.requestTileGeometry(0, 0, 0), function(terrainData) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(terrainData).toBeDefined();
            });
        });

        it('uses the token if one is supplied', function() {
            var baseUrl = 'made/up/url';

            var terrainProvider = new ArcGisImageServerTerrainProvider({
                url : baseUrl,
                token : 'foofoofoo'
            });

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var uri = new Uri(url);
                var params = queryToObject(uri.query);

                expect(uri.path).toMatch(/exportImage$/);

                expect(params.token).toEqual('foofoofoo');

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return when(terrainProvider.requestTileGeometry(0, 0, 0), function(terrainData) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(terrainData).toBeDefined();
            });
        });

        it('uses the proxy if one is supplied', function() {
            var baseUrl = 'made/up/url';

            var terrainProvider = new ArcGisImageServerTerrainProvider({
                url : baseUrl,
                proxy : new DefaultProxy('/proxy/')
            });

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var uri = new Uri(url);
                var params = queryToObject(uri.query);

                expect(uri.path).toEqual('/proxy/');

                uri = new Uri(decodeURIComponent(uri.query));

                expect(uri.path).toMatch(/exportImage$/);

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return when(terrainProvider.requestTileGeometry(0, 0, 0), function(terrainData) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(terrainData).toBeDefined();
            });
        });

        it('provides HeightmapTerrainData', function() {
            var baseUrl = 'made/up/url';

            var terrainProvider = new ArcGisImageServerTerrainProvider({
                url : baseUrl
            });

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var uri = new Uri(url);
                expect(uri.path).toMatch(/exportImage$/);

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return when(terrainProvider.requestTileGeometry(0, 0, 0), function(terrainData) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(terrainData).toBeInstanceOf(HeightmapTerrainData);
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
