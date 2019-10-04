import { Cartesian3 } from '../../Source/Cesium.js';
import { Color } from '../../Source/Cesium.js';
import { ComponentDatatype } from '../../Source/Cesium.js';
import { defined } from '../../Source/Cesium.js';
import { HeadingPitchRange } from '../../Source/Cesium.js';
import { HeadingPitchRoll } from '../../Source/Cesium.js';
import { Math as CesiumMath } from '../../Source/Cesium.js';
import { PerspectiveFrustum } from '../../Source/Cesium.js';
import { Transforms } from '../../Source/Cesium.js';
import { Pass } from '../../Source/Cesium.js';
import { Cesium3DTileRefine } from '../../Source/Cesium.js';
import { Cesium3DTileStyle } from '../../Source/Cesium.js';
import { ClippingPlane } from '../../Source/Cesium.js';
import { ClippingPlaneCollection } from '../../Source/Cesium.js';
import { DracoLoader } from '../../Source/Cesium.js';
import { Expression } from '../../Source/Cesium.js';
import Cesium3DTilesTester from '../Cesium3DTilesTester.js';
import createCanvas from '../createCanvas.js';
import createScene from '../createScene.js';
import pollToPromise from '../pollToPromise.js';
import { when } from '../../Source/Cesium.js';

