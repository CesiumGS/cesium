/*global defineSuite*/
defineSuite([
        'Scene/GlobeSurface',
        'Core/Cartesian3',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/EllipsoidTerrainProvider',
        'Core/GeographicProjection',
        'Core/Rectangle',
        'Core/WebMercatorProjection',
        'Scene/Globe',
        'Scene/ImageryLayerCollection',
        'Scene/OrthographicFrustum',
        'Scene/SceneMode',
        'Scene/SingleTileImageryProvider',
        'Scene/WebMapServiceImageryProvider',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/destroyContext',
        'Specs/render'
    ], function(
        GlobeSurface,
        Cartesian3,
        defined,
        Ellipsoid,
        EllipsoidTerrainProvider,
        GeographicProjection,
        Rectangle,
        WebMercatorProjection,
        Globe,
        ImageryLayerCollection,
        OrthographicFrustum,
        SceneMode,
        SingleTileImageryProvider,
        WebMapServiceImageryProvider,
        createContext,
        createFrameState,
        destroyContext,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function forEachRenderedTile(surface, minimumTiles, maximumTiles, callback) {
        var tileCount = 0;
        var tilesToRenderByTextureCount = surface._tilesToRenderByTextureCount;
        for (var tileSetIndex = 0, tileSetLength = tilesToRenderByTextureCount.length; tileSetIndex < tileSetLength; ++tileSetIndex) {
            var tileSet = tilesToRenderByTextureCount[tileSetIndex];
            if (!defined(tileSet) || tileSet.length === 0) {
                continue;
            }

            for (var i = 0, len = tileSet.length; i < len; i++) {
                var tile = tileSet[i];
                ++tileCount;
                callback(tile);
            }
        }

        if (defined(minimumTiles)) {
            expect(tileCount).not.toBeLessThan(minimumTiles);
        }

        if (defined(maximumTiles)) {
            expect(tileCount).not.toBeGreaterThan(maximumTiles);
        }
    }

    /**
     * Repeatedly calls update until the load queue is empty.  You must wrap any code to follow
     * this in a "runs" function.
     */
    function updateUntilDone(globe) {
        // update until the load queue is empty.
        waitsFor(function() {
            surface._debug.enableDebugOutput = true;
            var commandList = [];
            globe.update(context, frameState, commandList);
            return !defined(globe._surface._tileLoadQueue.head) && surface._debug.tilesWaitingForChildren === 0;
        }, 'updating to complete');
    }

    function switchTo2D() {
        frameState.mode = SceneMode.SCENE2D;
        var frustum = new OrthographicFrustum();
        frustum.right = Ellipsoid.WGS84.maximumRadius * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right;
        frustum.bottom = -frustum.top;
        frameState.camera.frustum = frustum;
        frameState.camera.update(frameState.mode);
        frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0030, 0.0030), frameState.mapProjection);
    }

    var context;

    var frameState;
    var globe;
    var surface;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        frameState = createFrameState();
        globe = new Globe();
        surface = globe._surface;
    });

    afterEach(function() {
        globe.destroy();
    });

    describe('construction', function() {
        it('throws if an terrain provider is not provided', function() {
            function constructWithoutTerrainProvider() {
                return new GlobeSurface({
                    imageryLayerCollection : new ImageryLayerCollection()
                });
            }
            expect(constructWithoutTerrainProvider).toThrowDeveloperError();
        });

        it('throws if a ImageryLayerCollection is not provided', function() {
            function constructWithoutImageryLayerCollection() {
                return new GlobeSurface({
                    terrainProvider : new EllipsoidTerrainProvider()
                });
            }
            expect(constructWithoutImageryLayerCollection).toThrowDeveloperError();
        });
    }, 'WebGL');

    describe('layer updating', function() {
        it('removing a layer removes it from all tiles', function() {
            var layerCollection = globe.imageryLayers;

            layerCollection.removeAll();
            var layer = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

            updateUntilDone(globe);

            runs(function() {
                // All tiles should have one or more associated images.
                forEachRenderedTile(surface, 1, undefined, function(tile) {
                    expect(tile.imagery.length).toBeGreaterThan(0);
                    for (var i = 0; i < tile.imagery.length; ++i) {
                        expect(tile.imagery[i].readyImagery.imageryLayer).toEqual(layer);
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
            var layerCollection = globe.imageryLayers;

            layerCollection.removeAll();
            layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

            updateUntilDone(globe);

            var layer2;

            runs(function() {
                // Add another layer
                layer2 = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Green4x4.png'}));
            });

            updateUntilDone(globe);

            runs(function() {
                // All tiles should have one or more associated images.
                forEachRenderedTile(surface, 1, undefined, function(tile) {
                    expect(tile.imagery.length).toBeGreaterThan(0);
                    var hasImageFromLayer2 = false;
                    for (var i = 0; i < tile.imagery.length; ++i) {
                        var imageryTile = tile.imagery[i].readyImagery;
                        if (!defined(imageryTile)) {
                            imageryTile = tile.imagery[i].loadingImagery;
                        }
                        if (imageryTile.imageryLayer === layer2) {
                            hasImageFromLayer2 = true;
                        }
                    }
                    expect(hasImageFromLayer2).toEqual(true);
                });
            });
        });

        it('moving a layer moves the corresponding TileImagery instances on every tile', function() {
            var layerCollection = globe.imageryLayers;

            layerCollection.removeAll();
            var layer1 = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));
            var layer2 = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Green4x4.png'}));

            updateUntilDone(globe);

            runs(function() {
                forEachRenderedTile(surface, 1, undefined, function(tile) {
                    expect(tile.imagery.length).toBeGreaterThan(0);
                    var indexOfFirstLayer1 = tile.imagery.length;
                    var indexOfLastLayer1 = -1;
                    var indexOfFirstLayer2 = tile.imagery.length;
                    for (var i = 0; i < tile.imagery.length; ++i) {
                        if (tile.imagery[i].readyImagery.imageryLayer === layer1) {
                            indexOfFirstLayer1 = Math.min(indexOfFirstLayer1, i);
                            indexOfLastLayer1 = i;
                        } else {
                            expect(tile.imagery[i].readyImagery.imageryLayer).toEqual(layer2);
                            indexOfFirstLayer2 = Math.min(indexOfFirstLayer2, i);
                        }
                    }
                    expect(indexOfFirstLayer1).toBeLessThan(indexOfFirstLayer2);
                    expect(indexOfLastLayer1).toBeLessThan(indexOfFirstLayer2);
                });

                layerCollection.raiseToTop(layer1);
            });

            updateUntilDone(globe);

            runs(function() {
                forEachRenderedTile(surface, 1, undefined, function(tile) {
                    expect(tile.imagery.length).toBeGreaterThan(0);
                    var indexOfFirstLayer2 = tile.imagery.length;
                    var indexOfLastLayer2 = -1;
                    var indexOfFirstLayer1 = tile.imagery.length;
                    for (var i = 0; i < tile.imagery.length; ++i) {
                        if (tile.imagery[i].readyImagery.imageryLayer === layer2) {
                            indexOfFirstLayer2 = Math.min(indexOfFirstLayer2, i);
                            indexOfLastLayer2 = i;
                        } else {
                            expect(tile.imagery[i].readyImagery.imageryLayer).toEqual(layer1);
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
        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        switchTo2D();
        frameState.mapProjection = new GeographicProjection(Ellipsoid.WGS84);

        updateUntilDone(globe);

        runs(function() {
            expect(render(context, frameState, globe)).toBeGreaterThan(0);
        });
    });

    it('renders in 2D web mercator', function() {
        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        switchTo2D();
        frameState.mapProjection = new WebMercatorProjection(Ellipsoid.WGS84);

        updateUntilDone(globe);

        runs(function() {
            expect(render(context, frameState, globe)).toBeGreaterThan(0);
        });
    });

    it('renders in Columbus View geographic', function() {
        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        frameState.camera.update(SceneMode.COLUMBUS_VIEW);
        frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0030, 0.0030), Ellipsoid.WGS84);

        updateUntilDone(globe);

        runs(function() {
            expect(render(context, frameState, globe)).toBeGreaterThan(0);
        });
    });

    it('renders in Columbus View web mercator', function() {
        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        frameState.camera.update(SceneMode.COLUMBUS_VIEW);
        frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0030, 0.0030), Ellipsoid.WGS84);

        updateUntilDone(globe);

        runs(function() {
            expect(render(context, frameState, globe)).toBeGreaterThan(0);
        });
    });

    it('renders in 3D', function() {
        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(globe);

        runs(function() {
            expect(render(context, frameState, globe)).toBeGreaterThan(0);
        });
    });

    it('renders in 3D and then Columbus View', function() {
        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(globe);

        runs(function() {
            expect(render(context, frameState, globe)).toBeGreaterThan(0);

            frameState.camera.update(SceneMode.COLUMBUS_VIEW);
            frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0030, 0.0030), Ellipsoid.WGS84);
        });

        updateUntilDone(globe);

        runs(function() {
            expect(render(context, frameState, globe)).toBeGreaterThan(0);
        });
    });

    it('renders even if imagery root tiles fail to load', function() {
        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();

        var providerWithInvalidRootTiles = new WebMapServiceImageryProvider({
            url : '/invalid',
            layers : 'invalid'
        });

        layerCollection.addImageryProvider(providerWithInvalidRootTiles);

        frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(globe);

        runs(function() {
            expect(render(context, frameState, globe)).toBeGreaterThan(0);
        });
    });

    it('passes layer adjustment values as uniforms', function() {
        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();
        var layer = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        layer.alpha = 0.123;
        layer.brightness = 0.456;
        layer.contrast = 0.654;
        layer.gamma = 0.321;
        layer.saturation = 0.123;
        layer.hue = 0.456;

        frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(globe);

        runs(function() {
            var commandList = [];
            expect(render(context, frameState, globe, commandList)).toBeGreaterThan(0);

            var tileCommandCount = 0;

            for (var i = 0; i < commandList.length; ++i) {
                var command = commandList[i];

                var uniforms = command.uniformMap;
                if (!defined(uniforms) || !defined(uniforms.u_dayTextureAlpha)) {
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

            expect(tileCommandCount).toBeGreaterThan(0);
        });
    });

    it('passes functional layer adjustment values as uniforms', function() {
        var layerCollection = globe.imageryLayers;
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

        frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(globe);

        runs(function() {
            var commandList = [];
            expect(render(context, frameState, globe, commandList)).toBeGreaterThan(0);

            var tileCommandCount = 0;

            for (var i = 0; i < commandList.length; ++i) {
                var command = commandList[i];

                var uniforms = command.uniformMap;
                if (!defined(uniforms) || !defined(uniforms.u_dayTextureAlpha)) {
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

            expect(tileCommandCount).toBeGreaterThan(0);
        });
    });

    it('skips layer with uniform alpha value of zero', function() {
        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();
        var layer = layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        layer.alpha = 0.0;

        frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(globe);

        runs(function() {
            var commandList = [];
            expect(render(context, frameState, globe, commandList)).toBeGreaterThan(0);

            var tileCommandCount = 0;

            for (var i = 0; i < commandList.length; ++i) {
                var command = commandList[i];

                var uniforms = command.uniformMap;
                if (!defined(uniforms) || !defined(uniforms.u_dayTextureAlpha)) {
                    continue;
                }

                ++tileCommandCount;

                expect(uniforms.u_dayTextureAlpha()).toEqual([]);
            }

            expect(tileCommandCount).toBeGreaterThan(0);
        });
    });

    describe('switching terrain providers', function() {
        it('clears the replacement queue', function() {
            updateUntilDone(globe);

            runs(function() {
                var surface = globe._surface;
                var replacementQueue = surface._tileReplacementQueue;
                expect(replacementQueue.count).toBeGreaterThan(0);

                surface.terrainProvider = new EllipsoidTerrainProvider();
                expect(replacementQueue.count).toBe(0);
            });
        });

        it('recreates the level zero tiles', function() {
            var surface = globe._surface;

            updateUntilDone(globe);

            var levelZeroTiles;
            var levelZero0;
            var levelZero1;

            runs(function() {
                levelZeroTiles = surface._levelZeroTiles;
                expect(levelZeroTiles.length).toBe(2);

                levelZero0 = levelZeroTiles[0];
                levelZero1 = levelZeroTiles[1];

                surface.terrainProvider = new EllipsoidTerrainProvider();
            });

            updateUntilDone(globe);

            runs(function() {
                levelZeroTiles = surface._levelZeroTiles;
                expect(levelZeroTiles[0]).not.toBe(levelZero0);
                expect(levelZeroTiles[1]).not.toBe(levelZero1);
            });
        });

        it('does nothing if the new provider is the same as the old', function() {
            var surface = globe._surface;
            var provider = surface.terrainProvider;

            updateUntilDone(globe);

            var levelZeroTiles;
            var levelZero0;
            var levelZero1;

            runs(function() {
                levelZeroTiles = surface._levelZeroTiles;
                expect(levelZeroTiles.length).toBe(2);

                levelZero0 = levelZeroTiles[0];
                levelZero1 = levelZeroTiles[1];

                surface.terrainProvider = provider;
            });

            updateUntilDone(globe);

            runs(function() {
                levelZeroTiles = surface._levelZeroTiles;
                expect(levelZeroTiles[0]).toBe(levelZero0);
                expect(levelZeroTiles[1]).toBe(levelZero1);
            });
        });
    }, 'WebGL');

    it('renders back side of globe when camera is near the poles', function() {
        var camera = frameState.camera;
        camera.position = new Cartesian3(2909078.1077849553, -38935053.40234136, -63252400.94628872);
        camera.direction = new Cartesian3(-0.03928753135806185, 0.44884096070717633, 0.8927476025569903);
        camera.up = new Cartesian3(0.00002847975895320034, -0.8934368803055558, 0.4491887577613425);
        camera.right = new Cartesian3(0.99922794650124, 0.017672942642764363, 0.03508814656908402);
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        updateUntilDone(globe);

        runs(function() {
            // Both level zero tiles should be rendered.
            forEachRenderedTile(surface, 2, 2, function(tile) {
            });
        });
    });
}, 'WebGL');