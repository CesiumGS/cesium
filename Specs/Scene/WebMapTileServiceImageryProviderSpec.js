/*global defineSuite*/
defineSuite([
        'Scene/WebMapTileServiceImageryProvider',
        'Core/Credit',
        'Core/DefaultProxy',
        'Core/defined',
        'Core/GeographicTilingScheme',
        'Core/loadImage',
        'Core/queryToObject',
        'Core/WebMercatorTilingScheme',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'Specs/pollToPromise',
        'ThirdParty/Uri'
    ], function(
        WebMapTileServiceImageryProvider,
        Credit,
        DefaultProxy,
        defined,
        GeographicTilingScheme,
        loadImage,
        queryToObject,
        WebMercatorTilingScheme,
        Imagery,
        ImageryLayer,
        ImageryProvider,
        ImageryState,
        pollToPromise,
        Uri) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    afterEach(function() {
        loadImage.createImage = loadImage.defaultCreateImage;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(WebMapTileServiceImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('generates expected tile urls', function() {
        var options = {
            url : 'http://wmts.invalid',
            format : 'image/png',
            layer : 'someLayer',
            style : 'someStyle',
            tileMatrixSetID : 'someTMS',
            tileMatrixLabels : ['first', 'second', 'third']
        };

        var provider = new WebMapTileServiceImageryProvider(options);

        var loadImageSpy = spyOn(ImageryProvider, 'loadImage');

        var tilecol = 12;
        var tilerow = 5;
        var level = 1;
        provider.requestImage(tilecol, tilerow, level);
        var uri = new Uri(ImageryProvider.loadImage.calls.mostRecent().args[1]);
        var queryObject = queryToObject(uri.query);

        expect(queryObject.request).toEqual('GetTile');
        expect(queryObject.service).toEqual('WMTS');
        expect(queryObject.version).toEqual('1.0.0');
        expect(queryObject.format).toEqual(options.format);
        expect(queryObject.layer).toEqual(options.layer);
        expect(queryObject.style).toEqual(options.style);
        expect(parseInt(queryObject.tilecol, 10)).toEqual(tilecol);
        expect(queryObject.tilematrixset).toEqual(options.tileMatrixSetID);
        expect(queryObject.tilematrix).toEqual(options.tileMatrixLabels[level]);
        expect(parseInt(queryObject.tilerow, 10)).toEqual(tilerow);

        tilecol = 1;
        tilerow = 3;
        level = 2;
        provider.requestImage(tilecol, tilerow, level);
        uri = new Uri(ImageryProvider.loadImage.calls.mostRecent().args[1]);
        queryObject = queryToObject(uri.query);

        expect(queryObject.request).toEqual('GetTile');
        expect(queryObject.service).toEqual('WMTS');
        expect(queryObject.version).toEqual('1.0.0');
        expect(queryObject.format).toEqual(options.format);
        expect(queryObject.layer).toEqual(options.layer);
        expect(queryObject.style).toEqual(options.style);
        expect(parseInt(queryObject.tilecol, 10)).toEqual(tilecol);
        expect(queryObject.tilematrixset).toEqual(options.tileMatrixSetID);
        expect(queryObject.tilematrix).toEqual(options.tileMatrixLabels[level]);
        expect(parseInt(queryObject.tilerow, 10)).toEqual(tilerow);
    });

    it('supports subdomains string urls', function() {
        var options = {
            url : '{s}',
            layer : '',
            style : '',
            subdomains : '123',
            tileMatrixSetID : ''
        };

        var provider = new WebMapTileServiceImageryProvider(options);

        var loadImageSpy = spyOn(ImageryProvider, 'loadImage');

        var tilecol = 1;
        var tilerow = 1;
        var level = 1;
        provider.requestImage(tilecol, tilerow, level);
        var url = ImageryProvider.loadImage.calls.mostRecent().args[1];
        expect('123'.indexOf(url)).toBeGreaterThanOrEqualTo(0);
    });

    it('supports subdomains array urls', function() {
        var options = {
            url : '{s}',
            layer : '',
            style : '',
            subdomains : ['foo', 'bar'],
            tileMatrixSetID : ''
        };

        var provider = new WebMapTileServiceImageryProvider(options);

        var loadImageSpy = spyOn(ImageryProvider, 'loadImage');

        var tilecol = 1;
        var tilerow = 1;
        var level = 1;
        provider.requestImage(tilecol, tilerow, level);
        var url = ImageryProvider.loadImage.calls.mostRecent().args[1];
        expect(['foo', 'bar'].indexOf(url)).toBeGreaterThanOrEqualTo(0);
    });

    it('generates expected tile urls from template', function() {
        var options = {
            url : 'http://wmts.invalid/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
            format : 'image/png',
            layer : 'someLayer',
            style : 'someStyle',
            tileMatrixSetID : 'someTMS',
            tileMatrixLabels : ['first', 'second', 'third']
        };

        var provider = new WebMapTileServiceImageryProvider(options);

        var loadImageSpy = spyOn(ImageryProvider, 'loadImage');

        var tilecol = 12;
        var tilerow = 5;
        var level = 1;
        provider.requestImage(tilecol, tilerow, level);
        var uri = new Uri(ImageryProvider.loadImage.calls.mostRecent().args[1]);
        expect(uri.toString()).toEqual('http://wmts.invalid/someStyle/someTMS/second/5/12.png');
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
                url : 'http://wmts.invalid',
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
                url : 'http://wmts.invalid',
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
                url : 'http://wmts.invalid'
            });
        }
        expect(createWithoutTMS).toThrowDeveloperError();
    });

    // default parameters values
    it('uses default values for undefined parameters', function() {
        var provider = new WebMapTileServiceImageryProvider({
            layer : 'someLayer',
            style : 'someStyle',
            url : 'http://wmts.invalid',
            tileMatrixSetID : 'someTMS'
        });
        expect(provider.format).toEqual('image/jpeg');
        expect(provider.tileWidth).toEqual(256);
        expect(provider.tileHeight).toEqual(256);
        expect(provider.minimumLevel).toEqual(0);
        expect(provider.maximumLevel).toBeUndefined();
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
            url : 'http://wmts.invalid',
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
            url : 'http://wmts.invalid',
            tileMatrixSetID : 'someTMS'
        });
        var provider2 = new WebMapTileServiceImageryProvider({
            layer : 'someLayer',
            style : 'someStyle',
            url : 'http://wmts.invalid?',
            tileMatrixSetID : 'someTMS'
        });

        return pollToPromise(function() {
            return provider1.ready && provider2.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider1.requestImage(0, 0, 0).then(function(image) {
                return provider2.requestImage(0, 0, 0).then(function(image) {
                    expect(loadImage.createImage.calls.count()).toEqual(2);
                    //expect the two image URLs to be the same between the two providers
                    var allCalls = loadImage.createImage.calls.all();
                    expect(allCalls[1].args[0]).toEqual(allCalls[0].args[0]);
                });
            });
        });
    });

    it('requestImage returns a promise for an image and loads it for cross-origin use', function() {
        var provider = new WebMapTileServiceImageryProvider({
            layer : 'someLayer',
            style : 'someStyle',
            url : 'http://wmts.invalid',
            tileMatrixSetID : 'someTMS'
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
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

    it('routes requests through a proxy if one is specified', function() {
        var proxy = new DefaultProxy('/proxy/');
        var provider = new WebMapTileServiceImageryProvider({
            layer : 'someLayer',
            style : 'someStyle',
            url : 'http://wmts.invalid',
            tileMatrixSetID : 'someTMS',
            proxy : proxy
        });

        return pollToPromise(function() {
            return provider.ready;
        }).then(function() {
            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
                expect(url.indexOf(proxy.getURL('http://wmts.invalid'))).toEqual(0);

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            });

            return provider.requestImage(0, 0, 0).then(function(image) {
                expect(loadImage.createImage).toHaveBeenCalled();
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('raises error event when image cannot be loaded', function() {
        var provider = new WebMapTileServiceImageryProvider({
            layer : 'someLayer',
            style : 'someStyle',
            url : 'http://wmts.invalid',
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
});
