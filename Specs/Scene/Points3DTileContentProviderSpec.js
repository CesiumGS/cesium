/*global defineSuite*/
defineSuite([
        'Scene/Points3DTileContentProvider',
        'Core/Cartesian3',
        'Core/HeadingPitchRange',
        'Specs/Cesium3DTilesSpecHelper',
        'Specs/createScene'
    ], function(
        Points3DTileContentProvider,
        Cartesian3,
        HeadingPitchRange,
        Cesium3DTilesSpecHelper,
        createScene) {
    "use strict";

    var scene;
    var centerLongitude = -1.31995;
    var centerLatitude = 0.69871;

    var pointsUrl = './Data/Cesium3DTiles/Points/Points';

    beforeAll(function() {
        // Point tiles use RTC, which for now requires scene3DOnly to be true
        scene = createScene({
            scene3DOnly : true
        });

        scene.frameState.passes.render = true;

        // Point the camera to the center of the tile
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 5.0);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 10.0));
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    function verifyRenderPoints(tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        tileset.show = true;
        var pixelColor = scene.renderForSpecs();
        expect(pixelColor).not.toEqual([0, 0, 0, 255]);
        return pixelColor;
    }

    it('throws with invalid magic', function() {
        var arrayBuffer = Cesium3DTilesSpecHelper.generatePointsTileBuffer({
            magic : [120, 120, 120, 120]
        });
        return Cesium3DTilesSpecHelper.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesSpecHelper.generatePointsTileBuffer({
            version: 2
        });
        return Cesium3DTilesSpecHelper.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws with no points', function() {
        // Throws in Buffer due to vertex buffer size of zero
        var arrayBuffer = Cesium3DTilesSpecHelper.generatePointsTileBuffer();
        return Cesium3DTilesSpecHelper.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesSpecHelper.resolvesReadyPromise(scene, pointsUrl);
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesSpecHelper.rejectsReadyPromiseOnFailedRequest('pnts');
    });

    it('renders points', function() {
        return Cesium3DTilesSpecHelper.loadTileset(scene, pointsUrl).then(verifyRenderPoints);
    });

    it('renders with debug color', function() {
        return Cesium3DTilesSpecHelper.loadTileset(scene, pointsUrl).then(function(tileset) {
            var color = verifyRenderPoints(tileset);
            tileset.debugColorizeTiles = true;
            var debugColor = verifyRenderPoints(tileset);
            expect(debugColor).not.toEqual(color);
            tileset.debugColorizeTiles = false;
            debugColor = verifyRenderPoints(tileset);
            expect(debugColor).toEqual(color);
        });
    });

    it('destroys', function() {
        return Cesium3DTilesSpecHelper.tileDestroys(scene, pointsUrl);
    });
});
