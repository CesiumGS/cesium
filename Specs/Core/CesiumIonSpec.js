defineSuite([
        'Core/CesiumIon',
        'Core/CesiumIonResource',
        'Core/RuntimeError',
        'Core/Resource',
        'ThirdParty/when'
    ], function(
        CesiumIon,
        CesiumIonResource,
        RuntimeError,
        Resource,
        when) {
    'use strict';

    it('createResource calls CesiumIonResource.create for non-external endpoint with expected parameters', function() {
        var tilesAssetId = 123890213;
        var tilesEndpoint = {
            type: '3DTILES',
            url: 'https://assets.cesium.com/' + tilesAssetId + '/tileset.json',
            accessToken: 'not_really_a_refresh_token',
            attributions: []
        };

        var options = {};
        var resourceEndpoint = CesiumIon._createEndpointResource(tilesAssetId, options);
        var expectedResource = CesiumIonResource.create(tilesEndpoint, resourceEndpoint);

        spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(tilesEndpoint));
        spyOn(CesiumIon, '_createEndpointResource').and.returnValue(resourceEndpoint);
        spyOn(CesiumIonResource, 'create').and.returnValue(expectedResource);

        return CesiumIon.createResource(tilesAssetId, options)
            .then(function(resource) {
                expect(resource).toBe(expectedResource);
                expect(CesiumIon._createEndpointResource).toHaveBeenCalledWith(tilesAssetId, options);
                expect(CesiumIon._loadJson(resourceEndpoint));
                expect(CesiumIonResource.create).toHaveBeenCalledWith(tilesEndpoint, resourceEndpoint);
            });
    });

    function testNonImageryExternalResource(externalEndpoint) {
        spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(externalEndpoint));
        spyOn(CesiumIonResource, 'create');

        return CesiumIon.createResource(123890213)
            .then(function(resource) {
                expect(resource).toBeInstanceOf(Resource);
                expect(resource).not.toBeInstanceOf(CesiumIonResource);
                expect(resource.url).toEqual(externalEndpoint.options.url);
            });
    }

    it('createResource returns basic Resource for external 3D tilesets', function() {
        return testNonImageryExternalResource({
            type: '3DTILES',
            externalType: '3DTILES',
            options: { url: 'https://test.invalid/tileset.json' },
            attributions: []
        });
    });

    it('createResource returns basic Resource for external 3D tilesets', function() {
        return testNonImageryExternalResource({
            type: 'TERRAIN',
            externalType: 'STK_TERRAIN_SERVER',
            options: { url: 'https://test.invalid/world' },
            attributions: []
        });
    });

    it('createResource rejects for external imagery', function() {
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
        var resource = CesiumIon._createEndpointResource(assetId);
        expect(resource.url).toBe(CesiumIon.defaultServerUrl + '/v1/assets/' + assetId + '/endpoint?access_token=' + CesiumIon.defaultAccessToken);
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
});
