defineSuite([
        'Scene/HereMapsImageryProvider',
        'Core/RequestScheduler',
        'Core/Resource',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'ThirdParty/Uri',
        'Specs/pollToPromise',
        'Core/WebMercatorTilingScheme',
        'Core/defined',
        'Core/DefaultProxy',
        'Core/queryToObject'
    ], function(
        HereMapsImageryProvider,
        RequestScheduler,
        Resource,
        Imagery,
        ImageryLayer,
        ImageryProvider,
        ImageryState,
        Uri,
        pollToPromise,
        WebMercatorTilingScheme,
        defined,
        DefaultProxy,
        queryToObject) {
    'use strict';

    beforeEach(function() {
        RequestScheduler.clearForSpecs();
    });

    afterEach(function() {
        Resource._Implementations.loadAndExecuteScript = Resource._DefaultImplementations.loadAndExecuteScript;
        Resource._Implementations.loadAndExecuteScript = Resource._DefaultImplementations.loadAndExecuteScript;
        Resource._Implementations.loadWithXhr = Resource._DefaultImplementations.loadWithXhr;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(HereMapsImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('constructor throws when api info is not specified', function() {
        function constructWithoutApiInfo() {
            return new HereMapsImageryProvider({
                scheme: "satellite.day"
            });
        }
        expect(constructWithoutApiInfo).toThrowDeveloperError();
    });

    function createFakeCopyrightResponse() {
        var obj = {
            "hybrid":
                [
                    {
                        "minLevel": 0,
                        "maxLevel": 20,
                        "label": "2014 DigitalGlobe",
                        "alt": "copyright 2014 DigitalGlobe, Inc."
                    },
                    {
                        "minLevel": 10,
                        "maxLevel": 20,
                        "label": "Navteq",
                        "alt": "Navteq",
                        "boxes":
                            [
                                [-26.8359,  30.8723,    -25.6938,   32.1739],
                                [-27.0738,  30.7201,    -26.2624,   31.5422],
                                [-27.3832,  30.9615,    -26.5576,   32.0286],
                                [-27.3403,  31.4364,    -26.7719,   32.0286],
                                [-26.8455,  32.0275,    -26.7719,   32.1475]
                            ]
                    },
                    {
                        "minLevel": 6,
                        "maxLevel": 20,
                        "label": "PSMA",
                        "alt": "Copyright. Based on data provided under license from PSMA Australia Limited. Product incorporates data which is 2014 Telstra Corporation Limited, GM Holden Limited, Intelematics Australia Pty Ltd, HERE International LLC, Sentinel Content Pty Limited and Continental Pty Ltd",
                        "boxes":
                            [
                                [-13.1672,  95.8626,    -11.1672,   97.8626],
                                [-11.5539,  104.6728,   -9.5539,    106.6728],
                                [-32.5901,  158.0863,   -30.5901,   160.0863],
                                [-30.0761,  167.0381,   -28.0761,   169.0381],
                                [-32,   113,    -20,    151],
                                [-38,   135,    -32,    151],
                                [-20,   123,    -14,    147],
                                [-20,   121,    -16,    123],
                                [-14,   129,    -10,    137],
                                [-14,   141,    -8, 145],
                                [-36,   115,    -32,    127],
                                [-44,   141,    -38,    149],
                                [-34,   127,    -32,    135],
                                [-34,   151,    -24,    155]
                            ]
                    }
                ],
            "satellite":
                [
                    {
                        "minLevel": 0,
                        "maxLevel": 20,
                        "label": "2014 DigitalGlobe",
                        "alt": "copyright 2014 DigitalGlobe, Inc."
                    },
                    {
                        "minLevel": 10,
                        "maxLevel": 20,
                        "label": "Navteq",
                        "alt": "Navteq",
                        "boxes":
                            [
                                [-26.8359,  30.8723,    -25.6938,   32.1739],
                                [-27.0738,  30.7201,    -26.2624,   31.5422],
                                [-27.3832,  30.9615,    -26.5576,   32.0286],
                                [-27.3403,  31.4364,    -26.7719,   32.0286],
                                [-26.8455,  32.0275,    -26.7719,   32.1475]
                            ]
                    },
                    {
                        "minLevel": 6,
                        "maxLevel": 20,
                        "label": "PSMA",
                        "alt": "Copyright. Based on data provided under license from PSMA Australia Limited. Product incorporates data which is 2014 Telstra Corporation Limited, GM Holden Limited, Intelematics Australia Pty Ltd, HERE International LLC, Sentinel Content Pty Limited and Continental Pty Ltd",
                        "boxes":
                            [
                                [-13.1672,  95.8626,    -11.1672,   97.8626],
                                [-11.5539,  104.6728,   -9.5539,    106.6728],
                                [-32.5901,  158.0863,   -30.5901,   160.0863],
                                [-30.0761,  167.0381,   -28.0761,   169.0381],
                                [-32,   113,    -20,    151],
                                [-38,   135,    -32,    151],
                                [-20,   123,    -14,    147],
                                [-20,   121,    -16,    123],
                                [-14,   129,    -10,    137],
                                [-14,   141,    -8, 145],
                                [-36,   115,    -32,    127],
                                [-44,   141,    -38,    149],
                                [-34,   127,    -32,    135],
                                [-34,   151,    -24,    155]
                            ]
                    }
                ],
            "terrain":
                [
                    {
                        "minLevel": 10,
                        "maxLevel": 20,
                        "label": "Navteq",
                        "alt": "Navteq",
                        "boxes":
                            [
                                [-26.8359,  30.8723,    -25.6938,   32.1739],
                                [-27.0738,  30.7201,    -26.2624,   31.5422],
                                [-27.3832,  30.9615,    -26.5576,   32.0286],
                                [-27.3403,  31.4364,    -26.7719,   32.0286],
                                [-26.8455,  32.0275,    -26.7719,   32.1475]
                            ]
                    },
                    {
                        "minLevel": 6,
                        "maxLevel": 20,
                        "label": "PSMA",
                        "alt": "Copyright. Based on data provided under license from PSMA Australia Limited. Product incorporates data which is 2014 Telstra Corporation Limited, GM Holden Limited, Intelematics Australia Pty Ltd, HERE International LLC, Sentinel Content Pty Limited and Continental Pty Ltd",
                        "boxes":
                            [
                                [-13.1672,  95.8626,    -11.1672,   97.8626],
                                [-11.5539,  104.6728,   -9.5539,    106.6728],
                                [-32.5901,  158.0863,   -30.5901,   160.0863],
                                [-30.0761,  167.0381,   -28.0761,   169.0381],
                                [-32,   113,    -20,    151],
                                [-38,   135,    -32,    151],
                                [-20,   123,    -14,    147],
                                [-20,   121,    -16,    123],
                                [-14,   129,    -10,    137],
                                [-14,   141,    -8, 145],
                                [-36,   115,    -32,    127],
                                [-44,   141,    -38,    149],
                                [-34,   127,    -32,    135],
                                [-34,   151,    -24,    155]
                            ]
                    }
                ]
        };
        return JSON.stringify(obj);
    }

    function installFakeCopyrightRequest(baseUrl, mapId, proxy) {
        var expectedUrl = 'http://1.' + baseUrl + '/maptile/2.1/copyright/' + mapId;

        Resource._Implementations.loadAndExecuteScript = function(url, functionName) {
            var uri = new Uri(url);
            if (proxy) {
                uri = new Uri(decodeURIComponent(uri.query));
                console.log(uri);
            }

            var query = queryToObject(uri.query);
            expect(query.callback_func).toBeDefined();
            expect(query.app_id).toBeDefined();
            expect(query.app_code).toBeDefined();

            uri.query = undefined;
            expect(uri.toString()).toStartWith(expectedUrl);

            setTimeout(function() {
                window[functionName](createFakeCopyrightResponse());
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
        var baseUrl = 'aerial.maps.api.here.com';
        var mapId = 'newest';

        installFakeCopyrightRequest(baseUrl, mapId);
        installFakeImageRequest();

        var provider = new HereMapsImageryProvider({
            appId : 'fake',
            appCode : 'invalid'
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('rejects readyPromise on error', function() {
        var baseUrl = 'host.invalid';
        var provider = new HereMapsImageryProvider({
            baseUrl : baseUrl,
            appId : 'fake',
            appCode : 'invalid'
        });

        return provider.readyPromise.then(function () {
            fail('should not resolve');
        }).otherwise(function (e) {
            expect(provider.ready).toBe(false);
            expect(e.message).toContain(baseUrl);
        });
    });

    it('returns valid value for hasAlphaChannel', function() {
        var baseUrl = 'aerial.maps.api.here.com';
        var mapId = 'newest';

        installFakeCopyrightRequest(baseUrl, mapId);
        installFakeImageRequest();

        var provider = new HereMapsImageryProvider({
            appId : 'fake',
            appCode : 'invalid'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('can provide a root tile', function() {
        var baseUrl = 'fake.invalid';
        var mapId = 'newest';
        var appId = 'fake';
        var appCode = 'invalid';

        installFakeCopyrightRequest(baseUrl, mapId);
        installFakeImageRequest();

        var provider = new HereMapsImageryProvider({
            baseUrl : baseUrl,
            appId : appId,
            appCode : appCode
        });

        expect(provider.url).toContain(baseUrl);

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toEqual(20);
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
            expect(provider.credit).toBeInstanceOf(Object);

            installFakeImageRequest('http://1.fake.invalid/maptile/2.1/maptile/newest/satellite.day/0/0/0/256/jpg', {
                app_id : appId,
                app_code : appCode
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('routes requests through a proxy if one is specified', function() {
        var baseUrl = 'fake.invalid';
        var mapId = 'newest';
        var appId = 'fake';
        var appCode = 'invalid';

        var proxy = new DefaultProxy('/proxy/');

        installFakeCopyrightRequest(baseUrl, mapId, true);
        installFakeImageRequest();

        var provider = new HereMapsImageryProvider({
            baseUrl : baseUrl,
            appId : appId,
            appCode : appCode,
            proxy : proxy
        });

        expect(provider.url).toContain(baseUrl);
        expect(provider.proxy).toEqual(proxy);

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            installFakeImageRequest('http://1.fake.invalid/maptile/2.1/maptile/newest/satellite.day/0/0/0/256/jpg', {
                app_id : appId,
                app_code : appCode
            }, true);

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('raises error event when image cannot be loaded', function() {
        var baseUrl = 'fake.invalid';
        var mapId = 'newest';
        var appId = 'fake';
        var appCode = 'invalid';

        installFakeCopyrightRequest(baseUrl, mapId);
        installFakeImageRequest();

        var provider = new HereMapsImageryProvider({
            baseUrl : baseUrl,
            appId : appId,
            appCode : appCode
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
