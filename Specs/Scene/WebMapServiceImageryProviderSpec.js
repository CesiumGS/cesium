/*global defineSuite*/
defineSuite([
        'Scene/WebMapServiceImageryProvider',
        'Core/DefaultProxy',
        'Core/defined',
        'Core/GeographicTilingScheme',
        'Core/jsonp',
        'Core/loadImage',
        'Core/Math',
        'Core/Rectangle',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'ThirdParty/when'
    ], function(
        WebMapServiceImageryProvider,
        DefaultProxy,
        defined,
        GeographicTilingScheme,
        jsonp,
        loadImage,
        CesiumMath,
        Rectangle,
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

            var calledLoadImage = false;
            loadImage.createImage = function(url, crossOrigin, deferred) {
                var bbox = 'bbox=' +
                            CesiumMath.toDegrees(rectangle.west) + ',' +
                            CesiumMath.toDegrees(rectangle.south) + ',' +
                            CesiumMath.toDegrees((rectangle.west + rectangle.east) / 2.0) + ',' +
                            CesiumMath.toDegrees(rectangle.north);
                expect(url.indexOf(bbox)).not.toBeLessThan(0);
                calledLoadImage = true;
                deferred.resolve();
                return undefined;
            };

            provider.requestImage(0, 0, 0);
            expect(calledLoadImage).toEqual(true);
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
});
