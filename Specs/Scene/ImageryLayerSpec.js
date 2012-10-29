/*global defineSuite*/
defineSuite([
         'Scene/ImageryLayer',
         'Specs/createContext',
         'Specs/destroyContext',
         'Core/Extent',
         'Core/jsonp',
         'Core/loadImage',
         'Scene/BingMapsImageryProvider',
         'Scene/EllipsoidTerrainProvider',
         'Scene/GeographicTilingScheme',
         'Scene/Imagery',
         'Scene/ImageryState',
         'Scene/NeverTileDiscardPolicy',
         'Scene/SingleTileImageryProvider',
         'Scene/Tile',
         'Scene/WebMapServiceImageryProvider'
     ], function(
         ImageryLayer,
         createContext,
         destroyContext,
         Extent,
         jsonp,
         loadImage,
         BingMapsImageryProvider,
         EllipsoidTerrainProvider,
         GeographicTilingScheme,
         Imagery,
         ImageryState,
         NeverTileDiscardPolicy,
         SingleTileImageryProvider,
         Tile,
         WebMapServiceImageryProvider) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    afterEach(function() {
        jsonp.loadAndExecuteScript = jsonp.defaultLoadAndExecuteScript;
        loadImage.createImage = loadImage.defaultCreateImage;
    });

    function CustomDiscardPolicy() {
        this.shouldDiscard = false;
    }

    CustomDiscardPolicy.prototype.isReady = function() {
        return true;
    };

    CustomDiscardPolicy.prototype.shouldDiscardImage = function(image) {
        return this.shouldDiscard;
    };

    it('discards tiles when the ImageryProviders discard policy says to do so', function() {
        loadImage.createImage = function(url, crossOrigin, deferred) {
            return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
        };

        var discardPolicy = new CustomDiscardPolicy();

        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/url',
            layers : 'foo',
            tileDiscardPolicy : discardPolicy
        });

        var layer = new ImageryLayer(provider);

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        var imagery;
        runs(function() {
            discardPolicy.shouldDiscard = true;
            imagery = new Imagery(layer, 0, 0, 0);
            imagery.addReference();
            layer._requestImagery(imagery);
        });

        waitsFor(function() {
            return imagery.state === ImageryState.RECEIVED;
        }, 'image to load');

        runs(function() {
            layer._createTexture(context, imagery);
            expect(imagery.state).toEqual(ImageryState.INVALID);
            imagery.releaseReference();
        });
    });

    it('reprojects web mercator images', function() {
        jsonp.loadAndExecuteScript = function(url, functionName) {
            window[functionName]({
                "authenticationResultCode" : "ValidCredentials",
                "brandLogoUri" : "http:\/\/dev.virtualearth.net\/Branding\/logo_powered_by.png",
                "copyright" : "Copyright © 2012 Microsoft and its suppliers. All rights reserved. This API cannot be accessed and the content and any results may not be used, reproduced or transmitted in any manner without express written permission from Microsoft Corporation.",
                "resourceSets" : [{
                    "estimatedTotal" : 1,
                    "resources" : [{
                        "__type" : "ImageryMetadata:http:\/\/schemas.microsoft.com\/search\/local\/ws\/rest\/v1",
                        "imageHeight" : 256,
                        "imageUrl" : "http:\/\/invalid.{subdomain}.localhost\/tiles\/r{quadkey}?g=1062&lbl=l1&productSet=mmCB",
                        "imageUrlSubdomains" : ["t0"],
                        "imageWidth" : 256,
                        "imageryProviders" : null,
                        "vintageEnd" : null,
                        "vintageStart" : null,
                        "zoomMax" : 21,
                        "zoomMin" : 1
                    }]
                }],
                "statusCode" : 200,
                "statusDescription" : "OK",
                "traceId" : "c9cf8c74a8b24644974288c92e448972|EWRM003311|02.00.171.2600|"
            });
        };

        loadImage.createImage = function(url, crossOrigin, deferred) {
            return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
        };

        var provider = new BingMapsImageryProvider({
            server : 'invalid.localhost',
            tileDiscardPolicy : new NeverTileDiscardPolicy()
        });

        var layer = new ImageryLayer(provider);

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
            layer._createTexture(context, imagery);
        });

        waitsFor(function() {
            return imagery.state === ImageryState.TEXTURE_LOADED;
        }, 'texture to load');

        var textureBeforeReprojection;
        runs(function() {
            textureBeforeReprojection = imagery.texture;
            layer._reprojectTexture(context, imagery);
        });

        waitsFor(function() {
            return imagery.state === ImageryState.READY;
        }, 'texture to be ready');

        runs(function() {
            expect(textureBeforeReprojection).not.toEqual(imagery.texture);
            imagery.releaseReference();
        });
    });

    it('basic properties work as expected', function() {
        var provider = new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        });

        var extent = new Extent(0.1, 0.2, 0.3, 0.4);
        var layer = new ImageryLayer(provider, {
            extent : extent
        });
        expect(layer.getExtent()).toEqual(extent);
        expect(layer.isDestroyed()).toEqual(false);
    });

    it('honors the imagery provider\'s minimum level', function() {
        var tilingScheme = new GeographicTilingScheme();
        var imageryProviderWithMinimumLevel = {
                isReady : function() { return true; },
                getExtent : function() { return Extent.MAX_VALUE; },
                getTileWidth : function() { return 256; },
                getTileHeight : function() { return 256; },
                getMaximumLevel : function() { return 10; },
                getMinimumLevel : function() { return 5; },
                getTilingScheme : function() { return tilingScheme; },
                getTileDiscardPolicy : function() { return undefined; },
                getErrorEvent : function() { return undefined; },
                getLogo : function() { return undefined; },
                requestImage : function(hostnames, hostnameIndex, x, y, level) {
                    expect(level).toBeLessThanOrEqualTo(this.getMaximumLevel());
                    expect(level).toBeGreaterThanOrEqualTo(this.getMinimumLevel());
                    return undefined;
                }
            };

        var layer = new ImageryLayer(imageryProviderWithMinimumLevel);

        waitsFor(function() {
            return imageryProviderWithMinimumLevel.isReady();
        }, 'imagery provider to become ready');

        runs(function() {
            var tile = new Tile({
                x : 0,
                y: 0,
                level : 0,
                tilingScheme : tilingScheme
            });
            var terrainProvider = new EllipsoidTerrainProvider();
            layer._createTileImagerySkeletons(tile, terrainProvider);

            expect(tile.imagery.length).toBeGreaterThan(0);

            for (var i = 0, len = tile.imagery.length; i < len; ++i) {
                var tileImagery = tile.imagery[i];
                var imagery = tileImagery.imagery;
                expect(imagery.level).toBeLessThanOrEqualTo(imageryProviderWithMinimumLevel.getMaximumLevel());
                expect(imagery.level).toBeGreaterThanOrEqualTo(imageryProviderWithMinimumLevel.getMinimumLevel());
            }
        });
    });
});
