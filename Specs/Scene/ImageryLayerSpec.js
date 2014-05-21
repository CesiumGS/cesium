/*global defineSuite*/
defineSuite([
        'Scene/ImageryLayer',
        'Core/EllipsoidTerrainProvider',
        'Core/jsonp',
        'Core/loadImage',
        'Core/loadWithXhr',
        'Core/Rectangle',
        'Scene/BingMapsImageryProvider',
        'Scene/GlobeSurfaceTile',
        'Scene/Imagery',
        'Scene/ImageryLayerCollection',
        'Scene/ImageryState',
        'Scene/NeverTileDiscardPolicy',
        'Scene/QuadtreeTile',
        'Scene/SingleTileImageryProvider',
        'Scene/TileMapServiceImageryProvider',
        'Scene/WebMapServiceImageryProvider',
        'Specs/createContext',
        'Specs/destroyContext'
    ], function(
        ImageryLayer,
        EllipsoidTerrainProvider,
        jsonp,
        loadImage,
        loadWithXhr,
        Rectangle,
        BingMapsImageryProvider,
        GlobeSurfaceTile,
        Imagery,
        ImageryLayerCollection,
        ImageryState,
        NeverTileDiscardPolicy,
        QuadtreeTile,
        SingleTileImageryProvider,
        TileMapServiceImageryProvider,
        WebMapServiceImageryProvider,
        createContext,
        destroyContext) {
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
        loadWithXhr.load = loadWithXhr.defaultLoad;
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

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
        };

        var discardPolicy = new CustomDiscardPolicy();

        var provider = new WebMapServiceImageryProvider({
            url : 'made/up/url',
            layers : 'foo',
            tileDiscardPolicy : discardPolicy
        });

        var layer = new ImageryLayer(provider);

        waitsFor(function() {
            return provider.ready;
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
                        "imageUrl" : "http:\/\/invalid.{subdomain}.invalid\/tiles\/r{quadkey}?g=1062&lbl=l1&productSet=mmCB",
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

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
        };

        var provider = new BingMapsImageryProvider({
            url : 'http://host.invalid',
            tileDiscardPolicy : new NeverTileDiscardPolicy()
        });

        var layer = new ImageryLayer(provider);

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

        var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
        var layer = new ImageryLayer(provider, {
            rectangle : rectangle
        });
        expect(layer.rectangle).toEqual(rectangle);
        expect(layer.isDestroyed()).toEqual(false);
        layer.destroy();
        expect(layer.isDestroyed()).toEqual(true);
    });

    it('createTileImagerySkeletons handles a base layer that does not cover the entire globe', function() {
        var provider = new TileMapServiceImageryProvider({
            url : 'Data/TMS/SmallArea'
        });

        var layers = new ImageryLayerCollection();
        var layer = layers.addImageryProvider(provider);
        var terrainProvider = new EllipsoidTerrainProvider();

        waitsFor(function() {
            return provider.ready && terrainProvider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            var tiles = QuadtreeTile.createLevelZeroTiles(terrainProvider.tilingScheme);
            tiles[0].data = new GlobeSurfaceTile();
            tiles[1].data = new GlobeSurfaceTile();

            layer._createTileImagerySkeletons(tiles[0], terrainProvider);
            layer._createTileImagerySkeletons(tiles[1], terrainProvider);

            // Both tiles should have imagery from this layer completely covering them.
            expect(tiles[0].data.imagery.length).toBe(4);
            expect(tiles[0].data.imagery[0].textureCoordinateRectangle.x).toBe(0.0);
            expect(tiles[0].data.imagery[0].textureCoordinateRectangle.w).toBe(1.0);
            expect(tiles[0].data.imagery[1].textureCoordinateRectangle.x).toBe(0.0);
            expect(tiles[0].data.imagery[1].textureCoordinateRectangle.y).toBe(0.0);
            expect(tiles[0].data.imagery[2].textureCoordinateRectangle.z).toBe(1.0);
            expect(tiles[0].data.imagery[2].textureCoordinateRectangle.w).toBe(1.0);
            expect(tiles[0].data.imagery[3].textureCoordinateRectangle.y).toBe(0.0);
            expect(tiles[0].data.imagery[3].textureCoordinateRectangle.z).toBe(1.0);

            expect(tiles[1].data.imagery.length).toBe(2);
            expect(tiles[1].data.imagery[0].textureCoordinateRectangle.x).toBe(0.0);
            expect(tiles[1].data.imagery[0].textureCoordinateRectangle.w).toBe(1.0);
            expect(tiles[1].data.imagery[0].textureCoordinateRectangle.z).toBe(1.0);
            expect(tiles[1].data.imagery[1].textureCoordinateRectangle.x).toBe(0.0);
            expect(tiles[1].data.imagery[1].textureCoordinateRectangle.y).toBe(0.0);
            expect(tiles[1].data.imagery[1].textureCoordinateRectangle.z).toBe(1.0);
        });
    });

    it('createTileImagerySkeletons handles a non-base layer that does not cover the entire globe', function() {
        var baseProvider = new SingleTileImageryProvider({
            url : 'Data/Images/Green4x4.png'
        });

        var provider = new TileMapServiceImageryProvider({
            url : 'Data/TMS/SmallArea'
        });

        var layers = new ImageryLayerCollection();
        layers.addImageryProvider(baseProvider);
        var layer = layers.addImageryProvider(provider);
        var terrainProvider = new EllipsoidTerrainProvider();

        waitsFor(function() {
            return provider.ready && terrainProvider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            var tiles = QuadtreeTile.createLevelZeroTiles(terrainProvider.tilingScheme);
            tiles[0].data = new GlobeSurfaceTile();
            tiles[1].data = new GlobeSurfaceTile();

            layer._createTileImagerySkeletons(tiles[0], terrainProvider);
            layer._createTileImagerySkeletons(tiles[1], terrainProvider);

            // Only the western tile should have imagery from this layer.
            // And the imagery should not cover it completely.
            expect(tiles[0].data.imagery.length).toBe(4);
            expect(tiles[0].data.imagery[0].textureCoordinateRectangle.x).not.toBe(0.0);
            expect(tiles[0].data.imagery[0].textureCoordinateRectangle.y).not.toBe(0.0);
            expect(tiles[0].data.imagery[0].textureCoordinateRectangle.z).not.toBe(1.0);
            expect(tiles[0].data.imagery[0].textureCoordinateRectangle.w).not.toBe(1.0);
            expect(tiles[0].data.imagery[1].textureCoordinateRectangle.x).not.toBe(0.0);
            expect(tiles[0].data.imagery[1].textureCoordinateRectangle.y).not.toBe(0.0);
            expect(tiles[0].data.imagery[1].textureCoordinateRectangle.z).not.toBe(1.0);
            expect(tiles[0].data.imagery[1].textureCoordinateRectangle.w).not.toBe(1.0);
            expect(tiles[0].data.imagery[2].textureCoordinateRectangle.x).not.toBe(0.0);
            expect(tiles[0].data.imagery[2].textureCoordinateRectangle.y).not.toBe(0.0);
            expect(tiles[0].data.imagery[2].textureCoordinateRectangle.z).not.toBe(1.0);
            expect(tiles[0].data.imagery[2].textureCoordinateRectangle.w).not.toBe(1.0);
            expect(tiles[0].data.imagery[3].textureCoordinateRectangle.x).not.toBe(0.0);
            expect(tiles[0].data.imagery[3].textureCoordinateRectangle.y).not.toBe(0.0);
            expect(tiles[0].data.imagery[3].textureCoordinateRectangle.z).not.toBe(1.0);
            expect(tiles[0].data.imagery[3].textureCoordinateRectangle.w).not.toBe(1.0);

            expect(tiles[1].data.imagery.length).toBe(0);
        });
    });

    it('createTileImagerySkeletons honors the minimumTerrainLevel and maximumTerrainLevel properties', function() {
        var provider = new SingleTileImageryProvider({
            url : 'Data/Images/Green4x4.png'
        });

        var layer = new ImageryLayer(provider, {
            minimumTerrainLevel : 2,
            maximumTerrainLevel : 4
        });

        var layers = new ImageryLayerCollection();
        layers.add(layer);

        var terrainProvider = new EllipsoidTerrainProvider();

        waitsFor(function() {
            return provider.ready && terrainProvider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            var level0 = QuadtreeTile.createLevelZeroTiles(terrainProvider.tilingScheme);
            var level1 = level0[0].children;
            var level2 = level1[0].children;
            var level3 = level2[0].children;
            var level4 = level3[0].children;
            var level5 = level4[0].children;

            level0[0].data = new GlobeSurfaceTile();
            level1[0].data = new GlobeSurfaceTile();
            level2[0].data = new GlobeSurfaceTile();
            level3[0].data = new GlobeSurfaceTile();
            level4[0].data = new GlobeSurfaceTile();
            level5[0].data = new GlobeSurfaceTile();

            layer._createTileImagerySkeletons(level0[0], terrainProvider);
            expect(level0[0].data.imagery.length).toBe(0);

            layer._createTileImagerySkeletons(level1[0], terrainProvider);
            expect(level1[0].data.imagery.length).toBe(0);

            layer._createTileImagerySkeletons(level2[0], terrainProvider);
            expect(level2[0].data.imagery.length).toBe(1);

            layer._createTileImagerySkeletons(level3[0], terrainProvider);
            expect(level3[0].data.imagery.length).toBe(1);

            layer._createTileImagerySkeletons(level4[0], terrainProvider);
            expect(level4[0].data.imagery.length).toBe(1);

            layer._createTileImagerySkeletons(level5[0], terrainProvider);
            expect(level5[0].data.imagery.length).toBe(0);
        });
    });
}, 'WebGL');
