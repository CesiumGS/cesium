defineSuite([
        'Scene/GlobeSurfaceTile',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/CesiumTerrainProvider',
        'Core/createWorldTerrain',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/GeographicTilingScheme',
        'Core/HeightmapTerrainData',
        'Core/Ray',
        'Core/Rectangle',
        'Core/RequestScheduler',
        'Core/TileAvailability',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryLayerCollection',
        'Scene/ImageryState',
        'Scene/QuadtreeTile',
        'Scene/QuadtreeTileLoadState',
        'Scene/TerrainState',
        'Scene/TileImagery',
        'Specs/createScene',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        GlobeSurfaceTile,
        Cartesian3,
        Cartesian4,
        CesiumTerrainProvider,
        createWorldTerrain,
        defined,
        Ellipsoid,
        GeographicTilingScheme,
        HeightmapTerrainData,
        Ray,
        Rectangle,
        RequestScheduler,
        TileAvailability,
        Imagery,
        ImageryLayer,
        ImageryLayerCollection,
        ImageryState,
        QuadtreeTile,
        QuadtreeTileLoadState,
        TerrainState,
        TileImagery,
        createScene,
        pollToPromise,
        when) {
    'use strict';

    describe('processStateMachine', function() {
        var frameState = {};
        var terrainProvider;

        var tilingScheme;
        var rootTiles;
        var rootTile;
        var imageryLayerCollection;

        beforeEach(function() {
            tilingScheme = new GeographicTilingScheme();
            rootTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);
            rootTile = rootTiles[0];
            imageryLayerCollection = new ImageryLayerCollection();

            terrainProvider = {
                requestTileGeometry : function(x, y, level) {
                    return undefined;
                },
                tilingScheme : tilingScheme,
                availability : new TileAvailability(tilingScheme, 10),
                hasWaterMask : function() {
                    return true;
                },
                getTileDataAvailable : function(x, y, level) {
                    return undefined;
                },
                getNearestBvhLevel : function(x, y, level) {
                    return -1;
                }
            };
        });

        afterEach(function() {
            for (var i = 0; i < rootTiles.length; ++i) {
                rootTiles[i].freeResources();
            }
        });

        it('starts in the START state', function() {
            for (var i = 0; i < rootTiles.length; ++i) {
                var tile = rootTiles[i];
                expect(tile.state).toBe(QuadtreeTileLoadState.START);
            }
        });

        it('transitions to the LOADING state immediately if this tile is available', function() {
            GlobeSurfaceTile.processStateMachine(rootTile, frameState, terrainProvider, imageryLayerCollection);
            expect(rootTile.state).toBe(QuadtreeTileLoadState.LOADING);
            expect(rootTile.data.terrainState).toBe(TerrainState.UNLOADED);
        });

        it('transitions to the LOADING tile state and FAILED terrain state immediately if this tile is NOT available', function() {
            makeTerrainReady(rootTile);
            spyOn(terrainProvider, 'getTileDataAvailable').and.returnValue(false);
            GlobeSurfaceTile.processStateMachine(rootTile.southwestChild, frameState, terrainProvider, imageryLayerCollection);
            expect(rootTile.southwestChild.state).toBe(QuadtreeTileLoadState.LOADING);
            expect(rootTile.southwestChild.data.terrainState).toBe(TerrainState.FAILED);
        });

        it('pushes parent along if waiting on it to be able to upsample', function() {
            makeTerrainUnloaded(rootTile);
            spyOn(terrainProvider, 'getTileDataAvailable').and.returnValue(false);
            spyOn(terrainProvider, 'requestTileGeometry');
            GlobeSurfaceTile.processStateMachine(rootTile.southwestChild, frameState, terrainProvider, imageryLayerCollection);
            expect(terrainProvider.requestTileGeometry.calls.count()).toBe(1);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[1]).toBe(0);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[2]).toBe(0);
        });

        it('does nothing when attempting to upsample a failed root tile', function() {
            makeTerrainFailed(rootTile);
            GlobeSurfaceTile.processStateMachine(rootTile, frameState, terrainProvider, imageryLayerCollection);
            expect(rootTile.state).toBe(QuadtreeTileLoadState.FAILED);
            expect(rootTile.data.terrainState).toBe(TerrainState.FAILED);
        });

        it('upsamples failed tiles from parent TerrainData', function() {
            makeTerrainReceived(rootTile);
            spyOn(terrainProvider, 'getTileDataAvailable').and.returnValue(false);
            var sw = rootTile.southwestChild;
            GlobeSurfaceTile.processStateMachine(sw, frameState, terrainProvider, imageryLayerCollection);
            expect(rootTile.data.terrainData.upsample).toHaveBeenCalledWith(tilingScheme, rootTile.x, rootTile.y, rootTile.level, sw.x, sw.y, sw.level);
        });

        it('loads available tiles', function() {
            var sw = rootTile.southwestChild;
            terrainProvider.availability.addAvailableTileRange(sw.level, sw.x, sw.y, sw.x, sw.y);
            spyOn(terrainProvider, 'requestTileGeometry');
            GlobeSurfaceTile.processStateMachine(sw, frameState, terrainProvider, imageryLayerCollection);
            expect(terrainProvider.requestTileGeometry.calls.count()).toBe(1);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[1]).toBe(1);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[2]).toBe(1);
        });

        it('loads BVH nodes instead when the tile\'s bounding volume is unreliable', function() {
            var sw = rootTile.southwestChild;
            makeTerrainUnloaded(rootTile);
            makeTerrainUnloaded(sw);

            // Indicate that the SW tile's bounding volume comes from the root.
            sw.data.boundingVolumeSourceTile = rootTile;

            // Indicate that level 0 has BVH data for the SW tile.
            spyOn(terrainProvider, 'getNearestBvhLevel').and.returnValue(0);
            spyOn(terrainProvider, 'requestTileGeometry');

            GlobeSurfaceTile.processStateMachine(sw, frameState, terrainProvider, imageryLayerCollection);

            // Expect that the rootTile is loaded, not the SW tile.
            expect(terrainProvider.getNearestBvhLevel).toHaveBeenCalledWith(sw.x, sw.y, sw.level);
            expect(terrainProvider.requestTileGeometry.calls.count()).toBe(1);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[1]).toBe(0);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[2]).toBe(0);
        });

        it('loads this tile if the nearest BVH level is unknown', function() {
            var sw = rootTile.southwestChild;
            makeTerrainUnloaded(rootTile);
            makeTerrainUnloaded(sw);

            // Indicate that the SW tile's bounding volume comes from the root.
            sw.data.boundingVolumeSourceTile = rootTile;

            // Indicate that no BVH data is available for the SW tile
            spyOn(terrainProvider, 'getNearestBvhLevel').and.returnValue(-1);
            spyOn(terrainProvider, 'requestTileGeometry');

            GlobeSurfaceTile.processStateMachine(sw, frameState, terrainProvider, imageryLayerCollection);

            // Expect that the SW tile is loaded.
            expect(terrainProvider.getNearestBvhLevel).toHaveBeenCalledWith(sw.x, sw.y, sw.level);
            expect(terrainProvider.requestTileGeometry.calls.count()).toBe(1);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[1]).toBe(1);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[2]).toBe(1);
        });

        it('loads this tile if the terrain provider does not implement getNearestBvhLevel', function() {
            var sw = rootTile.southwestChild;
            makeTerrainUnloaded(rootTile);
            makeTerrainUnloaded(sw);

            // Indicate that the SW tile's bounding volume comes from the root.
            sw.data.boundingVolumeSourceTile = rootTile;

            // Indicate that no BVH data is available for the SW tile
            terrainProvider.getNearestBvhLevel = undefined;
            spyOn(terrainProvider, 'requestTileGeometry');

            GlobeSurfaceTile.processStateMachine(sw, frameState, terrainProvider, imageryLayerCollection);

            // Expect that the SW tile is loaded.
            expect(terrainProvider.requestTileGeometry.calls.count()).toBe(1);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[1]).toBe(1);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[2]).toBe(1);
        });

        it('loads only terrain (not imagery) when loading BVH nodes', function() {
            var sw = rootTile.southwestChild;
            makeTerrainUnloaded(rootTile);
            makeTerrainUnloaded(sw);

            // Indicate that the SW tile's bounding volume comes from the root.
            sw.data.boundingVolumeSourceTile = rootTile;

            // Indicate that level 0 has BVH data for the SW tile.
            spyOn(terrainProvider, 'getNearestBvhLevel').and.returnValue(0);
            spyOn(terrainProvider, 'requestTileGeometry');

            var _createTileImagerySkeletons = jasmine.createSpy('_createTileImagerySkeletons');
            sw.data.imagery.push({
                loadingImagery : {
                    state : ImageryState.PLACEHOLDER,
                    imageryLayer : {
                        imageryProvider : {
                            ready : true
                        },
                        _createTileImagerySkeletons : _createTileImagerySkeletons
                    }
                },
                freeResources: function() {}
            });

            GlobeSurfaceTile.processStateMachine(sw, frameState, terrainProvider, imageryLayerCollection);

            // Expect that the rootTile is loaded, not the SW tile.
            expect(terrainProvider.getNearestBvhLevel).toHaveBeenCalledWith(sw.x, sw.y, sw.level);
            expect(terrainProvider.requestTileGeometry.calls.count()).toBe(1);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[1]).toBe(0);
            expect(terrainProvider.requestTileGeometry.calls.argsFor(0)[2]).toBe(0);

            // Expect that _createTileImagerySkeletons was _not_ called
            expect(_createTileImagerySkeletons).not.toHaveBeenCalled();
        });

        /*it('entirely upsampled tile is marked as such', function() {
            var childTile = rootTile.children[0];

            return pollToPromise(function() {
                GlobeSurfaceTile.processStateMachine(rootTile, frameState, realTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(childTile, frameState, alwaysFailTerrainProvider, imageryLayerCollection);
                RequestScheduler.update();
                return rootTile.state >= QuadtreeTileLoadState.DONE &&
                       childTile.state >= QuadtreeTileLoadState.DONE;
            }).then(function() {
                expect(rootTile.state).toBe(QuadtreeTileLoadState.DONE);
                expect(childTile.upsampledFromParent).toBe(true);
            });
        });

        it('uses shared water mask texture for tiles that are entirely water', function() {
            var allWaterTerrainProvider = {
                requestTileGeometry : function(x, y, level) {
                    var real = realTerrainProvider.requestTileGeometry(x, y, level);
                    if (!defined(real)) {
                        return real;
                    }

                    return when(real, function(terrainData) {
                        terrainData._waterMask = new Uint8Array([255]);
                        return terrainData;
                    });
                },
                tilingScheme : realTerrainProvider.tilingScheme,
                hasWaterMask : function() {
                    return realTerrainProvider.hasWaterMask();
                },
                getTileDataAvailable : function(x, y, level) {
                    return undefined;
                }
            };

            var childTile = rootTile.children[0];

            return pollToPromise(function() {
                if (rootTile.state !== QuadtreeTileLoadState.DONE) {
                    GlobeSurfaceTile.processStateMachine(rootTile, frameState, allWaterTerrainProvider, imageryLayerCollection);
                    return false;
                }
                GlobeSurfaceTile.processStateMachine(childTile, frameState, allWaterTerrainProvider, imageryLayerCollection);
                return childTile.state === QuadtreeTileLoadState.DONE;
            }).then(function() {
                expect(childTile.data.waterMaskTexture).toBeDefined();
                expect(childTile.data.waterMaskTexture).toBe(rootTile.data.waterMaskTexture);
            });
        });

        it('uses undefined water mask texture for tiles that are entirely land', function() {
            var allLandTerrainProvider = {
                requestTileGeometry : function(x, y, level) {
                    var real = realTerrainProvider.requestTileGeometry(x, y, level);
                    if (!defined(real)) {
                        return real;
                    }

                    return when(real, function(terrainData) {
                        terrainData._waterMask = new Uint8Array([0]);
                        return terrainData;
                    });
                },
                tilingScheme : realTerrainProvider.tilingScheme,
                hasWaterMask : function() {
                    return realTerrainProvider.hasWaterMask();
                },
                getTileDataAvailable : function(x, y, level) {
                    return undefined;
                }
            };

            var childTile = rootTile.children[0];

            return pollToPromise(function() {
                if (rootTile.state !== QuadtreeTileLoadState.DONE) {
                    GlobeSurfaceTile.processStateMachine(rootTile, frameState, allLandTerrainProvider, imageryLayerCollection);
                    return false;
                }
                GlobeSurfaceTile.processStateMachine(childTile, frameState, allLandTerrainProvider, imageryLayerCollection);
                return childTile.state === QuadtreeTileLoadState.DONE;
            }).then(function() {
                expect(childTile.data.waterMaskTexture).toBeUndefined();
            });
        });

        it('loads parent imagery tile even for root terrain tiles', function() {
            var tile = new QuadtreeTile({
                tilingScheme : new GeographicTilingScheme(),
                level : 0,
                x : 1,
                y : 0
            });

            var imageryLayerCollection = new ImageryLayerCollection();

            GlobeSurfaceTile.processStateMachine(tile, frameState, alwaysDeferTerrainProvider, imageryLayerCollection);

            var layer = new ImageryLayer({
                requestImage : function() {
                    return when.reject();
                }
            });
            var imagery = new Imagery(layer, 0, 0, 1, Rectangle.MAX_VALUE);
            tile.data.imagery.push(new TileImagery(imagery, new Cartesian4()));

            expect(imagery.parent.state).toBe(ImageryState.UNLOADED);

            return pollToPromise(function() {
                GlobeSurfaceTile.processStateMachine(tile, frameState, alwaysDeferTerrainProvider, imageryLayerCollection);
                return imagery.parent.state !== ImageryState.UNLOADED;
            });
        });*/
    });

    describe('getBoundingVolumeHierarchy', function() {
        it('gets the BVH from the TerrainData if available', function() {
            var tile = new QuadtreeTile({
                level: 0,
                x: 0,
                y: 0,
                tilingScheme: new GeographicTilingScheme()
            });
            makeTerrainReceived(tile);

            var bvh = [1.0, 2.0];
            tile.data.terrainData.bvh = bvh;
            expect(tile.data.getBoundingVolumeHierarchy(tile)).toBe(bvh);
        });

        it('gets the BVH from the parent tile if available', function() {
            var tile = new QuadtreeTile({
                level: 0,
                x: 0,
                y: 0,
                tilingScheme: new GeographicTilingScheme()
            });
            makeTerrainReceived(tile);
            tile.data.terrainData.bvh = new Float32Array([1.0, 10.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]);

            var sw = tile.southwestChild;
            makeLoading(sw);
            expect(sw.data.getBoundingVolumeHierarchy(sw)).toEqual([3.0, 4.0]);

            var se = tile.southeastChild;
            makeLoading(se);
            expect(se.data.getBoundingVolumeHierarchy(se)).toEqual([5.0, 6.0]);

            var nw = tile.northwestChild;
            makeLoading(nw);
            expect(nw.data.getBoundingVolumeHierarchy(nw)).toEqual([7.0, 8.0]);

            var ne = tile.northeastChild;
            makeLoading(ne);
            expect(ne.data.getBoundingVolumeHierarchy(ne)).toEqual([9.0, 10.0]);
        });

        it('returns undefined if the parent BVH does not extend to this tile', function() {
            var tile = new QuadtreeTile({
                level: 0,
                x: 0,
                y: 0,
                tilingScheme: new GeographicTilingScheme()
            });
            makeTerrainReceived(tile);
            tile.data.terrainData.bvh = new Float32Array([1.0, 10.0]);

            var sw = tile.southwestChild;
            makeLoading(sw);
            expect(sw.data.getBoundingVolumeHierarchy(sw)).toBeUndefined();
        });

        it('returns undefined if the parent does not have a BVH', function() {
            var tile = new QuadtreeTile({
                level: 0,
                x: 0,
                y: 0,
                tilingScheme: new GeographicTilingScheme()
            });
            makeTerrainReceived(tile);
            tile.data.terrainData.bvh = undefined;

            var sw = tile.southwestChild;
            makeLoading(sw);
            expect(sw.data.getBoundingVolumeHierarchy(sw)).toBeUndefined();
        });
    });

    describe('pick', function() {
        var scene;

        beforeAll(function() {
            scene = createScene();
        });

        afterAll(function() {
            scene.destroyForSpecs();
        });

        it('gets correct results even when the mesh includes normals', function() {
            var terrainProvider = createWorldTerrain({
                requestVertexNormals: true,
                requestWaterMask: false
            });

            var tile = new QuadtreeTile({
                tilingScheme : new GeographicTilingScheme(),
                level : 11,
                x : 3788,
                y : 1336
            });

            var imageryLayerCollection = new ImageryLayerCollection();

            makeLoading(tile);
            tile.data.boundingVolumeSourceTile = tile;

            return pollToPromise(function() {
                if (!terrainProvider.ready) {
                    return false;
                }

                GlobeSurfaceTile.processStateMachine(tile, scene.frameState, terrainProvider, imageryLayerCollection);
                RequestScheduler.update();
                return tile.state === QuadtreeTileLoadState.DONE;
            }).then(function() {
                var ray = new Ray(
                    new Cartesian3(-5052039.459789615, 2561172.040315167, -2936276.999965875),
                    new Cartesian3(0.5036332963145244, 0.6648033332898124, 0.5517155343926082));
                var pickResult = tile.data.pick(ray, undefined, true);
                var cartographic = Ellipsoid.WGS84.cartesianToCartographic(pickResult);
                expect(cartographic.height).toBeGreaterThan(-500.0);
            });
        });
    }, 'WebGL');

    describe('eligibleForUnloading', function() {
        it('returns true when no loading has been done', function() {
            var tile = new QuadtreeTile({
                level: 0,
                x: 0,
                y: 0,
                tilingScheme: new GeographicTilingScheme()
            });
            makeLoading(tile);
            expect(tile.data.eligibleForUnloading).toBe(true);
        });

        it('returns true when some loading has been done', function() {
            var tile = new QuadtreeTile({
                level: 0,
                x: 0,
                y: 0,
                tilingScheme: new GeographicTilingScheme()
            });

            makeTerrainReceived(tile);
            expect(tile.data.eligibleForUnloading).toBe(true);

            makeTerrainTransformed(tile);
            expect(tile.data.eligibleForUnloading).toBe(true);

            makeTerrainReady(tile);
            expect(tile.data.eligibleForUnloading).toBe(true);
        });

        it('returns false when RECEIVING or TRANSITIONING', function() {
            var tile = new QuadtreeTile({
                level: 0,
                x: 0,
                y: 0,
                tilingScheme: new GeographicTilingScheme()
            });

            makeTerrainUnloaded(tile);
            expect(tile.data.eligibleForUnloading).toBe(true);

            tile.data.terrainState = TerrainState.RECEIVING;
            expect(tile.data.eligibleForUnloading).toBe(false);

            tile.data.terrainState = TerrainState.TRANSFORMING;
            expect(tile.data.eligibleForUnloading).toBe(false);
        });

        it('returns false when imagery is TRANSITIONING, true otherwise', function() {
            var tile = new QuadtreeTile({
                level: 0,
                x: 0,
                y: 0,
                tilingScheme: new GeographicTilingScheme()
            });
            makeTerrainReady(tile);
            expect(tile.data.eligibleForUnloading).toBe(true);

            tile.data.imagery.push({
                loadingImagery : {
                    state : undefined,
                },
            });

            Object.keys(ImageryState).forEach(function(state) {
                tile.data.imagery[0].loadingImagery.state = state;
                if (state === ImageryState.TRANSITIONING) {
                    expect(tile.data.eligibleForUnloading).toBe(false);
                } else {
                    expect(tile.data.eligibleForUnloading).toBe(true);
                }
            });
        });
    });

    function makeLoading(tile) {
        if (!defined(tile.data)) {
            tile.data = new GlobeSurfaceTile();
        }
        tile.state = QuadtreeTileLoadState.LOADING;
    }

    function makeTerrainFailed(tile) {
        makeLoading(tile);
        tile.data.terrainState = TerrainState.FAILED;
        tile.data.terrainData = undefined;
        tile.data.vertexArray = undefined;
        tile.data.mesh = undefined;
    }

    function makeTerrainUnloaded(tile) {
        makeLoading(tile);
        tile.data.terrainState = TerrainState.UNLOADED;
        tile.data.terrainData = undefined;
        tile.data.vertexArray = undefined;
        tile.data.mesh = undefined;
    }

    function makeTerrainReceived(tile) {
        makeLoading(tile);
        tile.data.terrainState = TerrainState.RECEIVED;
        tile.data.terrainData = jasmine.createSpyObj('TerrainData', ['createMesh', 'upsample', 'wasCreatedByUpsampling']);
        tile.data.terrainData.wasCreatedByUpsampling.and.returnValue(false);

        tile.data.mesh = undefined;
        tile.data.vertexArray = undefined;
    }

    function makeTerrainUpsampled(tile) {
        makeLoading(tile);
        tile.data.terrainState = TerrainState.RECEIVED;
        tile.data.terrainData = jasmine.createSpyObj('TerrainData', ['createMesh', 'upsample', 'wasCreatedByUpsampling']);
        tile.data.terrainData.wasCreatedByUpsampling.and.returnValue(true);

        tile.data.mesh = undefined;
        tile.data.vertexArray = undefined;
    }

    function makeTerrainTransformed(tile) {
        makeLoading(tile);

        if (!defined(tile.data.terrainData)) {
            makeTerrainReceived(tile);
        }

        tile.data.terrainState = TerrainState.TRANSFORMED;
        tile.data.mesh = {};
    }

    function makeTerrainReady(tile) {
        makeLoading(tile);

        if (!defined(tile.data.mesh)) {
            makeTerrainTransformed(tile);
        }

        tile.data.terrainState = TerrainState.DONE;
        tile.data.vertexArray = jasmine.createSpyObj('VertexArray', ['destroy', 'isDestroyed']);
        tile.data.vertexArray.isDestroyed.and.returnValue(false);
        tile.data.fill = tile.data.fill && tile.data.fill.destroy();
    }
});
