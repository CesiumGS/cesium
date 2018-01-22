defineSuite([
        'Scene/CesiumIon',
        'Core/RuntimeError',
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
        RuntimeError,
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

    it('createResource calls CesiumIonResource.create for non-external endpoint with expected parameters', function() {
        var tilesAssetId = 123890213;
        var tilesEndpoint = {
            type: '3DTILES',
            url: 'https://assets.cesium.com/' + tilesAssetId + '/tileset.json',
            accessToken: 'not_really_a_refresh_token'
        };

        var options = {};
        var resourceEndpoint = CesiumIon._createEndpointResource(tilesAssetId, options);
        var expectedResource = CesiumIon._CesiumIonResource.create(tilesEndpoint, resourceEndpoint);

        spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(tilesEndpoint));
        spyOn(CesiumIon, 'createEndpointResource').and.returnValue(resourceEndpoint);
        spyOn(CesiumIon._CesiumIonResource, 'create').and.returnValue(expectedResource);

        return CesiumIon.createResource(tilesAssetId, options)
            .then(function(resource) {
                expect(resource).toBe(expectedResource);
                expect(CesiumIon._createEndpointResource).toHaveBeenCalledWith(tilesAssetId, options);
                expect(CesiumIon._loadJson(resourceEndpoint));
                expect(CesiumIon._CesiumIonResource.create).toHaveBeenCalledWith(tilesEndpoint, resourceEndpoint);
            });
    });

    function testNonImageryExternalResource(externalEndpoint) {
        spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(externalEndpoint));
        spyOn(CesiumIon._CesiumIonResource, 'create');

        return CesiumIon.createResource(123890213)
            .then(function(resource) {
                expect(resource).toBeInstanceOf(Resource);
                expect(resource).not.toBeInstanceOf(CesiumIon._CesiumIonResource);
                expect(resource.url).toEqual(externalEndpoint.options.url);
            });
    }

    it('createResource returns basic Resource for external 3D tilesets', function() {
        return testNonImageryExternalResource({
            type: '3DTILES',
            externalType: '3DTILES',
            options: { url: 'https://test.invalid/tileset.json' }
        });
    });

    it('createResource returns basic Resource for external 3D tilesets', function() {
        return testNonImageryExternalResource({
            type: 'TERRAIN',
            externalType: 'STK_TERRAIN_SERVER',
            options: { url: 'https://test.invalid/world' }
        });
    });

    it('createResource rejects for external imagery', function() {
        return testNonImageryExternalResource({
            type: 'IMAGERY',
            externalType: 'URL_TEMPLATE',
            url: 'https://test.invalid/world'
        })
        .then(fail)
        .otherwise(function(e) {
            expect(e).toBeInstanceOf(RuntimeError);
        });
    });

    it('createEndpointResource creates expected values with default parameters', function() {
        var assetId = 2348234;
        var resource = CesiumIon._createEndpointResource(assetId);
        expect(resource.url).toBe(CesiumIon.defaultServerUrl + '/v1/assets/' + assetId + '/endpoint');
    });

    it('createEndpointResource creates expected values with overridden options', function() {
        var serverUrl = 'https://api.cesium.test';
        var accessToken = 'not_a_token';

        var assetId = 2348234;
        var resource = CesiumIon._createEndpointResource(assetId, { serverUrl: serverUrl, accessToken: accessToken });
        expect(resource.url).toBe(serverUrl + '/v1/assets/' + assetId + '/endpoint?access_token=' + accessToken);
    });

    it('createEndpointResource creates expected values with overridden defaults', function() {
        var defaultServerUrl = CesiumIon.defaultServerUrl;
        var defaultAccessToken = CesiumIon.defaultAccessToken;

        CesiumIon.defaultServerUrl = 'https://api.cesium.test';
        CesiumIon.defaultAccessToken = 'not_a_token';

        var assetId = 2348234;
        var resource = CesiumIon._createEndpointResource(assetId);
        expect(resource.url).toBe(CesiumIon.defaultServerUrl + '/v1/assets/' + assetId + '/endpoint?access_token=' + CesiumIon.defaultAccessToken);

        CesiumIon.defaultServerUrl = defaultServerUrl;
        CesiumIon.defaultAccessToken = defaultAccessToken;
    });

    it('createImageryProvider works with non-external imagery', function() {
        var endpoint = {
            type: 'IMAGERY',
            url: 'https://assets.cesium.com/' + 123890213 + '/',
            accessToken: 'not_really_a_refresh_token'
        };

        spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(endpoint));

        return CesiumIon.createImageryProvider(123890213)
            .then(function(imageryProvider) {
                expect(imageryProvider).toBeInstanceOf(UrlTemplateImageryProvider);
            });
    });

    function testExternalImagery(type, options, ImageryClass) {
        var endpoint = {
            type: 'IMAGERY',
            externalType: type,
            options: options
        };

        spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(endpoint));

        return CesiumIon.createImageryProvider(123890213)
            .then(function(imageryProvider) {
                expect(imageryProvider).toBeInstanceOf(ImageryClass);
            });
    }

    it('createImageryProvider works with ARCGIS_MAPSERVER', function() {
        return testExternalImagery('ARCGIS_MAPSERVER', { url: 'https://test.invalid' }, ArcGisMapServerImageryProvider);
    });

    it('createImageryProvider works with BING', function() {
        return testExternalImagery('BING', { url: 'https://test.invalid' }, BingMapsImageryProvider);
    });

    it('createImageryProvider works with GOOGLE_EARTH', function() {
        return testExternalImagery('GOOGLE_EARTH', { url: 'https://test.invalid', channel: 1 }, GoogleEarthEnterpriseMapsProvider);
    });

    it('createImageryProvider works with MAPBOX', function() {
        return testExternalImagery('MAPBOX', { url: 'https://test.invalid', mapId: 1 }, MapboxImageryProvider);
    });

    it('createImageryProvider works with SINGLE_TILE', function() {
        return testExternalImagery('SINGLE_TILE', { url: 'https://test.invalid' }, SingleTileImageryProvider);
    });

    it('createImageryProvider works with TMS', function() {
        return testExternalImagery('TMS', { url: 'https://test.invalid' }, UrlTemplateImageryProvider);
    });

    it('createImageryProvider works with URL_TEMPLATE', function() {
        return testExternalImagery('URL_TEMPLATE', { url: 'https://test.invalid' }, UrlTemplateImageryProvider);
    });

    it('createImageryProvider works with WMS', function() {
        return testExternalImagery('WMS', { url: 'https://test.invalid', layers: [] }, WebMapServiceImageryProvider);
    });

    it('createImageryProvider works with WMTS', function() {
        return testExternalImagery('WMTS', { url: 'https://test.invalid', layer: '', style: '', tileMatrixSetID: 1 }, WebMapTileServiceImageryProvider);
    });

    it('createImageryProvider rejects with non-imagery', function() {
        var endpoint = {
            type: '3DTILES',
            url: 'https://assets.cesium.com/' + 123890213 + '/tileset.json',
            accessToken: 'not_really_a_refresh_token'
        };

        spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(endpoint));

        return CesiumIon.createImageryProvider(123890213)
            .then(fail)
            .otherwise(function(error){
                expect(error).toBeInstanceOf(RuntimeError);
            });
    });

    it('createImageryProvider rejects unknown external imagery type', function() {
        var endpoint = {
            type: 'IMAGERY',
            externalType: 'TUBALCAIN',
            options: {}
        };

        spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(endpoint));

        return CesiumIon.createImageryProvider(123890213)
            .then(fail)
            .otherwise(function(error){
                expect(error).toBeInstanceOf(RuntimeError);
            });
    });

    describe('CesiumIonResource', function() {
        var assetId = 123890213;
        var endpoint = {
            type: '3DTILES',
            url: 'https://assets.cesium.com/' + assetId + '/tileset.json',
            accessToken: 'not_really_a_refresh_token'
        };

        it('constructs with expected values', function() {
            spyOn(Resource, 'call').and.callThrough();

            var endpointResource = CesiumIon._createEndpointResource(assetId);
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
            var endpointResource = CesiumIon._createEndpointResource(assetId);
            var resource = CesiumIon._CesiumIonResource.create(endpoint, endpointResource);
            var cloned = resource.clone();
            expect(cloned).not.toBe(resource);
            expect(cloned.ionRoot).toBe(resource);
            cloned.ionRoot = undefined;
            expect(cloned).toEqual(resource);
        });

        it('create creates the expected resource', function() {
            var endpointResource = CesiumIon._createEndpointResource(assetId);
            var resource = CesiumIon._CesiumIonResource.create(endpoint, endpointResource);
            expect(resource.getUrlComponent()).toEqual(endpoint.url);
            expect(resource.queryParameters).toEqual({ access_token: 'not_really_a_refresh_token' });
            expect(resource.ionEndpoint).toBe(endpoint);
            expect(resource.ionEndpointResource).toEqual(endpointResource);
            expect(resource.retryCallback).toBeDefined();
            expect(resource.retryAttempts).toBe(1);
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

            it('works with derived resource and sets root access_token', function() {
                var derived = resource.getDerivedResource('1');
                var error = new RequestErrorEvent(401);
                return testCallback(derived, error)
                .then(function(){
                    expect(derived.ionEndpoint).toBe(resource.ionEndpoint);
                    expect(derived.queryParameters.access_token).toEqual(resource.queryParameters.access_token);
                });
            });
        });
    });
});
