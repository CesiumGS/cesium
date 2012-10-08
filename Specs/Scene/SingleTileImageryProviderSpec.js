/*global defineSuite*/
defineSuite([
         'Scene/SingleTileImageryProvider',
         'Core/jsonp',
         'Core/loadImage',
         'Core/DefaultProxy',
         'Core/Extent',
         'Core/Math',
         'Scene/GeographicTilingScheme',
         'Scene/ImageryProvider',
         'ThirdParty/when'
     ], function(
         SingleTileImageryProvider,
         jsonp,
         loadImage,
         DefaultProxy,
         Extent,
         CesiumMath,
         GeographicTilingScheme,
         ImageryProvider,
         when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    beforeAll(function() {
    });

    afterAll(function() {
    });

    beforeEach(function() {
    });

    afterEach(function() {
        jsonp.loadAndExecuteScript = jsonp.defaultLoadAndExecuteScript;
        loadImage.createImage = loadImage.defaultCreateImage;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(SingleTileImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('properties are gettable', function() {
        var url = 'Data/Images/Red16x16.png';
        var extent = new Extent(0.1, 0.2, 0.3, 0.4);
        var credit = 'hi';
        var provider = new SingleTileImageryProvider({
            url : url,
            extent : extent,
            credit : credit
        });

        expect(provider.getUrl()).toEqual(url);
        expect(provider.getExtent()).toEqual(extent);

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.getTilingScheme()).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.getTilingScheme().getExtent()).toEqual(extent);
            expect(provider.getTileWidth()).toEqual(16);
            expect(provider.getTileHeight()).toEqual(16);
            expect(provider.getMaximumLevel()).toEqual(0);
            expect(provider.getTileDiscardPolicy()).toBeUndefined();
        });
    });

    it('url is required', function() {
        var provider;
        function constructWithoutUrl() {
            provider = new SingleTileImageryProvider({});
        }
        expect(constructWithoutUrl).toThrow();
        expect(provider).toBeUndefined();
    });

    it('requests the single image immediately upon construction', function() {
        var imageUrl = 'Data/Images/Red16x16.png';

        var calledCreateImage = false;
        loadImage.createImage = function(url, crossOrigin, deferred) {
            expect(url).toEqual(imageUrl);
            expect(crossOrigin).toEqual(true);
            calledCreateImage = true;
            return loadImage.defaultCreateImage(url, crossOrigin, deferred);
        };

        var provider = new SingleTileImageryProvider({
            url : imageUrl
        });

        expect(calledCreateImage).toEqual(true);

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            when(provider.requestImage(0, 0, 0), function(image) {
                tile000Image = image;
            }, 'requested tile to be loaded');
        });

        waitsFor(function() {
            return typeof tile000Image !== 'undefined';
        });

        runs(function() {
            expect(tile000Image).toBeInstanceOf(Image);
        });
    });

    it('turns the supplied credit into a logo', function() {
        var provider = new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        });
        expect(provider.getLogo()).toBeUndefined();

        var providerWithCredit = new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png',
            credit : 'Thanks to our awesome made up source of this imagery!'
        });
        expect(providerWithCredit.getLogo()).not.toBeUndefined();
    });

    it('routes requests through a proxy if one is specified', function() {
        var calledCreateImage = false;

        loadImage.createImage = function(url, crossOrigin, deferred) {
            expect(url.indexOf(proxy.getURL('Data/Images/Red16x16.png'))).toEqual(0);
            expect(crossOrigin).toEqual(true);

            calledCreateImage = true;
            deferred.resolve();
            return undefined;
        };

        var proxy = new DefaultProxy('/proxy/');
        var provider = new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png',
            proxy : proxy
        });

        expect(provider).not.toBeUndefined();
        expect(calledCreateImage).toEqual(true);
    });
});
