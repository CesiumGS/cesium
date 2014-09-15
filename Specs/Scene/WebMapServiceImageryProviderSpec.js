/*global defineSuite*/
defineSuite([
        'Scene/WebMapServiceImageryProvider',
        'Core/Cartographic',
        'Core/DefaultProxy',
        'Core/defined',
        'Core/GeographicTilingScheme',
        'Core/jsonp',
        'Core/loadImage',
        'Core/loadWithXhr',
        'Core/Rectangle',
        'Core/WebMercatorTilingScheme',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryLayerFeatureInfo',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'Specs/waitsForPromise',
        'ThirdParty/when'
    ], function(
        WebMapServiceImageryProvider,
        Cartographic,
        DefaultProxy,
        defined,
        GeographicTilingScheme,
        jsonp,
        loadImage,
        loadWithXhr,
        Rectangle,
        WebMercatorTilingScheme,
        Imagery,
        ImageryLayer,
        ImageryLayerFeatureInfo,
        ImageryProvider,
        ImageryState,
        waitsForPromise,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    afterEach(function() {
        jsonp.loadAndExecuteScript = jsonp.defaultLoadAndExecuteScript;
        loadImage.createImage = loadImage.defaultCreateImage;
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(WebMapServiceImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('requires the url to be specified', function() {
        function createWithoutUrl() {
            return new WebMapServiceImageryProvider({
                layers : 'someLayer'
            });
        }
        expect(createWithoutUrl).toThrowDeveloperError();
    });

    it('requires the layers to be specified', function() {
        function createWithoutUrl() {
            return new WebMapServiceImageryProvider({
                url : 'made/up/wms/server'
            });
        }
        expect(createWithoutUrl).toThrowDeveloperError();
    });

    it('returns valid value for hasAlphaChannel', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer'
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('includes specified parameters in URL', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            parameters : {
                something : 'foo',
                another : false
            }
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            var calledLoadImage = false;
            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toMatch('something=foo');
                expect(url).toMatch('another=false');
                calledLoadImage = true;
                deferred.resolve();
                return undefined;
            };

            provider.requestImage(0, 0, 0);
            expect(calledLoadImage).toEqual(true);
        });
    });

    it('supports a question mark at the end of the URL', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server?',
            layers : 'someLayer'
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            var calledLoadImage = false;
            loadImage.createImage = function(url, crossOrigin, deferred) {
                var firstQuestionMarkIndex = url.indexOf('?');
                expect(firstQuestionMarkIndex).toBeGreaterThan(-1);

                var secondQuestionMarkIndex = url.indexOf('?', firstQuestionMarkIndex + 1);
                expect(secondQuestionMarkIndex).toBeLessThan(0);

                calledLoadImage = true;
                deferred.resolve();
                return undefined;
            };

            provider.requestImage(0, 0, 0);
            expect(calledLoadImage).toEqual(true);
        });
    });

    it('supports an ampersand at the end of the URL', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server?foo=bar&',
            layers : 'someLayer'
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            var calledLoadImage = false;
            loadImage.createImage = function(url, crossOrigin, deferred) {
                var firstQuestionMarkIndex = url.indexOf('?');
                expect(firstQuestionMarkIndex).toBeGreaterThan(-1);

                var secondQuestionMarkIndex = url.indexOf('?', firstQuestionMarkIndex + 1);
                expect(secondQuestionMarkIndex).toBeLessThan(0);

                var doubleAmpersandIndex = url.indexOf('&&');
                expect(doubleAmpersandIndex).toBeLessThan(0);

                calledLoadImage = true;
                deferred.resolve();
                return undefined;
            };

            provider.requestImage(0, 0, 0);
            expect(calledLoadImage).toEqual(true);
        });
    });

    it('supports a query parameter at the end of the URL', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server?foo=bar',
            layers : 'someLayer'
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            var calledLoadImage = false;
            loadImage.createImage = function(url, crossOrigin, deferred) {
                var firstQuestionMarkIndex = url.indexOf('?');
                expect(firstQuestionMarkIndex).toBeGreaterThan(-1);

                var secondQuestionMarkIndex = url.indexOf('?', firstQuestionMarkIndex + 1);
                expect(secondQuestionMarkIndex).toBeLessThan(0);

                var delimitedQueryParameterIndex = url.indexOf('foo=bar&');
                expect(delimitedQueryParameterIndex).not.toBeLessThan(0);

                calledLoadImage = true;
                deferred.resolve();
                return undefined;
            };

            provider.requestImage(0, 0, 0);
            expect(calledLoadImage).toEqual(true);
        });
    });

    it('requestImage returns a promise for an image and loads it for cross-origin use', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer'
        });

        expect(provider.url).toEqual('made/up/wms/server');
        expect(provider.layers).toEqual('someLayer');

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
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

    it('requestImage requests tiles with SRS EPSG:3857 when tiling scheme is WebMercatorTilingScheme', function() {
        var tilingScheme = new WebMercatorTilingScheme();
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            tilingScheme : tilingScheme
        });

        expect(provider.url).toEqual('made/up/wms/server');
        expect(provider.layers).toEqual('someLayer');

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toContain('srs=EPSG:3857');
                expect(url).toContain('bbox=' + tilingScheme.tileXYToNativeRectangle(0, 0, 0).west);

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
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

    it('does not treat parameter names as case sensitive', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server?foo=bar',
            layers : 'someLayer',
            parameters : {
                FORMAT : 'foo'
            }
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            var calledLoadImage = false;
            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toMatch('format=foo');
                expect(url).not.toMatch('format=image/jpeg');
                calledLoadImage = true;
                deferred.resolve();
                return undefined;
            };

            provider.requestImage(0, 0, 0);
            expect(calledLoadImage).toEqual(true);
        });
    });

    it('turns the supplied credit into a logo', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server?foo=bar',
            layers : 'someLayer'
        });
        expect(provider.credit).toBeUndefined();

        var providerWithCredit = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server?foo=bar',
            layers : 'someLayer',
            credit : 'Thanks to our awesome made up source of this imagery!'
        });
        expect(providerWithCredit.credit).toBeDefined();
    });

    it('routes requests through a proxy if one is specified', function() {
        var proxy = new DefaultProxy('/proxy/');
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            proxy : proxy
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url.indexOf(proxy.getURL('made/up/wms/server'))).toEqual(0);
                expect(provider.proxy).toEqual(proxy);

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
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

    it('uses rectangle passed to constructor', function() {
        var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            rectangle : rectangle
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.rectangle).toEqual(rectangle);
            expect(provider.tileDiscardPolicy).toBeUndefined();
        });
    });

    it('uses maximumLevel passed to constructor', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            maximumLevel : 5
        });
        expect(provider.maximumLevel).toEqual(5);
    });

    it('uses minimumLevel passed to constructor', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            minimumLevel : 1
        });
        expect(provider.minimumLevel).toEqual(1);
    });

    it('uses tilingScheme passed to constructor', function() {
        var tilingScheme = new WebMercatorTilingScheme();
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            tilingScheme : tilingScheme
        });
        expect(provider.tilingScheme).toBe(tilingScheme);
    });

    it('uses tileWidth passed to constructor', function() {
        var tilingScheme = new WebMercatorTilingScheme();
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            tileWidth : 123
        });
        expect(provider.tileWidth).toBe(123);
    });

    it('uses tileHeight passed to constructor', function() {
        var tilingScheme = new WebMercatorTilingScheme();
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            tileWidth : 456
        });
        expect(provider.tileWidth).toBe(456);
    });

    it('raises error event when image cannot be loaded', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer'
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
            if (tries === 2) {
                // valid URL
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            }

            // invalid URL
            return loadImage.defaultCreateImage(url, crossOrigin, deferred);
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

    describe('pickFeatures', function() {
        it('works with GeoJSON responses', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer'
            });

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toContain('GetFeatureInfo');
                loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo-GeoJSON.json', responseType, method, data, headers, deferred, overrideMimeType);
            };

            waitsFor(function() {
                return provider.ready;
            }, 'imagery provider to become ready');

            runs(function() {
                var asyncResult = provider.pickFeatures(0, 0, 0, 0.5, 0.5);

                waitsForPromise(asyncResult, function(pickResult) {
                    expect(pickResult.length).toBe(1);

                    var firstResult = pickResult[0];
                    expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
                    expect(firstResult.name).toBe('TOP TANK');
                    expect(firstResult.description).toContain('GEOSCIENCE AUSTRALIA');
                    expect(firstResult.position).toEqual(Cartographic.fromDegrees(145.91299, -30.19445));
                });
            });
        });

        it('works with MapInfo MXP responses', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer'
            });

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toContain('GetFeatureInfo');
                loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo-MapInfoMXP.xml', responseType, method, data, headers, deferred, overrideMimeType);
            };

            waitsFor(function() {
                return provider.ready;
            }, 'imagery provider to become ready');

            runs(function() {
                var asyncResult = provider.pickFeatures(0, 0, 0, 0.5, 0.5);

                waitsForPromise(asyncResult, function(pickResult) {
                    expect(pickResult.length).toBe(1);

                    var firstResult = pickResult[0];
                    expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
                    expect(firstResult.name).toBe('SPRINGWOOD');
                    expect(firstResult.description).toContain('NSW');
                });
            });
        });

        it('works with Esri WMS responses', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer'
            });

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toContain('GetFeatureInfo');
                loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo-Esri.xml', responseType, method, data, headers, deferred, overrideMimeType);
            };

            waitsFor(function() {
                return provider.ready;
            }, 'imagery provider to become ready');

            runs(function() {
                var asyncResult = provider.pickFeatures(0, 0, 0, 0.5, 0.5);

                waitsForPromise(asyncResult, function(pickResult) {
                    expect(pickResult.length).toBe(1);

                    var firstResult = pickResult[0];
                    expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
                    expect(firstResult.name).toBe('Kyogle (A)');
                    expect(firstResult.description).toContain('New South Wales');
                });
            });
        });

        it('works with unknown XML responses', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer'
            });

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toContain('GetFeatureInfo');
                loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo-Unknown.xml', responseType, method, data, headers, deferred, overrideMimeType);
            };

            waitsFor(function() {
                return provider.ready;
            }, 'imagery provider to become ready');

            runs(function() {
                var asyncResult = provider.pickFeatures(0, 0, 0, 0.5, 0.5);

                waitsForPromise(asyncResult, function(pickResult) {
                    expect(pickResult.length).toBe(1);

                    var firstResult = pickResult[0];
                    expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
                    expect(firstResult.name).toBeUndefined();
                    expect(firstResult.description).toContain('&lt;FooFeature&gt;');
                });
            });
        });

        it('resolves to undefined on a ServiceException', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer'
            });

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toContain('GetFeatureInfo');
                loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo-ServiceException.xml', responseType, method, data, headers, deferred, overrideMimeType);
            };

            waitsFor(function() {
                return provider.ready;
            }, 'imagery provider to become ready');

            runs(function() {
                var asyncResult = provider.pickFeatures(0, 0, 0, 0.5, 0.5);

                waitsForPromise(asyncResult, function(pickResult) {
                    expect(pickResult).toBeUndefined();
                });
            });
        });

        it('returns undefined if getFeatureInfoAsGeoJson and getFeatureInfoAsXml are false', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer',
                getFeatureInfoAsGeoJson : false,
                getFeatureInfoAsXml : false
            });

            waitsFor(function() {
                return provider.ready;
            }, 'imagery provider to become ready');

            runs(function() {
                expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).toBeUndefined();
            });
        });

        it('returns undefined if enablePickFeatures is false', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer',
                enablePickFeatures : false
            });

            waitsFor(function() {
                return provider.ready;
            }, 'imagery provider to become ready');

            runs(function() {
                expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).toBeUndefined();
            });
        });

        it('requests XML exclusively if getFeatureInfoAsGeoJson is false', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer',
                getFeatureInfoAsGeoJson : false
            });

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toContain('GetFeatureInfo');
                expect(url).not.toContain('json');
                loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo-MapInfoMXP.xml', responseType, method, data, headers, deferred, overrideMimeType);
            };

            waitsFor(function() {
                return provider.ready;
            }, 'imagery provider to become ready');

            runs(function() {
                var asyncResult = provider.pickFeatures(0, 0, 0, 0.5, 0.5);

                waitsForPromise(asyncResult, function(pickResult) {
                    expect(pickResult.length).toBe(1);

                    var firstResult = pickResult[0];
                    expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
                    expect(firstResult.name).toBe('SPRINGWOOD');
                    expect(firstResult.description).toContain('NSW');
                });
            });
        });

        it('requests GeoJSON exclusively if getFeatureInfoAsXml is false', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer',
                getFeatureInfoAsXml : false
            });

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toContain('GetFeatureInfo');

                if (url.indexOf('json') >= 0) {
                    deferred.reject();
                } else {
                    // this should not happen
                    loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo-MapInfoMXP.xml', responseType, method, data, headers, deferred, overrideMimeType);
                }
            };

            waitsFor(function() {
                return provider.ready;
            }, 'imagery provider to become ready');

            runs(function() {
                var asyncResult = provider.pickFeatures(0, 0, 0, 0.5, 0.5);
                waitsForPromise.toReject(asyncResult);
            });
        });
    });
});
