defineSuite([
        'Scene/QuadtreePrimitive',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/defineProperties',
        'Core/Ellipsoid',
        'Core/EventHelper',
        'Core/GeographicProjection',
        'Core/GeographicTilingScheme',
        'Core/Intersect',
        'Core/Rectangle',
        'Core/Visibility',
        'Scene/Camera',
        'Scene/GlobeSurfaceTileProvider',
        'Scene/ImageryLayerCollection',
        'Scene/QuadtreeTileLoadState',
        'Scene/SceneMode',
        'Specs/createScene',
        'Specs/pollToPromise',
        'ThirdParty/when',
        '../MockTerrainProvider',
        '../TerrainTileProcessor'
    ], function(
        QuadtreePrimitive,
        Cartesian3,
        Cartographic,
        defineProperties,
        Ellipsoid,
        EventHelper,
        GeographicProjection,
        GeographicTilingScheme,
        Intersect,
        Rectangle,
        Visibility,
        Camera,
        GlobeSurfaceTileProvider,
        ImageryLayerCollection,
        QuadtreeTileLoadState,
        SceneMode,
        createScene,
        pollToPromise,
        when,
        MockTerrainProvider,
        TerrainTileProcessor) {
    'use strict';

    describe('selectTilesForRendering', function() {
        var scene;
        var camera;
        var frameState;
        var quadtree;
        var mockTerrain;
        var tileProvider;
        var imageryLayerCollection;
        var surfaceShaderSet;
        var processor;
        var rootTiles;

        beforeEach(function() {
            console.log('beforeEach - start');
            scene = {
                mapProjection: new GeographicProjection(),
                drawingBufferWidth: 1000,
                drawingBufferHeight: 1000
            };

            camera = new Camera(scene);

            frameState = {
                frameNumber: 0,
                passes: {
                    render: true
                },
                camera: camera,
                fog: {
                    enabled: false
                },
                context: {
                    drawingBufferWidth: scene.drawingBufferWidth,
                    drawingBufferHeight: scene.drawingBufferHeight
                },
                mode: SceneMode.SCENE3D,
                commandList: [],
                cullingVolume: jasmine.createSpyObj('CullingVolume', ['computeVisibility']),
                afterRender: []
            };

            frameState.cullingVolume.computeVisibility.and.returnValue(Intersect.INTERSECTING);

            imageryLayerCollection = new ImageryLayerCollection();
            surfaceShaderSet = jasmine.createSpyObj('SurfaceShaderSet', ['getShaderProgram']);
            mockTerrain = new MockTerrainProvider();
            tileProvider = new GlobeSurfaceTileProvider({
                terrainProvider: mockTerrain,
                imageryLayers: imageryLayerCollection,
                surfaceShaderSet: surfaceShaderSet
            });
            quadtree = new QuadtreePrimitive({
                tileProvider: tileProvider
            });

            processor = new TerrainTileProcessor(frameState, mockTerrain, imageryLayerCollection);

            quadtree.render(frameState);
            rootTiles = quadtree._levelZeroTiles;

            processor.mockWebGL();
            console.log('beforeEach - end');
        });

        function process(quadtreePrimitive, callback) {
            var deferred = when.defer();

            function next() {
                ++frameState.frameNumber;
                console.log('Frame ' + frameState.frameNumber);
                quadtree.beginFrame(frameState);
                quadtree.render(frameState);
                quadtree.endFrame(frameState);

                if (callback()) {
                    setTimeout(next, 0);
                } else {
                    deferred.resolve();
                }
            }

            next();

            return deferred.promise;
        }

        it('selects nothing when the root tiles are not yet ready', function() {
            quadtree.render(frameState);
            expect(quadtree._tilesToRender.length).toBe(0);
        });

        it('selects root tiles once they\'re ready', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTiles[0])
                .requestTileGeometryWillSucceed(rootTiles[1])
                .createMeshWillSucceed(rootTiles[0])
                .createMeshWillSucceed(rootTiles[1]);

            return processor.process(rootTiles).then(function() {
                quadtree.render(frameState);

                // There should be at least one selected tile.
                expect(quadtree._tilesToRender.length).toBeGreaterThan(0);

                // All selected tiles should be root tiles.
                expect(quadtree._tilesToRender.filter(function(tile) { return tile.level === 0; }).length).toBe(quadtree._tilesToRender.length);
            });
        });

        it('selects deeper tiles once they\'re renderable', function() {
            mockTerrain
                .requestTileGeometryWillSucceed(rootTiles[0])
                .requestTileGeometryWillSucceed(rootTiles[1])
                .createMeshWillSucceed(rootTiles[0])
                .createMeshWillSucceed(rootTiles[1]);

            rootTiles[0].children.forEach(function(tile) {
                mockTerrain
                    .requestTileGeometryWillSucceed(tile)
                    .createMeshWillSucceed(tile);
                expect(tile.renderable).toBe(false);
            });

            return processor.process(rootTiles).then(function() {
                quadtree.render(frameState);

                // All selected tiles should be root tiles.
                expect(quadtree._tilesToRender.length).toBeGreaterThan(0);
                expect(quadtree._tilesToRender.filter(function(tile) { return tile.level === 0; }).length).toBe(quadtree._tilesToRender.length);

                // Allow the child tiles to load.
                return processor.process(rootTiles[0].children);
            }).then(function() {
                quadtree.render(frameState);

                // Now child tiles should be rendered too.
                expect(quadtree._tilesToRender).toContain(rootTiles[0].southwestChild);
                expect(quadtree._tilesToRender).toContain(rootTiles[0].southeastChild);
                expect(quadtree._tilesToRender).toContain(rootTiles[0].northwestChild);
                expect(quadtree._tilesToRender).toContain(rootTiles[0].northeastChild);
            });
        });

        it('skips levels when tiles are known to be available', function() {
            // Mark all tiles through level 2 as available.
            var tiles = [];
            rootTiles.forEach(function(tile) {
                tiles.push(tile);

                // level 0 tile
                mockTerrain
                    .willBeAvailable(tile)
                    .requestTileGeometryWillSucceed(tile)
                    .createMeshWillSucceed(tile);

                tile.children.forEach(function(tile) {
                    tiles.push(tile);

                    // level 1 tile
                    mockTerrain
                        .willBeAvailable(tile)
                        .requestTileGeometryWillSucceed(tile)
                        .createMeshWillSucceed(tile);

                    tile.children.forEach(function(tile) {
                        tiles.push(tile);

                        // level 2 tile
                        mockTerrain
                            .willBeAvailable(tile)
                            .requestTileGeometryWillSucceed(tile)
                            .createMeshWillSucceed(tile);
                    });
                });
            });

            // Look down at the center of a level 2 tile from a distance that will refine to it.
            var lookAtTile = rootTiles[0].southwestChild.northeastChild;
            setCameraPosition(quadtree, frameState, Rectangle.center(lookAtTile.rectangle), lookAtTile.level);

            return process(quadtree, function() {
                // Process until the lookAtTile is rendered. That tile's parent (level 1)
                // should not be rendered along the way.
                expect(quadtree._tilesToRender).not.toContain(lookAtTile.parent);
                var lookAtTileRendered = quadtree._tilesToRender.indexOf(lookAtTile) >= 0;
                var continueProcessing = !lookAtTileRendered;
                return continueProcessing;
            }).then(function() {
                // The lookAtTile should be a real tile, not a fill.
                expect(quadtree._tilesToRender).toContain(lookAtTile);
                expect(lookAtTile.data.fill).toBeUndefined();
                expect(lookAtTile.data.vertexArray).toBeDefined();
            });
        });
    });

    describe('old', function() {
        var scene;

        beforeAll(function() {
            scene = createScene();
            scene.render();
        });

        afterAll(function() {
            scene.destroyForSpecs();
        });

        it('must be constructed with a tileProvider', function() {
            expect(function() {
                return new QuadtreePrimitive();
            }).toThrowDeveloperError();

            expect(function() {
                return new QuadtreePrimitive({});
            }).toThrowDeveloperError();
        });

        function createSpyTileProvider() {
            var result = jasmine.createSpyObj('tileProvider', [
                'getQuadtree', 'setQuadtree', 'getReady', 'getTilingScheme', 'getErrorEvent',
                'initialize', 'updateImagery', 'beginUpdate', 'endUpdate', 'getLevelMaximumGeometricError', 'loadTile',
                'computeTileVisibility', 'showTileThisFrame', 'computeDistanceToTile', 'canRefine', 'isDestroyed', 'destroy']);

            defineProperties(result, {
                quadtree : {
                    get : result.getQuadtree,
                    set : result.setQuadtree
                },
                ready : {
                    get : result.getReady
                },
                tilingScheme : {
                    get : result.getTilingScheme
                },
                errorEvent : {
                    get : result.getErrorEvent
                }
            });

            var tilingScheme = new GeographicTilingScheme();
            result.getTilingScheme.and.returnValue(tilingScheme);

            result.canRefine.and.callFake(function(tile) {
                return tile.renderable;
            });

            return result;
        }

        it('calls initialize, beginUpdate, loadTile, and endUpdate', function() {
            var tileProvider = createSpyTileProvider();
            tileProvider.getReady.and.returnValue(true);

            var quadtree = new QuadtreePrimitive({
                tileProvider : tileProvider
            });

            // determine what tiles to load
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            // load tiles
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            expect(tileProvider.initialize).toHaveBeenCalled();
            expect(tileProvider.beginUpdate).toHaveBeenCalled();
            expect(tileProvider.loadTile).toHaveBeenCalled();
            expect(tileProvider.endUpdate).toHaveBeenCalled();
        });

        it('shows the root tiles when they are ready and visible', function() {
            var tileProvider = createSpyTileProvider();
            tileProvider.getReady.and.returnValue(true);
            tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);
            tileProvider.loadTile.and.callFake(function(frameState, tile) {
                tile.renderable = true;
            });

            var quadtree = new QuadtreePrimitive({
                tileProvider : tileProvider
            });

            // determine what tiles to load
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            // load tiles
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            expect(tileProvider.showTileThisFrame).toHaveBeenCalled();
        });

        it('stops loading a tile that moves to the DONE state', function() {
            var tileProvider = createSpyTileProvider();
            tileProvider.getReady.and.returnValue(true);
            tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);

            var calls = 0;
            tileProvider.loadTile.and.callFake(function(frameState, tile) {
                ++calls;
                tile.state = QuadtreeTileLoadState.DONE;
            });

            var quadtree = new QuadtreePrimitive({
                tileProvider : tileProvider
            });

            // determine what tiles to load
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            // load tiles
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            expect(calls).toBe(2);

            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            expect(calls).toBe(2);
        });

        it('tileLoadProgressEvent is raised when tile loaded and when new children discovered', function() {
            var eventHelper = new EventHelper();

            var tileProvider = createSpyTileProvider();
            tileProvider.getReady.and.returnValue(true);
            tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);

            var quadtree = new QuadtreePrimitive({
                tileProvider : tileProvider
            });

            var progressEventSpy = jasmine.createSpy('progressEventSpy');
            eventHelper.add(quadtree.tileLoadProgressEvent, progressEventSpy);

            // Initial update to get the zero-level tiles set up.
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            // load zero-level tiles
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            quadtree.update(scene.frameState);

            scene.renderForSpecs();

            // There will now be two zero-level tiles in the load queue.
            expect(progressEventSpy.calls.mostRecent().args[0]).toEqual(2);

            // Change one to loaded and update again
            quadtree._levelZeroTiles[0].state = QuadtreeTileLoadState.DONE;
            quadtree._levelZeroTiles[1].state = QuadtreeTileLoadState.LOADING;

            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            quadtree.update(scene.frameState);

            scene.renderForSpecs();

            // Now there should only be one left in the update queue
            expect(progressEventSpy.calls.mostRecent().args[0]).toEqual(1);

            // Simulate the second zero-level child having loaded with two children.
            quadtree._levelZeroTiles[1].state = QuadtreeTileLoadState.DONE;
            quadtree._levelZeroTiles[1].renderable = true;

            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            quadtree.update(scene.frameState);

            scene.renderForSpecs();

            // Now that tile's four children should be in the load queue.
            expect(progressEventSpy.calls.mostRecent().args[0]).toEqual(4);
        });

        it('forEachLoadedTile does not enumerate tiles in the START state', function() {
            var tileProvider = createSpyTileProvider();
            tileProvider.getReady.and.returnValue(true);
            tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);
            tileProvider.computeDistanceToTile.and.returnValue(1e-15);

            // Load the root tiles.
            tileProvider.loadTile.and.callFake(function(frameState, tile) {
                tile.state = QuadtreeTileLoadState.DONE;
                tile.renderable = true;
            });

            var quadtree = new QuadtreePrimitive({
                tileProvider : tileProvider
            });

            // determine what tiles to load
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            // load tiles
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            // Don't load further tiles.
            tileProvider.loadTile.and.callFake(function(frameState, tile) {
                tile.state = QuadtreeTileLoadState.START;
            });

            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            quadtree.forEachLoadedTile(function(tile) {
                expect(tile.state).not.toBe(QuadtreeTileLoadState.START);
            });
        });

        it('add and remove callbacks to tiles', function() {
            var tileProvider = createSpyTileProvider();
            tileProvider.getReady.and.returnValue(true);
            tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);
            tileProvider.computeDistanceToTile.and.returnValue(1e-15);

            // Load the root tiles.
            tileProvider.loadTile.and.callFake(function(frameState, tile) {
                tile.state = QuadtreeTileLoadState.DONE;
                tile.renderable = true;
                tile.data = {
                    pick : function() {
                        return undefined;
                    }
                };
            });

            var quadtree = new QuadtreePrimitive({
                tileProvider : tileProvider
            });

            var removeFunc = quadtree.updateHeight(Cartographic.fromDegrees(-72.0, 40.0), function(position) {
            });

            // determine what tiles to load
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            ++scene.frameState.frameNumber;

            // load tiles
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            var addedCallback = false;
            quadtree.forEachLoadedTile(function(tile) {
                addedCallback = addedCallback || tile.customData.length > 0;
            });

            expect(addedCallback).toEqual(true);

            removeFunc();

            ++scene.frameState.frameNumber;

            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            var removedCallback = true;
            quadtree.forEachLoadedTile(function(tile) {
                removedCallback = removedCallback && tile.customData.length === 0;
            });

            expect(removedCallback).toEqual(true);
        });

        it('updates heights', function() {
            var tileProvider = createSpyTileProvider();
            tileProvider.getReady.and.returnValue(true);
            tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);
            tileProvider.computeDistanceToTile.and.returnValue(1e-15);

            tileProvider.terrainProvider = {
                getTileDataAvailable : function() {
                    return true;
                }
            };

            var position = Cartesian3.clone(Cartesian3.ZERO);
            var updatedPosition = Cartesian3.clone(Cartesian3.UNIT_X);
            var currentPosition = position;

            // Load the root tiles.
            tileProvider.loadTile.and.callFake(function(frameState, tile) {
                tile.state = QuadtreeTileLoadState.DONE;
                tile.renderable = true;
                tile.data = {
                    pick : function() {
                        return currentPosition;
                    }
                };
            });

            var quadtree = new QuadtreePrimitive({
                tileProvider : tileProvider
            });

            quadtree.updateHeight(Cartographic.fromDegrees(-72.0, 40.0), function(p) {
                Cartesian3.clone(p, position);
            });

            // determine what tiles to load
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            // load tiles
            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            expect(position).toEqual(Cartesian3.ZERO);

            currentPosition = updatedPosition;

            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            expect(position).toEqual(updatedPosition);
        });

        it('gives correct priority to tile loads', function() {
            var tileProvider = createSpyTileProvider();
            tileProvider.getReady.and.returnValue(true);
            tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);

            var quadtree = new QuadtreePrimitive({
                tileProvider : tileProvider
            });

            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            // The root tiles should be in the high priority load queue
            expect(quadtree._tileLoadQueueHigh.length).toBe(2);
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0]);
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[1]);
            expect(quadtree._tileLoadQueueMedium.length).toBe(0);
            expect(quadtree._tileLoadQueueLow.length).toBe(0);

            // Mark the first root tile renderable (but not done loading)
            quadtree._levelZeroTiles[0].renderable = true;

            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            // That root tile should now load with low priority while its children should load with high.
            expect(quadtree._tileLoadQueueHigh.length).toBe(5);
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[1]);
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[0]);
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[1]);
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[2]);
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[3]);
            expect(quadtree._tileLoadQueueMedium.length).toBe(0);
            expect(quadtree._tileLoadQueueLow.length).toBe(1);
            expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0]);

            // Mark the children of that root tile renderable too, so we can refine it
            quadtree._levelZeroTiles[0].children[0].renderable = true;
            quadtree._levelZeroTiles[0].children[1].renderable = true;
            quadtree._levelZeroTiles[0].children[2].renderable = true;
            quadtree._levelZeroTiles[0].children[3].renderable = true;

            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            expect(quadtree._tileLoadQueueHigh.length).toBe(17); // levelZeroTiles[1] plus levelZeroTiles[0]'s 16 grandchildren
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[1]);
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[0].children[0]);
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[0].children[1]);
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[0].children[2]);
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[0].children[0].children[3]);
            expect(quadtree._tileLoadQueueMedium.length).toBe(0);
            expect(quadtree._tileLoadQueueLow.length).toBe(5);
            expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0]);
            expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0].children[0]);
            expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0].children[1]);
            expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0].children[2]);
            expect(quadtree._tileLoadQueueLow).toContain(quadtree._levelZeroTiles[0].children[3]);

            // Mark the children of levelZeroTiles[0] upsampled
            quadtree._levelZeroTiles[0].children[0].upsampledFromParent = true;
            quadtree._levelZeroTiles[0].children[1].upsampledFromParent = true;
            quadtree._levelZeroTiles[0].children[2].upsampledFromParent = true;
            quadtree._levelZeroTiles[0].children[3].upsampledFromParent = true;

            quadtree.update(scene.frameState);
            quadtree.beginFrame(scene.frameState);
            quadtree.render(scene.frameState);
            quadtree.endFrame(scene.frameState);

            // levelZeroTiles[0] should move to medium priority.
            expect(quadtree._tileLoadQueueHigh.length).toBe(1);
            expect(quadtree._tileLoadQueueHigh).toContain(quadtree._levelZeroTiles[1]);
            expect(quadtree._tileLoadQueueMedium.length).toBe(1);
            expect(quadtree._tileLoadQueueMedium).toContain(quadtree._levelZeroTiles[0]);
            expect(quadtree._tileLoadQueueLow.length).toBe(0);
        });

        it('renders tiles in approximate near-to-far order', function() {
            var tileProvider = createSpyTileProvider();
            tileProvider.getReady.and.returnValue(true);
            tileProvider.computeTileVisibility.and.returnValue(Visibility.FULL);

            var quadtree = new QuadtreePrimitive({
                tileProvider : tileProvider
            });

            tileProvider.loadTile.and.callFake(function(frameState, tile) {
                if (tile.level <= 1) {
                    tile.state = QuadtreeTileLoadState.DONE;
                    tile.renderable = true;
                }
            });

            scene.camera.setView({
                destination : Cartesian3.fromDegrees(1.0, 1.0, 15000.0)
            });
            scene.camera.update(scene.mode);

            return pollToPromise(function() {
                quadtree.update(scene.frameState);
                quadtree.beginFrame(scene.frameState);
                quadtree.render(scene.frameState);
                quadtree.endFrame(scene.frameState);

                return quadtree._tilesToRender.filter(function(tile) { return tile.level === 1; }).length === 8;
            }).then(function() {
                quadtree.update(scene.frameState);
                quadtree.beginFrame(scene.frameState);
                quadtree.render(scene.frameState);
                quadtree.endFrame(scene.frameState);

                // Rendered tiles:
                // +----+----+----+----+
                // |w.nw|w.ne|e.nw|e.ne|
                // +----+----+----+----+
                // |w.sw|w.se|e.sw|e.se|
                // +----+----+----+----+
                // camera is located in e.nw (east.northwestChild)

                var west = quadtree._levelZeroTiles.filter(function(tile) { return tile.x === 0; })[0];
                var east = quadtree._levelZeroTiles.filter(function(tile) { return tile.x === 1; })[0];
                expect(quadtree._tilesToRender[0]).toBe(east.northwestChild);
                expect(quadtree._tilesToRender[1] === east.southwestChild || quadtree._tilesToRender[1] === east.northeastChild).toBe(true);
                expect(quadtree._tilesToRender[2] === east.southwestChild || quadtree._tilesToRender[2] === east.northeastChild).toBe(true);
                expect(quadtree._tilesToRender[3]).toBe(east.southeastChild);
                expect(quadtree._tilesToRender[4]).toBe(west.northeastChild);
                expect(quadtree._tilesToRender[5] === west.northwestChild || quadtree._tilesToRender[5] === west.southeastChild).toBe(true);
                expect(quadtree._tilesToRender[6] === west.northwestChild || quadtree._tilesToRender[6] === west.southeastChild).toBe(true);
                expect(quadtree._tilesToRender[7]).toBe(west.southwestChild);
            });
        });
    }, 'WebGL');

    // Sets the camera to look at a given cartographic position from a distance
    // that will produce a screen-space error at that position that will refine to
    // a given tile level and no further.
    function setCameraPosition(quadtree, frameState, position, level) {
        var camera = frameState.camera;
        var geometricError = quadtree.tileProvider.getLevelMaximumGeometricError(level);
        var sse = quadtree.maximumScreenSpaceError * 0.8;
        var sseDenominator = camera.frustum.sseDenominator;
        var height = frameState.context.drawingBufferHeight;

        var distance = (geometricError * height) / (sse * sseDenominator);
        var cartesian = Ellipsoid.WGS84.cartographicToCartesian(position);
        camera.lookAt(cartesian, new Cartesian3(0.0, 0.0, distance));
    }

});
