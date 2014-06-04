/*global defineSuite*/
defineSuite([
        'Scene/ArcGisMapServerImageryProvider',
        'Core/Cartesian2',
        'Core/DefaultProxy',
        'Core/defined',
        'Core/GeographicProjection',
        'Core/GeographicTilingScheme',
        'Core/jsonp',
        'Core/loadImage',
        'Core/loadWithXhr',
        'Core/Rectangle',
        'Core/WebMercatorProjection',
        'Core/WebMercatorTilingScheme',
        'Scene/DiscardMissingTileImagePolicy',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'ThirdParty/when'
    ], function(
        ArcGisMapServerImageryProvider,
        Cartesian2,
        DefaultProxy,
        defined,
        GeographicProjection,
        GeographicTilingScheme,
        jsonp,
        loadImage,
        loadWithXhr,
        Rectangle,
        WebMercatorProjection,
        WebMercatorTilingScheme,
        DiscardMissingTileImagePolicy,
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
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(ArcGisMapServerImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('constructor throws if url is not specified', function() {
        function constructWithoutUrl() {
            return new ArcGisMapServerImageryProvider({});
        }
        expect(constructWithoutUrl).toThrowDeveloperError();
    });

    it('returns valid value for hasAlphaChannel', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

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

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            expect(typeof provider.hasAlphaChannel).toBe('boolean');
        });
    });

    it('supports tiled servers in web mercator projection', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

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

        expect(provider.url).toEqual(baseUrl);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            expect(provider.tileWidth).toEqual(128);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toEqual(2);
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.credit).toBeDefined();
            expect(provider.tileDiscardPolicy).toBeInstanceOf(DiscardMissingTileImagePolicy);
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
            expect(provider.usingPrecachedTiles).toEqual(true);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                if (url.indexOf('blob:') !== 0) {
                    expect(url).toEqual(baseUrl + '/tile/0/0/0');
                }

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual(baseUrl + '/tile/0/0/0');

                // Just return any old image.
                return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            when(provider.requestImage(0, 0, 0), function(image) {
                tile000Image = image;
            });
        });

        waitsFor(function() {
            return defined(tile000Image);
        }, 'requested tile to be loaded');

        runs(function() {
            expect(tile000Image).toBeInstanceOf(Image);
        });
    });

    it('supports tiled servers in geographic projection', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

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

        expect(provider.url).toEqual(baseUrl);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            expect(provider.tileWidth).toEqual(128);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toEqual(2);
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.credit).toBeDefined();
            expect(provider.tileDiscardPolicy).toBeInstanceOf(DiscardMissingTileImagePolicy);
            expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);
            expect(provider.usingPrecachedTiles).toEqual(true);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                if (url.indexOf('blob:') !== 0) {
                    expect(url).toEqual(baseUrl + '/tile/0/0/0');
                }

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual(baseUrl + '/tile/0/0/0');

                // Just return any old image.
                return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            when(provider.requestImage(0, 0, 0), function(image) {
                tile000Image = image;
            });
        });

        waitsFor(function() {
            return defined(tile000Image);
        }, 'requested tile to be loaded');

        runs(function() {
            expect(tile000Image).toBeInstanceOf(Image);
        });
    });

    it('supports non-tiled servers', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

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

        expect(provider.url).toEqual(baseUrl);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            expect(provider.tileWidth).toEqual(256);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toBeUndefined();
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.credit).toBeDefined();
            expect(provider.tileDiscardPolicy).toBeUndefined();
            expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);
            expect(provider.usingPrecachedTiles).toEqual(false);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toMatch(baseUrl);
                expect(url).toMatch('f=image');
                expect(url).toMatch('bboxSR=4326');
                expect(url).toMatch('imageSR=4326');
                expect(url).toMatch('format=png');
                expect(url).toMatch('transparent=true');
                expect(url).toMatch('size=256%2C256');

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            when(provider.requestImage(0, 0, 0), function(image) {
                tile000Image = image;
            });
        });

        waitsFor(function() {
            return defined(tile000Image);
        }, 'requested tile to be loaded');

        runs(function() {
            expect(tile000Image).toBeInstanceOf(Image);
        });
    });

    it('routes requests through a proxy if one is specified', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';
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

        expect(provider.url).toEqual(baseUrl);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            expect(provider.tileWidth).toEqual(128);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toEqual(2);
            expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.credit).toBeDefined();
            expect(provider.tileDiscardPolicy).toBeInstanceOf(DiscardMissingTileImagePolicy);
            expect(provider.rectangle).toEqual(new GeographicTilingScheme().rectangle);
            expect(provider.proxy).toEqual(proxy);
            expect(provider.usingPrecachedTiles).toEqual(true);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                if (url.indexOf('blob:') !== 0) {
                    expect(url).toEqual(proxy.getURL(baseUrl + '/tile/0/0/0'));
                }

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual(proxy.getURL(baseUrl + '/tile/0/0/0'));

                // Just return any old image.
                return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            when(provider.requestImage(0, 0, 0), function(image) {
                tile000Image = image;
            });
        });

        waitsFor(function() {
            return defined(tile000Image);
        }, 'requested tile to be loaded');

        runs(function() {
            expect(tile000Image).toBeInstanceOf(Image);
        });
    });

    it('raises error on unsupported WKID', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

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

        expect(provider.url).toEqual(baseUrl);

        var tries = 0;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.message.indexOf('WKID') >= 0).toEqual(true);
            ++tries;
            if (tries < 3) {
                error.retry = true;
            }
        });

        waitsFor(function() {
            return provider.ready || tries >= 3;
        }, 'imagery provider to become ready or retry maximum number of times');

        runs(function() {
            expect(provider.ready).toEqual(false);
            expect(tries).toEqual(3);
        });
    });

    it('raises error on invalid URL', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.url).toEqual(baseUrl);

        var errorEventRaised = false;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.message.indexOf(baseUrl) >= 0).toEqual(true);
            errorEventRaised = true;
        });

        waitsFor(function() {
            return provider.ready || errorEventRaised;
        }, 'imagery provider to become ready or raise error event');

        runs(function() {
            expect(provider.ready).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });

    it('raises error event when image cannot be loaded', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

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

    it('honors fullExtent of tiled server with web mercator projection', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

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
                    },
                    fullExtent : {
                        "xmin": 1.1148026611962173E7,
                        "ymin": -6443518.758206591,
                        "xmax": 1.8830976498143446E7,
                        "ymax": -265936.19697360107,
                        "spatialReference": {"wkid": 102100}
                    }
                });
            }, 1);
        };

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.url).toEqual(baseUrl);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            var projection = new WebMercatorProjection();
            var sw = projection.unproject(new Cartesian2(1.1148026611962173E7, -6443518.758206591));
            var ne = projection.unproject(new Cartesian2(1.8830976498143446E7, -265936.19697360107));
            var rectangle = new Rectangle(sw.longitude, sw.latitude, ne.longitude, ne.latitude);
            expect(provider.rectangle).toEqual(rectangle);
        });
    });

    it('honors fullExtent of tiled server with geographic projection', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

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
                    },
                    fullExtent : {
                        "xmin": -123.4,
                        "ymin": -23.2,
                        "xmax": 100.7,
                        "ymax": 45.2,
                        "spatialReference": {"wkid": 4326}
                    }
                });
            }, 1);
        };

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.url).toEqual(baseUrl);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            var projection = new GeographicProjection();
            var sw = projection.unproject(new Cartesian2(-123.4, -23.2));
            var ne = projection.unproject(new Cartesian2(100.7, 45.2));
            var rectangle = new Rectangle(sw.longitude, sw.latitude, ne.longitude, ne.latitude);
            expect(provider.rectangle).toEqual(rectangle);
        });
    });

    it('raises error if the spatialReference of the fullExtent is unknown', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

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
                    },
                    fullExtent : {
                        "xmin": -123.4,
                        "ymin": -23.2,
                        "xmax": 100.7,
                        "ymax": 45.2,
                        "spatialReference": {"wkid": 1234}
                    }
                });
            }, 1);
        };

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.url).toEqual(baseUrl);

        var tries = 0;
        provider.errorEvent.addEventListener(function(error) {
            expect(error.message.indexOf('WKID') >= 0).toEqual(true);
            ++tries;
            if (tries < 3) {
                error.retry = true;
            }
        });

        waitsFor(function() {
            return provider.ready || tries >= 3;
        }, 'imagery provider to become ready or retry maximum number of times');

        runs(function() {
            expect(provider.ready).toEqual(false);
            expect(tries).toEqual(3);
        });
    });
});
