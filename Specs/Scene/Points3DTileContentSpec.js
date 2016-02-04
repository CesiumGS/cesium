/*global defineSuite*/
defineSuite([
        'Scene/Points3DTileContent',
        'Core/Cartesian3',
        'Core/HeadingPitchRange',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Points3DTileContent,
        Cartesian3,
        HeadingPitchRange,
        Cesium3DTilesTester,
        createScene) {
    "use strict";

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

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

    function expectRenderPoints(tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        tileset.show = true;
        var pixelColor = scene.renderForSpecs();
        expect(pixelColor).not.toEqual([0, 0, 0, 255]);
        return pixelColor;
    }

    it('throws with invalid magic', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            magic : [120, 120, 120, 120]
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            version: 2
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws with no points', function() {
        // Throws in Buffer due to vertex buffer size of zero
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer();
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, pointsUrl);
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest('pnts');
    });

    it('renders points', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsUrl).then(expectRenderPoints);
    });

    it('renders with debug color', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsUrl).then(function(tileset) {
            var color = expectRenderPoints(tileset);
            tileset.debugColorizeTiles = true;
            var debugColor = expectRenderPoints(tileset);
            expect(debugColor).not.toEqual(color);
            tileset.debugColorizeTiles = false;
            debugColor = expectRenderPoints(tileset);
            expect(debugColor).toEqual(color);
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, pointsUrl);
    });

    it('destroys before loading finishes', function() {
        return Cesium3DTilesTester.tileDestroysBeforeLoad(scene, pointsUrl);
    });

}, 'WebGL');
