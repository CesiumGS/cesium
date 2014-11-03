/*global defineSuite*/
defineSuite([
        'Scene/SingleTileImageryProvider',
        'Core/DefaultProxy',
        'Core/GeographicTilingScheme',
        'Core/loadImage',
        'Core/Rectangle',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'Specs/waitsForPromise'
    ], function(
        SingleTileImageryProvider,
        DefaultProxy,
        GeographicTilingScheme,
        loadImage,
        Rectangle,
        Imagery,
        ImageryLayer,
        ImageryProvider,
        ImageryState,
        waitsForPromise) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    afterEach(function() {
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

        spyOn(loadImage, 'createImage').andCallFake(function(url, crossOrigin, deferred) {
            expect(url).toEqual(imageUrl);
            loadImage.defaultCreateImage(url, crossOrigin, deferred);
        });

        var provider = new SingleTileImageryProvider({
            url : imageUrl
        });

        expect(loadImage.createImage).toHaveBeenCalled();

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            waitsForPromise(provider.requestImage(0, 0, 0), function(image) {
                expect(image).toBeInstanceOf(Image);
            });
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
        var imageUrl = 'Data/Images/Red16x16.png';

        spyOn(loadImage, 'createImage').andCallFake(function(url, crossOrigin, deferred) {
            expect(url.indexOf(proxy.getURL('Data/Images/Red16x16.png'))).toEqual(0);
            loadImage.defaultCreateImage(url, crossOrigin, deferred);
        });

        var proxy = new DefaultProxy('/proxy/');
        var provider = new SingleTileImageryProvider({
            url : imageUrl,
            proxy : proxy
        });

        expect(loadImage.createImage).toHaveBeenCalled();

        expect(provider).toBeDefined();
        expect(provider.proxy).toEqual(proxy);
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
