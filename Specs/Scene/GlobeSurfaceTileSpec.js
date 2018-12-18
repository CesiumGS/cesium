defineSuite([
        'Scene/GlobeSurfaceTile',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/CesiumTerrainProvider',
        'Core/clone',
        'Core/createWorldTerrain',
        'Core/defaultValue',
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
        '../MockTerrainProvider',
        '../runLater'
    ], function(
        GlobeSurfaceTile,
        Cartesian3,
        Cartesian4,
        CesiumTerrainProvider,
        clone,
        createWorldTerrain,
        defaultValue,
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
        MockTerrainProvider,
        runLater) {
    'use strict';

    var frameState;
    var tilingScheme;
    var rootTiles;
    var rootTile;
    var imageryLayerCollection;
    var mockTerrain;

    function mockWebGL() {
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
    }

    // Processes the given list of tiles until all terrain and imagery states stop changing.
    function processTiles(tiles, maxIterations, overrideFrameState, overrideTerrainProvider, overrideImageryLayerCollection) {
        overrideFrameState = defaultValue(overrideFrameState, frameState);
        overrideTerrainProvider = defaultValue(overrideTerrainProvider, mockTerrain);
        overrideImageryLayerCollection = defaultValue(overrideImageryLayerCollection, imageryLayerCollection);

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

        var iterations = 0;

        function next() {
            ++iterations;

            // Keep going until all terrain and imagery provider are ready and states are no longer changing.
            var changed = !overrideTerrainProvider.ready;

            for (var i = 0; i < overrideImageryLayerCollection.length; ++i) {
                changed = changed || !overrideImageryLayerCollection.get(i).imageryProvider.ready;
            }

            if (overrideTerrainProvider.ready) {
                tiles.forEach(function(tile) {
                    var beforeState = getState(tile);
                    GlobeSurfaceTile.processStateMachine(tile, overrideFrameState, overrideTerrainProvider, overrideImageryLayerCollection);
                    var afterState = getState(tile);
                    changed =
                        changed ||
                        tile.data.terrainState === TerrainState.RECEIVING ||
                        tile.data.terrainState === TerrainState.TRANSFORMING ||
                        !statesAreSame(beforeState, afterState);
                });
            }

            if (!changed || iterations >= maxIterations) {
                deferred.resolve(iterations);
            } else {
                setTimeout(next, 0);
            }
        }

        next();

        return deferred.promise;
    }

    beforeEach(function() {
        frameState = {
            context: {
                cache: {}
            }
        };

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
        beforeEach(function() {
            mockWebGL();
        });

        it('starts in the START state', function() {
            for (var i = 0; i < rootTiles.length; ++i) {
                var tile = rootTiles[i];
                expect(tile.state).toBe(QuadtreeTileLoadState.START);
            }
        });

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
        beforeEach(function() {
            mockWebGL();
        });

        it('gets the BVH from the TerrainData if available', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .willHaveBvh(new Float32Array([1.0, 2.0]), rootTile);

            return processTiles([rootTile]).then(function() {
                expect(rootTile.data.getBoundingVolumeHierarchy(rootTile)).toEqual([1.0, 2.0]);
            });
        });

        it('gets the BVH from the parent tile if available', function() {
            var sw = rootTile.southwestChild;
            var nw = rootTile.northwestChild;
            var se = rootTile.southeastChild;
            var ne = rootTile.northeastChild;

            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .willHaveBvh(new Float32Array([1.0, 10.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]), rootTile)
                .requestTileGeometryWillSucceed(sw)
                .requestTileGeometryWillFail(nw)
                .requestTileGeometryWillSucceed(ne)
                .requestTileGeometryWillFail(se);

            return processTiles([rootTile, sw, nw, se, ne]).then(function() {
                expect(sw.data.getBoundingVolumeHierarchy(sw)).toEqual([3.0, 4.0]);
                expect(se.data.getBoundingVolumeHierarchy(se)).toEqual([5.0, 6.0]);
                expect(nw.data.getBoundingVolumeHierarchy(nw)).toEqual([7.0, 8.0]);
                expect(ne.data.getBoundingVolumeHierarchy(ne)).toEqual([9.0, 10.0]);
            });
        });

        it('returns undefined if the parent BVH does not extend to this tile', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .willHaveBvh(new Float32Array([1.0, 10.0]), rootTile)
                .requestTileGeometryWillSucceed(rootTile.southwestChild);

            return processTiles([rootTile, rootTile.southwestChild]).then(function() {
                expect(rootTile.southwestChild.data.getBoundingVolumeHierarchy(rootTile.southwestChild)).toBeUndefined();
            });
        });

        it('returns undefined if the parent does not have a BVH', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .requestTileGeometryWillSucceed(rootTile.southwestChild);

            return processTiles([rootTile, rootTile.southwestChild]).then(function() {
                expect(rootTile.southwestChild.data.getBoundingVolumeHierarchy(rootTile.southwestChild)).toBeUndefined();
            });
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

            return processTiles([tile], undefined, scene.frameState, terrainProvider, new ImageryLayerCollection()).then(function() {
                var ray = new Ray(
                    new Cartesian3(-5052039.459789615, 2561172.040315167, -2936276.999965875),
                    new Cartesian3(0.5036332963145244, 0.6648033332898124, 0.5517155343926082));
                var pickResult = tile.data.pick(ray, undefined, undefined, true);
                var cartographic = Ellipsoid.WGS84.cartesianToCartographic(pickResult);
                expect(cartographic.height).toBeGreaterThan(-500.0);
            });
        });
    }, 'WebGL');

    describe('eligibleForUnloading', function() {
        beforeEach(function() {
            mockWebGL();
        });

        it('returns true when no loading has been done', function() {
            rootTile.data = new GlobeSurfaceTile();
            expect(rootTile.data.eligibleForUnloading).toBe(true);
        });

        it('returns true when some loading has been done', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTile);

            return processTiles([rootTile]).then(function() {
                expect(rootTile.data.eligibleForUnloading).toBe(true);
                mockTerrain
                    .createMeshWillSucceed(rootTile);
                return processTiles([rootTile]);
            }).then(function() {
                expect(rootTile.data.eligibleForUnloading).toBe(true);
            });
        });

        it('returns false when RECEIVING', function() {
            var deferred = when.defer();

            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .requestTileGeometryWillWaitOn(deferred.promise, rootTile);

            return processTiles([rootTile], 5).then(function() {
                expect(rootTile.data.eligibleForUnloading).toBe(false);
                deferred.resolve();
            });
        });

        it ('returns false when TRANSFORMING', function() {
            var deferred = when.defer();

            mockTerrain
                .requestTileGeometryWillSucceed(rootTile)
                .createMeshWillSucceed(rootTile)
                .createMeshWillWaitOn(deferred.promise, rootTile);

            return processTiles([rootTile], 5).then(function() {
                expect(rootTile.data.eligibleForUnloading).toBe(false);
                deferred.resolve();
            });
        });

        it('returns false when imagery is TRANSITIONING', function() {
            var deferred = when.defer();

            var mockImagery = new MockImageryProvider();
            imageryLayerCollection.addImageryProvider(mockImagery);

            mockImagery
                .requestImageWillWaitOn(deferred.promise, rootTile);

            mockTerrain
                .requestTileGeometryWillSucceed(rootTile);

            return processTiles([rootTile], 5).then(function() {
                expect(rootTile.data.eligibleForUnloading).toBe(false);
                deferred.resolve();
            });
        });
    });
});
