defineSuite([
    'Scene/CesiumIonResource',
    'Core/RequestErrorEvent',
    'Core/Resource',
    'Scene/CesiumIon',
    'ThirdParty/when'
], function(
    CesiumIonResource,
    RequestErrorEvent,
    Resource,
    CesiumIon,
    when) {
'use strict';

    var assetId = 123890213;
    var endpoint = {
        type: '3DTILES',
        url: 'https://assets.cesium.com/' + assetId + '/tileset.json',
        accessToken: 'not_really_a_refresh_token'
    };

    it('constructs with expected values', function() {
        spyOn(Resource, 'call').and.callThrough();

        var endpointResource = CesiumIon._createEndpointResource(assetId);
        var resource = CesiumIonResource.create(endpoint, endpointResource);
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
        var resource = CesiumIonResource.create(endpoint, endpointResource);
        var cloned = resource.clone();
        expect(cloned).not.toBe(resource);
        expect(cloned.ionRoot).toBe(resource);
        cloned.ionRoot = undefined;
        expect(cloned).toEqual(resource);
    });

    it('create creates the expected resource', function() {
        var endpointResource = CesiumIon._createEndpointResource(assetId);
        var resource = CesiumIonResource.create(endpoint, endpointResource);
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
            resource = CesiumIonResource.create(endpoint, endpointResource);
            retryCallback = CesiumIonResource._createRetryCallback(endpoint, endpointResource, resource);
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
            spyOn(CesiumIonResource, '_loadJson').and.returnValue(deferred.promise);

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

            expect(CesiumIonResource._loadJson).toHaveBeenCalledWith(endpointResource);

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
