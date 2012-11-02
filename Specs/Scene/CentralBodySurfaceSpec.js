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
        frameState.camera.viewExtent2D(new Extent(0.0001, 0.0001, 0.0030, 0.0030), frameState.scene2D.projection);
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
    });

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

            frameState.mode = SceneMode.COLUMBUS_VIEW;
            frameState.scene2D.projection = new GeographicProjection(Ellipsoid.WGS84);
            frameState.camera.viewExtentColumbusView(new Extent(0.0001, 0.0001, 0.0030, 0.0030), frameState.scene2D.projection);

            updateUntilDone(cb);

            runs(function() {
                expect(render(context, frameState, cb)).toBeGreaterThan(0);
            });
        });

        it('renders in Columbus View web mercator', function() {
            var layerCollection = cb.getImageryLayers();
            layerCollection.removeAll();
            layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

            frameState.mode = SceneMode.COLUMBUS_VIEW;
            frameState.scene2D.projection = new WebMercatorProjection(Ellipsoid.WGS84);
            frameState.camera.viewExtentColumbusView(new Extent(0.0001, 0.0001, 0.0030, 0.0030), frameState.scene2D.projection);

            updateUntilDone(cb);

            runs(function() {
                expect(render(context, frameState, cb)).toBeGreaterThan(0);
            });
        });

        it('renders in 3D', function() {
            var layerCollection = cb.getImageryLayers();
            layerCollection.removeAll();
            layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

            frameState.camera.viewExtent(new Extent(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

            updateUntilDone(cb);

            runs(function() {
                expect(render(context, frameState, cb)).toBeGreaterThan(0);
            });
        });

        it('renders in 3D and then Columbus View', function() {
            var layerCollection = cb.getImageryLayers();
            layerCollection.removeAll();
            layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

            frameState.camera.viewExtent(new Extent(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

            updateUntilDone(cb);

            runs(function() {
                expect(render(context, frameState, cb)).toBeGreaterThan(0);

                frameState.mode = SceneMode.COLUMBUS_VIEW;
                frameState.scene2D.projection = new WebMercatorProjection(Ellipsoid.WGS84);
                frameState.camera.viewExtentColumbusView(new Extent(0.0001, 0.0001, 0.0030, 0.0030), frameState.scene2D.projection);
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

            frameState.camera.viewExtent(new Extent(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

            updateUntilDone(cb);

            runs(function() {
                expect(render(context, frameState, cb)).toBeGreaterThan(0);
            });
        });
    });
});
