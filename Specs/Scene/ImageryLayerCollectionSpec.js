/*global defineSuite*/
defineSuite([
        'Scene/ImageryLayerCollection',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Event',
        'Core/GeographicTilingScheme',
        'Core/Ray',
        'Core/Rectangle',
        'Scene/Globe',
        'Scene/ImageryLayer',
        'Scene/ImageryLayerFeatureInfo',
        'Scene/ImageryProvider',
        'Specs/createScene',
        'Specs/destroyScene',
        'Specs/waitsForPromise',
        'ThirdParty/when'
    ], function(
        ImageryLayerCollection,
        Cartesian3,
        Ellipsoid,
        Event,
        GeographicTilingScheme,
        Ray,
        Rectangle,
        Globe,
        ImageryLayer,
        ImageryLayerFeatureInfo,
        ImageryProvider,
        createScene,
        destroyScene,
        waitsForPromise,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var fakeProvider = {
            isReady : function() { return false; }
        };

    it('tracks the base layer on add', function() {
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);
        var layer3 = new ImageryLayer(fakeProvider);
        var collection = new ImageryLayerCollection();

        expect(layer1.isBaseLayer()).toEqual(false);

        collection.add(layer1);
        expect(layer1.isBaseLayer()).toEqual(true);

        collection.add(layer2);
        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);

        collection.add(layer3, 0);
        expect(layer1.isBaseLayer()).toEqual(false);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(true);
    });

    it('tracks the base layer on remove', function() {
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);
        var layer3 = new ImageryLayer(fakeProvider);
        var collection = new ImageryLayerCollection();

        collection.add(layer1);
        collection.add(layer2);
        collection.add(layer3);

        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.remove(layer1);
        expect(layer2.isBaseLayer()).toEqual(true);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.remove(layer3);
        expect(layer2.isBaseLayer()).toEqual(true);
    });

    it('updates isBaseLayer on re-add', function() {
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);
        var collection = new ImageryLayerCollection();

        layer1._isBaseLayer = true;
        layer2._isBaseLayer = true;

        collection.add(layer1);
        collection.add(layer2);

        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
    });

    it('does not crash when raising and lowering a single layer.', function() {
        var layer1 = new ImageryLayer(fakeProvider);
        var collection = new ImageryLayerCollection();
        collection.add(layer1);

        collection.raise(layer1);
        collection.lower(layer1);

        collection.raiseToTop(layer1);
        collection.lowerToBottom(layer1);
    });

    it('tracks the base layer on raise and lower', function() {
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);
        var layer3 = new ImageryLayer(fakeProvider);
        var collection = new ImageryLayerCollection();

        collection.add(layer1);
        collection.add(layer2);
        collection.add(layer3);

        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.lower(layer1);
        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.raise(layer1);
        expect(layer1.isBaseLayer()).toEqual(false);
        expect(layer2.isBaseLayer()).toEqual(true);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.lower(layer1);
        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(false);
    });

    it('tracks the base layer on raiseToTop to lowerToBottom', function() {
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);
        var layer3 = new ImageryLayer(fakeProvider);
        var collection = new ImageryLayerCollection();

        collection.add(layer1);
        collection.add(layer2);
        collection.add(layer3);

        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.raiseToTop(layer1);
        expect(layer1.isBaseLayer()).toEqual(false);
        expect(layer2.isBaseLayer()).toEqual(true);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.lowerToBottom(layer1);
        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(false);
    });

    it('add throws when layer is undefined', function() {
        var collection = new ImageryLayerCollection();

        expect(function() {
            collection.add(undefined);
        }).toThrowDeveloperError();
    });

    it('addImageryProvider throws when imageryProvider is undefined', function() {
        var collection = new ImageryLayerCollection();

        expect(function() {
            collection.addImageryProvider(undefined);
        }).toThrowDeveloperError();
    });

    it('add throws when index is outside valid range', function() {
        var collection = new ImageryLayerCollection();
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);

        expect(function() {
            collection.add(layer1, 1);
        }).toThrowDeveloperError();

        expect(function() {
            collection.add(layer1, -1);
        }).toThrowDeveloperError();

        collection.add(layer1, 0);

        expect(function() {
            collection.add(layer2, -1);
        }).toThrowDeveloperError();

        expect(function() {
            collection.add(layer2, 2);
        }).toThrowDeveloperError();

        collection.add(layer2, 0);
    });

    it('remove ignores request to remove a layer that does not exist in the collection', function() {
        var collection = new ImageryLayerCollection();
        var layer1 = new ImageryLayer(fakeProvider);
        expect(collection.remove(layer1)).toBe(false);
    });

    it('contains works as expected', function() {
        var collection = new ImageryLayerCollection();
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);

        expect(collection.contains(layer1)).toEqual(false);
        expect(collection.contains(layer2)).toEqual(false);

        collection.add(layer1);

        expect(collection.contains(layer1)).toEqual(true);
        expect(collection.contains(layer2)).toEqual(false);

        collection.add(layer2);

        expect(collection.contains(layer1)).toEqual(true);
        expect(collection.contains(layer2)).toEqual(true);

        collection.remove(layer1);

        expect(collection.contains(layer1)).toEqual(false);
        expect(collection.contains(layer2)).toEqual(true);

        collection.remove(layer2);

        expect(collection.contains(layer1)).toEqual(false);
        expect(collection.contains(layer2)).toEqual(false);
    });

    it('get throws if index is not provided', function() {
        var collection = new ImageryLayerCollection();
        expect(function() {
            collection.get();
        }).toThrowDeveloperError();
    });

    it('throws when raising an undefined layer', function() {
        var collection = new ImageryLayerCollection();

        expect(function() {
            collection.raise(undefined);
        }).toThrowDeveloperError();
    });

    it('throws when raising a layer not in the collection', function() {
        var collection = new ImageryLayerCollection();
        var layer1 = new ImageryLayer(fakeProvider);

        expect(function() {
            collection.raise(layer1);
        }).toThrowDeveloperError();
    });

    it('reports whether or not it is destroyed', function() {
        var collection = new ImageryLayerCollection();
        expect(collection.isDestroyed()).toEqual(false);
        collection.destroy();
        expect(collection.isDestroyed()).toEqual(true);
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
            var featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(ray, scene);
            expect(featuresPromise).toBeUndefined();
        });

        it('returns undefined when globe has no pickable layers', function() {
            var ellipsoid = Ellipsoid.WGS84;
            camera.lookAt(new Cartesian3(ellipsoid.maximumRadius + 100.0, 0.0, 0.0), new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0), Cartesian3.UNIT_Z);

            var ray = new Ray(new Cartesian3(ellipsoid.maximumRadius + 100.0, 0.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0));
            var featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(ray, scene);
            expect(featuresPromise).toBeUndefined();
        });

        it('returns undefined when ImageryProvider does not implement pickFeatures', function() {
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
                var featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(ray, scene);
                expect(featuresPromise).toBeUndefined();
            });
        });

        it('returns undefined when ImageryProvider.pickFeatures returns undefined', function() {
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
                    return undefined;
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
                var featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(ray, scene);
                expect(featuresPromise).toBeUndefined();
            });
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

            runs(function() {
                var ellipsoid = Ellipsoid.WGS84;
                camera.lookAt(new Cartesian3(ellipsoid.maximumRadius + 100.0, 0.0, 0.0), new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0), Cartesian3.UNIT_Z);

                var ray = new Ray(new Cartesian3(ellipsoid.maximumRadius + 100.0, 0.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0));
                var featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(ray, scene);

                expect(featuresPromise).toBeDefined();

                waitsForPromise(featuresPromise, function(features) {
                    expect(features.length).toBe(1);
                    expect(features[0].name).toEqual('Foo');
                    expect(features[0].description).toContain('Foo!');
                });
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
                var featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(ray, scene);

                expect(featuresPromise).toBeDefined();

                waitsForPromise(featuresPromise, function(features) {
                    expect(features.length).toBe(2);
                    expect(features[0].name).toEqual('Bar');
                    expect(features[0].description).toContain('Bar!');
                    expect(features[1].name).toEqual('Foo');
                    expect(features[1].description).toContain('Foo!');
                });
            });
        });
    });
});
