defineSuite([
    'Core/IonResource',
    'Core/Ion',
    'Core/RequestErrorEvent',
    'Core/Resource',
    'Core/RuntimeError',
    'ThirdParty/when'
], function(
    IonResource,
    Ion,
    RequestErrorEvent,
    Resource,
    RuntimeError,
    when) {
'use strict';

    var assetId = 123890213;
    var endpoint = {
        type: '3DTILES',
        url: 'https://assets.cesium.com/' + assetId + '/tileset.json',
        accessToken: 'not_really_a_refresh_token',
        attributions: []
    };

    it('constructs with expected values', function() {
        spyOn(Resource, 'call').and.callThrough();

        var endpointResource = IonResource._createEndpointResource(assetId);
        var resource = new IonResource(endpoint, endpointResource);
        expect(resource).toBeInstanceOf(Resource);
        expect(resource._ionEndpoint).toEqual(endpoint);
        expect(Resource.call).toHaveBeenCalledWith(resource, {
            url: endpoint.url,
            retryCallback: resource.retryCallback,
            retryAttempts: 1,
            queryParameters: { access_token: endpoint.accessToken }
        });
    });

    it('clone works', function() {
        var endpointResource = IonResource._createEndpointResource(assetId);
        var resource = new IonResource(endpoint, endpointResource);
        var cloned = resource.clone();
        expect(cloned).not.toBe(resource);
        expect(cloned._ionRoot).toBe(resource);
        cloned._ionRoot = undefined;
        expect(cloned.retryCallback).toBe(resource.retryCallback);
        expect(cloned.queryParameters.access_token).toBe(resource.queryParameters.access_token);
        expect(cloned).toEqual(resource);
    });

    it('create creates the expected resource', function() {
        var endpointResource = IonResource._createEndpointResource(assetId);
        var resource = new IonResource(endpoint, endpointResource);
        expect(resource.getUrlComponent()).toEqual(endpoint.url);
        expect(resource.queryParameters).toEqual({ access_token: 'not_really_a_refresh_token' });
        expect(resource._ionEndpoint).toBe(endpoint);
        expect(resource._ionEndpointResource).toEqual(endpointResource);
        expect(resource.retryCallback).toBeDefined();
        expect(resource.retryAttempts).toBe(1);
    });

    it('fromAssetId calls constructor for non-external endpoint with expected parameters', function() {
        var tilesAssetId = 123890213;
        var tilesEndpoint = {
            type: '3DTILES',
            url: 'https://assets.cesium.com/' + tilesAssetId + '/tileset.json',
            accessToken: 'not_really_a_refresh_token',
            attributions: []
        };

        var options = {};
        var resourceEndpoint = IonResource._createEndpointResource(tilesAssetId, options);
        spyOn(IonResource, '_createEndpointResource').and.returnValue(resourceEndpoint);
        spyOn(resourceEndpoint, 'fetchJson').and.returnValue(when.resolve(tilesEndpoint));

        return IonResource.fromAssetId(tilesAssetId, options)
            .then(function(resource) {
                expect(IonResource._createEndpointResource).toHaveBeenCalledWith(tilesAssetId, options);
                expect(resourceEndpoint.fetchJson).toHaveBeenCalled();
                expect(resource._ionEndpointResource).toEqual(resourceEndpoint);
                expect(resource._ionEndpoint).toEqual(tilesEndpoint);
            });
    });

    function testNonImageryExternalResource(externalEndpoint) {
        var resourceEndpoint = IonResource._createEndpointResource(123890213);
        spyOn(IonResource, '_createEndpointResource').and.returnValue(resourceEndpoint);
        spyOn(resourceEndpoint, 'fetchJson').and.returnValue(when.resolve(externalEndpoint));

        return IonResource.fromAssetId(123890213)
            .then(function(resource) {
                expect(resource.url).toEqual(externalEndpoint.options.url);
                expect(resource.queryParameters.access_token).toBeUndefined();
                expect(resource.retryCallback).toBeUndefined();
            });
    }

    it('fromAssetId returns basic Resource for external 3D tilesets', function() {
        return testNonImageryExternalResource({
            type: '3DTILES',
            externalType: '3DTILES',
            options: { url: 'https://test.invalid/tileset.json' },
            attributions: []
        });
    });

    it('fromAssetId returns basic Resource for external 3D tilesets', function() {
        return testNonImageryExternalResource({
            type: 'TERRAIN',
            externalType: 'STK_TERRAIN_SERVER',
            options: { url: 'https://test.invalid/world' },
            attributions: []
        });
    });

    it('fromAssetId rejects for external imagery', function() {
        return testNonImageryExternalResource({
            type: 'IMAGERY',
            externalType: 'URL_TEMPLATE',
            url: 'https://test.invalid/world',
            attributions: []
        })
        .then(fail)
        .otherwise(function(e) {
            expect(e).toBeInstanceOf(RuntimeError);
        });
    });

    it('createEndpointResource creates expected values with default parameters', function() {
        var assetId = 2348234;
        var resource = IonResource._createEndpointResource(assetId);
        expect(resource.url).toBe(Ion.defaultServer.url + 'v1/assets/' + assetId + '/endpoint?access_token=' + Ion.defaultAccessToken);
    });

    it('createEndpointResource creates expected values with overridden options', function() {
        var serverUrl = 'https://api.cesium.test/';
        var accessToken = 'not_a_token';

        var assetId = 2348234;
        var resource = IonResource._createEndpointResource(assetId, { server: serverUrl, accessToken: accessToken });
        expect(resource.url).toBe(serverUrl + 'v1/assets/' + assetId + '/endpoint?access_token=' + accessToken);
    });

    it('createEndpointResource creates expected values with overridden defaults', function() {
        var defaultServer = Ion.defaultServer;
        var defaultAccessToken = Ion.defaultAccessToken;

        Ion.defaultServer = new Resource({ url: 'https://api.cesium.test/' });
        Ion.defaultAccessToken = 'not_a_token';

        var assetId = 2348234;
        var resource = IonResource._createEndpointResource(assetId);
        expect(resource.url).toBe(Ion.defaultServer.url + 'v1/assets/' + assetId + '/endpoint?access_token=' + Ion.defaultAccessToken);

        Ion.defaultServer = defaultServer;
        Ion.defaultAccessToken = defaultAccessToken;
    });

    describe('retryCallback', function() {
        var endpointResource;
        var resource;
        var retryCallback;

        beforeEach(function() {
            endpointResource = new Resource({ url: 'https://api.test.invalid', access_token: 'not_the_token' });
            resource = new IonResource(endpoint, endpointResource);
            retryCallback = resource.retryCallback;
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
            spyOn(endpointResource, 'fetchJson').and.returnValue(deferred.promise);

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

            expect(endpointResource.fetchJson).toHaveBeenCalledWith();

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
                expect(derived._ionEndpoint).toBe(resource._ionEndpoint);
                expect(derived.queryParameters.access_token).toEqual(resource.queryParameters.access_token);
            });
        });
    });
});
