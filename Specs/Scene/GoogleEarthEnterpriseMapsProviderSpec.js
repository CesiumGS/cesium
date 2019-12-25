import { GeographicTilingScheme } from '../../Source/Cesium.js';
import { Rectangle } from '../../Source/Cesium.js';
import { RequestScheduler } from '../../Source/Cesium.js';
import { Resource } from '../../Source/Cesium.js';
import { WebMercatorTilingScheme } from '../../Source/Cesium.js';
import { GoogleEarthEnterpriseMapsProvider } from '../../Source/Cesium.js';
import { Imagery } from '../../Source/Cesium.js';
import { ImageryLayer } from '../../Source/Cesium.js';
import { ImageryProvider } from '../../Source/Cesium.js';
import { ImageryState } from '../../Source/Cesium.js';
import pollToPromise from '../pollToPromise.js';

describe('Scene/GoogleEarthEnterpriseMapsProvider', function() {

    var supportsImageBitmapOptions;
    beforeAll(function() {
        // This suite spies on requests. Resource.supportsImageBitmapOptions needs to make a request to a data URI.
        // We run it here to avoid interfering with the tests.
        return Resource.supportsImageBitmapOptions()
            .then(function(result) {
                supportsImageBitmapOptions = result;
            });
    });

    afterEach(function() {
        Resource._Implementations.createImage = Resource._DefaultImplementations.createImage;
        Resource._Implementations.loadWithXhr = Resource._DefaultImplementations.loadWithXhr;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(GoogleEarthEnterpriseMapsProvider).toConformToInterface(ImageryProvider);
    });

    it('constructor throws when url is not specified', function() {
        function constructWithoutServer() {
            return new GoogleEarthEnterpriseMapsProvider({
                channel : 1234
            });
        }

        expect(constructWithoutServer).toThrowDeveloperError();
    });

    it('constructor throws when channel is not specified', function() {
        function constructWithoutChannel() {
            return new GoogleEarthEnterpriseMapsProvider({
                url : 'http://invalid.localhost'
            });
        }

        expect(constructWithoutChannel).toThrowDeveloperError();
    });

    it('resolves readyPromise', function() {
        var path = '';
        var url = 'http://example.invalid';
        var channel = 1234;

        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            Resource._DefaultImplementations.loadWithXhr('Data/GoogleEarthEnterpriseMapsProvider/good.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthEnterpriseMapsProvider({
            url : url,
            channel : channel,
            path : path
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('resolves readyPromise with Resource', function() {
        var path = '';
        var url = 'http://example.invalid';
        var channel = 1234;

        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            Resource._DefaultImplementations.loadWithXhr('Data/GoogleEarthEnterpriseMapsProvider/good.json', responseType, method, data, headers, deferred);
        };

        var resource = new Resource({
            url : url
        });

        var provider = new GoogleEarthEnterpriseMapsProvider({
            url : resource,
            channel : channel,
            path : path
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('rejects readyPromise on error', function() {
        var url = 'http://invalid.localhost';
        var provider = new GoogleEarthEnterpriseMapsProvider({
            url : url,
            channel : 1234
        });

        return provider.readyPromise.then(function() {
            fail('should not resolve');
        }).otherwise(function(e) {
            expect(provider.ready).toBe(false);
            expect(e.message).toContain(url);
        });
    });

    it('returns valid value for hasAlphaChannel', function() {
        var path = '';
        var url = 'http://example.invalid';
        var channel = 1234;

        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            Resource._DefaultImplementations.loadWithXhr('Data/GoogleEarthEnterpriseMapsProvider/good.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthEnterpriseMapsProvider({
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

        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            Resource._DefaultImplementations.loadWithXhr('Data/GoogleEarthEnterpriseMapsProvider/good.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthEnterpriseMapsProvider({
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
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.minimumLevel).toEqual(0);
            expect(provider.version).toEqual(version);
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.tileDiscardPolicy).toBeUndefined();
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
            expect(provider.credit).toBeInstanceOf(Object);

            Resource._Implementations.createImage = function(url, crossOrigin, deferred) {
                if (/^blob:/.test(url) || supportsImageBitmapOptions) {
                    // If ImageBitmap is supported, we expect a loadWithXhr request to fetch it as a blob.
                    Resource._DefaultImplementations.createImage(url, crossOrigin, deferred, true, true);
                } else {
                    expect(url).toEqual('http://example.invalid/query?request=ImageryMaps&channel=1234&version=1&x=0&y=0&z=1');

                    // Just return any old image.
                    Resource._DefaultImplementations.createImage('Data/Images/Red16x16.png', crossOrigin, deferred);
                }
            };

            Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual('http://example.invalid/query?request=ImageryMaps&channel=1234&version=1&x=0&y=0&z=1');

                // Just return any old image.
                Resource._DefaultImplementations.loadWithXhr('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(image).toBeImageOrImageBitmap();
            });
        });
    });

    it('handles malformed JSON data returned by the server', function() {
        var path = '/default_map';
        var url = 'http://example.invalid';
        var version = 1;
        var channel = 1234;

        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
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

        var provider = new GoogleEarthEnterpriseMapsProvider({
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

    it('raises error on invalid url', function() {
        var url = 'http://invalid.localhost';
        var provider = new GoogleEarthEnterpriseMapsProvider({
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
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            Resource._DefaultImplementations.loadWithXhr('Data/GoogleEarthEnterpriseMapsProvider/good.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthEnterpriseMapsProvider({
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
            setTimeout(function() {
                RequestScheduler.update();
            }, 1);
        });

        Resource._Implementations.createImage = function(url, crossOrigin, deferred) {
            if (/^blob:/.test(url) || supportsImageBitmapOptions) {
                // If ImageBitmap is supported, we expect a loadWithXhr request to fetch it as a blob.
                Resource._DefaultImplementations.createImage(url, crossOrigin, deferred, true, true);
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
                expect(imagery.image).toBeImageOrImageBitmap();
                expect(tries).toEqual(2);
                imagery.releaseReference();
            });
        });
    });

    it('defaults to WebMercatorTilingScheme when no projection specified', function() {
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            return deferred.resolve(JSON.stringify({
                'isAuthenticated' : true,
                'layers' : [{
                    'icon' : 'icons/773_l.png',
                    'id' : 1234,
                    'initialState' : true,
                    'label' : 'Imagery',
                    'requestType' : 'ImageryMaps',
                    'version' : 1
                }],
                'serverUrl' : 'https://example.invalid',
                'useGoogleLayers' : false
            }));
        };

        var provider = new GoogleEarthEnterpriseMapsProvider({
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
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            return deferred.resolve(JSON.stringify({
                'isAuthenticated' : true,
                'layers' : [{
                    'icon' : 'icons/773_l.png',
                    'id' : 1234,
                    'initialState' : true,
                    'label' : 'Imagery',
                    'requestType' : 'ImageryMaps',
                    'version' : 1
                }],
                'projection' : 'mercator',
                'serverUrl' : 'https://example.invalid',
                'useGoogleLayers' : false
            }));
        };

        var provider = new GoogleEarthEnterpriseMapsProvider({
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
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            return deferred.resolve(JSON.stringify({
                'isAuthenticated' : true,
                'layers' : [{
                    'icon' : 'icons/773_l.png',
                    'id' : 1234,
                    'initialState' : true,
                    'label' : 'Imagery',
                    'requestType' : 'ImageryMaps',
                    'version' : 1
                }],
                'projection' : 'flat',
                'serverUrl' : 'https://example.invalid',
                'useGoogleLayers' : false
            }));
        };

        var provider = new GoogleEarthEnterpriseMapsProvider({
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
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            Resource._DefaultImplementations.loadWithXhr('Data/GoogleEarthEnterpriseMapsProvider/bad_channel.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthEnterpriseMapsProvider({
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
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            Resource._DefaultImplementations.loadWithXhr('Data/GoogleEarthEnterpriseMapsProvider/bad_version.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthEnterpriseMapsProvider({
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
        Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            Resource._DefaultImplementations.loadWithXhr('Data/GoogleEarthEnterpriseMapsProvider/bad_projection.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthEnterpriseMapsProvider({
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
