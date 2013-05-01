/*global defineSuite*/
defineSuite([
         'Scene/TileMapServiceImageryProvider',
         'Core/jsonp',
         'Core/loadImage',
         'Core/loadXML',
         'Core/DefaultProxy',
         'Core/Extent',
         'Core/Math',
         'Core/WebMercatorProjection',
         'Scene/Imagery',
         'Scene/ImageryLayer',
         'Scene/ImageryProvider',
         'Scene/ImageryState',
         'Scene/WebMercatorTilingScheme',
         'ThirdParty/when'
     ], function(
         TileMapServiceImageryProvider,
         jsonp,
         loadImage,
         loadXML,
         DefaultProxy,
         Extent,
         CesiumMath,
         WebMercatorProjection,
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
        loadXML.loadXML = loadXML.defaultLoadXML;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(TileMapServiceImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('requires the url to be specified', function() {
        function createWithoutUrl() {
            return new TileMapServiceImageryProvider({});
        }
        expect(createWithoutUrl).toThrow();
    });

    it('supports a slash at the end of the URL', function() {
        var provider = new TileMapServiceImageryProvider({
            url : 'made/up/tms/server/'
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
        var provider = new TileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        runs(function() {
            var calledLoadImage = false;
            loadImage.createImage = function(url, crossOrigin, deferred) {
                var index = url.indexOf('made/up/tms/server/');
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
        var provider = new TileMapServiceImageryProvider({
            url : 'made/up/tms/server/'
        });

        expect(provider.getUrl()).toEqual('made/up/tms/server/');

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

    it('when no credit is supplied, the provider has no logo', function() {
        var provider = new TileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });
        expect(provider.getLogo()).toBeUndefined();
    });

    it('turns the supplied credit into a logo', function() {
        var providerWithCredit = new TileMapServiceImageryProvider({
            url : 'made/up/gms/server',
            credit : 'Thanks to our awesome made up source of this imagery!'
        });
        expect(providerWithCredit.getLogo()).toBeDefined();
    });

    it('routes requests through a proxy if one is specified', function() {
        var proxy = new DefaultProxy('/proxy/');
        var provider = new TileMapServiceImageryProvider({
            url : 'made/up/tms/server',
            proxy : proxy
        });

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url.indexOf(proxy.getURL('made/up/tms/server'))).toEqual(0);
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
        var provider = new TileMapServiceImageryProvider({
            url : 'made/up/tms/server',
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
        var provider = new TileMapServiceImageryProvider({
            url : 'made/up/tms/server',
            maximumLevel : 5
        });

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.getMaximumLevel()).toEqual(5);
        });
    });

    it('raises error event when image cannot be loaded', function() {
        var provider = new TileMapServiceImageryProvider({
            url : 'made/up/tms/server'
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

    it('keeps the extent within the bounds allowed by the tiling scheme no matter what the tilemapresource.xml says.', function() {
        loadXML.loadXML = function(url, headers, deferred) {
            var parser = new DOMParser();
            var xmlString =
                "<TileMap version='1.0.0' tilemapservice='http://tms.osgeo.org/1.0.0'>" +
                "  <Title>dnb_land_ocean_ice.2012.54000x27000_geo.tif</Title>" +
                "  <Abstract/>" +
                "  <SRS>EPSG:900913</SRS>" +
                "  <BoundingBox minx='-88.0' miny='-185.0' maxx='88.0' maxy='185.0'/>" +
                "  <Origin x='-88.0' y='-180.00000000000000'/>" +
                "  <TileFormat width='256' height='256' mime-type='image/png' extension='png'/>" +
                "  <TileSets profile='mercator'>" +
                "    <TileSet href='8' units-per-pixel='611.49622617187504' order='8'/>" +
                "  </TileSets>" +
                "</TileMap>";
            var xml = parser.parseFromString(xmlString, "text/xml");
            deferred.resolve(xml);
        };

        var provider = new TileMapServiceImageryProvider({
            url : 'made/up/tms/server'
        });

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.getExtent().west).toEqualEpsilon(CesiumMath.toRadians(-180.0), CesiumMath.EPSILON14);
            expect(provider.getExtent().west).toBeGreaterThanOrEqualTo(provider.getTilingScheme().getExtent().west);
            expect(provider.getExtent().east).toEqualEpsilon(CesiumMath.toRadians(180.0), CesiumMath.EPSILON14);
            expect(provider.getExtent().east).toBeLessThanOrEqualTo(provider.getTilingScheme().getExtent().east);
            expect(provider.getExtent().south).toEqualEpsilon(-WebMercatorProjection.MaximumLatitude, CesiumMath.EPSILON14);
            expect(provider.getExtent().south).toBeGreaterThanOrEqualTo(provider.getTilingScheme().getExtent().south);
            expect(provider.getExtent().north).toEqualEpsilon(WebMercatorProjection.MaximumLatitude, CesiumMath.EPSILON14);
            expect(provider.getExtent().north).toBeLessThanOrEqualTo(provider.getTilingScheme().getExtent().north);
        });
    });
});
