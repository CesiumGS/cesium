/*global defineSuite*/
defineSuite([
        'Scene/GlobeSurfaceTileProvider',
        'Core/Cartesian3',
        'Core/CesiumTerrainProvider',
        'Core/Color',
        'Core/Credit',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/EllipsoidTerrainProvider',
        'Core/GeographicProjection',
        'Core/Math',
        'Core/Rectangle',
        'Core/WebMercatorProjection',
        'Renderer/ContextLimits',
        'Renderer/RenderState',
        'Scene/BlendingState',
        'Scene/Fog',
        'Scene/Globe',
        'Scene/GlobeSurfaceShaderSet',
        'Scene/ImageryLayerCollection',
        'Scene/OrthographicFrustum',
        'Scene/QuadtreeTile',
        'Scene/QuadtreeTileProvider',
        'Scene/SceneMode',
        'Scene/SingleTileImageryProvider',
        'Scene/WebMapServiceImageryProvider',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        GlobeSurfaceTileProvider,
        Cartesian3,
        CesiumTerrainProvider,
        Color,
        Credit,
        defined,
        Ellipsoid,
        EllipsoidTerrainProvider,
        GeographicProjection,
        CesiumMath,
        Rectangle,
        WebMercatorProjection,
        ContextLimits,
        RenderState,
        BlendingState,
        Fog,
        Globe,
        GlobeSurfaceShaderSet,
        ImageryLayerCollection,
        OrthographicFrustum,
        QuadtreeTile,
        QuadtreeTileProvider,
        SceneMode,
        SingleTileImageryProvider,
        WebMapServiceImageryProvider,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;

    function forEachRenderedTile(quadtreePrimitive, minimumTiles, maximumTiles, callback) {
        var tileCount = 0;
        quadtreePrimitive.forEachRenderedTile(function(tile) {
            ++tileCount;
            callback(tile);
        });

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
        return pollToPromise(function() {
            scene.renderForSpecs();
            return globe._surface.tileProvider.ready && !defined(globe._surface._tileLoadQueue.head) && globe._surface._debug.tilesWaitingForChildren === 0;
        });
    }

    function switchViewMode(mode, projection) {
        scene.mode = mode;
        scene.frameState.mapProjection = projection;
        scene.camera.update(scene.mode);
        scene.camera.setView({
            destination : new Rectangle(0.0001, 0.0001, 0.0030, 0.0030)
        });
    }

    beforeAll(function() {
        scene = createScene();
        scene.frameState.scene3DOnly = false;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        scene.globe = new Globe();
    });

    afterEach(function() {
        scene.imageryLayers.removeAll();
    });

    it('conforms to QuadtreeTileProvider interface', function() {
        expect(GlobeSurfaceTileProvider).toConformToInterface(QuadtreeTileProvider);
    });

    describe('construction', function() {
        it('throws if a terrainProvider is not provided', function() {
            function constructWithoutTerrainProvider() {
                return new GlobeSurfaceTileProvider({
                    imageryLayers : new ImageryLayerCollection(),
                    surfaceShaderSet : new GlobeSurfaceShaderSet()
                });
            }
            expect(constructWithoutTerrainProvider).toThrowDeveloperError();
        });

        it('throws if a imageryLayers is not provided', function() {
            function constructWithoutImageryLayerCollection() {
                return new GlobeSurfaceTileProvider({
                    terrainProvider : new EllipsoidTerrainProvider(),
                    surfaceShaderSet : new GlobeSurfaceShaderSet()
                });
            }
            expect(constructWithoutImageryLayerCollection).toThrowDeveloperError();
        });

        it('throws if a surfaceShaderSet is not provided', function() {
            function constructWithoutImageryLayerCollection() {
                return new GlobeSurfaceTileProvider({
                    terrainProvider : new EllipsoidTerrainProvider(),
                    imageryLayers : new ImageryLayerCollection()
                });
            }
            expect(constructWithoutImageryLayerCollection).toThrowDeveloperError();
        });
    }, 'WebGL');

    describe('layer updating', function() {
        it('removing a layer removes it from all tiles', function() {
            var layer = scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
                url : 'Data/Images/Red16x16.png'
            }));

            return updateUntilDone(scene.globe).then(function() {
                // All tiles should have one or more associated images.
                forEachRenderedTile(scene.globe._surface, 1, undefined, function(tile) {
                    expect(tile.data.imagery.length).toBeGreaterThan(0);
                    for (var i = 0; i < tile.data.imagery.length; ++i) {
                        expect(tile.data.imagery[i].readyImagery.imageryLayer).toEqual(layer);
                    }
                });

                scene.imageryLayers.remove(layer);

                // All associated images should be gone.
                forEachRenderedTile(scene.globe._surface, 1, undefined, function(tile) {
                    expect(tile.data.imagery.length).toEqual(0);
                });
            });
        });

        it('adding a layer adds it to all tiles after update', function() {
            scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
                url : 'Data/Images/Red16x16.png'
            }));

            return updateUntilDone(scene.globe).then(function() {
                // Add another layer
                var layer2 = scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
                    url : 'Data/Images/Green4x4.png'
                }));

                return updateUntilDone(scene.globe).then(function() {
                    // All tiles should have one or more associated images.
                    forEachRenderedTile(scene.globe._surface, 1, undefined, function(tile) {
                        expect(tile.data.imagery.length).toBeGreaterThan(0);
                        var hasImageFromLayer2 = false;
                        for (var i = 0; i < tile.data.imagery.length; ++i) {
                            var imageryTile = tile.data.imagery[i].readyImagery;
                            if (!defined(imageryTile)) {
                                imageryTile = tile.data.imagery[i].loadingImagery;
                            }
                            if (imageryTile.imageryLayer === layer2) {
                                hasImageFromLayer2 = true;
                            }
                        }
                        expect(hasImageFromLayer2).toEqual(true);
                    });
                });
            });
        });

        it('moving a layer moves the corresponding TileImagery instances on every tile', function() {
            var layer1 = scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
                url : 'Data/Images/Red16x16.png'
            }));
            var layer2 = scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
                url : 'Data/Images/Green4x4.png'
            }));

            return updateUntilDone(scene.globe).then(function() {
                forEachRenderedTile(scene.globe._surface, 1, undefined, function(tile) {
                    expect(tile.data.imagery.length).toBeGreaterThan(0);
                    var indexOfFirstLayer1 = tile.data.imagery.length;
                    var indexOfLastLayer1 = -1;
                    var indexOfFirstLayer2 = tile.data.imagery.length;
                    for (var i = 0; i < tile.data.imagery.length; ++i) {
                        if (tile.data.imagery[i].readyImagery.imageryLayer === layer1) {
                            indexOfFirstLayer1 = Math.min(indexOfFirstLayer1, i);
                            indexOfLastLayer1 = i;
                        } else {
                            expect(tile.data.imagery[i].readyImagery.imageryLayer).toEqual(layer2);
                            indexOfFirstLayer2 = Math.min(indexOfFirstLayer2, i);
                        }
                    }
                    expect(indexOfFirstLayer1).toBeLessThan(indexOfFirstLayer2);
                    expect(indexOfLastLayer1).toBeLessThan(indexOfFirstLayer2);
                });

                scene.imageryLayers.raiseToTop(layer1);

                return updateUntilDone(scene.globe).then(function() {
                    forEachRenderedTile(scene.globe._surface, 1, undefined, function(tile) {
                        expect(tile.data.imagery.length).toBeGreaterThan(0);
                        var indexOfFirstLayer2 = tile.data.imagery.length;
                        var indexOfLastLayer2 = -1;
                        var indexOfFirstLayer1 = tile.data.imagery.length;
                        for (var i = 0; i < tile.data.imagery.length; ++i) {
                            if (tile.data.imagery[i].readyImagery.imageryLayer === layer2) {
                                indexOfFirstLayer2 = Math.min(indexOfFirstLayer2, i);
                                indexOfLastLayer2 = i;
                            } else {
                                expect(tile.data.imagery[i].readyImagery.imageryLayer).toEqual(layer1);
                                indexOfFirstLayer1 = Math.min(indexOfFirstLayer1, i);
                            }
                        }
                        expect(indexOfFirstLayer2).toBeLessThan(indexOfFirstLayer1);
                        expect(indexOfLastLayer2).toBeLessThan(indexOfFirstLayer1);
                    });
                });
            });
        });

        it('adding a layer creates its skeletons only once', function() {
            scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
                url : 'Data/Images/Red16x16.png'
            }));

            return updateUntilDone(scene.globe).then(function() {
                // Add another layer
                var layer2 = scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
                    url : 'Data/Images/Green4x4.png'
                }));

                return updateUntilDone(scene.globe).then(function() {
                    // All tiles should have one or more associated images.
                    forEachRenderedTile(scene.globe._surface, 1, undefined, function(tile) {
                        expect(tile.data.imagery.length).toBeGreaterThan(0);
                        var tilesFromLayer2 = 0;
                        for (var i = 0; i < tile.data.imagery.length; ++i) {
                            var imageryTile = tile.data.imagery[i].readyImagery;
                            if (!defined(imageryTile)) {
                                imageryTile = tile.data.imagery[i].loadingImagery;
                            }
                            if (imageryTile.imageryLayer === layer2) {
                                ++tilesFromLayer2;
                            }
                        }
                        expect(tilesFromLayer2).toBe(1);
                    });
                });
            });
        });
    }, 'WebGL');

    it('renders in 2D geographic', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        }));

        switchViewMode(SceneMode.SCENE2D, new GeographicProjection(Ellipsoid.WGS84));

        return updateUntilDone(scene.globe).then(function() {
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        });
    });

    it('renders in 2D web mercator', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        }));

        switchViewMode(SceneMode.SCENE2D, new WebMercatorProjection(Ellipsoid.WGS84));

        return updateUntilDone(scene.globe).then(function() {
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        });
    });

    it('renders in Columbus View geographic', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        }));

        switchViewMode(SceneMode.COLUMBUS_VIEW, new GeographicProjection(Ellipsoid.WGS84));

        return updateUntilDone(scene.globe).then(function() {
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        });
    });

    it('renders in Columbus View web mercator', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        }));

        switchViewMode(SceneMode.COLUMBUS_VIEW, new WebMercatorProjection(Ellipsoid.WGS84));

        return updateUntilDone(scene.globe).then(function() {
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 128, 255]);
        });
    });

    it('renders in 3D', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        }));

        switchViewMode(SceneMode.SCENE3D, new GeographicProjection(Ellipsoid.WGS84));

        return updateUntilDone(scene.globe).then(function() {
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        });
    });

    it('renders in 3D (2)', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        }));

        switchViewMode(SceneMode.SCENE3D, new GeographicProjection(Ellipsoid.WGS84));

        return updateUntilDone(scene.globe).then(function() {
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        });
    });

    describe('fog', function() {
        it('culls tiles in full fog', function() {
            expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
            scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
                url : 'Data/Images/Red16x16.png'
            }));
            var oldFog = scene.fog;
            scene.fog = new Fog();
            switchViewMode(SceneMode.SCENE3D, new GeographicProjection(Ellipsoid.WGS84));

            return updateUntilDone(scene.globe).then(function() {
                expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

                scene.fog.enabled = true;
                scene.fog.density = 1.0;
                scene.fog.screenSpaceErrorFactor = 0.0;

                expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

                scene.fog = oldFog;
            });
        });

        it('culls tiles because of increased SSE', function() {
            expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
            scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
                url : 'Data/Images/Red16x16.png'
            }));
            var oldFog = scene.fog;
            scene.fog = new Fog();
            switchViewMode(SceneMode.SCENE3D, new GeographicProjection(Ellipsoid.WGS84));

            return updateUntilDone(scene.globe).then(function() {
                expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

                scene.fog.enabled = true;
                scene.fog.density = 0.001;
                scene.fog.screenSpaceErrorFactor = 0.0;
                var result = scene.renderForSpecs();
                expect(result).not.toEqual([0, 0, 0, 255]);

                scene.fog.screenSpaceErrorFactor = 10000.0;

                expect(scene.renderForSpecs()).not.toEqual(result);

                scene.fog = oldFog;
            });
        });
    });

    it('can change baseColor', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        scene.globe.baseColor = Color.RED;
        scene.fog.enabled = false;
        switchViewMode(SceneMode.SCENE3D, new GeographicProjection(Ellipsoid.WGS84));

        return updateUntilDone(scene.globe).then(function() {
            var result = scene.renderForSpecs();
            expect(result).not.toEqual([0, 0, 0, 255]);
            expect(result).toEqual([255, 0, 0, 255]);
        });
    });

    it('renders in 3D and then Columbus View', function() {
        scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        }));
        switchViewMode(SceneMode.SCENE3D, new GeographicProjection(Ellipsoid.WGS84));

        return updateUntilDone(scene.globe).then(function() {
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

            switchViewMode(SceneMode.COLUMBUS_VIEW, new GeographicProjection(Ellipsoid.WGS84));

            return updateUntilDone(scene.globe).then(function() {
                expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
            });
        });
    });

    it('renders even if imagery root tiles fail to load', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        var providerWithInvalidRootTiles = new WebMapServiceImageryProvider({
            url : '/invalid',
            layers : 'invalid'
        });

        scene.imageryLayers.addImageryProvider(providerWithInvalidRootTiles);
        switchViewMode(SceneMode.SCENE3D, new GeographicProjection(Ellipsoid.WGS84));

        return updateUntilDone(scene.globe).then(function() {
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        });
    });

    it('passes layer adjustment values as uniforms', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        var layer = scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        }));

        layer.alpha = 0.123;
        layer.brightness = 0.456;
        layer.contrast = 0.654;
        layer.gamma = 0.321;
        layer.saturation = 0.123;
        layer.hue = 0.456;

        switchViewMode(SceneMode.SCENE3D, new GeographicProjection(Ellipsoid.WGS84));

        return updateUntilDone(scene.globe).then(function() {
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

            var tileCommandCount = 0;
            var commandList = scene.frameState.commandList;

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
                expect(uniforms.u_dayTextureOneOverGamma()).toEqual([1.0 / 0.321]);
                expect(uniforms.u_dayTextureSaturation()).toEqual([0.123]);
                expect(uniforms.u_dayTextureHue()).toEqual([0.456]);
            }

            expect(tileCommandCount).toBeGreaterThan(0);
        });
    });

    it('skips layer with uniform alpha value of zero', function() {
        var layer = scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png'
        }));

        layer.alpha = 0.0;

        switchViewMode(SceneMode.SCENE3D, new GeographicProjection(Ellipsoid.WGS84));

        return updateUntilDone(scene.globe).then(function() {
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

            var tileCommandCount = 0;
            var commandList = scene.frameState.commandList;

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

    it('can render more imagery layers than the available texture units', function() {
        for (var i = 0; i < ContextLimits.maximumTextureImageUnits + 1; ++i) {
            scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
                url : 'Data/Images/Red16x16.png'
            }));
        }

        switchViewMode(SceneMode.SCENE3D, new GeographicProjection(Ellipsoid.WGS84));

        return updateUntilDone(scene.globe).then(function() {
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

            var renderStateWithAlphaBlending = RenderState.fromCache({
                blending : BlendingState.ALPHA_BLEND
            });

            var drawCommandsPerTile = {};
            var commandList = scene.frameState.commandList;

            for (var i = 0; i < commandList.length; ++i) {
                var command = commandList[i];

                if (command.owner instanceof QuadtreeTile) {
                    var tile = command.owner;
                    var key = 'L' + tile.level + 'X' + tile.x + 'Y' + tile.y;
                    if (!defined(drawCommandsPerTile[key])) {
                        drawCommandsPerTile[key] = 0;

                        // The first draw command for each tile should use a non-alpha-blending render state.
                        expect(command.renderState.blending).not.toEqual(renderStateWithAlphaBlending.blending);
                    } else {
                        // Successive draw commands per tile should alpha blend.
                        expect(command.renderState.blending).toEqual(renderStateWithAlphaBlending.blending);
                        expect(command.uniformMap.u_initialColor().w).toEqual(0.0);
                    }

                    ++drawCommandsPerTile[key];
                }
            }

            var tileCount = 0;
            for ( var tileID in drawCommandsPerTile) {
                if (drawCommandsPerTile.hasOwnProperty(tileID)) {
                    ++tileCount;
                    expect(drawCommandsPerTile[tileID]).toBeGreaterThanOrEqualTo(2);
                }
            }

            expect(tileCount).toBeGreaterThanOrEqualTo(1);
        });
    });

    it('adds terrain and imagery credits to the CreditDisplay', function() {
        var imageryCredit = new Credit('imagery credit');
        scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
            url : 'Data/Images/Red16x16.png',
            credit : imageryCredit
        }));

        var terrainCredit = new Credit('terrain credit');
        scene.terrainProvider = new CesiumTerrainProvider({
            url : 'https://assets.agi.com/stk-terrain/world',
            credit : terrainCredit
        });

        return updateUntilDone(scene.globe).then(function() {
            var creditDisplay = scene.frameState.creditDisplay;
            expect(creditDisplay._currentFrameCredits.textCredits).toContain(imageryCredit);
            expect(creditDisplay._currentFrameCredits.textCredits).toContain(terrainCredit);
        });
    });

    describe('switching terrain providers', function() {
        it('clears the replacement queue', function() {
            return updateUntilDone(scene.globe).then(function() {
                var surface = scene.globe._surface;
                var replacementQueue = surface._tileReplacementQueue;
                expect(replacementQueue.count).toBeGreaterThan(0);

                surface.tileProvider.terrainProvider = new EllipsoidTerrainProvider();
                expect(replacementQueue.count).toBe(0);
            });
        });

        it('recreates the level zero tiles', function() {
            var surface = scene.globe._surface;

            scene.renderForSpecs();

            var levelZeroTiles = surface._levelZeroTiles;
            expect(levelZeroTiles.length).toBe(2);

            var levelZero0 = levelZeroTiles[0];
            var levelZero1 = levelZeroTiles[1];

            surface.tileProvider.terrainProvider = new EllipsoidTerrainProvider();

            scene.renderForSpecs();

            levelZeroTiles = surface._levelZeroTiles;
            expect(levelZeroTiles[0]).not.toBe(levelZero0);
            expect(levelZeroTiles[1]).not.toBe(levelZero1);
        });

        it('does nothing if the new provider is the same as the old', function() {
            var surface = scene.globe._surface;
            var provider = surface.tileProvider.terrainProvider;

            scene.renderForSpecs();

            var levelZeroTiles = surface._levelZeroTiles;
            expect(levelZeroTiles.length).toBe(2);

            var levelZero0 = levelZeroTiles[0];
            var levelZero1 = levelZeroTiles[1];

            surface.tileProvider.terrainProvider = provider;

            scene.renderForSpecs();

            levelZeroTiles = surface._levelZeroTiles;
            expect(levelZeroTiles[0]).toBe(levelZero0);
            expect(levelZeroTiles[1]).toBe(levelZero1);
        });
    }, 'WebGL');

    it('renders back side of globe when camera is near the poles', function() {
        var camera = scene.camera;
        camera.position = new Cartesian3(2909078.1077849553, -38935053.40234136, -63252400.94628872);
        camera.direction = new Cartesian3(-0.03928753135806185, 0.44884096070717633, 0.8927476025569903);
        camera.up = new Cartesian3(0.00002847975895320034, -0.8934368803055558, 0.4491887577613425);
        camera.right = new Cartesian3(0.99922794650124, 0.017672942642764363, 0.03508814656908402);
        scene.cullingVolume = camera.frustum.computeCullingVolume(camera.position, camera.direction, camera.up);

        return updateUntilDone(scene.globe).then(function() {
            // Both level zero tiles should be rendered.
            forEachRenderedTile(scene.globe._surface, 2, 2, function(tile) {
            });
        });
    });

    it('throws if baseColor is assigned undefined', function() {
        expect(function() {
            scene.globe._surface.tileProvider.baseColor = undefined;
        }).toThrowDeveloperError();
    });

}, 'WebGL');
