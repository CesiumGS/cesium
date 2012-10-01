/*global defineSuite*/
defineSuite([
         'Scene/ArcGisMapServerImageryProvider',
         'Core/jsonp',
         'Core/loadImage',
         'Scene/DiscardMissingTileImagePolicy',
         'Scene/GeographicTilingScheme',
         'Scene/ImageryProvider',
         'Scene/WebMercatorTilingScheme',
         'ThirdParty/when'
     ], function(
         ArcGisMapServerImageryProvider,
         jsonp,
         loadImage,
         DiscardMissingTileImagePolicy,
         GeographicTilingScheme,
         ImageryProvider,
         WebMercatorTilingScheme,
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
        expect(ArcGisMapServerImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('supports tiled servers', function() {
        var baseUrl = 'Made/Up/TiledArcGisMapServer';

        jsonp.loadAndExecuteScript = function(url, functionName) {
            expect(url).toEqual(baseUrl + '?callback=' + functionName + '&f=json');
            setTimeout(function() {
                window[functionName]({
                    "currentVersion" : 10.01,
                    "copyrightText" : "Test copyright text",
                    "tileInfo" : {
                        "rows" : 128,
                        "cols" : 256,
                        "origin" : {
                            "x" : -20037508.342787,
                            "y" : 20037508.342787
                        },
                        "spatialReference" : {
                            "wkid" : 102100
                        },
                        "lods" : [
                            {"level" : 0, "resolution" : 156543.033928, "scale" : 591657527.591555},
                            {"level" : 1, "resolution" : 78271.5169639999, "scale" : 295828763.795777},
                            {"level" : 2, "resolution" : 39135.7584820001, "scale" : 147914381.897889}
                        ]
                    }
                });
            }, 1);
        };

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.getUrl()).toEqual(baseUrl);

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            expect(provider.getTileWidth()).toEqual(128);
            expect(provider.getTileHeight()).toEqual(256);
            expect(provider.getMaximumLevel()).toEqual(2);
            expect(provider.getTilingScheme()).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.getLogo()).not.toBeUndefined();
            expect(provider.getTileDiscardPolicy()).toBeInstanceOf(DiscardMissingTileImagePolicy);
            expect(provider.getExtent()).toEqual(new WebMercatorTilingScheme().extent);
            expect(provider.isUsingPrecachedTiles()).toEqual(true);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toEqual(baseUrl + '/tile/0/0/0');
                expect(crossOrigin).toEqual(true);

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

    it('supports non-tiled servers', function() {
        var baseUrl = 'Made/Up/TiledArcGisMapServer';

        jsonp.loadAndExecuteScript = function(url, functionName) {
            expect(url).toEqual(baseUrl + '?callback=' + functionName + '&f=json');
            setTimeout(function() {
                window[functionName]({
                    "currentVersion" : 10.01,
                    "copyrightText" : "Test copyright text"
                });
            }, 1);
        };

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.getUrl()).toEqual(baseUrl);

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            expect(provider.getTileWidth()).toEqual(256);
            expect(provider.getTileHeight()).toEqual(256);
            expect(provider.getMaximumLevel()).toBeUndefined();
            expect(provider.getTilingScheme()).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.getLogo()).not.toBeUndefined();
            expect(provider.getTileDiscardPolicy()).toBeUndefined();
            expect(provider.getExtent()).toEqual(new GeographicTilingScheme().extent);
            expect(provider.isUsingPrecachedTiles()).toEqual(false);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toMatch('f=image');
                expect(url).toMatch('bboxSR=4326');
                expect(url).toMatch('imageSR=4326');
                expect(url).toMatch('format=png');
                expect(url).toMatch('transparent=true');
                expect(url).toMatch('size=256%2C256');
                expect(crossOrigin).toEqual(true);

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
});
