/*global defineSuite*/
defineSuite([
        'Scene/PointCloud3DTileContent',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ComponentDatatype',
        'Core/defined',
        'Core/HeadingPitchRange',
        'Core/Transforms',
        'Scene/Cesium3DTileStyle',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        PointCloud3DTileContent,
        Cartesian3,
        Color,
        ComponentDatatype,
        defined,
        HeadingPitchRange,
        Transforms,
        Cesium3DTileStyle,
        Cesium3DTilesTester,
        createScene) {
    'use strict';

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var pointCloudRGBUrl = './Data/Cesium3DTiles/PointCloud/PointCloudRGB';
    var pointCloudRGBAUrl = './Data/Cesium3DTiles/PointCloud/PointCloudRGBA';
    var pointCloudRGB565Url = './Data/Cesium3DTiles/PointCloud/PointCloudRGB565';
    var pointCloudNoColorUrl = './Data/Cesium3DTiles/PointCloud/PointCloudNoColor';
    var pointCloudConstantColorUrl = './Data/Cesium3DTiles/PointCloud/PointCloudConstantColor';
    var pointCloudNormalsUrl = './Data/Cesium3DTiles/PointCloud/PointCloudNormals';
    var pointCloudNormalsOctEncodedUrl = './Data/Cesium3DTiles/PointCloud/PointCloudNormalsOctEncoded';
    var pointCloudQuantizedUrl = './Data/Cesium3DTiles/PointCloud/PointCloudQuantized';
    var pointCloudQuantizedOctEncodedUrl = './Data/Cesium3DTiles/PointCloud/PointCloudQuantizedOctEncoded';
    var pointCloudWGS84Url = './Data/Cesium3DTiles/PointCloud/PointCloudWGS84';
    var pointCloudBatchedUrl = './Data/Cesium3DTiles/PointCloud/PointCloudBatched';
    var pointCloudWithPerPointPropertiesUrl = './Data/Cesium3DTiles/PointCloud/PointCloudWithPerPointProperties';
    var pointCloudWithTransformUrl = './Data/Cesium3DTiles/PointCloud/PointCloudWithTransform';

    function setCamera(longitude, latitude) {
        // Point the camera to the center of the tile
        var center = Cartesian3.fromRadians(longitude, latitude, 5.0);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 5.0));
    }

    beforeAll(function() {
        // Point tiles use RTC, which for now requires scene3DOnly to be true
        scene = createScene({
            scene3DOnly : true
        });

        scene.frameState.passes.render = true;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        setCamera(centerLongitude, centerLatitude);
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    function expectRenderPointCloud(tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        tileset.show = true;
        var pixelColor = scene.renderForSpecs();
        expect(pixelColor).not.toEqual([0, 0, 0, 255]);
        return pixelColor;
    }

    it('throws with invalid magic', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
            magic : [120, 120, 120, 120]
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
            version: 2
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if featureTableJsonByteLength is 0', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
            featureTableJsonByteLength : 0
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the feature table does not contain POINTS_LENGTH', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
            featureTableJson : {
                POSITION : {
                    byteOffset : 0
                }
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the feature table does not contain POSITION or POSITION_QUANTIZED', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
            featureTableJson : {
                POINTS_LENGTH : 1
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the positions are quantized and the feature table does not contain QUANTIZED_VOLUME_SCALE', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
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
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
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
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
            featureTableJson : {
                POINTS_LENGTH : 2,
                POSITION : [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
                BATCH_ID : [0, 1]
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('BATCH_ID semantic uses componentType of UNSIGNED_SHORT by default', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
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
        return Cesium3DTilesTester.resolvesReadyPromise(scene, pointCloudRGBUrl);
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest('pnts');
    });

    it('renders point cloud with rgb colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(expectRenderPointCloud);
    });

    it('renders point cloud with rgba colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBAUrl).then(expectRenderPointCloud);
    });

    it('renders point cloud with rgb565 colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGB565Url).then(expectRenderPointCloud);
    });

    it('renders point cloud with no colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudNoColorUrl).then(expectRenderPointCloud);
    });

    it('renders point cloud with constant colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudConstantColorUrl).then(expectRenderPointCloud);
    });

    it('renders point cloud with normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudNormalsUrl).then(expectRenderPointCloud);
    });

    it('renders point cloud with oct encoded normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudNormalsOctEncodedUrl).then(expectRenderPointCloud);
    });

    it('renders point cloud with quantized positions', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudQuantizedUrl).then(expectRenderPointCloud);
    });

    it('renders point cloud with quantized positions and oct-encoded normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudQuantizedOctEncodedUrl).then(expectRenderPointCloud);
    });

    it('renders point cloud that are not defined relative to center', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudWGS84Url).then(expectRenderPointCloud);
    });

    it('renders point cloud with batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl).then(expectRenderPointCloud);
    });

    it('renders point cloud with per-point properties', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudWithPerPointPropertiesUrl).then(expectRenderPointCloud);
    });

    it('renders point cloud with tile transform', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudWithTransformUrl).then(function(tileset) {
            expectRenderPointCloud(tileset);

            var newLongitude = -1.31962;
            var newLatitude = 0.698874;
            var newCenter = Cartesian3.fromRadians(newLongitude, newLatitude, 5.0);
            var newTransform = Transforms.headingPitchRollToFixedFrame(newCenter, 0.0, 0.0, 0.0);

            // Update tile transform
            tileset._root.transform = newTransform;

            // Move the camera to the new location
            setCamera(newLongitude, newLatitude);
            expectRenderPointCloud(tileset);
        });
    });

    it('renders with debug color', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            var color = expectRenderPointCloud(tileset);
            tileset.debugColorizeTiles = true;
            var debugColor = expectRenderPointCloud(tileset);
            expect(debugColor).not.toEqual(color);
            tileset.debugColorizeTiles = false;
            debugColor = expectRenderPointCloud(tileset);
            expect(debugColor).toEqual(color);
        });
    });

    it('picks', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
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

    it('picks based on batchId', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl).then(function(tileset) {
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

    it('point cloud without batch table works', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(content.featuresLength).toBe(0);
            expect(content.innerContents).toBeUndefined();
            expect(content.hasProperty('name')).toBe(false);
            expect(content.getFeature(0)).toBeUndefined();
        });
    });

    it('batched point cloud works', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(content.featuresLength).toBe(8);
            expect(content.innerContents).toBeUndefined();
            expect(content.hasProperty('name')).toBe(true);
            expect(content.getFeature(0)).toBeDefined();
        });
    });

    it('point cloud with per-point properties work', function() {
        // When the batch table contains per-point properties, aka no batching, then a Cesium3DTileBatchTable is not
        // created. There is no per-point show/color/pickId because the overhead is too high. Instead points are styled
        // based on their properties, and these are not accessible from the API.
        return Cesium3DTilesTester.loadTileset(scene, pointCloudWithPerPointPropertiesUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(content.featuresLength).toBe(0);
            expect(content.innerContents).toBeUndefined();
            expect(content.hasProperty('name')).toBe(false);
            expect(content.getFeature(0)).toBeUndefined();
        });
    });

    it('throws when calling getFeature with invalid index', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl).then(function(tileset) {
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

    it('Supports back face culling when there are per-point normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl).then(function(tileset) {
            var content = tileset._root.content;

            // Get the number of picked sections with back face culling on
            content.backFaceCulling = true;
            var numberPickedCulling = 0;
            var picked = scene.pickForSpecs();
            while (defined(picked)) {
                picked.show = false;
                picked = scene.pickForSpecs();
                ++numberPickedCulling;
            }
            content.backFaceCulling = false;

            // Set the shows back to true
            var length = content.featuresLength;
            for (var i = 0; i < length; ++i) {
                var feature = content.getFeature(i);
                feature.show = true;
            }

            // Get the number of picked sections with back face culling off
            var numberPicked = 0;
            picked = scene.pickForSpecs();
            while (defined(picked)) {
                picked.show = false;
                picked = scene.pickForSpecs();
                ++numberPicked;
            }
            expect(numberPicked).toBeGreaterThan(numberPickedCulling);
        });
    });

    it('applies shader style', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudWithPerPointPropertiesUrl).then(function(tileset) {
            var content = tileset._root.content;

            // Solid red color
            tileset.style = new Cesium3DTileStyle({
                color : 'color("red")'
            });
            expect(scene.renderForSpecs()).toEqual([255, 0, 0, 255]);
            expect(content._styleTranslucent).toBe(false);

            // Applies translucency
            tileset.style = new Cesium3DTileStyle({
                color : 'rgba(255, 0, 0, 0.005)'
            });
            var pixelColor = scene.renderForSpecs();
            expect(pixelColor[0]).toBeLessThan(255);
            expect(pixelColor[1]).toBe(0);
            expect(pixelColor[2]).toBe(0);
            expect(pixelColor[3]).toBe(255);
            expect(content._styleTranslucent).toBe(true);

            // Style with property
            tileset.style = new Cesium3DTileStyle({
                color : 'color() * ${temperature}'
            });
            pixelColor = scene.renderForSpecs(); // Pixel color is some shade of gray
            expect(pixelColor[0]).toBe(pixelColor[1]);
            expect(pixelColor[0]).toBe(pixelColor[2]);
            expect(pixelColor[0]).toBeGreaterThan(0);
            expect(pixelColor[0]).toBeLessThan(255);

            // When no conditions are met the default color is white
            tileset.style = new Cesium3DTileStyle({
                color : {
                    conditions : [
                        ['${secondaryColor}[0] > 1.0', 'color("red")'] // This condition will not be met
                    ]
                }
            });
            expect(scene.renderForSpecs()).toEqual([255, 255, 255, 255]);

            // Apply style with conditions
            tileset.style = new Cesium3DTileStyle({
                color : {
                    conditions : [
                        ['${temperature} < 0.1', 'color("#000099")'],
                        ['${temperature} < 0.2', 'color("#00cc99", 1.0)'],
                        ['${temperature} < 0.3', 'color("#66ff33", 0.5)'],
                        ['${temperature} < 0.4', 'rgba(255, 255, 0, 0.1)'],
                        ['${temperature} < 0.5', 'rgb(255, 128, 0)'],
                        ['${temperature} < 0.6', 'color("red")'],
                        ['${temperature} < 0.7', 'color("rgb(255, 102, 102)")'],
                        ['${temperature} < 0.8', 'hsl(0.875, 1.0, 0.6)'],
                        ['${temperature} < 0.9', 'hsla(0.83, 1.0, 0.5, 0.1)'],
                        ['true', 'color("#FFFFFF", 1.0)']
                    ]
                }
            });
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

            // Apply show style
            tileset.style = new Cesium3DTileStyle({
                show : true
            });
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

            // Apply show style that hides all points
            tileset.style = new Cesium3DTileStyle({
                show : false
            });
            expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

            // Apply show style with property
            tileset.style = new Cesium3DTileStyle({
                show : '${temperature} > 0.1'
            });
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
            tileset.style = new Cesium3DTileStyle({
                show : '${temperature} > 0.9'
            });
            expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

            // Apply style with point cloud semantics
            tileset.style = new Cesium3DTileStyle({
                color : '${COLOR} / 2.0',
                show : '${POSITION}[0] > 0.5'
            });
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

            // Apply pointSize style
            tileset.style = new Cesium3DTileStyle({
                pointSize : 5.0
            });
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        });
    });

    it('applies shader style to point cloud with normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudQuantizedOctEncodedUrl).then(function(tileset) {
            tileset.style = new Cesium3DTileStyle({
                color : 'color("red")'
            });
            var red = scene.renderForSpecs()[0];
            expect(red).toBeGreaterThan(0);
            expect(red).toBeLessThan(255);
        });
    });

    it('applies shader style to point cloud with normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudQuantizedOctEncodedUrl).then(function(tileset) {
            tileset.style = new Cesium3DTileStyle({
                color : 'color("red")'
            });
            expect(scene.renderForSpecs()[0]).toBeGreaterThan(0);
        });
    });

    it('applies shader style to point cloud without colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudNoColorUrl).then(function(tileset) {
            tileset.style = new Cesium3DTileStyle({
                color : 'color("red")'
            });
            expect(scene.renderForSpecs()).toEqual([255, 0, 0, 255]);
        });
    });

    it('throws if style references the NORMAL semantic but the point cloud does not have per-point normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(function() {
                content.applyStyleWithShader(scene.frameState, new Cesium3DTileStyle({
                    color : '${NORMAL}[0] > 0.5'
                }));
            }).toThrowDeveloperError();
        });
    });

    it('throws when shader style reference a non-existent property', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudWithPerPointPropertiesUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(function() {
                content.applyStyleWithShader(scene.frameState, new Cesium3DTileStyle({
                    color : 'color() * ${non_existent_property}'
                }));
            }).toThrowDeveloperError();
        });
    });

    it('does not apply shader style if the point cloud has a batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl).then(function(tileset) {
            var content = tileset._root.content;
            var shaderProgram = content._drawCommand.shaderProgram;
            tileset.style = new Cesium3DTileStyle({
                color:'color("red")'
            });
            expect(content._drawCommand.shaderProgram).toBe(shaderProgram);

            // Point cloud is styled through the batch table
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, pointCloudRGBUrl);
    });

    it('destroys before loading finishes', function() {
        return Cesium3DTilesTester.tileDestroysBeforeLoad(scene, pointCloudRGBUrl);
    });

}, 'WebGL');