describe('Scene/PointCloud3DTileContent', function() {

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var pointCloudRGBUrl = './Data/Cesium3DTiles/PointCloud/PointCloudRGB/tileset.json';
    var pointCloudRGBAUrl = './Data/Cesium3DTiles/PointCloud/PointCloudRGBA/tileset.json';
    var pointCloudRGB565Url = './Data/Cesium3DTiles/PointCloud/PointCloudRGB565/tileset.json';
    var pointCloudNoColorUrl = './Data/Cesium3DTiles/PointCloud/PointCloudNoColor/tileset.json';
    var pointCloudConstantColorUrl = './Data/Cesium3DTiles/PointCloud/PointCloudConstantColor/tileset.json';
    var pointCloudNormalsUrl = './Data/Cesium3DTiles/PointCloud/PointCloudNormals/tileset.json';
    var pointCloudNormalsOctEncodedUrl = './Data/Cesium3DTiles/PointCloud/PointCloudNormalsOctEncoded/tileset.json';
    var pointCloudQuantizedUrl = './Data/Cesium3DTiles/PointCloud/PointCloudQuantized/tileset.json';
    var pointCloudQuantizedOctEncodedUrl = './Data/Cesium3DTiles/PointCloud/PointCloudQuantizedOctEncoded/tileset.json';
    var pointCloudDracoUrl = './Data/Cesium3DTiles/PointCloud/PointCloudDraco/tileset.json';
    var pointCloudDracoPartialUrl = './Data/Cesium3DTiles/PointCloud/PointCloudDracoPartial/tileset.json';
    var pointCloudDracoBatchedUrl = './Data/Cesium3DTiles/PointCloud/PointCloudDracoBatched/tileset.json';
    var pointCloudWGS84Url = './Data/Cesium3DTiles/PointCloud/PointCloudWGS84/tileset.json';
    var pointCloudBatchedUrl = './Data/Cesium3DTiles/PointCloud/PointCloudBatched/tileset.json';
    var pointCloudWithPerPointPropertiesUrl = './Data/Cesium3DTiles/PointCloud/PointCloudWithPerPointProperties/tileset.json';
    var pointCloudWithTransformUrl = './Data/Cesium3DTiles/PointCloud/PointCloudWithTransform/tileset.json';
    var pointCloudTilesetUrl = './Data/Cesium3DTiles/Tilesets/TilesetPoints/tileset.json';

    function setCamera(longitude, latitude) {
        // Point the camera to the center of the tile
        var center = Cartesian3.fromRadians(longitude, latitude, 5.0);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 5.0));
    }

    beforeAll(function() {
        scene = createScene();
        scene.frameState.passes.render = true;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        scene.morphTo3D(0.0);

        var camera = scene.camera;
        camera.frustum = new PerspectiveFrustum();
        camera.frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        camera.frustum.fov = CesiumMath.toRadians(60.0);

        setCamera(centerLongitude, centerLatitude);
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
            version: 2
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if featureTableJsonByteLength is 0', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
            featureTableJsonByteLength : 0
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the feature table does not contain POINTS_LENGTH', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
            featureTableJson : {
                POSITION : {
                    byteOffset : 0
                }
            }
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the feature table does not contain POSITION or POSITION_QUANTIZED', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
            featureTableJson : {
                POINTS_LENGTH : 1
            }
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
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
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
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
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
    });

    it('throws if the BATCH_ID semantic is defined but BATCHES_LENGTH is not', function() {
        var arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
            featureTableJson : {
                POINTS_LENGTH : 2,
                POSITION : [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
                BATCH_ID : [0, 1]
            }
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'pnts');
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
        expect(content._pointCloud._drawCommand._vertexArray._attributes[1].componentDatatype).toEqual(ComponentDatatype.UNSIGNED_SHORT);
    });

    it('gets tileset properties', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            var root = tileset.root;
            var content = root.content;
            expect(content.tileset).toBe(tileset);
            expect(content.tile).toBe(root);
            expect(content.url.indexOf(root._header.content.uri) > -1).toBe(true);
        });
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, pointCloudRGBUrl);
    });

    it('renders point cloud with rgb colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with rgba colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBAUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with rgb565 colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGB565Url).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with no colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudNoColorUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with constant colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudConstantColorUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudNormalsUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with oct encoded normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudNormalsOctEncodedUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with quantized positions', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudQuantizedUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with quantized positions and oct-encoded normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudQuantizedOctEncodedUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with draco encoded positions, normals, colors, and batch table properties', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudDracoUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
            // Test that Draco-encoded batch table properties are functioning correctly
            tileset.style = new Cesium3DTileStyle({
                color : 'vec4(Number(${secondaryColor}[0] < 1.0), 0.0, 0.0, 1.0)'
            });
            expect(scene).toRenderAndCall(function(rgba) {
                // Produces a red color
                expect(rgba[0]).toBeGreaterThan(rgba[1]);
                expect(rgba[0]).toBeGreaterThan(rgba[2]);
            });
        });
    });

    it('renders point cloud with draco encoded positions and uncompressed normals and colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudDracoPartialUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with draco encoded positions, colors, and batch ids', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudDracoBatchedUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('error decoding a draco point cloud causes loading to fail', function() {
        return pollToPromise(function() {
            return DracoLoader._taskProcessorReady;
        }).then(function() {
            var decoder = DracoLoader._getDecoderTaskProcessor();
            spyOn(decoder, 'scheduleTask').and.returnValue(when.reject({message : 'my error'}));
            return Cesium3DTilesTester.loadTileset(scene, pointCloudDracoUrl).then(function(tileset) {
                var root = tileset.root;
                return root.contentReadyPromise.then(function() {
                    fail('should not resolve');
                }).otherwise(function(error) {
                    expect(error.message).toBe('my error');
                });
            });
        });
    });

    it('renders point cloud that are not defined relative to center', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudWGS84Url).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with per-point properties', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudWithPerPointPropertiesUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders point cloud with tile transform', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudWithTransformUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);

            var newLongitude = -1.31962;
            var newLatitude = 0.698874;
            var newCenter = Cartesian3.fromRadians(newLongitude, newLatitude, 5.0);
            var newHPR = new HeadingPitchRoll();
            var newTransform = Transforms.headingPitchRollToFixedFrame(newCenter, newHPR);

            // Update tile transform
            tileset.root.transform = newTransform;

            // Move the camera to the new location
            setCamera(newLongitude, newLatitude);
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders with debug color', function() {
        CesiumMath.setRandomNumberSeed(0);
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            var color;
            expect(scene).toRenderAndCall(function(rgba) {
                color = rgba;
            });
            tileset.debugColorizeTiles = true;
            expect(scene).notToRender(color);
            tileset.debugColorizeTiles = false;
            expect(scene).toRender(color);
        });
    });

    it('renders in CV', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            scene.morphToColumbusView(0.0);
            setCamera(centerLongitude, centerLatitude);
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders in 2D', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            scene.morphTo2D(0.0);
            setCamera(centerLongitude, centerLatitude);
            tileset.maximumScreenSpaceError = 3;
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('picks', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            var content = tileset.root.content;
            tileset.show = false;
            expect(scene).toPickPrimitive(undefined);
            tileset.show = true;
            expect(scene).toPickAndCall(function(result) {
                expect(result).toBeDefined();
                expect(result.primitive).toBe(tileset);
                expect(result.content).toBe(content);
            });
        });
    });

    it('picks based on batchId', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl).then(function(tileset) {
            // Get the original color
            var color;
            expect(scene).toRenderAndCall(function(rgba) {
                color = rgba;
            });

            // Change the color of the picked feature to yellow
            expect(scene).toPickAndCall(function(first) {
                expect(first).toBeDefined();

                first.color = Color.clone(Color.YELLOW, first.color);

                // Expect the pixel color to be some shade of yellow
                expect(scene).notToRender(color);

                // Turn show off. Expect a different feature to get picked.
                first.show = false;
                expect(scene).toPickAndCall(function(second) {
                    expect(second).toBeDefined();
                    expect(second).not.toBe(first);
                });
            });
        });
    });

    it('point cloud without batch table works', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            var content = tileset.root.content;
            expect(content.featuresLength).toBe(0);
            expect(content.innerContents).toBeUndefined();
            expect(content.hasProperty(0, 'name')).toBe(false);
            expect(content.getFeature(0)).toBeUndefined();
        });
    });

    it('batched point cloud works', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl).then(function(tileset) {
            var content = tileset.root.content;
            expect(content.featuresLength).toBe(8);
            expect(content.innerContents).toBeUndefined();
            expect(content.hasProperty(0, 'name')).toBe(true);
            expect(content.getFeature(0)).toBeDefined();
        });
    });

    it('point cloud with per-point properties work', function() {
        // When the batch table contains per-point properties, aka no batching, then a Cesium3DTileBatchTable is not
        // created. There is no per-point show/color/pickId because the overhead is too high. Instead points are styled
        // based on their properties, and these are not accessible from the API.
        return Cesium3DTilesTester.loadTileset(scene, pointCloudWithPerPointPropertiesUrl).then(function(tileset) {
            var content = tileset.root.content;
            expect(content.featuresLength).toBe(0);
            expect(content.innerContents).toBeUndefined();
            expect(content.hasProperty(0, 'name')).toBe(false);
            expect(content.getFeature(0)).toBeUndefined();
        });
    });

    it('throws when calling getFeature with invalid index', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl).then(function(tileset) {
            var content = tileset.root.content;
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
            var content = tileset.root.content;

            // Get the number of picked sections with back face culling on
            var pickedCountCulling = 0;
            var pickedCount = 0;
            var picked;

            expect(scene).toPickAndCall(function(result) {
                // Set culling to true
                tileset.pointCloudShading.backFaceCulling = true;

                expect(scene).toPickAndCall(function(result) {
                    picked = result;
                });

                /* jshint loopfunc: true */
                while (defined(picked)) {
                    picked.show = false;
                    expect(scene).toPickAndCall(function(result) { //eslint-disable-line no-loop-func
                        picked = result;
                    });
                    ++pickedCountCulling;
                }

                // Set the shows back to true
                var length = content.featuresLength;
                for (var i = 0; i < length; ++i) {
                    var feature = content.getFeature(i);
                    feature.show = true;
                }

                // Set culling to false
                tileset.pointCloudShading.backFaceCulling = false;

                expect(scene).toPickAndCall(function(result) {
                    picked = result;
                });

                /* jshint loopfunc: true */
                while (defined(picked)) {
                    picked.show = false;
                    expect(scene).toPickAndCall(function(result) { //eslint-disable-line no-loop-func
                        picked = result;
                    });
                    ++pickedCount;
                }

                expect(pickedCount).toBeGreaterThan(pickedCountCulling);
            });
        });
    });

    var noAttenuationPixelCount;
    function attenuationTest(postLoadCallback) {
        var scene = createScene({
            canvas : createCanvas(10, 10)
        });
        noAttenuationPixelCount = scene.logarithmicDepthBuffer ? 20 : 16;
        var center = new Cartesian3.fromRadians(centerLongitude, centerLatitude, 5.0);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 5.0));
        scene.postProcessStages.fxaa.enabled = false;
        scene.camera.zoomIn(6);

        return Cesium3DTilesTester.loadTileset(scene, pointCloudNoColorUrl).then(function(tileset) {
            tileset.pointCloudShading.eyeDomeLighting = false;
            tileset.root.refine = Cesium3DTileRefine.REPLACE;
            postLoadCallback(scene, tileset);
            scene.destroyForSpecs();
        });
    }

    it('attenuates points based on geometric error', function() {
        return attenuationTest(function(scene, tileset) {
            tileset.pointCloudShading.attenuation = true;
            tileset.pointCloudShading.geometricErrorScale = 1.0;
            tileset.pointCloudShading.maximumAttenuation = undefined;
            tileset.pointCloudShading.baseResolution = undefined;
            tileset.maximumScreenSpaceError = 16;
            expect(scene).toRenderPixelCountAndCall(function(pixelCount) {
                expect(pixelCount).toBeGreaterThan(noAttenuationPixelCount);
            });
        });
    });

    it('modulates attenuation using the tileset screen space error', function() {
        return attenuationTest(function(scene, tileset) {
            tileset.pointCloudShading.attenuation = true;
            tileset.pointCloudShading.geometricErrorScale = 1.0;
            tileset.pointCloudShading.maximumAttenuation = undefined;
            tileset.pointCloudShading.baseResolution = undefined;
            tileset.maximumScreenSpaceError = 1;
            expect(scene).toRenderPixelCountAndCall(function(pixelCount) {
                expect(pixelCount).toEqual(noAttenuationPixelCount);
            });
        });
    });

    it('modulates attenuation using the maximumAttenuation parameter', function() {
        return attenuationTest(function(scene, tileset) {
            tileset.pointCloudShading.attenuation = true;
            tileset.pointCloudShading.geometricErrorScale = 1.0;
            tileset.pointCloudShading.maximumAttenuation = 1;
            tileset.pointCloudShading.baseResolution = undefined;
            tileset.maximumScreenSpaceError = 16;
            expect(scene).toRenderPixelCountAndCall(function(pixelCount) {
                expect(pixelCount).toEqual(noAttenuationPixelCount);
            });
        });
    });

    it('modulates attenuation using the baseResolution parameter', function() {
        return attenuationTest(function(scene, tileset) {
            // pointCloudNoColorUrl is a single tile with GeometricError = 0,
            // which results in default baseResolution being computed
            tileset.pointCloudShading.attenuation = true;
            tileset.pointCloudShading.geometricErrorScale = 1.0;
            tileset.pointCloudShading.maximumAttenuation = undefined;
            tileset.pointCloudShading.baseResolution = 0.20;
            tileset.maximumScreenSpaceError = 16;
            expect(scene).toRenderPixelCountAndCall(function(pixelCount) {
                expect(pixelCount).toEqual(noAttenuationPixelCount);
            });
        });
    });

    it('modulates attenuation using the geometricErrorScale parameter', function() {
        return attenuationTest(function(scene, tileset) {
            tileset.pointCloudShading.attenuation = true;
            tileset.pointCloudShading.geometricErrorScale = 0.2;
            tileset.pointCloudShading.maximumAttenuation = undefined;
            tileset.pointCloudShading.baseResolution = 1.0;
            tileset.maximumScreenSpaceError = 1;
            expect(scene).toRenderPixelCountAndCall(function(pixelCount) {
                expect(pixelCount).toEqual(noAttenuationPixelCount);
            });
        });
    });

    it('attenuates points based on geometric error in 2D', function() {
        return attenuationTest(function(scene, tileset) {
            scene.morphTo2D(0);
            tileset.pointCloudShading.attenuation = true;
            tileset.pointCloudShading.geometricErrorScale = 1.0;
            tileset.pointCloudShading.maximumAttenuation = undefined;
            tileset.pointCloudShading.baseResolution = undefined;
            tileset.maximumScreenSpaceError = 16;
            expect(scene).toRenderPixelCountAndCall(function(pixelCount) {
                expect(pixelCount).toBeGreaterThan(noAttenuationPixelCount);
            });
        });
    });

    it('applies shader style', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudWithPerPointPropertiesUrl).then(function(tileset) {
            var content = tileset.root.content;

            // Solid red color
            tileset.style = new Cesium3DTileStyle({
                color : 'color("red")'
            });
            expect(scene).toRender([255, 0, 0, 255]);
            expect(content._pointCloud._styleTranslucent).toBe(false);

            // Applies translucency
            tileset.style = new Cesium3DTileStyle({
                color : 'rgba(255, 0, 0, 0.005)'
            });
            expect(scene).toRenderAndCall(function(rgba) {
                // Pixel is a darker red
                expect(rgba[0]).toBeLessThan(255);
                expect(rgba[1]).toBe(0);
                expect(rgba[2]).toBe(0);
                expect(rgba[3]).toBe(255);
                expect(content._pointCloud._styleTranslucent).toBe(true);
            });

            // Style with property
            tileset.style = new Cesium3DTileStyle({
                color : 'color() * ${temperature}'
            });
            expect(scene).toRenderAndCall(function(rgba) {
                // Pixel color is some shade of gray
                expect(rgba[0]).toBe(rgba[1]);
                expect(rgba[0]).toBe(rgba[2]);
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[0]).toBeLessThan(255);
            });

            // When no conditions are met the default color is white
            tileset.style = new Cesium3DTileStyle({
                color : {
                    conditions : [
                        ['${secondaryColor}[0] > 1.0', 'color("red")'] // This condition will not be met
                    ]
                }
            });
            expect(scene).toRender([255, 255, 255, 255]);

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
            expect(scene).notToRender([0, 0, 0, 255]);

            // Apply show style
            tileset.style = new Cesium3DTileStyle({
                show : true
            });
            expect(scene).notToRender([0, 0, 0, 255]);

            // Apply show style that hides all points
            tileset.style = new Cesium3DTileStyle({
                show : false
            });
            expect(scene).toRender([0, 0, 0, 255]);

            // Apply show style with property
            tileset.style = new Cesium3DTileStyle({
                show : '${temperature} > 0.1'
            });
            expect(scene).notToRender([0, 0, 0, 255]);
            tileset.style = new Cesium3DTileStyle({
                show : '${temperature} > 1.0'
            });
            expect(scene).toRender([0, 0, 0, 255]);

            // Apply style with point cloud semantics
            tileset.style = new Cesium3DTileStyle({
                color : '${COLOR} / 2.0',
                show : '${POSITION}[0] > 0.5'
            });
            expect(scene).notToRender([0, 0, 0, 255]);

            // Apply pointSize style
            tileset.style = new Cesium3DTileStyle({
                pointSize : 5.0
            });
            expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    it('rebuilds shader style when expression changes', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudTilesetUrl).then(function(tileset) {
            // Solid red color
            tileset.style = new Cesium3DTileStyle({
                color : 'color("red")'
            });
            expect(scene).toRender([255, 0, 0, 255]);

            tileset.style.color = new Expression('color("lime")');
            tileset.makeStyleDirty();
            expect(scene).toRender([0, 255, 0, 255]);

            tileset.style.color = new Expression('color("blue", 0.5)');
            tileset.makeStyleDirty();
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba).toEqualEpsilon([0, 0, 255, 255], 5);
            });

            var i;
            var commands = scene.frameState.commandList;
            var commandsLength = commands.length;
            expect(commandsLength).toBeGreaterThan(1); // Just check that at least some children are rendered
            for (i = 0; i < commandsLength; ++i) {
                expect(commands[i].pass).toBe(Pass.TRANSLUCENT);
            }

            tileset.style.color = new Expression('color("yellow")');
            tileset.makeStyleDirty();
            expect(scene).toRender([255, 255, 0, 255]);

            commands = scene.frameState.commandList;
            commandsLength = commands.length;
            for (i = 0; i < commandsLength; ++i) {
                expect(commands[i].pass).not.toBe(Pass.TRANSLUCENT);
            }
        });
    });

    it('applies shader style to point cloud with normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudQuantizedOctEncodedUrl).then(function(tileset) {
            tileset.style = new Cesium3DTileStyle({
                color : 'color("red")'
            });
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[0]).toBeLessThan(255);
            });
        });
    });

    it('applies shader style to point cloud with normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudQuantizedOctEncodedUrl).then(function(tileset) {
            tileset.style = new Cesium3DTileStyle({
                color : 'color("red")'
            });
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
            });
        });
    });

    it('applies shader style to point cloud without colors', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudNoColorUrl).then(function(tileset) {
            tileset.style = new Cesium3DTileStyle({
                color : 'color("red")'
            });
            expect(scene).toRender([255, 0, 0, 255]);
        });
    });

    it('throws if style references the NORMAL semantic but the point cloud does not have per-point normals', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            tileset.style = new Cesium3DTileStyle({
                color : '${NORMAL}[0] > 0.5'
            });
            expect(function() {
                scene.renderForSpecs();
            }).toThrowRuntimeError();
        });
    });

    it('throws when shader style reference a non-existent property', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudWithPerPointPropertiesUrl).then(function(tileset) {
            tileset.style = new Cesium3DTileStyle({
                color : 'color() * ${non_existent_property}'
            });
            expect(function() {
                scene.renderForSpecs();
            }).toThrowRuntimeError();
        });
    });

    it('does not apply shader style if the point cloud has a batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl).then(function(tileset) {
            var content = tileset.root.content;
            var shaderProgram = content._pointCloud._drawCommand.shaderProgram;
            tileset.style = new Cesium3DTileStyle({
                color:'color("red")'
            });
            scene.renderForSpecs();
            expect(content._pointCloud._drawCommand.shaderProgram).toBe(shaderProgram);

            // Point cloud is styled through the batch table
            expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    it('throws when shader style is invalid', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            tileset.style = new Cesium3DTileStyle({
                show : '1 < "2"'
            });
            expect(function() {
                scene.renderForSpecs();
            }).toThrowRuntimeError();
        });
    });

    it('gets memory usage', function() {
        var promises = [
            Cesium3DTilesTester.loadTileset(scene, pointCloudNoColorUrl),
            Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl),
            Cesium3DTilesTester.loadTileset(scene, pointCloudNormalsUrl),
            Cesium3DTilesTester.loadTileset(scene, pointCloudQuantizedOctEncodedUrl)
        ];

        // 1000 points
        var expectedGeometryMemory = [
            1000 * 12, // 3 floats (xyz)
            1000 * 15, // 3 floats (xyz), 3 bytes (rgb)
            1000 * 27, // 3 floats (xyz), 3 bytes (rgb), 3 floats (normal)
            1000 * 11  // 3 shorts (quantized xyz), 3 bytes (rgb), 2 bytes (oct-encoded normal)
        ];

        return when.all(promises).then(function(tilesets) {
            var length = tilesets.length;
            for (var i = 0; i < length; ++i) {
                var content = tilesets[i].root.content;
                expect(content.geometryByteLength).toEqual(expectedGeometryMemory[i]);
                expect(content.texturesByteLength).toEqual(0);
            }
        });
    });

    it('gets memory usage for batch point cloud', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudBatchedUrl).then(function(tileset) {
            var content = tileset.root.content;

            // Point cloud consists of positions, colors, normals, and batchIds
            // 3 floats (xyz), 3 floats (normal), 1 byte (batchId)
            var pointCloudGeometryMemory = 1000 * 25;

            // One RGBA byte pixel per feature
            var batchTexturesByteLength = content.featuresLength * 4;
            var pickTexturesByteLength = content.featuresLength * 4;

            // Features have not been picked or colored yet, so the batch table contribution is 0.
            expect(content.geometryByteLength).toEqual(pointCloudGeometryMemory);
            expect(content.texturesByteLength).toEqual(0);
            expect(content.batchTableByteLength).toEqual(0);

            // Color a feature and expect the texture memory to increase
            content.getFeature(0).color = Color.RED;
            scene.renderForSpecs();
            expect(content.geometryByteLength).toEqual(pointCloudGeometryMemory);
            expect(content.texturesByteLength).toEqual(0);
            expect(content.batchTableByteLength).toEqual(batchTexturesByteLength);

            // Pick the tile and expect the texture memory to increase
            scene.pickForSpecs();
            expect(content.geometryByteLength).toEqual(pointCloudGeometryMemory);
            expect(content.texturesByteLength).toEqual(0);
            expect(content.batchTableByteLength).toEqual(batchTexturesByteLength + pickTexturesByteLength);
        });
    });

    it('rebuilds shaders when clipping planes are enabled, change between union and intersection, or change count', function () {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            var tile = tileset.root;
            tile._isClipped = true;
            var content = tile.content;

            var noClipFS = content._pointCloud._drawCommand.shaderProgram._fragmentShaderText;
            expect(noClipFS.indexOf('clip') !== -1).toBe(false);

            var clippingPlanes = new ClippingPlaneCollection({
                planes : [
                    new ClippingPlane(Cartesian3.UNIT_X, 0.0)
                ],
                unionClippingRegions : false
            });
            tileset.clippingPlanes = clippingPlanes;

            clippingPlanes.update(scene.frameState);
            tile.update(tileset, scene.frameState);
            var clipOneIntersectFS = content._pointCloud._drawCommand.shaderProgram._fragmentShaderText;
            expect(clipOneIntersectFS.indexOf('= clip(') !== -1).toBe(true);
            expect(clipOneIntersectFS.indexOf('float clip') !== -1).toBe(true);

            clippingPlanes.unionClippingRegions = true;

            clippingPlanes.update(scene.frameState);
            tile.update(tileset, scene.frameState);
            var clipOneUnionFS = content._pointCloud._drawCommand.shaderProgram._fragmentShaderText;
            expect(clipOneUnionFS.indexOf('= clip(') !== -1).toBe(true);
            expect(clipOneUnionFS.indexOf('float clip') !== -1).toBe(true);
            expect(clipOneUnionFS).not.toEqual(clipOneIntersectFS);

            clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_Y, 1.0));

            clippingPlanes.update(scene.frameState);
            tile.update(tileset, scene.frameState);
            var clipTwoUnionFS = content._pointCloud._drawCommand.shaderProgram._fragmentShaderText;
            expect(clipTwoUnionFS.indexOf('= clip(') !== -1).toBe(true);
            expect(clipTwoUnionFS.indexOf('float clip') !== -1).toBe(true);
            expect(clipTwoUnionFS).not.toEqual(clipOneIntersectFS);
            expect(clipTwoUnionFS).not.toEqual(clipOneUnionFS);
        });
    });

    it('clipping planes selectively disable rendering', function () {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            var color;
            expect(scene).toRenderAndCall(function(rgba) {
                color = rgba;
            });

            var clipPlane = new ClippingPlane(Cartesian3.UNIT_Z, -10.0);
            tileset.clippingPlanes = new ClippingPlaneCollection({
                planes : [
                    clipPlane
                ]
            });

            expect(scene).notToRender(color);

            clipPlane.distance = 0.0;

            expect(scene).toRender(color);
        });
    });

    it('clipping planes apply edge styling', function() {
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            var color;
            expect(scene).toRenderAndCall(function(rgba) {
                color = rgba;
            });

            var clipPlane = new ClippingPlane(Cartesian3.UNIT_Z, -10.0);
            tileset.clippingPlanes = new ClippingPlaneCollection ({
                planes : [
                    clipPlane
                ],
                modelMatrix : Transforms.eastNorthUpToFixedFrame(tileset.boundingSphere.center),
                edgeWidth : 20.0,
                edgeColor : Color.RED
            });

            expect(scene).notToRender(color);
        });
    });

    it('clipping planes union regions (Uint8)', function() {
        // Force uint8 mode - there's a slight rendering difference between
        // float and packed uint8 clipping planes for this test due to the small context
        spyOn(ClippingPlaneCollection, 'useFloatTexture').and.returnValue(false);
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            var color;
            expect(scene).toRenderAndCall(function(rgba) {
                color = rgba;
            });

            tileset.clippingPlanes = new ClippingPlaneCollection ({
                planes : [
                    new ClippingPlane(Cartesian3.UNIT_Z, 0.0),
                    new ClippingPlane(Cartesian3.UNIT_X, 0.0)
                ],
                modelMatrix : Transforms.eastNorthUpToFixedFrame(tileset.boundingSphere.center),
                unionClippingRegions: true
            });

            expect(scene).notToRender(color);

            tileset.clippingPlanes.unionClippingRegions = false;

            expect(scene).toRender(color);
        });
    });

    it('clipping planes union regions (Float)', function() {
        if (!ClippingPlaneCollection.useFloatTexture(scene.context)) {
            // This configuration for the test fails in uint8 mode due to the small context
            return;
        }
        return Cesium3DTilesTester.loadTileset(scene, pointCloudRGBUrl).then(function(tileset) {
            var color;
            expect(scene).toRenderAndCall(function(rgba) {
                color = rgba;
            });

            tileset.clippingPlanes = new ClippingPlaneCollection ({
                planes : [
                    new ClippingPlane(Cartesian3.UNIT_Z, -10.0),
                    new ClippingPlane(Cartesian3.UNIT_X, 0.0)
                ],
                modelMatrix : Transforms.eastNorthUpToFixedFrame(tileset.boundingSphere.center),
                unionClippingRegions: true
            });

            expect(scene).notToRender(color);

            tileset.clippingPlanes.unionClippingRegions = false;

            expect(scene).toRender(color);
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, pointCloudRGBUrl);
    });

}, 'WebGL');
