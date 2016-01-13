/*global defineSuite*/
defineSuite([
        'Scene/Batched3DModel3DTileContentProvider',
        'Core/Cartesian3',
        'Core/HeadingPitchRange',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Batched3DModel3DTileContentProvider,
        Cartesian3,
        HeadingPitchRange,
        Cesium3DTilesTester,
        createScene) {
    "use strict";

    var scene;
    var centerLongitude = -1.31995;
    var centerLatitude = 0.69871;

    var withBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTable/';
    var withoutBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/';

    beforeAll(function() {
        scene = createScene();

        // One building in each data set is always located in the center, so point the camera there
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('throws with invalid magic', function() {
        var arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer({
            magic : [120, 120, 120, 120]
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'b3dm');
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer({
            version: 2
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'b3dm');
    });

    it('throws with empty gltf', function() {
        // Expect to throw DeveloperError in Model due to invalid gltf magic
        var arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer();
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'b3dm');
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, withoutBatchTableUrl);
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest('b3dm');
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

    it('throws when calling getModel with invalid index', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
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
        return Cesium3DTilesTester.tileDestroys(scene, withoutBatchTableUrl);
    });

    it('destroys before loading finishes', function() {
        return Cesium3DTilesTester.tileDestroysBeforeLoad(scene, withoutBatchTableUrl);
    });

}, 'WebGL');
