/*global defineSuite*/
defineSuite([
         'Scene/CentralBodySurface',
         'Specs/createContext',
         'Specs/createFrameState',
         'Specs/destroyContext',
         'Specs/render',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/Extent',
         'Core/GeographicProjection',
         'Core/Math',
         'Core/Matrix4',
         'Core/WebMercatorProjection',
         'Scene/CentralBody',
         'Scene/EllipsoidTerrainProvider',
         'Scene/ImageryLayerCollection',
         'Scene/OrthographicFrustum',
         'Scene/SceneMode',
         'Scene/SingleTileImageryProvider',
         'Scene/WebMapServiceImageryProvider'
     ], function(
         CentralBodySurface,
         createContext,
         createFrameState,
         destroyContext,
         render,
         Cartesian3,
         Ellipsoid,
         Extent,
         GeographicProjection,
         CesiumMath,
         Matrix4,
         WebMercatorProjection,
         CentralBody,
         EllipsoidTerrainProvider,
         ImageryLayerCollection,
         OrthographicFrustum,
         SceneMode,
         SingleTileImageryProvider,
         WebMapServiceImageryProvider) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function forEachRenderedTile(surface, minimumTiles, maximumTiles, callback) {
        var tileCount = 0;
        var tilesToRenderByTextureCount = surface._tilesToRenderByTextureCount;
        for (var tileSetIndex = 0, tileSetLength = tilesToRenderByTextureCount.length; tileSetIndex < tileSetLength; ++tileSetIndex) {
            var tileSet = tilesToRenderByTextureCount[tileSetIndex];
            if (typeof tileSet === 'undefined' || tileSet.length === 0) {
                continue;
            }

            for (var i = 0, len = tileSet.length; i < len; i++) {
                var tile = tileSet[i];
                ++tileCount;
                callback(tile);
            }
        }

        if (typeof minimumTiles !== 'undefined') {
            expect(tileCount).not.toBeLessThan(minimumTiles);
        }

        if (typeof maximumTiles !== 'undefined') {
            expect(tileCount).not.toBeGreaterThan(maximumTiles);
        }
    }

    /**
     * Repeatedly calls update until the load queue is empty.  You must wrap any code to follow
     * this in a "runs" function.
     */
    function updateUntilDone(cb) {
        // update until the load queue is empty.
        waitsFor(function() {
            surface._debug.enableDebugOutput = true;
            var commandLists = [];
            cb.update(context, frameState, commandLists);
            return typeof cb._surface._tileLoadQueue.head === 'undefined' && surface._debug.tilesWaitingForChildren === 0;
        }, 'updating to complete');
    }

    function switchTo2D() {
        frameState.mode = SceneMode.SCENE2D;
        var frustum = new OrthographicFrustum();
        frustum.right = Ellipsoid.WGS84.getMaximumRadius() * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right;
        frustum.bottom = -frustum.top;
        frameState.camera.frustum = frustum;
        frameState.camera.controller.update(frameState.mode, frameState.scene2D);
        frameState.camera.controller.viewExtent(new Extent(0.0001, 0.0001, 0.0030, 0.0030), frameState.scene2D.projection);
    }

    var context;

    var frameState;
    var cb;
    var surface;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        frameState = createFrameState();
        cb = new CentralBody();
        surface = cb._surface;
    });

    afterEach(function() {
        cb.destroy();
    });

    describe('construction', function() {
        it('throws if an terrain provider is not provided', function() {
            function constructWithoutTerrainProvider() {
                return new CentralBodySurface({
                    imageryLayerCollection : new ImageryLayerCollection()
                });
            }
            expect(constructWithoutTerrainProvider).toThrow();
        });

        it('throws if a ImageryLayerCollection is not provided', function() {
            function constructWithoutImageryLayerCollection() {
                return new CentralBodySurface({
                    terrainProvider : new EllipsoidTerrainProvider()
                });
            }
            expect(constructWithoutImageryLayerCollection).toThrow();
        });
    }, 'WebGL');

    describe('layer updating', function() {
        it('removing a layer removes it from all tiles', function() {
            var layerCollection = cb.getImageryLayers();

            layerCollection.removeAll();
            var layer = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

            updateUntilDone(cb);

            runs(function() {
                // All tiles should have one or more associated images.
                forEachRenderedTile(surface, 1, undefined, function(tile) {
                    expect(tile.imagery.length).toBeGreaterThan(0);
                    for (var i = 0; i < tile.imagery.length; ++i) {
                        expect(tile.imagery[i].imagery.imageryLayer).toEqual(layer);
                    }
                });

                layerCollection.remove(layer);

                // All associated images should be gone.
                forEachRenderedTile(surface, 1, undefined, function(tile) {
                    expect(tile.imagery.length).toEqual(0);
                });
            });
        });

        it('adding a layer adds it to all tiles after update', function() {
            var layerCollection = cb.getImageryLayers();

            layerCollection.removeAll();
            layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

            updateUntilDone(cb);

            var layer2;

            runs(function() {
                // Add another layer
                layer2 = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Green4x4.png'}));
            });

            updateUntilDone(cb);

            runs(function() {
                // All tiles should have one or more associated images.
                forEachRenderedTile(surface, 1, undefined, function(tile) {
                    expect(tile.imagery.length).toBeGreaterThan(0);
                    var hasImageFromLayer2 = false;
                    for (var i = 0; i < tile.imagery.length; ++i) {
                        if (tile.imagery[i].imagery.imageryLayer === layer2) {
                            hasImageFromLayer2 = true;
                        }
                    }
                    expect(hasImageFromLayer2).toEqual(true);
                });
            });
        });

        it('moving a layer moves the corresponding TileImagery instances on every tile', function() {
            var layerCollection = cb.getImageryLayers();

            layerCollection.removeAll();
            var layer1 = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));
            var layer2 = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Green4x4.png'}));

            updateUntilDone(cb);

            runs(function() {
                forEachRenderedTile(surface, 1, undefined, function(tile) {
                    expect(tile.imagery.length).toBeGreaterThan(0);
                    var indexOfFirstLayer1 = tile.imagery.length;
                    var indexOfLastLayer1 = -1;
                    var indexOfFirstLayer2 = tile.imagery.length;
                    for (var i = 0; i < tile.imagery.length; ++i) {
                        if (tile.imagery[i].imagery.imageryLayer === layer1) {
                            indexOfFirstLayer1 = Math.min(indexOfFirstLayer1, i);
                            indexOfLastLayer1 = i;
                        } else {
                            expect(tile.imagery[i].imagery.imageryLayer).toEqual(layer2);
                            indexOfFirstLayer2 = Math.min(indexOfFirstLayer2, i);
                        }
                    }
                    expect(indexOfFirstLayer1).toBeLessThan(indexOfFirstLayer2);
                    expect(indexOfLastLayer1).toBeLessThan(indexOfFirstLayer2);
                });

                layerCollection.raiseToTop(layer1);
            });

            updateUntilDone(cb);

            runs(function() {
                forEachRenderedTile(surface, 1, undefined, function(tile) {
                    expect(tile.imagery.length).toBeGreaterThan(0);
                    var indexOfFirstLayer2 = tile.imagery.length;
                    var indexOfLastLayer2 = -1;
                    var indexOfFirstLayer1 = tile.imagery.length;
                    for (var i = 0; i < tile.imagery.length; ++i) {
                        if (tile.imagery[i].imagery.imageryLayer === layer2) {
                            indexOfFirstLayer2 = Math.min(indexOfFirstLayer2, i);
                            indexOfLastLayer2 = i;
                        } else {
                            expect(tile.imagery[i].imagery.imageryLayer).toEqual(layer1);
                            indexOfFirstLayer1 = Math.min(indexOfFirstLayer1, i);
                        }
                    }
                    expect(indexOfFirstLayer2).toBeLessThan(indexOfFirstLayer1);
                    expect(indexOfLastLayer2).toBeLessThan(indexOfFirstLayer1);
                });
            });
        });
    }, 'WebGL');

    it('renders in 2D geographic', function() {
        var layerCollection = cb.getImageryLayers();
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        switchTo2D();
        frameState.scene2D.projection = new GeographicProjection(Ellipsoid.WGS84);

        updateUntilDone(cb);

        runs(function() {
            expect(render(context, frameState, cb)).toBeGreaterThan(0);
        });
    });

    it('renders in 2D web mercator', function() {
        var layerCollection = cb.getImageryLayers();
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        switchTo2D();
        frameState.scene2D.projection = new WebMercatorProjection(Ellipsoid.WGS84);

        updateUntilDone(cb);

        runs(function() {
            expect(render(context, frameState, cb)).toBeGreaterThan(0);
        });
    });

    it('renders in Columbus View geographic', function() {
        var layerCollection = cb.getImageryLayers();
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        frameState.camera.controller.update(SceneMode.COLUMBUS_VIEW, { projection : new GeographicProjection(Ellipsoid.WGS84) });
        frameState.camera.controller.viewExtent(new Extent(0.0001, 0.0001, 0.0030, 0.0030), Ellipsoid.WGS84);

        updateUntilDone(cb);

        runs(function() {
            expect(render(context, frameState, cb)).toBeGreaterThan(0);
        });
    });

    it('renders in Columbus View web mercator', function() {
        var layerCollection = cb.getImageryLayers();
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        frameState.camera.controller.update(SceneMode.COLUMBUS_VIEW, { projection : new GeographicProjection(Ellipsoid.WGS84) });
        frameState.camera.controller.viewExtent(new Extent(0.0001, 0.0001, 0.0030, 0.0030), Ellipsoid.WGS84);

        updateUntilDone(cb);

        runs(function() {
            expect(render(context, frameState, cb)).toBeGreaterThan(0);
        });
    });

    it('renders in 3D', function() {
        var layerCollection = cb.getImageryLayers();
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        frameState.camera.controller.viewExtent(new Extent(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(cb);

        runs(function() {
            expect(render(context, frameState, cb)).toBeGreaterThan(0);
        });
    });

    it('renders in 3D and then Columbus View', function() {
        var layerCollection = cb.getImageryLayers();
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        frameState.camera.controller.viewExtent(new Extent(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(cb);

        runs(function() {
            expect(render(context, frameState, cb)).toBeGreaterThan(0);

            frameState.camera.controller.update(SceneMode.COLUMBUS_VIEW, { projection : new GeographicProjection(Ellipsoid.WGS84) });
            frameState.camera.controller.viewExtent(new Extent(0.0001, 0.0001, 0.0030, 0.0030), Ellipsoid.WGS84);
        });

        updateUntilDone(cb);

        runs(function() {
            expect(render(context, frameState, cb)).toBeGreaterThan(0);
        });
    });

    it('renders even if imagery root tiles fail to load', function() {
        var layerCollection = cb.getImageryLayers();
        layerCollection.removeAll();

        var providerWithInvalidRootTiles = new WebMapServiceImageryProvider({
            url : '/invalid',
            layers : 'invalid'
        });

        layerCollection.addImageryProvider(providerWithInvalidRootTiles);

        frameState.camera.controller.viewExtent(new Extent(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(cb);

        runs(function() {
            expect(render(context, frameState, cb)).toBeGreaterThan(0);
        });
    });

    it('passes layer adjustment values as uniforms', function() {
        var layerCollection = cb.getImageryLayers();
        layerCollection.removeAll();
        var layer = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        layer.alpha = 0.123;
        layer.brightness = 0.456;
        layer.contrast = 0.654;
        layer.gamma = 0.321;
        layer.saturation = 0.123;
        layer.hue = 0.456;

        frameState.camera.controller.viewExtent(new Extent(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(cb);

        runs(function() {
            var commandLists = [];
            expect(render(context, frameState, cb, commandLists)).toBeGreaterThan(0);

            var tileCommandCount = 0;

            for (var i = 0; i < commandLists.length; ++i) {
                var commandList = commandLists[i].colorList;
                var commandListLength = commandList.length;
                for (var j = 0; j < commandListLength; ++j) {
                    var command = commandList[j];

                    var uniforms = command.uniformMap;
                    if (typeof uniforms === 'undefined' || typeof uniforms.u_dayTextureAlpha === 'undefined') {
                        continue;
                    }

                    ++tileCommandCount;

                    expect(uniforms.u_dayTextureAlpha()).toEqual([0.123]);
                    expect(uniforms.u_dayTextureBrightness()).toEqual([0.456]);
                    expect(uniforms.u_dayTextureContrast()).toEqual([0.654]);
                    expect(uniforms.u_dayTextureOneOverGamma()).toEqual([1.0/0.321]);
                    expect(uniforms.u_dayTextureSaturation()).toEqual([0.123]);
                    expect(uniforms.u_dayTextureHue()).toEqual([0.456]);
                }
            }

            expect(tileCommandCount).toBeGreaterThan(0);
        });
    });

    it('passes functional layer adjustment values as uniforms', function() {
        var layerCollection = cb.getImageryLayers();
        layerCollection.removeAll();
        var layer = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        function createFunction(value) {
            return function(functionFrameState, functionLayer, x, y, level) {
                expect(functionFrameState).toBe(frameState);
                expect(functionLayer).toBe(layer);
                expect(typeof x).toBe('number');
                expect(typeof y).toBe('number');
                expect(typeof level).toBe('number');
                return value;
            };
        }

        layer.alpha = createFunction(0.123);
        layer.brightness = createFunction(0.456);
        layer.contrast = createFunction(0.654);
        layer.gamma = createFunction(0.321);
        layer.saturation = createFunction(0.123);
        layer.hue = createFunction(0.456);

        frameState.camera.controller.viewExtent(new Extent(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(cb);

        runs(function() {
            var commandLists = [];
            expect(render(context, frameState, cb, commandLists)).toBeGreaterThan(0);

            var tileCommandCount = 0;

            for (var i = 0; i < commandLists.length; ++i) {
                var commandList = commandLists[i].colorList;
                var commandListLength = commandList.length;
                for (var j = 0; j < commandListLength; ++j) {
                    var command = commandList[j];

                    var uniforms = command.uniformMap;
                    if (typeof uniforms === 'undefined' || typeof uniforms.u_dayTextureAlpha === 'undefined') {
                        continue;
                    }

                    ++tileCommandCount;

                    expect(uniforms.u_dayTextureAlpha()).toEqual([0.123]);
                    expect(uniforms.u_dayTextureBrightness()).toEqual([0.456]);
                    expect(uniforms.u_dayTextureContrast()).toEqual([0.654]);
                    expect(uniforms.u_dayTextureOneOverGamma()).toEqual([1.0/0.321]);
                    expect(uniforms.u_dayTextureSaturation()).toEqual([0.123]);
                    expect(uniforms.u_dayTextureHue()).toEqual([0.456]);
                }
            }

            expect(tileCommandCount).toBeGreaterThan(0);
        });
    });

    it('skips layer with uniform alpha value of zero', function() {
        var layerCollection = cb.getImageryLayers();
        layerCollection.removeAll();
        var layer = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        layer.alpha = 0.0;

        frameState.camera.controller.viewExtent(new Extent(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(cb);

        runs(function() {
            var commandLists = [];
            expect(render(context, frameState, cb, commandLists)).toBeGreaterThan(0);

            var tileCommandCount = 0;

            for (var i = 0; i < commandLists.length; ++i) {
                var commandList = commandLists[i].colorList;
                var commandListLength = commandList.length;
                for (var j = 0; j < commandListLength; ++j) {
                    var command = commandList[j];

                    var uniforms = command.uniformMap;
                    if (typeof uniforms === 'undefined' || typeof uniforms.u_dayTextureAlpha === 'undefined') {
                        continue;
                    }

                    ++tileCommandCount;

                    expect(uniforms.u_dayTextureAlpha()).toEqual([]);
                }
            }

            expect(tileCommandCount).toBeGreaterThan(0);
        });
    });

    describe('switching terrain providers', function() {
        it('clears the replacement queue', function() {
            updateUntilDone(cb);

            runs(function() {
                var surface = cb._surface;
                var replacementQueue = surface._tileReplacementQueue;
                expect(replacementQueue.count).toBeGreaterThan(0);

                surface.setTerrainProvider(new EllipsoidTerrainProvider());
                expect(replacementQueue.count).toBe(0);
            });
        });

        it('recreates the level zero tiles', function() {
            var surface = cb._surface;

            updateUntilDone(cb);

            var levelZeroTiles;
            var levelZero0;
            var levelZero1;

            runs(function() {
                levelZeroTiles = surface._levelZeroTiles;
                expect(levelZeroTiles.length).toBe(2);

                levelZero0 = levelZeroTiles[0];
                levelZero1 = levelZeroTiles[1];

                surface.setTerrainProvider(new EllipsoidTerrainProvider());
            });

            updateUntilDone(cb);

            runs(function() {
                levelZeroTiles = surface._levelZeroTiles;
                expect(levelZeroTiles[0]).not.toBe(levelZero0);
                expect(levelZeroTiles[1]).not.toBe(levelZero1);
            });
        });

        it('does nothing if the new provider is the same as the old', function() {
            var surface = cb._surface;
            var provider = surface.getTerrainProvider();

            updateUntilDone(cb);

            var levelZeroTiles;
            var levelZero0;
            var levelZero1;

            runs(function() {
                levelZeroTiles = surface._levelZeroTiles;
                expect(levelZeroTiles.length).toBe(2);

                levelZero0 = levelZeroTiles[0];
                levelZero1 = levelZeroTiles[1];

                surface.setTerrainProvider(provider);
            });

            updateUntilDone(cb);

            runs(function() {
                levelZeroTiles = surface._levelZeroTiles;
                expect(levelZeroTiles[0]).toBe(levelZero0);
                expect(levelZeroTiles[1]).toBe(levelZero1);
            });
        });
    }, 'WebGL');
}, 'WebGL');
