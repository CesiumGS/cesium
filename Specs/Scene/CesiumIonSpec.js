defineSuite([
        'Scene/CesiumIon',
        'Core/RequestErrorEvent',
        'Core/Resource',
        'Scene/ArcGisMapServerImageryProvider',
        'Scene/BingMapsImageryProvider',
        'Scene/GoogleEarthEnterpriseMapsProvider',
        'Scene/MapboxImageryProvider',
        'Scene/SingleTileImageryProvider',
        'Scene/UrlTemplateImageryProvider',
        'Scene/WebMapServiceImageryProvider',
        'Scene/WebMapTileServiceImageryProvider',
        'ThirdParty/when'
    ], function(
        CesiumIon,
        RequestErrorEvent,
        Resource,
        ArcGisMapServerImageryProvider,
        BingMapsImageryProvider,
        GoogleEarthEnterpriseMapsProvider,
        MapboxImageryProvider,
        SingleTileImageryProvider,
        UrlTemplateImageryProvider,
        WebMapServiceImageryProvider,
        WebMapTileServiceImageryProvider,
        when) {
    'use strict';

    var assetId;
    var endpoint;

    beforeEach(function() {
        assetId = 123890213;
        endpoint = {
            type: '3DTILES',
            url: 'https://assets.cesium.com/' + assetId,
            accessToken: 'not_really_a_refresh_token'
        };
    });

    it('createResource calls CesiumIonResource.create with expected default parameters', function() {
        var mockResource = {};
        var loadJson = spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(endpoint));
        var create = spyOn(CesiumIon._CesiumIonResource, 'create').and.returnValue(mockResource);

        return CesiumIon.createResource(assetId).then(function(resource) {
            var loadArgs = loadJson.calls.argsFor(0);
            var endpointResource = loadArgs[0];
            expect(endpointResource).toBeInstanceOf(Resource);
            expect(endpointResource.getUrlComponent()).toEqual(CesiumIon.defaultServerUrl + '/v1/assets/' + assetId + '/endpoint');
            expect(create).toHaveBeenCalledWith(endpoint, endpointResource);
            expect(resource).toBe(mockResource);
        });
    });

    it('createResource calls CesiumIonResource.create with expected parameters', function() {
        var mockResource = {};
        var options = { accessToken: 'not_a_token', serverUrl: 'https://test.invalid' };
        var loadJson = spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(endpoint));
        var create = spyOn(CesiumIon._CesiumIonResource, 'create').and.returnValue(mockResource);

        return CesiumIon.createResource(assetId, options).then(function(resource) {
            var loadArgs = loadJson.calls.argsFor(0);
            var endpointResource = loadArgs[0];
            expect(endpointResource).toBeInstanceOf(Resource);
            expect(endpointResource.getUrlComponent()).toEqual(options.serverUrl + '/v1/assets/' + assetId + '/endpoint');
            expect(endpointResource.queryParameters).toEqual({ access_token: options.accessToken });
            expect(create).toHaveBeenCalledWith(endpoint, endpointResource);
            expect(resource).toBe(mockResource);
        });
    });

    it('createImageryProvider calls createResource and returns createImageryProvider result', function() {
        var mockImageryProvider = {};
        var mockResource = { createImageryProvider: jasmine.createSpy('createImageryProvider').and.returnValue(mockImageryProvider) };

        spyOn(CesiumIon, 'createResource').and.returnValue(when.resolve(mockResource));

        var options = {};
        return CesiumIon.createImageryProvider(assetId, options)
            .then(function(imageryProvider) {
                expect(CesiumIon.createResource).toHaveBeenCalledWith(assetId, options);
                expect(mockResource.createImageryProvider).toHaveBeenCalledWith();
                expect(imageryProvider).toBe(mockImageryProvider);
            });
    });

    describe('CesiumIonResource', function() {
        it('constructs with expected values', function() {
            spyOn(Resource, 'call').and.callThrough();

            var endpointResource = new Resource({ url: 'https://api.test.invalid' });
            var resource = CesiumIon._CesiumIonResource.create(endpoint, endpointResource);
            expect(resource).toBeInstanceOf(Resource);
            expect(resource.ionEndpoint).toEqual(endpoint);
            expect(Resource.call).toHaveBeenCalledWith(resource, {
                url: endpoint.url,
                retryCallback: resource.retryCallback,
                retryAttempts: 1,
                queryParameters: { access_token: endpoint.accessToken }
            });
        });

        it('clone works', function() {
            var endpointResource = new Resource({ url: 'https://api.test.invalid' });
            var resource = CesiumIon._CesiumIonResource.create(endpoint, endpointResource);
            var cloned = resource.clone();
            expect(cloned).not.toBe(resource);
            expect(cloned.ionRoot).toBe(resource);
            cloned.ionRoot = undefined;
            expect(cloned).toEqual(resource);
        });

        it('create creates the expected resource', function() {
            var endpointResource = new Resource({ url: 'https://api.test.invalid', access_token: 'not_the_token' });
            var resource = CesiumIon._CesiumIonResource.create(endpoint, endpointResource);
            expect(resource.getUrlComponent()).toEqual('https://assets.cesium.com/123890213');
            expect(resource.queryParameters).toEqual({ access_token: 'not_really_a_refresh_token' });
            expect(resource.ionEndpoint).toBe(endpoint);
            expect(resource.ionEndpointResource).toEqual(endpointResource);
            expect(resource.retryCallback).toBeDefined();
            expect(resource.retryAttempts).toBe(1);
        });

        function testImageryAsset(endpoint, ImageryClass) {
            var endpointResource = new Resource({ url: 'https://api.test.invalid' });
            var resource = CesiumIon._CesiumIonResource.create(endpoint, endpointResource);
            var imageryProvider = resource.createImageryProvider();
            expect(imageryProvider).toBeInstanceOf(ImageryClass);
        }

        it('createImageryProvider works', function() {
            var url = 'https://test.invalid';
            testImageryAsset({ type: 'IMAGERY', url: url }, UrlTemplateImageryProvider);
            testImageryAsset({ type: 'ARCGIS_MAPSERVER', url: url }, ArcGisMapServerImageryProvider);
            testImageryAsset({ type: 'BING', url: url }, BingMapsImageryProvider);
            testImageryAsset({ type: 'GOOGLE_EARTH', url: url, channel: 1 }, GoogleEarthEnterpriseMapsProvider);
            testImageryAsset({ type: 'MAPBOX', url: url, mapId: 1 }, MapboxImageryProvider);
            testImageryAsset({ type: 'SINGLE_TILE', url: url }, SingleTileImageryProvider);
            testImageryAsset({ type: 'TMS', url: url }, UrlTemplateImageryProvider);
            testImageryAsset({ type: 'URL_TEMPLATE', url: url }, UrlTemplateImageryProvider);
            testImageryAsset({ type: 'WMS', url: url, layers: [] }, WebMapServiceImageryProvider);
            testImageryAsset({ type: 'WMTS', url: url, layer: '', style: '', tileMatrixSetID: 1 }, WebMapTileServiceImageryProvider);
        });

        it('createImageryProvider throws with unknown asset type', function() {
            endpoint.type = 'ADSASDS';
            var endpointResource = new Resource({ url: 'https://api.test.invalid' });
            var resource = CesiumIon._CesiumIonResource.create(endpoint, endpointResource);
            expect(function() { resource.createImageryProvider(); }).toThrowRuntimeError();
        });
    });

    describe('retryCallback', function() {
        var endpointResource;
        var resource;
        var retryCallback;

        beforeEach(function() {
            endpointResource = new Resource({ url: 'https://api.test.invalid', access_token: 'not_the_token' });
            resource = CesiumIon._CesiumIonResource.create(endpoint, endpointResource);
            retryCallback = CesiumIon._createRetryCallback(endpoint, endpointResource, resource);
        });

        it('returns false when error is undefined', function() {
            return retryCallback(resource, undefined).then(function(result) {
                expect(result).toBe(false);
            });
        });

        it('returns false when error is non-401', function() {
            var error = new RequestErrorEvent(404);
            return retryCallback(resource, error).then(function(result) {
                expect(result).toBe(false);
            });
        });

        it('returns false when error is event with non-Image target', function() {
            var event = { target: {} };
            return retryCallback(resource, event).then(function(result) {
                expect(result).toBe(false);
            });
        });

        function testCallback(resource, event) {
            var deferred = when.defer();
            spyOn(CesiumIon, '_loadJson').and.returnValue(deferred.promise);

            var newEndpoint = {
                type: '3DTILES',
                url: 'https://assets.cesium.com/' + assetId,
                accessToken: 'not_not_really_a_refresh_token'
            };

            var promise = retryCallback(resource, event);
            var resultPromise = promise.then(function(result) {
                expect(resource.queryParameters.access_token).toEqual(newEndpoint.accessToken);
                expect(result).toBe(true);
            });

            expect(CesiumIon._loadJson).toHaveBeenCalledWith(endpointResource);

            //A second retry should re-use the same pending promise
            var promise2 = retryCallback(resource, event);
            expect(promise._pendingPromise).toBe(promise2._pendingPromise);

            deferred.resolve(newEndpoint);

            return resultPromise;
        }

        it('works when error is a 401', function() {
            var error = new RequestErrorEvent(401);
            return testCallback(resource, error);
        });

        it('works when error is event with Image target', function() {
            var event = { target: new Image() };
            return testCallback(resource, event);
        });
    });
});
