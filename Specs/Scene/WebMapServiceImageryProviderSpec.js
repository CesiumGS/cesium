/*global defineSuite*/
defineSuite([
        'Scene/WebMapServiceImageryProvider',
        'Core/Cartographic',
        'Core/DefaultProxy',
        'Core/Ellipsoid',
        'Core/GeographicTilingScheme',
        'Core/loadImage',
        'Core/loadWithXhr',
        'Core/Math',
        'Core/queryToObject',
        'Core/Rectangle',
        'Core/WebMercatorTilingScheme',
        'Scene/GetFeatureInfoFormat',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryLayerFeatureInfo',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'Specs/pollToPromise',
        'ThirdParty/Uri'
    ], function(
        WebMapServiceImageryProvider,
        Cartographic,
        DefaultProxy,
        Ellipsoid,
        GeographicTilingScheme,
        loadImage,
        loadWithXhr,
        CesiumMath,
        queryToObject,
        Rectangle,
        WebMercatorTilingScheme,
        GetFeatureInfoFormat,
        Imagery,
        ImageryLayer,
        ImageryLayerFeatureInfo,
        ImageryProvider,
        ImageryState,
        pollToPromise,
        Uri) {
    'use strict';

    afterEach(function() {
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

    it('resolves readyPromise', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer'
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);
            expect(provider.ready).toBe(true);
        });
    });

    it('returns valid value for hasAlphaChannel', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('can use a custom ellipsoid', function() {
        var ellipsoid = new Ellipsoid(1, 2, 3);
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            ellipsoid : ellipsoid
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tilingScheme.ellipsoid).toEqual(ellipsoid);
        });
    });

    it('includes specified parameters in URL', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            parameters : {
                something : 'foo',
                another : false,
                version: '1.3.0'
            }
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var uri = new Uri(url);
                var params = queryToObject(uri.query);
                expect(params.something).toEqual('foo');
                expect(params.another).toEqual('false');
                expect(params.version).toEqual('1.3.0');

                // Don't need to actually load image, but satisfy the request.
                deferred.resolve(true);
            });

            provider.requestImage(0, 0, 0);

            expect(loadImage.createImage).toHaveBeenCalled();
        });
    });

    it('supports subdomains string in URL', function() {
        var provider = new WebMapServiceImageryProvider({
            url : '{s}',
            subdomains: '123',
            layers : ''
        });

        spyOn(ImageryProvider, 'loadImage');
        provider.requestImage(0, 0, 0);
        var url = ImageryProvider.loadImage.calls.mostRecent().args[1];
        expect('123'.indexOf(url.substring(0, 1))).toBeGreaterThanOrEqualTo(0);
    });

    it('supports subdomains array in URL', function() {
        var provider = new WebMapServiceImageryProvider({
            url : '{s}',
            subdomains: ['foo', 'bar'],
            layers : ''
        });

        spyOn(ImageryProvider, 'loadImage');
        provider.requestImage(0, 0, 0);
        var url = ImageryProvider.loadImage.calls.mostRecent().args[1];
        expect(['foo', 'bar'].indexOf(url.substring(0, 3))).toBeGreaterThanOrEqualTo(0);
    });

    it('supports a question mark at the end of the URL', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server?',
            layers : 'someLayer'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var questionMarkCount = url.match(/\?/g).length;
                expect(questionMarkCount).toEqual(1);

                // Don't need to actually load image, but satisfy the request.
                deferred.resolve(true);
            });

            provider.requestImage(0, 0, 0);

            expect(loadImage.createImage).toHaveBeenCalled();
        });
    });

    it('supports an ampersand at the end of the URL', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server?foo=bar&',
            layers : 'someLayer'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var questionMarkCount = url.match(/\?/g).length;
                expect(questionMarkCount).toEqual(1);

                expect(url).not.toContain('&&');

                // Don't need to actually load image, but satisfy the request.
                deferred.resolve(true);
            });

            provider.requestImage(0, 0, 0);

            expect(loadImage.createImage).toHaveBeenCalled();
        });
    });

    it('supports a query parameter at the end of the URL', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server?foo=bar',
            layers : 'someLayer'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var questionMarkCount = url.match(/\?/g).length;
                expect(questionMarkCount).toEqual(1);

                var uri = new Uri(url);
                var params = queryToObject(uri.query);
                expect(params.foo).toEqual('bar');

                // Don't need to actually load image, but satisfy the request.
                deferred.resolve(true);
            });

            provider.requestImage(0, 0, 0);

            expect(loadImage.createImage).toHaveBeenCalled();
        });
    });

    it('defaults WMS version to 1.1.1', function() {

        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server?foo=bar',
            layers : 'someLayer'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {

                var uri = new Uri(url);
                var params = queryToObject(uri.query);
                expect(params.version).toEqual('1.1.1');

                // Don't need to actually load image, but satisfy the request.
                deferred.resolve(true);
            });

            provider.requestImage(0, 0, 0);

            expect(loadImage.createImage).toHaveBeenCalled();
        });
    });

    it('requestImage returns a promise for an image and loads it for cross-origin use', function() {
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer'
        });

        expect(provider.url).toEqual('made/up/wms/server');
        expect(provider.layers).toEqual('someLayer');

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('requestImage requests tiles with SRS EPSG:3857 when tiling scheme is WebMercatorTilingScheme, WMS 1.1.1', function() {
        var tilingScheme = new WebMercatorTilingScheme();
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            tilingScheme : tilingScheme
        });

        expect(provider.url).toEqual('made/up/wms/server');
        expect(provider.layers).toEqual('someLayer');

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var uri = new Uri(url);
                var params = queryToObject(uri.query);

                expect(params.srs).toEqual('EPSG:3857');
                expect(params.version).toEqual('1.1.1');

                var rect = tilingScheme.tileXYToNativeRectangle(0, 0, 0);
                expect(params.bbox).toEqual(rect.west + ',' + rect.south + ',' + rect.east + ',' + rect.north);

                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('requestImage requests tiles with CRS EPSG:3857 when tiling scheme is WebMercatorTilingScheme, WMS 1.3.0', function() {
        var tilingScheme = new WebMercatorTilingScheme();
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            tilingScheme : tilingScheme,
            parameters: {
              version: '1.3.0'
            }
        });

        expect(provider.url).toEqual('made/up/wms/server');
        expect(provider.layers).toEqual('someLayer');

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var uri = new Uri(url);
                var params = queryToObject(uri.query);

                expect(params.crs).toEqual('EPSG:3857');
                expect(params.version).toEqual('1.3.0');

                var rect = tilingScheme.tileXYToNativeRectangle(0, 0, 0);
                expect(params.bbox).toEqual(rect.west + ',' + rect.south + ',' + rect.east + ',' + rect.north);

                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('requestImage requests tiles with SRS EPSG:4326 when tiling scheme is GeographicTilingScheme, WMS 1.1.1', function() {
        var tilingScheme = new GeographicTilingScheme();
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            tilingScheme : tilingScheme
        });

        expect(provider.url).toEqual('made/up/wms/server');
        expect(provider.layers).toEqual('someLayer');

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var uri = new Uri(url);
                var params = queryToObject(uri.query);

                expect(params.srs).toEqual('EPSG:4326');
                expect(params.version).toEqual('1.1.1');

                var rect = tilingScheme.tileXYToNativeRectangle(0, 0, 0);
                expect(params.bbox).toEqual(rect.west + ',' + rect.south + ',' + rect.east + ',' + rect.north);

                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('requestImage requests tiles with SRS EPSG:4326 when tiling scheme is GeographicTilingScheme, WMS 1.1.0', function() {
        var tilingScheme = new GeographicTilingScheme();
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            tilingScheme : tilingScheme,
            parameters: {
              version: '1.1.0'
            }
        });

        expect(provider.url).toEqual('made/up/wms/server');
        expect(provider.layers).toEqual('someLayer');

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var uri = new Uri(url);
                var params = queryToObject(uri.query);

                expect(params.srs).toEqual('EPSG:4326');
                expect(params.version).toEqual('1.1.0');

                var rect = tilingScheme.tileXYToNativeRectangle(0, 0, 0);
                expect(params.bbox).toEqual(rect.west + ',' + rect.south + ',' + rect.east + ',' + rect.north);

                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('requestImage requests tiles with CRS CRS:84 when tiling scheme is GeographicTilingScheme, WMS 1.3.0', function() {
        var tilingScheme = new GeographicTilingScheme();
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            tilingScheme : tilingScheme,
            parameters: {
              version: '1.3.0'
            }
        });

        expect(provider.url).toEqual('made/up/wms/server');
        expect(provider.layers).toEqual('someLayer');

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var uri = new Uri(url);
                var params = queryToObject(uri.query);

                expect(params.crs).toEqual('CRS:84');
                expect(params.version).toEqual('1.3.0');

                var rect = tilingScheme.tileXYToNativeRectangle(0, 0, 0);
                expect(params.bbox).toEqual(rect.west + ',' + rect.south + ',' + rect.east + ',' + rect.north);

                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('requestImage requests tiles with CRS CRS:84 when tiling scheme is GeographicTilingScheme, WMS 1.3.1', function() {
        var tilingScheme = new GeographicTilingScheme();
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            tilingScheme : tilingScheme,
            parameters: {
              version: '1.3.1'
            }
        });

        expect(provider.url).toEqual('made/up/wms/server');
        expect(provider.layers).toEqual('someLayer');

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var uri = new Uri(url);
                var params = queryToObject(uri.query);

                expect(params.crs).toEqual('CRS:84');
                expect(params.version).toEqual('1.3.1');

                var rect = tilingScheme.tileXYToNativeRectangle(0, 0, 0);
                expect(params.bbox).toEqual(rect.west + ',' + rect.south + ',' + rect.east + ',' + rect.north);

                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
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

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                var uri = new Uri(url);
                var params = queryToObject(uri.query);

                expect(params.format).toEqual('foo');
                expect(params.format).not.toEqual('image/jpeg');
            });

            provider.requestImage(0, 0, 0);

            expect(loadImage.createImage).toHaveBeenCalled();
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

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.proxy).toEqual(proxy);

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url.indexOf(proxy.getURL('made/up/wms/server'))).toEqual(0);

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('uses rectangle passed to constructor', function() {
        var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            rectangle : rectangle
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.rectangle).toEqualEpsilon(rectangle, CesiumMath.EPSILON14);
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
        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/wms/server',
            layers : 'someLayer',
            tileWidth : 123
        });
        expect(provider.tileWidth).toBe(123);
    });

    it('uses tileHeight passed to constructor', function() {
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

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
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
                if (tries === 2) {
                    // Succeed after 2 tries
                    loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
                } else {
                    // fail
                    setTimeout(function() {
                        deferred.reject();
                    }, 1);
                }
            };

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

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                return provider.pickFeatures(0, 0, 0, 0.5, 0.5).then(function(pickResult) {
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

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                return provider.pickFeatures(0, 0, 0, 0.5, 0.5).then(function(pickResult) {
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

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                return provider.pickFeatures(0, 0, 0, 0.5, 0.5).then(function(pickResult) {
                    expect(pickResult.length).toBe(1);

                    var firstResult = pickResult[0];
                    expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
                    expect(firstResult.name).toBe('Kyogle (A)');
                    expect(firstResult.description).toContain('New South Wales');
                });
            });
        });

        it('works with THREDDS XML format', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer'
            });

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toContain('GetFeatureInfo');
                loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo-THREDDS.xml', responseType, method, data, headers, deferred, overrideMimeType);
            };

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                return provider.pickFeatures(0, 0, 0, 0.5, 0.5).then(function(pickResult) {
                    expect(pickResult.length).toBe(1);

                    var firstResult = pickResult[0];
                    expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
                    expect(+firstResult.properties.value).toBe(42);
                    expect(firstResult.description).toContain('42');
                });
            });
        });

        it('works with msGMLOutput format', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer'
            });

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toContain('GetFeatureInfo');
                loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo-msGMLOutput.xml', responseType, method, data, headers, deferred, overrideMimeType);
            };

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                return provider.pickFeatures(0, 0, 0, 0.5, 0.5).then(function(pickResult) {
                    expect(pickResult.length).toBe(1);

                    var firstResult = pickResult[0];
                    expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
                    expect(firstResult.name).toBe('Hovercraft');
                    expect(firstResult.description).toContain('Hovercraft');
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

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                return provider.pickFeatures(0, 0, 0, 0.5, 0.5).then(function(pickResult) {
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

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                return provider.pickFeatures(0, 0, 0, 0.5, 0.5).then(function(pickResult) {
                    expect(pickResult).toBeUndefined();
                });
            });
        });

        it('returns undefined if list of feature info formats is empty', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer',
                getFeatureInfoFormats : []
            });

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).toBeUndefined();
            });
        });

        it('returns undefined if enablePickFeatures is false', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer',
                enablePickFeatures : false
            });

            expect(provider.enablePickFeatures).toBe(false);

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).toBeUndefined();
            });
        });

        it('returns undefined if enablePickFeatures is set to false after initialization', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer',
                enablePickFeatures : true
            });

            provider.enablePickFeatures = false;
            expect(provider.enablePickFeatures).toBe(false);

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).toBeUndefined();
            });
        });

        it('does not return undefined if enablePickFeatures is set to true after initialization as false', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer',
                enablePickFeatures : false
            });

            provider.enablePickFeatures = true;
            expect(provider.enablePickFeatures).toBe(true);

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                expect(provider.pickFeatures(0, 0, 0, 0.5, 0.5)).not.toBeUndefined();
            });
        });

        it('requests XML exclusively if specified in getFeatureInfoFormats', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer',
                getFeatureInfoFormats : [
                    new GetFeatureInfoFormat('xml')
                ]
            });

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toContain('GetFeatureInfo');
                expect(url).not.toContain('json');
                loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo-MapInfoMXP.xml', responseType, method, data, headers, deferred, overrideMimeType);
            };

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                return provider.pickFeatures(0, 0, 0, 0.5, 0.5).then(function(pickResult) {
                    expect(pickResult.length).toBe(1);

                    var firstResult = pickResult[0];
                    expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
                    expect(firstResult.name).toBe('SPRINGWOOD');
                    expect(firstResult.description).toContain('NSW');
                });
            });
        });

        it('requests GeoJSON exclusively if specified in getFeatureInfoFormats', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer',
                getFeatureInfoFormats : [
                    new GetFeatureInfoFormat('json')
                ]
            });

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                    expect(url).toContain('GetFeatureInfo');

                    if (url.indexOf('json') >= 0) {
                        deferred.reject();
                    } else {
                        // this should not happen
                        loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo-MapInfoMXP.xml', responseType, method, data, headers, deferred, overrideMimeType);
                    }
                };

                return provider.pickFeatures(0, 0, 0, 0.5, 0.5).then(function(features) {
                    expect(features.length).toBe(0);
                }).otherwise(function() {
                });
            });
        });

        it('uses custom GetFeatureInfo handling function if specified', function() {
            function fooProcessor(response) {
                var json = JSON.parse(response);
                expect(json.custom).toBe(true);
                var feature = new ImageryLayerFeatureInfo();
                feature.name = 'Foo processed!';
                return [feature];
            }

            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer',
                getFeatureInfoFormats : [
                    new GetFeatureInfoFormat('foo', 'application/foo', fooProcessor)
                ]
            });

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                    expect(url).toContain('GetFeatureInfo');

                    if (url.indexOf(encodeURIComponent('application/foo')) < 0) {
                        deferred.reject();
                    }

                    return loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo-Custom.json', responseType, method, data, headers, deferred, overrideMimeType);
                };

                return provider.pickFeatures(0, 0, 0, 0.5, 0.5).then(function(features) {
                    expect(features.length).toBe(1);
                    expect(features[0].name).toEqual('Foo processed!');
                });
            });
        });

        it('works with HTML response', function() {
            var provider = new WebMapServiceImageryProvider({
                url : 'made/up/wms/server',
                layers : 'someLayer'
            });

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toContain('GetFeatureInfo');
                if (url.indexOf(encodeURIComponent('text/html')) < 0) {
                    deferred.reject();
                }
                loadWithXhr.defaultLoad('Data/WMS/GetFeatureInfo.html', responseType, method, data, headers, deferred, overrideMimeType);
            };

            return pollToPromise(function() {
                return provider.ready;
            }).then(function() {
                return provider.pickFeatures(0, 0, 0, 0.5, 0.5).then(function(pickResult) {
                    expect(pickResult.length).toBe(1);

                    var firstResult = pickResult[0];
                    expect(firstResult).toBeInstanceOf(ImageryLayerFeatureInfo);
                    expect(firstResult.name).toBe('HTML yeah!');
                    expect(firstResult.description).toContain('great information');
                });
            });
        });
    });
});
