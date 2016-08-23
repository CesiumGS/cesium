/*global defineSuite*/
defineSuite([
        'Scene/Instanced3DModel3DTileContent',
        'Core/Cartesian3',
        'Core/HeadingPitchRange',
        'Scene/Cesium3DTileContentState',
        'Scene/TileBoundingSphere',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Instanced3DModel3DTileContent,
        Cartesian3,
        HeadingPitchRange,
        Cesium3DTileContentState,
        TileBoundingSphere,
        Cesium3DTilesTester,
        createScene) {
    'use strict';

    var scene;
    var originLongitude = -1.3197004048940548;
    var originLatitude = 0.6988585409308616;

    var gltfExternalUrl = './Data/Cesium3DTiles/Instanced/InstancedGltfExternal/';
    var withBatchTableUrl = './Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/';
    var withoutBatchTableUrl = './Data/Cesium3DTiles/Instanced/InstancedWithoutBatchTable/';
    var orientationUrl = './Data/Cesium3DTiles/Instanced/InstancedOrientationWithBatchTable/';
    var oct16POrientationUrl = './Data/Cesium3DTiles/Instanced/InstancedOct32POrientationWithBatchTable/';
    var scaleUrl = './Data/Cesium3DTiles/Instanced/InstancedScaleWithBatchTable/';
    var scaleNonUniformUrl = './Data/Cesium3DTiles/Instanced/InstancedScaleNonUniformWithBatchTable/';
    var quantizedUrl = './Data/Cesium3DTiles/Instanced/InstancedQuantizedWithBatchTable/';
    var quantizedOct32POrientationUrl = './Data/Cesium3DTiles/Instanced/InstancedQuantizedOct32POrientationWithBatchTable/';

    beforeAll(function() {
        scene = createScene();
        // One instance is located on the bottom corner, point the camera there
        var bottomCorner = Cartesian3.fromRadians(originLongitude, originLatitude, 5.0);
        scene.camera.lookAt(bottomCorner, new HeadingPitchRange(0.0, -1.57, 50.0));
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('throws with invalid magic', function() {
        var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
            magic : [120, 120, 120, 120]
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'i3dm');
    });

    it('throws with invalid format', function() {
        var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
            gltfFormat : 2
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'i3dm');
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
            version : 2
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'i3dm');
    });

    it('throws with empty gltf', function() {
        // Expect to throw DeveloperError in Model due to invalid gltf magic
        var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer();
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'i3dm');
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, withoutBatchTableUrl);
    });

    it('rejects readyPromise on error', function() {
        // Try loading a tile with an invalid url.
        // Expect promise to be rejected in Model, then in ModelInstanceCollection, and
        // finally in Instanced3DModel3DTileContent.
        var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
            gltfFormat : 0,
            gltfUri : 'not-a-real-path'
        });
        return Cesium3DTilesTester.rejectsReadyPromiseOnError(scene, arrayBuffer, 'i3dm');
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest('i3dm');
    });

    var mockTile = {
        contentBoundingVolume : new TileBoundingSphere(),
        _header : {
            content : {
                boundingVolume : {
                    sphere : [0.0, 0.0, 0.0, 1.0]
                }
            }
        }
    };

    it('loads with no instances, but does not become ready', function() {
        var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
            featuresLength : 0,
            gltfUri : '../Data/Models/Box/CesiumBoxTest.gltf'
        });

        var tileset = {};
        var url = '';
        var instancedTile = new Instanced3DModel3DTileContent(tileset, mockTile, url);
        instancedTile.initialize(arrayBuffer);
        // Expect the tile to never reach the ready state due to returning early in ModelInstanceCollection
        for (var i = 0; i < 10; ++i) {
            instancedTile.update(tileset, scene.frameState);
            expect(instancedTile.state).toEqual(Cesium3DTileContentState.PROCESSING);
        }
    });

    it('renders with external gltf', function() {
        return Cesium3DTilesTester.loadTileset(scene, gltfExternalUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders without batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with feature defined orientation', function() {
        return Cesium3DTilesTester.loadTileset(scene, orientationUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with feature defined Oct32P encoded orientation', function() {
        return Cesium3DTilesTester.loadTileset(scene, oct16POrientationUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with feature defined scale', function() {
        return Cesium3DTilesTester.loadTileset(scene, scaleUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with feature defined non-uniform scale', function() {
        return Cesium3DTilesTester.loadTileset(scene, scaleNonUniformUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with feature defined quantized position', function() {
        return Cesium3DTilesTester.loadTileset(scene, quantizedUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with feature defined quantized position and Oct32P encoded orientation', function() {
        return Cesium3DTilesTester.loadTileset(scene, quantizedOct32POrientationUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders when instancing is disabled', function() {
        // Disable extension
        var instancedArrays = scene.context._instancedArrays;
        scene.context._instancedArrays = undefined;

        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            // Re-enable extension
            scene.context._instancedArrays = instancedArrays;
        });
    });

    it('throws when calling getFeature with invalid index', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(function(){
                content.getFeature(-1);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature(10000);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature();
            }).toThrowDeveloperError();
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, withoutBatchTableUrl);
    });

    it('destroys before loading finishes', function() {
        return Cesium3DTilesTester.tileDestroysBeforeLoad(scene, withoutBatchTableUrl);
    });

}, 'WebGL');
