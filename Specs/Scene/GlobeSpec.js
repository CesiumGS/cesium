/*global defineSuite*/
defineSuite([
        'Scene/Globe',
        'Core/Cartesian3',
        'Core/CesiumTerrainProvider',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/Event',
        'Core/GeographicTilingScheme',
        'Core/loadWithXhr',
        'Core/Ray',
        'Core/Rectangle',
        'Renderer/ClearCommand',
        'Scene/ImageryLayerFeatureInfo',
        'Scene/ImageryProvider',
        'Scene/SingleTileImageryProvider',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/createScene',
        'Specs/destroyContext',
        'Specs/destroyScene',
        'Specs/render',
        'ThirdParty/when'
    ], function(
        Globe,
        Cartesian3,
        CesiumTerrainProvider,
        defined,
        Ellipsoid,
        Event,
        GeographicTilingScheme,
        loadWithXhr,
        Ray,
        Rectangle,
        ClearCommand,
        ImageryLayerFeatureInfo,
        ImageryProvider,
        SingleTileImageryProvider,
        createContext,
        createFrameState,
        createScene,
        destroyContext,
        destroyScene,
        render,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    describe('enableLighting', function() {
        var context;
        var frameState;
        var globe;

        beforeAll(function() {
            context = createContext();
        });

        afterAll(function() {
            destroyContext(context);
        });

        beforeEach(function() {
            frameState = createFrameState();
            globe = new Globe();
        });

        afterEach(function() {
            globe.destroy();
            loadWithXhr.load = loadWithXhr.defaultLoad;
        });

        function returnTileJson(path) {
            var oldLoad = loadWithXhr.load;
            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                if (url.indexOf('layer.json') >= 0) {
                    return loadWithXhr.defaultLoad(path, responseType, method, data, headers, deferred);
                } else {
                    return oldLoad(url, responseType, method, data, headers, deferred, overrideMimeType);
                }
            };
        }

        function returnVertexNormalTileJson() {
            return returnTileJson('Data/CesiumTerrainTileJson/VertexNormals.tile.json');
        }

        /**
         * Repeatedly calls update until the load queue is empty.  You must wrap any code to follow
         * this in a "runs" function.
         */
        function updateUntilDone(globe) {
            // update until the load queue is empty.
            waitsFor(function() {
                globe._surface._debug.enableDebugOutput = true;
                var commandList = [];
                globe.update(context, frameState, commandList);
                return globe._surface.tileProvider.ready && globe._surface._tileLoadQueue.length === 0 && globe._surface._debug.tilesWaitingForChildren === 0;
            }, 'updating to complete');
        }

        it('renders with enableLighting', function() {
            globe.enableLighting = true;

            var layerCollection = globe.imageryLayers;
            layerCollection.removeAll();
            layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

            frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

            updateUntilDone(globe);

            runs(function() {
                ClearCommand.ALL.execute(context);
                expect(context.readPixels()).toEqual([0, 0, 0, 0]);

                render(context, frameState, globe);
                expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
            });
        });

        it('renders terrain with enableLighting', function() {
            globe.enableLighting = true;

            var layerCollection = globe.imageryLayers;
            layerCollection.removeAll();
            layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                return loadWithXhr.defaultLoad('Data/CesiumTerrainTileJson/tile.vertexnormals.terrain', responseType, method, data, headers, deferred);
            };

            returnVertexNormalTileJson();

            var terrainProvider = new CesiumTerrainProvider({
                url : 'made/up/url',
                requestVertexNormals : true
            });

            globe.terrainProvider = terrainProvider;

            waitsFor(function() {
                return terrainProvider.ready;
            });

            frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

            updateUntilDone(globe);

            runs(function() {
                ClearCommand.ALL.execute(context);
                expect(context.readPixels()).toEqual([0, 0, 0, 0]);

                render(context, frameState, globe);
                expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
            });
        });
    });

    describe('pickImageryLayerFeatures', function() {
        var scene;
        var globe;
        var camera;

        beforeAll(function() {
            scene = createScene();
            globe = scene.globe = new Globe();
            camera = scene.camera;

            scene.frameState.passes.render = true;
        });

        afterAll(function() {
            destroyScene(scene);
        });

        beforeEach(function() {
            globe.imageryLayers.removeAll();
        });

        /**
         * Repeatedly calls update until the load queue is empty.  You must wrap any code to follow
         * this in a "runs" function.
         */
        function updateUntilDone(globe) {
            // update until the load queue is empty.
            waitsFor(function() {
                globe._surface._debug.enableDebugOutput = true;
                var commandList = [];
                globe.update(scene.context, scene.frameState, commandList);
                return globe._surface.tileProvider.ready && globe._surface._tileLoadQueue.length === 0 && globe._surface._debug.tilesWaitingForChildren === 0;
            }, 'updating to complete');
        }

        it('returns undefined when pick ray does not intersect surface', function() {
            var ellipsoid = Ellipsoid.WGS84;
            camera.lookAt(new Cartesian3(ellipsoid.maximumRadius + 100.0, 0.0, 0.0), new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0), Cartesian3.UNIT_Z);

            var ray = new Ray(new Cartesian3(ellipsoid.maximumRadius + 100.0, 0.0, 0.0), new Cartesian3(1.0, 0.0, 0.0));
            var featuresPromise = globe.pickImageryLayerFeatures(ray, scene);
            expect(featuresPromise).toBeUndefined();
        });

        it('returns undefined when globe has no pickable layers', function() {
            var ellipsoid = Ellipsoid.WGS84;
            camera.lookAt(new Cartesian3(ellipsoid.maximumRadius + 100.0, 0.0, 0.0), new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0), Cartesian3.UNIT_Z);

            var ray = new Ray(new Cartesian3(ellipsoid.maximumRadius + 100.0, 0.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0));
            var featuresPromise = globe.pickImageryLayerFeatures(ray, scene);
            expect(featuresPromise).toBeUndefined();
        });

        it('returns features from one layer', function() {
            var provider = {
                ready : true,
                rectangle : Rectangle.MAX_VALUE,
                tileWidth : 256,
                tileHeight : 256,
                maximumLevel : 0,
                minimumLevel : 0,
                tilingScheme : new GeographicTilingScheme(),
                errorEvent : new Event(),
                hasAlphaChannel : true,

                pickFeatures : function(x, y, level, longitude, latitude) {
                    var deferred = when.defer();
                    setTimeout(function() {
                        var featureInfo = new ImageryLayerFeatureInfo();
                        featureInfo.name = 'Foo';
                        featureInfo.description = '<strong>Foo!</strong>';
                        deferred.resolve([featureInfo]);
                    }, 1);
                    return deferred.promise;
                },

                requestImage : function(x, y, level) {
                    return ImageryProvider.loadImage(this, 'Data/Images/Blue.png');
                }
            };

            globe.imageryLayers.addImageryProvider(provider);

            updateUntilDone(globe);

            var features;

            runs(function() {
                var ellipsoid = Ellipsoid.WGS84;
                camera.lookAt(new Cartesian3(ellipsoid.maximumRadius + 100.0, 0.0, 0.0), new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0), Cartesian3.UNIT_Z);

                var ray = new Ray(new Cartesian3(ellipsoid.maximumRadius + 100.0, 0.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0));
                var featuresPromise = globe.pickImageryLayerFeatures(ray, scene);

                expect(featuresPromise).toBeDefined();

                when(featuresPromise, function(result) {
                    features = result;
                });
            });

            waitsFor(function() {
                return defined(features);
            });

            runs(function() {
                expect(features.length).toBe(1);
                expect(features[0].name).toEqual('Foo');
                expect(features[0].description).toContain('Foo!');
            });
        });

        it('returns features from two layers', function() {
            var provider1 = {
                ready : true,
                rectangle : Rectangle.MAX_VALUE,
                tileWidth : 256,
                tileHeight : 256,
                maximumLevel : 0,
                minimumLevel : 0,
                tilingScheme : new GeographicTilingScheme(),
                errorEvent : new Event(),
                hasAlphaChannel : true,

                pickFeatures : function(x, y, level, longitude, latitude) {
                    var deferred = when.defer();
                    setTimeout(function() {
                        var featureInfo = new ImageryLayerFeatureInfo();
                        featureInfo.name = 'Foo';
                        featureInfo.description = '<strong>Foo!</strong>';
                        deferred.resolve([featureInfo]);
                    }, 1);
                    return deferred.promise;
                },

                requestImage : function(x, y, level) {
                    return ImageryProvider.loadImage(this, 'Data/Images/Blue.png');
                }
            };

            globe.imageryLayers.addImageryProvider(provider1);

            var provider2 = {
                ready : true,
                rectangle : Rectangle.MAX_VALUE,
                tileWidth : 256,
                tileHeight : 256,
                maximumLevel : 0,
                minimumLevel : 0,
                tilingScheme : new GeographicTilingScheme(),
                errorEvent : new Event(),
                hasAlphaChannel : true,

                pickFeatures : function(x, y, level, longitude, latitude) {
                    var deferred = when.defer();
                    setTimeout(function() {
                        var featureInfo = new ImageryLayerFeatureInfo();
                        featureInfo.name = 'Bar';
                        featureInfo.description = '<strong>Bar!</strong>';
                        deferred.resolve([featureInfo]);
                    }, 1);
                    return deferred.promise;
                },

                requestImage : function(x, y, level) {
                    return ImageryProvider.loadImage(this, 'Data/Images/Green.png');
                }
            };

            globe.imageryLayers.addImageryProvider(provider2);

            updateUntilDone(globe);

            var features;

            runs(function() {
                var ellipsoid = Ellipsoid.WGS84;
                camera.lookAt(new Cartesian3(ellipsoid.maximumRadius + 100.0, 0.0, 0.0), new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0), Cartesian3.UNIT_Z);

                var ray = new Ray(new Cartesian3(ellipsoid.maximumRadius + 100.0, 0.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0));
                var featuresPromise = globe.pickImageryLayerFeatures(ray, scene);

                expect(featuresPromise).toBeDefined();

                when(featuresPromise, function(result) {
                    features = result;
                });
            });

            waitsFor(function() {
                return defined(features);
            });

            runs(function() {
                expect(features.length).toBe(2);
                expect(features[0].name).toEqual('Bar');
                expect(features[0].description).toContain('Bar!');
                expect(features[1].name).toEqual('Foo');
                expect(features[1].description).toContain('Foo!');
            });
        });
    });
}, 'WebGL');