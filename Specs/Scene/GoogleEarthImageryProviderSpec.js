/*global defineSuite*/
defineSuite([
        'Scene/GoogleEarthImageryProvider',
        'Core/DefaultProxy',
        'Core/defined',
        'Core/GeographicTilingScheme',
        'Core/loadImage',
        'Core/loadWithXhr',
        'Core/Rectangle',
        'Core/WebMercatorTilingScheme',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'Specs/pollToPromise'
    ], function(
        GoogleEarthImageryProvider,
        DefaultProxy,
        defined,
        GeographicTilingScheme,
        loadImage,
        loadWithXhr,
        Rectangle,
        WebMercatorTilingScheme,
        Imagery,
        ImageryLayer,
        ImageryProvider,
        ImageryState,
        pollToPromise) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    afterEach(function() {
        loadImage.createImage = loadImage.defaultCreateImage;
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(GoogleEarthImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('constructor throws when url is not specified', function() {
        function constructWithoutServer() {
            return new GoogleEarthImageryProvider({
                channel : 1234
            });
        }
        expect(constructWithoutServer).toThrowDeveloperError();
    });

    it('constructor throws when channel is not specified', function() {
        function constructWithoutChannel() {
            return new GoogleEarthImageryProvider({
                url : 'http://invalid.localhost'
            });
        }
        expect(constructWithoutChannel).toThrowDeveloperError();
    });

    it('returns valid value for hasAlphaChannel', function() {
        var path = '';
        var url = 'http://example.invalid';
        var channel = 1234;
        var version = 1;

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/good.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url : url,
            channel : channel,
            path : path
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('can provide a root tile', function() {
        var path = '';
        var url = 'http://example.invalid';
        var channel = 1234;
        var version = 1;

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/good.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url : url,
            channel : channel,
            path : path
        });

        expect(provider.url).toEqual(url);
        expect(provider.path).toEqual(path);
        expect(provider.channel).toEqual(channel);

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toEqual(23);
            expect(provider.minimumLevel).toEqual(0);
            expect(provider.version).toEqual(version);
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.tileDiscardPolicy).toBeUndefined();
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
            expect(provider.credit).toBeInstanceOf(Object);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                if (/^blob:/.test(url)) {
                    // load blob url normally
                    loadImage.defaultCreateImage(url, crossOrigin, deferred);
                } else {
                    expect(url).toEqual('http://example.invalid/query?request=ImageryMaps&channel=1234&version=1&x=0&y=0&z=1');

                    // Just return any old image.
                    loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
                }
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual('http://example.invalid/query?request=ImageryMaps&channel=1234&version=1&x=0&y=0&z=1');

                // Just return any old image.
                loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('handles malformed JSON data returned by the server', function() {
        var path = '/default_map';
        var url = 'http://example.invalid';
        var version = 1;
        var channel = 1234;

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            return deferred.resolve('{\n' +
                'isAuthenticated: true,\n' +
                'layers: [\n' +
                '   {\n' +
                '        icon: "icons/773_l.png",\n' +
                '        id: 1234,\n' +
                '        initialState: true,\n' +
                '        label: "Imagery",\n' +
                '        lookAt: "none",\n' +
                '        requestType: "ImageryMaps",\n' +
                '        version: 1\n' +
                '    },{\n' +
                '        icon: "icons/773_l.png",\n' +
                '        id: 1007,\n' +
                '        initialState: true,\n' +
                '        label: "Labels",\n' +
                '        lookAt: "none",\n' +
                '        requestType: "VectorMapsRaster",\n' +
                '        version: 8\n' +
                '    }\n' +
                '],\n' +
                'serverUrl: "https://example.invalid",\n' +
                'useGoogleLayers: false\n' +
            '}');
        };

        var provider = new GoogleEarthImageryProvider({
            url : url,
            channel : channel
        });

        expect(provider.url).toEqual(url);
        expect(provider.path).toEqual(path);
        expect(provider.version).toEqual(version);
        expect(provider.channel).toEqual(channel);

        return pollToPromise(function() {
            return provider.ready;
        });
    });

    it('routes requests through a proxy if one is specified', function() {
        var path = '/default_map';
        var url = 'http://example.invalid';
        var proxy = new DefaultProxy('/proxy/');

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/good.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url : url,
            channel : 1234,
            proxy : proxy
        });

        expect(provider.url).toEqual(url);
        expect(provider.path).toEqual(path);
        expect(provider.proxy).toEqual(proxy);

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            loadImage.createImage = function(url, crossOrigin, deferred) {
                if (/^blob:/.test(url)) {
                    // load blob url normally
                    loadImage.defaultCreateImage(url, crossOrigin, deferred);
                } else {
                    expect(url).toEqual(proxy.getURL('http://example.invalid/default_map/query?request=ImageryMaps&channel=1234&version=1&x=0&y=0&z=1'));

                    // Just return any old image.
                    loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
                }
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual(proxy.getURL('http://example.invalid/default_map/query?request=ImageryMaps&channel=1234&version=1&x=0&y=0&z=1'));

                // Just return any old image.
                loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('raises error on invalid url', function() {
        var url = 'invalid.localhost';
        var provider = new GoogleEarthImageryProvider({
            url : url,
            channel : 1234
        });

        var errorEventRaised = false;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.message.indexOf(url) >= 0).toEqual(true);
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
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/good.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url : 'example.invalid',
            channel : 1234
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
            if (/^blob:/.test(url)) {
                // load blob url normally
                loadImage.defaultCreateImage(url, crossOrigin, deferred);
            } else if (tries === 2) {
                // Succeed after 2 tries
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            } else {
                // fail
                setTimeout(function() {
                    deferred.reject();
                }, 1);
            }
        };

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            if (tries === 2) {
                // Succeed after 2 tries
                loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
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

            return pollToPromise(function() {
                return imagery.state === ImageryState.RECEIVED;
            }).then(function() {
                expect(imagery.image).toBeInstanceOf(Image);
                expect(tries).toEqual(2);
                imagery.releaseReference();
            });
        });
    });

    it('defaults to WebMercatorTilingScheme when no projection specified', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            return deferred.resolve(JSON.stringify({
                "isAuthenticated" : true,
                "layers" : [{
                    "icon" : "icons/773_l.png",
                    "id" : 1234,
                    "initialState" : true,
                    "label" : "Imagery",
                    "requestType" : "ImageryMaps",
                    "version" : 1
                }],
                "serverUrl" : "https://example.invalid",
                "useGoogleLayers" : false
            }));
        };

        var provider = new GoogleEarthImageryProvider({
            url : 'http://example.invalid',
            channel : 1234
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
        });
    });

    it('Projection is WebMercatorTilingScheme when server projection is mercator', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            return deferred.resolve(JSON.stringify({
                "isAuthenticated" : true,
                "layers" : [{
                    "icon" : "icons/773_l.png",
                    "id" : 1234,
                    "initialState" : true,
                    "label" : "Imagery",
                    "requestType" : "ImageryMaps",
                    "version" : 1
                }],
                "projection" : "mercator",
                "serverUrl" : "https://example.invalid",
                "useGoogleLayers" : false
            }));
        };

        var provider = new GoogleEarthImageryProvider({
            url : 'http://example.invalid',
            channel : 1234
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
        });
    });

    it('Projection is GeographicTilingScheme when server projection is flat', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            return deferred.resolve(JSON.stringify({
                "isAuthenticated" : true,
                "layers" : [{
                    "icon" : "icons/773_l.png",
                    "id" : 1234,
                    "initialState" : true,
                    "label" : "Imagery",
                    "requestType" : "ImageryMaps",
                    "version" : 1
                }],
                "projection" : "flat",
                "serverUrl" : "https://example.invalid",
                "useGoogleLayers" : false
            }));
        };

        var provider = new GoogleEarthImageryProvider({
            url : 'http://example.invalid',
            channel : 1234
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.rectangle).toEqual(new Rectangle(-Math.PI, -Math.PI, Math.PI, Math.PI));
        });
    });

    it('raises error when channel cannot be found', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/bad_channel.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url : 'http://invalid.localhost',
            channel : 1235
        });

        var errorEventRaised = false;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.message.indexOf('Could not find layer with channel') >= 0).toEqual(true);
            errorEventRaised = true;
        });

        return pollToPromise(function() {
            return provider.ready || errorEventRaised;
        }).then(function() {
            expect(provider.ready).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });

    it('raises error when channel version cannot be found', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/bad_version.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url : 'http://invalid.localhost',
            channel : 1234
        });

        var errorEventRaised = false;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.message.indexOf('Could not find a version in channel') >= 0).toEqual(true);
            errorEventRaised = true;
        });

        return pollToPromise(function() {
            return provider.ready || errorEventRaised;
        }).then(function() {
            expect(provider.ready).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });

    it('raises error when unsupported projection is specified', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/bad_projection.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url : 'http://invalid.localhost',
            channel : 1234
        });

        var errorEventRaised = false;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.message.indexOf('Unsupported projection') >= 0).toEqual(true);
            errorEventRaised = true;
        });

        return pollToPromise(function() {
            return provider.ready || errorEventRaised;
        }).then(function() {
            expect(provider.ready).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });
});
