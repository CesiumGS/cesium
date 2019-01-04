defineSuite([
        'Scene/TerrainFillMesh',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/GeographicProjection',
        'Core/HeightmapTerrainData',
        'Core/Intersect',
        'Core/Math',
        'Scene/Camera',
        'Scene/GlobeSurfaceTileProvider',
        'Scene/ImageryLayerCollection',
        'Scene/QuadtreePrimitive',
        'Scene/SceneMode',
        'Scene/TileBoundingRegion',
        'ThirdParty/when',
        '../MockTerrainProvider',
        '../TerrainTileProcessor'
    ], function(
        TerrainFillMesh,
        Cartesian2,
        Cartesian3,
        GeographicProjection,
        HeightmapTerrainData,
        Intersect,
        CesiumMath,
        Camera,
        GlobeSurfaceTileProvider,
        ImageryLayerCollection,
        QuadtreePrimitive,
        SceneMode,
        TileBoundingRegion,
        when,
        MockTerrainProvider,
        TerrainTileProcessor) {
    'use strict';

    describe('update', function() {
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

            center = rootTiles[0].northeastChild.southwestChild;
            west = center.findTileToWest(rootTiles);
            south = center.findTileToSouth(rootTiles);
            east = center.findTileToEast(rootTiles);
            north = center.findTileToNorth(rootTiles);
            southwest = west.findTileToSouth(rootTiles);
            southeast = east.findTileToSouth(rootTiles);
            northwest = west.findTileToNorth(rootTiles);
            northeast = east.findTileToNorth(rootTiles);

            spyOn(mockTerrain, 'requestTileGeometry').and.callFake(function(x, y, level) {
                var buffer = new Float32Array(4);
                if (x === center.x && y === center.y) {
                    return undefined;
                } else if (x === west.x && y === west.y) {
                    buffer[0] = 3.0;
                    buffer[1] = 4.0;
                    buffer[2] = 1.0;
                    buffer[3] = 2.0;
                } else if (x === south.x && y === south.y) {
                    buffer[0] = 2.0;
                    buffer[1] = 7.0;
                    buffer[2] = 5.0;
                    buffer[3] = 6.0;
                } else if (x === east.x && y === east.y) {
                    buffer[0] = 9.0;
                    buffer[1] = 10.0;
                    buffer[2] = 7.0;
                    buffer[3] = 8.0;
                } else if (x === north.x && y === north.y) {
                    buffer[0] = 11.0;
                    buffer[1] = 12.0;
                    buffer[2] = 4.0;
                    buffer[3] = 9.0;
                } else if (x === southwest.x && y === southwest.y) {
                    buffer[0] = 1.0;
                    buffer[1] = 2.0;
                    buffer[2] = 13.0;
                    buffer[3] = 5.0;
                } else if (x === southeast.x && y === southeast.y) {
                    buffer[0] = 7.0;
                    buffer[1] = 8.0;
                    buffer[2] = 6.0;
                    buffer[3] = 14.0;
                } else if (x === northwest.x && y === northwest.y) {
                    buffer[0] = 15.0;
                    buffer[1] = 11.0;
                    buffer[2] = 3.0;
                    buffer[3] = 4.0;
                } else if (x === northeast.x && y === northeast.y) {
                    buffer[0] = 12.0;
                    buffer[1] = 16.0;
                    buffer[2] = 9.0;
                    buffer[3] = 10.0;
                }

                var terrainData = new HeightmapTerrainData({
                    width: 2,
                    height: 2,
                    buffer: buffer,
                    createdByUpsampling: false
                });
                return when(terrainData);
            });
        });

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

                expectVertexCount(fill, 5);
                expectVertex(fill, 0.0, 0.0, 2.0);
                expectVertex(fill, 1.0, 0.0, 7.0);
                expectVertex(fill, 0.0, 1.0, 4.0);
                expectVertex(fill, 1.0, 1.0, 9.0);
                expectVertex(fill, 0.5, 0.5, (9.0 + 2.0) / 2.0);
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
                expectVertex(fill, 0.0, 0.0, 2.0);
                expectVertex(fill, 1.0, 0.0, 7.0);
                expectVertex(fill, 0.0, 1.0, 4.0);
                expectVertex(fill, 1.0, 1.0, 9.0);
                expectVertex(fill, 0.5, 0.5, (9.0 + 2.0) / 2.0);
            });
        });
    });

    var textureCoordinateScratch = new Cartesian2();
    var positionScratch = new Cartesian3();
    var expectedPositionScratch = new Cartesian3();

    function expectVertex(fill, u, v, height) {
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
                expect(vertexHeight).toEqualEpsilon(height, CesiumMath.EPSILON5);

                var longitude = CesiumMath.lerp(rectangle.west, rectangle.east, u);
                var latitude = CesiumMath.lerp(rectangle.south, rectangle.north, v);
                var expectedPosition = Cartesian3.fromRadians(longitude, latitude, vertexHeight, undefined, expectedPositionScratch);
                expect(vertexPosition).toEqualEpsilon(expectedPosition, 1);
                return;
            }
        }

        fail('Vertex with u=' + u + ', v=' + v + ' does not exist.');
    }

    function expectVertexCount(fill, count) {
        // A fill tile may have space allocated for extra vertices, but not all will be used.
        var actualCount = fill.mesh.indices.reduce(function(high, current) {
            return Math.max(high, current);
        }, -1) + 1;
        expect(actualCount).toBe(count);
    }
});
