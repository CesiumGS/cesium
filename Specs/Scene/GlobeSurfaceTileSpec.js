defineSuite([
        'Scene/GlobeSurfaceTile',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/CesiumTerrainProvider',
        'Core/clone',
        'Core/createWorldTerrain',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/GeographicTilingScheme',
        'Core/HeightmapTerrainData',
        'Core/Ray',
        'Core/Rectangle',
        'Core/RequestScheduler',
        'Core/TerrainEncoding',
        'Core/TerrainMesh',
        'Core/TileAvailability',
        'Renderer/Buffer',
        'Renderer/Texture',
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
        'ThirdParty/when',
        '../MockImageryProvider',
        '../MockTerrainProvider'
    ], function(
        GlobeSurfaceTile,
        Cartesian3,
        Cartesian4,
        CesiumTerrainProvider,
        clone,
        createWorldTerrain,
        defined,
        Ellipsoid,
        GeographicTilingScheme,
        HeightmapTerrainData,
        Ray,
        Rectangle,
        RequestScheduler,
        TerrainEncoding,
        TerrainMesh,
        TileAvailability,
        Buffer,
        Texture,
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
        when,
        MockImageryProvider,
        MockTerrainProvider) {
    'use strict';

    var tilingScheme;
    var rootTiles;
    var rootTile;
    var imageryLayerCollection;
    var mockTerrain;

    beforeEach(function() {
        tilingScheme = new GeographicTilingScheme();
        rootTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);
        rootTile = rootTiles[0];
        imageryLayerCollection = new ImageryLayerCollection();

        mockTerrain = new MockTerrainProvider();
    });

    afterEach(function() {
        for (var i = 0; i < rootTiles.length; ++i) {
            rootTiles[i].freeResources();
        }
    });

    describe('processStateMachine', function() {
        var frameState = {
            context: {
                cache: {},
                _gl: {}
            }
        };

        beforeEach(function() {
            // Skip the WebGL bits
            spyOn(GlobeSurfaceTile, '_createVertexArrayForMesh').and.callFake(function() {
                var vertexArray = jasmine.createSpyObj('VertexArray', ['destroy']);
                return vertexArray;
            });

            spyOn(ImageryLayer.prototype, '_createTextureWebGL').and.callFake(function(context, imagery) {
                var texture = jasmine.createSpyObj('Texture', ['destroy']);
                texture.width = imagery.image.width;
                texture.height = imagery.image.height;
                return texture;
            });

            spyOn(ImageryLayer.prototype, '_finalizeReprojectTexture');

            spyOn(Texture, 'create').and.callFake(function(options) {
                var result = clone(options);
                result.destroy = function() {};
                return result;
            });
        });

        it('starts in the START state', function() {
            for (var i = 0; i < rootTiles.length; ++i) {
                var tile = rootTiles[i];
                expect(tile.state).toBe(QuadtreeTileLoadState.START);
            }
        });

        // Processes the given list of tiles until all terrain and imagery states stop changing.
        function processTiles(tiles) {
            var deferred = when.defer();

            function getState(tile) {
                return [
                    tile.state,
                    tile.data ? tile.data.terrainState : undefined,
                    tile.data && tile.data.imagery ? tile.data.imagery.map(function(imagery) {
                        return [
                            imagery.readyImagery ? imagery.readyImagery.state : undefined,
                            imagery.loadingImagery ? imagery.loadingImagery.state : undefined
                        ];
                    }) : []
                ];
            }

            function statesAreSame(a, b) {
                if (a.length !== b.length) {
                    return false;
                }

                var same = true;
                for (var i = 0; i < a.length; ++i) {
                    if (Array.isArray(a[i]) && Array.isArray(b[i])) {
                        same = same && statesAreSame(a[i], b[i]);
                    } else if (Array.isArray(a[i]) || Array.isArray(b[i])) {
                        same = false;
                    } else {
                        same = same && a[i] === b[i];
                    }
                }

                return same;
            }

            function next() {
                // Keep going until all terrain and imagery provider are ready and states are no longer changing.
                var changed = !mockTerrain.ready;

                for (var i = 0; i < imageryLayerCollection.length; ++i) {
                    changed = changed || !imageryLayerCollection.get(i).imageryProvider.ready;
                }

                tiles.forEach(function(tile) {
                    var beforeState = getState(tile);
                    GlobeSurfaceTile.processStateMachine(tile, frameState, mockTerrain, imageryLayerCollection);
                    var afterState = getState(tile);
                    changed = changed || !statesAreSame(beforeState, afterState);
                });

                if (changed) {
                    setTimeout(next, 0);
                } else {
                    deferred.resolve();
                }
            }

            next();

            return deferred.promise;
        }

        it('transitions to the LOADING state immediately if this tile is available', function() {
            mockTerrain
                .willBeAvailable(rootTile.southwestChild);

            return processTiles([rootTile.southwestChild]).then(function() {
                expect(rootTile.southwestChild.state).toBe(QuadtreeTileLoadState.LOADING);
                expect(rootTile.southwestChild.data.terrainState).toBe(TerrainState.UNLOADED);
            });
        });

        it('transitions to the LOADING tile state and FAILED terrain state immediately if this tile is NOT available', function() {
            mockTerrain
                .willBeUnavailable(rootTile.southwestChild);

            return processTiles([rootTile.southwestChild]).then(function() {
                expect(rootTile.southwestChild.state).toBe(QuadtreeTileLoadState.LOADING);
                expect(rootTile.southwestChild.data.terrainState).toBe(TerrainState.FAILED);
            });
        });

        it('pushes parent along if waiting on it to be able to upsample', function() {
            mockTerrain
                .willBeAvailable(rootTile)
                .requestTileGeometryWillSucceed(rootTile)
                .willBeUnavailable(rootTile.southwestChild);

            spyOn(mockTerrain, 'requestTileGeometry').and.callThrough();

            return processTiles([rootTile.southwestChild]).then(function() {
                expect(mockTerrain.requestTileGeometry.calls.count()).toBe(1);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[1]).toBe(0);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[2]).toBe(0);
            });
        });

        it('does nothing when a root tile is unavailable', function() {
            mockTerrain
                .willBeUnavailable(rootTile);

            return processTiles([rootTile]).then(function() {
                expect(rootTile.state).toBe(QuadtreeTileLoadState.FAILED);
                expect(rootTile.data.terrainState).toBe(TerrainState.FAILED);
            });
        });

        it('does nothing when a root tile fails to load', function() {
            mockTerrain
                .requestTileGeometryWillFail(rootTile);

            return processTiles([rootTile]).then(function() {
                expect(rootTile.state).toBe(QuadtreeTileLoadState.FAILED);
                expect(rootTile.data.terrainState).toBe(TerrainState.FAILED);
            });
        });

        it('upsamples failed tiles from parent TerrainData', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .willBeUnavailable(rootTile.southwestChild)
                .upsampleWillSucceed(rootTile.southwestChild);

            return processTiles([rootTile, rootTile.southwestChild]).then(function() {
                expect(rootTile.data.terrainState).toBe(TerrainState.RECEIVED);
                expect(rootTile.southwestChild.data.terrainState).toBe(TerrainState.RECEIVED);
                expect(rootTile.data.terrainData.wasCreatedByUpsampling()).toBe(false);
                expect(rootTile.southwestChild.data.terrainData.wasCreatedByUpsampling()).toBe(true);
            });
        });

        it('loads available tiles', function() {
            mockTerrain
                .willBeAvailable(rootTile.southwestChild)
                .requestTileGeometryWillSucceed(rootTile.southwestChild);

            spyOn(mockTerrain, 'requestTileGeometry').and.callThrough();

            return processTiles([rootTile.southwestChild]).then(function() {
                expect(mockTerrain.requestTileGeometry.calls.count()).toBe(1);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[1]).toBe(1);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[2]).toBe(1);
            });
        });

        it('loads BVH nodes instead when the tile\'s bounding volume is unreliable', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .willHaveNearestBvhLevel(0, rootTile.southwestChild);

            return processTiles([rootTile.southwestChild]).then(function() {
                // Indicate that the SW tile's bounding volume comes from the root.
                rootTile.southwestChild.data.boundingVolumeSourceTile = rootTile;

                // Monitor calls to requestTileGeometry - we should only see one for the root tile now.
                spyOn(mockTerrain, 'requestTileGeometry').and.callThrough();

                return processTiles([rootTile.southwestChild]);
            }).then(function() {
                expect(mockTerrain.requestTileGeometry.calls.count()).toBe(1);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[1]).toBe(0);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[2]).toBe(0);
            });
        });

        it('loads this tile if the nearest BVH level is unknown', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .willHaveNearestBvhLevel(-1, rootTile.southwestChild);

            return processTiles([rootTile.southwestChild]).then(function() {
                // Indicate that the SW tile's bounding volume comes from the root.
                rootTile.southwestChild.data.boundingVolumeSourceTile = rootTile;

                // Monitor calls to requestTileGeometry - we should only see one for the southwest tile now.
                spyOn(mockTerrain, 'requestTileGeometry').and.callThrough();

                return processTiles([rootTile.southwestChild]);
            }).then(function() {
                expect(mockTerrain.requestTileGeometry.calls.count()).toBe(1);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[1]).toBe(1);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[2]).toBe(1);
            });
        });

        it('loads this tile if the terrain provider does not implement getNearestBvhLevel', function() {
            mockTerrain.getNearestBvhLevel = undefined;

            mockTerrain
                .requestTileGeometryWillSucceed(rootTile);

            return processTiles([rootTile.southwestChild]).then(function() {
                // Indicate that the SW tile's bounding volume comes from the root.
                rootTile.southwestChild.data.boundingVolumeSourceTile = rootTile;

                // Monitor calls to requestTileGeometry - we should only see one for the southwest tile now.
                spyOn(mockTerrain, 'requestTileGeometry').and.callThrough();

                return processTiles([rootTile.southwestChild]);
            }).then(function() {
                expect(mockTerrain.requestTileGeometry.calls.count()).toBe(1);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[1]).toBe(1);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[2]).toBe(1);
            });
        });

        it('loads only terrain (not imagery) when loading BVH nodes', function() {
            var mockImagery = new MockImageryProvider();
            imageryLayerCollection.addImageryProvider(mockImagery);

            mockImagery
                .requestImageWillSucceed(rootTile);

            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .willHaveNearestBvhLevel(0, rootTile.southwestChild);

            return processTiles([rootTile.southwestChild]).then(function() {
                // Indicate that the SW tile's bounding volume comes from the root.
                rootTile.southwestChild.data.boundingVolumeSourceTile = rootTile;

                // Monitor calls to requestTileGeometry and requestImage.
                // We should see a terrain request but not an imagery request.
                spyOn(mockImagery, 'requestImage').and.callThrough();
                spyOn(mockTerrain, 'requestTileGeometry').and.callThrough();

                return processTiles([rootTile.southwestChild]);
            }).then(function() {
                expect(mockImagery.requestImage.calls.count()).toBe(0);
                expect(mockTerrain.requestTileGeometry.calls.count()).toBe(1);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[1]).toBe(0);
                expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[2]).toBe(0);
            });
        });

        it('marks an upsampled tile as such', function() {
            mockTerrain
                .willBeAvailable(rootTile)
                .requestTileGeometryWillSucceed(rootTile)
                .createMeshWillSucceed(rootTile)
                .willBeUnavailable(rootTile.southwestChild)
                .upsampleWillSucceed(rootTile.southwestChild)
                .createMeshWillSucceed(rootTile.southwestChild);

            var mockImagery = new MockImageryProvider();
            imageryLayerCollection.addImageryProvider(mockImagery);

            mockImagery
                .requestImageWillSucceed(rootTile)
                .requestImageWillFail(rootTile.southwestChild);

            return processTiles([rootTile, rootTile.southwestChild]).then(function() {
                expect(rootTile.state).toBe(QuadtreeTileLoadState.DONE);
                expect(rootTile.upsampledFromParent).toBe(false);
                expect(rootTile.southwestChild.state).toBe(QuadtreeTileLoadState.DONE);
                expect(rootTile.southwestChild.upsampledFromParent).toBe(true);
            });
        });

        it('does not mark a tile as upsampled if it has fresh imagery', function() {
            mockTerrain
                .willBeAvailable(rootTile)
                .requestTileGeometryWillSucceed(rootTile)
                .createMeshWillSucceed(rootTile)
                .willBeUnavailable(rootTile.southwestChild)
                .upsampleWillSucceed(rootTile.southwestChild)
                .createMeshWillSucceed(rootTile.southwestChild);

            var mockImagery = new MockImageryProvider();
            imageryLayerCollection.addImageryProvider(mockImagery);

            mockImagery
                .requestImageWillSucceed(rootTile)
                .requestImageWillSucceed(rootTile.southwestChild);

            return processTiles([rootTile, rootTile.southwestChild]).then(function() {
                expect(rootTile.state).toBe(QuadtreeTileLoadState.DONE);
                expect(rootTile.upsampledFromParent).toBe(false);
                expect(rootTile.southwestChild.state).toBe(QuadtreeTileLoadState.DONE);
                expect(rootTile.southwestChild.upsampledFromParent).toBe(false);
            });
        });

        it('does not mark a tile as upsampled if it has fresh terrain', function() {
            mockTerrain
                .willBeAvailable(rootTile)
                .requestTileGeometryWillSucceed(rootTile)
                .createMeshWillSucceed(rootTile)
                .willBeAvailable(rootTile.southwestChild)
                .requestTileGeometryWillSucceed(rootTile.southwestChild)
                .createMeshWillSucceed(rootTile.southwestChild);

            var mockImagery = new MockImageryProvider();
            imageryLayerCollection.addImageryProvider(mockImagery);

            mockImagery
                .requestImageWillSucceed(rootTile)
                .requestImageWillFail(rootTile.southwestChild);

            return processTiles([rootTile, rootTile.southwestChild]).then(function() {
                expect(rootTile.state).toBe(QuadtreeTileLoadState.DONE);
                expect(rootTile.upsampledFromParent).toBe(false);
                expect(rootTile.southwestChild.state).toBe(QuadtreeTileLoadState.DONE);
                expect(rootTile.southwestChild.upsampledFromParent).toBe(false);
            });
        });

        it('creates water mask texture from one-byte water mask data, if it exists', function() {
            mockTerrain
                .willBeAvailable(rootTile)
                .requestTileGeometryWillSucceed(rootTile)
                .willHaveWaterMask(false, true, rootTile);

            return processTiles([rootTile]).then(function() {
                expect(rootTile.data.waterMaskTexture).toBeDefined();
            });
        });

        it('uses undefined water mask texture for tiles that are entirely land', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .willHaveWaterMask(true, false, rootTile);

            return processTiles([rootTile]).then(function() {
                expect(rootTile.data.waterMaskTexture).toBeUndefined();
            });
        });

        it('uses shared water mask texture for tiles that are entirely water', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .willHaveWaterMask(false, true, rootTile)
                .requestTileGeometryWillSucceed(rootTile.southwestChild)
                .willHaveWaterMask(false, true, rootTile.southwestChild);

            return processTiles([rootTile, rootTile.southwestChild]).then(function() {
                expect(rootTile.data.waterMaskTexture).toBe(rootTile.southwestChild.data.waterMaskTexture);
            });
        });

        it('creates water mask texture from multi-byte water mask data, if it exists', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .willHaveWaterMask(true, true, rootTile);

            return processTiles([rootTile]).then(function() {
                expect(rootTile.data.waterMaskTexture).toBeDefined();
            });
        });

        it('upsamples water mask if data is not available', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .willHaveWaterMask(false, true, rootTile)
                .requestTileGeometryWillSucceed(rootTile.southwestChild);

            return processTiles([rootTile, rootTile.southwestChild]).then(function() {
                expect(rootTile.southwestChild.data.waterMaskTexture).toBeDefined();
                expect(rootTile.southwestChild.data.waterMaskTranslationAndScale).toEqual(new Cartesian4(0.0, 0.0, 0.5, 0.5));
            });
        });
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
                    state : undefined
                }
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
