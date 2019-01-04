defineSuite([
        'Scene/TerrainFillMesh',
        'Core/GeographicProjection',
        'Core/Intersect',
        'Scene/Camera',
        'Scene/GlobeSurfaceTileProvider',
        'Scene/ImageryLayerCollection',
        'Scene/QuadtreePrimitive',
        'Scene/SceneMode',
        'Scene/TileBoundingRegion',
        '../MockTerrainProvider',
        '../TerrainTileProcessor'
    ], function(
        TerrainFillMesh,
        GeographicProjection,
        Intersect,
        Camera,
        GlobeSurfaceTileProvider,
        ImageryLayerCollection,
        QuadtreePrimitive,
        SceneMode,
        TileBoundingRegion,
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
        });

        it('puts a middle height at the four corners and center when there are no adjacent tiles', function() {
            var tile = rootTiles[0].southwestChild;
            return processor.process([tile]).then(function() {
                tile.data.tileBoundingRegion = new TileBoundingRegion({
                    rectangle: tile.rectangle,
                    minimumHeight: 1.0,
                    maximumHeight: 3.0,
                    computeBoundingVolumes: false
                });

                var fill = tile.data.fill = new TerrainFillMesh(tile);
                fill.update(tileProvider, frameState);

                var encoding = fill.mesh.encoding;
                var vertices = fill.mesh.vertices;
                expect(vertices.length / encoding.getStride()).toBe(5);
                expect(encoding.decodeHeight(vertices, 0)).toBe(2.0);
                expect(encoding.decodeHeight(vertices, 1)).toBe(2.0);
                expect(encoding.decodeHeight(vertices, 2)).toBe(2.0);
                expect(encoding.decodeHeight(vertices, 3)).toBe(2.0);
                expect(encoding.decodeHeight(vertices, 4)).toBe(2.0);
            });
        });

        it('puts zero height at the four corners and center when there are no adjacent tiles and no bounding region', function() {
            var tile = rootTiles[0].southwestChild;
            return processor.process([tile]).then(function() {
                var fill = tile.data.fill = new TerrainFillMesh(tile);
                fill.update(tileProvider, frameState);

                var encoding = fill.mesh.encoding;
                var vertices = fill.mesh.vertices;
                expect(vertices.length / encoding.getStride()).toBe(5);
                expect(encoding.decodeHeight(vertices, 0)).toBe(0.0);
                expect(encoding.decodeHeight(vertices, 1)).toBe(0.0);
                expect(encoding.decodeHeight(vertices, 2)).toBe(0.0);
                expect(encoding.decodeHeight(vertices, 3)).toBe(0.0);
                expect(encoding.decodeHeight(vertices, 4)).toBe(0.0);
            });
        });
    });
});
