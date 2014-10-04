/*global defineSuite*/
defineSuite([
        'Scene/ArcGisMapServerImageryProvider',
        'Core/Cartesian2',
        'Core/DefaultProxy',
        'Core/GeographicProjection',
        'Core/GeographicTilingScheme',
        'Core/jsonp',
        'Core/loadImage',
        'Core/loadWithXhr',
        'Core/queryToObject',
        'Core/Rectangle',
        'Core/WebMercatorProjection',
        'Core/WebMercatorTilingScheme',
        'Scene/DiscardMissingTileImagePolicy',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'Specs/waitsForPromise',
        'ThirdParty/Uri'
    ], function(
        ArcGisMapServerImageryProvider,
        Cartesian2,
        DefaultProxy,
        GeographicProjection,
        GeographicTilingScheme,
        jsonp,
        loadImage,
        loadWithXhr,
        queryToObject,
        Rectangle,
        WebMercatorProjection,
        WebMercatorTilingScheme,
        DiscardMissingTileImagePolicy,
        Imagery,
        ImageryLayer,
        ImageryProvider,
        ImageryState,
        waitsForPromise,
        Uri) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    afterEach(function() {
        jsonp.loadAndExecuteScript = jsonp.defaultLoadAndExecuteScript;
        loadImage.createImage = loadImage.defaultCreateImage;
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    function expectCorrectUrl(expectedBaseUrl, actualUrl, functionName, withProxy) {
        var uri = new Uri(actualUrl);

        if (withProxy) {
            uri = new Uri(decodeURIComponent(uri.query));
        }

        var params = queryToObject(uri.query);

        var uriWithoutQuery = new Uri(uri);
        uriWithoutQuery.query = '';

        expect(uriWithoutQuery.toString()).toEqual(expectedBaseUrl);

        expect(params).toEqual({
            callback : functionName,
            'f' : 'json'
        });
    }

    function stubJSONPCall(baseUrl, result, withProxy) {
        jsonp.loadAndExecuteScript = function(url, functionName) {
            expectCorrectUrl(baseUrl, url, functionName, withProxy);
            setTimeout(function() {
                window[functionName](result);
            }, 1);
        };
    }

    it('conforms to ImageryProvider interface', function() {
        expect(ArcGisMapServerImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('constructor throws if url is not specified', function() {
        expect(function() {
            return new ArcGisMapServerImageryProvider({});
        }).toThrowDeveloperError();
    });

    var webMercatorResult = {
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
            "lods" : [{
                "level" : 0,
                "resolution" : 156543.033928,
                "scale" : 591657527.591555
            }, {
                "level" : 1,
                "resolution" : 78271.5169639999,
                "scale" : 295828763.795777
            }, {
                "level" : 2,
                "resolution" : 39135.7584820001,
                "scale" : 147914381.897889
            }]
        }
    };

    it('supports tiled servers in web mercator projection', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

        stubJSONPCall(baseUrl, webMercatorResult);

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.url).toEqual(baseUrl);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.tileWidth).toEqual(128);
            expect(provider.tileHeight).toEqual(256);
            expect(provider.maximumLevel).toEqual(2);
            expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.credit).toBeDefined();
            expect(provider.tileDiscardPolicy).toBeInstanceOf(DiscardMissingTileImagePolicy);
            expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
            expect(provider.usingPrecachedTiles).toEqual(true);
            expect(provider.hasAlphaChannel).toBeDefined();

            loadImage.createImage = function(url, crossOrigin, deferred) {
                if (/^blob:/.test(url)) {
                    // load blob url normally
                    loadImage.defaultCreateImage(url, crossOrigin, deferred);
                } else {
                    expect(url).toEqual(baseUrl + '/tile/0/0/0');

                    // Just return any old image.
                    loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
                }
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual(baseUrl + '/tile/0/0/0');

                // Just return any old image.
                loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            waitsForPromise(provider.requestImage(0, 0, 0), function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    var geographicResult = {
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
            "lods" : [{
                "level" : 0,
                "resolution" : 0.3515625,
                "scale" : 147748799.285417
            }, {
                "level" : 1,
                "resolution" : 0.17578125,
                "scale" : 73874399.6427087
            }, {
                "level" : 2,
                "resolution" : 0.087890625,
                "scale" : 36937199.8213544
            }]
        }
    };

    it('supports tiled servers in geographic projection', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

        stubJSONPCall(baseUrl, geographicResult);

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.url).toEqual(baseUrl);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

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
                if (/^blob:/.test(url)) {
                    // load blob url normally
                    loadImage.defaultCreateImage(url, crossOrigin, deferred);
                } else {
                    expect(url).toEqual(baseUrl + '/tile/0/0/0');

                    // Just return any old image.
                    loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
                }
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual(baseUrl + '/tile/0/0/0');

                // Just return any old image.
                loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            waitsForPromise(provider.requestImage(0, 0, 0), function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('supports non-tiled servers', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

        stubJSONPCall(baseUrl, {
            "currentVersion" : 10.01,
            "copyrightText" : "Test copyright text"
        });

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.url).toEqual(baseUrl);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

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
                var uri = new Uri(url);
                var params = queryToObject(uri.query);

                var uriWithoutQuery = new Uri(uri);
                uriWithoutQuery.query = '';

                expect(uriWithoutQuery.toString()).toEqual(baseUrl + '/export');

                expect(params.f).toEqual('image');
                expect(params.bboxSR).toEqual('4326');
                expect(params.imageSR).toEqual('4326');
                expect(params.format).toEqual('png');
                expect(params.transparent).toEqual('true');
                expect(params.size).toEqual('256,256');

                // Just return any old image.
                loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            waitsForPromise(provider.requestImage(0, 0, 0), function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('routes requests through a proxy if one is specified', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';
        var proxy = new DefaultProxy('/proxy/');

        stubJSONPCall(baseUrl, geographicResult, true);

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl,
            proxy : proxy
        });

        expect(provider.url).toEqual(baseUrl);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

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
                if (/^blob:/.test(url)) {
                    // load blob url normally
                    loadImage.defaultCreateImage(url, crossOrigin, deferred);
                } else {
                    expect(url).toEqual(baseUrl + '/tile/0/0/0');

                    // Just return any old image.
                    loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
                }
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual(proxy.getURL(baseUrl + '/tile/0/0/0'));

                // Just return any old image.
                loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            waitsForPromise(provider.requestImage(0, 0, 0), function(image) {
                expect(image).toBeInstanceOf(Image);
            });
        });
    });

    it('raises error on unsupported WKID', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

        var unsupportedWKIDResult = {
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
                "lods" : [{
                    "level" : 0,
                    "resolution" : 0.3515625,
                    "scale" : 147748799.285417
                }, {
                    "level" : 1,
                    "resolution" : 0.17578125,
                    "scale" : 73874399.6427087
                }, {
                    "level" : 2,
                    "resolution" : 0.087890625,
                    "scale" : 36937199.8213544
                }]
            }
        };

        stubJSONPCall(baseUrl, unsupportedWKIDResult);

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

        stubJSONPCall(baseUrl, {
            "currentVersion" : 10.01,
            "copyrightText" : "Test copyright text"
        });

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

    it('honors fullExtent of tiled server with web mercator projection', function() {
        var baseUrl = '//tiledArcGisMapServer.invalid';

        var webMercatorFullExtentResult = {
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
                "lods" : [{
                    "level" : 0,
                    "resolution" : 156543.033928,
                    "scale" : 591657527.591555
                }, {
                    "level" : 1,
                    "resolution" : 78271.5169639999,
                    "scale" : 295828763.795777
                }, {
                    "level" : 2,
                    "resolution" : 39135.7584820001,
                    "scale" : 147914381.897889
                }]
            },
            fullExtent : {
                "xmin" : 1.1148026611962173E7,
                "ymin" : -6443518.758206591,
                "xmax" : 1.8830976498143446E7,
                "ymax" : -265936.19697360107,
                "spatialReference" : {
                    "wkid" : 102100
                }
            }
        };

        stubJSONPCall(baseUrl, webMercatorFullExtentResult);

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.url).toEqual(baseUrl);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

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

        var geographicFullExtentResult = {
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
                "lods" : [{
                    "level" : 0,
                    "resolution" : 156543.033928,
                    "scale" : 591657527.591555
                }, {
                    "level" : 1,
                    "resolution" : 78271.5169639999,
                    "scale" : 295828763.795777
                }, {
                    "level" : 2,
                    "resolution" : 39135.7584820001,
                    "scale" : 147914381.897889
                }]
            },
            fullExtent : {
                "xmin" : -123.4,
                "ymin" : -23.2,
                "xmax" : 100.7,
                "ymax" : 45.2,
                "spatialReference" : {
                    "wkid" : 4326
                }
            }
        };

        stubJSONPCall(baseUrl, geographicFullExtentResult);

        var provider = new ArcGisMapServerImageryProvider({
            url : baseUrl
        });

        expect(provider.url).toEqual(baseUrl);

        waitsFor(function() {
            return provider.ready;
        }, 'imagery provider to become ready');

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

        var unknownSpatialReferenceResult = {
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
                "lods" : [{
                    "level" : 0,
                    "resolution" : 0.3515625,
                    "scale" : 147748799.285417
                }, {
                    "level" : 1,
                    "resolution" : 0.17578125,
                    "scale" : 73874399.6427087
                }, {
                    "level" : 2,
                    "resolution" : 0.087890625,
                    "scale" : 36937199.8213544
                }]
            },
            fullExtent : {
                "xmin" : -123.4,
                "ymin" : -23.2,
                "xmax" : 100.7,
                "ymax" : 45.2,
                "spatialReference" : {
                    "wkid" : 1234
                }
            }
        };

        stubJSONPCall(baseUrl, unknownSpatialReferenceResult);

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
