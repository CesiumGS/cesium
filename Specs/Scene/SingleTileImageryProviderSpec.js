/*global defineSuite*/
defineSuite([
        'Scene/SingleTileImageryProvider',
        'Core/DefaultProxy',
        'Core/defined',
        'Core/GeographicTilingScheme',
        'Core/jsonp',
        'Core/loadImage',
        'Core/Rectangle',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'ThirdParty/when'
    ], function(
        SingleTileImageryProvider,
        DefaultProxy,
        defined,
        GeographicTilingScheme,
        jsonp,
        loadImage,
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
        expect(SingleTileImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('returns valid value for hasAlphaChannel', function() {
        var provider = new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('properties are gettable', function() {
        var url = 'Data/Images/Red16x16.png';
        var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
        var credit = 'hi';
        var provider = new SingleTileImageryProvider({
            url : url,
            rectangle : rectangle,
            credit : credit
        });

        expect(provider.url).toEqual(url);
        expect(provider.rectangle).toEqual(rectangle);
        expect(provider.hasAlphaChannel).toEqual(true);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.tilingScheme.rectangle).toEqual(rectangle);
            expect(provider.tileWidth).toEqual(16);
            expect(provider.tileHeight).toEqual(16);
            expect(provider.maximumLevel).toEqual(0);
            expect(provider.tileDiscardPolicy).toBeUndefined();
        });
    });

    it('url is required', function() {
        function constructWithoutUrl() {
            return new SingleTileImageryProvider({});
        }
        expect(constructWithoutUrl).toThrowDeveloperError();
    });

    it('requests the single image immediately upon construction', function() {
        var imageUrl = 'Data/Images/Red16x16.png';

        var calledCreateImage = false;
        loadImage.createImage = function(url, crossOrigin, deferred) {
            expect(url).toEqual(imageUrl);
            calledCreateImage = true;
            return loadImage.defaultCreateImage(url, crossOrigin, deferred);
        };

        var provider = new SingleTileImageryProvider({
            url : imageUrl
        });

        expect(calledCreateImage).toEqual(true);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            when(provider.requestImage(0, 0, 0), function(image) {
                tile000Image = image;
            }, 'requested tile to be loaded');
        });

        waitsFor(function() {
            return defined(tile000Image);
        });

        runs(function() {
            expect(tile000Image).toBeInstanceOf(Image);
        });
    });

    it('turns the supplied credit into a logo', function() {
        var provider = new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        });

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var providerWithCredit;

        runs(function() {
            expect(provider.credit).toBeUndefined();

            providerWithCredit = new SingleTileImageryProvider({
                url : 'Data/Images/Red16x16.png',
                credit : 'Thanks to our awesome made up source of this imagery!'
            });
        });

        waitsFor(function() {
            return providerWithCredit.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            expect(providerWithCredit.credit).toBeDefined();
        });
    });

    it('routes requests through a proxy if one is specified', function() {
        var calledCreateImage = false;

        loadImage.createImage = function(url, crossOrigin, deferred) {
            expect(url.indexOf(proxy.getURL('Data/Images/Red16x16.png'))).toEqual(0);

            calledCreateImage = true;
            deferred.resolve();
            return undefined;
        };

        var proxy = new DefaultProxy('/proxy/');
        var provider = new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png',
            proxy : proxy
        });

        expect(provider).toBeDefined();
        expect(provider.proxy).toEqual(proxy);
        expect(calledCreateImage).toEqual(true);
    });

    it('raises error event when image cannot be loaded', function() {
        var provider = new SingleTileImageryProvider({
            url : 'made/up/url'
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
