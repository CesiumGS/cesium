defineSuite([
        'Scene/CesiumIon',
        'Core/loadImage',
        'Core/loadJsonp',
        'Core/loadWithXhr',
        'Core/RuntimeError',
        'Core/RequestErrorEvent',
        'Core/Resource',
        'Scene/ArcGisMapServerImageryProvider',
        'Scene/BingMapsImageryProvider',
        'Scene/Cesium3DTileset',
        'Scene/CesiumIonResource',
        'Scene/GoogleEarthEnterpriseMapsProvider',
        'Scene/MapboxImageryProvider',
        'Scene/SingleTileImageryProvider',
        'Scene/UrlTemplateImageryProvider',
        'Scene/WebMapServiceImageryProvider',
        'Scene/WebMapTileServiceImageryProvider',
        'ThirdParty/when'
    ], function(
        CesiumIon,
        loadImage,
        loadJsonp,
        loadWithXhr,
        RuntimeError,
        RequestErrorEvent,
        Resource,
        ArcGisMapServerImageryProvider,
        BingMapsImageryProvider,
        Cesium3DTileset,
        CesiumIonResource,
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
        spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function(url, name, deffered) {
            deffered.resolve({ resourceSets: [{ resources: [{ imageUrl: '', imageUrlSubdomains: [], zoomMax: 0 }] }] });
        });
        return testExternalImagery('ARCGIS_MAPSERVER', { url: 'https://test.invalid' }, ArcGisMapServerImageryProvider);
    });

    it('createImageryProvider works with BING', function() {
        spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function(url, name, deffered) {
            deffered.resolve({ resourceSets: [{ resources: [{ imageUrl: '', imageUrlSubdomains: [], zoomMax: 0 }] }] });
        });
        return testExternalImagery('BING', { url: 'https://test.invalid' }, BingMapsImageryProvider);
    });

    it('createImageryProvider works with GOOGLE_EARTH', function() {
        spyOn(loadWithXhr, 'load').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            deferred.resolve(JSON.stringify({ layers: [{ id: 0, version: '' }] }));
        });

        return testExternalImagery('GOOGLE_EARTH', { url: 'https://test.invalid', channel: 0 }, GoogleEarthEnterpriseMapsProvider);
    });

    it('createImageryProvider works with MAPBOX', function() {
        return testExternalImagery('MAPBOX', { url: 'https://test.invalid', mapId: 1 }, MapboxImageryProvider);
    });

    it('createImageryProvider works with SINGLE_TILE', function() {
        spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
            deferred.resolve({});
        });

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

    function load3DTileset(endpoint, options) {
        spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(endpoint));
        spyOn(Cesium3DTileset, 'loadJson').and.returnValue(when.resolve({ asset: { version: '0.0' }, root: { content: {} } }));
        spyOn(Cesium3DTileset.prototype, 'loadTileset').and.returnValue(when.resolve({ content: {} }));

        return CesiumIon.create3DTileset(123890213, options);
    }

    it('create3DTileset works with non-external tileset', function() {
        var endpoint = {
            type: '3DTILES',
            url: 'https://test.invalid/',
            accessToken: 'not_really_a_refresh_token'
        };

        return load3DTileset(endpoint)
            .then(function(tileset) {
                expect(tileset.show).toBe(true);
                expect(tileset.url).toBe(endpoint.url + '?access_token=' + endpoint.accessToken);
            });
    });

    it('create3DTileset works with external tileset', function() {
        var endpoint = {
            type: '3DTILES',
            externalType: '3DTILES',
            options: { url: 'https://test.invalid/' }
        };

        return load3DTileset(endpoint, { tilesetOptions: { show: false } })
            .then(function(tileset) {
                expect(tileset.url).toBe(endpoint.options.url);
            });
    });

    it('create3DTileset passes options tileset', function() {
        var endpoint = {
            type: '3DTILES',
            url: 'https://test.invalid/',
            accessToken: 'not_really_a_refresh_token'
        };

        return load3DTileset(endpoint, { tilesetOptions: { show: false } })
            .then(function(tileset) {
                expect(tileset.show).toBe(false);
            });
    });

    it('create3DTileset rejects with non 3DTiles asset', function() {
        var endpoint = {
            type: 'IMAGERY',
            url: 'https://assets.cesium.com/' + 123890213 + '/',
            accessToken: 'not_really_a_refresh_token'
        };

        spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(endpoint));

        return CesiumIon.create3DTileset(123890213)
            .then(fail)
            .otherwise(function(error){
                expect(error).toBeInstanceOf(RuntimeError);
            });
    });

    it('create3DTileset rejects unknown external type', function() {
        var endpoint = {
            type: '3DTILES',
            externalType: 'TUBALCAIN',
            options: {}
        };

        spyOn(CesiumIon, '_loadJson').and.returnValue(when.resolve(endpoint));

        return CesiumIon.create3DTileset(123890213)
            .then(fail)
            .otherwise(function(error){
                expect(error).toBeInstanceOf(RuntimeError);
            });
    });
});
