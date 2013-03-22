/*global defineSuite*/
defineSuite([
         'Scene/ArcGisMapServerImageryProvider',
         'Core/jsonp',
         'Core/loadImage',
         'Core/DefaultProxy',
         'Scene/DiscardMissingTileImagePolicy',
         'Scene/GeographicTilingScheme',
         'Scene/Imagery',
         'Scene/ImageryLayer',
         'Scene/ImageryProvider',
         'Scene/ImageryState',
         'Scene/WebMercatorTilingScheme',
         'ThirdParty/when'
     ], function(
         ArcGisMapServerImageryProvider,
         jsonp,
         loadImage,
         DefaultProxy,
         DiscardMissingTileImagePolicy,
         GeographicTilingScheme,
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
        expect(ArcGisMapServerImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('constructor throws if url is not specified', function() {
        function constructWithoutUrl() {
            return new ArcGisMapServerImageryProvider({});
        }
        expect(constructWithoutUrl).toThrow();
    });

    it('supports tiled servers in web mercator projection', function() {
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
            expect(provider.getLogo()).toBeDefined();
            expect(provider.getTileDiscardPolicy()).toBeInstanceOf(DiscardMissingTileImagePolicy);
            expect(provider.getExtent()).toEqual(new WebMercatorTilingScheme().getExtent());
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

    it('supports tiled servers in geographic projection', function() {
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
                            "x" : -180,
                            "y" : 90
                        },
                        "spatialReference" : {
                            "wkid" : 4326
                        },
                        "lods" : [
                            {"level" : 0, "resolution" : 0.3515625, "scale" : 147748799.285417},
                            {"level" : 1, "resolution" : 0.17578125, "scale" : 73874399.6427087},
                            {"level" : 2, "resolution" : 0.087890625, "scale" : 36937199.8213544}
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
            expect(provider.getTilingScheme()).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.getLogo()).toBeDefined();
            expect(provider.getTileDiscardPolicy()).toBeInstanceOf(DiscardMissingTileImagePolicy);
            expect(provider.getExtent()).toEqual(new GeographicTilingScheme().getExtent());
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
            expect(provider.getLogo()).toBeDefined();
            expect(provider.getTileDiscardPolicy()).toBeUndefined();
            expect(provider.getExtent()).toEqual(new GeographicTilingScheme().getExtent());
            expect(provider.isUsingPrecachedTiles()).toEqual(false);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toMatch(baseUrl);
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

    it('routes requests through a proxy if one is specified', function() {
        var baseUrl = 'Made/Up/TiledArcGisMapServer';
        var proxy = new DefaultProxy('/proxy/');

        jsonp.loadAndExecuteScript = function(url, functionName) {
            expect(url).toEqual(proxy.getURL(baseUrl + '?callback=' + functionName + '&f=json'));
            setTimeout(function() {
                window[functionName]({
                    "currentVersion" : 10.01,
                    "copyrightText" : "Test copyright text",
                    "tileInfo" : {
                        "rows" : 128,
                        "cols" : 256,
                        "origin" : {
                            "x" : -180,
                            "y" : 90
                        },
                        "spatialReference" : {
                            "wkid" : 4326
                        },
                        "lods" : [
                            {"level" : 0, "resolution" : 0.3515625, "scale" : 147748799.285417},
                            {"level" : 1, "resolution" : 0.17578125, "scale" : 73874399.6427087},
                            {"level" : 2, "resolution" : 0.087890625, "scale" : 36937199.8213544}
                        ]
                    }
                });
            }, 1);
        };

        loadImage.createImage = function(url, crossOrigin, deferred) {
            return undefined;
        };

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl,
            proxy : proxy
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
            expect(provider.getTilingScheme()).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.getLogo()).toBeDefined();
            expect(provider.getTileDiscardPolicy()).toBeInstanceOf(DiscardMissingTileImagePolicy);
            expect(provider.getExtent()).toEqual(new GeographicTilingScheme().getExtent());
            expect(provider.getProxy()).toEqual(proxy);
            expect(provider.isUsingPrecachedTiles()).toEqual(true);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toEqual(proxy.getURL(baseUrl + '/tile/0/0/0'));
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

    it('raises error on unsupported WKID', function() {
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
                            "x" : -180,
                            "y" : 90
                        },
                        "spatialReference" : {
                            "wkid" : 1234
                        },
                        "lods" : [
                            {"level" : 0, "resolution" : 0.3515625, "scale" : 147748799.285417},
                            {"level" : 1, "resolution" : 0.17578125, "scale" : 73874399.6427087},
                            {"level" : 2, "resolution" : 0.087890625, "scale" : 36937199.8213544}
                        ]
                    }
                });
            }, 1);
        };

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.getUrl()).toEqual(baseUrl);

        var tries = 0;
        provider.getErrorEvent().addEventListener(function(error) {
            expect(error.message.indexOf('WKID') >= 0).toEqual(true);
            ++tries;
            if (tries < 3) {
                error.retry = true;
            }
        });

        waitsFor(function() {
            return provider.isReady() || tries >= 3;
        }, 'imagery provider to become ready or retry maximum number of times');

        runs(function() {
            expect(provider.isReady()).toEqual(false);
            expect(tries).toEqual(3);
        });
    });

    it('raises error on invalid URL', function() {
        var baseUrl = 'Made/Up/TiledArcGisMapServer';

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.getUrl()).toEqual(baseUrl);

        var errorEventRaised = false;
        provider.getErrorEvent().addEventListener(function(error) {
            expect(error.message.indexOf(baseUrl) >= 0).toEqual(true);
            errorEventRaised = true;
        });

        waitsFor(function() {
            return provider.isReady() || errorEventRaised;
        }, 'imagery provider to become ready or raise error event');

        runs(function() {
            expect(provider.isReady()).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });

    it('raises error event when image cannot be loaded', function() {
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
