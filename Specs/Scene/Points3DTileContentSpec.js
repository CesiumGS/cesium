/*global defineSuite*/
defineSuite([
        'Scene/Points3DTileContent',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ComponentDatatype',
        'Core/HeadingPitchRange',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Points3DTileContent,
        Cartesian3,
        Color,
        ComponentDatatype,
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
    var pointsWithBatchTableUrl = './Data/Cesium3DTiles/Points/PointsWithBatchTable';

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

    it('throws if featureTableJsonByteLength is 0', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            featureTableJsonByteLength : 0
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the feature table does not contain POINTS_LENGTH', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            featureTableJson : {
                POSITION : {
                    byteOffset : 0
                }
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the feature table does not contain POSITION or POSITION_QUANTIZED', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            featureTableJson : {
                POINTS_LENGTH : 1
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the positions are quantized and the feature table does not contain QUANTIZED_VOLUME_SCALE', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            featureTableJson : {
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
            featureTableJson : {
                POINTS_LENGTH : 1,
                POSITION_QUANTIZED : {
                    byteOffset : 0
                },
                QUANTIZED_VOLUME_SCALE : [1.0, 1.0, 1.0]
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the BATCH_ID semantic is defined but BATCHES_LENGTH is not', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            featureTableJson : {
                POINTS_LENGTH : 2,
                POSITION : [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
                BATCH_ID : [0, 1]
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('BATCH_ID semantic uses componentType of UNSIGNED_SHORT by default', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointsTileBuffer({
            featureTableJson : {
                POINTS_LENGTH : 2,
                POSITION : [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
                BATCH_ID : [0, 1],
                BATCH_LENGTH : 2
            }
        });
        var content = Cesium3DTilesTester.loadTile(scene, arrayBuffer, 'pnts');
        expect(content._drawCommand._vertexArray._attributes[1].componentDatatype).toEqual(ComponentDatatype.UNSIGNED_SHORT);
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

    it('renders points with batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsWithBatchTableUrl).then(expectRenderPoints);
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

    it('picks a feature in the point cloud', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsWithBatchTableUrl).then(function(tileset) {
            var pixelColor = scene.renderForSpecs();

            // Change the color of the picked feature to yellow
            var picked = scene.pickForSpecs();
            expect(picked).toBeDefined();
            picked.color = Color.clone(Color.YELLOW, picked.color);

            // Expect the pixel color to be some shade of yellow
            var newPixelColor = scene.renderForSpecs();
            expect(newPixelColor).not.toEqual(pixelColor);

            // Turn show off. Expect a different feature to get picked.
            picked.show = false;
            var newPicked = scene.pickForSpecs();
            expect(newPicked).not.toBe(picked);
        });
    });

    it('points without batch table works', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsRGBUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(content.featuresLength).toBe(0);
            expect(content.innerContents).toBeUndefined();
            expect(content.hasProperty('name')).toBe(false);
            expect(content.getFeature(0)).toBeUndefined();
        });
    });

    it('points with batch table works', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsWithBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(content.featuresLength).toBe(8);
            expect(content.innerContents).toBeUndefined();
            expect(content.hasProperty('name')).toBe(true);
            expect(content.getFeature(0)).toBeDefined();
        });
    });

    it('throws when calling getFeature with invalid index', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointsWithBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(function(){
                content.getFeature(-1);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature(1000);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature();
            }).toThrowDeveloperError();
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, pointsRGBUrl);
    });

    it('destroys before loading finishes', function() {
        return Cesium3DTilesTester.tileDestroysBeforeLoad(scene, pointsRGBUrl);
    });

}, 'WebGL');
