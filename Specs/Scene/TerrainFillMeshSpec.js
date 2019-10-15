import MockTerrainProvider from '../MockTerrainProvider.js';
import TerrainTileProcessor from '../TerrainTileProcessor.js';
import { Cartesian2 } from '../../Source/Cesium.js';
import { Cartesian3 } from '../../Source/Cesium.js';
import { GeographicProjection } from '../../Source/Cesium.js';
import { HeightmapTerrainData } from '../../Source/Cesium.js';
import { Intersect } from '../../Source/Cesium.js';
import { Math as CesiumMath } from '../../Source/Cesium.js';
import { Camera } from '../../Source/Cesium.js';
import { GlobeSurfaceTileProvider } from '../../Source/Cesium.js';
import { ImageryLayerCollection } from '../../Source/Cesium.js';
import { QuadtreePrimitive } from '../../Source/Cesium.js';
import { SceneMode } from '../../Source/Cesium.js';
import { TerrainFillMesh } from '../../Source/Cesium.js';
import { TileBoundingRegion } from '../../Source/Cesium.js';
import { TileSelectionResult } from '../../Source/Cesium.js';

describe('Scene/TerrainFillMesh', function() {

    var processor;
    var scene;
    var camera;
    var frameState;
    var imageryLayerCollection;
    var surfaceShaderSet;
    var mockTerrain;
    var tileProvider;
    var quadtree;
    var rootTiles;

    var center;
    var west;
    var south;
    var east;
    var north;
    var southwest;
    var southeast;
    var northwest;
    var northeast;

    beforeEach(function() {
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
        processor.mockWebGL();

        quadtree.render(frameState);
        rootTiles = quadtree._levelZeroTiles;

        center = rootTiles[0].northeastChild.southwestChild.northeastChild.southwestChild;
        west = center.findTileToWest(rootTiles);
        south = center.findTileToSouth(rootTiles);
        east = center.findTileToEast(rootTiles);
        north = center.findTileToNorth(rootTiles);
        southwest = west.findTileToSouth(rootTiles);
        southeast = east.findTileToSouth(rootTiles);
        northwest = west.findTileToNorth(rootTiles);
        northeast = east.findTileToNorth(rootTiles);

        mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
            width: 3,
            height: 3,
            createdByUpsampling: false,
            buffer: new Float32Array([
                15.0, 16.0, 17.0,
                22.0, 23.0, 24.0,
                29.0, 30.0, 31.0
            ])
        }), west).createMeshWillSucceed(west);

        mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
            width: 3,
            height: 3,
            createdByUpsampling: false,
            buffer: new Float32Array([
                31.0, 32.0, 33.0,
                38.0, 39.0, 40.0,
                45.0, 46.0, 47.0
            ])
        }), south).createMeshWillSucceed(south);

        mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
            width: 3,
            height: 3,
            createdByUpsampling: false,
            buffer: new Float32Array([
                19.0, 20.0, 21.0,
                26.0, 27.0, 28.0,
                33.0, 34.0, 35.0
            ])
        }), east).createMeshWillSucceed(east);

        mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
            width: 3,
            height: 3,
            createdByUpsampling: false,
            buffer: new Float32Array([
                3.0, 4.0, 5.0,
                10.0, 11.0, 12.0,
                17.0, 18.0, 19.0
            ])
        }), north).createMeshWillSucceed(north);

        mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
            width: 3,
            height: 3,
            createdByUpsampling: false,
            buffer: new Float32Array([
                29.0, 30.0, 31.0,
                36.0, 37.0, 38.0,
                43.0, 44.0, 45.0
            ])
        }), southwest).createMeshWillSucceed(southwest);

        mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
            width: 3,
            height: 3,
            createdByUpsampling: false,
            buffer: new Float32Array([
                33.0, 34.0, 35.0,
                40.0, 41.0, 42.0,
                47.0, 48.0, 49.0
            ])
        }), southeast).createMeshWillSucceed(southeast);

        mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
            width: 3,
            height: 3,
            createdByUpsampling: false,
            buffer: new Float32Array([
                1.0, 2.0, 3.0,
                8.0, 9.0, 10.0,
                15.0, 16.0, 17.0
            ])
        }), northwest).createMeshWillSucceed(northwest);

        mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
            width: 3,
            height: 3,
            createdByUpsampling: false,
            buffer: new Float32Array([
                5.0, 6.0, 7.0,
                12.0, 13.0, 14.0,
                19.0, 20.0, 21.0
            ])
        }), northeast).createMeshWillSucceed(northeast);
    });

    describe('updateFillTiles', function() {
        it('does nothing if no rendered tiles are provided', function() {
            expect(function() {
                TerrainFillMesh.updateFillTiles(tileProvider, [], frameState);
            }).not.toThrow();
        });

        it('propagates edges and corners to an unloaded tile', function() {
            var tiles = [center, west, south, east, north, southwest, southeast, northwest, northeast];

            tiles.forEach(mockTerrain.createMeshWillSucceed.bind(mockTerrain));

            return processor.process(tiles).then(function() {
                tiles.forEach(markRendered);

                TerrainFillMesh.updateFillTiles(tileProvider, tiles, frameState);

                var fill = center.data.fill;
                expect(fill).toBeDefined();
                expect(fill.westTiles).toEqual([west]);
                expect(fill.westMeshes).toEqual([west.data.mesh]);
                expect(fill.southTiles).toEqual([south]);
                expect(fill.southMeshes).toEqual([south.data.mesh]);
                expect(fill.eastTiles).toEqual([east]);
                expect(fill.eastMeshes).toEqual([east.data.mesh]);
                expect(fill.northTiles).toEqual([north]);
                expect(fill.northMeshes).toEqual([north.data.mesh]);
                expect(fill.southwestTile).toEqual(southwest);
                expect(fill.southwestMesh).toEqual(southwest.data.mesh);
                expect(fill.southeastTile).toEqual(southeast);
                expect(fill.southeastMesh).toEqual(southeast.data.mesh);
                expect(fill.northwestTile).toEqual(northwest);
                expect(fill.northwestMesh).toEqual(northwest.data.mesh);
                expect(fill.northeastTile).toEqual(northeast);
                expect(fill.northeastMesh).toEqual(northeast.data.mesh);
            });
        });

        it('propagates fill tile edges to an unloaded tile', function() {
            var centerSW = center.southwestChild;
            var centerSE = center.southeastChild;
            var centerNW = center.northwestChild;
            var centerNE = center.northeastChild;

            var tiles = [centerSW, centerSE, centerNW, centerNE, west, south, east, north, southwest, southeast, northwest, northeast];

            tiles.forEach(mockTerrain.createMeshWillSucceed.bind(mockTerrain));

            return processor.process(tiles).then(function() {
                tiles.forEach(markRendered);

                TerrainFillMesh.updateFillTiles(tileProvider, tiles, frameState);

                var sw = centerSW.data.fill;
                var se = centerSE.data.fill;
                var nw = centerNW.data.fill;
                var ne = centerNE.data.fill;

                expect(sw).toBeDefined();
                expect(sw.westTiles).toEqual([west]);
                expect(sw.westMeshes).toEqual([west.data.mesh]);
                expect(sw.southTiles).toEqual([south]);
                expect(sw.southMeshes).toEqual([south.data.mesh]);
                expect(sw.southwestTile).toEqual(southwest);
                expect(sw.southwestMesh).toEqual(southwest.data.mesh);
                expect(sw.southeastTile).toBeUndefined();
                expect(sw.southeastMesh).toBeUndefined();
                expect(sw.northwestTile).toBeUndefined();
                expect(sw.northwestMesh).toBeUndefined();

                expect(se).toBeDefined();
                expect(se.eastTiles).toEqual([east]);
                expect(se.eastMeshes).toEqual([east.data.mesh]);
                expect(se.southTiles).toEqual([south]);
                expect(se.southMeshes).toEqual([south.data.mesh]);
                expect(se.southeastTile).toEqual(southeast);
                expect(se.southeastMesh).toEqual(southeast.data.mesh);
                expect(se.southwestTile).toBeUndefined();
                expect(se.southwestMesh).toBeUndefined();
                expect(se.northeastTile).toBeUndefined();
                expect(se.northeastMesh).toBeUndefined();

                expect(nw).toBeDefined();
                expect(nw.westTiles).toEqual([west]);
                expect(nw.westMeshes).toEqual([west.data.mesh]);
                expect(nw.northTiles).toEqual([north]);
                expect(nw.northMeshes).toEqual([north.data.mesh]);
                expect(nw.northwestTile).toEqual(northwest);
                expect(nw.northwestMesh).toEqual(northwest.data.mesh);
                expect(nw.southwestTile).toBeUndefined();
                expect(nw.southwestMesh).toBeUndefined();
                expect(nw.northeastTile).toBeUndefined();
                expect(nw.northeastMesh).toBeUndefined();

                expect(ne).toBeDefined();
                expect(ne.eastTiles).toEqual([east]);
                expect(ne.eastMeshes).toEqual([east.data.mesh]);
                expect(ne.northTiles).toEqual([north]);
                expect(ne.northMeshes).toEqual([north.data.mesh]);
                expect(ne.northeastTile).toEqual(northeast);
                expect(ne.northeastMesh).toEqual(northeast.data.mesh);
                expect(ne.southeastTile).toBeUndefined();
                expect(ne.southeastMesh).toBeUndefined();
                expect(ne.northwestTile).toBeUndefined();
                expect(ne.northwestMesh).toBeUndefined();

                expect(sw.eastTiles[0] === centerSE || se.westTiles[0] === centerSW).toBe(true);
                expect(nw.eastTiles[0] === centerNE || ne.westTiles[0] === centerNW).toBe(true);

                expect(sw.northTiles[0] === centerNW || nw.southTiles[0] === centerSW).toBe(true);
                expect(se.northTiles[0] === centerNE || ne.southTiles[0] === centerSE).toBe(true);

                expect(sw.northeastTile === centerNE || ne.southwestTile === centerSW).toBe(true);
                expect(nw.southeastTile === centerSE || se.northwestTile === centerNW).toBe(true);
            });
        });

        it('does not touch disconnected tiles', function() {
            var disconnected = center.southwestChild.northeastChild;

            var tiles = [disconnected, west, south, east, north, southwest, southeast, northwest, northeast];

            tiles.forEach(mockTerrain.createMeshWillSucceed.bind(mockTerrain));

            return processor.process(tiles).then(function() {
                tiles.forEach(markRendered);

                TerrainFillMesh.updateFillTiles(tileProvider, tiles, frameState);

                expect(disconnected.data.fill).toBeUndefined();
            });
        });

        it('propagates multiple adjacent source tiles to a destination edge', function() {
            var tiles = [center, west, south, east, north];
            [west, south, east, north].forEach(function(tile) {
                tile.children.forEach(function(child) {
                    mockTerrain.willBeUnavailable(child);
                    mockTerrain.upsampleWillSucceed(child);
                    tiles.push(child);
                });
            });

            return processor.process(tiles).then(function() {
                tiles.forEach(markRendered);

                TerrainFillMesh.updateFillTiles(tileProvider, tiles, frameState);

                var fill = center.data.fill;
                expect(fill).toBeDefined();
                expect(fill.westTiles).toEqual([west.northeastChild, west.southeastChild]);
                expect(fill.southTiles).toEqual([south.northwestChild, south.northeastChild]);
                expect(fill.eastTiles).toEqual([east.southwestChild, east.northwestChild]);
                expect(fill.northTiles).toEqual([north.southeastChild, north.southwestChild]);
            });
        });

        it('adjusts existing fill tiles when adjacent tiles are loaded', function() {
            var tiles = [center, west, south, north];

            tiles.forEach(mockTerrain.createMeshWillSucceed.bind(mockTerrain));

            return processor.process(tiles).then(function() {
                tiles.forEach(markRendered);

                TerrainFillMesh.updateFillTiles(tileProvider, tiles, frameState);

                var fill = center.data.fill;
                expect(fill).toBeDefined();
                expect(fill.westTiles).toEqual([west]);
                expect(fill.westMeshes).toEqual([west.data.mesh]);
                expect(fill.southTiles).toEqual([south]);
                expect(fill.southMeshes).toEqual([south.data.mesh]);
                expect(fill.eastTiles).toEqual([]);
                expect(fill.eastMeshes).toEqual([]);
                expect(fill.northTiles).toEqual([north]);
                expect(fill.northMeshes).toEqual([north.data.mesh]);

                fill.update(tileProvider, frameState);

                expectVertexCount(fill, 8);

                tiles.push(east);

                return processor.process(tiles);
            }).then(function() {
                tiles.forEach(markRendered);

                TerrainFillMesh.updateFillTiles(tileProvider, tiles, frameState);

                var fill = center.data.fill;
                expect(fill).toBeDefined();
                expect(fill.westTiles).toEqual([west]);
                expect(fill.westMeshes).toEqual([west.data.mesh]);
                expect(fill.southTiles).toEqual([south]);
                expect(fill.southMeshes).toEqual([south.data.mesh]);
                expect(fill.eastTiles).toEqual([east]);
                expect(fill.eastMeshes).toEqual([east.data.mesh]);
                expect(fill.northTiles).toEqual([north]);
                expect(fill.northMeshes).toEqual([north.data.mesh]);

                fill.update(tileProvider, frameState);

                expectVertexCount(fill, 9);
                expectVertex(fill, 1.0, 0.5, 26.0);
            });
        });

        it('adjusts existing fill tiles when an adjacent fill tile changes', function() {
            var dontLoad = [east, south, southeast];
            dontLoad.forEach(mockTerrain.requestTileGeometryWillDefer.bind(mockTerrain));

            var tiles = [center, west, south, east, north, southwest, southeast, northwest, northeast];

            return processor.process(tiles).then(function() {
                tiles.forEach(markRendered);

                TerrainFillMesh.updateFillTiles(tileProvider, tiles, frameState);
                center.data.fill.update(tileProvider, frameState);
                south.data.fill.update(tileProvider, frameState);
                east.data.fill.update(tileProvider, frameState);
                southeast.data.fill.update(tileProvider, frameState);

                expectVertexCount(center.data.fill, 7);
                expectVertex(center.data.fill, 0.0, 0.0, 31.0);
                expectVertex(center.data.fill, 0.0, 0.5, 24.0);
                expectVertex(center.data.fill, 0.0, 1.0, 17.0);
                expectVertex(center.data.fill, 0.5, 1.0, 18.0);
                expectVertex(center.data.fill, 1.0, 1.0, 19.0);

                expectVertexCount(south.data.fill, 6);
                expectVertex(south.data.fill, 0.0, 1.0, 31.0);
                expectVertex(south.data.fill, 0.0, 0.5, 38.0);
                expectVertex(south.data.fill, 0.0, 0.0, 45.0);

                expectVertexCount(east.data.fill, 6);
                expectVertex(east.data.fill, 0.0, 1.0, 19.0);
                expectVertex(east.data.fill, 0.5, 1.0, 20.0);
                expectVertex(east.data.fill, 1.0, 1.0, 21.0);

                expectVertexCount(southeast.data.fill, 5);

                expect(getHeight(center.data.fill, 1.0, 0.0)).toBe(getHeight(southeast.data.fill, 0.0, 1.0));
                expect(getHeight(center.data.fill, 1.0, 0.0)).toBe(getHeight(south.data.fill, 1.0, 1.0));
                expect(getHeight(center.data.fill, 1.0, 0.0)).toBe(getHeight(east.data.fill, 0.0, 0.0));
                expect(getHeight(center.data.fill, 1.0, 1.0)).toBe(getHeight(east.data.fill, 0.0, 1.0));
                expect(getHeight(east.data.fill, 1.0, 0.0)).toBe(getHeight(southeast.data.fill, 1.0, 1.0));
                expect(getHeight(south.data.fill, 1.0, 0.0)).toBe(getHeight(southeast.data.fill, 0.0, 0.0));

                // Now load the south tile.
                mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
                    width: 3,
                    height: 3,
                    createdByUpsampling: false,
                    buffer: new Float32Array([
                        31.0, 32.0, 33.0,
                        38.0, 39.0, 40.0,
                        45.0, 46.0, 47.0
                    ])
                }), south).createMeshWillSucceed(south);

                return processor.process(tiles);
            }).then(function() {
                tiles.forEach(markRendered);

                TerrainFillMesh.updateFillTiles(tileProvider, tiles, frameState);
                center.data.fill.update(tileProvider, frameState);
                east.data.fill.update(tileProvider, frameState);
                southeast.data.fill.update(tileProvider, frameState);

                expect(south.data.fill).toBeUndefined();

                expectVertexCount(center.data.fill, 8);
                expectVertex(center.data.fill, 0.0, 0.0, 31.0);
                expectVertex(center.data.fill, 0.0, 0.5, 24.0);
                expectVertex(center.data.fill, 0.0, 1.0, 17.0);
                expectVertex(center.data.fill, 0.5, 1.0, 18.0);
                expectVertex(center.data.fill, 1.0, 1.0, 19.0);
                expectVertex(center.data.fill, 1.0, 0.0, 33.0);

                expectVertexCount(east.data.fill, 6);
                expectVertex(east.data.fill, 0.0, 1.0, 19.0);
                expectVertex(east.data.fill, 0.5, 1.0, 20.0);
                expectVertex(east.data.fill, 1.0, 1.0, 21.0);
                expectVertex(east.data.fill, 0.0, 0.0, 33.0);

                expectVertexCount(southeast.data.fill, 6);
                expectVertex(southeast.data.fill, 0.0, 0.0, 47.0);
                expectVertex(southeast.data.fill, 0.0, 0.5, 40.0);
                expectVertex(southeast.data.fill, 0.0, 1.0, 33.0);

                expect(getHeight(east.data.fill, 1.0, 0.0)).toBe(getHeight(southeast.data.fill, 1.0, 1.0));
            });
        });

        // Mark all the tiles rendered.
        function markRendered(tile) {
            quadtree._lastSelectionFrameNumber = frameState.frameNumber;
            tile._lastSelectionResultFrame = frameState.frameNumber;
            tile._lastSelectionResult = TileSelectionResult.RENDERED;

            var parent = tile.parent;
            while (parent) {
                if (parent._lastSelectionResultFrame !== frameState.frameNumber) {
                    parent._lastSelectionResultFrame = frameState.frameNumber;
                    parent._lastSelectionResult = TileSelectionResult.REFINED;
                }
                parent = parent.parent;
            }
        }
    });

    describe('update', function() {
        it('puts a middle height at the four corners and center when there are no adjacent tiles', function() {
            return processor.process([center]).then(function() {
                center.data.tileBoundingRegion = new TileBoundingRegion({
                    rectangle: center.rectangle,
                    minimumHeight: 1.0,
                    maximumHeight: 3.0,
                    computeBoundingVolumes: false
                });

                var fill = center.data.fill = new TerrainFillMesh(center);
                fill.update(tileProvider, frameState);

                expectVertexCount(fill, 5);
                expectVertex(fill, 0.0, 0.0, 2.0);
                expectVertex(fill, 0.0, 1.0, 2.0);
                expectVertex(fill, 1.0, 0.0, 2.0);
                expectVertex(fill, 1.0, 1.0, 2.0);
                expectVertex(fill, 0.5, 0.5, 2.0);
            });
        });

        it('puts zero height at the four corners and center when there are no adjacent tiles and no bounding region', function() {
            return processor.process([center]).then(function() {
                var fill = center.data.fill = new TerrainFillMesh(center);
                fill.update(tileProvider, frameState);

                expectVertexCount(fill, 5);
                expectVertex(fill, 0.0, 0.0, 0.0);
                expectVertex(fill, 0.0, 1.0, 0.0);
                expectVertex(fill, 1.0, 0.0, 0.0);
                expectVertex(fill, 1.0, 1.0, 0.0);
                expectVertex(fill, 0.5, 0.5, 0.0);
            });
        });

        it('uses adjacent edge heights', function() {
            return processor.process([center, west, south, east, north]).then(function() {
                var fill = center.data.fill = new TerrainFillMesh(center);

                fill.westTiles.push(west);
                fill.westMeshes.push(west.data.mesh);
                fill.southTiles.push(south);
                fill.southMeshes.push(south.data.mesh);
                fill.eastTiles.push(east);
                fill.eastMeshes.push(east.data.mesh);
                fill.northTiles.push(north);
                fill.northMeshes.push(north.data.mesh);

                fill.update(tileProvider, frameState);

                expectVertexCount(fill, 9);
                expectVertex(fill, 0.0, 0.0, 31.0);
                expectVertex(fill, 0.5, 0.0, 32.0);
                expectVertex(fill, 1.0, 0.0, 33.0);
                expectVertex(fill, 0.0, 0.5, 24.0);
                expectVertex(fill, 0.5, 0.5, (33.0 + 17.0) / 2);
                expectVertex(fill, 1.0, 0.5, 26.0);
                expectVertex(fill, 0.0, 1.0, 17.0);
                expectVertex(fill, 0.5, 1.0, 18.0);
                expectVertex(fill, 1.0, 1.0, 19.0);
            });
        });

        it('uses adjacent corner heights if adjacent edges are not available', function() {
            return processor.process([center, southwest, southeast, northwest, northeast]).then(function() {
                var fill = center.data.fill = new TerrainFillMesh(center);

                fill.southwestTile = southwest;
                fill.southwestMesh = southwest.data.mesh;
                fill.southeastTile = southeast;
                fill.southeastMesh = southeast.data.mesh;
                fill.northwestTile = northwest;
                fill.northwestMesh = northwest.data.mesh;
                fill.northeastTile = northeast;
                fill.northeastMesh = northeast.data.mesh;

                fill.update(tileProvider, frameState);

                expectVertexCount(fill, 5);
                expectVertex(fill, 0.0, 0.0, 31.0);
                expectVertex(fill, 1.0, 0.0, 33.0);
                expectVertex(fill, 0.0, 1.0, 17.0);
                expectVertex(fill, 1.0, 1.0, 19.0);
                expectVertex(fill, 0.5, 0.5, (17.0 + 33.0) / 2.0);
            });
        });

        it('finds a suitable corner vertex in a less detailed tile', function() {
            var sw = center.southwestChild;
            var se = center.southeastChild;
            var nw = center.northwestChild;
            var ne = center.northeastChild;

            return processor.process([sw, se, nw, ne, west, south, east, north]).then(function() {
                var fillSW = sw.data.fill = new TerrainFillMesh(sw);
                var fillSE = se.data.fill = new TerrainFillMesh(se);
                var fillNW = nw.data.fill = new TerrainFillMesh(nw);
                var fillNE = ne.data.fill = new TerrainFillMesh(ne);

                fillSW.westTiles.push(west);
                fillSW.westMeshes.push(west.data.mesh);
                fillSW.southTiles.push(south);
                fillSW.southMeshes.push(south.data.mesh);

                fillSE.eastTiles.push(east);
                fillSE.eastMeshes.push(east.data.mesh);
                fillSE.southTiles.push(south);
                fillSE.southMeshes.push(south.data.mesh);

                fillNW.westTiles.push(west);
                fillNW.westMeshes.push(west.data.mesh);
                fillNW.northTiles.push(north);
                fillNW.northMeshes.push(north.data.mesh);

                fillNE.eastTiles.push(east);
                fillNE.eastMeshes.push(east.data.mesh);
                fillNE.northTiles.push(north);
                fillNE.northMeshes.push(north.data.mesh);

                fillSW.update(tileProvider, frameState);
                fillSE.update(tileProvider, frameState);
                fillNW.update(tileProvider, frameState);
                fillNE.update(tileProvider, frameState);

                expectVertexCount(fillSW, 5);
                expectVertex(fillSW, 0.0, 0.0, 31.0);
                expectVertex(fillSW, 1.0, 0.0, 32.0);
                expectVertex(fillSW, 0.0, 1.0, 24.0);
                expectVertex(fillSW, 1.0, 1.0, (24.0 + 32.0) / 2);
                expectVertex(fillSW, 0.5, 0.5, (24.0 + 32.0) / 2);

                expectVertexCount(fillSE, 5);
                expectVertex(fillSE, 0.0, 0.0, 32.0);
                expectVertex(fillSE, 1.0, 0.0, 33.0);
                expectVertex(fillSE, 0.0, 1.0, (32.0 + 26.0) / 2);
                expectVertex(fillSE, 1.0, 1.0, 26.0);
                expectVertex(fillSE, 0.5, 0.5, (26.0 + 33.0) / 2);

                expectVertexCount(fillNW, 5);
                expectVertex(fillNW, 0.0, 0.0, 24.0);
                expectVertex(fillNW, 1.0, 0.0, (18.0 + 24.0) / 2);
                expectVertex(fillNW, 0.0, 1.0, 17.0);
                expectVertex(fillNW, 1.0, 1.0, 18.0);
                expectVertex(fillNW, 0.5, 0.5, (17.0 + 24.0) / 2);

                expectVertexCount(fillNE, 5);
                expectVertex(fillNE, 0.0, 0.0, (18.0 + 26.0) / 2);
                expectVertex(fillNE, 1.0, 0.0, 26.0);
                expectVertex(fillNE, 0.0, 1.0, 18.0);
                expectVertex(fillNE, 1.0, 1.0, 19.0);
                expectVertex(fillNE, 0.5, 0.5, (18.0 + 26.0) / 2);
            });
        });

        it('interpolates a suitable corner vertex from a less detailed tile', function() {
            var sw = center.southwestChild.southwestChild;
            var se = center.southeastChild.southeastChild;
            var nw = center.northwestChild.northwestChild;
            var ne = center.northeastChild.northeastChild;

            return processor.process([sw, se, nw, ne, west, south, east, north]).then(function() {
                var fillSW = sw.data.fill = new TerrainFillMesh(sw);
                var fillSE = se.data.fill = new TerrainFillMesh(se);
                var fillNW = nw.data.fill = new TerrainFillMesh(nw);
                var fillNE = ne.data.fill = new TerrainFillMesh(ne);

                fillSW.westTiles.push(west);
                fillSW.westMeshes.push(west.data.mesh);
                fillSW.southTiles.push(south);
                fillSW.southMeshes.push(south.data.mesh);

                fillSE.eastTiles.push(east);
                fillSE.eastMeshes.push(east.data.mesh);
                fillSE.southTiles.push(south);
                fillSE.southMeshes.push(south.data.mesh);

                fillNW.westTiles.push(west);
                fillNW.westMeshes.push(west.data.mesh);
                fillNW.northTiles.push(north);
                fillNW.northMeshes.push(north.data.mesh);

                fillNE.eastTiles.push(east);
                fillNE.eastMeshes.push(east.data.mesh);
                fillNE.northTiles.push(north);
                fillNE.northMeshes.push(north.data.mesh);

                fillSW.update(tileProvider, frameState);
                fillSE.update(tileProvider, frameState);
                fillNW.update(tileProvider, frameState);
                fillNE.update(tileProvider, frameState);

                expectVertexCount(fillSW, 5);
                expectVertex(fillSW, 0.0, 0.0, 31.0);
                expectVertex(fillSW, 1.0, 0.0, (31.0 + 32.0) / 2);
                expectVertex(fillSW, 0.0, 1.0, (31.0 + 24.0) / 2);
                expectVertex(fillSW, 1.0, 1.0, ((31.0 + 32.0) / 2 + (31.0 + 24.0) / 2) / 2);
                expectVertex(fillSW, 0.5, 0.5, ((31.0 + 32.0) / 2 + (31.0 + 24.0) / 2) / 2);

                expectVertexCount(fillSE, 5);
                expectVertex(fillSE, 0.0, 0.0, (32.0 + 33.0) / 2);
                expectVertex(fillSE, 1.0, 0.0, 33.0);
                expectVertex(fillSE, 0.0, 1.0, ((32.0 + 33.0) / 2 + (33.0 + 26.0) / 2) / 2);
                expectVertex(fillSE, 1.0, 1.0, (33.0 + 26.0) / 2);
                expectVertex(fillSE, 0.5, 0.5, (33.0 + (33.0 + 26.0) / 2) / 2);

                expectVertexCount(fillNW, 5);
                expectVertex(fillNW, 0.0, 0.0, (17.0 + 24.0) / 2);
                expectVertex(fillNW, 1.0, 0.0, ((17.0 + 18.0) / 2 + (17.0 + 24.0) / 2) / 2);
                expectVertex(fillNW, 0.0, 1.0, 17.0);
                expectVertex(fillNW, 1.0, 1.0, (17.0 + 18.0) / 2);
                expectVertex(fillNW, 0.5, 0.5, (17.0 + (17.0 + 24.0) / 2) / 2);

                expectVertexCount(fillNE, 5);
                expectVertex(fillNE, 0.0, 0.0, ((19.0 + 26.0) / 2 + (18.0 + 19.0) / 2) / 2);
                expectVertex(fillNE, 1.0, 0.0, (19.0 + 26.0) / 2);
                expectVertex(fillNE, 0.0, 1.0, (18.0 + 19.0) / 2);
                expectVertex(fillNE, 1.0, 1.0, 19.0);
                expectVertex(fillNE, 0.5, 0.5, ((18.0 + 19.0) / 2 + (19.0 + 26.0) / 2) / 2);
            });
        });

        it('uses the height of the closest vertex when an edge does not include the corner', function() {
            var westN = west.northeastChild.southeastChild;
            var westS = west.southeastChild.northeastChild;
            var eastN = east.northwestChild.southwestChild;
            var eastS = east.southwestChild.northwestChild;
            var northW = north.southwestChild.southeastChild;
            var northE = north.southeastChild.southwestChild;
            var southW = south.northwestChild.northeastChild;
            var southE = south.northeastChild.northwestChild;

            mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
                width: 2,
                height: 2,
                createdByUpsampling: false,
                buffer: new Float32Array([
                    1.0, 1.0,
                    1.5, 1.5
                ])
            }), westN).createMeshWillSucceed(westN);

            mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
                width: 2,
                height: 2,
                createdByUpsampling: false,
                buffer: new Float32Array([
                    1.5, 1.5,
                    2.0, 2.0
                ])
            }), westS).createMeshWillSucceed(westS);

            mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
                width: 2,
                height: 2,
                createdByUpsampling: false,
                buffer: new Float32Array([
                    3.0, 3.0,
                    3.5, 3.5
                ])
            }), eastN).createMeshWillSucceed(eastN);

            mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
                width: 2,
                height: 2,
                createdByUpsampling: false,
                buffer: new Float32Array([
                    3.5, 3.5,
                    4.0, 4.0
                ])
            }), eastS).createMeshWillSucceed(eastS);

            mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
                width: 2,
                height: 2,
                createdByUpsampling: false,
                buffer: new Float32Array([
                    5.0, 5.5,
                    5.0, 5.5
                ])
            }), northW).createMeshWillSucceed(northW);

            mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
                width: 2,
                height: 2,
                createdByUpsampling: false,
                buffer: new Float32Array([
                    5.5, 6.0,
                    6.5, 6.0
                ])
            }), northE).createMeshWillSucceed(northE);

            mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
                width: 2,
                height: 2,
                createdByUpsampling: false,
                buffer: new Float32Array([
                    7.0, 7.5,
                    7.0, 7.5
                ])
            }), southW).createMeshWillSucceed(southW);

            mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
                width: 2,
                height: 2,
                createdByUpsampling: false,
                buffer: new Float32Array([
                    7.5, 8.0,
                    7.5, 8.0
                ])
            }), southE).createMeshWillSucceed(southE);

            return processor.process([center, westN, westS, eastN, eastS, northE, northW, southE, southW]).then(function() {
                var fill = center.data.fill = new TerrainFillMesh(center);

                fill.westTiles.push(westN, westS);
                fill.westMeshes.push(westN.data.mesh, westS.data.mesh);
                fill.eastTiles.push(eastS, eastN);
                fill.eastMeshes.push(eastS.data.mesh, eastN.data.mesh);
                fill.northTiles.push(northE, northW);
                fill.northMeshes.push(northE.data.mesh, northW.data.mesh);
                fill.southTiles.push(southW, southE);
                fill.southMeshes.push(southW.data.mesh, southE.data.mesh);

                fill.update(tileProvider, frameState);

                expectVertexCount(fill, 17);
                expectVertex(fill, 0.0, 0.0, (2.0 + 7.0) / 2);
                expectVertex(fill, 0.0, 0.25, 2.0);
                expectVertex(fill, 0.0, 0.5, 1.5);
                expectVertex(fill, 0.0, 0.75, 1.0);
                expectVertex(fill, 0.0, 1.0, (1.0 + 5.0) / 2);
                expectVertex(fill, 1.0, 0.0, (4.0 + 8.0) / 2);
                expectVertex(fill, 1.0, 0.25, 4.0);
                expectVertex(fill, 1.0, 0.5, 3.5);
                expectVertex(fill, 1.0, 0.75, 3.0);
                expectVertex(fill, 1.0, 1.0, (3.0 + 6.0) / 2);
            });
        });

        describe('correctly transforms texture coordinates across the anti-meridian', function() {
            var westernHemisphere;
            var easternHemisphere;

            beforeEach(function() {
                westernHemisphere = rootTiles[0].southwestChild.northwestChild.southwestChild.northwestChild;
                easternHemisphere = rootTiles[1].southeastChild.northeastChild.southeastChild.northeastChild;

                // Make sure we have a standard geographic tiling scheme with two root tiles,
                // the first covering the western hemisphere and the second the eastern.
                expect(rootTiles.length).toBe(2);
                expect(westernHemisphere.x).toBe(0);
                expect(easternHemisphere.x).toBe(31);
            });

            it('western hemisphere to eastern hemisphere', function() {
                mockTerrain.requestTileGeometryWillDefer(easternHemisphere);
                mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
                    width: 3,
                    height: 3,
                    createdByUpsampling: false,
                    buffer: new Float32Array([
                        1.0, 2.0, 3.0,
                        4.0, 5.0, 6.0,
                        7.0, 8.0, 9.0
                    ])
                }), westernHemisphere).createMeshWillSucceed(westernHemisphere);

                return processor.process([westernHemisphere, easternHemisphere]).then(function() {
                    var fill = easternHemisphere.data.fill = new TerrainFillMesh(easternHemisphere);

                    fill.eastTiles.push(westernHemisphere);
                    fill.eastMeshes.push(westernHemisphere.data.mesh);

                    fill.update(tileProvider, frameState);

                    expectVertexCount(fill, 6);
                    expectVertex(fill, 1.0, 0.0, 7.0);
                    expectVertex(fill, 1.0, 0.5, 4.0);
                    expectVertex(fill, 1.0, 1.0, 1.0);
                });
            });

            it('eastern hemisphere to western hemisphere', function() {
                mockTerrain.requestTileGeometryWillSucceedWith(new HeightmapTerrainData({
                    width: 3,
                    height: 3,
                    createdByUpsampling: false,
                    buffer: new Float32Array([
                        10.0, 11.0, 12.0,
                        13.0, 14.0, 15.0,
                        16.0, 17.0, 18.0
                    ])
                }), easternHemisphere).createMeshWillSucceed(easternHemisphere);
                mockTerrain.requestTileGeometryWillDefer(westernHemisphere);

                return processor.process([westernHemisphere, easternHemisphere]).then(function() {
                    var fill = westernHemisphere.data.fill = new TerrainFillMesh(westernHemisphere);

                    fill.westTiles.push(easternHemisphere);
                    fill.westMeshes.push(easternHemisphere.data.mesh);

                    fill.update(tileProvider, frameState);

                    expectVertexCount(fill, 6);
                    expectVertex(fill, 0.0, 0.0, 18.0);
                    expectVertex(fill, 0.0, 0.5, 15.0);
                    expectVertex(fill, 0.0, 1.0, 12.0);
                });
            });
        });
    });

    var textureCoordinateScratch = new Cartesian2();
    var positionScratch = new Cartesian3();
    var expectedPositionScratch = new Cartesian3();

    function getHeight(fill, u, v) {
        var mesh = fill.mesh;
        var rectangle = fill.tile.rectangle;
        var encoding = mesh.encoding;
        var vertices = mesh.vertices;
        var stride = encoding.getStride();
        var count = mesh.vertices.length / stride;

        for (var i = 0; i < count; ++i) {
            var tc = encoding.decodeTextureCoordinates(vertices, i, textureCoordinateScratch);
            var vertexHeight = encoding.decodeHeight(vertices, i);
            var vertexPosition = encoding.decodePosition(vertices, i, positionScratch);
            if (Math.abs(u - tc.x) < 1e-5 && Math.abs(v - tc.y) < CesiumMath.EPSILON5) {
                var longitude = CesiumMath.lerp(rectangle.west, rectangle.east, u);
                var latitude = CesiumMath.lerp(rectangle.south, rectangle.north, v);
                var expectedPosition = Cartesian3.fromRadians(longitude, latitude, vertexHeight, undefined, expectedPositionScratch);
                expect(vertexPosition).toEqualEpsilon(expectedPosition, 1);
                return vertexHeight;
            }
        }

        fail('Vertex with u=' + u + ', v=' + v + ' does not exist.');
    }

    function expectVertex(fill, u, v, height) {
        var vertexHeight = getHeight(fill, u, v);
        expect(vertexHeight).toEqualEpsilon(height, CesiumMath.EPSILON5);
    }

    function expectVertexCount(fill, count) {
        expect(fill.mesh.vertices.length).toBe(count * fill.mesh.encoding.getStride());
    }
});
