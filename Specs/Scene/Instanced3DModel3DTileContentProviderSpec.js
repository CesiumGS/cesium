/*global defineSuite*/
defineSuite([
        'Scene/Instanced3DModel3DTileContentProvider',
        'Core/Cartesian3',
        'Core/HeadingPitchRange',
        'Scene/Cesium3DTileContentState',
        'Scene/TileBoundingSphere',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Instanced3DModel3DTileContentProvider,
        Cartesian3,
        HeadingPitchRange,
        Cesium3DTileContentState,
        TileBoundingSphere,
        Cesium3DTilesTester,
        createScene) {
    "use strict";

    var scene;
    var centerLongitude = -1.31995;
    var centerLatitude = 0.69871;

    var gltfEmbeddedUrl = './Data/Cesium3DTiles/Instanced/InstancedGltfEmbedded/';
    var gltfExternalUrl = './Data/Cesium3DTiles/Instanced/InstancedGltfExternal/';
    var withBatchTableUrl = './Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/';
    var withoutBatchTableUrl = './Data/Cesium3DTiles/Instanced/InstancedWithoutBatchTable/';

    beforeAll(function() {
        scene = createScene();

        // One instance in each data set is always located in the center, so point the camera there
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 5.0);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 10.0));
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
        return Cesium3DTilesTester.resolvesReadyPromise(scene, gltfEmbeddedUrl);
    });

    it('rejects readyPromise on error', function() {
        // Try loading a tile with an invalid url.
        // Expect promise to be rejected in Model, then in ModelInstanceCollection, and
        // finally in Instanced3DModel3DTileContentProvider.
        var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
            gltfFormat : 0
        });
        return Cesium3DTilesTester.rejectsReadyPromiseOnError(scene, arrayBuffer, 'i3dm');
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest('i3dm');
    });

    it('loads with no instances, but does not become ready', function() {
        var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
            instancesLength : 0
        });

        var tileset = {};
        var tile = {
            contentBoundingVolume : new TileBoundingSphere()
        };
        var url = '';
        var instancedTile = new Instanced3DModel3DTileContentProvider(tileset, tile, url);
        instancedTile.initialize(arrayBuffer);
        // Expect the tile to never reach the ready state due to returning early in ModelInstanceCollection
        for (var i = 0; i < 10; ++i) {
            instancedTile.update(tileset, scene.frameState);
            expect(instancedTile.state).toEqual(Cesium3DTileContentState.PROCESSING);
        }
    });

    it('renders with embedded gltf', function() {
        return Cesium3DTilesTester.loadTileset(scene, gltfEmbeddedUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
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

    it('renders when instancing is disabled', function() {
        // Disable extension
        var instancedArrays = scene.context._instancedArrays;
        scene.context._instancedArrays = undefined;

        return Cesium3DTilesTester.loadTileset(scene, gltfEmbeddedUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            // Re-enable extension
            scene.context._instancedArrays = instancedArrays;
        });
    });

    it('throws when calling getModel with invalid index', function() {
        return Cesium3DTilesTester.loadTileset(scene, gltfEmbeddedUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(function(){
                content.getModel(-1);
            }).toThrowDeveloperError();
            expect(function(){
                content.getModel(1000);
            }).toThrowDeveloperError();
            expect(function(){
                content.getModel();
            }).toThrowDeveloperError();
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, gltfEmbeddedUrl);
    });

    it('destroys before loading finishes', function() {
        return Cesium3DTilesTester.tileDestroysBeforeLoad(scene, gltfEmbeddedUrl);
    });

}, 'WebGL');
