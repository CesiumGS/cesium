/*global defineSuite*/
defineSuite([
        'Scene/BingMapsImageryProvider',
        'Core/DefaultProxy',
        'Core/defined',
        'Core/jsonp',
        'Core/loadImage',
        'Core/loadWithXhr',
        'Core/WebMercatorTilingScheme',
        'Scene/BingMapsStyle',
        'Scene/DiscardMissingTileImagePolicy',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'ThirdParty/when'
    ], function(
        BingMapsImageryProvider,
        DefaultProxy,
        defined,
        jsonp,
        loadImage,
        loadWithXhr,
        WebMercatorTilingScheme,
        BingMapsStyle,
        DiscardMissingTileImagePolicy,
        Imagery,
        ImageryLayer,
        ImageryProvider,
        ImageryState,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    afterEach(function() {
        jsonp.loadAndExecuteScript = jsonp.defaultLoadAndExecuteScript;
        loadImage.createImage = loadImage.defaultCreateImage;
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    it('tileXYToQuadKey works for examples in Bing Maps documentation', function() {
        // http://msdn.microsoft.com/en-us/library/bb259689.aspx
        // Levels are off by one compared to the documentation because our levels
        // start at 0 while Bing's start at 1.
        expect(BingMapsImageryProvider.tileXYToQuadKey(1, 0, 0)).toEqual('1');
        expect(BingMapsImageryProvider.tileXYToQuadKey(1, 2, 1)).toEqual('21');
        expect(BingMapsImageryProvider.tileXYToQuadKey(3, 5, 2)).toEqual('213');
        expect(BingMapsImageryProvider.tileXYToQuadKey(4, 7, 2)).toEqual('322');
    });

    it('quadKeyToTileXY works for examples in Bing Maps documentation', function() {
        expect(BingMapsImageryProvider.quadKeyToTileXY('1')).toEqual({
            x : 1,
            y : 0,
            level : 0
        });
        expect(BingMapsImageryProvider.quadKeyToTileXY('21')).toEqual({
            x : 1,
            y : 2,
            level : 1
        });
        expect(BingMapsImageryProvider.quadKeyToTileXY('213')).toEqual({
            x : 3,
            y : 5,
            level : 2
        });
        expect(BingMapsImageryProvider.quadKeyToTileXY('322')).toEqual({
            x : 4,
            y : 7,
            level : 2
        });
    });

    it('conforms to ImageryProvider interface', function() {
        expect(BingMapsImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('constructor throws when url is not specified', function() {
        function constructWithoutServer() {
            return new BingMapsImageryProvider({
                mapStyle : BingMapsStyle.AERIAL
            });
        }
        expect(constructWithoutServer).toThrowDeveloperError();
    });

    it('returns valid value for hasAlphaChannel', function() {
        var url = 'http://fake.fake.invalid';
        var mapStyle = BingMapsStyle.COLLINS_BART;
        var metadataUrl = url + '/REST/v1/Imagery/Metadata/' + mapStyle + '?incl=ImageryProviders&key=';

        jsonp.loadAndExecuteScript = function(url, functionName) {
            expect(url.indexOf(metadataUrl) === 0).toEqual(true);
            setTimeout(function() {
                window[functionName]({
                    "authenticationResultCode" : "ValidCredentials",
                    "brandLogoUri" : "http:\/\/dev.virtualearth.net\/Branding\/logo_powered_by.png",
                    "copyright" : "Copyright © 2012 Microsoft and its suppliers. All rights reserved. This API cannot be accessed and the content and any results may not be used, reproduced or transmitted in any manner without express written permission from Microsoft Corporation.",
                    "resourceSets" : [{
                        "estimatedTotal" : 1,
                        "resources" : [{
                            "__type" : "ImageryMetadata:http:\/\/schemas.microsoft.com\/search\/local\/ws\/rest\/v1",
                            "imageHeight" : 256,
                            "imageUrl" : "http:\/\/fake.{subdomain}.tiles.fake.invalid\/tiles\/r{quadkey}?g=1062&lbl=l1&productSet=mmCB",
                            "imageUrlSubdomains" : ["t0"],
                            "imageWidth" : 256,
                            "imageryProviders" : null,
                            "vintageEnd" : null,
                            "vintageStart" : null,
                            "zoomMax" : 21,
                            "zoomMin" : 1
                        }]
                    }],
                    "statusCode" : 200,
                    "statusDescription" : "OK",
                    "traceId" : "c9cf8c74a8b24644974288c92e448972|EWRM003311|02.00.171.2600|"
                });
            }, 1);
        };

        var provider = new BingMapsImageryProvider({
            url : url,
            mapStyle : mapStyle
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('can provide a root tile', function() {
        var url = 'http://fake.fake.invalid';
        var mapStyle = BingMapsStyle.COLLINS_BART;
        var metadataUrl = url + '/REST/v1/Imagery/Metadata/' + mapStyle + '?incl=ImageryProviders&key=';

        jsonp.loadAndExecuteScript = function(url, functionName) {
            expect(url.indexOf(metadataUrl) === 0).toEqual(true);
            setTimeout(function() {
                window[functionName]({
                    "authenticationResultCode" : "ValidCredentials",
                    "brandLogoUri" : "http:\/\/dev.virtualearth.net\/Branding\/logo_powered_by.png",
                    "copyright" : "Copyright © 2012 Microsoft and its suppliers. All rights reserved. This API cannot be accessed and the content and any results may not be used, reproduced or transmitted in any manner without express written permission from Microsoft Corporation.",
                    "resourceSets" : [{
                        "estimatedTotal" : 1,
                        "resources" : [{
                            "__type" : "ImageryMetadata:http:\/\/schemas.microsoft.com\/search\/local\/ws\/rest\/v1",
                            "imageHeight" : 256,
                            "imageUrl" : "http:\/\/fake.{subdomain}.tiles.fake.invalid\/tiles\/r{quadkey}?g=1062&lbl=l1&productSet=mmCB",
                            "imageUrlSubdomains" : ["t0"],
                            "imageWidth" : 256,
                            "imageryProviders" : null,
                            "vintageEnd" : null,
                            "vintageStart" : null,
                            "zoomMax" : 21,
                            "zoomMin" : 1
                        }]
                    }],
                    "statusCode" : 200,
                    "statusDescription" : "OK",
                    "traceId" : "c9cf8c74a8b24644974288c92e448972|EWRM003311|02.00.171.2600|"
                });
            }, 1);
        };

        var provider = new BingMapsImageryProvider({
            url : url,
            mapStyle : mapStyle
        });

        expect(provider.url).toEqual(url);
        expect(provider.key).toBeDefined();
        expect(provider.mapStyle).toEqual(mapStyle);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toEqual(20);
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.tileDiscardPolicy).toBeInstanceOf(DiscardMissingTileImagePolicy);
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
        });

        waitsFor(function() {
            return defined(provider.credit);
        }, 'logo to become ready');

        runs(function() {
            expect(provider.credit).toBeInstanceOf(Object);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                if (url.indexOf('blob:') !== 0) {
                    expect(url).toEqual('http://fake.t0.tiles.fake.invalid/tiles/r0?g=1062&lbl=l1&productSet=mmCB');
                }

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual('http://fake.t0.tiles.fake.invalid/tiles/r0?g=1062&lbl=l1&productSet=mmCB');

                // Just return any old image.
                return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            when(provider.requestImage(0, 0, 0), function(image) {
                tile000Image = image;
            });
        });

        waitsFor(function() {
            return defined(tile000Image);
        }, 'requested tile to be loaded');

        runs(function() {
            expect(tile000Image).toBeInstanceOf(Image);
        });
    });

    it('routes requests through a proxy if one is specified', function() {
        var url = 'http://foo.bar.invalid';
        var mapStyle = BingMapsStyle.COLLINS_BART;
        var metadataUrl = url + '/REST/v1/Imagery/Metadata/' + mapStyle + '?incl=ImageryProviders&key=';
        var proxy = new DefaultProxy('/proxy/');

        jsonp.loadAndExecuteScript = function(url, functionName) {
            expect(url.indexOf(proxy.getURL(metadataUrl)) === 0).toEqual(true);
            setTimeout(function() {
                window[functionName]({
                    "authenticationResultCode" : "ValidCredentials",
                    "brandLogoUri" : "http:\/\/dev.virtualearth.net\/Branding\/logo_powered_by.png",
                    "copyright" : "Copyright © 2012 Microsoft and its suppliers. All rights reserved. This API cannot be accessed and the content and any results may not be used, reproduced or transmitted in any manner without express written permission from Microsoft Corporation.",
                    "resourceSets" : [{
                        "estimatedTotal" : 1,
                        "resources" : [{
                            "__type" : "ImageryMetadata:http:\/\/schemas.microsoft.com\/search\/local\/ws\/rest\/v1",
                            "imageHeight" : 256,
                            "imageUrl" : "http:\/\/ecn.{subdomain}.tiles.virtualearth.net\/tiles\/r{quadkey}?g=1062&lbl=l1&productSet=mmCB",
                            "imageUrlSubdomains" : ["t0"],
                            "imageWidth" : 256,
                            "imageryProviders" : null,
                            "vintageEnd" : null,
                            "vintageStart" : null,
                            "zoomMax" : 21,
                            "zoomMin" : 1
                        }]
                    }],
                    "statusCode" : 200,
                    "statusDescription" : "OK",
                    "traceId" : "c9cf8c74a8b24644974288c92e448972|EWRM003311|02.00.171.2600|"
                });
            }, 1);
        };

        var provider = new BingMapsImageryProvider({
            url : 'http://foo.bar.invalid',
            mapStyle : mapStyle,
            proxy : proxy
        });

        expect(provider.url).toEqual(url);
        expect(provider.proxy).toEqual(proxy);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            loadImage.createImage = function(url, crossOrigin, deferred) {
                if (url.indexOf('blob:') !== 0) {
                    expect(url).toEqual(proxy.getURL('http://ecn.t0.tiles.virtualearth.net/tiles/r0?g=1062&lbl=l1&productSet=mmCB'));
                }

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual(proxy.getURL('http://ecn.t0.tiles.virtualearth.net/tiles/r0?g=1062&lbl=l1&productSet=mmCB'));

                // Just return any old image.
                return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            when(provider.requestImage(0, 0, 0), function(image) {
                tile000Image = image;
            });
        });

        waitsFor(function() {
            return defined(tile000Image);
        }, 'requested tile to be loaded');

        runs(function() {
            expect(tile000Image).toBeInstanceOf(Image);
        });
    });

    it('raises error on invalid url', function() {
        var url = 'host.invalid';
        var provider = new BingMapsImageryProvider({
            url : url
        });

        var errorEventRaised = false;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.message.indexOf(url) >= 0).toEqual(true);
            errorEventRaised = true;
        });

        waitsFor(function() {
            return provider.ready || errorEventRaised;
        }, 'imagery provider to become ready or raise error event');

        runs(function() {
            expect(provider.ready).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });

    it('raises error event when image cannot be loaded', function() {
        var mapStyle = BingMapsStyle.COLLINS_BART;

        jsonp.loadAndExecuteScript = function(url, functionName) {
            window[functionName]({
                "authenticationResultCode" : "ValidCredentials",
                "brandLogoUri" : "http:\/\/dev.virtualearth.net\/Branding\/logo_powered_by.png",
                "copyright" : "Copyright © 2012 Microsoft and its suppliers. All rights reserved. This API cannot be accessed and the content and any results may not be used, reproduced or transmitted in any manner without express written permission from Microsoft Corporation.",
                "resourceSets" : [{
                    "estimatedTotal" : 1,
                    "resources" : [{
                        "__type" : "ImageryMetadata:http:\/\/schemas.microsoft.com\/search\/local\/ws\/rest\/v1",
                        "imageHeight" : 256,
                        "imageUrl" : "http:\/\/invalid.{subdomain}.invalid\/tiles\/r{quadkey}?g=1062&lbl=l1&productSet=mmCB",
                        "imageUrlSubdomains" : ["t0"],
                        "imageWidth" : 256,
                        "imageryProviders" : null,
                        "vintageEnd" : null,
                        "vintageStart" : null,
                        "zoomMax" : 21,
                        "zoomMin" : 1
                    }]
                }],
                "statusCode" : 200,
                "statusDescription" : "OK",
                "traceId" : "c9cf8c74a8b24644974288c92e448972|EWRM003311|02.00.171.2600|"
            });
        };

        var provider = new BingMapsImageryProvider({
            url : 'host.invalid',
            mapStyle : mapStyle
        });

        var layer = new ImageryLayer(provider);

        var tries = 0;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.timesRetried).toEqual(tries);
            ++tries;
            if (tries < 3) {
                error.retry = true;
            }
        });

        loadImage.createImage = function(url, crossOrigin, deferred) {
            // Succeed after 2 tries
            if (url.indexOf('blob:') !== 0 && tries === 2) {
                // valid URL
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            }

            // invalid URL
            return loadImage.defaultCreateImage(url, crossOrigin, deferred);
        };

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            // Succeed after 2 tries
            if (tries === 2) {
                // valid URL
                return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            }

            // invalid URL
            return loadWithXhr.defaultLoad(url, responseType, method, data, headers, deferred, overrideMimeType);
        };

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var imagery;
        runs(function() {
            imagery = new Imagery(layer, 0, 0, 0);
            imagery.addReference();
            layer._requestImagery(imagery);
        });

        waitsFor(function() {
            return imagery.state === ImageryState.RECEIVED;
        }, 'image to load');

        runs(function() {
            expect(imagery.image).toBeInstanceOf(Image);
            expect(tries).toEqual(2);
            imagery.releaseReference();
        });
    });
});