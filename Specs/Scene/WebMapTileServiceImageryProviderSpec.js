/*global defineSuite*/
defineSuite([
        'Scene/WebMapTileServiceImageryProvider',
        'Core/Credit',
        'Core/DefaultProxy',
        'Core/defined',
        'Core/GeographicTilingScheme',
        'Core/jsonp',
        'Core/loadImage',
        'Core/WebMercatorTilingScheme',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'ThirdParty/when'
    ], function(
        WebMapTileServiceImageryProvider,
        Credit,
        DefaultProxy,
        defined,
        GeographicTilingScheme,
        jsonp,
        loadImage,
        WebMercatorTilingScheme,
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
        expect(WebMapTileServiceImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('requires the url to be specified', function() {
        function createWithoutUrl() {
            return new WebMapTileServiceImageryProvider({
                layer : 'someLayer',
                style : 'someStyle',
                tileMatrixSetID : 'someTMS'
            });
        }
        expect(createWithoutUrl).toThrowDeveloperError();
    });

    it('requires the layer to be specified', function() {
        function createWithoutLayer() {
            return new WebMapTileServiceImageryProvider({
                url : 'made/up/wmts/server',
                style : 'someStyle',
                tileMatrixSetID : 'someTMS'
            });
        }
        expect(createWithoutLayer).toThrowDeveloperError();
    });

    it('requires the style to be specified', function() {
        function createWithoutStyle() {
            return new WebMapTileServiceImageryProvider({
                layer : 'someLayer',
                url : 'made/up/wmts/server',
                tileMatrixSetID : 'someTMS'
            });
        }
        expect(createWithoutStyle).toThrowDeveloperError();
    });

    it('requires the tileMatrixSetID to be specified', function() {
        function createWithoutTMS() {
            return new WebMapTileServiceImageryProvider({
                layer : 'someLayer',
                style : 'someStyle',
                url : 'made/up/wmts/server'
            });
        }
        expect(createWithoutTMS).toThrowDeveloperError();
    });

    // default parameters values
    it('uses default values for undefined parameters', function() {
        var provider = new WebMapTileServiceImageryProvider({
                layer : 'someLayer',
                style : 'someStyle',
                url : 'made/up/wmts/server',
                tileMatrixSetID : 'someTMS'
        });
        expect(provider.format).toEqual('image/jpeg');
        expect(provider.tileWidth).toEqual(256);
        expect(provider.tileHeight).toEqual(256);
        expect(provider.minimumLevel).toEqual(0);
        expect(provider.maximumLevel).toEqual(18);
        expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
        expect(provider.rectangle).toEqual(provider.tilingScheme.rectangle);
        expect(provider.credit).toBeUndefined();
        expect(provider.proxy).toBeUndefined();
    });

    // non default parameters values
    it('uses parameters passed to constructor', function() {
        var proxy = new DefaultProxy('/proxy/');
        var tilingScheme = new GeographicTilingScheme();
        var rectangle = new WebMercatorTilingScheme().rectangle;
        var provider = new WebMapTileServiceImageryProvider({
                layer : 'someLayer',
                style : 'someStyle',
                url : 'made/up/wmts/server',
                tileMatrixSetID : 'someTMS',
                format : 'someFormat',
                tileWidth : 512,
                tileHeight : 512,
                tilingScheme : tilingScheme,
                minimumLevel : 0,
                maximumLevel : 12,
                rectangle : rectangle,
                proxy : proxy,
                credit : "Thanks for using our WMTS server."
        });
        expect(provider.format).toEqual('someFormat');
        expect(provider.tileWidth).toEqual(512);
        expect(provider.tileHeight).toEqual(512);
        expect(provider.minimumLevel).toEqual(0);
        expect(provider.maximumLevel).toEqual(12);
        expect(provider.tilingScheme).toEqual(tilingScheme);
        expect(provider.credit).toBeDefined();
        expect(provider.credit).toBeInstanceOf(Credit);
        expect(provider.rectangle).toEqual(rectangle);
        expect(provider.proxy).toEqual(proxy);
    });

    it("doesn't care about trailing question mark at the end of URL", function() {
        var provider1 = new WebMapTileServiceImageryProvider({
                layer : 'someLayer',
                style : 'someStyle',
                url : 'made/up/wmts/server',
                tileMatrixSetID : 'someTMS'
        });
        var provider2 = new WebMapTileServiceImageryProvider({
                layer : 'someLayer',
                style : 'someStyle',
                url : 'made/up/wmts/server?',
                tileMatrixSetID : 'someTMS'
        });
        expect(provider1.url).toEqual(provider2.url);
    });


    it('requestImage returns a promise for an image and loads it for cross-origin use', function() {
        var provider = new WebMapTileServiceImageryProvider({
                layer : 'someLayer',
                style : 'someStyle',
                url : 'made/up/wmts/server',
                tileMatrixSetID : 'someTMS'
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {

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

    it('routes requests through a proxy if one is specified', function() {
        var proxy = new DefaultProxy('/proxy/');
        var provider = new WebMapTileServiceImageryProvider({
                layer : 'someLayer',
                style : 'someStyle',
                url : 'made/up/wmts/server',
                tileMatrixSetID : 'someTMS',
                proxy : proxy
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url.indexOf(proxy.getURL('made/up/wmts/server'))).toEqual(0);

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


    it('raises error event when image cannot be loaded', function() {
        var provider = new WebMapTileServiceImageryProvider({
                layer : 'someLayer',
                style : 'someStyle',
                url : 'made/up/wmts/server',
                tileMatrixSetID : 'someTMS'
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
