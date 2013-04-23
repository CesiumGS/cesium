/*global defineSuite*/
defineSuite([
         'Scene/OpenStreetMapImageryProvider',
         'Core/jsonp',
         'Core/loadImage',
         'Core/DefaultProxy',
         'Core/Extent',
         'Core/Math',
         'Scene/Imagery',
         'Scene/ImageryLayer',
         'Scene/ImageryProvider',
         'Scene/ImageryState',
         'Scene/WebMercatorTilingScheme',
         'ThirdParty/when'
     ], function(
         OpenStreetMapImageryProvider,
         jsonp,
         loadImage,
         DefaultProxy,
         Extent,
         CesiumMath,
         Imagery,
         ImageryLayer,
         ImageryProvider,
         ImageryState,
         WebMercatorTilingScheme,
         when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    afterEach(function() {
        jsonp.loadAndExecuteScript = jsonp.defaultLoadAndExecuteScript;
        loadImage.createImage = loadImage.defaultCreateImage;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(OpenStreetMapImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('can be default constructed', function() {
        function defaultConstruct() {
            return new OpenStreetMapImageryProvider();
        }
        expect(defaultConstruct).not.toThrow();
    });

    it('supports a slash at the end of the URL', function() {
        var provider = new OpenStreetMapImageryProvider({
            url : 'made/up/osm/server/'
        });

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        runs(function() {
            var calledLoadImage = false;
            loadImage.createImage = function(url, crossOrigin, deferred) {
                var doubleSlashIndex = url.indexOf('//');
                expect(doubleSlashIndex).toBeLessThan(0);

                calledLoadImage = true;
                deferred.resolve();
                return undefined;
            };

            provider.requestImage(0, 0, 0);
            expect(calledLoadImage).toEqual(true);
        });
    });

    it('supports no slash at the endof the URL', function() {
        var provider = new OpenStreetMapImageryProvider({
            url : 'made/up/osm/server'
        });

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        runs(function() {
            var calledLoadImage = false;
            loadImage.createImage = function(url, crossOrigin, deferred) {
                var index = url.indexOf('made/up/osm/server/');
                expect(index).toBeGreaterThan(-1);

                calledLoadImage = true;
                deferred.resolve();
                return undefined;
            };

            provider.requestImage(0, 0, 0);
            expect(calledLoadImage).toEqual(true);
        });
    });

    it('requestImage returns a promise for an image and loads it for cross-origin use', function() {
        var provider = new OpenStreetMapImageryProvider({
            url : 'made/up/osm/server/'
        });

        expect(provider.getUrl()).toEqual('made/up/osm/server/');

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            expect(provider.getTileWidth()).toEqual(256);
            expect(provider.getTileHeight()).toEqual(256);
            expect(provider.getMaximumLevel()).toEqual(18);
            expect(provider.getTilingScheme()).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.getExtent()).toEqual(new WebMercatorTilingScheme().getExtent());

            loadImage.createImage = function(url, crossOrigin, deferred) {
                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            when(provider.requestImage(0, 0, 0), function(image) {
                tile000Image = image;
            });
        });

        waitsFor(function() {
            return typeof tile000Image !== 'undefined';
        }, 'requested tile to be loaded');

        runs(function() {
            expect(tile000Image).toBeInstanceOf(Image);
        });
    });

    it('when no credit is supplied, a default one is used', function() {
        var provider = new OpenStreetMapImageryProvider({
            url : 'made/up/osm/server'
        });
        expect(provider.getLogo()).toBeDefined();
    });

    it('turns the supplied credit into a logo', function() {
        var providerWithCredit = new OpenStreetMapImageryProvider({
            url : 'made/up/osm/server',
            credit : 'Thanks to our awesome made up source of this imagery!'
        });
        expect(providerWithCredit.getLogo()).toBeDefined();
    });

    it('routes requests through a proxy if one is specified', function() {
        var proxy = new DefaultProxy('/proxy/');
        var provider = new OpenStreetMapImageryProvider({
            url : 'made/up/osm/server',
            proxy : proxy
        });

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url.indexOf(proxy.getURL('made/up/osm/server'))).toEqual(0);
                expect(provider.getProxy()).toEqual(proxy);

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            when(provider.requestImage(0, 0, 0), function(image) {
                tile000Image = image;
            });
        });

        waitsFor(function() {
            return typeof tile000Image !== 'undefined';
        }, 'requested tile to be loaded');

        runs(function() {
            expect(tile000Image).toBeInstanceOf(Image);
        });
    });

    it('extent passed to constructor does not affect tile numbering', function() {
        var extent = new Extent(0.1, 0.2, 0.3, 0.4);
        var provider = new OpenStreetMapImageryProvider({
            url : 'made/up/osm/server',
            extent : extent
        });

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.getTileWidth()).toEqual(256);
            expect(provider.getTileHeight()).toEqual(256);
            expect(provider.getMaximumLevel()).toEqual(18);
            expect(provider.getTilingScheme()).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.getExtent()).toEqual(extent);
            expect(provider.getTileDiscardPolicy()).toBeUndefined();

            var calledLoadImage = false;
            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url.indexOf('/0/0/0')).not.toBeLessThan(0);
                calledLoadImage = true;
                deferred.resolve();
                return undefined;
            };

            provider.requestImage(0, 0, 0);
            expect(calledLoadImage).toEqual(true);
        });
    });

    it('uses maximumLevel passed to constructor', function() {
        var provider = new OpenStreetMapImageryProvider({
            url : 'made/up/osm/server',
            maximumLevel : 5
        });
        expect(provider.getMaximumLevel()).toEqual(5);
    });

    it('raises error event when image cannot be loaded', function() {
        var provider = new OpenStreetMapImageryProvider({
            url : 'made/up/osm/server'
        });

        var layer = new ImageryLayer(provider);

        var tries = 0;
        provider.getErrorEvent().addEventListener(function(error) {
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
            return provider.isReady();
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
