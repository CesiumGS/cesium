defineSuite([
        'Scene/BingMapsImageryProvider',
        'Core/appendForwardSlash',
        'Core/DefaultProxy',
        'Core/defined',
        'Core/queryToObject',
        'Core/RequestScheduler',
        'Core/Resource',
        'Core/WebMercatorTilingScheme',
        'Scene/BingMapsStyle',
        'Scene/DiscardMissingTileImagePolicy',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'Specs/pollToPromise',
        'ThirdParty/Uri'
    ], function(
        BingMapsImageryProvider,
        appendForwardSlash,
        DefaultProxy,
        defined,
        queryToObject,
        RequestScheduler,
        Resource,
        WebMercatorTilingScheme,
        BingMapsStyle,
        DiscardMissingTileImagePolicy,
        Imagery,
        ImageryLayer,
        ImageryProvider,
        ImageryState,
        pollToPromise,
        Uri) {
    'use strict';

    beforeEach(function() {
        RequestScheduler.clearForSpecs();
    });

    afterEach(function() {
        Resource._Implementations.loadAndExecuteScript = Resource._DefaultImplementations.loadAndExecuteScript;
        Resource._Implementations.loadAndExecuteScript = Resource._DefaultImplementations.loadAndExecuteScript;
        Resource._Implementations.loadWithXhr = Resource._DefaultImplementations.loadWithXhr;
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

    function createFakeMetadataResponse(mapStyle) {
        var stylePrefix = 'a';
        switch (mapStyle) {
        case BingMapsStyle.AERIAL_WITH_LABELS:
            stylePrefix = 'h';
            break;
        case BingMapsStyle.ROAD:
            stylePrefix = 'r';
            break;
        }

        return {
            'authenticationResultCode' : 'ValidCredentials',
            'brandLogoUri' : 'http:\/\/dev.virtualearth.net\/Branding\/logo_powered_by.png',
            'copyright' : 'Copyright © 2014 Microsoft and its suppliers. All rights reserved. This API cannot be accessed and the content and any results may not be used, reproduced or transmitted in any manner without express written permission from Microsoft Corporation.',
            'resourceSets' : [{
                'estimatedTotal' : 1,
                'resources' : [{
                    '__type' : 'ImageryMetadata:http:\/\/schemas.microsoft.com\/search\/local\/ws\/rest\/v1',
                    'imageHeight' : 256,
                    'imageUrl' : 'http:\/\/ecn.{subdomain}.tiles.virtualearth.net.fake.invalid\/tiles\/' + stylePrefix + '{quadkey}.jpeg?g=3031&mkt={culture}',
                    'imageUrlSubdomains' : ['t0', 't1', 't2', 't3'],
                    'imageWidth' : 256,
                    'imageryProviders' : [{
                        'attribution' : '© 2014 DigitalGlobe',
                        'coverageAreas' : [{
                            'bbox' : [-67, -179.99, 27, 0],
                            'zoomMax' : 21,
                            'zoomMin' : 14
                        }, {
                            'bbox' : [27, -179.99, 87, -126.5],
                            'zoomMax' : 21,
                            'zoomMin' : 14
                        }, {
                            'bbox' : [48.4, -126.5, 87, -5.75],
                            'zoomMax' : 21,
                            'zoomMin' : 14
                        }]
                    }, {
                        'attribution' : 'Image courtesy of NASA',
                        'coverageAreas' : [{
                            'bbox' : [-90, -180, 90, 180],
                            'zoomMax' : 8,
                            'zoomMin' : 1
                        }]
                    }],
                    'vintageEnd' : null,
                    'vintageStart' : null,
                    'zoomMax' : 21,
                    'zoomMin' : 1
                }]
            }],
            'statusCode' : 200,
            'statusDescription' : 'OK',
            'traceId' : 'ea754a48ccdb4dd297c8f35350e0f0d9|BN20130533|02.00.106.1600|'
        };
    }

    function installFakeMetadataRequest(url, mapStyle, proxy) {
        var expectedUri = new Uri('REST/v1/Imagery/Metadata/' + mapStyle).resolve(new Uri(appendForwardSlash(url)));

        Resource._Implementations.loadAndExecuteScript = function(url, functionName) {
            var uri = new Uri(url);
            if (proxy) {
                uri = new Uri(decodeURIComponent(uri.query));
            }

            var query = queryToObject(uri.query);
            expect(query.jsonp).toBeDefined();
            expect(query.incl).toEqual('ImageryProviders');
            expect(query.key).toBeDefined();

            uri.query = undefined;
            expect(uri.toString()).toStartWith(expectedUri.toString());

            setTimeout(function() {
                window[functionName](createFakeMetadataResponse(mapStyle));
            }, 1);
        };
    }

    function installFakeImageRequest(expectedUrl, expectedParams, proxy) {
        Resource._Implementations.createImage = function(url, crossOrigin, deferred) {
            if (/^blob:/.test(url)) {
                // load blob url normally
                Resource._DefaultImplementations.createImage(url, crossOrigin, deferred);
            } else {
                if (defined(expectedUrl)) {
                    var uri = new Uri(url);
                    if (proxy) {
                        uri = new Uri(decodeURIComponent(uri.query));
                    }

                    var query = queryToObject(uri.query);
                    uri.query = undefined;
                    expect(uri.toString()).toEqual(expectedUrl);
                    for(var param in expectedParams) {
                        if (expectedParams.hasOwnProperty(param)) {
                            expect(query[param]).toEqual(expectedParams[param]);
                        }
                    }
                }
                // Just return any old image.
                Resource._DefaultImplementations.createImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            }
        };

        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            if (defined(expectedUrl)) {
                var uri = new Uri(url);
                if (proxy) {
                    uri = new Uri(decodeURIComponent(uri.query));
                }

                var query = queryToObject(uri.query);
                uri.query = undefined;
                expect(uri.toString()).toEqual(expectedUrl);
                for(var param in expectedParams) {
                    if (expectedParams.hasOwnProperty(param)) {
                        expect(query[param]).toEqual(expectedParams[param]);
                    }
                }
            }

            // Just return any old image.
            Resource._DefaultImplementations.loadWithXhr('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
        };
    }

    it('resolves readyPromise', function() {
        var url = 'http://fake.fake.invalid';
        var mapStyle = BingMapsStyle.ROAD;

        installFakeMetadataRequest(url, mapStyle);
        installFakeImageRequest();

        var provider = new BingMapsImageryProvider({
            url : url,
            mapStyle : mapStyle
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('resolves readyPromise with a path', function() {
        var url = 'http://fake.fake.invalid/some/subdirectory';
        var mapStyle = BingMapsStyle.ROAD;

        installFakeMetadataRequest(url, mapStyle);
        installFakeImageRequest();

        var provider = new BingMapsImageryProvider({
            url : url,
            mapStyle : mapStyle
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('resolves readyPromise with a path ending with a slash', function() {
        var url = 'http://fake.fake.invalid/some/subdirectory/';
        var mapStyle = BingMapsStyle.ROAD;

        installFakeMetadataRequest(url, mapStyle);
        installFakeImageRequest();

        var provider = new BingMapsImageryProvider({
            url : url,
            mapStyle : mapStyle
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('resolves readyPromise with Resource', function() {
        var url = 'http://fake.fake.invalid';
        var mapStyle = BingMapsStyle.ROAD;

        installFakeMetadataRequest(url, mapStyle);
        installFakeImageRequest();

        var resource = new Resource({
            url : url
        });

        var provider = new BingMapsImageryProvider({
            url : resource,
            mapStyle : mapStyle
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('rejects readyPromise on error', function() {
        var url = 'http://host.invalid';
        var provider = new BingMapsImageryProvider({
            url : url
        });

        return provider.readyPromise.then(function () {
            fail('should not resolve');
        }).otherwise(function (e) {
            expect(provider.ready).toBe(false);
            expect(e.message).toContain(url);
        });
    });

    it('returns valid value for hasAlphaChannel', function() {
        var url = 'http://fake.fake.invalid';
        var mapStyle = BingMapsStyle.AERIAL;

        installFakeMetadataRequest(url, mapStyle);
        installFakeImageRequest();

        var provider = new BingMapsImageryProvider({
            url : url,
            mapStyle : mapStyle
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('can provide a root tile', function() {
        var url = 'http://fake.fake.invalid';
        var mapStyle = BingMapsStyle.ROAD;

        installFakeMetadataRequest(url, mapStyle);
        installFakeImageRequest();

        var provider = new BingMapsImageryProvider({
            url : url,
            mapStyle : mapStyle,
            key: 'fake Key'
        });

        expect(provider.url).toStartWith(url);
        expect(provider.key).toBeDefined();
        expect(provider.mapStyle).toEqual(mapStyle);

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toEqual(20);
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.tileDiscardPolicy).toBeInstanceOf(DiscardMissingTileImagePolicy);
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
            expect(provider.credit).toBeInstanceOf(Object);

            installFakeImageRequest('http://ecn.t0.tiles.virtualearth.net.fake.invalid/tiles/r0.jpeg', {
                g : '3031',
                mkt : ''
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('sets correct culture in tile requests', function() {
        var url = 'http://fake.fake.invalid';
        var mapStyle = BingMapsStyle.AERIAL_WITH_LABELS;

        installFakeMetadataRequest(url, mapStyle);
        installFakeImageRequest();

        var culture = 'ja-jp';

        var provider = new BingMapsImageryProvider({
            url : url,
            mapStyle : mapStyle,
            culture : culture
        });

        expect(provider.culture).toEqual(culture);

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            installFakeImageRequest('http://ecn.t0.tiles.virtualearth.net.fake.invalid/tiles/h0.jpeg', {
                g: '3031',
                mkt: 'ja-jp'
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('raises error on invalid url', function() {
        var url = 'http://host.invalid';
        var provider = new BingMapsImageryProvider({
            url : url
        });

        var errorEventRaised = false;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.message).toContain(url);
            errorEventRaised = true;
        });

        return pollToPromise(function() {
            return provider.ready || errorEventRaised;
        }).then(function() {
            expect(provider.ready).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });

    it('raises error event when image cannot be loaded', function() {
        var url = 'http://foo.bar.invalid';
        var mapStyle = BingMapsStyle.ROAD;

        installFakeMetadataRequest(url, mapStyle);
        installFakeImageRequest();

        var provider = new BingMapsImageryProvider({
            url : url,
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
            setTimeout(function() {
                RequestScheduler.update();
            }, 1);
        });

        Resource._Implementations.createImage = function(url, crossOrigin, deferred) {
            if (/^blob:/.test(url)) {
                // load blob url normally
                Resource._DefaultImplementations.createImage(url, crossOrigin, deferred);
            } else if (tries === 2) {
                // Succeed after 2 tries
                Resource._DefaultImplementations.createImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            } else {
                // fail
                setTimeout(function() {
                    deferred.reject();
                }, 1);
            }
        };

        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            if (tries === 2) {
                // Succeed after 2 tries
                Resource._DefaultImplementations.loadWithXhr('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            } else {
                // fail
                setTimeout(function() {
                    deferred.reject();
                }, 1);
            }
        };

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            var imagery = new Imagery(layer, 0, 0, 0);
            imagery.addReference();
            layer._requestImagery(imagery);
            RequestScheduler.update();

            return pollToPromise(function() {
                return imagery.state === ImageryState.RECEIVED;
            }).then(function() {
                expect(imagery.image).toBeInstanceOf(Image);
                expect(tries).toEqual(2);
                imagery.releaseReference();
            });
        });
    });
});
