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
    'use strict';

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var pointsRGBUrl = './Data/Cesium3DTiles/Points/PointsRGB';
    var pointsRGBAUrl = './Data/Cesium3DTiles/Points/PointsRGBA';
    var pointsNoColorUrl = './Data/Cesium3DTiles/Points/PointsNoColor';
    var pointsConstantColorUrl = './Data/Cesium3DTiles/Points/PointsConstantColor';
    var pointsNormalsUrl = './Data/Cesium3DTiles/Points/PointsNormals';
    var pointsNormalsOctEncodedUrl = './Data/Cesium3DTiles/Points/PointsNormalsOctEncoded';
    var pointsQuantizedUrl = './Data/Cesium3DTiles/Points/PointsQuantized';
    var pointsQuantizedOctEncodedUrl = './Data/Cesium3DTiles/Points/PointsQuantizedOctEncoded';
    var pointsWGS84Url = './Data/Cesium3DTiles/Points/PointsWGS84';

    beforeAll(function() {
        // Point tiles use RTC, which for now requires scene3DOnly to be true
        scene = createScene({
            scene3DOnly : true
        });

        scene.frameState.passes.render = true;

        // Point the camera to the center of the tile
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 5.0);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 5.0));
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

    it('throws if featureTableJSONByteLength is 0', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            featureTableJSONByteLength : 0
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the feature table does not contain POINTS_LENGTH', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            featureTableJSON : {
                POSITION : {
                    byteOffset : 0
                }
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the feature table does not contain POSITION or POSITION_QUANTIZED', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            featureTableJSON : {
                POINTS_LENGTH : 1
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the positions are quantized and the feature table does not contain QUANTIZED_VOLUME_SCALE', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            featureTableJSON : {
                POINTS_LENGTH : 1,
                POSITION_QUANTIZED : {
                    byteOffset : 0
                },
                QUANTIZED_VOLUME_OFFSET : [0.0, 0.0, 0.0]
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the positions are quantized and the feature table does not contain QUANTIZED_VOLUME_OFFSET', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            featureTableJSON : {
                POINTS_LENGTH : 1,
                POSITION_QUANTIZED : {
                    byteOffset : 0
                },
                QUANTIZED_VOLUME_SCALE : [1.0, 1.0, 1.0]
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, pointsRGBUrl);
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest('pnts');
    });

    it('renders points with rgb colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsRGBUrl).then(expectRenderPoints);
    });

    it('renders points with rgba colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsRGBAUrl).then(expectRenderPoints);
    });

    it('renders points with no colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsNoColorUrl).then(expectRenderPoints);
    });

    it('renders points with constant colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsConstantColorUrl).then(expectRenderPoints);
    });

    it('renders points with normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsNormalsUrl).then(expectRenderPoints);
    });

    it('renders points with oct encoded normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsNormalsOctEncodedUrl).then(expectRenderPoints);
    });

    it('renders points with quantized positions', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsQuantizedUrl).then(expectRenderPoints);
    });

    it('renders points with quantized positions and oct-encoded normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsQuantizedOctEncodedUrl).then(expectRenderPoints);
    });

    it('renders points that are not defined relative to center', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsWGS84Url).then(expectRenderPoints);
    });

    it('renders with debug color', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsRGBUrl).then(function(tileset) {
            var color = expectRenderPoints(tileset);
            tileset.debugColorizeTiles = true;
            var debugColor = expectRenderPoints(tileset);
            expect(debugColor).not.toEqual(color);
            tileset.debugColorizeTiles = false;
            debugColor = expectRenderPoints(tileset);
            expect(debugColor).toEqual(color);
        });
    });

    it('picks', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsRGBUrl).then(function(tileset) {
            var content = tileset._root.content;
            tileset.show = false;
            var picked = scene.pickForSpecs();
            expect(picked).toBeUndefined();
            tileset.show = true;
            picked = scene.pickForSpecs();
            expect(picked).toBeDefined();
            expect(picked.primitive).toBe(content);
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, pointsRGBUrl);
    });

    it('destroys before loading finishes', function() {
        return Cesium3DTilesTester.tileDestroysBeforeLoad(scene, pointsRGBUrl);
    });

}, 'WebGL');
